/**
 * HTTP客户端构建工具
 * 
 * 提供统一的HTTP客户端创建功能，支持代理配置
 */

use crate::models::{ConnectionConfig, ProxyConfig, ProxyType};
use anyhow::{Context, Result};
use log::{debug, info};
use reqwest::Client;
use std::time::Duration;

/// 为连接配置创建HTTP客户端
pub fn build_http_client(config: &ConnectionConfig) -> Result<Client> {
    let timeout = Duration::from_secs(config.timeout as u64);
    build_http_client_with_timeout(config.proxy_config.as_ref(), timeout, config.ssl)
}

/// 使用指定的超时时间创建HTTP客户端
pub fn build_http_client_with_timeout(
    proxy_config: Option<&ProxyConfig>,
    timeout: Duration,
    ssl: bool,
) -> Result<Client> {
    let mut builder = Client::builder()
        .timeout(timeout)
        .danger_accept_invalid_certs(!ssl); // 开发环境可能使用自签名证书

    // 如果有代理配置，添加代理设置
    if let Some(proxy_config) = proxy_config {
        if proxy_config.enabled {
            info!(
                "配置代理: {}://{}:{}",
                match proxy_config.proxy_type {
                    ProxyType::Http => "http",
                    ProxyType::Https => "https",
                    ProxyType::Socks5 => "socks5",
                },
                proxy_config.host,
                proxy_config.port
            );

            let proxy_url = format!(
                "{}://{}:{}",
                match proxy_config.proxy_type {
                    ProxyType::Http => "http",
                    ProxyType::Https => "https",
                    ProxyType::Socks5 => "socks5",
                },
                proxy_config.host,
                proxy_config.port
            );

            let mut proxy = reqwest::Proxy::all(&proxy_url)
                .context("创建代理配置失败")?;

            // 如果提供了代理认证信息
            if let (Some(username), Some(password)) = (&proxy_config.username, &proxy_config.password) {
                debug!("配置代理认证: {}", username);
                proxy = proxy.basic_auth(username, password);
            }

            builder = builder.proxy(proxy);
        }
    }

    builder.build().context("创建HTTP客户端失败")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_http_client_without_proxy() {
        let result = build_http_client_with_timeout(None, Duration::from_secs(30), true);
        assert!(result.is_ok());
    }

    #[test]
    fn test_build_http_client_with_proxy() {
        let proxy_config = ProxyConfig {
            enabled: true,
            host: "127.0.0.1".to_string(),
            port: 8080,
            username: None,
            password: None,
            proxy_type: ProxyType::Http,
        };

        let result = build_http_client_with_timeout(
            Some(&proxy_config),
            Duration::from_secs(30),
            true,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn test_build_http_client_with_proxy_auth() {
        let proxy_config = ProxyConfig {
            enabled: true,
            host: "127.0.0.1".to_string(),
            port: 8080,
            username: Some("user".to_string()),
            password: Some("pass".to_string()),
            proxy_type: ProxyType::Http,
        };

        let result = build_http_client_with_timeout(
            Some(&proxy_config),
            Duration::from_secs(30),
            true,
        );
        assert!(result.is_ok());
    }
}

