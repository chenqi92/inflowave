/**
 * InfluxDB 2.x HTTP 驱动实现
 * 
 * 使用 HTTP API 与 InfluxDB 2.x 进行交互，支持 Flux 和 InfluxQL
 */

#[cfg(feature = "influxdb-v2")]
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
use log::{debug, info, warn};
use reqwest::Client;
use serde_json::{json, Value};
use std::time::{Duration, Instant};

/// InfluxDB 2.x HTTP 驱动
#[cfg(feature = "influxdb-v2")]
pub struct V2HttpDriver {
    client: Client,
    config: ConnectionConfig,
    capability: Capability,
    base_url: String,
    token: String,
    organization: String,
}

#[cfg(feature = "influxdb-v2")]
impl V2HttpDriver {
    /// 创建新的 V2HttpDriver 实例
    pub fn new(config: ConnectionConfig) -> Result<Self> {
        let base_url = if config.ssl {
            format!("https://{}:{}", config.host, config.port)
        } else {
            format!("http://{}:{}", config.host, config.port)
        };
        
        let v2_config = config.v2_config.clone()
            .ok_or_else(|| anyhow::anyhow!("缺少 InfluxDB 2.x 配置"))?;
        
        let client = Client::builder()
            .timeout(Duration::from_secs(config.timeout as u64))
            .danger_accept_invalid_certs(!config.ssl)
            .build()?;
        
        // 创建默认的 2.x 能力描述
        let capability = Capability::v2x("2.x".to_string());
        
        info!("创建 InfluxDB 2.x 驱动: {}", base_url);
        
        Ok(Self {
            client,
            config,
            capability,
            base_url,
            token: v2_config.api_token,
            organization: v2_config.organization,
        })
    }
    
    /// 构建认证请求
    fn build_authenticated_request(&self, method: reqwest::Method, url: &str) -> reqwest::RequestBuilder {
        self.client
            .request(method, url)
            .bearer_auth(&self.token)
    }
    
    /// 构建查询 URL
    fn build_query_url(&self, language: &QueryLanguage) -> String {
        match language {
            QueryLanguage::Flux => format!("{}/api/v2/query", self.base_url),
            QueryLanguage::InfluxQL => format!("{}/query", self.base_url), // 兼容层
            QueryLanguage::Sql => {
                warn!("InfluxDB 2.x 不支持 SQL 查询语言");
                format!("{}/api/v2/query", self.base_url)
            }
        }
    }
    
    /// 构建写入 URL
    fn build_write_url(&self) -> String {
        format!("{}/api/v2/write", self.base_url)
    }
    
    /// 解析 Flux 查询结果
    fn parse_flux_result(&self, csv_data: &str) -> DriverResult<DataSet> {
        let mut lines: Vec<&str> = csv_data.lines().collect();
        
        if lines.is_empty() {
            return Ok(DataSet::empty());
        }
        
        // 跳过注释行和空行
        while let Some(first_line) = lines.first() {
            if first_line.starts_with('#') || first_line.trim().is_empty() {
                lines.remove(0);
            } else {
                break;
            }
        }
        
        if lines.is_empty() {
            return Ok(DataSet::empty());
        }
        
        // 解析列名
        let header_line = lines.remove(0);
        let columns: Vec<String> = header_line
            .split(',')
            .map(|s| s.trim().to_string())
            .collect();
        
        // 解析数据行
        let rows: Vec<Vec<serde_json::Value>> = lines
            .iter()
            .filter(|line| !line.trim().is_empty())
            .map(|line| {
                line.split(',')
                    .map(|cell| {
                        let cell = cell.trim();
                        // 尝试解析为不同类型
                        if let Ok(num) = cell.parse::<i64>() {
                            serde_json::Value::Number(serde_json::Number::from(num))
                        } else if let Ok(num) = cell.parse::<f64>() {
                            serde_json::Value::Number(serde_json::Number::from_f64(num).unwrap_or_else(|| serde_json::Number::from(0)))
                        } else if cell.eq_ignore_ascii_case("true") {
                            serde_json::Value::Bool(true)
                        } else if cell.eq_ignore_ascii_case("false") {
                            serde_json::Value::Bool(false)
                        } else {
                            serde_json::Value::String(cell.to_string())
                        }
                    })
                    .collect()
            })
            .collect();
        
        Ok(DataSet::new(columns, rows))
    }
    
