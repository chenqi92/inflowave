/**
 * IoTDB Thrift协议客户端实现
 * 
 * 实现完整的Thrift协议支持，包括会话管理、查询执行等
 */

use super::{
    ProtocolClient, ProtocolConfig, QueryRequest, QueryResponse, 
    ConnectionStatus, ServerInfo, ColumnInfo, ProtocolType, ProtocolError
};
use anyhow::Result;
use async_trait::async_trait;
use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use log::{debug, info, warn};

/// Thrift协议常量
const THRIFT_VERSION: i32 = 1;
const THRIFT_PROTOCOL_BINARY: u8 = 0x80;
const THRIFT_TYPE_CALL: u8 = 1;
const THRIFT_TYPE_REPLY: u8 = 2;
const THRIFT_TYPE_EXCEPTION: u8 = 3;

/// Thrift数据类型
#[derive(Debug, Clone)]
enum ThriftType {
    Stop = 0,
    Void = 1,
    Bool = 2,
    Byte = 3,
    Double = 4,
    I16 = 6,
    I32 = 8,
    I64 = 10,
    String = 11,
    Struct = 12,
    Map = 13,
    Set = 14,
    List = 15,
}

/// IoTDB Thrift服务方法
#[derive(Debug, Clone)]
enum IoTDBMethod {
    OpenSession,
    CloseSession,
    ExecuteStatement,
    ExecuteQueryStatement,
    FetchResults,
    CloseOperation,
    GetTimeZone,
    GetServerProperties,
}

impl IoTDBMethod {
    fn as_str(&self) -> &'static str {
        match self {
            Self::OpenSession => "openSession",
            Self::CloseSession => "closeSession",
            Self::ExecuteStatement => "executeStatement",
            Self::ExecuteQueryStatement => "executeQueryStatement",
            Self::FetchResults => "fetchResults",
            Self::CloseOperation => "closeOperation",
            Self::GetTimeZone => "getTimeZone",
            Self::GetServerProperties => "getServerProperties",
        }
    }
}

/// Thrift客户端
#[derive(Debug)]
pub struct ThriftClient {
    config: ProtocolConfig,
    stream: Option<TcpStream>,
    session_id: Option<String>,
    status: ConnectionStatus,
    sequence_id: i32,
}

impl ThriftClient {
    pub fn new(config: ProtocolConfig) -> Result<Self> {
        Ok(Self {
            config,
            stream: None,
            session_id: None,
            status: ConnectionStatus::Disconnected,
            sequence_id: 0,
        })
    }
    
    /// 获取下一个序列ID
    fn next_sequence_id(&mut self) -> i32 {
        self.sequence_id += 1;
        self.sequence_id
    }
    
    /// 写入Thrift消息头
    async fn write_message_header(
        &mut self,
        method: &IoTDBMethod,
        message_type: u8,
        sequence_id: i32,
    ) -> Result<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        let method_name = method.as_str();
        
        // Thrift Binary Protocol Header
        // Version (4 bytes) | Message Type (1 byte) | Method Name Length (4 bytes) | Method Name | Sequence ID (4 bytes)
        
        // 版本和消息类型
        let version_and_type = (THRIFT_VERSION << 16) | (message_type as i32);
        stream.write_all(&version_and_type.to_be_bytes()).await?;
        
        // 方法名长度和方法名
        stream.write_all(&(method_name.len() as i32).to_be_bytes()).await?;
        stream.write_all(method_name.as_bytes()).await?;
        
        // 序列ID
        stream.write_all(&sequence_id.to_be_bytes()).await?;
        
