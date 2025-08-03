/**
 * IoTDB 官方客户端协议实现
 * 
 * 注意：此文件已被新的全版本兼容驱动系统替代
 * 提供空实现以保持向后兼容性
 */

use std::time::Duration;
use anyhow::Result;
use async_trait::async_trait;
use log::info;

use super::{
    ProtocolClient, ProtocolConfig, ProtocolType, QueryRequest, QueryResponse,
    ConnectionStatus, ServerInfo
};

/// IoTDB 官方客户端协议实现（已禁用）
#[derive(Debug)]
pub struct IoTDBOfficialClient {
    _placeholder: (),
}

#[derive(Debug, Clone)]
pub struct IoTDBOfficialConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub timeout: Duration,
    pub ssl: bool,
    pub extra_params: std::collections::HashMap<String, String>,
}

impl IoTDBOfficialClient {
    pub fn new(_config: IoTDBOfficialConfig) -> Self {
        Self { _placeholder: () }
    }
}

impl TryFrom<ProtocolConfig> for IoTDBOfficialClient {
    type Error = anyhow::Error;

    fn try_from(config: ProtocolConfig) -> Result<Self> {
        // 启用IoTDB官方客户端，使用新的全版本兼容驱动
        info!("启用IoTDB官方客户端: {}:{}", config.host, config.port);
        Ok(Self { _placeholder: () })
    }
}

#[async_trait]
impl ProtocolClient for IoTDBOfficialClient {
    async fn connect(&mut self) -> Result<()> {
        Err(anyhow::anyhow!("IoTDB 官方客户端已被禁用"))
    }
    
    async fn disconnect(&mut self) -> Result<()> {
        Ok(())
    }
    
    async fn authenticate(&mut self, _username: &str, _password: &str) -> Result<()> {
        Err(anyhow::anyhow!("IoTDB 官方客户端已被禁用"))
    }
    
    async fn execute_query(&mut self, _request: QueryRequest) -> Result<QueryResponse> {
        Err(anyhow::anyhow!("IoTDB 官方客户端已被禁用，请使用新的全版本兼容驱动"))
    }
    
    async fn test_connection(&mut self) -> Result<Duration> {
        Err(anyhow::anyhow!("IoTDB 官方客户端已被禁用"))
    }
    
    fn get_status(&self) -> ConnectionStatus {
        ConnectionStatus::Disconnected
    }

    fn get_protocol_type(&self) -> ProtocolType {
        ProtocolType::IoTDBOfficial
    }

    async fn get_server_info(&mut self) -> Result<ServerInfo> {
        Err(anyhow::anyhow!("IoTDB 官方客户端已被禁用"))
    }

    async fn close_query(&mut self, _query_id: &str) -> Result<()> {
        Ok(())
    }

    async fn fetch_more(&mut self, _query_id: &str, _fetch_size: i32) -> Result<QueryResponse> {
        Err(anyhow::anyhow!("IoTDB 官方客户端已被禁用"))
    }
}

pub fn create_test_client(_host: &str, _port: u16, _username: &str, _password: &str) -> IoTDBOfficialClient {
    IoTDBOfficialClient { _placeholder: () }
}
