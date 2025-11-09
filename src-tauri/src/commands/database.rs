use crate::models::{RetentionPolicy, RetentionPolicyConfig, QueryResult, DatabaseInfo, DatabaseStats, Measurement};
use crate::services::ConnectionService;
use crate::models::TableSchema;
use crate::commands::settings::SettingsStorage;
use tauri::State;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};

/// 检查是否是管理节点
fn is_management_node(node_name: &str) -> bool {
    matches!(node_name,
        "存储组管理" | "时间序列管理" | "函数管理" | "配置管理" | "版本信息" |
        "storage_group_management" | "timeseries_management" | "function_management" | "config_management" | "version_info"
    )
}

/// 处理管理节点查询
async fn handle_management_query(
    connection_id: &str,
    node_name: &str,
    connection_service: State<'_, crate::services::ConnectionService>,
) -> Result<Vec<String>, String> {
    let manager = connection_service.get_manager();
    let client = manager.get_connection(connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 根据管理节点类型执行相应的 IoTDB 查询
    let query = match node_name {
        "存储组管理" | "storage_group_management" => "SHOW STORAGE GROUP",
        "时间序列管理" | "timeseries_management" => "SHOW TIMESERIES",
        "函数管理" | "function_management" => "SHOW FUNCTIONS",
        "配置管理" | "config_management" => "SHOW VARIABLES",
        "版本信息" | "version_info" => "SHOW VERSION",
        _ => {
            debug!("未知的管理节点类型: {}", node_name);
            return Ok(vec![]);
        }
    };

    debug!("执行管理查询: {}", query);

    // 执行查询
    let result = client.execute_query(query, None).await
        .map_err(|e| {
            error!("管理查询失败: {}", e);
            format!("管理查询失败: {}", e)
        })?;

    // 解析结果
    let mut items = Vec::new();
    for row in result.rows() {
        if let Some(item) = row.get(0) {
            if let Some(item_str) = item.as_str() {
                items.push(item_str.to_string());
            }
        }
    }

    debug!("管理查询 '{}' 返回 {} 个项目", query, items.len());
    Ok(items)
}

/// 获取数据库列表
#[tauri::command(rename_all = "camelCase")]
pub async fn get_databases(
    connection_service: State<'_, ConnectionService>,
    settings_storage: State<'_, SettingsStorage>,
    connection_id: String,
) -> Result<Vec<String>, String> {
    debug!("处理获取数据库列表命令: {}", connection_id);

    // 🔧 确保连接已建立（如果不存在则自动建立）
    if let Err(e) = connection_service.connect_to_database(&connection_id).await {
        error!("自动建立连接失败: {}", e);
        return Err(format!("建立连接失败: {}", e));
    }

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    let mut databases = client.get_databases().await
        .map_err(|e| {
            error!("获取数据库列表失败: {}", e);
            format!("获取数据库列表失败: {}", e)
        })?;

    debug!("原始数据库列表: {:?}", databases);

    // 检查是否需要过滤 _internal 数据库
    let settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let show_internal = settings.general.show_internal_databases;
    drop(settings); // 尽早释放锁

    if !show_internal {
        let original_count = databases.len();
        databases.retain(|db| !db.starts_with("_internal"));
        let filtered_count = databases.len();

        if original_count != filtered_count {
            debug!("已过滤 {} 个内部数据库，剩余数据库: {:?}",
                   original_count - filtered_count, databases);
        }
    } else {
        debug!("显示所有数据库，包括内部数据库");
    }

    Ok(databases)
}

/// 创建数据库
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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
#[tauri::command(rename_all = "camelCase")]
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

/// 获取单个保留策略详情
#[tauri::command(rename_all = "camelCase")]
pub async fn get_retention_policy(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    policy_name: String,
) -> Result<RetentionPolicy, String> {
    debug!("处理获取保留策略详情命令: {} - {} - {}", connection_id, database, policy_name);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 获取所有保留策略
    let policies = client.get_retention_policies(&database).await
        .map_err(|e| {
            error!("获取保留策略失败: {}", e);
            format!("获取保留策略失败: {}", e)
        })?;

    // 查找指定的保留策略
    policies.into_iter()
        .find(|p| p.name == policy_name)
        .ok_or_else(|| {
            error!("未找到保留策略: {}", policy_name);
            format!("未找到保留策略: {}", policy_name)
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
    // 注意：InfluxDB 语法要求 REPLICATION 必须在 SHARD DURATION 之前
    let mut query = format!(
        "CREATE RETENTION POLICY \"{}\" ON \"{}\" DURATION {}",
        config.name, config.database, config.duration
    );

    // 先添加 REPLICATION（必须在 SHARD DURATION 之前）
    if let Some(replica_n) = config.replica_n {
        query.push_str(&format!(" REPLICATION {}", replica_n));
    }

    // 再添加 SHARD DURATION
    if let Some(shard_duration) = &config.shard_duration {
        query.push_str(&format!(" SHARD DURATION {}", shard_duration));
    }

    // 最后添加 DEFAULT
    if config.default.unwrap_or(false) {
        query.push_str(" DEFAULT");
    }

    debug!("创建保留策略 SQL: {}", query);

    client.execute_query(&query, Some(&config.database)).await
        .map_err(|e| {
            error!("创建保留策略失败: {}", e);
            format!("创建保留策略失败: {}", e)
        })?;

    info!("保留策略创建成功: {}.{}", config.database, config.name);
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

    client.execute_query(&query, Some(&database)).await
        .map_err(|e| {
            error!("删除保留策略失败: {}", e);
            format!("删除保留策略失败: {}", e)
        })?;

    info!("保留策略 '{}' 删除成功", policy_name);
    Ok(())
}

/// 获取数据库信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_database_info(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<DatabaseInfo, String> {
    debug!("处理获取数据库信息命令: {} - {}", connection_id, database);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 获取保留策略
    let retention_policies = client.get_retention_policies(&database).await
        .map_err(|e| {
            error!("获取保留策略失败: {}", e);
            format!("获取保留策略失败: {}", e)
        })?;

    // 获取测量列表
    let measurement_names = client.get_measurements(&database).await
        .map_err(|e| {
            error!("获取测量列表失败: {}", e);
            format!("获取测量列表失败: {}", e)
        })?;

    // 构建测量信息（简化版本）
    let measurements: Vec<Measurement> = measurement_names
        .into_iter()
        .map(|name| Measurement {
            name,
            fields: vec![],
            tags: vec![],
            last_write: None,
            series_count: None,
        })
        .collect();

    let database_info = DatabaseInfo {
        name: database.clone(),
        retention_policies,
        measurements,
        created_at: None,
    };

    info!("数据库信息获取成功: {}", database);
    Ok(database_info)
}

/// 获取数据库统计信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_database_stats(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<DatabaseStats, String> {
    debug!("处理获取数据库统计信息命令: {} - {}", connection_id, database);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 获取保留策略
    let retention_policies = client.get_retention_policies(&database).await
        .map_err(|e| {
            error!("获取保留策略失败: {}", e);
            format!("获取保留策略失败: {}", e)
        })?;

    // 获取测量数量
    let measurements = client.get_measurements(&database).await
        .map_err(|e| {
            error!("获取测量列表失败: {}", e);
            format!("获取测量列表失败: {}", e)
        })?;
    let measurement_count = measurements.len() as u64;

    // 尝试获取序列数量
    let series_count = match get_series_count(&client, &database).await {
        Ok(count) => count,
        Err(e) => {
            debug!("获取序列数量失败: {}", e);
            0
        }
    };

    // 尝试获取数据点数量
    let point_count = match get_point_count(&client, &database).await {
        Ok(count) => count,
        Err(e) => {
            debug!("获取数据点数量失败: {}", e);
            0
        }
    };

    // 获取保留策略信息用于返回
    let retention_policies_for_stats = retention_policies.clone();

    let stats = DatabaseStats {
        name: database.clone(),
        size: point_count, // 使用数据点数量作为大小的估算
        series_count,
        measurement_count,
        retention_policies: retention_policies_for_stats,
        last_write: None,
    };

    info!("数据库统计信息获取成功: {} (测量: {}, 序列: {}, 数据点: {})",
          database, measurement_count, series_count, point_count);
    Ok(stats)
}

/// 获取序列数量
async fn get_series_count(
    client: &std::sync::Arc<crate::database::client::DatabaseClient>,
    database: &str,
) -> Result<u64, String> {
    let query = format!("SHOW SERIES ON \"{}\"", database);
    let result = client.execute_query(&query, Some(database)).await
        .map_err(|e| format!("获取序列数量失败: {}", e))?;

    Ok(result.row_count.unwrap_or(0) as u64)
}

/// 获取数据点数量（估算）
async fn get_point_count(
    client: &std::sync::Arc<crate::database::client::DatabaseClient>,
    database: &str,
) -> Result<u64, String> {
    // 获取所有测量值
    let measurements = client.get_measurements(database).await
        .map_err(|e| format!("获取测量列表失败: {}", e))?;

    let mut total_count = 0u64;

    // 对每个测量值执行 COUNT(*) 查询
    for measurement in measurements.iter().take(10) { // 限制只查询前10个测量值以提高性能
        let query = format!("SELECT COUNT(*) FROM \"{}\"", measurement);
        match client.execute_query(&query, Some(database)).await {
            Ok(result) => {
                if let Some(data) = result.data {
                    if let Some(first_row) = data.first() {
                        if let Some(count_value) = first_row.get(1) {
                            if let Some(count) = count_value.as_u64() {
                                total_count += count;
                            } else if let Some(count) = count_value.as_i64() {
                                total_count += count as u64;
                            } else if let Some(count_str) = count_value.as_str() {
                                if let Ok(count) = count_str.parse::<u64>() {
                                    total_count += count;
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                debug!("获取测量 {} 的数据点数量失败: {}", measurement, e);
            }
        }
    }

    Ok(total_count)
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
    let query = {
        // 检查连接类型，如果是IoTDB则使用不带引号的路径格式
        let db_type = client.get_database_type();
        let table_path = if matches!(db_type, crate::models::DatabaseType::IoTDB) {
            // IoTDB使用不带引号的路径格式
            if table.starts_with(&database) {
                table.to_string()
            } else {
                format!("{}.{}", database, table)
            }
        } else {
            // InfluxDB使用带引号的格式
            format!("\"{}\"", table)
        };

        match query_type.as_str() {
            "SELECT" => {
                let limit_clause = limit.map(|l| format!(" LIMIT {}", l)).unwrap_or_default();
                if matches!(db_type, crate::models::DatabaseType::IoTDB) {
                    format!("SELECT * FROM {}{}", table_path, limit_clause)
                } else {
                    format!("SELECT * FROM {} ORDER BY time DESC{}", table_path, limit_clause)
                }
            }
            "COUNT" => format!("SELECT COUNT(*) FROM {}", table_path),
            "FIRST" => {
                if matches!(db_type, crate::models::DatabaseType::IoTDB) {
                    format!("SELECT * FROM {} LIMIT 1", table_path)
                } else {
                    format!("SELECT FIRST(*) FROM {}", table_path)
                }
            }
            "LAST" => {
                if matches!(db_type, crate::models::DatabaseType::IoTDB) {
                    format!("SELECT * FROM {} ORDER BY time DESC LIMIT 1", table_path)
                } else {
                    format!("SELECT LAST(*) FROM {}", table_path)
                }
            }
            _ => return Err(format!("不支持的查询类型: {}", query_type)),
        }
    };

    client.execute_query(&query, Some(&database)).await
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

    // 根据连接类型获取字段信息
    let field_result = {
        let db_type = client.get_database_type();
        if matches!(db_type, crate::models::DatabaseType::IoTDB) {
            // IoTDB使用SHOW TIMESERIES语法
            let field_query = format!("SHOW TIMESERIES {}.{}.*", database, table);
            client.execute_query(&field_query, Some(&database)).await
                .map_err(|e| {
                    error!("获取字段信息失败: {}", e);
                    format!("获取字段信息失败: {}", e)
                })?
        } else {
            // InfluxDB使用SHOW FIELD KEYS语法
            let field_query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, table);
            client.execute_query(&field_query, Some(&database)).await
                .map_err(|e| {
                    error!("获取字段信息失败: {}", e);
                    format!("获取字段信息失败: {}", e)
                })?
        }
    };

    // 根据连接类型获取标签信息
    let tag_result = {
        let db_type = client.get_database_type();
        if matches!(db_type, crate::models::DatabaseType::IoTDB) {
            // IoTDB不支持TAG概念，返回空结果
            crate::models::QueryResult {
                results: vec![],
                execution_time: Some(1),
                row_count: Some(0),
                data: None,
                columns: Some(vec![]),
                error: None,
                messages: None,
                statistics: None,
                execution_plan: None,
                aggregations: None,
                sql_type: None,
            }
        } else {
            // InfluxDB获取标签信息
            let tag_query = format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, table);
            client.execute_query(&tag_query, Some(&database)).await
                .map_err(|e| {
                    error!("获取标签信息失败: {}", e);
                    format!("获取标签信息失败: {}", e)
                })?
        }
    };

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
    _connection_id: String,
    database: String,
    table: String,
) -> Result<String, String> {
    debug!("处理生成插入模板命令: {} - {} - {}", _connection_id, database, table);

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

/// 导出数据库元数据
#[tauri::command(rename_all = "camelCase")]
pub async fn export_database_metadata(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<serde_json::Value, String> {
    debug!("处理导出数据库元数据命令: {} - {}", connection_id, database);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 获取数据库类型
    let db_type = client.get_database_type();

    // 根据数据库类型导出不同的元数据
    let metadata = match db_type {
        crate::models::DatabaseType::InfluxDB => {
            // 获取所有测量值
            let measurements_query = format!("SHOW MEASUREMENTS ON \"{}\"", database);
            let measurements_result = client.execute_query(&measurements_query, Some(&database)).await
                .map_err(|e| format!("获取测量值失败: {}", e))?;

            let mut measurements = Vec::new();
            for row in measurements_result.rows() {
                if let Some(name) = row.get(0).and_then(|v| v.as_str()) {
                    // 获取每个测量值的字段和标签
                    let field_query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, name);
                    let tag_query = format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, name);

                    let fields_result = client.execute_query(&field_query, Some(&database)).await.ok();
                    let tags_result = client.execute_query(&tag_query, Some(&database)).await.ok();

                    let mut fields = Vec::new();
                    if let Some(result) = fields_result {
                        for row in result.rows() {
                            if let Some(field_name) = row.get(0).and_then(|v| v.as_str()) {
                                let field_type = row.get(1).and_then(|v| v.as_str()).unwrap_or("unknown");
                                fields.push(serde_json::json!({
                                    "name": field_name,
                                    "type": field_type
                                }));
                            }
                        }
                    }

                    let mut tags = Vec::new();
                    if let Some(result) = tags_result {
                        for row in result.rows() {
                            if let Some(tag_name) = row.get(0).and_then(|v| v.as_str()) {
                                tags.push(tag_name.to_string());
                            }
                        }
                    }

                    measurements.push(serde_json::json!({
                        "name": name,
                        "fields": fields,
                        "tags": tags
                    }));
                }
            }

            // 获取保留策略
            let rp_query = format!("SHOW RETENTION POLICIES ON \"{}\"", database);
            let rp_result = client.execute_query(&rp_query, Some(&database)).await.ok();

            let mut retention_policies = Vec::new();
            if let Some(result) = rp_result {
                for row in result.rows() {
                    if let Some(name) = row.get(0).and_then(|v| v.as_str()) {
                        retention_policies.push(serde_json::json!({
                            "name": name,
                            "duration": row.get(1).and_then(|v| v.as_str()).unwrap_or(""),
                            "shardGroupDuration": row.get(2).and_then(|v| v.as_str()).unwrap_or(""),
                            "replicaN": row.get(3).and_then(|v| v.as_i64()).unwrap_or(0),
                            "default": row.get(4).and_then(|v| v.as_bool()).unwrap_or(false)
                        }));
                    }
                }
            }

            serde_json::json!({
                "database": database,
                "type": format!("{:?}", db_type),
                "measurements": measurements,
                "retentionPolicies": retention_policies,
                "exportedAt": chrono::Utc::now().to_rfc3339()
            })
        },
        crate::models::DatabaseType::IoTDB => {
            // IoTDB: 导出存储组和时间序列信息
            let timeseries_query = format!("SHOW TIMESERIES {}", database);
            let timeseries_result = client.execute_query(&timeseries_query, None).await
                .map_err(|e| format!("获取时间序列失败: {}", e))?;

            let mut timeseries = Vec::new();
            for row in timeseries_result.rows() {
                if let Some(name) = row.get(0).and_then(|v| v.as_str()) {
                    timeseries.push(serde_json::json!({
                        "name": name,
                        "alias": row.get(1).and_then(|v| v.as_str()).unwrap_or(""),
                        "database": row.get(2).and_then(|v| v.as_str()).unwrap_or(""),
                        "dataType": row.get(3).and_then(|v| v.as_str()).unwrap_or(""),
                        "encoding": row.get(4).and_then(|v| v.as_str()).unwrap_or("")
                    }));
                }
            }

            serde_json::json!({
                "storageGroup": database,
                "type": "IoTDB",
                "timeseries": timeseries,
                "exportedAt": chrono::Utc::now().to_rfc3339()
            })
        },
        crate::models::DatabaseType::Prometheus => {
            // Prometheus: 暂不支持元数据导出
            serde_json::json!({
                "database": database,
                "type": "Prometheus",
                "message": "Prometheus metadata export not yet implemented",
                "exportedAt": chrono::Utc::now().to_rfc3339()
            })
        },
        crate::models::DatabaseType::Elasticsearch => {
            // Elasticsearch: 暂不支持元数据导出
            serde_json::json!({
                "database": database,
                "type": "Elasticsearch",
                "message": "Elasticsearch metadata export not yet implemented",
                "exportedAt": chrono::Utc::now().to_rfc3339()
            })
        },
        crate::models::DatabaseType::ObjectStorage => {
            // ObjectStorage: 暂不支持元数据导出
            serde_json::json!({
                "bucket": database,
                "type": "ObjectStorage",
                "message": "Object storage metadata export not yet implemented",
                "exportedAt": chrono::Utc::now().to_rfc3339()
            })
        }
    };

    Ok(metadata)
}

/// 获取表统计信息
#[tauri::command(rename_all = "camelCase")]
pub async fn get_table_statistics(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    table: String,
) -> Result<serde_json::Value, String> {
    debug!("处理获取表统计信息命令: {} - {} - {}", connection_id, database, table);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    let db_type = client.get_database_type();

    let statistics = match db_type {
        crate::models::DatabaseType::InfluxDB => {
            // 获取记录数
            let count_query = format!("SELECT COUNT(*) FROM \"{}\"", table);
            let count_result = client.execute_query(&count_query, Some(&database)).await.ok();

            let total_count = if let Some(result) = count_result {
                result.rows().first()
                    .and_then(|row| row.get(1))
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0)
            } else {
                0
            };

            // 获取时间范围
            let time_range_query = format!(
                "SELECT FIRST(*), LAST(*) FROM \"{}\"",
                table
            );
            let time_result = client.execute_query(&time_range_query, Some(&database)).await.ok();

            let (first_time, last_time) = if let Some(result) = time_result {
                let rows = result.rows();
                let row = rows.first();
                let first = row.and_then(|r| r.get(0)).and_then(|v| v.as_str()).map(|s| s.to_string());
                let last = row.and_then(|r| r.get(1)).and_then(|v| v.as_str()).map(|s| s.to_string());
                (first, last)
            } else {
                (None, None)
            };

            // 获取字段数量
            let field_query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, table);
            let field_result = client.execute_query(&field_query, Some(&database)).await.ok();
            let field_count = field_result.map(|r| r.rows().len()).unwrap_or(0);

            // 获取标签数量
            let tag_query = format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, table);
            let tag_result = client.execute_query(&tag_query, Some(&database)).await.ok();
            let tag_count = tag_result.map(|r| r.rows().len()).unwrap_or(0);

            serde_json::json!({
                "measurement": table,
                "database": database,
                "totalRecords": total_count,
                "fieldCount": field_count,
                "tagCount": tag_count,
                "firstTimestamp": first_time,
                "lastTimestamp": last_time,
                "type": "InfluxDB"
            })
        },
        crate::models::DatabaseType::IoTDB => {
            // IoTDB: 获取时间序列统计
            let count_query = format!("SELECT COUNT(*) FROM {}", table);
            let count_result = client.execute_query(&count_query, None).await.ok();

            let total_count = if let Some(result) = count_result {
                result.rows().first()
                    .and_then(|row| row.get(1))
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0)
            } else {
                0
            };

            serde_json::json!({
                "timeseries": table,
                "totalRecords": total_count,
                "type": "IoTDB"
            })
        },
        crate::models::DatabaseType::Prometheus => {
            serde_json::json!({
                "table": table,
                "type": "Prometheus",
                "message": "Statistics not yet implemented"
            })
        },
        crate::models::DatabaseType::Elasticsearch => {
            serde_json::json!({
                "table": table,
                "type": "Elasticsearch",
                "message": "Statistics not yet implemented"
            })
        },
        crate::models::DatabaseType::ObjectStorage => {
            serde_json::json!({
                "object": table,
                "type": "ObjectStorage",
                "message": "Statistics not yet implemented"
            })
        }
    };

    Ok(statistics)
}

