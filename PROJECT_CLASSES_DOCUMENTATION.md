# InfloWave 项目代码类和功能文档

> **项目简介**: InfloWave 是一个功能强大的时序数据库管理工具，支持多种数据库类型（InfluxDB 1.x/2.x/3.x, IoTDB），提供专业级的数据查询、分析和监控功能。

## 📋 目录

- [前端 React 组件](#前端-react-组件)
- [TypeScript 类型定义](#typescript-类型定义)
- [自定义 Hooks](#自定义-hooks)
- [状态管理](#状态管理)
- [工具函数和服务](#工具函数和服务)
- [后端 Rust 代码](#后端-rust-代码)

---

## 🎨 前端 React 组件

### 布局组件 (Layout Components)

#### `DataGripStyleLayout`
**文件**: `src/components/layout/DataGripStyleLayout.tsx`  
**功能**: 应用主布局组件，模仿 JetBrains DataGrip 风格的IDE布局
- **主要功能**: 
  - 支持可调整大小的面板系统
  - 视图切换管理（数据源、查询、可视化等）
  - 工作区设置的持久化保存
  - 响应式面板布局
- **关键属性**: 面板尺寸状态、当前视图状态、右侧功能面板状态
- **核心方法**: `handleViewChange()`, `saveWorkspaceSettings()`, `handlePanelResize()`

#### `DatabaseExplorer`
**文件**: `src/components/layout/DatabaseExplorer.tsx`  
**功能**: 数据库资源管理器，显示数据库连接和表结构的树形视图
- **主要功能**:
  - 数据库连接的层级展示
  - 表和字段的动态加载
  - 右键菜单操作（查询、删除、刷新）
  - 支持拖拽操作
- **关键属性**: 展开状态管理、选中项状态、加载状态
- **核心方法**: `handleTableDoubleClick()`, `loadDatabases()`, `refreshConnection()`

#### `EnhancedResultPanel`
**文件**: `src/components/layout/EnhancedResultPanel.tsx`  
**功能**: 查询结果面板，支持多种结果格式的展示和交互
- **主要功能**:
  - 支持表格、JSON、文本等多种展示格式
  - 分页和虚拟化支持
  - 数据导出功能
  - 查询历史管理
- **关键属性**: 查询结果数据、分页状态、视图模式
- **核心方法**: `renderTableView()`, `exportData()`, `handlePageChange()`

#### `TabEditorRefactored`
**文件**: `src/components/layout/TabEditorRefactored.tsx`  
**功能**: 高级查询编辑器，支持多标签页和智能SQL编辑
- **主要功能**:
  - Monaco编辑器集成，支持SQL语法高亮
  - 查询自动完成和智能提示
  - 多标签页管理
  - 查询执行和结果处理
- **关键属性**: 标签页状态、编辑器实例、查询历史
- **核心方法**: `executeQuery()`, `createNewTab()`, `saveQuery()`

### UI 组件 (UI Components)

#### `UnifiedDataTable`
**文件**: `src/components/ui/UnifiedDataTable.tsx`  
**功能**: 统一的数据表格组件，提供丰富的表格功能
- **主要功能**:
  - 表格虚拟化支持大数据量
  - Excel风格的筛选和排序
  - 单元格选择和编辑
  - 列管理和自定义
- **关键属性**: 数据源、列配置、筛选条件、选择状态
- **核心方法**: `handleSort()`, `handleFilter()`, `handleCellEdit()`

#### `SearchInput`
**文件**: `src/components/ui/SearchInput.tsx`  
**功能**: 增强的搜索输入框，支持快捷键和智能提示
- **主要功能**:
  - 实时搜索建议
  - 键盘快捷键支持
  - 搜索历史记录
- **关键属性**: 搜索值、建议列表、历史记录
- **核心方法**: `handleSearch()`, `showSuggestions()`

#### `Button`
**文件**: `src/components/ui/Button.tsx`  
**功能**: 基础按钮组件，基于Shadcn/ui设计系统
- **主要功能**:
  - 多种变体支持（primary, secondary, outline等）
  - 尺寸和状态管理
  - 无障碍访问支持
- **关键属性**: variant、size、disabled状态
- **核心方法**: onClick事件处理

### 性能监控组件 (Performance Monitoring)

#### `MultiSourcePerformanceMonitor`
**文件**: `src/components/performance/MultiSourcePerformanceMonitor.tsx`  
**功能**: 多数据源性能监控组件，提供实时性能指标展示
- **主要功能**:
  - 多数据源统一监控
  - 响应式卡片布局
  - 实时性能指标更新
  - 健康状态可视化
- **关键属性**: 性能数据、配置设置、监控状态
- **核心方法**: `fetchPerformanceData()`, `updateConfig()`, `renderDataSourceCard()`

### 连接管理组件 (Connection Management)

#### `ConnectionManager`
**文件**: `src/components/connection/ConnectionManager.tsx`  
**功能**: 数据库连接管理组件
- **主要功能**:
  - 数据库连接的创建、编辑、删除
  - 连接测试和验证
  - 连接配置的持久化
- **关键属性**: 连接列表、当前编辑连接、测试状态
- **核心方法**: `testConnection()`, `saveConnection()`, `deleteConnection()`

---

## 📝 TypeScript 类型定义

### 核心类型定义

#### `Connection`
**文件**: `src/types/connection.ts`  
**功能**: 数据库连接配置的类型定义
```typescript
interface Connection {
  id: string;
  name: string;
  database_type: DatabaseType;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database_name?: string;
  token?: string;
  organization?: string;
  bucket?: string;
  retention_policy?: string;
  ssl?: boolean;
  created_at: string;
  updated_at: string;
}
```

#### `DatabaseType`
**文件**: `src/types/connection.ts`  
**功能**: 支持的数据库类型枚举
```typescript
enum DatabaseType {
  InfluxDB = "InfluxDB",
  InfluxDB2 = "InfluxDB2", 
  InfluxDB3 = "InfluxDB3",
  IoTDB = "IoTDB"
}
```

#### `QueryResult`
**文件**: `src/types/query.ts`  
**功能**: 查询结果的类型定义
```typescript
interface QueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  error?: string;
  execution_time?: number;
  row_count?: number;
}
```

#### `TableInfo`
**文件**: `src/types/database.ts`  
**功能**: 数据库表信息的类型定义
```typescript
interface TableInfo {
  name: string;
  type: string;
  columns: ColumnInfo[];
  row_count?: number;
  size?: number;
}
```

### 性能监控类型

#### `RealPerformanceMetrics`
**文件**: `src/components/performance/MultiSourcePerformanceMonitor.tsx`  
**功能**: 实时性能指标的类型定义
```typescript
interface RealPerformanceMetrics {
  connectionId: string;
  connectionName: string;
  databaseName: string;
  dbType: string;
  status: string;
  isConnected: boolean;
  connectionLatency: number;
  activeQueries: number;
  totalQueriesToday: number;
  averageQueryTime: number;
  slowQueriesCount: number;
  failedQueriesCount: number;
  databaseSize: number;
  tableCount: number;
  recordCount: number;
  healthScore: string;
  issues: string[];
  recommendations: string[];
}
```

---

## 🎣 自定义 Hooks

### 连接管理 Hooks

#### `useConnectionStore`
**文件**: `src/store/connection.ts`  
**功能**: 数据库连接状态管理的Zustand store
- **主要功能**:
  - 连接列表的状态管理
  - 连接的增删改查操作
  - 连接测试功能
- **关键状态**: connections列表、loading状态、error状态
- **核心方法**: `addConnection()`, `updateConnection()`, `deleteConnection()`, `testConnection()`

#### `useOpenedDatabasesStore`
**文件**: `src/stores/openedDatabasesStore.ts`  
**功能**: 已打开数据库的状态管理
- **主要功能**:
  - 跟踪当前打开的数据库
  - 管理数据库的打开/关闭状态
- **关键状态**: openedDatabases集合
- **核心方法**: `addDatabase()`, `removeDatabase()`, `clearAll()`

### 用户偏好 Hooks

#### `useUserPreferences`
**文件**: `src/hooks/useUserPreferences.ts`  
**功能**: 用户偏好设置的管理hook
- **主要功能**:
  - 用户界面设置的持久化
  - 工作区布局的保存和恢复
  - 主题和语言设置
- **关键状态**: preferences对象、loading状态
- **核心方法**: `updateWorkspaceSettings()`, `updateTheme()`, `resetToDefault()`

### 查询相关 Hooks

#### `useQueryHistory`
**文件**: `src/hooks/useQueryHistory.ts`  
**功能**: 查询历史记录的管理hook
- **主要功能**:
  - 查询历史的保存和检索
  - 历史记录的搜索和过滤
  - 收藏查询的管理
- **关键状态**: history列表、favorites列表
- **核心方法**: `addQuery()`, `searchHistory()`, `toggleFavorite()`

#### `useAutoComplete`
**文件**: `src/hooks/useAutoComplete.ts`  
**功能**: SQL自动完成功能的hook
- **主要功能**:
  - 基于数据库schema的智能提示
  - 关键字和函数的自动完成
  - 上下文感知的建议
- **关键状态**: suggestions列表、isLoading状态
- **核心方法**: `getSuggestions()`, `loadSchema()`

---

## 🗄️ 状态管理

### Zustand Stores

#### `ConnectionStore`
**文件**: `src/store/connection.ts`  
**功能**: 全局连接状态管理
- **状态包含**: 连接列表、当前连接、测试状态、错误信息
- **主要操作**: 连接的CRUD操作、连接测试、状态同步

#### `QueryStore`
**文件**: `src/store/query.ts`  
**功能**: 查询相关的全局状态管理
- **状态包含**: 查询历史、当前查询、结果缓存
- **主要操作**: 查询执行、历史管理、结果处理

#### `UIStore`
**文件**: `src/store/ui.ts`  
**功能**: UI状态的全局管理
- **状态包含**: 主题设置、面板状态、模态框状态
- **主要操作**: 主题切换、面板控制、UI状态同步

---

## 🛠️ 工具函数和服务

### 核心工具函数

#### `safeTauriInvoke`
**文件**: `src/utils/tauri.ts`  
**功能**: Tauri命令调用的安全封装
- **主要功能**:
  - 统一的错误处理
  - 超时控制
  - 日志记录
- **使用示例**: `await safeTauriInvoke('get_connections')`

#### `formatQueryResult`
**文件**: `src/utils/queryFormatter.ts`  
**功能**: 查询结果的格式化处理
- **主要功能**:
  - 不同数据库结果格式的统一化
  - 数据类型转换
  - 显示格式优化
- **核心方法**: `formatTableData()`, `formatTimeColumn()`, `sanitizeData()`

#### `connectionValidator`
**文件**: `src/utils/validation.ts`  
**功能**: 连接配置的验证工具
- **主要功能**:
  - 连接参数的有效性检查
  - 网络连接测试
  - 配置完整性验证
- **核心方法**: `validateConnection()`, `testConnectivity()`, `validateCredentials()`

### 数据库服务

#### `DatabaseService`
**文件**: `src/services/database.ts`  
**功能**: 数据库操作的抽象服务层
- **主要功能**:
  - 多数据库类型的统一接口
  - 查询执行和结果处理
  - 连接池管理
- **核心方法**: `executeQuery()`, `getSchema()`, `testConnection()`

#### `QueryService`
**文件**: `src/services/query.ts`  
**功能**: 查询相关的服务层
- **主要功能**:
  - 查询优化和执行
  - 结果缓存管理
  - 查询性能分析
- **核心方法**: `optimizeQuery()`, `executeWithCache()`, `analyzePerformance()`

---

## 🦀 后端 Rust 代码

### 数据模型 (Data Models)

#### `Connection`
**文件**: `src-tauri/src/models/connection.rs`  
**功能**: 数据库连接的Rust结构体定义
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub database_type: DatabaseType,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub database_name: Option<String>,
    pub token: Option<String>,
    pub organization: Option<String>,
    pub bucket: Option<String>,
    pub ssl: bool,
    pub created_at: String,
    pub updated_at: String,
}
```

#### `QueryRequest`
**文件**: `src-tauri/src/models/query.rs`  
**功能**: 查询请求的数据结构
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryRequest {
    pub connection_id: String,
    pub query: String,
    pub database: Option<String>,
    pub timeout: Option<u64>,
    pub format: Option<String>,
}
```

#### `QueryResult`
**文件**: `src-tauri/src/models/query.rs`  
**功能**: 查询结果的数据结构
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub success: bool,
    pub data: Option<Vec<serde_json::Value>>,
    pub columns: Option<Vec<String>>,
    pub error: Option<String>,
    pub execution_time: Option<u64>,
    pub row_count: Option<usize>,
}
```

### 命令处理器 (Command Handlers)

#### `connection_commands`
**文件**: `src-tauri/src/commands/connection.rs`  
**功能**: 连接相关的Tauri命令处理
- **主要命令**:
  - `get_connections()`: 获取所有连接
  - `save_connection()`: 保存连接配置
  - `delete_connection()`: 删除连接
  - `test_connection()`: 测试连接
- **核心功能**: 连接的CRUD操作、连接测试、配置验证

#### `query_commands`
**文件**: `src-tauri/src/commands/query.rs`  
**功能**: 查询相关的命令处理
- **主要命令**:
  - `execute_query()`: 执行SQL查询
  - `get_query_history()`: 获取查询历史
  - `save_query()`: 保存查询
  - `cancel_query()`: 取消查询
- **核心功能**: 查询执行、历史管理、查询优化

#### `database_commands`
**文件**: `src-tauri/src/commands/database.rs`  
**功能**: 数据库元数据相关的命令处理
- **主要命令**:
  - `get_databases()`: 获取数据库列表
  - `get_tables()`: 获取表列表
  - `get_table_schema()`: 获取表结构
  - `get_measurements()`: 获取时序数据的测量点
- **核心功能**: 元数据查询、schema信息获取

#### `performance_commands`
**文件**: `src-tauri/src/commands/performance.rs`  
**功能**: 性能监控相关的命令处理
- **主要命令**:
  - `get_performance_metrics()`: 获取性能指标
  - `get_opened_datasources_performance()`: 获取已打开数据源的性能
  - `update_performance_monitoring_config()`: 更新监控配置
- **核心功能**: 性能数据收集、监控配置管理

### 服务层 (Services)

#### `InfluxDBService`
**文件**: `src-tauri/src/services/influxdb.rs`  
**功能**: InfluxDB数据库的服务实现
- **主要功能**:
  - InfluxDB 1.x/2.x/3.x的统一接口
  - 查询优化和执行
  - 连接池管理
- **核心方法**: `execute_query()`, `get_measurements()`, `test_connection()`

#### `IoTDBService`
**文件**: `src-tauri/src/services/iotdb.rs`  
**功能**: IoTDB数据库的服务实现
- **主要功能**:
  - IoTDB特定的查询优化
  - 时序数据的处理
  - 路径管理和设备管理
- **核心方法**: `execute_query()`, `get_devices()`, `get_timeseries()`

#### `ConnectionManager`
**文件**: `src-tauri/src/services/connection_manager.rs`  
**功能**: 连接管理的服务层
- **主要功能**:
  - 连接池的创建和管理
  - 连接状态监控
  - 自动重连机制
- **核心方法**: `get_connection()`, `test_connection()`, `cleanup_connections()`

### 配置和工具

#### `Config`
**文件**: `src-tauri/src/config/mod.rs`  
**功能**: 应用配置管理
- **主要功能**:
  - 应用设置的加载和保存
  - 默认配置的管理
  - 配置文件的验证
- **核心结构**: AppConfig、DatabaseConfig、UIConfig

#### `Logger`
**文件**: `src-tauri/src/utils/logger.rs`  
**功能**: 日志系统
- **主要功能**:
  - 分级日志记录
  - 日志文件管理
  - 性能日志追踪
- **核心功能**: 错误日志、调试日志、性能日志

#### `Error`
**文件**: `src-tauri/src/error/mod.rs`  
**功能**: 统一错误处理
- **主要功能**:
  - 错误类型定义
  - 错误信息的统一格式化
  - 错误传播和处理
- **核心类型**: AppError、DatabaseError、ConnectionError

---

## 📊 项目统计

### 代码规模统计
- **React组件**: 80+ 个组件
- **TypeScript接口**: 50+ 个类型定义
- **自定义Hooks**: 18+ 个hooks
- **Rust结构体**: 25+ 个数据模型
- **Tauri命令**: 40+ 个API命令
- **服务类**: 10+ 个服务层实现

### 技术栈概览
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- **状态管理**: Zustand + React Query
- **编辑器**: Monaco Editor
- **后端**: Rust + Tauri + Tokio
- **数据库**: InfluxDB (1.x/2.x/3.x) + IoTDB
- **构建工具**: Vite + Tauri CLI

### 架构特点
1. **模块化设计**: 清晰的分层架构，组件职责明确
2. **类型安全**: 完整的TypeScript类型系统，前后端类型同步
3. **性能优化**: 虚拟化表格、查询缓存、连接池等优化措施
4. **用户体验**: 现代化UI设计，丰富的交互功能
5. **可扩展性**: 插件化架构，支持多数据库类型扩展

---

## 🔧 开发建议

### 代码贡献指南
1. 遵循现有的代码风格和命名约定
2. 新增组件时确保TypeScript类型完整
3. 重要功能需要添加单元测试
4. 更新相关文档和注释

### 扩展开发
1. **新增数据库支持**: 实现对应的Service层和命令处理器
2. **UI组件扩展**: 基于现有设计系统开发新组件
3. **功能模块**: 遵循现有的hook和store模式
4. **性能优化**: 关注虚拟化和缓存策略

---

**文档生成时间**: 2025-07-28  
**项目版本**: 1.0.5  
**维护者**: InfloWave开发团队

> 此文档涵盖了InfloWave项目的所有重要类、组件、接口和函数。如需更详细的信息，请参考具体的源代码文件和内联注释。