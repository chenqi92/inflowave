use serde::{Deserialize, Serialize};
use tauri::State;
use log::{debug, error, info, warn};
use std::sync::Mutex;
use crate::utils::persistence::PersistenceManagerState;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub editor: EditorSettings,
    pub query: QuerySettings,
    pub visualization: VisualizationSettings,
    pub security: SecuritySettings,
    pub monitoring: MonitoringSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralSettings {
    pub theme: String,
    pub language: String,
    pub auto_save: bool,
    pub auto_connect: bool,
    pub startup_connection: Option<String>,
    pub show_internal_databases: bool,
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
    pub enable_lazy_loading: bool,
    pub lazy_loading_batch_size: u32,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MonitoringSettings {
    pub default_mode: String, // "local" or "remote"
    pub auto_refresh_interval: u32, // milliseconds
    pub enable_auto_refresh: bool,
    pub remote_metrics_timeout: u32, // milliseconds
    pub fallback_to_local: bool,
}

pub type SettingsStorage = Mutex<AppSettings>;

/// 持久化设置到文件的辅助函数
fn persist_settings(
    persistence: &State<'_, PersistenceManagerState>,
    settings: &AppSettings,
) -> Result<(), String> {
    let persistence_manager = persistence.lock().map_err(|e| {
        error!("获取持久化管理器锁失败: {}", e);
        "持久化管理器访问失败".to_string()
    })?;

    persistence_manager.write_json("app_settings.json", settings).map_err(|e| {
        error!("保存应用设置到文件失败: {}", e);
        format!("保存设置失败: {}", e)
    })?;

    debug!("应用设置已持久化到文件");
    Ok(())
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            general: GeneralSettings {
                theme: "system".to_string(),
                // 默认语言设置为中文
                language: "zh-CN".to_string(),
                auto_save: true,
                auto_connect: false,
                startup_connection: None,
                show_internal_databases: false,
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
                enable_lazy_loading: true,
                lazy_loading_batch_size: 500,
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
            monitoring: MonitoringSettings {
                default_mode: "remote".to_string(), // 默认远程监控模式
                auto_refresh_interval: 30000, // 30秒自动刷新
                enable_auto_refresh: true,
                remote_metrics_timeout: 10000, // 10秒超时
                fallback_to_local: true, // 远程失败时回退到本地监控
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
    persistence: State<'_, PersistenceManagerState>,
    new_settings: AppSettings,
) -> Result<(), String> {
    debug!("更新应用设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    *settings = new_settings.clone();
    info!("应用设置已更新");

    // 持久化到文件
    persist_settings(&persistence, &new_settings)?;
    Ok(())
}

/// 重置应用设置为默认值
#[tauri::command]
pub async fn reset_app_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
) -> Result<AppSettings, String> {
    debug!("重置应用设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    *settings = AppSettings::default();
    info!("应用设置已重置为默认值");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;

    Ok(settings.clone())
}

/// 更新通用设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_general_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    general_settings: GeneralSettings,
) -> Result<(), String> {
    debug!("更新通用设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.general = general_settings;
    info!("通用设置已更新");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
    Ok(())
}

/// 更新编辑器设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_editor_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    editor_settings: EditorSettings,
) -> Result<(), String> {
    debug!("更新编辑器设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.editor = editor_settings;
    info!("编辑器设置已更新");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
    Ok(())
}

/// 获取查询设置
#[tauri::command]
pub async fn get_query_settings(
    settings_storage: State<'_, SettingsStorage>,
) -> Result<QuerySettings, String> {
    debug!("获取查询设置");

    let settings = settings_storage.lock().map_err(|e| {
        error!("获取设置锁失败: {}", e);
        "获取设置锁失败".to_string()
    })?;

    Ok(settings.query.clone())
}

/// 更新查询设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_query_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    query_settings: QuerySettings,
) -> Result<(), String> {
    debug!("更新查询设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.query = query_settings;
    info!("查询设置已更新");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
    Ok(())
}

/// 更新可视化设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_visualization_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    visualization_settings: VisualizationSettings,
) -> Result<(), String> {
    debug!("更新可视化设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.visualization = visualization_settings;
    info!("可视化设置已更新");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
    Ok(())
}

/// 更新安全设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_security_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    security_settings: SecuritySettings,
) -> Result<(), String> {
    debug!("更新安全设置");
    
    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.security = security_settings;
    info!("安全设置已更新");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
    Ok(())
}

/// 导出设置到文件
#[tauri::command]
pub async fn export_settings(
    app: tauri::AppHandle,
    settings_storage: State<'_, SettingsStorage>,
    connection_service: State<'_, crate::services::ConnectionService>,
    user_preferences_storage: State<'_, crate::commands::user_experience::UserPreferencesStorage>,
) -> Result<(), String> {
    debug!("导出设置到文件");

    // 克隆设置以避免跨await持有锁
    let settings_clone = {
        let settings = settings_storage.lock().map_err(|e| {
            error!("获取设置存储锁失败: {}", e);
            "存储访问失败".to_string()
        })?;
        settings.clone()
    };

    // 获取连接配置
    let connections = connection_service.get_all_connections().await.map_err(|e| {
        error!("获取连接配置失败: {}", e);
        format!("获取连接配置失败: {}", e)
    })?;

    // 获取用户偏好设置
    let user_preferences = {
        let prefs = user_preferences_storage.lock().map_err(|e| {
            error!("获取用户偏好存储锁失败: {}", e);
            "用户偏好访问失败".to_string()
        })?;
        prefs.clone()
    };

    // 创建导出数据结构，包含版本信息和时间戳
    let export_data = serde_json::json!({
        "version": "1.0.0",
        "exportTime": chrono::Utc::now().to_rfc3339(),
        "appSettings": settings_clone,
        "connections": connections,
        "userPreferences": user_preferences,
        "metadata": {
            "application": "InfloWave",
            "description": "InfloWave完整应用配置文件"
        }
    });

    let settings_json = serde_json::to_string_pretty(&export_data).map_err(|e| {
        error!("序列化设置失败: {}", e);
        "导出设置失败".to_string()
    })?;

    // 使用文件保存对话框
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();
    dialog = dialog.set_title("导出配置文件");
    dialog = dialog.add_filter("配置文件", &["json"]);
    dialog = dialog.add_filter("所有文件", &["*"]);

    // 设置默认文件名
    let default_filename = format!("inflowave-config-{}.json",
        chrono::Local::now().format("%Y%m%d-%H%M%S"));
    dialog = dialog.set_file_name(&default_filename);

    match dialog.blocking_save_file() {
        Some(file_path) => {
            let path_str = file_path.as_path()
                .ok_or("无效的文件路径")?
                .to_string_lossy()
                .to_string();

            // 写入文件
            std::fs::write(&path_str, settings_json).map_err(|e| {
                error!("写入配置文件失败: {}: {}", path_str, e);
                format!("写入文件失败: {}", e)
            })?;

            info!("配置已导出到: {}", path_str);
            Ok(())
        }
        None => {
            info!("用户取消了配置导出");
            Err("用户取消了导出操作".to_string())
        }
    }
}

/// 从文件导入设置
#[tauri::command]
pub async fn import_settings(
    app: tauri::AppHandle,
    settings_storage: State<'_, SettingsStorage>,
    connection_service: State<'_, crate::services::ConnectionService>,
    user_preferences_storage: State<'_, crate::commands::user_experience::UserPreferencesStorage>,
) -> Result<AppSettings, String> {
    debug!("从文件导入设置");

    // 使用文件打开对话框
    use tauri_plugin_dialog::DialogExt;

    let mut dialog = app.dialog().file();
    dialog = dialog.set_title("导入配置文件");
    dialog = dialog.add_filter("配置文件", &["json"]);
    dialog = dialog.add_filter("所有文件", &["*"]);

    match dialog.blocking_pick_file() {
        Some(file_path) => {
            let path_str = file_path.as_path()
                .ok_or("无效的文件路径")?
                .to_string_lossy()
                .to_string();

            // 读取文件内容
            let file_content = std::fs::read_to_string(&path_str).map_err(|e| {
                error!("读取配置文件失败: {}: {}", path_str, e);
                format!("读取文件失败: {}", e)
            })?;

            // 尝试解析为新格式（包含版本信息）
            if let Ok(export_data) = serde_json::from_str::<serde_json::Value>(&file_content) {
                let new_settings: AppSettings = if export_data.get("appSettings").is_some() {
                    // 新格式：包含版本信息和元数据
                    serde_json::from_value(export_data["appSettings"].clone()).map_err(|e| {
                        error!("解析新格式配置失败: {}", e);
                        "配置文件格式错误".to_string()
                    })?
                } else {
                    // 旧格式：直接是设置对象
                    serde_json::from_value(export_data.clone()).map_err(|e| {
                        error!("解析旧格式配置失败: {}", e);
                        "配置文件格式错误".to_string()
                    })?
                };

                // 如果配置文件包含连接信息，先导入连接配置
                if let Some(connections_value) = export_data.get("connections") {
                    if let Ok(connections) = serde_json::from_value::<Vec<crate::models::ConnectionConfig>>(connections_value.clone()) {
                        info!("导入 {} 个连接配置", connections.len());

                        // 清除现有连接配置
                        if let Err(e) = connection_service.clear_all_connections().await {
                            error!("清除现有连接配置失败: {}", e);
                        }

                        // 导入新的连接配置
                        for connection in connections {
                            if let Err(e) = connection_service.create_connection(connection.clone()).await {
                                error!("导入连接配置失败: {} - {}", connection.name, e);
                            } else {
                                info!("成功导入连接配置: {}", connection.name);
                            }
                        }
                    } else {
                        warn!("连接配置格式错误，跳过连接配置导入");
                    }
                }

                // 导入用户偏好设置
                if let Some(user_prefs_value) = export_data.get("userPreferences") {
                    if let Ok(user_prefs) = serde_json::from_value::<crate::commands::user_experience::UserPreferences>(user_prefs_value.clone()) {
                        info!("导入用户偏好设置");
                        let mut prefs_storage = user_preferences_storage.lock().map_err(|e| {
                            error!("获取用户偏好存储锁失败: {}", e);
                            "用户偏好访问失败".to_string()
                        })?;
                        *prefs_storage = user_prefs;
                        info!("用户偏好设置导入成功");
                    } else {
                        warn!("用户偏好设置格式错误，跳过导入");
                    }
                }



                // 更新应用设置
                {
                    let mut settings = settings_storage.lock().map_err(|e| {
                        error!("获取设置存储锁失败: {}", e);
                        "存储访问失败".to_string()
                    })?;
                    *settings = new_settings.clone();
                }

                info!("完整配置导入成功: {}", path_str);
                Ok(new_settings)
            } else {
                Err("配置文件格式无效".to_string())
            }
        }
        None => {
            info!("用户取消了配置导入");
            Err("用户取消了导入操作".to_string())
        }
    }
}

/// 获取设置模式列表
#[tauri::command]
pub async fn get_settings_schema() -> Result<serde_json::Value, String> {
    debug!("获取设置模式");
    
    let schema = serde_json::json!({
        "themes": ["light", "dark", "system"],
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

/// 重置所有配置为默认值
#[tauri::command]
pub async fn reset_all_settings(
    settings_storage: State<'_, SettingsStorage>,
    user_preferences_storage: State<'_, crate::commands::user_experience::UserPreferencesStorage>,
) -> Result<AppSettings, String> {
    debug!("重置所有配置为默认值");

    // 重置应用设置
    let default_settings = AppSettings::default();
    {
        let mut settings = settings_storage.lock().map_err(|e| {
            error!("获取设置存储锁失败: {}", e);
            "存储访问失败".to_string()
        })?;
        *settings = default_settings.clone();
    }

    // 重置用户偏好设置
    {
        let mut prefs = user_preferences_storage.lock().map_err(|e| {
            error!("获取用户偏好存储锁失败: {}", e);
            "用户偏好访问失败".to_string()
        })?;
        *prefs = crate::commands::user_experience::UserPreferences::default();
    }

    info!("所有配置已重置为默认值");
    Ok(default_settings)
}

/// 更新控制器设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_controller_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    controller_settings: ControllerSettings,
) -> Result<(), String> {
    debug!("更新控制器设置: {:?}", controller_settings);

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置锁失败: {}", e);
        "获取设置锁失败".to_string()
    })?;

    settings.security.controller = controller_settings;

    info!("控制器设置更新成功");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
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

/// 更新监控设置
#[tauri::command(rename_all = "camelCase")]
pub async fn update_monitoring_settings(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    monitoring_settings: MonitoringSettings,
) -> Result<(), String> {
    debug!("更新监控设置");

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.monitoring = monitoring_settings;
    info!("监控设置已更新");

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
    Ok(())
}

/// 获取监控设置
#[tauri::command]
pub async fn get_monitoring_settings(
    settings_storage: State<'_, SettingsStorage>,
) -> Result<MonitoringSettings, String> {
    debug!("获取监控设置");

    let settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    Ok(settings.monitoring.clone())
}

/// 保存语言偏好设置
/// 仅更新语言设置，不影响其他设置
#[tauri::command]
pub async fn save_language_preference(
    settings_storage: State<'_, SettingsStorage>,
    persistence: State<'_, PersistenceManagerState>,
    language: String,
) -> Result<(), String> {
    info!("保存语言偏好: {}", language);

    // 验证语言代码
    let valid_languages = ["zh-CN", "en-US"];
    if !valid_languages.contains(&language.as_str()) {
        warn!("无效的语言代码: {}", language);
        return Err(format!("不支持的语言: {}", language));
    }

    let mut settings = settings_storage.lock().map_err(|e| {
        error!("获取设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    settings.general.language = language.clone();
    info!("语言偏好已更新: {}", language);

    // 持久化到文件
    persist_settings(&persistence, &settings)?;
    Ok(())
}

/// 更新应用菜单语言
#[tauri::command]
pub async fn update_menu_language(
    app: tauri::AppHandle,
    settings_storage: State<'_, SettingsStorage>,
    language: String,
) -> Result<(), String> {
    info!("更新菜单语言: {}", language);

    // 获取当前设置并立即克隆
    let settings_clone = {
        let settings = settings_storage.lock().map_err(|e| {
            error!("获取设置存储锁失败: {}", e);
            "获取设置失败".to_string()
        })?;
        settings.clone()
    }; // 锁在这里自动释放

    // 在后台线程中执行菜单更新，避免阻塞 UI
    let app_clone = app.clone();
    let language_clone = language.clone();

    tokio::task::spawn_blocking(move || {
        // 添加微小延迟，让前端 UI 先完成渲染
        // 这样可以减少视觉上的不协调感
        std::thread::sleep(std::time::Duration::from_millis(50));

        // 重新创建菜单
        let menu = crate::create_native_menu(&app_clone, &language_clone, &settings_clone)
            .map_err(|e| {
                error!("创建菜单失败: {}", e);
                format!("创建菜单失败: {}", e)
            })?;

        // 设置新菜单
        // 注意：在 Windows 上，set_menu 会导致菜单短暂消失再出现
        // 这是 Tauri/Windows 原生菜单 API 的限制
        // 菜单必须先移除再添加，无法"就地更新"文本
        app_clone.set_menu(menu)
            .map_err(|e| {
                error!("设置菜单失败: {}", e);
                format!("设置菜单失败: {}", e)
            })?;

        info!("菜单语言更新成功");
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| {
        error!("菜单更新任务失败: {}", e);
        format!("菜单更新任务失败: {}", e)
    })?
}
