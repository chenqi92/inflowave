use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 数据库信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub name: String,
    pub retention_policies: Vec<RetentionPolicy>,
    pub measurements: Vec<Measurement>,
    pub created_at: Option<DateTime<Utc>>,
}

/// 保留策略
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetentionPolicy {
    pub name: String,
    pub duration: String,
    pub shard_group_duration: String,
    pub replica_n: u32,
    pub default: bool,
}

impl RetentionPolicy {
    pub fn new(name: String, duration: String) -> Self {
        Self {
            name,
            duration,
            shard_group_duration: "1h".to_string(),
            replica_n: 1,
            default: false,
        }
    }

    pub fn with_shard_duration(mut self, duration: String) -> Self {
        self.shard_group_duration = duration;
        self
    }

    pub fn with_replica(mut self, replica_n: u32) -> Self {
        self.replica_n = replica_n;
        self
    }

    pub fn as_default(mut self) -> Self {
        self.default = true;
        self
    }
}

/// 测量(表)信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Measurement {
    pub name: String,
    pub fields: Vec<FieldInfo>,
    pub tags: Vec<TagInfo>,
    pub last_write: Option<DateTime<Utc>>,
    pub series_count: Option<u64>,
}

/// 字段信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldInfo {
    pub name: String,
    pub field_type: FieldType,
    pub last_value: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FieldType {
    Float,
    Integer,
    String,
    Boolean,
}

/// 标签信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagInfo {
    pub name: String,
    pub values: Vec<String>,
    pub cardinality: u64,
}

/// 数据库统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseStats {
    pub name: String,
    pub size: u64,
    pub series_count: u64,
    pub measurement_count: u64,
    pub retention_policies: Vec<RetentionPolicy>,
    pub last_write: Option<DateTime<Utc>>,
}

/// 保留策略配置
#[derive(Debug, Deserialize)]
pub struct RetentionPolicyConfig {
    pub name: String,
    pub database: String,
    pub duration: String,
    pub shard_duration: Option<String>,
    pub replica_n: Option<u32>,
    pub default: Option<bool>,
}

/// 数据库创建配置
#[derive(Debug, Deserialize)]
pub struct DatabaseCreateConfig {
    pub name: String,
    pub retention_policy: Option<RetentionPolicyConfig>,
}

/// 系统信息
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub version: String,
    pub uptime: String,
    pub memory_usage: u64,
    pub cpu_usage: f64,
    pub disk_usage: DiskUsage,
    pub network_stats: NetworkStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiskUsage {
    pub total: u64,
    pub used: u64,
    pub free: u64,
    pub usage_percent: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkStats {
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub packets_sent: u64,
    pub packets_received: u64,
}
