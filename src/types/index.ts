import React from 'react';

// 导入新的数据库抽象层类型
import type {
  DatabaseType as BaseDatabaseType,
  QueryLanguage,
  DatabaseConnectionConfig as BaseDatabaseConnectionConfig,
  ValidationResult,
  ValidationError,
  ConnectionTestResult as BaseConnectionTestResult
} from './database/base';
import { PerformanceBottleneck } from '@services/analyticsService.ts';

// 数据库类型 - 扩展支持多种数据库
export type DatabaseType = BaseDatabaseType;

// InfluxDB 版本
export type InfluxDBVersion = '1.x' | '2.x' | '3.x';

// IoTDB 版本
export type IoTDBVersion = '0.13.x' | '0.14.x' | '1.0.x' | '1.1.x' | '1.2.x';

// 通用数据库版本类型
export type DatabaseVersion = InfluxDBVersion | IoTDBVersion;

// 代理类型
export type ProxyType = 'http' | 'https' | 'socks5';

// 代理配置
export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
  proxyType: ProxyType;
}

// InfluxDB 2.x/3.x 特有配置
export interface InfluxDBV2Config {
  apiToken: string;
  organization: string;
  bucket?: string;
  v1CompatibilityApi: boolean;
}

// IoTDB 特有配置
export interface IoTDBConfig {
  version?: IoTDBVersion;
  sessionPoolSize?: number;
  enableCompression?: boolean;
  timeZone?: string;
  fetchSize?: number;
  enableRedirection?: boolean;
  maxRetryCount?: number;
  retryIntervalMs?: number;
}

// 数据库驱动特定配置联合类型
export interface DatabaseDriverConfig {
  influxdb?: {
    version: InfluxDBVersion;
    database?: string;
    retentionPolicy?: string;
    v2Config?: InfluxDBV2Config;
    defaultQueryLanguage?: 'influxql' | 'flux';
  };
  iotdb?: IoTDBConfig;
  // 为未来的数据库类型预留空间
  prometheus?: Record<string, any>;
  elasticsearch?: Record<string, any>;
}

// 版本检测结果类型
export interface DatabaseVersionInfo {
  database_type: string;
  version: string;
  major_version: number;
  minor_version: number;
  patch_version: number;
  detected_type: string; // "influxdb1", "influxdb2", "influxdb3", "iotdb"
  api_endpoints: string[];
  supported_features: string[];
}

export interface VersionDetectionResult {
  success: boolean;
  version_info?: DatabaseVersionInfo;
  error_message?: string;
  detection_time_ms: number;
  tried_methods: string[];
}

// 连接相关类型 - 重构为支持多数据库
export interface ConnectionConfig extends Omit<BaseDatabaseConnectionConfig, 'driverConfig'> {
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
  proxyConfig?: ProxyConfig;
  // 数据库特定配置
  driverConfig?: DatabaseDriverConfig;
  // 向后兼容字段
  version?: DatabaseVersion; // 数据库版本
  database?: string; // InfluxDB 数据库名
  retentionPolicy?: string; // InfluxDB 保留策略
  v2Config?: InfluxDBV2Config; // InfluxDB 2.x/3.x 配置
  defaultQueryLanguage?: string; // 默认查询语言

  // 版本检测相关字段
  detectedVersion?: string; // 检测到的具体版本号
  detectedType?: string; // 检测到的数据库类型 (influxdb1/influxdb2/iotdb)
  versionInfo?: DatabaseVersionInfo; // 完整的版本检测信息
  lastVersionCheck?: string; // 最后一次版本检测时间
  versionCheckResult?: VersionDetectionResult; // 最后一次检测结果

  // 时间戳字段
  created_at?: string;
  updated_at?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConnectionStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  error?: string;
  latency?: number;
  poolSize?: number;
  activeConnections?: number;
  serverVersion?: string; // 检测到的服务器版本
}

// 连接测试结果 - 扩展支持多数据库
export interface ConnectionTestResult extends BaseConnectionTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  serverVersion?: string;
  databases?: string[];
  // 数据库特定的元数据
  metadata?: Record<string, any>;
  // 版本检测信息
  versionInfo?: {
    database_type: string;
    version: string;
    major_version: number;
    minor_version: number;
    patch_version: number;
    detected_type: string;
    api_endpoints: string[];
    supported_features: string[];
  };
}

