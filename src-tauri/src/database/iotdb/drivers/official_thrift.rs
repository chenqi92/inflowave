/**
 * IoTDB 官方 Thrift 客户端包装器
 * 
 * 使用从IoTDB源码编译出来的官方Rust客户端接口
 * 替代之前的自定义Thrift协议实现
 */

use anyhow::{Context, Result};
use log::{debug, info, warn};
use std::sync::atomic::AtomicI64;
// TcpStream 导入已移除，使用 std::net::TcpStream 直接引用
use thrift::protocol::{TBinaryInputProtocol, TBinaryOutputProtocol};
use thrift::transport::{TFramedReadTransport, TFramedWriteTransport, TIoChannel, TTcpChannel, ReadHalf, WriteHalf};

// 导入官方生成的Thrift接口
use super::client::{IClientRPCServiceSyncClient, TIClientRPCServiceSyncClient};
use super::client::{TSOpenSessionReq, TSOpenSessionResp, TSCloseSessionReq, TSExecuteStatementReq, TSExecuteStatementResp, TSProtocolVersion};
use super::common::TSStatus;

/// IoTDB 官方 Thrift 客户端
pub struct OfficialThriftClient {
    /// Thrift 服务客户端
    client: Option<IClientRPCServiceSyncClient<TBinaryInputProtocol<TFramedReadTransport<ReadHalf<TTcpChannel>>>, TBinaryOutputProtocol<TFramedWriteTransport<WriteHalf<TTcpChannel>>>>>,
    /// 会话ID
    session_id: Option<i64>,
    /// 连接配置
    host: String,
    port: u16,
    username: String,
    password: String,
    /// 连接状态
    connected: bool,
    /// Statement ID 计数器
    statement_id_counter: AtomicI64,
}

impl OfficialThriftClient {
    /// 创建新的官方Thrift客户端
    pub fn new(host: String, port: u16, username: String, password: String) -> Self {
        Self {
            client: None,
            session_id: None,
            host,
            port,
            username,
            password,
            connected: false,
            statement_id_counter: AtomicI64::new(1), // 从1开始，避免使用0
        }
    }

    /// 连接到IoTDB服务器
    pub async fn connect(&mut self) -> Result<()> {
        let address = format!("{}:{}", self.host, self.port);
        info!("连接到IoTDB服务器: {}", address);

        // 使用tokio的异步TCP连接，然后转换为同步流
        let tcp_stream = tokio::task::spawn_blocking({
            let address = address.clone();
            move || {
                std::net::TcpStream::connect(&address)
                    .context("无法连接到IoTDB服务器")
            }
        }).await??;

        // 创建Thrift通道
        let channel = TTcpChannel::with_stream(tcp_stream);

        // 创建传输层
        let (read_transport, write_transport) = channel.split()?;
        let read_transport = TFramedReadTransport::new(read_transport);
        let write_transport = TFramedWriteTransport::new(write_transport);

        // 创建协议层
        let input_protocol = TBinaryInputProtocol::new(read_transport, true);
        let output_protocol = TBinaryOutputProtocol::new(write_transport, true);

        // 创建Thrift客户端
        let client = IClientRPCServiceSyncClient::new(input_protocol, output_protocol);
        self.client = Some(client);
        self.connected = true;

        info!("成功连接到IoTDB服务器");
        Ok(())
    }

    /// 打开会话
    pub async fn open_session(&mut self) -> Result<i64> {
        if !self.connected {
            return Err(anyhow::anyhow!("未连接到服务器"));
        }

        info!("打开IoTDB会话，用户: {}", self.username);

        // 构建打开会话请求
        let request = TSOpenSessionReq::new(
            TSProtocolVersion::IotdbServiceProtocolV3,
            "UTC+08:00".to_string(), // 默认时区
            self.username.clone(),
            Some(self.password.clone()),
            None, // configuration
        );

        // 发送请求并接收响应
        let response = self.send_open_session_request(request).await?;

        // 检查响应状态
        if response.status.code != 200 {
            let error_msg = response.status.message.unwrap_or_else(|| "未知错误".to_string());
            return Err(anyhow::anyhow!("打开会话失败: {}", error_msg));
        }

        // 获取会话ID
        let session_id = response.session_id
            .ok_or_else(|| anyhow::anyhow!("服务器未返回会话ID"))?;

        self.session_id = Some(session_id);
        info!("会话打开成功，会话ID: {}", session_id);

        Ok(session_id)
    }

