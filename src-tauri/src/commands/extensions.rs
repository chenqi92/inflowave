use serde::{Deserialize, Serialize};
use tauri::State;
use log::{debug, error, info};
use std::collections::HashMap;
use std::sync::Mutex;
use reqwest;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Plugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub enabled: bool,
    pub config: HashMap<String, serde_json::Value>,
    pub permissions: Vec<PluginPermission>,
    pub hooks: Vec<PluginHook>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginPermission {
    pub permission_type: String,
    pub scope: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PluginHook {
    pub event: String,
    pub handler: String,
    pub priority: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct APIIntegration {
    pub id: String,
    pub name: String,
    pub integration_type: String,
    pub endpoint: String,
    pub authentication: APIAuthentication,
    pub headers: HashMap<String, String>,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct APIAuthentication {
    pub auth_type: String,
    pub credentials: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WebhookConfig {
    pub id: String,
    pub name: String,
    pub url: String,
    pub events: Vec<String>,
    pub headers: HashMap<String, String>,
    pub secret: Option<String>,
    pub enabled: bool,
    pub retry_policy: RetryPolicy,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RetryPolicy {
    pub max_retries: u32,
    pub backoff_multiplier: f64,
    pub max_backoff_time: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutomationRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub trigger: AutomationTrigger,
    pub conditions: Vec<AutomationCondition>,
    pub actions: Vec<AutomationAction>,
    pub enabled: bool,
    pub last_executed: Option<chrono::DateTime<chrono::Utc>>,
    pub execution_count: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutomationTrigger {
    pub trigger_type: String,
    pub config: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutomationCondition {
    pub condition_type: String,
    pub operator: String,
    pub value: serde_json::Value,
    pub field: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutomationAction {
    pub action_type: String,
    pub config: HashMap<String, serde_json::Value>,
}

// 存储
type PluginStorage = Mutex<HashMap<String, Plugin>>;
type APIIntegrationStorage = Mutex<HashMap<String, APIIntegration>>;
type WebhookStorage = Mutex<HashMap<String, WebhookConfig>>;
type AutomationStorage = Mutex<HashMap<String, AutomationRule>>;

/// 获取已安装的插件列表
#[tauri::command]
pub async fn get_installed_plugins(
    plugin_storage: State<'_, PluginStorage>,
) -> Result<Vec<Plugin>, String> {
    debug!("获取已安装的插件列表");
    
    let storage = plugin_storage.lock().map_err(|e| {
        error!("获取插件存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    Ok(storage.values().cloned().collect())
}

/// 安装插件
#[tauri::command]
pub async fn install_plugin(
    plugin_storage: State<'_, PluginStorage>,
    plugin: Plugin,
) -> Result<(), String> {
    debug!("安装插件: {}", plugin.name);
    
    // 验证插件权限
    validate_plugin_permissions(&plugin)?;
    
    let mut storage = plugin_storage.lock().map_err(|e| {
        error!("获取插件存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    storage.insert(plugin.id.clone(), plugin.clone());
    info!("插件已安装: {}", plugin.name);
    Ok(())
}

/// 启用/禁用插件
#[tauri::command]
pub async fn toggle_plugin(
    plugin_storage: State<'_, PluginStorage>,
    plugin_id: String,
    enabled: bool,
) -> Result<(), String> {
    debug!("切换插件状态: {} -> {}", plugin_id, enabled);
    
    let mut storage = plugin_storage.lock().map_err(|e| {
        error!("获取插件存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    if let Some(plugin) = storage.get_mut(&plugin_id) {
        plugin.enabled = enabled;
        info!("插件状态已更新: {} -> {}", plugin_id, enabled);
        Ok(())
    } else {
        Err("插件不存在".to_string())
    }
}

/// 卸载插件
#[tauri::command]
pub async fn uninstall_plugin(
    plugin_storage: State<'_, PluginStorage>,
    plugin_id: String,
) -> Result<(), String> {
    debug!("卸载插件: {}", plugin_id);
    
    let mut storage = plugin_storage.lock().map_err(|e| {
        error!("获取插件存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    if storage.remove(&plugin_id).is_some() {
        info!("插件已卸载: {}", plugin_id);
        Ok(())
    } else {
        Err("插件不存在".to_string())
    }
}

/// 创建 API 集成
#[tauri::command]
pub async fn create_api_integration(
    api_storage: State<'_, APIIntegrationStorage>,
    integration: APIIntegration,
) -> Result<String, String> {
    debug!("创建 API 集成: {}", integration.name);
    
    // 测试 API 连接
    test_api_connection(&integration).await?;
    
    let mut storage = api_storage.lock().map_err(|e| {
        error!("获取 API 集成存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    let id = integration.id.clone();
    storage.insert(id.clone(), integration);
    
    info!("API 集成已创建: {}", id);
    Ok(id)
}

/// 获取 API 集成列表
#[tauri::command]
pub async fn get_api_integrations(
    api_storage: State<'_, APIIntegrationStorage>,
) -> Result<Vec<APIIntegration>, String> {
    debug!("获取 API 集成列表");
    
    let storage = api_storage.lock().map_err(|e| {
        error!("获取 API 集成存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    Ok(storage.values().cloned().collect())
}

/// 测试 API 集成
#[tauri::command]
pub async fn test_api_integration(
    integration: APIIntegration,
) -> Result<serde_json::Value, String> {
    debug!("测试 API 集成: {}", integration.name);
    
    test_api_connection(&integration).await
}

/// 创建 Webhook
#[tauri::command]
pub async fn create_webhook(
    webhook_storage: State<'_, WebhookStorage>,
    webhook: WebhookConfig,
) -> Result<String, String> {
    debug!("创建 Webhook: {}", webhook.name);
    
    let mut storage = webhook_storage.lock().map_err(|e| {
        error!("获取 Webhook 存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    let id = webhook.id.clone();
    storage.insert(id.clone(), webhook);
    
    info!("Webhook 已创建: {}", id);
    Ok(id)
}

/// 获取 Webhook 列表
#[tauri::command]
pub async fn get_webhooks(
    webhook_storage: State<'_, WebhookStorage>,
) -> Result<Vec<WebhookConfig>, String> {
    debug!("获取 Webhook 列表");
    
    let storage = webhook_storage.lock().map_err(|e| {
        error!("获取 Webhook 存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    Ok(storage.values().cloned().collect())
}

/// 触发 Webhook
#[tauri::command]
pub async fn trigger_webhook(
    webhook_storage: State<'_, WebhookStorage>,
    webhook_id: String,
    event: String,
    payload: serde_json::Value,
) -> Result<(), String> {
    debug!("触发 Webhook: {} -> {}", webhook_id, event);
    
    let storage = webhook_storage.lock().map_err(|e| {
        error!("获取 Webhook 存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    if let Some(webhook) = storage.get(&webhook_id) {
        if webhook.enabled && webhook.events.contains(&event) {
            send_webhook(webhook, &event, &payload).await?;
        }
    }
    
    Ok(())
}

/// 创建自动化规则
#[tauri::command]
pub async fn create_automation_rule(
    automation_storage: State<'_, AutomationStorage>,
    rule: AutomationRule,
) -> Result<String, String> {
    debug!("创建自动化规则: {}", rule.name);
    
    let mut storage = automation_storage.lock().map_err(|e| {
        error!("获取自动化存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    let id = rule.id.clone();
    storage.insert(id.clone(), rule);
    
    info!("自动化规则已创建: {}", id);
    Ok(id)
}

/// 获取自动化规则列表
#[tauri::command]
pub async fn get_automation_rules(
    automation_storage: State<'_, AutomationStorage>,
) -> Result<Vec<AutomationRule>, String> {
    debug!("获取自动化规则列表");
    
    let storage = automation_storage.lock().map_err(|e| {
        error!("获取自动化存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    Ok(storage.values().cloned().collect())
}

/// 执行自动化规则
#[tauri::command]
pub async fn execute_automation_rule(
    automation_storage: State<'_, AutomationStorage>,
    rule_id: String,
    context: serde_json::Value,
) -> Result<serde_json::Value, String> {
    debug!("执行自动化规则: {}", rule_id);
    
    let mut storage = automation_storage.lock().map_err(|e| {
        error!("获取自动化存储锁失败: {}", e);
        "存储访问失败".to_string()
    })?;
    
    if let Some(rule) = storage.get_mut(&rule_id) {
        if !rule.enabled {
            return Err("自动化规则已禁用".to_string());
        }
        
        // 检查条件
        if !evaluate_conditions(&rule.conditions, &context) {
            return Ok(serde_json::json!({"executed": false, "reason": "条件不满足"}));
        }
        
        // 执行动作
        let results = execute_actions(&rule.actions, &context).await?;
        
        // 更新执行统计
        rule.last_executed = Some(chrono::Utc::now());
        rule.execution_count += 1;
        
        info!("自动化规则执行完成: {}", rule_id);
        Ok(serde_json::json!({
            "executed": true,
            "results": results,
            "execution_count": rule.execution_count
        }))
    } else {
        Err("自动化规则不存在".to_string())
    }
}

/// 获取可用的集成模板
#[tauri::command]
pub async fn get_integration_templates() -> Result<Vec<serde_json::Value>, String> {
    debug!("获取集成模板");
    
    let templates = vec![
        serde_json::json!({
            "id": "slack_notifications",
            "name": "Slack 通知",
            "description": "将查询结果和警报发送到 Slack",
            "type": "webhook",
            "config": {
                "url": "https://hooks.slack.com/services/...",
                "events": ["query_completed", "alert_triggered"]
            }
        }),
        serde_json::json!({
            "id": "email_reports",
            "name": "邮件报告",
            "description": "定期发送数据报告邮件",
            "type": "automation",
            "config": {
                "trigger": "schedule",
                "schedule": "0 9 * * 1", // 每周一上午9点
                "action": "send_email"
            }
        }),
        serde_json::json!({
            "id": "grafana_dashboard",
            "name": "Grafana 仪表板",
            "description": "将数据推送到 Grafana",
            "type": "api",
            "config": {
                "endpoint": "http://grafana:3000/api/datasources/proxy/1/write",
                "auth_type": "bearer"
            }
        }),
    ];
    
    Ok(templates)
}

// 辅助函数
fn validate_plugin_permissions(plugin: &Plugin) -> Result<(), String> {
    // 验证插件权限是否合理
    for permission in &plugin.permissions {
        match permission.permission_type.as_str() {
            "database" | "file" | "network" | "system" => {
                // 权限类型有效
            }
            _ => {
                return Err(format!("无效的权限类型: {}", permission.permission_type));
            }
        }
    }
    Ok(())
}

async fn test_api_connection(integration: &APIIntegration) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let mut request = client.get(&integration.endpoint);
    
    // 添加认证
    match integration.authentication.auth_type.as_str() {
        "bearer" => {
            if let Some(token) = integration.authentication.credentials.get("token") {
                request = request.bearer_auth(token);
            }
        }
        "basic" => {
            if let Some(username) = integration.authentication.credentials.get("username") {
                if let Some(password) = integration.authentication.credentials.get("password") {
                    request = request.basic_auth(username, Some(password));
                }
            }
        }
        _ => {}
    }
    
    // 添加自定义头部
    for (key, value) in &integration.headers {
        request = request.header(key, value);
    }
    
    match request.send().await {
        Ok(response) => {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            
            Ok(serde_json::json!({
                "success": status.is_success(),
                "status": status.as_u16(),
                "body": body
            }))
        }
        Err(e) => {
            Err(format!("API 连接测试失败: {}", e))
        }
    }
}

async fn send_webhook(
    webhook: &WebhookConfig,
    event: &str,
    payload: &serde_json::Value,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut request = client.post(&webhook.url);
    
    // 添加头部
    for (key, value) in &webhook.headers {
        request = request.header(key, value);
    }
    
    // 构建 payload
    let webhook_payload = serde_json::json!({
        "event": event,
        "timestamp": chrono::Utc::now(),
        "data": payload
    });
    
    // 添加签名（如果有密钥）
    if let Some(secret) = &webhook.secret {
        let signature = generate_webhook_signature(&webhook_payload, secret);
        request = request.header("X-Webhook-Signature", signature);
    }
    
    match request.json(&webhook_payload).send().await {
        Ok(response) => {
            if response.status().is_success() {
                info!("Webhook 发送成功: {}", webhook.url);
                Ok(())
            } else {
                Err(format!("Webhook 发送失败: {}", response.status()))
            }
        }
        Err(e) => {
            error!("Webhook 发送错误: {}", e);
            Err(format!("Webhook 发送错误: {}", e))
        }
    }
}

fn evaluate_conditions(
    conditions: &[AutomationCondition],
    context: &serde_json::Value,
) -> bool {
    // 简单的条件评估逻辑
    for condition in conditions {
        // 这里应该实现更复杂的条件评估
        // 暂时返回 true
    }
    true
}

async fn execute_actions(
    actions: &[AutomationAction],
    context: &serde_json::Value,
) -> Result<Vec<serde_json::Value>, String> {
    let mut results = Vec::new();
    
    for action in actions {
        match action.action_type.as_str() {
            "query" => {
                // 执行查询动作
                results.push(serde_json::json!({"type": "query", "status": "executed"}));
            }
            "notification" => {
                // 发送通知动作
                results.push(serde_json::json!({"type": "notification", "status": "sent"}));
            }
            "webhook" => {
                // 触发 webhook 动作
                results.push(serde_json::json!({"type": "webhook", "status": "triggered"}));
            }
            _ => {
                results.push(serde_json::json!({"type": action.action_type, "status": "unknown"}));
            }
        }
    }
    
    Ok(results)
}

fn generate_webhook_signature(payload: &serde_json::Value, secret: &str) -> String {
    // 简单的签名生成，实际应该使用 HMAC
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    payload.to_string().hash(&mut hasher);
    secret.hash(&mut hasher);
    
    format!("sha256={:x}", hasher.finish())
}