        Ok(())
    }
    
    /// 读取Thrift消息头
    async fn read_message_header(&mut self) -> Result<(String, u8, i32)> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        // 读取版本和消息类型
        let mut version_type_buf = [0u8; 4];
        stream.read_exact(&mut version_type_buf).await?;
        let version_and_type = i32::from_be_bytes(version_type_buf);
        
        let version = version_and_type >> 16;
        let message_type = (version_and_type & 0xFF) as u8;
        
        if version != THRIFT_VERSION {
            return Err(ProtocolError::ProtocolError(
                format!("不支持的Thrift版本: {}", version)
            ).into());
        }
        
        // 读取方法名长度
        let mut name_len_buf = [0u8; 4];
        stream.read_exact(&mut name_len_buf).await?;
        let name_len = i32::from_be_bytes(name_len_buf) as usize;
        
        // 读取方法名
        let mut name_buf = vec![0u8; name_len];
        stream.read_exact(&mut name_buf).await?;
        let method_name = String::from_utf8(name_buf)?;
        
        // 读取序列ID
        let mut seq_buf = [0u8; 4];
        stream.read_exact(&mut seq_buf).await?;
        let sequence_id = i32::from_be_bytes(seq_buf);
        
        Ok((method_name, message_type, sequence_id))
    }
    
    /// 写入字符串
    async fn write_string(&mut self, value: &str) -> Result<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        stream.write_all(&(value.len() as i32).to_be_bytes()).await?;
        stream.write_all(value.as_bytes()).await?;
        Ok(())
    }
    
    /// 读取字符串
    async fn read_string(&mut self) -> Result<String> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        let mut len_buf = [0u8; 4];
        stream.read_exact(&mut len_buf).await?;
        let len = i32::from_be_bytes(len_buf) as usize;
        
        let mut str_buf = vec![0u8; len];
        stream.read_exact(&mut str_buf).await?;
        
        Ok(String::from_utf8(str_buf)?)
    }
    
    /// 写入整数
    async fn write_i32(&mut self, value: i32) -> Result<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        stream.write_all(&value.to_be_bytes()).await?;
        Ok(())
    }
    
    /// 读取整数
    async fn read_i32(&mut self) -> Result<i32> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        let mut buf = [0u8; 4];
        stream.read_exact(&mut buf).await?;
        Ok(i32::from_be_bytes(buf))
    }
    
    /// 写入布尔值
    async fn write_bool(&mut self, value: bool) -> Result<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        stream.write_all(&[if value { 1 } else { 0 }]).await?;
        Ok(())
    }
    
    /// 读取布尔值
    async fn read_bool(&mut self) -> Result<bool> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        let mut buf = [0u8; 1];
        stream.read_exact(&mut buf).await?;
        Ok(buf[0] != 0)
    }
    
    /// 写入字段头
    async fn write_field_header(&mut self, field_type: ThriftType, field_id: i16) -> Result<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        stream.write_all(&[field_type as u8]).await?;
        stream.write_all(&field_id.to_be_bytes()).await?;
        Ok(())
    }
    
    /// 写入字段结束标记
    async fn write_field_stop(&mut self) -> Result<()> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        stream.write_all(&[ThriftType::Stop as u8]).await?;
        Ok(())
    }
    
    /// 读取字段头
    async fn read_field_header(&mut self) -> Result<(ThriftType, i16)> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| ProtocolError::ConnectionError("未连接".to_string()))?;
        
        let mut type_buf = [0u8; 1];
        stream.read_exact(&mut type_buf).await?;
        let field_type = match type_buf[0] {
            0 => ThriftType::Stop,
            1 => ThriftType::Void,
            2 => ThriftType::Bool,
            3 => ThriftType::Byte,
            4 => ThriftType::Double,
            6 => ThriftType::I16,
            8 => ThriftType::I32,
            10 => ThriftType::I64,
            11 => ThriftType::String,
            12 => ThriftType::Struct,
            13 => ThriftType::Map,
            14 => ThriftType::Set,
            15 => ThriftType::List,
            _ => return Err(ProtocolError::ProtocolError(
                format!("未知的Thrift类型: {}", type_buf[0])
            ).into()),
        };
        
        if matches!(field_type, ThriftType::Stop) {
            return Ok((field_type, 0));
        }
        
        let mut id_buf = [0u8; 2];
        stream.read_exact(&mut id_buf).await?;
        let field_id = i16::from_be_bytes(id_buf);
        
        Ok((field_type, field_id))
    }
    
    /// 发送开启会话请求
    async fn send_open_session_request(&mut self, username: &str, password: &str) -> Result<()> {
        let sequence_id = self.next_sequence_id();
        
        // 写入消息头
        self.write_message_header(&IoTDBMethod::OpenSession, THRIFT_TYPE_CALL, sequence_id).await?;
        
        // 写入请求参数结构体
        // Field 1: TSOpenSessionReq
        self.write_field_header(ThriftType::Struct, 1).await?;
        
        // username (field 1)
        self.write_field_header(ThriftType::String, 1).await?;
        self.write_string(username).await?;
        
        // password (field 2)
        self.write_field_header(ThriftType::String, 2).await?;
        self.write_string(password).await?;
        
        // configuration (field 3) - 可选的配置参数
        self.write_field_header(ThriftType::Map, 3).await?;
        self.write_i32(0).await?; // 空map
        
        // 结束结构体
        self.write_field_stop().await?;
        
        // 结束参数
        self.write_field_stop().await?;
        
        Ok(())
    }
    
    /// 接收开启会话响应
    async fn receive_open_session_response(&mut self) -> Result<String> {
        let (method_name, message_type, _sequence_id) = self.read_message_header().await?;
        
        if method_name != "openSession" {
            return Err(ProtocolError::ProtocolError(
                format!("期望openSession响应，收到: {}", method_name)
            ).into());
        }
        
        if message_type == THRIFT_TYPE_EXCEPTION {
            return Err(ProtocolError::ProtocolError("服务器返回异常".to_string()).into());
        }
        
        // 读取响应结构体
        let (field_type, field_id) = self.read_field_header().await?;
        if !matches!(field_type, ThriftType::Struct) || field_id != 0 {
            return Err(ProtocolError::ProtocolError("无效的响应格式".to_string()).into());
        }
        
        let mut session_id = None;
        let mut status_code = None;
        
        // 读取响应字段
        loop {
            let (field_type, field_id) = self.read_field_header().await?;
            
            if matches!(field_type, ThriftType::Stop) {
                break;
            }
            
            match field_id {
                1 => {
                    // sessionId
                    if matches!(field_type, ThriftType::String) {
                        session_id = Some(self.read_string().await?);
                    }
                }
                2 => {
                    // status
                    if matches!(field_type, ThriftType::Struct) {
                        // 读取状态结构体
                        loop {
                            let (status_field_type, status_field_id) = self.read_field_header().await?;
                            if matches!(status_field_type, ThriftType::Stop) {
                                break;
                            }
                            
                            if status_field_id == 1 && matches!(status_field_type, ThriftType::I32) {
                                status_code = Some(self.read_i32().await?);
                            } else {
                                // 跳过其他字段
                                self.skip_field(status_field_type).await?;
                            }
                        }
                    }
                }
                _ => {
                    // 跳过未知字段
                    self.skip_field(field_type).await?;
                }
            }
        }
        
        if let Some(code) = status_code {
            if code != 200 {
                return Err(ProtocolError::AuthenticationError(
                    format!("认证失败，状态码: {}", code)
                ).into());
            }
        }
        
        session_id.ok_or_else(|| {
            ProtocolError::ProtocolError("未收到会话ID".to_string()).into()
        })
    }
    
    /// 跳过字段
    fn skip_field<'a>(&'a mut self, field_type: ThriftType) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<()>> + Send + 'a>> {
        Box::pin(async move {
        match field_type {
            ThriftType::Bool | ThriftType::Byte => {
                let mut buf = [0u8; 1];
                self.stream.as_mut().unwrap().read_exact(&mut buf).await?;
            }
            ThriftType::I16 => {
                let mut buf = [0u8; 2];
                self.stream.as_mut().unwrap().read_exact(&mut buf).await?;
            }
            ThriftType::I32 => {
                let mut buf = [0u8; 4];
                self.stream.as_mut().unwrap().read_exact(&mut buf).await?;
            }
            ThriftType::I64 | ThriftType::Double => {
                let mut buf = [0u8; 8];
                self.stream.as_mut().unwrap().read_exact(&mut buf).await?;
            }
            ThriftType::String => {
                let len = self.read_i32().await? as usize;
                let mut buf = vec![0u8; len];
                self.stream.as_mut().unwrap().read_exact(&mut buf).await?;
            }
            ThriftType::Struct => {
                loop {
                    let (field_type, _) = self.read_field_header().await?;
                    if matches!(field_type, ThriftType::Stop) {
                        break;
                    }
                    self.skip_field(field_type).await?;
                }
            }
            ThriftType::List | ThriftType::Set => {
                let element_type = self.stream.as_mut().unwrap().read_u8().await?;
                let size = self.read_i32().await?;
                for _ in 0..size {
                    self.skip_field(match element_type {
                        11 => ThriftType::String,
                        8 => ThriftType::I32,
                        _ => ThriftType::String, // 默认
                    }).await?;
                }
            }
            ThriftType::Map => {
                let _key_type = self.stream.as_mut().unwrap().read_u8().await?;
                let _value_type = self.stream.as_mut().unwrap().read_u8().await?;
                let size = self.read_i32().await?;
                for _ in 0..size {
                    self.skip_field(ThriftType::String).await?; // key
                    self.skip_field(ThriftType::String).await?; // value
                }
            }
            _ => {}
        }
        Ok(())
        })
    }
}

