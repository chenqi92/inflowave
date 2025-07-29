/**
 * InfluxDB 1.x HTTP 驱动实现
 * 
 * 使用 HTTP API 与 InfluxDB 1.x 进行交互
 */

#[cfg(feature = "influxdb-v1")]
use super::{
    capability::{Capability, Query, DataSet, BucketInfo, Health, QueryLanguage},
    driver::{
        InfluxDriver, MeasurementSchema, FieldSchema, TagSchema, FieldType,
        RetentionPolicyInfo, RetentionPolicyConfig, DriverError, DriverResult,
    },
    detector::InfluxDetector,
};
use crate::models::ConnectionConfig;
use anyhow::Result;
use async_trait::async_trait;
use log::{debug, info};
use reqwest::Client;
use serde_json::Value;
use std::time::{Duration, Instant};

/// InfluxDB 1.x HTTP 驱动
#[cfg(feature = "influxdb-v1")]
pub struct V1HttpDriver {
    client: Client,
    config: ConnectionConfig,
    capability: Capability,
    base_url: String,
}

#[cfg(feature = "influxdb-v1")]
impl V1HttpDriver {
    /// 创建新的 V1HttpDriver 实例
    pub fn new(config: ConnectionConfig) -> Result<Self> {
        let base_url = if config.ssl {
            format!("https://{}:{}", config.host, config.port)
        } else {
            format!("http://{}:{}", config.host, config.port)
        };
        
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout as u64))
            .danger_accept_invalid_certs(!config.ssl)
            .build()?;
        
        // 创建默认的 1.x 能力描述
        let capability = Capability::v1x("1.x".to_string());
        
        info!("创建 InfluxDB 1.x 驱动: {}", base_url);
        
        Ok(Self {
            client,
            config,
            capability,
            base_url,
        })
    }
    
    /// 构建认证请求
    fn build_authenticated_request(&self, url: &str) -> reqwest::RequestBuilder {
        let mut request = self.client.get(url);
        
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            request = request.basic_auth(username, Some(password));
        }
        
        request
    }
    
    /// 构建查询 URL
    fn build_query_url(&self, query: &str, database: Option<&str>) -> String {
        let mut url = format!("{}/query", self.base_url);
        let mut params = vec![("q", query)];
        
        if let Some(db) = database {
            params.push(("db", db));
        }
        
        if !params.is_empty() {
            url.push('?');
            url.push_str(&params
                .iter()
                .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
                .collect::<Vec<_>>()
                .join("&"));
        }
        
        url
    }
    
    /// 构建写入 URL
    fn build_write_url(&self, database: &str, retention_policy: Option<&str>) -> String {
        let mut url = format!("{}/write", self.base_url);
        let mut params = vec![("db", database)];
        
        if let Some(rp) = retention_policy {
            params.push(("rp", rp));
        }
        
        url.push('?');
        url.push_str(&params
            .iter()
            .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
            .collect::<Vec<_>>()
            .join("&"));
        
        url
    }
    
    /// 解析查询结果
    fn parse_query_result(&self, json: Value) -> DriverResult<DataSet> {
        let results = json["results"].as_array()
            .ok_or_else(|| DriverError::Query("响应格式错误：缺少 results 字段".to_string()))?;
        
        if results.is_empty() {
            return Ok(DataSet::empty());
        }
        
        let first_result = &results[0];
        
        // 检查错误
        if let Some(error) = first_result["error"].as_str() {
            return Err(DriverError::Query(error.to_string()));
        }
        
        // 解析系列数据
        let series = first_result["series"].as_array();
        
        if let Some(series_array) = series {
            if series_array.is_empty() {
                return Ok(DataSet::empty());
            }
            
            let first_series = &series_array[0];
            let columns = first_series["columns"].as_array()
                .ok_or_else(|| DriverError::Query("缺少 columns 字段".to_string()))?
                .iter()
                .map(|v| v.as_str().unwrap_or("").to_string())
                .collect();
            
            let values = first_series["values"].as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|row| {
                    row.as_array()
                        .unwrap_or(&vec![])
                        .iter()
                        .cloned()
                        .collect()
                })
                .collect();
            
            Ok(DataSet::new(columns, values))
        } else {
            Ok(DataSet::empty())
        }
    }
}

