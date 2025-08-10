use crate::services::port_manager::{get_port_manager, PortInfo};
use crate::camel_case_command;
use std::collections::HashMap;

camel_case_command!(
    pub async fn init_port_manager(app_handle: tauri::AppHandle) -> Result<(), String> {
        crate::services::port_manager::init_port_manager(app_handle)
            .map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn allocate_port(service_name: String) -> Result<u16, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        manager.allocate_port(&service_name).map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn release_port(service_name: String) -> Result<(), String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        manager.release_port(&service_name).map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn get_current_port() -> Result<Option<u16>, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        Ok(manager.get_current_port())
    }
);

camel_case_command!(
    pub async fn get_service_port(service_name: String) -> Result<Option<u16>, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        Ok(manager.get_service_port(&service_name))
    }
);

camel_case_command!(
    pub async fn is_port_available(port: u16) -> Result<bool, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        Ok(manager.is_port_available(port))
    }
);

camel_case_command!(
    pub async fn port_health_check(service_name: String) -> Result<bool, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        manager.health_check(&service_name).map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn start_health_check_loop(service_name: String) -> Result<(), String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        manager.start_health_check_loop(service_name);
        Ok(())
    }
);

camel_case_command!(
    pub async fn try_reallocate_port(service_name: String) -> Result<u16, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        manager.try_reallocate_port(&service_name).map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn check_port_conflicts() -> Result<Vec<String>, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        Ok(manager.check_port_conflicts())
    }
);

camel_case_command!(
    pub async fn get_port_stats() -> Result<HashMap<String, PortInfo>, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        Ok(manager.get_port_stats())
    }
);

camel_case_command!(
    pub async fn find_available_port() -> Result<u16, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        manager.find_available_port().map_err(|e| e.to_string())
    }
);

camel_case_command!(
    pub async fn ensure_frontend_port_available() -> Result<u16, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        
        // 检查默认端口是否可用
        if manager.is_port_available(14222) {
            match manager.allocate_port("frontend") {
                Ok(_) => Ok(14222),
                Err(e) => Err(e.to_string())
            }
        } else {
            // 如果默认端口不可用，分配新端口
            match manager.allocate_port("frontend") {
                Ok(port) => {
                    log::warn!("默认端口 14222 被占用，已分配新端口: {}", port);
                    Ok(port)
                }
                Err(e) => Err(e.to_string())
            }
        }
    }
);

camel_case_command!(
    pub async fn get_frontend_port() -> Result<Option<u16>, String> {
        let manager = get_port_manager();
        let manager = manager.read().unwrap();
        Ok(manager.get_service_port("frontend"))
    }
);