/**
 * InfluxDB 版本探测器
 * 
 * 负责探测 InfluxDB 实例的版本和能力
 */

use super::capability::{Capability, Health, HealthStatus};
use crate::models::ConnectionConfig;
use anyhow::{anyhow, Result};
use log::{debug, info};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

/// InfluxDB 版本探测器
pub struct InfluxDetector;

impl InfluxDetector {
    /// 探测 InfluxDB 版本和能力
    pub async fn detect(config: &ConnectionConfig) -> Result<Capability> {
        let base_url = if config.ssl {
            format!("https://{}:{}", config.host, config.port)
        } else {
            format!("http://{}:{}", config.host, config.port)
        };

        let client = Self::create_http_client(config)?;

        info!("开始探测 InfluxDB 版本: {}", base_url);

        // 优先根据配置的版本信息和 v2_config 来判断
        if let Some(version) = &config.version {
            info!("配置中指定版本: {}", version);

            // 如果明确指定为 2.x 或 3.x，且有 v2_config，直接返回对应能力
            if (version.contains("2.") || version.contains("2x") || version == "2.x") && config.v2_config.is_some() {
                info!("根据配置直接识别为 InfluxDB 2.x");
                return Ok(Capability::v2x(version.clone()));
            }

            if (version.contains("3.") || version.contains("3x") || version == "3.x") && config.v2_config.is_some() {
                info!("根据配置直接识别为 InfluxDB 3.x");
                return Ok(Capability::v3x(version.clone(), false));
            }

            if version.contains("1.") || version.contains("1x") || version == "1.x" {
                info!("根据配置直接识别为 InfluxDB 1.x");
                return Ok(Capability::v1x(version.clone()));
            }
        }

        // 如果有 v2_config 但没有明确版本，优先尝试 2.x
        if config.v2_config.is_some() {
            info!("检测到 v2_config，优先尝试 InfluxDB 2.x");

            // 2. 尝试探测 InfluxDB 2.x
            if let Ok(capability) = Self::detect_v2x(&client, &base_url, config).await {
                info!("检测到 InfluxDB 2.x: {}", capability.version);
                return Ok(capability);
            }

            // 3. 尝试探测 InfluxDB 3.x
            if let Ok(capability) = Self::detect_v3x(&client, &base_url, config).await {
                info!("检测到 InfluxDB 3.x: {}", capability.version);
                return Ok(capability);
            }
        }

        // 1. 尝试探测 InfluxDB 1.x
        if let Ok(capability) = Self::detect_v1x(&client, &base_url, config).await {
            info!("检测到 InfluxDB 1.x: {}", capability.version);
            return Ok(capability);
        }

        // 2. 尝试探测 InfluxDB 2.x
        if let Ok(capability) = Self::detect_v2x(&client, &base_url, config).await {
            info!("检测到 InfluxDB 2.x: {}", capability.version);
            return Ok(capability);
        }

        // 3. 尝试探测 InfluxDB 3.x
        if let Ok(capability) = Self::detect_v3x(&client, &base_url, config).await {
            info!("检测到 InfluxDB 3.x: {}", capability.version);
            return Ok(capability);
        }

        Err(anyhow!("无法识别 InfluxDB 版本，请检查连接配置"))
    }
    
    /// 创建 HTTP 客户端
    fn create_http_client(config: &ConnectionConfig) -> Result<Client> {
        let mut builder = Client::builder()
            .timeout(Duration::from_secs(config.timeout as u64))
            .danger_accept_invalid_certs(!config.ssl); // 开发环境可能使用自签名证书
        
        // 如果有代理配置，添加代理设置
        if let Some(proxy_config) = &config.proxy_config {
            if proxy_config.enabled {
                let proxy_url = format!("{}://{}:{}", 
                    match proxy_config.proxy_type {
                        crate::models::ProxyType::Http => "http",
                        crate::models::ProxyType::Https => "https",
                        crate::models::ProxyType::Socks5 => "socks5",
                    },
                    proxy_config.host, 
                    proxy_config.port
                );
                
                let proxy = reqwest::Proxy::all(&proxy_url)?;
                if let (Some(username), Some(password)) = (&proxy_config.username, &proxy_config.password) {
                    builder = builder.proxy(proxy.basic_auth(username, password));
                } else {
                    builder = builder.proxy(proxy);
                }
            }
        }
        
        Ok(builder.build()?)
    }
    
    /// 探测 InfluxDB 1.x
    async fn detect_v1x(client: &Client, base_url: &str, config: &ConnectionConfig) -> Result<Capability> {
        debug!("尝试探测 InfluxDB 1.x");
        
        let mut request = client.get(&format!("{}/ping", base_url));
        
        // 添加认证信息
        if let (Some(username), Some(password)) = (&config.username, &config.password) {
            request = request.basic_auth(username, Some(password));
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            if let Some(version_header) = response.headers().get("X-Influxdb-Version") {
                let version = version_header.to_str()?.to_string();
                debug!("检测到 InfluxDB 1.x 版本: {}", version);
                return Ok(Capability::v1x(version));
            }
        }
        
        Err(anyhow!("不是 InfluxDB 1.x"))
    }
    
