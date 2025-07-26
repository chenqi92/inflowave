use crate::models::{ConnectionConfig, ConnectionStatus, ConnectionTestResult};
use crate::database::client::{DatabaseClient, DatabaseClientFactory};
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use log::{debug, error, info, warn};

/// 连接管理器
#[derive(Debug)]
pub struct ConnectionManager {
    connections: Arc<RwLock<HashMap<String, Arc<DatabaseClient>>>>,
    statuses: Arc<RwLock<HashMap<String, ConnectionStatus>>>,
}

impl ConnectionManager {
    /// 创建新的连接管理器
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            statuses: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 添加连接
    pub async fn add_connection(&self, config: ConnectionConfig) -> Result<()> {
        let connection_id = config.id.clone();
        let db_type = config.db_type.clone();

        debug!("添加连接: {} ({:?} {}:{})", config.name, db_type, config.host, config.port);

        // 使用工厂创建客户端
        let client = DatabaseClientFactory::create_client(config.clone())
            .context("创建数据库客户端失败")?;

        // 存储连接
        {
            let mut connections = self.connections.write().await;
            connections.insert(connection_id.clone(), Arc::new(client));
        }

        // 初始化状态
        {
            let mut statuses = self.statuses.write().await;
            statuses.insert(connection_id.clone(), ConnectionStatus::new(connection_id));
        }

        info!("连接 '{}' 添加成功", config.name);
        Ok(())
    }

    /// 移除连接
    pub async fn remove_connection(&self, connection_id: &str) -> Result<()> {
        debug!("移除连接: {}", connection_id);
        
        // 移除连接
        {
            let mut connections = self.connections.write().await;
            connections.remove(connection_id);
        }
        
        // 移除状态
        {
            let mut statuses = self.statuses.write().await;
            statuses.remove(connection_id);
        }
        
        info!("连接 '{}' 移除成功", connection_id);
        Ok(())
    }

    /// 获取连接
    pub async fn get_connection(&self, connection_id: &str) -> Result<Arc<DatabaseClient>> {
        let connections = self.connections.read().await;

        connections
            .get(connection_id)
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("连接 '{}' 不存在", connection_id))
    }

    /// 测试连接
    pub async fn test_connection(&self, connection_id: &str) -> Result<ConnectionTestResult> {
        debug!("测试连接: {}", connection_id);
        
        // 更新状态为连接中
        self.update_status(connection_id, |status| {
            status.connecting()
        }).await;
        
        let client = self.get_connection(connection_id).await?;
        
        match client.test_connection().await {
            Ok(latency) => {
                // 更新状态为已连接
                self.update_status(connection_id, |status| {
                    status.connected(latency)
                }).await;
                
                info!("连接测试成功: {} ({}ms)", connection_id, latency);
                Ok(ConnectionTestResult::success(latency, None))
            }
            Err(e) => {
                let error_msg = e.to_string();
                
                // 更新状态为错误
                self.update_status(connection_id, |status| {
                    status.error(error_msg.clone())
                }).await;
                
                error!("连接测试失败: {} - {}", connection_id, error_msg);
                Ok(ConnectionTestResult::error(error_msg))
            }
        }
    }

    /// 获取连接状态
    pub async fn get_connection_status(&self, connection_id: &str) -> Option<ConnectionStatus> {
        let statuses = self.statuses.read().await;
        statuses.get(connection_id).cloned()
    }

    /// 获取所有连接状态
    pub async fn get_all_statuses(&self) -> HashMap<String, ConnectionStatus> {
        let statuses = self.statuses.read().await;
        statuses.clone()
    }

    /// 更新连接状态
    async fn update_status<F>(&self, connection_id: &str, updater: F)
    where
        F: FnOnce(ConnectionStatus) -> ConnectionStatus,
    {
        let mut statuses = self.statuses.write().await;
        
        if let Some(status) = statuses.get(connection_id).cloned() {
            let updated_status = updater(status);
            statuses.insert(connection_id.to_string(), updated_status);
        } else {
            warn!("尝试更新不存在的连接状态: {}", connection_id);
        }
    }

    /// 健康检查所有连接
    pub async fn health_check_all(&self) -> HashMap<String, ConnectionTestResult> {
        debug!("执行所有连接的健康检查");

        let connections = {
            let connections = self.connections.read().await;
            connections.keys().cloned().collect::<Vec<_>>()
        };

        let mut results = HashMap::new();

        for connection_id in connections {
            match self.test_connection(&connection_id).await {
                Ok(result) => {
                    // 更新连接状态
                    if result.success {
                        if let Some(latency) = result.latency {
                            self.update_status(&connection_id, |status| {
                                status.connected(latency)
                            }).await;
                        }
                    } else {
                        self.update_status(&connection_id, |status| {
                            status.error(result.error.clone().unwrap_or_default())
                        }).await;
                    }
                    results.insert(connection_id, result);
                }
                Err(e) => {
                    error!("健康检查失败: {} - {}", connection_id, e);
                    let error_msg = e.to_string();
                    self.update_status(&connection_id, |status| {
                        status.error(error_msg.clone())
                    }).await;
                    results.insert(connection_id, ConnectionTestResult::error(error_msg));
                }
            }
        }

        info!("健康检查完成，检查了 {} 个连接", results.len());
        results
    }

    /// 获取连接数量
    pub async fn connection_count(&self) -> usize {
        let connections = self.connections.read().await;
        connections.len()
    }

    /// 检查连接是否存在
    pub async fn connection_exists(&self, connection_id: &str) -> bool {
        let connections = self.connections.read().await;
        connections.contains_key(connection_id)
    }
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}
