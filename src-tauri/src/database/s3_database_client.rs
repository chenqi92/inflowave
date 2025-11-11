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
                    custom_domain: s3.custom_domain.filter(|d| !d.is_empty()),
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
                custom_domain: None,
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

    /// 获取树节点的子节点（懒加载）
    pub async fn get_tree_children(
        &self,
        parent_node_id: &str,
        node_type: &str,
        metadata: Option<&serde_json::Value>
    ) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::{TreeNode, TreeNodeType};

        let mut children = Vec::new();

        match node_type {
            "Connection" => {
                // 连接节点的子节点是存储桶列表
                let buckets = self.manager.list_buckets(&self.connection_id).await?;

                for bucket_info in buckets {
                    let mut node = TreeNode::new(
                        format!("bucket_{}", bucket_info.name),
                        bucket_info.name.clone(),
                        TreeNodeType::StorageBucket,
                    );
                    node.parent_id = Some(parent_node_id.to_string());
                    node.is_expandable = true;  // 存储桶可以展开查看内容
                    node.is_leaf = false;

                    // 添加元数据
                    node.metadata.insert("bucket_name".to_string(), serde_json::json!(bucket_info.name));
                    if let Some(created) = bucket_info.creation_date {
                        node.metadata.insert("creation_date".to_string(), serde_json::json!(created.to_rfc3339()));
                    }

                    children.push(node);
                }
            },
            "StorageBucket" => {
                // 获取存储桶名称
                let bucket_name = if let Some(metadata) = metadata {
                    metadata.get("bucket_name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                } else {
                    ""
                };

                if !bucket_name.is_empty() {
                    // 列出存储桶中的对象（文件和文件夹）
                    let result = self.manager.list_objects(
                        &self.connection_id,
                        bucket_name,
                        None,  // 从根目录开始
                        Some("/".to_string()),  // 使用 / 作为分隔符
                        Some(1000),  // 最多返回1000个
                        None,
                    ).await?;

                    // 添加文件夹（公共前缀）
                    for prefix in result.common_prefixes {
                        // 移除末尾的斜杠以获取文件夹名
                        let folder_name = prefix.trim_end_matches('/');
                        let display_name = folder_name.split('/').last().unwrap_or(folder_name);

                        let mut node = TreeNode::new(
                            format!("folder_{}_{}", bucket_name, folder_name),
                            display_name.to_string(),
                            TreeNodeType::Folder,
                        );
                        node.parent_id = Some(parent_node_id.to_string());
                        node.is_expandable = true;
                        node.is_leaf = false;

                        // 添加元数据
                        node.metadata.insert("bucket_name".to_string(), serde_json::json!(bucket_name));
                        node.metadata.insert("prefix".to_string(), serde_json::json!(prefix));

                        children.push(node);
                    }

                    // 添加文件
                    for object in result.objects {
                        if !object.is_directory {
                            let file_name = object.name.split('/').last().unwrap_or(&object.name);

                            let mut node = TreeNode::new(
                                format!("file_{}_{}",  bucket_name, object.name),
                                file_name.to_string(),
                                TreeNodeType::File,
                            );
                            node.parent_id = Some(parent_node_id.to_string());
                            node.is_expandable = false;
                            node.is_leaf = true;

                            // 添加元数据
                            node.metadata.insert("bucket_name".to_string(), serde_json::json!(bucket_name));
                            node.metadata.insert("key".to_string(), serde_json::json!(object.name));
                            node.metadata.insert("size".to_string(), serde_json::json!(object.size));
                            node.metadata.insert("last_modified".to_string(), serde_json::json!(object.last_modified.to_rfc3339()));
                            node.metadata.insert("etag".to_string(), serde_json::json!(object.etag));

                            children.push(node);
                        }
                    }
                }
            },
            "Folder" => {
                // 获取存储桶名称和文件夹前缀
                let (bucket_name, prefix) = if let Some(metadata) = metadata {
                    (
                        metadata.get("bucket_name").and_then(|v| v.as_str()).unwrap_or(""),
                        metadata.get("prefix").and_then(|v| v.as_str()).unwrap_or("")
                    )
                } else {
                    ("", "")
                };

                if !bucket_name.is_empty() && !prefix.is_empty() {
                    // 列出文件夹中的对象
                    let result = self.manager.list_objects(
                        &self.connection_id,
                        bucket_name,
                        Some(prefix.to_string()),
                        Some("/".to_string()),
                        Some(1000),
                        None,
                    ).await?;

                    // 添加子文件夹
                    for sub_prefix in result.common_prefixes {
                        let folder_name = sub_prefix.trim_end_matches('/');
                        let display_name = folder_name.split('/').last().unwrap_or(folder_name);

                        let mut node = TreeNode::new(
                            format!("folder_{}_{}", bucket_name, folder_name),
                            display_name.to_string(),
                            TreeNodeType::Folder,
                        );
                        node.parent_id = Some(parent_node_id.to_string());
                        node.is_expandable = true;
                        node.is_leaf = false;

                        node.metadata.insert("bucket_name".to_string(), serde_json::json!(bucket_name));
                        node.metadata.insert("prefix".to_string(), serde_json::json!(sub_prefix));

                        children.push(node);
                    }

                    // 添加文件
                    for object in result.objects {
                        if !object.is_directory {
                            let file_name = object.name.split('/').last().unwrap_or(&object.name);

                            let mut node = TreeNode::new(
                                format!("file_{}_{}",  bucket_name, object.name),
                                file_name.to_string(),
                                TreeNodeType::File,
                            );
                            node.parent_id = Some(parent_node_id.to_string());
                            node.is_expandable = false;
                            node.is_leaf = true;

                            node.metadata.insert("bucket_name".to_string(), serde_json::json!(bucket_name));
                            node.metadata.insert("key".to_string(), serde_json::json!(object.name));
                            node.metadata.insert("size".to_string(), serde_json::json!(object.size));
                            node.metadata.insert("last_modified".to_string(), serde_json::json!(object.last_modified.to_rfc3339()));
                            node.metadata.insert("etag".to_string(), serde_json::json!(object.etag));

                            children.push(node);
                        }
                    }
                }
            },
            _ => {
                // 其他节点类型暂不支持
            }
        }

        Ok(children)
    }
}