// Type alias for backward compatibility
export type Connection = ConnectionConfig;

// 数据库相关类型
export interface Database {
  name: string;
  retentionPolicies: RetentionPolicy[];
  measurements: Measurement[];
}

export interface RetentionPolicy {
  name: string;
  duration: string;
  shardGroupDuration: string;
  replicaN: number;
  default: boolean;
}

export interface RetentionPolicyConfig {
  name: string;
  duration: string;
  shardGroupDuration?: string;
  replicaN?: number;
  default?: boolean;
}

export interface Measurement {
  name: string;
  fields: Field[];
  tags: Tag[];
  lastUpdate: Date;
}

export interface Field {
  name: string;
  type: 'float' | 'integer' | 'string' | 'boolean';
}

export interface FieldInfo {
  name: string;
  type: 'float' | 'integer' | 'string' | 'boolean';
}

export interface Tag {
  name: string;
  values: string[];
}

// 查询相关类型 - 扩展支持多数据库
export interface QueryRequest {
  connectionId: string;
  database?: string; // 某些数据库可能不需要指定数据库
  query: string;
  language?: QueryLanguage; // 查询语言类型
  format?: 'json' | 'csv' | 'table';
  parameters?: Record<string, any>; // 查询参数
  timeout?: number; // 查询超时
  maxRows?: number; // 最大返回行数
}

// 执行消息类型
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

export interface QueryResult {
  results: {
    series?: Series[];
    error?: string;
  }[];
  executionTime?: number;
  rowCount?: number;
  error?: string;

  // 新增字段
  messages?: ExecutionMessage[];
  statistics?: ExecutionStatistics;
  executionPlan?: ExecutionPlan;
  aggregations?: AggregationInfo;
  sqlType?: string;

  // Compatibility fields from Rust backend
  data?: (string | number | boolean | null)[][];
  columns?: string[];
}

export interface Series {
  name: string;
  columns: string[];
  values: (string | number | boolean | null)[][];
  tags?: Record<string, string>;
}

// 查询验证 - 使用新的验证结果接口
export interface QueryValidation extends ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions?: string[];
}

// 向后兼容的简化验证接口
export interface SimpleQueryValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface QueryHistory {
  id: string;
  query: string;
  database: string;
  executedAt: Date;
  executionTime: number;
  success: boolean;
  error?: string;
}

// 数据写入相关类型
export interface DataPoint {
  measurement: string;
  tags: Record<string, string>;
  fields: Record<string, string | number | boolean>;
  timestamp?: Date;
}

export interface BatchWriteRequest {
  connectionId: string;
  database: string;
  points: DataPoint[];
  precision?: 'ns' | 'us' | 'ms' | 's' | 'm' | 'h';
}

export interface WriteResult {
  success: boolean;
  pointsWritten: number;
  errors: WriteError[];
  duration: number;
}

export interface WriteError {
  point: DataPoint;
  error: string;
  line?: number;
}

// Removed duplicate SavedQuery interface - using the one below with optional properties

export interface CsvImportConfig {
  measurement: string;
  timestampColumn: string;
  timestampFormat: string;
  tagColumns: string[];
  fieldColumns: string[];
  skipHeader: boolean;
  delimiter: string;
}

export interface JsonImportConfig {
  measurement: string;
  timestampField: string;
  timestampFormat: string;
  tagFields: string[];
  fieldFields: string[];
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: ImportError[];
  duration: number;
}

export interface ImportError {
  row: number;
  error: string;
  data?: Record<string, unknown>;
}

// 图表相关类型
export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'scatter' | 'area' | 'pie';
  title: string;
  query?: string;
  connectionId?: string;
  database?: string;
  refreshInterval?: number;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series?: SeriesConfig[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  settings?: {
    theme?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
    animation?: boolean;
    smooth?: boolean;
    showDataLabels?: boolean;
    colors?: string[];
  };
}

export interface AxisConfig {
  name?: string;
  field?: string;
  type?: 'category' | 'value' | 'time';
  min?: number | string;
  max?: number | string;
  interval?: number;
}

