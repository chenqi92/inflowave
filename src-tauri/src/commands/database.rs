use crate::models::{DatabaseInfo, RetentionPolicy, DatabaseCreateConfig, RetentionPolicyConfig};
use crate::services::ConnectionService;
use tauri::State;
use log::{debug, error};

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
