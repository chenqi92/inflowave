use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use tracing::{debug, info};

/// 数据源性能统计
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataSourceStats {
    pub connection_id: String,
    pub database_name: String,
    
    // 查询统计
    pub total_queries_today: u64,
    pub total_queries_all_time: u64,
    pub active_queries: u32,
    pub successful_queries: u64,
    pub failed_queries: u64,
    
    // 性能统计
    pub total_query_time: f64, // 总查询时间（毫秒）
    pub average_query_time: f64, // 平均查询时间（毫秒）
    pub min_query_time: f64,
    pub max_query_time: f64,
    pub slow_queries_count: u32, // 慢查询数量（>1000ms）
    
    // 时间戳
    pub last_query_time: Option<DateTime<Utc>>,
    pub stats_start_time: DateTime<Utc>,
    pub last_reset_time: DateTime<Utc>,
}

impl DataSourceStats {
    pub fn new(connection_id: String, database_name: String) -> Self {
        let now = Utc::now();
        Self {
            connection_id,
            database_name,
            total_queries_today: 0,
            total_queries_all_time: 0,
            active_queries: 0,
            successful_queries: 0,
            failed_queries: 0,
            total_query_time: 0.0,
            average_query_time: 0.0,
            min_query_time: f64::MAX,
            max_query_time: 0.0,
            slow_queries_count: 0,
            last_query_time: None,
            stats_start_time: now,
            last_reset_time: now,
        }
    }
    
    /// 记录查询开始
    pub fn record_query_start(&mut self) {
        self.active_queries += 1;
    }
    
    /// 记录查询完成
    pub fn record_query_complete(&mut self, execution_time_ms: f64, success: bool) {
        if self.active_queries > 0 {
            self.active_queries -= 1;
        }
        
        self.total_queries_today += 1;
        self.total_queries_all_time += 1;
        
        if success {
            self.successful_queries += 1;
        } else {
            self.failed_queries += 1;
        }
        
        // 更新性能统计
        self.total_query_time += execution_time_ms;
        self.min_query_time = self.min_query_time.min(execution_time_ms);
        self.max_query_time = self.max_query_time.max(execution_time_ms);
        
        // 计算平均查询时间
        let total_completed = self.successful_queries + self.failed_queries;
        if total_completed > 0 {
            self.average_query_time = self.total_query_time / total_completed as f64;
        }
        
        // 记录慢查询（>1000ms）
        if execution_time_ms > 1000.0 {
            self.slow_queries_count += 1;
        }
        
        self.last_query_time = Some(Utc::now());
    }
    
    /// 重置今日统计
    pub fn reset_daily_stats(&mut self) {
        self.total_queries_today = 0;
        self.slow_queries_count = 0;
        self.last_reset_time = Utc::now();
    }
    
    /// 检查是否需要重置今日统计
    pub fn check_and_reset_daily(&mut self) {
        let now = Utc::now();
        let last_reset_date = self.last_reset_time.date_naive();
        let current_date = now.date_naive();
        
        if current_date > last_reset_date {
            debug!("重置 {}/{} 的今日统计", self.connection_id, self.database_name);
            self.reset_daily_stats();
        }
    }
}

/// 历史性能数据点
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceDataPoint {
    pub timestamp: DateTime<Utc>,
    pub connection_id: String,
    pub database_name: String,
    
    // 查询指标
    pub queries_per_minute: f64,
    pub average_latency: f64,
    pub error_count: u32,
    
    // 系统资源
    pub cpu_usage: f64,
    pub memory_usage: f64,
}

/// 性能统计服务
pub struct PerformanceStatsService {
    /// 数据源统计 - key: "connection_id/database_name"
    stats: Arc<RwLock<HashMap<String, DataSourceStats>>>,
    
    /// 历史数据点 - 保留最近24小时
    history: Arc<RwLock<Vec<PerformanceDataPoint>>>,
}