/// 预览表数据
#[tauri::command(rename_all = "camelCase")]
pub async fn preview_table_data(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    table: String,
    limit: Option<i64>,
) -> Result<QueryResult, String> {
    debug!("处理预览表数据命令: {} - {} - {}", connection_id, database, table);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    let limit_value = limit.unwrap_or(100);
    let db_type = client.get_database_type();

    let query = match db_type {
        crate::models::DatabaseType::InfluxDB => {
            format!("SELECT * FROM \"{}\" LIMIT {}", table, limit_value)
        },
        crate::models::DatabaseType::IoTDB => {
            format!("SELECT * FROM {} LIMIT {}", table, limit_value)
        },
        _ => {
            format!("SELECT * FROM \"{}\" LIMIT {}", table, limit_value)
        }
    };

    client.execute_query(&query, Some(&database)).await
        .map_err(|e| {
            error!("预览表数据失败: {}", e);
            format!("预览表数据失败: {}", e)
        })
}

/// 获取标签基数统计
#[tauri::command(rename_all = "camelCase")]
pub async fn get_tag_cardinality(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    table: String,
    tag: String,
) -> Result<serde_json::Value, String> {
    debug!("处理获取标签基数命令: {} - {} - {} - {}", connection_id, database, table, tag);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 获取标签值数量
    let values_query = format!("SHOW TAG VALUES ON \"{}\" FROM \"{}\" WITH KEY = \"{}\"", database, table, tag);
    let values_result = client.execute_query(&values_query, Some(&database)).await
        .map_err(|e| format!("获取标签值失败: {}", e))?;

    let cardinality = values_result.rows().len();

    Ok(serde_json::json!({
        "tag": tag,
        "table": table,
        "database": database,
        "cardinality": cardinality
    }))
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
    let result = client.execute_query(&query, Some(&database)).await
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

    // 检查是否是管理节点，如果是则执行相应的管理查询
    if is_management_node(&database) {
        debug!("处理管理节点查询: {}", database);
        return handle_management_query(&connection_id, &database, connection_service).await;
    }

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

    client.execute_query(&query, None).await
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

    client.execute_query(&query, None).await
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

    // 检查是否是管理节点，如果是则执行相应的管理查询
    if is_management_node(&database) {
        debug!("处理管理节点查询: {}", database);
        return handle_management_query(&connection_id, &database, connection_service).await;
    }

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

    // 检查是否是管理节点，如果是则返回空结果（管理节点不应该有字段查询）
    if is_management_node(&database) {
        debug!("管理节点不支持字段查询: {}", database);
        return Ok(vec![]);
    }

    // 检查是否是系统节点（包含空格的节点名称）
    if database.contains(' ') {
        debug!("系统节点不支持字段查询: {}", database);
        return Ok(vec![]);
    }

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 根据连接类型构建不同的查询语句
    let query = {
        // 检查连接类型，如果是IoTDB则使用SHOW TIMESERIES语法
        let db_type = client.get_database_type();
        debug!("🔍 commands/database.rs字段查询 - 数据库类型: {:?}, database: {}, measurement: {:?}", db_type, database, measurement);
        if matches!(db_type, crate::models::DatabaseType::IoTDB) {
            // IoTDB使用SHOW TIMESERIES语法，不使用引号
            if let Some(measurement) = measurement {
                // 智能处理路径重复问题
                let full_path = if measurement.starts_with(&database) {
                    // measurement已经包含database前缀，直接使用
                    measurement.clone()
                } else {
                    // measurement不包含database前缀，需要拼接
                    format!("{}.{}", database, measurement)
                };
                let query = format!("SHOW TIMESERIES {}.*", full_path);
                debug!("🔍 commands/database.rs生成IoTDB字段查询: {}", query);
                query
            } else {
                let query = format!("SHOW TIMESERIES {}.**", database);
                debug!("🔍 commands/database.rs生成IoTDB字段查询: {}", query);
                query
            }
        } else {
            // InfluxDB使用SHOW FIELD KEYS语法
            if let Some(measurement) = measurement {
                let query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, measurement);
                debug!("🔍 commands/database.rs生成InfluxDB字段查询: {}", query);
                query
            } else {
                let query = format!("SHOW FIELD KEYS ON \"{}\"", database);
                debug!("🔍 commands/database.rs生成InfluxDB字段查询: {}", query);
                query
            }
        }
    };

    let result = client.execute_query(&query, Some(&database)).await
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

    // 根据连接类型处理标签查询
    let db_type = client.get_database_type();
    debug!("🔍 commands/database.rs标签查询 - 数据库类型: {:?}, database: {}, measurement: {:?}", db_type, database, measurement);

    if matches!(db_type, crate::models::DatabaseType::IoTDB) {
        // IoTDB不支持TAG概念，直接返回空结果
        debug!("🔍 commands/database.rs IoTDB不支持标签，返回空结果");
        return Ok(vec![]);
    }

    // InfluxDB使用SHOW TAG KEYS语法
    let query = if let Some(measurement) = measurement {
        format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, measurement)
    } else {
        format!("SHOW TAG KEYS ON \"{}\"", database)
    };

    debug!("🔍 commands/database.rs生成InfluxDB标签查询: {}", query);

    let result = client.execute_query(&query, Some(&database)).await
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
    
    // 根据连接类型构建不同的查询语句
    let query = {
        let db_type = client.get_database_type();
        if matches!(db_type, crate::models::DatabaseType::IoTDB) {
            // IoTDB不支持TAG VALUES概念，返回设备信息
            if let Some(measurement) = measurement {
                format!("SHOW DEVICES {}.{}", database, measurement)
            } else {
                format!("SHOW DEVICES {}.**", database)
            }
        } else {
            // InfluxDB使用SHOW TAG VALUES语法
            if let Some(measurement) = measurement {
                format!("SHOW TAG VALUES ON \"{}\" FROM \"{}\" WITH KEY = \"{}\"", database, measurement, tag_key)
            } else {
                format!("SHOW TAG VALUES ON \"{}\" WITH KEY = \"{}\"", database, tag_key)
            }
        }
    };
    
    let result = client.execute_query(&query, Some(&database)).await
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

