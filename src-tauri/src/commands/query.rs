use crate::models::{QueryRequest, QueryResult, QueryResultItem, QueryValidationResult, QueryHistoryItem};
use crate::services::{ConnectionService, PerformanceStatsService};
use crate::utils::validation::ValidationUtils;
use crate::database::client::DatabaseClient;
use crate::commands::settings::SettingsStorage;
use crate::commands::query_history::QueryHistoryStorage;
use tauri::State;
use log::{debug, error, info, warn};
use std::sync::Arc;
use uuid::Uuid;

/// 执行查询
#[tauri::command(rename_all = "camelCase")]
pub async fn execute_query(
    connection_service: State<'_, ConnectionService>,
    settings_storage: State<'_, SettingsStorage>,
    performance_stats: State<'_, Arc<PerformanceStatsService>>,
    query_history_storage: State<'_, QueryHistoryStorage>,
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

    // 记录查询开始
    let database_name = request.database.clone().unwrap_or_else(|| "default".to_string());
    performance_stats.record_query_start(&request.connection_id, &database_name).await;

    let start_time = std::time::Instant::now();

    // 根据SQL语句类型选择执行方式
    let statement_type = ValidationUtils::get_statement_type(&request.query);
    debug!("检测到SQL语句类型: {}", statement_type);

    let result = match statement_type.as_str() {
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
        "SELECT" | "SELECT_AGGREGATE" | "SELECT_GROUP" | "SHOW" | "DESCRIBE" | "DESC" | "EXPLAIN" | "CREATE" | "DROP" | "ALTER" | "GRANT" | "REVOKE" => {
            // 处理查询和DDL语句
            let database_ref = request.database.as_deref();
            let mut result = client.execute_query_with_database(&request.query, database_ref).await
                .map_err(|e| {
                    error!("查询执行失败: {}", e);
                    format!("查询执行失败: {}", e)
                })?;

            // 设置SQL类型（前端需要这个字段来正确显示结果）
            result.sql_type = Some(statement_type.clone());

            Ok(result)
        }
        _ => {
            // 未知语句类型，尝试作为查询执行
            debug!("未知语句类型，尝试作为查询执行");
            let database_ref = request.database.as_deref();
            let mut result = client.execute_query_with_database(&request.query, database_ref).await
                .map_err(|e| {
                    error!("查询执行失败: {}", e);
                    format!("查询执行失败: {}", e)
                })?;

            // 设置SQL类型
            result.sql_type = Some(statement_type.clone());

            Ok(result)
        }
    };

    // 记录查询完成
    let execution_time_ms = start_time.elapsed().as_millis() as f64;
    let success = result.is_ok();
    performance_stats.record_query_complete(
        &request.connection_id,
        &database_name,
        execution_time_ms,
        success,
    ).await;

    // 记录查询历史
    let row_count = result.as_ref().ok().and_then(|r| r.row_count).unwrap_or(0);
    let error_msg = result.as_ref().err().map(|e| e.to_string());

    let history_item = QueryHistoryItem {
        id: Uuid::new_v4().to_string(),
        query: request.query.clone(),
        database: database_name.clone(),
        connection_id: request.connection_id.clone(),
        executed_at: chrono::Utc::now(),
        duration: execution_time_ms as u64,
        row_count: row_count as u64,
        success,
        error: error_msg.clone(),
    };

    // 添加到历史存储
    if let Ok(mut storage) = query_history_storage.lock() {
        // 限制历史记录数量，保留最新的 1000 条
        if storage.len() >= 1000 {
            storage.remove(0);
        }
        storage.push(history_item);
        debug!("查询历史记录已添加");
    } else {
        warn!("无法获取查询历史存储锁，跳过历史记录");
    }

    result
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
    
    // 添加更详细的语法分析和建议
    add_detailed_query_analysis(&query, &mut result);
    
    Ok(result)
}

/// 添加详细的查询分析和建议
fn add_detailed_query_analysis(query: &str, result: &mut QueryValidationResult) {
    let query_lower = query.to_lowercase();

    // 1. 检查查询性能相关问题
    check_performance_issues(&query_lower, result);

    // 2. 检查语法最佳实践
    check_syntax_best_practices(&query_lower, result);

    // 3. 检查安全性问题
    check_security_issues(&query_lower, result);

    // 4. 提供优化建议
    provide_optimization_suggestions(&query_lower, result);
}

