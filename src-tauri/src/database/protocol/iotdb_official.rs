use std::time::{Duration, Instant};
use anyhow::{Context, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use iotdb::{Config, ConfigBuilder, Session};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

use crate::database::{
    DatabaseClient, DatabaseConfig, QueryResult, QueryRow,
    ConnectionTestResult, DatabaseInfo, TableInfo, ColumnInfo
};

use super::{
    ProtocolClient, ProtocolConfig, ProtocolType, QueryRequest, QueryResponse,
    ConnectionStatus, ServerInfo, ColumnInfo as ProtocolColumnInfo
};

/// IoTDB 官方客户端协议实现
pub struct IoTDBOfficialClient {
    config: IoTDBOfficialConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IoTDBOfficialConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub timeout: Option<u64>,
    pub fetch_size: Option<i32>,
    pub time_zone: Option<String>,
}

impl From<&DatabaseConfig> for IoTDBOfficialConfig {
    fn from(config: &DatabaseConfig) -> Self {
        Self {
            host: config.host.clone(),
            port: config.port,
            username: config.username.clone(),
            password: config.password.clone(),
            timeout: Some(30000), // 30 seconds default
            fetch_size: Some(1024),
            time_zone: Some("UTC+8".to_string()),
        }
    }
}

impl IoTDBOfficialClient {
    pub fn new(config: IoTDBOfficialConfig) -> Self {
        println!("🏗️ 创建 IoTDB 官方客户端");
        Self {
            config,
        }
    }

    fn build_iotdb_config(&self) -> Config {
        println!("🔧 构建 IoTDB 官方客户端配置");
        let endpoint = format!("{}:{}", self.config.host, self.config.port);
        
        let mut builder = ConfigBuilder::new()
            .endpoint(&endpoint)
            .user(&self.config.username)
            .password(&self.config.password);

        if let Some(timeout) = self.config.timeout {
            builder = builder.timeout(timeout as i64);
        }

        if let Some(fetch_size) = self.config.fetch_size {
            builder = builder.fetch_size(fetch_size);
        }

        if let Some(ref time_zone) = self.config.time_zone {
            builder = builder.time_zone(time_zone);
        }

        let config = builder.build();
        println!("📡 IoTDB 配置: endpoint={}, user={}", endpoint, self.config.username);
        config
    }

    fn create_session(&self) -> Result<Session> {
        println!("🔌 创建 IoTDB 会话");
        let config = self.build_iotdb_config();
        let session = Session::connect(config)
            .context("Failed to connect to IoTDB")?;
        println!("✅ IoTDB 会话创建成功");
        Ok(session)
    }
}

#[async_trait]
impl DatabaseClient for IoTDBOfficialClient {
    async fn test_connection(&mut self) -> Result<Duration> {
        println!("🔌 测试 IoTDB 官方客户端连接");
        let start = Instant::now();

        let config = self.build_iotdb_config();

        // 使用 tokio::task::spawn_blocking 来运行同步代码
        let result = tokio::task::spawn_blocking(move || {
            let mut session = Session::connect(config)?;

            // 执行一个简单的查询来测试连接
            let _result = session.sql("SHOW DATABASES")?;
            session.close()?;

            Ok::<(), anyhow::Error>(())
        }).await?;

        result?;

        let duration = start.elapsed();
        println!("✅ IoTDB 官方客户端连接测试成功，耗时: {:?}", duration);
        Ok(duration)
    }

    async fn connect(&mut self) -> Result<()> {
        // 对于官方客户端，我们不维持长连接，每次操作时创建新会话
        println!("✅ IoTDB 官方客户端准备就绪");
        Ok(())
    }

    async fn disconnect(&mut self) -> Result<()> {
        // 对于官方客户端，我们不维持长连接，无需断开
        println!("✅ IoTDB 官方客户端已断开");
        Ok(())
    }

    async fn execute_query(&mut self, query: &str) -> Result<QueryResult> {
        println!("📊 执行 IoTDB 查询: {}", query);
        let start = Instant::now();

        let config = self.build_iotdb_config();
        let query = query.to_string();

        let result = tokio::task::spawn_blocking(move || {
            let mut session = Session::connect(config)?;
            let dataset = session.sql(&query)?;

            // 获取列信息
            let column_names = dataset.get_column_names();
            let columns = column_names.iter().map(|name| name.clone()).collect();

            // 获取行数据
            let mut rows = Vec::new();
            let mut total_rows = 0;

            while dataset.has_next()? {
                let record = dataset.next()?;
                let mut values = Vec::new();

                for i in 0..column_names.len() {
                    let value = if let Some(val) = record.get(i) {
                        val.to_string()
                    } else {
                        "NULL".to_string()
                    };
                    values.push(value);
                }

                rows.push(QueryRow { values });
                total_rows += 1;
            }

            session.close()?;

            Ok::<(Vec<String>, Vec<QueryRow>, usize), anyhow::Error>((columns, rows, total_rows))
        }).await??;

        let execution_time = start.elapsed();

        Ok(QueryResult {
            columns: result.0,
            rows: result.1,
            execution_time,
            total_rows: result.2,
        })
    }

    async fn get_databases(&mut self) -> Result<Vec<DatabaseInfo>> {
        println!("📋 获取 IoTDB 数据库列表");
        self.ensure_connected().await?;
        
        // 执行 SHOW DATABASES 查询
        let result = self.execute_query("SHOW DATABASES").await?;
        
        let databases = result.rows.into_iter()
            .filter_map(|row| {
                if let Some(name) = row.values.get(0) {
                    Some(DatabaseInfo {
                        name: name.clone(),
                        size: None,
                        table_count: None,
                    })
                } else {
                    None
                }
            })
            .collect();
        
        println!("✅ 获取到 {} 个数据库", databases.len());
        Ok(databases)
    }

    async fn get_tables(&mut self, database: &str) -> Result<Vec<TableInfo>> {
        println!("📋 获取数据库 {} 的时间序列列表", database);
        self.ensure_connected().await?;
        
        // 在 IoTDB 中，"表" 对应时间序列
        let query = format!("SHOW TIMESERIES {}.* LIMIT 1000", database);
        let result = self.execute_query(&query).await?;
        
        let tables = result.rows.into_iter()
            .filter_map(|row| {
                if let Some(timeseries) = row.values.get(0) {
                    Some(TableInfo {
                        name: timeseries.clone(),
                        row_count: None,
                        size: None,
                        columns: vec![], // 时间序列的列信息需要单独查询
                    })
                } else {
                    None
                }
            })
            .collect();
        
        println!("✅ 获取到 {} 个时间序列", tables.len());
        Ok(tables)
    }

    async fn get_columns(&mut self, database: &str, table: &str) -> Result<Vec<ColumnInfo>> {
        println!("📋 获取时间序列 {}.{} 的列信息", database, table);
        
        // IoTDB 时间序列的基本列结构
        let columns = vec![
            ColumnInfo {
                name: "Time".to_string(),
                data_type: "TIMESTAMP".to_string(),
                is_nullable: false,
                default_value: None,
            },
            ColumnInfo {
                name: table.to_string(),
                data_type: "UNKNOWN".to_string(), // 需要查询具体类型
                is_nullable: true,
                default_value: None,
            },
        ];
        
        Ok(columns)
    }

    async fn test_connection_detailed(&mut self) -> Result<ConnectionTestResult> {
        let start = Instant::now();
        
        match self.test_connection().await {
            Ok(duration) => {
                Ok(ConnectionTestResult {
                    success: true,
                    duration,
                    error: None,
                    server_version: Some("IoTDB (Official Client)".to_string()),
                    database_count: None,
                })
            }
            Err(e) => {
                Ok(ConnectionTestResult {
                    success: false,
                    duration: start.elapsed(),
                    error: Some(e.to_string()),
                    server_version: None,
                    database_count: None,
                })
            }
        }
    }
}

/// 为官方客户端实现协议客户端接口
#[async_trait]
impl ProtocolClient for IoTDBOfficialClient {
    async fn connect(&mut self) -> Result<()> {
        DatabaseClient::connect(self).await
    }

    async fn disconnect(&mut self) -> Result<()> {
        DatabaseClient::disconnect(self).await
    }

    async fn authenticate(&mut self, _username: &str, _password: &str) -> Result<()> {
        // 官方客户端在连接时已经进行认证
        Ok(())
    }

    async fn execute_query(&mut self, request: QueryRequest) -> Result<QueryResponse> {
        let query_result = DatabaseClient::execute_query(self, &request.sql).await?;

        // 转换为协议响应格式
        let columns = query_result.columns.into_iter()
            .map(|name| ProtocolColumnInfo {
                name,
                data_type: "UNKNOWN".to_string(),
                nullable: true,
                comment: None,
            })
            .collect();

        let rows = query_result.rows.into_iter()
            .map(|row| row.values)
            .collect();

        Ok(QueryResponse {
            success: true,
            message: None,
            columns,
            rows,
            execution_time: query_result.execution_time,
            row_count: query_result.total_rows,
            has_more: false,
            query_id: None,
        })
    }

    async fn test_connection(&mut self) -> Result<Duration> {
        DatabaseClient::test_connection(self).await
    }

    fn get_status(&self) -> ConnectionStatus {
        ConnectionStatus::Connected
    }

    fn get_protocol_type(&self) -> ProtocolType {
        ProtocolType::IoTDBOfficial
    }

    async fn get_server_info(&mut self) -> Result<ServerInfo> {
        Ok(ServerInfo {
            version: "IoTDB (Official Client)".to_string(),
            build_info: Some("Using official iotdb-rs client".to_string()),
            supported_protocols: vec![ProtocolType::IoTDBOfficial],
            capabilities: vec![
                "SQL".to_string(),
                "Timeseries".to_string(),
                "Session".to_string(),
            ],
            timezone: self.config.time_zone.clone(),
        })
    }

    async fn close_query(&mut self, _query_id: &str) -> Result<()> {
        // 官方客户端不支持查询ID管理
        Ok(())
    }

    async fn fetch_more(&mut self, _query_id: &str, _fetch_size: i32) -> Result<QueryResponse> {
        Err(anyhow::anyhow!("官方客户端不支持分页查询"))
    }
}

/// 从协议配置创建官方客户端
impl TryFrom<ProtocolConfig> for IoTDBOfficialClient {
    type Error = anyhow::Error;

    fn try_from(config: ProtocolConfig) -> Result<Self> {
        let iotdb_config = IoTDBOfficialConfig {
            host: config.host,
            port: config.port,
            username: config.username.unwrap_or_default(),
            password: config.password.unwrap_or_default(),
            timeout: Some(config.timeout.as_millis() as u64),
            fetch_size: Some(1024),
            time_zone: Some("UTC+8".to_string()),
        };

        Ok(Self::new(iotdb_config))
    }
}
