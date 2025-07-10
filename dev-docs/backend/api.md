# InfluxDB GUI Manager - API 设计文档

## 1. Tauri Commands API

### 1.1 连接管理 API

#### 创建连接配置
```rust
#[tauri::command]
async fn create_connection(config: ConnectionConfig) -> Result<String, String>
```
- **功能**: 创建新的数据库连接配置
- **参数**: `ConnectionConfig` - 连接配置对象
- **返回**: 连接ID或错误信息
- **示例**:
```typescript
const config = {
  name: "本地InfluxDB",
  host: "localhost",
  port: 8086,
  username: "admin",
  password: "password",
  ssl: false,
  timeout: 5000
};
// 使用安全包装器调用后端命令
import { safeTauriInvoke } from '@/utils/tauri';

const connectionId = await safeTauriInvoke('create_connection', { config });
```

#### 测试连接
```rust
#[tauri::command]
async fn test_connection(config: ConnectionConfig) -> Result<ConnectionStatus, String>
```
- **功能**: 测试数据库连接是否可用
- **参数**: `ConnectionConfig` - 连接配置
- **返回**: 连接状态或错误信息

#### 获取所有连接
```rust
#[tauri::command]
async fn get_connections() -> Result<Vec<ConnectionConfig>, String>
```
- **功能**: 获取所有已保存的连接配置
- **返回**: 连接配置列表

#### 更新连接配置
```rust
#[tauri::command]
async fn update_connection(id: String, config: ConnectionConfig) -> Result<(), String>
```
- **功能**: 更新指定的连接配置
- **参数**: 
  - `id` - 连接ID
  - `config` - 新的连接配置
- **返回**: 成功或错误信息

#### 删除连接配置
```rust
#[tauri::command]
async fn delete_connection(id: String) -> Result<(), String>
```
- **功能**: 删除指定的连接配置
- **参数**: `id` - 连接ID
- **返回**: 成功或错误信息

### 1.2 数据库操作 API

#### 获取数据库列表
```rust
#[tauri::command]
async fn get_databases(connection_id: String) -> Result<Vec<String>, String>
```
- **功能**: 获取指定连接的所有数据库
- **参数**: `connection_id` - 连接ID
- **返回**: 数据库名称列表

#### 创建数据库
```rust
#[tauri::command]
async fn create_database(connection_id: String, database_name: String) -> Result<(), String>
```
- **功能**: 创建新数据库
- **参数**: 
  - `connection_id` - 连接ID
  - `database_name` - 数据库名称
- **返回**: 成功或错误信息

#### 删除数据库
```rust
#[tauri::command]
async fn drop_database(connection_id: String, database_name: String) -> Result<(), String>
```
- **功能**: 删除指定数据库
- **参数**: 
  - `connection_id` - 连接ID
  - `database_name` - 数据库名称
- **返回**: 成功或错误信息

#### 获取测量列表
```rust
#[tauri::command]
async fn get_measurements(connection_id: String, database: String) -> Result<Vec<String>, String>
```
- **功能**: 获取指定数据库的所有测量
- **参数**: 
  - `connection_id` - 连接ID
  - `database` - 数据库名称
- **返回**: 测量名称列表

### 1.3 查询执行 API

#### 执行查询
```rust
#[tauri::command]
async fn execute_query(
    connection_id: String, 
    database: String, 
    query: String
) -> Result<QueryResult, String>
```
- **功能**: 执行 InfluxQL 查询
- **参数**: 
  - `connection_id` - 连接ID
  - `database` - 数据库名称
  - `query` - InfluxQL 查询语句
- **返回**: 查询结果或错误信息

#### 执行批量查询
```rust
#[tauri::command]
async fn execute_batch_queries(
    connection_id: String, 
    database: String, 
    queries: Vec<String>
) -> Result<Vec<QueryResult>, String>
```
- **功能**: 批量执行多个查询
- **参数**: 
  - `connection_id` - 连接ID
  - `database` - 数据库名称
  - `queries` - 查询语句列表
- **返回**: 查询结果列表

#### 取消查询
```rust
#[tauri::command]
async fn cancel_query(query_id: String) -> Result<(), String>
```
- **功能**: 取消正在执行的查询
- **参数**: `query_id` - 查询ID
- **返回**: 成功或错误信息

### 1.4 数据写入 API

