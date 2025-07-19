use serde::{Deserialize, Serialize};
use tauri::State;
use log::{debug, error};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use crate::services::ConnectionService;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PerformanceMetrics {
    pub query_performance: QueryPerformanceMetrics,
    pub connection_health: Vec<ConnectionHealthMetrics>,
    pub system_resources: SystemResourceMetrics,
    pub slow_queries: Vec<SlowQueryInfo>,
    pub storage_analysis: StorageAnalysisInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueryPerformanceMetrics {
    pub total_queries: u64,
    pub average_execution_time: f64,
    pub slow_query_threshold: u64,
    pub slow_query_count: u64,
    pub error_rate: f64,
    pub queries_per_second: f64,
    pub peak_qps: f64,
    pub time_range: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionHealthMetrics {
    pub connection_id: String,
    pub status: String,
    pub response_time: u64,
    pub uptime: u64,
    pub last_check: chrono::DateTime<chrono::Utc>,
    pub error_count: u64,
    pub warning_count: u64,
    pub memory_usage: f64,
    pub cpu_usage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemResourceMetrics {
    pub memory: MemoryMetrics,
    pub cpu: CpuMetrics,
    pub disk: DiskMetrics,
    pub network: NetworkMetrics,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoryMetrics {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CpuMetrics {
    pub cores: u32,
    pub usage: f64,
    pub load_average: Vec<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskMetrics {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetworkMetrics {
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub packets_in: u64,
    pub packets_out: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SlowQueryInfo {
    pub id: String,
    pub query: String,
    pub database: String,
    pub execution_time: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub rows_returned: u64,
    pub connection_id: String,
    pub optimization: Option<QueryOptimization>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueryOptimization {
    pub suggestions: Vec<String>,
    pub estimated_improvement: f64,
    pub optimized_query: Option<String>,
    pub index_recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StorageAnalysisInfo {
    pub databases: Vec<DatabaseStorageInfo>,
    pub total_size: u64,
    pub compression_ratio: f64,
    pub retention_policy_effectiveness: f64,
    pub recommendations: Vec<StorageRecommendation>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DatabaseStorageInfo {
    pub name: String,
    pub size: u64,
    pub measurement_count: u64,
    pub series_count: u64,
    pub point_count: u64,
    pub oldest_point: chrono::DateTime<chrono::Utc>,
    pub newest_point: chrono::DateTime<chrono::Utc>,
    pub compression_ratio: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StorageRecommendation {
    pub recommendation_type: String,
    pub description: String,
    pub estimated_savings: u64,
    pub priority: String,
    pub action: String,
}

// 性能数据存储
pub type PerformanceStorage = Mutex<HashMap<String, Vec<PerformanceMetrics>>>;
pub type QueryMetricsStorage = Mutex<Vec<SlowQueryInfo>>;

/// 获取性能指标
#[tauri::command]
pub async fn get_performance_metrics(
    connection_service: State<'_, ConnectionService>,
    connection_id: Option<String>,
    time_range: Option<String>,
) -> Result<PerformanceMetrics, String> {
    debug!("获取性能指标");
    
    let time_range = time_range.unwrap_or_else(|| "1h".to_string());
    
    // 获取查询性能指标
    let query_performance = get_query_performance_metrics(&time_range).await?;
    
    // 获取连接健康状态
    let connection_health = get_connection_health_metrics(connection_service.clone(), connection_id).await?;
    
    // 获取系统资源指标
    let system_resources = get_system_resource_metrics().await?;
    
    // 获取慢查询信息
    let slow_queries = get_slow_queries(&time_range).await?;
    
    // 获取存储分析
    let storage_analysis = get_storage_analysis(connection_service).await?;
    
    Ok(PerformanceMetrics {
        query_performance,
        connection_health,
        system_resources,
        slow_queries,
        storage_analysis,
    })
}

/// 记录查询性能
#[tauri::command]
pub async fn record_query_performance(
    query_metrics_storage: State<'_, QueryMetricsStorage>,
    query: String,
    database: String,
    connection_id: String,
    execution_time: u64,
    rows_returned: u64,
    _success: bool,
) -> Result<(), String> {
    debug!("记录查询性能: {}ms", execution_time);
    
    // 如果是慢查询，记录详细信息
    let slow_query_threshold = 5000; // 5秒
    if execution_time > slow_query_threshold {
        let slow_query = SlowQueryInfo {
            id: uuid::Uuid::new_v4().to_string(),
            query: query.clone(),
            database,
            execution_time,
            timestamp: chrono::Utc::now(),
            rows_returned,
            connection_id,
            optimization: analyze_query_optimization(&query),
        };
        
        let mut storage = query_metrics_storage.lock().map_err(|e| {
            error!("获取查询指标存储锁失败: {}", e);
            "存储访问失败".to_string()
        })?;
        
        // 限制慢查询记录数量
        if storage.len() >= 1000 {
            storage.remove(0);
        }
        
        storage.push(slow_query);
    }
    
    Ok(())
}

/// 获取慢查询分析
#[tauri::command]
pub async fn get_slow_query_analysis(
    query_metrics_storage: State<'_, QueryMetricsStorage>,
    limit: Option<usize>,
) -> Result<Vec<SlowQueryInfo>, String> {
    debug!("获取慢查询分析");
    
    let storage = query_metrics_storage.lock().map_err(|e| {
        error!("获取查询指标存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    let limit = limit.unwrap_or(50);
    let mut slow_queries: Vec<SlowQueryInfo> = storage.clone();
    
    // 按执行时间倒序排列
    slow_queries.sort_by(|a, b| b.execution_time.cmp(&a.execution_time));
    
    Ok(slow_queries.into_iter().take(limit).collect())
}

/// 获取存储分析报告
#[tauri::command]
pub async fn get_storage_analysis_report(
    connection_service: State<'_, ConnectionService>,
    _connection_id: String,
) -> Result<StorageAnalysisInfo, String> {
    debug!("获取存储分析报告");
    
    get_storage_analysis(connection_service).await
}

/// 获取查询优化建议
#[tauri::command]
pub async fn get_query_optimization_suggestions(
    query: String,
) -> Result<QueryOptimization, String> {
    debug!("获取查询优化建议");
    
    analyze_query_optimization(&query).ok_or_else(|| "无法分析查询".to_string())
}

/// 健康检查
#[tauri::command]
pub async fn perform_health_check(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<ConnectionHealthMetrics, String> {
    debug!("执行健康检查: {}", connection_id);
    
    let start_time = Instant::now();
    let manager = connection_service.get_manager();
    
    match manager.get_connection(&connection_id).await {
        Ok(client) => {
            // 执行简单的健康检查查询
            let health_query = "SHOW DATABASES";
            match client.execute_query(health_query).await {
                Ok(_) => {
                    let response_time = start_time.elapsed().as_millis() as u64;
                    Ok(ConnectionHealthMetrics {
                        connection_id,
                        status: "healthy".to_string(),
                        response_time,
                        uptime: 0, // 需要从连接获取
                        last_check: chrono::Utc::now(),
                        error_count: 0,
                        warning_count: 0,
                        memory_usage: 0.0,
                        cpu_usage: 0.0,
                    })
                }
                Err(e) => {
                    error!("健康检查查询失败: {}", e);
                    Ok(ConnectionHealthMetrics {
                        connection_id,
                        status: "critical".to_string(),
                        response_time: start_time.elapsed().as_millis() as u64,
                        uptime: 0,
                        last_check: chrono::Utc::now(),
                        error_count: 1,
                        warning_count: 0,
                        memory_usage: 0.0,
                        cpu_usage: 0.0,
                    })
                }
            }
        }
        Err(e) => {
            error!("获取连接失败: {}", e);
            Err(format!("连接失败: {}", e))
        }
    }
}

// 辅助函数实现
async fn get_query_performance_metrics(time_range: &str) -> Result<QueryPerformanceMetrics, String> {
    // 模拟查询性能数据
    Ok(QueryPerformanceMetrics {
        total_queries: 1250,
        average_execution_time: 245.5,
        slow_query_threshold: 5000,
        slow_query_count: 12,
        error_rate: 0.8,
        queries_per_second: 15.2,
        peak_qps: 45.8,
        time_range: time_range.to_string(),
    })
}

async fn get_connection_health_metrics(
    _connection_service: State<'_, ConnectionService>,
    connection_id: Option<String>,
) -> Result<Vec<ConnectionHealthMetrics>, String> {
    // TODO: 实现实际的连接健康监控
    // 1. 从ConnectionService获取实际连接状态
    // 2. 检查连接响应时间
    // 3. 监控连接错误率
    // 4. 收集连接资源使用情况
    
    // 当前为模拟数据
    let mut health_metrics = Vec::new();
    
    if let Some(conn_id) = connection_id {
        let health = ConnectionHealthMetrics {
            connection_id: conn_id,
            status: "healthy".to_string(),
            response_time: 125,
            uptime: 86400,
            last_check: chrono::Utc::now(),
            error_count: 0,
            warning_count: 1,
            memory_usage: 45.2,
            cpu_usage: 12.8,
        };
        health_metrics.push(health);
    }
    
    Ok(health_metrics)
}

async fn get_system_resource_metrics() -> Result<SystemResourceMetrics, String> {
    // 使用 sysinfo 获取真实的系统信息
    use sysinfo::{System, SystemExt, CpuExt, DiskExt, NetworksExt, NetworkExt};
    
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let memory = MemoryMetrics {
        total: sys.total_memory(),
        used: sys.used_memory(),
        available: sys.available_memory(),
        percentage: (sys.used_memory() as f64 / sys.total_memory() as f64) * 100.0,
    };
    
    let cpu = CpuMetrics {
        cores: sys.cpus().len() as u32,
        usage: sys.global_cpu_info().cpu_usage() as f64,
        load_average: vec![sys.load_average().one, sys.load_average().five, sys.load_average().fifteen],
    };
    
    let disk = if let Some(disk) = sys.disks().first() {
        DiskMetrics {
            total: disk.total_space(),
            used: disk.total_space() - disk.available_space(),
            available: disk.available_space(),
            percentage: ((disk.total_space() - disk.available_space()) as f64 / disk.total_space() as f64) * 100.0,
        }
    } else {
        DiskMetrics {
            total: 0,
            used: 0,
            available: 0,
            percentage: 0.0,
        }
    };
    
    // 获取网络接口统计信息
    let network = if let Some(interface) = sys.networks().iter().next() {
        let (_, network_data) = interface;
        NetworkMetrics {
            bytes_in: network_data.total_received(),
            bytes_out: network_data.total_transmitted(),
            packets_in: network_data.total_packets_received(),
            packets_out: network_data.total_packets_transmitted(),
        }
    } else {
        NetworkMetrics {
            bytes_in: 0,
            bytes_out: 0,
            packets_in: 0,
            packets_out: 0,
        }
    };
    
    Ok(SystemResourceMetrics {
        memory,
        cpu,
        disk,
        network,
    })
}

async fn get_slow_queries(_time_range: &str) -> Result<Vec<SlowQueryInfo>, String> {
    // TODO: 实现慢查询检测和分析
    // 1. 基于时间范围查询执行历史
    // 2. 按执行时间排序识别慢查询
    // 3. 分析慢查询的查询模式
    // 4. 提供优化建议
    
    // 当前为模拟数据
    Ok(vec![])
}

async fn get_storage_analysis(
    _connection_service: State<'_, ConnectionService>,
) -> Result<StorageAnalysisInfo, String> {
    // TODO: 实现存储分析功能
    // 1. 分析数据库磁盘使用情况
    // 2. 评估压缩效率
    // 3. 检查保留策略有效性
    // 4. 生成存储优化建议
    
    // 当前为模拟数据
    Ok(StorageAnalysisInfo {
        databases: vec![],
        total_size: 1024 * 1024 * 1024, // 1GB
        compression_ratio: 0.75,
        retention_policy_effectiveness: 0.85,
        recommendations: vec![
            StorageRecommendation {
                recommendation_type: "retention".to_string(),
                description: "建议设置30天数据保留策略".to_string(),
                estimated_savings: 512 * 1024 * 1024, // 512MB
                priority: "medium".to_string(),
                action: "设置保留策略".to_string(),
            }
        ],
    })
}

// 前端兼容的性能瓶颈检测接口
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PerformanceBottleneck {
    pub id: String,
    pub r#type: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub impact: String,
    pub duration: u64,
    pub frequency: u64,
    pub status: String,
    pub detected_at: chrono::DateTime<chrono::Utc>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeRange {
    pub start: chrono::DateTime<chrono::Utc>,
    pub end: chrono::DateTime<chrono::Utc>,
}

/// 检测性能瓶颈 - 前端兼容接口
#[tauri::command]
pub async fn detect_performance_bottlenecks(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<Vec<PerformanceBottleneck>, String> {
    debug!("检测性能瓶颈: {}", connection_id);
    
    let _range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    let mut bottlenecks = Vec::new();
    
    // 检测系统资源瓶颈
    if let Ok(system_metrics) = get_system_resource_metrics().await {
        // CPU 瓶颈检测
        if system_metrics.cpu.usage > 80.0 {
            bottlenecks.push(PerformanceBottleneck {
                id: uuid::Uuid::new_v4().to_string(),
                r#type: "cpu".to_string(),
                severity: if system_metrics.cpu.usage > 95.0 { "critical" } else { "high" }.to_string(),
                title: "CPU使用率过高".to_string(),
                description: format!("CPU使用率达到 {:.1}%", system_metrics.cpu.usage),
                impact: format!("{:.1}%", system_metrics.cpu.usage),
                duration: 0,
                frequency: 1,
                status: "active".to_string(),
                detected_at: chrono::Utc::now(),
                recommendations: vec![
                    "检查是否有CPU密集型查询".to_string(),
                    "考虑优化查询逻辑".to_string(),
                    "监控系统负载".to_string(),
                ],
            });
        }
        
        // 内存瓶颈检测
        if system_metrics.memory.percentage > 85.0 {
            bottlenecks.push(PerformanceBottleneck {
                id: uuid::Uuid::new_v4().to_string(),
                r#type: "memory".to_string(),
                severity: if system_metrics.memory.percentage > 95.0 { "critical" } else { "high" }.to_string(),
                title: "内存使用率过高".to_string(),
                description: format!("内存使用率达到 {:.1}%", system_metrics.memory.percentage),
                impact: format!("{:.1}%", system_metrics.memory.percentage),
                duration: 0,
                frequency: 1,
                status: "active".to_string(),
                detected_at: chrono::Utc::now(),
                recommendations: vec![
                    "检查内存泄漏".to_string(),
                    "优化数据缓存策略".to_string(),
                    "考虑增加物理内存".to_string(),
                ],
            });
        }
        
        // 磁盘空间瓶颈检测
        if system_metrics.disk.percentage > 90.0 {
            bottlenecks.push(PerformanceBottleneck {
                id: uuid::Uuid::new_v4().to_string(),
                r#type: "disk".to_string(),
                severity: if system_metrics.disk.percentage > 98.0 { "critical" } else { "high" }.to_string(),
                title: "磁盘空间不足".to_string(),
                description: format!("磁盘使用率达到 {:.1}%", system_metrics.disk.percentage),
                impact: format!("{:.1}%", system_metrics.disk.percentage),
                duration: 0,
                frequency: 1,
                status: "active".to_string(),
                detected_at: chrono::Utc::now(),
                recommendations: vec![
                    "清理旧数据".to_string(),
                    "设置数据保留策略".to_string(),
                    "考虑数据压缩".to_string(),
                ],
            });
        }
    }
    
    // 检测连接状态问题
    let manager = connection_service.get_manager();
    match manager.get_connection(&connection_id).await {
        Ok(_) => {
            // 连接正常，可以进行查询性能检测
            // 这里可以添加查询性能监控逻辑
        }
        Err(_) => {
            bottlenecks.push(PerformanceBottleneck {
                id: uuid::Uuid::new_v4().to_string(),
                r#type: "connection".to_string(),
                severity: "critical".to_string(),
                title: "数据库连接异常".to_string(),
                description: "无法连接到指定的数据库".to_string(),
                impact: "100%".to_string(),
                duration: 0,
                frequency: 1,
                status: "active".to_string(),
                detected_at: chrono::Utc::now(),
                recommendations: vec![
                    "检查数据库服务状态".to_string(),
                    "验证连接配置".to_string(),
                    "检查网络连通性".to_string(),
                ],
            });
        }
    }
    
    Ok(bottlenecks)
}

/// 获取系统性能指标 - 前端兼容接口
#[tauri::command]
pub async fn get_system_performance_metrics(
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<SystemResourceMetrics, String> {
    debug!("获取系统性能指标: {}", connection_id);
    
    let _range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    get_system_resource_metrics().await
}

/// 获取慢查询日志 - 前端兼容接口
#[tauri::command]
pub async fn get_slow_query_log(
    query_metrics_storage: State<'_, QueryMetricsStorage>,
    connection_id: String,
    options: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    debug!("获取慢查询日志: {}", connection_id);
    
    let limit = if let Some(opts) = &options {
        opts.get("limit")
            .and_then(|l| l.as_u64())
            .unwrap_or(50) as usize
    } else {
        50
    };
    
    let min_duration = if let Some(opts) = &options {
        opts.get("minDuration")
            .and_then(|d| d.as_u64())
            .unwrap_or(1000) // 默认1秒
    } else {
        1000
    };
    
    let order_by = if let Some(opts) = &options {
        opts.get("orderBy")
            .and_then(|o| o.as_str())
            .unwrap_or("duration")
    } else {
        "duration"
    };
    
    // 从存储中获取慢查询数据
    let storage = query_metrics_storage.lock().map_err(|e| {
        error!("获取查询指标存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    // 过滤慢查询（按连接ID和最小执行时间）
    let mut filtered_queries: Vec<_> = storage
        .iter()
        .filter(|q| q.connection_id == connection_id && q.execution_time >= min_duration)
        .collect();
    
    // 排序
    match order_by {
        "duration" => filtered_queries.sort_by(|a, b| b.execution_time.cmp(&a.execution_time)),
        "timestamp" => filtered_queries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp)),
        "frequency" => {
            // 按查询相似度分组计算频率
            filtered_queries.sort_by(|a, b| b.execution_time.cmp(&a.execution_time))
        }
        _ => filtered_queries.sort_by(|a, b| b.execution_time.cmp(&a.execution_time)),
    }
    
    // 构建响应数据
    let slow_queries: Vec<serde_json::Value> = filtered_queries
        .iter()
        .take(limit)
        .map(|q| {
            serde_json::json!({
                "query": q.query,
                "duration": q.execution_time,
                "frequency": 1, // 单次查询，频率为1
                "lastExecuted": q.timestamp,
                "avgDuration": q.execution_time,
                "minDuration": q.execution_time,
                "maxDuration": q.execution_time,
                "database": q.database,
                "user": "unknown", // InfluxDB不提供用户信息
                "rowsReturned": q.rows_returned
            })
        })
        .collect();
    
    let total = filtered_queries.len();
    
    Ok(serde_json::json!({
        "queries": slow_queries,
        "total": total
    }))
}

/// 分析锁等待 - 前端兼容接口
#[tauri::command]
pub async fn analyze_lock_waits(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<serde_json::Value, String> {
    debug!("分析锁等待: {}", connection_id);
    
    let _range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    let manager = connection_service.get_manager();
    let mut locks = Vec::new();
    let mut recommendations = Vec::new();
    
    // InfluxDB 本身不支持传统意义上的锁机制
    // 但我们可以检查连接状态和并发查询情况
    match manager.get_connection(&connection_id).await {
        Ok(_) => {
            // 连接正常，检查是否有高并发查询导致的性能问题
            let current_time = chrono::Utc::now();
            
            // 模拟检查并发查询状态
            // 在实际应用中，这里可以检查:
            // 1. 当前正在执行的查询数量
            // 2. 查询执行队列长度
            // 3. 资源使用情况
            
            // 由于InfluxDB的特性，我们主要关注查询并发性问题
            if let Ok(system_metrics) = get_system_resource_metrics().await {
                // 如果CPU或内存使用率过高，可能存在资源竞争
                if system_metrics.cpu.usage > 80.0 || system_metrics.memory.percentage > 85.0 {
                    locks.push(serde_json::json!({
                        "type": "resource_contention",
                        "table": "system_resources",
                        "duration": 0,
                        "waitingQueries": [],
                        "blockingQuery": "High resource usage detected",
                        "timestamp": current_time
                    }));
                    
                    recommendations.push("检查是否有资源密集型查询同时运行".to_string());
                    recommendations.push("考虑优化查询或错峰执行".to_string());
                }
            }
            
            recommendations.push("InfluxDB为时序数据库，建议优化查询时间范围".to_string());
        }
        Err(_) => {
            locks.push(serde_json::json!({
                "type": "connection_lock",
                "table": "connection",
                "duration": 0,
                "waitingQueries": [],
                "blockingQuery": "Connection unavailable",
                "timestamp": chrono::Utc::now()
            }));
            
            recommendations.push("检查数据库连接状态".to_string());
        }
    }
    
    let total_locks = locks.len();
    let avg_wait_time = 0.0; // InfluxDB没有传统意义上的等待时间
    let max_wait_time = 0.0;
    let most_blocked_table = if total_locks > 0 { "system_resources" } else { "" };
    
    Ok(serde_json::json!({
        "locks": locks,
        "summary": {
            "totalLocks": total_locks,
            "avgWaitTime": avg_wait_time,
            "maxWaitTime": max_wait_time,
            "mostBlockedTable": most_blocked_table,
            "recommendations": recommendations
        }
    }))
}

/// 获取连接池统计 - 前端兼容接口
#[tauri::command]
pub async fn get_connection_pool_stats_perf(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<serde_json::Value, String> {
    debug!("获取连接池统计: {}", connection_id);
    
    let range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    let manager = connection_service.get_manager();
    
    // 检查连接状态
    let (active_connections, connection_errors, avg_response_time) = match manager.get_connection(&connection_id).await {
        Ok(_) => {
            // 模拟健康检查测试响应时间
            let start = std::time::Instant::now();
            match manager.get_connection(&connection_id).await {
                Ok(client) => {
                    // 执行简单查询测试连接
                    match client.execute_query("SHOW DATABASES").await {
                        Ok(_) => {
                            let response_time = start.elapsed().as_millis() as u64;
                            (1, 0, response_time) // 1个活跃连接，0个错误
                        }
                        Err(_) => (0, 1, 0), // 连接失败
                    }
                }
                Err(_) => (0, 1, 0),
            }
        }
        Err(_) => (0, 1, 0), // 连接不可用
    };
    
    // 生成时间序列数据（模拟历史数据）
    let mut connection_stats = Vec::new();
    let duration = range.end.signed_duration_since(range.start);
    let intervals = 12; // 12个时间点
    let interval_duration = duration / intervals;
    
    for i in 0..intervals {
        let timestamp = range.start + interval_duration * i;
        connection_stats.push(serde_json::json!({
            "timestamp": timestamp,
            "totalConnections": if active_connections > 0 { 1 } else { 0 },
            "activeConnections": active_connections,
            "idleConnections": 0,
            "waitingRequests": 0,
            "connectionErrors": connection_errors,
            "avgConnectionTime": avg_response_time,
            "maxConnectionTime": avg_response_time
        }));
    }
    
    // 计算统计数据
    let utilization = if active_connections > 0 { 100.0 } else { 0.0 };
    let error_rate = if active_connections + connection_errors > 0 {
        (connection_errors as f64 / (active_connections + connection_errors) as f64) * 100.0
    } else {
        0.0
    };
    
    let mut recommendations = Vec::new();
    if connection_errors > 0 {
        recommendations.push("检查连接配置和网络状态".to_string());
    }
    if avg_response_time > 1000 {
        recommendations.push("优化查询性能或检查网络延迟".to_string());
    }
    
    Ok(serde_json::json!({
        "stats": connection_stats,
        "summary": {
            "avgUtilization": utilization,
            "maxUtilization": utilization,
            "avgWaitTime": avg_response_time,
            "maxWaitTime": avg_response_time,
            "errorRate": error_rate,
            "recommendations": recommendations
        }
    }))
}

/// 生成性能报告 - 前端兼容接口
#[tauri::command]
pub async fn generate_performance_report(
    connection_service: State<'_, ConnectionService>,
    query_metrics_storage: State<'_, QueryMetricsStorage>,
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<serde_json::Value, String> {
    debug!("生成性能报告: {}", connection_id);
    
    let range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    // 获取系统性能指标
    let system_metrics = get_system_resource_metrics().await.unwrap_or_else(|_| SystemResourceMetrics {
        memory: MemoryMetrics { total: 0, used: 0, available: 0, percentage: 0.0 },
        cpu: CpuMetrics { cores: 0, usage: 0.0, load_average: vec![] },
        disk: DiskMetrics { total: 0, used: 0, available: 0, percentage: 0.0 },
        network: NetworkMetrics { bytes_in: 0, bytes_out: 0, packets_in: 0, packets_out: 0 },
    });
    
    // 获取慢查询统计
    let (total_queries, avg_query_time, slow_queries_count) = {
        let storage = query_metrics_storage.lock().map_err(|e| {
            error!("获取查询指标存储锁失败: {}", e);
            "存储访问失败".to_string()
        })?;
        
        let connection_queries: Vec<_> = storage.iter()
            .filter(|q| q.connection_id == connection_id)
            .filter(|q| q.timestamp >= range.start && q.timestamp <= range.end)
            .collect();
        
        let total = connection_queries.len();
        let avg_time = if total > 0 {
            connection_queries.iter().map(|q| q.execution_time).sum::<u64>() as f64 / total as f64
        } else {
            0.0
        };
        let slow_count = connection_queries.iter().filter(|q| q.execution_time > 5000).count();
        
        (total, avg_time, slow_count)
    };
    
    // 获取性能瓶颈
    let bottlenecks = detect_performance_bottlenecks(connection_service.clone(), connection_id.clone(), Some(range.clone())).await.unwrap_or_default();
    
    // 计算综合评分
    let mut score_factors = Vec::new();
    
    // CPU评分 (0-100，CPU使用率越低评分越高)
    let cpu_score = (100.0 - system_metrics.cpu.usage).max(0.0);
    score_factors.push(cpu_score * 0.3); // 30%权重
    
    // 内存评分
    let memory_score = (100.0 - system_metrics.memory.percentage).max(0.0);
    score_factors.push(memory_score * 0.25); // 25%权重
    
    // 磁盘评分
    let disk_score = (100.0 - system_metrics.disk.percentage).max(0.0);
    score_factors.push(disk_score * 0.15); // 15%权重
    
    // 查询性能评分
    let query_score = if avg_query_time > 0.0 {
        (1000.0 / avg_query_time).min(100.0) // 查询越快评分越高
    } else {
        100.0
    };
    score_factors.push(query_score * 0.3); // 30%权重
    
    let overall_score = score_factors.iter().sum::<f64>();
    
    // 生成建议
    let mut recommendations = Vec::new();
    
    if system_metrics.cpu.usage > 80.0 {
        recommendations.push(serde_json::json!({
            "category": "system",
            "priority": "high",
            "title": "CPU使用率过高",
            "description": format!("CPU使用率达到{:.1}%", system_metrics.cpu.usage),
            "impact": "可能影响查询性能",
            "implementation": "优化查询或升级硬件"
        }));
    }
    
    if system_metrics.memory.percentage > 85.0 {
        recommendations.push(serde_json::json!({
            "category": "system",
            "priority": "high",
            "title": "内存使用率过高",
            "description": format!("内存使用率达到{:.1}%", system_metrics.memory.percentage),
            "impact": "可能导致系统卡顿",
            "implementation": "优化内存使用或增加内存"
        }));
    }
    
    if slow_queries_count > 0 {
        recommendations.push(serde_json::json!({
            "category": "query",
            "priority": "medium",
            "title": "检测到慢查询",
            "description": format!("发现{}个慢查询", slow_queries_count),
            "impact": "影响查询性能",
            "implementation": "优化查询条件和时间范围"
        }));
    }
    
    // 计算错误率
    let error_rate = if bottlenecks.iter().any(|b| b.r#type == "connection") {
        100.0 // 连接失败
    } else {
        0.0
    };
    
    // 计算吞吐量 (查询/秒)
    let duration_hours = range.end.signed_duration_since(range.start).num_hours().max(1) as f64;
    let throughput = total_queries as f64 / (duration_hours * 3600.0);
    
    // 生成趋势数据（模拟）
    let mut query_performance_trend = Vec::new();
    let mut system_load_trend = Vec::new();
    let mut error_rate_trend = Vec::new();
    
    let intervals = 10;
    let interval_duration = range.end.signed_duration_since(range.start) / intervals;
    
    for i in 0..intervals {
        let timestamp = range.start + interval_duration * i;
        
        query_performance_trend.push(serde_json::json!({
            "timestamp": timestamp,
            "value": avg_query_time * (0.8 + 0.4 * (i as f64 / intervals as f64))
        }));
        
        system_load_trend.push(serde_json::json!({
            "timestamp": timestamp,
            "value": (system_metrics.cpu.usage + system_metrics.memory.percentage) / 2.0
        }));
        
        error_rate_trend.push(serde_json::json!({
            "timestamp": timestamp,
            "value": error_rate
        }));
    }
    
    Ok(serde_json::json!({
        "summary": {
            "overallScore": overall_score,
            "period": {
                "start": range.start,
                "end": range.end
            },
            "totalQueries": total_queries,
            "avgQueryTime": avg_query_time,
            "errorRate": error_rate,
            "throughput": throughput
        },
        "bottlenecks": bottlenecks,
        "recommendations": recommendations,
        "metrics": {
            "cpu": system_metrics.cpu.usage,
            "memory": system_metrics.memory.percentage,
            "disk": system_metrics.disk.percentage,
            "network": (system_metrics.network.bytes_in + system_metrics.network.bytes_out) as f64 / 1024.0 / 1024.0, // MB
            "database": overall_score
        },
        "trends": {
            "queryPerformance": query_performance_trend,
            "systemLoad": system_load_trend,
            "errorRate": error_rate_trend
        }
    }))
}

fn analyze_query_optimization(query: &str) -> Option<QueryOptimization> {
    let mut suggestions = Vec::new();
    let mut index_recommendations = Vec::new();
    
    // 简单的查询分析
    let query_lower = query.to_lowercase();
    
    if query_lower.contains("select *") {
        suggestions.push("避免使用 SELECT *，明确指定需要的字段".to_string());
    }
    
    if !query_lower.contains("limit") && query_lower.contains("select") {
        suggestions.push("添加 LIMIT 子句限制返回结果数量".to_string());
    }
    
    if query_lower.contains("where") && query_lower.contains("time") {
        suggestions.push("确保时间范围查询使用了合适的索引".to_string());
        index_recommendations.push("time".to_string());
    }
    
    if suggestions.is_empty() {
        return None;
    }
    
    Some(QueryOptimization {
        suggestions,
        estimated_improvement: 25.0, // 预估25%性能提升
        optimized_query: None,
        index_recommendations,
    })
}
