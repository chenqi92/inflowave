/**
 * IoTDB HTTP REST API协议客户端实现
 */

use super::{
    ProtocolClient, ProtocolConfig, QueryRequest, QueryResponse, 
    ConnectionStatus, ServerInfo, ColumnInfo, ProtocolType, ProtocolError
};
use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use base64::{Engine as _, engine::general_purpose};
use log::{debug, info};

/// HTTP REST API请求体
#[derive(Debug, Serialize)]
struct RestQueryRequest {
    sql: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    row_limit: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    timeout: Option<i64>,
}

/// HTTP REST API响应体
#[derive(Debug, Deserialize)]
struct RestQueryResponse {
    code: i32,
    message: Option<String>,
    #[serde(default)]
    columns: Vec<String>,
    #[serde(default)]
    values: Vec<Vec<serde_json::Value>>,
    #[serde(default)]
    timestamps: Vec<i64>,
    #[serde(default)]
    expressions: Vec<String>,
}

/// 服务器信息响应
#[derive(Debug, Deserialize)]
struct ServerInfoResponse {
    version: Option<String>,
    #[serde(rename = "buildInfo")]
    build_info: Option<String>,
    timezone: Option<String>,
}

/// HTTP协议客户端
#[derive(Debug)]
pub struct HttpClient {
    config: ProtocolConfig,
    client: Client,
    base_url: String,
    status: ConnectionStatus,
    auth_header: Option<String>,
}

impl HttpClient {
    pub fn new(config: ProtocolConfig) -> Result<Self> {
        let client = Client::builder()
            .timeout(config.timeout)
            .build()
            .map_err(|e| ProtocolError::ConnectionError(format!("创建HTTP客户端失败: {}", e)))?;
        
        let protocol = if config.ssl { "https" } else { "http" };
        let base_url = format!("{}://{}:{}", protocol, config.host, config.port);
        
        Ok(Self {
            config,
            client,
            base_url,
            status: ConnectionStatus::Disconnected,
            auth_header: None,
        })
    }
    
    /// 构建认证头
    fn build_auth_header(&self, username: &str, password: &str) -> String {
        let auth_string = format!("{}:{}", username, password);
        let encoded = general_purpose::STANDARD.encode(auth_string.as_bytes());
        format!("Basic {}", encoded)
    }
    
    /// 发送HTTP请求
    async fn send_request<T: Serialize, R: for<'de> Deserialize<'de>>(
        &self,
        endpoint: &str,
        method: reqwest::Method,
        body: Option<&T>,
    ) -> Result<R> {
        let url = format!("{}{}", self.base_url, endpoint);
        
        let mut request_builder = self.client.request(method, &url);
        
        // 添加认证头
        if let Some(auth) = &self.auth_header {
            request_builder = request_builder.header("Authorization", auth);
        }
        
        // 添加请求体
        if let Some(body) = body {
            request_builder = request_builder
                .header("Content-Type", "application/json")
                .json(body);
        }
        
        let response = request_builder
            .send()
            .await
            .map_err(|e| ProtocolError::ConnectionError(format!("HTTP请求失败: {}", e)))?;
        
        let status = response.status();
        if status.is_success() {
            response
                .json::<R>()
                .await
                .map_err(|e| ProtocolError::ProtocolError(format!("解析响应失败: {}", e)).into())
        } else if status == 401 {
            Err(ProtocolError::AuthenticationError("认证失败".to_string()).into())
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(ProtocolError::QueryError(format!("HTTP错误 {}: {}", status, error_text)).into())
        }
    }
    
    /// 尝试多个端点
    async fn try_multiple_endpoints<T: Serialize, R: for<'de> Deserialize<'de>>(
        &self,
        endpoints: &[&str],
        method: reqwest::Method,
        body: Option<&T>,
    ) -> Result<R> {
        let mut last_error = None;
        
        for endpoint in endpoints {
            match self.send_request(endpoint, method.clone(), body).await {
                Ok(response) => return Ok(response),
                Err(e) => {
                    debug!("端点 {} 失败: {}", endpoint, e);
                    last_error = Some(e);
                }
            }
        }
        
        Err(last_error.unwrap_or_else(|| {
            ProtocolError::ConnectionError("所有端点都无法连接".to_string()).into()
        }))
    }
}

#[async_trait]
impl ProtocolClient for HttpClient {
    async fn connect(&mut self) -> Result<()> {
        debug!("连接到IoTDB HTTP服务: {}", self.base_url);
        
        self.status = ConnectionStatus::Connecting;
        
        // 尝试ping端点来测试连接
        let ping_endpoints = ["/ping", "/rest/v1/ping", "/api/v1/ping"];
        
        match self.try_multiple_endpoints::<(), serde_json::Value>(
            &ping_endpoints,
            reqwest::Method::GET,
            None,
        ).await {
            Ok(_) => {
                self.status = ConnectionStatus::Connected;
                info!("成功连接到IoTDB HTTP服务");
                Ok(())
            }
            Err(e) => {
                let error_msg = e.to_string().lines().next().unwrap_or("连接失败").to_string();
                self.status = ConnectionStatus::Error("HTTP连接失败".to_string());
                Err(anyhow::Error::msg("HTTP连接失败"))
            }
        }
    }
    
    async fn disconnect(&mut self) -> Result<()> {
        self.auth_header = None;
        self.status = ConnectionStatus::Disconnected;
        info!("已断开IoTDB HTTP连接");
        Ok(())
    }
    