    /// 探测 InfluxDB 2.x
    async fn detect_v2x(client: &Client, base_url: &str, config: &ConnectionConfig) -> Result<Capability> {
        debug!("尝试探测 InfluxDB 2.x");

        // 检查是否有 v2_config
        if let Some(v2_config) = &config.v2_config {
            debug!("检测到 v2_config，API Token 长度: {}", v2_config.api_token.len());

            // 尝试 /health 端点
            let health_url = format!("{}/health", base_url);
            let request = client.get(&health_url)
                .bearer_auth(&v2_config.api_token);

            match request.send().await {
                Ok(response) => {
                    debug!("InfluxDB 2.x /health 响应状态: {}", response.status());

                    if response.status().is_success() {
                        if let Ok(json) = response.json::<Value>().await {
                            if let Some(version_str) = json["version"].as_str() {
                                if version_str.starts_with('2') {
                                    debug!("检测到 InfluxDB 2.x 版本: {}", version_str);
                                    return Ok(Capability::v2x(version_str.to_string()));
                                }
                            }
                        }
                    } else if response.status() == 401 {
                        debug!("InfluxDB 2.x /health 返回 401，API Token 可能无效或已加密");
                    }
                }
                Err(e) => {
                    debug!("InfluxDB 2.x /health 请求失败: {}", e);
                }
            }

            // 尝试 /api/v2/ping 端点
            let ping_url = format!("{}/api/v2/ping", base_url);
            let request = client.get(&ping_url)
                .bearer_auth(&v2_config.api_token);

            match request.send().await {
                Ok(response) => {
                    debug!("InfluxDB 2.x /api/v2/ping 响应状态: {}", response.status());

                    if response.status().is_success() {
                        // 如果 ping 成功，假设是 2.x 版本
                        debug!("通过 /api/v2/ping 检测到 InfluxDB 2.x");
                        return Ok(Capability::v2x("2.x".to_string()));
                    } else if response.status() == 401 {
                        debug!("InfluxDB 2.x /api/v2/ping 返回 401，API Token 可能无效或已加密");
                    }
                }
                Err(e) => {
                    debug!("InfluxDB 2.x /api/v2/ping 请求失败: {}", e);
                }
            }
        } else {
            debug!("未检测到 v2_config，跳过 InfluxDB 2.x 探测");
        }

        Err(anyhow!("不是 InfluxDB 2.x"))
    }
    
    /// 探测 InfluxDB 3.x
    async fn detect_v3x(client: &Client, base_url: &str, config: &ConnectionConfig) -> Result<Capability> {
        debug!("尝试探测 InfluxDB 3.x");
        
        // 首先尝试 HTTP API
        if let Ok(capability) = Self::detect_v3x_http(client, base_url, config).await {
            return Ok(capability);
        }
        
        // 然后尝试 FlightSQL
        #[cfg(feature = "influxdb-v3")]
        if let Ok(capability) = Self::detect_v3x_flight(base_url, config).await {
            return Ok(capability);
        }
        
        Err(anyhow!("不是 InfluxDB 3.x"))
    }
    
    /// 通过 HTTP API 探测 InfluxDB 3.x
    async fn detect_v3x_http(client: &Client, base_url: &str, config: &ConnectionConfig) -> Result<Capability> {
        // 尝试 /api/v3/ping 端点（如果存在）
        let ping_url = format!("{}/api/v3/ping", base_url);
        let mut request = client.get(&ping_url);
        
        if let Some(v2_config) = &config.v2_config {
            request = request.bearer_auth(&v2_config.api_token);
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            let json: Value = response.json().await?;
            
            if let Some(version_str) = json["version"].as_str() {
                if version_str.starts_with('3') {
                    debug!("通过 HTTP API 检测到 InfluxDB 3.x: {}", version_str);
                    return Ok(Capability::v3x(version_str.to_string(), false));
                }
            }
        }
        
        Err(anyhow!("HTTP API 未检测到 InfluxDB 3.x"))
    }
    
