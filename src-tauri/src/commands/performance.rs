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
    use sysinfo::{System, SystemExt, CpuExt, DiskExt};
    
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
    
    let network = NetworkMetrics {
        bytes_in: 0,  // 需要网络监控实现
        bytes_out: 0,
        packets_in: 0,
        packets_out: 0,
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
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<Vec<PerformanceBottleneck>, String> {
    debug!("检测性能瓶颈: {}", connection_id);
    
    let _range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    // 模拟瓶颈检测结果
    let bottlenecks = vec![
        PerformanceBottleneck {
            id: uuid::Uuid::new_v4().to_string(),
            r#type: "query".to_string(),
            severity: "high".to_string(),
            title: "慢查询检测".to_string(),
            description: "检测到多个执行时间超过阈值的查询".to_string(),
            impact: "15.5".to_string(),
            duration: 300000, // 5分钟
            frequency: 12,
            status: "active".to_string(),
            detected_at: chrono::Utc::now(),
            recommendations: vec![
                "添加合适的索引".to_string(),
                "优化查询条件".to_string(),
                "使用LIMIT限制结果集".to_string(),
            ],
        },
    ];
    
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
    
    // 模拟慢查询数据
    let slow_queries = vec![
        serde_json::json!({
            "query": "SELECT * FROM measurement WHERE time > now() - 1h",
            "duration": 5200,
            "frequency": 8,
            "lastExecuted": chrono::Utc::now(),
            "avgDuration": 4800,
            "minDuration": 3200,
            "maxDuration": 6100,
            "database": "mydb",
            "user": "admin"
        }),
    ];
    
    Ok(serde_json::json!({
        "queries": slow_queries.into_iter().take(limit).collect::<Vec<_>>(),
        "total": 1
    }))
}

/// 分析锁等待 - 前端兼容接口
#[tauri::command]
pub async fn analyze_lock_waits(
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<serde_json::Value, String> {
    debug!("分析锁等待: {}", connection_id);
    
    let _range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    // 模拟锁等待数据
    Ok(serde_json::json!({
        "locks": [],
        "summary": {
            "totalLocks": 0,
            "avgWaitTime": 0.0,
            "maxWaitTime": 0.0,
            "mostBlockedTable": "",
            "recommendations": []
        }
    }))
}

/// 获取连接池统计 - 前端兼容接口
#[tauri::command]
pub async fn get_connection_pool_stats_perf(
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<serde_json::Value, String> {
    debug!("获取连接池统计: {}", connection_id);
    
    let _range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    // 模拟连接池数据
    Ok(serde_json::json!({
        "active_connections": 2,
        "idle_connections": 8,
        "total_connections": 10,
        "max_connections": 20,
        "connection_stats": []
    }))
}

/// 生成性能报告 - 前端兼容接口
#[tauri::command]
pub async fn generate_performance_report(
    connection_id: String,
    time_range: Option<TimeRange>,
) -> Result<serde_json::Value, String> {
    debug!("生成性能报告: {}", connection_id);
    
    let range = time_range.unwrap_or(TimeRange {
        start: chrono::Utc::now() - chrono::Duration::hours(1),
        end: chrono::Utc::now(),
    });
    
    // 生成综合性能报告
    Ok(serde_json::json!({
        "summary": {
            "overallScore": 78.5,
            "period": {
                "start": range.start,
                "end": range.end
            },
            "totalQueries": 1250,
            "avgQueryTime": 245.5,
            "errorRate": 0.8,
            "throughput": 15.2
        },
        "bottlenecks": [],
        "recommendations": [
            {
                "category": "query",
                "priority": "high",
                "title": "优化慢查询",
                "description": "检测到多个执行时间较长的查询",
                "impact": "可提升15%查询性能",
                "implementation": "添加索引或重写查询语句"
            }
        ],
        "metrics": {
            "cpu": 25.8,
            "memory": 45.2,
            "disk": 12.5,
            "network": 8.9,
            "database": 78.5
        },
        "trends": {
            "queryPerformance": [],
            "systemLoad": [],
            "errorRate": []
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
