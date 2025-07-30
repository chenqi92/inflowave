use crate::models::{ConnectionConfig, ConnectionStatus, ConnectionTestResult};
use crate::database::connection::ConnectionManager;
use crate::database::pool::{ConnectionPool, PoolConfig};
use crate::utils::encryption::EncryptionService;
use crate::utils::config::ConfigUtils;
use anyhow::{Context, Result};
use std::sync::Arc;
use tokio::sync::{RwLock, Mutex};
use std::collections::HashMap;
use std::path::PathBuf;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use tokio::time::{interval, Duration};
use std::sync::atomic::{AtomicBool, Ordering};

/// 连接配置存储结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStorage {
    pub connections: Vec<ConnectionConfig>,
    pub version: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl Default for ConnectionStorage {
    fn default() -> Self {
        let now = chrono::Utc::now();
        Self {
            connections: Vec::new(),
            version: "1.0.0".to_string(),
            created_at: now,
            updated_at: now,
        }
    }
}

/// 连接服务
pub struct ConnectionService {
    manager: Arc<ConnectionManager>,
    encryption: Arc<EncryptionService>,
    configs: Arc<RwLock<HashMap<String, ConnectionConfig>>>,
    storage_path: PathBuf,
    pools: Arc<RwLock<HashMap<String, Arc<ConnectionPool>>>>,
    monitoring_active: Arc<AtomicBool>,
    monitoring_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl ConnectionService {
    /// 创建新的连接服务
    pub fn new(encryption: Arc<EncryptionService>) -> Self {
        // 获取存储路径
        let storage_path = Self::get_storage_path().unwrap_or_else(|e| {
            warn!("获取存储路径失败，使用默认路径: {}", e);
            PathBuf::from("connections.json")
        });

        let service = Self {
            manager: Arc::new(ConnectionManager::new()),
            encryption,
            configs: Arc::new(RwLock::new(HashMap::new())),
            storage_path,
            pools: Arc::new(RwLock::new(HashMap::new())),
            monitoring_active: Arc::new(AtomicBool::new(false)),
            monitoring_handle: Arc::new(Mutex::new(None)),
        };

        service
    }

    /// 创建并初始化连接服务
    pub async fn new_with_load(encryption: Arc<EncryptionService>) -> Result<Self> {
        let service = Self::new(encryption);

        // 自动加载保存的连接
        if let Err(e) = service.load_from_storage_internal().await {
            warn!("加载连接配置失败: {}", e);
        }

        Ok(service)
    }

    /// 获取存储文件路径
    fn get_storage_path() -> Result<PathBuf> {
        let config_dir = ConfigUtils::get_config_dir()?;
        Ok(config_dir.join("connections.json"))
    }

    /// 创建连接
    pub async fn create_connection(&self, mut config: ConnectionConfig) -> Result<String> {
        debug!("创建连接: {}", config.name);

        let connection_id = config.id.clone();

        // 检查连接是否已存在
        {
            let configs = self.configs.read().await;
            if configs.contains_key(&connection_id) {
                warn!("连接 ID '{}' 已存在，将覆盖现有连接", connection_id);
                // 先移除现有连接
                drop(configs);
                if let Err(e) = self.manager.remove_connection(&connection_id).await {
                    warn!("移除现有连接失败: {}", e);
                }
            }
        }

        // 加密密码
        if let Some(password) = &config.password {
            let encrypted_password = self.encryption.encrypt_password(password)
                .context("密码加密失败")?;
            config.password = Some(encrypted_password);
        }

        // 存储配置
        {
            let mut configs = self.configs.write().await;
            configs.insert(connection_id.clone(), config.clone());
        }

        // 保存到文件
        if let Err(e) = self.save_to_storage().await {
            error!("保存连接配置到文件失败: {}", e);
        }

        // 解密密码用于连接
        let mut runtime_config = config.clone();
        if let Some(encrypted_password) = &config.password {
            let decrypted_password = self.encryption.decrypt_password(encrypted_password)
                .context("密码解密失败")?;
            runtime_config.password = Some(decrypted_password);
        }

        // 添加到连接管理器
        self.manager.add_connection(runtime_config).await
            .context("添加连接失败")?;

        info!("连接 '{}' 创建成功", config.name);
        Ok(connection_id)
    }

    /// 测试连接
    pub async fn test_connection(&self, connection_id: &str) -> Result<ConnectionTestResult> {
        debug!("测试连接: {}", connection_id);
        
        self.manager.test_connection(connection_id).await
            .context("连接测试失败")
    }

    /// 获取所有连接配置
    pub async fn get_connections(&self) -> Vec<ConnectionConfig> {
        let configs = self.configs.read().await;
        
        // 返回时移除密码字段以确保安全
        configs.values().map(|config| {
            let mut safe_config = config.clone();
            safe_config.password = None;
            safe_config
        }).collect()
    }

    /// 获取连接配置
    pub async fn get_connection(&self, connection_id: &str) -> Option<ConnectionConfig> {
        let configs = self.configs.read().await;
        
        configs.get(connection_id).map(|config| {
            let mut safe_config = config.clone();
            safe_config.password = None;
            safe_config
        })
    }

    /// 更新连接
    pub async fn update_connection(&self, mut config: ConnectionConfig) -> Result<()> {
        debug!("更新连接: {}", config.name);
        
        let connection_id = config.id.clone();
        
        // 检查连接是否存在
        {
            let configs = self.configs.read().await;
            if !configs.contains_key(&connection_id) {
                return Err(anyhow::anyhow!("连接 '{}' 不存在", connection_id));
            }
        }
        
        // 加密密码
        if let Some(password) = &config.password {
            let encrypted_password = self.encryption.encrypt_password(password)
                .context("密码加密失败")?;
            config.password = Some(encrypted_password);
        }
        
        // 更新时间戳
        config.updated_at = chrono::Utc::now();
        
        // 更新配置
        {
            let mut configs = self.configs.write().await;
            configs.insert(connection_id.clone(), config.clone());
        }

        // 保存到文件
        if let Err(e) = self.save_to_storage().await {
            error!("保存连接配置到文件失败: {}", e);
        }

        // 移除旧连接
        self.manager.remove_connection(&connection_id).await
            .context("移除旧连接失败")?;
        
        // 解密密码用于连接
        let mut runtime_config = config.clone();
        if let Some(encrypted_password) = &config.password {
            let decrypted_password = self.encryption.decrypt_password(encrypted_password)
                .context("密码解密失败")?;
            runtime_config.password = Some(decrypted_password);
        }
        
        // 添加新连接
        self.manager.add_connection(runtime_config).await
            .context("添加新连接失败")?;
        
        info!("连接 '{}' 更新成功", config.name);
        Ok(())
    }

    /// 删除连接
    pub async fn delete_connection(&self, connection_id: &str) -> Result<()> {
        debug!("删除连接: {}", connection_id);
        
        // 从连接管理器移除
        self.manager.remove_connection(connection_id).await
            .context("从连接管理器移除失败")?;
        
        // 从配置中移除
        {
            let mut configs = self.configs.write().await;
            configs.remove(connection_id);
        }

        // 保存到文件
        if let Err(e) = self.save_to_storage().await {
            error!("保存连接配置到文件失败: {}", e);
        }

        info!("连接 '{}' 删除成功", connection_id);
        Ok(())
    }

    /// 获取连接状态
    pub async fn get_connection_status(&self, connection_id: &str) -> Option<ConnectionStatus> {
        self.manager.get_connection_status(connection_id).await
    }

    /// 获取所有连接状态
    pub async fn get_all_connection_statuses(&self) -> HashMap<String, ConnectionStatus> {
        // 获取当前存储的状态
        let current_statuses = self.manager.get_all_statuses().await;
        let mut updated_statuses = HashMap::new();

        // 获取所有连接配置
        let configs = self.configs.read().await;

        for (connection_id, _config) in configs.iter() {
            let current_status = current_statuses.get(connection_id);

            // 如果当前状态显示已连接，进行快速健康检查
            if let Some(status) = current_status {
                if matches!(status.status, crate::models::ConnectionState::Connected) {
                    // 对已连接的连接进行快速测试
                    match self.manager.test_connection(connection_id).await {
                        Ok(test_result) => {
                            if test_result.success {
                                // 连接仍然有效，保持已连接状态
                                updated_statuses.insert(connection_id.clone(), status.clone());
                            } else {
                                // 连接已断开，更新状态
                                let mut disconnected_status = status.clone();
                                disconnected_status.status = crate::models::ConnectionState::Error;
                                disconnected_status.error = test_result.error;
                                updated_statuses.insert(connection_id.clone(), disconnected_status);
                            }
                        }
                        Err(_) => {
                            // 测试失败，标记为错误状态
                            let mut error_status = status.clone();
                            error_status.status = crate::models::ConnectionState::Error;
                            error_status.error = Some("连接测试失败".to_string());
                            updated_statuses.insert(connection_id.clone(), error_status);
                        }
                    }
                } else {
                    // 对于非已连接状态，直接返回当前状态
                    updated_statuses.insert(connection_id.clone(), status.clone());
                }
            } else {
                // 如果没有状态记录，创建一个默认的断开状态
                updated_statuses.insert(
                    connection_id.clone(),
                    crate::models::ConnectionStatus::new(connection_id.clone())
                );
            }
        }

        updated_statuses
    }

    /// 健康检查所有连接
    pub async fn health_check_all(&self) -> HashMap<String, ConnectionTestResult> {
        debug!("执行所有连接的健康检查");
        self.manager.health_check_all().await
    }

    /// 获取连接管理器
    pub fn get_manager(&self) -> Arc<ConnectionManager> {
        self.manager.clone()
    }

    /// 检查连接配置是否存在
    pub async fn connection_config_exists(&self, connection_id: &str) -> bool {
        let configs = self.configs.read().await;
        configs.contains_key(connection_id)
    }

    /// 加载连接配置
    pub async fn load_connections(&self, configs: Vec<ConnectionConfig>) -> Result<()> {
        info!("加载 {} 个连接配置", configs.len());
        
        for config in configs {
            if let Err(e) = self.load_single_connection(config).await {
                error!("加载连接配置失败: {}", e);
            }
        }
        
        Ok(())
    }

    /// 加载单个连接配置（仅存储配置，不建立连接）
    pub async fn load_single_connection(&self, config: ConnectionConfig) -> Result<()> {
        let connection_id = config.id.clone();

        // 仅存储配置，不建立连接
        {
            let mut configs = self.configs.write().await;
            configs.insert(connection_id.clone(), config.clone());
        }

        debug!("连接配置加载成功（未建立连接）: {}", connection_id);
        Ok(())
    }

    /// 建立单个连接（从已加载的配置中）
    pub async fn establish_single_connection(&self, connection_id: &str) -> Result<()> {
        // 获取配置
        let config = {
            let configs = self.configs.read().await;
            configs.get(connection_id)
                .ok_or_else(|| anyhow::anyhow!("连接配置不存在: {}", connection_id))?
                .clone()
        };

        // 解密密码用于连接
        let mut runtime_config = config.clone();
        if let Some(encrypted_password) = &config.password {
            match self.encryption.decrypt_password(encrypted_password) {
                Ok(decrypted_password) => {
                    runtime_config.password = Some(decrypted_password);
                }
                Err(e) => {
                    error!("解密连接密码失败: {} - {}", connection_id, e);
                    return Err(e.into());
                }
            }
        }

        // 添加到连接管理器（建立连接）
        self.manager.add_connection(runtime_config).await
            .context("添加连接到管理器失败")?;

        debug!("连接建立成功: {}", connection_id);
        Ok(())
    }

    /// 获取连接数量
    pub async fn get_connection_count(&self) -> usize {
        self.manager.connection_count().await
    }

    /// 保存连接配置到文件
    async fn save_to_storage(&self) -> Result<()> {
        debug!("保存连接配置到文件: {:?}", self.storage_path);

        let configs = self.configs.read().await;
        let connections: Vec<ConnectionConfig> = configs.values().cloned().collect();

        let storage = ConnectionStorage {
            connections,
            version: "1.0.0".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        // 确保目录存在
        if let Some(parent) = self.storage_path.parent() {
            tokio::fs::create_dir_all(parent).await
                .context("创建配置目录失败")?;
        }

        // 序列化并写入文件
        let json_data = serde_json::to_string_pretty(&storage)
            .context("序列化连接配置失败")?;

        tokio::fs::write(&self.storage_path, json_data).await
            .context("写入连接配置文件失败")?;

        info!("连接配置已保存到: {:?}", self.storage_path);
        Ok(())
    }

    /// 从文件加载连接配置（公共方法）
    pub async fn load_from_storage(&self) -> Result<()> {
        self.load_from_storage_internal().await
    }

    /// 从文件加载连接配置（内部实现）
    async fn load_from_storage_internal(&self) -> Result<()> {
        debug!("从文件加载连接配置: {:?}", self.storage_path);

        // 检查文件是否存在
        if !self.storage_path.exists() {
            info!("连接配置文件不存在，跳过加载");
            return Ok(());
        }

        // 读取文件内容
        let json_data = tokio::fs::read_to_string(&self.storage_path).await
            .context("读取连接配置文件失败")?;

        // 反序列化
        let storage: ConnectionStorage = serde_json::from_str(&json_data)
            .context("解析连接配置文件失败")?;

        info!("从文件加载 {} 个连接配置", storage.connections.len());

        // 加载连接配置
        for config in storage.connections {
            if let Err(e) = self.load_single_connection(config).await {
                error!("加载连接配置失败: {}", e);
            }
        }

        Ok(())
    }

    /// 连接到数据库
    pub async fn connect_to_database(&self, connection_id: &str) -> Result<()> {
        debug!("连接到数据库: {}", connection_id);

        // 检查连接是否存在，如果不存在尝试从配置建立连接
        if !self.manager.connection_exists(connection_id).await {
            debug!("连接在管理器中不存在，尝试建立连接: {}", connection_id);

            // 检查配置是否存在
            let config_exists = {
                let configs = self.configs.read().await;
                configs.contains_key(connection_id)
            };

            if config_exists {
                info!("找到连接配置，尝试建立连接: {}", connection_id);
                if let Err(e) = self.establish_single_connection(connection_id).await {
                    error!("建立连接失败: {} - {}", connection_id, e);
                    return Err(anyhow::anyhow!("连接 '{}' 建立失败: {}", connection_id, e));
                }
                info!("连接建立成功: {}", connection_id);
            } else {
                error!("连接配置不存在: {}", connection_id);
                return Err(anyhow::anyhow!("连接 '{}' 不存在，请检查连接配置是否正确保存", connection_id));
            }
        }

        // 测试连接
        let test_result = self.manager.test_connection(connection_id).await?;
        if !test_result.success {
            return Err(anyhow::anyhow!("连接测试失败: {}", test_result.error.unwrap_or_default()));
        }

        // 创建连接池
        let config = {
            let configs = self.configs.read().await;
            configs.get(connection_id)
                .ok_or_else(|| anyhow::anyhow!("连接配置不存在: {}", connection_id))?
                .clone()
        };

        // 解密密码
        let mut runtime_config = config.clone();
        if let Some(encrypted_password) = &config.password {
            let decrypted_password = self.encryption.decrypt_password(encrypted_password)
                .context("密码解密失败")?;
            runtime_config.password = Some(decrypted_password);
        }

        let pool_config = PoolConfig::default();
        let pool = Arc::new(ConnectionPool::new(runtime_config, pool_config));

        // 存储连接池
        {
            let mut pools = self.pools.write().await;
            pools.insert(connection_id.to_string(), pool);
        }

        // 连接成功后，对于InfluxDB连接，尝试检查并连接到 _internal 数据库以获取监控数据
        if matches!(config.db_type, crate::models::DatabaseType::InfluxDB) {
            if let Err(e) = self.check_and_connect_internal_database(connection_id).await {
                warn!("连接到 _internal 数据库失败: {}", e);
            }
        } else {
            debug!("跳过 _internal 数据库检查，数据库类型: {:?}", config.db_type);
        }

        info!("成功连接到数据库: {}", connection_id);
        Ok(())
    }

    /// 断开数据库连接
    pub async fn disconnect_from_database(&self, connection_id: &str) -> Result<()> {
        debug!("断开数据库连接: {}", connection_id);

        // 移除连接池
        {
            let mut pools = self.pools.write().await;
            if let Some(pool) = pools.remove(connection_id) {
                pool.close().await;
            }
        }

        info!("成功断开数据库连接: {}", connection_id);
        Ok(())
    }

    /// 检查并连接到 _internal 数据库以获取监控数据
    async fn check_and_connect_internal_database(&self, connection_id: &str) -> Result<()> {
        debug!("检查 _internal 数据库: {}", connection_id);

        // 获取数据库列表
        let manager = self.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;

        // 使用超时机制避免长时间等待
        let timeout_duration = std::time::Duration::from_secs(10);

        match tokio::time::timeout(timeout_duration, client.get_databases()).await {
            Ok(Ok(databases)) => {
                debug!("成功获取数据库列表，共 {} 个数据库", databases.len());

                // 检查是否存在 _internal 数据库
                if databases.iter().any(|db| db == "_internal") {
                    info!("发现 _internal 数据库，用于监控数据收集: {}", connection_id);

                    // 尝试执行一个简单的查询来验证 _internal 数据库的可用性
                    match tokio::time::timeout(
                        timeout_duration,
                        client.execute_query_with_database("SHOW MEASUREMENTS", Some("_internal"))
                    ).await {
                        Ok(Ok(_)) => {
                            info!("_internal 数据库连接验证成功: {}", connection_id);
                        }
                        Ok(Err(e)) => {
                            warn!("_internal 数据库查询失败，但不影响主连接: {}", e);
                        }
                        Err(_) => {
                            warn!("_internal 数据库查询超时，但不影响主连接");
                        }
                    }
                } else {
                    debug!("未发现 _internal 数据库，可能是较旧版本的 InfluxDB: {}", connection_id);
                }
            }
            Ok(Err(e)) => {
                warn!("获取数据库列表失败，无法检查 _internal 数据库: {}", e);
            }
            Err(_) => {
                warn!("获取数据库列表超时，跳过 _internal 数据库检查: {}", connection_id);
            }
        }

        Ok(())
    }

    /// 启动健康监控
    pub async fn start_health_monitoring(&self, interval_seconds: u64) -> Result<()> {
        debug!("启动健康监控，间隔: {}秒", interval_seconds);

        // 检查是否已经在运行
        if self.monitoring_active.load(Ordering::Relaxed) {
            warn!("健康监控已经在运行");
            return Ok(());
        }

        self.monitoring_active.store(true, Ordering::Relaxed);

        let manager = self.manager.clone();
        let monitoring_active = self.monitoring_active.clone();

        let handle = tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(interval_seconds));

            while monitoring_active.load(Ordering::Relaxed) {
                interval.tick().await;

                // 执行健康检查
                let health_results = manager.health_check_all().await;

                // 实现事件发送机制
                // 发送健康检查结果到前端
                for (connection_id, health_result) in health_results {
                    let event_data = serde_json::json!({
                        "type": "connection_health_update",
                        "connection_id": connection_id,
                        "health": health_result,
                        "timestamp": chrono::Utc::now().to_rfc3339()
                    });

                    // 在实际实现中，这里应该使用 Tauri 的事件系统
                    // 发送事件到前端监听器
                    debug!("健康检查事件: {}", event_data);

                    // 如果有 Tauri 应用句柄，可以这样发送事件：
                    // if let Some(app_handle) = &app_handle {
                    //     let _ = app_handle.emit_all("connection-health-update", &event_data);
                    // }
                }
            }
        });

