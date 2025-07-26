/**
 * 数据库版本检测命令
 * 
 * 提供前端调用的数据库版本自动检测功能
 */

use crate::services::database_version_detector::{DatabaseVersionDetector, VersionDetectionResult};
use anyhow::Result;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionRequest {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionResponse {
    pub success: bool,
    pub result: Option<VersionDetectionResult>,
    pub error: Option<String>,
}

// 全局版本检测器实例
type DetectorState = Arc<Mutex<DatabaseVersionDetector>>;

/// 初始化版本检测器
pub fn init_detector() -> DetectorState {
    Arc::new(Mutex::new(DatabaseVersionDetector::new()))
}

/// 自动检测数据库版本
#[tauri::command]
pub async fn detect_database_version(
    request: DetectionRequest,
    detector: State<'_, DetectorState>,
) -> Result<DetectionResponse, String> {
    info!(
        "开始检测数据库版本: {}:{}",
        request.host, request.port
    );

    let detector = detector.lock().await;

    match detector
        .detect_database_version(
            &request.host,
            request.port,
            request.username.as_deref(),
            request.password.as_deref(),
            request.token.as_deref(),
        )
        .await
    {
        Ok(result) => {
            if result.success {
                info!(
                    "数据库版本检测成功: {} ({}ms)",
                    result.version_info.as_ref().unwrap().version,
                    result.detection_time_ms
                );
            } else {
                debug!("数据库版本检测失败: {:?}", result.error_message);
            }

            Ok(DetectionResponse {
                success: true,
                result: Some(result),
                error: None,
            })
        }
        Err(e) => {
            let error_msg = format!("版本检测失败: {}", e);
            debug!("{}", error_msg);

            Ok(DetectionResponse {
                success: false,
                result: None,
                error: Some(error_msg),
            })
        }
    }
}

/// 快速检测数据库类型（仅检测类型，不获取详细版本信息）
#[tauri::command]
pub async fn quick_detect_database_type(
    host: String,
    port: u16,
    detector: State<'_, DetectorState>,
) -> Result<String, String> {
    info!("快速检测数据库类型: {}:{}", host, port);

    let detector = detector.lock().await;

    // 创建一个简化的检测请求
    match detector
        .detect_database_version(&host, port, None, None, None)
        .await
    {
        Ok(result) => {
            if result.success {
                let db_type = result
                    .version_info
                    .as_ref()
                    .map(|info| info.detected_type.clone())
                    .unwrap_or_else(|| "unknown".to_string());

                info!("快速检测成功: {}", db_type);
                Ok(db_type)
            } else {
                Ok("unknown".to_string())
            }
        }
        Err(_) => Ok("unknown".to_string()),
    }
}

/// 验证检测到的数据库连接
#[tauri::command]
pub async fn validate_detected_connection(
    request: DetectionRequest,
    detector: State<'_, DetectorState>,
) -> Result<bool, String> {
    info!(
        "验证检测到的数据库连接: {}:{}",
        request.host, request.port
    );

    let detector = detector.lock().await;

    match detector
        .detect_database_version(
            &request.host,
            request.port,
            request.username.as_deref(),
            request.password.as_deref(),
            request.token.as_deref(),
        )
        .await
    {
        Ok(result) => {
            let is_valid = result.success && result.version_info.is_some();
            info!("连接验证结果: {}", is_valid);
            Ok(is_valid)
        }
        Err(e) => {
            debug!("连接验证失败: {}", e);
            Ok(false)
        }
    }
}

/// 获取支持的数据库类型列表
#[tauri::command]
pub async fn get_supported_database_types() -> Result<Vec<String>, String> {
    Ok(vec![
        "influxdb1".to_string(),
        "influxdb2".to_string(),
        "influxdb3".to_string(),
        "iotdb".to_string(),
    ])
}

/// 根据检测结果生成连接配置建议
#[tauri::command]
pub async fn generate_connection_config_suggestions(
    detection_result: VersionDetectionResult,
) -> Result<serde_json::Value, String> {
    if !detection_result.success || detection_result.version_info.is_none() {
        return Err("无效的检测结果".to_string());
    }

    let version_info = detection_result.version_info.unwrap();
    let mut suggestions = serde_json::Map::new();

    // 基本配置
    suggestions.insert("detected_type".to_string(), serde_json::Value::String(version_info.detected_type.clone()));
    suggestions.insert("version".to_string(), serde_json::Value::String(version_info.version.clone()));

    // 根据数据库类型提供配置建议
    match version_info.detected_type.as_str() {
        "influxdb1" => {
            suggestions.insert("default_database".to_string(), serde_json::Value::String("mydb".to_string()));
            suggestions.insert("query_language".to_string(), serde_json::Value::String("InfluxQL".to_string()));
            suggestions.insert("auth_method".to_string(), serde_json::Value::String("basic".to_string()));
            
            let mut required_fields = Vec::new();
            required_fields.push("username");
            required_fields.push("password");
            required_fields.push("database");
            suggestions.insert("required_fields".to_string(), serde_json::Value::Array(
                required_fields.into_iter().map(|s| serde_json::Value::String(s.to_string())).collect()
            ));
        }
        "influxdb2" => {
            suggestions.insert("default_bucket".to_string(), serde_json::Value::String("my-bucket".to_string()));
            suggestions.insert("default_org".to_string(), serde_json::Value::String("my-org".to_string()));
            suggestions.insert("query_language".to_string(), serde_json::Value::String("Flux".to_string()));
            suggestions.insert("auth_method".to_string(), serde_json::Value::String("token".to_string()));
            
            let mut required_fields = Vec::new();
            required_fields.push("token");
            required_fields.push("org");
            required_fields.push("bucket");
            suggestions.insert("required_fields".to_string(), serde_json::Value::Array(
                required_fields.into_iter().map(|s| serde_json::Value::String(s.to_string())).collect()
            ));
        }
        "iotdb" => {
            suggestions.insert("default_database".to_string(), serde_json::Value::String("root".to_string()));
            suggestions.insert("query_language".to_string(), serde_json::Value::String("SQL".to_string()));
            suggestions.insert("auth_method".to_string(), serde_json::Value::String("basic".to_string()));
            
            let mut required_fields = Vec::new();
            required_fields.push("username");
            required_fields.push("password");
            suggestions.insert("required_fields".to_string(), serde_json::Value::Array(
                required_fields.into_iter().map(|s| serde_json::Value::String(s.to_string())).collect()
            ));
        }
        _ => {
            suggestions.insert("query_language".to_string(), serde_json::Value::String("Unknown".to_string()));
            suggestions.insert("auth_method".to_string(), serde_json::Value::String("unknown".to_string()));
        }
    }

    // 添加性能建议
    let mut performance_tips = Vec::new();
    match version_info.detected_type.as_str() {
        "influxdb1" => {
            performance_tips.push("使用批量写入提高性能");
            performance_tips.push("合理设置保留策略");
            performance_tips.push("避免使用 SELECT * 查询");
        }
        "influxdb2" => {
            performance_tips.push("使用 Flux 查询语言获得更好的性能");
            performance_tips.push("合理设置存储桶的保留策略");
            performance_tips.push("使用聚合函数减少数据传输");
        }
        "iotdb" => {
            performance_tips.push("使用时间范围查询提高性能");
            performance_tips.push("合理设计时间序列路径");
            performance_tips.push("使用聚合查询减少数据量");
        }
        _ => {}
    }

    suggestions.insert("performance_tips".to_string(), serde_json::Value::Array(
        performance_tips.into_iter().map(|s| serde_json::Value::String(s.to_string())).collect()
    ));

    Ok(serde_json::Value::Object(suggestions))
}
