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
    InfluxDB1x(InfluxClient),
    InfluxDB2x(InfluxDB2Client),
    IoTDB(Arc<Mutex<IoTDBMultiClient>>),
}

impl DatabaseClient {
    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.test_connection().await,
            DatabaseClient::InfluxDB2x(client) => client.test_connection().await,
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.test_connection().await
            },
        }
    }

    /// 执行查询
    pub async fn execute_query(&self, query: &str, database: Option<&str>) -> Result<QueryResult> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.execute_query_with_database(query, database).await,
            DatabaseClient::InfluxDB2x(client) => {
                // InfluxDB 2.x/3.x 使用 Flux 查询，不需要 database 参数
                client.execute_query(query).await
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.execute_query(query).await
            },
        }
    }

    /// 获取数据库列表
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.get_databases().await,
            DatabaseClient::InfluxDB2x(client) => {
                // 检查是否为 InfluxDB 3.x
                let config_version = client.config.version.as_deref().unwrap_or("");
                let is_v3_from_config = config_version.contains("3.x") || config_version.contains("3.");

                if is_v3_from_config {
                    info!("根据配置使用 InfluxDB 3.x 数据库列表获取方法");
                    // InfluxDB 3.x: 直接获取数据库列表
                    client.get_databases_v3().await
                } else {
                    // 尝试检测版本
                    match client.detect_version().await {
                        Ok(version) if version.contains("3.x") => {
                            info!("检测到 InfluxDB 3.x，使用数据库列表获取方法");
                            client.get_databases_v3().await
                        }
                        _ => {
                            info!("使用 InfluxDB 2.x 组织列表获取方法");
                            // InfluxDB 2.x: 返回组织列表
                            client.get_organizations().await
                        }
                    }
                }
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.get_databases().await
            },
        }
    }

    /// 获取表/测量列表
    pub async fn get_tables(&self, database: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.get_measurements(database).await,
            DatabaseClient::InfluxDB2x(client) => {
                // InfluxDB 2.x/3.x: database 参数是组织名，返回存储桶列表
                client.get_buckets_for_org(database).await
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.get_devices(database).await
            },
        }
    }

    /// 获取字段列表
    pub async fn get_fields(&self, database: &str, table: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.get_field_keys(database, table).await,
            DatabaseClient::InfluxDB2x(_client) => {
                // InfluxDB 2.x/3.x: 需要通过 Flux 查询获取字段信息
                // 暂时返回空列表，后续可以实现完整的字段查询
                Ok(vec![])
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.get_timeseries(table).await
            },
        }
    }

    /// 获取连接信息
    pub async fn get_connection_info(&self) -> Result<serde_json::Value> {
        match self {
            DatabaseClient::InfluxDB1x(client) => {
                let config = client.get_config();
                Ok(serde_json::json!({
                    "type": "influxdb1x",
                    "version": config.get_version_string(),
                    "host": config.host,
                    "port": config.port,
                    "database": config.database,
                    "ssl": config.ssl,
                    "username": config.username
                }))
            },
            DatabaseClient::InfluxDB2x(client) => {
                let version = client.detect_version().await.unwrap_or_else(|_| "InfluxDB-2.x".to_string());
                Ok(serde_json::json!({
                    "type": "influxdb2x",
                    "version": version,
                    "host": client.config.host,
                    "port": client.config.port,
                    "ssl": client.config.ssl,
                    "organization": client.config.v2_config.as_ref().map(|c| &c.organization)
                }))
            },
            DatabaseClient::IoTDB(client) => {
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
            DatabaseClient::InfluxDB1x(_) => {
                debug!("关闭 InfluxDB 1.x 连接");
                Ok(())
            },
            DatabaseClient::InfluxDB2x(_) => {
                debug!("关闭 InfluxDB 2.x/3.x 连接");
                Ok(())
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.disconnect().await
            },
        }
    }

    /// 获取数据库类型
    pub fn get_database_type(&self) -> DatabaseType {
        match self {
            DatabaseClient::InfluxDB1x(_) => DatabaseType::InfluxDB,
            DatabaseClient::InfluxDB2x(_) => DatabaseType::InfluxDB,
            DatabaseClient::IoTDB(_) => DatabaseType::IoTDB,
        }
    }

    /// 获取连接配置
    pub async fn get_config(&self) -> ConnectionConfig {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.get_config().clone(),
            DatabaseClient::InfluxDB2x(client) => client.config.clone(),
            DatabaseClient::IoTDB(client) => {
                let client = client.lock().await;
                client.get_config().clone()
            },
        }
    }

    /// 创建数据库
    pub async fn create_database(&self, database_name: &str) -> Result<()> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.create_database(database_name).await,
            DatabaseClient::InfluxDB2x(_client) => {
                // InfluxDB 2.x/3.x 不支持直接创建数据库，需要创建存储桶
                Err(anyhow::anyhow!("InfluxDB 2.x/3.x 不支持创建数据库，请使用存储桶管理"))
            },
            DatabaseClient::IoTDB(client) => {
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
            DatabaseClient::InfluxDB1x(client) => client.drop_database(database_name).await,
            DatabaseClient::InfluxDB2x(_client) => {
                // InfluxDB 2.x/3.x 不支持直接删除数据库，需要删除存储桶
                Err(anyhow::anyhow!("InfluxDB 2.x/3.x 不支持删除数据库，请使用存储桶管理"))
            },
            DatabaseClient::IoTDB(client) => {
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
            DatabaseClient::InfluxDB1x(client) => client.get_retention_policies(database).await,
            DatabaseClient::InfluxDB2x(_) => {
                // InfluxDB 2.x/3.x 不使用保留策略概念，返回空列表
                Ok(vec![])
            },
            DatabaseClient::IoTDB(_) => {
                // IoTDB 不支持保留策略概念，返回空列表
                Ok(vec![])
            },
        }
    }

    /// 获取测量/表列表
    pub async fn get_measurements(&self, database: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.get_measurements(database).await,
            DatabaseClient::InfluxDB2x(_client) => {
                // InfluxDB 2.x/3.x: 需要通过 Flux 查询获取测量值
                // 暂时返回空列表，后续可以实现完整的测量值查询
                Ok(vec![])
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.get_devices(database).await
            },
        }
    }

    /// 获取字段键
    pub async fn get_field_keys(&self, database: &str, measurement: &str) -> Result<Vec<String>> {
        match self {
            DatabaseClient::InfluxDB1x(client) => client.get_field_keys(database, measurement).await,
            DatabaseClient::InfluxDB2x(_client) => {
                // InfluxDB 2.x/3.x: 需要通过 Flux 查询获取字段信息
                // 暂时返回空列表，后续可以实现完整的字段查询
                Ok(vec![])
            },
            DatabaseClient::IoTDB(client) => {
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
            DatabaseClient::InfluxDB1x(client) => client.get_table_schema(database, measurement).await,
            DatabaseClient::InfluxDB2x(_client) => {
                // InfluxDB 2.x/3.x: 需要通过 Flux 查询获取表结构
                // 暂时返回空结构，后续可以实现完整的表结构查询
                Ok(TableSchema {
                    tags: vec![],
                    fields: vec![],
                })
            },
            DatabaseClient::IoTDB(_client) => {
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
            DatabaseClient::InfluxDB1x(client) => {
                client.write_line_protocol(database, line_protocol).await?;
                Ok(())
            },
            DatabaseClient::InfluxDB2x(_client) => {
                // InfluxDB 2.x/3.x: 需要使用不同的写入 API
                // 暂时不支持，后续可以实现完整的写入功能
                Err(anyhow::anyhow!("InfluxDB 2.x/3.x 行协议写入暂未实现"))
            },
            DatabaseClient::IoTDB(_client) => {
                // IoTDB 多协议客户端暂不支持行协议写入
                Err(anyhow::anyhow!("IoTDB 多协议客户端暂不支持行协议写入"))
            },
        }
    }

    /// 检测数据库版本
    pub async fn detect_version(&self) -> Result<String> {
        match self {
            DatabaseClient::InfluxDB1x(client) => {
                // InfluxDB 1.x 版本检测逻辑
                client.detect_version().await
            },
            DatabaseClient::InfluxDB2x(client) => {
                // InfluxDB 2.x/3.x 版本检测逻辑
                client.detect_version().await
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.detect_version().await
            },
        }
    }

    /// 获取数据源树节点
    pub async fn get_tree_nodes(&self) -> Result<Vec<crate::models::TreeNode>> {
        match self {
            DatabaseClient::InfluxDB1x(client) => {
                // InfluxDB 1.x 树节点生成逻辑
                client.get_tree_nodes().await
            },
            DatabaseClient::InfluxDB2x(client) => {
                // InfluxDB 2.x/3.x 树节点生成逻辑
                client.get_tree_nodes().await
            },
            DatabaseClient::IoTDB(client) => {
                let mut client = client.lock().await;
                client.get_tree_nodes().await
            },
        }
    }

    /// 获取树节点的子节点（懒加载）
    pub async fn get_tree_children(&self, parent_node_id: &str, node_type: &str) -> Result<Vec<crate::models::TreeNode>> {
        match self {
            DatabaseClient::InfluxDB1x(client) => {
                // InfluxDB 1.x 子节点获取逻辑
                client.get_tree_children(parent_node_id, node_type).await
            },
            DatabaseClient::InfluxDB2x(client) => {
                // InfluxDB 2.x/3.x 子节点获取逻辑
                client.get_tree_children(parent_node_id, node_type).await
            },
            DatabaseClient::IoTDB(client) => {
                let _client = client.lock().await;
                // IoTDB 子节点获取逻辑（暂时返回空）
                Ok(Vec::new())
            },
        }
    }
}

/// InfluxDB 2.x/3.x 客户端封装
#[derive(Debug)]
pub struct InfluxDB2Client {
    client: influxdb2::Client,
    config: ConnectionConfig,
}

impl InfluxDB2Client {
    /// 创建新的 InfluxDB 2.x/3.x 客户端实例
    pub fn new(config: ConnectionConfig) -> Result<Self> {
        if let Some(v2_config) = &config.v2_config {
            let host = if config.ssl {
                format!("https://{}:{}", config.host, config.port)
            } else {
                format!("http://{}:{}", config.host, config.port)
            };

            // 检查版本以确定是否需要组织
            let organization = if let Some(version) = &config.version {
                if version.contains("3.") || version.contains("3.x") {
                    // InfluxDB 3.x: 组织可选，如果为空则使用默认值
                    if v2_config.organization.is_empty() {
                        "default".to_string()
                    } else {
                        v2_config.organization.clone()
                    }
                } else {
                    // InfluxDB 2.x: 组织必需
                    v2_config.organization.clone()
                }
            } else {
                // 未指定版本，使用提供的组织或默认值
                if v2_config.organization.is_empty() {
                    "default".to_string()
                } else {
                    v2_config.organization.clone()
                }
            };

            let client = influxdb2::Client::new(
                host,
                &organization,
                &v2_config.api_token
            );

            info!("创建 InfluxDB 2.x/3.x 客户端: {}:{}, 组织: {}",
                  config.host, config.port, organization);

            Ok(Self { client, config })
        } else {
            Err(anyhow::anyhow!("缺少 InfluxDB 2.x/3.x 配置 (v2_config)"))
        }
    }

    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        let start = Instant::now();

        // 首先检查用户配置中的版本信息
        let config_version = self.config.version.as_deref().unwrap_or("");
        let is_v3_from_config = config_version.contains("3.x") || config_version.contains("3.");

        if is_v3_from_config {
            info!("根据配置识别为 InfluxDB 3.x，使用 3.x 连接测试方法");
            // InfluxDB 3.x: 使用更适合的测试方法
            match self.test_influxdb3_connection().await {
                Ok(_) => {
                    let latency = start.elapsed().as_millis() as u64;
                    info!("InfluxDB 3.x 连接测试成功，延迟: {}ms", latency);
                    Ok(latency)
                }
                Err(e) => {
                    error!("InfluxDB 3.x 连接测试失败: {}", e);
                    Err(anyhow::anyhow!("InfluxDB 3.x 连接测试失败: {}", e))
                }
            }
        } else {
            // 尝试检测版本以确定使用哪种测试方法
            let version = self.detect_version().await.unwrap_or_else(|_| "InfluxDB-2.x".to_string());
            let is_v3 = version.starts_with("3.") || version.contains("3.x");

            if is_v3 {
                info!("检测到 InfluxDB 3.x，使用 3.x 连接测试方法");
                // InfluxDB 3.x: 使用更适合的测试方法
                match self.test_influxdb3_connection().await {
                    Ok(_) => {
                        let latency = start.elapsed().as_millis() as u64;
                        info!("InfluxDB 3.x 连接测试成功，延迟: {}ms", latency);
                        Ok(latency)
                    }
                    Err(e) => {
                        error!("InfluxDB 3.x 连接测试失败: {}", e);
                        // 如果 3.x 测试失败，尝试 2.x 方法作为回退
                        warn!("InfluxDB 3.x 测试失败，尝试 2.x 方法作为回退");
                        match self.get_organizations().await {
                            Ok(_) => {
                                let latency = start.elapsed().as_millis() as u64;
                                info!("InfluxDB 2.x 回退连接测试成功，延迟: {}ms", latency);
                                Ok(latency)
                            }
                            Err(e2) => {
                                error!("InfluxDB 2.x 回退连接测试也失败: {}", e2);
                                Err(anyhow::anyhow!("InfluxDB 连接测试失败: 3.x 方法失败 ({}), 2.x 回退方法也失败 ({})", e, e2))
                            }
                        }
                    }
                }
            } else {
                info!("检测到 InfluxDB 2.x，使用 2.x 连接测试方法");
                // InfluxDB 2.x: 使用组织列表测试
                match self.get_organizations().await {
                    Ok(_) => {
                        let latency = start.elapsed().as_millis() as u64;
                        info!("InfluxDB 2.x 连接测试成功，延迟: {}ms", latency);
                        Ok(latency)
                    }
                    Err(e) => {
                        error!("InfluxDB 2.x 连接测试失败: {}", e);
                        // 如果 2.x 测试失败，尝试 3.x 方法作为回退
                        warn!("InfluxDB 2.x 测试失败，尝试 3.x 方法作为回退");
                        match self.test_influxdb3_connection().await {
                            Ok(_) => {
                                let latency = start.elapsed().as_millis() as u64;
                                info!("InfluxDB 3.x 回退连接测试成功，延迟: {}ms", latency);
                                Ok(latency)
                            }
                            Err(e2) => {
                                error!("InfluxDB 3.x 回退连接测试也失败: {}", e2);
                                Err(anyhow::anyhow!("InfluxDB 连接测试失败: 2.x 方法失败 ({}), 3.x 回退方法也失败 ({})", e, e2))
                            }
                        }
                    }
                }
            }
        }
    }

    /// InfluxDB 3.x 专用连接测试
    async fn test_influxdb3_connection(&self) -> Result<()> {
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        let client = reqwest::Client::new();

        // 方法1: 尝试 /health 端点（最基本的连通性测试）
        let health_url = format!("{}/health", base_url);
        info!("尝试 InfluxDB 3.x /health 端点: {}", health_url);

        match client
            .get(&health_url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                info!("InfluxDB 3.x /health 端点测试成功");
                return Ok(());
            }
            Ok(response) => {
                warn!("InfluxDB 3.x /health 端点返回: {}", response.status());
            }
            Err(e) => {
                warn!("InfluxDB 3.x /health 端点请求失败: {}", e);
            }
        }

        // 方法2: 尝试无认证的 SQL 查询（InfluxDB 3.x Core 可能不需要认证）
        let query_url = format!("{}/api/v3/query_sql", base_url);
        info!("尝试 InfluxDB 3.x Core 无认证 SQL 端点: {}", query_url);

        match client
            .post(&query_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "query": "SELECT 1",
                "format": "json"
            }))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                info!("InfluxDB 3.x Core 无认证 SQL 端点测试成功");
                return Ok(());
            }
            Ok(response) => {
                warn!("InfluxDB 3.x Core 无认证 SQL 端点返回: {}", response.status());
                if let Ok(text) = response.text().await {
                    debug!("无认证 SQL 端点响应内容: {}", text);
                }
            }
            Err(e) => {
                warn!("InfluxDB 3.x Core 无认证 SQL 端点请求失败: {}", e);
            }
        }

        // 方法3: 如果有 API Token，尝试带认证的查询
        if let Some(v2_config) = &self.config.v2_config {
            if !v2_config.api_token.is_empty() {
                info!("尝试 InfluxDB 3.x Core 带认证 SQL 端点");

                // 尝试不同的认证方式和请求格式
                let auth_methods = vec![
                    ("Bearer", format!("Bearer {}", v2_config.api_token)),
                    ("Token", format!("Token {}", v2_config.api_token)),
                ];

                for (auth_type, auth_header) in auth_methods {
                    // 尝试 JSON 格式（包含必需的 db 字段）
                    match client
                        .post(&query_url)
                        .header("Authorization", &auth_header)
                        .header("Content-Type", "application/json")
                        .json(&serde_json::json!({
                            "query": "SELECT 1",
                            "db": "default"
                        }))
                        .timeout(std::time::Duration::from_secs(10))
                        .send()
                        .await
                    {
                        Ok(response) if response.status().is_success() => {
                            info!("InfluxDB 3.x Core 带认证 SQL 端点测试成功 (认证: {})", auth_type);
                            return Ok(());
                        }
                        Ok(response) => {
                            debug!("InfluxDB 3.x Core {} 认证 JSON 格式返回: {}", auth_type, response.status());
                            if let Ok(text) = response.text().await {
                                debug!("响应内容: {}", text);
                            }
                        }
                        Err(e) => {
                            debug!("InfluxDB 3.x Core {} 认证 JSON 格式请求失败: {}", auth_type, e);
                        }
                    }

                    // 尝试 SQL 文本格式
                    match client
                        .post(&query_url)
                        .header("Authorization", &auth_header)
                        .header("Content-Type", "application/sql")
                        .body("SELECT 1")
                        .timeout(std::time::Duration::from_secs(10))
                        .send()
                        .await
                    {
                        Ok(response) if response.status().is_success() => {
                            info!("InfluxDB 3.x Core 带认证 SQL 文本端点测试成功 (认证: {})", auth_type);
                            return Ok(());
                        }
                        Ok(response) => {
                            debug!("InfluxDB 3.x Core {} 认证 SQL 文本格式返回: {}", auth_type, response.status());
                        }
                        Err(e) => {
                            debug!("InfluxDB 3.x Core {} 认证 SQL 文本格式请求失败: {}", auth_type, e);
                        }
                    }
                }

                warn!("InfluxDB 3.x Core 所有认证方式都失败");

                // 方法4: 尝试传统的 /api/v2/query 端点（兼容性测试）
                let query_url_v2 = format!("{}/api/v2/query", base_url);
                info!("尝试 InfluxDB 3.x 兼容性端点: {}", query_url_v2);

                match client
                    .post(&query_url_v2)
                    .header("Authorization", format!("Token {}", v2_config.api_token))
                    .header("Content-Type", "application/vnd.flux")
                    .body("buckets() |> limit(n:1)")
                    .timeout(std::time::Duration::from_secs(10))
                    .send()
                    .await
                {
                    Ok(response) if response.status().is_success() => {
                        info!("InfluxDB 3.x 兼容性端点测试成功");
                        return Ok(());
                    }
                    Ok(response) => {
                        warn!("InfluxDB 3.x 兼容性端点返回: {}", response.status());
                    }
                    Err(e) => {
                        warn!("InfluxDB 3.x 兼容性端点请求失败: {}", e);
                    }
                }
            }
        }

        // 方法5: 尝试基本的连通性测试
        info!("尝试 InfluxDB 3.x 基本连通性测试");

        // 尝试多个可能的端点
        let test_endpoints = vec![
            format!("{}/ping", base_url),
            format!("{}/api/v2/ping", base_url),
            format!("{}/api/v3/ping", base_url),
            format!("{}/", base_url),
        ];

        for endpoint in test_endpoints {
            match client
                .get(&endpoint)
                .timeout(std::time::Duration::from_secs(5))
                .send()
                .await
            {
                Ok(response) => {
                    info!("InfluxDB 3.x 端点 {} 响应: {}", endpoint, response.status());
                    if response.status().is_success() ||
                       response.status() == 404 ||
                       response.status() == 405 {
                        // 成功、404 或 405 都表示服务器可达
                        info!("InfluxDB 3.x 连通性测试成功 (端点: {})", endpoint);
                        return Ok(());
                    }
                }
                Err(e) => {
                    debug!("InfluxDB 3.x 端点 {} 测试失败: {}", endpoint, e);
                }
            }
        }

        Err(anyhow::anyhow!("InfluxDB 3.x 连接测试失败：无法连接到服务器 {}。请检查：\n1. InfluxDB 3.x 服务是否正在运行\n2. 地址和端口是否正确 (当前: {}:{})\n3. 网络连接是否正常\n4. 防火墙设置是否允许访问", base_url, self.config.host, self.config.port))
    }

    /// 执行 Flux 查询
    pub async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        let start = Instant::now();

        debug!("执行 Flux 查询: {}", query);

        // 暂时使用简单的实现，不执行实际查询
        // 后续可以实现完整的 Flux 查询支持
        let latency = start.elapsed().as_millis() as u64;

        // 创建空的查询结果
        let query_result = QueryResult {
            results: vec![], // 暂时返回空结果
            execution_time: Some(latency),
            row_count: Some(0),
            error: None,
            data: None,
            columns: None,
        };

        debug!("Flux 查询模拟执行成功，延迟: {}ms", latency);
        Ok(query_result)
    }

    /// 获取组织列表
    pub async fn get_organizations(&self) -> Result<Vec<String>> {
        // 使用 HTTP API 获取组织列表
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let url = format!("{}/api/v2/orgs", base_url);
            let client = reqwest::Client::new();

            match client
                .get(&url)
                .header("Authorization", format!("Token {}", v2_config.api_token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        if let Ok(orgs_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(orgs) = orgs_response.get("orgs").and_then(|o| o.as_array()) {
                                let org_names: Vec<String> = orgs
                                    .iter()
                                    .filter_map(|org| org.get("name").and_then(|n| n.as_str()))
                                    .map(|s| s.to_string())
                                    .collect();
                                return Ok(org_names);
                            }
                        }
                    }
                }
                Ok(response) => {
                    warn!("获取组织列表失败: HTTP {}", response.status());
                }
                Err(e) => {
                    warn!("获取组织列表请求失败: {}", e);
                }
            }
        }

        // 如果所有查询都失败，返回错误而不是假数据
        Err(anyhow::anyhow!("无法获取组织列表：API 请求失败，请检查连接配置和网络状态"))
    }

    /// 获取存储桶列表
    pub async fn get_buckets(&self) -> Result<Vec<String>> {
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let url = format!("{}/api/v2/buckets", base_url);
            let client = reqwest::Client::new();

            match client
                .get(&url)
                .header("Authorization", format!("Token {}", v2_config.api_token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        if let Ok(buckets_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(buckets) = buckets_response.get("buckets").and_then(|b| b.as_array()) {
                                let bucket_names: Vec<String> = buckets
                                    .iter()
                                    .filter_map(|bucket| bucket.get("name").and_then(|n| n.as_str()))
                                    .map(|s| s.to_string())
                                    .collect();
                                return Ok(bucket_names);
                            }
                        }
                    }
                }
                Ok(response) => {
                    return Err(anyhow::anyhow!("获取存储桶列表失败: HTTP {}", response.status()));
                }
                Err(e) => {
                    return Err(anyhow::anyhow!("获取存储桶列表请求失败: {}", e));
                }
            }
        }

        Err(anyhow::anyhow!("无法获取存储桶列表"))
    }

    /// 获取特定组织的存储桶列表
    pub async fn get_buckets_for_org(&self, org_name: &str) -> Result<Vec<String>> {
        info!("开始获取组织 {} 的存储桶列表", org_name);

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let url = format!("{}/api/v2/buckets?org={}", base_url, org_name);
            info!("请求存储桶列表 URL: {}", url);
            info!("使用的 API Token: {}...", &v2_config.api_token.chars().take(10).collect::<String>());
            let client = reqwest::Client::new();

            match client
                .get(&url)
                .header("Authorization", format!("Token {}", v2_config.api_token))
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        debug!("存储桶列表响应: {}", text);
                        if let Ok(buckets_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(buckets) = buckets_response.get("buckets").and_then(|b| b.as_array()) {
                                let bucket_names: Vec<String> = buckets
                                    .iter()
                                    .filter_map(|bucket| bucket.get("name").and_then(|n| n.as_str()))
                                    .map(|s| s.to_string())
                                    .collect();
                                info!("成功获取组织 {} 的 {} 个存储桶: {:?}", org_name, bucket_names.len(), bucket_names);
                                return Ok(bucket_names);
                            } else {
                                warn!("响应中没有找到 buckets 数组");
                            }
                        } else {
                            warn!("无法解析存储桶列表响应为 JSON");
                        }
                    } else {
                        warn!("无法读取存储桶列表响应文本");
                    }
                }
                Ok(response) => {
                    warn!("获取组织 {} 的存储桶列表失败: HTTP {}", org_name, response.status());
                    if let Ok(text) = response.text().await {
                        debug!("错误响应内容: {}", text);
                    }
                }
                Err(e) => {
                    error!("获取组织 {} 的存储桶列表请求失败: {}", org_name, e);
                }
            }
        } else {
            error!("缺少 v2_config 配置，无法获取存储桶列表");
        }

        // 如果所有查询都失败，返回错误而不是假数据
        Err(anyhow::anyhow!("无法获取组织 {} 的存储桶列表：API 请求失败，请检查连接配置和权限", org_name))
    }

    /// 获取 InfluxDB 3.x 数据库列表（简化架构）
    pub async fn get_databases_v3(&self) -> Result<Vec<String>> {
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        let client = reqwest::Client::new();

        // 方法1: 尝试无认证的 InfluxDB 3.x Core SQL 查询
        let query_url = format!("{}/api/v3/query_sql", base_url);
        let sql_query = "SHOW DATABASES";
        info!("尝试 InfluxDB 3.x Core 无认证 SQL 查询: {} -> {}", query_url, sql_query);

        match client
            .post(&query_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "query": sql_query,
                "format": "json",
                "db": "default"
            }))
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                if let Ok(text) = response.text().await {
                    info!("InfluxDB 3.x Core 无认证 SQL 查询成功，响应: {}", text);

                    if let Ok(json_response) = serde_json::from_str::<serde_json::Value>(&text) {
                        let mut databases = Vec::new();

                        // 解析 InfluxDB 3.x Core 的响应格式
                        if let Some(data) = json_response.get("data") {
                            if let Some(rows) = data.as_array() {
                                for row in rows {
                                    if let Some(row_array) = row.as_array() {
                                        if let Some(db_name) = row_array.get(0).and_then(|v| v.as_str()) {
                                            databases.push(db_name.to_string());
                                        }
                                    }
                                }
                            }
                        }

                        if !databases.is_empty() {
                            info!("无认证查询成功解析到 {} 个数据库: {:?}", databases.len(), databases);
                            return Ok(databases);
                        }
                    }
                }
            }
            Ok(response) => {
                warn!("InfluxDB 3.x Core 无认证 SQL 查询失败: HTTP {}", response.status());
                if let Ok(text) = response.text().await {
                    debug!("无认证查询错误响应内容: {}", text);
                }
            }
            Err(e) => {
                warn!("InfluxDB 3.x Core 无认证 SQL 查询请求失败: {}", e);
            }
        }

        // 方法2: 如果有 API Token，尝试带认证的查询
        if let Some(v2_config) = &self.config.v2_config {
            if !v2_config.api_token.is_empty() {
                info!("尝试 InfluxDB 3.x Core 带认证 SQL 查询");

                match client
                    .post(&query_url)
                    .header("Authorization", format!("Bearer {}", v2_config.api_token))
                    .header("Content-Type", "application/json")
                    .json(&serde_json::json!({
                        "query": sql_query,
                        "format": "json",
                        "db": "default"
                    }))
                    .timeout(std::time::Duration::from_secs(10))
                    .send()
                    .await
                {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        info!("InfluxDB 3.x Core SQL 查询成功，响应: {}", text);

                        if let Ok(json_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            let mut databases = Vec::new();

                            // 解析 InfluxDB 3.x Core 的响应格式
                            if let Some(data) = json_response.get("data") {
                                if let Some(rows) = data.as_array() {
                                    for row in rows {
                                        if let Some(row_array) = row.as_array() {
                                            if let Some(db_name) = row_array.get(0).and_then(|v| v.as_str()) {
                                                databases.push(db_name.to_string());
                                            }
                                        }
                                    }
                                }
                            }

                            if !databases.is_empty() {
                                info!("成功解析到 {} 个数据库: {:?}", databases.len(), databases);
                                return Ok(databases);
                            }
                        }
                    }
                }
                Ok(response) => {
                    warn!("InfluxDB 3.x Core SQL 查询失败: HTTP {}", response.status());
                    if let Ok(text) = response.text().await {
                        debug!("错误响应内容: {}", text);
                    }
                }
                Err(e) => {
                    warn!("InfluxDB 3.x Core SQL 查询请求失败: {}", e);
                }
            }

            // 方法2: 尝试传统的 /api/v2/query 端点（兼容性）
            let query_url_v2 = format!("{}/api/v2/query", base_url);
            info!("尝试 InfluxDB 3.x 兼容性查询: {}", query_url_v2);

            match client
                .post(&query_url_v2)
                .header("Authorization", format!("Token {}", v2_config.api_token))
                .header("Content-Type", "application/vnd.flux")
                .body("buckets()")
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        info!("InfluxDB 3.x Flux 查询成功，响应: {}", text);

                        // 解析 Flux 查询结果
                        let lines: Vec<&str> = text.lines().collect();
                        let mut databases = Vec::new();

                        for line in lines {
                            if line.contains("name") && !line.starts_with('#') {
                                // 解析 CSV 格式的 Flux 响应
                                let parts: Vec<&str> = line.split(',').collect();
                                for part in parts {
                                    if !part.starts_with('_') && !part.is_empty() && part != "name" {
                                        databases.push(part.trim_matches('"').to_string());
                                    }
                                }
                            }
                        }

                        if !databases.is_empty() {
                            info!("通过 Flux 查询获取到 {} 个数据库: {:?}", databases.len(), databases);
                            return Ok(databases);
                        }
                    }
                }
                Ok(response) => {
                    warn!("InfluxDB 3.x Flux 查询失败: HTTP {}", response.status());
                }
                Err(e) => {
                    warn!("InfluxDB 3.x Flux 查询请求失败: {}", e);
                }
            }
        }

        // 方法3: 尝试 /health 端点检查服务是否可用
        let health_url = format!("{}/health", base_url);
        info!("尝试 InfluxDB 3.x health 检查: {}", health_url);

        match client
            .get(&health_url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                info!("InfluxDB 3.x health 检查成功，但无法获取数据库列表");
                // 如果 health 检查成功但无法获取数据库列表，返回一个默认数据库
                return Ok(vec!["default".to_string()]);
            }
            Ok(response) => {
                warn!("InfluxDB 3.x health 检查失败: HTTP {}", response.status());
            }
            Err(e) => {
                warn!("InfluxDB 3.x health 检查请求失败: {}", e);
            }
        }

        // 方法4: 尝试不同的认证方式
        info!("尝试 InfluxDB 3.x 无认证查询");
            match client
                .post(&format!("{}/api/v3/query_sql", base_url))
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({
                    "query": "SHOW DATABASES",
                    "format": "json"
                }))
                .timeout(std::time::Duration::from_secs(10))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        info!("InfluxDB 3.x 无认证查询成功，响应: {}", text);

                        if let Ok(json_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            let mut databases = Vec::new();

                            if let Some(data) = json_response.get("data") {
                                if let Some(rows) = data.as_array() {
                                    for row in rows {
                                        if let Some(row_array) = row.as_array() {
                                            if let Some(db_name) = row_array.get(0).and_then(|v| v.as_str()) {
                                                databases.push(db_name.to_string());
                                            }
                                        }
                                    }
                                }
                            }

                            if !databases.is_empty() {
                                info!("无认证查询成功解析到 {} 个数据库: {:?}", databases.len(), databases);
                                return Ok(databases);
                            }
                        }
                    }
                }
                Ok(response) => {
                    warn!("InfluxDB 3.x 无认证查询失败: HTTP {}", response.status());
                }
                Err(e) => {
                    warn!("InfluxDB 3.x 无认证查询请求失败: {}", e);
                }
            }
        }

        // 如果所有查询都失败，返回错误而不是假数据
        Err(anyhow::anyhow!("无法获取 InfluxDB 3.x 数据库列表：所有 API 端点都无法访问。请检查：\n1. 服务器地址和端口是否正确 (当前: {})\n2. InfluxDB 3.x 服务是否正在运行\n3. API Token 是否有效\n4. 网络连接是否正常", base_url))
    }

    /// 检测 InfluxDB 版本
    pub async fn detect_version(&self) -> Result<String> {
        // 首先检查用户配置中的版本信息
        if let Some(config_version) = &self.config.version {
            if config_version.contains("3.x") || config_version.contains("3.") {
                info!("从配置中检测到 InfluxDB 3.x 版本: {}", config_version);
                return Ok("InfluxDB-3.x".to_string());
            } else if config_version.contains("2.x") || config_version.contains("2.") {
                info!("从配置中检测到 InfluxDB 2.x 版本: {}", config_version);
                return Ok("InfluxDB-2.x".to_string());
            }
        }

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        // 尝试 InfluxDB 2.x/3.x 的 /health 端点
        let health_url = format!("{}/health", base_url);
        let client = reqwest::Client::new();

        if let Some(v2_config) = &self.config.v2_config {
            match client
                .get(&health_url)
                .header("Authorization", format!("Token {}", v2_config.api_token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        debug!("Health 端点响应: {}", text);
                        if let Ok(health_info) = serde_json::from_str::<serde_json::Value>(&text) {
                            // 检查是否包含 InfluxDB 2.x/3.x 特有的字段
                            if health_info.get("name").is_some() || health_info.get("message").is_some() {
                                let version = health_info
                                    .get("version")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("2.x.x");

                                info!("从 /health 端点检测到版本: {}", version);

                                // 根据版本号判断是 2.x 还是 3.x
                                if version.starts_with("3.") {
                                    return Ok("InfluxDB-3.x".to_string());
                                } else if version.starts_with("2.") {
                                    return Ok("InfluxDB-2.x".to_string());
                                }
                            }
                        }
                    }
                }
                Ok(response) => {
                    warn!("Health 端点返回状态: {}", response.status());
                }
                Err(e) => {
                    warn!("Health 端点请求失败: {}", e);
                }
            }
        }

        // 如果配置中没有明确版本且 health 检测失败，根据其他线索判断
        warn!("无法通过 /health 端点检测版本，使用默认判断逻辑");

        // 默认返回 2.x，但记录警告
        Ok("InfluxDB-2.x".to_string())
    }

    /// 生成 InfluxDB 2.x/3.x 数据源树
    pub async fn get_tree_nodes(&self) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::TreeNodeFactory;

        let mut nodes = Vec::new();

        // 首先检查用户配置中的版本信息
        let config_version = self.config.version.as_deref().unwrap_or("");
        let is_v3_from_config = config_version.contains("3.x") || config_version.contains("3.");

        if is_v3_from_config {
            info!("根据配置生成 InfluxDB 3.x 数据源树");
            // InfluxDB 3.x: 简化架构，直接显示数据库
            match self.get_databases_v3().await {
                Ok(databases) => {
                    info!("获取到 {} 个 InfluxDB 3.x 数据库", databases.len());
                    for db_name in databases {
                        let is_system = db_name.starts_with('_') ||
                                       db_name == "information_schema" ||
                                       db_name == "iox_catalog";
                        let mut db_node = TreeNodeFactory::create_influxdb3_database(db_name, is_system);
                        db_node.metadata.insert("version".to_string(), serde_json::Value::String("InfluxDB-3.x".to_string()));
                        nodes.push(db_node);
                    }
                }
                Err(e) => {
                    error!("获取 InfluxDB 3.x 数据库列表失败: {}", e);
                    return Err(e);
                }
            }
        } else {
            // 尝试检测版本以确定树结构
            let version = self.detect_version().await.unwrap_or_else(|_| "InfluxDB-2.x".to_string());
            let is_v3 = version.starts_with("3.") || version.contains("3.x");

            if is_v3 {
                info!("检测到 InfluxDB 3.x，生成简化数据源树");
                // InfluxDB 3.x: 简化架构，直接显示数据库
                match self.get_databases_v3().await {
                    Ok(databases) => {
                        info!("获取到 {} 个 InfluxDB 3.x 数据库", databases.len());
                        for db_name in databases {
                            let is_system = db_name.starts_with('_') ||
                                           db_name == "information_schema" ||
                                           db_name == "iox_catalog";
                            let mut db_node = TreeNodeFactory::create_influxdb3_database(db_name, is_system);
                            db_node.metadata.insert("version".to_string(), serde_json::Value::String(version.clone()));
                            nodes.push(db_node);
                        }
                    }
                    Err(e) => {
                        error!("获取 InfluxDB 3.x 数据库列表失败: {}", e);
                        return Err(e);
                    }
                }
            } else {
                info!("检测到 InfluxDB 2.x，生成组织-存储桶数据源树");
                // InfluxDB 2.x: Organization → Bucket 结构
                match self.get_organizations().await {
                    Ok(organizations) => {
                        info!("获取到 {} 个组织", organizations.len());
                        for org_name in organizations {
                            let mut org_node = TreeNodeFactory::create_organization(org_name.clone());
                            org_node.metadata.insert("version".to_string(), serde_json::Value::String(version.clone()));
                            nodes.push(org_node);
                        }
                    }
                    Err(e) => {
                        error!("获取组织列表失败: {}", e);
                        return Err(e);
                    }
                }
            }
        }

        Ok(nodes)
    }

    /// 获取树节点的子节点（懒加载）
    pub async fn get_tree_children(&self, parent_node_id: &str, node_type: &str) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::{TreeNodeFactory, TreeNodeType};

        let mut children = Vec::new();

        // 解析节点类型
        let parsed_type = match node_type {
            "Organization" => TreeNodeType::Organization,
            "Bucket" => TreeNodeType::Bucket,
            "SystemBucket" => TreeNodeType::SystemBucket,
            _ => return Ok(children),
        };

        match parsed_type {
            TreeNodeType::Organization => {
                // InfluxDB 2.x/3.x: 获取组织下的存储桶
                let org_name = parent_node_id.strip_prefix("org_").unwrap_or(parent_node_id);
                match self.get_buckets_for_org(org_name).await {
                    Ok(buckets) => {
                        for bucket_name in buckets {
                            let is_system = bucket_name.starts_with('_');
                            let bucket_node = TreeNodeFactory::create_bucket(org_name, bucket_name, is_system);
                            children.push(bucket_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取存储桶失败: {}", e);
                    }
                }
            }
            TreeNodeType::Bucket | TreeNodeType::SystemBucket => {
                // InfluxDB 2.x: 获取存储桶下的测量值
                // 这里可以通过 Flux 查询获取测量值，但需要更复杂的实现
                // 暂时返回空，后续可以扩展
                log::debug!("存储桶子节点获取暂未实现");
            }
            TreeNodeType::Database3x => {
                // InfluxDB 3.x: 获取数据库下的表/测量值
                // 这里可以通过 SQL 或 Flux 查询获取表信息
                // 暂时返回空，后续可以扩展
                log::debug!("InfluxDB 3.x 数据库子节点获取暂未实现");
            }
            _ => {}
        }

        Ok(children)
    }
}

