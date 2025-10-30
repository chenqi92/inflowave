use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use log::{debug, error, info};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetachedTab {
    pub id: String,
    pub title: String,
    pub content: String,
    #[serde(rename = "type")]
    pub tab_type: String,
    pub connection_id: Option<String>,
    pub database: Option<String>,
    pub table_name: Option<String>,
    pub modified: Option<bool>,
    // 查询结果相关字段 - 使用 serde_json::Value 来存储任意 JSON 数据
    pub query_result: Option<serde_json::Value>,
    pub query_results: Option<Vec<serde_json::Value>>,
    pub executed_queries: Option<Vec<String>>,
    pub execution_time: Option<f64>,
}

/// 创建分离的tab窗口
#[tauri::command(rename_all = "camelCase")]
pub async fn create_detached_window(
    app: AppHandle,
    label: String,
    title: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    tab: DetachedTab,
) -> Result<String, String> {
    debug!("创建分离窗口: {} - {}", label, title);
    
    // 将tab数据序列化为JSON字符串
    let tab_json = serde_json::to_string(&tab).map_err(|e| {
        error!("序列化tab数据失败: {}", e);
        format!("序列化tab数据失败: {}", e)
    })?;
    
    // 构建窗口URL，将tab数据作为查询参数传递
    let url = format!("/?detached_tab={}", urlencoding::encode(&tab_json));
    
    // 创建新窗口
    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::App(url.into())
    )
    .title(&title)
    .inner_size(width, height)
    .position(x, y)
    .resizable(true)
    .decorations(true)
    .build()
    .map_err(|e| {
        error!("创建窗口失败: {}", e);
        format!("创建窗口失败: {}", e)
    })?;
    
    info!("成功创建分离窗口: {}", label);
    
    // 显示窗口
    window.show().map_err(|e| {
        error!("显示窗口失败: {}", e);
        format!("显示窗口失败: {}", e)
    })?;
    
    Ok(label)
}

/// 关闭分离的窗口
#[tauri::command(rename_all = "camelCase")]
pub async fn close_detached_window(
    app: AppHandle,
    label: String,
) -> Result<(), String> {
    debug!("关闭分离窗口: {}", label);
    
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| {
            error!("关闭窗口失败: {}", e);
            format!("关闭窗口失败: {}", e)
        })?;
        
        info!("成功关闭分离窗口: {}", label);
        Ok(())
    } else {
        Err(format!("找不到窗口: {}", label))
    }
}

/// 获取所有窗口列表
#[tauri::command]
pub async fn get_all_windows(app: AppHandle) -> Result<Vec<String>, String> {
    debug!("获取所有窗口列表");

    let windows: Vec<String> = app.webview_windows()
        .keys()
        .cloned()
        .collect();

    info!("当前窗口列表: {:?}", windows);
    Ok(windows)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReattachTabData {
    #[serde(rename = "type")]
    pub data_type: String,
    pub tab: DetachedTab,
}

/// 将tab重新附加到主窗口
#[tauri::command(rename_all = "camelCase")]
pub async fn reattach_tab(
    app: AppHandle,
    tab: DetachedTab,
) -> Result<(), String> {
    debug!("重新附加tab到主窗口: {}", tab.id);

    // 获取主窗口
    let main_window = app.get_webview_window("main")
        .ok_or_else(|| "找不到主窗口".to_string())?;

    // 创建事件数据
    let event_data = ReattachTabData {
        data_type: "detached-tab".to_string(),
        tab,
    };

    // 向主窗口发送事件
    main_window.emit("reattach-tab", event_data).map_err(|e| {
        error!("发送重新附加事件失败: {}", e);
        format!("发送重新附加事件失败: {}", e)
    })?;

    info!("成功发送重新附加事件");
    Ok(())
}