export interface SeriesConfig {
  name: string;
  data: DataPoint[];
  color?: string;
  lineWidth?: number;
  showSymbol?: boolean;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface TooltipConfig {
  show: boolean;
  trigger: 'item' | 'axis';
  formatter?: string;
}

// 监控相关类型
export interface DatabaseStats {
  name: string;
  measurementCount: number;
  seriesCount: number;
  pointCount: number;
  diskSize: number;
  lastUpdate: Date;
}

export interface SystemInfo {
  version: string;
  uptime: number;
  goroutines: number;
  memoryUsage: number;
  diskUsage: DiskUsage[];
}

export interface DiskUsage {
  path: string;
  total: number;
  used: number;
  available: number;
}

export interface PerformanceMetrics {
  queryExecutionTime: { timestamp: string; value: number; }[];
  writeLatency: { timestamp: string; value: number; }[];
  memoryUsage: { timestamp: string; value: number; }[];
  cpuUsage: { timestamp: string; value: number; }[];
  diskIO: DiskIOMetrics;
  networkIO: NetworkIOMetrics;
  storageAnalysis?: {
    totalSize: number;
    compressionRatio: number;
    retentionPolicyEffectiveness: number;
    recommendations: {
      priority: string;
      description: string;
      estimatedSavings: number;
    }[];
  };
}

export interface DiskIOMetrics {
  readBytes: number;
  writeBytes: number;
  readOps: number;
  writeOps: number;
}

export interface NetworkIOMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}

// 配置相关类型
export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  language: string;
  queryTimeout: number;
  maxQueryResults: number;
  autoSave: boolean;
  autoConnect: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  colorScheme?: string;
  showInternalDatabases?: boolean;
}

// 错误相关类型
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// 事件相关类型
export interface ConnectionStatusEvent {
  connectionId: string;
  status: ConnectionStatus;
}

export interface QueryProgressEvent {
  queryId: string;
  progress: number;
  stage: string;
}

export interface ImportProgressEvent {
  importId: string;
  progress: number;
  processedRows: number;
  totalRows: number;
  errors: number;
}

// UI 相关类型
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  children?: MenuItem[];
}

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  closable?: boolean;
}

// 通用类型
export type Theme = 'light' | 'dark' | 'system';
export type Language = 'zh-CN' | 'en-US';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 分页类型
export interface Pagination {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}

// 排序类型
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

// 数据写入相关类型
export interface DataWriteConfig {
  connectionId: string;
  database: string;
  measurement: string;
  format: 'line-protocol' | 'csv' | 'json';
  data: string | File;
  options?: {
    precision?: 'ns' | 'u' | 'ms' | 's' | 'm' | 'h';
    retentionPolicy?: string;
    consistency?: 'one' | 'quorum' | 'all' | 'any';
    batchSize?: number;
  };
}

export interface DataWriteResult {
  success: boolean;
  message: string;
  pointsWritten: number;
  errors?: string[];
  duration: number;
}

export interface DataWriteProgress {
  total: number;
  processed: number;
  errors: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
}

// 查询历史相关类型
export interface QueryHistoryItem {
  id: string;
  query: string;
  database: string;
  connectionId: string;
  executedAt: Date;
  duration: number;
  rowCount: number;
  success: boolean;
  error?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  database?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  favorite?: boolean;
}

// 右键菜单相关类型
export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  children?: ContextMenuAction[];
  onClick?: () => void;
}

export interface DatabaseContextMenu {
  database: string;
  actions: ContextMenuAction[];
}

export interface MeasurementContextMenu {
  database: string;
  measurement: string;
  actions: ContextMenuAction[];
}

export interface FieldContextMenu {
  database: string;
  measurement: string;
  field: string;
  fieldType: 'tag' | 'field';
  actions: ContextMenuAction[];
}

// SQL 生成相关类型
export interface SqlGenerationRequest {
  type: 'select' | 'count' | 'show' | 'describe';
  database?: string;
  measurement?: string;
  fields?: string[];
  tags?: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  groupBy?: string[];
  orderBy?: {
    field: string;
    direction: 'ASC' | 'DESC';
  };
}

export interface SqlGenerationResult {
  sql: string;
  description: string;
}

// 数据导出相关类型
export interface DataExportConfig {
  connectionId: string;
  database: string;
  query: string;
  format: 'csv' | 'excel' | 'json' | 'sql';
  options?: {
    includeHeaders?: boolean;
    delimiter?: string;
    encoding?: string;
    compression?: boolean;
    chunkSize?: number;
  };
}

