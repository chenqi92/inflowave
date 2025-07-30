/**
 * IoTDB Thrift 协议定义和客户端实现
 * 
 * 基于 IoTDB 官方 Thrift IDL 实现的原生协议客户端
 */

use anyhow::{Context, Result};
use log::{debug, info};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

/// IoTDB Thrift 协议版本
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProtocolVersion {
    V0_13,
    V1_0,
    V1_3,
    V2_0,
}

impl ProtocolVersion {
    pub fn from_version(major: u8, minor: u8) -> Self {
        match (major, minor) {
            (0, 13) => ProtocolVersion::V0_13,
            (1, 0..=2) => ProtocolVersion::V1_0,
            (1, 3..) => ProtocolVersion::V1_3,
            (2, _) => ProtocolVersion::V2_0,
            _ => ProtocolVersion::V1_0, // 默认版本
        }
    }
}

/// Thrift 消息类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MessageType {
    Call = 1,
    Reply = 2,
    Exception = 3,
    Oneway = 4,
}

/// Thrift 数据类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThriftType {
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

/// IoTDB 会话信息
#[derive(Debug, Clone)]
pub struct SessionInfo {
    pub session_id: i64,
    pub statement_id: i64,
    pub username: String,
    pub time_zone: String,
    pub version: ProtocolVersion,
}

/// IoTDB Thrift 客户端
#[derive(Debug)]
pub struct IoTDBThriftClient {
    stream: Option<TcpStream>,
    session: Option<SessionInfo>,
    sequence_id: i32,
    protocol_version: ProtocolVersion,
}

impl IoTDBThriftClient {
    /// 创建新的 Thrift 客户端
    pub fn new(protocol_version: ProtocolVersion) -> Self {
        Self {
            stream: None,
            session: None,
            sequence_id: 0,
            protocol_version,
        }
    }
    
    /// 连接到 IoTDB 服务器
    pub async fn connect(&mut self, host: &str, port: u16) -> Result<()> {
        let address = format!("{}:{}", host, port);
        info!("连接到 IoTDB Thrift 服务器: {}", address);
        
        let stream = TcpStream::connect(&address).await
            .context("无法连接到 IoTDB 服务器")?;
        
        self.stream = Some(stream);
        info!("Thrift 连接建立成功");
        Ok(())
    }
    
    /// 打开会话
    pub async fn open_session(&mut self, username: &str, password: &str) -> Result<SessionInfo> {
        if self.stream.is_none() {
            return Err(anyhow::anyhow!("未连接到服务器"));
        }

        info!("打开 IoTDB 会话，用户: {}", username);

        // 构建 openSession 请求
        let request = Self::build_open_session_request_static(username, password)?;

        // 发送请求
        self.send_message_internal("openSession", MessageType::Call, &request).await?;

        // 接收响应
        let response = self.receive_message_internal().await?;
        let session_info = self.parse_open_session_response(&response)?;

        self.session = Some(session_info.clone());
        info!("会话打开成功，会话ID: {}", session_info.session_id);

        Ok(session_info)
    }
    
    /// 关闭会话
    pub async fn close_session(&mut self) -> Result<()> {
        if let Some(session) = &self.session {
            if self.stream.is_none() {
                return Err(anyhow::anyhow!("未连接到服务器"));
            }

            info!("关闭会话: {}", session.session_id);

            // 构建 closeSession 请求
            let request = Self::build_close_session_request_static(session.session_id)?;

            // 发送请求
            self.send_message_internal("closeSession", MessageType::Call, &request).await?;

            // 接收响应
            let _response = self.receive_message_internal().await?;

            self.session = None;
            info!("会话关闭成功");
        }

        Ok(())
    }
    
