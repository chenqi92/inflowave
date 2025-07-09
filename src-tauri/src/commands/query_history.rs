use crate::models::{QueryHistoryItem, SavedQueryItem};
use tauri::State;
use log::{debug, error, info};
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

// 简单的内存存储，实际应用中应该使用数据库
pub type QueryHistoryStorage = Mutex<Vec<QueryHistoryItem>>;
pub type SavedQueryStorage = Mutex<HashMap<String, SavedQueryItem>>;

/// 添加查询历史记录
#[tauri::command]
pub async fn add_query_history(
    history_storage: State<'_, QueryHistoryStorage>,
    query: String,
    database: String,
    connection_id: String,
    duration: u64,
    row_count: u64,
    success: bool,
    error: Option<String>,
) -> Result<String, String> {
    debug!("添加查询历史记录");
    
    let history_item = QueryHistoryItem {
        id: Uuid::new_v4().to_string(),
        query,
        database,
        connection_id,
        executed_at: chrono::Utc::now(),
        duration,
        row_count,
        success,
        error,
    };

    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    // 限制历史记录数量，保留最新的 1000 条
    if storage.len() >= 1000 {
        storage.remove(0);
    }

    let id = history_item.id.clone();
    storage.push(history_item);

    info!("查询历史记录已添加: {}", id);
    Ok(id)
}

