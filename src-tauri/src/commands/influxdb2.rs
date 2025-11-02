/**
 * InfluxDB 2.x 特定命令
 * 
 * 处理 InfluxDB 2.x 的组织(Organization)和存储桶(Bucket)相关操作
 */

use tauri::State;
use log::{debug, info};
use serde::{Deserialize, Serialize};
use crate::services::connection_service::ConnectionService;

/// 存储桶信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BucketInfo {
    pub id: String,
    pub name: String,
    pub org_id: String,
    pub org_name: String,
    pub retention_period: Option<i64>, // 保留期限（秒）
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

/// 组织信息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrganizationInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

/// 创建存储桶请求
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBucketRequest {
    pub name: String,
    pub org_id: String,
    pub retention_period: Option<i64>, // 保留期限（秒），None 表示永久保留
    pub description: Option<String>,
}

/// 获取组织列表
#[tauri::command]
pub async fn get_influxdb2_organizations(
    connection_id: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<String>, String> {
    debug!("获取 InfluxDB 2.x 组织列表: {}", connection_id);

    let manager = connection_service.get_manager();
    let client = manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 调用客户端的获取组织方法
    let organizations = client
        .get_influxdb2_organizations()
        .await
        .map_err(|e| format!("获取组织列表失败: {}", e))?;

    info!("获取到 {} 个组织", organizations.len());
    Ok(organizations)
}

/// 获取组织详细信息
#[tauri::command]
pub async fn get_organization_info(
    connection_id: String,
    org_name: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<OrganizationInfo, String> {
    debug!("获取组织信息: {} - {}", connection_id, org_name);

    let manager = connection_service.get_manager();
    let client = manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 获取组织详细信息
    let org_info = client
        .get_influxdb2_organization_info(&org_name)
        .await
        .map_err(|e| format!("获取组织信息失败: {}", e))?;

    Ok(org_info)
}

/// 获取存储桶列表
#[tauri::command]
pub async fn get_influxdb2_buckets(
    connection_id: String,
    org_name: Option<String>,
    connection_service: State<'_, ConnectionService>,
) -> Result<Vec<String>, String> {
    debug!("获取 InfluxDB 2.x 存储桶列表: {} - {:?}", connection_id, org_name);

    let manager = connection_service.get_manager();
    let client = manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 获取存储桶列表
    let buckets = client
        .get_influxdb2_buckets(org_name.as_deref())
        .await
        .map_err(|e| format!("获取存储桶列表失败: {}", e))?;

    info!("获取到 {} 个存储桶", buckets.len());
    Ok(buckets)
}

/// 获取存储桶详细信息
#[tauri::command]
pub async fn get_bucket_info(
    connection_id: String,
    bucket_name: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<BucketInfo, String> {
    debug!("获取存储桶信息: {} - {}", connection_id, bucket_name);

    let manager = connection_service.get_manager();
    let client = manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 获取存储桶详细信息
    let bucket_info = client
        .get_influxdb2_bucket_info(&bucket_name)
        .await
        .map_err(|e| format!("获取存储桶信息失败: {}", e))?;

    Ok(bucket_info)
}

/// 创建存储桶
#[tauri::command]
pub async fn create_influxdb2_bucket(
    connection_id: String,
    request: CreateBucketRequest,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("创建 InfluxDB 2.x 存储桶: {} - {}", connection_id, request.name);

    let manager = connection_service.get_manager();
    let client = manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 创建存储桶
    client
        .create_influxdb2_bucket(&request.name, &request.org_id, request.retention_period, request.description.as_deref())
        .await
        .map_err(|e| format!("创建存储桶失败: {}", e))?;

    info!("存储桶 '{}' 创建成功", request.name);
    Ok(())
}

/// 删除存储桶
#[tauri::command]
pub async fn delete_influxdb2_bucket(
    connection_id: String,
    bucket_name: String,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("删除 InfluxDB 2.x 存储桶: {} - {}", connection_id, bucket_name);

    let manager = connection_service.get_manager();
    let client = manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 删除存储桶
    client
        .delete_influxdb2_bucket(&bucket_name)
        .await
        .map_err(|e| format!("删除存储桶失败: {}", e))?;

    info!("存储桶 '{}' 删除成功", bucket_name);
    Ok(())
}

/// 更新存储桶保留策略
#[tauri::command]
pub async fn update_bucket_retention(
    connection_id: String,
    bucket_name: String,
    retention_period: Option<i64>,
    connection_service: State<'_, ConnectionService>,
) -> Result<(), String> {
    debug!("更新存储桶保留策略: {} - {} - {:?}", connection_id, bucket_name, retention_period);

    let manager = connection_service.get_manager();
    let client = manager
        .get_connection(&connection_id)
        .await
        .map_err(|e| format!("获取连接失败: {}", e))?;

    // 更新保留策略
    client
        .update_influxdb2_bucket_retention(&bucket_name, retention_period)
        .await
        .map_err(|e| format!("更新保留策略失败: {}", e))?;

    info!("存储桶 '{}' 保留策略更新成功", bucket_name);
    Ok(())
}

