/**
 * InfluxDB 监控和指标收集
 * 
 * 提供性能监控、指标收集和分析功能
 */

use log::{debug, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;

/// 查询性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryMetrics {
    /// 查询ID
    pub query_id: String,
    /// 查询语句
    pub query: String,
    /// 查询语言
    pub language: String,
    /// 数据库名称
    pub database: Option<String>,
    /// 开始时间
    pub start_time: u64,
    /// 执行时间（毫秒）
    pub execution_time: u64,
    /// 返回行数
    pub row_count: u64,
    /// 是否成功
    pub success: bool,
    /// 错误信息
    pub error: Option<String>,
    /// 连接ID
    pub connection_id: String,
}

/// 连接性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionMetrics {
    /// 连接ID
    pub connection_id: String,
    /// 连接创建时间
    pub created_at: u64,
    /// 总查询数
    pub total_queries: u64,
    /// 成功查询数
    pub successful_queries: u64,
    /// 失败查询数
    pub failed_queries: u64,
    /// 平均响应时间（毫秒）
    pub avg_response_time: f64,
    /// 最大响应时间（毫秒）
    pub max_response_time: u64,
    /// 最小响应时间（毫秒）
    pub min_response_time: u64,
    /// 连接状态
    pub status: String,
    /// 最后活动时间
    pub last_activity: u64,
}

/// 系统性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemMetrics {
    /// 时间戳
    pub timestamp: u64,
    /// CPU 使用率
    pub cpu_usage: f64,
    /// 内存使用量（MB）
    pub memory_usage: u64,
    /// 活跃连接数
    pub active_connections: usize,
    /// 总查询数
    pub total_queries: u64,
    /// 每秒查询数
    pub queries_per_second: f64,
    /// 平均响应时间（毫秒）
    pub avg_response_time: f64,
    /// 错误率
    pub error_rate: f64,
}

/// 性能统计
#[derive(Debug, Clone, Default)]
pub struct PerformanceStats {
    /// 总查询数
    pub total_queries: u64,
    /// 成功查询数
    pub successful_queries: u64,
    /// 失败查询数
    pub failed_queries: u64,
    /// 总执行时间（毫秒）
    pub total_execution_time: u64,
    /// 最大执行时间（毫秒）
    pub max_execution_time: u64,
    /// 最小执行时间（毫秒）
    pub min_execution_time: u64,
    /// 响应时间分布
    pub response_time_distribution: HashMap<String, u64>,
}

impl PerformanceStats {
    /// 添加查询指标
    pub fn add_query_metric(&mut self, metric: &QueryMetrics) {
        self.total_queries += 1;
        
        if metric.success {
            self.successful_queries += 1;
        } else {
            self.failed_queries += 1;
        }
        
        self.total_execution_time += metric.execution_time;
        
        if self.max_execution_time == 0 || metric.execution_time > self.max_execution_time {
            self.max_execution_time = metric.execution_time;
        }
        
        if self.min_execution_time == 0 || metric.execution_time < self.min_execution_time {
            self.min_execution_time = metric.execution_time;
        }
        
        // 更新响应时间分布
        let bucket = self.get_response_time_bucket(metric.execution_time);
        *self.response_time_distribution.entry(bucket).or_insert(0) += 1;
    }
    
    /// 获取平均响应时间
    pub fn avg_response_time(&self) -> f64 {
        if self.total_queries == 0 {
            0.0
        } else {
            self.total_execution_time as f64 / self.total_queries as f64
        }
    }
    
    /// 获取成功率
    pub fn success_rate(&self) -> f64 {
        if self.total_queries == 0 {
            0.0
        } else {
            self.successful_queries as f64 / self.total_queries as f64 * 100.0
        }
    }
    
    /// 获取响应时间分布桶
    fn get_response_time_bucket(&self, execution_time: u64) -> String {
        match execution_time {
            0..=100 => "0-100ms".to_string(),
            101..=500 => "101-500ms".to_string(),
            501..=1000 => "501-1000ms".to_string(),
            1001..=5000 => "1-5s".to_string(),
            5001..=10000 => "5-10s".to_string(),
            _ => ">10s".to_string(),
        }
    }
}

