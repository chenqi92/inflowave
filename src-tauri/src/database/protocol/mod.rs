/**
 * 数据库协议抽象层
 *
 * 支持多种协议：HTTP REST API、Thrift TCP（桌面程序专用）
 */

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

pub mod http;
pub mod iotdb_official;
// 注意：桌面程序不需要 WebSocket 协议
// pub mod websocket;

/// 协议类型枚举
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ProtocolType {
    /// HTTP REST API
    Http,

    /// IoTDB 官方客户端（推荐）
    IoTDBOfficial,
    /// gRPC协议（暂未实现）
    Grpc,
}

/// 协议配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolConfig {
    pub protocol_type: ProtocolType,
    pub host: String,
    pub port: u16,
    pub ssl: bool,
    pub timeout: Duration,
    pub username: Option<String>,
    pub password: Option<String>,
    pub extra_params: HashMap<String, String>,
}

/// 查询请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryRequest {
    pub sql: String,
    pub database: Option<String>,
    pub session_id: Option<String>,
    pub fetch_size: Option<i32>,
    pub timeout: Option<Duration>,
    pub parameters: Option<HashMap<String, String>>,
}

/// 查询响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResponse {
    pub success: bool,
    pub message: Option<String>,
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<String>>,
    pub execution_time: Duration,
    pub row_count: usize,
    pub has_more: bool,
    pub query_id: Option<String>,
}

/// 列信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub comment: Option<String>,
}

/// 连接状态
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Authenticated,
    Error(String),
}

/// 协议客户端特征
#[async_trait]
pub trait ProtocolClient: Send + Sync + std::fmt::Debug {
    /// 连接到服务器
    async fn connect(&mut self) -> Result<()>;
    
    /// 断开连接
    async fn disconnect(&mut self) -> Result<()>;
    
    /// 认证
    async fn authenticate(&mut self, username: &str, password: &str) -> Result<()>;
    
    /// 执行查询
    async fn execute_query(&mut self, request: QueryRequest) -> Result<QueryResponse>;
    
    /// 测试连接
    async fn test_connection(&mut self) -> Result<Duration>;
    
    /// 获取连接状态
    fn get_status(&self) -> ConnectionStatus;
    
    /// 获取协议类型
    fn get_protocol_type(&self) -> ProtocolType;
    
    /// 获取服务器信息
    async fn get_server_info(&mut self) -> Result<ServerInfo>;
    
    /// 关闭查询（如果支持）
    async fn close_query(&mut self, query_id: &str) -> Result<()>;
    
    /// 获取更多结果（分页查询）
    async fn fetch_more(&mut self, query_id: &str, fetch_size: i32) -> Result<QueryResponse>;
}

/// 服务器信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub version: String,
    pub build_info: Option<String>,
    pub supported_protocols: Vec<ProtocolType>,
    pub capabilities: Vec<String>,
    pub timezone: Option<String>,
}

/// 协议工厂
pub struct ProtocolFactory;

impl ProtocolFactory {
    /// 创建协议客户端
    pub fn create_client(config: ProtocolConfig) -> Result<Box<dyn ProtocolClient>> {
        match config.protocol_type {
            ProtocolType::Http => {
                Ok(Box::new(http::HttpClient::new(config)?))
            }
            ProtocolType::IoTDBOfficial => {
                Ok(Box::new(iotdb_official::IoTDBOfficialClient::try_from(config)?))
            }
            ProtocolType::Grpc => {
                Err(anyhow::anyhow!("gRPC协议暂未实现"))
            }
        }
    }
    
    /// 自动检测最佳协议
    pub async fn detect_best_protocol(
        host: &str,
        port: u16,
        username: Option<String>,
        password: Option<String>,
    ) -> Result<ProtocolType> {
        let protocols = vec![
            ProtocolType::IoTDBOfficial,  // IoTDB 官方客户端，唯一选择
            ProtocolType::Http,           // REST API 备用协议
        ];
        
        for protocol in protocols {
            let config = ProtocolConfig {
                protocol_type: protocol.clone(),
                host: host.to_string(),
                port,
                ssl: false,
                timeout: Duration::from_secs(5),
                username: username.clone(),
                password: password.clone(),
                extra_params: HashMap::new(),
            };
            
            if let Ok(mut client) = Self::create_client(config) {
                if client.test_connection().await.is_ok() {
                    return Ok(protocol);
                }
            }
        }
        
        Err(anyhow::anyhow!("无法检测到可用的协议"))
    }
    
