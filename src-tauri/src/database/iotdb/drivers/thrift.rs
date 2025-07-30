/**
 * IoTDB Thrift 协议驱动实现
 * 
 * 支持 IoTDB 0.13 → 1.x → 2.x 的原生 Thrift 协议
 */

use anyhow::Result;
use async_trait::async_trait;
use log::{debug, info, warn};
use std::time::{Duration, Instant};

use crate::database::iotdb::{
    capability::Capability,
    driver::{DriverConfig, IoTDBDriver, QueryRequest, QueryResponse, Tablet, ColumnInfo},
    types::{DataValue, IoTDBDataType, TypeMapper},
    dialect::{QueryBuilder, SqlDialect},
    thrift_protocol::{IoTDBThriftClient, ProtocolVersion, TabletData, ThriftValue},
};

/// Thrift 驱动实现
#[derive(Debug)]
pub struct ThriftDriver {
    config: DriverConfig,
    capability: Capability,
    connected: bool,
    thrift_client: IoTDBThriftClient,
    type_mapper: TypeMapper,
    query_builder: QueryBuilder,
}

impl ThriftDriver {
    /// 创建新的 Thrift 驱动
    pub async fn new(config: DriverConfig, capability: Capability) -> Result<Self> {
        let type_mapper = TypeMapper::new(&capability.server.version);
        let dialect = if capability.server.table_model {
            SqlDialect::Table
        } else {
            SqlDialect::Tree
        };
        let query_builder = QueryBuilder::new(dialect);

        // 根据版本创建协议客户端
        let protocol_version = ProtocolVersion::from_version(
            capability.server.version.major,
            capability.server.version.minor,
        );
        let thrift_client = IoTDBThriftClient::new(protocol_version);

        Ok(Self {
            config,
            capability,
            connected: false,
            thrift_client,
            type_mapper,
            query_builder,
        })
    }
    
    /// 建立 Thrift 连接
    async fn establish_connection(&mut self) -> Result<()> {
        info!("建立 Thrift 连接到 {}:{}", self.config.host, self.config.port);

        // 连接到服务器
        self.thrift_client.connect(&self.config.host, self.config.port).await?;

        // 打开会话
        let username = self.config.username.as_deref().unwrap_or("root");
        let password = self.config.password.as_deref().unwrap_or("root");

        let session_info = self.thrift_client.open_session(username, password).await?;

        self.connected = true;
        info!("Thrift 连接建立成功，会话ID: {}", session_info.session_id);

        Ok(())
    }


    
    /// 执行原始查询
    async fn execute_raw_query(&mut self, sql: &str) -> Result<QueryResponse> {
        if !self.connected {
            return Err(anyhow::anyhow!("未连接到 IoTDB 服务器"));
        }

        let start_time = Instant::now();
        debug!("执行 Thrift 查询: {}", sql);

        // 使用真实的 Thrift 客户端执行查询
        let thrift_result = self.thrift_client.execute_query(sql).await?;

        // 转换 Thrift 结果为标准格式
        let columns = thrift_result.columns.into_iter()
            .zip(thrift_result.column_types.iter())
            .map(|(name, type_str)| {
                let data_type = self.parse_column_type(type_str);
                ColumnInfo {
                    name,
                    data_type,
                    nullable: true,
                }
            })
            .collect();

        let rows = thrift_result.rows.into_iter()
            .map(|thrift_row| {
                thrift_row.into_iter()
                    .map(|thrift_value| self.convert_thrift_value(thrift_value))
                    .collect()
            })
            .collect();

        let execution_time = start_time.elapsed();

        Ok(QueryResponse {
            columns,
            rows,
            execution_time,
            affected_rows: None,
            warnings: vec![],
        })
    }

    /// 解析列类型
    fn parse_column_type(&self, type_str: &str) -> IoTDBDataType {
        match type_str.to_uppercase().as_str() {
            "INT32" => IoTDBDataType::Int32,
            "INT64" => IoTDBDataType::Int64,
            "FLOAT" => IoTDBDataType::Float,
            "DOUBLE" => IoTDBDataType::Double,
            "BOOLEAN" => IoTDBDataType::Boolean,
            "TEXT" => IoTDBDataType::Text,
            "STRING" => IoTDBDataType::String,
            "BLOB" => IoTDBDataType::Blob,
            "DATE" => IoTDBDataType::Date,
            "TIMESTAMP" => IoTDBDataType::Timestamp,
            _ => IoTDBDataType::Text, // 默认类型
        }
    }

