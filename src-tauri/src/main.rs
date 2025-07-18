// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod services;
mod utils;
mod config;
mod updater;

use tauri::{Manager, Emitter, menu::{MenuBuilder, SubmenuBuilder}};
use log::{info, warn, error};

// Tauri commands
use commands::connection::*;
use commands::database::*;
use commands::query::*;
use commands::system::*;
use commands::data_write::*;
use commands::query_history::*;
use commands::settings::*;
use commands::context_menu::*;
use commands::data_export::*;
use commands::dashboard::*;
use commands::performance::*;
use commands::user_experience::*;
use commands::extensions::*;
use commands::optimization_history::*;
use commands::port_manager::*;
use commands::embedded_server::*;

// Updater commands
use updater::*;

// Services
use services::ConnectionService;
use utils::encryption::create_encryption_service;

// 创建原生菜单 - 完整的专业化菜单
fn create_native_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    // 文件菜单
    let file_menu = SubmenuBuilder::new(app, "文件")
        .text("new_query", "新建查询\tCtrl+N")
        .text("open_file", "打开文件\tCtrl+O")
        .text("save", "保存\tCtrl+S")
        .text("save_as", "另存为\tCtrl+Shift+S")
        .separator()
        .text("import_data", "导入数据")
        .text("export_data", "导出数据")
        .separator()
        .text("quit", "退出\tCtrl+Q")
        .build()?;

    // 编辑菜单
    let edit_menu = SubmenuBuilder::new(app, "编辑")
        .text("undo", "撤销\tCtrl+Z")
        .text("redo", "重做\tCtrl+Y")
        .separator()
        .text("cut", "剪切\tCtrl+X")
        .text("copy", "复制\tCtrl+C")
        .text("paste", "粘贴\tCtrl+V")
        .separator()
        .text("find", "查找\tCtrl+F")
        .text("replace", "替换\tCtrl+H")
        .text("global_search", "全局搜索\tCtrl+Shift+F")
        .build()?;

    // 查看菜单
    let view_menu = SubmenuBuilder::new(app, "查看")
        .text("view_datasource", "数据源管理\tCtrl+1")
        .text("view_query", "查询编辑器\tCtrl+2")
        .text("view_visualization", "数据可视化\tCtrl+3")
        .text("view_performance", "性能监控\tCtrl+4")
        .separator()
        .text("toggle_sidebar", "切换侧边栏\tCtrl+B")
        .text("toggle_statusbar", "切换状态栏")
        .text("fullscreen", "全屏模式\tF11")
        .separator()
        .text("zoom_in", "放大\tCtrl+=")
        .text("zoom_out", "缩小\tCtrl+-")
        .text("zoom_reset", "重置缩放\tCtrl+0")
        .build()?;

    // 数据库菜单
    let database_menu = SubmenuBuilder::new(app, "数据库")
        .text("new_connection", "新建连接\tCtrl+Shift+N")
        .text("edit_connection", "编辑连接")
        .text("test_connection", "测试连接\tCtrl+T")
        .text("delete_connection", "删除连接")
        .separator()
        .text("refresh_structure", "刷新数据库结构\tF5")
        .text("database_info", "查看数据库信息")
        .text("database_stats", "数据库统计")
        .separator()
        .text("import_structure", "导入数据库结构")
        .text("export_structure", "导出数据库结构")
        .build()?;

    // 查询菜单
    let query_menu = SubmenuBuilder::new(app, "查询")
        .text("execute_query", "执行查询\tF5")
        .text("stop_query", "停止查询\tCtrl+F2")
        .text("execute_selection", "执行选中\tCtrl+Enter")
        .separator()
        .text("query_history", "查询历史\tCtrl+H")
        .text("save_query", "保存查询")
        .text("query_favorites", "查询收藏夹")
        .separator()
        .text("query_plan", "查询计划")
        .text("explain_query", "解释查询")
        .text("format_query", "格式化查询\tCtrl+Alt+L")
        .build()?;

    // 风格设置子菜单 - 更新为完整的主题支持
    let style_submenu = SubmenuBuilder::new(app, "风格设置")
        .text("theme_default", "默认蓝色")
        .text("theme_shadcn", "Shadcn 黑白")
        .text("theme_zinc", "锌灰色")
        .text("theme_slate", "石板灰")
        .text("theme_indigo", "靛蓝色")
        .text("theme_emerald", "翡翠绿")
        .text("theme_blue", "经典蓝")
        .text("theme_green", "自然绿色")
        .text("theme_red", "活力红色")
        .text("theme_orange", "温暖橙色")
        .text("theme_purple", "优雅紫色")
        .text("theme_rose", "浪漫玫瑰")
        .text("theme_yellow", "明亮黄色")
        .text("theme_violet", "神秘紫罗兰")
        .build()?;

    // 工具菜单
    let tools_menu = SubmenuBuilder::new(app, "工具")
        .text("console", "控制台\tCtrl+`")
        .text("dev_tools", "开发者工具\tF12")
        .text("query_performance", "查询性能分析")
        .separator()
        .text("extensions", "扩展管理")
        .text("theme_settings", "主题设置")
        .item(&style_submenu)
        .text("language_settings", "语言设置")
        .separator()
        .text("preferences", "首选项\tCtrl+,")
        .build()?;

    // 帮助菜单
    let help_menu = SubmenuBuilder::new(app, "帮助")
        .text("user_manual", "用户手册\tF1")
        .text("quick_start", "快速入门")
        .text("shortcuts_help", "键盘快捷键\tCtrl+/")
        .separator()
        .text("sample_queries", "示例查询")
        .text("api_docs", "API文档")
        .text("influxdb_docs", "InfluxDB文档")
        .separator()
        .text("check_updates", "检查更新")
        .text("report_issue", "反馈问题")
        .text("about", "关于InfloWave")
        .build()?;

    MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &database_menu, &query_menu, &tools_menu, &help_menu])
        .build()
}

