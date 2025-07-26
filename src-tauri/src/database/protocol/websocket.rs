/**
 * IoTDB WebSocket协议客户端实现
 * 
 * 支持实时数据流和长连接查询
 */

use super::{
    ProtocolClient, ProtocolConfig, QueryRequest, QueryResponse, 
    ConnectionStatus, ServerInfo, ColumnInfo, ProtocolType, ProtocolError
};
use anyhow::Result;
use async_trait::async_trait;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio_tungstenite::{connect_async, tungstenite::Message, WebSocketStream, MaybeTlsStream};
use tokio::net::TcpStream;
use log::{debug, info, warn};

/// WebSocket消息类型
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
enum WebSocketMessage {
    #[serde(rename = "auth")]
    Auth {
        username: String,
        password: String,
    },
    #[serde(rename = "query")]
    Query {
        sql: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        fetch_size: Option<i32>,
        #[serde(skip_serializing_if = "Option::is_none")]
        timeout: Option<u64>,
    },
    #[serde(rename = "ping")]
    Ping,
    #[serde(rename = "close")]
    Close,
}

/// WebSocket响应消息
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum WebSocketResponse {
    #[serde(rename = "auth_result")]
    AuthResult {
        success: bool,
        message: Option<String>,
    },
    #[serde(rename = "query_result")]
    QueryResult {
        success: bool,
        message: Option<String>,
        columns: Option<Vec<String>>,
        rows: Option<Vec<Vec<serde_json::Value>>>,
        execution_time: Option<u64>,
    },
    #[serde(rename = "error")]
    Error {
        message: String,
        code: Option<i32>,
    },
    #[serde(rename = "pong")]
    Pong,
}

/// WebSocket协议客户端
pub struct WebSocketClient {
    config: ProtocolConfig,
    ws_stream: Option<WebSocketStream<MaybeTlsStream<TcpStream>>>,
    status: ConnectionStatus,
}

impl std::fmt::Debug for WebSocketClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("WebSocketClient")
            .field("config", &self.config)
            .field("ws_stream", &self.ws_stream.is_some())
            .field("status", &self.status)
            .finish()
    }
}

impl WebSocketClient {
    pub fn new(config: ProtocolConfig) -> Result<Self> {
        Ok(Self {
            config,
            ws_stream: None,
            status: ConnectionStatus::Disconnected,
        })
    }
    
    /// 发送WebSocket消息
    async fn send_message(&mut self, message: WebSocketMessage) -> Result<()> {
        let ws_stream = self.ws_stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("WebSocket未连接".to_string()))?;
        
        let json_message = serde_json::to_string(&message)
            .map_err(|e| ProtocolError::ProtocolError(format!("序列化消息失败: {}", e)))?;
        
        ws_stream.send(Message::Text(json_message)).await
            .map_err(|e| ProtocolError::ConnectionError(format!("发送消息失败: {}", e)))?;
        