/// 获取数据源树节点
#[tauri::command(rename_all = "camelCase")]
pub async fn get_tree_nodes(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<Vec<crate::models::TreeNode>, String> {
    info!("🌳 处理获取数据源树节点命令: {}", connection_id);

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    info!("✅ 成功获取连接客户端: {}", connection_id);

    // 根据数据库类型生成树节点
    let tree_nodes = client.get_tree_nodes().await
        .map_err(|e| {
            error!("获取数据源树失败: {}", e);
            format!("获取数据源树失败: {}", e)
        })?;

    info!("🎉 成功生成 {} 个树节点: {:?}", tree_nodes.len(),
          tree_nodes.iter().map(|n| format!("{} ({:?})", n.name, n.node_type)).collect::<Vec<_>>());

    Ok(tree_nodes)
}

/// 获取树节点的子节点（懒加载）
#[tauri::command(rename_all = "camelCase")]
pub async fn get_tree_children(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    parent_node_id: String,
    node_type: String,
    metadata: Option<serde_json::Value>,
) -> Result<Vec<crate::models::TreeNode>, String> {
    debug!("处理获取树节点子节点命令: {} - {}", connection_id, parent_node_id);

    // 🔧 确保连接已建立（如果不存在则自动建立）
    if let Err(e) = connection_service.connect_to_database(&connection_id).await {
        error!("自动建立连接失败: {}", e);
        return Err(format!("建立连接失败: {}", e));
    }

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 根据节点类型获取子节点
    let children = client.get_tree_children(&parent_node_id, &node_type, metadata.as_ref()).await
        .map_err(|e| {
            error!("获取树节点子节点失败: {}", e);
            format!("获取树节点子节点失败: {}", e)
        })?;

    Ok(children)
}






