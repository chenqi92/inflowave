/**
 * InfluxDB 连接池优化
 * 
 * 提供高级连接池功能，包括连接复用、健康检查、负载均衡等
 */

use crate::database::influxdb::{InfluxDriver, InfluxDriverFactory};
use crate::models::ConnectionConfig;
use anyhow::{anyhow, Result};
use log::{debug, info, warn};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, RwLock, Semaphore};
// use tokio::time::sleep; // 暂时未使用

/// 连接池配置
#[derive(Debug, Clone)]
pub struct PoolConfig {
    /// 最大连接数
    pub max_connections: usize,
    /// 最小连接数
    pub min_connections: usize,
    /// 连接超时时间（秒）
    pub connection_timeout: u64,
    /// 空闲连接超时时间（秒）
    pub idle_timeout: u64,
    /// 健康检查间隔（秒）
    pub health_check_interval: u64,
    /// 重试次数
    pub max_retries: u32,
    /// 重试间隔（毫秒）
    pub retry_interval: u64,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10,
            min_connections: 2,
            connection_timeout: 30,
            idle_timeout: 300, // 5分钟
            health_check_interval: 60, // 1分钟
            max_retries: 3,
            retry_interval: 1000, // 1秒
        }
    }
}

/// 连接状态
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionStatus {
    /// 健康
    Healthy,
    /// 不健康
    Unhealthy,
    /// 连接中
    Connecting,
    /// 空闲
    Idle,
    /// 使用中
    InUse,
}

/// 池化连接
pub struct PooledConnection {
    /// 驱动实例
    pub driver: Arc<dyn InfluxDriver>,
    /// 连接状态
    pub status: ConnectionStatus,
    /// 创建时间
    pub created_at: Instant,
    /// 最后使用时间
    pub last_used: Instant,
    /// 使用次数
    pub use_count: u64,
    /// 连接配置
    pub config: ConnectionConfig,
}

impl PooledConnection {
    /// 创建新的池化连接
    pub async fn new(config: ConnectionConfig) -> Result<Self> {
        let driver = InfluxDriverFactory::create_driver(&config).await?;
        let now = Instant::now();
        
        Ok(Self {
            driver,
            status: ConnectionStatus::Idle,
            created_at: now,
            last_used: now,
            use_count: 0,
            config,
        })
    }
    
    /// 标记连接为使用中
    pub fn mark_in_use(&mut self) {
        self.status = ConnectionStatus::InUse;
        self.last_used = Instant::now();
        self.use_count += 1;
    }
    
    /// 标记连接为空闲
    pub fn mark_idle(&mut self) {
        self.status = ConnectionStatus::Idle;
        self.last_used = Instant::now();
    }
    
    /// 检查连接是否过期
    pub fn is_expired(&self, idle_timeout: Duration) -> bool {
        self.status == ConnectionStatus::Idle && 
        self.last_used.elapsed() > idle_timeout
    }
    
    /// 健康检查
    pub async fn health_check(&mut self) -> bool {
        match self.driver.health().await {
            Ok(health) => {
                let is_healthy = health.status == crate::database::influxdb::HealthStatus::Healthy;
                self.status = if is_healthy {
                    ConnectionStatus::Healthy
                } else {
                    ConnectionStatus::Unhealthy
                };
                is_healthy
            }
            Err(_) => {
                self.status = ConnectionStatus::Unhealthy;
                false
            }
        }
    }
}

/// InfluxDB 连接池
pub struct InfluxDBPool {
    /// 连接池配置
    config: PoolConfig,
    /// 连接配置
    connection_config: ConnectionConfig,
    /// 连接池
    connections: Arc<Mutex<Vec<PooledConnection>>>,
    /// 信号量控制并发
    semaphore: Arc<Semaphore>,
    /// 连接统计
    stats: Arc<RwLock<PoolStats>>,
    /// 是否正在运行
    running: Arc<Mutex<bool>>,
}