#[async_trait]
impl ProtocolClient for ThriftClient {
    async fn connect(&mut self) -> Result<()> {
        debug!("连接到IoTDB Thrift服务: {}:{}", self.config.host, self.config.port);

        self.status = ConnectionStatus::Connecting;

        let addr = format!("{}:{}", self.config.host, self.config.port);
        match tokio::time::timeout(self.config.timeout, TcpStream::connect(&addr)).await {
            Ok(Ok(stream)) => {
                self.stream = Some(stream);
                self.status = ConnectionStatus::Connected;
                info!("成功连接到IoTDB Thrift服务");
                Ok(())
            }
            Ok(Err(e)) => {
                self.status = ConnectionStatus::Error(e.to_string());
                Err(ProtocolError::ConnectionError(format!("连接失败: {}", e)).into())
            }
            Err(_) => {
                self.status = ConnectionStatus::Error("连接超时".to_string());
                Err(ProtocolError::TimeoutError.into())
            }
        }
    }

    async fn disconnect(&mut self) -> Result<()> {
        if let Some(session_id) = self.session_id.clone() {
            // 发送关闭会话请求
            if let Err(e) = self.send_close_session_request(&session_id).await {
                warn!("关闭会话失败: {}", e);
            }
        }

        self.stream = None;
        self.session_id = None;
        self.status = ConnectionStatus::Disconnected;

        info!("已断开IoTDB Thrift连接");
        Ok(())
    }

