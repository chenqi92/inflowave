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
const connectionId = await invoke('create_connection', { config });
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
- **功能**: 更新指定连接的配置
- **参数**: 连接ID和新的配置

#### 删除连接
```rust
#[tauri::command]
async fn delete_connection(id: String) -> Result<(), String>
```
- **功能**: 删除指定的连接配置
- **参数**: 连接ID

### 1.2 数据库操作 API

#### 获取数据库列表
```rust
#[tauri::command]
async fn get_databases(connection_id: String) -> Result<Vec<String>, String>
```
- **功能**: 获取指定连接的所有数据库
- **参数**: 连接ID
- **返回**: 数据库名称列表

#### 创建数据库
```rust
#[tauri::command]
async fn create_database(connection_id: String, database_name: String) -> Result<(), String>
```
- **功能**: 创建新数据库
- **参数**: 连接ID和数据库名称

#### 删除数据库
```rust
#[tauri::command]
async fn drop_database(connection_id: String, database_name: String) -> Result<(), String>
```
- **功能**: 删除指定数据库
- **参数**: 连接ID和数据库名称

#### 获取保留策略
```rust
#[tauri::command]
async fn get_retention_policies(
    connection_id: String, 
    database: String
) -> Result<Vec<RetentionPolicy>, String>
```
- **功能**: 获取数据库的保留策略
- **参数**: 连接ID和数据库名称
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
- **参数**: 连接ID、数据库名称和策略配置

#### 获取测量列表
```rust
#[tauri::command]
async fn get_measurements(
    connection_id: String, 
    database: String
) -> Result<Vec<String>, String>
```
- **功能**: 获取数据库中的所有测量
- **参数**: 连接ID和数据库名称
- **返回**: 测量名称列表

#### 获取字段和标签信息
```rust
#[tauri::command]
async fn get_field_keys(
    connection_id: String,
    database: String,
    measurement: String
) -> Result<Vec<FieldInfo>, String>

#[tauri::command]
async fn get_tag_keys(
    connection_id: String,
    database: String,
    measurement: String
) -> Result<Vec<String>, String>

#[tauri::command]
async fn get_tag_values(
    connection_id: String,
    database: String,
    measurement: String,
    tag_key: String
) -> Result<Vec<String>, String>
```

### 1.3 查询 API

#### 执行查询
```rust
#[tauri::command]
async fn execute_query(request: QueryRequest) -> Result<QueryResult, String>
```
- **功能**: 执行 InfluxQL 查询
- **参数**: `QueryRequest` - 查询请求对象
- **返回**: 查询结果或错误信息
- **示例**:
```typescript
const request = {
  connectionId: "conn-123",
  database: "mydb",
  query: "SELECT * FROM temperature LIMIT 100"
};
const result = await invoke('execute_query', { request });
```

#### 验证查询语法
```rust
#[tauri::command]
async fn validate_query(query: String) -> Result<QueryValidation, String>
```
- **功能**: 验证 InfluxQL 查询语法
- **参数**: 查询字符串
- **返回**: 验证结果

#### 获取查询历史
```rust
#[tauri::command]
async fn get_query_history(
    connection_id: String,
    limit: Option<u32>
) -> Result<Vec<QueryHistory>, String>
```
- **功能**: 获取查询历史记录
- **参数**: 连接ID和限制数量
- **返回**: 查询历史列表

#### 保存查询
```rust
#[tauri::command]
async fn save_query(
    connection_id: String,
    name: String,
    query: String,
    description: Option<String>
) -> Result<String, String>
```
- **功能**: 保存常用查询
- **参数**: 连接ID、查询名称、查询语句和描述
- **返回**: 查询ID

### 1.4 数据写入 API

#### 写入单个数据点
```rust
#[tauri::command]
async fn write_point(
    connection_id: String,
    database: String,
    point: DataPoint
) -> Result<(), String>
```
- **功能**: 写入单个数据点
- **参数**: 连接ID、数据库名称和数据点

#### 批量写入数据
```rust
#[tauri::command]
async fn write_points(request: BatchWriteRequest) -> Result<WriteResult, String>
```
- **功能**: 批量写入多个数据点
- **参数**: `BatchWriteRequest` - 批量写入请求
- **返回**: 写入结果

#### 导入 CSV 数据
```rust
#[tauri::command]
async fn import_csv(
    connection_id: String,
    database: String,
    file_path: String,
    config: CsvImportConfig
) -> Result<ImportResult, String>
```
- **功能**: 从 CSV 文件导入数据
- **参数**: 连接ID、数据库名称、文件路径和导入配置
- **返回**: 导入结果

#### 导入 JSON 数据
```rust
#[tauri::command]
async fn import_json(
    connection_id: String,
    database: String,
    file_path: String,
    config: JsonImportConfig
) -> Result<ImportResult, String>
```
- **功能**: 从 JSON 文件导入数据
- **参数**: 连接ID、数据库名称、文件路径和导入配置
- **返回**: 导入结果

### 1.5 系统监控 API

#### 获取数据库统计信息
```rust
#[tauri::command]
async fn get_database_stats(
    connection_id: String,
    database: String
) -> Result<DatabaseStats, String>
```
- **功能**: 获取数据库统计信息
- **参数**: 连接ID和数据库名称
- **返回**: 数据库统计信息

#### 获取系统信息
```rust
#[tauri::command]
async fn get_system_info(connection_id: String) -> Result<SystemInfo, String>
```
- **功能**: 获取 InfluxDB 系统信息
- **参数**: 连接ID
- **返回**: 系统信息