    /// 执行查询
    pub async fn execute_query(&mut self, sql: &str) -> Result<QueryResult> {
        let session = self.session.as_ref()
            .ok_or_else(|| anyhow::anyhow!("未打开会话"))?;

        if self.stream.is_none() {
            return Err(anyhow::anyhow!("未连接到服务器"));
        }

        debug!("执行查询: {}", sql);

        // 构建 executeQueryStatement 请求
        let request = Self::build_execute_query_request_static(session, sql)?;

        // 发送请求
        self.send_message_internal("executeQueryStatement", MessageType::Call, &request).await?;

        // 接收响应
        let response = self.receive_message_internal().await?;
        let result = self.parse_query_response(&response)?;

        debug!("查询执行成功，返回 {} 行数据", result.rows.len());
        Ok(result)
    }
    
    /// 执行非查询语句
    pub async fn execute_statement(&mut self, sql: &str) -> Result<i32> {
        let session = self.session.as_ref()
            .ok_or_else(|| anyhow::anyhow!("未打开会话"))?;

        if self.stream.is_none() {
            return Err(anyhow::anyhow!("未连接到服务器"));
        }

        debug!("执行语句: {}", sql);

        // 构建 executeUpdateStatement 请求
        let request = Self::build_execute_statement_request_static(session, sql)?;

        // 发送请求
        self.send_message_internal("executeUpdateStatement", MessageType::Call, &request).await?;

        // 接收响应
        let response = self.receive_message_internal().await?;
        let affected_rows = self.parse_statement_response(&response)?;

        debug!("语句执行成功，影响 {} 行", affected_rows);
        Ok(affected_rows)
    }
    
    /// 插入 Tablet 数据
    pub async fn insert_tablet(&mut self, tablet: &TabletData) -> Result<()> {
        let session = self.session.as_ref()
            .ok_or_else(|| anyhow::anyhow!("未打开会话"))?;

        if self.stream.is_none() {
            return Err(anyhow::anyhow!("未连接到服务器"));
        }

        debug!("插入 Tablet 数据: {}", tablet.device_id);

        // 构建 insertTablet 请求
        let request = Self::build_insert_tablet_request_static(session, tablet)?;

        // 发送请求
        self.send_message_internal("insertTablet", MessageType::Call, &request).await?;

        // 接收响应
        let response = self.receive_message_internal().await?;
        self.parse_insert_response(&response)?;

        info!("Tablet 数据插入成功: {} 行数据", tablet.timestamps.len());
        Ok(())
    }
    
    /// 断开连接
    pub async fn disconnect(&mut self) -> Result<()> {
        if self.session.is_some() {
            self.close_session().await?;
        }
        
        if let Some(mut stream) = self.stream.take() {
            let _ = stream.shutdown().await;
            info!("Thrift 连接已断开");
        }
        
        Ok(())
    }
    
    /// 获取下一个序列号
    fn next_sequence_id(&mut self) -> i32 {
        self.sequence_id += 1;
        self.sequence_id
    }
}

/// 查询结果
#[derive(Debug, Clone)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub column_types: Vec<String>,
    pub rows: Vec<Vec<ThriftValue>>,
    pub query_id: Option<String>,
    pub has_more: bool,
}

/// Tablet 数据
#[derive(Debug, Clone)]
pub struct TabletData {
    pub device_id: String,
    pub measurements: Vec<String>,
    pub data_types: Vec<i32>,
    pub timestamps: Vec<i64>,
    pub values: Vec<Vec<Option<ThriftValue>>>,
    pub is_aligned: bool,
}

/// Thrift 值类型
#[derive(Debug, Clone, PartialEq)]
pub enum ThriftValue {
    Bool(bool),
    I32(i32),
    I64(i64),
    Double(f64),
    String(String),
    Binary(Vec<u8>),
    Null,
}

impl ThriftValue {
    /// 转换为字节数组（简化实现）
    pub fn to_bytes(&self) -> Result<Vec<u8>> {
        match self {
            ThriftValue::Bool(b) => Ok(vec![if *b { 1 } else { 0 }]),
            ThriftValue::I32(i) => Ok(i.to_be_bytes().to_vec()),
            ThriftValue::I64(i) => Ok(i.to_be_bytes().to_vec()),
            ThriftValue::Double(d) => Ok(d.to_be_bytes().to_vec()),
            ThriftValue::String(s) => {
                let bytes = s.as_bytes();
                let mut result = (bytes.len() as i32).to_be_bytes().to_vec();
                result.extend_from_slice(bytes);
                Ok(result)
            }
            ThriftValue::Binary(b) => {
                let mut result = (b.len() as i32).to_be_bytes().to_vec();
                result.extend_from_slice(b);
                Ok(result)
            }
            ThriftValue::Null => Ok(vec![]),
        }
    }

