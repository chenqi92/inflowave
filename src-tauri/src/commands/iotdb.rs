/**
 * IoTDB 特定命令
 *
 * 提供 IoTDB 数据库的专用操作命令
 */

use crate::services::connection_service::ConnectionService;
use crate::models::QueryResult;
use anyhow::Result;
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

// ============================================================================
// IoTDB 有效参数值常量
// ============================================================================

/// 有效的数据类型
const VALID_DATA_TYPES: &[&str] = &["BOOLEAN", "INT32", "INT64", "FLOAT", "DOUBLE", "TEXT"];

/// 有效的编码类型
const VALID_ENCODINGS: &[&str] = &[
    "PLAIN", "DICTIONARY", "RLE", "DIFF", "TS_2DIFF", "BITMAP", "GORILLA", "REGULAR", "FREQ", "CHIMP", "SPRINTZ", "RLBE"
];

/// 有效的压缩类型
const VALID_COMPRESSIONS: &[&str] = &[
    "UNCOMPRESSED", "SNAPPY", "GZIP", "LZ4", "ZSTD", "LZMA2"
];

/// 验证数据类型参数
fn validate_data_type(data_type: &str) -> Result<(), String> {
    let dt_upper = data_type.to_uppercase();
    if !VALID_DATA_TYPES.contains(&dt_upper.as_str()) {
        return Err(format!(
            "无效的数据类型 '{}'. 有效值: {:?}",
            data_type, VALID_DATA_TYPES
        ));
    }
    Ok(())
}

/// 验证编码类型参数
fn validate_encoding(encoding: &str) -> Result<(), String> {
    let enc_upper = encoding.to_uppercase();
    if !VALID_ENCODINGS.contains(&enc_upper.as_str()) {
        return Err(format!(
            "无效的编码类型 '{}'. 有效值: {:?}",
            encoding, VALID_ENCODINGS
        ));
    }
    Ok(())
}

/// 验证压缩类型参数
fn validate_compression(compression: &str) -> Result<(), String> {
    let comp_upper = compression.to_uppercase();
    if !VALID_COMPRESSIONS.contains(&comp_upper.as_str()) {
        return Err(format!(
            "无效的压缩类型 '{}'. 有效值: {:?}",
            compression, VALID_COMPRESSIONS
        ));
    }
    Ok(()
    )
}

// ============================================================================
// 安全的值提取辅助函数
// ============================================================================

/// 安全地从 JSON Value 数组中提取字符串
fn extract_string(row: &[Value], index: usize) -> Option<String> {
    row.get(index).and_then(|v| {
        match v {
            Value::String(s) => Some(s.clone()),
            Value::Number(n) => Some(n.to_string()),
            Value::Bool(b) => Some(b.to_string()),
            Value::Null => None,
            _ => Some(v.to_string().trim_matches('"').to_string()),
        }
    })
}

/// 安全地从 JSON Value 数组中提取字符串，带默认值
fn extract_string_or(row: &[Value], index: usize, default: &str) -> String {
    extract_string(row, index).unwrap_or_else(|| default.to_string())
}

/// 安全地从 JSON Value 数组中提取整数
fn extract_i64(row: &[Value], index: usize) -> Option<i64> {
    row.get(index).and_then(|v| {
        match v {
            Value::Number(n) => n.as_i64(),
            Value::String(s) => s.parse().ok(),
            _ => None,
        }
    })
}

/// 安全地从 JSON Value 数组中提取整数，带默认值
fn extract_i64_or(row: &[Value], index: usize, default: i64) -> i64 {
    extract_i64(row, index).unwrap_or(default)
}

/// 安全地从 JSON Value 数组中提取 i32
fn extract_i32(row: &[Value], index: usize) -> Option<i32> {
    extract_i64(row, index).map(|v| v as i32)
}

