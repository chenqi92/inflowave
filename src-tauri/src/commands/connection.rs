use crate::models::{ConnectionConfig, ConnectionStatus, ConnectionTestResult};
use crate::services::ConnectionService;
use tauri::State;
use log::{debug, error};
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
    _connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("初始化连接服务，加载保存的连接");
    // 暂时返回成功，在后续版本中实现完整的加载机制
    Ok(())
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
