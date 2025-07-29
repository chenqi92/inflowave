/**
 * InfluxDB 3.x FlightSQL 驱动实现
 * 
 * 使用 FlightSQL 协议与 InfluxDB 3.x 进行交互，支持 SQL 和 InfluxQL
 */

#[cfg(feature = "influxdb-v3")]
use super::{
    capability::{Capability, Query, DataSet, BucketInfo, Health, HealthStatus, QueryLanguage},
    driver::{
        InfluxDriver, MeasurementSchema, FieldSchema, TagSchema, FieldType,
        RetentionPolicyInfo, RetentionPolicyConfig, DriverError, DriverResult,
    },
    detector::InfluxDetector,
};
use crate::models::ConnectionConfig;
use anyhow::Result;
use async_trait::async_trait;
use log::{debug, error, info, warn};
use std::time::{Duration, Instant};

// FlightSQL 相关导入
#[cfg(feature = "influxdb-v3")]
use arrow_flight::{
    sql::{client::FlightSqlServiceClient, CommandStatementQuery, ProstMessageExt},
    FlightDescriptor, FlightInfo, Ticket,
};
use tonic::{
    transport::{Channel, Endpoint},
    Request,
};

/// InfluxDB 3.x FlightSQL 驱动
#[cfg(feature = "influxdb-v3")]
pub struct FlightSqlDriver {
    client: std::sync::Arc<tokio::sync::Mutex<Option<FlightSqlServiceClient<Channel>>>>,
    config: ConnectionConfig,
    capability: Capability,
    endpoint_url: String,
    token: String,
}

#[cfg(feature = "influxdb-v3")]
impl FlightSqlDriver {
    /// 创建新的 FlightSqlDriver 实例
    pub fn new(config: ConnectionConfig) -> Result<Self> {
        let endpoint_url = if config.ssl {
            format!("https://{}:{}", config.host, config.port)
        } else {
            format!("http://{}:{}", config.host, config.port)
        };
        
        let v2_config = config.v2_config.clone()
            .ok_or_else(|| anyhow::anyhow!("缺少 InfluxDB 3.x 配置"))?;
        
        // 创建默认的 3.x 能力描述
        let capability = Capability::v3x("3.x".to_string(), true);
        
        info!("创建 InfluxDB 3.x FlightSQL 驱动: {}", endpoint_url);
        
        Ok(Self {
            client: std::sync::Arc::new(tokio::sync::Mutex::new(None)),
            config,
            capability,
            endpoint_url,
            token: v2_config.api_token,
        })
    }
    
    /// 获取或创建 FlightSQL 客户端
    async fn get_client(&self) -> Result<FlightSqlServiceClient<Channel>> {
        let mut client_guard = self.client.lock().await;

        if client_guard.is_none() {
            debug!("创建 FlightSQL 客户端连接");

            let endpoint = Endpoint::from_shared(self.endpoint_url.clone())?
                .timeout(Duration::from_secs(self.config.timeout as u64));

            let channel = endpoint.connect().await
                .map_err(|e| anyhow::anyhow!("连接 FlightSQL 服务失败: {}", e))?;

            let client = FlightSqlServiceClient::new(channel);
            *client_guard = Some(client);
            info!("FlightSQL 客户端连接成功");
        }

        Ok(client_guard.as_ref().unwrap().clone())
    }
    
    /// 执行 SQL 查询
    async fn execute_sql_query(&self, sql: &str) -> Result<DataSet> {
        debug!("执行 SQL 查询: {}", sql);

        let mut client = self.get_client().await?;
        
        // 创建查询命令
        let cmd = CommandStatementQuery {
            query: sql.to_string(),
            transaction_id: None,
        };
        
        let mut request = Request::new(FlightDescriptor::new_cmd(cmd.as_any().encode_to_vec()));
        request.metadata_mut().insert(
            "authorization",
            format!("Bearer {}", self.token).parse()?,
        );
        
        // 获取查询信息
        let flight_info = client.get_flight_info(request).await?
            .into_inner();
        
        // 执行查询并获取结果
        let mut all_rows = Vec::new();
        let mut columns = Vec::new();
        
        for endpoint in flight_info.endpoint {
            for ticket in endpoint.ticket {
                let mut ticket_request = Request::new(ticket);
                ticket_request.metadata_mut().insert(
                    "authorization",
                    format!("Bearer {}", self.token).parse()?,
                );
                
                let mut stream = client.do_get(ticket_request).await?
                    .into_inner();
                
                while let Some(batch_result) = stream.message().await? {
                    if let Some(batch) = batch_result.data {
                        // 解析 Arrow 批次数据
                        let record_batch = arrow::ipc::reader::StreamReader::try_new(
                            std::io::Cursor::new(batch.to_vec()),
                            None,
                        )?
                        .next()
                        .ok_or_else(|| anyhow::anyhow!("无法读取 Arrow 批次"))??;
                        
                        // 提取列名（只在第一次）
                        if columns.is_empty() {
                            columns = record_batch.schema()
                                .fields()
                                .iter()
                                .map(|field| field.name().clone())
                                .collect();
                        }
                        
                        // 转换数据行
                        for row_idx in 0..record_batch.num_rows() {
                            let mut row = Vec::new();
                            for col_idx in 0..record_batch.num_columns() {
                                let column = record_batch.column(col_idx);
                                let value = self.arrow_value_to_json(column, row_idx)?;
                                row.push(value);
                            }
                            all_rows.push(row);
                        }
                    }
                }
            }
        }
        
        Ok(DataSet::new(columns, all_rows))
    }
    