/// 安全地从 JSON Value 数组中提取 i32，带默认值
fn extract_i32_or(row: &[Value], index: usize, default: i32) -> i32 {
    extract_i32(row, index).unwrap_or(default)
}

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
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_storage_groups(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 存储组列表: {}", connection_id);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_devices(
    connection_id: String,
    storage_group: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 设备列表: {} - {}", connection_id, storage_group);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_timeseries(
    connection_id: String,
    storage_group: String,
    device: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 时间序列列表: {} - {}.{}", connection_id, storage_group, device);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn execute_iotdb_query(
    connection_id: String,
    query: String,
    storage_group: Option<String>,
    connection_service: State<'_, ConnectionService>,
) -> Result<QueryResult, String> {
    debug!("执行 IoTDB 查询: {} - {}", connection_id, query);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn create_iotdb_storage_group(
    connection_id: String,
    storage_group: String,
    ttl: Option<i64>,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("创建 IoTDB 存储组: {} - {}", connection_id, storage_group);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn delete_iotdb_storage_group(
    connection_id: String,
    storage_group: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("删除 IoTDB 存储组: {} - {}", connection_id, storage_group);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn create_iotdb_timeseries(
    connection_id: String,
    timeseries_path: String,
    data_type: String,
    encoding: Option<String>,
    compression: Option<String>,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("创建 IoTDB 时间序列: {} - {}", connection_id, timeseries_path);

    // 验证时间序列路径格式
    if !timeseries_path.starts_with("root.") {
        return Err("时间序列路径必须以 'root.' 开头".to_string());
    }

    // 验证数据类型
    validate_data_type(&data_type)?;

    // 验证编码类型（如果提供）
    if let Some(ref enc) = encoding {
        validate_encoding(enc)?;
    }

    // 验证压缩类型（如果提供）
    if let Some(ref comp) = compression {
        validate_compression(comp)?;
    }

    let connection_manager = connection_service.get_manager();
    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 构建创建时间序列的 SQL，使用大写确保一致性
    let mut query = format!(
        "CREATE TIMESERIES {} WITH DATATYPE={}",
        timeseries_path,
        data_type.to_uppercase()
    );

    if let Some(enc) = encoding {
        query.push_str(&format!(",ENCODING={}", enc.to_uppercase()));
    }

    if let Some(comp) = compression {
        query.push_str(&format!(",COMPRESSION={}", comp.to_uppercase()));
    }

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("创建时间序列失败: {}", e))?;

    info!("时间序列 '{}' 创建成功", timeseries_path);
    Ok(())
}

/// 删除 IoTDB 时间序列
#[tauri::command(rename_all = "camelCase")]
pub async fn delete_iotdb_timeseries(
    connection_id: String,
    timeseries_path: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("删除 IoTDB 时间序列: {} - {}", connection_id, timeseries_path);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn insert_iotdb_data(
    connection_id: String,
    device_path: String,
    timestamp: i64,
    measurements: Vec<String>,
    values: Vec<String>,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("插入 IoTDB 数据: {} - {}", connection_id, device_path);

    if measurements.len() != values.len() {
        return Err("测量点和值的数量不匹配".to_string());
    }

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_server_info(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<serde_json::Value, String> {
    debug!("获取 IoTDB 服务器信息: {}", connection_id);

    let connection_manager = connection_service.get_manager();
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
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_cluster_info(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<ClusterNodeInfo>, String> {
    debug!("获取 IoTDB 集群信息: {}", connection_id);

    let connection_manager = connection_service.get_manager();
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
                    node_id: extract_string_or(&row, 0, ""),
                    node_type: extract_string_or(&row, 1, ""),
                    host: extract_string_or(&row, 2, ""),
                    port: extract_i32_or(&row, 3, 0),
                    status: extract_string_or(&row, 4, "UNKNOWN"),
                };
                cluster_nodes.push(node_info);
            } else {
                warn!("IoTDB 集群节点数据格式不正确，期望至少 4 列，实际 {} 列", row.len());
            }
        }
    }

    Ok(cluster_nodes)
}

/// 获取 IoTDB 用户列表
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_users(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<UserInfo>, String> {
    debug!("获取 IoTDB 用户列表: {}", connection_id);

    let connection_manager = connection_service.get_manager();
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
                if let Some(username) = extract_string(&row, 0) {
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
    }

    Ok(users)
}

/// 获取 IoTDB 函数列表
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_functions(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<FunctionInfo>, String> {
    debug!("获取 IoTDB 函数列表: {}", connection_id);

    let connection_manager = connection_service.get_manager();
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
                    name: extract_string_or(&row, 0, ""),
                    function_type: extract_string_or(&row, 1, "UDF"),
                    class_name: extract_string_or(&row, 2, ""),
                    description: extract_string(&row, 3),
                };
                functions.push(function_info);
            } else {
                warn!("IoTDB 函数数据格式不正确，期望至少 3 列，实际 {} 列", row.len());
            }
        }
    }

    Ok(functions)
}

/// 获取 IoTDB 触发器列表
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_triggers(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<TriggerInfo>, String> {
    debug!("获取 IoTDB 触发器列表: {}", connection_id);

    let connection_manager = connection_service.get_manager();
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
                    name: extract_string_or(&row, 0, ""),
                    status: extract_string_or(&row, 1, "UNKNOWN"),
                    event: extract_string_or(&row, 2, ""),
                    path: extract_string_or(&row, 3, ""),
                    class_name: extract_string_or(&row, 4, ""),
                };
                triggers.push(trigger_info);
            } else {
                warn!("IoTDB 触发器数据格式不正确，期望至少 5 列，实际 {} 列", row.len());
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
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_templates(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<String>, String> {
    debug!("获取 IoTDB 模板列表: {}", connection_id);

    let connection_manager = connection_service.get_manager();
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
    connection_service: State<'_, ConnectionService>,
) -> Result<TemplateInfo, String> {
    debug!("获取 IoTDB 模板详细信息: {} - {}", connection_id, template_name);

    let connection_manager = connection_service.get_manager();
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
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("创建 IoTDB 模板: {} - {}", connection_id, template_info.name);

    // 验证模板名称
    if template_info.name.is_empty() {
        return Err("模板名称不能为空".to_string());
    }

    // 验证测量点列表不为空
    if template_info.measurements.is_empty() {
        return Err("模板必须至少包含一个测量点".to_string());
    }

    // 验证每个测量点的数据类型、编码和压缩配置
    for (i, measurement) in template_info.measurements.iter().enumerate() {
        if measurement.is_empty() {
            return Err(format!("第 {} 个测量点名称不能为空", i + 1));
        }

        // 验证数据类型
        if let Some(dt) = template_info.data_types.get(i) {
            validate_data_type(dt)?;
        }

        // 验证编码类型
        if let Some(enc) = template_info.encodings.get(i) {
            validate_encoding(enc)?;
        }

        // 验证压缩类型
        if let Some(comp) = template_info.compressions.get(i) {
            validate_compression(comp)?;
        }
    }

    let connection_manager = connection_service.get_manager();
    let client = connection_manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 构建创建模板的查询
    let mut query = format!("CREATE SCHEMA TEMPLATE {}", template_info.name);

    for (i, measurement) in template_info.measurements.iter().enumerate() {
        let data_type = template_info.data_types.get(i)
            .map(|s| s.to_uppercase())
            .unwrap_or_else(|| "FLOAT".to_string());
        let encoding = template_info.encodings.get(i)
            .map(|s| s.to_uppercase())
            .unwrap_or_else(|| "PLAIN".to_string());
        let compression = template_info.compressions.get(i)
            .map(|s| s.to_uppercase())
            .unwrap_or_else(|| "SNAPPY".to_string());

        query.push_str(&format!(
            " ({} {} encoding {} compression {})",
            measurement, data_type, encoding, compression
        ));
    }

    client
        .execute_query(&query, None)
        .await
        .map_err(|e| format!("创建模板失败: {}", e))?;

    info!("模板 '{}' 创建成功", template_info.name);
    Ok(())
}

/// 挂载 IoTDB 模板
#[tauri::command(rename_all = "camelCase")]
pub async fn mount_iotdb_template(
    connection_id: String,
    template_name: String,
    path: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("挂载 IoTDB 模板: {} - {} 到 {}", connection_id, template_name, path);

    let connection_manager = connection_service.get_manager();
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
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("卸载 IoTDB 模板: {} - {} 从 {}", connection_id, template_name, path);

    let connection_manager = connection_service.get_manager();
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
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("删除 IoTDB 模板: {} - {}", connection_id, template_name);

    let connection_manager = connection_service.get_manager();
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
    connection_service: State<'_, ConnectionService>,
) -> Result<serde_json::Value, String> {
    debug!("获取 IoTDB 设备信息: {} - {}", connection_id, device_path);

    let connection_manager = connection_service.get_manager();
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
    connection_service: State<'_, ConnectionService>,
) -> Result<TimeseriesInfo, String> {
    debug!("获取 IoTDB 时间序列信息: {} - {}", connection_id, timeseries_path);

    let connection_manager = connection_service.get_manager();
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

    // 安全地提取各字段值
    let name = extract_string(row, 0)
        .ok_or_else(|| "时间序列名称不存在".to_string())?;

    Ok(TimeseriesInfo {
        name,
        alias: extract_string(row, 1),
        storage_group: extract_string_or(row, 2, ""),
        data_type: extract_string_or(row, 3, "UNKNOWN"),
        encoding: extract_string_or(row, 4, "PLAIN"),
        compression: extract_string_or(row, 5, "UNCOMPRESSED"),
        tags: None,
        attributes: None,
    })
}

/// 获取 IoTDB 时间序列统计信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_iotdb_timeseries_statistics(
    connection_id: String,
    timeseries_path: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<serde_json::Value, String> {
    debug!("获取 IoTDB 时间序列统计信息: {} - {}", connection_id, timeseries_path);

    let connection_manager = connection_service.get_manager();
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
