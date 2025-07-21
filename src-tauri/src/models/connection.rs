use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// 数据库类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseType {
    InfluxDB,
    // 预留其他数据库类型
    // PostgreSQL,
    // MySQL,
}

/// InfluxDB 版本
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InfluxDBVersion {
    #[serde(rename = "1.x")]
    V1x,
    #[serde(rename = "2.x")]
    V2x,
    #[serde(rename = "3.x")]
    V3x,
}

/// 代理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    #[serde(rename = "proxyType")]
    pub proxy_type: ProxyType,
}

/// 代理类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyType {
    Http,
    Https,
    Socks5,
}

/// InfluxDB 2.x/3.x 特有配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InfluxDBV2Config {
    #[serde(rename = "apiToken")]
    pub api_token: String,
    pub organization: String,
    pub bucket: Option<String>,
    #[serde(rename = "v1CompatibilityApi")]
    pub v1_compatibility_api: bool,
}

/// 连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(rename = "dbType", default = "default_db_type")]
    pub db_type: DatabaseType,
    #[serde(default = "default_version")]
    pub version: Option<InfluxDBVersion>,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    pub ssl: bool,
    pub timeout: u64,
    #[serde(rename = "connectionTimeout", default = "default_connection_timeout")]
    pub connection_timeout: u64,
    #[serde(rename = "queryTimeout", default = "default_query_timeout")]
    pub query_timeout: u64,
    #[serde(rename = "defaultQueryLanguage", default = "default_query_language")]
    pub default_query_language: Option<String>,
    #[serde(rename = "proxyConfig")]
    pub proxy_config: Option<ProxyConfig>,
    // InfluxDB 1.x 特有
    #[serde(rename = "retentionPolicy")]
    pub retention_policy: Option<String>,
    // InfluxDB 2.x/3.x 特有
    #[serde(rename = "v2Config")]
    pub v2_config: Option<InfluxDBV2Config>,
    #[serde(rename = "created_at")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updated_at")]
    pub updated_at: DateTime<Utc>,
}

// Default functions for backward compatibility
fn default_db_type() -> DatabaseType {
    DatabaseType::InfluxDB
}

fn default_version() -> Option<InfluxDBVersion> {
    Some(InfluxDBVersion::V1x)
}

fn default_connection_timeout() -> u64 {
    30
}

fn default_query_timeout() -> u64 {
    60
}

fn default_query_language() -> Option<String> {
    Some("InfluxQL".to_string())
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            host: "127.0.0.1".to_string(),
            port: 8080,
            username: None,
            password: None,
            proxy_type: ProxyType::Http,
        }
    }
}

impl Default for InfluxDBV2Config {
    fn default() -> Self {
        Self {
            api_token: String::new(),
            organization: String::new(),
            bucket: None,
            v1_compatibility_api: false,
        }
    }
}

impl ConnectionConfig {
    pub fn new(name: String, host: String, port: u16) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            description: None,
            db_type: DatabaseType::InfluxDB,
            version: Some(InfluxDBVersion::V1x),
            host,
            port,
            username: None,
            password: None,
            database: None,
            ssl: false,
            timeout: 30,
            connection_timeout: 30,
            query_timeout: 60,
            default_query_language: Some("InfluxQL".to_string()),
            proxy_config: None,
            retention_policy: None,
            v2_config: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn new_v1x(name: String, host: String, port: u16) -> Self {
        let mut config = Self::new(name, host, port);
        config.version = Some(InfluxDBVersion::V1x);
        config.default_query_language = Some("InfluxQL".to_string());
        config
    }

    pub fn new_v2x(name: String, host: String, port: u16) -> Self {
        let mut config = Self::new(name, host, port);
        config.version = Some(InfluxDBVersion::V2x);
        config.default_query_language = Some("Flux".to_string());
        config.v2_config = Some(InfluxDBV2Config::default());
        config
    }

    pub fn new_v3x(name: String, host: String, port: u16) -> Self {
        let mut config = Self::new(name, host, port);
        config.version = Some(InfluxDBVersion::V3x);
        config.default_query_language = Some("InfluxQL".to_string());
        config.v2_config = Some(InfluxDBV2Config::default());
        config
    }

    pub fn with_credentials(mut self, username: String, password: String) -> Self {
        self.username = Some(username);
        self.password = Some(password);
        self
    }

    pub fn with_database(mut self, database: String) -> Self {
        self.database = Some(database);
        self
    }

    pub fn with_ssl(mut self, ssl: bool) -> Self {
        self.ssl = ssl;
        self
    }

    pub fn with_timeout(mut self, timeout: u64) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    pub fn with_proxy(mut self, proxy_config: ProxyConfig) -> Self {
        self.proxy_config = Some(proxy_config);
        self
    }

    pub fn with_v2_config(mut self, v2_config: InfluxDBV2Config) -> Self {
        self.v2_config = Some(v2_config);
        self
    }

    pub fn with_retention_policy(mut self, retention_policy: String) -> Self {
        self.retention_policy = Some(retention_policy);
        self
    }

    /// 检查是否为 InfluxDB 1.x 版本
    pub fn is_v1x(&self) -> bool {
        matches!(self.version, Some(InfluxDBVersion::V1x))
    }

    /// 检查是否为 InfluxDB 2.x 版本
    pub fn is_v2x(&self) -> bool {
        matches!(self.version, Some(InfluxDBVersion::V2x))
    }

    /// 检查是否为 InfluxDB 3.x 版本
    pub fn is_v3x(&self) -> bool {
        matches!(self.version, Some(InfluxDBVersion::V3x))
    }

    /// 检查是否需要 API Token（2.x/3.x）
    pub fn requires_api_token(&self) -> bool {
        self.is_v2x() || self.is_v3x()
    }

    /// 获取版本字符串
    pub fn get_version_string(&self) -> String {
        match &self.version {
            Some(InfluxDBVersion::V1x) => "1.x".to_string(),
            Some(InfluxDBVersion::V2x) => "2.x".to_string(),
            Some(InfluxDBVersion::V3x) => "3.x".to_string(),
            None => "Unknown".to_string(),
        }
    }
}

/// 连接状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub id: String,
    pub status: ConnectionState,
    pub last_connected: Option<DateTime<Utc>>,
    pub error: Option<String>,
    pub latency: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionState {
    Connected,
    Disconnected,
    Connecting,
    Error,
}

impl ConnectionStatus {
    pub fn new(id: String) -> Self {
        Self {
            id,
            status: ConnectionState::Disconnected,
            last_connected: None,
            error: None,
            latency: None,
        }
    }

    pub fn connected(mut self, latency: u64) -> Self {
        self.status = ConnectionState::Connected;
        self.last_connected = Some(Utc::now());
        self.latency = Some(latency);
        self.error = None;
        self
    }

    pub fn error(mut self, error: String) -> Self {
        self.status = ConnectionState::Error;
        self.error = Some(error);
        self
    }

    pub fn connecting(mut self) -> Self {
        self.status = ConnectionState::Connecting;
        self.error = None;
        self
    }
}

/// 连接测试结果
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    pub latency: Option<u64>,
    pub error: Option<String>,
    pub server_version: Option<String>,
}

impl ConnectionTestResult {
    pub fn success(latency: u64, server_version: Option<String>) -> Self {
        Self {
            success: true,
            latency: Some(latency),
            error: None,
            server_version,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            latency: None,
            error: Some(error),
            server_version: None,
        }
    }
}
