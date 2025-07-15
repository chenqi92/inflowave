use crate::models::{DataWriteRequest, DataWriteResult, DataFormat};
use crate::services::ConnectionService;
use tauri::State;
use log::{debug, error, info};
use std::time::Instant;

/// 写入数据
#[tauri::command]
pub async fn write_data(
    connection_service: State<'_, ConnectionService>,
    request: DataWriteRequest,
) -> Result<DataWriteResult, String> {
    debug!("处理数据写入命令: {} -> {}", request.connection_id, request.database);
    
    let start_time = Instant::now();
    let manager = connection_service.get_manager();
    let client = manager.get_connection(&request.connection_id).await
        .map_err(|e| {
            error!("获取连接失败: {}", e);
            format!("获取连接失败: {}", e)
        })?;

    // 根据数据格式处理数据
    let line_protocol_data = match request.format {
        DataFormat::LineProtocol => request.data,
        DataFormat::Csv => convert_csv_to_line_protocol(&request.data, &request.measurement)?,
        DataFormat::Json => convert_json_to_line_protocol(&request.data, &request.measurement)?,
    };

    // 分批写入数据
    let batch_size = request.options.as_ref()
        .and_then(|opts| opts.batch_size)
        .unwrap_or(1000);

    let lines: Vec<&str> = line_protocol_data.lines().collect();
    let _total_lines = lines.len();
    let mut points_written = 0u64;
    let mut errors = Vec::new();

    for chunk in lines.chunks(batch_size) {
        let batch_data = chunk.join("\n");
        
        match client.write_line_protocol(&request.database, &batch_data).await {
            Ok(count) => {
                points_written += count as u64;
                debug!("成功写入 {} 个数据点", count);
            }
            Err(e) => {
                let error_msg = format!("批次写入失败: {}", e);
                error!("{}", error_msg);
                errors.push(error_msg);
            }
        }
    }

    let duration = start_time.elapsed().as_millis() as u64;
    let success = errors.is_empty();

    let result = DataWriteResult {
        success,
        message: if success {
            format!("成功写入 {} 个数据点", points_written)
        } else {
            format!("写入完成，但有 {} 个错误", errors.len())
        },
        points_written,
        errors,
        duration,
    };

    info!("数据写入完成: {} 个数据点，耗时 {}ms", points_written, duration);
    Ok(result)
}

/// 验证数据格式
#[tauri::command]
pub async fn validate_data_format(
    data: String,
    format: DataFormat,
    _measurement: String,
) -> Result<bool, String> {
    debug!("验证数据格式: {:?}", format);
    
    match format {
        DataFormat::LineProtocol => validate_line_protocol(&data),
        DataFormat::Csv => validate_csv_format(&data),
        DataFormat::Json => validate_json_format(&data),
    }
}

/// 预览数据转换结果
#[tauri::command]
pub async fn preview_data_conversion(
    data: String,
    format: DataFormat,
    measurement: String,
    limit: Option<usize>,
) -> Result<String, String> {
    debug!("预览数据转换: {:?}", format);
    
    let line_protocol = match format {
        DataFormat::LineProtocol => data,
        DataFormat::Csv => convert_csv_to_line_protocol(&data, &measurement)?,
        DataFormat::Json => convert_json_to_line_protocol(&data, &measurement)?,
    };

    // 限制预览行数
    let preview_limit = limit.unwrap_or(10);
    let lines: Vec<&str> = line_protocol.lines().take(preview_limit).collect();
    
    Ok(lines.join("\n"))
}

// 辅助函数：CSV 转 Line Protocol
fn convert_csv_to_line_protocol(csv_data: &str, measurement: &str) -> Result<String, String> {
    let mut lines = csv_data.lines();
    let header = lines.next().ok_or("CSV 文件为空")?;
    let columns: Vec<&str> = header.split(',').map(|s| s.trim()).collect();
    
    if columns.is_empty() {
        return Err("CSV 头部为空".to_string());
    }

    let mut line_protocol_lines = Vec::new();
    
    for (line_num, line) in lines.enumerate() {
        let values: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
        
        if values.len() != columns.len() {
            return Err(format!("第 {} 行列数不匹配", line_num + 2));
        }

        let mut tags = Vec::new();
        let mut fields = Vec::new();
        let mut timestamp = None;

        for (i, value) in values.iter().enumerate() {
            let column = columns[i];
            
            if column.to_lowercase() == "time" || column.to_lowercase() == "timestamp" {
                timestamp = Some(value.to_string());
            } else if value.parse::<f64>().is_ok() {
                // 数值字段
                fields.push(format!("{}={}", column, value));
            } else {
                // 标签字段
                tags.push(format!("{}={}", column, value));
            }
        }

        if fields.is_empty() {
            return Err(format!("第 {} 行没有有效的数值字段", line_num + 2));
        }

        let mut line_protocol = measurement.to_string();
        
        if !tags.is_empty() {
            line_protocol.push(',');
            line_protocol.push_str(&tags.join(","));
        }
        
        line_protocol.push(' ');
        line_protocol.push_str(&fields.join(","));
        
        if let Some(ts) = timestamp {
            line_protocol.push(' ');
            line_protocol.push_str(&ts);
        }

        line_protocol_lines.push(line_protocol);
    }

    Ok(line_protocol_lines.join("\n"))
}

