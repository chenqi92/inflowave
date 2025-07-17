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

const GITHUB_API_URL: &str = "https://api.github.com/repos/chenqi92/inflowave/releases";
const USER_AGENT: &str = "InfloWave-Updater/1.0";

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
    
    let response = client
        .get(&format!("{}/latest", GITHUB_API_URL))
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .context("Failed to fetch release information")?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "GitHub API request failed with status: {}", 
            response.status()
        ));
    }

    let release: GitHubRelease = response
        .json()
        .await
        .context("Failed to parse release JSON")?;

    Ok(release)
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
    
    // 定义平台特定的文件扩展名和标识符
    let platform_patterns = match platform {
        "windows" => match arch {
            "x86_64" => vec!["x64.msi", "x64.exe", "win64", "windows-x64"],
            "x86" => vec!["x86.msi", "x86.exe", "win32", "windows-x86"],
            _ => vec!["msi", "exe", "windows"],
        },
        "macos" => match arch {
            "aarch64" => vec!["aarch64.dmg", "arm64.dmg", "macos-arm64"],
            "x86_64" => vec!["x64.dmg", "intel.dmg", "macos-x64"],
            _ => vec!["dmg", "macos"],
        },
        "linux" => match arch {
            "x86_64" => vec!["x86_64.AppImage", "x64.AppImage", "amd64.deb", "x86_64.rpm"],
            "aarch64" => vec!["aarch64.AppImage", "arm64.AppImage", "arm64.deb", "aarch64.rpm"],
            _ => vec!["AppImage", "deb", "rpm"],
        },
        _ => vec![],
    };

    // 查找匹配的资源
    for pattern in platform_patterns {
        if let Some(asset) = assets.iter().find(|asset| {
            asset.name.to_lowercase().contains(&pattern.to_lowercase())
        }) {
            return Some(asset.browser_download_url.clone());
        }
    }

    // 如果没有找到特定平台的资源，返回第一个资源
    assets.first().map(|asset| asset.browser_download_url.clone())
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
) -> Result<(), String> {
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

    Ok(())
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
        let assets = vec![
            GitHubAsset {
                name: "inflowave-windows-x64.msi".to_string(),
                browser_download_url: "https://example.com/windows.msi".to_string(),
                size: 1024,
                content_type: "application/x-msi".to_string(),
            },
            GitHubAsset {
                name: "inflowave-macos-arm64.dmg".to_string(),
                browser_download_url: "https://example.com/macos.dmg".to_string(),
                size: 2048,
                content_type: "application/x-apple-diskimage".to_string(),
            },
        ];

        let result = find_platform_asset(&assets);
        assert!(result.is_some());
    }
}