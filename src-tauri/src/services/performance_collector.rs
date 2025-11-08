use std::sync::Arc;
use tokio::time::{interval, Duration};
use sysinfo::System;
use tracing::{debug, info, error};
use super::performance_stats::{PerformanceStatsService, PerformanceDataPoint};

/// 性能数据采集器
pub struct PerformanceCollector {
    stats_service: Arc<PerformanceStatsService>,
    system: Arc<tokio::sync::Mutex<System>>,
    collection_interval: Duration,
}

impl PerformanceCollector {
    pub fn new(stats_service: Arc<PerformanceStatsService>) -> Self {
        Self {
            stats_service,
            system: Arc::new(tokio::sync::Mutex::new(System::new_all())),
            collection_interval: Duration::from_secs(60), // 每分钟采集一次
        }
    }
    
    /// 启动数据采集
    pub fn start(self: Arc<Self>) {
        tokio::spawn(async move {
            info!("性能数据采集器已启动");
            let mut interval_timer = interval(self.collection_interval);
            
            loop {
                interval_timer.tick().await;
                
                if let Err(e) = self.collect_performance_data().await {
                    error!("采集性能数据失败: {}", e);
                }
                
                // 定期清理过期数据
                self.stats_service.cleanup_old_data().await;
            }
        });
    }
    
    /// 采集性能数据
    async fn collect_performance_data(&self) -> Result<(), String> {
        debug!("开始采集性能数据");
        
        // 更新系统信息
        let (cpu_usage, memory_usage) = {
            let mut sys = self.system.lock().await;
            sys.refresh_cpu_all();
            sys.refresh_memory();

            // 等待一小段时间以获取准确的CPU使用率
            tokio::time::sleep(Duration::from_millis(200)).await;
            sys.refresh_cpu_all();

            let cpu = sys.global_cpu_usage() as f64;
            let memory = (sys.used_memory() as f64 / sys.total_memory() as f64) * 100.0;

            (cpu, memory)
        };
        
        debug!("系统资源: CPU {}%, 内存 {}%", cpu_usage, memory_usage);
        
        // 获取所有数据源的统计信息
        let all_stats = self.stats_service.get_all_stats().await;
        
        // 为每个数据源创建历史数据点
        let now = chrono::Utc::now();
        for stat in all_stats {
            // 计算每分钟查询数
            let queries_per_minute = if let Some(last_query) = stat.last_query_time {
                let minutes_since_last = (now - last_query).num_minutes() as f64;
                if minutes_since_last > 0.0 {
                    stat.total_queries_today as f64 / minutes_since_last.max(1.0)
                } else {
                    0.0
                }
            } else {
                0.0
            };
            
            // 计算错误数（最近一分钟的估算）
            let error_rate = if stat.successful_queries + stat.failed_queries > 0 {
                stat.failed_queries as f64 / (stat.successful_queries + stat.failed_queries) as f64
            } else {
                0.0
            };
            let error_count = (queries_per_minute * error_rate) as u32;
            
            let data_point = PerformanceDataPoint {
                timestamp: now,
                connection_id: stat.connection_id.clone(),
                database_name: stat.database_name.clone(),
                queries_per_minute,
                average_latency: stat.average_query_time,
                error_count,
                cpu_usage,
                memory_usage,
            };
            
            self.stats_service.add_history_point(data_point).await;
        }
        
        debug!("性能数据采集完成");
        Ok(())
    }
    
    /// 设置采集间隔
    pub fn set_interval(&mut self, seconds: u64) {
        self.collection_interval = Duration::from_secs(seconds);
        info!("性能数据采集间隔已设置为 {} 秒", seconds);
    }
}

