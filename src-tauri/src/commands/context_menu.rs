use serde::{Deserialize, Serialize};
use tauri::State;
use log::{debug, error, info};
use crate::services::ConnectionService;

#[derive(Debug, Serialize, Deserialize)]
pub struct SqlGenerationRequest {
    pub sql_type: String,
    pub database: Option<String>,
    pub measurement: Option<String>,
    pub fields: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub time_range: Option<TimeRange>,
    pub limit: Option<u32>,
    pub group_by: Option<Vec<String>>,
    pub order_by: Option<OrderBy>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimeRange {
    pub start: String,
    pub end: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderBy {
    pub field: String,
    pub direction: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SqlGenerationResult {
    pub sql: String,
    pub description: String,
}

/// 生成智能 SQL 查询
#[tauri::command]
pub async fn generate_smart_sql(
    request: SqlGenerationRequest,
) -> Result<SqlGenerationResult, String> {
    debug!("生成智能 SQL: {:?}", request.sql_type);
    
    let sql = match request.sql_type.as_str() {
        "select_all" => generate_select_all_sql(&request),
        "select_fields" => generate_select_fields_sql(&request),
        "count_records" => generate_count_sql(&request),
        "show_measurements" => generate_show_measurements_sql(&request),
        "show_tag_keys" => generate_show_tag_keys_sql(&request),
        "show_tag_values" => generate_show_tag_values_sql(&request),
        "show_field_keys" => generate_show_field_keys_sql(&request),
        "describe_measurement" => generate_describe_sql(&request),
        "time_series" => generate_time_series_sql(&request),
        "aggregation" => generate_aggregation_sql(&request),
        _ => return Err("不支持的 SQL 类型".to_string()),
    };

    let description = get_sql_description(&request.sql_type);

    Ok(SqlGenerationResult {
        sql,
        description,
    })
}

/// 获取数据库上下文菜单
#[tauri::command]
pub async fn get_database_context_menu(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
) -> Result<Vec<serde_json::Value>, String> {
    debug!("获取数据库上下文菜单: {}", database);
    
    let menu_items = vec![
        serde_json::json!({
            "id": "show_measurements",
            "label": "显示所有测量",
            "icon": "table",
            "action": {
                "type": "generate_sql",
                "sql_type": "show_measurements",
                "database": database
            }
        }),
        serde_json::json!({
            "id": "create_measurement",
            "label": "创建测量",
            "icon": "plus",
            "action": {
                "type": "open_dialog",
                "dialog": "create_measurement"
            }
        }),
        serde_json::json!({
            "id": "separator1",
            "type": "separator"
        }),
        serde_json::json!({
            "id": "export_database",
            "label": "导出数据库",
            "icon": "download",
            "action": {
                "type": "export_data",
                "scope": "database"
            }
        }),
        serde_json::json!({
            "id": "database_stats",
            "label": "数据库统计",
            "icon": "bar-chart",
            "action": {
                "type": "show_stats",
                "scope": "database"
            }
        }),
        serde_json::json!({
            "id": "separator2",
            "type": "separator"
        }),
        serde_json::json!({
            "id": "drop_database",
            "label": "删除数据库",
            "icon": "delete",
            "danger": true,
            "action": {
                "type": "drop_database",
                "database": database
            }
        })
    ];

    Ok(menu_items)
}

/// 获取测量上下文菜单
#[tauri::command]
pub async fn get_measurement_context_menu(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    measurement: String,
) -> Result<Vec<serde_json::Value>, String> {
    debug!("获取测量上下文菜单: {}.{}", database, measurement);
    
    let menu_items = vec![
        serde_json::json!({
            "id": "select_all",
            "label": "查询所有数据",
            "icon": "search",
            "action": {
                "type": "generate_sql",
                "sql_type": "select_all",
                "database": database,
                "measurement": measurement
            }
        }),
        serde_json::json!({
            "id": "select_recent",
            "label": "查询最近数据",
            "icon": "clock",
            "action": {
                "type": "generate_sql",
                "sql_type": "time_series",
                "database": database,
                "measurement": measurement,
                "time_range": {
                    "start": "now() - 1h",
                    "end": "now()"
                }
            }
        }),
        serde_json::json!({
            "id": "count_records",
            "label": "统计记录数",
            "icon": "number",
            "action": {
                "type": "generate_sql",
                "sql_type": "count_records",
                "database": database,
                "measurement": measurement
            }
        }),
        serde_json::json!({
            "id": "separator1",
            "type": "separator"
        }),
        serde_json::json!({
            "id": "show_tag_keys",
            "label": "显示标签键",
            "icon": "tag",
            "action": {
                "type": "generate_sql",
                "sql_type": "show_tag_keys",
                "database": database,
                "measurement": measurement
            }
        }),
        serde_json::json!({
            "id": "show_field_keys",
            "label": "显示字段键",
            "icon": "field",
            "action": {
                "type": "generate_sql",
                "sql_type": "show_field_keys",
                "database": database,
                "measurement": measurement
            }
        }),
        serde_json::json!({
            "id": "describe_measurement",
            "label": "描述测量结构",
            "icon": "info",
            "action": {
                "type": "generate_sql",
                "sql_type": "describe_measurement",
                "database": database,
                "measurement": measurement
            }
        }),
        serde_json::json!({
            "id": "separator2",
            "type": "separator"
        }),
        serde_json::json!({
            "id": "export_measurement",
            "label": "导出测量数据",
            "icon": "download",
            "action": {
                "type": "export_data",
                "scope": "measurement",
                "measurement": measurement
            }
        }),
        serde_json::json!({
            "id": "visualize_data",
            "label": "可视化数据",
            "icon": "line-chart",
            "action": {
                "type": "create_visualization",
                "measurement": measurement
            }
        }),
        serde_json::json!({
            "id": "separator3",
            "type": "separator"
        }),
        serde_json::json!({
            "id": "drop_measurement",
            "label": "删除测量",
            "icon": "delete",
            "danger": true,
            "action": {
                "type": "drop_measurement",
                "database": database,
                "measurement": measurement
            }
        })
    ];

    Ok(menu_items)
}

/// 获取字段上下文菜单
#[tauri::command]
pub async fn get_field_context_menu(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    database: String,
    measurement: String,
    field: String,
    field_type: String,
) -> Result<Vec<serde_json::Value>, String> {
    debug!("获取字段上下文菜单: {}.{}.{} ({})", database, measurement, field, field_type);
    
    let mut menu_items = vec![
        serde_json::json!({
            "id": "select_field",
            "label": format!("查询 {}", field),
            "icon": "search",
            "action": {
                "type": "generate_sql",
                "sql_type": "select_fields",
                "database": database,
                "measurement": measurement,
                "fields": [field]
            }
        })
    ];

    if field_type == "tag" {
        menu_items.extend(vec![
            serde_json::json!({
                "id": "show_tag_values",
                "label": "显示标签值",
                "icon": "list",
                "action": {
                    "type": "generate_sql",
                    "sql_type": "show_tag_values",
                    "database": database,
                    "measurement": measurement,
                    "tag": field
                }
            }),
            serde_json::json!({
                "id": "group_by_tag",
                "label": "按标签分组",
                "icon": "group",
                "action": {
                    "type": "generate_sql",
                    "sql_type": "aggregation",
                    "database": database,
                    "measurement": measurement,
                    "group_by": [field]
                }
            })
        ]);
    } else {
        menu_items.extend(vec![
            serde_json::json!({
                "id": "aggregate_field",
                "label": "聚合统计",
                "icon": "calculator",
                "children": [
                    {
                        "id": "sum_field",
                        "label": "求和 (SUM)",
                        "action": {
                            "type": "generate_sql",
                            "sql_type": "aggregation",
                            "database": database,
                            "measurement": measurement,
                            "fields": [format!("SUM({})", field)]
                        }
                    },
                    {
                        "id": "avg_field",
                        "label": "平均值 (MEAN)",
                        "action": {
                            "type": "generate_sql",
                            "sql_type": "aggregation",
                            "database": database,
                            "measurement": measurement,
                            "fields": [format!("MEAN({})", field)]
                        }
                    },
                    {
                        "id": "max_field",
                        "label": "最大值 (MAX)",
                        "action": {
                            "type": "generate_sql",
                            "sql_type": "aggregation",
                            "database": database,
                            "measurement": measurement,
                            "fields": [format!("MAX({})", field)]
                        }
                    },
                    {
                        "id": "min_field",
                        "label": "最小值 (MIN)",
                        "action": {
                            "type": "generate_sql",
                            "sql_type": "aggregation",
                            "database": database,
                            "measurement": measurement,
                            "fields": [format!("MIN({})", field)]
                        }
                    }
                ]
            }),
            serde_json::json!({
                "id": "visualize_field",
                "label": "可视化字段",
                "icon": "line-chart",
                "action": {
                    "type": "create_visualization",
                    "measurement": measurement,
                    "field": field
                }
            })
        ]);
    }

    menu_items.push(serde_json::json!({
        "id": "separator1",
        "type": "separator"
    }));

    menu_items.push(serde_json::json!({
        "id": "copy_field_name",
        "label": "复制字段名",
        "icon": "copy",
        "action": {
            "type": "copy_to_clipboard",
            "text": field
        }
    }));

    Ok(menu_items)
}

// SQL 生成辅助函数
fn generate_select_all_sql(request: &SqlGenerationRequest) -> String {
    let _database = request.database.as_ref().unwrap_or(&String::new());
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    let limit = request.limit.unwrap_or(100);

    format!("SELECT * FROM \"{}\" LIMIT {}", measurement, limit)
}

fn generate_select_fields_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    let fields = request.fields.as_ref().map(|f| f.join(", ")).unwrap_or("*".to_string());
    let limit = request.limit.unwrap_or(100);

    format!("SELECT {} FROM \"{}\" LIMIT {}", fields, measurement, limit)
}

fn generate_count_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    format!("SELECT COUNT(*) FROM \"{}\"", measurement)
}

fn generate_show_measurements_sql(_request: &SqlGenerationRequest) -> String {
    "SHOW MEASUREMENTS".to_string()
}

fn generate_show_tag_keys_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    format!("SHOW TAG KEYS FROM \"{}\"", measurement)
}

