use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, State, Window};
use tauri_plugin_notification::NotificationExt;
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeyboardShortcut {
    pub id: String,
    pub name: String,
    pub description: String,
    pub keys: Vec<String>,
    pub category: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPreferences {
    pub shortcuts: Vec<KeyboardShortcut>,
    pub notifications: NotificationSettings,
    pub accessibility: AccessibilitySettings,
    pub workspace: WorkspaceSettings,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NotificationSettings {
    pub enabled: bool,
    pub query_completion: bool,
    pub connection_status: bool,
    pub system_alerts: bool,
    pub export_completion: bool,
    pub sound: bool,
    pub desktop: bool,
    pub position: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccessibilitySettings {
    pub high_contrast: bool,
    pub font_size: String,
    pub font_family: String,
    pub reduced_motion: bool,
    pub screen_reader: bool,
    pub keyboard_navigation: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceSettings {
    pub layout: String,
    pub panel_sizes: HashMap<String, f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub panel_positions: Option<HashMap<String, f64>>,
    pub open_tabs: Vec<String>,
    pub pinned_queries: Vec<String>,
    pub recent_files: Vec<String>,
    pub restore_tabs_on_startup: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationRequest {
    pub title: String,
    pub message: String,
    pub notification_type: String, // 'info', 'success', 'warning', 'error'
    pub duration: Option<u32>,
    pub actions: Option<Vec<NotificationAction>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NotificationAction {
    pub id: String,
    pub label: String,
    pub action_type: String,
}

// 存储
pub type UserPreferencesStorage = Mutex<UserPreferences>;
pub type NotificationQueue = Mutex<Vec<NotificationRequest>>;

/// 获取用户偏好设置
#[tauri::command]
pub async fn get_user_preferences(
    preferences_storage: State<'_, UserPreferencesStorage>,
) -> Result<UserPreferences, String> {
    debug!("获取用户偏好设置");
    
    let storage = preferences_storage.lock().map_err(|e| {
        error!("获取偏好设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    Ok(storage.clone())
}

/// 更新用户偏好设置
#[tauri::command]
pub async fn update_user_preferences(
    preferences_storage: State<'_, UserPreferencesStorage>,
    preferences: UserPreferences,
) -> Result<(), String> {
    use std::sync::atomic::{AtomicU64, AtomicU32, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    // 使用原子类型替代可变静态变量，避免 unsafe 代码
    static LAST_CALL_TIME: AtomicU64 = AtomicU64::new(0);
    static CALL_COUNT: AtomicU32 = AtomicU32::new(0);

    // 添加调用频率监控
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let call_count = CALL_COUNT.fetch_add(1, Ordering::Relaxed) + 1;
    let last_time = LAST_CALL_TIME.swap(now, Ordering::Relaxed);
    let time_diff = now.saturating_sub(last_time);

    if time_diff < 5 && last_time > 0 {
        warn!("用户偏好更新过于频繁! 距离上次调用仅{}秒，总调用次数: {}", time_diff, call_count);
    }

    // 每100次调用输出一次统计
    if call_count % 100 == 0 {
        info!("用户偏好更新统计: 总调用次数 {}", call_count);
    }

    let mut storage = preferences_storage.lock().map_err(|e| {
        error!("获取偏好设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    *storage = preferences;
    Ok(())
}

/// 获取默认键盘快捷键
#[tauri::command]
pub async fn get_default_shortcuts() -> Result<Vec<KeyboardShortcut>, String> {
    debug!("获取默认键盘快捷键");
    
    let shortcuts = vec![
        KeyboardShortcut {
            id: "new_connection".to_string(),
            name: "新建连接".to_string(),
            description: "创建新的数据库连接".to_string(),
            keys: vec!["Ctrl".to_string(), "N".to_string()],
            category: "连接".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "execute_query".to_string(),
            name: "执行查询".to_string(),
            description: "执行当前查询".to_string(),
            keys: vec!["Ctrl".to_string(), "Enter".to_string()],
            category: "查询".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "save_query".to_string(),
            name: "保存查询".to_string(),
            description: "保存当前查询".to_string(),
            keys: vec!["Ctrl".to_string(), "S".to_string()],
            category: "查询".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "format_query".to_string(),
            name: "格式化查询".to_string(),
            description: "格式化当前查询语句".to_string(),
            keys: vec!["Ctrl".to_string(), "Shift".to_string(), "F".to_string()],
            category: "查询".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "toggle_sidebar".to_string(),
            name: "切换侧边栏".to_string(),
            description: "显示/隐藏侧边栏".to_string(),
            keys: vec!["Ctrl".to_string(), "B".to_string()],
            category: "界面".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "open_settings".to_string(),
            name: "打开设置".to_string(),
            description: "打开应用设置".to_string(),
            keys: vec!["Ctrl".to_string(), ",".to_string()],
            category: "界面".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "search_global".to_string(),
            name: "全局搜索".to_string(),
            description: "打开全局搜索".to_string(),
            keys: vec!["Ctrl".to_string(), "Shift".to_string(), "P".to_string()],
            category: "搜索".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "export_data".to_string(),
            name: "导出数据".to_string(),
            description: "导出查询结果".to_string(),
            keys: vec!["Ctrl".to_string(), "E".to_string()],
            category: "数据".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "refresh_data".to_string(),
            name: "刷新数据".to_string(),
            description: "刷新当前数据".to_string(),
            keys: vec!["F5".to_string()],
            category: "数据".to_string(),
            enabled: true,
        },
        KeyboardShortcut {
            id: "close_tab".to_string(),
            name: "关闭标签页".to_string(),
            description: "关闭当前标签页".to_string(),
            keys: vec!["Ctrl".to_string(), "W".to_string()],
            category: "界面".to_string(),
            enabled: true,
        },
    ];
    
    Ok(shortcuts)
}

/// 发送通知
#[tauri::command]
pub async fn send_notification(
    window: Window,
    preferences_storage: State<'_, UserPreferencesStorage>,
    notification: NotificationRequest,
) -> Result<(), String> {
    debug!("发送通知: {}", notification.title);
    
    let preferences = preferences_storage.lock().map_err(|e| {
        error!("获取偏好设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    if !preferences.notifications.enabled {
        return Ok(());
    }
    
    // 检查特定类型的通知是否启用
    let should_send = match notification.notification_type.as_str() {
        "query_completion" => preferences.notifications.query_completion,
        "connection_status" => preferences.notifications.connection_status,
        "system_alert" => preferences.notifications.system_alerts,
        "export_completion" => preferences.notifications.export_completion,
        _ => true,
    };
    
    if !should_send {
        return Ok(());
    }
    
    // 发送到前端
    window.emit("notification", &notification).map_err(|e| {
        error!("发送通知失败: {}", e);
        "发送通知失败".to_string()
    })?;
    
    // 如果启用了桌面通知，发送系统桌面通知
    if preferences.notifications.desktop {
        info!("桌面通知: {} - {}", notification.title, notification.message);
        
        // 使用 Tauri 的通知插件发送桌面通知
        let app_handle = window.app_handle();
        
        // 构建通知内容
        match app_handle.notification()
            .builder()
            .title(&notification.title)
            .body(&notification.message)
            .show() {
            Ok(_) => {
                info!("桌面通知发送成功: {}", notification.title);
            }
            Err(e) => {
                error!("桌面通知发送失败: {}", e);
            }
        }
    }
    
    Ok(())
}

/// 获取工作区布局
#[tauri::command]
pub async fn get_workspace_layout(
    preferences_storage: State<'_, UserPreferencesStorage>,
) -> Result<WorkspaceSettings, String> {
    debug!("获取工作区布局");
    
    let storage = preferences_storage.lock().map_err(|e| {
        error!("获取偏好设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    Ok(storage.workspace.clone())
}

/// 保存工作区布局
#[tauri::command]
pub async fn save_workspace_layout(
    preferences_storage: State<'_, UserPreferencesStorage>,
    workspace: WorkspaceSettings,
) -> Result<(), String> {
    debug!("保存工作区布局");
    
    let mut storage = preferences_storage.lock().map_err(|e| {
        error!("获取偏好设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    storage.workspace = workspace;
    info!("工作区布局已保存");
    Ok(())
}

/// 添加最近文件
#[tauri::command]
pub async fn add_recent_file(
    preferences_storage: State<'_, UserPreferencesStorage>,
    file_path: String,
) -> Result<(), String> {
    debug!("添加最近文件: {}", file_path);
    
    let mut storage = preferences_storage.lock().map_err(|e| {
        error!("获取偏好设置存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    // 移除已存在的相同路径
    storage.workspace.recent_files.retain(|f| f != &file_path);
    
    // 添加到开头
    storage.workspace.recent_files.insert(0, file_path);
    
    // 限制最近文件数量
    if storage.workspace.recent_files.len() > 20 {
        storage.workspace.recent_files.truncate(20);
    }
    
    Ok(())
}

/// 获取应用统计信息
#[tauri::command]
pub async fn get_app_statistics() -> Result<serde_json::Value, String> {
    debug!("获取应用统计信息");
    
    // 模拟统计数据
    let stats = serde_json::json!({
        "usage": {
            "totalSessions": 156,
            "totalQueries": 2847,
            "totalConnections": 12,
            "averageSessionDuration": 1800, // 30分钟
            "lastUsed": chrono::Utc::now()
        },
        "performance": {
            "averageQueryTime": 245,
            "successRate": 98.5,
            "errorRate": 1.5,
            "cacheHitRate": 85.2
        },
        "features": {
            "mostUsedFeatures": [
                {"name": "查询执行", "usage": 45.2},
                {"name": "数据可视化", "usage": 28.7},
                {"name": "连接管理", "usage": 15.3},
                {"name": "数据导出", "usage": 10.8}
            ],
            "featureAdoption": {
                "shortcuts": true,
                "darkMode": true,
                "notifications": false,
                "autoSave": true
            }
        }
    });
    
    Ok(stats)
}

/// 记录用户操作
#[tauri::command]
pub async fn record_user_action(
    action: String,
    context: Option<serde_json::Value>,
) -> Result<(), String> {
    debug!("记录用户操作: {}", action);
    
    // 这里可以记录用户行为用于分析和改进
    // 注意：需要遵守隐私政策，只记录必要的匿名化数据
    
    info!("用户操作: {} {:?}", action, context);
    Ok(())
}

/// 获取帮助信息
#[tauri::command]
pub async fn get_help_content(
    topic: String,
) -> Result<serde_json::Value, String> {
    debug!("获取帮助信息: {}", topic);
    
    let help_content = match topic.as_str() {
        "shortcuts" => serde_json::json!({
            "title": "键盘快捷键",
            "content": "这里是键盘快捷键的帮助内容...",
            "shortcuts": get_default_shortcuts().await?
        }),
        "query" => serde_json::json!({
            "title": "查询语法",
            "content": "InfluxDB 查询语法帮助...",
            "examples": [
                "SELECT * FROM measurement",
                "SELECT mean(value) FROM measurement WHERE time > now() - 1h GROUP BY time(5m)"
            ]
        }),
        "connections" => serde_json::json!({
            "title": "连接管理",
            "content": "如何管理数据库连接...",
            "steps": [
                "点击新建连接按钮",
                "填写连接信息",
                "测试连接",
                "保存连接"
            ]
        }),
        _ => serde_json::json!({
            "title": "帮助",
            "content": "未找到相关帮助内容"
        })
    };
    
    Ok(help_content)
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            shortcuts: vec![], // 将通过 get_default_shortcuts 填充
            notifications: NotificationSettings {
                enabled: true,
                query_completion: true,
                connection_status: true,
                system_alerts: true,
                export_completion: true,
                sound: false,
                desktop: true,
                position: "topRight".to_string(),
            },
            accessibility: AccessibilitySettings {
                high_contrast: false,
                font_size: "medium".to_string(),
                font_family: "system".to_string(),
                reduced_motion: false,
                screen_reader: false,
                keyboard_navigation: true,
            },
            workspace: WorkspaceSettings {
                layout: "comfortable".to_string(),
                panel_sizes: HashMap::new(),
                panel_positions: Some({
                    let mut positions = HashMap::new();
                    positions.insert("left-panel".to_string(), 25.0);
                    positions.insert("bottom-panel".to_string(), 40.0);
                    positions
                }),
                open_tabs: vec![],
                pinned_queries: vec![],
                recent_files: vec![],
                restore_tabs_on_startup: true,
            },
        }
    }
}