// 辅助函数：JSON 转 Line Protocol
fn convert_json_to_line_protocol(json_data: &str, measurement: &str) -> Result<String, String> {
    let json_value: serde_json::Value = serde_json::from_str(json_data)
        .map_err(|e| format!("JSON 解析失败: {}", e))?;

    let mut line_protocol_lines = Vec::new();

    match json_value {
        serde_json::Value::Array(array) => {
            for (i, item) in array.iter().enumerate() {
                if let serde_json::Value::Object(obj) = item {
                    let line = convert_json_object_to_line_protocol(obj, measurement)
                        .map_err(|e| format!("第 {} 个对象转换失败: {}", i + 1, e))?;
                    line_protocol_lines.push(line);
                } else {
                    return Err(format!("第 {} 个元素不是对象", i + 1));
                }
            }
        }
        serde_json::Value::Object(obj) => {
            let line = convert_json_object_to_line_protocol(&obj, measurement)?;
            line_protocol_lines.push(line);
        }
        _ => {
            return Err("JSON 必须是对象或对象数组".to_string());
        }
    }

    Ok(line_protocol_lines.join("\n"))
}

// 辅助函数：JSON 对象转 Line Protocol
fn convert_json_object_to_line_protocol(
    obj: &serde_json::Map<String, serde_json::Value>,
    measurement: &str,
) -> Result<String, String> {
    let mut tags = Vec::new();
    let mut fields = Vec::new();
    let mut timestamp = None;

    for (key, value) in obj {
        if key.to_lowercase() == "time" || key.to_lowercase() == "timestamp" {
            timestamp = Some(value.to_string().trim_matches('"').to_string());
        } else if value.is_number() {
            fields.push(format!("{}={}", key, value));
        } else if value.is_string() {
            let str_value = value.as_str().unwrap();
            if str_value.parse::<f64>().is_ok() {
                fields.push(format!("{}={}", key, str_value));
            } else {
                tags.push(format!("{}={}", key, str_value));
            }
        } else if value.is_boolean() {
            fields.push(format!("{}={}", key, value));
        }
    }

    if fields.is_empty() {
        return Err("没有有效的数值字段".to_string());
    }

    let mut line_protocol = measurement.to_string();
    
    if !tags.is_empty() {
        line_protocol.push(',');
        line_protocol.push_str(&tags.join(","));
    }
    
    line_protocol.push(' ');
    line_protocol.push_str(&fields.join(","));
    
    if let Some(ts) = timestamp {
        line_protocol.push(' ');
        line_protocol.push_str(&ts);
    }

    Ok(line_protocol)
}

// 验证函数
fn validate_line_protocol(data: &str) -> Result<bool, String> {
    for (line_num, line) in data.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        
        // 简单的 Line Protocol 格式验证
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            return Err(format!("第 {} 行格式错误：至少需要测量名和字段", line_num + 1));
        }
    }
    Ok(true)
}

fn validate_csv_format(data: &str) -> Result<bool, String> {
    let lines: Vec<&str> = data.lines().collect();
    if lines.is_empty() {
        return Err("CSV 文件为空".to_string());
    }
    
    let header_cols = lines[0].split(',').count();
    for (i, line) in lines.iter().skip(1).enumerate() {
        let cols = line.split(',').count();
        if cols != header_cols {
            return Err(format!("第 {} 行列数不匹配", i + 2));
        }
    }
    
    Ok(true)
}

fn validate_json_format(data: &str) -> Result<bool, String> {
    serde_json::from_str::<serde_json::Value>(data)
        .map_err(|e| format!("JSON 格式错误: {}", e))?;
    Ok(true)
}
