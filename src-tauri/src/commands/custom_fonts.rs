/**
 * 自定义字体管理命令
 * 处理用户导入的自定义字体文件
 */

use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use log::{info, warn, error};

#[derive(Debug, Serialize, Deserialize)]
pub struct FontImportResult {
    pub success: usize,
    pub failed: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomFont {
    pub name: String,
    pub family: String,
    pub path: String,
    pub format: String,
}

/// 获取自定义字体目录
fn get_custom_fonts_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    
    let fonts_dir = app_data_dir.join("custom_fonts");
    
    // 确保目录存在
    if !fonts_dir.exists() {
        fs::create_dir_all(&fonts_dir)
            .map_err(|e| format!("Failed to create fonts directory: {}", e))?;
    }
    
    Ok(fonts_dir)
}

/// 导入自定义字体文件
#[tauri::command]
pub async fn import_custom_fonts(
    app: AppHandle,
    font_paths: Vec<String>,
) -> Result<FontImportResult, String> {
    info!("开始导入 {} 个字体文件", font_paths.len());
    
    let fonts_dir = get_custom_fonts_dir(&app)?;
    let mut success = 0;
    let mut failed = 0;
    
    for font_path in font_paths {
        let source_path = Path::new(&font_path);
        
        // 验证文件存在
        if !source_path.exists() {
            warn!("字体文件不存在: {}", font_path);
            failed += 1;
            continue;
        }
        
        // 验证文件扩展名
        let extension = source_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        
        if !matches!(extension.to_lowercase().as_str(), "ttf" | "otf" | "woff" | "woff2") {
            warn!("不支持的字体格式: {}", extension);
            failed += 1;
            continue;
        }
        
        // 获取文件名
        let file_name = source_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| "Invalid file name".to_string())?;
        
        // 目标路径
        let dest_path = fonts_dir.join(file_name);
        
        // 复制文件
        match fs::copy(source_path, &dest_path) {
            Ok(_) => {
                info!("成功导入字体: {}", file_name);
                success += 1;
            }
            Err(e) => {
                error!("复制字体文件失败 {}: {}", file_name, e);
                failed += 1;
            }
        }
    }
    
    info!("字体导入完成: 成功 {}, 失败 {}", success, failed);
    
    Ok(FontImportResult { success, failed })
}

/// 获取已导入的自定义字体列表
#[tauri::command]
pub async fn get_custom_fonts(app: AppHandle) -> Result<Vec<CustomFont>, String> {
    let fonts_dir = get_custom_fonts_dir(&app)?;
    let mut fonts = Vec::new();
    
    if !fonts_dir.exists() {
        return Ok(fonts);
    }
    
    let entries = fs::read_dir(&fonts_dir)
        .map_err(|e| format!("Failed to read fonts directory: {}", e))?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            
            if path.is_file() {
                if let Some(extension) = path.extension().and_then(|e| e.to_str()) {
                    if matches!(extension.to_lowercase().as_str(), "ttf" | "otf" | "woff" | "woff2") {
                        if let Some(file_name) = path.file_stem().and_then(|n| n.to_str()) {
                            fonts.push(CustomFont {
                                name: file_name.to_string(),
                                family: file_name.to_string(),
                                path: path.to_string_lossy().to_string(),
                                format: extension.to_string(),
                            });
                        }
                    }
                }
            }
        }
    }
    
    Ok(fonts)
}

/// 删除自定义字体
#[tauri::command]
pub async fn delete_custom_font(
    app: AppHandle,
    font_name: String,
) -> Result<bool, String> {
    let fonts_dir = get_custom_fonts_dir(&app)?;
    
    // 查找匹配的字体文件
    let entries = fs::read_dir(&fonts_dir)
        .map_err(|e| format!("Failed to read fonts directory: {}", e))?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            
            if let Some(file_stem) = path.file_stem().and_then(|n| n.to_str()) {
                if file_stem == font_name {
                    fs::remove_file(&path)
                        .map_err(|e| format!("Failed to delete font: {}", e))?;
                    
                    info!("已删除自定义字体: {}", font_name);
                    return Ok(true);
                }
            }
        }
    }
    
    Err(format!("Font not found: {}", font_name))
}