        Ok(())
    }
    
    /// 接收WebSocket消息
    async fn receive_message(&mut self) -> Result<WebSocketResponse> {
        let ws_stream = self.ws_stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("WebSocket未连接".to_string()))?;
        
        loop {
            match ws_stream.next().await {
                Some(Ok(Message::Text(text))) => {
                    let response: WebSocketResponse = serde_json::from_str(&text)
                        .map_err(|e| ProtocolError::ProtocolError(format!("解析响应失败: {}", e)))?;
                    return Ok(response);
                }
                Some(Ok(Message::Binary(_))) => {
                    warn!("收到二进制消息，跳过");
                    continue;
                }
                Some(Ok(Message::Ping(data))) => {
                    // 自动回复Pong
                    ws_stream.send(Message::Pong(data)).await
                        .map_err(|e| ProtocolError::ConnectionError(format!("发送Pong失败: {}", e)))?;
                    continue;
                }
                Some(Ok(Message::Pong(_))) => {
                    continue;
                }
                Some(Ok(Message::Close(_))) => {
                    return Err(ProtocolError::ConnectionError("WebSocket连接已关闭".to_string()).into());
                }
                Some(Ok(Message::Frame(_))) => {
                    // 跳过Frame消息
                    continue;
                }
                Some(Err(e)) => {
                    return Err(ProtocolError::ConnectionError(format!("WebSocket错误: {}", e)).into());
                }
                None => {
                    return Err(ProtocolError::ConnectionError("WebSocket连接中断".to_string()).into());
                }
            }
        }
    }
    
    /// 等待特定类型的响应
    async fn wait_for_response<F>(&mut self, predicate: F) -> Result<WebSocketResponse>
    where
        F: Fn(&WebSocketResponse) -> bool,
    {
        let timeout = self.config.timeout;
        let start_time = Instant::now();
        
        loop {
            if start_time.elapsed() > timeout {
                return Err(ProtocolError::TimeoutError.into());
            }
            
            let response = self.receive_message().await?;
            
            if predicate(&response) {
                return Ok(response);
            }
            
            // 处理错误响应
            if let WebSocketResponse::Error { message, code } = &response {
                return Err(ProtocolError::QueryError(
                    format!("服务器错误 {}: {}", code.unwrap_or(0), message)
                ).into());
            }
        }
    }
}

#[async_trait]
impl ProtocolClient for WebSocketClient {
    async fn connect(&mut self) -> Result<()> {
        debug!("连接到IoTDB WebSocket服务: {}:{}", self.config.host, self.config.port);
        
        self.status = ConnectionStatus::Connecting;
        
        let protocol = if self.config.ssl { "wss" } else { "ws" };
        let url = format!("{}://{}:{}/ws", protocol, self.config.host, self.config.port);
        
        match tokio::time::timeout(self.config.timeout, connect_async(&url)).await {
            Ok(Ok((ws_stream, _))) => {
                self.ws_stream = Some(ws_stream);
                self.status = ConnectionStatus::Connected;
                info!("成功连接到IoTDB WebSocket服务");
                Ok(())
            }
            Ok(Err(e)) => {
                self.status = ConnectionStatus::Error(e.to_string());
                Err(ProtocolError::ConnectionError(format!("WebSocket连接失败: {}", e)).into())
            }
            Err(_) => {
                self.status = ConnectionStatus::Error("连接超时".to_string());
                Err(ProtocolError::TimeoutError.into())
            }
        }
    }
    
    async fn disconnect(&mut self) -> Result<()> {
        if let Some(mut ws_stream) = self.ws_stream.take() {
            // 发送关闭消息
            let _ = self.send_message(WebSocketMessage::Close).await;
            
            // 关闭WebSocket连接
            let _ = ws_stream.close(None).await;
        }
        
        self.status = ConnectionStatus::Disconnected;
        info!("已断开IoTDB WebSocket连接");
        Ok(())
    }
    
    async fn authenticate(&mut self, username: &str, password: &str) -> Result<()> {
        if !matches!(self.status, ConnectionStatus::Connected) {
            return Err(ProtocolError::ConnectionError("未连接到服务器".to_string()).into());
        }
        
        debug!("开始WebSocket认证: 用户名={}", username);
        
        // 发送认证消息
        let auth_message = WebSocketMessage::Auth {
            username: username.to_string(),
            password: password.to_string(),
        };
        
        self.send_message(auth_message).await?;
        
        // 等待认证响应
        let response = self.wait_for_response(|resp| {
            matches!(resp, WebSocketResponse::AuthResult { .. })
        }).await?;
        
        match response {
            WebSocketResponse::AuthResult { success, message } => {
                if success {
                    self.status = ConnectionStatus::Authenticated;
                    info!("WebSocket认证成功");
                    Ok(())
                } else {
                    Err(ProtocolError::AuthenticationError(
                        message.unwrap_or_else(|| "认证失败".to_string())
                    ).into())
                }
            }
            _ => Err(ProtocolError::ProtocolError("收到意外的认证响应".to_string()).into()),
        }
    }
    
