// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod services;
mod utils;
mod config;

use tauri::{Manager, Emitter, menu::{MenuBuilder, SubmenuBuilder}};
use log::info;


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

// Services
use services::ConnectionService;
use utils::encryption::create_encryption_service;

// 创建原生菜单 - 简化版本
fn create_native_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let file_menu = SubmenuBuilder::new(app, "文件")
        .text("new_query", "新建查询")
        .text("save", "保存")
        .separator()
        .text("quit", "退出")
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "查看")
        .text("view_dashboard", "仪表板")
        .text("view_connections", "连接管理")
        .text("view_query", "数据查询")
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "帮助")
        .text("about", "关于 InfloWave")
        .build()?;

    MenuBuilder::new(app)
        .items(&[&file_menu, &view_menu, &help_menu])
        .build()
}

// 处理菜单事件 - 简化版本
fn handle_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    let window = app.get_webview_window("main").unwrap();

    match event.id().as_ref() {
        // 文件菜单
        "new_query" => {
            let _ = window.emit("menu-action", "new_query");
        }
        "save" => {
            let _ = window.emit("menu-action", "save");
        }
        "quit" => {
            std::process::exit(0);
        }

        // 查看菜单
        "view_dashboard" => {
            let _ = window.emit("menu-action", "navigate:/dashboard");
        }
        "view_connections" => {
            let _ = window.emit("menu-action", "navigate:/connections");
        }
        "view_query" => {
            let _ = window.emit("menu-action", "navigate:/query");
        }

        // 帮助菜单
        "about" => {
            let _ = window.emit("menu-action", "about");
        }

        _ => {}
    }
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
            import_data,

            // Query operations
            execute_query,
            validate_query,
            get_query_suggestions,
            format_query,
            explain_query,

            // System operations
            get_system_info,
            get_database_stats,
            health_check,
            get_connection_pool_stats,
            cleanup_resources,
            get_app_config,

            // Data write operations
            write_data,
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
            create_webhook,
            get_webhooks,
            trigger_webhook,
            create_automation_rule,
            get_automation_rules,
            execute_automation_rule,
            get_integration_templates,
        ])
        .setup(|app| {
            info!("Application setup started");

            // TODO: 暂时禁用原生菜单，先测试工具栏功能
            // let menu = create_native_menu(app.handle())?;
            // app.set_menu(menu)?;

            // let app_handle = app.handle().clone();
            // app.on_menu_event(move |app, event| {
            //     handle_menu_event(&app_handle, event);
            // });

            // Initialize encryption service
            let encryption_service = create_encryption_service()
                .expect("Failed to create encryption service");

            // Initialize connection service (without auto-load for now)
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

            // Initialize application configuration
            if let Err(e) = config::init_config(app.handle()) {
                log::error!("Failed to initialize config: {}", e);
            }

            info!("Application setup completed");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
