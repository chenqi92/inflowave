import React from 'react';

// 连接相关类型
export interface ConnectionConfig {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  ssl: boolean;
  timeout: number;
  version?: string; // InfluxDB版本，支持自动补全的版本兼容
  created_at?: string;
  updated_at?: string;
  // 保持向后兼容性
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
}

export interface ConnectionTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  serverVersion?: string;
  databases?: string[];
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

// 查询相关类型
export interface QueryRequest {
  connectionId: string;
  database: string;
  query: string;
  format?: 'json' | 'csv' | 'table';
}

export interface QueryResult {
  results: {
    series?: Series[];
    error?: string;
  }[];
  executionTime?: number;
  rowCount?: number;
  error?: string;
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

export interface QueryValidation {
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
  queryExecutionTime: number[];
  writeLatency: number[];
  memoryUsage: number[];
  cpuUsage: number[];
  diskIO: DiskIOMetrics;
  networkIO: NetworkIOMetrics;
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
  theme: 'light' | 'dark' | 'auto';
  language: string;
  queryTimeout: number;
  maxQueryResults: number;
  autoSave: boolean;
  autoConnect: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
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
export type Theme = 'light' | 'dark' | 'auto';
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
  rowCount: number;
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
  queryCompletion: boolean;
  connectionStatus: boolean;
  systemAlerts: boolean;
  sound: boolean;
  desktop: boolean;
  position: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
}

export interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface WorkspaceSettings {
  layout: 'default' | 'compact' | 'wide';
  openTabs: boolean;
  pinnedQueries: boolean;
  recentFiles: boolean;
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