    /// 关闭会话
    pub async fn close_session(&mut self) -> Result<()> {
        if let Some(session_id) = self.session_id {
            info!("关闭会话: {}", session_id);

            let request = TSCloseSessionReq::new(session_id);
            let response = self.send_close_session_request(request).await?;

            if response.code != 200 {
                let error_msg = response.message.unwrap_or_else(|| "未知错误".to_string());
                warn!("关闭会话时出现警告: {}", error_msg);
            }

            self.session_id = None;
            info!("会话已关闭");
        }
        Ok(())
    }

    /// 执行SQL语句
    pub async fn execute_statement(&mut self, sql: &str) -> Result<TSExecuteStatementResp> {
        debug!("执行SQL语句: {}", sql);

        // 对于查询语句，使用executeQueryStatement
        if sql.trim().to_uppercase().starts_with("SELECT") ||
           sql.trim().to_uppercase().starts_with("SHOW") {
            return self.execute_query_statement(sql).await;
        }

        // 对于非查询语句，使用executeUpdateStatement
        self.execute_update_statement(sql).await
    }

    /// 执行查询语句
    async fn execute_query_statement(&mut self, sql: &str) -> Result<TSExecuteStatementResp> {
        let session_id = self.session_id
            .ok_or_else(|| anyhow::anyhow!("未打开会话"))?;

        debug!("执行查询语句: {}", sql);

        // 先请求一个有效的StatementId
        let statement_id = self.request_statement_id(session_id).await?;
        debug!("获取到StatementId: {}", statement_id);

        // 构建查询请求
        let request = TSExecuteStatementReq::new(
            session_id,
            sql.to_string(),
            statement_id, // 使用请求到的statement_id
            Some(1000), // fetch_size
            Some(60000), // timeout (60秒)
            Some(false), // enable_redirect_query
            Some(false), // jdbc_query
        );

        // 使用查询专用的方法
        let response = self.send_query_statement_request(request).await?;

        // 检查响应状态
        if response.status.code != 200 {
            let error_msg = response.status.message.unwrap_or_else(|| "未知错误".to_string());
            return Err(anyhow::anyhow!("执行查询失败: {}", error_msg));
        }

        debug!("查询执行成功");

        // 添加详细的响应调试信息
        debug!("响应状态: {:?}", response.status);
        debug!("响应列数: {:?}", response.columns.as_ref().map(|c| c.len()));
        debug!("响应数据类型: {:?}", response.data_type_list);
        debug!("是否有查询数据集: {}", response.query_data_set.is_some());
        debug!("是否有查询结果: {}", response.query_result.is_some());

        if let Some(ref data_set) = response.query_data_set {
            debug!("查询数据集详情:");
            debug!("  - 时间数据长度: {} 字节", data_set.time.len());
            debug!("  - 值列表数量: {}", data_set.value_list.len());
            debug!("  - 位图列表数量: {}", data_set.bitmap_list.len());

            for (i, value_data) in data_set.value_list.iter().enumerate() {
                debug!("  - 列 {} 数据长度: {} 字节", i, value_data.len());
                if value_data.len() > 0 && value_data.len() <= 100 {
                    debug!("  - 列 {} 原始数据: {:?}", i, value_data);
                }
            }
        }

        if let Some(ref query_result) = response.query_result {
            debug!("查询结果详情:");
            debug!("  - 结果行数: {}", query_result.len());
            for (i, row_data) in query_result.iter().enumerate().take(3) {
                debug!("  - 行 {} 数据长度: {} 字节", i, row_data.len());
                if row_data.len() > 0 && row_data.len() <= 100 {
                    debug!("  - 行 {} 原始数据: {:?}", i, row_data);
                }
            }
        }

        Ok(response)
    }