/// 连接池统计信息
#[derive(Debug, Default, Clone)]
pub struct PoolStats {
    /// 总连接数
    pub total_connections: usize,
    /// 活跃连接数
    pub active_connections: usize,
    /// 空闲连接数
    pub idle_connections: usize,
    /// 等待连接数
    pub waiting_connections: usize,
    /// 总查询数
    pub total_queries: u64,
    /// 成功查询数
    pub successful_queries: u64,
    /// 失败查询数
    pub failed_queries: u64,
    /// 平均响应时间（毫秒）
    pub avg_response_time: f64,
}

impl InfluxDBPool {
    /// 创建新的连接池
    pub async fn new(connection_config: ConnectionConfig, pool_config: PoolConfig) -> Result<Self> {
        let semaphore = Arc::new(Semaphore::new(pool_config.max_connections));
        let connections = Arc::new(Mutex::new(Vec::new()));
        let stats = Arc::new(RwLock::new(PoolStats::default()));
        let running = Arc::new(Mutex::new(true));
        
        let pool = Self {
            config: pool_config,
            connection_config,
            connections,
            semaphore,
            stats,
            running,
        };
        
        // 初始化最小连接数
        pool.initialize_connections().await?;
        
        // 启动后台任务
        pool.start_background_tasks().await;
        
        Ok(pool)
    }
    
    /// 初始化连接
    async fn initialize_connections(&self) -> Result<()> {
        let mut connections = self.connections.lock().await;
        
        for _ in 0..self.config.min_connections {
            match PooledConnection::new(self.connection_config.clone()).await {
                Ok(conn) => {
                    connections.push(conn);
                    info!("初始化连接成功");
                }
                Err(e) => {
                    warn!("初始化连接失败: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    /// 获取连接
    pub async fn get_connection(&self) -> Result<Arc<dyn InfluxDriver>> {
        // 获取信号量许可
        let _permit = self.semaphore.acquire().await
            .map_err(|_| anyhow!("获取连接许可失败"))?;
        
        let mut connections = self.connections.lock().await;
        
        // 查找空闲连接
        for conn in connections.iter_mut() {
            if conn.status == ConnectionStatus::Idle {
                conn.mark_in_use();
                return Ok(conn.driver.clone());
            }
        }
        
        // 如果没有空闲连接且未达到最大连接数，创建新连接
        if connections.len() < self.config.max_connections {
            match PooledConnection::new(self.connection_config.clone()).await {
                Ok(mut conn) => {
                    conn.mark_in_use();
                    let driver = conn.driver.clone();
                    connections.push(conn);
                    info!("创建新连接");
                    return Ok(driver);
                }
                Err(e) => {
                    warn!("创建新连接失败: {}", e);
                }
            }
        }
        
        Err(anyhow!("无法获取连接"))
    }
    
    /// 释放连接
    pub async fn release_connection(&self, driver: Arc<dyn InfluxDriver>) {
        let mut connections = self.connections.lock().await;
        
        for conn in connections.iter_mut() {
            if Arc::ptr_eq(&conn.driver, &driver) {
                conn.mark_idle();
                break;
            }
        }
    }
    
    /// 启动后台任务
    async fn start_background_tasks(&self) {
        let connections = self.connections.clone();
        let config = self.config.clone();
        let running = self.running.clone();
        let stats = self.stats.clone();
        
        // 健康检查任务
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(config.health_check_interval));
            
            loop {
                interval.tick().await;
                
                let running = running.lock().await;
                if !*running {
                    break;
                }
                drop(running);
                
                let mut connections = connections.lock().await;
                let mut healthy_count = 0;
                let mut unhealthy_count = 0;
                
                for conn in connections.iter_mut() {
                    if conn.health_check().await {
                        healthy_count += 1;
                    } else {
                        unhealthy_count += 1;
                    }
                }
                
                debug!("健康检查完成: {} 健康, {} 不健康", healthy_count, unhealthy_count);
                
                // 更新统计信息
                let mut stats = stats.write().await;
                stats.total_connections = connections.len();
                stats.active_connections = connections.iter()
                    .filter(|c| c.status == ConnectionStatus::InUse)
                    .count();
                stats.idle_connections = connections.iter()
                    .filter(|c| c.status == ConnectionStatus::Idle)
                    .count();
            }
        });
        
        // 连接清理任务
        let connections = self.connections.clone();
        let config = self.config.clone();
        let running = self.running.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(60)); // 每分钟清理一次
            
            loop {
                interval.tick().await;
                
                let running = running.lock().await;
                if !*running {
                    break;
                }
                drop(running);
                
                let mut connections = connections.lock().await;
                let idle_timeout = Duration::from_secs(config.idle_timeout);
                
                // 移除过期的空闲连接，但保持最小连接数
                let min_connections = config.min_connections;
                let mut to_remove = Vec::new();

                for (i, conn) in connections.iter().enumerate() {
                    if connections.len() > min_connections && conn.is_expired(idle_timeout) {
                        to_remove.push(i);
                    }
                }

                // 从后往前删除，避免索引变化
                for &i in to_remove.iter().rev() {
                    connections.remove(i);
                }
                
                debug!("连接清理完成，当前连接数: {}", connections.len());
            }
        });
    }
    
    /// 获取连接池统计信息
    pub async fn get_stats(&self) -> PoolStats {
        let stats = self.stats.read().await;
        (*stats).clone()
    }
    
    /// 关闭连接池
    pub async fn close(&self) -> Result<()> {
        info!("关闭连接池");
        
        // 停止后台任务
        let mut running = self.running.lock().await;
        *running = false;
        drop(running);
        
        // 关闭所有连接
        let mut connections = self.connections.lock().await;
        for conn in connections.iter() {
            if let Err(e) = conn.driver.close().await {
                warn!("关闭连接失败: {}", e);
            }
        }
        connections.clear();
        
        info!("连接池已关闭");
        Ok(())
    }
}

