# InfloWave - 详细设计文档

## 1. 系统架构设计

### 1.1 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (React + TypeScript)                 │
├─────────────────────────────────────────────────────────────┤
│                    Tauri Bridge Layer                       │
├─────────────────────────────────────────────────────────────┤
│                    后端 (Rust)                              │
├─────────────────────────────────────────────────────────────┤
│                    InfluxDB Client                          │
├─────────────────────────────────────────────────────────────┤
│                    InfluxDB Server                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据流设计
1. **用户交互** → 前端组件
2. **前端组件** → Tauri Commands
3. **Tauri Commands** → Rust 业务逻辑
4. **Rust 业务逻辑** → InfluxDB 客户端
5. **InfluxDB 客户端** → InfluxDB 服务器
6. **响应数据** 按相反路径返回

## 2. 核心功能模块设计

### 2.1 连接管理模块

#### 2.1.1 功能需求
- 支持多个 InfluxDB 连接配置
- 连接参数：主机、端口、用户名、密码、数据库
- 连接状态实时监控
- 连接配置的安全存储（加密）
- 连接测试和验证

#### 2.1.2 数据结构
```typescript
interface ConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string; // 加密存储
  database?: string;
  ssl: boolean;
  timeout: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2.1.3 核心功能
- **连接池管理**: 复用连接，提高性能
- **健康检查**: 定期检查连接状态
- **自动重连**: 连接断开时自动重连
- **负载均衡**: 支持多个 InfluxDB 实例

### 2.2 查询执行模块

#### 2.2.1 功能需求
- InfluxQL 语法解析和验证
- 查询执行和结果处理
- 查询历史记录
- 查询性能分析
- 异步查询支持

#### 2.2.2 查询引擎设计
```rust
pub struct QueryEngine {
    connection_pool: Arc<ConnectionPool>,
    query_cache: Arc<QueryCache>,
    query_history: Arc<QueryHistory>,
}

impl QueryEngine {
    pub async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        // 1. 语法验证
        // 2. 查询优化
        // 3. 执行查询
        // 4. 结果处理
        // 5. 缓存结果
    }
}
```

#### 2.2.3 查询优化策略
- **查询缓存**: 缓存常用查询结果
- **分页查询**: 大数据集分页加载
- **并行查询**: 支持多个查询并行执行
- **查询超时**: 防止长时间查询阻塞

### 2.3 数据可视化模块

#### 2.3.1 图表类型支持
```typescript
enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge'
}

interface ChartConfig {
  type: ChartType;
  title: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  series: SeriesConfig[];
  theme: ThemeConfig;
}
```

#### 2.3.2 实时数据更新
- **WebSocket 连接**: 实时数据推送
- **增量更新**: 只更新变化的数据
- **数据缓冲**: 平滑数据更新
- **性能优化**: 大数据集渲染优化

### 2.4 数据写入模块

#### 2.4.1 写入方式
- **单点写入**: 实时数据写入
- **批量写入**: 高性能批量操作
- **文件导入**: CSV、JSON 文件导入
- **流式写入**: 持续数据流处理

#### 2.4.2 数据验证
```rust
pub struct DataValidator {
    schema: Schema,
    rules: Vec<ValidationRule>,
}

impl DataValidator {
    pub fn validate_point(&self, point: &DataPoint) -> ValidationResult {
        // 1. 字段类型验证
        // 2. 数据范围验证
        // 3. 必填字段检查
        // 4. 自定义规则验证
    }
}
```

## 3. 技术架构详解

### 3.1 前端架构

#### 3.1.1 组件层次结构
```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── MainContent
├── Pages
│   ├── Dashboard
│   ├── Connections
│   ├── Query
│   ├── Visualization
│   └── Settings
└── Components
    ├── Common
    ├── Charts
    └── Forms
```

#### 3.1.2 状态管理
```typescript
// Zustand Store 设计
interface AppState {
  connections: ConnectionState;
  queries: QueryState;
  charts: ChartState;
  ui: UiState;
}

