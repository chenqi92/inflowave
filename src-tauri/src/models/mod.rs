pub mod connection;
pub mod database;
pub mod query;

pub use connection::*;
pub use database::*;
pub use query::*;

// 数据写入相关模型
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DataWriteRequest {
    pub connection_id: String,
    pub database: String,
    pub measurement: String,
    pub format: DataFormat,
    pub data: String,
    pub options: Option<WriteOptions>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum DataFormat {
    LineProtocol,
    Csv,
    Json,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteOptions {
    pub precision: Option<String>,
    pub retention_policy: Option<String>,
    pub consistency: Option<String>,
    pub batch_size: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataWriteResult {
    pub success: bool,
    pub message: String,
    pub points_written: u64,
    pub errors: Vec<String>,
    pub duration: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryHistoryItem {
    pub id: String,
    pub query: String,
    pub database: String,
    pub connection_id: String,
    pub executed_at: chrono::DateTime<chrono::Utc>,
    pub duration: u64,
    pub row_count: u64,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SavedQueryItem {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub database: Option<String>,
    pub tags: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub favorite: bool,
}