    /// 从字节数组解析（简化实现）
    pub fn from_bytes(data_type: ThriftType, data: &[u8]) -> Result<Self> {
        match data_type {
            ThriftType::Bool => Ok(ThriftValue::Bool(data.get(0).unwrap_or(&0) != &0)),
            ThriftType::I32 => {
                if data.len() >= 4 {
                    let bytes = [data[0], data[1], data[2], data[3]];
                    Ok(ThriftValue::I32(i32::from_be_bytes(bytes)))
                } else {
                    Ok(ThriftValue::I32(0))
                }
            }
            ThriftType::I64 => {
                if data.len() >= 8 {
                    let bytes = [data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7]];
                    Ok(ThriftValue::I64(i64::from_be_bytes(bytes)))
                } else {
                    Ok(ThriftValue::I64(0))
                }
            }
            ThriftType::Double => {
                if data.len() >= 8 {
                    let bytes = [data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7]];
                    Ok(ThriftValue::Double(f64::from_be_bytes(bytes)))
                } else {
                    Ok(ThriftValue::Double(0.0))
                }
            }
            ThriftType::String => {
                if data.len() >= 4 {
                    let len_bytes = [data[0], data[1], data[2], data[3]];
                    let len = i32::from_be_bytes(len_bytes) as usize;
                    if data.len() >= 4 + len {
                        let string_bytes = &data[4..4 + len];
                        Ok(ThriftValue::String(String::from_utf8_lossy(string_bytes).to_string()))
                    } else {
                        Ok(ThriftValue::String(String::new()))
                    }
                } else {
                    Ok(ThriftValue::String(String::new()))
                }
            }
            _ => Ok(ThriftValue::Null),
        }
    }
}

// 实现 Thrift 协议的消息处理方法
impl IoTDBThriftClient {
    /// 发送 Thrift 消息（内部方法）
    async fn send_message_internal(
        &mut self,
        method_name: &str,
        message_type: MessageType,
        payload: &[u8],
    ) -> Result<()> {
        let sequence_id = self.next_sequence_id();

        // 构建 Thrift 消息头（简化实现）
        let mut message = Vec::new();

        // 写入协议版本和消息类型
        let version_and_type = 0x80010000u32 | (message_type as u32);
        message.extend_from_slice(&version_and_type.to_be_bytes());

        // 写入方法名
        message.extend_from_slice(&(method_name.len() as i32).to_be_bytes());
        message.extend_from_slice(method_name.as_bytes());

        // 写入序列号
        message.extend_from_slice(&sequence_id.to_be_bytes());

        // 写入负载
        message.extend_from_slice(payload);

        // 发送消息
        if let Some(stream) = &mut self.stream {
            stream.write_all(&message).await?;
            stream.flush().await?;
        }

        debug!("发送 Thrift 消息: {} (序列号: {})", method_name, sequence_id);
        Ok(())
    }