    async fn execute_query(&mut self, request: QueryRequest) -> Result<QueryResponse> {
        if !matches!(self.status, ConnectionStatus::Authenticated) {
            return Err(ProtocolError::AuthenticationError("未认证".to_string()).into());
        }
        
        let start_time = Instant::now();
        debug!("执行WebSocket查询: {}", request.sql);
        
        // 发送查询消息
        let query_message = WebSocketMessage::Query {
            sql: request.sql.clone(),
            fetch_size: request.fetch_size,
            timeout: request.timeout.map(|d| d.as_millis() as u64),
        };
        
        self.send_message(query_message).await?;
        
        // 等待查询响应
        let response = self.wait_for_response(|resp| {
            matches!(resp, WebSocketResponse::QueryResult { .. })
        }).await?;
        
        let execution_time = start_time.elapsed();
        
        match response {
            WebSocketResponse::QueryResult { success, message, columns, rows, .. } => {
                if !success {
                    return Err(ProtocolError::QueryError(
                        message.unwrap_or_else(|| "查询失败".to_string())
                    ).into());
                }
                
                let columns = columns.unwrap_or_default().into_iter().map(|name| ColumnInfo {
                    name,
                    data_type: "unknown".to_string(),
                    nullable: true,
                    comment: None,
                }).collect();
                
                let rows = rows.unwrap_or_default().into_iter().map(|row| {
                    row.into_iter().map(|value| {
                        match value {
                            serde_json::Value::String(s) => s,
                            serde_json::Value::Number(n) => n.to_string(),
                            serde_json::Value::Bool(b) => b.to_string(),
                            serde_json::Value::Null => "null".to_string(),
                            _ => value.to_string(),
                        }
                    }).collect()
                }).collect::<Vec<Vec<String>>>();
                
                info!("WebSocket查询完成，耗时: {:?}", execution_time);
                
                Ok(QueryResponse {
                    success: true,
                    message,
                    columns,
                    rows: rows.clone(),
                    execution_time,
                    row_count: rows.len(),
                    has_more: false,
                    query_id: None,
                })
            }
            _ => Err(ProtocolError::ProtocolError("收到意外的查询响应".to_string()).into()),
        }
    }
    
    async fn test_connection(&mut self) -> Result<Duration> {
        let start_time = Instant::now();
        
        // 连接
        self.connect().await?;
        
        // 认证
        if let (Some(username), Some(password)) = (self.config.username.clone(), self.config.password.clone()) {
            self.authenticate(&username, &password).await?;
        }
        
        // 发送ping测试
        self.send_message(WebSocketMessage::Ping).await?;
        
        // 等待pong响应
        self.wait_for_response(|resp| {
            matches!(resp, WebSocketResponse::Pong)
        }).await?;
        
        let latency = start_time.elapsed();
        info!("WebSocket连接测试成功，延迟: {:?}", latency);
        
        Ok(latency)
    }
    
    fn get_status(&self) -> ConnectionStatus {
        self.status.clone()
    }
    
    fn get_protocol_type(&self) -> ProtocolType {
        ProtocolType::WebSocket
    }
    
    async fn get_server_info(&mut self) -> Result<ServerInfo> {
        Ok(ServerInfo {
            version: "unknown".to_string(),
            build_info: None,
            supported_protocols: vec![ProtocolType::WebSocket],
            capabilities: vec!["real_time".to_string(), "streaming".to_string()],
            timezone: None,
        })
    }
    
    async fn close_query(&mut self, _query_id: &str) -> Result<()> {
        // WebSocket协议中查询通常在响应后自动关闭
        Ok(())
    }
    
    async fn fetch_more(&mut self, _query_id: &str, _fetch_size: i32) -> Result<QueryResponse> {
        Err(ProtocolError::UnsupportedOperation("WebSocket协议暂不支持分页查询".to_string()).into())
    }
}
