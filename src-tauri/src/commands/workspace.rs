use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use log::{debug, error, info};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceTab {
    pub id: String,
    pub title: String,
    pub content: String,
    pub tab_type: String, // 'query' | 'table' | 'database' | 'data-browser'
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub database: Option<String>,
    pub connection_id: Option<String>,
    pub table_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceData {
    pub tabs: HashMap<String, WorkspaceTab>,
    pub active_tab_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub type WorkspaceStorage = Mutex<WorkspaceData>;

impl Default for WorkspaceData {
    fn default() -> Self {
        Self {
            tabs: HashMap::new(),
            active_tab_id: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

/// 保存查询标签页到工作区
#[tauri::command]
pub async fn save_tab_to_workspace(
    workspace_storage: State<'_, WorkspaceStorage>,
    tab_id: String,
    title: String,
    content: String,
    tab_type: String,
    database: Option<String>,
    connection_id: Option<String>,
    table_name: Option<String>,
) -> Result<String, String> {
    debug!("保存标签页到工作区: {}", tab_id);
    
    let workspace_tab = WorkspaceTab {
        id: tab_id.clone(),
        title,
        content,
        tab_type,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        database,
        connection_id,
        table_name,
    };

    let mut storage = workspace_storage.lock().map_err(|e| {
        error!("获取工作区存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    storage.tabs.insert(tab_id.clone(), workspace_tab);
    storage.updated_at = Utc::now();

    info!("标签页已保存到工作区: {}", tab_id);
    Ok(tab_id)
}

/// 从工作区删除标签页
#[tauri::command]
pub async fn remove_tab_from_workspace(
    workspace_storage: State<'_, WorkspaceStorage>,
    tab_id: String,
) -> Result<(), String> {
    debug!("从工作区删除标签页: {}", tab_id);
    
    let mut storage = workspace_storage.lock().map_err(|e| {
        error!("获取工作区存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    storage.tabs.remove(&tab_id);
    storage.updated_at = Utc::now();

    // 如果删除的是活跃标签页，清空活跃标签页ID
    if storage.active_tab_id.as_ref() == Some(&tab_id) {
        storage.active_tab_id = None;
    }

    info!("标签页已从工作区删除: {}", tab_id);
    Ok(())
}

/// 获取工作区所有标签页
#[tauri::command]
pub async fn get_workspace_tabs(
    workspace_storage: State<'_, WorkspaceStorage>,
) -> Result<Vec<WorkspaceTab>, String> {
    debug!("获取工作区标签页列表");
    
    let storage = workspace_storage.lock().map_err(|e| {
        error!("获取工作区存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let tabs: Vec<WorkspaceTab> = storage.tabs.values().cloned().collect();
    
    info!("返回 {} 个工作区标签页", tabs.len());
    Ok(tabs)
}

/// 设置活跃标签页
#[tauri::command]
pub async fn set_active_workspace_tab(
    workspace_storage: State<'_, WorkspaceStorage>,
    tab_id: Option<String>,
) -> Result<(), String> {
    debug!("设置活跃工作区标签页: {:?}", tab_id);
    
    let mut storage = workspace_storage.lock().map_err(|e| {
        error!("获取工作区存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    storage.active_tab_id = tab_id.clone();
    storage.updated_at = Utc::now();

    info!("活跃工作区标签页已设置: {:?}", tab_id);
    Ok(())
}

/// 获取活跃标签页ID
#[tauri::command]
pub async fn get_active_workspace_tab(
    workspace_storage: State<'_, WorkspaceStorage>,
) -> Result<Option<String>, String> {
    debug!("获取活跃工作区标签页");
    
    let storage = workspace_storage.lock().map_err(|e| {
        error!("获取工作区存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    Ok(storage.active_tab_id.clone())
}

/// 清空工作区
#[tauri::command]
pub async fn clear_workspace(
    workspace_storage: State<'_, WorkspaceStorage>,
) -> Result<(), String> {
    debug!("清空工作区");
    
    let mut storage = workspace_storage.lock().map_err(|e| {
        error!("获取工作区存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let tab_count = storage.tabs.len();
    storage.tabs.clear();
    storage.active_tab_id = None;
    storage.updated_at = Utc::now();

    info!("工作区已清空，删除了 {} 个标签页", tab_count);
    Ok(())
}

/// 批量保存标签页到工作区
#[tauri::command]
pub async fn save_tabs_to_workspace(
    workspace_storage: State<'_, WorkspaceStorage>,
    tabs: Vec<serde_json::Value>,
    active_tab_id: Option<String>,
) -> Result<(), String> {
    debug!("批量保存标签页到工作区，共 {} 个标签页", tabs.len());
    
    let mut storage = workspace_storage.lock().map_err(|e| {
        error!("获取工作区存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    // 清空现有标签页
    storage.tabs.clear();

    // 添加新标签页
    for tab_data in tabs {
        let tab_id = tab_data["id"].as_str().unwrap_or_default().to_string();
        let title = tab_data["title"].as_str().unwrap_or("未命名").to_string();
        let content = tab_data["content"].as_str().unwrap_or("").to_string();
        let tab_type = tab_data["type"].as_str().unwrap_or("query").to_string();
        let database = tab_data["database"].as_str().map(|s| s.to_string());
        let connection_id = tab_data["connectionId"].as_str().map(|s| s.to_string());
        let table_name = tab_data["tableName"].as_str().map(|s| s.to_string());

        if !tab_id.is_empty() {
            let workspace_tab = WorkspaceTab {
                id: tab_id.clone(),
                title,
                content,
                tab_type,
                created_at: Utc::now(),
                updated_at: Utc::now(),
                database,
                connection_id,
                table_name,
            };

            storage.tabs.insert(tab_id, workspace_tab);
        }
    }

    storage.active_tab_id = active_tab_id;
    storage.updated_at = Utc::now();

    info!("批量保存完成，共保存 {} 个标签页", storage.tabs.len());
    Ok(())
}