/// 指标收集器
pub struct MetricsCollector {
    /// 查询指标历史
    query_metrics: Arc<RwLock<Vec<QueryMetrics>>>,
    /// 连接指标
    connection_metrics: Arc<RwLock<HashMap<String, ConnectionMetrics>>>,
    /// 性能统计
    performance_stats: Arc<RwLock<PerformanceStats>>,
    /// 最大历史记录数
    max_history_size: usize,
}

impl MetricsCollector {
    /// 创建新的指标收集器
    pub fn new(max_history_size: usize) -> Self {
        Self {
            query_metrics: Arc::new(RwLock::new(Vec::new())),
            connection_metrics: Arc::new(RwLock::new(HashMap::new())),
            performance_stats: Arc::new(RwLock::new(PerformanceStats::default())),
            max_history_size,
        }
    }
    
    /// 记录查询指标
    pub async fn record_query_metric(&self, metric: QueryMetrics) {
        debug!("记录查询指标: {} ({}ms)", metric.query_id, metric.execution_time);
        
        // 更新性能统计
        {
            let mut stats = self.performance_stats.write().await;
            stats.add_query_metric(&metric);
        }
        
        // 更新连接指标
        {
            let mut conn_metrics = self.connection_metrics.write().await;
            let conn_metric = conn_metrics.entry(metric.connection_id.clone())
                .or_insert_with(|| ConnectionMetrics {
                    connection_id: metric.connection_id.clone(),
                    created_at: chrono::Utc::now().timestamp() as u64,
                    total_queries: 0,
                    successful_queries: 0,
                    failed_queries: 0,
                    avg_response_time: 0.0,
                    max_response_time: 0,
                    min_response_time: 0,
                    status: "active".to_string(),
                    last_activity: metric.start_time,
                });
            
            conn_metric.total_queries += 1;
            if metric.success {
                conn_metric.successful_queries += 1;
            } else {
                conn_metric.failed_queries += 1;
            }
            
            // 更新响应时间统计
            let total_time = conn_metric.avg_response_time * (conn_metric.total_queries - 1) as f64 + metric.execution_time as f64;
            conn_metric.avg_response_time = total_time / conn_metric.total_queries as f64;
            
            if metric.execution_time > conn_metric.max_response_time {
                conn_metric.max_response_time = metric.execution_time;
            }
            
            if conn_metric.min_response_time == 0 || metric.execution_time < conn_metric.min_response_time {
                conn_metric.min_response_time = metric.execution_time;
            }
            
            conn_metric.last_activity = metric.start_time;
        }
        
        // 添加到历史记录
        {
            let mut metrics = self.query_metrics.write().await;
            metrics.push(metric);
            
            // 限制历史记录大小
            if metrics.len() > self.max_history_size {
                let excess = metrics.len() - self.max_history_size;
                metrics.drain(0..excess);
            }
        }
    }
    
    /// 获取查询指标历史
    pub async fn get_query_metrics(&self, limit: Option<usize>) -> Vec<QueryMetrics> {
        let metrics = self.query_metrics.read().await;
        
        if let Some(limit) = limit {
            metrics.iter().rev().take(limit).cloned().collect()
        } else {
            metrics.clone()
        }
    }
    
    /// 获取连接指标
    pub async fn get_connection_metrics(&self) -> HashMap<String, ConnectionMetrics> {
        self.connection_metrics.read().await.clone()
    }
    
    /// 获取性能统计
    pub async fn get_performance_stats(&self) -> PerformanceStats {
        self.performance_stats.read().await.clone()
    }
    
    /// 获取系统指标
    pub async fn get_system_metrics(&self) -> SystemMetrics {
        let stats = self.performance_stats.read().await;
        let conn_metrics = self.connection_metrics.read().await;
        
        SystemMetrics {
            timestamp: chrono::Utc::now().timestamp() as u64,
            cpu_usage: Self::get_cpu_usage(),
            memory_usage: Self::get_memory_usage(),
            active_connections: conn_metrics.len(),
            total_queries: stats.total_queries,
            queries_per_second: 0.0, // TODO: 实现 QPS 计算
            avg_response_time: stats.avg_response_time(),
            error_rate: if stats.total_queries == 0 {
                0.0
            } else {
                stats.failed_queries as f64 / stats.total_queries as f64 * 100.0
            },
        }
    }
    
