use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::{command, AppHandle, Manager};
use anyhow::{Result, Context};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubRelease {
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub html_url: String,
    pub published_at: String,
    pub prerelease: bool,
    pub draft: bool,
    pub assets: Vec<GitHubAsset>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitHubAsset {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
    pub content_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub release_notes: String,
    pub download_url: Option<String>,
    pub release_url: String,
    pub published_at: String,
    pub is_skipped: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
    pub speed: f64, // bytes per second
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpdateStatus {
    pub status: String, // "downloading", "installing", "completed", "error"
    pub progress: Option<DownloadProgress>,
    pub message: String,
    pub error: Option<String>,
}

const GITHUB_API_URL: &str = "https://api.github.com/repos/chenqi92/inflowave/releases";
const USER_AGENT: &str = "InfloWave-Updater/0.1";

/// 获取当前应用版本
pub fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// 比较版本号（简单的语义版本比较）
pub fn compare_versions(current: &str, latest: &str) -> Result<i32> {
    let current_parts: Vec<u32> = current
        .trim_start_matches('v')
        .split('.')
        .map(|s| s.parse().unwrap_or(0))
        .collect();
    
    let latest_parts: Vec<u32> = latest
        .trim_start_matches('v')
        .split('.')
        .map(|s| s.parse().unwrap_or(0))
        .collect();

    for i in 0..3 {
        let current_part = current_parts.get(i).unwrap_or(&0);
        let latest_part = latest_parts.get(i).unwrap_or(&0);
        
        if latest_part > current_part {
            return Ok(1); // 新版本更大
        } else if latest_part < current_part {
            return Ok(-1); // 新版本更小
        }
    }
    
    Ok(0) // 版本相同
}

/// 从GitHub API获取最新版本信息
async fn fetch_latest_release() -> Result<GitHubRelease> {
    let client = reqwest::Client::new();

    // 首先尝试获取 latest release
    let latest_response = client
        .get(&format!("{}/latest", GITHUB_API_URL))
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .context("Failed to fetch latest release information")?;

    if latest_response.status().is_success() {
        let release: GitHubRelease = latest_response
            .json()
            .await
            .context("Failed to parse latest release JSON")?;
        return Ok(release);
    }

    // 如果 latest 端点失败（404），尝试获取所有 releases 并选择最新的
    if latest_response.status() == 404 {
        let all_releases_response = client
            .get(GITHUB_API_URL)
            .header("User-Agent", USER_AGENT)
            .header("Accept", "application/vnd.github.v3+json")
            .send()
            .await
            .context("Failed to fetch all releases")?;

        if !all_releases_response.status().is_success() {
            return Err(anyhow::anyhow!(
                "GitHub API request failed with status: {}",
                all_releases_response.status()
            ));
        }

        let releases: Vec<GitHubRelease> = all_releases_response
            .json()
            .await
            .context("Failed to parse releases JSON")?;

        // 找到最新的非预发布版本
        let latest_release = releases
            .into_iter()
            .filter(|r| !r.prerelease && !r.draft)
            .max_by(|a, b| a.published_at.cmp(&b.published_at))
            .ok_or_else(|| anyhow::anyhow!("No stable releases found"))?;

        return Ok(latest_release);
    }

    // 其他错误
    Err(anyhow::anyhow!(
        "GitHub API request failed with status: {}",
        latest_response.status()
    ))
}

/// 检查是否有可用更新
#[command]
pub async fn check_for_app_updates(app_handle: AppHandle) -> Result<UpdateInfo, String> {
    let current_version = get_current_version();
    
    // 获取最新版本信息
    let latest_release = fetch_latest_release()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?;

    // 跳过预发布版本和草稿
    if latest_release.prerelease || latest_release.draft {
        return Ok(UpdateInfo {
            available: false,
            current_version,
            latest_version: latest_release.tag_name,
            release_notes: String::new(),
            download_url: None,
            release_url: latest_release.html_url,
            published_at: latest_release.published_at,
            is_skipped: false,
        });
    }

    let latest_version = &latest_release.tag_name;
    
    // 比较版本
    let version_comparison = compare_versions(&current_version, latest_version)
        .map_err(|e| format!("Failed to compare versions: {}", e))?;

    let update_available = version_comparison > 0;
    
    // 检查用户是否跳过了这个版本
    let is_skipped = if update_available {
        check_version_skipped(&app_handle, latest_version).await
    } else {
        false
    };

    // 查找适合当前平台的下载链接
    let download_url = if update_available {
        find_platform_asset(&latest_release.assets)
    } else {
        None
    };

    Ok(UpdateInfo {
        available: update_available,
        current_version,
        latest_version: latest_version.clone(),
        release_notes: latest_release.body,
        download_url,
        release_url: latest_release.html_url,
        published_at: latest_release.published_at,
        is_skipped,
    })
}

/// 根据当前平台查找合适的下载资源
fn find_platform_asset(assets: &[GitHubAsset]) -> Option<String> {
    let platform = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    
    // 定义平台特定的文件扩展名和标识符，按优先级排序
    let platform_patterns = match platform {
        "windows" => match arch {
            "x86_64" => vec![
                "_x64.msi",      // 标准格式: InfloWave_0.1.3_x64.msi
                "_x64_zh-CN.msi", // 带语言后缀的旧格式（兼容性）
                "_x64-setup.exe", // Setup EXE 格式: InfloWave_0.1.3_x64-setup.exe
                "x64.msi", 
                "x64.exe", 
                "win64", 
                "windows-x64",
                ".msi",          // 通用备选
                ".exe"
            ],
            "x86" => vec![
                "_x86.msi",      // 标准格式: InfloWave_0.1.3_x86.msi
                "_x86_zh-CN.msi", // 带语言后缀的旧格式（兼容性）
                "_x86-setup.exe", // Setup EXE 格式: InfloWave_0.1.3_x86-setup.exe
                "x86.msi", 
                "x86.exe", 
                "win32", 
                "windows-x86",
                ".msi",          // 通用备选
                ".exe"
            ],
            _ => vec![".msi", ".exe", "windows"],
        },
        "macos" => match arch {
            "aarch64" => vec![
                "_aarch64.dmg",  // DMG 格式: InfloWave_0.1.3_aarch64.dmg
                "_aarch64.app.tar.gz", // App bundle 格式: InfloWave_aarch64.app.tar.gz
                "_arm64.dmg",
                "aarch64.dmg", 
                "arm64.dmg", 
                "macos-arm64",
                ".dmg",          // 通用备选
                ".app.tar.gz"
            ],
            "x86_64" => vec![
                "_x64.dmg",      // DMG 格式: InfloWave_0.1.3_x64.dmg  
                "_x64.app.tar.gz", // App bundle 格式: InfloWave_x64.app.tar.gz
                "_intel.dmg",
                "x64.dmg", 
                "intel.dmg", 
                "macos-x64",
                ".dmg",          // 通用备选
                ".app.tar.gz"
            ],
            _ => vec![".dmg", ".app.tar.gz", "macos"],
        },
        "linux" => match arch {
            "x86_64" => vec![
                "_amd64.deb",    // DEB 格式: InfloWave_0.1.3_amd64.deb (注意：实际可能是小写inflowave)
                "_amd64.AppImage", // AppImage 格式: InfloWave_0.1.3_amd64.AppImage
                "_x86_64.AppImage",
                "_x86_64.rpm",   // RPM 格式: InfloWave-0.1.3-1.x86_64.rpm
                "amd64.deb",
                "x86_64.AppImage", 
                "x64.AppImage", 
                "x86_64.rpm",
                ".deb",          // 通用备选
                ".AppImage",
                ".rpm"
            ],
            "aarch64" => vec![
                "_arm64.deb",
                "_aarch64.AppImage",
                "_aarch64.rpm",
                "aarch64.AppImage", 
                "arm64.AppImage", 
                "arm64.deb", 
                "aarch64.rpm",
                ".deb",          // 通用备选
                ".AppImage",
                ".rpm"
            ],
            _ => vec![".AppImage", ".deb", ".rpm"],
        },
        _ => vec![],
    };

    // 查找匹配的资源，使用更精确的匹配逻辑
    for pattern in platform_patterns {
        if let Some(asset) = assets.iter().find(|asset| {
            let asset_name = asset.name.to_lowercase();
            let pattern_lower = pattern.to_lowercase();
            
            // 对于以 _ 开头的模式，使用精确匹配以避免误匹配
            if pattern_lower.starts_with('_') {
                asset_name.contains(&pattern_lower)
            } else if pattern_lower.starts_with('.') {
                // 对于文件扩展名，确保以该扩展名结尾
                asset_name.ends_with(&pattern_lower)
            } else {
                // 对于其他模式，使用包含匹配
                asset_name.contains(&pattern_lower)
            }
        }) {
            log::info!("Found matching asset for platform {}: {} -> {}", platform, pattern, asset.name);
            return Some(asset.browser_download_url.clone());
        }
    }

    // 如果没有找到特定平台的资源，尝试更宽松的匹配
    let fallback_patterns = match platform {
        "windows" => vec![".msi", ".exe"],
        "macos" => vec![".dmg", ".app"],
        "linux" => vec![".deb", ".AppImage", ".rpm"],
        _ => vec![],
    };
    
    for pattern in fallback_patterns {
        if let Some(asset) = assets.iter().find(|asset| {
            asset.name.to_lowercase().ends_with(pattern)
        }) {
            log::warn!("Using fallback asset matching for platform {}: {}", platform, asset.name);
            return Some(asset.browser_download_url.clone());
        }
    }
    
    // 最后的备选方案：返回第一个资源，并记录警告
    if let Some(first_asset) = assets.first() {
        log::warn!("No platform-specific asset found for {} {}, using first available: {}", 
                   platform, arch, first_asset.name);
        Some(first_asset.browser_download_url.clone())
    } else {
        log::error!("No assets found in release");
        None
    }
}

/// 检查用户是否跳过了特定版本
async fn check_version_skipped(app_handle: &AppHandle, version: &str) -> bool {
    match app_handle.path().app_config_dir() {
        Ok(config_dir) => {
            let settings_path = config_dir.join("updater_settings.json");
            if let Ok(content) = tokio::fs::read_to_string(&settings_path).await {
                if let Ok(settings) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&content) {
                    if let Some(skipped_versions) = settings.get("skipped_versions") {
                        if let Some(skipped_array) = skipped_versions.as_array() {
                            return skipped_array.iter().any(|v| v.as_str() == Some(version));
                        }
                    }
                }
            }
        }
        Err(e) => {
            log::warn!("Failed to get config directory: {}", e);
        }
    }
    false
}

/// 跳过特定版本的更新
#[command]
pub async fn skip_version(app_handle: AppHandle, version: String) -> Result<(), String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))?;

    // 确保配置目录存在
    tokio::fs::create_dir_all(&config_dir)
        .await
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let settings_path = config_dir.join("updater_settings.json");
    
    // 读取现有设置
    let mut settings: HashMap<String, serde_json::Value> = if settings_path.exists() {
        let content = tokio::fs::read_to_string(&settings_path)
            .await
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings: {}", e))?
    } else {
        HashMap::new()
    };

    // 更新跳过的版本列表
    let mut skipped_versions: Vec<String> = if let Some(existing) = settings.get("skipped_versions") {
        if let Some(array) = existing.as_array() {
            array.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        } else {
            Vec::new()
        }
    } else {
        Vec::new()
    };

    if !skipped_versions.contains(&version) {
        skipped_versions.push(version);
    }

    settings.insert("skipped_versions".to_string(), serde_json::json!(skipped_versions));

    // 保存设置
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    tokio::fs::write(&settings_path, content)
        .await
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

