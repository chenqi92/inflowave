/**
 * IoTDB HTTP 客户端实现
 * 
 * 通过 IoTDB 的 REST API 实现数据库操作
 */

use crate::models::{ConnectionConfig, QueryResult};
use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Instant;
use log::{debug, error, info, warn};
use base64::{Engine as _, engine::general_purpose};

// IoTDB REST API 响应结构
#[derive(Debug, Deserialize)]
struct IoTDBResponse {
    code: i32,
    message: String,
    data: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct IoTDBQueryResult {
    #[serde(rename = "columnNames")]
    column_names: Vec<String>,
    values: Vec<Vec<Value>>,
    #[serde(rename = "rowCount")]
    row_count: Option<i64>,
}

#[derive(Debug, Serialize)]
struct IoTDBQueryRequest {
    sql: String,
    #[serde(rename = "rowLimit")]
    row_limit: Option<i32>,
}

/// IoTDB HTTP 客户端
#[derive(Debug, Clone)]
pub struct IoTDBHttpClient {
    config: ConnectionConfig,
    client: Client,
    base_url: String,
}

impl IoTDBHttpClient {
    /// 创建新的 IoTDB HTTP 客户端
    pub fn new(config: ConnectionConfig) -> Self {
        // 使用用户配置的连接超时时间，如果未设置则使用默认值
        let timeout_secs = if config.connection_timeout > 0 {
            config.connection_timeout
        } else {
            30 // 默认30秒
        };

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(timeout_secs))
            .build()
            .expect("Failed to create HTTP client");

        let base_url = format!("http://{}:{}", config.host, config.port);

        Self {
            config,
            client,
            base_url,
        }
    }

    /// 测试连接 - 优先使用HTTP REST API，TCP作为备选
    pub async fn test_connection(&self) -> Result<u64> {
        info!("🔍 开始测试 IoTDB 连接: {}:{}", self.config.host, self.config.port);
        info!("📋 连接配置: 超时={}秒, 用户名={}, SSL={}",
              self.config.connection_timeout,
              self.config.username.as_ref().unwrap_or(&"未设置".to_string()),
              self.config.ssl);

        // 🔒 安全检查：强制要求认证信息
        if self.config.username.is_none() || self.config.password.is_none() {
            return Err(anyhow::anyhow!(
                "安全要求: IoTDB连接必须提供用户名和密码。\n\
                请在连接配置中设置正确的认证信息。"
            ));
        }

        // 🎯 优先尝试HTTP REST API (推荐方式)
        info!("🌐 尝试 HTTP REST API 连接...");
        match self.test_http_connection().await {
            Ok(latency) => {
                info!("✅ IoTDB HTTP REST API连接成功，延迟: {}ms", latency);
                return Ok(latency);
            }
            Err(http_error) => {
                warn!("❌ HTTP REST API连接失败: {}", http_error);
                info!("💡 建议启用IoTDB的REST API服务 (端口31999)");
            }
        }

        // 🔧 尝试TCP连接（仅用于连接测试，不支持完整Thrift协议）
        info!("🔌 尝试 TCP 连接...");
        match self.test_tcp_connection().await {
            Ok(latency) => {
                warn!("⚠️  TCP连接成功，但IoTDB需要Thrift协议支持");
                warn!("⚠️  建议配置并使用REST API以获得完整功能");
                Ok(latency)
            }
            Err(tcp_error) => {
                error!("❌ IoTDB连接完全失败");
                Err(anyhow::anyhow!(
                    "无法连接到IoTDB服务器 {}:{}。\n\
                    \n🔍 诊断信息:\n\
                    • 连接超时: {}秒\n\
                    • HTTP REST API: 不可用 (检查端口31999是否开放)\n\
                    • TCP连接: {} \n\
                    \n💡 解决建议:\n\
                    1. 检查IoTDB服务是否正在运行\n\
                    2. 验证主机地址和端口号是否正确\n\
                    3. 检查防火墙设置\n\
                    4. 启用IoTDB的REST API服务\n\
                    5. 检查Docker容器端口映射: docker port <container>\n\
                    6. 查看IoTDB日志: docker logs <container>\n\
                    7. 验证配置文件: docker exec -it <container> cat conf/iotdb-datanode.properties\n\
                    8. 确认用户名密码: {} / {}",
                    self.config.host,
                    self.config.port,
                    self.config.connection_timeout,
                    tcp_error,
                    self.config.username.as_ref().unwrap_or(&"未设置".to_string()),
                    if self.config.password.is_some() { "已设置" } else { "未设置" }
                ))
            }
        }
    }

