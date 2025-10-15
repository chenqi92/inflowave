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

// IoTDB 集群节点信息
#[derive(Debug, Serialize, Deserialize)]
pub struct ClusterNodeInfo {
    pub node_id: String,
    pub node_type: String,
    pub host: String,
    pub port: i32,
    pub status: String,
}

// IoTDB 用户信息
#[derive(Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub username: String,
    pub is_admin: bool,
    pub privileges: Vec<String>,
}

// IoTDB 函数信息
#[derive(Debug, Serialize, Deserialize)]
pub struct FunctionInfo {
    pub name: String,
    pub function_type: String,
    pub class_name: String,
    pub description: Option<String>,
}

// IoTDB 触发器信息
#[derive(Debug, Serialize, Deserialize)]
pub struct TriggerInfo {
    pub name: String,
    pub status: String,
    pub event: String,
    pub path: String,
    pub class_name: String,
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

/// 获取 IoTDB 集群信息
#[tauri::command]
pub async fn get_iotdb_cluster_info(
    connection_id: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<ClusterNodeInfo>, String> {
    debug!("获取 IoTDB 集群信息: {}", connection_id);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let result = client
        .execute_query("SHOW CLUSTER", None)
        .await
        .map_err(|e| format!("获取集群信息失败: {}", e))?;

    let mut cluster_nodes = Vec::new();
    if let Some(data) = result.data {
        for row in data {
            if row.len() >= 4 {
                let node_info = ClusterNodeInfo {
                    node_id: row[0].as_str().unwrap_or("").to_string(),
                    node_type: row[1].as_str().unwrap_or("").to_string(),
                    host: row[2].as_str().unwrap_or("").to_string(),
                    port: row[3].as_i64().unwrap_or(0) as i32,
                    status: row.get(4).and_then(|v| v.as_str()).unwrap_or("UNKNOWN").to_string(),
                };
                cluster_nodes.push(node_info);
            }
        }
    }

    Ok(cluster_nodes)
}

/// 获取 IoTDB 用户列表
#[tauri::command]
pub async fn get_iotdb_users(
    connection_id: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<UserInfo>, String> {
    debug!("获取 IoTDB 用户列表: {}", connection_id);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let result = client
        .execute_query("LIST USER", None)
        .await
        .map_err(|e| format!("获取用户列表失败: {}", e))?;

    let mut users = Vec::new();
    if let Some(data) = result.data {
        for row in data {
            if !row.is_empty() {
                let username = row[0].as_str().unwrap_or("").to_string();
                let is_admin = username == "root" || username.contains("admin");

                let user_info = UserInfo {
                    username,
                    is_admin,
                    privileges: vec![], // 可以后续通过 LIST PRIVILEGES 获取
                };
                users.push(user_info);
            }
        }
    }

    Ok(users)
}

/// 获取 IoTDB 函数列表
#[tauri::command]
pub async fn get_iotdb_functions(
    connection_id: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<FunctionInfo>, String> {
    debug!("获取 IoTDB 函数列表: {}", connection_id);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let result = client
        .execute_query("SHOW FUNCTIONS", None)
        .await
        .map_err(|e| format!("获取函数列表失败: {}", e))?;

    let mut functions = Vec::new();
    if let Some(data) = result.data {
        for row in data {
            if row.len() >= 3 {
                let function_info = FunctionInfo {
                    name: row[0].as_str().unwrap_or("").to_string(),
                    function_type: row[1].as_str().unwrap_or("UDF").to_string(),
                    class_name: row[2].as_str().unwrap_or("").to_string(),
                    description: row.get(3).and_then(|v| v.as_str()).map(|s| s.to_string()),
                };
                functions.push(function_info);
            }
        }
    }

    Ok(functions)
}

/// 获取 IoTDB 触发器列表
#[tauri::command]
pub async fn get_iotdb_triggers(
    connection_id: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<TriggerInfo>, String> {
    debug!("获取 IoTDB 触发器列表: {}", connection_id);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let result = client
        .execute_query("SHOW TRIGGERS", None)
        .await
        .map_err(|e| format!("获取触发器列表失败: {}", e))?;

    let mut triggers = Vec::new();
    if let Some(data) = result.data {
        for row in data {
            if row.len() >= 5 {
                let trigger_info = TriggerInfo {
                    name: row[0].as_str().unwrap_or("").to_string(),
                    status: row[1].as_str().unwrap_or("UNKNOWN").to_string(),
                    event: row[2].as_str().unwrap_or("").to_string(),
                    path: row[3].as_str().unwrap_or("").to_string(),
                    class_name: row[4].as_str().unwrap_or("").to_string(),
                };
                triggers.push(trigger_info);
            }
        }
    }

    Ok(triggers)
}

// IoTDB 模板信息
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateInfo {
    pub name: String,
    pub measurements: Vec<String>,
    pub data_types: Vec<String>,
    pub encodings: Vec<String>,
    pub compressions: Vec<String>,
}

/// 获取 IoTDB 模板列表
#[tauri::command]
pub async fn get_iotdb_templates(
    connection_id: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 模板列表: {}", connection_id);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let result = client
        .execute_query("SHOW SCHEMA TEMPLATES", None)
        .await
        .map_err(|e| format!("获取模板列表失败: {}", e))?;

    let mut templates = Vec::new();
    for row in result.rows() {
        if let Some(name) = row.get(0).and_then(|v| v.as_str()) {
            templates.push(name.to_string());
        }
    }

    Ok(templates)
}

/// 获取 IoTDB 模板详细信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_template_info(
    connection_id: String,
    template_name: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<TemplateInfo, String> {
    debug!("获取 IoTDB 模板详细信息: {} - {}", connection_id, template_name);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let query = format!("SHOW NODES IN SCHEMA TEMPLATE {}", template_name);
    let result = client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("获取模板信息失败: {}", e))?;

    let mut measurements = Vec::new();
    let mut data_types = Vec::new();
    let mut encodings = Vec::new();
    let mut compressions = Vec::new();

    for row in result.rows() {
        if let Some(measurement) = row.get(0).and_then(|v| v.as_str()) {
            measurements.push(measurement.to_string());
        }
        if let Some(data_type) = row.get(1).and_then(|v| v.as_str()) {
            data_types.push(data_type.to_string());
        }
        if let Some(encoding) = row.get(2).and_then(|v| v.as_str()) {
            encodings.push(encoding.to_string());
        }
        if let Some(compression) = row.get(3).and_then(|v| v.as_str()) {
            compressions.push(compression.to_string());
        }
    }

    Ok(TemplateInfo {
        name: template_name,
        measurements,
        data_types,
        encodings,
        compressions,
    })
}

/// 创建 IoTDB 模板
#[tauri::command(rename_all = "camelCase")]
pub async fn create_iotdb_template(
    connection_id: String,
    template_info: TemplateInfo,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("创建 IoTDB 模板: {} - {}", connection_id, template_info.name);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 构建创建模板的查询
    let mut query = format!("CREATE SCHEMA TEMPLATE {}", template_info.name);

    for (i, measurement) in template_info.measurements.iter().enumerate() {
        let data_type = template_info.data_types.get(i).map(|s| s.as_str()).unwrap_or("FLOAT");
        let encoding = template_info.encodings.get(i).map(|s| s.as_str()).unwrap_or("PLAIN");
        let compression = template_info.compressions.get(i).map(|s| s.as_str()).unwrap_or("SNAPPY");

        query.push_str(&format!(
            " ({} {} encoding {} compression {})",
            measurement, data_type, encoding, compression
        ));
    }

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("创建模板失败: {}", e))?;

    Ok(())
}

/// 挂载 IoTDB 模板
#[tauri::command(rename_all = "camelCase")]
pub async fn mount_iotdb_template(
    connection_id: String,
    template_name: String,
    path: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("挂载 IoTDB 模板: {} - {} 到 {}", connection_id, template_name, path);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let query = format!("SET SCHEMA TEMPLATE {} TO {}", template_name, path);
    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("挂载模板失败: {}", e))?;

    Ok(())
}

/// 卸载 IoTDB 模板
#[tauri::command(rename_all = "camelCase")]
pub async fn unmount_iotdb_template(
    connection_id: String,
    template_name: String,
    path: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("卸载 IoTDB 模板: {} - {} 从 {}", connection_id, template_name, path);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let query = format!("UNSET SCHEMA TEMPLATE {} FROM {}", template_name, path);
    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("卸载模板失败: {}", e))?;

    Ok(())
}

/// 删除 IoTDB 模板
#[tauri::command(rename_all = "camelCase")]
pub async fn drop_iotdb_template(
    connection_id: String,
    template_name: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<(), String> {
    debug!("删除 IoTDB 模板: {} - {}", connection_id, template_name);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let query = format!("DROP SCHEMA TEMPLATE {}", template_name);
    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("删除模板失败: {}", e))?;

    Ok(())
}

/// 获取 IoTDB 设备信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_device_info(
    connection_id: String,
    device_path: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<serde_json::Value, String> {
    debug!("获取 IoTDB 设备信息: {} - {}", connection_id, device_path);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 获取设备下的时间序列数量
    let query = format!("SHOW TIMESERIES {}.* ", device_path);
    let result = client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("获取设备信息失败: {}", e))?;