// 处理菜单事件 - 完整的专业化菜单
fn handle_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    // 添加调试日志
    log::info!("菜单事件触发: {}", event.id().as_ref());
    
    // 获取主窗口
    let window = match app.get_webview_window("main") {
        Some(window) => window,
        None => {
            log::error!("没有找到'main'窗口");
            return;
        }
    };

    match event.id().as_ref() {
        // 文件菜单
        "new_query" => {
            log::info!("发送菜单动作: new_query");
            if let Err(e) = window.emit("menu-action", "new_query") {
                log::error!("发送菜单事件失败: {}", e);
            }
        }
        "open_file" => {
            log::info!("发送菜单动作: open_file");
            if let Err(e) = window.emit("menu-action", "open_file") {
                log::error!("发送菜单事件失败: {}", e);
            }
        }
        "save" => {
            log::info!("发送菜单动作: save");
            if let Err(e) = window.emit("menu-action", "save") {
                log::error!("发送菜单事件失败: {}", e);
            }
        }
        "save_as" => {
            log::info!("发送菜单动作: save_as");
            if let Err(e) = window.emit("menu-action", "save_as") {
                log::error!("发送菜单事件失败: {}", e);
            }
        }
        "import_data" => {
            log::info!("发送菜单动作: import_data");
            if let Err(e) = window.emit("menu-action", "import_data") {
                log::error!("发送菜单事件失败: {}", e);
            }
        }
        "export_data" => {
            log::info!("发送菜单动作: export_data");
            if let Err(e) = window.emit("menu-action", "export_data") {
                log::error!("发送菜单事件失败: {}", e);
            }
        }
        "quit" => {
            std::process::exit(0);
        }

        // 编辑菜单
        "undo" => {
            let _ = window.emit("menu-action", "undo");
        }
        "redo" => {
            let _ = window.emit("menu-action", "redo");
        }
        "cut" => {
            let _ = window.emit("menu-action", "cut");
        }
        "copy" => {
            let _ = window.emit("menu-action", "copy");
        }
        "paste" => {
            let _ = window.emit("menu-action", "paste");
        }
        "find" => {
            let _ = window.emit("menu-action", "find");
        }
        "replace" => {
            let _ = window.emit("menu-action", "replace");
        }
        "global_search" => {
            let _ = window.emit("menu-action", "global_search");
        }

        // 查看菜单
        "view_datasource" => {
            let _ = window.emit("menu-action", "navigate:/connections");
        }
        "view_query" => {
            let _ = window.emit("menu-action", "navigate:/query");
        }
        "view_visualization" => {
            let _ = window.emit("menu-action", "navigate:/visualization");
        }
        "view_performance" => {
            let _ = window.emit("menu-action", "navigate:/performance");
        }
        "toggle_sidebar" => {
            let _ = window.emit("menu-action", "toggle_sidebar");
        }
        "toggle_statusbar" => {
            let _ = window.emit("menu-action", "toggle_statusbar");
        }
        "fullscreen" => {
            let _ = window.emit("menu-action", "fullscreen");
        }
        "zoom_in" => {
            let _ = window.emit("menu-action", "zoom_in");
        }
        "zoom_out" => {
            let _ = window.emit("menu-action", "zoom_out");
        }
        "zoom_reset" => {
            let _ = window.emit("menu-action", "zoom_reset");
        }

        // 数据库菜单
        "new_connection" => {
            let _ = window.emit("menu-action", "new_connection");
        }
        "edit_connection" => {
            let _ = window.emit("menu-action", "edit_connection");
        }
        "test_connection" => {
            let _ = window.emit("menu-action", "test_connection");
        }
        "delete_connection" => {
            let _ = window.emit("menu-action", "delete_connection");
        }
        "refresh_structure" => {
            let _ = window.emit("menu-action", "refresh_structure");
        }
        "database_info" => {
            let _ = window.emit("menu-action", "database_info");
        }
        "database_stats" => {
            let _ = window.emit("menu-action", "database_stats");
        }
        "import_structure" => {
            let _ = window.emit("menu-action", "import_structure");
        }
        "export_structure" => {
            let _ = window.emit("menu-action", "export_structure");
        }

        // 查询菜单
        "execute_query" => {
            let _ = window.emit("menu-action", "execute_query");
        }
        "stop_query" => {
            let _ = window.emit("menu-action", "stop_query");
        }
        "execute_selection" => {
            let _ = window.emit("menu-action", "execute_selection");
        }
        "query_history" => {
            let _ = window.emit("menu-action", "query_history");
        }
        "save_query" => {
            let _ = window.emit("menu-action", "save_query");
        }
        "query_favorites" => {
            let _ = window.emit("menu-action", "query_favorites");
        }
        "query_plan" => {
            let _ = window.emit("menu-action", "query_plan");
        }
        "explain_query" => {
            let _ = window.emit("menu-action", "explain_query");
        }
        "format_query" => {
            let _ = window.emit("menu-action", "format_query");
        }

        // 软件风格菜单 - 更新为完整的主题支持
        "theme_default" => {
            log::info!("发送主题切换事件: default");
            if let Err(e) = window.emit("theme-change", "default") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_shadcn" => {
            log::info!("发送主题切换事件: shadcn");
            if let Err(e) = window.emit("theme-change", "shadcn") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_zinc" => {
            let _ = window.emit("theme-change", "zinc");
        }
        "theme_slate" => {
            let _ = window.emit("theme-change", "slate");
        }
        "theme_indigo" => {
            let _ = window.emit("theme-change", "indigo");
        }
        "theme_emerald" => {
            let _ = window.emit("theme-change", "emerald");
        }
        "theme_blue" => {
            let _ = window.emit("theme-change", "blue");
        }
        "theme_green" => {
            let _ = window.emit("theme-change", "green");
        }
        "theme_red" => {
            let _ = window.emit("theme-change", "red");
        }
        "theme_orange" => {
            let _ = window.emit("theme-change", "orange");
        }
        "theme_purple" => {
            let _ = window.emit("theme-change", "purple");
        }
        "theme_rose" => {
            let _ = window.emit("theme-change", "rose");
        }
        "theme_yellow" => {
            let _ = window.emit("theme-change", "yellow");
        }
        "theme_violet" => {
            let _ = window.emit("theme-change", "violet");
        }

        // 工具菜单
        "console" => {
            let _ = window.emit("menu-action", "console");
        }
        "dev_tools" => {
            let _ = window.emit("menu-action", "dev_tools");
        }
        "query_performance" => {
            let _ = window.emit("menu-action", "query_performance");
        }
        "extensions" => {
            let _ = window.emit("menu-action", "navigate:/extensions");
        }
        "theme_settings" => {
            let _ = window.emit("menu-action", "theme_settings");
        }
        "language_settings" => {
            let _ = window.emit("menu-action", "language_settings");
        }
        "preferences" => {
            let _ = window.emit("menu-action", "navigate:/settings");
        }

        // 帮助菜单
        "user_manual" => {
            let _ = window.emit("menu-action", "user_manual");
        }
        "quick_start" => {
            let _ = window.emit("menu-action", "quick_start");
        }
        "shortcuts_help" => {
            let _ = window.emit("menu-action", "shortcuts_help");
        }
        "sample_queries" => {
            let _ = window.emit("menu-action", "sample_queries");
        }
        "api_docs" => {
            let _ = window.emit("menu-action", "api_docs");
        }
        "influxdb_docs" => {
            let _ = window.emit("menu-action", "influxdb_docs");
        }
        "check_updates" => {
            let _ = window.emit("menu-action", "check_updates");
        }
        "report_issue" => {
            let _ = window.emit("menu-action", "report_issue");
        }
        "about" => {
            let _ = window.emit("menu-action", "about");
        }

        _ => {}
    }
}

