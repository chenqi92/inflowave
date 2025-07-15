use crate::models::{QueryRequest, QueryResult, QueryValidationResult};
use crate::services::ConnectionService;
use crate::utils::validation::ValidationUtils;
use tauri::State;
use log::{debug, error};

/// 执行查询
#[tauri::command]
pub async fn execute_query(
    connection_service: State<'_, ConnectionService>,
    request: QueryRequest,
) -> Result<QueryResult, String> {
    debug!("处理执行查询命令: {}", request.connection_id);
    
    // 验证查询语句
    ValidationUtils::validate_query(&request.query)
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
    
    // 如果指定了数据库，先执行 USE 语句
    if let Some(database) = &request.database {
        if !database.is_empty() {
            let use_query = format!("USE \"{}\"", database);
            debug!("设置数据库上下文: {}", use_query);
            client.execute_query(&use_query).await
                .map_err(|e| {
                    error!("设置数据库上下文失败: {}", e);
                    format!("设置数据库上下文失败: {}", e)
                })?;
        }
    }
    
    // 执行实际查询
    client.execute_query(&request.query).await
        .map_err(|e| {
            error!("查询执行失败: {}", e);
            format!("查询执行失败: {}", e)
        })
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
#[tauri::command]
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
    request: serde_json::Value,
) -> Result<Vec<QueryResult>, String> {
    debug!("处理批量执行查询命令");
    
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
    
    // 如果指定了数据库，先执行 USE 语句
    if !database.is_empty() {
        let use_query = format!("USE \"{}\"", database);
        debug!("设置数据库上下文: {}", use_query);
        client.execute_query(&use_query).await
            .map_err(|e| {
                error!("设置数据库上下文失败: {}", e);
                format!("设置数据库上下文失败: {}", e)
            })?;
    }
    
    let mut results = Vec::new();
    
    for (index, query_value) in queries.iter().enumerate() {
        if let Some(query_str) = query_value.as_str() {
            debug!("执行第 {} 条查询: {}", index + 1, query_str);
            
            // 验证查询语句
            if let Err(e) = ValidationUtils::validate_query(query_str) {
                error!("第 {} 条查询验证失败: {}", index + 1, e);
                return Err(format!("第 {} 条查询验证失败: {}", index + 1, e));
            }
            
            match client.execute_query(query_str).await {
                Ok(result) => {
                    debug!("第 {} 条查询执行成功", index + 1);
                    results.push(result);
                }
                Err(e) => {
                    error!("第 {} 条查询执行失败: {}", index + 1, e);
                    return Err(format!("第 {} 条查询执行失败: {}", index + 1, e));
                }
            }
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
