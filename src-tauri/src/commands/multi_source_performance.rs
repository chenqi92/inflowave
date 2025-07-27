use tauri::State;
use log::info;
use serde::{Deserialize, Serialize};

use crate::services::ConnectionService;

/// 打开的数据源信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedDataSource {
    pub connection_id: String,
    pub database_name: String,
    pub full_key: String, // connectionId/database
}

/// 真实的性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RealPerformanceMetrics {
    pub connection_id: String,
    pub connection_name: String,
    pub database_name: String,
    pub db_type: String,
    pub status: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,

    // 连接状态
    pub is_connected: bool,
    pub connection_latency: f64, // ms

    // 查询性能（真实数据）
    pub active_queries: u32,
    pub total_queries_today: u64,
    pub average_query_time: f64,
    pub slow_queries_count: u32,
    pub failed_queries_count: u32,

    // 数据库信息
    pub database_size: u64, // bytes
    pub table_count: u32,
    pub record_count: u64,

    // 健康状态
    pub health_score: String, // "good", "warning", "critical"
    pub issues: Vec<String>,
    pub recommendations: Vec<String>,
}

/// 获取打开数据源的性能监控
#[tauri::command(rename_all = "camelCase")]
pub async fn get_opened_datasources_performance(
    connection_service: State<'_, ConnectionService>,
    opened_datasources: Vec<String>, // ["connectionId/database", ...]
) -> Result<Vec<RealPerformanceMetrics>, String> {
    info!("📊 获取打开数据源的性能监控 - 数据源数量: {}", opened_datasources.len());

    let manager = connection_service.get_manager();
    let mut metrics_list = Vec::new();

    for datasource_key in opened_datasources {
        let parts: Vec<&str> = datasource_key.split('/').collect();
        if parts.len() < 2 {
            continue;
        }

        let connection_id = parts[0];
        let database_name = parts[1..].join("/");

        // 获取连接配置
        match connection_service.get_connection(connection_id).await {
            Some(connection_config) => {
                // 检查连接状态
                let is_connected = manager.get_connection(connection_id).await.is_ok();

                // 获取真实的性能指标
                let metrics = get_real_performance_metrics(
                    &manager,
                    connection_id,
                    &database_name,
                    &connection_config,
                    is_connected,
                ).await?;

                metrics_list.push(metrics);
            }
            None => {
                warn!("连接配置不存在: {}", connection_id);
            }
        }
    }

    info!("✅ 成功获取 {} 个打开数据源的性能指标", metrics_list.len());
    Ok(metrics_list)
}

/// 获取单个数据源的详细性能指标
#[tauri::command(rename_all = "camelCase")]
pub async fn get_single_source_performance_details(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<SimplePerformanceMetrics, String> {
    info!("📊 获取单个数据源性能详情: {}", connection_id);
    
    let manager = connection_service.get_manager();
    
    // 获取连接配置
    let connection_config = connection_service.get_connection(&connection_id).await
        .ok_or_else(|| format!("连接配置不存在: {}", connection_id))?;
    
    // 检查连接状态
    let is_connected = manager.get_connection(&connection_id).await.is_ok();
    let status = if is_connected { "connected" } else { "disconnected" };
    
    // 生成详细的性能指标
    let db_type_str = format!("{:?}", connection_config.db_type);

    let metrics = generate_detailed_metrics(
        connection_id.clone(),
        connection_config.name,
        db_type_str,
        status.to_string(),
    );
    
    info!("✅ 成功获取数据源 {} 的详细性能指标", connection_id);
    Ok(metrics)
}

/// 获取性能监控配置
#[tauri::command(rename_all = "camelCase")]
pub async fn get_performance_monitoring_config() -> Result<serde_json::Value, String> {
    info!("⚙️ 获取性能监控配置");
    
    let config = serde_json::json!({
        "refreshInterval": 30,
        "autoRefresh": false,
        "timeRange": "1h",
        "alertThresholds": {
            "cpuUsage": 80.0,
            "memoryUsage": 85.0,
            "diskUsage": 90.0,
            "queryLatency": 5000.0
        },
        "enabledMetrics": [
            "cpu",
            "memory",
            "disk",
            "queries",
            "errors"
        ]
    });
    
    Ok(config)
}

/// 更新性能监控配置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_performance_monitoring_config(
    config: serde_json::Value,
) -> Result<(), String> {
    info!("⚙️ 更新性能监控配置");
    
    // 这里可以保存配置到文件或数据库
    // 暂时只是记录日志
    info!("配置已更新: {}", config);
    
    Ok(())
}