#### 写入数据点
```rust
#[tauri::command]
async fn write_points(
    connection_id: String, 
    database: String, 
    points: Vec<DataPoint>
) -> Result<(), String>
```
- **功能**: 写入数据点到数据库
- **参数**: 
  - `connection_id` - 连接ID
  - `database` - 数据库名称
  - `points` - 数据点列表
- **返回**: 成功或错误信息

#### 批量导入数据
```rust
#[tauri::command]
async fn import_data(
    connection_id: String, 
    database: String, 
    import_config: ImportConfig
) -> Result<ImportResult, String>
```
- **功能**: 从文件批量导入数据
- **参数**: 
  - `connection_id` - 连接ID
  - `database` - 数据库名称
  - `import_config` - 导入配置
- **返回**: 导入结果统计

### 1.5 保留策略 API

#### 获取保留策略
```rust
#[tauri::command]
async fn get_retention_policies(
    connection_id: String, 
    database: String
) -> Result<Vec<RetentionPolicy>, String>
```
- **功能**: 获取数据库的保留策略
- **参数**: 
  - `connection_id` - 连接ID
  - `database` - 数据库名称
- **返回**: 保留策略列表

#### 创建保留策略
```rust
#[tauri::command]
async fn create_retention_policy(
    connection_id: String, 
    database: String, 
    policy: RetentionPolicyConfig
) -> Result<(), String>
```
- **功能**: 创建新的保留策略
- **参数**: 
  - `connection_id` - 连接ID
  - `database` - 数据库名称
  - `policy` - 保留策略配置
- **返回**: 成功或错误信息

## 2. 数据模型定义

### 2.1 连接配置
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ssl: bool,
    pub timeout: u64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### 2.2 查询结果
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub series: Vec<Series>,
    pub execution_time: u64,
    pub statement_id: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Series {
    pub name: String,
    pub columns: Vec<String>,
    pub values: Vec<Vec<Value>>,
    pub tags: Option<HashMap<String, String>>,
}
```

### 2.3 数据点
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct DataPoint {
    pub measurement: String,
    pub tags: HashMap<String, String>,
    pub fields: HashMap<String, FieldValue>,
    pub timestamp: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum FieldValue {
    Float(f64),
    Integer(i64),
    String(String),
    Boolean(bool),
}
```

### 2.4 保留策略
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct RetentionPolicy {
    pub name: String,
    pub duration: String,
    pub shard_group_duration: String,
    pub replication_factor: u32,
    pub default: bool,
}
```

## 3. 错误处理

### 3.1 错误类型定义
```rust
#[derive(Debug, Error)]
pub enum ApiError {
    #[error("连接错误: {0}")]
    ConnectionError(String),
    
    #[error("查询错误: {0}")]
    QueryError(String),
    
    #[error("数据库错误: {0}")]
    DatabaseError(String),
    
    #[error("配置错误: {0}")]
    ConfigError(String),
    
    #[error("IO错误: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("序列化错误: {0}")]
    SerializationError(#[from] serde_json::Error),
}
```

### 3.2 错误响应格式
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: any;
}
```

## 4. 事件系统

### 4.1 连接状态事件
```rust
#[derive(Debug, Serialize)]
pub struct ConnectionStatusEvent {
    pub connection_id: String,
    pub status: ConnectionStatus,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub enum ConnectionStatus {
    Connected,
    Disconnected,
    Connecting,
    Error(String),
}
```

### 4.2 查询进度事件
```rust
#[derive(Debug, Serialize)]
pub struct QueryProgressEvent {
    pub query_id: String,
    pub progress: f32,
    pub message: String,
    pub timestamp: DateTime<Utc>,
}
```

## 5. 配置管理

### 5.1 应用配置
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub connections: Vec<ConnectionConfig>,
    pub ui_settings: UiSettings,
    pub query_settings: QuerySettings,
    pub security_settings: SecuritySettings,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UiSettings {
    pub theme: String,
    pub language: String,
    pub font_size: u32,
    pub auto_save: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QuerySettings {
    pub default_limit: u32,
    pub timeout: u64,
    pub auto_format: bool,
    pub save_history: bool,
}
```

---

> 💡 **注意**: 这是 API 设计文档的核心部分。完整的 API 文档还包括更多详细的接口定义和使用示例。
