/**
 * IoTDB 驱动抽象层
 * 
 * 定义统一的驱动接口，支持可插拔的驱动实现
 */

use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

use super::capability::Capability;
use super::types::{DataValue, IoTDBDataType};

/// 驱动配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverConfig {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ssl: bool,
    pub timeout: Duration,
    pub extra_params: HashMap<String, String>,
}

/// 查询请求
#[derive(Debug, Clone)]
pub struct QueryRequest {
    pub sql: String,
    pub database: Option<String>,
    pub session_id: Option<String>,
    pub fetch_size: Option<usize>,
    pub timeout: Option<Duration>,
    pub parameters: Option<HashMap<String, DataValue>>,
}

/// 查询结果
#[derive(Debug, Clone)]
pub struct QueryResponse {
    pub columns: Vec<ColumnInfo>,
    pub rows: Vec<Vec<DataValue>>,
    pub execution_time: Duration,
    pub affected_rows: Option<usize>,
    pub warnings: Vec<String>,
}

/// 列信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: IoTDBDataType,
    pub nullable: bool,
}

/// Tablet 数据结构（用于批量写入）
#[derive(Debug, Clone)]
pub struct Tablet {
    pub device_id: String,
    pub measurements: Vec<String>,
    pub data_types: Vec<IoTDBDataType>,
    pub timestamps: Vec<i64>,
    pub values: Vec<Vec<Option<DataValue>>>,
    pub is_aligned: bool,
}

/// IoTDB 驱动接口
#[async_trait]
pub trait IoTDBDriver: Send + Sync + std::fmt::Debug {
    /// 连接到数据库
    async fn connect(&mut self) -> Result<()>;
    
    /// 断开连接
    async fn disconnect(&mut self) -> Result<()>;
    
    /// 执行查询
    async fn query(&mut self, request: QueryRequest) -> Result<QueryResponse>;
    
    /// 执行非查询语句（INSERT, DELETE, CREATE等）
    async fn execute(&mut self, sql: &str) -> Result<usize>;
    
    /// 批量写入 Tablet 数据
    async fn write_tablet(&mut self, tablet: &Tablet) -> Result<()>;
    
    /// 测试连接
    async fn test_connection(&mut self) -> Result<Duration>;
    
    /// 获取服务器能力
    fn capabilities(&self) -> &Capability;
    
    /// 获取连接状态
    fn is_connected(&self) -> bool;
    
    /// 获取驱动类型
    fn driver_type(&self) -> &str;
}

/// 驱动工厂
pub struct DriverFactory;

impl DriverFactory {
    /// 创建最佳驱动
    pub async fn create_best_driver(
        _config: DriverConfig,
        capability: &Capability,
    ) -> Result<Box<dyn IoTDBDriver>> {
        // 根据服务器能力选择最佳驱动
        let _protocols = &capability.server.supported_protocols;
        
        // 驱动工厂已简化，直接返回错误，使用简化的客户端架构
        // 实际的IoTDB连接通过IoTDBOfficialClient处理
        
        // REST V2 驱动已移除，现在只使用官方Thrift客户端
        
        Err(anyhow::anyhow!("没有找到合适的驱动实现"))
    }
    
    /// 创建指定类型的驱动
    pub async fn create_driver(
        driver_type: &str,
        _config: DriverConfig,
        _capability: &Capability,
    ) -> Result<Box<dyn IoTDBDriver>> {
        match driver_type {
            "thrift" => {
                Err(anyhow::anyhow!("Thrift 驱动已移除，请使用IoTDBOfficialClient"))
            }
            "rest" | "rest_v2" => {
                Err(anyhow::anyhow!("REST 驱动已移除，现在只使用官方Thrift客户端"))
            }
            _ => Err(anyhow::anyhow!("不支持的驱动类型: {}", driver_type)),
        }
    }
    
    /// 列出可用的驱动类型
    pub fn available_drivers() -> Vec<&'static str> {
        let mut drivers = Vec::new();

        #[cfg(any(feature = "iotdb-v1", feature = "iotdb-v2"))]
        drivers.push("thrift");

        // REST驱动已移除，现在只使用官方Thrift客户端

        drivers
    }
}

/// 驱动选择策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DriverSelectionStrategy {
    /// 自动选择最佳驱动
    Auto,
    /// 指定驱动类型
    Specific(String),
    /// 按优先级尝试
    Priority(Vec<String>),
}

impl Default for DriverSelectionStrategy {
    fn default() -> Self {
        Self::Auto
    }
}

/// 驱动管理器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverManagerConfig {
    pub selection_strategy: DriverSelectionStrategy,
    pub connection_pool_size: usize,
    pub connection_timeout: Duration,
    pub retry_attempts: usize,
    pub health_check_interval: Duration,
}

impl Default for DriverManagerConfig {
    fn default() -> Self {
        Self {
            selection_strategy: DriverSelectionStrategy::Auto,
            connection_pool_size: 5,
            connection_timeout: Duration::from_secs(30),
            retry_attempts: 3,
            health_check_interval: Duration::from_secs(60),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_driver_factory_available_drivers() {
        let drivers = DriverFactory::available_drivers();
        assert!(!drivers.is_empty());
    }
    
    #[test]
    fn test_driver_config_creation() {
        let config = DriverConfig {
            host: "localhost".to_string(),
            port: 6667,
            username: Some("root".to_string()),
            password: Some("root".to_string()),
            ssl: false,
            timeout: Duration::from_secs(30),
            extra_params: HashMap::new(),
        };
        
        assert_eq!(config.host, "localhost");
        assert_eq!(config.port, 6667);
    }
}