    /// 通过 FlightSQL 探测 InfluxDB 3.x
    #[cfg(feature = "influxdb-v3")]
    async fn detect_v3x_flight(base_url: &str, config: &ConnectionConfig) -> Result<Capability> {
        // 实现 FlightSQL 握手检测
        // 这里需要使用 arrow-flight 库进行 gRPC 连接测试

        debug!("尝试通过 FlightSQL 探测 InfluxDB 3.x: {}", base_url);

        // 解析 gRPC 端点
        let grpc_url = if base_url.contains(":8086") {
            base_url.replace(":8086", ":8087") // 默认 FlightSQL 端口
        } else {
            format!("{}:8087", base_url.trim_end_matches('/'))
        };

        // 尝试建立 gRPC 连接
        // 在实际实现中，这里应该：
        // 1. 创建 FlightSQL 客户端
        // 2. 执行握手请求
        // 3. 验证 InfluxDB 3.x 特性

        // 模拟 FlightSQL 连接测试
        match tokio::net::TcpStream::connect(&grpc_url.replace("http://", "").replace("https://", "")).await {
            Ok(_) => {
                info!("FlightSQL 端口可达，假设为 InfluxDB 3.x");

                // 构建 InfluxDB 3.x 能力描述
                Ok(Capability {
                    server: ServerInfo {
                        version: Version::parse("3.0.0").unwrap(),
                        build: "flight".to_string(),
                        commit: "unknown".to_string(),
                    },
                    features: FeatureSet {
                        flux_support: true,
                        influxql_support: true,
                        sql_support: true,
                        flight_sql_support: true,
                        v1_api_support: false,
                        v2_api_support: false,
                        v3_api_support: true,
                    },
                    limits: ResourceLimits::default(),
                })
            },
            Err(e) => {
                debug!("FlightSQL 连接失败: {}", e);
                Err(anyhow!("FlightSQL 连接失败: {}", e))
            }
        }
    }
    
    /// 获取健康状态
    pub async fn get_health(config: &ConnectionConfig, capability: &Capability) -> Result<Health> {
        let base_url = if config.ssl {
            format!("https://{}:{}", config.host, config.port)
        } else {
            format!("http://{}:{}", config.host, config.port)
        };
        
        let client = Self::create_http_client(config)?;
        
        match capability.major {
            1 => Self::get_v1x_health(&client, &base_url, config).await,
            2 => Self::get_v2x_health(&client, &base_url, config).await,
            3 => Self::get_v3x_health(&client, &base_url, config).await,
            _ => Err(anyhow!("不支持的版本: {}", capability.major)),
        }
    }
    
    /// 获取 1.x 健康状态
    async fn get_v1x_health(client: &Client, base_url: &str, config: &ConnectionConfig) -> Result<Health> {
        let mut request = client.get(&format!("{}/ping", base_url));
        
        if let (Some(username), Some(password)) = (&config.username, &config.password) {
            request = request.basic_auth(username, Some(password));
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            let version = response
                .headers()
                .get("X-Influxdb-Version")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("1.x")
                .to_string();
            
            Ok(Health {
                status: HealthStatus::Healthy,
                version,
                uptime: None,
                message: Some("InfluxDB 1.x 运行正常".to_string()),
            })
        } else {
            let status = response.status();
            Ok(Health {
                status: HealthStatus::Unhealthy,
                version: "1.x".to_string(),
                uptime: None,
                message: Some(format!("连接失败: {}", status)),
            })
        }
    }
    
    /// 获取 2.x 健康状态
    async fn get_v2x_health(client: &Client, base_url: &str, config: &ConnectionConfig) -> Result<Health> {
        let mut request = client.get(&format!("{}/health", base_url));
        
        if let Some(v2_config) = &config.v2_config {
            request = request.bearer_auth(&v2_config.api_token);
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            let json: Value = response.json().await?;
            
            let status = match json["status"].as_str() {
                Some("pass") => HealthStatus::Healthy,
                Some("warn") => HealthStatus::Degraded,
                _ => HealthStatus::Unhealthy,
            };
            
            let version = json["version"].as_str().unwrap_or("2.x").to_string();
            let message = json["message"].as_str().map(|s| s.to_string());
            
            Ok(Health {
                status,
                version,
                uptime: None,
                message,
            })
        } else {
            let status = response.status();
            Ok(Health {
                status: HealthStatus::Unhealthy,
                version: "2.x".to_string(),
                uptime: None,
                message: Some(format!("连接失败: {}", status)),
            })
        }
    }
    
    /// 获取 3.x 健康状态
    async fn get_v3x_health(client: &Client, base_url: &str, config: &ConnectionConfig) -> Result<Health> {
        // 3.x 的健康检查可能需要通过不同的端点
        // 这里先实现一个基本的连接测试
        let mut request = client.get(&format!("{}/api/v3/ping", base_url));
        
        if let Some(v2_config) = &config.v2_config {
            request = request.bearer_auth(&v2_config.api_token);
        }
        
        let response = request.send().await?;
        
        if response.status().is_success() {
            Ok(Health {
                status: HealthStatus::Healthy,
                version: "3.x".to_string(),
                uptime: None,
                message: Some("InfluxDB 3.x 运行正常".to_string()),
            })
        } else {
            let status = response.status();
            Ok(Health {
                status: HealthStatus::Unhealthy,
                version: "3.x".to_string(),
                uptime: None,
                message: Some(format!("连接失败: {}", status)),
            })
        }
    }
}
