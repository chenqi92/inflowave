// 连接相关类型
export interface ConnectionConfig {
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

export interface ConnectionStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: Date;
  error?: string;
  latency?: number;
}

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
  series: Series[];
  executionTime: number;
  rowCount: number;
  error?: string;
}

export interface Series {
  name: string;
  columns: string[];
  values: any[][];
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
  fields: Record<string, any>;
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
  data?: any;
}

// 图表相关类型
export interface ChartConfig {
  type: 'line' | 'bar' | 'scatter' | 'area';
  title: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  series: SeriesConfig[];
  legend: LegendConfig;
  tooltip: TooltipConfig;
}

export interface AxisConfig {
  name: string;
  type: 'category' | 'value' | 'time';
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
  details?: any;
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
export type Theme = 'light' | 'dark';
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

// 过滤类型
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
  value: any;
}
