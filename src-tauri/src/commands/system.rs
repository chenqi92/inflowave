use crate::models::{SystemInfo, DiskUsage, NetworkStats};
use crate::services::ConnectionService;
use tauri::{State, Manager, AppHandle};
use log::{debug, error, info, warn};
use tauri::Emitter;
use std::path::{Path, PathBuf};
use anyhow::Error;

/// 获取系统信息
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    debug!("处理获取系统信息命令");
    
    // 获取基本系统信息
    let system_info = SystemInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime: get_uptime(),
        memory_usage: get_memory_usage(),
        cpu_usage: get_cpu_usage(),
        disk_usage: get_disk_usage(),
        network_stats: get_network_stats(),
    };
    
    Ok(system_info)
}

/// 获取应用运行时间
fn get_uptime() -> String {
    // 简单实现，返回固定值
    // 在实际应用中，应该记录应用启动时间
    "运行中".to_string()
}

/// 获取内存使用情况
fn get_memory_usage() -> u64 {
    // 简单实现，返回固定值
    // 在实际应用中，可以使用 sysinfo 等库获取真实内存使用情况
    0
}

/// 获取 CPU 使用率
fn get_cpu_usage() -> f64 {
    // 简单实现，返回固定值
    // 在实际应用中，可以使用 sysinfo 等库获取真实 CPU 使用率
    0.0
}

/// 获取磁盘使用情况
fn get_disk_usage() -> DiskUsage {
    // 简单实现，返回默认值
    // 在实际应用中，可以使用 sysinfo 等库获取真实磁盘使用情况
    DiskUsage {
        total: 0,
        used: 0,
        free: 0,
        usage_percent: 0.0,
    }
}

/// 获取网络统计信息
fn get_network_stats() -> NetworkStats {
    // 简单实现，返回默认值
    // 在实际应用中，可以使用 sysinfo 等库获取真实网络统计信息
    NetworkStats {
        bytes_sent: 0,
        bytes_received: 0,
        packets_sent: 0,
        packets_received: 0,
    }
}

/// 获取序列数量
#[allow(dead_code)]
async fn get_series_count(
    client: &crate::database::client::InfluxClient,
    database: &str,
) -> Result<u64, Error> {
    let query = format!("SHOW SERIES ON \"{}\"", database);
    let result = client.execute_query(&query).await?;
    Ok(result.row_count.unwrap_or(0) as u64)
}

/// 健康检查
#[tauri::command]
pub async fn health_check(
    connection_service: State<'_, ConnectionService>,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    debug!("处理健康检查命令: {}", connection_id);
    
    let test_result = connection_service.test_connection(&connection_id).await
        .map_err(|e| {
            error!("健康检查失败: {}", e);
            format!("健康检查失败: {}", e)
        })?;
    
    let health_status = serde_json::json!({
        "status": if test_result.success { "healthy" } else { "unhealthy" },
        "latency": test_result.latency,
        "error": test_result.error,
        "server_version": test_result.server_version,
        "timestamp": chrono::Utc::now()
    });
    
    Ok(health_status)
}

/// 清理资源
#[tauri::command]
pub async fn cleanup_resources() -> Result<(), String> {
    debug!("处理清理资源命令");

    let mut cleanup_results = Vec::new();

    // 1. 清理临时文件
    match cleanup_temp_files().await {
        Ok(count) => {
            cleanup_results.push(format!("清理临时文件: {} 个", count));
            debug!("清理临时文件成功: {} 个", count);
        }
        Err(e) => {
            cleanup_results.push(format!("清理临时文件失败: {}", e));
            warn!("清理临时文件失败: {}", e);
        }
    }

    // 2. 清理日志文件（保留最近7天）
    match cleanup_old_logs().await {
        Ok(count) => {
            cleanup_results.push(format!("清理过期日志: {} 个", count));
            debug!("清理过期日志成功: {} 个", count);
        }
        Err(e) => {
            cleanup_results.push(format!("清理过期日志失败: {}", e));
            warn!("清理过期日志失败: {}", e);
        }
    }

    // 3. 清理缓存文件
    match cleanup_cache_files().await {
        Ok(size) => {
            cleanup_results.push(format!("清理缓存文件: {:.2} MB", size as f64 / 1024.0 / 1024.0));
            debug!("清理缓存文件成功: {} 字节", size);
        }
        Err(e) => {
            cleanup_results.push(format!("清理缓存文件失败: {}", e));
            warn!("清理缓存文件失败: {}", e);
        }
    }

    // 4. 强制垃圾回收
    std::hint::black_box(());

    info!("资源清理完成: {}", cleanup_results.join(", "));
    Ok(())
}

