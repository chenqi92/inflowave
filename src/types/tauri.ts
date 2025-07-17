/**
 * Tauri 命令的类型定义
 * 用于提供更好的类型安全性
 */

// 系统相关命令的返回类型
export interface SystemInfo {
  platform: string;
  version: string;
  arch: string;
  memory: number;
  cpu: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    memory: boolean;
    disk: boolean;
  };
}

export interface AppConfig {
  version: string;
  environment: string;
  features: string[];
  settings: Record<string, any>;
}

// 文件操作相关类型
export interface FileDialogResult {
  path?: string;
  cancelled?: boolean;
}

export interface FileInfo {
  size: number;
  modified: string;
  created: string;
  isFile: boolean;
  isDir: boolean;
}

// 数据验证相关类型
export interface DataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 性能指标相关类型
export interface PerformanceMetrics {
  queryExecutionTime: Array<{ timestamp: Date; value: number }>;
  writeLatency: Array<{ timestamp: Date; value: number }>;
  memoryUsage: Array<{ timestamp: Date; value: number }>;
  cpuUsage: Array<{ timestamp: Date; value: number }>;
  diskIO: {
    read: Array<{ timestamp: Date; value: number }>;
    write: Array<{ timestamp: Date; value: number }>;
  };
  networkIO: {
    in: Array<{ timestamp: Date; value: number }>;
    out: Array<{ timestamp: Date; value: number }>;
  };
}

export interface SlowQueryInfo {
  query: string;
  executionTime: number;
  timestamp: Date;
  database: string;
  frequency: number;
}

// Tauri 命令映射类型
export interface TauriCommandMap {
  // 系统命令
  'get_system_info': SystemInfo;
  'health_check': HealthStatus;
  'get_app_config': AppConfig;
  'get_app_version': string;
  'check_for_updates': {
    hasUpdate: boolean;
    version?: string;
    url?: string;
  };

  // 文件操作命令
  'save_file_dialog': FileDialogResult;
  'write_file': void;
  'write_binary_file': void;
  'get_downloads_dir': string;
  'get_file_info': FileInfo;

  // 数据操作命令
  'validate_data_format': boolean;
  'write_data': import('../types').DataWriteResult;
  'import_data': void;

  // 性能监控命令
  'get_performance_metrics': PerformanceMetrics;
  'get_slow_query_analysis': SlowQueryInfo[];
  'get_system_resources': any;
  'perform_health_check': void;

  // 查询命令
  'execute_query': import('../types').QueryResult;

  // 连接管理命令
  'get_connections': import('../types').ConnectionConfig[];

  // 分析命令
  'get_data_quality_report': {
    overallScore: number;
    tableScores: { table: string; score: number; issues: number }[];
    columnScores: {
      table: string;
      column: string;
      score: number;
      issues: number;
    }[];
    anomalies: import('../services/analyticsService').DataAnomaly[];
    recommendations: string[];
  };
  'generate_data_profile_report': any;
  'compare_query_plans': any;
  'get_analytics_dashboard': any;
  'generate_comprehensive_report': any;
  'export_analytics_report': void;

  // 其他命令的默认类型
  [key: string]: any;
}

// 类型安全的 safeTauriInvoke 函数类型
export type SafeTauriInvoke = <K extends keyof TauriCommandMap>(
  command: K,
  args?: Record<string, any>
) => Promise<TauriCommandMap[K]>;

// 重载版本，支持自定义返回类型
export type SafeTauriInvokeGeneric = <T = any>(
  command: string,
  args?: Record<string, any>
) => Promise<T>;