export interface DataExportResult {
  success: boolean;
  message: string;
  filePath?: string;
  recordCount?: number;
  rowCount?: number;
  fileSize: number;
  duration: number;
  errors?: string[];
}

export interface DataExportProgress {
  total: number;
  processed: number;
  percentage: number;
  currentChunk: number;
  totalChunks: number;
  speed: number; // rows per second
  estimatedTimeRemaining: number; // seconds
}

// 高级可视化相关类型
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  refreshInterval: number;
  timeRange: TimeRange;
  variables: DashboardVariable[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
  };
  config: {
    query: string;
    database: string;
    connectionId: string;
    refreshInterval?: number;
  };
  data?: Record<string, unknown>;
  lastUpdated?: Date;
}

export interface GridItem {
  chartId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets?: DashboardWidget[];
  layout?: GridItem[];
  settings?: {
    theme?: string;
    refreshInterval?: number;
    autoRefresh?: boolean;
    showHeader?: boolean;
    showGrid?: boolean;
    gridSize?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// 性能监控相关类型

// 数据源类型和版本
export type DataSourceType = 'influxdb' | 'iotdb';
export type DataSourceVersion = 'influxdb-1.x' | 'influxdb-2.x' | 'influxdb-3.x' | 'iotdb-0.x' | 'iotdb-1.x';

// 监控数据源信息
export interface MonitoringDataSource {
  connectionId: string;
  name: string;
  type: DataSourceType;
  version: DataSourceVersion;
  isActive: boolean;
  databases: string[];
}

// 统一的性能监控指标
export interface UnifiedPerformanceMetrics {
  dataSource: MonitoringDataSource;
  timestamp: Date;

  // 查询性能
  queryMetrics: {
    totalQueries: number;
    averageExecutionTime: number;
    queriesPerSecond: number;
    slowQueryCount: number;
    errorRate: number;
  };

  // 系统资源
  systemMetrics: {
    cpu: { usage: number; cores: number };
    memory: { used: number; total: number; percentage: number };
    disk: { used: number; total: number; percentage: number };
    network: { bytesIn: number; bytesOut: number };
  };

  // 数据库特定指标
  databaseMetrics: {
    connectionCount: number;
    databaseCount: number;
    writeLatency: number;
    readLatency: number;
    storageSize: number;
  };

  // 瓶颈和建议
  bottlenecks: PerformanceBottleneck[];
  recommendations: string[];
}

// 性能监控配置
export interface PerformanceMonitoringConfig {
  enabledDataSources: string[]; // connectionId列表
  refreshInterval: number; // 秒
  autoRefresh: boolean;
  timeRange: string; // '1h', '6h', '24h', '7d'
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    queryLatency: number;
  };
}

export interface SlowQueryInfo {
  id: string;
  query: string;
  database: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
}

export interface ConnectionHealthMetrics {
  connectionId: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  uptime: number;
  errorCount: number;
  warningCount: number;
}

export interface SystemResourceMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

// 数据库管理相关类型 (types already defined above)

export interface DatabaseStorageInfo {
  size: number;
  measurementCount: number;
  seriesCount: number;
  compressionRatio: number;
  oldestPoint: Date;
  newestPoint: Date;
}

// 用户体验设置相关类型
export interface UserPreferences {
  shortcuts: KeyboardShortcut[];
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  workspace: WorkspaceSettings;
}

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  category: string;
  keys: string[];
  enabled: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  query_completion: boolean;
  connection_status: boolean;
  system_alerts: boolean;
  export_completion: boolean;
  sound: boolean;
  desktop: boolean;
  position: string;
}

export interface AccessibilitySettings {
  high_contrast: boolean;
  font_size: string;
  font_family: string;
  reduced_motion: boolean;
  screen_reader: boolean;
  keyboard_navigation: boolean;
}

export interface WorkspaceSettings {
  layout: string;
  panel_sizes: Record<string, number>;
  panel_positions?: Record<string, number>;
  open_tabs: string[];
  pinned_queries: string[];
  recent_files: string[];
  restore_tabs_on_startup: boolean;
}

