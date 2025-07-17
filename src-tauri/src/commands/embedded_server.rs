use crate::services::embedded_server::{
    ServerConfig, init_embedded_server, start_embedded_server, 
    stop_embedded_server, restart_embedded_server, get_embedded_server
};
use crate::camel_case_command;

camel_case_command!(
    pub async fn init_embedded_server_cmd(config: ServerConfig) -> Result<(), String> {
        init_embedded_server(config).map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn start_embedded_server_cmd() -> Result<u16, String> {
        start_embedded_server().await.map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn stop_embedded_server_cmd() -> Result<(), String> {
        stop_embedded_server().map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn restart_embedded_server_cmd() -> Result<u16, String> {
        restart_embedded_server().await.map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn get_embedded_server_status() -> Result<Option<u16>, String> {
        if let Some(server) = get_embedded_server() {
            Ok(server.get_port())
        } else {
            Ok(None)
        }
    }
);

camel_case_command!(
    pub async fn is_embedded_server_running() -> Result<bool, String> {
        if let Some(server) = get_embedded_server() {
            Ok(server.is_running())
        } else {
            Ok(false)
        }
    }
);