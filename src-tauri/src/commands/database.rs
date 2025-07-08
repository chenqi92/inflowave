use crate::models::{RetentionPolicy, RetentionPolicyConfig};
use crate::services::ConnectionService;
use tauri::State;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};

/// 获取数据库列表
#[tauri::command]
pub async fn get_databases(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<Vec<String>, String> {
    debug!("处理获取数据库列表命令: {}", connection_id);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    client.get_databases().await
        .map_err(|e| {
            error!("获取数据库列表失败: {}", e);
            format!("获取数据库列表失败: {}", e)
        })
}

/// 创建数据库
#[tauri::command]
pub async fn create_database(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database_name: String,
) -> Result<(), String> {
    debug!("处理创建数据库命令: {} - {}", connection_id, database_name);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    client.create_database(&database_name).await
        .map_err(|e| {
            error!("创建数据库失败: {}", e);
            format!("创建数据库失败: {}", e)
        })
}

/// 删除数据库
#[tauri::command]
pub async fn drop_database(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database_name: String,
) -> Result<(), String> {
    debug!("处理删除数据库命令: {} - {}", connection_id, database_name);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    client.drop_database(&database_name).await
        .map_err(|e| {
            error!("删除数据库失败: {}", e);
            format!("删除数据库失败: {}", e)
        })
}

/// 获取保留策略
#[tauri::command]
pub async fn get_retention_policies(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<Vec<RetentionPolicy>, String> {
    debug!("处理获取保留策略命令: {} - {}", connection_id, database);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    client.get_retention_policies(&database).await
        .map_err(|e| {
            error!("获取保留策略失败: {}", e);
            format!("获取保留策略失败: {}", e)
        })
}

/// 创建保留策略
#[tauri::command]
pub async fn create_retention_policy(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    config: RetentionPolicyConfig,
) -> Result<(), String> {
    debug!("处理创建保留策略命令: {} - {}", connection_id, config.name);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    // 构建创建保留策略的查询
    let mut query = format!(
        "CREATE RETENTION POLICY \"{}\" ON \"{}\" DURATION {}",
        config.name, config.database, config.duration
    );
    
    if let Some(shard_duration) = &config.shard_duration {
        query.push_str(&format!(" REPLICATION {}", shard_duration));
    }
    
    if let Some(replica_n) = config.replica_n {
        query.push_str(&format!(" REPLICATION {}", replica_n));
    }
    
    if config.default.unwrap_or(false) {
        query.push_str(" DEFAULT");
    }
    
    client.execute_query(&query).await
        .map_err(|e| {
            error!("创建保留策略失败: {}", e);
            format!("创建保留策略失败: {}", e)
        })?;
    
    Ok(())
}

/// 删除保留策略
#[tauri::command]
pub async fn drop_retention_policy(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    policy_name: String,
) -> Result<(), String> {
    debug!("处理删除保留策略命令: {} - {} - {}", connection_id, database, policy_name);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    let query = format!(
        "DROP RETENTION POLICY \"{}\" ON \"{}\"",
        policy_name, database
    );

    client.execute_query(&query).await
        .map_err(|e| {
            error!("删除保留策略失败: {}", e);
            format!("删除保留策略失败: {}", e)
        })?;

    info!("保留策略 '{}' 删除成功", policy_name);
    Ok(())
}

/// 修改保留策略
#[tauri::command]
pub async fn alter_retention_policy(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    config: RetentionPolicyConfig,
) -> Result<(), String> {
    debug!("处理修改保留策略命令: {} - {}", connection_id, config.name);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 构建修改保留策略的查询
    let mut query = format!(
        "ALTER RETENTION POLICY \"{}\" ON \"{}\"",
        config.name, config.database
    );

    // 添加持续时间
    query.push_str(&format!(" DURATION {}", config.duration));

    // 添加分片持续时间
    if let Some(shard_duration) = &config.shard_duration {
        query.push_str(&format!(" SHARD DURATION {}", shard_duration));
    }

    // 添加副本数
    if let Some(replica_n) = config.replica_n {
        query.push_str(&format!(" REPLICATION {}", replica_n));
    }

    // 设置为默认策略
    if config.default.unwrap_or(false) {
        query.push_str(" DEFAULT");
    }

    client.execute_query(&query).await
        .map_err(|e| {
            error!("修改保留策略失败: {}", e);
            format!("修改保留策略失败: {}", e)
        })?;

    info!("保留策略 '{}' 修改成功", config.name);
    Ok(())
}

/// 删除测量
#[tauri::command]
pub async fn drop_measurement(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    measurement: String,
) -> Result<(), String> {
    debug!("处理删除测量命令: {} - {} - {}", connection_id, database, measurement);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    let query = format!("DROP MEASUREMENT \"{}\"", measurement);

    client.execute_query(&query).await
        .map_err(|e| {
            error!("删除测量失败: {}", e);
            format!("删除测量失败: {}", e)
        })?;

    info!("测量 '{}' 删除成功", measurement);
    Ok(())
}

/// 获取测量列表
#[tauri::command]
pub async fn get_measurements(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<Vec<String>, String> {
    debug!("处理获取测量列表命令: {} - {}", connection_id, database);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    client.get_measurements(&database).await
        .map_err(|e| {
            error!("获取测量列表失败: {}", e);
            format!("获取测量列表失败: {}", e)
        })
}

/// 获取字段键
#[tauri::command]
pub async fn get_field_keys(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    measurement: Option<String>,
) -> Result<Vec<String>, String> {
    debug!("处理获取字段键命令: {} - {} - {:?}", connection_id, database, measurement);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    let query = if let Some(measurement) = measurement {
        format!("SHOW FIELD KEYS FROM \"{}\"", measurement)
    } else {
        "SHOW FIELD KEYS".to_string()
    };
    
    let result = client.execute_query(&query).await
        .map_err(|e| {
            error!("获取字段键失败: {}", e);
            format!("获取字段键失败: {}", e)
        })?;
    
    // 解析字段键
    let mut field_keys = Vec::new();
    for row in result.rows {
        if let Some(field_key) = row.get(0) {
            if let Some(key_str) = field_key.as_str() {
                field_keys.push(key_str.to_string());
            }
        }
    }
    
    Ok(field_keys)
}

/// 获取标签键
#[tauri::command]
pub async fn get_tag_keys(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    measurement: Option<String>,
) -> Result<Vec<String>, String> {
    debug!("处理获取标签键命令: {} - {} - {:?}", connection_id, database, measurement);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    let query = if let Some(measurement) = measurement {
        format!("SHOW TAG KEYS FROM \"{}\"", measurement)
    } else {
        "SHOW TAG KEYS".to_string()
    };
    
    let result = client.execute_query(&query).await
        .map_err(|e| {
            error!("获取标签键失败: {}", e);
            format!("获取标签键失败: {}", e)
        })?;
    
    // 解析标签键
    let mut tag_keys = Vec::new();
    for row in result.rows {
        if let Some(tag_key) = row.get(0) {
            if let Some(key_str) = tag_key.as_str() {
                tag_keys.push(key_str.to_string());
            }
        }
    }
    
    Ok(tag_keys)
}

/// 获取标签值
#[tauri::command]
pub async fn get_tag_values(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    tag_key: String,
    measurement: Option<String>,
) -> Result<Vec<String>, String> {
    debug!("处理获取标签值命令: {} - {} - {} - {:?}", connection_id, database, tag_key, measurement);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    let query = if let Some(measurement) = measurement {
        format!("SHOW TAG VALUES FROM \"{}\" WITH KEY = \"{}\"", measurement, tag_key)
    } else {
        format!("SHOW TAG VALUES WITH KEY = \"{}\"", tag_key)
    };
    
    let result = client.execute_query(&query).await
        .map_err(|e| {
            error!("获取标签值失败: {}", e);
            format!("获取标签值失败: {}", e)
        })?;
    
    // 解析标签值
    let mut tag_values = Vec::new();
    for row in result.rows {
        if let Some(tag_value) = row.get(1) { // 标签值通常在第二列
            if let Some(value_str) = tag_value.as_str() {
                tag_values.push(value_str.to_string());
            }
        }
    }
    
    Ok(tag_values)
}

/// 字段映射配置
#[derive(Debug, Deserialize, Serialize)]
pub struct FieldMapping {
    pub source_field: String,
    pub target_field: String,
    pub field_type: String, // "tag", "field", "time"
    pub data_type: Option<String>, // "string", "number", "boolean", "timestamp"
}

/// 导入选项
#[derive(Debug, Deserialize, Serialize)]
pub struct ImportOptions {
    pub batch_size: Option<usize>,
    pub skip_errors: Option<bool>,
}

/// 导入请求
#[derive(Debug, Deserialize, Serialize)]
pub struct ImportRequest {
    pub connection_id: String,
    pub database: String,
    pub measurement: String,
    pub field_mappings: Vec<FieldMapping>,
    pub data: Vec<Vec<serde_json::Value>>,
    pub options: ImportOptions,
}

/// 导入数据
#[tauri::command]
pub async fn import_data(
    connection_service: State<'_, ConnectionService>,
    request: ImportRequest,
) -> Result<(), String> {
    debug!("处理数据导入命令: {} - {} - {}", request.connection_id, request.database, request.measurement);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&request.connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    let batch_size = request.options.batch_size.unwrap_or(1000);
    let skip_errors = request.options.skip_errors.unwrap_or(false);

    // 找到时间字段映射
    let time_mapping = request.field_mappings.iter()
        .find(|m| m.field_type == "time")
        .ok_or_else(|| "未找到时间字段映射".to_string())?;

    let time_field_index = request.field_mappings.iter()
        .position(|m| m.source_field == time_mapping.source_field)
        .ok_or_else(|| "时间字段索引未找到".to_string())?;

    // 分批处理数据
    let mut total_imported = 0;
    let mut total_errors = 0;

    for chunk in request.data.chunks(batch_size) {
        let mut line_protocol_lines = Vec::new();

        for row in chunk {
            match convert_row_to_line_protocol(&request.measurement, row, &request.field_mappings, time_field_index) {
                Ok(line) => line_protocol_lines.push(line),
                Err(e) => {
                    total_errors += 1;
                    if !skip_errors {
                        return Err(format!("数据转换失败: {}", e));
                    }
                    error!("跳过错误行: {}", e);
                }
            }
        }

        if !line_protocol_lines.is_empty() {
            let line_protocol = line_protocol_lines.join("\n");

            match client.write_line_protocol(&request.database, &line_protocol).await {
                Ok(_) => {
                    total_imported += line_protocol_lines.len();
                    info!("成功导入 {} 行数据", line_protocol_lines.len());
                }
                Err(e) => {
                    if !skip_errors {
                        return Err(format!("写入数据失败: {}", e));
                    }
                    total_errors += line_protocol_lines.len();
                    error!("跳过错误批次: {}", e);
                }
            }
        }
    }

    info!("数据导入完成: 成功 {} 行, 错误 {} 行", total_imported, total_errors);
    Ok(())
}

/// 将数据行转换为 Line Protocol 格式
fn convert_row_to_line_protocol(
    measurement: &str,
    row: &[serde_json::Value],
    field_mappings: &[FieldMapping],
    _time_field_index: usize,
) -> Result<String, String> {
    let mut tags = Vec::new();
    let mut fields = Vec::new();
    let mut timestamp = None;

    for (index, value) in row.iter().enumerate() {
        if let Some(mapping) = field_mappings.get(index) {
            let value_str = convert_value_to_string(value, &mapping.data_type)?;

            match mapping.field_type.as_str() {
                "tag" => {
                    if !value_str.is_empty() {
                        tags.push(format!("{}={}", mapping.target_field, escape_tag_value(&value_str)));
                    }
                }
                "field" => {
                    if !value_str.is_empty() {
                        let formatted_value = format_field_value(&value_str, &mapping.data_type)?;
                        fields.push(format!("{}={}", mapping.target_field, formatted_value));
                    }
                }
                "time" => {
                    timestamp = Some(parse_timestamp(&value_str)?);
                }
                _ => {
                    return Err(format!("未知字段类型: {}", mapping.field_type));
                }
            }
        }
    }

    if fields.is_empty() {
        return Err("至少需要一个字段值".to_string());
    }

    // 构建 Line Protocol
    let mut line = measurement.to_string();

    if !tags.is_empty() {
        line.push(',');
        line.push_str(&tags.join(","));
    }

    line.push(' ');
    line.push_str(&fields.join(","));

    if let Some(ts) = timestamp {
        line.push(' ');
        line.push_str(&ts.to_string());
    }

    Ok(line)
}

/// 转换值为字符串
fn convert_value_to_string(value: &serde_json::Value, _data_type: &Option<String>) -> Result<String, String> {
    match value {
        serde_json::Value::Null => Ok(String::new()),
        serde_json::Value::String(s) => Ok(s.clone()),
        serde_json::Value::Number(n) => Ok(n.to_string()),
        serde_json::Value::Bool(b) => Ok(b.to_string()),
        _ => Ok(value.to_string()),
    }
}

/// 格式化字段值
fn format_field_value(value: &str, data_type: &Option<String>) -> Result<String, String> {
    if value.is_empty() {
        return Err("字段值不能为空".to_string());
    }

    match data_type.as_deref() {
        Some("string") => Ok(format!("\"{}\"", value.replace("\"", "\\\""))),
        Some("number") => {
            value.parse::<f64>()
                .map(|n| n.to_string())
                .map_err(|_| format!("无效的数字值: {}", value))
        }
        Some("boolean") => {
            match value.to_lowercase().as_str() {
                "true" | "1" => Ok("true".to_string()),
                "false" | "0" => Ok("false".to_string()),
                _ => Err(format!("无效的布尔值: {}", value)),
            }
        }
        _ => Ok(format!("\"{}\"", value.replace("\"", "\\\""))),
    }
}

/// 转义标签值
fn escape_tag_value(value: &str) -> String {
    value.replace(" ", "\\ ")
         .replace(",", "\\,")
         .replace("=", "\\=")
}

/// 解析时间戳
fn parse_timestamp(value: &str) -> Result<i64, String> {
    if value.is_empty() {
        return Ok(chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));
    }

    // 尝试解析为纳秒时间戳
    if let Ok(ns) = value.parse::<i64>() {
        return Ok(ns);
    }

    // 尝试解析为秒时间戳
    if let Ok(s) = value.parse::<i64>() {
        if s < 1_000_000_000_000 { // 小于毫秒时间戳，认为是秒
            return Ok(s * 1_000_000_000);
        }
    }

    // 尝试解析 ISO 8601 格式
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(value) {
        return Ok(dt.timestamp_nanos_opt().unwrap_or(0));
    }

    // 尝试解析常见日期格式
    let formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S%.3f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S%.3f",
        "%Y-%m-%d",
    ];

    for format in &formats {
        if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(value, format) {
            return Ok(dt.and_utc().timestamp_nanos_opt().unwrap_or(0));
        }
    }

    Err(format!("无法解析时间戳: {}", value))
}