// 扩展和集成相关类型
export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface APIIntegration {
  id: string;
  name: string;
  integration_type: 'rest' | 'graphql' | 'webhook';
  endpoint: string;
  enabled: boolean;
  authentication: {
    auth_type: 'none' | 'basic' | 'bearer' | 'apikey';
    credentials: Record<string, unknown>;
  };
  headers: Record<string, string>;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  secret?: string;
  enabled: boolean;
  retry_policy: {
    max_retries: number;
    backoff_multiplier: number;
    max_backoff_time: number;
  };
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    trigger_type: 'schedule' | 'event' | 'threshold' | 'manual';
    config: Record<string, unknown>;
  };
  conditions: Record<string, unknown>[];
  actions: Record<string, unknown>[];
  execution_count: number;
  last_executed?: Date;
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'gauge';
  colorScheme?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  threshold?: {
    value: number;
    color: string;
    label: string;
  }[];
  aggregation?: 'sum' | 'avg' | 'max' | 'min' | 'count';
  groupBy?: string[];
}

export interface DashboardVariable {
  name: string;
  type: 'text' | 'select' | 'multi-select' | 'time';
  label: string;
  defaultValue: string | number | boolean;
  options?: {
    label: string;
    value: string | number | boolean;
  }[];
  query?: string;
}

export interface TimeRange {
  start: string | Date;
  end: string | Date;
  relative?: {
    amount: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  };
}

// 性能监控相关类型 (types already defined above)

// Storage and optimization types (already defined above)

// User experience types (already defined above)

// Extensions and integrations types (already defined above)

// Automation types (already defined above)

// 应用设置相关类型
export interface AppSettings {
  general: {
    theme: string;
    language: string;
    autoSave: boolean;
    autoConnect: boolean;
    startupConnection?: string;
  };
  editor: {
    fontSize: number;
    fontFamily: string;
    tabSize: number;
    wordWrap: boolean;
    lineNumbers: boolean;
    minimap: boolean;
  };
  query: {
    timeout: number;
    maxResults: number;
    autoComplete: boolean;
    syntaxHighlight: boolean;
    formatOnSave: boolean;
  };
  visualization: {
    defaultChartType: string;
    refreshInterval: number;
    maxDataPoints: number;
    colorScheme: string;
  };
  security: {
    encryptConnections: boolean;
    sessionTimeout: number;
    requireConfirmation: boolean;
  };
}

// 过滤类型
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: string | number | boolean | Date;
}

// 查询相关增强类型
// QueryRequest is already defined above

export interface QueryValidationResult {
  valid: boolean;
  errors: QueryError[];
  warnings: QueryError[];
  suggestions: string[];
}

export interface QueryError {
  line: number;
  column: number;
  message: string;
  errorType: QueryErrorType;
}

export enum QueryErrorType {
  SyntaxError = 'syntax_error',
  TypeError = 'type_error',
  ReferenceError = 'reference_error',
  ValidationError = 'validation_error',
}

// 数据库结构类型
export interface DatabaseInfo {
  name: string;
  retentionPolicies: RetentionPolicy[];
  measurementCount?: number;
  size?: number;
  createdAt?: Date;
}

export interface MeasurementInfo {
  name: string;
  database: string;
  fieldCount?: number;
  tagCount?: number;
  seriesCount?: number;
  firstTime?: Date;
  lastTime?: Date;
}

// FieldInfo is already defined above

export interface TagInfo {
  name: string;
  values?: string[];
  valueCount?: number;
  measurement: string;
  database: string;
}

// 数据写入相关类型增强
export interface WritePoint {
  measurement: string;
  fields: Record<string, any>;
  tags?: Record<string, string>;
  timestamp?: number | string | Date;
}

export interface WriteBatch {
  points: WritePoint[];
  database: string;
  retentionPolicy?: string;
  precision?: 'ns' | 'u' | 'ms' | 's' | 'm' | 'h';
}

// 系统信息增强类型
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  version: string;
  connections: {
    active: number;
    total: number;
    failed: number;
  };
  performance: {
    avgQueryTime: number;
    queriesPerSecond: number;
    errorRate: number;
  };
  resources: SystemResourceMetrics;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 文件操作类型
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: Date;
}

export interface ImportOptions {
  delimiter?: string;
  encoding?: string;
  skipHeader?: boolean;
  timestampColumn?: string;
  timestampFormat?: string;
  measurementColumn?: string;
  tagColumns?: string[];
  fieldColumns?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel' | 'xml';
  includeHeaders?: boolean;
  delimiter?: string;
  encoding?: string;
  compression?: boolean;
  splitFiles?: boolean;
  maxRowsPerFile?: number;
}