    /// 解析 InfluxQL 查询结果
    fn parse_influxql_result(&self, json: Value) -> DriverResult<DataSet> {
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

#[cfg(feature = "influxdb-v2")]
#[async_trait]
impl InfluxDriver for V2HttpDriver {
    async fn write(&self, line_protocol: &str, bucket: &BucketInfo) -> Result<()> {
        debug!("写入数据到 InfluxDB 2.x: {}", bucket.name);
        
        let url = self.build_write_url();
        
        let mut request = self.build_authenticated_request(reqwest::Method::POST, &url)
            .header("Content-Type", "text/plain; charset=utf-8")
            .query(&[("org", &self.organization)])
            .query(&[("bucket", &bucket.name)])
            .body(line_protocol.to_string());
        
        // 如果指定了精度，添加精度参数
        request = request.query(&[("precision", "ns")]);
        
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
        
        let start_time = Instant::now();
        let url = self.build_query_url(&query.language);
        
        let dataset = match query.language {
            QueryLanguage::Flux => {
                let request_body = json!({
                    "query": query.text,
                    "type": "flux"
                });
                
                let request = self.build_authenticated_request(reqwest::Method::POST, &url)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/csv")
                    .json(&request_body);
                
                let response = request.send().await
                    .map_err(|e| anyhow::anyhow!("查询请求失败: {}", e))?;
                
                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    return Err(anyhow::anyhow!("查询失败 ({}): {}", status, error_text));
                }
                
                let csv_data = response.text().await
                    .map_err(|e| anyhow::anyhow!("读取响应失败: {}", e))?;
                
                self.parse_flux_result(&csv_data)
                    .map_err(|e| anyhow::anyhow!("解析 Flux 结果失败: {}", e))?
            }
            
            QueryLanguage::InfluxQL => {
                let request = self.build_authenticated_request(reqwest::Method::GET, &url)
                    .query(&[("q", &query.text)])
                    .query(&[("db", query.database.as_deref().unwrap_or(""))]);
                
                let response = request.send().await
                    .map_err(|e| anyhow::anyhow!("查询请求失败: {}", e))?;
                
                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    return Err(anyhow::anyhow!("查询失败 ({}): {}", status, error_text));
                }
                
                let json: Value = response.json().await
                    .map_err(|e| anyhow::anyhow!("解析响应失败: {}", e))?;
                
                self.parse_influxql_result(json)
                    .map_err(|e| anyhow::anyhow!("解析 InfluxQL 结果失败: {}", e))?
            }
            
            QueryLanguage::Sql => {
                return Err(anyhow::anyhow!("InfluxDB 2.x 不支持 SQL 查询语言"));
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

        // 使用 /api/v2/buckets 来测试连接和认证
        // 这个端点需要有效的 API Token 才能成功
        let url = format!("{}/api/v2/buckets", self.base_url);
        let request = self.build_authenticated_request(reqwest::Method::GET, &url)
            .query(&[("limit", "1")]); // 只获取1个bucket以减少响应大小

        let response = request.send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();

            // 判断是否是认证错误
            if status == 401 || status == 403 {
                return Err(anyhow::anyhow!("认证失败: API Token 无效或没有权限"));
            }

            return Err(anyhow::anyhow!("连接测试失败 ({}): {}", status, error_text));
        }

        // 验证响应格式
        let json: Value = response.json().await
            .map_err(|e| anyhow::anyhow!("解析响应失败: {}", e))?;

        // 检查响应中是否有错误信息
        if let Some(code) = json.get("code") {
            if code.as_str() == Some("unauthorized") || code.as_str() == Some("forbidden") {
                return Err(anyhow::anyhow!("认证失败: API Token 无效或没有权限"));
            }
        }

        let latency = start_time.elapsed().as_millis() as u64;
        info!("连接测试成功，延迟: {}ms", latency);
        Ok(latency)
    }
    
    async fn close(&self) -> Result<()> {
        // HTTP 客户端无需显式关闭
        info!("InfluxDB 2.x 驱动已关闭");
        Ok(())
    }
    
    async fn list_databases(&self) -> Result<Vec<String>> {
        debug!("获取存储桶列表");
        
        let url = format!("{}/api/v2/buckets", self.base_url);
        let request = self.build_authenticated_request(reqwest::Method::GET, &url)
            .query(&[("org", &self.organization)]);
        
        let response = request.send().await?;
        
        if !response.status().is_success() {
            let status = response.status();
            return Err(anyhow::anyhow!("获取存储桶列表失败: {}", status));
        }
        
        let json: Value = response.json().await?;
        let buckets = json["buckets"].as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|bucket| bucket["name"].as_str().map(|s| s.to_string()))
            .collect();
        
        Ok(buckets)
    }
    
    async fn list_measurements(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取测量列表: {}", database);
        
        // 使用 Flux 查询获取测量列表
        let flux_query = format!(
            r#"
            import "influxdata/influxdb/schema"
            schema.measurements(bucket: "{}")
            "#,
            database
        );
        
        let query = Query::new(QueryLanguage::Flux, flux_query);
        let dataset = self.query(&query).await?;
        
        let measurements = dataset.rows
            .iter()
            .filter_map(|row| {
                // 查找 _value 列
                if let Some(value_idx) = dataset.columns.iter().position(|col| col == "_value") {
                    row.get(value_idx)?.as_str().map(|s| s.to_string())
                } else {
                    None
                }
            })
            .collect();
        
        Ok(measurements)
    }
    