fn generate_show_tag_values_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    if let Some(tags) = &request.tags {
        if !tags.is_empty() {
            return format!("SHOW TAG VALUES FROM \"{}\" WITH KEY = \"{}\"", measurement, tags[0]);
        }
    }
    format!("SHOW TAG VALUES FROM \"{}\"", measurement)
}

fn generate_show_field_keys_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    format!("SHOW FIELD KEYS FROM \"{}\"", measurement)
}

fn generate_describe_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    format!("SHOW SERIES FROM \"{}\" LIMIT 1", measurement)
}

fn generate_time_series_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    let limit = request.limit.unwrap_or(100);

    if let Some(time_range) = &request.time_range {
        format!(
            "SELECT * FROM \"{}\" WHERE time >= '{}' AND time <= '{}' LIMIT {}",
            measurement, time_range.start, time_range.end, limit
        )
    } else {
        format!("SELECT * FROM \"{}\" WHERE time >= now() - 1h LIMIT {}", measurement, limit)
    }
}

fn generate_aggregation_sql(request: &SqlGenerationRequest) -> String {
    let default_measurement = String::new();
    let measurement = request.measurement.as_ref().unwrap_or(&default_measurement);
    let fields = request.fields.as_ref().map(|f| f.join(", ")).unwrap_or("COUNT(*)".to_string());

    let mut sql = format!("SELECT {} FROM \"{}\"", fields, measurement);

    if let Some(group_by) = &request.group_by {
        if !group_by.is_empty() {
            sql.push_str(&format!(" GROUP BY {}", group_by.join(", ")));
        }
    }

    sql
}

fn get_sql_description(sql_type: &str) -> String {
    match sql_type {
        "select_all" => "查询测量中的所有数据".to_string(),
        "select_fields" => "查询指定字段的数据".to_string(),
        "count_records" => "统计记录总数".to_string(),
        "show_measurements" => "显示数据库中的所有测量".to_string(),
        "show_tag_keys" => "显示测量中的所有标签键".to_string(),
        "show_tag_values" => "显示指定标签的所有值".to_string(),
        "show_field_keys" => "显示测量中的所有字段键".to_string(),
        "describe_measurement" => "描述测量的结构信息".to_string(),
        "time_series" => "查询指定时间范围的时序数据".to_string(),
        "aggregation" => "执行聚合查询".to_string(),
        _ => "自定义查询".to_string(),
    }
}
