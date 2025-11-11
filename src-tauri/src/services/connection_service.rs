use crate::models::{ConnectionConfig, ConnectionStatus, ConnectionTestResult};
use crate::database::connection::ConnectionManager;
use crate::database::pool::{ConnectionPool, PoolConfig};
use crate::database::s3_client::S3ClientManager;
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

        // 设置时间戳
        let now = chrono::Utc::now();
        if config.created_at.is_none() {
            config.created_at = Some(now);
        }
        config.updated_at = Some(now);

        // 加密密码
        if let Some(password) = &config.password {
            let encrypted_password = self.encryption.encrypt_password(password)
                .context("密码加密失败")?;
            config.password = Some(encrypted_password);
        }

        // 加密 InfluxDB 2.x/3.x 的 API Token
        if let Some(ref mut v2_config) = config.v2_config {
            if !v2_config.api_token.is_empty() {
                let encrypted_token = self.encryption.encrypt_password(&v2_config.api_token)
                    .context("API Token 加密失败")?;
                v2_config.api_token = encrypted_token;
            }
        }

        // 加密代理密码
        if let Some(ref mut proxy_config) = config.proxy_config {
            if let Some(ref proxy_password) = proxy_config.password {
                if !proxy_password.is_empty() {
                    let encrypted_proxy_password = self.encryption.encrypt_password(proxy_password)
                        .context("代理密码加密失败")?;
                    proxy_config.password = Some(encrypted_proxy_password);
                }
            }
        }

        // 加密对象存储敏感字段
        if let Some(ref mut driver_config) = config.driver_config {
            if let Some(ref mut s3_config) = driver_config.s3 {
                // 加密 Secret Key
                if let Some(ref secret_key) = s3_config.secret_key {
                    if !secret_key.is_empty() {
                        let encrypted_secret_key = self.encryption.encrypt_password(secret_key)
                            .context("S3 Secret Key 加密失败")?;
                        s3_config.secret_key = Some(encrypted_secret_key);
                    }
                }

                // 加密 Session Token
                if let Some(ref session_token) = s3_config.session_token {
                    if !session_token.is_empty() {
                        let encrypted_session_token = self.encryption.encrypt_password(session_token)
                            .context("S3 Session Token 加密失败")?;
                        s3_config.session_token = Some(encrypted_session_token);
                    }
                }

                // 加密又拍云操作员密码
                if let Some(ref upyun_password) = s3_config.upyun_operator_password {
                    if !upyun_password.is_empty() {
                        let encrypted_upyun_password = self.encryption.encrypt_password(upyun_password)
                            .context("又拍云操作员密码加密失败")?;
                        s3_config.upyun_operator_password = Some(encrypted_upyun_password);
                    }
                }

                // 加密 GitHub Token
                if let Some(ref github_token) = s3_config.github_token {
                    if !github_token.is_empty() {
                        let encrypted_github_token = self.encryption.encrypt_password(github_token)
                            .context("GitHub Token 加密失败")?;
                        s3_config.github_token = Some(encrypted_github_token);
                    }
                }

                // 加密 SM.MS Token
                if let Some(ref smms_token) = s3_config.smms_token {
                    if !smms_token.is_empty() {
                        let encrypted_smms_token = self.encryption.encrypt_password(smms_token)
                            .context("SM.MS Token 加密失败")?;
                        s3_config.smms_token = Some(encrypted_smms_token);
                    }
                }
            }
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

        // 🔧 性能优化：不再立即添加到连接管理器，避免版本探测延迟
        // 连接将在第一次使用时（如测试连接、执行查询）才创建客户端
        // 这样保存连接时不会有延迟

        info!("连接 '{}' 创建成功（延迟初始化）", config.name);
        Ok(connection_id)
    }

    /// 测试连接
    pub async fn test_connection(&self, connection_id: &str) -> Result<ConnectionTestResult> {
        info!("🔍 测试连接: {}", connection_id);

        // 首先尝试从manager测试（如果连接已建立）
        if self.manager.connection_exists(connection_id).await {
            debug!("连接已在管理器中，直接测试");
            return self.manager.test_connection(connection_id).await
                .context("连接测试失败");
        }

        // 如果连接不在管理器中，从配置创建临时客户端测试
        debug!("连接不在管理器中，使用配置创建临时客户端测试");

        let config = {
            let configs = self.configs.read().await;
            configs.get(connection_id)
                .ok_or_else(|| anyhow::anyhow!("连接配置不存在: {}", connection_id))?
                .clone()
        };

        // 解密所有敏感字段用于测试
        debug!("🔐 解密敏感字段用于连接测试");
        let runtime_config = self.decrypt_sensitive_fields(&config)?;

        // 使用解密后的配置测试连接
        self.manager.test_new_connection(runtime_config).await
            .context("连接测试失败")
    }

    /// 测试新连接（不需要先保存）
    pub async fn test_new_connection(&self, config: ConnectionConfig) -> Result<ConnectionTestResult> {
        info!("🆕 测试新连接: {}", config.name);

        // 检查密码是否存在
        if config.password.is_some() {
            debug!("✓ 密码已提供（应该是明文）");
        } else {
            debug!("⚠️  未提供密码");
        }

        self.manager.test_new_connection(config).await
            .context("新连接测试失败")
    }

    /// 获取所有连接配置
    pub async fn get_connections(&self) -> Vec<ConnectionConfig> {
        let configs = self.configs.read().await;

        // 返回时移除所有敏感字段以确保安全
        configs.values().map(|config| {
            Self::sanitize_config(config)
        }).collect()
    }

    /// 获取连接配置
    pub async fn get_connection(&self, connection_id: &str) -> Option<ConnectionConfig> {
        let configs = self.configs.read().await;

        configs.get(connection_id).map(|config| {
            Self::sanitize_config(config)
        })
    }

    /// 清除配置中的敏感字段
    fn sanitize_config(config: &ConnectionConfig) -> ConnectionConfig {
        let mut safe_config = config.clone();

        // 清除通用密码
        safe_config.password = None;

        // 清除 InfluxDB 2.x/3.x 的 API Token
        if let Some(ref mut v2_config) = safe_config.v2_config {
            v2_config.api_token = String::new();
        }

        // 清除代理密码
        if let Some(ref mut proxy_config) = safe_config.proxy_config {
            proxy_config.password = None;
        }

        // 清除对象存储敏感字段
        if let Some(ref mut driver_config) = safe_config.driver_config {
            if let Some(ref mut s3_config) = driver_config.s3 {
                s3_config.secret_key = None;
                s3_config.session_token = None;
                s3_config.upyun_operator_password = None;
                s3_config.github_token = None;
                s3_config.smms_token = None;
            }
        }

        safe_config
    }

    /// 解密配置中的所有敏感字段
    fn decrypt_sensitive_fields(&self, config: &ConnectionConfig) -> Result<ConnectionConfig> {
        let mut runtime_config = config.clone();

        // 解密通用密码
        if let Some(encrypted_password) = &config.password {
            let decrypted_password = self.encryption.decrypt_password(encrypted_password)
                .context("密码解密失败")?;
            runtime_config.password = Some(decrypted_password);
        }

        // 解密 InfluxDB 2.x/3.x 的 API Token
        if let Some(ref mut v2_config) = runtime_config.v2_config {
            if !v2_config.api_token.is_empty() {
                let decrypted_token = self.encryption.decrypt_password(&v2_config.api_token)
                    .context("API Token 解密失败")?;
                v2_config.api_token = decrypted_token;
            }
        }

        // 解密代理密码
        if let Some(ref mut proxy_config) = runtime_config.proxy_config {
            if let Some(ref encrypted_proxy_password) = proxy_config.password {
                if !encrypted_proxy_password.is_empty() {
                    let decrypted_proxy_password = self.encryption.decrypt_password(encrypted_proxy_password)
                        .context("代理密码解密失败")?;
                    proxy_config.password = Some(decrypted_proxy_password);
                }
            }
        }

        // 解密对象存储敏感字段
        if let Some(ref mut driver_config) = runtime_config.driver_config {
            if let Some(ref mut s3_config) = driver_config.s3 {
                // 解密 Secret Key
                if let Some(ref encrypted_secret_key) = s3_config.secret_key {
                    if !encrypted_secret_key.is_empty() {
                        let decrypted_secret_key = self.encryption.decrypt_password(encrypted_secret_key)
                            .context("S3 Secret Key 解密失败")?;
                        s3_config.secret_key = Some(decrypted_secret_key);
                    }
                }

                // 解密 Session Token
                if let Some(ref encrypted_session_token) = s3_config.session_token {
                    if !encrypted_session_token.is_empty() {
                        let decrypted_session_token = self.encryption.decrypt_password(encrypted_session_token)
                            .context("S3 Session Token 解密失败")?;
                        s3_config.session_token = Some(decrypted_session_token);
                    }
                }

                // 解密又拍云操作员密码
                if let Some(ref encrypted_upyun_password) = s3_config.upyun_operator_password {
                    if !encrypted_upyun_password.is_empty() {
                        let decrypted_upyun_password = self.encryption.decrypt_password(encrypted_upyun_password)
                            .context("又拍云操作员密码解密失败")?;
                        s3_config.upyun_operator_password = Some(decrypted_upyun_password);
                    }
                }

                // 解密 GitHub Token
                if let Some(ref encrypted_github_token) = s3_config.github_token {
                    if !encrypted_github_token.is_empty() {
                        let decrypted_github_token = self.encryption.decrypt_password(encrypted_github_token)
                            .context("GitHub Token 解密失败")?;
                        s3_config.github_token = Some(decrypted_github_token);
                    }
                }

                // 解密 SM.MS Token
                if let Some(ref encrypted_smms_token) = s3_config.smms_token {
                    if !encrypted_smms_token.is_empty() {
                        let decrypted_smms_token = self.encryption.decrypt_password(encrypted_smms_token)
                            .context("SM.MS Token 解密失败")?;
                        s3_config.smms_token = Some(decrypted_smms_token);
                    }
                }
            }
        }

        Ok(runtime_config)
    }

    /// 更新连接
    pub async fn update_connection(&self, mut config: ConnectionConfig) -> Result<()> {
        debug!("更新连接: {}", config.name);

        let connection_id = config.id.clone();

        // 获取原有配置
        let old_config = {
            let configs = self.configs.read().await;
            configs.get(&connection_id)
                .ok_or_else(|| anyhow::anyhow!("连接 '{}' 不存在", connection_id))?
                .clone()
        };

        // 加密密码（如果提供了新密码）
        if let Some(password) = &config.password {
            if !password.is_empty() {
                let encrypted_password = self.encryption.encrypt_password(password)
                    .context("密码加密失败")?;
                config.password = Some(encrypted_password);
            } else {
                // 如果密码为空，保留原有的加密密码
                config.password = old_config.password.clone();
            }
        } else {
            // 如果没有提供密码，保留原有的加密密码
            config.password = old_config.password.clone();
        }

        // 加密 InfluxDB 2.x/3.x 的 API Token
        if let Some(ref mut v2_config) = config.v2_config {
            if !v2_config.api_token.is_empty() {
                // 如果提供了新的 API Token，加密它
                let encrypted_token = self.encryption.encrypt_password(&v2_config.api_token)
                    .context("API Token 加密失败")?;
                v2_config.api_token = encrypted_token;
            } else {
                // 如果 API Token 为空，保留原有的加密 API Token
                if let Some(ref old_v2_config) = old_config.v2_config {
                    v2_config.api_token = old_v2_config.api_token.clone();
                }
            }
        }

        // 加密代理密码
        if let Some(ref mut proxy_config) = config.proxy_config {
            if let Some(ref proxy_password) = proxy_config.password {
                if !proxy_password.is_empty() {
                    let encrypted_proxy_password = self.encryption.encrypt_password(proxy_password)
                        .context("代理密码加密失败")?;
                    proxy_config.password = Some(encrypted_proxy_password);
                } else {
                    // 如果代理密码为空，保留原有的加密代理密码
                    if let Some(ref old_proxy_config) = old_config.proxy_config {
                        proxy_config.password = old_proxy_config.password.clone();
                    }
                }
            } else {
                // 如果没有提供代理密码，保留原有的加密代理密码
                if let Some(ref old_proxy_config) = old_config.proxy_config {
                    proxy_config.password = old_proxy_config.password.clone();
                }
            }
        }

        // 加密对象存储敏感字段
        if let Some(ref mut driver_config) = config.driver_config {
            if let Some(ref mut s3_config) = driver_config.s3 {
                let old_s3_config = old_config.driver_config.as_ref()
                    .and_then(|dc| dc.s3.as_ref());

                // 加密 Secret Key
                if let Some(ref secret_key) = s3_config.secret_key {
                    if !secret_key.is_empty() {
                        let encrypted_secret_key = self.encryption.encrypt_password(secret_key)
                            .context("S3 Secret Key 加密失败")?;
                        s3_config.secret_key = Some(encrypted_secret_key);
                    } else if let Some(old_s3) = old_s3_config {
                        s3_config.secret_key = old_s3.secret_key.clone();
                    }
                } else if let Some(old_s3) = old_s3_config {
                    s3_config.secret_key = old_s3.secret_key.clone();
                }

                // 加密 Session Token
                if let Some(ref session_token) = s3_config.session_token {
                    if !session_token.is_empty() {
                        let encrypted_session_token = self.encryption.encrypt_password(session_token)
                            .context("S3 Session Token 加密失败")?;
                        s3_config.session_token = Some(encrypted_session_token);
                    } else if let Some(old_s3) = old_s3_config {
                        s3_config.session_token = old_s3.session_token.clone();
                    }
                } else if let Some(old_s3) = old_s3_config {
                    s3_config.session_token = old_s3.session_token.clone();
                }

                // 加密又拍云操作员密码
                if let Some(ref upyun_password) = s3_config.upyun_operator_password {
                    if !upyun_password.is_empty() {
                        let encrypted_upyun_password = self.encryption.encrypt_password(upyun_password)
                            .context("又拍云操作员密码加密失败")?;
                        s3_config.upyun_operator_password = Some(encrypted_upyun_password);
                    } else if let Some(old_s3) = old_s3_config {
                        s3_config.upyun_operator_password = old_s3.upyun_operator_password.clone();
                    }
                } else if let Some(old_s3) = old_s3_config {
                    s3_config.upyun_operator_password = old_s3.upyun_operator_password.clone();
                }

                // 加密 GitHub Token
                if let Some(ref github_token) = s3_config.github_token {
                    if !github_token.is_empty() {
                        let encrypted_github_token = self.encryption.encrypt_password(github_token)
                            .context("GitHub Token 加密失败")?;
                        s3_config.github_token = Some(encrypted_github_token);
                    } else if let Some(old_s3) = old_s3_config {
                        s3_config.github_token = old_s3.github_token.clone();
                    }
                } else if let Some(old_s3) = old_s3_config {
                    s3_config.github_token = old_s3.github_token.clone();
                }

                // 加密 SM.MS Token
                if let Some(ref smms_token) = s3_config.smms_token {
                    if !smms_token.is_empty() {
                        let encrypted_smms_token = self.encryption.encrypt_password(smms_token)
                            .context("SM.MS Token 加密失败")?;
                        s3_config.smms_token = Some(encrypted_smms_token);
                    } else if let Some(old_s3) = old_s3_config {
                        s3_config.smms_token = old_s3.smms_token.clone();
                    }
                } else if let Some(old_s3) = old_s3_config {
                    s3_config.smms_token = old_s3.smms_token.clone();
                }
            }
        }

        // 更新时间戳
        config.updated_at = Some(chrono::Utc::now());

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
        
        // 解密所有敏感字段用于连接
        let runtime_config = self.decrypt_sensitive_fields(&config)?;

        // 添加新连接
        self.manager.add_connection(runtime_config).await
            .context("添加新连接失败")?;
        
        info!("连接 '{}' 更新成功", config.name);
        Ok(())
    }

    /// 删除连接
    pub async fn delete_connection(&self, connection_id: &str) -> Result<()> {
        info!("🗑️  开始删除连接: {}", connection_id);

        // 检查连接状态
        let status = self.manager.get_connection_status(connection_id).await;
        if let Some(status) = status {
            if matches!(status.status, crate::models::ConnectionState::Connected) {
                warn!("连接 '{}' 处于已连接状态，将在删除时自动断开", connection_id);
                // remove_connection 会自动清理连接，无需手动断开
            }
        }

        // 从连接管理器移除（会自动断开连接）
        self.manager.remove_connection(connection_id).await
            .context("从连接管理器移除失败")?;
        info!("✅ 已从连接管理器移除: {}", connection_id);

        // 从配置中移除
        {
            let mut configs = self.configs.write().await;
            let removed = configs.remove(connection_id);
            if removed.is_some() {
                info!("✅ 已从内存配置中移除: {}", connection_id);
                info!("📊 删除后内存中剩余连接数: {}", configs.len());
                info!("📋 删除后剩余的连接ID列表: {:?}", configs.keys().collect::<Vec<_>>());
            } else {
                warn!("⚠️  配置中未找到要删除的连接: {}", connection_id);
            }
        }

        // 保存到文件
        info!("💾 开始保存更新后的配置到文件...");
        if let Err(e) = self.save_to_storage().await {
            error!("❌ 保存连接配置到文件失败: {}", e);
            return Err(anyhow::anyhow!("保存连接配置失败: {}", e));
        }

        info!("🎉 连接 '{}' 删除成功", connection_id);
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
    pub async fn establish_single_connection(
        &self,
        connection_id: &str,
        s3_manager: Option<Arc<Mutex<S3ClientManager>>>,
    ) -> Result<()> {
        // 检查连接是否已经存在于管理器中
        if self.manager.connection_exists(connection_id).await {
            debug!("连接已存在于管理器中: {}", connection_id);
            return Ok(());
        }

        // 获取配置
        let config = {
            let configs = self.configs.read().await;
            configs.get(connection_id)
                .ok_or_else(|| anyhow::anyhow!("连接配置不存在: {}", connection_id))?
                .clone()
        };

        // 解密所有敏感字段用于连接
        let runtime_config = match self.decrypt_sensitive_fields(&config) {
            Ok(config) => config,
            Err(e) => {
                error!("解密连接敏感字段失败: {} - {}", connection_id, e);
                return Err(e);
            }
        };

        // 添加到连接管理器（建立连接）
        self.manager.add_connection(runtime_config.clone()).await
            .context("添加连接到管理器失败")?;

        // 如果是对象存储连接，同时在全局 S3ClientManager 中注册
        if runtime_config.db_type == crate::models::DatabaseType::ObjectStorage {
            if let Some(s3_mgr) = s3_manager {
                info!("注册对象存储连接到全局 S3ClientManager: {}", connection_id);

                // 构建 S3ConnectionConfig
                let s3_connection_config = if let Some(driver_config) = &runtime_config.driver_config {
                    if let Some(s3_cfg) = &driver_config.s3 {
                        // 从 S3Config 转换为 S3ConnectionConfig
                        crate::database::s3_client::S3ConnectionConfig {
                            endpoint: s3_cfg.endpoint.clone().filter(|e| !e.is_empty()),
                            region: s3_cfg.region.clone().filter(|r| !r.is_empty()).or(Some("us-east-1".to_string())),
                            access_key: s3_cfg.access_key.clone().unwrap_or_else(||
                                runtime_config.username.clone().unwrap_or_default()
                            ),
                            secret_key: s3_cfg.secret_key.clone().unwrap_or_else(||
                                runtime_config.password.clone().unwrap_or_default()
                            ),
                            use_ssl: s3_cfg.use_ssl.unwrap_or(true),
                            path_style: s3_cfg.path_style.unwrap_or(false),
                            session_token: s3_cfg.session_token.clone().filter(|t| !t.is_empty()),
                            custom_domain: s3_cfg.custom_domain.clone().filter(|d| !d.is_empty()),
                        }
                    } else {
                        // 兼容旧版本配置
                        crate::database::s3_client::S3ConnectionConfig {
                            endpoint: if !runtime_config.host.is_empty() {
                                Some(runtime_config.host.clone())
                            } else {
                                None
                            },
                            region: Some("us-east-1".to_string()),
                            access_key: runtime_config.username.clone().unwrap_or_default(),
                            secret_key: runtime_config.password.clone().unwrap_or_default(),
                            use_ssl: runtime_config.ssl,
                            path_style: false,
                            session_token: None,
                            custom_domain: None,
                        }
                    }
                } else {
                    // 兼容旧版本配置
                    crate::database::s3_client::S3ConnectionConfig {
                        endpoint: if !runtime_config.host.is_empty() {
                            Some(runtime_config.host.clone())
                        } else {
                            None
                        },
                        region: Some("us-east-1".to_string()),
                        access_key: runtime_config.username.clone().unwrap_or_default(),
                        secret_key: runtime_config.password.clone().unwrap_or_default(),
                        use_ssl: runtime_config.ssl,
                        path_style: false,
                        session_token: None,
                        custom_domain: None,
                    }
                };

                // 在全局管理器中创建客户端
                let manager = s3_mgr.lock().await;
                manager.create_client(connection_id, &s3_connection_config).await
                    .context("在全局 S3ClientManager 中创建客户端失败")?;
                info!("对象存储连接已注册到全局 S3ClientManager: {}", connection_id);
            }
        }

        info!("连接建立成功: {}", connection_id);
        Ok(())
    }

    /// 获取连接数量
    pub async fn get_connection_count(&self) -> usize {
        self.manager.connection_count().await
    }

    /// 保存连接配置到文件
    async fn save_to_storage(&self) -> Result<()> {
        info!("📝 开始保存连接配置到文件: {:?}", self.storage_path);

        let configs = self.configs.read().await;
        let connections: Vec<ConnectionConfig> = configs.values().cloned().collect();

        info!("💾 准备保存 {} 个连接到文件", connections.len());
        info!("📋 将要保存的连接ID列表: {:?}",
            connections.iter().map(|c| &c.id).collect::<Vec<_>>());

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

        info!("📦 序列化数据大小: {} bytes", json_data.len());

        tokio::fs::write(&self.storage_path, &json_data).await
            .context("写入连接配置文件失败")?;

        info!("✅ 连接配置已成功保存到: {:?}", self.storage_path);

        // 验证写入
        if let Ok(file_size) = tokio::fs::metadata(&self.storage_path).await {
            info!("✓ 文件大小验证: {} bytes", file_size.len());
        }

        Ok(())
    }

    /// 从文件加载连接配置（公共方法）
    pub async fn load_from_storage(&self) -> Result<()> {
        self.load_from_storage_internal().await
    }

    /// 从文件加载连接配置（内部实现）
    async fn load_from_storage_internal(&self) -> Result<()> {
        info!("📂 开始从文件加载连接配置: {:?}", self.storage_path);

        // 检查文件是否存在
        if !self.storage_path.exists() {
            info!("⚠️  连接配置文件不存在，跳过加载");
            return Ok(());
        }

        // 检查文件大小
        if let Ok(metadata) = tokio::fs::metadata(&self.storage_path).await {
            info!("📄 配置文件大小: {} bytes", metadata.len());
        }

        // 读取文件内容
        let json_data = tokio::fs::read_to_string(&self.storage_path).await
            .context("读取连接配置文件失败")?;

        info!("📖 读取到 {} bytes 的配置数据", json_data.len());

        // 反序列化
        let storage: ConnectionStorage = serde_json::from_str(&json_data)
            .context("解析连接配置文件失败")?;

        info!("📦 从文件解析出 {} 个连接配置", storage.connections.len());
        info!("📋 加载的连接ID列表: {:?}",
            storage.connections.iter().map(|c| &c.id).collect::<Vec<_>>());

        // 清空现有配置（重要：避免加载旧数据）
        {
            let mut configs = self.configs.write().await;
            let old_count = configs.len();
            configs.clear();
            if old_count > 0 {
                info!("🗑️  清空了 {} 个旧的内存配置", old_count);
            }
        }

        // 加载连接配置
        let mut loaded_count = 0;
        for config in storage.connections {
            let config_id = config.id.clone();
            if let Err(e) = self.load_single_connection(config).await {
                error!("❌ 加载连接配置失败 ({}): {}", config_id, e);
            } else {
                loaded_count += 1;
            }
        }

        info!("✅ 成功加载 {} 个连接配置到内存", loaded_count);

        // 验证加载结果
        {
            let configs = self.configs.read().await;
            info!("✓ 内存中当前连接数: {}", configs.len());
            info!("✓ 内存中的连接ID列表: {:?}", configs.keys().collect::<Vec<_>>());
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
                if let Err(e) = self.establish_single_connection(connection_id, None).await {
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
