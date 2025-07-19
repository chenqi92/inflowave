use std::sync::{Arc, Mutex};
use tokio::sync::oneshot;
use log::{info, error};
use serde::{Serialize, Deserialize};
use anyhow::{anyhow, Error};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub enabled: bool,
    pub preferred_port: u16,
    pub port_range: (u16, u16),
    pub auto_start: bool,
    pub features: Vec<String>, // ["debug", "proxy", "websocket"]
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            preferred_port: 1422,
            port_range: (1422, 1500),
            auto_start: false,
            features: vec!["debug".to_string()],
        }
    }
}

#[derive(Debug, Clone)]
pub struct EmbeddedServer {
    config: ServerConfig,
    server_handle: Arc<Mutex<Option<ServerHandle>>>,
    current_port: Arc<Mutex<Option<u16>>>,
}

#[derive(Debug)]
struct ServerHandle {
    shutdown_tx: oneshot::Sender<()>,
    port: u16,
}

impl EmbeddedServer {
    pub fn new(config: ServerConfig) -> Self {
        Self {
            config,
            server_handle: Arc::new(Mutex::new(None)),
            current_port: Arc::new(Mutex::new(None)),
        }
    }

    /// 启动嵌入式服务器
    pub async fn start(&self) -> Result<u16, Error> {
        if !self.config.enabled {
            return Err(anyhow!("嵌入式服务器未启用"));
        }

        // 检查是否已经运行
        if self.server_handle.lock().unwrap().is_some() {
            if let Some(port) = *self.current_port.lock().unwrap() {
                return Ok(port);
            }
        }

        // 使用端口管理器分配端口
        let port = {
            use crate::services::port_manager::get_port_manager;
            let manager = get_port_manager();
            let manager = manager.read().unwrap();
            
            // 首先尝试首选端口
            if manager.is_port_available(self.config.preferred_port) {
                self.config.preferred_port
            } else {
                // 查找可用端口
                manager.find_available_port()?
            }
        };

        // 创建关闭通道
        let (shutdown_tx, shutdown_rx) = oneshot::channel();

        // 启动服务器
        let server_features = self.config.features.clone();
        let server_port = port;
        
        tokio::spawn(async move {
            if let Err(e) = Self::run_server(server_port, server_features, shutdown_rx).await {
                error!("嵌入式服务器运行失败: {}", e);
            }
        });

        // 保存服务器句柄
        *self.server_handle.lock().unwrap() = Some(ServerHandle {
            shutdown_tx,
            port,
        });
        *self.current_port.lock().unwrap() = Some(port);

        info!("嵌入式服务器已启动，端口: {}", port);
        Ok(port)
    }

    /// 停止嵌入式服务器
    pub fn stop(&self) -> Result<(), Error> {
        let mut handle = self.server_handle.lock().unwrap();
        if let Some(server_handle) = handle.take() {
            let _ = server_handle.shutdown_tx.send(());
            *self.current_port.lock().unwrap() = None;
            info!("嵌入式服务器已停止");
        }
        Ok(())
    }

    /// 获取当前运行端口
    pub fn get_port(&self) -> Option<u16> {
        *self.current_port.lock().unwrap()
    }

    /// 检查服务器是否运行
    pub fn is_running(&self) -> bool {
        self.server_handle.lock().unwrap().is_some()
    }

    /// 重启服务器（处理端口冲突时使用）
    pub async fn restart(&self) -> Result<u16, Error> {
        self.stop()?;
        
        // 等待一下确保端口释放
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        self.start().await
    }

    /// 运行服务器的具体实现
    async fn run_server(
        port: u16,
        features: Vec<String>,
        mut shutdown_rx: oneshot::Receiver<()>,
    ) -> Result<(), Error> {
        info!("启动嵌入式服务器，端口: {}, 功能: {:?}", port, features);

        // 这里是一个简单的示例实现
        // 在实际项目中，你可以根据需要添加 HTTP 服务器
        
        if features.contains(&"debug".to_string()) {
            info!("启用调试功能");
        }
        
        if features.contains(&"proxy".to_string()) {
            info!("启用代理功能");
        }
        
        if features.contains(&"websocket".to_string()) {
            info!("启用 WebSocket 功能");
        }

        // 简单的服务器循环示例
        // 实际实现中可以使用 axum、warp 或其他 HTTP 框架
        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    info!("收到关闭信号，停止服务器");
                    break;
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => {
                    // 保持服务器运行，这里可以添加健康检查等
                }
            }
        }

        Ok(())
    }
}

// 全局嵌入式服务器实例
lazy_static::lazy_static! {
    static ref EMBEDDED_SERVER: Arc<Mutex<Option<EmbeddedServer>>> = Arc::new(Mutex::new(None));
}

/// 初始化嵌入式服务器
pub fn init_embedded_server(config: ServerConfig) -> Result<(), Error> {
    let server = EmbeddedServer::new(config);
    *EMBEDDED_SERVER.lock().unwrap() = Some(server);
    Ok(())
}

/// 获取嵌入式服务器实例
pub fn get_embedded_server() -> Option<EmbeddedServer> {
    EMBEDDED_SERVER.lock().unwrap().as_ref().cloned()
}

/// 启动嵌入式服务器
pub async fn start_embedded_server() -> Result<u16, Error> {
    if let Some(server) = get_embedded_server() {
        server.start().await
    } else {
        Err(anyhow!("嵌入式服务器未初始化"))
    }
}

/// 停止嵌入式服务器
pub fn stop_embedded_server() -> Result<(), Error> {
    if let Some(server) = get_embedded_server() {
        server.stop()
    } else {
        Ok(())
    }
}

/// 重启嵌入式服务器
pub async fn restart_embedded_server() -> Result<u16, Error> {
    if let Some(server) = get_embedded_server() {
        server.restart().await
    } else {
        Err(anyhow!("嵌入式服务器未初始化"))
    }
}