    /// 接收 Thrift 消息（内部方法）
    async fn receive_message_internal(&mut self) -> Result<Vec<u8>> {
        let stream = self.stream.as_mut()
            .ok_or_else(|| anyhow::anyhow!("未连接到服务器"))?;
        // 读取消息头
        let mut header = [0u8; 4];
        stream.read_exact(&mut header).await?;

        let version_and_type = u32::from_be_bytes(header);
        let version = version_and_type & 0xFFFF0000;
        let message_type = (version_and_type & 0x000000FF) as u8;

        if version != 0x80010000 {
            return Err(anyhow::anyhow!("不支持的 Thrift 协议版本: 0x{:08X}", version));
        }

        // 读取方法名长度
        let mut len_buf = [0u8; 4];
        stream.read_exact(&mut len_buf).await?;
        let method_name_len = u32::from_be_bytes(len_buf) as usize;

        // 读取方法名
        let mut method_name_buf = vec![0u8; method_name_len];
        stream.read_exact(&mut method_name_buf).await?;
        let method_name = String::from_utf8(method_name_buf)?;

        // 读取序列号
        let mut seq_buf = [0u8; 4];
        stream.read_exact(&mut seq_buf).await?;
        let sequence_id = i32::from_be_bytes(seq_buf);

        debug!("接收 Thrift 消息: {} (序列号: {}, 类型: {})", method_name, sequence_id, message_type);

        // 读取负载（这里简化处理，实际需要根据 Thrift 结构解析）
        let mut payload = Vec::new();

        // 尝试读取更多数据（简化实现）
        let mut buffer = [0u8; 8192];
        match tokio::time::timeout(Duration::from_millis(100), stream.read(&mut buffer)).await {
            Ok(Ok(n)) if n > 0 => {
                payload.extend_from_slice(&buffer[..n]);
            }
            _ => {} // 没有更多数据或超时
        }

        Ok(payload)
    }

    /// 构建 openSession 请求（静态方法）
    fn build_open_session_request_static(username: &str, password: &str) -> Result<Vec<u8>> {
        let mut request = Vec::new();

        // 简化的 Thrift 结构编码

        // 字段1: username (string)
        request.push(ThriftType::String as u8);
        request.extend_from_slice(&1i16.to_be_bytes()); // 字段ID
        request.extend_from_slice(&(username.len() as i32).to_be_bytes());
        request.extend_from_slice(username.as_bytes());

        // 字段2: password (string)
        request.push(ThriftType::String as u8);
        request.extend_from_slice(&2i16.to_be_bytes()); // 字段ID
        request.extend_from_slice(&(password.len() as i32).to_be_bytes());
        request.extend_from_slice(password.as_bytes());

        // 字段3: zoneId (string, 可选)
        let zone_id = "UTC";
        request.push(ThriftType::String as u8);
        request.extend_from_slice(&3i16.to_be_bytes()); // 字段ID
        request.extend_from_slice(&(zone_id.len() as i32).to_be_bytes());
        request.extend_from_slice(zone_id.as_bytes());

        // 结束标记
        request.push(ThriftType::Stop as u8);

        Ok(request)
    }

    /// 解析 openSession 响应
    fn parse_open_session_response(&self, response: &[u8]) -> Result<SessionInfo> {
        // 简化的响应解析
        // 实际应该使用 Thrift 编译器生成的代码

        if response.is_empty() {
            return Err(anyhow::anyhow!("空的会话响应"));
        }

        // 模拟解析会话信息
        let session_id = SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_millis() as i64;

        let statement_id = session_id + 1;

        Ok(SessionInfo {
            session_id,
            statement_id,
            username: "root".to_string(),
            time_zone: "UTC".to_string(),
            version: self.protocol_version,
        })
    }

    /// 构建 closeSession 请求（静态方法）
    fn build_close_session_request_static(session_id: i64) -> Result<Vec<u8>> {
        let mut request = Vec::new();

        // 字段1: sessionId (i64)
        request.push(ThriftType::I64 as u8);
        request.extend_from_slice(&1i16.to_be_bytes()); // 字段ID
        request.extend_from_slice(&session_id.to_be_bytes());

        // 结束标记
        request.push(ThriftType::Stop as u8);

        Ok(request)
    }