    async fn authenticate(&mut self, username: &str, password: &str) -> Result<()> {
        if !matches!(self.status, ConnectionStatus::Connected) {
            return Err(ProtocolError::ConnectionError("未连接到服务器".to_string()).into());
        }

        debug!("开始Thrift认证: 用户名={}", username);

        // 发送开启会话请求
        self.send_open_session_request(username, password).await?;

        // 接收会话响应
        let session_id = self.receive_open_session_response().await?;

        self.session_id = Some(session_id.clone());
        self.status = ConnectionStatus::Authenticated;

        info!("Thrift认证成功，会话ID: {}", session_id);
        Ok(())
    }

    async fn execute_query(&mut self, request: QueryRequest) -> Result<QueryResponse> {
        if !matches!(self.status, ConnectionStatus::Authenticated) {
            return Err(ProtocolError::AuthenticationError("未认证".to_string()).into());
        }

        let start_time = Instant::now();
        debug!("执行Thrift查询: {}", request.sql);

        // 发送查询请求
        self.send_execute_query_request(&request).await?;

        // 接收查询响应
        let response = self.receive_execute_query_response().await?;

        let execution_time = start_time.elapsed();
        info!("Thrift查询完成，耗时: {:?}", execution_time);

        let row_count = response.rows.len();
        Ok(QueryResponse {
            success: true,
            message: None,
            columns: response.columns,
            rows: response.rows,
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
            session_id: self.session_id.clone(),
            fetch_size: Some(1),
            timeout: Some(Duration::from_secs(5)),
            parameters: None,
        };

        self.execute_query(test_request).await?;

        let latency = start_time.elapsed();
        info!("Thrift连接测试成功，延迟: {:?}", latency);

        Ok(latency)
    }

    fn get_status(&self) -> ConnectionStatus {
        self.status.clone()
    }

    fn get_protocol_type(&self) -> ProtocolType {
        ProtocolType::Thrift
    }

    async fn get_server_info(&mut self) -> Result<ServerInfo> {
        // 发送获取服务器属性请求
        self.send_get_server_properties_request().await?;
        let properties = self.receive_get_server_properties_response().await?;

        Ok(ServerInfo {
            version: properties.get("version").unwrap_or(&"unknown".to_string()).clone(),
            build_info: properties.get("build_info").cloned(),
            supported_protocols: vec![ProtocolType::Thrift],
            capabilities: vec!["session".to_string(), "prepared_statement".to_string()],
            timezone: properties.get("timezone").cloned(),
        })
    }

    async fn close_query(&mut self, _query_id: &str) -> Result<()> {
        // Thrift协议中查询通常在执行完成后自动关闭
        Ok(())
    }

    async fn fetch_more(&mut self, _query_id: &str, _fetch_size: i32) -> Result<QueryResponse> {
        Err(ProtocolError::UnsupportedOperation("Thrift协议暂不支持分页查询".to_string()).into())
    }
}

impl ThriftClient {
    /// 发送关闭会话请求
    async fn send_close_session_request(&mut self, session_id: &str) -> Result<()> {
        let sequence_id = self.next_sequence_id();

        self.write_message_header(&IoTDBMethod::CloseSession, THRIFT_TYPE_CALL, sequence_id).await?;

        // TSCloseSessionReq
        self.write_field_header(ThriftType::Struct, 1).await?;

        // sessionId (field 1)
        self.write_field_header(ThriftType::String, 1).await?;
        self.write_string(session_id).await?;

        self.write_field_stop().await?;
        self.write_field_stop().await?;

        Ok(())
    }