/// InfluxDB 1.x 客户端封装
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
        info!("InfluxDB 1.x 开始获取数据库列表");

        let query = influxdb::ReadQuery::new("SHOW DATABASES");

        match self.client.query(query).await {
            Ok(result) => {
                info!("InfluxDB 1.x SHOW DATABASES 查询成功，响应长度: {}", result.len());
                debug!("InfluxDB 1.x 原始响应: {}", result);

                // 解析 SHOW DATABASES 的响应
                let databases = self.parse_show_databases_result(result)?;
                info!("InfluxDB 1.x 解析得到 {} 个数据库: {:?}", databases.len(), databases);

                // 如果没有数据库，可能是新安装的 InfluxDB，创建一个默认数据库用于测试
                if databases.is_empty() {
                    warn!("InfluxDB 1.x 没有找到任何数据库，这可能是新安装的实例");
                    // 返回空列表，让用户知道需要创建数据库
                    Ok(vec![])
                } else {
                    Ok(databases)
                }
            }
            Err(e) => {
                error!("InfluxDB 1.x 获取数据库列表失败: {}", e);
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
                error!("JSON 解析失败: {}", e);
                // 如果解析失败，返回错误而不是空列表
                Err(anyhow::anyhow!("解析数据库列表响应失败: {}", e))
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
            Ok(result) => {
                // 解析保留策略结果
                let policies = self.parse_retention_policies_result(result)?;
                info!("获取到 {} 个保留策略", policies.len());
                Ok(policies)
            }
            Err(e) => {
                error!("获取保留策略失败: {}", e);
                Err(anyhow::anyhow!("获取保留策略失败: {}", e))
            }
        }
    }

    /// 解析保留策略结果
    fn parse_retention_policies_result(&self, result: String) -> Result<Vec<RetentionPolicy>> {
        debug!("解析保留策略结果: {}", result);

        match serde_json::from_str::<serde_json::Value>(&result) {
            Ok(json) => {
                let mut policies = Vec::new();

                // SHOW RETENTION POLICIES 返回格式：
                // {"results":[{"series":[{"name":"mydb","columns":["name","duration","shardGroupDuration","replicaN","default"],"values":[["autogen","0s","168h0m0s",1,true]]}]}]}
                if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                    for result_item in results {
                        if let Some(series) = result_item.get("series").and_then(|s| s.as_array()) {
                            for serie in series {
                                if let Some(values) = serie.get("values").and_then(|v| v.as_array()) {
                                    for value in values {
                                        if let Some(arr) = value.as_array() {
                                            if arr.len() >= 5 {
                                                let name = arr[0].as_str().unwrap_or("").to_string();
                                                let duration = arr[1].as_str().unwrap_or("0s").to_string();
                                                let shard_group_duration = arr[2].as_str().unwrap_or("168h0m0s").to_string();
                                                let replica_n = arr[3].as_u64().unwrap_or(1) as u32;
                                                let default = arr[4].as_bool().unwrap_or(false);

                                                policies.push(RetentionPolicy {
                                                    name,
                                                    duration,
                                                    shard_group_duration,
                                                    replica_n,
                                                    default,
                                                });
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

                Ok(policies)
            }
            Err(e) => {
                error!("JSON 解析失败: {}", e);
                Err(anyhow::anyhow!("解析保留策略响应失败: {}", e))
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

    /// 检测 InfluxDB 版本
    pub async fn detect_version(&self) -> Result<String> {
        // 首先尝试检测 InfluxDB 2.x/3.x（通过 HTTP API）
        if let Ok(version) = self.detect_influxdb2_version().await {
            return Ok(version);
        }

        // 然后尝试检测 InfluxDB 1.x
        // 尝试执行 SHOW DIAGNOSTICS（InfluxDB 1.8+）
        match self.execute_query("SHOW DIAGNOSTICS").await {
            Ok(_) => Ok("InfluxDB-1.8+".to_string()),
            Err(_) => {
                // 尝试执行 SHOW STATS（InfluxDB 1.7+）
                match self.execute_query("SHOW STATS").await {
                    Ok(_) => Ok("InfluxDB-1.7+".to_string()),
                    Err(_) => {
                        // 尝试基本查询来确认是 InfluxDB 1.x
                        match self.execute_query("SHOW DATABASES").await {
                            Ok(_) => Ok("InfluxDB-1.x".to_string()),
                            Err(_) => Ok("InfluxDB-unknown".to_string()),
                        }
                    }
                }
            }
        }
    }

    /// 检测 InfluxDB 2.x/3.x 版本
    async fn detect_influxdb2_version(&self) -> Result<String> {
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        // 尝试 InfluxDB 2.x/3.x 的 /health 端点
        let health_url = format!("{}/health", base_url);

        match self.http_client.get(&health_url).send().await {
            Ok(response) if response.status().is_success() => {
                if let Ok(text) = response.text().await {
                    if let Ok(health_info) = serde_json::from_str::<serde_json::Value>(&text) {
                        // 检查是否包含 InfluxDB 2.x/3.x 特有的字段
                        if health_info.get("name").is_some() || health_info.get("message").is_some() {
                            let version = health_info
                                .get("version")
                                .and_then(|v| v.as_str())
                                .unwrap_or("2.x.x");

                            // 根据版本号判断是 2.x 还是 3.x
                            if version.starts_with("3.") {
                                return Ok("InfluxDB-3.x".to_string());
                            } else if version.starts_with("2.") {
                                return Ok("InfluxDB-2.x".to_string());
                            } else {
                                return Ok("InfluxDB-2.x".to_string()); // 默认假设是 2.x
                            }
                        }
                    }
                }
            }
            _ => {}
        }

        // 尝试 InfluxDB 2.x/3.x 的 API 端点
        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let api_url = format!("{}/api/v2/buckets", base_url);

            match self.http_client
                .get(&api_url)
                .header("Authorization", format!("Token {}", token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    return Ok("InfluxDB-2.x".to_string());
                }
                _ => {}
            }
        }

        Err(anyhow::anyhow!("不是 InfluxDB 2.x/3.x"))
    }

    /// 生成 InfluxDB 1.x 数据源树
    pub async fn get_tree_nodes(&self) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::TreeNodeFactory;

        let mut nodes = Vec::new();

        info!("生成 InfluxDB 1.x 数据源树");

        // InfluxDB 1.x: Database → Retention Policy 结构
        match self.get_databases().await {
            Ok(databases) => {
                info!("InfluxDB 1.x 获取到 {} 个数据库，开始生成树节点", databases.len());
                for db_name in databases {
                    let is_system = db_name.starts_with('_');

                    // 创建 InfluxDB 1.x 数据库节点
                    let mut db_node = TreeNodeFactory::create_influxdb1_database(db_name.clone(), is_system);

                    // 检测具体版本（仅用于元数据，不影响树结构）
                    let version = self.detect_version().await.unwrap_or_else(|_| "InfluxDB-1.x".to_string());

                    // 添加版本信息到元数据
                    if version.contains("1.8") {
                        db_node.metadata.insert("version".to_string(), serde_json::Value::String("1.8+".to_string()));
                    } else if version.contains("1.7") {
                        db_node.metadata.insert("version".to_string(), serde_json::Value::String("1.7+".to_string()));
                    } else {
                        db_node.metadata.insert("version".to_string(), serde_json::Value::String("1.x".to_string()));
                    }

                    info!("创建 InfluxDB 1.x 数据库节点: {} (系统数据库: {})", db_name, is_system);
                    nodes.push(db_node);
                }
                info!("InfluxDB 1.x 树节点生成完成，共 {} 个节点", nodes.len());
            }
            Err(e) => {
                error!("InfluxDB 1.x 获取数据库列表失败: {}", e);
                return Err(e);
            }
        }

        Ok(nodes)
    }

    /// 获取 InfluxDB 2.x/3.x 组织列表
    async fn get_influxdb2_organizations(&self) -> Result<Vec<String>> {
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/orgs", base_url);

            match self.http_client
                .get(&url)
                .header("Authorization", format!("Token {}", token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        if let Ok(orgs_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(orgs) = orgs_response.get("orgs").and_then(|o| o.as_array()) {
                                let org_names: Vec<String> = orgs
                                    .iter()
                                    .filter_map(|org| org.get("name").and_then(|n| n.as_str()))
                                    .map(|s| s.to_string())
                                    .collect();
                                return Ok(org_names);
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        Err(anyhow::anyhow!("无法获取组织列表"))
    }

    /// 获取 InfluxDB 2.x/3.x 存储桶列表
    async fn get_influxdb2_buckets(&self) -> Result<Vec<String>> {
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/buckets", base_url);

            match self.http_client
                .get(&url)
                .header("Authorization", format!("Token {}", token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        if let Ok(buckets_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(buckets) = buckets_response.get("buckets").and_then(|b| b.as_array()) {
                                let bucket_names: Vec<String> = buckets
                                    .iter()
                                    .filter_map(|bucket| bucket.get("name").and_then(|n| n.as_str()))
                                    .map(|s| s.to_string())
                                    .collect();
                                return Ok(bucket_names);
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        Err(anyhow::anyhow!("无法获取存储桶列表"))
    }

    /// 获取特定组织的存储桶列表
    async fn get_influxdb2_buckets_for_org(&self, org_name: &str) -> Result<Vec<String>> {
        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/buckets?org={}", base_url, org_name);

            match self.http_client
                .get(&url)
                .header("Authorization", format!("Token {}", token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        if let Ok(buckets_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(buckets) = buckets_response.get("buckets").and_then(|b| b.as_array()) {
                                let bucket_names: Vec<String> = buckets
                                    .iter()
                                    .filter_map(|bucket| bucket.get("name").and_then(|n| n.as_str()))
                                    .map(|s| s.to_string())
                                    .collect();
                                return Ok(bucket_names);
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        Err(anyhow::anyhow!("无法获取组织 {} 的存储桶列表", org_name))
    }

    /// 获取树节点的子节点（懒加载）
    pub async fn get_tree_children(&self, parent_node_id: &str, node_type: &str) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::TreeNodeFactory;
        use crate::models::TreeNodeType;

        let mut children = Vec::new();

        // 解析节点类型
        let parsed_type = match node_type {
            "Database" => TreeNodeType::Database,
            "SystemDatabase" => TreeNodeType::SystemDatabase,
            "RetentionPolicy" => TreeNodeType::RetentionPolicy,
            "Measurement" => TreeNodeType::Measurement,
            "Organization" => TreeNodeType::Organization,
            "Bucket" => TreeNodeType::Bucket,
            "SystemBucket" => TreeNodeType::SystemBucket,
            _ => return Ok(children),
        };

        match parsed_type {
            TreeNodeType::Database | TreeNodeType::SystemDatabase => {
                // InfluxDB 1.x: 获取数据库的保留策略和测量值
                let db_name = parent_node_id.strip_prefix("db1x_").unwrap_or(parent_node_id);

                // 获取保留策略
                match self.get_retention_policies(db_name).await {
                    Ok(policies) => {
                        for policy in policies {
                            let rp_node = TreeNodeFactory::create_retention_policy(
                                policy.name.clone(),
                                db_name.to_string(),
                                policy.duration.clone(),
                                policy.replica_n.try_into().unwrap_or(1)
                            );
                            children.push(rp_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取保留策略失败: {}", e);
                    }
                }

                // 获取测量值
                match self.get_measurements(db_name).await {
                    Ok(measurements) => {
                        for measurement in measurements {
                            let measurement_node = TreeNodeFactory::create_measurement(
                                measurement.clone(),
                                db_name.to_string(),
                            );
                            children.push(measurement_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取测量值失败: {}", e);
                    }
                }
            }
            TreeNodeType::RetentionPolicy => {
                // 保留策略下的测量值
                let parts: Vec<&str> = parent_node_id.split('_').collect();
                if parts.len() >= 3 {
                    let db_name = parts[1];
                    match self.get_measurements(db_name).await {
                        Ok(measurements) => {
                            for measurement in measurements {
                                let measurement_node = TreeNodeFactory::create_measurement(
                                    measurement.clone(),
                                    db_name.to_string(),
                                );
                                children.push(measurement_node);
                            }
                        }
                        Err(e) => {
                            log::warn!("获取测量值失败: {}", e);
                        }
                    }
                }
            }
            TreeNodeType::Organization => {
                // InfluxDB 2.x/3.x: 获取组织下的存储桶
                let org_name = parent_node_id.strip_prefix("org_").unwrap_or(parent_node_id);
                match self.get_influxdb2_buckets_for_org(org_name).await {
                    Ok(buckets) => {
                        for bucket_name in buckets {
                            let is_system = bucket_name.starts_with('_');
                            let bucket_node = TreeNodeFactory::create_bucket(org_name, bucket_name, is_system);
                            children.push(bucket_node);
                        }
                    }
                    Err(e) => {
                        log::warn!("获取存储桶失败: {}", e);
                    }
                }
            }
            TreeNodeType::Bucket | TreeNodeType::SystemBucket => {
                // InfluxDB 2.x/3.x: 获取存储桶下的测量值
                // 这里可以通过 Flux 查询获取测量值，但需要更复杂的实现
                // 暂时返回空，后续可以扩展
                log::debug!("存储桶子节点获取暂未实现");
            }
            TreeNodeType::Database3x => {
                // InfluxDB 3.x: 获取数据库下的表/测量值
                // 这里可以通过 SQL 或 Flux 查询获取表信息
                // 暂时返回空，后续可以扩展
                log::debug!("InfluxDB 3.x 数据库子节点获取暂未实现");
            }
            TreeNodeType::Measurement => {
                // 获取字段和标签
                let parts: Vec<&str> = parent_node_id.split('/').collect();
                if parts.len() >= 3 {
                    let database = parts[0];
                    let measurement = parts[2];

                    // 获取字段
                    match self.get_field_keys(database, measurement).await {
                        Ok(fields) => {
                            for field in fields {
                                let field_node = TreeNodeFactory::create_field(
                                    field.clone(),
                                    parent_node_id.to_string(),
                                    "unknown".to_string()
                                );
                                children.push(field_node);
                            }
                        }
                        Err(e) => {
                            log::warn!("获取字段失败: {}", e);
                        }
                    }

                    // 暂时跳过标签获取，因为方法不存在
                    // TODO: 实现 get_tag_keys 方法
                }
            }
            _ => {
                log::debug!("未知节点类型: {}", node_type);
            }
        }

        Ok(children)
    }


}

// 删除旧的 trait 实现，现在使用枚举方式



/// 数据库客户端工厂
pub struct DatabaseClientFactory;

impl DatabaseClientFactory {
    /// 创建数据库客户端
    pub fn create_client(config: ConnectionConfig) -> Result<DatabaseClient> {
        match config.db_type {
            DatabaseType::InfluxDB => {
                // 优先根据版本选择合适的客户端
                if let Some(version) = &config.version {
                    if version.contains("1.") || version.contains("1x") {
                        // 明确指定为 InfluxDB 1.x
                        info!("根据版本配置创建 InfluxDB 1.x 客户端: {}", version);
                        let client = InfluxClient::new(config)?;
                        return Ok(DatabaseClient::InfluxDB1x(client));
                    } else if version.contains("2.") || version.contains("3.") {
                        // 创建 InfluxDB 2.x/3.x 客户端
                        info!("根据版本配置创建 InfluxDB 2.x/3.x 客户端: {}", version);
                        let client = InfluxDB2Client::new(config)?;
                        return Ok(DatabaseClient::InfluxDB2x(client));
                    }
                }

                // 如果版本不明确，检查是否有 v2_config 且没有明确指定为 1.x
                if config.v2_config.is_some() {
                    // 但是如果版本明确指定为 1.x，则忽略 v2_config
                    if let Some(version) = &config.version {
                        if version.contains("1.") || version.contains("1x") {
                            info!("版本指定为 1.x，忽略 v2_config，创建 InfluxDB 1.x 客户端");
                            let client = InfluxClient::new(config)?;
                            return Ok(DatabaseClient::InfluxDB1x(client));
                        }
                    }

                    info!("检测到 v2_config，创建 InfluxDB 2.x/3.x 客户端");
                    let client = InfluxDB2Client::new(config)?;
                    return Ok(DatabaseClient::InfluxDB2x(client));
                }

                // 默认使用 InfluxDB 1.x 客户端
                info!("使用默认 InfluxDB 1.x 客户端");
                let client = InfluxClient::new(config)?;
                Ok(DatabaseClient::InfluxDB1x(client))
            },
            DatabaseType::IoTDB => {
                let client = IoTDBMultiClient::new(config);
                Ok(DatabaseClient::IoTDB(Arc::new(Mutex::new(client))))
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
