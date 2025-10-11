use crate::utils::logger;
use tauri::AppHandle;

/// 读取后端日志文件内容
#[tauri::command]
pub async fn read_backend_logs(app: AppHandle) -> Result<String, String> {
    logger::read_log_file(&app)
        .map_err(|e| format!("读取后端日志失败: {}", e))
}

/// 清空后端日志文件
#[tauri::command]
pub async fn clear_backend_logs(app: AppHandle) -> Result<(), String> {
    logger::clear_log_file(&app)
        .map_err(|e| format!("清空后端日志失败: {}", e))
}

/// 获取后端日志文件路径
#[tauri::command]
pub async fn get_backend_log_path(app: AppHandle) -> Result<String, String> {
    logger::get_log_file_path(&app)
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| format!("获取后端日志路径失败: {}", e))
}

