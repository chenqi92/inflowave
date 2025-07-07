# InfluxDB GUI Manager - 详细设计文档

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

interface ConnectionStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  error?: string;
  latency?: number;
}
```

#### 2.1.3 核心接口
```rust
// Rust 后端接口
#[tauri::command]
async fn create_connection(config: ConnectionConfig) -> Result<String, String>;

#[tauri::command]
async fn test_connection(config: ConnectionConfig) -> Result<ConnectionStatus, String>;

#[tauri::command]
async fn get_connections() -> Result<Vec<ConnectionConfig>, String>;

#[tauri::command]
async fn delete_connection(id: String) -> Result<(), String>;
```

### 2.2 数据库操作模块

#### 2.2.1 功能需求
- 数据库列表查看
- 数据库创建和删除
- 保留策略(Retention Policy)管理
- 测量(Measurement)列表查看
- 字段和标签信息查看

#### 2.2.2 数据结构
```typescript
interface Database {
  name: string;
  retentionPolicies: RetentionPolicy[];
  measurements: Measurement[];
}

interface RetentionPolicy {
  name: string;
  duration: string;
  shardGroupDuration: string;
  replicaN: number;
  default: boolean;
}

interface Measurement {
  name: string;
  fields: Field[];
  tags: Tag[];
  lastUpdate: Date;
}

interface Field {
  name: string;
  type: 'float' | 'integer' | 'string' | 'boolean';
}

interface Tag {
  name: string;
  values: string[];
}
```

### 2.3 查询模块

#### 2.3.1 功能需求
- InfluxQL 查询编辑器
- 语法高亮和错误提示
- 自动补全（数据库、测量、字段、标签）
- 查询结果表格展示
- 查询历史记录
- 查询性能分析
- 右键快捷操作菜单
- 查询模板和代码片段
- 查询结果导出（CSV、JSON、Excel）
- 实时查询监控

#### 2.3.2 查询编辑器特性
- Monaco Editor 集成
- InfluxQL 语法高亮
- 智能提示和自动补全
- 查询格式化
- 快捷键支持
- 多标签页查询
- 查询书签管理
- SQL 片段库

#### 2.3.3 右键快捷操作
**数据库右键菜单**:
- 查看数据库信息
- 显示所有测量
- 显示保留策略
- 创建新测量
- 删除数据库
- 导出数据库结构
- 数据库统计信息

**测量(Measurement)右键菜单**:
- 查看最新数据 (SELECT * FROM measurement ORDER BY time DESC LIMIT 100)
- 查看表结构 (SHOW FIELD KEYS FROM measurement)
- 查看标签键 (SHOW TAG KEYS FROM measurement)
- 查看标签值 (SHOW TAG VALUES FROM measurement WITH KEY = "tag_key")
- 数据统计 (SELECT COUNT(*) FROM measurement)
- 时间范围查询
- 删除测量数据
- 导出测量数据
- 创建连续查询
- 查看测量详情

**字段(Field)右键菜单**:
- 查看字段数据 (SELECT field_name FROM measurement LIMIT 100)
- 字段统计信息 (MIN, MAX, MEAN, COUNT)
- 字段数据分布
- 字段趋势图表
- 字段数据类型转换

**标签(Tag)右键菜单**:
- 查看标签值列表
- 按标签分组查询
- 标签值统计
- 标签组合查询
- 标签过滤器生成

#### 2.3.3 数据结构
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

### 2.4 数据可视化模块

#### 2.4.1 功能需求
- 时序数据图表展示
- 多种图表类型（折线图、柱状图、散点图）
- 图表配置和自定义
- 实时数据监控
- 图表导出功能

#### 2.4.2 图表组件设计
```typescript
interface ChartConfig {
  type: 'line' | 'bar' | 'scatter' | 'area';
  title: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  series: SeriesConfig[];
  legend: LegendConfig;
  tooltip: TooltipConfig;
}

interface SeriesConfig {
  name: string;
  data: DataPoint[];
  color?: string;
  lineWidth?: number;
  showSymbol?: boolean;
}

interface DataPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}
```

### 2.5 数据写入模块

#### 2.5.1 功能需求
- 单条数据点写入
- 批量数据导入（CSV、JSON）
- 数据格式验证
- 写入进度监控
- 错误处理和重试

#### 2.5.2 数据结构
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
```

## 3. 用户界面设计

### 3.1 主界面布局
```
┌─────────────────────────────────────────────────────────────┐
│  标题栏 (窗口控制、连接状态)                                   │
├─────────────────────────────────────────────────────────────┤
│  工具栏 (连接选择、快捷操作)                                   │
├─────────────────────────────────────────────────────────────┤
│ 侧边栏 │                主内容区域                           │
│       │                                                   │
│ 导航   │  ┌─────────────────────────────────────────────┐   │
│ 菜单   │  │            页面内容                          │   │
│       │  │                                             │   │
│       │  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  状态栏 (连接信息、操作状态、性能指标)                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 页面结构
1. **仪表板页面**: 连接概览、快速操作、系统状态
2. **查询页面**: 查询编辑器、结果展示、历史记录
3. **数据库页面**: 数据库管理、保留策略、测量信息
4. **可视化页面**: 图表展示、配置面板、实时监控
5. **数据写入页面**: 单点写入、批量导入、进度监控
6. **设置页面**: 连接管理、应用配置、主题设置

### 3.3 主题设计
- **亮色主题**: 白色背景，深色文字，蓝色强调
- **暗色主题**: 深色背景，浅色文字，蓝色强调
- **自定义主题**: 用户可自定义颜色方案

## 4. 性能优化策略

### 4.1 前端优化
- 组件懒加载
- 虚拟滚动（大数据集）
- 查询结果分页
- 图表数据采样
- 状态管理优化

### 4.2 后端优化
- 连接池管理
- 查询结果缓存
- 异步处理
- 内存管理
- 错误重试机制

### 4.3 数据传输优化
- 数据压缩
- 增量更新
- 批量操作
- 连接复用

## 5. 安全性设计

### 5.1 数据安全
- 连接配置加密存储
- 敏感数据内存清理
- 安全的数据传输
- 访问权限控制

### 5.2 应用安全
- 输入验证和清理
- SQL 注入防护
- XSS 防护
- 安全的文件操作

## 6. 错误处理和日志

### 6.1 错误处理策略
- 分层错误处理
- 用户友好的错误信息
- 错误恢复机制
- 错误上报和分析

### 6.2 日志系统
- 分级日志记录
- 日志文件管理
- 性能日志
- 调试信息记录

## 7. 测试策略

### 7.1 单元测试
- Rust 后端单元测试
- React 组件测试
- 工具函数测试
- 数据模型测试

### 7.2 集成测试
- API 接口测试
- 数据库连接测试
- 端到端测试
- 性能测试

### 7.3 用户测试
- 可用性测试
- 兼容性测试
- 压力测试
- 用户体验测试
