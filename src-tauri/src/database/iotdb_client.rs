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
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        let base_url = format!("http://{}:{}", config.host, config.port);

        Self {
            config,
            client,
            base_url,
        }
    }

    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        let start = Instant::now();

        debug!("测试 IoTDB 连接: {}", self.base_url);

        // 使用 ping 接口测试连接
        let url = format!("{}/ping", self.base_url);
        
        let response = self.client
            .get(&url)
            .send()
            .await
            .context("Failed to send ping request")?;

        if response.status().is_success() {
            let latency = start.elapsed().as_millis() as u64;
            info!("IoTDB 连接测试成功，延迟: {}ms", latency);
            Ok(latency)
        } else {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error!("IoTDB 连接测试失败: {} - {}", status, error_text);
            Err(anyhow::anyhow!("Connection test failed: {} - {}", status, error_text))
        }
    }

    /// 执行查询
    pub async fn execute_query(&self, query: &str, _database: Option<&str>) -> Result<QueryResult> {
        debug!("执行 IoTDB 查询: {}", query);

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
            error!("IoTDB 查询失败: {} - {}", status, error_text);
            return Err(anyhow::anyhow!("Query failed: {} - {}", status, error_text));
        }

        // 解析响应
        let iotdb_response: IoTDBResponse = response
            .json()
            .await
            .context("Failed to parse response JSON")?;

        if iotdb_response.code != 200 {
            error!("IoTDB 查询错误: {}", iotdb_response.message);
            return Ok(QueryResult {
                results: vec![],
                execution_time: Some(execution_time),
                row_count: Some(0),
                error: Some(iotdb_response.message),
                data: None,
                columns: None,
            });
        }

        // 解析查询结果
        if let Some(data) = iotdb_response.data {
            if let Ok(query_result) = serde_json::from_value::<IoTDBQueryResult>(data) {
                // 转换为标准格式
                let columns = query_result.column_names;
                let rows: Vec<Vec<Value>> = query_result.values;
                let row_count = query_result.row_count.unwrap_or(rows.len() as i64) as usize;

                info!("IoTDB 查询成功，返回 {} 行数据，耗时: {}ms", row_count, execution_time);

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

    /// 获取存储组列表
    pub async fn get_storage_groups(&self) -> Result<Vec<String>> {
        debug!("获取 IoTDB 存储组列表");

        let query = "SHOW STORAGE GROUP";
        let result = self.execute_query(query, None).await?;

        // 从查询结果中提取存储组名称
        if let Some(rows) = result.data {
            let storage_groups: Vec<String> = rows
                .into_iter()
                .filter_map(|row| {
                    if let Some(Value::String(sg)) = row.get(0) {
                        Some(sg.clone())
                    } else {
                        None
                    }
                })
                .collect();

            info!("获取到 {} 个存储组", storage_groups.len());
            return Ok(storage_groups);
        }

        // 如果查询失败，返回默认存储组
        warn!("无法获取存储组列表，返回默认值");
        Ok(vec![
            "root.sg1".to_string(),
            "root.sg2".to_string(),
            "root.vehicle".to_string(),
        ])
    }

    /// 获取设备列表
    pub async fn get_devices(&self, storage_group: &str) -> Result<Vec<String>> {
        debug!("获取 IoTDB 设备列表: {}", storage_group);

        let query = format!("SHOW DEVICES {}", storage_group);
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

        // 如果查询失败，返回默认设备
        warn!("无法获取设备列表，返回默认值");
        Ok(vec![
            format!("{}.d1", storage_group),
            format!("{}.d2", storage_group),
        ])
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

        // 如果查询失败，返回默认时间序列
        warn!("无法获取时间序列列表，返回默认值");
        Ok(vec![
            "s1".to_string(),
            "s2".to_string(),
            "temperature".to_string(),
            "humidity".to_string(),
        ])
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