    /// 测试HTTP连接 - 尝试多个REST API端口和认证方式
    async fn test_http_connection(&self) -> Result<u64> {
        let start = Instant::now();

        // 构建端口列表：优先使用用户指定的端口，然后尝试常用端口
        let mut rest_ports = vec![];

        // 如果用户指定的端口是常见的 REST API 端口，优先使用
        if [31999, 18080, 8080].contains(&self.config.port) {
            rest_ports.push(self.config.port);
        }

        // 添加常用的 REST API 端口
        for port in [31999, 18080, 8080] {
            if !rest_ports.contains(&port) {
                rest_ports.push(port);
            }
        }

        // 如果用户指定的端口不是常见的 REST API 端口，也尝试一下
        if ![31999, 18080, 8080].contains(&self.config.port) {
            rest_ports.push(self.config.port);
        }

        info!("🔍 将尝试以下 REST API 端口: {:?}", rest_ports);

        for port in rest_ports {
            info!("🔍 尝试REST API端口: {}", port);

            // 首先快速检查端口是否可达
            if !self.quick_port_check(port).await {
                warn!("  ❌ 端口 {} 不可达，跳过", port);
                continue;
            }

            let base_url = format!("http://{}:{}", self.config.host, port);
            info!("  ✅ 端口 {} 可达，测试 REST API", port);

            // 尝试不同的端点
            let endpoints = vec![
                "/rest/v1/query",
                "/rest/v2/query",
                "/api/v1/query",
                "/ping"
            ];

            for endpoint in endpoints {
                info!("    📡 测试端点: {}{}", base_url, endpoint);
                match self.test_rest_endpoint(&base_url, endpoint).await {
                    Ok(_latency) => {
                        let total_latency = start.elapsed().as_millis() as u64;
                        info!("✅ IoTDB REST API连接成功: {}:{}{}, 延迟: {}ms",
                              self.config.host, port, endpoint, total_latency);
                        return Ok(total_latency);
                    }
                    Err(e) => {
                        warn!("    ❌ 端点 {}:{}{} 失败: {}", self.config.host, port, endpoint, e);
                    }
                }
            }
        }

        Err(anyhow::anyhow!("所有REST API端口和端点都无法连接"))
    }

    /// 快速检查端口是否可达
    async fn quick_port_check(&self, port: u16) -> bool {
        use tokio::net::TcpStream;
        use tokio::time::{timeout, Duration};

        let address = format!("{}:{}", self.config.host, port);
        match timeout(Duration::from_secs(3), TcpStream::connect(&address)).await {
            Ok(Ok(_)) => true,
            _ => false,
        }
    }

    /// 测试单个REST端点
    async fn test_rest_endpoint(&self, base_url: &str, endpoint: &str) -> Result<u64> {
        let start = Instant::now();
        let url = format!("{}{}", base_url, endpoint);

        // 使用用户配置的连接超时时间
        let timeout_secs = if self.config.connection_timeout > 0 {
            self.config.connection_timeout
        } else {
            30 // 默认30秒
        };

        // 根据端点类型构建不同的请求
        let request_result = if endpoint.contains("query") {
            // 查询端点 - 发送POST请求
            let request_body = serde_json::json!({
                "sql": "SHOW STORAGE GROUP"
            });

            let mut request_builder = self.client
                .post(&url)
                .header("Content-Type", "application/json")
                .timeout(std::time::Duration::from_secs(timeout_secs))
                .json(&request_body);

            // 添加认证头
            if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
                let auth_string = format!("{}:{}", username, password);
                let encoded = general_purpose::STANDARD.encode(auth_string.as_bytes());
                request_builder = request_builder.header("Authorization", format!("Basic {}", encoded));
            }

            request_builder.send().await
        } else {
            // Ping端点 - 发送GET请求
            self.client
                .get(&url)
                .timeout(std::time::Duration::from_secs(timeout_secs))
                .send()
                .await
        };

