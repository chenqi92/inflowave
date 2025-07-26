/**
 * IoTDB 多协议客户端
 *
 * 支持HTTP REST API、Thrift TCP等多种协议（桌面程序专用）
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
#[derive(Debug)]
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
                ProtocolType::IoTDBOfficial,  // IoTDB 官方客户端，最优选择
                ProtocolType::Thrift,         // IoTDB 标准协议，次选
                ProtocolType::Http,           // REST API 备用协议
                // 注意：桌面程序不需要 WebSocket 协议
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
        
        println!("📋 要尝试的协议列表: {:?}", protocols_to_try);

        for protocol in protocols_to_try {
            println!("🔍 尝试协议: {:?}", protocol);

            match self.try_connect_with_protocol(protocol.clone()).await {
                Ok(()) => {
                    info!("✅ 成功连接使用协议: {:?}", protocol);
                    return Ok(protocol);
                }
                Err(e) => {
                    // 只记录简洁的错误信息
                    let error_msg = e.to_string().lines().next().unwrap_or("未知错误").to_string();
                    warn!("❌ 协议 {:?} 连接失败: {}", protocol, error_msg);
                    last_error = Some(anyhow::Error::msg(format!("协议 {:?} 连接失败", protocol)));
                }
            }
        }
        
        Err(last_error.unwrap_or_else(|| {
            anyhow::anyhow!("所有协议都无法连接")
        }))
    }
    
    /// 尝试使用指定协议连接
    async fn try_connect_with_protocol(&mut self, protocol: ProtocolType) -> Result<()> {
        println!("🔧 构建 {:?} 协议配置", protocol);
        let protocol_config = self.build_protocol_config(protocol.clone())?;
        println!("📡 协议配置: host={}:{}, type={:?}", protocol_config.host, protocol_config.port, protocol_config.protocol_type);

        println!("🏗️ 创建 {:?} 协议客户端", protocol);
        let mut client = ProtocolFactory::create_client(protocol_config)
            .context(format!("创建 {:?} 协议客户端失败", protocol))?;

        // 测试连接
        println!("🔌 测试 {:?} 协议连接", protocol);
        match client.test_connection().await {
            Ok(duration) => {
                println!("✅ {:?} 协议连接测试成功，耗时: {:?}", protocol, duration);
            }
            Err(e) => {
                // 只显示简洁的错误信息，不显示堆栈跟踪
                let error_msg = e.to_string().lines().next().unwrap_or("未知错误").to_string();
                println!("❌ {:?} 协议连接测试失败: {}", protocol, error_msg);
                // 使用简单的错误消息，避免 anyhow 的堆栈跟踪
                return Err(anyhow::Error::msg(format!("{:?} 协议连接失败", protocol)));
            }
        }

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
            // WebSocket 协议已移除（桌面程序不需要）
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
            // WebSocket 协议已移除（桌面程序不需要）
            _ => {}
        }
        
        // 使用用户配置的连接超时时间
        let timeout_secs = if self.config.connection_timeout > 0 {
            self.config.connection_timeout
        } else {
            30 // 默认30秒
        };

        Ok(ProtocolConfig {
            protocol_type: protocol,
            host: self.config.host.clone(),
            port,
            ssl: self.config.ssl,
            timeout: Duration::from_secs(timeout_secs),
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

    /// 获取连接配置
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }

    /// 检测数据库版本
    pub async fn detect_version(&mut self) -> Result<String> {
        // 尝试执行版本查询
        match self.execute_query("SHOW VERSION").await {
            Ok(result) => {
                // 解析版本信息
                let rows = result.rows();
                if !rows.is_empty() {
                    if let Some(first_row) = rows.first() {
                        if let Some(version_info) = first_row.first() {
                            return Ok(format!("IoTDB-{}", version_info));
                        }
                    }
                }
                Ok("IoTDB-unknown".to_string())
            }
            Err(_) => {
                // 如果 SHOW VERSION 不支持，尝试其他方法
                match self.execute_query("SELECT * FROM root.** LIMIT 1").await {
                    Ok(_) => Ok("IoTDB-1.0+".to_string()), // 支持新语法，可能是1.0+版本
                    Err(_) => Ok("IoTDB-0.13.x".to_string()), // 可能是较老版本
                }
            }
        }
    }

    /// 生成 IoTDB 数据源树
    pub async fn get_tree_nodes(&mut self) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::TreeNodeFactory;

        let mut nodes = Vec::new();

        // 检测版本以确定树结构
        let version = self.detect_version().await.unwrap_or_else(|_| "IoTDB-1.0+".to_string());

        // 获取存储组列表
        match self.get_databases().await {
            Ok(storage_groups) => {
                for sg in storage_groups {
                    let sg_node = TreeNodeFactory::create_storage_group_with_version(sg, version.clone());
                    nodes.push(sg_node);
                }
            }
            Err(e) => {
                log::warn!("获取存储组列表失败: {}", e);
            }
        }

        Ok(nodes)
    }

    /// 获取树节点的子节点（懒加载）
    pub async fn get_tree_children(&mut self, parent_node_id: &str, node_type: &str) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::TreeNodeFactory;

        let mut children = Vec::new();

        match node_type {
            "storage_group" => {
                // 获取设备列表
                match self.get_devices_for_tree(parent_node_id).await {
                    Ok(devices) => {
                        for device in devices {
                            let device_node = TreeNodeFactory::create_device(
                                device.clone(),
                                parent_node_id.to_string()
                            );
                            children.push(device_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取设备列表失败: {}", e);
                    }
                }
            }
            "device" => {
                // 获取时间序列
                match self.get_timeseries_for_tree(parent_node_id).await {
                    Ok(timeseries) => {
                        for ts in timeseries {
                            let ts_node = TreeNodeFactory::create_timeseries(
                                ts.clone(),
                                parent_node_id.to_string()
                            );
                            children.push(ts_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取时间序列失败: {}", e);
                    }
                }
            }
            _ => {
                log::debug!("未知节点类型: {}", node_type);
            }
        }

        Ok(children)
    }

    /// 获取设备列表（用于树节点）
    async fn get_devices_for_tree(&mut self, storage_group: &str) -> Result<Vec<String>> {
        // 使用 SHOW DEVICES 查询设备
        let query = if storage_group.is_empty() {
            "SHOW DEVICES".to_string()
        } else {
            format!("SHOW DEVICES {}.** ", storage_group)
        };

        let result = self.execute_query(&query).await?;
        let mut devices = Vec::new();

        let rows = result.rows();
        if !rows.is_empty() {
            for row in rows {
                if let Some(device_path) = row.first() {
                    devices.push(device_path.clone());
                }
            }
        }

        Ok(devices)
    }

    /// 获取时间序列列表（用于树节点）
    async fn get_timeseries_for_tree(&mut self, device_path: &str) -> Result<Vec<String>> {
        let query = format!("SHOW TIMESERIES {}.** ", device_path);
        let result = self.execute_query(&query).await?;
        let mut timeseries = Vec::new();

        let rows = result.rows();
        if !rows.is_empty() {
            for row in rows {
                if let Some(ts_path) = row.first() {
                    // 提取时间序列名称（去掉设备路径前缀）
                    if let Some(ts_name) = ts_path.strip_prefix(&format!("{}.", device_path)) {
                        timeseries.push(ts_name.to_string());
                    } else {
                        timeseries.push(ts_path.clone());
                    }
                }
            }
        }

        Ok(timeseries)
    }
}