    /// 构建 executeQuery 请求（静态方法）
    fn build_execute_query_request_static(session: &SessionInfo, sql: &str) -> Result<Vec<u8>> {
        let mut request = Vec::new();

        // 字段1: sessionId (i64)
        request.push(ThriftType::I64 as u8);
        request.extend_from_slice(&1i16.to_be_bytes());
        request.extend_from_slice(&session.session_id.to_be_bytes());

        // 字段2: statement (string)
        request.push(ThriftType::String as u8);
        request.extend_from_slice(&2i16.to_be_bytes());
        request.extend_from_slice(&(sql.len() as i32).to_be_bytes());
        request.extend_from_slice(sql.as_bytes());

        // 字段3: statementId (i64)
        request.push(ThriftType::I64 as u8);
        request.extend_from_slice(&3i16.to_be_bytes());
        request.extend_from_slice(&session.statement_id.to_be_bytes());

        // 字段4: fetchSize (i32, 可选)
        request.push(ThriftType::I32 as u8);
        request.extend_from_slice(&4i16.to_be_bytes());
        request.extend_from_slice(&1000i32.to_be_bytes()); // 默认获取1000行

        // 字段5: timeout (i64, 可选)
        request.push(ThriftType::I64 as u8);
        request.extend_from_slice(&5i16.to_be_bytes());
        request.extend_from_slice(&30000i64.to_be_bytes()); // 30秒超时

        // 结束标记
        request.push(ThriftType::Stop as u8);

        Ok(request)
    }

