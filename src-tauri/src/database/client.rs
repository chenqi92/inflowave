use crate::models::{ConnectionConfig, QueryResult, RetentionPolicy};
use anyhow::Result;
use influxdb::Client;
use std::time::Instant;
use log::{debug, error, info};
use reqwest;

/// InfluxDB 客户端封装
#[derive(Debug, Clone)]
pub struct InfluxClient {
    client: Client,
    http_client: reqwest::Client,
    config: ConnectionConfig,
}

impl InfluxClient {
    /// 创建新的客户端实例
    pub fn new(config: ConnectionConfig) -> Result<Self> {
        let url = if config.ssl {
            format!("https://{}:{}", config.host, config.port)
        } else {
            format!("http://{}:{}", config.host, config.port)
        };

        let mut client = Client::new(url, "");

        // 设置认证信息
        if let (Some(username), Some(password)) = (&config.username, &config.password) {
            client = client.with_auth(username, password);
        }

        // 设置默认数据库 (InfluxDB 0.7 不支持 with_database 方法)
        // 数据库将在查询时指定

        let http_client = reqwest::Client::new();

        info!("创建 InfluxDB 客户端: {}:{}", config.host, config.port);

        Ok(Self { client, http_client, config })
    }

    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        let start = Instant::now();

        debug!("测试连接: {}:{}", self.config.host, self.config.port);

        // 执行简单的查询来测试连接
        let query = influxdb::ReadQuery::new("SHOW DATABASES");