    /// 转换 Thrift 值为标准数据值
    fn convert_thrift_value(&self, thrift_value: ThriftValue) -> DataValue {
        match thrift_value {
            ThriftValue::Bool(b) => DataValue::Boolean(b),
            ThriftValue::I32(i) => DataValue::Int32(i),
            ThriftValue::I64(i) => DataValue::Int64(i),
            ThriftValue::Double(d) => DataValue::Double(d),
            ThriftValue::String(s) => DataValue::Text(s),
            ThriftValue::Binary(b) => DataValue::Blob(b),
            ThriftValue::Null => DataValue::Null,
        }
    }
    
    /// 处理类型兼容性
    fn handle_type_compatibility(&self, response: &mut QueryResponse) {
        // 根据版本进行类型转换
        for column in &mut response.columns {
            column.data_type = self.type_mapper.map_type(&column.data_type);
        }
        
        // 转换数据值
        for row in &mut response.rows {
            for (i, value) in row.iter_mut().enumerate() {
                if let Some(column) = response.columns.get(i) {
                    *value = self.type_mapper.convert_value(value.clone(), &column.data_type);
                }
            }
        }
    }
}

#[async_trait]
impl IoTDBDriver for ThriftDriver {
    async fn connect(&mut self) -> Result<()> {
        self.establish_connection().await
    }
    
    async fn disconnect(&mut self) -> Result<()> {
        if self.connected {
            debug!("断开 Thrift 连接");

            // 使用真实的 Thrift 客户端断开连接
            self.thrift_client.disconnect().await?;

            self.connected = false;
            info!("Thrift 连接已断开");
        }
        Ok(())
    }
    
    async fn query(&mut self, request: QueryRequest) -> Result<QueryResponse> {
        // 使用查询构建器处理 SQL 方言
        let processed_sql = self.query_builder.process_query(&request.sql)?;
        
        let mut response = self.execute_raw_query(&processed_sql).await?;
        
        // 处理类型兼容性
        self.handle_type_compatibility(&mut response);
        
        Ok(response)
    }
    
    async fn execute(&mut self, sql: &str) -> Result<usize> {
        let processed_sql = self.query_builder.process_query(sql)?;
        let response = self.execute_raw_query(&processed_sql).await?;
        Ok(response.affected_rows.unwrap_or(0))
    }
    
    async fn write_tablet(&mut self, tablet: &Tablet) -> Result<()> {
        if !self.connected {
            return Err(anyhow::anyhow!("未连接到 IoTDB 服务器"));
        }

        debug!("写入 Tablet 数据: {}", tablet.device_id);

        // 转换为 Thrift Tablet 格式
        let thrift_tablet = Self::convert_to_thrift_tablet(tablet)?;

        // 使用真实的 Thrift 客户端写入数据
        self.thrift_client.insert_tablet(&thrift_tablet).await?;

        info!("Tablet 数据写入成功: {} 行数据", tablet.timestamps.len());
        Ok(())
    }


    async fn test_connection(&mut self) -> Result<Duration> {
        let start_time = Instant::now();

        if !self.connected {
            self.connect().await?;
        }

        // 首先尝试最简单的TCP连接测试
        match self.thrift_client.test_connection_simple().await {
            Ok(()) => {
                info!("IoTDB Thrift TCP连接测试成功");
                return Ok(start_time.elapsed());
            }
            Err(e) => {
                warn!("IoTDB Thrift TCP连接测试失败: {}", e);
                return Err(e);
            }
        }

        // 如果简单测试失败，尝试查询测试
        let test_queries = vec![
            "SHOW VERSION",           // 最简单的查询
            "SHOW DATABASES",         // 显示数据库
            "SHOW STORAGE GROUP",     // 兼容旧版本
        ];

        let mut last_error = None;

        // 尝试多个测试查询，只要有一个成功就认为连接正常
        for test_sql in test_queries {
            match self.execute_raw_query(test_sql).await {
                Ok(_response) => {
                    info!("IoTDB Thrift 连接测试成功，使用查询: {}", test_sql);
                    return Ok(start_time.elapsed());
                }
                Err(e) => {
                    warn!("测试查询失败 '{}': {}", test_sql, e);
                    last_error = Some(e);
                    continue;
                }
            }
        }

        // 如果所有测试查询都失败，但连接已建立，则认为连接基本可用
        if self.connected {
            warn!("所有测试查询都失败，但Thrift连接已建立，认为连接基本可用");
            return Ok(start_time.elapsed());
        }

        // 返回最后一个错误
        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("连接测试失败")))
    }
    
    fn capabilities(&self) -> &Capability {
        &self.capability
    }
    
    fn is_connected(&self) -> bool {
        self.connected
    }
    
    fn driver_type(&self) -> &str {
        "thrift"
    }
}