#### 获取性能指标
```rust
#[tauri::command]
async fn get_performance_metrics(
    connection_id: String
) -> Result<PerformanceMetrics, String>
```
- **功能**: 获取性能指标
- **参数**: 连接ID
- **返回**: 性能指标数据

### 1.6 配置管理 API

#### 获取应用配置
```rust
#[tauri::command]
async fn get_app_config() -> Result<AppConfig, String>
```
- **功能**: 获取应用配置
- **返回**: 应用配置对象

#### 更新应用配置
```rust
#[tauri::command]
async fn update_app_config(config: AppConfig) -> Result<(), String>
```
- **功能**: 更新应用配置
- **参数**: 新的配置对象

#### 重置配置
```rust
#[tauri::command]
async fn reset_app_config() -> Result<(), String>
```
- **功能**: 重置应用配置到默认值

## 2. 数据类型定义

### 2.1 连接相关类型
```typescript
interface ConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
  timeout: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConnectionStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  error?: string;
  latency?: number;
}
```

### 2.2 数据库相关类型
```typescript
interface RetentionPolicy {
  name: string;
  duration: string;
  shardGroupDuration: string;
  replicaN: number;
  default: boolean;
}

interface RetentionPolicyConfig {
  name: string;
  duration: string;
  shardGroupDuration?: string;
  replicaN?: number;
  default?: boolean;
}

interface FieldInfo {
  name: string;
  type: 'float' | 'integer' | 'string' | 'boolean';
}
```

### 2.3 查询相关类型
```typescript
interface QueryRequest {
  connectionId: string;
  database: string;
  query: string;
  format?: 'json' | 'csv' | 'table';
}

interface QueryResult {
  series: Series[];
  executionTime: number;
  rowCount: number;
  error?: string;
}

interface Series {
  name: string;
  columns: string[];
  values: any[][];
  tags?: Record<string, string>;
}

interface QueryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface QueryHistory {
  id: string;
  query: string;
  database: string;
  executedAt: Date;
  executionTime: number;
  success: boolean;
  error?: string;
}
```

### 2.4 数据写入相关类型
```typescript
interface DataPoint {
  measurement: string;
  tags: Record<string, string>;
  fields: Record<string, any>;
  timestamp?: Date;
}

interface BatchWriteRequest {
  connectionId: string;
  database: string;
  points: DataPoint[];
  precision?: 'ns' | 'us' | 'ms' | 's' | 'm' | 'h';
}

interface WriteResult {
  success: boolean;
  pointsWritten: number;
  errors: WriteError[];
  duration: number;
}

interface WriteError {
  point: DataPoint;
  error: string;
  line?: number;
}

interface CsvImportConfig {
  measurement: string;
  timestampColumn: string;
  timestampFormat: string;
  tagColumns: string[];
  fieldColumns: string[];
  skipHeader: boolean;
  delimiter: string;
}

interface JsonImportConfig {
  measurement: string;
  timestampField: string;
  timestampFormat: string;
  tagFields: string[];
  fieldFields: string[];
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: ImportError[];
  duration: number;
}

interface ImportError {
  row: number;
  error: string;
  data?: any;
}
```

### 2.5 监控相关类型
```typescript
interface DatabaseStats {
  name: string;
  measurementCount: number;
  seriesCount: number;
  pointCount: number;
  diskSize: number;
  lastUpdate: Date;
}

interface SystemInfo {
  version: string;
  uptime: number;
  goroutines: number;
  memoryUsage: number;
  diskUsage: DiskUsage[];
}

interface DiskUsage {
  path: string;
  total: number;
  used: number;
  available: number;
}

interface PerformanceMetrics {
  queryExecutionTime: number[];
  writeLatency: number[];
  memoryUsage: number[];
  cpuUsage: number[];
  diskIO: DiskIOMetrics;
  networkIO: NetworkIOMetrics;
}

interface DiskIOMetrics {
  readBytes: number;
  writeBytes: number;
  readOps: number;
  writeOps: number;
}

interface NetworkIOMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}
```

### 2.6 配置相关类型
```typescript
interface AppConfig {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  queryTimeout: number;
  maxQueryResults: number;
  autoSave: boolean;
  autoConnect: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}
```

## 3. 错误处理

### 3.1 错误类型
```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
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
    SerdeError(#[from] serde_json::Error),
}
```

### 3.2 错误响应格式
```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}
```

## 4. 事件系统

### 4.1 连接状态事件
```typescript
// 连接状态变化事件
interface ConnectionStatusEvent {
  connectionId: string;
  status: ConnectionStatus;
}

// 监听连接状态变化
await listen('connection-status-changed', (event) => {
  console.log('连接状态变化:', event.payload);
});
```

### 4.2 查询进度事件
```typescript
// 查询进度事件
interface QueryProgressEvent {
  queryId: string;
  progress: number; // 0-100
  stage: string;
}

// 监听查询进度
await listen('query-progress', (event) => {
  console.log('查询进度:', event.payload);
});
```

### 4.3 数据导入进度事件
```typescript
// 导入进度事件
interface ImportProgressEvent {
  importId: string;
  progress: number;
  processedRows: number;
  totalRows: number;
  errors: number;
}

// 监听导入进度
await listen('import-progress', (event) => {
  console.log('导入进度:', event.payload);
});
```
