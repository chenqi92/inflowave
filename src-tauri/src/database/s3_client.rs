use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::SharedCredentialsProvider;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::{Client, Config};
use chrono::{DateTime as ChronoDateTime, Utc};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3ConnectionConfig {
    pub endpoint: Option<String>,
    pub region: Option<String>,
    pub access_key: String,
    pub secret_key: String,
    pub use_ssl: bool,
    pub path_style: bool,
    pub session_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub name: String,
    pub size: i64,
    pub last_modified: ChronoDateTime<Utc>,
    pub etag: Option<String>,
    pub storage_class: Option<String>,
    pub is_directory: bool,
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Bucket {
    pub name: String,
    pub creation_date: Option<ChronoDateTime<Utc>>,
    pub region: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S3ListObjectsResult {
    pub objects: Vec<S3Object>,
    pub common_prefixes: Vec<String>,
    pub is_truncated: bool,
    pub next_continuation_token: Option<String>,
    pub key_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3UploadProgress {
    pub loaded: u64,
    pub total: u64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3PresignedUrlResult {
    pub url: String,
    pub expires_at: ChronoDateTime<Utc>,
}

#[derive(Debug)]
pub struct S3ClientManager {
    clients: Arc<RwLock<HashMap<String, Arc<Client>>>>,
}

impl S3ClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_client(&self, id: &str, config: &S3ConnectionConfig) -> Result<()> {
        // 创建AWS凭证
        let credentials = if let Some(token) = &config.session_token {
            Credentials::new(
                &config.access_key,
                &config.secret_key,
                Some(token.clone()),
                None,
                "s3-client",
            )
        } else {
            Credentials::new(
                &config.access_key,
                &config.secret_key,
                None,
                None,
                "s3-client",
            )
        };

        // 创建AWS配置
        let mut sdk_config = aws_config::defaults(BehaviorVersion::latest())
            .credentials_provider(SharedCredentialsProvider::new(credentials));

        // 设置区域
        if let Some(region) = &config.region {
            sdk_config = sdk_config.region(aws_config::Region::new(region.clone()));
        } else {
            sdk_config = sdk_config.region(aws_config::Region::new("us-east-1"));
        }

        // 创建S3客户端配置
        let mut s3_config_builder = Config::builder()
            .behavior_version(BehaviorVersion::latest())
            .force_path_style(config.path_style);

        // 设置自定义端点（用于MinIO等）
        if let Some(endpoint) = &config.endpoint {
            // 检查端点是否已包含协议
            let endpoint_url = if endpoint.starts_with("http://") || endpoint.starts_with("https://") {
                // 如果已经包含协议，直接使用
                log::debug!("使用已包含协议的端点: {}", endpoint);
                endpoint.clone()
            } else {
                // 如果没有协议，根据 use_ssl 添加
                let url = if config.use_ssl {
                    format!("https://{}", endpoint)
                } else {
                    format!("http://{}", endpoint)
                };
                log::debug!("构建端点URL: {} (use_ssl: {})", url, config.use_ssl);
                url
            };
            log::info!("设置S3端点: {}", endpoint_url);
            s3_config_builder = s3_config_builder.endpoint_url(endpoint_url);
        }

        // 从SDK配置构建S3配置
        let sdk_config = sdk_config.load().await;
        s3_config_builder = s3_config_builder
            .credentials_provider(sdk_config.credentials_provider().unwrap().clone())
            .region(sdk_config.region().cloned());

        let s3_config = s3_config_builder.build();
        let client = Arc::new(Client::from_conf(s3_config));

        let mut clients = self.clients.write().await;
        clients.insert(id.to_string(), client);

        Ok(())
    }

    pub async fn get_client(&self, id: &str) -> Result<Arc<Client>> {
        let clients = self.clients.read().await;
        clients
            .get(id)
            .cloned()
            .ok_or_else(|| anyhow!("S3 client not found: {}", id))
    }

    pub async fn remove_client(&self, id: &str) -> Result<()> {
        let mut clients = self.clients.write().await;
        clients.remove(id);
        Ok(())
    }

    pub async fn test_connection(&self, id: &str) -> Result<bool> {
        let client = self.get_client(id).await?;

        // 尝试列出buckets来测试连接和认证
        match client.list_buckets().send().await {
            Ok(_) => {
                log::info!("S3 connection test successful");
                Ok(true)
            }
            Err(e) => {
                log::error!("S3 connection test failed: {}", e);

                // 检查是否是认证错误
                let error_msg = e.to_string();
                if error_msg.contains("InvalidAccessKeyId") || error_msg.contains("SignatureDoesNotMatch") {
                    return Err(anyhow::anyhow!("认证失败: Access Key 或 Secret Key 错误"));
                } else if error_msg.contains("AccessDenied") || error_msg.contains("403") {
                    return Err(anyhow::anyhow!("认证失败: 没有权限访问"));
                } else if error_msg.contains("credential") || error_msg.contains("Credential") {
                    return Err(anyhow::anyhow!("认证失败: 凭证配置错误"));
                }

                // 其他错误
                Err(anyhow::anyhow!("连接测试失败: {}", e))
            }
        }
    }

    pub async fn list_buckets(&self, id: &str) -> Result<Vec<S3Bucket>> {
        let client = self.get_client(id).await?;

        let resp = client.list_buckets().send().await?;

        let buckets = resp
            .buckets()
            .iter()
            .map(|b| S3Bucket {
                name: b.name().unwrap_or("").to_string(),
                creation_date: b.creation_date().map(|d| {
                    let timestamp = d.as_secs_f64();
                    ChronoDateTime::from_timestamp(timestamp as i64, 0).unwrap_or(Utc::now())
                }),
                region: None,
            })
            .collect();

        Ok(buckets)
    }

    pub async fn create_bucket(&self, id: &str, bucket_name: &str, region: Option<String>) -> Result<()> {
        let client = self.get_client(id).await?;

        let mut request = client.create_bucket().bucket(bucket_name);

        // 如果不是us-east-1区域，需要指定LocationConstraint
        if let Some(r) = region {
            if r != "us-east-1" {
                request = request.create_bucket_configuration(
                    aws_sdk_s3::types::CreateBucketConfiguration::builder()
                        .location_constraint(aws_sdk_s3::types::BucketLocationConstraint::from(r.as_str()))
                        .build(),
                );
            }
        }

        request.send().await?;
        Ok(())
    }

    pub async fn delete_bucket(&self, id: &str, bucket_name: &str) -> Result<()> {
        let client = self.get_client(id).await?;

        // 首先清空bucket
        self.empty_bucket(id, bucket_name).await?;

        // 然后删除bucket
        client.delete_bucket().bucket(bucket_name).send().await?;
        Ok(())
    }

    async fn empty_bucket(&self, id: &str, bucket_name: &str) -> Result<()> {
        let client = self.get_client(id).await?;

        // 列出所有对象
        let mut continuation_token: Option<String> = None;

        loop {
            let mut request = client
                .list_objects_v2()
                .bucket(bucket_name)
                .max_keys(1000);

            if let Some(token) = continuation_token {
                request = request.continuation_token(token);
            }

            let resp = request.send().await?;

            // 删除所有对象
            let contents = resp.contents();
            for object in contents {
                if let Some(key) = object.key() {
                    client.delete_object()
                        .bucket(bucket_name)
                        .key(key)
                        .send()
                        .await?;
                }
            }

            if !resp.is_truncated().unwrap_or(false) {
                break;
            }

            continuation_token = resp.next_continuation_token().map(|s| s.to_string());
        }

        Ok(())
    }

    pub async fn list_objects(
        &self,
        id: &str,
        bucket: &str,
        prefix: Option<String>,
        delimiter: Option<String>,
        max_keys: Option<i32>,
        continuation_token: Option<String>,
    ) -> Result<S3ListObjectsResult> {
        let client = self.get_client(id).await?;

        let mut request = client.list_objects_v2().bucket(bucket);

        if let Some(p) = prefix {
            request = request.prefix(p);
        }

        if let Some(d) = delimiter {
            request = request.delimiter(d);
        }

        if let Some(m) = max_keys {
            request = request.max_keys(m);
        }

        if let Some(token) = continuation_token {
            request = request.continuation_token(token);
        }

        let resp = request.send().await?;

        let objects = resp
            .contents()
            .iter()
            .map(|obj| {
                let key = obj.key().unwrap_or("").to_string();
                let is_directory = key.ends_with('/');

                // 对于以 / 结尾的 key（文件夹标记），先去掉尾部的 / 再提取名称
                let name = if is_directory {
                    key.trim_end_matches('/').split('/').last().unwrap_or(&key).to_string()
                } else {
                    key.split('/').last().unwrap_or(&key).to_string()
                };

                S3Object {
                    key: key.clone(),
                    name,
                    size: obj.size().unwrap_or(0),
                    last_modified: obj.last_modified().map(|d| {
                        let timestamp = d.as_secs_f64();
                        ChronoDateTime::from_timestamp(timestamp as i64, 0).unwrap_or(Utc::now())
                    }).unwrap_or(Utc::now()),
                    etag: obj.e_tag().map(|s| s.to_string()),
                    storage_class: obj.storage_class().map(|s| s.as_str().to_string()),
                    is_directory,
                    content_type: None,
                }
            })
            .collect();

        let common_prefixes = resp
            .common_prefixes()
            .iter()
            .filter_map(|p| p.prefix().map(|s| s.to_string()))
            .collect();

        Ok(S3ListObjectsResult {
            objects,
            common_prefixes,
            is_truncated: resp.is_truncated().unwrap_or(false),
            next_continuation_token: resp.next_continuation_token().map(|s| s.to_string()),
            key_count: resp.key_count().unwrap_or(0),
        })
    }

    pub async fn upload_object(
        &self,
        id: &str,
        bucket: &str,
        key: &str,
        data: Vec<u8>,
        content_type: Option<String>,
    ) -> Result<()> {
        let client = self.get_client(id).await?;

        let mut request = client
            .put_object()
            .bucket(bucket)
            .key(key)
            .body(ByteStream::from(data));

        // 设置Content-Type
        if let Some(ct) = content_type {
            request = request.content_type(ct);
        } else {
            // 尝试从文件扩展名猜测MIME类型
            if let Some(mime) = mime_guess::from_path(key).first() {
                request = request.content_type(mime.to_string());
            }
        }

        request.send().await?;
        Ok(())
    }

    pub async fn download_object(
        &self,
        id: &str,
        bucket: &str,
        key: &str,
    ) -> Result<Vec<u8>> {
        let client = self.get_client(id).await?;

        let resp = client
            .get_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await?;

        let data = resp.body.collect().await?;
        Ok(data.into_bytes().to_vec())
    }

    pub async fn delete_object(
        &self,
        id: &str,
        bucket: &str,
        key: &str,
    ) -> Result<()> {
        let client = self.get_client(id).await?;

        client
            .delete_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await?;

        Ok(())
    }

    pub async fn delete_objects(
        &self,
        id: &str,
        bucket: &str,
        keys: Vec<String>,
    ) -> Result<Vec<String>> {
        let client = self.get_client(id).await?;

        let objects: Vec<_> = keys
            .iter()
            .map(|key| {
                aws_sdk_s3::types::ObjectIdentifier::builder()
                    .key(key)
                    .build()
                    .unwrap()
            })
            .collect();

        let delete = aws_sdk_s3::types::Delete::builder()
            .set_objects(Some(objects))
            .build()?;

        let resp = client
            .delete_objects()
            .bucket(bucket)
            .delete(delete)
            .send()
            .await?;

        let deleted = resp
            .deleted()
            .iter()
            .filter_map(|d| d.key().map(|s| s.to_string()))
            .collect();

        Ok(deleted)
    }

    pub async fn copy_object(
        &self,
        id: &str,
        source_bucket: &str,
        source_key: &str,
        dest_bucket: &str,
        dest_key: &str,
    ) -> Result<()> {
        let client = self.get_client(id).await?;

        let copy_source = format!("{}/{}", source_bucket, source_key);

        client
            .copy_object()
            .copy_source(copy_source)
            .bucket(dest_bucket)
            .key(dest_key)
            .send()
            .await?;

        Ok(())
    }

    pub async fn move_object(
        &self,
        id: &str,
        source_bucket: &str,
        source_key: &str,
        dest_bucket: &str,
        dest_key: &str,
    ) -> Result<()> {
        // 先复制
        self.copy_object(id, source_bucket, source_key, dest_bucket, dest_key).await?;

        // 再删除原文件
        self.delete_object(id, source_bucket, source_key).await?;

        Ok(())
    }

    pub async fn create_folder(
        &self,
        id: &str,
        bucket: &str,
        folder_path: &str,
    ) -> Result<()> {
        let client = self.get_client(id).await?;

        // 确保路径以/结尾
        let key = if folder_path.ends_with('/') {
            folder_path.to_string()
        } else {
            format!("{}/", folder_path)
        };

        // 上传一个空对象作为文件夹占位符
        client
            .put_object()
            .bucket(bucket)
            .key(key)
            .body(ByteStream::from(Vec::new()))
            .send()
            .await?;

        Ok(())
    }

    pub async fn get_object_metadata(
        &self,
        id: &str,
        bucket: &str,
        key: &str,
    ) -> Result<HashMap<String, String>> {
        let client = self.get_client(id).await?;

        let resp = client
            .head_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await?;

        let mut metadata = HashMap::new();

        if let Some(content_type) = resp.content_type() {
            metadata.insert("ContentType".to_string(), content_type.to_string());
        }

        if let Some(content_length) = resp.content_length() {
            metadata.insert("ContentLength".to_string(), content_length.to_string());
        }

        if let Some(etag) = resp.e_tag() {
            metadata.insert("ETag".to_string(), etag.to_string());
        }

        if let Some(last_modified) = resp.last_modified() {
            metadata.insert("LastModified".to_string(), last_modified.to_string());
        }

        if let Some(storage_class) = resp.storage_class() {
            metadata.insert("StorageClass".to_string(), storage_class.as_str().to_string());
        }

        Ok(metadata)
    }

    pub async fn generate_presigned_url(
        &self,
        id: &str,
        bucket: &str,
        key: &str,
        operation: &str,
        expires_in_seconds: u64,
    ) -> Result<S3PresignedUrlResult> {
        let client = self.get_client(id).await?;
        let expires_in = std::time::Duration::from_secs(expires_in_seconds);

        let presigned_request = match operation {
            "get" => {
                client
                    .get_object()
                    .bucket(bucket)
                    .key(key)
                    .presigned(
                        aws_sdk_s3::presigning::PresigningConfig::expires_in(expires_in)
                            .map_err(|e| anyhow!("Failed to create presigning config: {}", e))?,
                    )
                    .await?
            }
            "put" => {
                client
                    .put_object()
                    .bucket(bucket)
                    .key(key)
                    .presigned(
                        aws_sdk_s3::presigning::PresigningConfig::expires_in(expires_in)
                            .map_err(|e| anyhow!("Failed to create presigning config: {}", e))?,
                    )
                    .await?
            }
            _ => return Err(anyhow!("Unsupported presigned URL operation: {}", operation)),
        };

        let url = presigned_request.uri().to_string();
        let expires_at = Utc::now() + chrono::Duration::seconds(expires_in_seconds as i64);

        Ok(S3PresignedUrlResult {
            url,
            expires_at,
        })
    }

    pub async fn search_objects(
        &self,
        id: &str,
        bucket: &str,
        search_term: &str,
        prefix: Option<String>,
    ) -> Result<Vec<S3Object>> {
        let mut all_objects = Vec::new();
        let mut continuation_token: Option<String> = None;

        loop {
            let result = self.list_objects(
                id,
                bucket,
                prefix.clone(),
                None,
                Some(1000),
                continuation_token,
            ).await?;

            // 过滤匹配搜索词的对象
            let filtered: Vec<S3Object> = result
                .objects
                .into_iter()
                .filter(|obj| {
                    obj.name.to_lowercase().contains(&search_term.to_lowercase()) ||
                    obj.key.to_lowercase().contains(&search_term.to_lowercase())
                })
                .collect();

            all_objects.extend(filtered);

            if !result.is_truncated {
                break;
            }

            continuation_token = result.next_continuation_token;
        }

        Ok(all_objects)
    }
}