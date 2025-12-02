use crate::utils::logger;
use tauri::{AppHandle, Manager};
use std::fs;
use std::path::PathBuf;
use std::collections::HashSet;
use log::{debug, error, info};

/// 获取日志目录路径
///
/// 开发环境：使用 src-tauri/logs/（与 cargo 工作目录一致）
/// 生产环境：使用应用数据目录的 logs/
fn get_log_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let log_dir = if cfg!(debug_assertions) {
        // 开发环境：使用 cargo 工作目录下的 logs/
        let current_dir = std::env::current_dir()
            .map_err(|e| format!("获取当前目录失败: {}", e))?;
        current_dir.join("logs")
    } else {
        // 生产环境：使用应用数据目录
        let app_dir = app.path()
            .app_data_dir()
            .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
        app_dir.join("logs")
    };

    Ok(log_dir)
}

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

    // 获取日志目录路径（使用统一的环境感知逻辑）
    let log_dir = get_log_dir(&app)?;

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

/// 获取日志目录路径
#[tauri::command]
pub async fn get_log_dir_path(app: AppHandle) -> Result<String, String> {
    debug!("获取日志目录路径");

    // 使用统一的环境感知逻辑
    let log_dir = get_log_dir(&app)?;

    let path = log_dir.to_string_lossy().to_string();
    info!("日志目录路径: {}", path);
    Ok(path)
}

/// 打开日志文件夹
#[tauri::command]
pub async fn open_log_folder(app: AppHandle) -> Result<(), String> {
    debug!("打开日志文件夹");

    // 使用统一的环境感知逻辑
    let log_dir = get_log_dir(&app)?;

    // 确保目录存在
    if !log_dir.exists() {
        fs::create_dir_all(&log_dir)
            .map_err(|e| format!("创建日志目录失败: {}", e))?;
    }

    // 使用系统默认程序打开文件夹
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&log_dir)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&log_dir)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&log_dir)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
    }

    info!("成功打开日志文件夹: {:?}", log_dir);
    Ok(())
}

/// 保存缺失的 i18n 翻译键到文件
///
/// 只在开发环境下生效，将缺失的翻译键去重后保存到 logs/missing-i18n.txt
#[tauri::command]
pub async fn save_missing_i18n_keys(
    app: AppHandle,
    missing_keys: Vec<String>,
) -> Result<String, String> {
    // 只在开发环境下生效
    if !cfg!(debug_assertions) {
        return Err("此功能仅在开发环境下可用".to_string());
    }

    debug!("保存缺失的 i18n 键，共 {} 个", missing_keys.len());

    // 获取日志目录
    let log_dir = get_log_dir(&app)?;

    // 确保日志目录存在
    if !log_dir.exists() {
        fs::create_dir_all(&log_dir)
            .map_err(|e| format!("创建日志目录失败: {}", e))?;
    }

    // 缺失键文件路径
    let missing_keys_file = log_dir.join("missing-i18n.txt");

    // 读取现有的缺失键（如果文件存在）
    let mut existing_keys: HashSet<String> = if missing_keys_file.exists() {
        let content = fs::read_to_string(&missing_keys_file)
            .map_err(|e| format!("读取现有缺失键文件失败: {}", e))?;

        content.lines()
            .filter(|line| !line.trim().is_empty() && !line.starts_with('#'))
            .map(|line| line.trim().to_string())
            .collect()
    } else {
        HashSet::new()
    };

    // 添加新的缺失键
    let initial_count = existing_keys.len();
    for key in missing_keys {
        existing_keys.insert(key);
    }
    let new_count = existing_keys.len() - initial_count;

    // 将缺失键排序后写入文件
    let mut sorted_keys: Vec<String> = existing_keys.into_iter().collect();
    sorted_keys.sort();

    // 生成文件内容
    let mut content = String::new();
    content.push_str("# 缺失的 i18n 翻译键\n");
    content.push_str("# Missing i18n Translation Keys\n");
    content.push_str("#\n");
    content.push_str(&format!("# 生成时间 / Generated at: {}\n", chrono::Utc::now().to_rfc3339()));
    content.push_str(&format!("# 总数 / Total: {}\n", sorted_keys.len()));
    content.push_str("#\n");
    content.push_str("# 格式 / Format: language:namespace:key 或 language:key\n");
    content.push_str("# 例如 / Example: zh-CN:common:button.save 或 en-US:template.title\n");
    content.push_str("#\n\n");

    for key in &sorted_keys {
        content.push_str(key);
        content.push('\n');
    }

    // 写入文件
    fs::write(&missing_keys_file, content)
        .map_err(|e| format!("写入缺失键文件失败: {}", e))?;

    let file_path = missing_keys_file.to_string_lossy().to_string();
    info!(
        "成功保存 {} 个缺失的 i18n 键到文件: {} (新增 {} 个)",
        sorted_keys.len(),
        file_path,
        new_count
    );

    Ok(format!(
        "已保存 {} 个缺失的翻译键 (新增 {} 个) 到: {}",
        sorted_keys.len(),
        new_count,
        file_path
    ))
}

/// 读取缺失的 i18n 翻译键文件
#[tauri::command]
pub async fn read_missing_i18n_keys(app: AppHandle) -> Result<Vec<String>, String> {
    // 只在开发环境下生效
    if !cfg!(debug_assertions) {
        return Err("此功能仅在开发环境下可用".to_string());
    }

    debug!("读取缺失的 i18n 键文件");

    // 获取日志目录
    let log_dir = get_log_dir(&app)?;
    let missing_keys_file = log_dir.join("missing-i18n.txt");

    if !missing_keys_file.exists() {
        debug!("缺失键文件不存在");
        return Ok(Vec::new());
    }

    // 读取文件内容
    let content = fs::read_to_string(&missing_keys_file)
        .map_err(|e| format!("读取缺失键文件失败: {}", e))?;

    // 解析文件内容，过滤掉注释和空行
    let keys: Vec<String> = content
        .lines()
        .filter(|line| !line.trim().is_empty() && !line.starts_with('#'))
        .map(|line| line.trim().to_string())
        .collect();

    info!("读取到 {} 个缺失的 i18n 键", keys.len());
    Ok(keys)
}

/// 清空缺失的 i18n 翻译键文件
#[tauri::command]
pub async fn clear_missing_i18n_keys(app: AppHandle) -> Result<(), String> {
    // 只在开发环境下生效
    if !cfg!(debug_assertions) {
        return Err("此功能仅在开发环境下可用".to_string());
    }

    debug!("清空缺失的 i18n 键文件");

    // 获取日志目录
    let log_dir = get_log_dir(&app)?;
    let missing_keys_file = log_dir.join("missing-i18n.txt");

    if missing_keys_file.exists() {
        fs::remove_file(&missing_keys_file)
            .map_err(|e| format!("删除缺失键文件失败: {}", e))?;
        info!("成功清空缺失的 i18n 键文件");
    } else {
        debug!("缺失键文件不存在，无需清空");
    }

    Ok(())
}
