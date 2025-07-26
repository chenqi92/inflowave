/**
 * IoTDB 多协议客户端
 * 
 * 支持HTTP REST API、Thrift TCP、WebSocket等多种协议
 * 自动检测最佳协议并提供统一的接口
 */

use crate::models::{ConnectionConfig, QueryResult};
use anyhow::{Context, Result};
use log::{debug, info, warn};
use std::time::{Duration, Instant};
use std::collections::HashMap;

// 导入协议架构
use super::protocol::{
    ProtocolClient, ProtocolConfig, ProtocolType, ProtocolFactory,
    QueryRequest as ProtocolQueryRequest, QueryResponse as ProtocolQueryResponse,
    ConnectionStatus, ServerInfo
};

/// IoTDB多协议客户端
pub struct IoTDBMultiClient {
    config: ConnectionConfig,
    protocol_client: Option<Box<dyn ProtocolClient>>,
    preferred_protocol: Option<ProtocolType>,
    fallback_protocols: Vec<ProtocolType>,
}

impl IoTDBMultiClient {
    /// 创建新的多协议客户端
    pub fn new(config: ConnectionConfig) -> Self {
        Self {
            config,
            protocol_client: None,
            preferred_protocol: None,
            fallback_protocols: vec![
                ProtocolType::Http,
                ProtocolType::Thrift,
                ProtocolType::WebSocket,
            ],
        }
    }
    
    /// 设置首选协议
    pub fn set_preferred_protocol(&mut self, protocol: ProtocolType) {
        self.preferred_protocol = Some(protocol);
    }
    
    /// 设置备选协议列表
    pub fn set_fallback_protocols(&mut self, protocols: Vec<ProtocolType>) {
        self.fallback_protocols = protocols;
    }
    
    /// 自动检测并连接最佳协议
    pub async fn auto_connect(&mut self) -> Result<ProtocolType> {
        info!("开始自动检测IoTDB最佳协议: {}:{}", self.config.host, self.config.port);
        
        // 构建要尝试的协议列表
        let mut protocols_to_try = Vec::new();
        
        // 首先尝试首选协议
        if let Some(preferred) = &self.preferred_protocol {
            protocols_to_try.push(preferred.clone());
        }
        
        // 然后尝试备选协议
        for protocol in &self.fallback_protocols {
            if !protocols_to_try.contains(protocol) {
                protocols_to_try.push(protocol.clone());
            }
        }
        
        let mut last_error = None;
        
        for protocol in protocols_to_try {
            info!("尝试协议: {:?}", protocol);
            
            match self.try_connect_with_protocol(protocol.clone()).await {
                Ok(()) => {
                    info!("✅ 成功连接使用协议: {:?}", protocol);
                    return Ok(protocol);
                }
                Err(e) => {
                    warn!("❌ 协议 {:?} 连接失败: {}", protocol, e);
                    last_error = Some(e);
                }
            }
        }
        
        Err(last_error.unwrap_or_else(|| {
            anyhow::anyhow!("所有协议都无法连接")
        }))
    }
    
    /// 尝试使用指定协议连接
    async fn try_connect_with_protocol(&mut self, protocol: ProtocolType) -> Result<()> {
        let protocol_config = self.build_protocol_config(protocol.clone())?;
        
        let mut client = ProtocolFactory::create_client(protocol_config)
            .context(format!("创建 {:?} 协议客户端失败", protocol))?;
        
        // 测试连接
        client.test_connection().await
            .context(format!("{:?} 协议连接测试失败", protocol))?;
        
        self.protocol_client = Some(client);
        Ok(())
    }
    
    /// 构建协议配置
    fn build_protocol_config(&self, protocol: ProtocolType) -> Result<ProtocolConfig> {
        let port = match protocol {
            ProtocolType::Http => {
                // 尝试常用的REST API端口
                if self.config.port == 6667 {
                    31999 // 默认REST API端口
                } else {
                    self.config.port
                }
            }
            ProtocolType::Thrift => {
                // 使用配置的端口或默认Thrift端口
                if self.config.port == 31999 {
                    6667 // 默认Thrift端口
                } else {
                    self.config.port
                }
            }
            ProtocolType::WebSocket => {
                // WebSocket通常使用8080端口
                if self.config.port == 6667 || self.config.port == 31999 {
                    8080
                } else {
                    self.config.port
                }
            }
            _ => self.config.port,
        };
        
        let mut extra_params = HashMap::new();
        
        // 添加协议特定参数
        match protocol {
            ProtocolType::Http => {
                extra_params.insert("api_version".to_string(), "v1".to_string());
            }
            ProtocolType::Thrift => {
                extra_params.insert("session_timeout".to_string(), "30000".to_string());
            }
            ProtocolType::WebSocket => {
                extra_params.insert("heartbeat_interval".to_string(), "30".to_string());
            }
            _ => {}
        }
        
        Ok(ProtocolConfig {
            protocol_type: protocol,
            host: self.config.host.clone(),
            port,
            ssl: false, // 可以从配置中读取
            timeout: Duration::from_secs(10),
            username: self.config.username.clone(),
            password: self.config.password.clone(),
            extra_params,
        })
    }
    
    /// 测试连接
    pub async fn test_connection(&mut self) -> Result<u64> {
        debug!("测试IoTDB多协议连接: {}", self.config.host);
        
        // 如果还没有连接，先自动连接
        if self.protocol_client.is_none() {
            self.auto_connect().await?;
        }
        
        let client = self.protocol_client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("没有可用的协议客户端"))?;
        