    /// 将 Arrow 值转换为 JSON 值
    fn arrow_value_to_json(&self, column: &dyn arrow::array::Array, row_idx: usize) -> Result<serde_json::Value> {
        use arrow::array::*;
        use arrow::datatypes::DataType;
        
        if column.is_null(row_idx) {
            return Ok(serde_json::Value::Null);
        }
        
        match column.data_type() {
            DataType::Boolean => {
                let array = column.as_any().downcast_ref::<BooleanArray>()
                    .ok_or_else(|| anyhow::anyhow!("类型转换失败: Boolean"))?;
                Ok(serde_json::Value::Bool(array.value(row_idx)))
            }
            DataType::Int32 => {
                let array = column.as_any().downcast_ref::<Int32Array>()
                    .ok_or_else(|| anyhow::anyhow!("类型转换失败: Int32"))?;
                Ok(serde_json::Value::Number(serde_json::Number::from(array.value(row_idx))))
            }
            DataType::Int64 => {
                let array = column.as_any().downcast_ref::<Int64Array>()
                    .ok_or_else(|| anyhow::anyhow!("类型转换失败: Int64"))?;
                Ok(serde_json::Value::Number(serde_json::Number::from(array.value(row_idx))))
            }
            DataType::Float32 => {
                let array = column.as_any().downcast_ref::<Float32Array>()
                    .ok_or_else(|| anyhow::anyhow!("类型转换失败: Float32"))?;
                let value = array.value(row_idx);
                Ok(serde_json::Value::Number(
                    serde_json::Number::from_f64(value as f64)
                        .unwrap_or_else(|| serde_json::Number::from(0))
                ))
            }
            DataType::Float64 => {
                let array = column.as_any().downcast_ref::<Float64Array>()
                    .ok_or_else(|| anyhow::anyhow!("类型转换失败: Float64"))?;
                let value = array.value(row_idx);
                Ok(serde_json::Value::Number(
                    serde_json::Number::from_f64(value)
                        .unwrap_or_else(|| serde_json::Number::from(0))
                ))
            }
            DataType::Utf8 => {
                let array = column.as_any().downcast_ref::<StringArray>()
                    .ok_or_else(|| anyhow::anyhow!("类型转换失败: Utf8"))?;
                Ok(serde_json::Value::String(array.value(row_idx).to_string()))
            }
            DataType::Timestamp(_, _) => {
                let array = column.as_any().downcast_ref::<TimestampNanosecondArray>()
                    .ok_or_else(|| anyhow::anyhow!("类型转换失败: Timestamp"))?;
                Ok(serde_json::Value::Number(serde_json::Number::from(array.value(row_idx))))
            }
            _ => {
                warn!("不支持的 Arrow 数据类型: {:?}", column.data_type());
                Ok(serde_json::Value::String(format!("unsupported_type_{}", row_idx)))
            }
        }
    }
    
    /// 执行写入操作（通过 HTTP API）
    async fn write_via_http(&self, line_protocol: &str, bucket: &BucketInfo) -> Result<()> {
        debug!("通过 HTTP API 写入数据");
        
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(self.config.timeout as u64))
            .danger_accept_invalid_certs(!self.config.ssl)
            .build()?;
        
        let write_url = format!("{}/api/v3/write", self.endpoint_url);
        
        let request = client
            .post(&write_url)
            .bearer_auth(&self.token)
            .header("Content-Type", "text/plain; charset=utf-8")
            .query(&[("bucket", &bucket.name)])
            .body(line_protocol.to_string());
        
        let response = request.send().await
            .map_err(|e| anyhow::anyhow!("写入请求失败: {}", e))?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("写入失败 ({}): {}", status, error_text));
        }
        
        info!("数据写入成功");
        Ok(())
    }
}

#[cfg(feature = "influxdb-v3")]
#[async_trait]
impl InfluxDriver for FlightSqlDriver {
    async fn write(&self, line_protocol: &str, bucket: &BucketInfo) -> Result<()> {
        // InfluxDB 3.x 的写入通常通过 HTTP API 而不是 FlightSQL
        self.write_via_http(line_protocol, bucket).await
    }
    
