use crate::database::InfluxClient;
use crate::models::ConnectionConfig;
use anyhow::{Context, Result};
use std::sync::Arc;
use tokio::sync::{RwLock, Semaphore};
use log::{debug, info, warn};

/// 连接池配置
#[derive(Debug, Clone)]
pub struct PoolConfig {
    pub max_connections: usize,
    pub min_connections: usize,
    pub connection_timeout: u64,
    pub idle_timeout: u64,
    pub max_lifetime: u64,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10,
            min_connections: 1,
            connection_timeout: 30,
            idle_timeout: 300,
            max_lifetime: 3600,
        }
    }
}

/// 连接池中的连接
#[derive(Debug)]
struct PooledConnection {
    client: Arc<InfluxClient>,
    created_at: std::time::Instant,
    last_used: std::time::Instant,
    in_use: bool,
}

impl PooledConnection {
    fn new(client: Arc<InfluxClient>) -> Self {
        let now = std::time::Instant::now();
        Self {
            client,
            created_at: now,
            last_used: now,
            in_use: false,
        }
    }

    fn is_expired(&self, max_lifetime: u64, idle_timeout: u64) -> bool {
        let now = std::time::Instant::now();
        
        // 检查最大生命周期
        if now.duration_since(self.created_at).as_secs() > max_lifetime {
            return true;
        }
        
        // 检查空闲超时
        if !self.in_use && now.duration_since(self.last_used).as_secs() > idle_timeout {
            return true;
        }
        
        false
    }

    fn acquire(&mut self) -> Arc<InfluxClient> {
        self.in_use = true;
        self.last_used = std::time::Instant::now();
        self.client.clone()
    }

    fn release(&mut self) {
        self.in_use = false;
        self.last_used = std::time::Instant::now();
    }
}

/// 连接池
#[derive(Debug)]
pub struct ConnectionPool {
    config: PoolConfig,
    connections: Arc<RwLock<Vec<PooledConnection>>>,
    semaphore: Arc<Semaphore>,
    connection_config: ConnectionConfig,
}

impl ConnectionPool {
    /// 创建新的连接池
    pub fn new(connection_config: ConnectionConfig, pool_config: PoolConfig) -> Self {
        let semaphore = Arc::new(Semaphore::new(pool_config.max_connections));
        
        Self {
            config: pool_config,
            connections: Arc::new(RwLock::new(Vec::new())),
            semaphore,
            connection_config,
        }
    }

    /// 获取连接
    pub async fn get_connection(&self) -> Result<PooledClient> {
        debug!("从连接池获取连接");
        
        // 获取信号量许可
        let permit = self.semaphore.clone().acquire_owned().await
            .context("获取连接池许可失败")?;
        
        // 尝试获取现有连接
        if let Some(client) = self.try_get_existing_connection().await {
            debug!("使用现有连接");
            return Ok(PooledClient::new(client, permit, self.clone()));
        }
        
        // 创建新连接
        debug!("创建新连接");
        let client = self.create_new_connection().await?;
        
        Ok(PooledClient::new(client, permit, self.clone()))
    }

    /// 尝试获取现有连接
    async fn try_get_existing_connection(&self) -> Option<Arc<InfluxClient>> {
        let mut connections = self.connections.write().await;
        
        // 清理过期连接
        self.cleanup_expired_connections(&mut connections).await;
        
        // 查找可用连接
        for conn in connections.iter_mut() {
            if !conn.in_use {
                return Some(conn.acquire());
            }
        }
        
        None
    }

    /// 创建新连接
    async fn create_new_connection(&self) -> Result<Arc<InfluxClient>> {
        let client = InfluxClient::new(self.connection_config.clone())
            .context("创建 InfluxDB 客户端失败")?;
        
        let client = Arc::new(client);
        
        // 测试连接
        client.test_connection().await
            .context("新连接测试失败")?;
        
        // 添加到连接池
        {
            let mut connections = self.connections.write().await;
            let mut pooled_conn = PooledConnection::new(client.clone());
            pooled_conn.in_use = true;
            connections.push(pooled_conn);
        }
        
        info!("创建新连接成功");
        Ok(client)
    }

    /// 释放连接
    async fn release_connection(&self, client: &Arc<InfluxClient>) {
        debug!("释放连接到连接池");
        
        let mut connections = self.connections.write().await;
        
        for conn in connections.iter_mut() {
            if Arc::ptr_eq(&conn.client, client) {
                conn.release();
                debug!("连接已释放");
                return;
            }
        }
        
        warn!("尝试释放不存在的连接");
    }

    /// 清理过期连接
    async fn cleanup_expired_connections(&self, connections: &mut Vec<PooledConnection>) {
        let initial_count = connections.len();
        
        connections.retain(|conn| {
            !conn.is_expired(self.config.max_lifetime, self.config.idle_timeout)
        });
        
        let removed_count = initial_count - connections.len();
        if removed_count > 0 {
            debug!("清理了 {} 个过期连接", removed_count);
        }
    }

    /// 获取连接池统计信息
    pub async fn get_stats(&self) -> PoolStats {
        let connections = self.connections.read().await;
        
        let total_connections = connections.len();
        let active_connections = connections.iter().filter(|c| c.in_use).count();
        let idle_connections = total_connections - active_connections;
        let available_permits = self.semaphore.available_permits();
        
        PoolStats {
            total_connections,
            active_connections,
            idle_connections,
            available_permits,
            max_connections: self.config.max_connections,
        }
    }

    /// 关闭连接池
    pub async fn close(&self) {
        info!("关闭连接池");
        
        let mut connections = self.connections.write().await;
        connections.clear();
        
        info!("连接池已关闭");
    }
}

/// 连接池统计信息
#[derive(Debug)]
pub struct PoolStats {
    pub total_connections: usize,
    pub active_connections: usize,
    pub idle_connections: usize,
    pub available_permits: usize,
    pub max_connections: usize,
}

/// 池化的客户端连接
pub struct PooledClient {
    client: Arc<InfluxClient>,
    _permit: tokio::sync::OwnedSemaphorePermit,
    pool: ConnectionPool,
}

impl PooledClient {
    fn new(
        client: Arc<InfluxClient>,
        permit: tokio::sync::OwnedSemaphorePermit,
        pool: ConnectionPool,
    ) -> Self {
        Self {
            client,
            _permit: permit,
            pool,
        }
    }

    /// 获取底层客户端
    pub fn client(&self) -> &InfluxClient {
        &self.client
    }
}

impl Drop for PooledClient {
    fn drop(&mut self) {
        let pool = self.pool.clone();
        let client = self.client.clone();
        
        // 异步释放连接
        tokio::spawn(async move {
            pool.release_connection(&client).await;
        });
    }
}

impl Clone for ConnectionPool {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            connections: self.connections.clone(),
            semaphore: self.semaphore.clone(),
            connection_config: self.connection_config.clone(),
        }
    }
}
