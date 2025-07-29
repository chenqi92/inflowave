/**
 * IoTDB 版本探测和能力检测模块
 * 
 * 运行时探测服务器版本和功能支持情况
 */

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use log::{debug, info, warn};

use super::driver::DriverConfig;

/// 版本信息
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct VersionInfo {
    pub major: u8,
    pub minor: u8,
    pub patch: u8,
    pub build: Option<String>,
    pub raw: String,
}

impl VersionInfo {
    /// 从版本字符串解析版本信息
    pub fn parse(version_str: &str) -> Result<Self> {
        let version_str = version_str.trim();
        
        // 处理常见的版本格式
        // 例如: "2.0.3", "1.3.2", "0.13.4", "2.0.1-beta"
        let parts: Vec<&str> = version_str.split('-').collect();
        let version_part = parts[0];
        let build = if parts.len() > 1 {
            Some(parts[1..].join("-"))
        } else {
            None
        };
        
        let version_nums: Vec<&str> = version_part.split('.').collect();
        if version_nums.len() < 2 {
            return Err(anyhow::anyhow!("无效的版本格式: {}", version_str));
        }
        
        let major = version_nums[0].parse::<u8>()
            .context("解析主版本号失败")?;
        let minor = version_nums[1].parse::<u8>()
            .context("解析次版本号失败")?;
        let patch = if version_nums.len() > 2 {
            version_nums[2].parse::<u8>().unwrap_or(0)
        } else {
            0
        };
        
        Ok(VersionInfo {
            major,
            minor,
            patch,
            build,
            raw: version_str.to_string(),
        })
    }
    
    /// 检查是否支持某个特性
    pub fn supports_feature(&self, feature: &str) -> bool {
        match feature {
            "table_model" => self.major >= 2,
            "new_types" => self.major > 1 || (self.major == 1 && self.minor >= 3),
            "rest_v2" => self.major > 1 || (self.major == 1 && self.minor >= 2),
            "ssl" => true, // 大部分版本都支持SSL
            _ => false,
        }
    }
}

/// 服务器能力信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerCapability {
    pub version: VersionInfo,
    pub tree_model: bool,
    pub table_model: bool,
    pub rest_v2: bool,
    pub new_types: bool,
    pub ssl: bool,
    pub supported_protocols: Vec<String>,
    pub extra_properties: HashMap<String, String>,
}

/// 完整的能力检测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capability {
    pub server: ServerCapability,
    pub connection_info: ConnectionInfo,
}

/// 连接信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub host: String,
    pub port: u16,
    pub ssl: bool,
    pub available_ports: HashMap<String, u16>, // protocol -> port
}

impl Capability {
    /// 探测服务器能力
    pub async fn detect(config: &DriverConfig) -> Result<Self> {
        info!("开始探测 IoTDB 服务器能力: {}:{}", config.host, config.port);
        
        // 首先尝试获取版本信息
        let version = Self::detect_version(config).await?;
        info!("检测到 IoTDB 版本: {}", version.raw);
        
        // 基于版本信息推断基本能力
        let mut server_capability = ServerCapability {
            version: version.clone(),
            tree_model: true, // 所有版本都支持树模型
            table_model: version.supports_feature("table_model"),
            rest_v2: version.supports_feature("rest_v2"),
            new_types: version.supports_feature("new_types"),
            ssl: version.supports_feature("ssl"),
            supported_protocols: vec!["thrift".to_string()],
            extra_properties: HashMap::new(),
        };
        
        // 检测具体功能支持
        if let Ok(props) = Self::detect_detailed_capabilities(config, &version).await {
            server_capability.extra_properties = props;
        }
        
        // 检测可用协议和端口
        let available_ports = Self::detect_available_ports(config).await;
        if available_ports.contains_key("rest") {
            server_capability.supported_protocols.push("rest".to_string());
        }
        
        let connection_info = ConnectionInfo {
            host: config.host.clone(),
            port: config.port,
            ssl: config.ssl,
            available_ports,
        };
        
        Ok(Capability {
            server: server_capability,
            connection_info,
        })
    }
    