        let latency = client.test_connection().await?;
        
        Ok(latency.as_millis() as u64)
    }
    
    /// 执行查询
    pub async fn execute_query(&mut self, sql: &str) -> Result<QueryResult> {
        debug!("执行多协议查询: {}", sql);
        
        let client = self.protocol_client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("未连接到IoTDB服务器"))?;
        
        let request = ProtocolQueryRequest {
            sql: sql.to_string(),
            database: None,
            session_id: None,
            fetch_size: Some(1000),
            timeout: Some(Duration::from_secs(30)),
            parameters: None,
        };
        
        let response = client.execute_query(request).await?;
        
        // 转换为应用程序的QueryResult格式
        Ok(self.convert_protocol_response(response))
    }
    
    /// 转换协议响应为应用程序格式
    fn convert_protocol_response(&self, response: ProtocolQueryResponse) -> QueryResult {
        let columns: Vec<String> = response.columns.into_iter().map(|col| col.name).collect();
        let rows: Vec<Vec<serde_json::Value>> = response.rows.into_iter()
            .map(|row| row.into_iter().map(|cell| serde_json::Value::String(cell)).collect())
            .collect();

        QueryResult::new(
            columns,
            rows,
            response.execution_time.as_millis() as u64,
        )
    }
    
    /// 获取数据库列表
    pub async fn get_databases(&mut self) -> Result<Vec<String>> {
        let result = self.execute_query("SHOW STORAGE GROUP").await?;
        
        // 从查询结果中提取数据库名称
        let mut databases = Vec::new();
        if let Some(data) = &result.data {
            for row in data {
                if !row.is_empty() {
                    if let Some(name) = row[0].as_str() {
                        databases.push(name.to_string());
                    }
                }
            }
        }
        
        Ok(databases)
    }
    
    /// 获取设备列表
    pub async fn get_devices(&mut self, database: &str) -> Result<Vec<String>> {
        let sql = format!("SHOW DEVICES {}", database);
        let result = self.execute_query(&sql).await?;
        
        let mut devices = Vec::new();
        if let Some(data) = &result.data {
            for row in data {
                if !row.is_empty() {
                    if let Some(name) = row[0].as_str() {
                        devices.push(name.to_string());
                    }
                }
            }
        }
        
        Ok(devices)
    }
    
    /// 获取时间序列列表
    pub async fn get_timeseries(&mut self, device_path: &str) -> Result<Vec<String>> {
        let sql = format!("SHOW TIMESERIES {}", device_path);
        let result = self.execute_query(&sql).await?;
        
        let mut timeseries = Vec::new();
        if let Some(data) = &result.data {
            for row in data {
                if !row.is_empty() {
                    if let Some(name) = row[0].as_str() {
                        timeseries.push(name.to_string());
                    }
                }
            }
        }
        
        Ok(timeseries)
    }
    
    /// 获取连接状态
    pub fn get_connection_status(&self) -> String {
        match &self.protocol_client {
            Some(client) => {
                match client.get_status() {
                    ConnectionStatus::Disconnected => "已断开".to_string(),
                    ConnectionStatus::Connecting => "连接中".to_string(),
                    ConnectionStatus::Connected => "已连接".to_string(),
                    ConnectionStatus::Authenticated => "已认证".to_string(),
                    ConnectionStatus::Error(msg) => format!("错误: {}", msg),
                }
            }
            None => "未初始化".to_string(),
        }
    }
    
    /// 获取当前使用的协议类型
    pub fn get_current_protocol(&self) -> Option<ProtocolType> {
        self.protocol_client.as_ref().map(|client| client.get_protocol_type())
    }
    
    /// 获取服务器信息
    pub async fn get_server_info(&mut self) -> Result<ServerInfo> {
        let client = self.protocol_client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("未连接到IoTDB服务器"))?;
        
        client.get_server_info().await
    }
    
    /// 断开连接
    pub async fn disconnect(&mut self) -> Result<()> {
        if let Some(mut client) = self.protocol_client.take() {
            client.disconnect().await?;
        }
        
        info!("已断开IoTDB多协议连接");
        Ok(())
    }
    
    /// 重新连接
    pub async fn reconnect(&mut self) -> Result<ProtocolType> {
        // 先断开现有连接
        self.disconnect().await?;
        
        // 重新自动连接
        self.auto_connect().await
    }
    
    /// 切换协议
    pub async fn switch_protocol(&mut self, protocol: ProtocolType) -> Result<()> {
        info!("切换到协议: {:?}", protocol);

        // 断开当前连接
        self.disconnect().await?;

        // 使用指定协议连接
        self.try_connect_with_protocol(protocol.clone()).await?;

        info!("成功切换到协议: {:?}", protocol);
        Ok(())
    }
    
    /// 获取协议性能统计
    pub async fn get_protocol_performance(&mut self) -> Result<HashMap<ProtocolType, Duration>> {
        let mut performance = HashMap::new();
        
        for protocol in &self.fallback_protocols.clone() {
            let start_time = Instant::now();
            
            match self.try_connect_with_protocol(protocol.clone()).await {
                Ok(()) => {
                    let latency = start_time.elapsed();
                    performance.insert(protocol.clone(), latency);
                    
                    // 断开测试连接
                    if let Some(mut client) = self.protocol_client.take() {
                        let _ = client.disconnect().await;
                    }
                }
                Err(_) => {
                    // 连接失败，记录最大延迟
                    performance.insert(protocol.clone(), Duration::from_secs(999));
                }
            }
        }
        
        Ok(performance)
    }
}
