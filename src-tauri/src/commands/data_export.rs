use serde::{Deserialize, Serialize};
use tauri::State;
use log::{debug, error, info};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::time::Instant;
use crate::services::ConnectionService;

#[derive(Debug, Serialize, Deserialize)]
pub struct DataExportRequest {
    pub connection_id: String,
    pub database: String,
    pub query: String,
    pub format: ExportFormat,
    pub file_path: String,
    pub options: Option<ExportOptions>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ExportFormat {
    Csv,
    Excel,
    Json,
    Sql,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportOptions {
    pub include_headers: Option<bool>,
    pub delimiter: Option<String>,
    pub encoding: Option<String>,
    pub compression: Option<bool>,
    pub chunk_size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataExportResult {
    pub success: bool,
    pub message: String,
    pub file_path: Option<String>,
    pub row_count: u64,
    pub file_size: u64,
    pub duration: u64,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataExportProgress {
    pub total: u64,
    pub processed: u64,
    pub percentage: f64,
    pub current_chunk: u64,
    pub total_chunks: u64,
    pub speed: f64,
    pub estimated_time_remaining: u64,
}

/// 导出查询结果数据
#[tauri::command]
pub async fn export_query_data(
    connection_service: State<'_, ConnectionService>,
    request: DataExportRequest,
) -> Result<DataExportResult, String> {
    debug!("开始导出数据: {} -> {}", request.query, request.file_path);
    
    let start_time = Instant::now();
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&request.connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 执行查询获取数据
    let query_result = client.execute_query(&request.query).await
        .map_err(|e| {
            error!("查询执行失败: {}", e);
            format!("查询执行失败: {}", e)
        })?;

    let row_count = query_result.rows().len() as u64;
    let mut errors = Vec::new();

    // 根据格式导出数据
    let export_result = match request.format {
        ExportFormat::Csv => export_to_csv(&query_result, &request.file_path, &request.options),
        ExportFormat::Excel => export_to_excel(&query_result, &request.file_path, &request.options),
        ExportFormat::Json => export_to_json(&query_result, &request.file_path, &request.options),
        ExportFormat::Sql => export_to_sql(&query_result, &request.file_path, &request.options),
    };

    let (success, file_size) = match export_result {
        Ok(size) => (true, size),
        Err(e) => {
            error!("导出失败: {}", e);
            errors.push(e);
            (false, 0)
        }
    };

    let duration = start_time.elapsed().as_millis() as u64;

    let result = DataExportResult {
        success,
        message: if success {
            format!("成功导出 {} 行数据到 {}", row_count, request.file_path)
        } else {
            format!("导出失败: {}", errors.join(", "))
        },
        file_path: if success { Some(request.file_path) } else { None },
        row_count,
        file_size,
        duration,
        errors,
    };

    info!("数据导出完成: {} 行，耗时 {}ms", row_count, duration);
    Ok(result)
}

/// 获取支持的导出格式
#[tauri::command]
pub async fn get_export_formats() -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![
        serde_json::json!({
            "id": "csv",
            "name": "CSV",
            "description": "逗号分隔值文件",
            "extension": ".csv",
            "mimeType": "text/csv"
        }),
        serde_json::json!({
            "id": "excel",
            "name": "Excel",
            "description": "Microsoft Excel 文件",
            "extension": ".xlsx",
            "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }),
        serde_json::json!({
            "id": "json",
            "name": "JSON",
            "description": "JavaScript 对象表示法",
            "extension": ".json",
            "mimeType": "application/json"
        }),
        serde_json::json!({
            "id": "sql",
            "name": "SQL",
            "description": "SQL 插入语句",
            "extension": ".sql",
            "mimeType": "text/sql"
        })
    ])
}

/// 预估导出文件大小
#[tauri::command]
pub async fn estimate_export_size(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
    _database: String,
    query: String,
    format: ExportFormat,
) -> Result<serde_json::Value, String> {
    debug!("预估导出文件大小");
    
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&connection_id).await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 执行 COUNT 查询获取行数
    let count_query = if query.trim().to_uppercase().starts_with("SELECT") {
        format!("SELECT COUNT(*) FROM ({})", query)
    } else {
        format!("SELECT COUNT(*) FROM \"{}\"", query) // 假设 query 是测量名
    };

    let count_result = client.execute_query(&count_query).await
        .map_err(|e| format!("统计查询失败: {}", e))?;

    let row_count = if let Some(first_row) = count_result.rows().first() {
        // Find the index of the count column
        if let Some(count_index) = count_result.columns().iter().position(|col| col.contains("count")) {
            if let Some(count_value) = first_row.get(count_index) {
                count_value.as_f64().unwrap_or(0.0) as u64
            } else {
                0
            }
        } else if let Some(count_value) = first_row.get(0) {
            // If no count column found, try first column
            count_value.as_f64().unwrap_or(0.0) as u64
        } else {
            0
        }
    } else {
        0
    };

    // 估算文件大小（基于经验值）
    let estimated_size = match format {
        ExportFormat::Csv => row_count * 100,      // 平均每行 100 字节
        ExportFormat::Excel => row_count * 150,    // Excel 格式稍大
        ExportFormat::Json => row_count * 200,     // JSON 格式较大
        ExportFormat::Sql => row_count * 250,      // SQL 插入语句最大
    };

    Ok(serde_json::json!({
        "rowCount": row_count,
        "estimatedSize": estimated_size,
        "estimatedSizeFormatted": format_file_size(estimated_size),
        "estimatedDuration": estimate_duration(row_count, &format)
    }))
}

// 导出实现函数
fn export_to_csv(
    query_result: &crate::models::QueryResult,
    file_path: &str,
    options: &Option<ExportOptions>,
) -> Result<u64, String> {
    let file = File::create(file_path)
        .map_err(|e| format!("创建文件失败: {}", e))?;
    let mut writer = BufWriter::new(file);

    let delimiter = options.as_ref()
        .and_then(|o| o.delimiter.as_ref())
        .map(|s| s.as_str())
        .unwrap_or(",");

    let include_headers = options.as_ref()
        .and_then(|o| o.include_headers)
        .unwrap_or(true);

    // 写入表头
    if include_headers && !query_result.columns().is_empty() {
        let header = query_result.columns().join(delimiter);
        writeln!(writer, "{}", header)
            .map_err(|e| format!("写入表头失败: {}", e))?;
    }

    // 写入数据行
    for row in &query_result.rows() {
        let mut values = Vec::new();
        for (index, _column) in query_result.columns().iter().enumerate() {
            let value = row.get(index)
                .map(|v| format_csv_value(v))
                .unwrap_or_default();
            values.push(value);
        }
        let line = values.join(delimiter);
        writeln!(writer, "{}", line)
            .map_err(|e| format!("写入数据行失败: {}", e))?;
    }

    writer.flush()
        .map_err(|e| format!("刷新缓冲区失败: {}", e))?;

    // 获取文件大小
    let metadata = std::fs::metadata(file_path)
        .map_err(|e| format!("获取文件信息失败: {}", e))?;

    Ok(metadata.len())
}

fn export_to_json(
    query_result: &crate::models::QueryResult,
    file_path: &str,
    _options: &Option<ExportOptions>,
) -> Result<u64, String> {
    let json_data = serde_json::to_string_pretty(&query_result.rows())
        .map_err(|e| format!("JSON 序列化失败: {}", e))?;

    std::fs::write(file_path, json_data)
        .map_err(|e| format!("写入文件失败: {}", e))?;

    let metadata = std::fs::metadata(file_path)
        .map_err(|e| format!("获取文件信息失败: {}", e))?;

    Ok(metadata.len())
}

fn export_to_excel(
    query_result: &crate::models::QueryResult,
    file_path: &str,
    options: &Option<ExportOptions>,
) -> Result<u64, String> {
    use rust_xlsxwriter::{Workbook, Worksheet, Format};

    debug!("开始导出Excel文件: {}", file_path);

    // 创建工作簿
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    // 设置标题格式
    let header_format = Format::new()
        .set_bold()
        .set_background_color("#4472C4")
        .set_font_color("#FFFFFF");

    let mut row = 0u32;
    let mut exported_rows = 0u64;

    // 写入列标题
    if let Some(columns) = &query_result.columns {
        for (col_idx, column) in columns.iter().enumerate() {
            worksheet.write_string_with_format(row, col_idx as u16, &column.name, &header_format)
                .map_err(|e| format!("写入列标题失败: {}", e))?;
        }
        row += 1;
    }

    // 写入数据行
    if let Some(rows) = &query_result.rows {
        for data_row in rows {
            for (col_idx, value) in data_row.iter().enumerate() {
                let cell_value = match value {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    serde_json::Value::Null => "".to_string(),
                    _ => value.to_string(),
                };

                worksheet.write_string(row, col_idx as u16, &cell_value)
                    .map_err(|e| format!("写入数据失败: {}", e))?;
            }
            row += 1;
            exported_rows += 1;

            // 检查是否有行数限制
            if let Some(opts) = options {
                if let Some(limit) = opts.limit {
                    if exported_rows >= limit as u64 {
                        break;
                    }
                }
            }
        }
    }

    // 保存文件
    workbook.save(file_path)
        .map_err(|e| format!("保存Excel文件失败: {}", e))?;

    info!("Excel导出完成: {} 行数据导出到 {}", exported_rows, file_path);
    Ok(exported_rows)
}

fn export_to_sql(
    query_result: &crate::models::QueryResult,
    file_path: &str,
    _options: &Option<ExportOptions>,
) -> Result<u64, String> {
    let file = File::create(file_path)
        .map_err(|e| format!("创建文件失败: {}", e))?;
    let mut writer = BufWriter::new(file);

    // 写入 SQL 插入语句
    for row in &query_result.rows() {
        let mut values = Vec::new();
        for (index, _column) in query_result.columns().iter().enumerate() {
            let value = row.get(index)
                .map(|v| format_sql_value(v))
                .unwrap_or("NULL".to_string());
            values.push(value);
        }
        
        let columns_str = query_result.columns().iter()
            .map(|c| format!("\"{}\"", c))
            .collect::<Vec<_>>()
            .join(", ");
        
        let values_str = values.join(", ");
        
        writeln!(writer, "INSERT INTO measurement ({}) VALUES ({});", columns_str, values_str)
            .map_err(|e| format!("写入 SQL 语句失败: {}", e))?;
    }

    writer.flush()
        .map_err(|e| format!("刷新缓冲区失败: {}", e))?;

    let metadata = std::fs::metadata(file_path)
        .map_err(|e| format!("获取文件信息失败: {}", e))?;

    Ok(metadata.len())
}

// 辅助函数
fn format_csv_value(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => {
            if s.contains(',') || s.contains('"') || s.contains('\n') {
                format!("\"{}\"", s.replace('"', "\"\""))
            } else {
                s.clone()
            }
        }
        serde_json::Value::Null => String::new(),
        _ => value.to_string(),
    }
}

fn format_sql_value(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
        serde_json::Value::Null => "NULL".to_string(),
        serde_json::Value::Bool(b) => if *b { "TRUE".to_string() } else { "FALSE".to_string() },
        _ => value.to_string(),
    }
}

fn format_file_size(size: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = size as f64;
    let mut unit_index = 0;

    while size >= 1024.0 && unit_index < UNITS.len() - 1 {
        size /= 1024.0;
        unit_index += 1;
    }

    format!("{:.2} {}", size, UNITS[unit_index])
}

fn estimate_duration(row_count: u64, format: &ExportFormat) -> u64 {
    // 基于经验的导出时间估算（秒）
    let base_time = match format {
        ExportFormat::Csv => row_count / 10000,      // 每秒处理 10k 行
        ExportFormat::Excel => row_count / 5000,     // Excel 较慢
        ExportFormat::Json => row_count / 8000,      // JSON 中等
        ExportFormat::Sql => row_count / 3000,       // SQL 最慢
    };

    std::cmp::max(base_time, 1) // 至少 1 秒
}
