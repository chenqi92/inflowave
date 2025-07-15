use crate::models::{RetentionPolicy, RetentionPolicyConfig, QueryResult, DatabaseInfo, DatabaseStats};
use crate::services::{ConnectionService, database_service::DatabaseService};
use crate::database::client::TableSchema;
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

/// 获取数据库信息
#[tauri::command]
pub async fn get_database_info(
    database_service: State<'_, DatabaseService>,
    connection_id: String,
    database: String,
) -> Result<DatabaseInfo, String> {
    debug!("处理获取数据库信息命令: {} - {}", connection_id, database);

    database_service.get_database_info(&connection_id, &database).await
        .map_err(|e| {
            error!("获取数据库信息失败: {}", e);
            format!("获取数据库信息失败: {}", e)
        })
}

/// 获取数据库统计信息
#[tauri::command]
pub async fn get_database_stats(
    database_service: State<'_, DatabaseService>,
    connection_id: String,
    database: String,
) -> Result<DatabaseStats, String> {
    debug!("处理获取数据库统计信息命令: {} - {}", connection_id, database);

    database_service.get_database_stats(&connection_id, &database).await
        .map_err(|e| {
            error!("获取数据库统计信息失败: {}", e);
            format!("获取数据库统计信息失败: {}", e)
        })
}

/// 执行表查询（右键菜单操作）
#[tauri::command]
pub async fn execute_table_query(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    table: String,
    query_type: String,
    limit: Option<u32>,
) -> Result<QueryResult, String> {
    debug!("处理表查询命令: {} - {} - {} - {}", connection_id, database, table, query_type);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 根据查询类型构建查询语句
    let query = match query_type.as_str() {
        "SELECT" => {
            let limit_clause = limit.map(|l| format!(" LIMIT {}", l)).unwrap_or_default();
            format!("SELECT * FROM \"{}\" ORDER BY time DESC{}", table, limit_clause)
        }
        "COUNT" => format!("SELECT COUNT(*) FROM \"{}\"", table),
        "FIRST" => format!("SELECT FIRST(*) FROM \"{}\"", table),
        "LAST" => format!("SELECT LAST(*) FROM \"{}\"", table),
        _ => return Err(format!("不支持的查询类型: {}", query_type)),
    };

    client.execute_query(&query).await
        .map_err(|e| {
            error!("执行表查询失败: {}", e);
            format!("执行表查询失败: {}", e)
        })
}

/// 获取表结构信息
#[tauri::command]
pub async fn get_table_structure(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    table: String,
) -> Result<serde_json::Value, String> {
    debug!("处理获取表结构命令: {} - {} - {}", connection_id, database, table);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 获取字段信息，包含数据库上下文
    let field_query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, table);
    let field_result = client.execute_query(&field_query).await
        .map_err(|e| {
            error!("获取字段信息失败: {}", e);
            format!("获取字段信息失败: {}", e)
        })?;

    // 获取标签信息，包含数据库上下文
    let tag_query = format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, table);
    let tag_result = client.execute_query(&tag_query).await
        .map_err(|e| {
            error!("获取标签信息失败: {}", e);
            format!("获取标签信息失败: {}", e)
        })?;

    // 构建结构信息
    let structure = serde_json::json!({
        "measurement": table,
        "fields": field_result,
        "tags": tag_result
    });

    Ok(structure)
}

/// 生成插入数据模板
#[tauri::command]
pub async fn generate_insert_template(
    _connection_service: State<'_, ConnectionService>,
    _connectionId: String,
    database: String,
    table: String,
) -> Result<String, String> {
    debug!("处理生成插入模板命令: {} - {} - {}", _connectionId, database, table);

    // 生成 Line Protocol 格式的插入模板
    let template = format!(
        r#"# Line Protocol 格式插入模板
# 格式: measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp

{},tag1=value1,tag2=value2 field1=1.0,field2="string_value" {}

# 示例:
# {},host=server01,region=us-west cpu_usage=80.5,memory_usage=65.2 1609459200000000000
"#,
        table,
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0),
        table
    );

    Ok(template)
}

/// 导出表数据
#[tauri::command]
pub async fn export_table_data(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    table: String,
    format: String,
    limit: Option<u32>,
    file_path: String,
) -> Result<String, String> {
    debug!("处理导出表数据命令: {} - {} - {} - {}", connection_id, database, table, format);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 构建查询语句
    let limit_clause = limit.map(|l| format!(" LIMIT {}", l)).unwrap_or_default();
    let query = format!("SELECT * FROM \"{}\" ORDER BY time DESC{}", table, limit_clause);

    // 执行查询
    let result = client.execute_query(&query).await
        .map_err(|e| {
            error!("查询数据失败: {}", e);
            format!("查询数据失败: {}", e)
        })?;

    // 根据格式导出数据
    match format.as_str() {
        "csv" => export_to_csv(&result, &file_path),
        "json" => export_to_json(&result, &file_path),
        _ => Err(format!("不支持的导出格式: {}", format)),
    }
}