/// 获取更新器设置
#[command]
pub async fn get_updater_settings(app_handle: AppHandle) -> Result<HashMap<String, serde_json::Value>, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))?;

    let settings_path = config_dir.join("updater_settings.json");
    
    if settings_path.exists() {
        let content = tokio::fs::read_to_string(&settings_path)
            .await
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        
        let settings: HashMap<String, serde_json::Value> = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse settings: {}", e))?;
        
        Ok(settings)
    } else {
        Ok(HashMap::new())
    }
}

/// 更新器设置
#[command]
pub async fn update_updater_settings(
    app_handle: AppHandle, 
    settings: HashMap<String, serde_json::Value>
) -> Result<HashMap<String, serde_json::Value>, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("Failed to get config directory: {}", e))?;

    // 确保配置目录存在
    tokio::fs::create_dir_all(&config_dir)
        .await
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let settings_path = config_dir.join("updater_settings.json");
    
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    tokio::fs::write(&settings_path, content)
        .await
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    // 返回保存的设置
    Ok(settings)
}

/// 读取发布说明文件
#[command]
pub async fn read_release_notes_file(path: String) -> Result<String, String> {
    let full_path = if path.starts_with("docs/") {
        // 相对于项目根目录的路径
        std::env::current_dir()
            .map_err(|e| format!("Failed to get current directory: {}", e))?
            .join(&path)
    } else {
        std::path::PathBuf::from(&path)
    };

    tokio::fs::read_to_string(&full_path)
        .await
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// 列出发布说明文件
#[command]
pub async fn list_release_notes_files() -> Result<Vec<String>, String> {
    let notes_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?
        .join("docs/release-notes");

    if !notes_dir.exists() {
        return Ok(vec![]);
    }

    let mut files = Vec::new();
    let mut entries = tokio::fs::read_dir(&notes_dir)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    while let Some(entry) = entries.next_entry()
        .await
        .map_err(|e| format!("Failed to read directory entry: {}", e))? {
        
        let path = entry.path();
        if path.is_file() && path.extension().map_or(false, |ext| ext == "md") {
            if let Some(file_name) = path.file_name() {
                if let Some(file_name_str) = file_name.to_str() {
                    files.push(file_name_str.to_string());
                }
            }
        }
    }

    files.sort();
    Ok(files)
}

/// 检查是否支持内置更新（仅Windows平台）
#[command]
pub fn is_builtin_update_supported() -> bool {
    cfg!(target_os = "windows")
}

/// 获取平台信息
#[command]
pub fn get_platform_info() -> HashMap<String, String> {
    let mut info = HashMap::new();
    info.insert("os".to_string(), std::env::consts::OS.to_string());
    info.insert("arch".to_string(), std::env::consts::ARCH.to_string());
    info.insert("family".to_string(), std::env::consts::FAMILY.to_string());
    info
}

/// 下载更新包（仅Windows平台）
#[command]
pub async fn download_update(
    app_handle: AppHandle,
    download_url: String,
    version: String,
) -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app_handle, download_url, version); // 避免未使用变量警告
        return Err("内置更新仅支持Windows平台".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::io::Write;
        use std::time::Instant;
        use tauri::Emitter;
        
        if download_url.is_empty() {
            return Err("下载URL不能为空".to_string());
        }

        // 获取临时下载目录
        let temp_dir = std::env::temp_dir();
        let download_dir = temp_dir.join("inflowave_updates");
        
        // 确保下载目录存在
        if let Err(e) = std::fs::create_dir_all(&download_dir) {
            return Err(format!("创建下载目录失败: {}", e));
        }

        // 从URL获取文件名，或使用默认名称
        let file_name = download_url
            .split('/')
            .last()
            .unwrap_or(&format!("InfloWave_{}.msi", version))
            .to_string();
        
        let file_path = download_dir.join(&file_name);

        // 如果文件已存在，先删除
        if file_path.exists() {
            if let Err(e) = std::fs::remove_file(&file_path) {
                log::warn!("删除已存在文件失败: {}", e);
            }
        }

        log::info!("开始下载更新包: {} -> {:?}", download_url, file_path);

        // 发送下载开始事件
        let _ = app_handle.emit("update-download-started", UpdateStatus {
            status: "downloading".to_string(),
            progress: None,
            message: "开始下载更新包...".to_string(),
            error: None,
        });

        // 创建HTTP客户端
        let client = reqwest::Client::new();
        let start_time = Instant::now();
        
        // 获取文件大小
        let response = client
            .get(&download_url)
            .header("User-Agent", USER_AGENT)
            .send()
            .await
            .map_err(|e| format!("下载请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("下载失败，HTTP状态码: {}", response.status()));
        }

        let total_size = response
            .content_length()
            .unwrap_or(0);

        log::info!("文件大小: {} bytes", total_size);

        // 创建文件
        let mut file = std::fs::File::create(&file_path)
            .map_err(|e| format!("创建文件失败: {}", e))?;

        // 分块下载
        let mut downloaded = 0u64;
        let mut last_progress_time = Instant::now();
        let mut stream = response.bytes_stream();

        use futures_util::StreamExt;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("下载数据失败: {}", e))?;
            
            file.write_all(&chunk)
                .map_err(|e| format!("写入文件失败: {}", e))?;
            
            downloaded += chunk.len() as u64;
            
            // 每500ms发送一次进度更新
            if last_progress_time.elapsed().as_millis() >= 500 {
                let elapsed_secs = start_time.elapsed().as_secs_f64();
                let speed = if elapsed_secs > 0.0 { downloaded as f64 / elapsed_secs } else { 0.0 };
                let percentage = if total_size > 0 { (downloaded as f64 / total_size as f64) * 100.0 } else { 0.0 };

                let progress = DownloadProgress {
                    downloaded,
                    total: total_size,
                    percentage,
                    speed,
                };

                let _ = app_handle.emit("update-download-progress", UpdateStatus {
                    status: "downloading".to_string(),
                    progress: Some(progress),
                    message: format!("下载中... {:.1}%", percentage),
                    error: None,
                });

                last_progress_time = Instant::now();
            }
        }

        // 确保文件写入完成
        file.flush().map_err(|e| format!("文件刷新失败: {}", e))?;
        drop(file);

        log::info!("下载完成: {:?}, 大小: {} bytes", file_path, downloaded);

        // 发送下载完成事件
        let _ = app_handle.emit("update-download-completed", UpdateStatus {
            status: "completed".to_string(),
            progress: Some(DownloadProgress {
                downloaded,
                total: total_size,
                percentage: 100.0,
                speed: 0.0,
            }),
            message: "下载完成".to_string(),
            error: None,
        });

        Ok(file_path.to_string_lossy().to_string())
    }
}

