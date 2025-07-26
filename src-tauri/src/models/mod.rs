pub mod connection;
pub mod database;
pub mod query;
pub mod tree_node;

pub use connection::*;
pub use database::*;
pub use query::*;
pub use tree_node::*;

// 数据写入相关模型
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DataWriteRequest {
    #[serde(alias = "connectionId")]
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
    #[serde(alias = "retentionPolicy")]
    pub retention_policy: Option<String>,
    pub consistency: Option<String>,
    #[serde(alias = "batchSize")]
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

// 批量数据写入相关模型
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchWriteRequest {
    #[serde(alias = "connectionId")]
    pub connection_id: String,
    pub database: String,
    pub points: Vec<DataPoint>,
    pub precision: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPoint {
    pub measurement: String,
    pub tags: std::collections::HashMap<String, String>,
    pub fields: std::collections::HashMap<String, serde_json::Value>,
    pub timestamp: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteResult {
    pub success: bool,
    #[serde(alias = "pointsWritten")]
    pub points_written: u64,
    pub errors: Vec<WriteError>,
    pub duration: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteError {
    pub point: DataPoint,
    pub error: String,
    pub line: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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