/// 检查性能相关问题
fn check_performance_issues(query: &str, result: &mut QueryValidationResult) {
    // 检查是否使用了SELECT *
    if query.contains("select *") {
        result.warnings.push(crate::models::query::QueryWarning {
            line: 1,
            column: 1,
            message: "建议避免使用 SELECT *，明确指定需要的字段可以提高查询性能".to_string(),
            warning_type: crate::models::query::QueryWarningType::Performance,
        });
    }

    // 检查是否缺少时间范围限制
    if !query.contains("where") || (!query.contains("time >") && !query.contains("time <")) {
        result.warnings.push(crate::models::query::QueryWarning {
            line: 1,
            column: 1,
            message: "建议添加时间范围限制以提高查询性能和减少资源消耗".to_string(),
            warning_type: crate::models::query::QueryWarningType::Performance,
        });
    }

    // 检查是否使用了LIMIT
    if !query.contains("limit") {
        result.suggestions.push(crate::models::query::QuerySuggestion {
            line: 1,
            column: 1,
            message: "考虑添加 LIMIT 子句来限制返回的结果数量".to_string(),
            suggestion_type: crate::models::query::QuerySuggestionType::Optimization,
        });
    }
}

/// 检查语法最佳实践
fn check_syntax_best_practices(query: &str, result: &mut QueryValidationResult) {
    // 检查字段名是否使用了引号
    if query.contains("\"") {
        result.suggestions.push(crate::models::query::QuerySuggestion {
            line: 1,
            column: 1,
            message: "字段名包含特殊字符时使用双引号是正确的做法".to_string(),
            suggestion_type: crate::models::query::QuerySuggestionType::Alternative,
        });
    }

    // 检查是否使用了GROUP BY但没有聚合函数
    if query.contains("group by") && !query.contains("mean(") && !query.contains("sum(")
        && !query.contains("count(") && !query.contains("max(") && !query.contains("min(") {
        result.warnings.push(crate::models::query::QueryWarning {
            line: 1,
            column: 1,
            message: "使用 GROUP BY 时通常需要配合聚合函数使用".to_string(),
            warning_type: crate::models::query::QueryWarningType::BestPractice,
        });
    }

    // 检查时间格式
    if query.contains("time >") || query.contains("time <") {
        if !query.contains("now()") && !query.contains("'") {
            result.suggestions.push(crate::models::query::QuerySuggestion {
                line: 1,
                column: 1,
                message: "时间值建议使用 now() 相对时间或 '2023-01-01T00:00:00Z' 格式的绝对时间".to_string(),
                suggestion_type: crate::models::query::QuerySuggestionType::Alternative,
            });
        }
    }
}

/// 检查安全性问题
fn check_security_issues(query: &str, result: &mut QueryValidationResult) {
    // 检查是否包含潜在的注入风险
    let dangerous_patterns = vec!["drop", "delete", "truncate", "alter"];

    for pattern in dangerous_patterns {
        if query.contains(pattern) {
            result.warnings.push(crate::models::query::QueryWarning {
                line: 1,
                column: 1,
                message: format!("检测到潜在的危险操作: {}，请确认操作的安全性", pattern.to_uppercase()),
                warning_type: crate::models::query::QueryWarningType::BestPractice,
            });
        }
    }
}

