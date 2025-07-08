use crate::models::{ConnectionConfig, QueryResult, DatabaseInfo, RetentionPolicy, Measurement};
use anyhow::{Context, Result};
use influxdb::{Client, Query};
use std::time::Instant;
use log::{debug, error, info};

/// InfluxDB 客户端封装
#[derive(Debug, Clone)]
pub struct InfluxClient {
    client: Client,
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

        // 设置默认数据库
        if let Some(database) = &config.database {
            client = client.with_database(database);
        }

        info!("创建 InfluxDB 客户端: {}:{}", config.host, config.port);

        Ok(Self { client, config })
    }

    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        let start = Instant::now();
        
        debug!("测试连接: {}:{}", self.config.host, self.config.port);
        
        // 执行简单的查询来测试连接
        let query = Query::raw_read_query("SHOW DATABASES");
        
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
        
        let query = Query::raw_read_query(query_str);
        
        match self.client.query(query).await {
            Ok(result) => {
                let execution_time = start.elapsed().as_millis() as u64;
                
                // 解析查询结果
                let mut columns = Vec::new();
                let mut rows = Vec::new();

                if let Some(series) = result.series.first() {
                    // 获取列名
                    columns = series.columns.clone();
                    
                    // 获取数据行
                    for values in &series.values {
                        let row: Vec<serde_json::Value> = values.iter()
                            .map(|v| match v {
                                Some(val) => val.clone(),
                                None => serde_json::Value::Null,
                            })
                            .collect();
                        rows.push(row);
                    }
                }

                let query_result = QueryResult::new(columns, rows, execution_time);
                
                info!("查询执行成功，耗时: {}ms，返回 {} 行", execution_time, query_result.row_count);
                
                Ok(query_result)
            }
            Err(e) => {
                error!("查询执行失败: {}", e);
                Err(anyhow::anyhow!("查询执行失败: {}", e))
            }
        }
    }

    /// 获取数据库列表
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        debug!("获取数据库列表");
        
        let query = Query::raw_read_query("SHOW DATABASES");
        
        match self.client.query(query).await {
            Ok(result) => {
                let mut databases = Vec::new();
                
                if let Some(series) = result.series.first() {
                    for values in &series.values {
                        if let Some(Some(db_name)) = values.first() {
                            if let Some(name) = db_name.as_str() {
                                databases.push(name.to_string());
                            }
                        }
                    }
                }
                
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
        let query = Query::raw_read_query(&query_str);
        
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
        let query = Query::raw_read_query(&query_str);
        
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
        let query = Query::raw_read_query(&query_str);
        
        match self.client.query(query).await {
            Ok(result) => {
                let mut policies = Vec::new();
                
                if let Some(series) = result.series.first() {
                    for values in &series.values {
                        if values.len() >= 5 {
                            if let (
                                Some(Some(name)),
                                Some(Some(duration)),
                                Some(Some(shard_duration)),
                                Some(Some(replica_n)),
                                Some(Some(default))
                            ) = (
                                values.get(0),
                                values.get(1),
                                values.get(2),
                                values.get(3),
                                values.get(4)
                            ) {
                                let policy = RetentionPolicy {
                                    name: name.as_str().unwrap_or("").to_string(),
                                    duration: duration.as_str().unwrap_or("").to_string(),
                                    shard_group_duration: shard_duration.as_str().unwrap_or("").to_string(),
                                    replica_n: replica_n.as_u64().unwrap_or(1) as u32,
                                    default: default.as_bool().unwrap_or(false),
                                };
                                policies.push(policy);
                            }
                        }
                    }
                }
                
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
        let query = Query::raw_read_query(&query_str);
        
        match self.client.query(query).await {
            Ok(result) => {
                let mut measurements = Vec::new();
                
                if let Some(series) = result.series.first() {
                    for values in &series.values {
                        if let Some(Some(measurement)) = values.first() {
                            if let Some(name) = measurement.as_str() {
                                measurements.push(name.to_string());
                            }
                        }
                    }
                }
                
                info!("获取到 {} 个测量", measurements.len());
                Ok(measurements)
            }
            Err(e) => {
                error!("获取测量列表失败: {}", e);
                Err(anyhow::anyhow!("获取测量列表失败: {}", e))
            }
        }
    }

    /// 获取配置信息
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }
}