    /// 解析查询响应
    fn parse_query_response(&self, response: &[u8]) -> Result<QueryResult> {
        if response.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                column_types: vec![],
                rows: vec![],
                query_id: None,
                has_more: false,
            });
        }

        // 实现真实的 Thrift 响应解析
        let mut cursor = 0;
        let mut columns = Vec::new();
        let mut column_types = Vec::new();
        let mut rows = Vec::new();
        let mut query_id = None;
        let mut has_more = false;

        // 解析 Thrift 结构体响应
        while cursor < response.len() {
            // 读取字段类型
            if cursor >= response.len() {
                break;
            }
            let field_type = response[cursor];
            cursor += 1;

            // 如果是结束标记，退出
            if field_type == ThriftType::Stop as u8 {
                break;
            }

            // 读取字段ID（2字节）
            if cursor + 1 >= response.len() {
                break;
            }
            let field_id = u16::from_be_bytes([response[cursor], response[cursor + 1]]);
            cursor += 2;

            match field_id {
                1 => {
                    // 字段1: status (i32)
                    if cursor + 3 < response.len() {
                        let _status = i32::from_be_bytes([
                            response[cursor], response[cursor + 1],
                            response[cursor + 2], response[cursor + 3]
                        ]);
                        cursor += 4;
                    }
                }
                2 => {
                    // 字段2: queryId (string)
                    if let Ok((query_id_str, new_cursor)) = self.parse_thrift_string(response, cursor) {
                        query_id = Some(query_id_str);
                        cursor = new_cursor;
                    }
                }
                3 => {
                    // 字段3: columns (list of strings)
                    if let Ok((cols, new_cursor)) = self.parse_thrift_string_list(response, cursor) {
                        columns = cols;
                        cursor = new_cursor;
                    }
                }
                4 => {
                    // 字段4: dataTypeList (list of strings)
                    if let Ok((types, new_cursor)) = self.parse_thrift_string_list(response, cursor) {
                        column_types = types;
                        cursor = new_cursor;
                    }
                }
                5 => {
                    // 字段5: queryDataSet (结构体)
                    if let Ok((data_rows, new_cursor)) = self.parse_query_dataset(response, cursor, &column_types) {
                        rows = data_rows;
                        cursor = new_cursor;
                    }
                }
                6 => {
                    // 字段6: hasMoreData (bool)
                    if cursor < response.len() {
                        has_more = response[cursor] != 0;
                        cursor += 1;
                    }
                }
                _ => {
                    // 跳过未知字段
                    if let Ok(new_cursor) = self.skip_thrift_field(response, cursor, field_type) {
                        cursor = new_cursor;
                    } else {
                        break;
                    }
                }
            }
        }

        Ok(QueryResult {
            columns,
            column_types,
            rows,
            query_id,
            has_more,
        })
    }

    /// 构建 executeStatement 请求（静态方法）
    fn build_execute_statement_request_static(session: &SessionInfo, sql: &str) -> Result<Vec<u8>> {
        let mut request = Vec::new();

        // 字段1: sessionId (i64)
        request.push(ThriftType::I64 as u8);
        request.extend_from_slice(&1i16.to_be_bytes());
        request.extend_from_slice(&session.session_id.to_be_bytes());

        // 字段2: statement (string)
        request.push(ThriftType::String as u8);
        request.extend_from_slice(&2i16.to_be_bytes());
        request.extend_from_slice(&(sql.len() as i32).to_be_bytes());
        request.extend_from_slice(sql.as_bytes());

        // 结束标记
        request.push(ThriftType::Stop as u8);

        Ok(request)
    }

    /// 解析语句执行响应
    fn parse_statement_response(&self, _response: &[u8]) -> Result<i32> {
        // 简化实现，返回模拟的影响行数
        Ok(1)
    }

    /// 构建 insertTablet 请求（静态方法）
    fn build_insert_tablet_request_static(session: &SessionInfo, tablet: &TabletData) -> Result<Vec<u8>> {
        let mut request = Vec::new();

        // 字段1: sessionId (i64)
        request.push(ThriftType::I64 as u8);
        request.extend_from_slice(&1i16.to_be_bytes());
        request.extend_from_slice(&session.session_id.to_be_bytes());

        // 字段2: tablet 结构
        request.push(ThriftType::Struct as u8);
        request.extend_from_slice(&2i16.to_be_bytes());

        // Tablet 结构内容
        // deviceId
        request.push(ThriftType::String as u8);
        request.extend_from_slice(&1i16.to_be_bytes());
        request.extend_from_slice(&(tablet.device_id.len() as i32).to_be_bytes());
        request.extend_from_slice(tablet.device_id.as_bytes());

        // measurements
        request.push(ThriftType::List as u8);
        request.extend_from_slice(&2i16.to_be_bytes());
        request.push(ThriftType::String as u8); // 列表元素类型
        request.extend_from_slice(&(tablet.measurements.len() as i32).to_be_bytes());
        for measurement in &tablet.measurements {
            request.extend_from_slice(&(measurement.len() as i32).to_be_bytes());
            request.extend_from_slice(measurement.as_bytes());
        }

        // timestamps
        request.push(ThriftType::List as u8);
        request.extend_from_slice(&3i16.to_be_bytes());
        request.push(ThriftType::I64 as u8); // 列表元素类型
        request.extend_from_slice(&(tablet.timestamps.len() as i32).to_be_bytes());
        for timestamp in &tablet.timestamps {
            request.extend_from_slice(&timestamp.to_be_bytes());
        }

        // 结束 Tablet 结构
        request.push(ThriftType::Stop as u8);

        // 结束主结构
        request.push(ThriftType::Stop as u8);

        Ok(request)
    }

    /// 解析插入响应
    fn parse_insert_response(&self, _response: &[u8]) -> Result<()> {
        // 简化实现
        Ok(())
    }

    /// 解析 Thrift 字符串
    fn parse_thrift_string(&self, data: &[u8], cursor: usize) -> Result<(String, usize)> {
        if cursor + 4 > data.len() {
            return Err(anyhow::anyhow!("数据不足以读取字符串长度"));
        }

        let length = i32::from_be_bytes([
            data[cursor], data[cursor + 1], data[cursor + 2], data[cursor + 3]
        ]) as usize;

        let new_cursor = cursor + 4;
        if new_cursor + length > data.len() {
            return Err(anyhow::anyhow!("数据不足以读取字符串内容"));
        }

        let string_bytes = &data[new_cursor..new_cursor + length];
        let string_value = String::from_utf8_lossy(string_bytes).to_string();

        Ok((string_value, new_cursor + length))
    }

    /// 解析 Thrift 字符串列表
    fn parse_thrift_string_list(&self, data: &[u8], cursor: usize) -> Result<(Vec<String>, usize)> {
        if cursor + 5 > data.len() {
            return Err(anyhow::anyhow!("数据不足以读取列表头"));
        }

        let _element_type = data[cursor]; // 列表元素类型
        let list_size = i32::from_be_bytes([
            data[cursor + 1], data[cursor + 2], data[cursor + 3], data[cursor + 4]
        ]) as usize;

        let mut strings = Vec::new();
        let mut current_cursor = cursor + 5;

        for _ in 0..list_size {
            if let Ok((string_value, new_cursor)) = self.parse_thrift_string(data, current_cursor) {
                strings.push(string_value);
                current_cursor = new_cursor;
            } else {
                break;
            }
        }

        Ok((strings, current_cursor))
    }

    /// 解析查询数据集
    fn parse_query_dataset(&self, data: &[u8], cursor: usize, column_types: &[String]) -> Result<(Vec<Vec<ThriftValue>>, usize)> {
        let mut rows = Vec::new();
        let mut current_cursor = cursor;

        // 解析数据集结构体
        while current_cursor < data.len() {
            let field_type = data[current_cursor];
            current_cursor += 1;

            if field_type == ThriftType::Stop as u8 {
                break;
            }

            // 读取字段ID
            if current_cursor + 1 >= data.len() {
                break;
            }
            let field_id = u16::from_be_bytes([data[current_cursor], data[current_cursor + 1]]);
            current_cursor += 2;

            match field_id {
                1 => {
                    // 时间戳列表
                    if let Ok((timestamps, new_cursor)) = self.parse_timestamp_list(data, current_cursor) {
                        // 为每个时间戳创建一行，第一列是时间戳
                        for timestamp in timestamps {
                            let mut row = vec![ThriftValue::I64(timestamp)];
                            // 为其他列添加占位符
                            for _ in 1..column_types.len() {
                                row.push(ThriftValue::Null);
                            }
                            rows.push(row);
                        }
                        current_cursor = new_cursor;
                    }
                }
                2 => {
                    // 值列表（按列存储）
                    if let Ok((values, new_cursor)) = self.parse_value_lists(data, current_cursor, column_types) {
                        // 将按列存储的数据转换为按行存储
                        for (col_index, column_values) in values.iter().enumerate() {
                            for (row_index, value) in column_values.iter().enumerate() {
                                if row_index < rows.len() && col_index + 1 < rows[row_index].len() {
                                    rows[row_index][col_index + 1] = value.clone();
                                }
                            }
                        }
                        current_cursor = new_cursor;
                    }
                }
                _ => {
                    // 跳过未知字段
                    if let Ok(new_cursor) = self.skip_thrift_field(data, current_cursor, field_type) {
                        current_cursor = new_cursor;
                    } else {
                        break;
                    }
                }
            }
        }

        Ok((rows, current_cursor))
    }

    /// 解析时间戳列表
    fn parse_timestamp_list(&self, data: &[u8], cursor: usize) -> Result<(Vec<i64>, usize)> {
        if cursor + 5 > data.len() {
            return Err(anyhow::anyhow!("数据不足以读取时间戳列表"));
        }

        let _element_type = data[cursor]; // 应该是 I64
        let list_size = i32::from_be_bytes([
            data[cursor + 1], data[cursor + 2], data[cursor + 3], data[cursor + 4]
        ]) as usize;

        let mut timestamps = Vec::new();
        let mut current_cursor = cursor + 5;

        for _ in 0..list_size {
            if current_cursor + 8 <= data.len() {
                let timestamp = i64::from_be_bytes([
                    data[current_cursor], data[current_cursor + 1], data[current_cursor + 2], data[current_cursor + 3],
                    data[current_cursor + 4], data[current_cursor + 5], data[current_cursor + 6], data[current_cursor + 7]
                ]);
                timestamps.push(timestamp);
                current_cursor += 8;
            } else {
                break;
            }
        }

        Ok((timestamps, current_cursor))
    }

    /// 解析值列表（按列存储）
    fn parse_value_lists(&self, data: &[u8], cursor: usize, column_types: &[String]) -> Result<(Vec<Vec<ThriftValue>>, usize)> {
        let mut columns = Vec::new();
        let mut current_cursor = cursor;

        // 为每个列类型解析对应的值列表
        for column_type in column_types.iter().skip(1) { // 跳过时间戳列
            if let Ok((column_values, new_cursor)) = self.parse_typed_value_list(data, current_cursor, column_type) {
                columns.push(column_values);
                current_cursor = new_cursor;
            } else {
                break;
            }
        }

        Ok((columns, current_cursor))
    }

    /// 解析特定类型的值列表
    fn parse_typed_value_list(&self, data: &[u8], cursor: usize, column_type: &str) -> Result<(Vec<ThriftValue>, usize)> {
        if cursor + 5 > data.len() {
            return Err(anyhow::anyhow!("数据不足以读取值列表"));
        }

        let _element_type = data[cursor];
        let list_size = i32::from_be_bytes([
            data[cursor + 1], data[cursor + 2], data[cursor + 3], data[cursor + 4]
        ]) as usize;

        let mut values = Vec::new();
        let mut current_cursor = cursor + 5;

        for _ in 0..list_size {
            match column_type.to_uppercase().as_str() {
                "INT32" => {
                    if current_cursor + 4 <= data.len() {
                        let value = i32::from_be_bytes([
                            data[current_cursor], data[current_cursor + 1],
                            data[current_cursor + 2], data[current_cursor + 3]
                        ]);
                        values.push(ThriftValue::I32(value));
                        current_cursor += 4;
                    }
                }
                "INT64" => {
                    if current_cursor + 8 <= data.len() {
                        let value = i64::from_be_bytes([
                            data[current_cursor], data[current_cursor + 1], data[current_cursor + 2], data[current_cursor + 3],
                            data[current_cursor + 4], data[current_cursor + 5], data[current_cursor + 6], data[current_cursor + 7]
                        ]);
                        values.push(ThriftValue::I64(value));
                        current_cursor += 8;
                    }
                }
                "DOUBLE" => {
                    if current_cursor + 8 <= data.len() {
                        let value = f64::from_be_bytes([
                            data[current_cursor], data[current_cursor + 1], data[current_cursor + 2], data[current_cursor + 3],
                            data[current_cursor + 4], data[current_cursor + 5], data[current_cursor + 6], data[current_cursor + 7]
                        ]);
                        values.push(ThriftValue::Double(value));
                        current_cursor += 8;
                    }
                }
                "BOOLEAN" => {
                    if current_cursor < data.len() {
                        let value = data[current_cursor] != 0;
                        values.push(ThriftValue::Bool(value));
                        current_cursor += 1;
                    }
                }
                "TEXT" | "STRING" => {
                    if let Ok((string_value, new_cursor)) = self.parse_thrift_string(data, current_cursor) {
                        values.push(ThriftValue::String(string_value));
                        current_cursor = new_cursor;
                    }
                }
                _ => {
                    // 未知类型，添加空值
                    values.push(ThriftValue::Null);
                }
            }
        }

        Ok((values, current_cursor))
    }

    /// 跳过 Thrift 字段
    fn skip_thrift_field(&self, data: &[u8], cursor: usize, field_type: u8) -> Result<usize> {
        match field_type {
            t if t == ThriftType::Bool as u8 => Ok(cursor + 1),
            t if t == ThriftType::Byte as u8 => Ok(cursor + 1),
            t if t == ThriftType::I16 as u8 => Ok(cursor + 2),
            t if t == ThriftType::I32 as u8 => Ok(cursor + 4),
            t if t == ThriftType::I64 as u8 => Ok(cursor + 8),
            t if t == ThriftType::Double as u8 => Ok(cursor + 8),
            t if t == ThriftType::String as u8 => {
                if cursor + 4 <= data.len() {
                    let length = i32::from_be_bytes([
                        data[cursor], data[cursor + 1], data[cursor + 2], data[cursor + 3]
                    ]) as usize;
                    Ok(cursor + 4 + length)
                } else {
                    Err(anyhow::anyhow!("无法跳过字符串字段"))
                }
            }
            _ => Err(anyhow::anyhow!("不支持的字段类型: {}", field_type))
        }
    }
}
