use crate::models::{ConnectionConfig, ConnectionStatus, ConnectionTestResult};
use crate::database::connection::ConnectionManager;
use crate::utils::encryption::EncryptionService;
use crate::utils::config::ConfigUtils;
use anyhow::{Context, Result};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::path::PathBuf;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};

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
        };

        service
    }

    /// 创建并初始化连接服务
    pub async fn new_with_load(encryption: Arc<EncryptionService>) -> Result<Self> {
        let service = Self::new(encryption);

        // 自动加载保存的连接
        if let Err(e) = service.load_from_storage().await {
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
        
        // 加密密码
        if let Some(password) = &config.password {
            let encrypted_password = self.encryption.encrypt_password(password)
                .context("密码加密失败")?;
            config.password = Some(encrypted_password);
        }
        
        let connection_id = config.id.clone();
        
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
        self.manager.get_all_statuses().await
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

    /// 加载单个连接配置
    async fn load_single_connection(&self, config: ConnectionConfig) -> Result<()> {
        let connection_id = config.id.clone();
        
        // 存储配置
        {
            let mut configs = self.configs.write().await;
            configs.insert(connection_id.clone(), config.clone());
        }
        
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
        
        // 添加到连接管理器
        self.manager.add_connection(runtime_config).await
            .context("添加连接到管理器失败")?;
        
        debug!("连接配置加载成功: {}", connection_id);
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

    /// 从文件加载连接配置
    async fn load_from_storage(&self) -> Result<()> {
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
}