    async fn query(&self, query: &Query) -> Result<DataSet> {
        debug!("执行查询: {}", query.text);
        
        let start_time = Instant::now();
        
        let dataset = match query.language {
            QueryLanguage::Sql => {
                self.execute_sql_query(&query.text).await?
            }
            QueryLanguage::InfluxQL => {
                // 通过 FlightSQL ticket 指定语言为 InfluxQL
                // 这里需要根据具体的 InfluxDB 3.x 实现来调整
                warn!("InfluxQL 通过 FlightSQL 的支持可能因版本而异");
                self.execute_sql_query(&query.text).await?
            }
            QueryLanguage::Flux => {
                return Err(anyhow::anyhow!("InfluxDB 3.x 不支持 Flux 查询语言"));
            }
        };
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        let mut result = dataset;
        result.execution_time = Some(execution_time);
        
        info!("查询执行完成，耗时: {}ms，返回 {} 行", execution_time, result.row_count);
        Ok(result)
    }
    
    async fn health(&self) -> Result<Health> {
        InfluxDetector::get_health(&self.config, &self.capability).await
    }
    
    fn capabilities(&self) -> &Capability {
        &self.capability
    }
    
    async fn test_connection(&self) -> Result<u64> {
        let start_time = Instant::now();

        // 尝试执行一个简单的查询来测试连接
        let test_query = Query::new(QueryLanguage::Sql, "SELECT 1".to_string());
        self.query(&test_query).await?;

        let latency = start_time.elapsed().as_millis() as u64;
        info!("连接测试成功，延迟: {}ms", latency);
        Ok(latency)
    }

    async fn close(&self) -> Result<()> {
        let mut client_guard = self.client.lock().await;
        if let Some(_client) = client_guard.take() {
            info!("InfluxDB 3.x FlightSQL 驱动已关闭");
        }
        Ok(())
    }
    
    async fn list_databases(&self) -> Result<Vec<String>> {
        debug!("获取数据库列表");

        let query = Query::new(QueryLanguage::Sql, "SHOW DATABASES".to_string());
        let dataset = self.query(&query).await?;

        let databases = dataset.rows
            .iter()
            .filter_map(|row| row.get(0)?.as_str().map(|s| s.to_string()))
            .collect();

        Ok(databases)
    }

    async fn list_measurements(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取表列表: {}", database);

        let query = Query::new(
            QueryLanguage::Sql,
            format!("SHOW TABLES FROM \"{}\"", database),
        );

        let dataset = self.query(&query).await?;

        let measurements = dataset.rows
            .iter()
            .filter_map(|row| row.get(0)?.as_str().map(|s| s.to_string()))
            .collect();

        Ok(measurements)
    }
    
    async fn describe_measurement(&self, database: &str, measurement: &str) -> Result<MeasurementSchema> {
        debug!("描述表: {}.{}", database, measurement);

        let query = Query::new(
            QueryLanguage::Sql,
            format!("DESCRIBE \"{}\".\"{}\"", database, measurement),
        );

        let dataset = self.query(&query).await?;

        let fields: Vec<FieldSchema> = dataset.rows
            .iter()
            .filter_map(|row| {
                let name = row.get(0)?.as_str()?.to_string();
                let type_str = row.get(1)?.as_str().unwrap_or("unknown");
                Some(FieldSchema {
                    name,
                    field_type: FieldType::from_str(type_str),
                })
            })
            .collect();

        // InfluxDB 3.x 中标签和字段的区分可能不同
        let tags = Vec::new(); // 需要根据实际情况实现

        Ok(MeasurementSchema {
            name: measurement.to_string(),
            fields,
            tags,
        })
    }

    async fn create_database(&self, name: &str) -> Result<()> {
        debug!("创建数据库: {}", name);

        let query = Query::new(
            QueryLanguage::Sql,
            format!("CREATE DATABASE \"{}\"", name),
        );

        self.query(&query).await?;
        info!("数据库创建成功: {}", name);
        Ok(())
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        debug!("删除数据库: {}", name);

        let query = Query::new(
            QueryLanguage::Sql,
            format!("DROP DATABASE \"{}\"", name),
        );

        self.query(&query).await?;
        info!("数据库删除成功: {}", name);
        Ok(())
    }
    
    async fn list_retention_policies(&self, _database: &str) -> Result<Vec<RetentionPolicyInfo>> {
        // InfluxDB 3.x 不再使用传统的保留策略概念
        warn!("InfluxDB 3.x 不支持传统的保留策略");
        Ok(vec![])
    }

    async fn create_retention_policy(&self, _database: &str, _policy: &RetentionPolicyConfig) -> Result<()> {
        Err(anyhow::anyhow!("InfluxDB 3.x 不支持传统的保留策略"))
    }

    async fn drop_retention_policy(&self, _database: &str, _policy_name: &str) -> Result<()> {
        Err(anyhow::anyhow!("InfluxDB 3.x 不支持传统的保留策略"))
    }
}

// 为了避免编译错误，在没有 influxdb-v3 特性时提供一个空实现
#[cfg(not(feature = "influxdb-v3"))]
pub struct FlightSqlDriver;

#[cfg(not(feature = "influxdb-v3"))]
impl FlightSqlDriver {
    pub fn new(_config: crate::models::ConnectionConfig) -> Result<Self> {
        Err(anyhow::anyhow!("InfluxDB 3.x FlightSQL 支持未启用，请使用 --features influxdb-v3 编译"))
    }
}
