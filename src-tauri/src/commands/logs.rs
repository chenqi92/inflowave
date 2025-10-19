use crate::utils::logger;
use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;
use log::{debug, error, info};

/// 日志文件信息
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LogFileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: String,
    pub created: String,
}

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

/// 列出日志目录中的所有日志文件
#[tauri::command]
pub async fn list_log_files(app: AppHandle) -> Result<Vec<LogFileInfo>, String> {
    debug!("列出日志文件");

    // 获取日志目录路径
    let log_dir = app.path().app_log_dir()
        .map_err(|e| format!("获取日志目录失败: {}", e))?;

    if !log_dir.exists() {
        debug!("日志目录不存在: {:?}", log_dir);
        return Ok(Vec::new());
    }

    let mut log_files = Vec::new();

    // 读取目录中的所有文件
    let entries = fs::read_dir(&log_dir)
        .map_err(|e| format!("读取日志目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();

        // 只处理文件，跳过目录
        if !path.is_file() {
            continue;
        }

        // 只处理 .log 文件
        if let Some(ext) = path.extension() {
            if ext != "log" {
                continue;
            }
        } else {
            continue;
        }

        // 获取文件元数据
        let metadata = fs::metadata(&path)
            .map_err(|e| format!("获取文件元数据失败: {}", e))?;

        let modified = metadata.modified()
            .map(|time| {
                let datetime: chrono::DateTime<chrono::Utc> = time.into();
                datetime.to_rfc3339()
            })
            .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());

        let created = metadata.created()
            .map(|time| {
                let datetime: chrono::DateTime<chrono::Utc> = time.into();
                datetime.to_rfc3339()
            })
            .unwrap_or_else(|_| chrono::Utc::now().to_rfc3339());

        log_files.push(LogFileInfo {
            name: path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string(),
            path: path.to_string_lossy().to_string(),
            size: metadata.len(),
            modified,
            created,
        });
    }

    // 按修改时间排序（最新的在前）
    log_files.sort_by(|a, b| b.modified.cmp(&a.modified));

    info!("找到 {} 个日志文件", log_files.len());
    Ok(log_files)
}

/// 删除指定的日志文件
#[tauri::command]
pub async fn delete_log_file(path: String) -> Result<(), String> {
    debug!("删除日志文件: {}", path);

    let file_path = PathBuf::from(&path);

    // 安全检查：确保文件是 .log 文件
    if let Some(ext) = file_path.extension() {
        if ext != "log" {
            return Err("只能删除 .log 文件".to_string());
        }
    } else {
        return Err("文件没有扩展名".to_string());
    }

    if !file_path.exists() {
        return Err(format!("文件不存在: {}", path));
    }

    fs::remove_file(&file_path)
        .map_err(|e| {
            error!("删除日志文件失败: {}: {}", path, e);
            format!("删除文件失败: {}", e)
        })?;

    info!("成功删除日志文件: {}", path);
    Ok(())
}

/// 清理旧的日志文件，保留最新的 N 个
#[tauri::command]
pub async fn cleanup_old_log_files(app: AppHandle, keep_count: usize) -> Result<usize, String> {
    debug!("清理旧日志文件，保留最新 {} 个", keep_count);

    let mut log_files = list_log_files(app).await?;

    if log_files.len() <= keep_count {
        debug!("日志文件数量 {} 未超过限制 {}", log_files.len(), keep_count);
        return Ok(0);
    }

    // 删除超出数量的旧文件
    let files_to_delete = log_files.split_off(keep_count);
    let delete_count = files_to_delete.len();

    for file in files_to_delete {
        if let Err(e) = delete_log_file(file.path).await {
            error!("删除日志文件失败: {}", e);
        }
    }

    info!("成功清理 {} 个旧日志文件", delete_count);
    Ok(delete_count)
}

