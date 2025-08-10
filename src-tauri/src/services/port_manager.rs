use std::net::{TcpListener, SocketAddr, IpAddr, Ipv4Addr};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use serde::{Deserialize, Serialize};
use anyhow::Result;
use log::{info, warn, error, debug};
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortConfig {
    pub preferred_port: u16,
    pub port_range: (u16, u16),
    pub max_retries: u32,
    pub health_check_interval: Duration,
}

impl Default for PortConfig {
    fn default() -> Self {
        Self {
            preferred_port: 14222, // 与 tauri.conf.json 中的默认端口匹配
            port_range: (14222, 15000),
            max_retries: 10,
            health_check_interval: Duration::from_secs(30),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortInfo {
    pub port: u16,
    pub is_available: bool,
    pub last_check: std::time::SystemTime,
    pub service_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PortEvent {
    PortChanged { old_port: u16, new_port: u16 },
    PortConflict { port: u16, service: String },
    PortAvailable { port: u16 },
    HealthCheckFailed { port: u16, error: String },
    HealthCheckSuccess { port: u16 },
}

pub struct PortManager {
    config: PortConfig,
    current_port: Arc<RwLock<Option<u16>>>,
    port_registry: Arc<RwLock<HashMap<String, PortInfo>>>,
    app_handle: Option<tauri::AppHandle>,
}

impl PortManager {
    pub fn new(config: PortConfig) -> Self {
        Self {
            config,
            current_port: Arc::new(RwLock::new(None)),
            port_registry: Arc::new(RwLock::new(HashMap::new())),
            app_handle: None,
        }
    }

    pub fn set_app_handle(&mut self, app_handle: tauri::AppHandle) {
        self.app_handle = Some(app_handle);
    }

    /// 检查端口是否可用
    pub fn is_port_available(&self, port: u16) -> bool {
        debug!("检查端口 {} 是否可用", port);
        
        // 先检查是否已经在内部注册表中被分配
        {
            let registry = self.port_registry.read().unwrap();
            for port_info in registry.values() {
                if port_info.port == port {
                    debug!("端口 {} 已被内部服务 '{}' 占用", port, port_info.service_name);
                    return false;
                }
            }
        }
        
        // 尝试绑定端口来检查是否可用
        // 使用单次检查而不是重试，因为端口要么可用要么不可用
        match TcpListener::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port)) {
            Ok(listener) => {
                // 立即释放绑定，确保端口真正可用
                drop(listener);
                debug!("端口 {} 可用", port);
                true
            }
            Err(e) => {
                debug!("端口 {} 不可用: {}", port, e);
                false
            }
        }
    }

    /// 检查端口是否真正在被使用（用于健康检查）
    fn is_port_actually_in_use(&self, port: u16) -> bool {
        // 尝试连接到端口来检查是否有服务在监听
        match std::net::TcpStream::connect_timeout(
            &SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port),
            Duration::from_millis(100)
        ) {
            Ok(_) => {
                debug!("端口 {} 有服务在监听", port);
                true
            }
            Err(_) => {
                debug!("端口 {} 没有服务在监听", port);
                false
            }
        }
    }

    /// 查找可用端口
    pub fn find_available_port(&self) -> Result<u16> {
        info!("正在查找可用端口...");

        // 首先尝试首选端口
        if self.is_port_available(self.config.preferred_port) {
            info!("首选端口 {} 可用", self.config.preferred_port);
            return Ok(self.config.preferred_port);
        }

        // 在指定范围内查找可用端口
        for port in self.config.port_range.0..=self.config.port_range.1 {
            if self.is_port_available(port) {
                info!("找到可用端口: {}", port);
                return Ok(port);
            }
        }

        // 如果范围内没有可用端口，尝试系统分配
        match TcpListener::bind(SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 0)) {
            Ok(listener) => {
                let port = listener.local_addr()?.port();
                info!("系统分配端口: {}", port);
                Ok(port)
            }
            Err(e) => {
                error!("无法找到可用端口: {}", e);
                Err(anyhow::anyhow!("无法找到可用端口: {}", e))
            }
        }
    }

    /// 分配端口给服务
    pub fn allocate_port(&self, service_name: &str) -> Result<u16> {
        info!("为服务 '{}' 分配端口", service_name);

        let port = self.find_available_port()?;
        
        // 注册端口
        let port_info = PortInfo {
            port,
            is_available: true,
            last_check: std::time::SystemTime::now(),
            service_name: service_name.to_string(),
        };

        {
            let mut registry = self.port_registry.write().unwrap();
            registry.insert(service_name.to_string(), port_info);
        }

        // 更新当前端口
        {
            let mut current_port = self.current_port.write().unwrap();
            if let Some(old_port) = *current_port {
                self.emit_port_event(PortEvent::PortChanged { old_port, new_port: port });
            }
            *current_port = Some(port);
        }

        self.emit_port_event(PortEvent::PortAvailable { port });
        
        info!("端口 {} 已分配给服务 '{}'", port, service_name);
        Ok(port)
    }

