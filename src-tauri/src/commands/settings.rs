use serde::{Deserialize, Serialize};
use tauri::State;
use log::{debug, error, info};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub editor: EditorSettings,
    pub query: QuerySettings,
    pub visualization: VisualizationSettings,
    pub security: SecuritySettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralSettings {
    pub theme: String,
    pub language: String,
    pub auto_save: bool,
    pub auto_connect: bool,
    pub startup_connection: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EditorSettings {
    pub font_size: u32,
    pub font_family: String,
    pub tab_size: u32,
    pub word_wrap: bool,
    pub line_numbers: bool,
    pub minimap: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QuerySettings {
    pub timeout: u32,
    pub max_results: u32,
    pub auto_complete: bool,
    pub syntax_highlight: bool,
    pub format_on_save: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VisualizationSettings {
    pub default_chart_type: String,
    pub refresh_interval: u32,
    pub max_data_points: u32,
    pub color_scheme: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecuritySettings {
    pub encrypt_connections: bool,
    pub session_timeout: u32,
    pub require_confirmation: bool,
    pub controller: ControllerSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ControllerSettings {
    pub allow_delete_statements: bool,
    pub allow_drop_statements: bool,
    pub allow_dangerous_operations: bool,
    pub require_confirmation_for_delete: bool,
    pub require_confirmation_for_drop: bool,
}

pub type SettingsStorage = Mutex<AppSettings>;

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            general: GeneralSettings {
                theme: "auto".to_string(),
                language: "zh-CN".to_string(),
                auto_save: true,
                auto_connect: false,
                startup_connection: None,
            },
            editor: EditorSettings {
                font_size: 14,
                font_family: "Monaco, 'Courier New', monospace".to_string(),
                tab_size: 2,
                word_wrap: true,
                line_numbers: true,
                minimap: true,
            },
            query: QuerySettings {
                timeout: 30000,
                max_results: 10000,
                auto_complete: true,
                syntax_highlight: true,
                format_on_save: false,
            },
            visualization: VisualizationSettings {
                default_chart_type: "line".to_string(),
                refresh_interval: 5000,
                max_data_points: 1000,
                color_scheme: "default".to_string(),
            },
            security: SecuritySettings {
                encrypt_connections: true,
                session_timeout: 3600,
                require_confirmation: true,
                controller: ControllerSettings {
                    allow_delete_statements: false,  // 默认不允许DELETE语句
                    allow_drop_statements: false,    // 默认不允许DROP语句
                    allow_dangerous_operations: false, // 默认不允许危险操作
                    require_confirmation_for_delete: true,
                    require_confirmation_for_drop: true,
                },
            },
        }
    }
}

/// 获取应用设置
#[tauri::command]
pub async fn get_app_settings(
    settings_storage: State<'_, SettingsStorage>,
) -> Result<AppSettings, String> {
    debug!("获取应用设置");
    
    let settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    Ok(settings.clone())
}

/// 更新应用设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_app_settings(
    settings_storage: State<'_, SettingsStorage>,
    new_settings: AppSettings,
) -> Result<(), String> {
    debug!("更新应用设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    *settings = new_settings;
    info!("应用设置已更新");
    Ok(())
}

/// 重置应用设置为默认值
#[tauri::command]
pub async fn reset_app_settings(
    settings_storage: State<'_, SettingsStorage>,
) -> Result<AppSettings, String> {
    debug!("重置应用设置");
    
    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    *settings = AppSettings::default();
    info!("应用设置已重置为默认值");
    Ok(settings.clone())
}

/// 更新通用设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_general_settings(
    settings_storage: State<'_, SettingsStorage>,
    general_settings: GeneralSettings,
) -> Result<(), String> {
    debug!("更新通用设置");
    
    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.general = general_settings;
    info!("通用设置已更新");
    Ok(())
}

/// 更新编辑器设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_editor_settings(
    settings_storage: State<'_, SettingsStorage>,
    editor_settings: EditorSettings,
) -> Result<(), String> {
    debug!("更新编辑器设置");
    
    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.editor = editor_settings;
    info!("编辑器设置已更新");
    Ok(())
}

