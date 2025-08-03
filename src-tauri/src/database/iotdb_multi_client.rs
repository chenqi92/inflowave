/**
 * IoTDB 多协议客户端
 *
 * 支持HTTP REST API、Thrift TCP等多种协议（桌面程序专用）
 * 自动检测最佳协议并提供统一的接口
 */

use crate::models::{ConnectionConfig, QueryResult, TreeNode};
use anyhow::{Context, Result};
use log::{debug, error, info, warn};
use std::time::{Duration, Instant};
use std::collections::HashMap;

// 导入协议架构
use super::protocol::{
    ProtocolClient, ProtocolConfig, ProtocolType, ProtocolFactory,
    QueryRequest as ProtocolQueryRequest, QueryResponse as ProtocolQueryResponse,
    ConnectionStatus, ServerInfo
};

// 导入新的 IoTDB 全版本兼容模块
use super::iotdb::{
    IoTDBManager, DriverConfig, QueryRequest as IoTDBQueryRequest,
    QueryResponse as IoTDBQueryResponse
};

/// IoTDB多协议客户端
#[derive(Debug)]
pub struct IoTDBMultiClient {
    config: ConnectionConfig,
    protocol_client: Option<Box<dyn ProtocolClient>>,
    preferred_protocol: Option<ProtocolType>,
    fallback_protocols: Vec<ProtocolType>,