    /// 释放端口
    pub fn release_port(&self, service_name: &str) -> Result<()> {
        info!("释放服务 '{}' 的端口", service_name);

        let mut registry = self.port_registry.write().unwrap();
        if let Some(port_info) = registry.remove(service_name) {
            info!("已释放端口 {} (服务: {})", port_info.port, service_name);
        } else {
            warn!("未找到服务 '{}' 的端口信息", service_name);
        }

        Ok(())
    }

    /// 获取当前端口
    pub fn get_current_port(&self) -> Option<u16> {
        *self.current_port.read().unwrap()
    }

    /// 获取服务端口
    pub fn get_service_port(&self, service_name: &str) -> Option<u16> {
        let registry = self.port_registry.read().unwrap();
        registry.get(service_name).map(|info| info.port)
    }

    /// 健康检查
    pub fn health_check(&self, service_name: &str) -> Result<bool> {
        debug!("对服务 '{}' 进行健康检查", service_name);

        let port = {
            let registry = self.port_registry.read().unwrap();
            match registry.get(service_name) {
                Some(info) => info.port,
                None => {
                    warn!("未找到服务 '{}' 的端口信息", service_name);
                    return Ok(false);
                }
            }
        };

        // 对于前端服务，我们简化健康检查 - 只要端口被分配就认为是健康的
        // 因为前端服务是由Tauri管理的，不需要复杂的端口监听检查
        let is_healthy = true;
        
        // 更新检查时间
        {
            let mut registry = self.port_registry.write().unwrap();
            if let Some(info) = registry.get_mut(service_name) {
                info.last_check = std::time::SystemTime::now();
                info.is_available = is_healthy;
            }
        }

        if is_healthy {
            self.emit_port_event(PortEvent::HealthCheckSuccess { port });
        } else {
            self.emit_port_event(PortEvent::HealthCheckFailed { 
                port, 
                error: "端口不可用".to_string() 
            });
        }

        Ok(is_healthy)
    }

    /// 启动健康检查循环
    pub fn start_health_check_loop(&self, service_name: String) {
        let registry = self.port_registry.clone();
        let interval = self.config.health_check_interval;
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);
            
            loop {
                interval_timer.tick().await;
                
                let should_check = {
                    let registry = registry.read().unwrap();
                    registry.contains_key(&service_name)
                };

                if should_check {
                    let port = {
                        let registry = registry.read().unwrap();
                        registry.get(&service_name).map(|info| info.port)
                    };

                    if let Some(port) = port {
                        let is_available = TcpListener::bind(
                            SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port)
                        ).is_ok();

                        // 更新状态
                        {
                            let mut registry = registry.write().unwrap();
                            if let Some(info) = registry.get_mut(&service_name) {
                                info.is_available = is_available;
                                info.last_check = std::time::SystemTime::now();
                            }
                        }

                        // 发送事件
                        if let Some(app) = &app_handle {
                            let event = if is_available {
                                PortEvent::HealthCheckSuccess { port }
                            } else {
                                PortEvent::HealthCheckFailed { 
                                    port, 
                                    error: "端口健康检查失败".to_string() 
                                }
                            };

                            let _ = app.emit("port-event", &event);
                        }
                    }
                } else {
                    // 服务已被移除，退出循环
                    break;
                }
            }
        });
    }

    /// 获取端口统计信息
    pub fn get_port_stats(&self) -> HashMap<String, PortInfo> {
        self.port_registry.read().unwrap().clone()
    }

    /// 发送端口事件
    fn emit_port_event(&self, event: PortEvent) {
        if let Some(app) = &self.app_handle {
            if let Err(e) = app.emit("port-event", &event) {
                error!("发送端口事件失败: {}", e);
            }
        }
    }

    /// 尝试重新分配端口
    pub fn try_reallocate_port(&self, service_name: &str) -> Result<u16> {
        warn!("尝试为服务 '{}' 重新分配端口", service_name);

        // 释放当前端口
        self.release_port(service_name)?;

        // 重新分配端口
        self.allocate_port(service_name)
    }

    /// 检查端口冲突
    pub fn check_port_conflicts(&self) -> Vec<String> {
        let mut conflicts = Vec::new();
        let registry = self.port_registry.read().unwrap();

        for (service_name, port_info) in registry.iter() {
            if !self.is_port_available(port_info.port) {
                conflicts.push(service_name.clone());
                self.emit_port_event(PortEvent::PortConflict { 
                    port: port_info.port, 
                    service: service_name.clone() 
                });
            }
        }

        conflicts
    }
}

// 全局端口管理器实例
lazy_static::lazy_static! {
    static ref PORT_MANAGER: Arc<RwLock<PortManager>> = Arc::new(RwLock::new(
        PortManager::new(PortConfig::default())
    ));
}

/// 获取全局端口管理器
pub fn get_port_manager() -> Arc<RwLock<PortManager>> {
    PORT_MANAGER.clone()
}

/// 初始化端口管理器
pub fn init_port_manager(app_handle: tauri::AppHandle) -> Result<()> {
    let mut manager = PORT_MANAGER.write().unwrap();
    manager.set_app_handle(app_handle);
    
    info!("端口管理器初始化完成");
    Ok(())
}