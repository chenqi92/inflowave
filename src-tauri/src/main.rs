// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod services;
mod utils;
mod config;

use tauri::Manager;
use log::info;


// Tauri commands
use commands::{
    connection::*,
    database::*,
    query::*,
    system::*,
};

// Services
use services::ConnectionService;
use utils::encryption::create_encryption_service;

#[tokio::main]
async fn main() {
    // Initialize logger
    env_logger::init();

    info!("Starting InfluxDB GUI Manager");

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
            get_measurements,
            get_field_keys,
            get_tag_keys,
            get_tag_values,

            // Query operations
            execute_query,
            validate_query,
            get_query_history,
            save_query,
            get_saved_queries,
            delete_saved_query,
            update_saved_query,
            get_query_suggestions,
            format_query,
            explain_query,

            // System operations
            get_system_info,
            get_database_stats,
            get_performance_metrics,
            health_check,
            get_connection_pool_stats,
            cleanup_resources,
            get_app_config,
        ])
        .setup(|app| {
            info!("Application setup started");

            // Initialize encryption service
            let encryption_service = create_encryption_service()
                .expect("Failed to create encryption service");

            // Initialize connection service
            let connection_service = ConnectionService::new(encryption_service);

            // Store services in app state
            app.manage(connection_service);

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
