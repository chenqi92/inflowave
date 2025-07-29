/**
 * IoTDB REST API V2 驱动实现
 * 
 * 支持 IoTDB 1.2+ 的 REST API V2 协议
 */

use anyhow::{Context, Result};
use async_trait::async_trait;
use log::{debug, error, info, warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

use crate::database::iotdb::{
    capability::Capability,
    driver::{DriverConfig, IoTDBDriver, QueryRequest, QueryResponse, Tablet, ColumnInfo},
    types::{DataValue, IoTDBDataType, TypeMapper},
    dialect::{QueryBuilder, SqlDialect},
};

/// REST API 查询请求
#[derive(Debug, Serialize)]
struct RestQueryRequest {
    sql: String,
    #[serde(rename = "rowLimit", skip_serializing_if = "Option::is_none")]
    row_limit: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    database: Option<String>,
}

/// REST API 查询响应
#[derive(Debug, Deserialize)]
struct RestQueryResponse {
    code: i32,
    message: String,
    #[serde(default)]
    data: RestQueryData,
}

/// REST API 查询数据
#[derive(Debug, Default, Deserialize)]
struct RestQueryData {
    #[serde(default)]
    columns: Vec<String>,
    #[serde(default)]
    values: Vec<Vec<serde_json::Value>>,
    #[serde(rename = "columnTypes", default)]
    column_types: Vec<String>,
}

/// REST V2 驱动实现
#[derive(Debug)]
pub struct RestV2Driver {
    config: DriverConfig,
    capability: Capability,
    client: Client,
    base_url: String,
    connected: bool,
    type_mapper: TypeMapper,
    query_builder: QueryBuilder,
}

impl RestV2Driver {
    /// 创建新的 REST V2 驱动
    pub async fn new(config: DriverConfig, capability: Capability) -> Result<Self> {
        let client = Client::builder()
            .timeout(config.timeout)
            .build()
            .context("创建 HTTP 客户端失败")?;
        
        // 确定 REST API 端口
        let rest_port = capability.connection_info.available_ports
            .get("rest")
            .copied()
            .unwrap_or(18080);
        
        let protocol = if config.ssl { "https" } else { "http" };
        let base_url = format!("{}://{}:{}/rest/v2", protocol, config.host, rest_port);
        
        let type_mapper = TypeMapper::new(&capability.server.version);
        let dialect = if capability.server.table_model {
            SqlDialect::Table
        } else {
            SqlDialect::Tree
        };
        let query_builder = QueryBuilder::new(dialect);
        
        Ok(Self {
            config,
            capability,
            client,
            base_url,
            connected: false,
            type_mapper,
            query_builder,
        })
    }
    
    /// 测试 REST API 连接
    async fn test_rest_connection(&self) -> Result<()> {
        let url = format!("{}/ping", self.base_url);
        
        let mut request = self.client.get(&url);
        
        // 添加认证信息
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            request = request.basic_auth(username, Some(password));
        }
        
        let response = request.send().await
            .context("REST API 连接测试失败")?;
        
        if response.status().is_success() {
            info!("REST API 连接测试成功");
            Ok(())
        } else {
            Err(anyhow::anyhow!("REST API 连接测试失败: {}", response.status()))
        }
    }
    
    /// 执行 REST 查询
    async fn execute_rest_query(&self, sql: &str) -> Result<QueryResponse> {
        let url = format!("{}/query", self.base_url);
        
        let request_body = RestQueryRequest {
            sql: sql.to_string(),
            row_limit: None,
            database: None,
        };
        
        let start_time = Instant::now();
        debug!("执行 REST 查询: {}", sql);
        
        let mut request = self.client.post(&url)
            .json(&request_body);
        
        // 添加认证信息
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            request = request.basic_auth(username, Some(password));
        }
        
        let response = request.send().await
            .context("REST 查询请求失败")?;
        
        let rest_response: RestQueryResponse = response.json().await
            .context("解析 REST 响应失败")?;
        
        if rest_response.code != 200 {
            return Err(anyhow::anyhow!("REST 查询失败: {}", rest_response.message));
        }
        
        let execution_time = start_time.elapsed();
        
        // 转换响应数据
        self.convert_rest_response(rest_response.data, execution_time)
    }
    
    /// 转换 REST 响应为标准格式
    fn convert_rest_response(
        &self,
        data: RestQueryData,
        execution_time: Duration,
    ) -> Result<QueryResponse> {
        let mut columns = Vec::new();
        
        // 处理列信息
        for (i, column_name) in data.columns.iter().enumerate() {
            let data_type = if let Some(type_str) = data.column_types.get(i) {
                self.parse_column_type(type_str)?
            } else {
                IoTDBDataType::Text // 默认类型
            };
            
            columns.push(ColumnInfo {
                name: column_name.clone(),
                data_type,
                nullable: true,
            });
        }
        
        // 处理行数据
        let mut rows = Vec::new();
        for row_values in data.values {
            let mut row = Vec::new();
            for (i, json_value) in row_values.iter().enumerate() {
                let data_type = columns.get(i)
                    .map(|c| &c.data_type)
                    .unwrap_or(&IoTDBDataType::Text);
                
                let data_value = self.convert_json_value(json_value, data_type)?;
                row.push(data_value);
            }
            rows.push(row);
        }
        
        Ok(QueryResponse {
            columns,
            rows,
            execution_time,
            affected_rows: None,
            warnings: vec![],
        })
    }
    
    /// 解析列类型
    fn parse_column_type(&self, type_str: &str) -> Result<IoTDBDataType> {
        match type_str.to_uppercase().as_str() {
            "INT32" => Ok(IoTDBDataType::Int32),
            "INT64" => Ok(IoTDBDataType::Int64),
            "FLOAT" => Ok(IoTDBDataType::Float),
            "DOUBLE" => Ok(IoTDBDataType::Double),
            "BOOLEAN" => Ok(IoTDBDataType::Boolean),
            "TEXT" => Ok(IoTDBDataType::Text),
            "STRING" => Ok(IoTDBDataType::String),
            "BLOB" => Ok(IoTDBDataType::Blob),
            "DATE" => Ok(IoTDBDataType::Date),
            "TIMESTAMP" => Ok(IoTDBDataType::Timestamp),
            _ => {
                warn!("未知的列类型: {}, 使用 TEXT 作为默认类型", type_str);
                Ok(IoTDBDataType::Text)
            }
        }
    }
    
    /// 转换 JSON 值为数据值
    fn convert_json_value(
        &self,
        json_value: &serde_json::Value,
        data_type: &IoTDBDataType,
    ) -> Result<DataValue> {
        if json_value.is_null() {
            return Ok(DataValue::Null);
        }
        
        match data_type {
            IoTDBDataType::Int32 => {
                if let Some(n) = json_value.as_i64() {
                    Ok(DataValue::Int32(n as i32))
                } else {
                    Err(anyhow::anyhow!("无法转换为 Int32: {:?}", json_value))
                }
            }
            IoTDBDataType::Int64 => {
                if let Some(n) = json_value.as_i64() {
                    Ok(DataValue::Int64(n))
                } else {
                    Err(anyhow::anyhow!("无法转换为 Int64: {:?}", json_value))
                }
            }
            IoTDBDataType::Float => {
                if let Some(n) = json_value.as_f64() {
                    Ok(DataValue::Float(n as f32))
                } else {
                    Err(anyhow::anyhow!("无法转换为 Float: {:?}", json_value))
                }
            }
            IoTDBDataType::Double => {
                if let Some(n) = json_value.as_f64() {
                    Ok(DataValue::Double(n))
                } else {
                    Err(anyhow::anyhow!("无法转换为 Double: {:?}", json_value))
                }
            }
            IoTDBDataType::Boolean => {
                if let Some(b) = json_value.as_bool() {
                    Ok(DataValue::Boolean(b))
                } else {
                    Err(anyhow::anyhow!("无法转换为 Boolean: {:?}", json_value))
                }
            }
            IoTDBDataType::Text | IoTDBDataType::String => {
                if let Some(s) = json_value.as_str() {
                    Ok(DataValue::Text(s.to_string()))
                } else {
                    Ok(DataValue::Text(json_value.to_string()))
                }
            }
            IoTDBDataType::Timestamp => {
                if let Some(n) = json_value.as_i64() {
                    Ok(DataValue::Timestamp(n))
                } else {
                    Err(anyhow::anyhow!("无法转换为 Timestamp: {:?}", json_value))
                }
            }
            _ => {
                // 对于其他类型，转换为文本
                Ok(DataValue::Text(json_value.to_string()))
            }
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
impl IoTDBDriver for RestV2Driver {
    async fn connect(&mut self) -> Result<()> {
        self.test_rest_connection().await?;
        self.connected = true;
        info!("REST V2 驱动连接成功");
        Ok(())
    }
    
    async fn disconnect(&mut self) -> Result<()> {
        self.connected = false;
        info!("REST V2 驱动已断开连接");
        Ok(())
    }
    
    async fn query(&mut self, request: QueryRequest) -> Result<QueryResponse> {
        if !self.connected {
            return Err(anyhow::anyhow!("未连接到 IoTDB 服务器"));
        }
        
        // 使用查询构建器处理 SQL 方言
        let processed_sql = self.query_builder.process_query(&request.sql)?;
        
        let mut response = self.execute_rest_query(&processed_sql).await?;
        
        // 处理类型兼容性
        self.handle_type_compatibility(&mut response);
        
        Ok(response)
    }
    
    async fn execute(&mut self, sql: &str) -> Result<usize> {
        let processed_sql = self.query_builder.process_query(sql)?;
        let response = self.execute_rest_query(&processed_sql).await?;
        Ok(response.affected_rows.unwrap_or(0))
    }
    
    async fn write_tablet(&mut self, tablet: &Tablet) -> Result<()> {
        // 实现 REST API 的 Tablet 写入
        // REST V2 API 支持 insertTablet 接口

        if !self.connected {
            return Err(anyhow::anyhow!("未连接到 IoTDB 服务器"));
        }

        debug!("通过 REST V2 API 写入 Tablet 数据: {}", tablet.device_id);

        // 构建 insertTablet 请求
        let tablet_data = serde_json::json!({
            "deviceId": tablet.device_id,
            "measurements": tablet.measurements,
            "dataTypes": tablet.data_types.iter().map(|dt| format!("{:?}", dt)).collect::<Vec<_>>(),
            "timestamps": tablet.timestamps,
            "values": tablet.values,
            "isAligned": false // Tablet 结构体没有 is_aligned 字段，使用默认值
        });

        let url = format!("{}/rest/v2/insertTablet", self.base_url);
        let client = reqwest::Client::new();

        match client
            .post(&url)
            .json(&tablet_data)
            .send()
            .await
        {
            Ok(response) => {
                if response.status().is_success() {
                    info!("REST V2 Tablet 数据写入成功: {} 行数据", tablet.timestamps.len());
                    Ok(())
                } else {
                    let error_text = response.text().await.unwrap_or_default();
                    Err(anyhow::anyhow!("Tablet 写入失败: {}", error_text))
                }
            },
            Err(e) => {
                error!("REST V2 Tablet 写入请求失败: {}", e);
                Err(anyhow::anyhow!("网络请求失败: {}", e))
            }
        }
    }
    
    async fn test_connection(&mut self) -> Result<Duration> {
        let start_time = Instant::now();
        self.test_rest_connection().await?;
        Ok(start_time.elapsed())
    }
    
    fn capabilities(&self) -> &Capability {
        &self.capability
    }
    
    fn is_connected(&self) -> bool {
        self.connected
    }
    
    fn driver_type(&self) -> &str {
        "rest_v2"
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
            supported_protocols: vec!["rest".to_string()],
            extra_properties: HashMap::new(),
        };
        
        let mut available_ports = HashMap::new();
        available_ports.insert("rest".to_string(), 18080);
        
        let connection_info = ConnectionInfo {
            host: "localhost".to_string(),
            port: 6667,
            ssl: false,
            available_ports,
        };
        
        Capability {
            server,
            connection_info,
        }
    }
    
    #[tokio::test]
    async fn test_rest_v2_driver_creation() {
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
        let driver = RestV2Driver::new(config, capability).await;
        assert!(driver.is_ok());
    }
}
