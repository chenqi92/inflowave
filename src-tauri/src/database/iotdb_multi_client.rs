/**
 * IoTDB 多协议客户端
 *
 * 支持HTTP REST API、Thrift TCP等多种协议（桌面程序专用）
 * 自动检测最佳协议并提供统一的接口
 */

use crate::models::{ConnectionConfig, QueryResult, TreeNode};
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

        // 1. 添加系统信息节点
        let mut system_info = TreeNodeFactory::create_system_info();

        // 添加版本信息子节点
        let version_info = TreeNodeFactory::create_version_info(version.clone());
        system_info.add_child(version_info);

        // 添加存储引擎信息子节点
        let storage_engine_info = TreeNodeFactory::create_storage_engine_info();
        system_info.add_child(storage_engine_info);

        // 如果是集群版本，添加集群信息
        if self.is_cluster_version().await.unwrap_or(false) {
            let cluster_info = TreeNodeFactory::create_cluster_info();
            system_info.add_child(cluster_info);
        }

        nodes.push(system_info);

        // 2. 获取模式模板（如果支持）
        if let Ok(templates) = self.get_schema_templates().await {
            for template in templates {
                let template_node = TreeNodeFactory::create_schema_template(template);
                nodes.push(template_node);
            }
        }

        // 3. 获取存储组列表
        match self.get_databases().await {
            Ok(storage_groups) => {
                for sg in storage_groups {
                    let mut sg_node = TreeNodeFactory::create_storage_group(sg);
                    sg_node.metadata.insert("version".to_string(), serde_json::Value::String(version.clone()));
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
        use crate::models::TreeNodeType;

        let mut children = Vec::new();

        // 解析节点类型
        let parsed_type = match node_type {
            "StorageGroup" => TreeNodeType::StorageGroup,
            "Device" => TreeNodeType::Device,
            "Timeseries" => TreeNodeType::Timeseries,
            "SystemInfo" => TreeNodeType::SystemInfo,
            "StorageEngineInfo" => TreeNodeType::StorageEngineInfo,
            "ClusterInfo" => TreeNodeType::ClusterInfo,
            "SchemaTemplate" => TreeNodeType::SchemaTemplate,
            _ => return Ok(children),
        };

        match parsed_type {
            TreeNodeType::StorageGroup => {
                // 从节点 ID 中提取存储组名称（去掉 "sg_" 前缀）
                let storage_group_name = parent_node_id.strip_prefix("sg_").unwrap_or(parent_node_id);

                // 获取设备列表
                match self.get_devices_for_tree(storage_group_name).await {
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
            TreeNodeType::Device => {
                // 从设备节点 ID 中提取设备路径
                // 设备节点 ID 格式: {storage_group_id}/device_{device_path}
                let device_path = if let Some(device_part) = parent_node_id.split("/device_").nth(1) {
                    // 将下划线替换回点号，恢复原始设备路径
                    device_part.replace("_", ".")
                } else {
                    // 如果解析失败，直接使用 parent_node_id
                    parent_node_id.to_string()
                };

                // 获取时间序列（带详细信息）
                match self.get_timeseries_with_details(&device_path).await {
                    Ok(timeseries_info) => {
                        for ts_info in timeseries_info {
                            let ts_node = TreeNodeFactory::create_timeseries_with_info(
                                ts_info.name,
                                parent_node_id.to_string(),
                                ts_info.data_type,
                                ts_info.encoding,
                                ts_info.compression
                            );
                            children.push(ts_node);
                        }
                    }
                    Err(_) => {
                        // 如果获取详细信息失败，回退到简单方式
                        match self.get_timeseries_for_tree(&device_path).await {
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
                }

                // 检查是否有对齐时间序列
                if let Ok(aligned_ts) = self.get_aligned_timeseries(&device_path).await {
                    for aligned in aligned_ts {
                        let aligned_node = TreeNodeFactory::create_aligned_timeseries(
                            aligned,
                            parent_node_id.to_string()
                        );
                        children.push(aligned_node);
                    }
                }

                // 检查是否有设备模板
                if let Ok(templates) = self.get_device_templates(&device_path).await {
                    for template in templates {
                        let template_node = TreeNodeFactory::create_template(
                            template,
                            parent_node_id.to_string()
                        );
                        children.push(template_node);
                    }
                }
            }
            TreeNodeType::Timeseries => {
                // 时间序列节点可以展开显示详细信息
                let ts_path = if let Some(ts_part) = parent_node_id.split("/ts_").nth(1) {
                    ts_part.replace("_", ".")
                } else {
                    parent_node_id.to_string()
                };

                // 获取时间序列的详细信息
                if let Ok(ts_details) = self.get_timeseries_details(&ts_path).await {
                    // 添加数据类型信息
                    let data_type_node = TreeNodeFactory::create_data_type_info(
                        ts_details.data_type,
                        parent_node_id.to_string()
                    );
                    children.push(data_type_node);

                    // 添加编码信息
                    if let Some(encoding) = ts_details.encoding {
                        let encoding_node = TreeNodeFactory::create_encoding_info(
                            encoding,
                            parent_node_id.to_string()
                        );
                        children.push(encoding_node);
                    }

                    // 添加压缩信息
                    if let Some(compression) = ts_details.compression {
                        let compression_node = TreeNodeFactory::create_compression_info(
                            compression,
                            parent_node_id.to_string()
                        );
                        children.push(compression_node);
                    }

                    // 添加标签信息
                    if !ts_details.tags.is_empty() {
                        let tag_group = TreeNodeFactory::create_tag_group(parent_node_id.to_string());
                        children.push(tag_group);
                    }

                    // 添加属性信息
                    if !ts_details.attributes.is_empty() {
                        let attr_group = TreeNodeFactory::create_field_group(parent_node_id.to_string()); // 复用字段分组
                        children.push(attr_group);
                    }
                }
            }
            TreeNodeType::StorageEngineInfo => {
                // 获取存储引擎详细信息
                if let Ok(engine_info) = self.get_storage_engine_info().await {
                    for (key, value) in engine_info {
                        let info_node = TreeNode::new(
                            format!("{}/engine_{}", parent_node_id, key),
                            format!("{}: {}", key, value),
                            TreeNodeType::Field, // 复用字段类型
                        )
                        .with_parent(parent_node_id.to_string())
                        .as_leaf()
                        .as_system();
                        children.push(info_node);
                    }
                }
            }
            TreeNodeType::ClusterInfo => {
                // 获取集群信息
                if let Ok(cluster_nodes) = self.get_cluster_nodes().await {
                    for node_info in cluster_nodes {
                        let node_node = TreeNode::new(
                            format!("{}/node_{}", parent_node_id, node_info.id),
                            format!("Node {}: {} ({})", node_info.id, node_info.host, node_info.status),
                            TreeNodeType::Field, // 复用字段类型
                        )
                        .with_parent(parent_node_id.to_string())
                        .as_leaf()
                        .as_system();
                        children.push(node_node);
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
            // 对存储组名称进行转义，处理包含特殊字符的情况
            let escaped_sg = if storage_group.contains(':') || storage_group.contains('-') || storage_group.contains(' ') {
                format!("`{}`", storage_group)
            } else {
                storage_group.to_string()
            };
            format!("SHOW DEVICES {}.**", escaped_sg)
        };

        debug!("IoTDB 设备查询: {}", query);
        let result = self.execute_query(&query).await?;
        let mut devices = Vec::new();

        let rows = result.rows();
        if !rows.is_empty() {
            for row in rows {
                if let Some(device_path) = row.first() {
                    if let Some(device_str) = device_path.as_str() {
                        devices.push(device_str.to_string());
                    }
                }
            }
        }

        debug!("IoTDB 获取到 {} 个设备", devices.len());
        Ok(devices)
    }

    /// 获取时间序列列表（用于树节点）
    async fn get_timeseries_for_tree(&mut self, device_path: &str) -> Result<Vec<String>> {
        // 对设备路径进行转义，处理包含特殊字符的情况
        let escaped_path = if device_path.contains(':') || device_path.contains('-') || device_path.contains(' ') {
            format!("`{}`", device_path)
        } else {
            device_path.to_string()
        };
        let query = format!("SHOW TIMESERIES {}.**", escaped_path);

        debug!("IoTDB 时间序列查询: {}", query);
        let result = self.execute_query(&query).await?;
        let mut timeseries = Vec::new();

        let rows = result.rows();
        if !rows.is_empty() {
            for row in rows {
                if let Some(ts_path) = row.first() {
                    if let Some(ts_str) = ts_path.as_str() {
                        // 提取时间序列名称（去掉设备路径前缀）
                        if let Some(ts_name) = ts_str.strip_prefix(&format!("{}.", device_path)) {
                            timeseries.push(ts_name.to_string());
                        } else {
                            timeseries.push(ts_str.to_string());
                        }
                    }
                }
            }
        }

        Ok(timeseries)
    }

    /// 检查是否为集群版本
    async fn is_cluster_version(&mut self) -> Result<bool> {
        // 尝试执行集群相关查询来判断
        let result = self.execute_query("SHOW CLUSTER").await;
        Ok(result.is_ok())
    }

    /// 获取模式模板列表
    async fn get_schema_templates(&mut self) -> Result<Vec<String>> {
        let result = self.execute_query("SHOW SCHEMA TEMPLATES").await?;
        let mut templates = Vec::new();

        if let Some(data) = result.data {
            for row in data {
                if let Some(template_name) = row.first() {
                    if let Some(name_str) = template_name.as_str() {
                        templates.push(name_str.to_string());
                    }
                }
            }
        }

        Ok(templates)
    }

    /// 获取时间序列详细信息
    async fn get_timeseries_with_details(&mut self, device_path: &str) -> Result<Vec<TimeseriesInfo>> {
        let query = format!("SHOW TIMESERIES {} WITH SCHEMA", device_path);
        let result = self.execute_query(&query).await?;
        let mut timeseries_info = Vec::new();

        if let Some(data) = result.data {
            for row in data {
                if row.len() >= 4 {
                    let name = row[0].as_str().unwrap_or("").to_string();
                    let data_type = row[3].as_str().unwrap_or("UNKNOWN").to_string();
                    let encoding = if row.len() > 4 {
                        row[4].as_str().map(|s| s.to_string())
                    } else {
                        None
                    };
                    let compression = if row.len() > 5 {
                        row[5].as_str().map(|s| s.to_string())
                    } else {
                        None
                    };

                    timeseries_info.push(TimeseriesInfo {
                        name: name.split('.').last().unwrap_or(&name).to_string(),
                        data_type,
                        encoding,
                        compression,
                        tags: std::collections::HashMap::new(),
                        attributes: std::collections::HashMap::new(),
                    });
                }
            }
        }

        Ok(timeseries_info)
    }

    /// 获取对齐时间序列
    async fn get_aligned_timeseries(&mut self, device_path: &str) -> Result<Vec<String>> {
        let query = format!("SHOW TIMESERIES {} WHERE ALIGNED=true", device_path);
        let result = self.execute_query(&query).await?;
        let mut aligned_ts = Vec::new();

        if let Some(data) = result.data {
            for row in data {
                if let Some(ts_name) = row.first() {
                    if let Some(name_str) = ts_name.as_str() {
                        if let Some(sensor_name) = name_str.split('.').last() {
                            aligned_ts.push(sensor_name.to_string());
                        }
                    }
                }
            }
        }

        Ok(aligned_ts)
    }

    /// 获取设备模板
    async fn get_device_templates(&mut self, device_path: &str) -> Result<Vec<String>> {
        let query = format!("SHOW DEVICE TEMPLATE {}", device_path);
        let result = self.execute_query(&query).await?;
        let mut templates = Vec::new();

        if let Some(data) = result.data {
            for row in data {
                if let Some(template_name) = row.first() {
                    if let Some(name_str) = template_name.as_str() {
                        templates.push(name_str.to_string());
                    }
                }
            }
        }

        Ok(templates)
    }

    /// 获取时间序列详细信息
    async fn get_timeseries_details(&mut self, ts_path: &str) -> Result<TimeseriesDetails> {
        let query = format!("DESCRIBE TIMESERIES {}", ts_path);
        let result = self.execute_query(&query).await?;

        if let Some(data) = result.data {
            if let Some(row) = data.first() {
                return Ok(TimeseriesDetails {
                    data_type: row.get(1).and_then(|v| v.as_str()).unwrap_or("UNKNOWN").to_string(),
                    encoding: row.get(2).and_then(|v| v.as_str()).map(|s| s.to_string()),
                    compression: row.get(3).and_then(|v| v.as_str()).map(|s| s.to_string()),
                    tags: std::collections::HashMap::new(),
                    attributes: std::collections::HashMap::new(),
                });
            }
        }

        Err(anyhow::anyhow!("无法获取时间序列详细信息"))
    }

    /// 获取存储引擎信息
    async fn get_storage_engine_info(&mut self) -> Result<Vec<(String, String)>> {
        let result = self.execute_query("SHOW VARIABLES").await?;
        let mut engine_info = Vec::new();

        if let Some(data) = result.data {
            for row in data {
                if row.len() >= 2 {
                    let key = row[0].as_str().unwrap_or("").to_string();
                    let value = row[1].as_str().unwrap_or("").to_string();
                    engine_info.push((key, value));
                }
            }
        }

        Ok(engine_info)
    }

    /// 获取集群节点信息
    async fn get_cluster_nodes(&mut self) -> Result<Vec<ClusterNodeInfo>> {
        let result = self.execute_query("SHOW CLUSTER").await?;
        let mut nodes = Vec::new();

        if let Some(data) = result.data {
            for row in data {
                if row.len() >= 3 {
                    let id = row[0].as_str().unwrap_or("").to_string();
                    let host = row[1].as_str().unwrap_or("").to_string();
                    let status = row[2].as_str().unwrap_or("").to_string();

                    nodes.push(ClusterNodeInfo { id, host, status });
                }
            }
        }

        Ok(nodes)
    }
}

/// 时间序列信息结构
#[derive(Debug, Clone)]
struct TimeseriesInfo {
    name: String,
    data_type: String,
    encoding: Option<String>,
    compression: Option<String>,
    tags: std::collections::HashMap<String, String>,
    attributes: std::collections::HashMap<String, String>,
}

/// 时间序列详细信息结构
#[derive(Debug, Clone)]
struct TimeseriesDetails {
    data_type: String,
    encoding: Option<String>,
    compression: Option<String>,
    tags: std::collections::HashMap<String, String>,
    attributes: std::collections::HashMap<String, String>,
}

/// 集群节点信息结构
#[derive(Debug, Clone)]
struct ClusterNodeInfo {
    id: String,
    host: String,
    status: String,
}