/// 设置嵌入式服务器（如果需要）
async fn setup_embedded_server_if_needed(app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use services::embedded_server::{init_embedded_server, start_embedded_server, ServerConfig};
    
    // 从配置或环境变量中读取是否需要嵌入式服务器
    let enable_embedded_server = std::env::var("ENABLE_EMBEDDED_SERVER")
        .unwrap_or_else(|_| "false".to_string())
        .parse::<bool>()
        .unwrap_or(false);
    
    if !enable_embedded_server {
        info!("嵌入式服务器已禁用");
        return Ok(());
    }
    
    info!("正在设置嵌入式服务器...");
    
    let config = ServerConfig {
        enabled: true,
        preferred_port: 1422,
        port_range: (1422, 1500),
        auto_start: true,
        features: vec!["debug".to_string(), "proxy".to_string()],
    };
    
    // 初始化嵌入式服务器
    init_embedded_server(config)?;
    
    // 启动服务器
    match start_embedded_server().await {
        Ok(port) => {
            info!("嵌入式服务器已启动，端口: {}", port);
            
            // 通知前端服务器已启动
            if let Err(e) = app_handle.emit("embedded-server-started", port) {
                warn!("通知前端嵌入式服务器启动失败: {}", e);
            }
        }
        Err(e) => {
            warn!("嵌入式服务器启动失败: {}", e);
        }
    }
    
    Ok(())
}

