use crate::models::{ConnectionConfig, QueryResult, RetentionPolicy, TableSchema};
use crate::database::s3_client::{S3ClientManager, S3ConnectionConfig};
use anyhow::{anyhow, Result};
use std::sync::Arc;
use log::info;

/// S3 数据库客户端包装器
#[derive(Debug)]
pub struct S3DatabaseClient {
    manager: Arc<S3ClientManager>,
    connection_id: String,
    config: S3ConnectionConfig,
    default_bucket: Option<String>,
}

impl S3DatabaseClient {
    /// 创建新的S3数据库客户端
    pub async fn new(config: ConnectionConfig) -> Result<Self> {
        // 获取实际的端点URL用于日志
        let endpoint_info = if let Some(ref driver_config) = config.driver_config {
            if let Some(ref s3) = driver_config.s3 {
                s3.endpoint.clone().unwrap_or_else(|| "默认AWS端点".to_string())
            } else {
                format!("{}:{}", config.host, config.port)
            }
        } else {
            format!("{}:{}", config.host, config.port)
        };
        info!("创建S3数据库客户端: {}", endpoint_info);

        // 从ConnectionConfig转换为S3ConnectionConfig
        let s3_config = if let Some(driver_config) = config.driver_config {
            if let Some(s3) = driver_config.s3 {
                S3ConnectionConfig {
                    endpoint: s3.endpoint.filter(|e| !e.is_empty()),
                    region: s3.region.filter(|r| !r.is_empty()).or(Some("us-east-1".to_string())),
                    access_key: s3.access_key.unwrap_or_else(||
                        config.username.clone().unwrap_or_default()
                    ),
                    secret_key: s3.secret_key.unwrap_or_else(||
                        config.password.clone().unwrap_or_default()
                    ),
                    use_ssl: s3.use_ssl.unwrap_or(true),
                    path_style: s3.path_style.unwrap_or(false),
                    session_token: s3.session_token.filter(|t| !t.is_empty()),
                }
            } else {
                return Err(anyhow!("缺少S3配置信息"));
            }
        } else {
            // 兼容旧版本配置
            S3ConnectionConfig {
                endpoint: if !config.host.is_empty() { Some(config.host.clone()) } else { None },
                region: Some("us-east-1".to_string()),
                access_key: config.username.clone().unwrap_or_default(),
                secret_key: config.password.clone().unwrap_or_default(),
                use_ssl: config.ssl,
                path_style: false,
                session_token: None,
            }
        };

        let manager = Arc::new(S3ClientManager::new());
        let connection_id = config.id;

        // 创建S3客户端
        manager.create_client(&connection_id, &s3_config).await?;

        // 获取默认存储桶（可选）
        let default_bucket = config.database.filter(|d| !d.is_empty());

        Ok(Self {
            manager,
            connection_id,
            config: s3_config,
            default_bucket,
        })
    }

    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        let start = std::time::Instant::now();
        let connected = self.manager.test_connection(&self.connection_id).await?;

        if !connected {
            return Err(anyhow!("无法连接到S3服务"));
        }

        let elapsed = start.elapsed().as_millis() as u64;
        Ok(elapsed)
    }

    /// 获取数据库列表（在S3中是获取桶列表）
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        let buckets = self.manager.list_buckets(&self.connection_id).await?;
        Ok(buckets.into_iter().map(|b| b.name).collect())
    }

    /// 获取表列表（在S3中是获取对象列表）
    pub async fn get_tables(&self, database: &str) -> Result<Vec<String>> {
        let bucket = if database.is_empty() {
            self.default_bucket.as_ref().ok_or_else(|| anyhow!("未指定存储桶"))?
        } else {
            database
        };

        let result = self.manager.list_objects(
            &self.connection_id,
            bucket,
            None,
            Some("/".to_string()),
            Some(1000),
            None,
        ).await?;

        // 返回文件夹（前缀）作为"表"
        Ok(result.common_prefixes)
    }

    /// 执行查询（在S3中返回对象列表）
    pub async fn execute_query(&self, _query: &str, _params: Option<Vec<String>>) -> Result<QueryResult> {
        // S3不支持SQL查询，这里只是返回一个模拟的结果
        // 可以解析简单的查询来列出对象

        // 获取默认存储桶或从查询中解析
        let bucket = self.default_bucket.as_ref()
            .map(|s| s.as_str())
            .unwrap_or("");

        if bucket.is_empty() {
            return Err(anyhow!("未指定存储桶"));
        }

        let result = self.manager.list_objects(
            &self.connection_id,
            bucket,
            None,
            None,
            Some(100),
            None,
        ).await?;

        // 构建查询结果
        let columns = vec![
            "name".to_string(),
            "size".to_string(),
            "last_modified".to_string(),
            "type".to_string(),
        ];

        let mut data = Vec::new();
        for object in result.objects {
            data.push(vec![
                serde_json::Value::String(object.name),
                serde_json::Value::Number(serde_json::Number::from(object.size)),
                serde_json::Value::String(object.last_modified.to_rfc3339()),
                serde_json::Value::String(if object.is_directory { "directory" } else { "file" }.to_string()),
            ]);
        }

        Ok(QueryResult {
            results: vec![],
            execution_time: Some(0),
            row_count: Some(data.len()),
            error: None,
            data: Some(data),
            columns: Some(columns),
            messages: None,
            statistics: None,
            execution_plan: None,
            aggregations: None,
            sql_type: None,
        })
    }

    // 其他方法返回不支持的错误
    pub async fn create_database(&self, _name: &str) -> Result<()> {
        Err(anyhow!("S3客户端不支持创建数据库操作"))
    }

    pub async fn delete_database(&self, _name: &str) -> Result<()> {
        Err(anyhow!("S3客户端不支持删除数据库操作"))
    }

    pub async fn get_retention_policies(&self, _database: &str) -> Result<Vec<RetentionPolicy>> {
        Err(anyhow!("S3客户端不支持保留策略"))
    }

    pub async fn create_retention_policy(&self, _database: &str, _rp: &RetentionPolicy) -> Result<()> {
        Err(anyhow!("S3客户端不支持创建保留策略"))
    }

    pub async fn get_table_schema(&self, _database: &str, _table: &str) -> Result<TableSchema> {
        Err(anyhow!("S3客户端不支持获取表结构"))
    }
}