    /// 获取协议的默认端口
    pub fn get_default_port(protocol: &ProtocolType) -> u16 {
        match protocol {
            ProtocolType::Http => 18080,           // IoTDB REST API默认端口
            // Thrift协议已移除
            ProtocolType::IoTDBOfficial => 6667,   // IoTDB 官方客户端使用 Thrift 端口
            ProtocolType::Grpc => 6668,            // gRPC默认端口
        }
    }
    
    /// 检查协议是否支持特定功能
    pub fn supports_feature(protocol: &ProtocolType, feature: &str) -> bool {
        match (protocol, feature) {
            (ProtocolType::Http, "pagination") => true,
            (ProtocolType::Http, "async_query") => true,

            (ProtocolType::IoTDBOfficial, "session") => true,
            (ProtocolType::IoTDBOfficial, "prepared_statement") => true,
            (ProtocolType::IoTDBOfficial, "real_time") => true,
            (ProtocolType::IoTDBOfficial, "streaming") => true,
            (ProtocolType::IoTDBOfficial, "official") => true,  // 官方客户端标识
            _ => false,
        }
    }
}

/// 协议管理器 - 支持多协议连接池
pub struct ProtocolManager {
    clients: HashMap<String, Box<dyn ProtocolClient>>,
    configs: HashMap<String, ProtocolConfig>,
}

impl ProtocolManager {
    pub fn new() -> Self {
        Self {
            clients: HashMap::new(),
            configs: HashMap::new(),
        }
    }
    
    /// 添加连接配置
    pub fn add_config(&mut self, connection_id: String, config: ProtocolConfig) {
        self.configs.insert(connection_id, config);
    }
    
    /// 获取或创建客户端
    pub async fn get_client(&mut self, connection_id: &str) -> Result<&mut Box<dyn ProtocolClient>> {
        if !self.clients.contains_key(connection_id) {
            let config = self.configs.get(connection_id)
                .ok_or_else(|| anyhow::anyhow!("连接配置不存在: {}", connection_id))?
                .clone();
            
            let mut client = ProtocolFactory::create_client(config)?;
            client.connect().await?;
            
            self.clients.insert(connection_id.to_string(), client);
        }
        
        Ok(self.clients.get_mut(connection_id).unwrap())
    }
    
    /// 移除客户端
    pub async fn remove_client(&mut self, connection_id: &str) -> Result<()> {
        if let Some(mut client) = self.clients.remove(connection_id) {
            client.disconnect().await?;
        }
        self.configs.remove(connection_id);
        Ok(())
    }
    
    /// 测试所有连接
    pub async fn test_all_connections(&mut self) -> HashMap<String, Result<Duration>> {
        let mut results = HashMap::new();
        
        for (connection_id, config) in &self.configs.clone() {
            let result = match ProtocolFactory::create_client(config.clone()) {
                Ok(mut client) => client.test_connection().await,
                Err(e) => Err(e),
            };
            results.insert(connection_id.clone(), result);
        }
        
        results
    }
}

/// 协议错误类型
#[derive(Debug, thiserror::Error)]
pub enum ProtocolError {
    #[error("连接错误: {0}")]
    ConnectionError(String),
    
    #[error("认证错误: {0}")]
    AuthenticationError(String),
    
    #[error("查询错误: {0}")]
    QueryError(String),
    
    #[error("协议错误: {0}")]
    ProtocolError(String),
    
    #[error("超时错误")]
    TimeoutError,
    
    #[error("不支持的操作: {0}")]
    UnsupportedOperation(String),
}

// 移除From实现，因为anyhow已经自动实现了
// impl From<ProtocolError> for anyhow::Error 会与anyhow的泛型实现冲突