// 连接状态
interface ConnectionState {
  connections: Connection[];
  currentConnection: Connection | null;
  connectionStatus: Record<string, ConnectionStatus>;
}
```

#### 3.1.3 路由设计
```typescript
const routes = [
  { path: '/', component: Dashboard },
  { path: '/connections', component: Connections },
  { path: '/query', component: Query },
  { path: '/visualization', component: Visualization },
  { path: '/settings', component: Settings },
];
```

### 3.2 后端架构

#### 3.2.1 模块组织
```rust
// src/main.rs - 应用入口
// src/commands/ - Tauri 命令处理器
// src/services/ - 业务逻辑服务
// src/models/ - 数据模型
// src/database/ - 数据库操作
// src/utils/ - 工具函数
// src/config/ - 配置管理
```

#### 3.2.2 依赖注入
```rust
pub struct AppState {
    pub connection_service: Arc<ConnectionService>,
    pub query_service: Arc<QueryService>,
    pub config_service: Arc<ConfigService>,
}

impl AppState {
    pub fn new() -> Self {
        let config_service = Arc::new(ConfigService::new());
        let connection_service = Arc::new(ConnectionService::new(config_service.clone()));
        let query_service = Arc::new(QueryService::new(connection_service.clone()));
        
        Self {
            connection_service,
            query_service,
            config_service,
        }
    }
}
```

### 3.3 数据库集成

#### 3.3.1 InfluxDB 客户端封装
```rust
pub struct InfluxClient {
    client: influxdb::Client,
    config: ConnectionConfig,
}

impl InfluxClient {
    pub async fn query(&self, query: &str) -> Result<QueryResult> {
        let query = self.client.query(query);
        let result = query.fetch().await?;
        Ok(QueryResult::from(result))
    }
    
    pub async fn write_points(&self, points: Vec<DataPoint>) -> Result<()> {
        let write_query = self.client.query(points);
        write_query.execute().await?;
        Ok(())
    }
}
```

#### 3.3.2 连接池实现
```rust
pub struct ConnectionPool {
    pools: HashMap<String, Pool<InfluxClient>>,
    config: PoolConfig,
}

impl ConnectionPool {
    pub async fn get_connection(&self, connection_id: &str) -> Result<PooledConnection<InfluxClient>> {
        if let Some(pool) = self.pools.get(connection_id) {
            Ok(pool.get().await?)
        } else {
            Err(Error::ConnectionNotFound)
        }
    }
}
```

## 4. 安全设计

### 4.1 数据加密
- **连接密码加密**: 使用 AES-256 加密存储
- **传输加密**: 支持 SSL/TLS 连接
- **本地存储加密**: 敏感配置文件加密

### 4.2 权限控制
```rust
pub enum Permission {
    ReadDatabase,
    WriteDatabase,
    ManageConnections,
    ExportData,
    ImportData,
}

pub struct User {
    pub id: String,
    pub name: String,
    pub permissions: Vec<Permission>,
}
```

### 4.3 审计日志
```rust
pub struct AuditLog {
    pub timestamp: DateTime<Utc>,
    pub user_id: String,
    pub action: String,
    pub resource: String,
    pub result: ActionResult,
}
```

## 5. 性能优化

### 5.1 前端优化
- **虚拟滚动**: 大数据集渲染优化
- **懒加载**: 按需加载组件和数据
- **缓存策略**: 查询结果和组件状态缓存
- **代码分割**: 减少初始加载时间

### 5.2 后端优化
- **连接复用**: 减少连接开销
- **查询优化**: 智能查询重写和优化
- **内存管理**: 高效的内存使用
- **并发处理**: 异步处理提高吞吐量

### 5.3 数据库优化
- **索引优化**: 合理使用索引提高查询性能
- **分片策略**: 数据分片提高并发性能
- **压缩算法**: 减少存储空间和网络传输

## 6. 监控和诊断

### 6.1 性能监控
```rust
pub struct PerformanceMonitor {
    pub query_latency: Histogram,
    pub connection_count: Gauge,
    pub error_rate: Counter,
}
```

### 6.2 健康检查
- **连接健康检查**: 定期检查数据库连接状态
- **系统资源监控**: CPU、内存、磁盘使用情况
- **错误率监控**: 查询错误率和类型统计

### 6.3 日志系统
```rust
use log::{info, warn, error, debug};

// 结构化日志
#[derive(Serialize)]
struct QueryLog {
    query_id: String,
    query: String,
    duration: u64,
    result_count: usize,
}
```

---

> 💡 **注意**: 这是系统架构设计的核心部分。详细的实现细节请参考各模块的具体设计文档。