impl ThriftDriver {
    /// 转换为 Thrift Tablet 格式（静态方法）
    fn convert_to_thrift_tablet(tablet: &Tablet) -> Result<TabletData> {
        // 转换数据类型
        let data_types: Vec<i32> = tablet.data_types.iter()
            .map(|dt| match dt {
                IoTDBDataType::Boolean => 0,
                IoTDBDataType::Int32 => 1,
                IoTDBDataType::Int64 => 2,
                IoTDBDataType::Float => 3,
                IoTDBDataType::Double => 4,
                IoTDBDataType::Text => 5,
                IoTDBDataType::String => 6,
                IoTDBDataType::Blob => 7,
                IoTDBDataType::Date => 8,
                IoTDBDataType::Timestamp => 9,
                IoTDBDataType::Null => 10,
            })
            .collect();

        // 转换数据值
        let values: Vec<Vec<Option<ThriftValue>>> = tablet.values.iter()
            .map(|row| {
                row.iter().map(|cell| {
                    cell.as_ref().map(|value| match value {
                        DataValue::Boolean(b) => ThriftValue::Bool(*b),
                        DataValue::Int32(i) => ThriftValue::I32(*i),
                        DataValue::Int64(i) => ThriftValue::I64(*i),
                        DataValue::Float(f) => ThriftValue::Double(*f as f64),
                        DataValue::Double(d) => ThriftValue::Double(*d),
                        DataValue::Text(s) => ThriftValue::String(s.clone()),
                        DataValue::Blob(b) => ThriftValue::Binary(b.clone()),
                        DataValue::Timestamp(t) => ThriftValue::I64(*t),
                        DataValue::Null => ThriftValue::Null,
                    })
                }).collect()
            })
            .collect();

        Ok(TabletData {
            device_id: tablet.device_id.clone(),
            measurements: tablet.measurements.clone(),
            data_types,
            timestamps: tablet.timestamps.clone(),
            values,
            is_aligned: tablet.is_aligned,
        })
    }
}

impl Drop for ThriftDriver {
    fn drop(&mut self) {
        if self.connected {
            warn!("ThriftDriver 被丢弃时仍处于连接状态");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::iotdb::capability::{VersionInfo, ServerCapability, ConnectionInfo};
    use std::collections::HashMap;
    
    fn create_test_capability() -> Capability {
        let version = VersionInfo {
            major: 1,
            minor: 3,
            patch: 2,
            build: None,
            raw: "1.3.2".to_string(),
        };
        
        let server = ServerCapability {
            version,
            tree_model: true,
            table_model: false,
            rest_v2: true,
            new_types: true,
            ssl: false,
            supported_protocols: vec!["thrift".to_string()],
            extra_properties: HashMap::new(),
        };
        
        let connection_info = ConnectionInfo {
            host: "localhost".to_string(),
            port: 6667,
            ssl: false,
            available_ports: HashMap::new(),
        };
        
        Capability {
            server,
            connection_info,
        }
    }
    
    #[tokio::test]
    async fn test_thrift_driver_creation() {
        let config = DriverConfig {
            host: "localhost".to_string(),
            port: 6667,
            username: Some("root".to_string()),
            password: Some("root".to_string()),
            ssl: false,
            timeout: Duration::from_secs(30),
            extra_params: HashMap::new(),
        };
        
        let capability = create_test_capability();
        let driver = ThriftDriver::new(config, capability).await;
        assert!(driver.is_ok());
    }
}