/// 处理启动时的端口冲突
async fn handle_port_conflicts_at_startup() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use services::port_manager::get_port_manager;
    
    info!("检查启动时端口冲突...");
    
    let manager = get_port_manager();
    let manager = manager.read().unwrap();
    
    // 检查默认端口 1422 是否可用
    if manager.is_port_available(1422) {
        // 为前端服务分配默认端口
        match manager.allocate_port("frontend") {
            Ok(port) => {
                info!("前端服务使用默认端口: {}", port);
            }
            Err(e) => {
                warn!("无法分配默认端口，尝试查找其他可用端口: {}", e);
                // 分配其他可用端口
                match manager.find_available_port() {
                    Ok(port) => {
                        warn!("端口冲突已解决，前端将使用端口: {} 而不是默认的 1422", port);
                    }
                    Err(e) => {
                        error!("无法找到可用端口: {}", e);
                        return Err(format!("端口分配失败: {}", e).into());
                    }
                }
            }
        }
    } else {
        warn!("默认端口 1422 被占用，正在查找可用端口...");
        // 查找并分配可用端口
        match manager.allocate_port("frontend") {
            Ok(port) => {
                warn!("端口冲突已解决，前端将使用端口: {} 而不是默认的 1422", port);
            }
            Err(e) => {
                error!("无法为前端服务分配端口: {}", e);
                return Err(format!("端口分配失败: {}", e).into());
            }
        }
    }
    
    // 启动健康检查
    manager.start_health_check_loop("frontend".to_string());
    
    Ok(())
}

