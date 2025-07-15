use crate::models::{ConnectionConfig, ConnectionStatus, ConnectionTestResult};
use crate::services::ConnectionService;
use tauri::State;
use log::{debug, error, info};
use std::collections::HashMap;

/// 创建连接
#[tauri::command]
pub async fn create_connection(
    connection_service: State<'_, ConnectionService>,
    config: ConnectionConfig,
) -> Result<String, String> {
    debug!("处理创建连接命令: {}", config.name);
    
    connection_service
        .create_connection(config)
        .await
        .map_err(|e| {
            error!("创建连接失败: {}", e);
            format!("创建连接失败: {}", e)
        })
}

/// 测试连接
#[tauri::command]
pub async fn test_connection(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<ConnectionTestResult, String> {
    debug!("处理测试连接命令: {}", connection_id);

    connection_service
        .test_connection(&connection_id)
        .await
        .map_err(|e| {
            error!("测试连接失败: {}", e);
            format!("测试连接失败: {}", e)
        })
}

/// 初始化连接服务（加载保存的连接）
#[tauri::command]
pub async fn initialize_connections(
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("初始化连接服务，加载保存的连接");

    connection_service
        .load_from_storage()
        .await
        .map_err(|e| {
            error!("加载连接配置失败: {}", e);
            format!("加载连接配置失败: {}", e)
        })
}

/// 获取所有连接
#[tauri::command]
pub async fn get_connections(
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<ConnectionConfig>, String> {
    debug!("处理获取连接列表命令");
    
    Ok(connection_service.get_connections().await)
}

/// 获取单个连接
#[tauri::command]
pub async fn get_connection(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<Option<ConnectionConfig>, String> {
    debug!("处理获取连接命令: {}", connection_id);

    Ok(connection_service.get_connection(&connection_id).await)
}

/// 更新连接
#[tauri::command]
pub async fn update_connection(
    connection_service: State<'_, ConnectionService>,
    config: ConnectionConfig,
) -> Result<(), String> {
    debug!("处理更新连接命令: {}", config.name);
    
    connection_service
        .update_connection(config)
        .await
        .map_err(|e| {
            error!("更新连接失败: {}", e);
            format!("更新连接失败: {}", e)
        })
}

/// 删除连接
#[tauri::command]
pub async fn delete_connection(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<(), String> {
    debug!("处理删除连接命令: {}", connection_id);

    connection_service
        .delete_connection(&connection_id)
        .await
        .map_err(|e| {
            error!("删除连接失败: {}", e);
            format!("删除连接失败: {}", e)
        })
}

/// 获取连接状态
#[tauri::command]
pub async fn get_connection_status(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<Option<ConnectionStatus>, String> {
    debug!("处理获取连接状态命令: {}", connection_id);

    Ok(connection_service.get_connection_status(&connection_id).await)
}

/// 获取所有连接状态
#[tauri::command]
pub async fn get_all_connection_statuses(
    connection_service: State<'_, ConnectionService>,
) -> Result<HashMap<String, ConnectionStatus>, String> {
    debug!("处理获取所有连接状态命令");
    
    Ok(connection_service.get_all_connection_statuses().await)
}

/// 健康检查所有连接
#[tauri::command]
pub async fn health_check_all_connections(
    connection_service: State<'_, ConnectionService>,
) -> Result<HashMap<String, ConnectionTestResult>, String> {
    debug!("处理健康检查所有连接命令");
    
    Ok(connection_service.health_check_all().await)
}

/// 获取连接数量
#[tauri::command]
pub async fn get_connection_count(
    connection_service: State<'_, ConnectionService>,
) -> Result<usize, String> {
    debug!("处理获取连接数量命令");

    Ok(connection_service.get_connection_count().await)
}

/// 连接到数据库
#[tauri::command]
pub async fn connect_to_database(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<(), String> {
    debug!("处理连接数据库命令: {}", connection_id);

    connection_service
        .connect_to_database(&connection_id)
        .await
        .map_err(|e| {
            error!("连接数据库失败: {}", e);
            format!("连接数据库失败: {}", e)
        })
}

/// 断开数据库连接
#[tauri::command]
pub async fn disconnect_from_database(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<(), String> {
    debug!("处理断开数据库连接命令: {}", connection_id);

    connection_service
        .disconnect_from_database(&connection_id)
        .await
        .map_err(|e| {
            error!("断开数据库连接失败: {}", e);
            format!("断开数据库连接失败: {}", e)
        })
}

/// 启动连接健康监控
#[tauri::command]
pub async fn start_connection_monitoring(
    connection_service: State<'_, ConnectionService>,
    interval_seconds: Option<u64>,
) -> Result<(), String> {
    debug!("启动连接健康监控，间隔: {:?}秒", interval_seconds);

    connection_service
        .start_health_monitoring(interval_seconds.unwrap_or(30))
        .await
        .map_err(|e| {
            error!("启动连接健康监控失败: {}", e);
            format!("启动连接健康监控失败: {}", e)
        })
}

/// 停止连接健康监控
#[tauri::command]
pub async fn stop_connection_monitoring(
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("停止连接健康监控");

    connection_service
        .stop_health_monitoring()
        .await
        .map_err(|e| {
            error!("停止连接健康监控失败: {}", e);
            format!("停止连接健康监控失败: {}", e)
        })
}

/// 获取连接池统计信息
#[tauri::command]
pub async fn get_connection_pool_stats(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    debug!("获取连接池统计信息: {}", connection_id);

    connection_service
        .get_pool_stats(&connection_id)
        .await
        .map_err(|e| {
            error!("获取连接池统计信息失败: {}", e);
            format!("获取连接池统计信息失败: {}", e)
        })
}

/// 调试：获取连接管理器状态
#[tauri::command]
pub async fn debug_connection_manager(
    connection_service: State<'_, ConnectionService>,
) -> Result<serde_json::Value, String> {
    debug!("处理调试连接管理器命令");

    let connection_count = connection_service.get_connection_count().await;
    let connections = connection_service.get_connections().await;
    let statuses = connection_service.get_all_connection_statuses().await;

    let debug_info = serde_json::json!({
        "connection_count": connection_count,
        "connections": connections,
        "statuses": statuses,
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    Ok(debug_info)
}

/// 同步连接配置（从前端批量创建到后端）
#[tauri::command]
pub async fn sync_connections(
    connection_service: State<'_, ConnectionService>,
    configs: Vec<ConnectionConfig>,
) -> Result<Vec<String>, String> {
    debug!("处理同步连接配置命令，共 {} 个连接", configs.len());

    let mut created_ids = Vec::new();
    let mut errors = Vec::new();

    for config in configs {
        match connection_service.create_connection(config.clone()).await {
            Ok(id) => {
                created_ids.push(id);
                debug!("同步连接成功: {}", config.name);
            }
            Err(e) => {
                error!("同步连接失败: {} - {}", config.name, e);
                errors.push(format!("连接 '{}': {}", config.name, e));
            }
        }
    }

    if !errors.is_empty() {
        return Err(format!("部分连接同步失败: {}", errors.join("; ")));
    }

    info!("成功同步 {} 个连接配置", created_ids.len());
    Ok(created_ids)
}