        // 存储任务句柄
        {
            let mut monitoring_handle = self.monitoring_handle.lock().await;
            *monitoring_handle = Some(handle);
        }

        info!("健康监控已启动");
        Ok(())
    }

    /// 停止健康监控
    pub async fn stop_health_monitoring(&self) -> Result<()> {
        debug!("停止健康监控");

        self.monitoring_active.store(false, Ordering::Relaxed);

        // 取消监控任务
        {
            let mut monitoring_handle = self.monitoring_handle.lock().await;
            if let Some(handle) = monitoring_handle.take() {
                handle.abort();
            }
        }

        info!("健康监控已停止");
        Ok(())
    }

    /// 获取连接池统计信息
    pub async fn get_pool_stats(&self, connection_id: &str) -> Result<serde_json::Value> {
        debug!("获取连接池统计信息: {}", connection_id);

        let pools = self.pools.read().await;
        if let Some(pool) = pools.get(connection_id) {
            let stats = pool.get_stats().await;
            Ok(serde_json::json!({
                "connection_id": connection_id,
                "total_connections": stats.total_connections,
                "active_connections": stats.active_connections,
                "idle_connections": stats.idle_connections,
                "available_permits": stats.available_permits,
                "max_connections": stats.max_connections
            }))
        } else {
            Err(anyhow::anyhow!("连接池不存在: {}", connection_id))
        }
    }

    /// 获取所有连接配置
    pub async fn get_all_connections(&self) -> Result<Vec<crate::models::ConnectionConfig>> {
        debug!("获取所有连接配置");

        let configs = self.configs.read().await;
        let connections: Vec<crate::models::ConnectionConfig> = configs.values().cloned().collect();

        info!("返回 {} 个连接配置", connections.len());
        Ok(connections)
    }

    /// 清除所有连接配置
    pub async fn clear_all_connections(&self) -> Result<()> {
        debug!("清除所有连接配置");

        // 获取所有连接ID
        let connection_ids: Vec<String> = {
            let configs = self.configs.read().await;
            configs.keys().cloned().collect()
        };

        // 逐个删除连接
        for connection_id in connection_ids {
            if let Err(e) = self.manager.remove_connection(&connection_id).await {
                error!("从管理器移除连接失败: {} - {}", connection_id, e);
            }
        }

        // 清空配置存储
        {
            let mut configs = self.configs.write().await;
            configs.clear();
        }

        // 清空连接池
        {
            let mut pools = self.pools.write().await;
            pools.clear();
        }

        // 保存到文件（空配置）
        if let Err(e) = self.save_to_storage().await {
            error!("保存清空后的连接配置失败: {}", e);
        }

        info!("所有连接配置已清除");
        Ok(())
    }
}
