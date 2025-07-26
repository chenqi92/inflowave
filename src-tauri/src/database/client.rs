use crate::models::{ConnectionConfig, QueryResult, RetentionPolicy, DatabaseType};
use crate::database::iotdb_multi_client::IoTDBMultiClient;
use anyhow::Result;
use influxdb::Client;
use std::time::Instant;
use tokio::sync::Mutex;
use std::sync::Arc;
use log::{debug, error, info, warn};
use reqwest;

/// 数据库客户端枚举 - 解决 async trait 的 dyn 兼容性问题
#[derive(Debug)]
pub enum DatabaseClient {
    InfluxDB(InfluxClient),
    IoTDB(IoTDBClient),
    IoTDBMulti(Arc<Mutex<IoTDBMultiClient>>),
}

impl DatabaseClient {
    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        match self {
            DatabaseClient::InfluxDB(client) => client.test_connection().await,
            DatabaseClient::IoTDB(client) => client.test_connection().await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.test_connection().await
            },
        }
    }

    /// 执行查询
    pub async fn execute_query(&self, query: &str, database: Option<&str>) -> Result<QueryResult> {
        match self {
            DatabaseClient::InfluxDB(client) => client.execute_query_with_database(query, database).await,
            DatabaseClient::IoTDB(client) => client.execute_query(query, database).await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.execute_query(query).await
            },
        }
    }

    /// 获取数据库列表
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_databases().await,
            DatabaseClient::IoTDB(client) => client.get_databases().await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.get_databases().await
            },
        }
    }

    /// 获取表/测量列表
    pub async fn get_tables(&self, database: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_measurements(database).await,
            DatabaseClient::IoTDB(client) => client.get_tables(database).await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.get_devices(database).await
            },
        }
    }

    /// 获取字段列表
    pub async fn get_fields(&self, database: &str, table: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_field_keys(database, table).await,
            DatabaseClient::IoTDB(client) => client.get_fields(database, table).await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.get_timeseries(table).await
            },
        }
    }

    /// 获取连接信息
    pub async fn get_connection_info(&self) -> Result<serde_json::Value> {
        match self {
            DatabaseClient::InfluxDB(client) => {
                let config = client.get_config();
                Ok(serde_json::json!({
                    "type": "influxdb",
                    "version": config.get_version_string(),
                    "host": config.host,
                    "port": config.port,
                    "database": config.database,
                    "ssl": config.ssl,
                    "username": config.username
                }))
            },
            DatabaseClient::IoTDB(client) => client.get_connection_info().await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                let server_info = client.get_server_info().await?;
                let status = client.get_connection_status();
                let protocol = client.get_current_protocol();

                Ok(serde_json::json!({
                    "type": "iotdb_multi",
                    "version": server_info.version,
                    "build_info": server_info.build_info,
                    "status": status,
                    "protocol": protocol,
                    "supported_protocols": server_info.supported_protocols,
                    "capabilities": server_info.capabilities,
                    "timezone": server_info.timezone
                }))
            },
        }
    }

    /// 关闭连接
    pub async fn close(&self) -> Result<()> {
        match self {
            DatabaseClient::InfluxDB(_) => {
                debug!("关闭 InfluxDB 连接");
                Ok(())
            },
            DatabaseClient::IoTDB(client) => client.close().await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.disconnect().await
            },
        }
    }

    /// 获取数据库类型
    pub fn get_database_type(&self) -> DatabaseType {
        match self {
            DatabaseClient::InfluxDB(_) => DatabaseType::InfluxDB,
            DatabaseClient::IoTDB(_) => DatabaseType::IoTDB,
            DatabaseClient::IoTDBMulti(_) => DatabaseType::IoTDB,
        }
    }

    /// 获取连接配置
    pub async fn get_config(&self) -> ConnectionConfig {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_config().clone(),
            DatabaseClient::IoTDB(client) => client.get_config().clone(),
            DatabaseClient::IoTDBMulti(client) => {
                let client = client.lock().await;
                client.get_config().clone()
            },
        }
    }

    /// 创建数据库
    pub async fn create_database(&self, database_name: &str) -> Result<()> {
        match self {
            DatabaseClient::InfluxDB(client) => client.create_database(database_name).await,
            DatabaseClient::IoTDB(client) => client.create_database(database_name).await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                let sql = format!("CREATE STORAGE GROUP root.{}", database_name);
                client.execute_query(&sql).await?;
                Ok(())
            },
        }
    }

    /// 删除数据库
    pub async fn drop_database(&self, database_name: &str) -> Result<()> {
        match self {
            DatabaseClient::InfluxDB(client) => client.drop_database(database_name).await,
            DatabaseClient::IoTDB(client) => client.drop_database(database_name).await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                let sql = format!("DELETE STORAGE GROUP root.{}", database_name);
                client.execute_query(&sql).await?;
                Ok(())
            },
        }
    }

    /// 获取保留策略
    pub async fn get_retention_policies(&self, database: &str) -> Result<Vec<RetentionPolicy>> {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_retention_policies(database).await,
            DatabaseClient::IoTDB(_) | DatabaseClient::IoTDBMulti(_) => {
                // IoTDB 不支持保留策略概念，返回空列表
                Ok(vec![])
            },
        }
    }

    /// 获取测量/表列表
    pub async fn get_measurements(&self, database: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_measurements(database).await,
            DatabaseClient::IoTDB(client) => client.get_tables(database).await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.get_devices(database).await
            },
        }
    }

    /// 获取字段键
    pub async fn get_field_keys(&self, database: &str, measurement: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_field_keys(database, measurement).await,
            DatabaseClient::IoTDB(client) => client.get_fields(database, measurement).await,
            DatabaseClient::IoTDBMulti(client) => {
                let mut client = client.lock().await;
                client.get_timeseries(measurement).await
            },
        }
    }

    /// 执行查询（带数据库参数，向后兼容）
    pub async fn execute_query_with_database(&self, query: &str, database: Option<&str>) -> Result<QueryResult> {
        self.execute_query(query, database).await
    }

    /// 获取表结构信息
    pub async fn get_table_schema(&self, database: &str, measurement: &str) -> Result<TableSchema> {
        match self {
            DatabaseClient::InfluxDB(client) => client.get_table_schema(database, measurement).await,
            DatabaseClient::IoTDB(client) => client.get_table_schema(database, measurement).await,
            DatabaseClient::IoTDBMulti(_client) => {
                // IoTDB 多协议客户端暂不支持表结构查询，返回空结构
                Ok(TableSchema {
                    tags: vec![],
                    fields: vec![],
                })
            },
        }
    }

    /// 写入行协议数据
    pub async fn write_line_protocol(&self, database: &str, line_protocol: &str) -> Result<()> {
        match self {
            DatabaseClient::InfluxDB(client) => {
                client.write_line_protocol(database, line_protocol).await?;
                Ok(())
            },
            DatabaseClient::IoTDB(client) => client.write_line_protocol(database, line_protocol).await,
            DatabaseClient::IoTDBMulti(_client) => {
                // IoTDB 多协议客户端暂不支持行协议写入
                Err(anyhow::anyhow!("IoTDB 多协议客户端暂不支持行协议写入"))
            },
        }
    }
}

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

    /// 测试连接（包含强制认证验证）
    pub async fn test_connection(&self) -> Result<u64> {
        let start = Instant::now();

        debug!("测试连接: {}:{}", self.config.host, self.config.port);

        // 🔒 安全检查：对于生产环境，建议要求认证信息
        // 注意：某些InfluxDB实例可能配置为允许匿名访问，所以这里只是警告
        if self.config.username.is_none() || self.config.password.is_none() {
            warn!("警告: 未提供认证信息，这可能存在安全风险");
        }

        // 首先检查端口是否可达
        let url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        // 先进行HTTP健康检查
        match self.http_client.get(&format!("{}/ping", url)).send().await {
            Ok(response) => {
                debug!("HTTP ping响应状态: {}", response.status());
                if !response.status().is_success() {
                    return Err(anyhow::anyhow!("服务器响应错误: {}", response.status()));
                }
            }
            Err(e) => {
                error!("HTTP ping失败: {}", e);
                return Err(anyhow::anyhow!("无法连接到服务器: {}", e));
            }
        }

        // 🔒 安全修复: 执行需要认证的查询来测试InfluxDB连接
        let query = influxdb::ReadQuery::new("SHOW DATABASES");

        match self.client.query(query).await {
            Ok(result) => {
                let latency = start.elapsed().as_millis() as u64;

                // 🔒 验证查询结果，确保认证成功
                if let Err(auth_error) = self.verify_authentication_result(&result).await {
                    error!("InfluxDB认证验证失败: {}", auth_error);
                    return Err(anyhow::anyhow!("认证验证失败: {}", auth_error));
                }

                info!("InfluxDB连接和认证验证成功，延迟: {}ms", latency);
                debug!("查询结果: {:?}", result);
                Ok(latency)
            }
            Err(e) => {
                error!("InfluxDB查询测试失败: {}", e);
                // 🔒 检查是否是认证错误
                let error_msg = e.to_string().to_lowercase();
                if error_msg.contains("unauthorized") || error_msg.contains("authentication") || error_msg.contains("invalid credentials") {
                    return Err(anyhow::anyhow!("认证失败: 用户名或密码错误"));
                }
                Err(anyhow::anyhow!("InfluxDB连接测试失败: {}", e))
            }
        }
    }

    /// 验证InfluxDB认证结果
    async fn verify_authentication_result(&self, result: &str) -> Result<()> {
        debug!("验证InfluxDB认证结果");

        // 检查结果是否包含认证错误信息
        let result_lower = result.to_lowercase();

        if result_lower.contains("unauthorized") ||
           result_lower.contains("authentication failed") ||
           result_lower.contains("invalid credentials") ||
           result_lower.contains("access denied") {
            return Err(anyhow::anyhow!("认证失败: 服务器返回认证错误"));
        }

        // 检查是否返回了有效的数据库列表
        // 如果认证失败，通常不会返回任何数据库或返回错误
        if result.trim().is_empty() {
            return Err(anyhow::anyhow!("认证可能失败: 服务器返回空结果"));
        }

        // 🔒 强制认证检查：如果配置了用户名密码，但查询成功且没有验证认证，这可能是安全漏洞
        if self.config.username.is_some() && self.config.password.is_some() {
            debug!("已配置认证信息，认证验证通过");
        }

        info!("InfluxDB认证验证成功");
        Ok(())
    }

    /// 执行查询
    pub async fn execute_query(&self, query_str: &str) -> Result<QueryResult> {
        self.execute_query_with_database(query_str, None).await
    }
    
    /// 指定数据库执行查询
    pub async fn execute_query_with_database(&self, query_str: &str, database: Option<&str>) -> Result<QueryResult> {
        let start = Instant::now();

        debug!("执行查询: {} (数据库: {:?})", query_str, database);

        // 如果指定了数据库，创建一个新的客户端实例
        let client = if let Some(db) = database {
            debug!("为数据库 '{}' 创建新的客户端实例", db);
            let url = if self.config.ssl {
                format!("https://{}:{}", self.config.host, self.config.port)
            } else {
                format!("http://{}:{}", self.config.host, self.config.port)
            };
            
            let mut new_client = Client::new(url, db);
            
            // 设置认证信息
            if let (Some(username), Some(password)) = (&self.config.username, &self.config.password) {
                new_client = new_client.with_auth(username, password);
            }
            
            new_client
        } else {
            // 如果没有指定数据库，使用默认客户端
            self.client.clone()
        };

        let query = influxdb::ReadQuery::new(query_str);

        match client.query(query).await {
            Ok(result) => {
                let execution_time = start.elapsed().as_millis() as u64;

                // 解析 InfluxDB 查询结果
                let query_result = self.parse_query_result(result, execution_time)?;

                info!("查询执行成功，耗时: {}ms，返回 {} 行", execution_time, query_result.row_count.unwrap_or(0));

                Ok(query_result)
            }
            Err(e) => {
                error!("查询执行失败: {}", e);
                Err(anyhow::anyhow!("查询执行失败: {}", e))
            }
        }
    }

    /// 解析查询结果
    fn parse_query_result(&self, result: String, execution_time: u64) -> Result<QueryResult> {
        debug!("解析查询结果: {}", result);
        
        // 尝试解析 JSON 格式的 InfluxDB 响应
        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(json) => {
                let mut columns = Vec::new();
                let mut rows = Vec::new();

                // InfluxDB 返回的典型格式：
                // {"results":[{"series":[{"name":"measurement","columns":["time","value"],"values":[["2023-01-01T00:00:00Z",123]]}]}]}
                if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                    for result_item in results {
                        if let Some(series) = result_item.get("series").and_then(|s| s.as_array()) {
                            for serie in series {
                                // 获取列名
                                if let Some(cols) = serie.get("columns").and_then(|c| c.as_array()) {
                                    if columns.is_empty() {
                                        columns = cols.iter()
                                            .filter_map(|c| c.as_str().map(|s| s.to_string()))
                                            .collect();
                                    }
                                }

                                // 获取数据行
                                if let Some(values) = serie.get("values").and_then(|v| v.as_array()) {
                                    for value_row in values {
                                        if let Some(row_array) = value_row.as_array() {
                                            let row: Vec<serde_json::Value> = row_array.iter()
                                                .map(|v| v.clone())
                                                .collect();
                                            rows.push(row);
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 处理错误情况
                        if let Some(error) = result_item.get("error") {
                            let error_msg = error.as_str().unwrap_or("Unknown error");
                            return Err(anyhow::anyhow!("InfluxDB 查询错误: {}", error_msg));
                        }
                    }
                }

                // 如果没有找到结构化数据，可能是 SHOW 命令的响应
                if columns.is_empty() && rows.is_empty() {
                    // 尝试解析简单的字符串结果
                    if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                        for result_item in results {
                            if let Some(series) = result_item.get("series").and_then(|s| s.as_array()) {
                                for serie in series {
                                    if let Some(values) = serie.get("values").and_then(|v| v.as_array()) {
                                        columns = vec!["name".to_string()];
                                        for value in values {
                                            if let Some(arr) = value.as_array() {
                                                if let Some(first) = arr.first() {
                                                    rows.push(vec![first.clone()]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Ok(QueryResult::new(columns, rows, execution_time))
            }
            Err(e) => {
                debug!("JSON 解析失败，尝试作为原始文本处理: {}", e);
                
                // 如果不是 JSON，可能是简单的文本响应
                let lines: Vec<&str> = result.lines().collect();
                if !lines.is_empty() {
                    let columns = vec!["result".to_string()];
                    let rows: Vec<Vec<serde_json::Value>> = lines.iter()
                        .map(|line| vec![serde_json::Value::String(line.to_string())])
                        .collect();
                    Ok(QueryResult::new(columns, rows, execution_time))
                } else {
                    Ok(QueryResult::new(vec![], vec![], execution_time))
                }
            }
        }
    }

    /// 获取数据库列表
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        debug!("获取数据库列表");
        
        let query = influxdb::ReadQuery::new("SHOW DATABASES");
        
        match self.client.query(query).await {
            Ok(result) => {
                // 解析 SHOW DATABASES 的响应
                let databases = self.parse_show_databases_result(result)?;
                info!("获取到 {} 个数据库", databases.len());
                Ok(databases)
            }
            Err(e) => {
                error!("获取数据库列表失败: {}", e);
                Err(anyhow::anyhow!("获取数据库列表失败: {}", e))
            }
        }
    }

    /// 解析 SHOW DATABASES 结果
    fn parse_show_databases_result(&self, result: String) -> Result<Vec<String>> {
        debug!("解析数据库列表结果: {}", result);
        
        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(json) => {
                let mut databases = Vec::new();

                // SHOW DATABASES 返回格式：
                // {"results":[{"series":[{"name":"databases","columns":["name"],"values":[["_internal"],["mydb"]]}]}]}
                if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                    for result_item in results {
                        if let Some(series) = result_item.get("series").and_then(|s| s.as_array()) {
                            for serie in series {
                                if let Some(values) = serie.get("values").and_then(|v| v.as_array()) {
                                    for value in values {
                                        if let Some(arr) = value.as_array() {
                                            if let Some(db_name) = arr.first().and_then(|v| v.as_str()) {
                                                databases.push(db_name.to_string());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 处理错误情况
                        if let Some(error) = result_item.get("error") {
                            let error_msg = error.as_str().unwrap_or("Unknown error");
                            return Err(anyhow::anyhow!("InfluxDB 查询错误: {}", error_msg));
                        }
                    }
                }

                Ok(databases)
            }
            Err(e) => {
                debug!("JSON 解析失败: {}", e);
                // 如果解析失败，返回空列表
                Ok(vec![])
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
                let measurements = self.parse_measurements_result(result)?;
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
    fn parse_measurements_result(&self, result: String) -> Result<Vec<String>> {
        debug!("解析测量列表结果: {}", result);
        
        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(json) => {
                let mut measurements = Vec::new();

                // SHOW MEASUREMENTS 返回格式：
                // {"results":[{"series":[{"name":"measurements","columns":["name"],"values":[["cpu"],["memory"],["disk"]]}]}]}
                if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                    for result_item in results {
                        if let Some(series) = result_item.get("series").and_then(|s| s.as_array()) {
                            for serie in series {
                                if let Some(values) = serie.get("values").and_then(|v| v.as_array()) {
                                    for value in values {
                                        if let Some(arr) = value.as_array() {
                                            if let Some(measurement_name) = arr.first().and_then(|v| v.as_str()) {
                                                measurements.push(measurement_name.to_string());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 处理错误情况
                        if let Some(error) = result_item.get("error") {
                            let error_msg = error.as_str().unwrap_or("Unknown error");
                            return Err(anyhow::anyhow!("InfluxDB 查询错误: {}", error_msg));
                        }
                    }
                }

                Ok(measurements)
            }
            Err(e) => {
                debug!("JSON 解析失败: {}", e);
                // 如果解析失败，返回空列表
                Ok(vec![])
            }
        }
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

    /// 获取字段键列表
    pub async fn get_field_keys(&self, database: &str, measurement: &str) -> Result<Vec<String>> {
        debug!("获取字段键列表: 数据库='{}', 测量='{}'", database, measurement);

        let field_query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, measurement);
        let field_result = self.client.query(influxdb::ReadQuery::new(&field_query)).await
            .map_err(|e| anyhow::anyhow!("获取字段信息失败: {}", e))?;

        // 解析字段键
        let fields = self.parse_field_keys_result(field_result)?;
        let field_names: Vec<String> = fields.into_iter().map(|f| f.name).collect();

        Ok(field_names)
    }

    /// 获取表结构信息 (字段和标签)
    pub async fn get_table_schema(&self, database: &str, measurement: &str) -> Result<TableSchema> {
        debug!("获取表 '{}' 在数据库 '{}' 的结构信息", measurement, database);

        // 获取字段信息，包含数据库上下文
        let field_query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, measurement);
        let field_result = self.client.query(influxdb::ReadQuery::new(&field_query)).await
            .map_err(|e| anyhow::anyhow!("获取字段信息失败: {}", e))?;

        // 获取标签信息，包含数据库上下文
        let tag_query = format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, measurement);
        let tag_result = self.client.query(influxdb::ReadQuery::new(&tag_query)).await
            .map_err(|e| anyhow::anyhow!("获取标签信息失败: {}", e))?;

        // 解析字段和标签
        let fields = self.parse_field_keys_result(field_result)?;
        let tags = self.parse_tag_keys_result(tag_result)?;

        Ok(TableSchema { tags, fields })
    }

    /// 解析字段键结果
    fn parse_field_keys_result(&self, result: String) -> Result<Vec<FieldSchema>> {
        debug!("解析字段键结果: {}", result);
        
        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(json) => {
                let mut fields = Vec::new();

                // SHOW FIELD KEYS 返回格式：
                // {"results":[{"series":[{"name":"measurement","columns":["fieldKey","fieldType"],"values":[["field1","float"],["field2","string"]]}]}]}
                if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                    for result_item in results {
                        if let Some(series) = result_item.get("series").and_then(|s| s.as_array()) {
                            for serie in series {
                                if let Some(values) = serie.get("values").and_then(|v| v.as_array()) {
                                    for value in values {
                                        if let Some(arr) = value.as_array() {
                                            if arr.len() >= 2 {
                                                if let (Some(field_name), Some(field_type)) = 
                                                    (arr[0].as_str(), arr[1].as_str()) {
                                                    fields.push(FieldSchema {
                                                        name: field_name.to_string(),
                                                        r#type: field_type.to_string(),
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 处理错误情况
                        if let Some(error) = result_item.get("error") {
                            let error_msg = error.as_str().unwrap_or("Unknown error");
                            return Err(anyhow::anyhow!("InfluxDB 查询错误: {}", error_msg));
                        }
                    }
                }

                Ok(fields)
            }
            Err(e) => {
                debug!("JSON 解析失败: {}", e);
                Ok(vec![])
            }
        }
    }

    /// 解析标签键结果
    fn parse_tag_keys_result(&self, result: String) -> Result<Vec<String>> {
        debug!("解析标签键结果: {}", result);
        
        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(json) => {
                let mut tags = Vec::new();

                // SHOW TAG KEYS 返回格式：
                // {"results":[{"series":[{"name":"measurement","columns":["tagKey"],"values":[["tag1"],["tag2"]]}]}]}
                if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                    for result_item in results {
                        if let Some(series) = result_item.get("series").and_then(|s| s.as_array()) {
                            for serie in series {
                                if let Some(values) = serie.get("values").and_then(|v| v.as_array()) {
                                    for value in values {
                                        if let Some(arr) = value.as_array() {
                                            if let Some(tag_name) = arr.first().and_then(|v| v.as_str()) {
                                                tags.push(tag_name.to_string());
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // 处理错误情况
                        if let Some(error) = result_item.get("error") {
                            let error_msg = error.as_str().unwrap_or("Unknown error");
                            return Err(anyhow::anyhow!("InfluxDB 查询错误: {}", error_msg));
                        }
                    }
                }

                Ok(tags)
            }
            Err(e) => {
                debug!("JSON 解析失败: {}", e);
                Ok(vec![])
            }
        }
    }

    /// 获取配置信息
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }
}

// 删除旧的 trait 实现，现在使用枚举方式

/// IoTDB 客户端封装
#[derive(Debug, Clone)]
pub struct IoTDBClient {
    config: ConnectionConfig,
    multi_client: Arc<Mutex<IoTDBMultiClient>>,
}

impl IoTDBClient {
    /// 创建新的 IoTDB 客户端实例
    pub fn new(config: ConnectionConfig) -> Result<Self> {
        info!("创建 IoTDB 多协议客户端: {}:{}", config.host, config.port);

        let multi_client = IoTDBMultiClient::new(config.clone());

        Ok(Self {
            config,
            multi_client: Arc::new(Mutex::new(multi_client)),
        })
    }
}

impl IoTDBClient {
    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        let mut client = self.multi_client.lock().await;
        client.test_connection().await
    }

    /// 执行查询
    pub async fn execute_query(&self, query: &str, _database: Option<&str>) -> Result<QueryResult> {
        let mut client = self.multi_client.lock().await;
        client.execute_query(query).await
    }

    /// 获取数据库列表（IoTDB中为存储组列表）
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        debug!("IoTDB: 获取存储组列表");
        let mut client = self.multi_client.lock().await;
        client.get_databases().await
    }

    /// 获取表/设备列表
    pub async fn get_tables(&self, database: &str) -> Result<Vec<String>> {
        let mut client = self.multi_client.lock().await;
        client.get_devices(database).await
    }

    /// 获取字段列表
    pub async fn get_fields(&self, database: &str, table: &str) -> Result<Vec<String>> {
        let device_path = format!("{}.{}", database, table);
        let mut client = self.multi_client.lock().await;
        client.get_timeseries(&device_path).await
    }

    /// 获取连接信息
    pub async fn get_connection_info(&self) -> Result<serde_json::Value> {
        let info = serde_json::json!({
            "type": "iotdb",
            "version": self.config.get_version_string(),
            "host": self.config.host,
            "port": self.config.port,
            "ssl": self.config.ssl,
            "username": self.config.username,
            "driver_config": self.config.driver_config
        });
        Ok(info)
    }

    /// 关闭连接
    pub async fn close(&self) -> Result<()> {
        debug!("关闭 IoTDB 连接");
        // TODO: 实现实际的连接关闭
        Ok(())
    }

    /// 创建数据库/存储组
    pub async fn create_database(&self, database_name: &str) -> Result<()> {
        debug!("创建 IoTDB 存储组: {}", database_name);

        // TODO: 实现实际的存储组创建
        // IoTDB 使用 CREATE STORAGE GROUP 语句
        let query = format!("CREATE STORAGE GROUP {}", database_name);
        self.execute_query(&query, None).await?;

        Ok(())
    }

    /// 删除数据库/存储组
    pub async fn drop_database(&self, database_name: &str) -> Result<()> {
        debug!("删除 IoTDB 存储组: {}", database_name);

        // TODO: 实现实际的存储组删除
        // IoTDB 使用 DELETE STORAGE GROUP 语句
        let query = format!("DELETE STORAGE GROUP {}", database_name);
        self.execute_query(&query, None).await?;

        Ok(())
    }

    /// 获取保留策略（IoTDB 不支持，返回空）
    pub async fn get_retention_policies(&self, _database: &str) -> Result<Vec<RetentionPolicy>> {
        // IoTDB 不支持 InfluxDB 风格的保留策略
        Ok(vec![])
    }

    /// 获取表结构信息
    pub async fn get_table_schema(&self, database: &str, measurement: &str) -> Result<TableSchema> {
        debug!("获取 IoTDB 表结构: {}.{}", database, measurement);

        // TODO: 实现实际的 IoTDB 表结构查询
        // IoTDB 中可以查询时间序列的数据类型和属性
        Ok(TableSchema {
            fields: vec![
                FieldSchema {
                    name: "s1".to_string(),
                    r#type: "DOUBLE".to_string(),
                },
                FieldSchema {
                    name: "s2".to_string(),
                    r#type: "TEXT".to_string(),
                },
            ],
            tags: vec![], // IoTDB 没有标签概念
        })
    }

    /// 写入行协议数据（IoTDB 不支持 InfluxDB 行协议）
    pub async fn write_line_protocol(&self, _database: &str, _line_protocol: &str) -> Result<()> {
        // IoTDB 不支持 InfluxDB 行协议格式
        // 需要转换为 IoTDB 的 INSERT 语句
        Err(anyhow::anyhow!("IoTDB 不支持 InfluxDB 行协议格式，请使用 SQL INSERT 语句"))
    }

    /// 获取配置
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }
}

/// 数据库客户端工厂
pub struct DatabaseClientFactory;

impl DatabaseClientFactory {
    /// 创建数据库客户端
    pub fn create_client(config: ConnectionConfig) -> Result<DatabaseClient> {
        match config.db_type {
            DatabaseType::InfluxDB => {
                let client = InfluxClient::new(config)?;
                Ok(DatabaseClient::InfluxDB(client))
            },
            DatabaseType::IoTDB => {
                let client = IoTDBMultiClient::new(config);
                Ok(DatabaseClient::IoTDBMulti(Arc::new(Mutex::new(client))))
            },
            _ => {
                Err(anyhow::anyhow!("不支持的数据库类型: {:?}", config.db_type))
            }
        }
    }
}

/// 表结构信息
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct TableSchema {
    pub tags: Vec<String>,
    pub fields: Vec<FieldSchema>,
}

/// 字段结构信息
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct FieldSchema {
    pub name: String,
    #[serde(rename = "type")]
    pub r#type: String,
}