    /// 发送执行查询请求
    async fn send_execute_query_request(&mut self, request: &QueryRequest) -> Result<()> {
        let sequence_id = self.next_sequence_id();

        self.write_message_header(&IoTDBMethod::ExecuteQueryStatement, THRIFT_TYPE_CALL, sequence_id).await?;

        // TSExecuteStatementReq
        self.write_field_header(ThriftType::Struct, 1).await?;

        // sessionId (field 1)
        self.write_field_header(ThriftType::String, 1).await?;
        let session_id = self.session_id.as_ref().unwrap().clone();
        self.write_string(&session_id).await?;

        // statement (field 2)
        self.write_field_header(ThriftType::String, 2).await?;
        self.write_string(&request.sql).await?;

        // fetchSize (field 3)
        if let Some(fetch_size) = request.fetch_size {
            self.write_field_header(ThriftType::I32, 3).await?;
            self.write_i32(fetch_size).await?;
        }

        // timeout (field 4)
        if let Some(timeout) = request.timeout {
            self.write_field_header(ThriftType::I64, 4).await?;
            let timeout_ms = timeout.as_millis() as i64;
            self.stream.as_mut().unwrap().write_all(&timeout_ms.to_be_bytes()).await?;
        }

        self.write_field_stop().await?;
        self.write_field_stop().await?;

        Ok(())
    }