    async fn authenticate(&mut self, username: &str, password: &str) -> Result<()> {
        if !matches!(self.status, ConnectionStatus::Connected) {
            return Err(ProtocolError::ConnectionError("未连接到服务器".to_string()).into());
        }
        
        debug!("开始HTTP认证: 用户名={}", username);
        
        // 构建认证头
        self.auth_header = Some(self.build_auth_header(username, password));
        
        // 发送测试查询来验证认证
        let test_request = RestQueryRequest {
            sql: "SHOW STORAGE GROUP".to_string(),
            row_limit: Some(1),
            timeout: Some(5000),
        };
        
        let query_endpoints = ["/rest/v1/query", "/rest/v2/query", "/api/v1/query"];
        
        match self.try_multiple_endpoints::<RestQueryRequest, RestQueryResponse>(
            &query_endpoints,
            reqwest::Method::POST,
            Some(&test_request),
        ).await {
            Ok(_response) => {
                self.status = ConnectionStatus::Authenticated;
                info!("HTTP认证成功");
                Ok(())
            }
            Err(e) => {
                self.auth_header = None;
                Err(ProtocolError::AuthenticationError(format!("认证失败: {}", e)).into())
            }
        }
    }
    
    async fn execute_query(&mut self, request: QueryRequest) -> Result<QueryResponse> {
        if !matches!(self.status, ConnectionStatus::Authenticated) {
            return Err(ProtocolError::AuthenticationError("未认证".to_string()).into());
        }
        
        let start_time = Instant::now();
        debug!("执行HTTP查询: {}", request.sql);
        
        let rest_request = RestQueryRequest {
            sql: request.sql.clone(),
            row_limit: request.fetch_size,
            timeout: request.timeout.map(|d| d.as_millis() as i64),
        };
        
        let query_endpoints = ["/rest/v1/query", "/rest/v2/query", "/api/v1/query"];
        
        let response: RestQueryResponse = self.try_multiple_endpoints(
            &query_endpoints,
            reqwest::Method::POST,
            Some(&rest_request),
        ).await?;
        
        let execution_time = start_time.elapsed();
        
        if response.code != 200 {
            return Err(ProtocolError::QueryError(
                response.message.unwrap_or_else(|| format!("查询失败，错误码: {}", response.code))
            ).into());
        }
        
        // 转换响应格式
        let columns = if !response.columns.is_empty() {
            response.columns.into_iter().map(|name| ColumnInfo {
                name,
                data_type: "unknown".to_string(),
                nullable: true,
                comment: None,
            }).collect()
        } else {
            response.expressions.into_iter().map(|name| ColumnInfo {
                name,
                data_type: "unknown".to_string(),
                nullable: true,
                comment: None,
            }).collect()
        };
        
        let row_count = response.values.len();
        let rows = response.values.into_iter().map(|row| {
            row.into_iter().map(|value| {
                match value {
                    serde_json::Value::String(s) => s,
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    serde_json::Value::Null => "null".to_string(),
                    _ => value.to_string(),
                }
            }).collect()
        }).collect();
        
        info!("HTTP查询完成，耗时: {:?}", execution_time);
        
        Ok(QueryResponse {
            success: true,
            message: response.message,
            columns,
            rows,
            execution_time,
            row_count,
            has_more: false,
            query_id: None,
        })
    }
    
    async fn test_connection(&mut self) -> Result<Duration> {
        let start_time = Instant::now();
        
        // 连接
        self.connect().await?;
        
        // 认证
        if let (Some(username), Some(password)) = (self.config.username.clone(), self.config.password.clone()) {
            self.authenticate(&username, &password).await?;
        }
        
        // 执行测试查询
        let test_request = QueryRequest {
            sql: "SHOW STORAGE GROUP".to_string(),
            database: None,
            session_id: None,
            fetch_size: Some(1),
            timeout: Some(Duration::from_secs(5)),
            parameters: None,
        };
        
        self.execute_query(test_request).await?;
        
        let latency = start_time.elapsed();
        info!("HTTP连接测试成功，延迟: {:?}", latency);
        
        Ok(latency)
    }
    
    fn get_status(&self) -> ConnectionStatus {
        self.status.clone()
    }
    
    fn get_protocol_type(&self) -> ProtocolType {
        ProtocolType::Http
    }
    
    async fn get_server_info(&mut self) -> Result<ServerInfo> {
        let info_endpoints = ["/rest/v1/info", "/api/v1/info", "/info"];
        
        let response: ServerInfoResponse = self.try_multiple_endpoints(
            &info_endpoints,
            reqwest::Method::GET,
            None::<&()>,
        ).await.unwrap_or_else(|_| ServerInfoResponse {
            version: Some("unknown".to_string()),
            build_info: None,
            timezone: None,
        });
        
        Ok(ServerInfo {
            version: response.version.unwrap_or_else(|| "unknown".to_string()),
            build_info: response.build_info,
            supported_protocols: vec![ProtocolType::Http],
            capabilities: vec!["pagination".to_string(), "async_query".to_string()],
            timezone: response.timezone,
        })
    }
    
    async fn close_query(&mut self, _query_id: &str) -> Result<()> {
        // HTTP协议中查询通常在响应后自动关闭
        Ok(())
    }
    
    async fn fetch_more(&mut self, _query_id: &str, _fetch_size: i32) -> Result<QueryResponse> {
        Err(ProtocolError::UnsupportedOperation("HTTP协议暂不支持分页查询".to_string()).into())
    }
}
