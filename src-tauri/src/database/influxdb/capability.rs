/**
 * InfluxDB 能力检测模块
 * 
 * 定义不同版本 InfluxDB 的能力描述
 */

use serde::{Deserialize, Serialize};

/// InfluxDB 能力描述
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capability {
    /// 主版本号 (1/2/3)
    pub major: u8,
    /// 完整版本字符串
    pub version: String,
    /// 是否支持 Flux 查询语言
    pub supports_flux: bool,
    /// 是否支持 SQL 查询语言
    pub supports_sql: bool,
    /// 是否支持 InfluxQL 查询语言
    pub supports_influxql: bool,
    /// 是否支持 FlightSQL 协议
    pub has_flightsql: bool,
    /// 是否支持写入操作
    pub supports_write: bool,
    /// 是否支持管理操作
    pub supports_admin: bool,
}

impl Default for Capability {
    fn default() -> Self {
        Self {
            major: 1,
            version: "unknown".to_string(),
            supports_flux: false,
            supports_sql: false,
            supports_influxql: true,
            has_flightsql: false,
            supports_write: true,
            supports_admin: true,
        }
    }
}

impl Capability {
    /// 创建 InfluxDB 1.x 能力描述
    pub fn v1x(version: String) -> Self {
        Self {
            major: 1,
            version,
            supports_flux: false,
            supports_sql: false,
            supports_influxql: true,
            has_flightsql: false,
            supports_write: true,
            supports_admin: true,
        }
    }
    
    /// 创建 InfluxDB 2.x 能力描述
    pub fn v2x(version: String) -> Self {
        Self {
            major: 2,
            version,
            supports_flux: true,
            supports_sql: false,
            supports_influxql: true, // 通过兼容层
            has_flightsql: false,
            supports_write: true,
            supports_admin: true,
        }
    }
    
    /// 创建 InfluxDB 3.x 能力描述
    pub fn v3x(version: String, has_flightsql: bool) -> Self {
        Self {
            major: 3,
            version,
            supports_flux: false, // 3.x 不再支持 Flux
            supports_sql: true,
            supports_influxql: has_flightsql, // 通过 FlightSQL ticket
            has_flightsql,
            supports_write: true,
            supports_admin: false, // 3.x 管理操作通过 influxctl
        }
    }
    
    /// 获取支持的查询语言列表
    pub fn supported_languages(&self) -> Vec<&'static str> {
        let mut languages = Vec::new();
        
        if self.supports_influxql {
            languages.push("influxql");
        }
        if self.supports_flux {
            languages.push("flux");
        }
        if self.supports_sql {
            languages.push("sql");
        }
        
        languages
    }
    
    /// 检查是否支持指定的查询语言
    pub fn supports_language(&self, language: &str) -> bool {
        match language.to_lowercase().as_str() {
            "influxql" => self.supports_influxql,
            "flux" => self.supports_flux,
            "sql" => self.supports_sql,
            _ => false,
        }
    }
}

/// 查询语言枚举
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum QueryLanguage {
    InfluxQL,
    Flux,
    Sql,
}

impl QueryLanguage {
    pub fn as_str(&self) -> &'static str {
        match self {
            QueryLanguage::InfluxQL => "influxql",
            QueryLanguage::Flux => "flux",
            QueryLanguage::Sql => "sql",
        }
    }
    
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "influxql" => Some(QueryLanguage::InfluxQL),
            "flux" => Some(QueryLanguage::Flux),
            "sql" => Some(QueryLanguage::Sql),
            _ => None,
        }
    }
}

/// 查询请求
#[derive(Debug, Clone)]
pub struct Query {
    pub language: QueryLanguage,
    pub text: String,
    pub database: Option<String>,
    pub timeout: Option<u64>,
}

impl Query {
    pub fn new(language: QueryLanguage, text: String) -> Self {
        Self {
            language,
            text,
            database: None,
            timeout: None,
        }
    }
    
    pub fn with_database(mut self, database: String) -> Self {
        self.database = Some(database);
        self
    }
    
    pub fn with_timeout(mut self, timeout: u64) -> Self {
        self.timeout = Some(timeout);
        self
    }
}

/// 存储桶信息（用于写入操作）
#[derive(Debug, Clone)]
pub struct BucketInfo {
    pub name: String,
    pub org: Option<String>,
    pub retention_policy: Option<String>,
}

impl BucketInfo {
    pub fn new(name: String) -> Self {
        Self {
            name,
            org: None,
            retention_policy: None,
        }
    }
    
    pub fn with_org(mut self, org: String) -> Self {
        self.org = Some(org);
        self
    }
    
    pub fn with_retention_policy(mut self, rp: String) -> Self {
        self.retention_policy = Some(rp);
        self
    }
}

/// 健康状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Health {
    pub status: HealthStatus,
    pub version: String,
    pub uptime: Option<u64>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}

/// 数据集（查询结果的抽象）
#[derive(Debug, Clone)]
pub struct DataSet {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub execution_time: Option<u64>,
    pub row_count: usize,
}

impl DataSet {
    pub fn new(columns: Vec<String>, rows: Vec<Vec<serde_json::Value>>) -> Self {
        let row_count = rows.len();
        Self {
            columns,
            rows,
            execution_time: None,
            row_count,
        }
    }
    
    pub fn empty() -> Self {
        Self {
            columns: vec![],
            rows: vec![],
            execution_time: None,
            row_count: 0,
        }
    }
    
    pub fn with_execution_time(mut self, time: u64) -> Self {
        self.execution_time = Some(time);
        self
    }
}