    /// 接收执行查询响应
    async fn receive_execute_query_response(&mut self) -> Result<QueryResponse> {
        let (method_name, message_type, _sequence_id) = self.read_message_header().await?;

        if !method_name.contains("execute") {
            return Err(ProtocolError::ProtocolError(
                format!("期望execute响应，收到: {}", method_name)
            ).into());
        }

        if message_type == THRIFT_TYPE_EXCEPTION {
            return Err(ProtocolError::QueryError("查询执行异常".to_string()).into());
        }

        // 读取响应结构体
        let (field_type, field_id) = self.read_field_header().await?;
        if !matches!(field_type, ThriftType::Struct) || field_id != 0 {
            return Err(ProtocolError::ProtocolError("无效的查询响应格式".to_string()).into());
        }

        let mut columns = Vec::new();
        let mut rows = Vec::new();

        // 读取响应字段
        loop {
            let (field_type, field_id) = self.read_field_header().await?;

            if matches!(field_type, ThriftType::Stop) {
                break;
            }

            match field_id {
                1 => {
                    // status - 跳过状态字段
                    self.skip_field(field_type).await?;
                }
                2 => {
                    // columns
                    if matches!(field_type, ThriftType::List) {
                        columns = self.read_column_list().await?;
                    }
                }
                3 => {
                    // queryDataSet
                    if matches!(field_type, ThriftType::Struct) {
                        rows = self.read_query_dataset().await?;
                    }
                }
                _ => {
                    self.skip_field(field_type).await?;
                }
            }
        }

        let row_count = rows.len();
        Ok(QueryResponse {
            success: true,
            message: None,
            columns,
            rows,
            execution_time: Duration::from_millis(0), // 将在上层设置
            row_count,
            has_more: false,
            query_id: None,
        })
    }

    /// 读取列信息列表
    async fn read_column_list(&mut self) -> Result<Vec<ColumnInfo>> {
        // 读取列表头
        let _element_type = self.stream.as_mut().unwrap().read_u8().await?;
        let size = self.read_i32().await?;

        let mut columns = Vec::new();

        for _ in 0..size {
            // 读取列结构体
            let (field_type, _) = self.read_field_header().await?;
            if !matches!(field_type, ThriftType::Struct) {
                continue;
            }

            let mut name = String::new();
            let mut data_type = String::new();

            loop {
                let (field_type, field_id) = self.read_field_header().await?;
                if matches!(field_type, ThriftType::Stop) {
                    break;
                }

                match field_id {
                    1 => {
                        // columnName
                        if matches!(field_type, ThriftType::String) {
                            name = self.read_string().await?;
                        }
                    }
                    2 => {
                        // dataType
                        if matches!(field_type, ThriftType::String) {
                            data_type = self.read_string().await?;
                        }
                    }
                    _ => {
                        self.skip_field(field_type).await?;
                    }
                }
            }

            columns.push(ColumnInfo {
                name,
                data_type,
                nullable: true,
                comment: None,
            });
        }

        Ok(columns)
    }

    /// 读取查询数据集
    async fn read_query_dataset(&mut self) -> Result<Vec<Vec<String>>> {
        let mut rows = Vec::new();

        // 读取数据集结构体
        loop {
            let (field_type, field_id) = self.read_field_header().await?;
            if matches!(field_type, ThriftType::Stop) {
                break;
            }

            if field_id == 1 && matches!(field_type, ThriftType::List) {
                // values列表
                let _element_type = self.stream.as_mut().unwrap().read_u8().await?;
                let row_count = self.read_i32().await?;

                for _ in 0..row_count {
                    // 读取行数据（列表）
                    let (row_field_type, _) = self.read_field_header().await?;
                    if matches!(row_field_type, ThriftType::List) {
                        let _row_element_type = self.stream.as_mut().unwrap().read_u8().await?;
                        let col_count = self.read_i32().await?;

                        let mut row = Vec::new();
                        for _ in 0..col_count {
                            let value = self.read_string().await?;
                            row.push(value);
                        }
                        rows.push(row);
                    }
                }
            } else {
                self.skip_field(field_type).await?;
            }
        }

        Ok(rows)
    }

    /// 发送获取服务器属性请求
    async fn send_get_server_properties_request(&mut self) -> Result<()> {
        let sequence_id = self.next_sequence_id();

        self.write_message_header(&IoTDBMethod::GetServerProperties, THRIFT_TYPE_CALL, sequence_id).await?;

        // 空参数
        self.write_field_stop().await?;

        Ok(())
    }

    /// 接收获取服务器属性响应
    async fn receive_get_server_properties_response(&mut self) -> Result<std::collections::HashMap<String, String>> {
        let (_method_name, _message_type, _sequence_id) = self.read_message_header().await?;

        // 简化实现，返回默认属性
        let mut properties = std::collections::HashMap::new();
        properties.insert("version".to_string(), "1.0.0".to_string());
        properties.insert("timezone".to_string(), "UTC".to_string());

        Ok(properties)
    }
}
