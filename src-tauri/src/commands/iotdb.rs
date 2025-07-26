/**
 * IoTDB 特定命令
 * 
 * 提供 IoTDB 数据库的专用操作命令
 */

use crate::database::connection::ConnectionManager;
use crate::models::QueryResult;
use anyhow::Result;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

// IoTDB 存储组信息
#[derive(Debug, Serialize, Deserialize)]
pub struct StorageGroupInfo {
    pub name: String,
    pub ttl: Option<i64>,
    pub schema_replication_factor: Option<i32>,
    pub data_replication_factor: Option<i32>,
}

// IoTDB 设备信息
#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub name: String,
    pub storage_group: String,
    pub timeseries_count: Option<i32>,
}

// IoTDB 时间序列信息
#[derive(Debug, Serialize, Deserialize)]
pub struct TimeseriesInfo {
    pub name: String,
    pub alias: Option<String>,
    pub storage_group: String,
    pub data_type: String,
    pub encoding: String,
    pub compression: String,
    pub tags: Option<serde_json::Value>,
    pub attributes: Option<serde_json::Value>,
}

/// 获取 IoTDB 存储组列表
#[tauri::command]
pub async fn get_iotdb_storage_groups(
    connection_id: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 存储组列表: {}", connection_id);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    client
        .get_databases()
        .await
        .map_err(|e| format!("获取存储组列表失败: {}", e))
}

/// 获取 IoTDB 设备列表
#[tauri::command]
pub async fn get_iotdb_devices(
    connection_id: String,
    storage_group: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 设备列表: {} - {}", connection_id, storage_group);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    client
        .get_tables(&storage_group)
        .await
        .map_err(|e| format!("获取设备列表失败: {}", e))
}

/// 获取 IoTDB 时间序列列表
#[tauri::command]
pub async fn get_iotdb_timeseries(
    connection_id: String,
    storage_group: String,
    device: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 时间序列列表: {} - {}.{}", connection_id, storage_group, device);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    client
        .get_fields(&storage_group, &device)
        .await
        .map_err(|e| format!("获取时间序列列表失败: {}", e))
}

/// 执行 IoTDB 查询
#[tauri::command]
pub async fn execute_iotdb_query(
    connection_id: String,
    query: String,
    storage_group: Option<String>,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<QueryResult, String> {
    debug!("执行 IoTDB 查询: {} - {}", connection_id, query);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    client
        .execute_query(&query, storage_group.as_deref())
        .await
        .map_err(|e| format!("查询执行失败: {}", e))
}

/// 创建 IoTDB 存储组
#[tauri::command]
pub async fn create_iotdb_storage_group(
    connection_id: String,
    storage_group: String,
    ttl: Option<i64>,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("创建 IoTDB 存储组: {} - {}", connection_id, storage_group);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 构建创建存储组的 SQL
    let mut query = format!("CREATE STORAGE GROUP {}", storage_group);
    
    if let Some(ttl_value) = ttl {
        query.push_str(&format!(" WITH TTL {}", ttl_value));
    }

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("创建存储组失败: {}", e))?;

    info!("存储组 '{}' 创建成功", storage_group);
    Ok(())
}

/// 删除 IoTDB 存储组
#[tauri::command]
pub async fn delete_iotdb_storage_group(
    connection_id: String,
    storage_group: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("删除 IoTDB 存储组: {} - {}", connection_id, storage_group);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let query = format!("DELETE STORAGE GROUP {}", storage_group);

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("删除存储组失败: {}", e))?;

    info!("存储组 '{}' 删除成功", storage_group);
    Ok(())
}

/// 创建 IoTDB 时间序列
#[tauri::command]
pub async fn create_iotdb_timeseries(
    connection_id: String,
    timeseries_path: String,
    data_type: String,
    encoding: Option<String>,
    compression: Option<String>,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("创建 IoTDB 时间序列: {} - {}", connection_id, timeseries_path);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 构建创建时间序列的 SQL
    let mut query = format!("CREATE TIMESERIES {} WITH DATATYPE={}", timeseries_path, data_type);
    
    if let Some(enc) = encoding {
        query.push_str(&format!(",ENCODING={}", enc));
    }
    
    if let Some(comp) = compression {
        query.push_str(&format!(",COMPRESSION={}", comp));
    }

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("创建时间序列失败: {}", e))?;

    info!("时间序列 '{}' 创建成功", timeseries_path);
    Ok(())
}

/// 删除 IoTDB 时间序列
#[tauri::command]
pub async fn delete_iotdb_timeseries(
    connection_id: String,
    timeseries_path: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("删除 IoTDB 时间序列: {} - {}", connection_id, timeseries_path);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let query = format!("DELETE TIMESERIES {}", timeseries_path);

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("删除时间序列失败: {}", e))?;

    info!("时间序列 '{}' 删除成功", timeseries_path);
    Ok(())
}

/// 插入 IoTDB 数据
#[tauri::command]
pub async fn insert_iotdb_data(
    connection_id: String,
    device_path: String,
    timestamp: i64,
    measurements: Vec<String>,
    values: Vec<String>,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("插入 IoTDB 数据: {} - {}", connection_id, device_path);

    if measurements.len() != values.len() {
        return Err("测量点和值的数量不匹配".to_string());
    }

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 构建插入数据的 SQL
    let measurements_str = measurements.join(",");
    let values_str = values.join(",");
    let query = format!(
        "INSERT INTO {}({}) VALUES({},{})",
        device_path, measurements_str, timestamp, values_str
    );

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("插入数据失败: {}", e))?;

    info!("数据插入成功: {} 个测量点", measurements.len());
    Ok(())
}

/// 获取 IoTDB 服务器信息
#[tauri::command]
pub async fn get_iotdb_server_info(
    connection_id: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<serde_json::Value, String> {
    debug!("获取 IoTDB 服务器信息: {}", connection_id);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 查询服务器版本信息
    let version_result = client
        .execute_query("SHOW VERSION", None)
        .await
        .map_err(|e| format!("查询版本信息失败: {}", e))?;

    // 查询存储组数量
    let sg_result = client
        .execute_query("COUNT STORAGE GROUP", None)
        .await
        .map_err(|e| format!("查询存储组数量失败: {}", e))?;

    // 查询时间序列数量
    let ts_result = client
        .execute_query("COUNT TIMESERIES", None)
        .await
        .map_err(|e| format!("查询时间序列数量失败: {}", e))?;

    // 构建服务器信息
    let server_info = serde_json::json!({
        "version": version_result.data,
        "storage_group_count": sg_result.row_count.unwrap_or(0),
        "timeseries_count": ts_result.row_count.unwrap_or(0),
        "connection_id": connection_id,
    });

    Ok(server_info)
}