    let timeseries_count = result.rows().len();

    Ok(serde_json::json!({
        "device": device_path,
        "timeseriesCount": timeseries_count
    }))
}

/// 获取 IoTDB 时间序列信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_timeseries_info(
    connection_id: String,
    timeseries_path: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<TimeseriesInfo, String> {
    debug!("获取 IoTDB 时间序列信息: {} - {}", connection_id, timeseries_path);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    let query = format!("SHOW TIMESERIES {}", timeseries_path);
    let result = client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("获取时间序列信息失败: {}", e))?;

    let rows = result.rows();
    let row = rows.first()
        .ok_or_else(|| "时间序列不存在".to_string())?;

    Ok(TimeseriesInfo {
        name: row.get(0).and_then(|v| v.as_str()).unwrap_or("").to_string(),
        alias: row.get(1).and_then(|v| v.as_str()).map(|s| s.to_string()),
        storage_group: row.get(2).and_then(|v| v.as_str()).unwrap_or("").to_string(),
        data_type: row.get(3).and_then(|v| v.as_str()).unwrap_or("").to_string(),
        encoding: row.get(4).and_then(|v| v.as_str()).unwrap_or("").to_string(),
        compression: row.get(5).and_then(|v| v.as_str()).unwrap_or("").to_string(),
        tags: None,
        attributes: None,
    })
}

/// 获取 IoTDB 时间序列统计信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_timeseries_statistics(
    connection_id: String,
    timeseries_path: String,
    connection_manager: State<'_, Arc<ConnectionManager>>,
) -> Result<serde_json::Value, String> {
    debug!("获取 IoTDB 时间序列统计信息: {} - {}", connection_id, timeseries_path);

    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 获取统计信息
    let query = format!(
        "SELECT COUNT({}), MAX_VALUE({}), MIN_VALUE({}), AVG({}) FROM {}",
        timeseries_path, timeseries_path, timeseries_path, timeseries_path, timeseries_path
    );
    let result = client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("获取统计信息失败: {}", e))?;

    let rows = result.rows();
    let row = rows.first();
    let count = row.and_then(|r| r.get(1)).and_then(|v| v.as_i64()).unwrap_or(0);
    let max_value = row.and_then(|r| r.get(2)).cloned();
    let min_value = row.and_then(|r| r.get(3)).cloned();
    let avg_value = row.and_then(|r| r.get(4)).cloned();

    Ok(serde_json::json!({
        "timeseries": timeseries_path,
        "count": count,
        "max": max_value,
        "min": min_value,
        "avg": avg_value
    }))
}
