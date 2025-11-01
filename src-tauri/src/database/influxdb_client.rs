/**
 * 新的 InfluxDB 客户端实现
 * 
 * 使用统一的驱动架构替代原有的分散实现
 */

use crate::database::influxdb::{InfluxDriver, InfluxDriverFactory};
use crate::models::{ConnectionConfig, QueryResult, QueryRequest};
use anyhow::Result;
use log::{debug, info, warn};
use std::sync::Arc;
use std::time::Instant;

/// 新的 InfluxDB 客户端
pub struct InfluxDBClient {
    driver: Arc<dyn InfluxDriver>,
    config: ConnectionConfig,
}

impl InfluxDBClient {
    /// 创建新的 InfluxDB 客户端
    pub async fn new(config: ConnectionConfig) -> Result<Self> {
        info!("创建 InfluxDB 客户端: {}:{}", config.host, config.port);
        
        let driver = InfluxDriverFactory::create_driver(&config).await?;
        
        Ok(Self {
            driver,
            config,
        })
    }
    
    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        debug!("测试 InfluxDB 连接");
        self.driver.test_connection().await
    }
    
    /// 执行查询
    pub async fn execute_query(&self, request: &QueryRequest) -> Result<QueryResult> {
        debug!("执行查询: {}", request.query);
        
        let start_time = Instant::now();
        
        // 构建查询对象
        let language = self.detect_query_language(&request.query);
        let mut query = crate::database::influxdb::Query::new(language, request.query.clone());
        
        if let Some(database) = &request.database {
            query = query.with_database(database.clone());
        }
        
        if let Some(timeout) = request.timeout {
            query = query.with_timeout(timeout);
        }
        
        // 执行查询
        let dataset = self.driver.query(&query).await?;
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        // 转换为 QueryResult
        let result = QueryResult::new(
            dataset.columns,
            dataset.rows,
            dataset.execution_time.unwrap_or(execution_time),
        );
        
        info!("查询执行完成，耗时: {}ms，返回 {} 行", execution_time, result.row_count.unwrap_or(0));
        Ok(result)
    }
    
    /// 执行查询（带数据库参数）
    pub async fn execute_query_with_database(&self, query: &str, database: Option<&str>) -> Result<QueryResult> {
        let request = QueryRequest {
            connection_id: self.config.id.clone(),
            query: query.to_string(),
            database: database.map(|s| s.to_string()),
            timeout: Some(self.config.query_timeout as u64),
        };
        
        self.execute_query(&request).await
    }
    
    /// 写入 Line Protocol 数据
    pub async fn write_line_protocol(&self, database: &str, line_protocol: &str) -> Result<()> {
        debug!("写入 Line Protocol 数据到数据库: {}", database);
        
        let bucket_info = crate::database::influxdb::BucketInfo::new(database.to_string());
        self.driver.write(line_protocol, &bucket_info).await?;
        
        info!("Line Protocol 数据写入成功");
        Ok(())
    }
    
    /// 获取数据库列表
    pub async fn list_databases(&self) -> Result<Vec<String>> {
        debug!("获取数据库列表");
        self.driver.list_databases().await
    }
    
    /// 获取测量列表
    pub async fn list_measurements(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取测量列表: {}", database);
        self.driver.list_measurements(database).await
    }
    
    /// 创建数据库
    pub async fn create_database(&self, name: &str) -> Result<()> {
        debug!("创建数据库: {}", name);
        self.driver.create_database(name).await
    }
    
    /// 删除数据库
    pub async fn drop_database(&self, name: &str) -> Result<()> {
        debug!("删除数据库: {}", name);
        self.driver.drop_database(name).await
    }
    
    /// 获取健康状态
    pub async fn health(&self) -> Result<crate::database::influxdb::Health> {
        self.driver.health().await
    }
    
    /// 获取驱动能力
    pub fn capabilities(&self) -> &crate::database::influxdb::Capability {
        self.driver.capabilities()
    }

    /// 获取配置
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }

    /// 获取驱动（用于内部访问）
    pub(crate) fn get_driver(&self) -> &Arc<dyn crate::database::influxdb::InfluxDriver> {
        &self.driver
    }
    
    /// 关闭连接
    pub async fn close(&self) -> Result<()> {
        info!("关闭 InfluxDB 客户端连接");
        self.driver.close().await
    }
    
    /// 检测查询语言
    fn detect_query_language(&self, query: &str) -> crate::database::influxdb::QueryLanguage {
        let query_upper = query.trim().to_uppercase();

        // 检测 Flux 查询
        if query_upper.contains("FROM(") || query_upper.contains("RANGE(") || query_upper.contains("|>") {
            return crate::database::influxdb::QueryLanguage::Flux;
        }

        // 检测 SQL 查询
        if query_upper.starts_with("SELECT") && (query_upper.contains("FROM") || query_upper.contains("WHERE")) {
            // 进一步检查是否是标准 SQL 而不是 InfluxQL
            if query_upper.contains("GROUP BY TIME") || query_upper.contains("FILL(") {
                return crate::database::influxdb::QueryLanguage::InfluxQL;
            }
            // 如果驱动支持 SQL，优先使用 SQL
            if self.driver.capabilities().supports_sql {
                return crate::database::influxdb::QueryLanguage::Sql;
            }
        }

        // 默认使用 InfluxQL
        crate::database::influxdb::QueryLanguage::InfluxQL
    }

    /// 获取标签键列表
    pub async fn get_tag_keys(&self, database: &str, measurement: &str) -> Result<Vec<crate::models::TagInfo>> {
        debug!("获取标签键: database={}, measurement={}", database, measurement);

        use crate::database::influxdb::{Query, QueryLanguage};

        let query = Query::new(
            QueryLanguage::InfluxQL,
            format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, measurement)
        ).with_database(database.to_string());

        let dataset = self.driver.query(&query).await?;

        let tags: Vec<_> = dataset.rows.iter()
            .filter_map(|row| {
                row.get(0).and_then(|v| v.as_str()).map(|name| {
                    crate::models::TagInfo {
                        name: name.to_string(),
                        values: vec![],
                        cardinality: 0,
                    }
                })
            })
            .collect();

        info!("获取到 {} 个标签键", tags.len());
        Ok(tags)
    }

    /// 获取字段键列表
    pub async fn get_field_keys(&self, database: &str, measurement: &str) -> Result<Vec<crate::models::FieldInfo>> {
        debug!("获取字段键: database={}, measurement={}", database, measurement);

        use crate::database::influxdb::{Query, QueryLanguage};

        let query = Query::new(
            QueryLanguage::InfluxQL,
            format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, measurement)
        ).with_database(database.to_string());

        let dataset = self.driver.query(&query).await?;

        let fields: Vec<_> = dataset.rows.iter()
            .filter_map(|row| {
                let name = row.get(0).and_then(|v| v.as_str())?;
                let field_type_str = row.get(1).and_then(|v| v.as_str()).unwrap_or("float");

                let field_type = match field_type_str {
                    "float" => crate::models::FieldType::Float,
                    "integer" => crate::models::FieldType::Integer,
                    "string" => crate::models::FieldType::String,
                    "boolean" => crate::models::FieldType::Boolean,
                    _ => crate::models::FieldType::Float, // 默认为 Float
                };

                Some(crate::models::FieldInfo {
                    name: name.to_string(),
                    field_type,
                    last_value: None,
                })
            })
            .collect();

        info!("获取到 {} 个字段键", fields.len());
        Ok(fields)
    }
    
    /// 获取树节点的子节点（懒加载）
    pub async fn get_tree_children(&self, parent_node_id: &str, node_type: &str, _metadata: Option<&serde_json::Value>) -> Result<Vec<crate::models::TreeNode>> {
        debug!("获取树节点子节点: {} ({})", parent_node_id, node_type);

        match node_type {
            "connection" => {
                // 连接节点：返回数据库列表
                info!("为连接节点获取数据库列表");
                let databases = self.list_databases().await?;
                info!("获取到 {} 个数据库", databases.len());

                let nodes = databases
                    .into_iter()
                    .map(|db_name| {
                        let is_system = db_name.starts_with('_');
                        let node_type = if is_system {
                            crate::models::TreeNodeType::SystemDatabase
                        } else {
                            crate::models::TreeNodeType::Database
                        };

                        crate::models::TreeNode::new(
                            format!("db_{}", db_name),
                            db_name.clone(),
                            node_type,
                        )
                        .with_parent(parent_node_id.to_string())
                        .with_metadata("database".to_string(), serde_json::Value::String(db_name.clone()))
                        .with_metadata("is_system".to_string(), serde_json::Value::Bool(is_system))
                    })
                    .collect();
                Ok(nodes)
            }
            "database" | "system_database" => {
                // 数据库节点：返回表列表
                // 从 parent_node_id 中提取数据库名
                if let Some(database) = parent_node_id.strip_prefix("db_") {
                    info!("为数据库 {} 获取表列表", database);
                    let measurements = self.list_measurements(database).await?;
                    info!("获取到 {} 个表", measurements.len());

                    let nodes = measurements
                        .into_iter()
                        .map(|measurement_name| {
                            crate::models::TreeNode::new(
                                format!("measurement_{}_{}", database, measurement_name),
                                measurement_name.clone(),
                                crate::models::TreeNodeType::Measurement,
                            )
                            .with_parent(parent_node_id.to_string())
                            // 不标记为叶子节点，允许展开查看 tags 和 fields
                            .with_metadata("database".to_string(), serde_json::Value::String(database.to_string()))
                            .with_metadata("measurement".to_string(), serde_json::Value::String(measurement_name.clone()))
                            .with_metadata("databaseName".to_string(), serde_json::Value::String(database.to_string()))
                            .with_metadata("tableName".to_string(), serde_json::Value::String(measurement_name))
                        })
                        .collect();
                    Ok(nodes)
                } else {
                    warn!("无法从 parent_node_id 提取数据库名: {}", parent_node_id);
                    Ok(vec![])
                }
            }
            "measurement" => {
                // 测量节点：返回 Tags 和 Fields 分组
                info!("为测量节点获取 Tags 和 Fields 分组");

                // 从 parent_node_id 中提取数据库名和测量名
                // 格式: "measurement_{database}_{measurement_name}"
                let parts: Vec<&str> = parent_node_id.split('_').collect();
                if parts.len() >= 3 && parts[0] == "measurement" {
                    let database = parts[1];
                    let measurement_name = parts[2..].join("_");

                    debug!("解析测量节点: database={}, measurement={}", database, measurement_name);

                    let mut children = Vec::new();

                    // 创建 Tags 分组节点
                    let tags_group = crate::models::TreeNodeFactory::create_tag_group(parent_node_id.to_string())
                        .with_metadata("database".to_string(), serde_json::Value::String(database.to_string()))
                        .with_metadata("measurement".to_string(), serde_json::Value::String(measurement_name.clone()))
                        .with_metadata("databaseName".to_string(), serde_json::Value::String(database.to_string()))
                        .with_metadata("tableName".to_string(), serde_json::Value::String(measurement_name.clone()));
                    children.push(tags_group);

                    // 创建 Fields 分组节点
                    let fields_group = crate::models::TreeNodeFactory::create_field_group(parent_node_id.to_string())
                        .with_metadata("database".to_string(), serde_json::Value::String(database.to_string()))
                        .with_metadata("measurement".to_string(), serde_json::Value::String(measurement_name.clone()))
                        .with_metadata("databaseName".to_string(), serde_json::Value::String(database.to_string()))
                        .with_metadata("tableName".to_string(), serde_json::Value::String(measurement_name));
                    children.push(fields_group);

                    info!("为测量节点创建了 {} 个分组节点", children.len());
                    Ok(children)
                } else {
                    warn!("无法从 parent_node_id 解析测量信息: {}", parent_node_id);
                    Ok(vec![])
                }
            }
            "tag_group" => {
                // Tags 分组节点：返回所有标签
                info!("为 Tags 分组节点获取标签列表");

                if let Some(metadata) = _metadata {
                    let database = metadata.get("database")
                        .or_else(|| metadata.get("databaseName"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let measurement = metadata.get("measurement")
                        .or_else(|| metadata.get("tableName"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");

                    if !database.is_empty() && !measurement.is_empty() {
                        debug!("获取标签: database={}, measurement={}", database, measurement);

                        // 获取标签列表
                        match self.get_tag_keys(database, measurement).await {
                            Ok(tags) => {
                                let tag_nodes: Vec<_> = tags.into_iter().map(|tag_info| {
                                    crate::models::TreeNodeFactory::create_tag(tag_info.name.clone(), parent_node_id.to_string())
                                        .with_metadata("database".to_string(), serde_json::Value::String(database.to_string()))
                                        .with_metadata("measurement".to_string(), serde_json::Value::String(measurement.to_string()))
                                        .with_metadata("tag".to_string(), serde_json::Value::String(tag_info.name.clone()))
                                        .with_metadata("databaseName".to_string(), serde_json::Value::String(database.to_string()))
                                        .with_metadata("tableName".to_string(), serde_json::Value::String(measurement.to_string()))
                                        .with_metadata("tagName".to_string(), serde_json::Value::String(tag_info.name))
                                }).collect();

                                info!("获取到 {} 个标签", tag_nodes.len());
                                Ok(tag_nodes)
                            }
                            Err(e) => {
                                warn!("获取标签列表失败: {}", e);
                                Ok(vec![])
                            }
                        }
                    } else {
                        warn!("Tags 分组节点缺少必要的元数据");
                        Ok(vec![])
                    }
                } else {
                    warn!("Tags 分组节点没有元数据");
                    Ok(vec![])
                }
            }
            "field_group" => {
                // Fields 分组节点：返回所有字段
                info!("为 Fields 分组节点获取字段列表");

                if let Some(metadata) = _metadata {
                    let database = metadata.get("database")
                        .or_else(|| metadata.get("databaseName"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let measurement = metadata.get("measurement")
                        .or_else(|| metadata.get("tableName"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");

                    if !database.is_empty() && !measurement.is_empty() {
                        debug!("获取字段: database={}, measurement={}", database, measurement);

                        // 获取字段列表
                        match self.get_field_keys(database, measurement).await {
                            Ok(fields) => {
                                let field_nodes: Vec<_> = fields.into_iter().map(|field_info| {
                                    let field_type_str = match field_info.field_type {
                                        crate::models::FieldType::Float => "float",
                                        crate::models::FieldType::Integer => "integer",
                                        crate::models::FieldType::String => "string",
                                        crate::models::FieldType::Boolean => "boolean",
                                    };

                                    crate::models::TreeNodeFactory::create_field(
                                        field_info.name.clone(),
                                        parent_node_id.to_string(),
                                        field_type_str.to_string()
                                    )
                                    .with_metadata("database".to_string(), serde_json::Value::String(database.to_string()))
                                    .with_metadata("measurement".to_string(), serde_json::Value::String(measurement.to_string()))
                                    .with_metadata("field".to_string(), serde_json::Value::String(field_info.name.clone()))
                                    .with_metadata("databaseName".to_string(), serde_json::Value::String(database.to_string()))
                                    .with_metadata("tableName".to_string(), serde_json::Value::String(measurement.to_string()))
                                    .with_metadata("fieldName".to_string(), serde_json::Value::String(field_info.name))
                                }).collect();

                                info!("获取到 {} 个字段", field_nodes.len());
                                Ok(field_nodes)
                            }
                            Err(e) => {
                                warn!("获取字段列表失败: {}", e);
                                Ok(vec![])
                            }
                        }
                    } else {
                        warn!("Fields 分组节点缺少必要的元数据");
                        Ok(vec![])
                    }
                } else {
                    warn!("Fields 分组节点没有元数据");
                    Ok(vec![])
                }
            }
            _ => {
                warn!("不支持的节点类型: {}", node_type);
                Ok(vec![])
            }
        }
    }

    // InfluxDB 2.x 特定方法

    /// 获取 InfluxDB 2.x 组织列表
    pub async fn get_influxdb2_organizations(&self) -> Result<Vec<String>> {
        debug!("获取 InfluxDB 2.x 组织列表");

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/orgs", base_url);
            let client = reqwest::Client::new();

            match client
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

    /// 获取组织详细信息
    pub async fn get_influxdb2_organization_info(&self, org_name: &str) -> Result<crate::commands::influxdb2::OrganizationInfo> {
        debug!("获取组织信息: {}", org_name);

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/orgs?org={}", base_url, org_name);
            let client = reqwest::Client::new();

            match client
                .get(&url)
                .header("Authorization", format!("Token {}", token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        if let Ok(orgs_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(orgs) = orgs_response.get("orgs").and_then(|o| o.as_array()) {
                                if let Some(org) = orgs.first() {
                                    return Ok(crate::commands::influxdb2::OrganizationInfo {
                                        id: org.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                        name: org.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                        description: org.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                        created_at: org.get("createdAt").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                        updated_at: org.get("updatedAt").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                    });
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        Err(anyhow::anyhow!("无法获取组织 {} 的详细信息", org_name))
    }

    /// 获取 InfluxDB 2.x 存储桶列表
    pub async fn get_influxdb2_buckets(&self) -> Result<Vec<String>> {
        debug!("获取 InfluxDB 2.x 存储桶列表");

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/buckets", base_url);
            let client = reqwest::Client::new();

            match client
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
    pub async fn get_influxdb2_buckets_for_org(&self, org_name: &str) -> Result<Vec<String>> {
        debug!("获取组织 {} 的存储桶列表", org_name);

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/buckets?org={}", base_url, org_name);
            let client = reqwest::Client::new();

            match client
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

    /// 获取存储桶详细信息
    pub async fn get_influxdb2_bucket_info(&self, bucket_name: &str) -> Result<crate::commands::influxdb2::BucketInfo> {
        debug!("获取存储桶信息: {}", bucket_name);

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/buckets?name={}", base_url, bucket_name);
            let client = reqwest::Client::new();

            match client
                .get(&url)
                .header("Authorization", format!("Token {}", token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    if let Ok(text) = response.text().await {
                        if let Ok(buckets_response) = serde_json::from_str::<serde_json::Value>(&text) {
                            if let Some(buckets) = buckets_response.get("buckets").and_then(|b| b.as_array()) {
                                if let Some(bucket) = buckets.first() {
                                    let retention_rules = bucket.get("retentionRules").and_then(|r| r.as_array());
                                    let retention_period = retention_rules
                                        .and_then(|rules| rules.first())
                                        .and_then(|rule| rule.get("everySeconds"))
                                        .and_then(|v| v.as_i64());

                                    return Ok(crate::commands::influxdb2::BucketInfo {
                                        id: bucket.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                        name: bucket.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                        org_id: bucket.get("orgID").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                        org_name: bucket.get("org").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                        retention_period,
                                        description: bucket.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                        created_at: bucket.get("createdAt").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                        updated_at: bucket.get("updatedAt").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                    });
                                }
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        Err(anyhow::anyhow!("无法获取存储桶 {} 的详细信息", bucket_name))
    }

    /// 创建存储桶
    pub async fn create_influxdb2_bucket(&self, name: &str, org_id: &str, retention_period: Option<i64>, description: Option<&str>) -> Result<()> {
        debug!("创建存储桶: {}", name);

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let url = format!("{}/api/v2/buckets", base_url);
            let client = reqwest::Client::new();

            let mut body = serde_json::json!({
                "name": name,
                "orgID": org_id,
            });

            if let Some(desc) = description {
                body["description"] = serde_json::json!(desc);
            }

            if let Some(retention) = retention_period {
                body["retentionRules"] = serde_json::json!([{
                    "type": "expire",
                    "everySeconds": retention
                }]);
            }

            match client
                .post(&url)
                .header("Authorization", format!("Token {}", token))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    info!("存储桶 '{}' 创建成功", name);
                    return Ok(());
                }
                Ok(response) => {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
                    return Err(anyhow::anyhow!("创建存储桶失败 ({}): {}", status, error_text));
                }
                Err(e) => {
                    return Err(anyhow::anyhow!("创建存储桶请求失败: {}", e));
                }
            }
        }

        Err(anyhow::anyhow!("缺少 InfluxDB 2.x 配置"))
    }

    /// 删除存储桶
    pub async fn delete_influxdb2_bucket(&self, bucket_name: &str) -> Result<()> {
        debug!("删除存储桶: {}", bucket_name);

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let client = reqwest::Client::new();

            // 首先获取存储桶 ID
            let bucket_info = self.get_influxdb2_bucket_info(bucket_name).await?;
            let url = format!("{}/api/v2/buckets/{}", base_url, bucket_info.id);

            match client
                .delete(&url)
                .header("Authorization", format!("Token {}", token))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    info!("存储桶 '{}' 删除成功", bucket_name);
                    return Ok(());
                }
                Ok(response) => {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
                    return Err(anyhow::anyhow!("删除存储桶失败 ({}): {}", status, error_text));
                }
                Err(e) => {
                    return Err(anyhow::anyhow!("删除存储桶请求失败: {}", e));
                }
            }
        }

        Err(anyhow::anyhow!("缺少 InfluxDB 2.x 配置"))
    }

    /// 更新存储桶保留策略
    pub async fn update_influxdb2_bucket_retention(&self, bucket_name: &str, retention_period: Option<i64>) -> Result<()> {
        debug!("更新存储桶保留策略: {}", bucket_name);

        let base_url = if self.config.ssl {
            format!("https://{}:{}", self.config.host, self.config.port)
        } else {
            format!("http://{}:{}", self.config.host, self.config.port)
        };

        if let Some(v2_config) = &self.config.v2_config {
            let token = &v2_config.api_token;
            let client = reqwest::Client::new();

            // 首先获取存储桶信息
            let bucket_info = self.get_influxdb2_bucket_info(bucket_name).await?;
            let url = format!("{}/api/v2/buckets/{}", base_url, bucket_info.id);

            let mut body = serde_json::json!({
                "name": bucket_info.name,
                "orgID": bucket_info.org_id,
            });

            if let Some(retention) = retention_period {
                body["retentionRules"] = serde_json::json!([{
                    "type": "expire",
                    "everySeconds": retention
                }]);
            } else {
                body["retentionRules"] = serde_json::json!([]);
            }

            match client
                .patch(&url)
                .header("Authorization", format!("Token {}", token))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    info!("存储桶 '{}' 保留策略更新成功", bucket_name);
                    return Ok(());
                }
                Ok(response) => {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_else(|_| "未知错误".to_string());
                    return Err(anyhow::anyhow!("更新保留策略失败 ({}): {}", status, error_text));
                }
                Err(e) => {
                    return Err(anyhow::anyhow!("更新保留策略请求失败: {}", e));
                }
            }
        }

        Err(anyhow::anyhow!("缺少 InfluxDB 2.x 配置"))
    }
}

impl std::fmt::Debug for InfluxDBClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("InfluxDBClient")
            .field("config", &self.config)
            .field("capabilities", &self.driver.capabilities())
            .finish()
    }
}

impl Clone for InfluxDBClient {
    fn clone(&self) -> Self {
        Self {
            driver: self.driver.clone(),
            config: self.config.clone(),
        }
    }
}