    async fn describe_measurement(&self, database: &str, measurement: &str) -> Result<MeasurementSchema> {
        debug!("描述测量: {}.{}", database, measurement);
        
        // 使用 Flux 查询获取字段信息
        let flux_query = format!(
            r#"
            import "influxdata/influxdb/schema"
            schema.fieldKeys(bucket: "{}", measurement: "{}")
            "#,
            database, measurement
        );
        
        let query = Query::new(QueryLanguage::Flux, flux_query);
        let field_dataset = self.query(&query).await?;
        
        let fields: Vec<FieldSchema> = field_dataset.rows
            .iter()
            .filter_map(|row| {
                if let Some(value_idx) = field_dataset.columns.iter().position(|col| col == "_value") {
                    let name = row.get(value_idx)?.as_str()?.to_string();
                    Some(FieldSchema {
                        name,
                        field_type: FieldType::Unknown, // 2.x 中字段类型信息较难获取
                    })
                } else {
                    None
                }
            })
            .collect();
        
        // 获取标签信息
        let tag_flux_query = format!(
            r#"
            import "influxdata/influxdb/schema"
            schema.tagKeys(bucket: "{}", measurement: "{}")
            "#,
            database, measurement
        );
        
        let tag_query = Query::new(QueryLanguage::Flux, tag_flux_query);
        let tag_dataset = self.query(&tag_query).await?;
        
        let tags: Vec<TagSchema> = tag_dataset.rows
            .iter()
            .filter_map(|row| {
                if let Some(value_idx) = tag_dataset.columns.iter().position(|col| col == "_value") {
                    let name = row.get(value_idx)?.as_str()?.to_string();
                    Some(TagSchema {
                        name,
                        values: vec![], // 标签值需要额外查询
                    })
                } else {
                    None
                }
            })
            .collect();
        
        Ok(MeasurementSchema {
            name: measurement.to_string(),
            fields,
            tags,
        })
    }
    
    async fn create_database(&self, name: &str) -> Result<()> {
        debug!("创建存储桶: {}", name);
        
        let url = format!("{}/api/v2/buckets", self.base_url);
        let request_body = json!({
            "name": name,
            "orgID": self.organization,
            "retentionRules": []
        });
        
        let request = self.build_authenticated_request(reqwest::Method::POST, &url)
            .header("Content-Type", "application/json")
            .json(&request_body);
        
        let response = request.send().await?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("创建存储桶失败 ({}): {}", status, error_text));
        }
        
        info!("存储桶创建成功: {}", name);
        Ok(())
    }
    
    async fn drop_database(&self, name: &str) -> Result<()> {
        debug!("删除存储桶: {}", name);
        
        // 首先获取存储桶 ID
        let buckets = self.list_databases().await?;
        if !buckets.contains(&name.to_string()) {
            return Err(anyhow::anyhow!("存储桶不存在: {}", name));
        }
        
        // 获取存储桶详细信息以获取 ID
        let url = format!("{}/api/v2/buckets", self.base_url);
        let request = self.build_authenticated_request(reqwest::Method::GET, &url)
            .query(&[("org", &self.organization)])
            .query(&[("name", name)]);
        
        let response = request.send().await?;
        let json: Value = response.json().await?;
        
        let bucket_id = json["buckets"].as_array()
            .and_then(|buckets| buckets.first())
            .and_then(|bucket| bucket["id"].as_str())
            .ok_or_else(|| anyhow::anyhow!("无法获取存储桶 ID"))?;
        
        // 删除存储桶
        let delete_url = format!("{}/api/v2/buckets/{}", self.base_url, bucket_id);
        let delete_request = self.build_authenticated_request(reqwest::Method::DELETE, &delete_url);
        let delete_response = delete_request.send().await?;
        
        if !delete_response.status().is_success() {
            let status = delete_response.status();
            let error_text = delete_response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("删除存储桶失败 ({}): {}", status, error_text));
        }
        
        info!("存储桶删除成功: {}", name);
        Ok(())
    }
    
    async fn list_retention_policies(&self, _database: &str) -> Result<Vec<RetentionPolicyInfo>> {
        // InfluxDB 2.x 使用存储桶的保留规则，而不是传统的保留策略
        warn!("InfluxDB 2.x 不支持传统的保留策略，请使用存储桶的保留规则");
        Ok(vec![])
    }
    
    async fn create_retention_policy(&self, _database: &str, _policy: &RetentionPolicyConfig) -> Result<()> {
        Err(anyhow::anyhow!("InfluxDB 2.x 不支持传统的保留策略，请使用存储桶的保留规则"))
    }
    
    async fn drop_retention_policy(&self, _database: &str, _policy_name: &str) -> Result<()> {
        Err(anyhow::anyhow!("InfluxDB 2.x 不支持传统的保留策略，请使用存储桶的保留规则"))
    }
}