        match request_result {
            Ok(response) => {
                let latency = start.elapsed().as_millis() as u64;
                let status = response.status();

                if status.is_success() {
                    info!("✅ REST端点 {} 响应成功: {}, 延迟: {}ms", url, status, latency);
                    Ok(latency)
                } else if status == 401 {
                    Err(anyhow::anyhow!("认证失败: 用户名或密码错误 (HTTP 401)"))
                } else if status == 404 {
                    Err(anyhow::anyhow!("端点不存在: {} (HTTP 404)", endpoint))
                } else if status == 500 {
                    let error_text = response.text().await.unwrap_or_default();
                    Err(anyhow::anyhow!("服务器内部错误 (HTTP 500): {}", error_text))
                } else {
                    let error_text = response.text().await.unwrap_or_default();
                    Err(anyhow::anyhow!("HTTP请求失败: {} - {}", status, error_text))
                }
            }
            Err(e) => {
                if e.is_timeout() {
                    Err(anyhow::anyhow!("连接超时: 请检查网络连接或增加超时时间"))
                } else if e.is_connect() {
                    Err(anyhow::anyhow!("连接被拒绝: 请检查服务是否运行和端口是否正确"))
                } else {
                    Err(anyhow::anyhow!("连接失败: {}", e))
                }
            }
        }
    }

    /// 测试TCP连接（包含认证验证）
    async fn test_tcp_connection(&self) -> Result<u64> {
        use tokio::net::TcpStream;
        use tokio::time::{timeout, Duration};

        let start = Instant::now();
        let address = format!("{}:{}", self.config.host, self.config.port);

        info!("🔌 尝试TCP连接并验证认证: {}", address);

        // 使用用户配置的连接超时时间
        let timeout_secs = if self.config.connection_timeout > 0 {
            self.config.connection_timeout
        } else {
            30 // 默认30秒
        };

        // 尝试建立TCP连接
        match timeout(Duration::from_secs(timeout_secs), TcpStream::connect(&address)).await {
            Ok(Ok(mut stream)) => {
                info!("✅ TCP连接建立成功，开始验证认证...");
                // 🔒 安全修复: 必须验证认证信息
                if let Err(auth_error) = self.verify_tcp_authentication(&mut stream).await {
                    error!("❌ IoTDB TCP认证验证失败: {}", auth_error);
                    return Err(anyhow::anyhow!("认证验证失败: {}", auth_error));
                }

                let latency = start.elapsed().as_millis() as u64;
                info!("✅ IoTDB TCP连接和认证验证成功，延迟: {}ms", latency);
                Ok(latency)
            }
            Ok(Err(e)) => {
                error!("❌ IoTDB TCP连接失败: {}", e);
                if e.kind() == std::io::ErrorKind::ConnectionRefused {
                    Err(anyhow::anyhow!("TCP连接被拒绝: 请检查IoTDB服务是否运行在端口 {}", self.config.port))
                } else if e.kind() == std::io::ErrorKind::TimedOut {
                    Err(anyhow::anyhow!("TCP连接超时: 请检查网络连接"))
                } else {
                    Err(anyhow::anyhow!("TCP连接失败: {}", e))
                }
            }
            Err(_) => {
                error!("❌ IoTDB TCP连接超时 ({}秒)", timeout_secs);
                Err(anyhow::anyhow!("TCP连接超时: 请检查网络连接或增加超时时间"))
            }
        }
    }

    /// 验证TCP连接的认证信息
    async fn verify_tcp_authentication(&self, _stream: &mut tokio::net::TcpStream) -> Result<()> {
        // 🚨 重要说明：IoTDB使用Thrift协议，不是纯文本协议
        // 当前的实现是一个简化的测试，实际生产环境需要实现完整的Thrift协议

        warn!("IoTDB TCP连接使用Thrift协议，当前实现仅用于连接测试");
        warn!("建议使用REST API进行生产环境连接");

        // 由于IoTDB使用Thrift协议，直接发送文本查询会导致连接关闭
        // 这里我们返回一个明确的错误信息，指导用户使用正确的连接方式
        Err(anyhow::anyhow!(
            "IoTDB TCP连接需要Thrift协议支持。\n\
            当前应用暂不支持Thrift协议。\n\
            建议解决方案：\n\
            1. 启用IoTDB的REST API (端口31999)\n\
            2. 使用HTTP连接方式\n\
            3. 检查IoTDB容器配置：docker exec -it <container> cat conf/iotdb-datanode.properties"
        ))
    }

    /// 执行查询
    pub async fn execute_query(&self, query: &str, _database: Option<&str>) -> Result<QueryResult> {
        debug!("执行 IoTDB 查询: {}", query);

        // 首先尝试HTTP REST API
        match self.execute_http_query(query).await {
            Ok(result) => {
                debug!("HTTP查询成功");
                return Ok(result);
            }
            Err(e) => {
                debug!("HTTP查询失败: {}, 使用模拟数据", e);
            }
        }

        // HTTP失败时，返回模拟数据
        self.execute_fallback_query(query).await
    }

    /// 通过HTTP REST API执行查询
    async fn execute_http_query(&self, query: &str) -> Result<QueryResult> {
        let start = Instant::now();
        let url = format!("{}/rest/v1/query", self.base_url);

        // 构建请求体
        let request_body = IoTDBQueryRequest {
            sql: query.to_string(),
            row_limit: Some(10000), // 默认限制 10000 行
        };

        // 发送请求
        let mut request_builder = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body);

        // 添加认证头
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            if !username.is_empty() {
                let auth_string = format!("{}:{}", username, password);
                let encoded = general_purpose::STANDARD.encode(auth_string.as_bytes());
                request_builder = request_builder.header("Authorization", format!("Basic {}", encoded));
            }
        }

        let response = request_builder
            .send()
            .await
            .context("Failed to send query request")?;

        let execution_time = start.elapsed().as_millis() as u64;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("IoTDB HTTP查询失败: {} - {}", status, error_text);
            return Err(anyhow::anyhow!("HTTP Query failed: {} - {}", status, error_text));
        }

        // 解析响应
        let iotdb_response: IoTDBResponse = response
            .json()
            .await
            .context("Failed to parse response JSON")?;

        if iotdb_response.code != 200 {
            error!("IoTDB 查询错误: {}", iotdb_response.message);
            return Err(anyhow::anyhow!("Query error: {}", iotdb_response.message));
        }

        // 解析查询结果
        if let Some(data) = iotdb_response.data {
            if let Ok(query_result) = serde_json::from_value::<IoTDBQueryResult>(data) {
                // 转换为标准格式
                let columns = query_result.column_names;
                let rows: Vec<Vec<Value>> = query_result.values;
                let row_count = query_result.row_count.unwrap_or(rows.len() as i64) as usize;

                info!("IoTDB HTTP查询成功，返回 {} 行数据，耗时: {}ms", row_count, execution_time);

                return Ok(QueryResult {
                    results: vec![],
                    execution_time: Some(execution_time),
                    row_count: Some(row_count),
                    error: None,
                    data: Some(rows),
                    columns: Some(columns),
                });
            }
        }

        // 如果没有数据，返回空结果
        Ok(QueryResult {
            results: vec![],
            execution_time: Some(execution_time),
            row_count: Some(0),
            error: None,
            data: None,
            columns: None,
        })
    }

    /// 执行模拟查询（当HTTP失败时使用）
    async fn execute_fallback_query(&self, query: &str) -> Result<QueryResult> {
        error!("IoTDB HTTP 查询失败，查询: {}", query);

        // 不返回模拟数据，而是返回错误
        Err(anyhow::anyhow!("IoTDB 查询失败：HTTP 连接不可用，请检查 IoTDB 服务状态和连接配置"))

    }

    /// 获取存储组列表
    pub async fn get_storage_groups(&self) -> Result<Vec<String>> {
        debug!("获取 IoTDB 存储组列表");

        // 尝试不同版本的IoTDB命令
        let queries = vec![
            "SHOW STORAGE GROUP",  // IoTDB 0.x
            "SHOW DATABASES",      // IoTDB 1.x+
            "SHOW DATABASE",       // 备选
        ];

        for query in queries {
            debug!("尝试查询: {}", query);
            match self.execute_query(query, None).await {
                Ok(result) => {
                    if let Some(rows) = result.data {
                        let storage_groups: Vec<String> = rows
                            .into_iter()
                            .filter_map(|row| {
                                // 尝试从第一列获取存储组名称
                                if let Some(Value::String(sg)) = row.get(0) {
                                    Some(sg.clone())
                                } else if let Some(value) = row.get(0) {
                                    // 尝试转换其他类型为字符串
                                    Some(value.to_string())
                                } else {
                                    None
                                }
                            })
                            .collect();

                        if !storage_groups.is_empty() {
                            info!("获取到 {} 个存储组", storage_groups.len());
                            return Ok(storage_groups);
                        }
                    }
                }
                Err(e) => {
                    debug!("查询 '{}' 失败: {}", query, e);
                    continue;
                }
            }
        }

        // 如果所有查询都失败，返回错误而不是假数据
        Err(anyhow::anyhow!("无法获取 IoTDB 存储组列表：所有查询方法都失败，请检查连接配置和服务状态"))
    }

    /// 获取数据库列表（在 IoTDB 中对应存储组）
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        debug!("获取 IoTDB 数据库列表（存储组）");
        self.get_storage_groups().await
    }

    /// 获取设备列表
    pub async fn get_devices(&self, storage_group: &str) -> Result<Vec<String>> {
        debug!("获取 IoTDB 设备列表: {}", storage_group);

        // IoTDB 正确的语法是 SHOW DEVICES root.sg1.** 或者 SHOW DEVICES
        let query = if storage_group.is_empty() {
            "SHOW DEVICES".to_string()
        } else {
            format!("SHOW DEVICES {}.** ", storage_group)
        };

        let result = self.execute_query(&query, None).await?;

        // 从查询结果中提取设备名称
        if let Some(rows) = result.data {
            let devices: Vec<String> = rows
                .into_iter()
                .filter_map(|row| {
                    if let Some(Value::String(device)) = row.get(0) {
                        Some(device.clone())
                    } else {
                        None
                    }
                })
                .collect();

            info!("获取到 {} 个设备", devices.len());
            return Ok(devices);
        }

        // 如果查询失败，返回错误而不是假数据
        Err(anyhow::anyhow!("无法获取存储组 {} 的设备列表：查询失败，请检查存储组是否存在", storage_group))
    }

    /// 获取时间序列列表
    pub async fn get_timeseries(&self, device_path: &str) -> Result<Vec<String>> {
        debug!("获取 IoTDB 时间序列列表: {}", device_path);

        let query = format!("SHOW TIMESERIES {}.*", device_path);
        let result = self.execute_query(&query, None).await?;

        // 从查询结果中提取时间序列名称
        if let Some(rows) = result.data {
            let timeseries: Vec<String> = rows
                .into_iter()
                .filter_map(|row| {
                    if let Some(Value::String(ts)) = row.get(0) {
                        // 提取时间序列的最后一部分作为字段名
                        if let Some(field_name) = ts.split('.').last() {
                            Some(field_name.to_string())
                        } else {
                            Some(ts.clone())
                        }
                    } else {
                        None
                    }
                })
                .collect();

            info!("获取到 {} 个时间序列", timeseries.len());
            return Ok(timeseries);
        }

        // 如果查询失败，返回错误而不是假数据
        Err(anyhow::anyhow!("无法获取设备 {} 的时间序列列表：查询失败，请检查设备是否存在", device_path))
    }

    /// 创建存储组
    pub async fn create_storage_group(&self, storage_group: &str) -> Result<()> {
        debug!("创建 IoTDB 存储组: {}", storage_group);

        let query = format!("CREATE STORAGE GROUP {}", storage_group);
        let result = self.execute_query(&query, None).await?;

        if result.error.is_some() {
            return Err(anyhow::anyhow!("Failed to create storage group: {:?}", result.error));
        }

        info!("存储组 '{}' 创建成功", storage_group);
        Ok(())
    }

    /// 删除存储组
    pub async fn drop_storage_group(&self, storage_group: &str) -> Result<()> {
        debug!("删除 IoTDB 存储组: {}", storage_group);

        let query = format!("DELETE STORAGE GROUP {}", storage_group);
        let result = self.execute_query(&query, None).await?;

        if result.error.is_some() {
            return Err(anyhow::anyhow!("Failed to drop storage group: {:?}", result.error));
        }

        info!("存储组 '{}' 删除成功", storage_group);
        Ok(())
    }

    /// 获取配置
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }
}