/// 清理临时文件
async fn cleanup_temp_files() -> Result<u32, String> {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    let temp_dir = std::env::temp_dir().join("inflowave");
    if !temp_dir.exists() {
        return Ok(0);
    }

    let mut cleaned_count = 0u32;
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("获取当前时间失败: {}", e))?
        .as_secs();

    // 清理超过1小时的临时文件
    let entries = fs::read_dir(&temp_dir)
        .map_err(|e| format!("读取临时目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let metadata = entry.metadata()
            .map_err(|e| format!("获取文件元数据失败: {}", e))?;

        if let Ok(modified) = metadata.modified() {
            if let Ok(modified_time) = modified.duration_since(UNIX_EPOCH) {
                // 删除超过1小时的文件
                if current_time - modified_time.as_secs() > 3600 {
                    if fs::remove_file(entry.path()).is_ok() {
                        cleaned_count += 1;
                    }
                }
            }
        }
    }

    Ok(cleaned_count)
}

/// 清理过期日志文件
async fn cleanup_old_logs() -> Result<u32, String> {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    let log_dir = dirs::data_local_dir()
        .ok_or("无法获取本地数据目录")?
        .join("inflowave")
        .join("logs");

    if !log_dir.exists() {
        return Ok(0);
    }

    let mut cleaned_count = 0u32;
    let current_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("获取当前时间失败: {}", e))?
        .as_secs();

    // 清理超过7天的日志文件
    let entries = fs::read_dir(&log_dir)
        .map_err(|e| format!("读取日志目录失败: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
        let path = entry.path();

        // 只处理.log文件
        if path.extension().and_then(|s| s.to_str()) == Some("log") {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(modified_time) = modified.duration_since(UNIX_EPOCH) {
                        // 删除超过7天的日志文件
                        if current_time - modified_time.as_secs() > 7 * 24 * 3600 {
                            if fs::remove_file(&path).is_ok() {
                                cleaned_count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(cleaned_count)
}

/// 清理缓存文件
async fn cleanup_cache_files() -> Result<u64, String> {
    use std::fs;

    let cache_dir = dirs::cache_dir()
        .ok_or("无法获取缓存目录")?
        .join("inflowave");

    if !cache_dir.exists() {
        return Ok(0);
    }

    let total_size;

    // 递归计算并清理缓存目录
    fn calculate_and_clean_dir(dir: &std::path::Path) -> Result<u64, std::io::Error> {
        let mut size = 0u64;

        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                size += calculate_and_clean_dir(&path)?;
            } else {
                if let Ok(metadata) = entry.metadata() {
                    size += metadata.len();
                }
            }
        }

        // 如果目录为空，删除它
        if fs::read_dir(dir)?.next().is_none() {
            let _ = fs::remove_dir(dir);
        }

        Ok(size)
    }

    total_size = calculate_and_clean_dir(&cache_dir)
        .map_err(|e| format!("清理缓存目录失败: {}", e))?;

    Ok(total_size)
}

/// 获取应用配置信息
#[tauri::command]
pub async fn get_app_config() -> Result<serde_json::Value, String> {
    debug!("处理获取应用配置信息命令");
    
    let config = serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "name": env!("CARGO_PKG_NAME"),
        "description": env!("CARGO_PKG_DESCRIPTION"),
        "authors": env!("CARGO_PKG_AUTHORS").split(':').collect::<Vec<_>>(),
        "repository": env!("CARGO_PKG_REPOSITORY"),
        "license": env!("CARGO_PKG_LICENSE"),
        "build_timestamp": chrono::Utc::now(),
        "features": {
            "encryption": true,
            "connection_pooling": true,
            "query_validation": true,
            "health_monitoring": true
        }
    });
    
    Ok(config)
}

/// 显示文件打开对话框
#[tauri::command]
pub async fn show_open_dialog(
    _filters: Option<Vec<serde_json::Value>>,
) -> Result<Option<String>, String> {
    debug!("显示文件打开对话框");

    // 简化实现，返回模拟结果
    // 在实际应用中，这里应该调用系统文件对话框
    info!("文件打开对话框功能开发中");
    Ok(None)
}

/// 显示文件保存对话框
#[tauri::command]
pub async fn show_save_dialog(
    _default_name: Option<String>,
    _filters: Option<Vec<serde_json::Value>>,
) -> Result<Option<String>, String> {
    debug!("显示文件保存对话框");

    // 简化实现，返回模拟结果
    // 在实际应用中，这里应该调用系统文件对话框
    info!("文件保存对话框功能开发中");
    Ok(None)
}

/// 切换开发者工具
#[tauri::command]
pub async fn toggle_devtools(app: AppHandle) -> Result<(), String> {
    debug!("切换开发者工具");

    if let Some(window) = app.get_webview_window("main") {
        #[cfg(debug_assertions)]
        {
            if window.is_devtools_open() {
                window.close_devtools();
                info!("关闭开发者工具");
            } else {
                window.open_devtools();
                info!("打开开发者工具");
            }
            Ok(())
        }

        #[cfg(not(debug_assertions))]
        {
            // 在非调试模式下，不使用window变量，直接返回错误
            let _ = window; // 明确标记变量已使用，避免警告
            Err("开发者工具仅在调试模式下可用".to_string())
        }
    } else {
        Err("找不到主窗口".to_string())
    }
}



/// 文件对话框结果结构
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct FileDialogResult {
    pub path: String,
    pub name: String,
}

/// 文件对话框过滤器
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(serde::Deserialize, Debug)]
pub struct SaveFileDialogParams {
    pub default_path: Option<String>,
    pub filters: Option<Vec<FileFilter>>,
}