/// 安装更新包（仅Windows平台）
#[command]
pub async fn install_update(
    app_handle: AppHandle,
    file_path: String,
    silent: bool,
) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app_handle, file_path, silent); // 避免未使用变量警告
        return Err("内置更新仅支持Windows平台".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::path::PathBuf;
        use std::process::Command;
        use tauri::Emitter;
        
        let path = PathBuf::from(&file_path);
        
        if !path.exists() {
            return Err("安装文件不存在".to_string());
        }

        // 检查文件扩展名
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        log::info!("开始安装更新: {:?}, 文件类型: {}", path, extension);

        // 发送安装开始事件
        let _ = app_handle.emit("update-install-started", UpdateStatus {
            status: "installing".to_string(),
            progress: None,
            message: "开始安装更新...".to_string(),
            error: None,
        });

        let mut install_command = match extension.as_str() {
            "msi" => {
                let mut cmd = Command::new("msiexec");
                cmd.arg("/i").arg(&file_path);
                
                if silent {
                    cmd.arg("/quiet");
                } else {
                    cmd.arg("/qb"); // 基本UI
                }
                
                // 允许重启
                cmd.arg("/norestart");
                
                // 记录安装日志
                let log_path = std::env::temp_dir().join("inflowave_install.log");
                cmd.arg("/l*v").arg(&log_path);
                
                cmd
            },
            "exe" => {
                let mut cmd = Command::new(&file_path);
                
                if silent {
                    // 尝试常见的静默安装参数
                    cmd.arg("/S").arg("/silent").arg("/quiet");
                }
                
                cmd
            },
            _ => {
                return Err(format!("不支持的安装文件类型: {}", extension));
            }
        };

        // 执行安装命令
        log::info!("执行安装命令: {:?}", install_command);
        
        let output = install_command
            .output()
            .map_err(|e| format!("启动安装程序失败: {}", e))?;

        let exit_code = output.status.code().unwrap_or(-1);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        log::info!("安装完成，退出码: {}", exit_code);
        log::info!("安装输出: {}", stdout);
        if !stderr.is_empty() {
            log::warn!("安装错误: {}", stderr);
        }

        if output.status.success() || exit_code == 3010 { // 3010 表示需要重启
            let message = if exit_code == 3010 {
                "安装完成，需要重启系统以完成更新"
            } else {
                "安装完成"
            };

            // 发送安装成功事件
            let _ = app_handle.emit("update-install-completed", UpdateStatus {
                status: "completed".to_string(),
                progress: None,
                message: message.to_string(),
                error: None,
            });

            // 清理下载的安装文件
            if let Err(e) = std::fs::remove_file(&path) {
                log::warn!("清理安装文件失败: {}", e);
            }

            Ok(())
        } else {
            let error_msg = if !stderr.is_empty() {
                format!("安装失败 (退出码: {}): {}", exit_code, stderr)
            } else {
                format!("安装失败，退出码: {}", exit_code)
            };

            // 发送安装失败事件
            let _ = app_handle.emit("update-install-error", UpdateStatus {
                status: "error".to_string(),
                progress: None,
                message: "安装失败".to_string(),
                error: Some(error_msg.clone()),
            });

            Err(error_msg)
        }
    }
}