        match self.client.query(query).await {
            Ok(_) => {
                let latency = start.elapsed().as_millis() as u64;
                info!("连接测试成功，延迟: {}ms", latency);
                Ok(latency)
            }
            Err(e) => {
                error!("连接测试失败: {}", e);
                Err(anyhow::anyhow!("连接测试失败: {}", e))
            }
        }
    }

    /// 执行查询
    pub async fn execute_query(&self, query_str: &str) -> Result<QueryResult> {
        let start = Instant::now();

        debug!("执行查询: {}", query_str);

        let query = influxdb::ReadQuery::new(query_str);

        match self.client.query(query).await {
            Ok(result) => {
                let execution_time = start.elapsed().as_millis() as u64;

                // 解析 InfluxDB 查询结果
                let query_result = self.parse_query_result("query_executed".to_string(), execution_time)?;

                info!("查询执行成功，耗时: {}ms，返回 {} 行", execution_time, query_result.row_count);

                Ok(query_result)
            }
            Err(e) => {
                error!("查询执行失败: {}", e);
                Err(anyhow::anyhow!("查询执行失败: {}", e))
            }
        }
    }

    /// 解析查询结果
    fn parse_query_result(&self, _result: String, execution_time: u64) -> Result<QueryResult> {
        // 尝试解析 InfluxDB 查询结果
        // 注意：influxdb crate 的结果解析可能需要根据实际返回格式调整

        // 如果是 SHOW 类型的查询，返回简单的文本结果
        let columns = vec!["name".to_string()];
        let mut rows = Vec::new();

        // 这里需要根据实际的 InfluxDB 响应格式来解析
        // 暂时返回一个示例结果，实际使用时需要根据 influxdb crate 的 API 调整
        rows.push(vec![serde_json::Value::String("示例结果".to_string())]);

        let query_result = QueryResult::new(columns, rows, execution_time);
        Ok(query_result)
    }

    /// 获取数据库列表
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        debug!("获取数据库列表");
        
        let query = influxdb::ReadQuery::new("SHOW DATABASES");
        
        match self.client.query(query).await {
            Ok(_result) => {
                // 临时实现：返回默认数据库列表
                // TODO: 正确解析 InfluxDB 查询结果
                let databases = vec!["_internal".to_string(), "mydb".to_string()];

                info!("获取到 {} 个数据库", databases.len());
                Ok(databases)
            }
            Err(e) => {
                error!("获取数据库列表失败: {}", e);
                Err(anyhow::anyhow!("获取数据库列表失败: {}", e))
            }
        }
    }

    /// 创建数据库
    pub async fn create_database(&self, database_name: &str) -> Result<()> {
        debug!("创建数据库: {}", database_name);
        
        let query_str = format!("CREATE DATABASE \"{}\"", database_name);
        let query = influxdb::ReadQuery::new(&query_str);
        
        match self.client.query(query).await {
            Ok(_) => {
                info!("数据库 '{}' 创建成功", database_name);
                Ok(())
            }
            Err(e) => {
                error!("创建数据库失败: {}", e);
                Err(anyhow::anyhow!("创建数据库失败: {}", e))
            }
        }
    }

    /// 删除数据库
    pub async fn drop_database(&self, database_name: &str) -> Result<()> {
        debug!("删除数据库: {}", database_name);
        
        let query_str = format!("DROP DATABASE \"{}\"", database_name);
        let query = influxdb::ReadQuery::new(&query_str);
        
        match self.client.query(query).await {
            Ok(_) => {
                info!("数据库 '{}' 删除成功", database_name);
                Ok(())
            }
            Err(e) => {
                error!("删除数据库失败: {}", e);
                Err(anyhow::anyhow!("删除数据库失败: {}", e))
            }
        }
    }

    /// 获取保留策略
    pub async fn get_retention_policies(&self, database: &str) -> Result<Vec<RetentionPolicy>> {
        debug!("获取数据库 '{}' 的保留策略", database);
        
        let query_str = format!("SHOW RETENTION POLICIES ON \"{}\"", database);
        let query = influxdb::ReadQuery::new(&query_str);
        
        match self.client.query(query).await {
            Ok(_result) => {
                // 临时实现：返回默认保留策略
                // TODO: 正确解析 InfluxDB 查询结果
                let policies = vec![
                    RetentionPolicy {
                        name: "autogen".to_string(),
                        duration: "0s".to_string(),
                        shard_group_duration: "168h0m0s".to_string(),
                        replica_n: 1,
                        default: true,
                    }
                ];

                info!("获取到 {} 个保留策略", policies.len());
                Ok(policies)
            }
            Err(e) => {
                error!("获取保留策略失败: {}", e);
                Err(anyhow::anyhow!("获取保留策略失败: {}", e))
            }
        }
    }

    /// 获取测量列表
    pub async fn get_measurements(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取数据库 '{}' 的测量列表", database);

        let query_str = format!("SHOW MEASUREMENTS ON \"{}\"", database);
        let query = influxdb::ReadQuery::new(&query_str);

        match self.client.query(query).await {
            Ok(result) => {
                // 解析测量列表结果
                let measurements = self.parse_measurements_result("measurements_result".to_string())?;
                info!("获取到 {} 个测量", measurements.len());
                Ok(measurements)
            }
            Err(e) => {
                error!("获取测量列表失败: {}", e);
                Err(anyhow::anyhow!("获取测量列表失败: {}", e))
            }
        }
    }

    /// 解析测量列表结果
    fn parse_measurements_result(&self, _result: String) -> Result<Vec<String>> {
        // 临时实现：返回示例测量列表
        // TODO: 根据实际的 InfluxDB 响应格式解析
        let measurements = vec![
            "cpu".to_string(),
            "memory".to_string(),
            "disk".to_string(),
            "network".to_string(),
            "temperature".to_string()
        ];
        Ok(measurements)
    }

    /// 写入 Line Protocol 数据
    pub async fn write_line_protocol(&self, database: &str, line_protocol: &str) -> Result<usize> {
        let line_count = line_protocol.lines().filter(|line| !line.trim().is_empty()).count();
        debug!("写入数据到数据库 '{}': {} 行", database, line_count);

        // 使用 HTTP POST 请求写入数据
        let url = format!("{}/write?db={}",
            if self.config.ssl {
                format!("https://{}:{}", self.config.host, self.config.port)
            } else {
                format!("http://{}:{}", self.config.host, self.config.port)
            },
            database
        );

        let mut request = self.http_client.post(&url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(line_protocol.to_string());

        // 添加认证信息
        if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
            request = request.basic_auth(username, Some(password));
        }

        match request.send().await {
            Ok(response) => {
                if response.status().is_success() {
                    debug!("数据写入成功，写入 {} 个数据点", line_count);
                    Ok(line_count)
                } else {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    error!("数据写入失败: HTTP {}, {}", status, error_text);
                    Err(anyhow::anyhow!("数据写入失败: {}", error_text))
                }
            }
            Err(e) => {
                error!("数据写入请求失败: {}", e);
                Err(anyhow::anyhow!("数据写入请求失败: {}", e))
            }
        }
    }

    /// 获取配置信息
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }
}