    /// 获取慢查询
    pub async fn get_slow_queries(&self, threshold_ms: u64, limit: Option<usize>) -> Vec<QueryMetrics> {
        let metrics = self.query_metrics.read().await;
        
        let mut slow_queries: Vec<QueryMetrics> = metrics
            .iter()
            .filter(|m| m.execution_time >= threshold_ms)
            .cloned()
            .collect();
        
        // 按执行时间降序排序
        slow_queries.sort_by(|a, b| b.execution_time.cmp(&a.execution_time));
        
        if let Some(limit) = limit {
            slow_queries.truncate(limit);
        }
        
        slow_queries
    }
    
    /// 获取错误查询
    pub async fn get_error_queries(&self, limit: Option<usize>) -> Vec<QueryMetrics> {
        let metrics = self.query_metrics.read().await;
        
        let mut error_queries: Vec<QueryMetrics> = metrics
            .iter()
            .filter(|m| !m.success)
            .cloned()
            .collect();
        
        // 按时间降序排序
        error_queries.sort_by(|a, b| b.start_time.cmp(&a.start_time));
        
        if let Some(limit) = limit {
            error_queries.truncate(limit);
        }
        
        error_queries
    }
    
    /// 清理过期指标
    pub async fn cleanup_expired_metrics(&self, retention_hours: u64) {
        let cutoff_time = chrono::Utc::now().timestamp() as u64 - retention_hours * 3600;
        
        // 清理查询指标
        {
            let mut metrics = self.query_metrics.write().await;
            metrics.retain(|m| m.start_time >= cutoff_time);
        }
        
        // 清理不活跃的连接指标
        {
            let mut conn_metrics = self.connection_metrics.write().await;
            conn_metrics.retain(|_, m| m.last_activity >= cutoff_time);
        }
        
        info!("清理过期指标完成");
    }
    
    /// 重置统计信息
    pub async fn reset_stats(&self) {
        let mut stats = self.performance_stats.write().await;
        *stats = PerformanceStats::default();
        
        let mut metrics = self.query_metrics.write().await;
        metrics.clear();
        
        let mut conn_metrics = self.connection_metrics.write().await;
        conn_metrics.clear();
        
        info!("统计信息已重置");
    }
}

/// 全局指标收集器实例
static mut GLOBAL_METRICS_COLLECTOR: Option<Arc<MetricsCollector>> = None;
static INIT: std::sync::Once = std::sync::Once::new();

/// 获取全局指标收集器
pub fn get_global_metrics_collector() -> Arc<MetricsCollector> {
    unsafe {
        INIT.call_once(|| {
            GLOBAL_METRICS_COLLECTOR = Some(Arc::new(MetricsCollector::new(10000)));
        });
        GLOBAL_METRICS_COLLECTOR.as_ref().unwrap().clone()
    }
}

/// 记录查询开始
pub fn record_query_start(query_id: String, query: String, connection_id: String) -> QueryTracker {
    QueryTracker::new(query_id, query, connection_id)
}

/// 查询跟踪器
pub struct QueryTracker {
    query_id: String,
    query: String,
    connection_id: String,
    start_time: Instant,
    start_timestamp: u64,
}

impl QueryTracker {
    fn new(query_id: String, query: String, connection_id: String) -> Self {
        Self {
            query_id,
            query,
            connection_id,
            start_time: Instant::now(),
            start_timestamp: chrono::Utc::now().timestamp() as u64,
        }
    }
    
    /// 记录查询完成
    pub async fn finish(self, success: bool, row_count: u64, error: Option<String>) {
        let execution_time = self.start_time.elapsed().as_millis() as u64;
        
        let metric = QueryMetrics {
            query_id: self.query_id,
            query: self.query,
            language: "auto".to_string(), // TODO: 检测查询语言
            database: None, // TODO: 从查询中提取数据库名
            start_time: self.start_timestamp,
            execution_time,
            row_count,
            success,
            error,
            connection_id: self.connection_id,
        };
        
        let collector = get_global_metrics_collector();
        collector.record_query_metric(metric).await;
    }
}