    // 新的全版本兼容管理器
    iotdb_manager: Option<IoTDBManager>,
    use_new_driver: bool,
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
            iotdb_manager: None,
            use_new_driver: true, // 默认使用新驱动
        }
    }
    
    /// 设置首选协议
    pub fn set_preferred_protocol(&mut self, protocol: ProtocolType) {
        self.preferred_protocol = Some(protocol);
    }

    /// 启用新的全版本兼容驱动
    pub fn enable_new_driver(&mut self, enable: bool) {
        self.use_new_driver = enable;
    }

    /// 初始化新的 IoTDB 驱动系统
    async fn init_new_driver(&mut self) -> Result<()> {
        if !self.use_new_driver {
            return Ok(());
        }

        info!("初始化 IoTDB 全版本兼容驱动系统");

        // 创建驱动配置
        let driver_config = DriverConfig {
            host: self.config.host.clone(),
            port: self.config.port,
            username: self.config.username.clone(),
            password: self.config.password.clone(),
            ssl: self.config.ssl,
            timeout: Duration::from_secs(self.config.connection_timeout),
            extra_params: HashMap::new(),
        };

        // 创建管理器并添加连接
        let mut manager = IoTDBManager::new();
        let connection_id = format!("{}:{}", self.config.host, self.config.port);

        manager.add_connection(connection_id, driver_config).await
            .context("初始化新驱动失败")?;

        self.iotdb_manager = Some(manager);
        info!("IoTDB 全版本兼容驱动系统初始化成功");

        Ok(())
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
    
    /// 确保连接状态正常
    async fn ensure_connection(&mut self) -> Result<()> {
        // 优先使用新驱动系统检查连接状态
        if self.use_new_driver {
            if let Some(manager) = &mut self.iotdb_manager {
                let connection_id = format!("{}:{}", self.config.host, self.config.port);
                if let Some(driver) = manager.get_driver(&connection_id) {
                    if !driver.is_connected() {
                        warn!("新驱动连接已断开，尝试重新连接");
                        match driver.connect().await {
                            Ok(_) => {
                                info!("新驱动重连成功");
                                return Ok(());
                            }
                            Err(e) => {
                                warn!("新驱动重连失败: {}", e);
                                return Err(anyhow::anyhow!("新驱动重连失败: {}", e));
                            }
                        }
                    }
                    return Ok(());
                } else {
                    warn!("新驱动管理器中未找到连接，尝试重新初始化");
                    if let Err(e) = self.init_new_driver().await {
                        warn!("重新初始化新驱动失败: {}", e);
                        return Err(anyhow::anyhow!("重新初始化新驱动失败: {}", e));
                    }
                    return Ok(());
                }
            } else {
                warn!("新驱动管理器未初始化，尝试初始化");
                if let Err(e) = self.init_new_driver().await {
                    warn!("初始化新驱动失败: {}", e);
                    return Err(anyhow::anyhow!("初始化新驱动失败: {}", e));
                }
                return Ok(());
            }
        }

        // 检查旧协议系统连接状态
        if let Some(client) = &mut self.protocol_client {
            match client.test_connection().await {
                Ok(_) => Ok(()),
                Err(e) => {
                    warn!("协议客户端连接测试失败: {}", e);
                    Err(e)
                }
            }
        } else {
            debug!("旧协议系统未连接，尝试自动连接");
            match self.auto_connect().await {
                Ok(_) => Ok(()),
                Err(e) => Err(anyhow::anyhow!("自动连接失败: {}", e))
            }
        }
    }

    /// 测试连接
    pub async fn test_connection(&mut self) -> Result<u64> {
        debug!("测试IoTDB多协议连接: {}", self.config.host);

        // 优先尝试新驱动系统
        if self.use_new_driver {
            match self.init_new_driver().await {
                Ok(()) => {
                    if let Some(manager) = &mut self.iotdb_manager {
                        let connection_id = format!("{}:{}", self.config.host, self.config.port);
                        if let Some(driver) = manager.get_driver(&connection_id) {
                            match driver.test_connection().await {
                                Ok(latency) => {
                                    info!("新驱动系统连接测试成功，延迟: {}ms", latency.as_millis());
                                    return Ok(latency.as_millis() as u64);
                                }
                                Err(e) => {
                                    warn!("新驱动系统连接测试失败，回退到旧协议: {}", e);
                                    self.use_new_driver = false;
                                }
                            }
                        } else {
                            warn!("新驱动系统初始化成功但无法获取驱动实例，回退到旧协议");
                            self.use_new_driver = false;
                        }
                    } else {
                        warn!("新驱动系统初始化成功但管理器为空，回退到旧协议");
                        self.use_new_driver = false;
                    }
                }
                Err(e) => {
                    warn!("新驱动初始化失败，回退到旧协议: {}", e);
                    self.use_new_driver = false;
                }
            }
        }

        // 回退到旧协议系统
        info!("使用旧协议系统进行连接测试");

        if self.protocol_client.is_none() {
            match self.auto_connect().await {
                Ok(protocol) => {
                    info!("旧协议系统自动连接成功，使用协议: {:?}", protocol);
                }
                Err(e) => {
                    error!("旧协议系统自动连接失败: {}", e);
                    return Err(anyhow::anyhow!("所有连接方式都失败: {}", e));
                }
            }
        }

        let client = self.protocol_client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("没有可用的协议客户端"))?;

        match client.test_connection().await {
            Ok(latency) => {
                info!("旧协议系统连接测试成功，延迟: {}ms", latency.as_millis());
                Ok(latency.as_millis() as u64)
            }
            Err(e) => {
                error!("旧协议系统连接测试失败: {}", e);
                Err(anyhow::anyhow!("连接测试失败: {}", e))
            }
        }
    }
    
    /// 执行查询
    pub async fn execute_query(&mut self, sql: &str) -> Result<QueryResult> {
        debug!("执行多协议查询: {}", sql);

        // 优先使用新驱动系统
        if self.use_new_driver {
            if let Some(manager) = &mut self.iotdb_manager {
                let connection_id = format!("{}:{}", self.config.host, self.config.port);
                if let Some(driver) = manager.get_driver(&connection_id) {
                    // 检查驱动连接状态
                    if !driver.is_connected() {
                        warn!("新驱动未连接，尝试重新连接");
                        if let Err(e) = driver.connect().await {
                            warn!("新驱动重连失败: {}, 回退到旧协议系统", e);
                        } else {
                            info!("新驱动重连成功");
                        }
                    }

                    // 如果驱动已连接，尝试执行查询
                    if driver.is_connected() {
                        let request = IoTDBQueryRequest {
                            sql: sql.to_string(),
                            database: None,
                            session_id: None,
                            fetch_size: Some(1000),
                            timeout: Some(Duration::from_secs(30)),
                            parameters: None,
                        };

                        match driver.query(request).await {
                            Ok(response) => {
                                debug!("新驱动查询成功");
                                return Ok(self.convert_iotdb_response(response));
                            }
                            Err(e) => {
                                warn!("新驱动查询失败: {}, 回退到旧协议系统", e);
                            }
                        }
                    }
                }
            }
        }

        // 回退到旧协议系统
        debug!("使用旧协议系统执行查询");

        // 确保旧协议系统已连接
        if self.protocol_client.is_none() {
            debug!("旧协议系统未连接，尝试自动连接");
            if let Err(e) = self.auto_connect().await {
                return Err(anyhow::anyhow!("自动连接失败: {}", e));
            }
        }

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

        match client.execute_query(request.clone()).await {
            Ok(response) => {
                debug!("查询执行成功");
                return Ok(self.convert_protocol_response(response));
            }
            Err(e) => {
                error!("旧协议系统查询失败: {}", e);
                // 如果是连接相关的错误，尝试重新连接
                if e.to_string().contains("early eof") || e.to_string().contains("连接") {
                    warn!("检测到连接问题，尝试重新连接");
                    if let Err(reconnect_err) = self.auto_connect().await {
                        error!("重新连接失败: {}", reconnect_err);
                        return Err(e);
                    } else {
                        info!("重新连接成功，重试查询");
                        let client = self.protocol_client.as_mut()
                            .ok_or_else(|| anyhow::anyhow!("重连后客户端不可用"))?;
                        let response = client.execute_query(request).await?;
                        return Ok(self.convert_protocol_response(response));
                    }
                }
                return Err(e);
            }
        }
    }

    /// 转换新 IoTDB 驱动响应为应用程序格式
    fn convert_iotdb_response(&self, response: IoTDBQueryResponse) -> QueryResult {
        use super::iotdb::types::DataValue;

        let columns: Vec<String> = response.columns.into_iter().map(|col| col.name).collect();
        let rows: Vec<Vec<serde_json::Value>> = response.rows.into_iter()
            .map(|row| {
                row.into_iter().map(|cell| {
                    match cell {
                        DataValue::Boolean(b) => serde_json::Value::Bool(b),
                        DataValue::Int32(i) => serde_json::Value::Number(serde_json::Number::from(i)),
                        DataValue::Int64(i) => serde_json::Value::Number(serde_json::Number::from(i)),
                        DataValue::Float(f) => serde_json::Value::Number(
                            serde_json::Number::from_f64(f as f64).unwrap_or(serde_json::Number::from(0))
                        ),
                        DataValue::Double(d) => serde_json::Value::Number(
                            serde_json::Number::from_f64(d).unwrap_or(serde_json::Number::from(0))
                        ),
                        DataValue::Text(s) => serde_json::Value::String(s),
                        DataValue::Blob(b) => serde_json::Value::String(hex::encode(b)),
                        DataValue::Timestamp(t) => serde_json::Value::Number(serde_json::Number::from(t)),
                        DataValue::Null => serde_json::Value::Null,
                    }
                }).collect()
            })
            .collect();

        QueryResult::new(
            columns,
            rows,
            response.execution_time.as_millis() as u64,
        )
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
        debug!("开始获取IoTDB数据库列表");

        // 首先确保连接状态正常
        if let Err(e) = self.ensure_connection().await {
            warn!("连接状态检查失败: {}", e);
            // 尝试重新连接
            if let Err(reconnect_err) = self.reconnect().await {
                warn!("重连失败: {}", reconnect_err);
                // 如果重连也失败，尝试使用旧协议系统
                debug!("尝试使用旧协议系统");
                if self.protocol_client.is_none() {
                    if let Err(auto_connect_err) = self.auto_connect().await {
                        return Err(anyhow::anyhow!("所有连接方式都失败: 新驱动重连失败({}), 旧协议自动连接失败({})", reconnect_err, auto_connect_err));
                    }
                }
            }
        }

        // 使用IoTDB 1.3.0正确的查询语法
        let queries = vec![
            "SHOW STORAGE GROUP",                               // IoTDB 1.3.0标准语法
            "SHOW DATABASES",                                   // 备选语法
        ];

        for query in queries {
            debug!("尝试查询存储组: {}", query);
            match self.execute_query(query).await {
                Ok(result) => {
                    info!("查询 '{}' 成功", query);

                    // 从查询结果中提取数据库名称
                    let mut databases = Vec::new();
                    if let Some(data) = &result.data {
                        debug!("查询返回 {} 行数据", data.len());
                        for row in data.iter() {
                            if !row.is_empty() {
                                if let Some(name) = row[0].as_str() {
                                    let name = name.trim();
                                    if !name.is_empty() {
                                        debug!("解析到存储组名称: '{}'", name);
                                        databases.push(name.to_string());
                                    }
                                } else if let Some(value) = row.get(0) {
                                    // 尝试转换其他类型为字符串
                                    let name_str = value.to_string().trim().to_string();
                                    if !name_str.is_empty() && name_str != "null" {
                                        debug!("转换后的存储组名称: '{}'", name_str);
                                        databases.push(name_str);
                                    }
                                }
                            }
                        }
                    }

                    if !databases.is_empty() {
                        info!("成功获取到 {} 个存储组: {:?}", databases.len(), databases);
                        return Ok(databases);
                    } else {
                        debug!("查询 '{}' 返回空结果", query);
                    }
                }
                Err(e) => {
                    let error_msg = e.to_string();
                    debug!("查询 '{}' 失败: {}", query, error_msg);

                    // 如果是会话问题，尝试重新连接
                    if error_msg.contains("未打开会话") || error_msg.contains("session") {
                        warn!("检测到会话问题，尝试重新建立连接");
                        if let Err(reconnect_err) = self.ensure_connection().await {
                            warn!("重新建立连接失败: {}", reconnect_err);
                        } else {
                            // 重连成功，重试当前查询
                            debug!("重连成功，重试查询: {}", query);
                            if let Ok(retry_result) = self.execute_query(query).await {
                                info!("重试查询 '{}' 成功", query);
                                // 处理重试结果（复制上面的逻辑）
                                let mut databases = Vec::new();
                                if let Some(data) = &retry_result.data {
                                    for row in data.iter() {
                                        if !row.is_empty() {
                                            if let Some(name) = row[0].as_str() {
                                                let name = name.trim();
                                                if !name.is_empty() {
                                                    databases.push(name.to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                                if !databases.is_empty() {
                                    info!("重试后成功获取到 {} 个存储组: {:?}", databases.len(), databases);
                                    return Ok(databases);
                                }
                            }
                        }
                    }
                    continue;
                }
            }
        }

        // 如果所有查询都失败，尝试一些简单的查询来验证连接
        warn!("无法获取存储组列表，尝试简单查询验证连接");

        // 尝试一些IoTDB 1.3.0支持的简单查询
        let test_queries = vec![
            "SHOW STORAGE GROUP",                               // 最基本的查询
            "SHOW TIMESERIES LIMIT 1",                         // 简单的时间序列查询
        ];

        for test_query in test_queries {
            match self.execute_query(test_query).await {
                Ok(_) => {
                    info!("连接验证成功（使用查询: {}），但可能没有存储组或权限不足", test_query);
                    return Ok(vec![]); // 返回空列表表示连接正常但没有数据或权限不足
                }
                Err(e) => {
                    debug!("验证查询 '{}' 失败: {}", test_query, e);
                    continue;
                }
            }
        }

        error!("所有验证查询都失败，连接可能存在问题");
        Err(anyhow::anyhow!("无法获取 IoTDB 存储组列表：所有查询方法都失败，连接可能存在问题"))
    }
    
    /// 获取设备列表
    pub async fn get_devices(&mut self, database: &str) -> Result<Vec<String>> {
        let sql = if database.is_empty() {
            "SHOW DEVICES".to_string()
        } else {
            // 对数据库名称进行转义，处理包含特殊字符的情况
            let escaped_db = self.escape_identifier(database);
            format!("SHOW DEVICES {}.**", escaped_db)
        };

        debug!("IoTDB 设备查询: {}", sql);
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

        // 1. 获取存储组列表（主要数据节点）
        match self.get_databases().await {
            Ok(storage_groups) => {
                if storage_groups.is_empty() {
                    log::warn!("未获取到任何存储组，可能是查询失败或数据库为空");
                } else {
                    log::info!("获取到 {} 个存储组: {:?}", storage_groups.len(), storage_groups);
                    for sg in storage_groups {
                        let mut sg_node = TreeNodeFactory::create_storage_group(sg);
                        sg_node.metadata.insert("version".to_string(), serde_json::Value::String(version.clone()));
                        nodes.push(sg_node);
                    }
                }
            }
            Err(e) => {
                log::error!("获取存储组列表失败: {}", e);
                // 不要在失败时添加假数据，让用户知道有问题
            }
        }

        // 2. 添加用户管理节点
        let users_node = TreeNodeFactory::create_user_management("用户管理".to_string());
        nodes.push(users_node);

        // 3. 添加权限管理节点
        let privileges_node = TreeNodeFactory::create_privilege_management("权限管理".to_string());
        nodes.push(privileges_node);

        // 4. 添加函数管理节点
        let functions_node = TreeNodeFactory::create_function_management("函数管理".to_string());
        nodes.push(functions_node);

        // 5. 添加触发器管理节点
        let triggers_node = TreeNodeFactory::create_trigger_management("触发器管理".to_string());
        nodes.push(triggers_node);

        log::info!("🎉 成功生成 {} 个树节点: {:?}",
            nodes.len(),
            nodes.iter().map(|n| format!("{} ({:?})", n.name, n.node_type)).collect::<Vec<_>>()
        );

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
            "UserGroup" => TreeNodeType::UserGroup,
            "PrivilegeGroup" => TreeNodeType::PrivilegeGroup,
            "FunctionGroup" => TreeNodeType::FunctionGroup,
            "TriggerGroup" => TreeNodeType::TriggerGroup,
            _ => return Ok(children),
        };

        match parsed_type {
            TreeNodeType::StorageGroup => {
                // 从节点 ID 中提取存储组名称（去掉 "sg_" 前缀）
                if let Some(storage_group_name) = parent_node_id.strip_prefix("sg_") {
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
                } else {
                    log::debug!("跳过非存储组节点的设备查询: {}", parent_node_id);
                }
            }
            TreeNodeType::UserGroup => {
                // 用户管理节点 - 获取用户列表
                match self.get_users_for_tree().await {
                    Ok(users) => {
                        for user in users {
                            let user_node = TreeNodeFactory::create_user(user, parent_node_id.to_string());
                            children.push(user_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取用户列表失败: {}", e);
                    }
                }
            }
            TreeNodeType::PrivilegeGroup => {
                // 权限管理节点 - 获取权限信息
                match self.get_privileges_for_tree().await {
                    Ok(privileges) => {
                        for privilege in privileges {
                            let privilege_node = TreeNodeFactory::create_privilege(privilege, parent_node_id.to_string());
                            children.push(privilege_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取权限列表失败: {}", e);
                    }
                }
            }
            TreeNodeType::FunctionGroup => {
                // 函数管理节点 - 获取函数列表
                match self.get_functions_for_tree().await {
                    Ok(functions) => {
                        for function in functions {
                            let function_node = TreeNodeFactory::create_function(function, parent_node_id.to_string());
                            children.push(function_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取函数列表失败: {}", e);
                    }
                }
            }
            TreeNodeType::TriggerGroup => {
                // 触发器管理节点 - 获取触发器列表
                match self.get_triggers_for_tree().await {
                    Ok(triggers) => {
                        for trigger in triggers {
                            let trigger_node = TreeNodeFactory::create_trigger(trigger, parent_node_id.to_string());
                            children.push(trigger_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取触发器列表失败: {}", e);
                    }
                }
            }
            TreeNodeType::SystemInfo | TreeNodeType::SchemaTemplate => {
                // 系统信息和模式模板节点不需要查询设备
                log::debug!("跳过系统节点的子节点查询: {} ({:?})", parent_node_id, parsed_type);
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
                    if let serde_json::Value::Object(map) = engine_info {
                        for (key, value) in map {
                            let value_str = match value {
                                serde_json::Value::String(s) => s,
                                serde_json::Value::Array(arr) => format!("{} items", arr.len()),
                                _ => value.to_string(),
                            };
                            let info_node = TreeNode::new(
                                format!("{}/engine_{}", parent_node_id, key),
                                format!("{}: {}", key, value_str),
                                TreeNodeType::Field, // 复用字段类型
                            )
                            .with_parent(parent_node_id.to_string())
                            .as_leaf()
                            .as_system();
                            children.push(info_node);
                        }
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
        // 检查存储组名称是否有效
        if storage_group.is_empty() {
            return Ok(vec![]);
        }

        // 尝试多种查询方式获取设备
        let queries = vec![
            format!("SHOW DEVICES {}", storage_group),
            format!("SHOW DEVICES {}.**", storage_group),
            format!("SHOW DEVICES root.{}", storage_group),
            format!("SHOW DEVICES root.{}.**", storage_group),
        ];

        for query in queries {
            debug!("IoTDB 设备查询: {}", query);
            match self.execute_query(&query).await {
                Ok(result) => {
                    let mut devices = Vec::new();
                    let rows = result.rows();

                    if !rows.is_empty() {
                        for row in rows {
                            if let Some(device_path) = row.first() {
                                if let Some(device_str) = device_path.as_str() {
                                    let device_str = device_str.trim();
                                    if !device_str.is_empty() {
                                        devices.push(device_str.to_string());
                                    }
                                }
                            }
                        }
                    }

                    if !devices.is_empty() {
                        debug!("IoTDB 获取到 {} 个设备", devices.len());
                        return Ok(devices);
                    }
                }
                Err(e) => {
                    debug!("设备查询失败: {} - {}", query, e);
                    continue;
                }
            }
        }

        debug!("未找到任何设备，存储组: {}", storage_group);
        Ok(vec![])
    }

    /// 获取时间序列列表（用于树节点）
    async fn get_timeseries_for_tree(&mut self, device_path: &str) -> Result<Vec<String>> {
        // 尝试多种查询方式获取时间序列
        let queries = vec![
            format!("SHOW TIMESERIES {}", device_path),
            format!("SHOW TIMESERIES {}.*", device_path),
            format!("SHOW TIMESERIES {}.**", device_path),
        ];

        for query in queries {
            debug!("IoTDB 时间序列查询: {}", query);
            match self.execute_query(&query).await {
                Ok(result) => {
                    let mut timeseries = Vec::new();
                    let rows = result.rows();

                    if !rows.is_empty() {
                        for row in rows {
                            if let Some(ts_path) = row.first() {
                                if let Some(ts_str) = ts_path.as_str() {
                                    let ts_str = ts_str.trim();
                                    if !ts_str.is_empty() {
                                        // 提取时间序列名称（去掉设备路径前缀）
                                        if let Some(ts_name) = ts_str.strip_prefix(&format!("{}.", device_path)) {
                                            timeseries.push(ts_name.to_string());
                                        } else {
                                            // 如果无法去掉前缀，使用完整路径
                                            timeseries.push(ts_str.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if !timeseries.is_empty() {
                        debug!("IoTDB 获取到 {} 个时间序列", timeseries.len());
                        return Ok(timeseries);
                    }
                }
                Err(e) => {
                    debug!("时间序列查询失败: {} - {}", query, e);
                    continue;
                }
            }
        }

        debug!("未找到任何时间序列，设备: {}", device_path);
        Ok(vec![])
    }

    /// 检查是否为集群版本
    async fn is_cluster_version(&mut self) -> Result<bool> {
        // 尝试执行集群相关查询来判断
        match self.execute_query("SHOW CLUSTER").await {
            Ok(result) => {
                // 检查是否有实际的集群数据
                let has_cluster_data = result.data
                    .as_ref()
                    .map(|data| !data.is_empty())
                    .unwrap_or(false);
                log::debug!("集群查询成功，有数据: {}", has_cluster_data);
                Ok(has_cluster_data)
            }
            Err(e) => {
                log::debug!("集群查询失败: {}", e);
                Ok(false)
            }
        }
    }

    /// 获取模式模板列表
    async fn get_schema_templates(&mut self) -> Result<Vec<String>> {
        match self.execute_query("SHOW SCHEMA TEMPLATES").await {
            Ok(result) => {
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

                log::debug!("获取到 {} 个模式模板: {:?}", templates.len(), templates);
                Ok(templates)
            }
            Err(e) => {
                log::debug!("获取模式模板失败: {}", e);
                Ok(vec![]) // 返回空列表而不是错误，因为不是所有IoTDB版本都支持模式模板
            }
        }
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

    /// 检查是否是时间格式的存储组名称
    fn is_time_format_storage_group(&self, storage_group: &str) -> bool {
        // 检查是否匹配时间格式模式，如 "2024-01-01T00:00:00"
        // 简单的字符串匹配，避免引入regex依赖
        storage_group.len() == 19 &&
        storage_group.chars().nth(4) == Some('-') &&
        storage_group.chars().nth(7) == Some('-') &&
        storage_group.chars().nth(10) == Some('T') &&
        storage_group.chars().nth(13) == Some(':') &&
        storage_group.chars().nth(16) == Some(':') &&
        storage_group.chars().take(4).all(|c| c.is_ascii_digit()) &&
        storage_group.chars().skip(5).take(2).all(|c| c.is_ascii_digit()) &&
        storage_group.chars().skip(8).take(2).all(|c| c.is_ascii_digit())
    }

    /// 转义标识符，处理包含特殊字符的情况
    fn escape_identifier(&self, identifier: &str) -> String {
        // 对于IoTDB，我们尝试不同的转义策略

        // 检查是否包含需要转义的字符
        let needs_escape = identifier.chars().any(|c| {
            // 检查是否包含特殊字符、空格、emoji等
            !c.is_ascii_alphanumeric() && c != '_' && c != '.' && c != '-'
        });

        if needs_escape {
            // 对于包含特殊字符的标识符，尝试不同的转义方式
            if identifier.contains(':') || identifier.contains(' ') {
                // 对于包含冒号或空格的标识符，使用双引号转义
                format!("\"{}\"", identifier.replace("\"", "\\\""))
            } else if identifier.contains('-') && identifier.contains('T') {
                // 对于时间格式的标识符，直接使用原始名称
                identifier.to_string()
            } else {
                // 其他情况使用反引号转义
                format!("`{}`", identifier.replace("`", "``"))
            }
        } else {
            identifier.to_string()
        }
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



    /// 获取版本信息
    async fn get_version_info(&mut self) -> Result<serde_json::Value> {
        let queries = vec![
            "SHOW VERSION",
            "SELECT version()",
            "SHOW CLUSTER",
        ];

        for query in queries {
            if let Ok(result) = self.execute_query(query).await {
                if let Some(data) = result.data {
                    if !data.is_empty() && !data[0].is_empty() {
                        return Ok(serde_json::json!({
                            "query": query,
                            "result": data
                        }));
                    }
                }
            }
        }

        Ok(serde_json::json!({
            "error": "无法获取版本信息"
        }))
    }

    /// 获取存储引擎信息
    async fn get_storage_engine_info(&mut self) -> Result<serde_json::Value> {
        let queries = vec![
            "SHOW STORAGE GROUP",
            "SHOW DATABASES",
            "SHOW FUNCTIONS",
            "SHOW TRIGGERS",
        ];

        let mut info = serde_json::Map::new();

        for query in queries {
            if let Ok(result) = self.execute_query(query).await {
                let key = query.to_lowercase().replace(" ", "_");
                info.insert(key, serde_json::json!(result.data.unwrap_or_default()));
            }
        }

        Ok(serde_json::Value::Object(info))
    }

    /// 获取集群信息
    async fn get_cluster_info(&mut self) -> Result<serde_json::Value> {
        let queries = vec![
            "SHOW CLUSTER",
            "SHOW DATANODES",
            "SHOW CONFIGNODES",
            "SHOW REGIONS",
        ];

        let mut cluster_info = serde_json::Map::new();

        for query in queries {
            if let Ok(result) = self.execute_query(query).await {
                let key = query.to_lowercase().replace(" ", "_");
                cluster_info.insert(key, serde_json::json!(result.data.unwrap_or_default()));
            }
        }

        Ok(serde_json::Value::Object(cluster_info))
    }

    /// 获取用户和权限信息
    async fn get_users_and_privileges(&mut self) -> Result<Vec<String>> {
        let queries = vec![
            "LIST USER",
            "SHOW USERS",
        ];

        for query in queries {
            if let Ok(result) = self.execute_query(query).await {
                if let Some(data) = result.data {
                    let users: Vec<String> = data.iter()
                        .filter_map(|row| row.first()?.as_str().map(|s| s.to_string()))
                        .collect();
                    if !users.is_empty() {
                        return Ok(users);
                    }
                }
            }
        }

        Ok(vec![])
    }

    /// 获取函数列表
    async fn get_functions(&mut self) -> Result<Vec<String>> {
        let queries = vec![
            "SHOW FUNCTIONS",
            "LIST FUNCTIONS",
        ];

        for query in queries {
            if let Ok(result) = self.execute_query(query).await {
                if let Some(data) = result.data {
                    let functions: Vec<String> = data.iter()
                        .filter_map(|row| row.first()?.as_str().map(|s| s.to_string()))
                        .collect();
                    if !functions.is_empty() {
                        return Ok(functions);
                    }
                }
            }
        }

        Ok(vec![])
    }

    /// 获取触发器列表
    async fn get_triggers(&mut self) -> Result<Vec<String>> {
        let queries = vec![
            "SHOW TRIGGERS",
            "LIST TRIGGERS",
        ];

        for query in queries {
            if let Ok(result) = self.execute_query(query).await {
                if let Some(data) = result.data {
                    let triggers: Vec<String> = data.iter()
                        .filter_map(|row| row.first()?.as_str().map(|s| s.to_string()))
                        .collect();
                    if !triggers.is_empty() {
                        return Ok(triggers);
                    }
                }
            }
        }

        Ok(vec![])
    }

    /// 获取用户列表用于树显示
    async fn get_users_for_tree(&mut self) -> Result<Vec<String>> {
        let sql = "LIST USER";
        match self.execute_query(sql).await {
            Ok(response) => {
                let mut users = Vec::new();
                for row in response.rows() {
                    if !row.is_empty() {
                        if let Some(user_value) = row.get(0) {
                            if let Some(user_str) = user_value.as_str() {
                                users.push(user_str.to_string());
                            }
                        }
                    }
                }
                Ok(users)
            }
            Err(_) => {
                // 如果查询失败，返回默认用户
                Ok(vec!["root".to_string()])
            }
        }
    }

    /// 获取权限列表用于树显示
    async fn get_privileges_for_tree(&mut self) -> Result<Vec<String>> {
        // IoTDB的权限类型
        Ok(vec![
            "READ_DATA".to_string(),
            "WRITE_DATA".to_string(),
            "READ_SCHEMA".to_string(),
            "WRITE_SCHEMA".to_string(),
            "MANAGE_DATABASE".to_string(),
            "MANAGE_USER".to_string(),
            "MANAGE_ROLE".to_string(),
        ])
    }

    /// 获取函数列表用于树显示
    async fn get_functions_for_tree(&mut self) -> Result<Vec<String>> {
        let sql = "SHOW FUNCTIONS";
        match self.execute_query(sql).await {
            Ok(response) => {
                let mut functions = Vec::new();
                for row in response.rows() {
                    if !row.is_empty() {
                        if let Some(func_value) = row.get(0) {
                            if let Some(func_str) = func_value.as_str() {
                                functions.push(func_str.to_string());
                            }
                        }
                    }
                }
                Ok(functions)
            }
            Err(_) => {
                // 如果查询失败，返回内置函数
                Ok(vec![
                    "AVG".to_string(),
                    "COUNT".to_string(),
                    "MAX".to_string(),
                    "MIN".to_string(),
                    "SUM".to_string(),
                ])
            }
        }
    }

    /// 获取触发器列表用于树显示
    async fn get_triggers_for_tree(&mut self) -> Result<Vec<String>> {
        let sql = "SHOW TRIGGERS";
        match self.execute_query(sql).await {
            Ok(response) => {
                let mut triggers = Vec::new();
                for row in response.rows() {
                    if !row.is_empty() {
                        if let Some(trigger_value) = row.get(0) {
                            if let Some(trigger_str) = trigger_value.as_str() {
                                triggers.push(trigger_str.to_string());
                            }
                        }
                    }
                }
                Ok(triggers)
            }
            Err(_) => {
                // 如果查询失败，返回空列表
                Ok(vec![])
            }
        }
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
