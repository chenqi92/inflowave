use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 查询请求
#[derive(Debug, Deserialize)]
pub struct QueryRequest {
    #[serde(alias = "connectionId")]
    pub connection_id: String,
    pub database: Option<String>,
    pub query: String,
    pub timeout: Option<u64>,
}

/// 执行消息类型
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum MessageType {
    Success,
    Warning,
    Error,
    Info,
}

/// 执行消息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutionMessage {
    #[serde(rename = "type")]
    pub message_type: MessageType,
    pub timestamp: DateTime<Utc>,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "sqlStatement")]
    pub sql_statement: Option<String>,
}

/// 执行统计信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutionStatistics {
    #[serde(skip_serializing_if = "Option::is_none", rename = "affectedRows")]
    pub affected_rows: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "insertedRows")]
    pub inserted_rows: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "updatedRows")]
    pub updated_rows: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "deletedRows")]
    pub deleted_rows: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warnings: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub errors: Option<usize>,
}

/// 执行计划步骤
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutionPlanStep {
    pub operation: String,
    pub cost: Option<f64>,
    pub rows: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<ExecutionPlanStep>>,
}

/// 执行计划
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExecutionPlan {
    pub steps: Vec<ExecutionPlanStep>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "totalCost")]
    pub total_cost: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "estimatedRows")]
    pub estimated_rows: Option<usize>,
}

/// 聚合信息
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AggregationInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sum: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avg: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
}

/// 查询结果
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub results: Vec<QueryResultItem>,
    #[serde(rename = "executionTime")]
    pub execution_time: Option<u64>,
    #[serde(rename = "rowCount")]
    pub row_count: Option<usize>,
    pub error: Option<String>,

    // 新增字段
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<ExecutionMessage>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub statistics: Option<ExecutionStatistics>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "executionPlan")]
    pub execution_plan: Option<ExecutionPlan>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aggregations: Option<AggregationInfo>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "sqlType")]
    pub sql_type: Option<String>,

    // 兼容性字段
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<Vec<serde_json::Value>>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub columns: Option<Vec<String>>,
}

/// 查询结果项
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResultItem {
    pub series: Option<Vec<Series>>,
    pub error: Option<String>,
}

/// 数据系列
#[derive(Debug, Serialize, Deserialize)]
pub struct Series {
    pub name: String,
    pub columns: Vec<String>,
    pub values: Vec<Vec<serde_json::Value>>,
    pub tags: Option<std::collections::HashMap<String, String>>,
}

impl QueryResult {
    pub fn new(
        columns: Vec<String>,
        rows: Vec<Vec<serde_json::Value>>,
        execution_time: u64,
    ) -> Self {
        let row_count = rows.len();
        let series = if !columns.is_empty() || !rows.is_empty() {
            vec![Series {
                name: "query_result".to_string(),
                columns: columns.clone(),
                values: rows.clone(),
                tags: None,
            }]
        } else {
            vec![]
        };

        Self {
            results: vec![QueryResultItem {
                series: if series.is_empty() { None } else { Some(series) },
                error: None,
            }],
            execution_time: Some(execution_time),
            row_count: Some(row_count),
            error: None,
            messages: None,
            statistics: None,
            execution_plan: None,
            aggregations: None,
            sql_type: None,
            // 设置兼容性字段
            data: Some(rows),
            columns: Some(columns),
        }
    }

    pub fn with_series(series: Vec<Series>, execution_time: u64) -> Self {
        let total_rows: usize = series.iter().map(|s| s.values.len()).sum();
        // 获取第一个series的数据用于兼容性
        let (data, columns) = if let Some(first_series) = series.first() {
            (Some(first_series.values.clone()), Some(first_series.columns.clone()))
        } else {
            (Some(vec![]), Some(vec![]))
        };

        Self {
            results: vec![QueryResultItem {
                series: Some(series),
                error: None,
            }],
            execution_time: Some(execution_time),
            row_count: Some(total_rows),
            error: None,
            messages: None,
            statistics: None,
            execution_plan: None,
            aggregations: None,
            sql_type: None,
            data,
            columns,
        }
    }

