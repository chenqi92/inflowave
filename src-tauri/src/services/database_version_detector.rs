/**
 * 数据库版本自动检测服务
 * 
 * 自动检测 InfluxDB 和 IoTDB 的版本，无需用户手动选择
 */

use anyhow::{Context, Result};
use log::{debug, info, warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::timeout;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseVersionInfo {
    pub database_type: String,
    pub version: String,
    pub major_version: u32,
    pub minor_version: u32,
    pub patch_version: u32,
    pub detected_type: String, // "influxdb1", "influxdb2", "influxdb3", "iotdb"
    pub api_endpoints: Vec<String>,
    pub supported_features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionDetectionResult {
    pub success: bool,
    pub version_info: Option<DatabaseVersionInfo>,
    pub error_message: Option<String>,
    pub detection_time_ms: u64,
    pub tried_methods: Vec<String>,
}

pub struct DatabaseVersionDetector {
    client: Client,
    timeout_duration: Duration,
}

impl DatabaseVersionDetector {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            timeout_duration: Duration::from_secs(5),
        }
    }

    /// 自动检测数据库版本
    pub async fn detect_database_version(
        &self,
        host: &str,
        port: u16,
        username: Option<&str>,
        password: Option<&str>,
        token: Option<&str>,
    ) -> Result<VersionDetectionResult> {
        let start_time = std::time::Instant::now();
        let mut tried_methods = Vec::new();

        info!("开始检测数据库版本: {}:{}", host, port);

        // 首先尝试检测 InfluxDB
        match self.detect_influxdb_version(host, port, username, password, token, &mut tried_methods).await {
            Ok(version_info) => {
                let detection_time = start_time.elapsed().as_millis() as u64;
                info!("成功检测到 InfluxDB 版本: {}", version_info.version);
                
                return Ok(VersionDetectionResult {
                    success: true,
                    version_info: Some(version_info),
                    error_message: None,
                    detection_time_ms: detection_time,
                    tried_methods,
                });
            }
            Err(e) => {
                debug!("InfluxDB 检测失败: {}", e);
            }
        }

        // 然后尝试检测 IoTDB
        match self.detect_iotdb_version(host, port, username, password, &mut tried_methods).await {
            Ok(version_info) => {
                let detection_time = start_time.elapsed().as_millis() as u64;
                info!("成功检测到 IoTDB 版本: {}", version_info.version);
                
                return Ok(VersionDetectionResult {
                    success: true,
                    version_info: Some(version_info),
                    error_message: None,
                    detection_time_ms: detection_time,
                    tried_methods,
                });
            }
            Err(e) => {
                debug!("IoTDB 检测失败: {}", e);
            }
        }

        let detection_time = start_time.elapsed().as_millis() as u64;
        warn!("无法检测数据库版本: {}:{}", host, port);

        Ok(VersionDetectionResult {
            success: false,
            version_info: None,
            error_message: Some("无法检测数据库类型和版本，请检查连接信息".to_string()),
            detection_time_ms: detection_time,
            tried_methods,
        })
    }

    /// 检测 InfluxDB 版本
    async fn detect_influxdb_version(
        &self,
        host: &str,
        port: u16,
        username: Option<&str>,
        password: Option<&str>,
        token: Option<&str>,
        tried_methods: &mut Vec<String>,
    ) -> Result<DatabaseVersionInfo> {
        let base_url = format!("http://{}:{}", host, port);

        // 方法1: 尝试 InfluxDB 1.x 的 /ping 端点（优先检测，因为更具体）
        tried_methods.push("influxdb1_ping".to_string());
        if let Ok(version_info) = self.try_influxdb1_ping(&base_url).await {
            return Ok(version_info);
        }

        // 方法2: 尝试 InfluxDB 2.x 的 /health 端点
        tried_methods.push("influxdb2_health".to_string());
        if let Ok(version_info) = self.try_influxdb2_health(&base_url).await {
            return Ok(version_info);
        }

        // 方法3: 尝试通过查询端点检测
        if let Some(username) = username {
            if let Some(password) = password {
                tried_methods.push("influxdb1_query".to_string());
                if let Ok(version_info) = self.try_influxdb1_query(&base_url, username, password).await {
                    return Ok(version_info);
                }
            }
        }

        // 方法4: 尝试 InfluxDB 2.x 的查询端点
        if let Some(token) = token {
            tried_methods.push("influxdb2_query".to_string());
            if let Ok(version_info) = self.try_influxdb2_query(&base_url, token).await {
                return Ok(version_info);
            }
        }

        Err(anyhow::anyhow!("无法检测 InfluxDB 版本"))
    }

    /// 尝试 InfluxDB 2.x 健康检查
    async fn try_influxdb2_health(&self, base_url: &str) -> Result<DatabaseVersionInfo> {
        let url = format!("{}/health", base_url);

        let response = timeout(
            self.timeout_duration,
            self.client.get(&url).send()
        ).await
        .context("请求超时")?
        .context("请求失败")?;

        if response.status().is_success() {
            let text = response.text().await.context("读取响应失败")?;

            // InfluxDB 2.x 的健康检查应该返回 JSON 格式
            if let Ok(health_info) = serde_json::from_str::<serde_json::Value>(&text) {
                // 检查是否包含 InfluxDB 2.x 特有的字段
                if health_info.get("name").is_some() || health_info.get("message").is_some() {
                    let version = health_info
                        .get("version")
                        .and_then(|v| v.as_str())
                        .unwrap_or("2.x.x")
                        .to_string();

                    return Ok(self.parse_influxdb_version_info(&version, "influxdb2"));
                }
            }

            // 如果响应成功但不是 JSON 或没有预期字段，可能不是 InfluxDB 2.x
            return Err(anyhow::anyhow!("响应格式不符合 InfluxDB 2.x 预期"));
        }

        Err(anyhow::anyhow!("InfluxDB 2.x 健康检查失败"))
    }

    /// 尝试 InfluxDB 1.x Ping
    async fn try_influxdb1_ping(&self, base_url: &str) -> Result<DatabaseVersionInfo> {
        let url = format!("{}/ping", base_url);
        
        let response = timeout(
            self.timeout_duration,
            self.client.get(&url).send()
        ).await
        .context("请求超时")?
        .context("请求失败")?;

        if response.status().is_success() {
            // 检查响应头中的版本信息
            if let Some(version_header) = response.headers().get("X-Influxdb-Version") {
                if let Ok(version) = version_header.to_str() {
                    return Ok(self.parse_influxdb_version_info(version, "influxdb1"));
                }
            }

            // 如果没有版本头，但 ping 成功，假设是 InfluxDB 1.x
            return Ok(self.parse_influxdb_version_info("1.x.x", "influxdb1"));
        }

        Err(anyhow::anyhow!("InfluxDB 1.x Ping 失败"))
    }

    /// 尝试 InfluxDB 1.x 查询
    async fn try_influxdb1_query(&self, base_url: &str, username: &str, password: &str) -> Result<DatabaseVersionInfo> {
        let url = format!("{}/query?q=SHOW+DIAGNOSTICS", base_url);
        
        let response = timeout(
            self.timeout_duration,
            self.client
                .get(&url)
                .basic_auth(username, Some(password))
                .send()
        ).await
        .context("请求超时")?
        .context("请求失败")?;

        if response.status().is_success() {
            return Ok(self.parse_influxdb_version_info("1.x.x", "influxdb1"));
        }

        Err(anyhow::anyhow!("InfluxDB 1.x 查询失败"))
    }

    /// 尝试 InfluxDB 2.x 查询
    async fn try_influxdb2_query(&self, base_url: &str, token: &str) -> Result<DatabaseVersionInfo> {
        let url = format!("{}/api/v2/query", base_url);
        
        let response = timeout(
            self.timeout_duration,
            self.client
                .post(&url)
                .header("Authorization", format!("Token {}", token))
                .header("Content-Type", "application/vnd.flux")
                .body("buckets() |> limit(n: 1)")
                .send()
        ).await
        .context("请求超时")?
        .context("请求失败")?;

        if response.status().is_success() {
            return Ok(self.parse_influxdb_version_info("2.x.x", "influxdb2"));
        }

        Err(anyhow::anyhow!("InfluxDB 2.x 查询失败"))
    }

    /// 解析 InfluxDB 版本信息
    fn parse_influxdb_version_info(&self, version: &str, detected_type: &str) -> DatabaseVersionInfo {
        let (major, minor, patch) = self.parse_version_string(version);
        
        let api_endpoints = match detected_type {
            "influxdb1" => vec!["/ping".to_string(), "/query".to_string()],
            "influxdb2" => vec!["/health".to_string(), "/api/v2/query".to_string()],
            _ => vec![],
        };

        let supported_features = match detected_type {
            "influxdb1" => vec!["InfluxQL".to_string(), "HTTP API".to_string()],
            "influxdb2" => vec!["Flux".to_string(), "InfluxQL".to_string(), "HTTP API v2".to_string()],
            _ => vec![],
        };

        DatabaseVersionInfo {
            database_type: "InfluxDB".to_string(),
            version: version.to_string(),
            major_version: major,
            minor_version: minor,
            patch_version: patch,
            detected_type: detected_type.to_string(),
            api_endpoints,
            supported_features,
        }
    }

    /// 检测 IoTDB 版本
    async fn detect_iotdb_version(
        &self,
        host: &str,
        port: u16,
        _username: Option<&str>,
        _password: Option<&str>,
        tried_methods: &mut Vec<String>,
    ) -> Result<DatabaseVersionInfo> {
        tried_methods.push("iotdb_tcp_connect".to_string());

        // IoTDB 使用 TCP 连接，这里只能做基本的端口检测
        // 实际的版本检测需要建立 Thrift 连接
        use tokio::net::TcpStream;
        
        let addr = format!("{}:{}", host, port);
        match timeout(self.timeout_duration, TcpStream::connect(&addr)).await {
            Ok(Ok(_stream)) => {
                // TCP 连接成功，假设是 IoTDB
                // 在实际应用中，这里应该建立 Thrift 连接并查询版本
                Ok(DatabaseVersionInfo {
                    database_type: "IoTDB".to_string(),
                    version: "1.x.x".to_string(),
                    major_version: 1,
                    minor_version: 0,
                    patch_version: 0,
                    detected_type: "iotdb".to_string(),
                    api_endpoints: vec!["thrift://{}:{}".to_string()],
                    supported_features: vec!["SQL".to_string(), "Thrift API".to_string()],
                })
            }
            _ => Err(anyhow::anyhow!("无法连接到 IoTDB"))
        }
    }

    /// 解析版本字符串
    fn parse_version_string(&self, version: &str) -> (u32, u32, u32) {
        let parts: Vec<&str> = version.split('.').collect();
        let major = parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0);
        let minor = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
        let patch = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
        (major, minor, patch)
    }
}