/// 获取查询历史记录
#[tauri::command]
pub async fn get_query_history(
    history_storage: State<'_, QueryHistoryStorage>,
    connection_id: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<QueryHistoryItem>, String> {
    debug!("获取查询历史记录");
    
    let storage = history_storage.lock().map_err(|e| {
        error!("获取历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let mut filtered_history: Vec<QueryHistoryItem> = storage
        .iter()
        .filter(|item| {
            connection_id.as_ref().map_or(true, |id| &item.connection_id == id)
        })
        .cloned()
        .collect();

    // 按执行时间倒序排列
    filtered_history.sort_by(|a, b| b.executed_at.cmp(&a.executed_at));

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

/// 删除查询历史记录
#[tauri::command]
pub async fn delete_query_history(
    history_storage: State<'_, QueryHistoryStorage>,
    history_id: String,
) -> Result<(), String> {
    debug!("删除查询历史记录: {}", history_id);
    
    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(pos) = storage.iter().position(|item| item.id == history_id) {
        storage.remove(pos);
        info!("查询历史记录已删除: {}", history_id);
        Ok(())
    } else {
        Err("历史记录不存在".to_string())
    }
}

/// 清空查询历史记录
#[tauri::command]
pub async fn clear_query_history(
    history_storage: State<'_, QueryHistoryStorage>,
    connection_id: Option<String>,
) -> Result<u32, String> {
    debug!("清空查询历史记录");
    
    let mut storage = history_storage.lock().map_err(|e| {
        error!("获取历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let initial_count = storage.len();
    
    if let Some(conn_id) = connection_id {
        storage.retain(|item| item.connection_id != conn_id);
    } else {
        storage.clear();
    }

    let deleted_count = initial_count - storage.len();
    info!("已清空 {} 条查询历史记录", deleted_count);
    Ok(deleted_count as u32)
}

/// 保存查询
#[tauri::command]
pub async fn save_query(
    saved_query_storage: State<'_, SavedQueryStorage>,
    name: String,
    description: Option<String>,
    query: String,
    database: Option<String>,
    tags: Vec<String>,
) -> Result<String, String> {
    debug!("保存查询: {}", name);
    
    let saved_query = SavedQueryItem {
        id: Uuid::new_v4().to_string(),
        name,
        description,
        query,
        database,
        tags,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        favorite: false,
    };

    let mut storage = saved_query_storage.lock().map_err(|e| {
        error!("获取保存查询存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let id = saved_query.id.clone();
    storage.insert(id.clone(), saved_query);

    info!("查询已保存: {}", id);
    Ok(id)
}

/// 获取保存的查询列表
#[tauri::command]
pub async fn get_saved_queries(
    saved_query_storage: State<'_, SavedQueryStorage>,
    tags: Option<Vec<String>>,
    search: Option<String>,
) -> Result<Vec<SavedQueryItem>, String> {
    debug!("获取保存的查询列表");
    
    let storage = saved_query_storage.lock().map_err(|e| {
        error!("获取保存查询存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let mut queries: Vec<SavedQueryItem> = storage.values().cloned().collect();

    // 按标签过滤
    if let Some(filter_tags) = tags {
        queries.retain(|query| {
            filter_tags.iter().any(|tag| query.tags.contains(tag))
        });
    }

    // 按搜索关键词过滤
    if let Some(search_term) = search {
        let search_lower = search_term.to_lowercase();
        queries.retain(|query| {
            query.name.to_lowercase().contains(&search_lower) ||
            query.query.to_lowercase().contains(&search_lower) ||
            query.description.as_ref().map_or(false, |desc| desc.to_lowercase().contains(&search_lower))
        });
    }

    // 按更新时间倒序排列，收藏的排在前面
    queries.sort_by(|a, b| {
        match (a.favorite, b.favorite) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => b.updated_at.cmp(&a.updated_at),
        }
    });

    Ok(queries)
}

/// 更新保存的查询
#[tauri::command]
pub async fn update_saved_query(
    saved_query_storage: State<'_, SavedQueryStorage>,
    query_id: String,
    name: Option<String>,
    description: Option<String>,
    query: Option<String>,
    database: Option<String>,
    tags: Option<Vec<String>>,
    favorite: Option<bool>,
) -> Result<(), String> {
    debug!("更新保存的查询: {}", query_id);
    
    let mut storage = saved_query_storage.lock().map_err(|e| {
        error!("获取保存查询存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(saved_query) = storage.get_mut(&query_id) {
        if let Some(name) = name {
            saved_query.name = name;
        }
        if let Some(description) = description {
            saved_query.description = Some(description);
        }
        if let Some(query) = query {
            saved_query.query = query;
        }
        if let Some(database) = database {
            saved_query.database = Some(database);
        }
        if let Some(tags) = tags {
            saved_query.tags = tags;
        }
        if let Some(favorite) = favorite {
            saved_query.favorite = favorite;
        }
        saved_query.updated_at = chrono::Utc::now();

        info!("保存的查询已更新: {}", query_id);
        Ok(())
    } else {
        Err("保存的查询不存在".to_string())
    }
}

/// 删除保存的查询
#[tauri::command]
pub async fn delete_saved_query(
    saved_query_storage: State<'_, SavedQueryStorage>,
    query_id: String,
) -> Result<(), String> {
    debug!("删除保存的查询: {}", query_id);
    
    let mut storage = saved_query_storage.lock().map_err(|e| {
        error!("获取保存查询存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if storage.remove(&query_id).is_some() {
        info!("保存的查询已删除: {}", query_id);
        Ok(())
    } else {
        Err("保存的查询不存在".to_string())
    }
}

/// 获取查询统计信息
#[tauri::command]
pub async fn get_query_statistics(
    history_storage: State<'_, QueryHistoryStorage>,
    connection_id: Option<String>,
    days: Option<u32>,
) -> Result<serde_json::Value, String> {
    debug!("获取查询统计信息");
    
    let storage = history_storage.lock().map_err(|e| {
        error!("获取历史存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let days = days.unwrap_or(7);
    let cutoff_date = chrono::Utc::now() - chrono::Duration::days(days as i64);

    let filtered_history: Vec<&QueryHistoryItem> = storage
        .iter()
        .filter(|item| {
            item.executed_at >= cutoff_date &&
            connection_id.as_ref().map_or(true, |id| &item.connection_id == id)
        })
        .collect();

    let total_queries = filtered_history.len();
    let successful_queries = filtered_history.iter().filter(|item| item.success).count();
    let failed_queries = total_queries - successful_queries;
    
    let avg_duration = if total_queries > 0 {
        filtered_history.iter().map(|item| item.duration).sum::<u64>() / total_queries as u64
    } else {
        0
    };

    let avg_row_count = if total_queries > 0 {
        filtered_history.iter().map(|item| item.row_count).sum::<u64>() / total_queries as u64
    } else {
        0
    };

    let stats = serde_json::json!({
        "period_days": days,
        "total_queries": total_queries,
        "successful_queries": successful_queries,
        "failed_queries": failed_queries,
        "success_rate": if total_queries > 0 { (successful_queries as f64 / total_queries as f64) * 100.0 } else { 0.0 },
        "average_duration_ms": avg_duration,
        "average_row_count": avg_row_count
    });

    Ok(stats)
}
