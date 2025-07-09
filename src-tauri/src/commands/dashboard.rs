use serde::{Deserialize, Serialize};
use tauri::State;
use log::{debug, error, info};
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardConfig {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub layout: DashboardLayout,
    pub widgets: Vec<DashboardWidget>,
    pub refresh_interval: u32,
    pub time_range: TimeRange,
    pub variables: Vec<DashboardVariable>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardLayout {
    pub columns: u32,
    pub rows: u32,
    pub gap: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardWidget {
    pub id: String,
    pub widget_type: String,
    pub title: String,
    pub position: WidgetPosition,
    pub config: WidgetConfig,
    pub query: String,
    pub database: String,
    pub refresh_interval: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WidgetPosition {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WidgetConfig {
    pub chart_type: Option<String>,
    pub color_scheme: Option<String>,
    pub show_legend: Option<bool>,
    pub show_grid: Option<bool>,
    pub y_axis_label: Option<String>,
    pub x_axis_label: Option<String>,
    pub thresholds: Option<Vec<Threshold>>,
    pub aggregation: Option<String>,
    pub group_by: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Threshold {
    pub value: f64,
    pub color: String,
    pub label: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeRange {
    pub start: String,
    pub end: String,
    pub relative: Option<RelativeTime>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RelativeTime {
    pub amount: u32,
    pub unit: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardVariable {
    pub name: String,
    pub var_type: String,
    pub label: String,
    pub default_value: serde_json::Value,
    pub options: Option<Vec<VariableOption>>,
    pub query: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VariableOption {
    pub label: String,
    pub value: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDashboardRequest {
    pub name: String,
    pub description: Option<String>,
    pub layout: DashboardLayout,
    pub refresh_interval: u32,
    pub time_range: TimeRange,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDashboardRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub layout: Option<DashboardLayout>,
    pub refresh_interval: Option<u32>,
    pub time_range: Option<TimeRange>,
    pub variables: Option<Vec<DashboardVariable>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWidgetRequest {
    pub dashboard_id: String,
    pub widget_type: String,
    pub title: String,
    pub position: WidgetPosition,
    pub config: WidgetConfig,
    pub query: String,
    pub database: String,
    pub refresh_interval: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateWidgetRequest {
    pub dashboard_id: String,
    pub widget_id: String,
    pub title: Option<String>,
    pub position: Option<WidgetPosition>,
    pub config: Option<WidgetConfig>,
    pub query: Option<String>,
    pub database: Option<String>,
    pub refresh_interval: Option<u32>,
}

// 简单的内存存储，实际应用中应该使用数据库
pub type DashboardStorage = Mutex<HashMap<String, DashboardConfig>>;

/// 创建仪表板
#[tauri::command]
pub async fn create_dashboard(
    dashboard_storage: State<'_, DashboardStorage>,
    request: CreateDashboardRequest,
) -> Result<String, String> {
    debug!("创建仪表板: {}", request.name);
    
    let dashboard = DashboardConfig {
        id: Uuid::new_v4().to_string(),
        name: request.name,
        description: request.description,
        layout: request.layout,
        widgets: Vec::new(),
        refresh_interval: request.refresh_interval,
        time_range: request.time_range,
        variables: Vec::new(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let mut storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let id = dashboard.id.clone();
    storage.insert(id.clone(), dashboard);

    info!("仪表板已创建: {}", id);
    Ok(id)
}

/// 获取仪表板列表
#[tauri::command]
pub async fn get_dashboards(
    dashboard_storage: State<'_, DashboardStorage>,
) -> Result<Vec<DashboardConfig>, String> {
    debug!("获取仪表板列表");
    
    let storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    let mut dashboards: Vec<DashboardConfig> = storage.values().cloned().collect();
    dashboards.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(dashboards)
}

/// 获取仪表板详情
#[tauri::command]
pub async fn get_dashboard(
    dashboard_storage: State<'_, DashboardStorage>,
    dashboard_id: String,
) -> Result<DashboardConfig, String> {
    debug!("获取仪表板详情: {}", dashboard_id);
    
    let storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    storage.get(&dashboard_id)
        .cloned()
        .ok_or_else(|| "仪表板不存在".to_string())
}

/// 更新仪表板
#[tauri::command]
pub async fn update_dashboard(
    dashboard_storage: State<'_, DashboardStorage>,
    request: UpdateDashboardRequest,
) -> Result<(), String> {
    debug!("更新仪表板: {}", request.id);
    
    let mut storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(dashboard) = storage.get_mut(&request.id) {
        if let Some(name) = request.name {
            dashboard.name = name;
        }
        if let Some(description) = request.description {
            dashboard.description = Some(description);
        }
        if let Some(layout) = request.layout {
            dashboard.layout = layout;
        }
        if let Some(refresh_interval) = request.refresh_interval {
            dashboard.refresh_interval = refresh_interval;
        }
        if let Some(time_range) = request.time_range {
            dashboard.time_range = time_range;
        }
        if let Some(variables) = request.variables {
            dashboard.variables = variables;
        }
        dashboard.updated_at = chrono::Utc::now();

        info!("仪表板已更新: {}", request.id);
        Ok(())
    } else {
        Err("仪表板不存在".to_string())
    }
}

/// 删除仪表板
#[tauri::command]
pub async fn delete_dashboard(
    dashboard_storage: State<'_, DashboardStorage>,
    dashboard_id: String,
) -> Result<(), String> {
    debug!("删除仪表板: {}", dashboard_id);
    
    let mut storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if storage.remove(&dashboard_id).is_some() {
        info!("仪表板已删除: {}", dashboard_id);
        Ok(())
    } else {
        Err("仪表板不存在".to_string())
    }
}

/// 添加组件到仪表板
#[tauri::command]
pub async fn add_widget_to_dashboard(
    dashboard_storage: State<'_, DashboardStorage>,
    request: CreateWidgetRequest,
) -> Result<String, String> {
    debug!("添加组件到仪表板: {}", request.dashboard_id);
    
    let mut storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(dashboard) = storage.get_mut(&request.dashboard_id) {
        let widget = DashboardWidget {
            id: Uuid::new_v4().to_string(),
            widget_type: request.widget_type,
            title: request.title,
            position: request.position,
            config: request.config,
            query: request.query,
            database: request.database,
            refresh_interval: request.refresh_interval,
        };

        let widget_id = widget.id.clone();
        dashboard.widgets.push(widget);
        dashboard.updated_at = chrono::Utc::now();

        info!("组件已添加到仪表板: {} -> {}", request.dashboard_id, widget_id);
        Ok(widget_id)
    } else {
        Err("仪表板不存在".to_string())
    }
}

/// 更新仪表板组件
#[tauri::command]
pub async fn update_dashboard_widget(
    dashboard_storage: State<'_, DashboardStorage>,
    request: UpdateWidgetRequest,
) -> Result<(), String> {
    debug!("更新仪表板组件: {} -> {}", request.dashboard_id, request.widget_id);
    
    let mut storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(dashboard) = storage.get_mut(&request.dashboard_id) {
        if let Some(widget) = dashboard.widgets.iter_mut().find(|w| w.id == request.widget_id) {
            if let Some(title) = request.title {
                widget.title = title;
            }
            if let Some(position) = request.position {
                widget.position = position;
            }
            if let Some(config) = request.config {
                widget.config = config;
            }
            if let Some(query) = request.query {
                widget.query = query;
            }
            if let Some(database) = request.database {
                widget.database = database;
            }
            if let Some(refresh_interval) = request.refresh_interval {
                widget.refresh_interval = Some(refresh_interval);
            }
            dashboard.updated_at = chrono::Utc::now();

            info!("仪表板组件已更新: {} -> {}", request.dashboard_id, request.widget_id);
            Ok(())
        } else {
            Err("组件不存在".to_string())
        }
    } else {
        Err("仪表板不存在".to_string())
    }
}

/// 从仪表板删除组件
#[tauri::command]
pub async fn remove_widget_from_dashboard(
    dashboard_storage: State<'_, DashboardStorage>,
    dashboard_id: String,
    widget_id: String,
) -> Result<(), String> {
    debug!("从仪表板删除组件: {} -> {}", dashboard_id, widget_id);
    
    let mut storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(dashboard) = storage.get_mut(&dashboard_id) {
        if let Some(pos) = dashboard.widgets.iter().position(|w| w.id == widget_id) {
            dashboard.widgets.remove(pos);
            dashboard.updated_at = chrono::Utc::now();
            info!("组件已从仪表板删除: {} -> {}", dashboard_id, widget_id);
            Ok(())
        } else {
            Err("组件不存在".to_string())
        }
    } else {
        Err("仪表板不存在".to_string())
    }
}

/// 获取可用的图表类型
#[tauri::command]
pub async fn get_chart_types() -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![
        serde_json::json!({
            "id": "line",
            "name": "折线图",
            "description": "显示数据随时间的变化趋势",
            "icon": "line-chart",
            "category": "time-series"
        }),
        serde_json::json!({
            "id": "bar",
            "name": "柱状图",
            "description": "比较不同类别的数据",
            "icon": "bar-chart",
            "category": "categorical"
        }),
        serde_json::json!({
            "id": "pie",
            "name": "饼图",
            "description": "显示数据的比例关系",
            "icon": "pie-chart",
            "category": "proportion"
        }),
        serde_json::json!({
            "id": "area",
            "name": "面积图",
            "description": "显示数据的累积变化",
            "icon": "area-chart",
            "category": "time-series"
        }),
        serde_json::json!({
            "id": "scatter",
            "name": "散点图",
            "description": "显示两个变量之间的关系",
            "icon": "dot-chart",
            "category": "correlation"
        }),
        serde_json::json!({
            "id": "gauge",
            "name": "仪表盘",
            "description": "显示单个指标的当前值",
            "icon": "dashboard",
            "category": "metric"
        }),
        serde_json::json!({
            "id": "table",
            "name": "表格",
            "description": "以表格形式显示详细数据",
            "icon": "table",
            "category": "data"
        }),
        serde_json::json!({
            "id": "metric",
            "name": "指标卡",
            "description": "显示关键指标的数值",
            "icon": "number",
            "category": "metric"
        })
    ])
}

/// 获取颜色方案
#[tauri::command]
pub async fn get_color_schemes() -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![
        serde_json::json!({
            "id": "default",
            "name": "默认",
            "colors": ["#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#13c2c2", "#eb2f96", "#fa541c"]
        }),
        serde_json::json!({
            "id": "blue",
            "name": "蓝色系",
            "colors": ["#0050b3", "#1890ff", "#40a9ff", "#69c0ff", "#91d5ff", "#bae7ff", "#d6f7ff", "#e6f7ff"]
        }),
        serde_json::json!({
            "id": "green",
            "name": "绿色系",
            "colors": ["#135200", "#389e0d", "#52c41a", "#73d13d", "#95de64", "#b7eb8f", "#d9f7be", "#f6ffed"]
        }),
        serde_json::json!({
            "id": "purple",
            "name": "紫色系",
            "colors": ["#391085", "#531dab", "#722ed1", "#9254de", "#b37feb", "#d3adf7", "#efdbff", "#f9f0ff"]
        }),
        serde_json::json!({
            "id": "orange",
            "name": "橙色系",
            "colors": ["#ad2102", "#d4380d", "#fa541c", "#ff7a45", "#ff9c6e", "#ffbb96", "#ffd8bf", "#fff2e8"]
        })
    ])
}

/// 复制仪表板
#[tauri::command]
pub async fn duplicate_dashboard(
    dashboard_storage: State<'_, DashboardStorage>,
    dashboard_id: String,
    new_name: String,
) -> Result<String, String> {
    debug!("复制仪表板: {} -> {}", dashboard_id, new_name);
    
    let mut storage = dashboard_storage.lock().map_err(|e| {
        error!("获取仪表板存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;

    if let Some(original) = storage.get(&dashboard_id).cloned() {
        let mut new_dashboard = original;
        new_dashboard.id = Uuid::new_v4().to_string();
        new_dashboard.name = new_name;
        new_dashboard.created_at = chrono::Utc::now();
        new_dashboard.updated_at = chrono::Utc::now();
        
        // 为所有组件生成新的 ID
        for widget in &mut new_dashboard.widgets {
            widget.id = Uuid::new_v4().to_string();
        }

        let new_id = new_dashboard.id.clone();
        storage.insert(new_id.clone(), new_dashboard);

        info!("仪表板已复制: {} -> {}", dashboard_id, new_id);
        Ok(new_id)
    } else {
        Err("原仪表板不存在".to_string())
    }
}