/// 连接池管理器
pub struct PoolManager {
    pools: Arc<RwLock<HashMap<String, Arc<InfluxDBPool>>>>,
}

impl PoolManager {
    /// 创建新的连接池管理器
    pub fn new() -> Self {
        Self {
            pools: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    /// 获取或创建连接池
    pub async fn get_or_create_pool(
        &self,
        connection_id: &str,
        connection_config: ConnectionConfig,
        pool_config: Option<PoolConfig>,
    ) -> Result<Arc<InfluxDBPool>> {
        let pools = self.pools.read().await;
        
        if let Some(pool) = pools.get(connection_id) {
            return Ok(pool.clone());
        }
        
        drop(pools);
        
        // 创建新的连接池
        let pool_config = pool_config.unwrap_or_default();
        let pool = Arc::new(InfluxDBPool::new(connection_config, pool_config).await?);
        
        let mut pools = self.pools.write().await;
        pools.insert(connection_id.to_string(), pool.clone());
        
        info!("创建新的连接池: {}", connection_id);
        Ok(pool)
    }
    
    /// 移除连接池
    pub async fn remove_pool(&self, connection_id: &str) -> Result<()> {
        let mut pools = self.pools.write().await;
        
        if let Some(pool) = pools.remove(connection_id) {
            pool.close().await?;
            info!("移除连接池: {}", connection_id);
        }
        
        Ok(())
    }
    
    /// 获取所有连接池统计信息
    pub async fn get_all_stats(&self) -> HashMap<String, PoolStats> {
        let pools = self.pools.read().await;
        let mut stats = HashMap::new();
        
        for (id, pool) in pools.iter() {
            stats.insert(id.clone(), pool.get_stats().await);
        }
        
        stats
    }
    
    /// 关闭所有连接池
    pub async fn close_all(&self) -> Result<()> {
        let mut pools = self.pools.write().await;
        
        for (id, pool) in pools.drain() {
            if let Err(e) = pool.close().await {
                warn!("关闭连接池 {} 失败: {}", id, e);
            }
        }
        
        info!("所有连接池已关闭");
        Ok(())
    }
}

impl Default for PoolManager {
    fn default() -> Self {
        Self::new()
    }
}