    /// 执行更新语句
    async fn execute_update_statement(&mut self, sql: &str) -> Result<TSExecuteStatementResp> {
        let session_id = self.session_id
            .ok_or_else(|| anyhow::anyhow!("未打开会话"))?;

        debug!("执行更新语句: {}", sql);

        // 先请求一个有效的StatementId（与查询语句一样）
        let statement_id = self.request_statement_id(session_id).await?;
        debug!("获取到StatementId: {}", statement_id);

        // 构建更新请求
        let request = TSExecuteStatementReq::new(
            session_id,
            sql.to_string(),
            statement_id, // 使用请求到的statement_id
            Some(1000), // fetch_size
            Some(60000), // timeout (60秒)
            Some(false), // enable_redirect_query
            Some(false), // jdbc_query
        );

        // 使用更新专用的方法
        let response = self.send_update_statement_request(request).await?;

        // 检查响应状态
        if response.status.code != 200 {
            let error_msg = response.status.message.unwrap_or_else(|| "未知错误".to_string());
            return Err(anyhow::anyhow!("执行更新失败: {}", error_msg));
        }

        debug!("更新执行成功");
        Ok(response)
    }

    /// 断开连接
    pub async fn disconnect(&mut self) -> Result<()> {
        // 先关闭会话
        self.close_session().await?;

        // 清理连接资源
        self.client = None;
        self.connected = false;

        info!("已断开与IoTDB服务器的连接");
        Ok(())
    }

    /// 检查是否已连接
    pub fn is_connected(&self) -> bool {
        self.connected && self.session_id.is_some()
    }

    /// 获取会话ID
    pub fn get_session_id(&self) -> Option<i64> {
        self.session_id
    }

    /// 简单连接测试
    pub async fn test_connection_simple(&mut self) -> Result<bool> {
        // 尝试连接并打开会话
        match self.connect().await {
            Ok(()) => {
                match self.open_session().await {
                    Ok(_) => {
                        let _ = self.disconnect().await;
                        Ok(true)
                    }
                    Err(_) => Ok(false)
                }
            }
            Err(_) => Ok(false)
        }
    }

    // 私有方法：发送打开会话请求
    async fn send_open_session_request(&mut self, request: TSOpenSessionReq) -> Result<TSOpenSessionResp> {
        let client = self.client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Thrift客户端未初始化"))?;

        // 使用官方生成的Thrift客户端进行RPC调用
        let response = client.open_session(request)
            .map_err(|e| anyhow::anyhow!("Thrift RPC调用失败: {}", e))?;

        Ok(response)
    }

    // 私有方法：发送关闭会话请求
    async fn send_close_session_request(&mut self, request: TSCloseSessionReq) -> Result<TSStatus> {
        let client = self.client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Thrift客户端未初始化"))?;

        let response = client.close_session(request)
            .map_err(|e| anyhow::anyhow!("Thrift RPC调用失败: {}", e))?;

        Ok(response)
    }

    // 私有方法：请求StatementId
    async fn request_statement_id(&mut self, session_id: i64) -> Result<i64> {
        let client = self.client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Thrift客户端未初始化"))?;

        // 请求一个新的StatementId
        let statement_id = client.request_statement_id(session_id)
            .map_err(|e| anyhow::anyhow!("请求StatementId失败: {}", e))?;

        Ok(statement_id)
    }

    // 私有方法：发送查询语句请求
    async fn send_query_statement_request(&mut self, request: TSExecuteStatementReq) -> Result<TSExecuteStatementResp> {
        let client = self.client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Thrift客户端未初始化"))?;

        // 使用查询专用的方法
        let response = client.execute_query_statement(request)
            .map_err(|e| anyhow::anyhow!("Thrift查询RPC调用失败: {}", e))?;

        Ok(response)
    }

    // 私有方法：发送更新语句请求
    async fn send_update_statement_request(&mut self, request: TSExecuteStatementReq) -> Result<TSExecuteStatementResp> {
        let client = self.client.as_mut()
            .ok_or_else(|| anyhow::anyhow!("Thrift客户端未初始化"))?;

        // 使用更新专用的方法
        let response = client.execute_update_statement(request)
            .map_err(|e| anyhow::anyhow!("Thrift更新RPC调用失败: {}", e))?;

        Ok(response)
    }
}

impl std::fmt::Debug for OfficialThriftClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("OfficialThriftClient")
            .field("host", &self.host)
            .field("port", &self.port)
            .field("username", &self.username)
            .field("connected", &self.connected)
            .field("session_id", &self.session_id)
            .finish()
    }
}

impl Drop for OfficialThriftClient {
    fn drop(&mut self) {
        if self.connected {
            warn!("OfficialThriftClient被丢弃时仍处于连接状态，建议显式调用disconnect()");
        }
    }
}