/// 下载并安装更新（Windows内置更新的完整流程）
#[command]
pub async fn download_and_install_update(
    app_handle: AppHandle,
    download_url: String,
    version: String,
    silent: bool,
) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app_handle, download_url, version, silent); // 避免未使用变量警告
        return Err("内置更新仅支持Windows平台".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        // 第一步：下载更新包
        let file_path = download_update(app_handle.clone(), download_url, version).await?;
        
        // 等待一段时间确保下载完全完成
        tokio::time::sleep(std::time::Duration::from_millis(1000)).await;
        
        // 第二步：安装更新包
        install_update(app_handle, file_path, silent).await?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_comparison() {
        assert_eq!(compare_versions("1.0.0", "1.0.1").unwrap(), 1);
        assert_eq!(compare_versions("1.0.1", "1.0.0").unwrap(), -1);
        assert_eq!(compare_versions("1.0.0", "1.0.0").unwrap(), 0);
        assert_eq!(compare_versions("v1.0.0", "v1.1.0").unwrap(), 1);
        assert_eq!(compare_versions("2.0.0", "1.9.9").unwrap(), -1);
    }

    #[test]
    fn test_find_platform_asset() {
        // 使用真实的文件名格式进行测试
        let assets = vec![
            GitHubAsset {
                name: "InfloWave_0.1.3_x64_zh-CN.msi".to_string(),
                browser_download_url: "https://example.com/windows-zh.msi".to_string(),
                size: 1024,
                content_type: "application/x-msi".to_string(),
            },
            GitHubAsset {
                name: "InfloWave_0.1.3_x64-setup.exe".to_string(),
                browser_download_url: "https://example.com/windows-setup.exe".to_string(),
                size: 1536,
                content_type: "application/x-executable".to_string(),
            },
            GitHubAsset {
                name: "InfloWave_0.1.3_aarch64.dmg".to_string(),
                browser_download_url: "https://example.com/macos-arm.dmg".to_string(),
                size: 2048,
                content_type: "application/x-apple-diskimage".to_string(),
            },
            GitHubAsset {
                name: "InfloWave_0.1.3_x64.dmg".to_string(),
                browser_download_url: "https://example.com/macos-intel.dmg".to_string(),
                size: 2560,
                content_type: "application/x-apple-diskimage".to_string(),
            },
            GitHubAsset {
                name: "InfloWave_0.1.3_amd64.deb".to_string(),
                browser_download_url: "https://example.com/linux.deb".to_string(),
                size: 3072,
                content_type: "application/vnd.debian.binary-package".to_string(),
            },
            GitHubAsset {
                name: "InfloWave_0.1.3_amd64.AppImage".to_string(),
                browser_download_url: "https://example.com/linux.AppImage".to_string(),
                size: 4096,
                content_type: "application/x-executable".to_string(),
            },
            GitHubAsset {
                name: "InfloWave-0.1.3-1.x86_64.rpm".to_string(),
                browser_download_url: "https://example.com/linux.rpm".to_string(),
                size: 4608,
                content_type: "application/x-rpm".to_string(),
            },
        ];

        let result = find_platform_asset(&assets);
        assert!(result.is_some());
        
        // 测试应该找到与当前平台匹配的资源
        let result_url = result.unwrap();
        println!("Found asset URL: {}", result_url);
        
        // 验证 URL 不为空且是有效的下载链接
        assert!(result_url.starts_with("https://"));
        assert!(result_url.contains("example.com"));
    }
}