#[cfg(feature = "influxdb-v1")]
#[async_trait]
impl InfluxDriver for V1HttpDriver {
    async fn write(&self, line_protocol: &str, bucket: &BucketInfo) -> Result<()> {
        debug!("写入数据到 InfluxDB 1.x: {}", bucket.name);
        
        let url = self.build_write_url(&bucket.name, bucket.retention_policy.as_deref());
        
        let mut request = self.client.post(&url)
            .header("Content-Type", "application/octet-stream")
            .body(line_protocol.to_string());
        
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            request = request.basic_auth(username, Some(password));
        }
        
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
    
    async fn query(&self, query: &Query) -> Result<DataSet> {
        debug!("执行查询: {}", query.text);
        
        // 1.x 只支持 InfluxQL
        if query.language != QueryLanguage::InfluxQL {
            return Err(anyhow::anyhow!("InfluxDB 1.x 只支持 InfluxQL 查询语言"));
        }
        
        let start_time = Instant::now();
        let url = self.build_query_url(&query.text, query.database.as_deref());
        
        let request = self.build_authenticated_request(&url);
        let response = request.send().await
            .map_err(|e| anyhow::anyhow!("查询请求失败: {}", e))?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("查询失败 ({}): {}", status, error_text));
        }
        
        let json: Value = response.json().await
            .map_err(|e| anyhow::anyhow!("解析响应失败: {}", e))?;
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        let mut dataset = self.parse_query_result(json)
            .map_err(|e| anyhow::anyhow!("解析查询结果失败: {}", e))?;
        
        dataset.execution_time = Some(execution_time);
        
        info!("查询执行完成，耗时: {}ms，返回 {} 行", execution_time, dataset.row_count);
        Ok(dataset)
    }
    
    async fn health(&self) -> Result<Health> {
        InfluxDetector::get_health(&self.config, &self.capability).await
    }
    
    fn capabilities(&self) -> &Capability {
        &self.capability
    }
    
    async fn test_connection(&self) -> Result<u64> {
        let start_time = Instant::now();
        
        let url = format!("{}/ping", self.base_url);
        let request = self.build_authenticated_request(&url);
        let response = request.send().await?;
        
        if response.status().is_success() {
            let latency = start_time.elapsed().as_millis() as u64;
            info!("连接测试成功，延迟: {}ms", latency);
            Ok(latency)
        } else {
            let status = response.status();
            Err(anyhow::anyhow!("连接测试失败: {}", status))
        }
    }
    
    async fn close(&self) -> Result<()> {
        // HTTP 客户端无需显式关闭
        info!("InfluxDB 1.x 驱动已关闭");
        Ok(())
    }
    
    async fn list_databases(&self) -> Result<Vec<String>> {
        debug!("获取数据库列表");
        
        let query = Query::new(QueryLanguage::InfluxQL, "SHOW DATABASES".to_string());
        let dataset = self.query(&query).await?;
        
        let databases = dataset.rows
            .iter()
            .filter_map(|row| row.get(0)?.as_str().map(|s| s.to_string()))
            .collect();
        
        Ok(databases)
    }
    
    async fn list_measurements(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取测量列表: {}", database);
        
        let query = Query::new(
            QueryLanguage::InfluxQL,
            "SHOW MEASUREMENTS".to_string(),
        ).with_database(database.to_string());
        
        let dataset = self.query(&query).await?;
        
        let measurements = dataset.rows
            .iter()
            .filter_map(|row| row.get(0)?.as_str().map(|s| s.to_string()))
            .collect();
        
        Ok(measurements)
    }
    
    async fn describe_measurement(&self, database: &str, measurement: &str) -> Result<MeasurementSchema> {
        debug!("描述测量: {}.{}", database, measurement);
        
        // 获取字段信息
        let field_query = Query::new(
            QueryLanguage::InfluxQL,
            format!("SHOW FIELD KEYS FROM \"{}\"", measurement),
        ).with_database(database.to_string());
        
        let field_dataset = self.query(&field_query).await?;
        let fields: Vec<FieldSchema> = field_dataset.rows
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
        
        // 获取标签信息
        let tag_query = Query::new(
            QueryLanguage::InfluxQL,
            format!("SHOW TAG KEYS FROM \"{}\"", measurement),
        ).with_database(database.to_string());
        
        let tag_dataset = self.query(&tag_query).await?;
        let mut tags = Vec::new();
        
        for row in &tag_dataset.rows {
            if let Some(tag_name) = row.get(0).and_then(|v| v.as_str()) {
                // 获取标签值
                let tag_values_query = Query::new(
                    QueryLanguage::InfluxQL,
                    format!("SHOW TAG VALUES FROM \"{}\" WITH KEY = \"{}\"", measurement, tag_name),
                ).with_database(database.to_string());
                
                let values_dataset = self.query(&tag_values_query).await.unwrap_or_else(|_| DataSet::empty());
                let values: Vec<String> = values_dataset.rows
                    .iter()
                    .filter_map(|row| row.get(1)?.as_str().map(|s| s.to_string()))
                    .collect();
                
                tags.push(TagSchema {
                    name: tag_name.to_string(),
                    values,
                });
            }
        }
        
        Ok(MeasurementSchema {
            name: measurement.to_string(),
            fields,
            tags,
        })
    }
    
    async fn create_database(&self, name: &str) -> Result<()> {
        debug!("创建数据库: {}", name);
        
        let query = Query::new(
            QueryLanguage::InfluxQL,
            format!("CREATE DATABASE \"{}\"", name),
        );
        
        self.query(&query).await?;
        info!("数据库创建成功: {}", name);
        Ok(())
    }
    
    async fn drop_database(&self, name: &str) -> Result<()> {
        debug!("删除数据库: {}", name);
        
        let query = Query::new(
            QueryLanguage::InfluxQL,
            format!("DROP DATABASE \"{}\"", name),
        );
        
        self.query(&query).await?;
        info!("数据库删除成功: {}", name);
        Ok(())
    }
    
    async fn list_retention_policies(&self, database: &str) -> Result<Vec<RetentionPolicyInfo>> {
        debug!("获取保留策略列表: {}", database);
        
        let query = Query::new(
            QueryLanguage::InfluxQL,
            format!("SHOW RETENTION POLICIES ON \"{}\"", database),
        );
        
        let dataset = self.query(&query).await?;
        
        let policies = dataset.rows
            .iter()
            .filter_map(|row| {
                Some(RetentionPolicyInfo {
                    name: row.get(0)?.as_str()?.to_string(),
                    duration: row.get(1)?.as_str()?.to_string(),
                    shard_group_duration: row.get(2)?.as_str()?.to_string(),
                    replica_n: row.get(3)?.as_u64()? as u32,
                    default: row.get(4)?.as_bool().unwrap_or(false),
                })
            })
            .collect();
        
        Ok(policies)
    }
    
    async fn create_retention_policy(&self, database: &str, policy: &RetentionPolicyConfig) -> Result<()> {
        debug!("创建保留策略: {}.{}", database, policy.name);
        
        let mut query_str = format!(
            "CREATE RETENTION POLICY \"{}\" ON \"{}\" DURATION {}",
            policy.name, database, policy.duration
        );
        
        if let Some(shard_duration) = &policy.shard_group_duration {
            query_str.push_str(&format!(" SHARD DURATION {}", shard_duration));
        }
        
        if let Some(replica_n) = policy.replica_n {
            query_str.push_str(&format!(" REPLICATION {}", replica_n));
        }
        
        if policy.default.unwrap_or(false) {
            query_str.push_str(" DEFAULT");
        }
        
        let query = Query::new(QueryLanguage::InfluxQL, query_str);
        self.query(&query).await?;
        
        info!("保留策略创建成功: {}.{}", database, policy.name);
        Ok(())
    }
    
    async fn drop_retention_policy(&self, database: &str, policy_name: &str) -> Result<()> {
        debug!("删除保留策略: {}.{}", database, policy_name);
        
        let query = Query::new(
            QueryLanguage::InfluxQL,
            format!("DROP RETENTION POLICY \"{}\" ON \"{}\"", policy_name, database),
        );
        
        self.query(&query).await?;
        info!("保留策略删除成功: {}.{}", database, policy_name);
        Ok(())
    }
}