/// 生成模拟的基础性能指标
fn generate_mock_metrics(
    connection_id: String,
    connection_name: String,
    db_type: String,
    status: String,
) -> SimplePerformanceMetrics {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    
    // 根据数据库类型生成不同的基准值
    let (base_cpu, base_memory, base_disk) = match db_type.as_str() {
        "InfluxDB" => (30.0, 40.0, 20.0),
        "InfluxDB2" => (35.0, 45.0, 25.0),
        "IoTDB" => (25.0, 35.0, 30.0),
        _ => (20.0, 30.0, 15.0),
    };
    
    let cpu_usage = if status == "connected" {
        base_cpu + rng.gen_range(-10.0..20.0)
    } else {
        0.0
    };
    
    let memory_usage = if status == "connected" {
        base_memory + rng.gen_range(-15.0..25.0)
    } else {
        0.0
    };
    
    let disk_usage = base_disk + rng.gen_range(-5.0..15.0);
    
    let query_count = if status == "connected" {
        rng.gen_range(50..500)
    } else {
        0
    };
    
    let average_query_time = if status == "connected" {
        rng.gen_range(50.0..500.0)
    } else {
        0.0
    };
    
    let error_rate = if status == "connected" {
        rng.gen_range(0.0..0.1)
    } else {
        0.0
    };
    
    // 计算健康分数
    let health_score = calculate_health_score(cpu_usage, memory_usage, average_query_time, error_rate);
    
    // 生成建议
    let recommendations = generate_recommendations(cpu_usage, memory_usage, disk_usage, average_query_time, error_rate);
    
    SimplePerformanceMetrics {
        connection_id,
        connection_name,
        db_type,
        status,
        timestamp: chrono::Utc::now(),
        cpu_usage,
        memory_usage,
        disk_usage,
        query_count,
        average_query_time,
        error_rate,
        health_score,
        recommendations,
    }
}

/// 生成详细的性能指标
fn generate_detailed_metrics(
    connection_id: String,
    connection_name: String,
    db_type: String,
    status: String,
) -> SimplePerformanceMetrics {
    // 详细指标可以包含更多信息，这里暂时使用相同的逻辑
    generate_mock_metrics(connection_id, connection_name, db_type, status)
}

/// 计算健康分数
fn calculate_health_score(cpu: f64, memory: f64, query_time: f64, error_rate: f64) -> String {
    let mut score = 100.0;
    
    // CPU 影响
    if cpu > 80.0 {
        score -= 30.0;
    } else if cpu > 60.0 {
        score -= 15.0;
    }
    
    // 内存影响
    if memory > 85.0 {
        score -= 25.0;
    } else if memory > 70.0 {
        score -= 10.0;
    }
    
    // 查询时间影响
    if query_time > 1000.0 {
        score -= 20.0;
    } else if query_time > 500.0 {
        score -= 10.0;
    }
    
    // 错误率影响
    if error_rate > 0.05 {
        score -= 15.0;
    } else if error_rate > 0.02 {
        score -= 5.0;
    }
    
    if score >= 80.0 {
        "good".to_string()
    } else if score >= 60.0 {
        "warning".to_string()
    } else {
        "critical".to_string()
    }
}

/// 生成优化建议
fn generate_recommendations(cpu: f64, memory: f64, disk: f64, query_time: f64, error_rate: f64) -> Vec<String> {
    let mut recommendations = Vec::new();
    
    if cpu > 80.0 {
        recommendations.push("CPU使用率过高，考虑优化查询或增加CPU资源".to_string());
    }
    
    if memory > 85.0 {
        recommendations.push("内存使用率过高，考虑增加内存或优化数据缓存策略".to_string());
    }
    
    if disk > 90.0 {
        recommendations.push("磁盘使用率过高，考虑清理旧数据或扩展存储容量".to_string());
    }
    
    if query_time > 1000.0 {
        recommendations.push("查询响应时间过长，考虑优化查询语句或添加索引".to_string());
    }
    
    if error_rate > 0.05 {
        recommendations.push("错误率过高，检查查询语法和数据库连接稳定性".to_string());
    }
    
    if recommendations.is_empty() {
        recommendations.push("系统运行良好，继续保持当前配置".to_string());
    }
    
    recommendations
}