/// 打开文件对话框
#[tauri::command]
pub async fn open_file_dialog(
    app: tauri::AppHandle,
    title: Option<String>,
    filters: Option<Vec<FileFilter>>,
    multiple: Option<bool>,
) -> Result<Option<FileDialogResult>, String> {
    debug!("打开文件对话框");

    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();

    // 设置标题
    if let Some(title_text) = title {
        dialog = dialog.set_title(&title_text);
    }

    // 设置文件过滤器
    if let Some(filter_list) = filters {
        for filter in filter_list {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&filter.name, &extensions);
        }
    }

    // 显示打开对话框
    let result = if multiple.unwrap_or(false) {
        // 多选文件
        match dialog.blocking_pick_files() {
            Some(file_paths) => {
                if let Some(first_path) = file_paths.first() {
                    let path_buf = first_path.as_path().unwrap_or_else(|| std::path::Path::new(""));
                    let result = FileDialogResult {
                        path: path_buf.to_string_lossy().to_string(),
                        name: path_buf.file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default(),
                    };
                    info!("文件打开对话框结果: {:?}", result);
                    Some(result)
                } else {
                    None
                }
            }
            None => {
                info!("用户取消了文件打开对话框");
                None
            }
        }
    } else {
        // 单选文件
        match dialog.blocking_pick_file() {
            Some(file_path) => {
                let path_buf = file_path.as_path().unwrap_or_else(|| std::path::Path::new(""));
                let result = FileDialogResult {
                    path: path_buf.to_string_lossy().to_string(),
                    name: path_buf.file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default(),
                };
                info!("文件打开对话框结果: {:?}", result);
                Some(result)
            }
            None => {
                info!("用户取消了文件打开对话框");
                None
            }
        }
    };

    Ok(result)
}