impl PerformanceStatsService {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(RwLock::new(HashMap::new())),
            history: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    /// 获取或创建数据源统计
    async fn get_or_create_stats(&self, connection_id: &str, database_name: &str) -> DataSourceStats {
        let key = format!("{}/{}", connection_id, database_name);
        let mut stats = self.stats.write().await;
        
        stats.entry(key.clone())
            .or_insert_with(|| {
                debug!("创建新的性能统计: {}", key);
                DataSourceStats::new(connection_id.to_string(), database_name.to_string())
            })
            .clone()
    }
    
    /// 记录查询开始
    pub async fn record_query_start(&self, connection_id: &str, database_name: &str) {
        let key = format!("{}/{}", connection_id, database_name);
        let mut stats = self.stats.write().await;
        
        if let Some(stat) = stats.get_mut(&key) {
            stat.record_query_start();
        } else {
            let mut new_stat = DataSourceStats::new(connection_id.to_string(), database_name.to_string());
            new_stat.record_query_start();
            stats.insert(key, new_stat);
        }
    }
    
    /// 记录查询完成
    pub async fn record_query_complete(
        &self,
        connection_id: &str,
        database_name: &str,
        execution_time_ms: f64,
        success: bool,
    ) {
        let key = format!("{}/{}", connection_id, database_name);
        let mut stats = self.stats.write().await;
        
        if let Some(stat) = stats.get_mut(&key) {
            stat.check_and_reset_daily();
            stat.record_query_complete(execution_time_ms, success);
            
            debug!(
                "记录查询完成: {} - {}ms (成功: {})",
                key, execution_time_ms, success
            );
        }
    }
    
    /// 获取数据源统计
    pub async fn get_stats(&self, connection_id: &str, database_name: &str) -> Option<DataSourceStats> {
        let key = format!("{}/{}", connection_id, database_name);
        let mut stats = self.stats.write().await;
        
        if let Some(stat) = stats.get_mut(&key) {
            stat.check_and_reset_daily();
            Some(stat.clone())
        } else {
            None
        }
    }
    
    /// 获取所有统计
    pub async fn get_all_stats(&self) -> Vec<DataSourceStats> {
        let mut stats = self.stats.write().await;
        
        // 检查并重置过期的今日统计
        for stat in stats.values_mut() {
            stat.check_and_reset_daily();
        }
        
        stats.values().cloned().collect()
    }
    
    /// 添加历史数据点
    pub async fn add_history_point(&self, point: PerformanceDataPoint) {
        let mut history = self.history.write().await;
        history.push(point);
        
        // 只保留最近24小时的数据
        let cutoff_time = Utc::now() - Duration::hours(24);
        history.retain(|p| p.timestamp > cutoff_time);
        
        debug!("添加历史数据点，当前历史记录数: {}", history.len());
    }
    
    /// 获取历史数据
    pub async fn get_history(
        &self,
        connection_id: &str,
        database_name: &str,
        time_range: &str,
    ) -> Vec<PerformanceDataPoint> {
        let history = self.history.read().await;
        
        let duration = match time_range {
            "1h" => Duration::hours(1),
            "6h" => Duration::hours(6),
            "24h" => Duration::hours(24),
            _ => Duration::hours(24),
        };
        
        let cutoff_time = Utc::now() - duration;
        
        history
            .iter()
            .filter(|p| {
                p.connection_id == connection_id
                    && p.database_name == database_name
                    && p.timestamp > cutoff_time
            })
            .cloned()
            .collect()
    }
    
    /// 清理过期数据
    pub async fn cleanup_old_data(&self) {
        let mut history = self.history.write().await;
        let cutoff_time = Utc::now() - Duration::hours(24);
        
        let before_count = history.len();
        history.retain(|p| p.timestamp > cutoff_time);
        let after_count = history.len();
        
        if before_count != after_count {
            info!("清理过期历史数据: {} -> {}", before_count, after_count);
        }
    }
}

impl Default for PerformanceStatsService {
    fn default() -> Self {
        Self::new()
    }
}

