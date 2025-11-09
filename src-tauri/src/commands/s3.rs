use crate::database::s3_client::{
    S3Bucket, S3ClientManager, S3ConnectionConfig, S3ListObjectsResult, S3Object,
    S3PresignedUrlResult,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct S3UploadRequest {
    pub connection_id: String,
    pub bucket: String,
    pub key: String,
    pub data: Vec<u8>,
    pub content_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3DownloadRequest {
    pub connection_id: String,
    pub bucket: String,
    pub key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3ListRequest {
    pub connection_id: String,
    pub bucket: String,
    pub prefix: Option<String>,
    pub delimiter: Option<String>,
    pub max_keys: Option<i32>,
    pub continuation_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3DeleteRequest {
    pub connection_id: String,
    pub bucket: String,
    pub keys: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3CopyRequest {
    pub connection_id: String,
    pub source_bucket: String,
    pub source_key: String,
    pub dest_bucket: String,
    pub dest_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3MoveRequest {
    pub connection_id: String,
    pub source_bucket: String,
    pub source_key: String,
    pub dest_bucket: String,
    pub dest_key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3PresignedUrlRequest {
    pub connection_id: String,
    pub bucket: String,
    pub key: String,
    pub operation: String, // "get" or "put"
    pub expires_in_seconds: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3SearchRequest {
    pub connection_id: String,
    pub bucket: String,
    pub search_term: String,
    pub prefix: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3TaggingRequest {
    pub connection_id: String,
    pub bucket: String,
    pub key: String,
    pub tags: std::collections::HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3GetTaggingRequest {
    pub connection_id: String,
    pub bucket: String,
    pub key: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct S3AclRequest {
    pub connection_id: String,
    pub bucket: String,
    pub key: String,
    pub acl: String, // "private", "public-read", "public-read-write", "authenticated-read"
}

// 连接S3服务
#[tauri::command]
pub async fn s3_connect(
    connection_id: String,
    config: S3ConnectionConfig,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<bool, String> {
    let manager = s3_manager.lock().await;

    manager
        .create_client(&connection_id, &config)
        .await
        .map_err(|e| e.to_string())?;

    // 测试连接
    manager
        .test_connection(&connection_id)
        .await
        .map_err(|e| e.to_string())
}

// 断开S3连接
#[tauri::command]
pub async fn s3_disconnect(
    connection_id: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .remove_client(&connection_id)
        .await
        .map_err(|e| e.to_string())
}

// 测试S3连接
#[tauri::command]
pub async fn s3_test_connection(
    connection_id: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<bool, String> {
    let manager = s3_manager.lock().await;

    manager
        .test_connection(&connection_id)
        .await
        .map_err(|e| e.to_string())
}

// 列出所有buckets
#[tauri::command]
pub async fn s3_list_buckets(
    connection_id: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<Vec<S3Bucket>, String> {
    let manager = s3_manager.lock().await;

    manager
        .list_buckets(&connection_id)
        .await
        .map_err(|e| e.to_string())
}

// 创建bucket
#[tauri::command]
pub async fn s3_create_bucket(
    connection_id: String,
    bucket_name: String,
    region: Option<String>,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .create_bucket(&connection_id, &bucket_name, region)
        .await
        .map_err(|e| e.to_string())
}

// 删除bucket
#[tauri::command]
pub async fn s3_delete_bucket(
    connection_id: String,
    bucket_name: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .delete_bucket(&connection_id, &bucket_name)
        .await
        .map_err(|e| e.to_string())
}

// 列出对象
#[tauri::command]
pub async fn s3_list_objects(
    request: S3ListRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<S3ListObjectsResult, String> {
    let manager = s3_manager.lock().await;

    manager
        .list_objects(
            &request.connection_id,
            &request.bucket,
            request.prefix,
            request.delimiter,
            request.max_keys,
            request.continuation_token,
        )
        .await
        .map_err(|e| e.to_string())
}

// 上传对象
#[tauri::command]
pub async fn s3_upload_object(
    request: S3UploadRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .upload_object(
            &request.connection_id,
            &request.bucket,
            &request.key,
            request.data,
            request.content_type,
        )
        .await
        .map_err(|e| e.to_string())
}

// 下载对象
#[tauri::command]
pub async fn s3_download_object(
    request: S3DownloadRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<Vec<u8>, String> {
    let manager = s3_manager.lock().await;

    manager
        .download_object(&request.connection_id, &request.bucket, &request.key)
        .await
        .map_err(|e| e.to_string())
}

// 删除对象
#[tauri::command]
pub async fn s3_delete_object(
    connection_id: String,
    bucket: String,
    key: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .delete_object(&connection_id, &bucket, &key)
        .await
        .map_err(|e| e.to_string())
}

// 批量删除对象
#[tauri::command]
pub async fn s3_delete_objects(
    request: S3DeleteRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<Vec<String>, String> {
    let manager = s3_manager.lock().await;

    manager
        .delete_objects(&request.connection_id, &request.bucket, request.keys)
        .await
        .map_err(|e| e.to_string())
}

// 复制对象
#[tauri::command]
pub async fn s3_copy_object(
    request: S3CopyRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .copy_object(
            &request.connection_id,
            &request.source_bucket,
            &request.source_key,
            &request.dest_bucket,
            &request.dest_key,
        )
        .await
        .map_err(|e| e.to_string())
}

// 移动对象
#[tauri::command]
pub async fn s3_move_object(
    request: S3MoveRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .move_object(
            &request.connection_id,
            &request.source_bucket,
            &request.source_key,
            &request.dest_bucket,
            &request.dest_key,
        )
        .await
        .map_err(|e| e.to_string())
}

// 创建文件夹
#[tauri::command]
pub async fn s3_create_folder(
    connection_id: String,
    bucket: String,
    folder_path: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .create_folder(&connection_id, &bucket, &folder_path)
        .await
        .map_err(|e| e.to_string())
}

// 获取对象元数据
#[tauri::command]
pub async fn s3_get_object_metadata(
    connection_id: String,
    bucket: String,
    key: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let manager = s3_manager.lock().await;

    manager
        .get_object_metadata(&connection_id, &bucket, &key)
        .await
        .map_err(|e| e.to_string())
}

// 生成预签名URL
#[tauri::command]
pub async fn s3_generate_presigned_url(
    request: S3PresignedUrlRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<S3PresignedUrlResult, String> {
    let manager = s3_manager.lock().await;

    manager
        .generate_presigned_url(
            &request.connection_id,
            &request.bucket,
            &request.key,
            &request.operation,
            request.expires_in_seconds,
        )
        .await
        .map_err(|e| e.to_string())
}

// 搜索对象
#[tauri::command]
pub async fn s3_search_objects(
    request: S3SearchRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<Vec<S3Object>, String> {
    let manager = s3_manager.lock().await;

    manager
        .search_objects(
            &request.connection_id,
            &request.bucket,
            &request.search_term,
            request.prefix,
        )
        .await
        .map_err(|e| e.to_string())
}

// 上传文件（通过文件路径）
#[tauri::command]
pub async fn s3_upload_file(
    connection_id: String,
    bucket: String,
    key: String,
    file_path: String,
    content_type: Option<String>,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    // 读取文件
    let data = tokio::fs::read(&file_path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let manager = s3_manager.lock().await;

    // 如果没有提供content_type，尝试从文件扩展名猜测
    let final_content_type = content_type.or_else(|| {
        mime_guess::from_path(&file_path)
            .first()
            .map(|m| m.to_string())
    });

    manager
        .upload_object(&connection_id, &bucket, &key, data, final_content_type)
        .await
        .map_err(|e| e.to_string())
}

// 下载文件（保存到指定路径）
#[tauri::command]
pub async fn s3_download_file(
    connection_id: String,
    bucket: String,
    key: String,
    save_path: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    // 下载数据
    let data = manager
        .download_object(&connection_id, &bucket, &key)
        .await
        .map_err(|e| e.to_string())?;

    // 保存到文件
    tokio::fs::write(&save_path, data)
        .await
        .map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(())
}

// 获取bucket统计信息
#[tauri::command]
pub async fn s3_get_bucket_stats(
    connection_id: String,
    bucket: String,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<serde_json::Value, String> {
    let manager = s3_manager.lock().await;

    let mut total_size: i64 = 0;
    let mut total_count: i64 = 0;
    let mut continuation_token: Option<String> = None;

    loop {
        let result = manager
            .list_objects(
                &connection_id,
                &bucket,
                None,
                None,
                Some(1000),
                continuation_token,
            )
            .await
            .map_err(|e| e.to_string())?;

        for obj in &result.objects {
            if !obj.is_directory {
                total_size += obj.size;
                total_count += 1;
            }
        }

        if !result.is_truncated {
            break;
        }

        continuation_token = result.next_continuation_token;
    }

    Ok(serde_json::json!({
        "total_size": total_size,
        "total_count": total_count,
        "bucket_name": bucket
    }))
}

// 获取对象标签
#[tauri::command]
pub async fn s3_get_object_tagging(
    request: S3GetTaggingRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<std::collections::HashMap<String, String>, String> {
    let manager = s3_manager.lock().await;

    manager
        .get_object_tagging(&request.connection_id, &request.bucket, &request.key)
        .await
        .map_err(|e| e.to_string())
}

// 设置对象标签
#[tauri::command]
pub async fn s3_put_object_tagging(
    request: S3TaggingRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .put_object_tagging(&request.connection_id, &request.bucket, &request.key, request.tags)
        .await
        .map_err(|e| e.to_string())
}

// 设置对象ACL权限
#[tauri::command]
pub async fn s3_put_object_acl(
    request: S3AclRequest,
    s3_manager: State<'_, Arc<Mutex<S3ClientManager>>>,
) -> Result<(), String> {
    let manager = s3_manager.lock().await;

    manager
        .put_object_acl(&request.connection_id, &request.bucket, &request.key, &request.acl)
        .await
        .map_err(|e| e.to_string())
}