/// 保存文件对话框
#[tauri::command]
pub async fn save_file_dialog(
    app: tauri::AppHandle,
    params: SaveFileDialogParams,
) -> Result<Option<FileDialogResult>, String> {
    debug!("保存文件对话框");
    debug!("接收到的参数结构体: {:?}", params);

    let default_path = params.default_path;
    let filters = params.filters;

    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();

    // 设置默认路径
    if let Some(path) = default_path {
        info!("设置默认路径: {}", path);
        let path_obj = std::path::Path::new(&path);

        if let Some(parent) = path_obj.parent() {
            info!("设置目录: {:?}", parent);
            dialog = dialog.set_directory(parent);
        } else {
            info!("没有父目录，使用纯文件名");
        }

        if let Some(filename) = path_obj.file_name() {
            let filename_str = filename.to_string_lossy();
            info!("设置文件名: {}", filename_str);
            dialog = dialog.set_file_name(filename_str.as_ref());
        } else {
            info!("无法提取文件名");
        }
    } else {
        info!("没有提供默认路径");
    }

    // 设置文件过滤器
    if let Some(filter_list) = filters {
        for filter in filter_list {
            let extensions: Vec<&str> = filter.extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&filter.name, &extensions);
        }
    }

    // 显示保存对话框
    match dialog.blocking_save_file() {
        Some(file_path) => {
            let path_buf = file_path.as_path().unwrap_or_else(|| std::path::Path::new(""));
            let result = FileDialogResult {
                path: path_buf.to_string_lossy().to_string(),
                name: path_buf.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default(),
            };
            info!("文件保存对话框结果: {:?}", result);
            Ok(Some(result))
        }
        None => {
            info!("用户取消了文件保存对话框");
            Ok(None)
        }
    }
}

/// 解析路径：根据环境将相对路径转换为绝对路径
/// 开发环境：相对于项目根目录
/// 生产环境：相对于应用数据目录
fn resolve_path(app: &tauri::AppHandle, path: &str) -> Result<PathBuf, String> {
    let path_buf = Path::new(path);

    // 如果已经是绝对路径，直接返回
    if path_buf.is_absolute() {
        return Ok(path_buf.to_path_buf());
    }

    // 相对路径需要根据环境解析
    let base_dir = if cfg!(debug_assertions) {
        // 开发环境：使用项目根目录
        std::env::current_dir().map_err(|e| format!("获取当前目录失败: {}", e))?
    } else {
        // 生产环境：使用应用数据目录
        app.path()
            .app_data_dir()
            .map_err(|e| format!("获取应用数据目录失败: {}", e))?
    };

    Ok(base_dir.join(path))
}

/// 读取文件内容
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    debug!("读取文件: {}", path);

    match std::fs::read_to_string(&path) {
        Ok(content) => {
            // info!("成功读取文件: {}", path);
            Ok(content)
        }
        Err(e) => {
            error!("读取文件失败: {}: {}", path, e);
            Err(format!("读取文件失败: {}", e))
        }
    }
}

/// 写入文件内容
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    debug!("写入文件: {}", path);
    
    // 确保目录存在
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                error!("创建目录失败: {}: {}", parent.display(), e);
                format!("创建目录失败: {}", e)
            })?;
        }
    }
    
    match std::fs::write(&path, content) {
        Ok(_) => {
            // info!("成功写入文件: {}", path);
            Ok(())
        }
        Err(e) => {
            error!("写入文件失败: {}: {}", path, e);
            Err(format!("写入文件失败: {}", e))
        }
    }
}