/// 提供优化建议
fn provide_optimization_suggestions(query: &str, result: &mut QueryValidationResult) {
    // 建议使用索引字段进行过滤
    if query.contains("where") && !query.contains("time") {
        result.suggestions.push(crate::models::query::QuerySuggestion {
            line: 1,
            column: 1,
            message: "建议在 WHERE 子句中包含时间字段，这是 InfluxDB 的主要索引".to_string(),
            suggestion_type: crate::models::query::QuerySuggestionType::Optimization,
        });
    }

    // 建议使用适当的聚合函数
    if query.contains("select") && !query.contains("mean(") && !query.contains("sum(") {
        result.suggestions.push(crate::models::query::QuerySuggestion {
            line: 1,
            column: 1,
            message: "对于时序数据，考虑使用聚合函数如 mean(), sum(), count() 来减少返回的数据量".to_string(),
            suggestion_type: crate::models::query::QuerySuggestionType::Optimization,
        });
    }

    // 建议使用合适的时间间隔
    if query.contains("group by time(") {
        result.suggestions.push(crate::models::query::QuerySuggestion {
            line: 1,
            column: 1,
            message: "GROUP BY time() 的时间间隔应该根据数据密度和查询时间范围来选择".to_string(),
            suggestion_type: crate::models::query::QuerySuggestionType::Optimization,
        });
    }
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
    
    // 基本的SQL关键字建议（兼容InfluxDB和IoTDB）
    let keywords = [
        "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "LIMIT",
        "SHOW DATABASES", "SHOW MEASUREMENTS", "SHOW TIMESERIES", "SHOW DEVICES",
        "SHOW FIELD KEYS", "SHOW TAG KEYS", "SHOW STORAGE GROUP",
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
    let connection_id = request["connectionId"]
        .as_str()
        .or_else(|| request["connection_id"].as_str())
        .ok_or("缺少 connectionId 参数")?;
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
    client: Arc<DatabaseClient>,
    request: &QueryRequest,
) -> Result<QueryResult, String> {
    debug!("处理INSERT语句: {}", request.query);

    // 检查数据库类型
    let db_type = client.get_database_type();
    let start_time = std::time::Instant::now();

    match db_type {
        crate::models::DatabaseType::IoTDB => {
            // IoTDB 直接执行 SQL INSERT 语句
            debug!("IoTDB INSERT语句，直接执行SQL: {}", request.query);

            match client.execute_query(&request.query, request.database.as_deref()).await {
                Ok(mut result) => {
                    let execution_time = start_time.elapsed().as_millis() as u64;
                    result.execution_time = Some(execution_time);
                    info!("IoTDB INSERT语句执行成功，耗时: {}ms", execution_time);
                    Ok(result)
                }
                Err(e) => {
                    error!("IoTDB INSERT语句执行失败: {}", e);
                    Err(format!("IoTDB INSERT语句执行失败: {}", e))
                }
            }
        }
        _ => {
            // InfluxDB 需要转换为 Line Protocol 格式
            debug!("InfluxDB INSERT语句，转换为Line Protocol格式");

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

            // 使用写入API执行INSERT
            match client.write_line_protocol(database, &line_protocol).await {
                Ok(_) => {
                    let execution_time = start_time.elapsed().as_millis() as u64;

                    // 估算写入的数据点数量（从行协议解析）
                    let points_written = line_protocol.lines().count();
                    info!("InfluxDB INSERT执行成功，写入 {} 个数据点，耗时: {}ms", points_written, execution_time);

                    // 构造写入操作的查询结果
                    let mut result = QueryResult::empty();
                    result.execution_time = Some(execution_time);
                    result.row_count = Some(points_written);
                    result.sql_type = Some("INSERT".to_string()); // 设置SQL类型

                    // 添加成功信息到结果中
                    result.results = vec![QueryResultItem {
                        series: None,
                        error: None,
                    }];

                    Ok(result)
                }
                Err(e) => {
                    error!("InfluxDB INSERT执行失败: {}", e);
                    Err(format!("InfluxDB INSERT执行失败: {}", e))
                }
            }
        }
    }
}

/// 执行DELETE语句
async fn execute_delete_statement(
    client: Arc<DatabaseClient>,
    request: &QueryRequest,
) -> Result<QueryResult, String> {
    info!("🗑️ 开始执行DELETE语句");
    debug!("DELETE SQL: {}", request.query);
    debug!("数据库: {:?}", request.database);

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
            result.sql_type = Some("DELETE".to_string()); // 设置SQL类型

            // 记录详细的返回结果
            info!("✅ DELETE执行成功，耗时: {}ms", execution_time);
            debug!("DELETE返回结果: {:?}", result);

            // 检查是否有错误信息
            if !result.results.is_empty() {
                if let Some(error) = &result.results[0].error {
                    warn!("⚠️ DELETE返回了错误信息: {}", error);
                }
                if let Some(series) = &result.results[0].series {
                    info!("📊 DELETE返回了 {} 个series", series.len());
                }
            }

            // 为DELETE操作构造更友好的结果
            // InfluxDB的DELETE通常不返回数据，只返回成功状态
            if result.results.is_empty() || result.results[0].series.is_none() {
                // 构造一个成功的结果
                result.row_count = Some(0); // DELETE不返回具体删除的行数
                info!("ℹ️ DELETE操作已执行（InfluxDB不返回删除的行数）");
            }

            Ok(result)
        }
        Err(e) => {
            error!("❌ DELETE执行失败: {}", e);
            let error_msg = e.to_string();

            // 提供更友好的错误提示
            if error_msg.contains("unable to parse") || error_msg.contains("invalid") {
                Err(format!("DELETE语句语法错误: {}\n\n提示：InfluxDB DELETE 语法：\n1. DELETE FROM <measurement> WHERE <tag_key>='<tag_value>'\n2. DELETE FROM <measurement> WHERE time >= '<start_time>' AND time <= '<end_time>'\n3. DELETE FROM <measurement> WHERE <tag_key>='<tag_value>' AND time >= '<start_time>'\n\n⚠️ 注意：WHERE 条件只能使用 tags 和 time，不能使用 fields！", error_msg))
            } else {
                Err(format!("DELETE执行失败\n\n可能的原因：\n1. WHERE 条件使用了 field（只能使用 tag 和 time）\n2. 语法错误\n3. 数据库连接问题\n\n错误详情: {}", error_msg))
            }
        }
    }
}
