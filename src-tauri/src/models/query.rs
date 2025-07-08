use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 查询请求
#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    pub connection_id: String,
    pub database: Option<String>,
    pub query: String,
    pub timeout: Option<u64>,
}

/// 查询结果
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub execution_time: u64,
    pub row_count: usize,
    pub query_id: String,
    pub timestamp: DateTime<Utc>,
}

impl QueryResult {
    pub fn new(
        columns: Vec<String>,
        rows: Vec<Vec<serde_json::Value>>,
        execution_time: u64,
    ) -> Self {
        let row_count = rows.len();
        Self {
            columns,
            rows,
            execution_time,
            row_count,
            query_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
        }
    }

    pub fn empty() -> Self {
        Self {
            columns: vec![],
            rows: vec![],
            execution_time: 0,
            row_count: 0,
            query_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
        }
    }
}

/// 查询历史记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistory {
    pub id: String,
    pub connection_id: String,
    pub database: Option<String>,
    pub query: String,
    pub execution_time: u64,
    pub row_count: usize,
    pub success: bool,
    pub error: Option<String>,
    pub timestamp: DateTime<Utc>,
}

impl QueryHistory {
    pub fn new(
        connection_id: String,
        database: Option<String>,
        query: String,
        result: &QueryResult,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            connection_id,
            database,
            query,
            execution_time: result.execution_time,
            row_count: result.row_count,
            success: true,
            error: None,
            timestamp: result.timestamp,
        }
    }

    pub fn error(
        connection_id: String,
        database: Option<String>,
        query: String,
        error: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            connection_id,
            database,
            query,
            execution_time: 0,
            row_count: 0,
            success: false,
            error: Some(error),
            timestamp: Utc::now(),
        }
    }
}

/// 保存的查询
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedQuery {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub query: String,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: Option<String>,
}

impl SavedQuery {
    pub fn new(name: String, query: String) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description: None,
            query,
            tags: vec![],
            created_at: now,
            updated_at: now,
            created_by: None,
        }
    }

    pub fn with_description(mut self, description: String) -> Self {
        self.description = Some(description);
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }
}

/// 查询验证结果
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryValidationResult {
    pub valid: bool,
    pub errors: Vec<QueryError>,
    pub warnings: Vec<QueryWarning>,
    pub suggestions: Vec<QuerySuggestion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryError {
    pub line: u32,
    pub column: u32,
    pub message: String,
    pub error_type: QueryErrorType,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum QueryErrorType {
    SyntaxError,
    SemanticError,
    PermissionError,
    ResourceError,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryWarning {
    pub line: u32,
    pub column: u32,
    pub message: String,
    pub warning_type: QueryWarningType,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum QueryWarningType {
    Performance,
    Deprecation,
    BestPractice,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuerySuggestion {
    pub line: u32,
    pub column: u32,
    pub message: String,
    pub suggestion_type: QuerySuggestionType,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum QuerySuggestionType {
    Optimization,
    Completion,
    Alternative,
}

/// 查询统计信息
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryStats {
    pub total_queries: u64,
    pub successful_queries: u64,
    pub failed_queries: u64,
    pub average_execution_time: f64,
    pub slowest_query: Option<QueryHistory>,
    pub most_frequent_queries: Vec<(String, u64)>,
}
