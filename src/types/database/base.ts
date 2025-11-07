/**
 * 数据库抽象层基础接口定义
 * 
 * 这个文件定义了所有数据库驱动必须实现的基础接口，
 * 提供了统一的数据库操作抽象。
 */

// 基础类型定义
export type DatabaseType = 'influxdb' | 'iotdb' | 'prometheus' | 'elasticsearch' | 's3' | 'minio';
export type QueryLanguage = 'influxql' | 'flux' | 'sql' | 'iotdb-sql' | 'promql';

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions?: string[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  errorType: 'syntax' | 'semantic' | 'reference' | 'type' | 'validation';
  severity: 'error' | 'warning' | 'info';
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  serverVersion?: string;
  databases?: string[];
  metadata?: Record<string, any>;
}

// 执行消息类型（与 index.ts 保持一致）
export type MessageType = 'success' | 'warning' | 'error' | 'info';

// 执行消息
export interface ExecutionMessage {
  type: MessageType;
  timestamp: Date;
  message: string;
  details?: string;
  sqlStatement?: string;
}

// 执行统计信息
export interface ExecutionStatistics {
  affectedRows?: number;
  insertedRows?: number;
  updatedRows?: number;
  deletedRows?: number;
  warnings?: number;
  errors?: number;
}

// 执行计划步骤
export interface ExecutionPlanStep {
  operation: string;
  cost?: number;
  rows?: number;
  details?: string;
  children?: ExecutionPlanStep[];
}

// 执行计划
export interface ExecutionPlan {
  steps: ExecutionPlanStep[];
  totalCost?: number;
  estimatedRows?: number;
}

// 聚合信息
export interface AggregationInfo {
  count?: number;
  sum?: number;
  avg?: number;
  max?: number;
  min?: number;
}

// 查询结果接口
export interface QueryResult {
  success: boolean;
  data?: (string | number | boolean | null)[][];
  columns?: string[];
  rowCount?: number;
  executionTime?: number;
  error?: string;
  metadata?: Record<string, any>;

  // 新增字段
  messages?: ExecutionMessage[];
  statistics?: ExecutionStatistics;
  executionPlan?: ExecutionPlan;
  aggregations?: AggregationInfo;
  sqlType?: string;

  // 兼容现有格式
  results?: {
    series?: Series[];
    error?: string;
  }[];
}

export interface Series {
  name: string;
  columns: string[];
  values: (string | number | boolean | null)[][];
  tags?: Record<string, string>;
}

// 查询请求接口
export interface Query {
  sql: string;
  language: QueryLanguage;
  database?: string;
  parameters?: Record<string, any>;
  timeout?: number;
  maxRows?: number;
}

// 数据库连接配置基础接口
export interface DatabaseConnectionConfig {
  id?: string;
  name: string;
  description?: string;
  dbType: DatabaseType;
  host: string;
  port: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  timeout?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
  // 数据库特定配置
  driverConfig?: Record<string, any>;
  // 代理配置
  proxyConfig?: ProxyConfig;
  // 时间戳
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  proxyType: 'http' | 'https' | 'socks5';
}

// 数据库连接接口
export interface DatabaseConnection {
  id: string;
  config: DatabaseConnectionConfig;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

// 数据库信息接口
export interface DatabaseInfo {
  name: string;
  type?: string;
  size?: number;
  createdAt?: Date;
  metadata?: Record<string, any>;
}

// 测量/表信息接口
export interface MeasurementInfo {
  name: string;
  database: string;
  type?: string;
  fieldCount?: number;
  tagCount?: number;
  seriesCount?: number;
  firstTime?: Date;
  lastTime?: Date;
  metadata?: Record<string, any>;
}

// 字段信息接口
export interface FieldInfo {
  name: string;
  type: 'float' | 'integer' | 'string' | 'boolean' | 'timestamp' | 'unknown';
  nullable?: boolean;
  measurement?: string;
  database?: string;
  metadata?: Record<string, any>;
}

// 标签信息接口
export interface TagInfo {
  name: string;
  values?: string[];
  valueCount?: number;
  measurement?: string;
  database?: string;
  metadata?: Record<string, any>;
}

// 智能建议接口
export interface SmartSuggestion {
  type: 'keyword' | 'function' | 'table' | 'column' | 'value';
  text: string;
  displayText?: string;
  description?: string;
  insertText?: string;
  detail?: string;
  documentation?: string;
  sortText?: string;
  filterText?: string;
}

// 查询上下文接口
export interface QueryContext {
  connectionId: string;
  database?: string;
  language: QueryLanguage;
  cursorPosition?: {
    line: number;
    column: number;
  };
  selectedText?: string;
  metadata?: Record<string, any>;
}

/**
 * 数据库驱动抽象接口
 * 
 * 所有数据库驱动都必须实现这个接口，提供统一的数据库操作方法。
 */
export interface DatabaseDriver {
  // 驱动基本信息
  readonly type: DatabaseType;
  readonly supportedVersions: string[];
  readonly defaultPort: number;
  readonly supportedLanguages: QueryLanguage[];
  readonly displayName: string;
  readonly description: string;

  // 连接管理
  validateConnection(config: DatabaseConnectionConfig): Promise<ValidationResult>;
  createConnection(config: DatabaseConnectionConfig): Promise<DatabaseConnection>;
  testConnection(config: DatabaseConnectionConfig): Promise<ConnectionTestResult>;
  closeConnection(connection: DatabaseConnection): Promise<void>;

  // 查询执行
  executeQuery(connection: DatabaseConnection, query: Query): Promise<QueryResult>;
  validateQuery(query: string, language: QueryLanguage): Promise<ValidationResult>;
  formatQuery(query: string, language: QueryLanguage): Promise<string>;

  // 元数据获取
  getDatabases(connection: DatabaseConnection): Promise<DatabaseInfo[]>;
  getMeasurements(connection: DatabaseConnection, database: string): Promise<MeasurementInfo[]>;
  getFields(connection: DatabaseConnection, database: string, measurement: string): Promise<FieldInfo[]>;
  getTags(connection: DatabaseConnection, database: string, measurement: string): Promise<TagInfo[]>;

  // 智能功能
  getSmartSuggestions(connection: DatabaseConnection, context: QueryContext): Promise<SmartSuggestion[]>;
  
  // 健康检查
  healthCheck(connection: DatabaseConnection): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
    metadata?: Record<string, any>;
  }>;
}

/**
 * 数据库驱动工厂接口
 */
export interface DatabaseDriverFactory {
  createDriver(type: DatabaseType): DatabaseDriver;
  getSupportedTypes(): DatabaseType[];
  isSupported(type: DatabaseType): boolean;
}