    pub fn empty() -> Self {
        Self {
            results: vec![QueryResultItem {
                series: None,
                error: None,
            }],
            execution_time: Some(0),
            row_count: Some(0),
            error: None,
            messages: None,
            statistics: None,
            execution_plan: None,
            aggregations: None,
            sql_type: None,
            data: Some(vec![]),
            columns: Some(vec![]),
        }
    }

    pub fn with_error(error: String) -> Self {
        let error_message = ExecutionMessage {
            message_type: MessageType::Error,
            timestamp: Utc::now(),
            message: error.clone(),
            details: None,
            sql_statement: None,
        };

        Self {
            results: vec![QueryResultItem {
                series: None,
                error: Some(error.clone()),
            }],
            execution_time: None,
            row_count: None,
            error: Some(error),
            messages: Some(vec![error_message]),
            statistics: Some(ExecutionStatistics {
                affected_rows: None,
                inserted_rows: None,
                updated_rows: None,
                deleted_rows: None,
                warnings: None,
                errors: Some(1),
            }),
            execution_plan: None,
            aggregations: None,
            sql_type: None,
            data: None,
            columns: None,
        }
    }

    /// 添加执行消息
    pub fn add_message(&mut self, message_type: MessageType, message: String, details: Option<String>) {
        let msg = ExecutionMessage {
            message_type,
            timestamp: Utc::now(),
            message,
            details,
            sql_statement: None,
        };

        if let Some(ref mut messages) = self.messages {
            messages.push(msg);
        } else {
            self.messages = Some(vec![msg]);
        }
    }

    /// 设置统计信息
    pub fn set_statistics(&mut self, statistics: ExecutionStatistics) {
        self.statistics = Some(statistics);
    }

    /// 设置执行计划
    pub fn set_execution_plan(&mut self, plan: ExecutionPlan) {
        self.execution_plan = Some(plan);
    }

    /// 设置聚合信息
    pub fn set_aggregations(&mut self, aggregations: AggregationInfo) {
        self.aggregations = Some(aggregations);
    }

    /// 设置 SQL 类型
    pub fn set_sql_type(&mut self, sql_type: String) {
        self.sql_type = Some(sql_type);
    }

    // 兼容性方法，用于访问旧的字段格式
    pub fn get_columns(&self) -> Vec<String> {
        self.results
            .first()
            .and_then(|r| r.series.as_ref())
            .and_then(|s| s.first())
            .map(|s| s.columns.clone())
            .unwrap_or_default()
    }
    
    pub fn get_rows(&self) -> Vec<Vec<serde_json::Value>> {
        self.results
            .first()
            .and_then(|r| r.series.as_ref())
            .and_then(|s| s.first())
            .map(|s| s.values.clone())
            .unwrap_or_default()
    }

    // 为了兼容性，添加这些字段作为属性访问器
    pub fn columns(&self) -> Vec<String> {
        self.get_columns()
    }

    pub fn rows(&self) -> Vec<Vec<serde_json::Value>> {
        self.get_rows()
    }

    // 添加data字段以兼容前端
    pub fn data(&self) -> Vec<Vec<serde_json::Value>> {
        self.get_rows()
    }
}

/// 查询历史记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistory {
    pub id: String,
    #[serde(alias = "connectionId")]
    pub connection_id: String,
    pub database: Option<String>,
    pub query: String,
    #[serde(alias = "executionTime")]
    pub execution_time: u64,
    #[serde(alias = "rowCount")]
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
            execution_time: result.execution_time.unwrap_or(0),
            row_count: result.row_count.unwrap_or(0),
            success: result.error.is_none(),
            error: result.error.clone(),
            timestamp: Utc::now(),
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
