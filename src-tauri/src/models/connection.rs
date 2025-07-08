use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// 连接配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    pub ssl: bool,
    pub timeout: u64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ConnectionConfig {
    pub fn new(name: String, host: String, port: u16) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            host,
            port,
            username: None,
            password: None,
            database: None,
            ssl: false,
            timeout: 30,
            created_at: now,
            updated_at: now,
        }
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