/// 更新查询设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_query_settings(
    settings_storage: State<'_, SettingsStorage>,
    query_settings: QuerySettings,
) -> Result<(), String> {
    debug!("更新查询设置");
    
    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.query = query_settings;
    info!("查询设置已更新");
    Ok(())
}

/// 更新可视化设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_visualization_settings(
    settings_storage: State<'_, SettingsStorage>,
    visualization_settings: VisualizationSettings,
) -> Result<(), String> {
    debug!("更新可视化设置");
    
    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.visualization = visualization_settings;
    info!("可视化设置已更新");
    Ok(())
}

/// 更新安全设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_security_settings(
    settings_storage: State<'_, SettingsStorage>,
    security_settings: SecuritySettings,
) -> Result<(), String> {
    debug!("更新安全设置");
    
    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.security = security_settings;
    info!("安全设置已更新");
    Ok(())
}

/// 导出设置
#[tauri::command]
pub async fn export_settings(
    settings_storage: State<'_, SettingsStorage>,
) -> Result<String, String> {
    debug!("导出设置");
    
    let settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    serde_json::to_string_pretty(&*settings).map_err(|e| {
        error!("序列化设置失败: {}", e);
        "导出设置失败".to_string()
    })
}

/// 导入设置
#[tauri::command(rename_all = "camelCase")]
pub async fn import_settings(
    settings_storage: State<'_, SettingsStorage>,
    settings_json: String,
) -> Result<(), String> {
    debug!("导入设置");
    
    let new_settings: AppSettings = serde_json::from_str(&settings_json).map_err(|e| {
        error!("反序列化设置失败: {}", e);
        "导入设置失败：格式错误".to_string()
    })?;

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    *settings = new_settings;
    info!("设置导入成功");
    Ok(())
}

/// 获取设置模式列表
#[tauri::command]
pub async fn get_settings_schema() -> Result<serde_json::Value, String> {
    debug!("获取设置模式");
    
    let schema = serde_json::json!({
        "themes": ["light", "dark", "auto"],
        "languages": ["zh-CN", "en-US"],
        "chart_types": ["line", "bar", "pie", "area", "scatter"],
        "color_schemes": ["default", "blue", "green", "purple", "orange"],
        "font_families": [
            "Monaco, 'Courier New', monospace",
            "'Fira Code', monospace",
            "'Source Code Pro', monospace",
            "'JetBrains Mono', monospace"
        ],
        "font_sizes": [10, 12, 14, 16, 18, 20, 24],
        "tab_sizes": [2, 4, 8],
        "timeout_options": [5000, 10000, 30000, 60000, 120000],
        "max_results_options": [1000, 5000, 10000, 50000, 100000],
        "refresh_intervals": [1000, 2000, 5000, 10000, 30000, 60000],
        "session_timeouts": [300, 600, 1800, 3600, 7200]
    });

    Ok(schema)
}

/// 更新控制器设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_controller_settings(
    settings_storage: State<'_, SettingsStorage>,
    controller_settings: ControllerSettings,
) -> Result<(), String> {
    debug!("更新控制器设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置锁失败: {}", e);
        "获取设置锁失败".to_string()
    })?;

    settings.security.controller = controller_settings;

    info!("控制器设置更新成功");
    Ok(())
}

/// 获取控制器设置
#[tauri::command]
pub async fn get_controller_settings(
    settings_storage: State<'_, SettingsStorage>,
) -> Result<ControllerSettings, String> {
    debug!("获取控制器设置");

    let settings = settings_storage.lock().map_err(|e| {
        error!("获取设置锁失败: {}", e);
        "获取设置锁失败".to_string()
    })?;

    Ok(settings.security.controller.clone())
}