#[tokio::main]
async fn main() {
    // Initialize logger
    env_logger::init();

    info!("Starting InfloWave");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            // Connection management
            initialize_connections,
            create_connection,
            test_connection,
            get_connections,
            get_connection,
            update_connection,
            delete_connection,
            get_connection_status,
            get_all_connection_statuses,
            health_check_all_connections,
            get_connection_count,
            connect_to_database,
            disconnect_from_database,
            start_connection_monitoring,
            stop_connection_monitoring,
            get_connection_pool_stats,
            sync_connections,
            debug_connection_manager,

            // Database operations
            get_databases,
            create_database,
            drop_database,
            get_retention_policies,
            create_retention_policy,
            drop_retention_policy,
            alter_retention_policy,
            get_measurements,
            drop_measurement,
            get_field_keys,
            get_tag_keys,
            get_tag_values,
            get_table_schema,
            import_data,

            // New database operations
            get_database_info,
            get_database_stats,
            execute_table_query,
            get_table_structure,
            generate_insert_template,
            export_table_data,
            refresh_database_structure,
            create_measurement_template,
            show_measurements,

            // Query operations
            execute_query,
            execute_batch_queries,
            validate_query,
            get_query_suggestions,
            format_query,
            explain_query,

            // System operations
            get_system_info,
            health_check,
            cleanup_resources,
            get_app_config,
            show_open_dialog,
            show_save_dialog,
            toggle_devtools,
            check_for_updates,
            open_file_dialog,
            save_file_dialog,
            read_file,
            write_file,
            write_binary_file,
            get_downloads_dir,

            // Data write operations
            write_data,
            write_data_points,
            validate_data_format,
            preview_data_conversion,

            // Query history operations
            add_query_history,
            get_query_history,
            delete_query_history,
            clear_query_history,
            save_query,
            get_saved_queries,
            update_saved_query,
            delete_saved_query,

            // Settings operations
            get_app_settings,
            update_app_settings,
            reset_app_settings,
            update_general_settings,
            update_editor_settings,
            update_query_settings,
            update_visualization_settings,
            update_security_settings,
            update_controller_settings,
            get_controller_settings,
            export_settings,
            import_settings,
            get_settings_schema,

            // Context menu and SQL generation
            generate_smart_sql,
            get_database_context_menu,
            get_measurement_context_menu,
            get_field_context_menu,

            // Data export operations
            export_query_data,
            get_export_formats,
            estimate_export_size,

            // Dashboard operations
            create_dashboard,
            get_dashboards,
            get_dashboard,
            update_dashboard,
            delete_dashboard,
            add_widget_to_dashboard,
            update_dashboard_widget,
            remove_widget_from_dashboard,
            get_chart_types,
            get_color_schemes,
            duplicate_dashboard,

            // Performance monitoring
            get_performance_metrics,
            record_query_performance,
            get_slow_query_analysis,
            get_storage_analysis_report,
            get_query_optimization_suggestions,
            perform_health_check,

            // User experience
            get_user_preferences,
            update_user_preferences,
            get_default_shortcuts,
            send_notification,
            get_workspace_layout,
            save_workspace_layout,
            add_recent_file,
            get_app_statistics,
            record_user_action,
            get_help_content,

            // Extensions and integrations
            get_installed_plugins,
            install_plugin,
            toggle_plugin,
            uninstall_plugin,
            create_api_integration,
            get_api_integrations,
            test_api_integration,
            toggle_api_integration,
            create_webhook,
            get_webhooks,
            trigger_webhook,
            toggle_webhook,
            create_automation_rule,
            get_automation_rules,
            execute_automation_rule,
            toggle_automation_rule,
            get_integration_templates,

            // Optimization history
            load_optimization_history,
            save_optimization_history,
            add_optimization_history,
            get_optimization_history,
            delete_optimization_history,
            update_optimization_feedback,
            clear_optimization_history,

            // Port manager
            init_port_manager,
            allocate_port,
            release_port,
            get_current_port,
            get_service_port,
            is_port_available,
            port_health_check,
            start_health_check_loop,
            try_reallocate_port,
            check_port_conflicts,
            get_port_stats,
            find_available_port,
            ensure_frontend_port_available,
            get_frontend_port,

            // Embedded server
            init_embedded_server_cmd,
            start_embedded_server_cmd,
            stop_embedded_server_cmd,
            restart_embedded_server_cmd,
            get_embedded_server_status,
            is_embedded_server_running,

            // Updater commands
            check_for_app_updates,
            skip_version,
            get_updater_settings,
            update_updater_settings,
            read_release_notes_file,
            list_release_notes_files,
        ])
        .setup(|app| {
            info!("Application setup started");

            // 创建并设置原生菜单
            match create_native_menu(app.handle()) {
                Ok(menu) => {
                    if let Err(e) = app.set_menu(menu) {
                        eprintln!("设置菜单失败: {}", e);
                    }
                }
                Err(e) => {
                    eprintln!("创建菜单失败: {}", e);
                }
            }

            // 设置菜单事件处理器
            let app_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                handle_menu_event(&app_handle, event);
            });

            // Initialize encryption service
            let encryption_service = create_encryption_service()
                .expect("Failed to create encryption service");

            // Initialize connection service (connections will be loaded via initialize_connections command)
            let connection_service = ConnectionService::new(encryption_service);

            // Store services in app state
            app.manage(connection_service);

            // Initialize storage for query history and saved queries
            app.manage(commands::query_history::QueryHistoryStorage::new(Vec::new()));
            app.manage(commands::query_history::SavedQueryStorage::new(std::collections::HashMap::new()));

            // Initialize settings storage
            app.manage(commands::settings::SettingsStorage::new(commands::settings::AppSettings::default()));

            // Initialize dashboard storage
            app.manage(commands::dashboard::DashboardStorage::new(std::collections::HashMap::new()));

            // Initialize performance monitoring storage
            app.manage(commands::performance::QueryMetricsStorage::new(Vec::new()));

            // Initialize user experience storage
            app.manage(commands::user_experience::UserPreferencesStorage::new(commands::user_experience::UserPreferences::default()));

            // Initialize extensions storage
            app.manage(commands::extensions::PluginStorage::new(std::collections::HashMap::new()));
            app.manage(commands::extensions::APIIntegrationStorage::new(std::collections::HashMap::new()));
            app.manage(commands::extensions::WebhookStorage::new(std::collections::HashMap::new()));
            app.manage(commands::extensions::AutomationStorage::new(std::collections::HashMap::new()));

            // Initialize optimization history storage
            app.manage(std::sync::Mutex::new(Vec::<commands::optimization_history::OptimizationHistoryEntry>::new()));

            // Initialize application configuration
            if let Err(e) = config::init_config(app.handle()) {
                log::error!("Failed to initialize config: {}", e);
            }

            // Initialize port manager and handle port conflicts
            if let Err(e) = services::port_manager::init_port_manager(app.handle().clone()) {
                error!("Failed to initialize port manager: {}", e);
            } else {
                // 检查并处理端口冲突
                let app_handle = app.handle().clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_port_conflicts_at_startup().await {
                        error!("处理启动时端口冲突失败: {}", e);
                    }
                    
                    // 初始化嵌入式服务器（如果需要）
                    if let Err(e) = setup_embedded_server_if_needed(app_handle).await {
                        error!("设置嵌入式服务器失败: {}", e);
                    }
                });
            }

            info!("Application setup completed");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
