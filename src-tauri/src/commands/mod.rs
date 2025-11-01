pub mod connection;
pub mod database;
pub mod query;
pub mod system;
pub mod data_write;
pub mod query_history;
pub mod settings;
pub mod context_menu;
pub mod data_export;
pub mod dashboard;
pub mod performance;
pub mod user_experience;
pub mod extensions;
pub mod optimization_history;
pub mod port_manager;
pub mod embedded_server;
pub mod workspace;
pub mod iotdb;
pub mod influxdb2;
pub mod database_detection;
pub mod multi_source_performance;
pub mod window_theme;
pub mod logs;
pub mod window;

/// 宏：为 Tauri 命令自动添加 camelCase 参数转换
/// 使用方式：#[camel_case_command] 替代 #[tauri::command]
#[macro_export]
macro_rules! camel_case_command {
    ($(#[$attr:meta])* $vis:vis async fn $name:ident($($param:tt)*) -> $ret:ty $body:block) => {
        $(#[$attr])*
        #[tauri::command(rename_all = "camelCase")]
        $vis async fn $name($($param)*) -> $ret $body
    };
    ($(#[$attr:meta])* $vis:vis fn $name:ident($($param:tt)*) -> $ret:ty $body:block) => {
        $(#[$attr])*
        #[tauri::command(rename_all = "camelCase")]
        $vis fn $name($($param)*) -> $ret $body
    };
}

