/**
 * InfluxDB 统一驱动接口
 * 
 * 定义所有 InfluxDB 版本驱动的统一接口
 */

use super::capability::{Capability, Query, DataSet, BucketInfo, Health};
use anyhow::Result;
use async_trait::async_trait;

/// InfluxDB 统一驱动接口
#[async_trait]
pub trait InfluxDriver: Send + Sync {
    /// 写入 Line Protocol 数据
    async fn write(&self, line_protocol: &str, bucket: &BucketInfo) -> Result<()>;
    
    /// 执行查询
    async fn query(&self, query: &Query) -> Result<DataSet>;
    
    /// 获取健康状态
    async fn health(&self) -> Result<Health>;
    
    /// 获取驱动能力
    fn capabilities(&self) -> &Capability;
    
    /// 测试连接
    async fn test_connection(&self) -> Result<u64>;
    
    /// 关闭连接
    async fn close(&self) -> Result<()>;
    
    /// 获取数据库列表
    async fn list_databases(&self) -> Result<Vec<String>>;
    
    /// 获取测量列表
    async fn list_measurements(&self, database: &str) -> Result<Vec<String>>;
    
    /// 获取字段信息
    async fn describe_measurement(&self, database: &str, measurement: &str) -> Result<MeasurementSchema>;
    
    /// 创建数据库（如果支持）
    async fn create_database(&self, name: &str) -> Result<()>;
    
    /// 删除数据库（如果支持）
    async fn drop_database(&self, name: &str) -> Result<()>;
    
    /// 获取保留策略列表（1.x 专用）
    async fn list_retention_policies(&self, database: &str) -> Result<Vec<RetentionPolicyInfo>>;
    
    /// 创建保留策略（1.x 专用）
    async fn create_retention_policy(&self, database: &str, policy: &RetentionPolicyConfig) -> Result<()>;
    
    /// 删除保留策略（1.x 专用）
    async fn drop_retention_policy(&self, database: &str, policy_name: &str) -> Result<()>;
}

/// 测量模式信息
#[derive(Debug, Clone)]
pub struct MeasurementSchema {
    pub name: String,
    pub fields: Vec<FieldSchema>,
    pub tags: Vec<TagSchema>,
}

/// 字段模式信息
#[derive(Debug, Clone)]
pub struct FieldSchema {
    pub name: String,
    pub field_type: FieldType,
}

/// 标签模式信息
#[derive(Debug, Clone)]
pub struct TagSchema {
    pub name: String,
    pub values: Vec<String>,
}

/// 字段类型
#[derive(Debug, Clone)]
pub enum FieldType {
    Float,
    Integer,
    String,
    Boolean,
    Unknown,
}

impl FieldType {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "float" | "double" => FieldType::Float,
            "integer" | "int" | "long" => FieldType::Integer,
            "string" | "text" => FieldType::String,
            "boolean" | "bool" => FieldType::Boolean,
            _ => FieldType::Unknown,
        }
    }
    
    pub fn as_str(&self) -> &'static str {
        match self {
            FieldType::Float => "float",
            FieldType::Integer => "integer",
            FieldType::String => "string",
            FieldType::Boolean => "boolean",
            FieldType::Unknown => "unknown",
        }
    }
}

/// 保留策略信息
#[derive(Debug, Clone)]
pub struct RetentionPolicyInfo {
    pub name: String,
    pub duration: String,
    pub shard_group_duration: String,
    pub replica_n: u32,
    pub default: bool,
}

/// 保留策略配置
#[derive(Debug, Clone)]
pub struct RetentionPolicyConfig {
    pub name: String,
    pub duration: String,
    pub shard_group_duration: Option<String>,
    pub replica_n: Option<u32>,
    pub default: Option<bool>,
}

/// 驱动错误类型
#[derive(Debug, thiserror::Error)]
pub enum DriverError {
    #[error("连接错误: {0}")]
    Connection(String),
    
    #[error("认证错误: {0}")]
    Authentication(String),
    
    #[error("查询错误: {0}")]
    Query(String),
    
    #[error("写入错误: {0}")]
    Write(String),
    
    #[error("不支持的操作: {0}")]
    Unsupported(String),
    
    #[error("配置错误: {0}")]
    Configuration(String),
    
    #[error("网络错误: {0}")]
    Network(String),
    
    #[error("超时错误")]
    Timeout,
    
    #[error("内部错误: {0}")]
    Internal(String),
}

impl From<reqwest::Error> for DriverError {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() {
            DriverError::Timeout
        } else if err.is_connect() {
            DriverError::Connection(err.to_string())
        } else {
            DriverError::Network(err.to_string())
        }
    }
}

impl From<serde_json::Error> for DriverError {
    fn from(err: serde_json::Error) -> Self {
        DriverError::Internal(format!("JSON 解析错误: {}", err))
    }
}

/// 驱动结果类型
pub type DriverResult<T> = std::result::Result<T, DriverError>;

/// 驱动工具函数
pub mod utils {
    use super::*;
    
    /// 解析 InfluxDB 时间戳
    pub fn parse_timestamp(ts: &str) -> Result<i64> {
        // 尝试不同的时间戳格式
        if let Ok(ts) = ts.parse::<i64>() {
            return Ok(ts);
        }
        
        // 尝试 RFC3339 格式
        if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(ts) {
            return Ok(dt.timestamp_nanos_opt().unwrap_or(0));
        }
        
        Err(anyhow::anyhow!("无法解析时间戳: {}", ts))
    }
    
    /// 格式化 Line Protocol
    pub fn format_line_protocol(
        measurement: &str,
        tags: &[(&str, &str)],
        fields: &[(&str, &serde_json::Value)],
        timestamp: Option<i64>,
    ) -> String {
        let mut line = measurement.to_string();
        
        // 添加标签
        for (key, value) in tags {
            line.push_str(&format!(",{}={}", key, value));
        }
        
        line.push(' ');
        
        // 添加字段
        let field_strs: Vec<String> = fields
            .iter()
            .map(|(key, value)| {
                match value {
                    serde_json::Value::String(s) => format!("{}=\"{}\"", key, s),
                    serde_json::Value::Number(n) => {
                        if n.is_i64() {
                            format!("{}={}i", key, n.as_i64().unwrap())
                        } else {
                            format!("{}={}", key, n.as_f64().unwrap())
                        }
                    }
                    serde_json::Value::Bool(b) => format!("{}={}", key, b),
                    _ => format!("{}=\"{}\"", key, value.to_string()),
                }
            })
            .collect();
        
        line.push_str(&field_strs.join(","));
        
        // 添加时间戳
        if let Some(ts) = timestamp {
            line.push_str(&format!(" {}", ts));
        }
        
        line
    }
    
    /// 验证数据库名称
    pub fn validate_database_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(anyhow::anyhow!("数据库名称不能为空"));
        }
        
        if name.len() > 255 {
            return Err(anyhow::anyhow!("数据库名称过长"));
        }
        
        // 检查特殊字符
        if name.contains(|c: char| c.is_whitespace() || "\"'\\".contains(c)) {
            return Err(anyhow::anyhow!("数据库名称包含非法字符"));
        }
        
        Ok(())
    }
    
    /// 验证测量名称
    pub fn validate_measurement_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(anyhow::anyhow!("测量名称不能为空"));
        }
        
        if name.len() > 255 {
            return Err(anyhow::anyhow!("测量名称过长"));
        }
        
        Ok(())
    }
}