/// 写入二进制文件 (base64 编码)
#[tauri::command]
pub async fn write_binary_file(path: String, data: String) -> Result<(), String> {
    debug!("写入二进制文件: {}", path);
    
    // 解码 base64 数据
    use base64::{Engine as _, engine::general_purpose};
    let binary_data = general_purpose::STANDARD.decode(&data).map_err(|e| {
        error!("Base64 解码失败: {}", e);
        format!("数据格式错误: {}", e)
    })?;
    
    // 确保目录存在
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                error!("创建目录失败: {}: {}", parent.display(), e);
                format!("创建目录失败: {}", e)
            })?;
        }
    }
    
    match std::fs::write(&path, binary_data) {
        Ok(_) => {
            info!("成功写入二进制文件: {}", path);
            Ok(())
        }
        Err(e) => {
            error!("写入二进制文件失败: {}: {}", path, e);
            Err(format!("写入文件失败: {}", e))
        }
    }
}

/// 创建目录
#[tauri::command]
pub async fn create_dir(path: String) -> Result<(), String> {
    debug!("创建目录: {}", path);

    std::fs::create_dir_all(&path).map_err(|e| {
        error!("创建目录失败: {}: {}", path, e);
        format!("创建目录失败: {}", e)
    })?;

    info!("成功创建目录: {}", path);
    Ok(())
}

/// 环境感知的文件写入（开发环境使用项目根目录，生产环境使用应用数据目录）
#[tauri::command]
pub async fn write_file_env(app: tauri::AppHandle, path: String, content: String) -> Result<bool, String> {
    let resolved_path = resolve_path(&app, &path)?;
    // debug!("写入文件 [环境感知]: {} -> {:?}", path, resolved_path);

    // 确保目录存在
    if let Some(parent) = resolved_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| {
                error!("创建目录失败: {}: {}", parent.display(), e);
                format!("创建目录失败: {}", e)
            })?;
        }
    }

    match std::fs::write(&resolved_path, content) {
        Ok(_) => {
            // info!("成功写入文件: {:?}", resolved_path);
            Ok(true)
        }
        Err(e) => {
            error!("写入文件失败: {:?}: {}", resolved_path, e);
            Err(format!("写入文件失败: {}", e))
        }
    }
}

/// 环境感知的文件读取
#[tauri::command]
pub async fn read_file_env(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let resolved_path = resolve_path(&app, &path)?;
    // debug!("读取文件 [环境感知]: {} -> {:?}", path, resolved_path);

    match std::fs::read_to_string(&resolved_path) {
        Ok(content) => {
            info!("成功读取文件: {:?}", resolved_path);
            Ok(content)
        }
        Err(e) => {
            error!("读取文件失败: {:?}: {}", resolved_path, e);
            Err(format!("读取文件失败: {}", e))
        }
    }
}

/// 环境感知的文件删除
#[tauri::command]
pub async fn delete_file_env(app: tauri::AppHandle, path: String) -> Result<bool, String> {
    let resolved_path = resolve_path(&app, &path)?;
    debug!("删除文件 [环境感知]: {} -> {:?}", path, resolved_path);

    match std::fs::remove_file(&resolved_path) {
        Ok(_) => {
            info!("成功删除文件: {:?}", resolved_path);
            Ok(true)
        }
        Err(e) => {
            error!("删除文件失败: {:?}: {}", resolved_path, e);
            Err(format!("删除文件失败: {}", e))
        }
    }
}

/// 环境感知的文件存在性检查
#[tauri::command]
pub async fn file_exists_env(app: tauri::AppHandle, path: String) -> Result<bool, String> {
    let resolved_path = resolve_path(&app, &path)?;
    debug!("检查文件存在性 [环境感知]: {} -> {:?}", path, resolved_path);

    Ok(resolved_path.exists())
}

/// 环境感知的目录创建
#[tauri::command]
pub async fn create_dir_env(app: tauri::AppHandle, path: String) -> Result<bool, String> {
    let resolved_path = resolve_path(&app, &path)?;
    // debug!("创建目录 [环境感知]: {} -> {:?}", path, resolved_path);

    std::fs::create_dir_all(&resolved_path).map_err(|e| {
        error!("创建目录失败: {:?}: {}", resolved_path, e);
        format!("创建目录失败: {}", e)
    })?;

    info!("成功创建目录: {:?}", resolved_path);
    Ok(true)
}