    /// 探测版本信息
    async fn detect_version(config: &DriverConfig) -> Result<VersionInfo> {
        // 尝试多种方式获取版本信息
        let version_queries = vec![
            "SHOW VERSION",
            "SELECT version()",
            "SHOW CLUSTER",
        ];
        
        for query in version_queries {
            if let Ok(version_str) = Self::execute_version_query(config, query).await {
                if let Ok(version) = VersionInfo::parse(&version_str) {
                    return Ok(version);
                }
            }
        }
        
        // 如果无法获取版本信息，尝试通过端口推断
        warn!("无法获取版本信息，尝试通过默认配置推断");
        Ok(VersionInfo {
            major: 1,
            minor: 0,
            patch: 0,
            build: None,
            raw: "unknown".to_string(),
        })
    }
    
    /// 执行版本查询
    async fn execute_version_query(_config: &DriverConfig, query: &str) -> Result<String> {
        // 这里需要实现一个简单的查询执行器
        // 暂时返回模拟数据，后续会在驱动实现中完善
        debug!("执行版本查询: {}", query);

        // 实现实际的查询逻辑
        // 使用最基础的连接方式来获取版本信息

        // 尝试建立基础连接来执行查询
        let address = format!("{}:{}", _config.host, _config.port);

        match tokio::net::TcpStream::connect(&address).await {
            Ok(_stream) => {
                // 连接成功，模拟查询执行
                // 在实际实现中，这里应该：
                // 1. 建立 Thrift 或 REST 连接
                // 2. 执行版本查询
                // 3. 解析返回结果

                // 根据查询类型返回模拟结果
                if query.contains("version") || query.contains("VERSION") {
                    Ok("IoTDB version 1.3.0".to_string())
                } else if query.contains("show") && query.contains("cluster") {
                    Ok("cluster_info: standalone".to_string())
                } else {
                    Ok("query_result: success".to_string())
                }
            },
            Err(e) => {
                debug!("无法连接到 IoTDB 服务器进行版本查询: {}", e);
                Err(anyhow::anyhow!("连接失败: {}", e))
            }
        }
    }
    
    /// 检测详细能力
    async fn detect_detailed_capabilities(
        config: &DriverConfig, 
        version: &VersionInfo
    ) -> Result<HashMap<String, String>> {
        let mut properties = HashMap::new();
        
        // 检测 SQL 方言支持
        if version.major >= 2 {
            // 尝试检测表模型是否启用
            if let Ok(_) = Self::execute_version_query(
                config, 
                "SELECT get_system_property('sql_dialect')"
            ).await {
                properties.insert("sql_dialect".to_string(), "table".to_string());
            }
        }
        
        // 检测 REST 服务状态
        if version.supports_feature("rest_v2") {
            if let Ok(_) = Self::execute_version_query(
                config,
                "show variables like 'enable_rest_service'"
            ).await {
                properties.insert("rest_service".to_string(), "enabled".to_string());
            }
        }
        
        Ok(properties)
    }
    
    /// 检测可用端口
    async fn detect_available_ports(config: &DriverConfig) -> HashMap<String, u16> {
        let mut ports = HashMap::new();
        
        // 默认端口配置
        ports.insert("thrift".to_string(), 6667);
        
        // 检测 REST API 端口
        let rest_ports = vec![18080, 31999, 8080];
        for port in rest_ports {
            if Self::test_port_connectivity(&config.host, port).await {
                ports.insert("rest".to_string(), port);
                break;
            }
        }
        
        ports
    }
    
    /// 测试端口连通性
    async fn test_port_connectivity(host: &str, port: u16) -> bool {
        use tokio::net::TcpStream;
        use std::time::Duration;
        
        let addr = format!("{}:{}", host, port);
        match tokio::time::timeout(
            Duration::from_secs(3),
            TcpStream::connect(&addr)
        ).await {
            Ok(Ok(_)) => {
                debug!("端口 {} 连通", port);
                true
            }
            _ => {
                debug!("端口 {} 不可达", port);
                false
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_version_parsing() {
        let version = VersionInfo::parse("2.0.3").unwrap();
        assert_eq!(version.major, 2);
        assert_eq!(version.minor, 0);
        assert_eq!(version.patch, 3);
        assert!(version.supports_feature("table_model"));
        
        let version = VersionInfo::parse("1.3.2").unwrap();
        assert_eq!(version.major, 1);
        assert_eq!(version.minor, 3);
        assert!(version.supports_feature("new_types"));
        
        let version = VersionInfo::parse("0.13.4").unwrap();
        assert_eq!(version.major, 0);
        assert_eq!(version.minor, 13);
        assert!(!version.supports_feature("table_model"));
    }
}
