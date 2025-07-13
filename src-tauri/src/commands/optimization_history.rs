use tauri::State;
use std::sync::Mutex;
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationHistoryEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub connection_id: String,
    pub database: String,
    pub original_query: String,
    pub optimized_query: String,
    pub optimization_result: serde_json::Value,
    pub context: serde_json::Value,
    pub performance: serde_json::Value,
    pub user_feedback: Option<serde_json::Value>,
    pub tags: Vec<String>,
    pub metadata: serde_json::Value,
}

pub type OptimizationHistoryStorage = Mutex<Vec<OptimizationHistoryEntry>>;

/// 加载优化历史记录
#[tauri::command]
pub async fn load_optimization_history(
    history_storage: State<'_, OptimizationHistoryStorage>,
) -> Result<String, String> {
    debug!("加载优化历史记录");
    
    let storage = history_storage.lock().map_err(|e| {
        error!("获取优化历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let json_data = serde_json::to_string(&*storage).map_err(|e| {
        error!("序列化优化历史失败: {}", e);
        "数据序列化失败".to_string()
    })?;

    info!("优化历史记录已加载，共 {} 条记录", storage.len());
    Ok(json_data)
}

/// 保存优化历史记录
#[tauri::command]
pub async fn save_optimization_history(
    history_storage: State<'_, OptimizationHistoryStorage>,
    data: String,
) -> Result<(), String> {
    debug!("保存优化历史记录");
    
    let entries: Vec<OptimizationHistoryEntry> = serde_json::from_str(&data).map_err(|e| {
        error!("反序列化优化历史失败: {}", e);
        "数据格式错误".to_string()
    })?;

    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取优化历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    *storage = entries;

    info!("优化历史记录已保存，共 {} 条记录", storage.len());
    Ok(())
}

/// 添加优化历史记录
#[tauri::command]
pub async fn add_optimization_history(
    history_storage: State<'_, OptimizationHistoryStorage>,
    connection_id: String,
    database: String,
    original_query: String,
    optimized_query: String,
    optimization_result: serde_json::Value,
    context: serde_json::Value,
    performance: Option<serde_json::Value>,
    tags: Vec<String>,
    metadata: serde_json::Value,
) -> Result<String, String> {
    debug!("添加优化历史记录");
    
    let entry = OptimizationHistoryEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: Utc::now(),
        connection_id,
        database,
        original_query,
        optimized_query,
        optimization_result,
        context,
        performance: performance.unwrap_or(serde_json::json!({})),
        user_feedback: None,
        tags,
        metadata,
    };

    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取优化历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let id = entry.id.clone();
    storage.insert(0, entry); // 插入到开头，保持最新的在前面

    // 限制历史记录数量，保留最新的 1000 条
    if storage.len() > 1000 {
        storage.truncate(1000);
    }

    info!("优化历史记录已添加: {}", id);
    Ok(id)
}

/// 获取优化历史记录
#[tauri::command]
pub async fn get_optimization_history(
    history_storage: State<'_, OptimizationHistoryStorage>,
    connection_id: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<OptimizationHistoryEntry>, String> {
    debug!("获取优化历史记录");
    
    let storage = history_storage.lock().map_err(|e| {
        error!("获取优化历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let mut filtered_history: Vec<OptimizationHistoryEntry> = storage
        .iter()
        .filter(|entry| {
            connection_id.as_ref().map_or(true, |id| &entry.connection_id == id)
        })
        .cloned()
        .collect();

    // 按时间倒序排列（最新的在前面）
    filtered_history.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    // 应用分页
    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(50);
    
    let result = filtered_history
        .into_iter()
        .skip(offset)
        .take(limit)
        .collect();

    Ok(result)
}

/// 删除优化历史记录
#[tauri::command]
pub async fn delete_optimization_history(
    history_storage: State<'_, OptimizationHistoryStorage>,
    entry_id: String,
) -> Result<(), String> {
    debug!("删除优化历史记录: {}", entry_id);
    
    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取优化历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(pos) = storage.iter().position(|entry| entry.id == entry_id) {
        storage.remove(pos);
        info!("优化历史记录已删除: {}", entry_id);
        Ok(())
    } else {
        Err("历史记录不存在".to_string())
    }
}

/// 更新优化历史记录的用户反馈
#[tauri::command]
pub async fn update_optimization_feedback(
    history_storage: State<'_, OptimizationHistoryStorage>,
    entry_id: String,
    feedback: serde_json::Value,
) -> Result<(), String> {
    debug!("更新优化历史记录反馈: {}", entry_id);
    
    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取优化历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(entry) = storage.iter_mut().find(|entry| entry.id == entry_id) {
        entry.user_feedback = Some(feedback);
        info!("优化历史记录反馈已更新: {}", entry_id);
        Ok(())
    } else {
        Err("历史记录不存在".to_string())
    }
}

/// 清空优化历史记录
#[tauri::command]
pub async fn clear_optimization_history(
    history_storage: State<'_, OptimizationHistoryStorage>,
) -> Result<(), String> {
    debug!("清空优化历史记录");
    
    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取优化历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    storage.clear();

    info!("优化历史记录已清空");
    Ok(())
}