/// 导出为CSV格式
fn export_to_csv(result: &QueryResult, file_path: &str) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;

    let mut file = File::create(file_path)
        .map_err(|e| format!("创建文件失败: {}", e))?;

    // 写入表头
    let header = result.columns().join(",");
    writeln!(file, "{}", header)
        .map_err(|e| format!("写入表头失败: {}", e))?;

    // 写入数据行
    for row in &result.rows() {
        let row_str: Vec<String> = row.iter()
            .map(|value| match value {
                serde_json::Value::String(s) => format!("\"{}\"", s),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                serde_json::Value::Null => "".to_string(),
                _ => value.to_string(),
            })
            .collect();
        writeln!(file, "{}", row_str.join(","))
            .map_err(|e| format!("写入数据行失败: {}", e))?;
    }

    Ok(format!("成功导出 {} 行数据到 {}", result.row_count.unwrap_or(0), file_path))
}

/// 导出为JSON格式
fn export_to_json(result: &QueryResult, file_path: &str) -> Result<String, String> {
    use std::fs::File;
    use std::io::Write;

    let mut file = File::create(file_path)
        .map_err(|e| format!("创建文件失败: {}", e))?;

    let json_data = serde_json::to_string_pretty(result)
        .map_err(|e| format!("序列化JSON失败: {}", e))?;

    file.write_all(json_data.as_bytes())
        .map_err(|e| format!("写入文件失败: {}", e))?;

    Ok(format!("成功导出 {} 行数据到 {}", result.row_count.unwrap_or(0), file_path))
}

/// 刷新数据库结构
#[tauri::command]
pub async fn refresh_database_structure(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<(), String> {
    debug!("处理刷新数据库结构命令: {} - {}", connection_id, database);

    let manager = connection_service.get_manager();
    let _client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 这里可以添加缓存清理逻辑
    info!("数据库 '{}' 结构已刷新", database);
    Ok(())
}

/// 创建测量模板
#[tauri::command]
pub async fn create_measurement_template(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<String, String> {
    debug!("处理创建测量模板命令: {} - {}", connection_id, database);

    let _manager = connection_service.get_manager();

    // 生成创建测量的模板
    let template = format!(
        r#"# 创建新测量的 Line Protocol 模板
# 在 InfluxDB 中，测量(measurement)是通过写入数据自动创建的

# 格式: measurement_name,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp

# 示例 - 创建一个名为 'new_measurement' 的测量:
new_measurement,host=server01,region=us-west cpu_usage=80.5,memory_usage=65.2 {}

# 使用以下命令写入数据:
# curl -i -XPOST 'http://localhost:8086/write?db={}' --data-binary 'new_measurement,host=server01,region=us-west cpu_usage=80.5,memory_usage=65.2'
"#,
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0),
        database
    );

    Ok(template)
}

/// 显示测量列表
#[tauri::command]
pub async fn show_measurements(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<Vec<String>, String> {
    debug!("处理显示测量列表命令: {} - {}", connection_id, database);

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

    // 构建查询语句，包含数据库上下文
    let query = if let Some(measurement) = measurement {
        format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, measurement)
    } else {
        format!("SHOW FIELD KEYS ON \"{}\"", database)
    };

    let result = client.execute_query(&query).await
        .map_err(|e| {
            error!("获取字段键失败: {}", e);
            format!("获取字段键失败: {}", e)
        })?;

    // 解析字段键
    let mut field_keys = Vec::new();
    for row in result.rows() {
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

    // 构建查询语句，包含数据库上下文
    let query = if let Some(measurement) = measurement {
        format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, measurement)
    } else {
        format!("SHOW TAG KEYS ON \"{}\"", database)
    };

    let result = client.execute_query(&query).await
        .map_err(|e| {
            error!("获取标签键失败: {}", e);
            format!("获取标签键失败: {}", e)
        })?;

    // 解析标签键
    let mut tag_keys = Vec::new();
    for row in result.rows() {
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
    
    // 构建查询语句，包含数据库上下文
    let query = if let Some(measurement) = measurement {
        format!("SHOW TAG VALUES ON \"{}\" FROM \"{}\" WITH KEY = \"{}\"", database, measurement, tag_key)
    } else {
        format!("SHOW TAG VALUES ON \"{}\" WITH KEY = \"{}\"", database, tag_key)
    };
    
    let result = client.execute_query(&query).await
        .map_err(|e| {
            error!("获取标签值失败: {}", e);
            format!("获取标签值失败: {}", e)
        })?;
    
    // 解析标签值
    let mut tag_values = Vec::new();
    for row in result.rows() {
        if let Some(tag_value) = row.get(1) { // 标签值通常在第二列
            if let Some(value_str) = tag_value.as_str() {
                tag_values.push(value_str.to_string());
            }
        }
    }
    
    Ok(tag_values)
}

/// 获取表结构信息（包含字段和标签）
#[tauri::command]
pub async fn get_table_schema(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    measurement: String,
) -> Result<TableSchema, String> {
    debug!("处理获取表结构命令: {} - {} - {}", connection_id, database, measurement);
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    client.get_table_schema(&database, &measurement).await
        .map_err(|e| {
            error!("获取表结构失败: {}", e);
            format!("获取表结构失败: {}", e)
        })
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