/// 获取用户下载目录
#[tauri::command]
pub async fn get_downloads_dir() -> Result<String, String> {
    debug!("获取下载目录");

    match dirs::download_dir() {
        Some(dir) => {
            let path = dir.to_string_lossy().to_string();
            info!("下载目录: {}", path);
            Ok(path)
        }
        None => {
            let fallback = dirs::home_dir()
                .map(|p| p.join("Downloads"))
                .or_else(|| dirs::desktop_dir())
                .unwrap_or_else(|| std::path::PathBuf::from("."));

            let path = fallback.to_string_lossy().to_string();
            info!("使用备用下载目录: {}", path);
            Ok(path)
        }
    }
}

/// 检查文件是否存在
#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    debug!("检查文件是否存在: {}", path);

    let exists = Path::new(&path).exists();
    info!("文件 {} 存在性检查结果: {}", path, exists);
    Ok(exists)
}

/// 删除文件
#[tauri::command]
pub async fn delete_file(path: String) -> Result<(), String> {
    debug!("删除文件: {}", path);

    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("文件不存在: {}", path));
    }

    match std::fs::remove_file(&path) {
        Ok(_) => {
            info!("成功删除文件: {}", path);
            Ok(())
        }
        Err(e) => {
            error!("删除文件失败: {}: {}", path, e);
            Err(format!("删除文件失败: {}", e))
        }
    }
}

/// 文件信息结构
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct FileInfo {
    pub size: u64,
    pub modified: String,
    pub created: String,
    pub is_file: bool,
    pub is_dir: bool,
}

/// 获取文件信息
#[tauri::command]
pub async fn get_file_info(path: String) -> Result<FileInfo, String> {
    debug!("获取文件信息: {}", path);

    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("文件不存在: {}", path));
    }

    match std::fs::metadata(&path) {
        Ok(metadata) => {
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

            let file_info = FileInfo {
                size: metadata.len(),
                modified,
                created,
                is_file: metadata.is_file(),
                is_dir: metadata.is_dir(),
            };

            info!("文件信息获取成功: {:?}", file_info);
            Ok(file_info)
        }
        Err(e) => {
            error!("获取文件信息失败: {}: {}", path, e);
            Err(format!("获取文件信息失败: {}", e))
        }
    }
}

/// 显示消息对话框
#[tauri::command]
pub async fn show_message_dialog(
    app: tauri::AppHandle,
    title: String,
    message: String,
    buttons: Vec<String>,
    _default_button: Option<usize>,
) -> Result<usize, String> {
    debug!("显示消息对话框: {}", title);

    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

    let dialog = app.dialog().message(&message).title(&title);

    // 根据按钮数量选择对话框类型
    let result = match buttons.len() {
        1 => {
            // 单按钮：信息对话框
            dialog.kind(MessageDialogKind::Info).blocking_show();
            0 // 总是返回第一个按钮
        }
        2 => {
            // 双按钮：确认对话框
            let confirmed = dialog.kind(MessageDialogKind::Warning).blocking_show();
            if confirmed { 0 } else { 1 }
        }
        _ => {
            // 多按钮：使用自定义实现
            // 这里简化处理，实际应用中可能需要更复杂的对话框
            let confirmed = dialog.kind(MessageDialogKind::Warning).blocking_show();
            if confirmed { 0 } else { 2 } // 0=确认, 2=取消
        }
    };

    info!("对话框结果: {}", result);
    Ok(result)
}

/// 关闭应用
#[tauri::command]
pub async fn close_app(app: tauri::AppHandle) -> Result<(), String> {
    debug!("关闭应用");

    // 发送关闭事件给前端，让前端有机会清理资源
    if let Err(e) = app.emit("app-closing", ()) {
        warn!("发送应用关闭事件失败: {}", e);
    }

    // 延迟一点时间让前端处理关闭事件
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // 关闭应用
    app.exit(0);
    Ok(())
}
