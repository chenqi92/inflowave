use crate::models::{QueryRequest, QueryResult, QueryResultItem, QueryValidationResult};
use crate::services::ConnectionService;
use crate::utils::validation::ValidationUtils;
use crate::database::InfluxClient;
use crate::commands::settings::SettingsStorage;
use tauri::State;
use log::{debug, error, info};
use std::sync::Arc;

/// 执行查询
#[tauri::command(rename_all = "camelCase")]
pub async fn execute_query(
    connection_service: State<'_, ConnectionService>,
    settings_storage: State<'_, SettingsStorage>,
    request: QueryRequest,
) -> Result<QueryResult, String> {
    debug!("处理执行查询命令: {}", request.connection_id);

    // 获取控制器设置
    let controller_settings = {
        let settings = settings_storage.lock().map_err(|e| {
            error!("获取设置锁失败: {}", e);
            format!("获取设置锁失败: {}", e)
        })?;
        settings.security.controller.clone()
    };

    // 验证查询语句（带控制器设置）
    ValidationUtils::validate_query_with_settings(&request.query, Some(&controller_settings))
        .map_err(|e| {
            error!("查询验证失败: {}", e);
            format!("查询验证失败: {}", e)
        })?;

    let manager = connection_service.get_manager();
    let client = manager.get_connection(&request.connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 根据SQL语句类型选择执行方式
    let statement_type = ValidationUtils::get_statement_type(&request.query);
    debug!("检测到SQL语句类型: {}", statement_type);

    match statement_type.as_str() {
        "INSERT" => {
            // 处理INSERT语句
            execute_insert_statement(client, &request).await
        }
        "DELETE" => {
            // 处理DELETE语句
            execute_delete_statement(client, &request).await
        }
        "UPDATE" => {
            // InfluxDB不支持UPDATE语句
            Err("InfluxDB不支持UPDATE语句，请使用INSERT语句覆盖数据".to_string())
        }
        "SELECT" | "SHOW" | "EXPLAIN" | "CREATE" | "DROP" | "ALTER" | "GRANT" | "REVOKE" => {
            // 处理查询和DDL语句
            let database_ref = request.database.as_deref();
            client.execute_query_with_database(&request.query, database_ref).await
                .map_err(|e| {
                    error!("查询执行失败: {}", e);
                    format!("查询执行失败: {}", e)
                })
        }
        _ => {
            // 未知语句类型，尝试作为查询执行
            debug!("未知语句类型，尝试作为查询执行");
            let database_ref = request.database.as_deref();
            client.execute_query_with_database(&request.query, database_ref).await
                .map_err(|e| {
                    error!("查询执行失败: {}", e);
                    format!("查询执行失败: {}", e)
                })
        }
    }
}

/// 验证查询
#[tauri::command]
pub async fn validate_query(
    query: String,
) -> Result<QueryValidationResult, String> {
    debug!("处理验证查询命令");
    
    let mut result = QueryValidationResult {
        valid: true,
        errors: vec![],
        warnings: vec![],
        suggestions: vec![],
    };
    
    // 基本验证
    match ValidationUtils::validate_query(&query) {
        Ok(_) => {
            debug!("查询验证通过");
        }
        Err(e) => {
            result.valid = false;
            result.errors.push(crate::models::QueryError {
                line: 1,
                column: 1,
                message: e.to_string(),
                error_type: crate::models::QueryErrorType::SyntaxError,
            });
        }
    }
    
    // TODO: 添加更详细的语法分析和建议
    
    Ok(result)
}



/// 获取查询建议
#[tauri::command(rename_all = "camelCase")]
pub async fn get_query_suggestions(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: Option<String>,
    partial_query: String,
) -> Result<Vec<String>, String> {
    debug!("处理获取查询建议命令: {}", connection_id);
    
    let mut suggestions = Vec::new();
    
    // 基本的 InfluxQL 关键字建议
    let keywords = [
        "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "LIMIT",
        "SHOW DATABASES", "SHOW MEASUREMENTS", "SHOW FIELD KEYS", "SHOW TAG KEYS",
        "CREATE DATABASE", "DROP DATABASE", "CREATE RETENTION POLICY",
        "SHOW RETENTION POLICIES", "SHOW SERIES", "SHOW STATS",
    ];
    
    let partial_upper = partial_query.to_uppercase();
    
    for keyword in &keywords {
        if keyword.starts_with(&partial_upper) {
            suggestions.push(keyword.to_string());
        }
    }
    
    // 如果有连接，尝试获取数据库、测量等信息作为建议
    if let Ok(manager) = connection_service.get_manager().get_connection(&connection_id).await {
        // 获取数据库列表
        if let Ok(databases) = manager.get_databases().await {
            for db in databases {
                if db.to_uppercase().starts_with(&partial_upper) {
                    suggestions.push(db);
                }
            }
        }
        
        // 如果指定了数据库，获取测量列表
        if let Some(db) = database {
            if let Ok(measurements) = manager.get_measurements(&db).await {
                for measurement in measurements {
                    if measurement.to_uppercase().starts_with(&partial_upper) {
                        suggestions.push(measurement);
                    }
                }
            }
        }
    }
    
    // 限制建议数量
    suggestions.truncate(20);
    
    Ok(suggestions)
}

/// 格式化查询
#[tauri::command]
pub async fn format_query(
    query: String,
) -> Result<String, String> {
    debug!("处理格式化查询命令");
    
    // 简单的查询格式化
    let formatted = query
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    
    Ok(formatted)
}

/// 批量执行查询
#[tauri::command]
pub async fn execute_batch_queries(
    connection_service: State<'_, ConnectionService>,
    settings_storage: State<'_, SettingsStorage>,
    request: serde_json::Value,
) -> Result<Vec<QueryResult>, String> {
    debug!("处理批量执行查询命令");

    // 获取控制器设置
    let controller_settings = {
        let settings = settings_storage.lock().map_err(|e| {
            error!("获取设置锁失败: {}", e);
            format!("获取设置锁失败: {}", e)
        })?;
        settings.security.controller.clone()
    };
    
    // 解析请求参数
    let connection_id = request["connection_id"]
        .as_str()
        .ok_or("缺少 connection_id 参数")?;
    let database = request["database"]
        .as_str()
        .ok_or("缺少 database 参数")?;
    let queries = request["queries"]
        .as_array()
        .ok_or("缺少 queries 参数")?;
    
    debug!("批量查询参数: connection_id={}, database={}, queries_count={}", 
           connection_id, database, queries.len());
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;
    
    // 使用数据库指定方式，不需要 USE 语句
    let database_opt = if database.is_empty() { None } else { Some(database) };
    
    let mut results = Vec::new();
    
    for (index, query_value) in queries.iter().enumerate() {
        if let Some(query_str) = query_value.as_str() {
            debug!("执行第 {} 条查询: {}", index + 1, query_str);

            // 验证查询语句（带控制器设置）
            if let Err(e) = ValidationUtils::validate_query_with_settings(query_str, Some(&controller_settings)) {
                error!("第 {} 条查询验证失败: {}", index + 1, e);
                return Err(format!("第 {} 条查询验证失败: {}", index + 1, e));
            }

            // 根据SQL语句类型选择执行方式
            let statement_type = ValidationUtils::get_statement_type(query_str);
            debug!("第 {} 条查询类型: {}", index + 1, statement_type);

            let result = match statement_type.as_str() {
                "INSERT" => {
                    // 处理INSERT语句
                    let request = QueryRequest {
                        connection_id: connection_id.to_string(),
                        query: query_str.to_string(),
                        database: Some(database.to_string()),
                        timeout: None,
                    };
                    execute_insert_statement(client.clone(), &request).await
                        .map_err(|e| format!("第 {} 条INSERT语句执行失败: {}", index + 1, e))?
                }
                "DELETE" => {
                    // 处理DELETE语句
                    let request = QueryRequest {
                        connection_id: connection_id.to_string(),
                        query: query_str.to_string(),
                        database: Some(database.to_string()),
                        timeout: None,
                    };
                    execute_delete_statement(client.clone(), &request).await
                        .map_err(|e| format!("第 {} 条DELETE语句执行失败: {}", index + 1, e))?
                }
                "UPDATE" => {
                    return Err(format!("第 {} 条语句: InfluxDB不支持UPDATE语句", index + 1));
                }
                _ => {
                    // 处理其他类型的语句（SELECT、SHOW、CREATE、DROP等）
                    client.execute_query_with_database(query_str, database_opt).await
                        .map_err(|e| format!("第 {} 条查询执行失败: {}", index + 1, e))?
                }
            };

            debug!("第 {} 条查询执行成功", index + 1);
            results.push(result);
        } else {
            return Err(format!("第 {} 条查询格式无效", index + 1));
        }
    }
    
    debug!("批量查询执行完成，共执行 {} 条查询", results.len());
    Ok(results)
}

/// 解释查询执行计划
#[tauri::command]
pub async fn explain_query(
    _connection_service: State<'_, ConnectionService>,
    connection_id: String,
    query: String,
) -> Result<String, String> {
    debug!("处理解释查询命令: {}", connection_id);
    
    // InfluxDB 1.x 不支持 EXPLAIN，这里返回基本信息
    let explanation = format!(
        "查询分析:\n\
        - 查询长度: {} 字符\n\
        - 查询类型: {}\n\
        - 建议: 使用适当的时间范围和 LIMIT 子句来优化性能",
        query.len(),
        if query.to_uppercase().starts_with("SELECT") {
            "数据查询"
        } else if query.to_uppercase().starts_with("SHOW") {
            "元数据查询"
        } else {
            "其他操作"
        }
    );
    
    Ok(explanation)
}

/// 执行INSERT语句
async fn execute_insert_statement(
    client: Arc<InfluxClient>,
    request: &QueryRequest,
) -> Result<QueryResult, String> {
    debug!("处理INSERT语句: {}", request.query);

    // 解析INSERT语句为Line Protocol格式
    let line_protocol = ValidationUtils::parse_insert_to_line_protocol(&request.query)
        .map_err(|e| {
            error!("INSERT语句解析失败: {}", e);
            format!("INSERT语句解析失败: {}", e)
        })?;

    // 确保有数据库名称
    let database = request.database.as_ref()
        .ok_or_else(|| {
            error!("INSERT操作需要指定数据库");
            "INSERT操作需要指定数据库".to_string()
        })?;

    let start_time = std::time::Instant::now();

    // 使用写入API执行INSERT
    match client.write_line_protocol(database, &line_protocol).await {
        Ok(points_written) => {
            let execution_time = start_time.elapsed().as_millis() as u64;

            info!("INSERT执行成功，写入 {} 个数据点，耗时: {}ms", points_written, execution_time);

            // 构造写入操作的查询结果
            let mut result = QueryResult::empty();
            result.execution_time = Some(execution_time);
            result.row_count = Some(points_written);

            // 添加成功信息到结果中
            result.results = vec![QueryResultItem {
                series: None,
                error: None,
            }];

            Ok(result)
        }
        Err(e) => {
            error!("INSERT执行失败: {}", e);
            Err(format!("INSERT执行失败: {}", e))
        }
    }
}

/// 执行DELETE语句
async fn execute_delete_statement(
    client: Arc<InfluxClient>,
    request: &QueryRequest,
) -> Result<QueryResult, String> {
    debug!("处理DELETE语句: {}", request.query);

    // 确保有数据库名称
    let database = request.database.as_ref()
        .ok_or_else(|| {
            error!("DELETE操作需要指定数据库");
            "DELETE操作需要指定数据库".to_string()
        })?;

    let start_time = std::time::Instant::now();

    // DELETE语句在InfluxDB中是通过查询API执行的
    match client.execute_query_with_database(&request.query, Some(database)).await {
        Ok(mut result) => {
            let execution_time = start_time.elapsed().as_millis() as u64;
            result.execution_time = Some(execution_time);

            info!("DELETE执行成功，耗时: {}ms", execution_time);
            Ok(result)
        }
        Err(e) => {
            error!("DELETE执行失败: {}", e);
            Err(format!("DELETE执行失败: {}", e))
        }
    }
}
