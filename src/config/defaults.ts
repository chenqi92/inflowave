/**
 * 应用默认配置管理
 * 集中管理所有硬编码的配置值，支持环境变量覆盖
 */

interface DefaultConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
  timeout: number;
  connectionTimeout: number;
  queryTimeout: number;
  defaultQueryLanguage: string;
  dbType: 'influxdb';
  version: '1.x' | '2.x' | '3.x';
}

interface DefaultAppConfig {
  queryTimeout: number;
  maxQueryResults: number;
  maxQueryLength: number;
  autoSave: boolean;
  autoConnect: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface DefaultPerformanceConfig {
  cacheTimeout: number;
  connectionMonitorInterval: number;
  performanceMonitorInterval: number;
  maxRetries: number;
}

/**
 * 从环境变量获取值，支持类型转换
 */
function getEnvValue<T>(key: string, defaultValue: T, parser?: (value: string) => T): T {
  const envValue = import.meta.env?.[key];
  if (envValue === undefined || envValue === null || envValue === '') {
    return defaultValue;
  }
  
  if (parser) {
    try {
      return parser(envValue);
    } catch {
      console.warn(`Failed to parse environment variable ${key}: ${envValue}, using default`);
      return defaultValue;
    }
  }
  
  return envValue as T;
}

/**
 * 默认连接配置
 */
export const DEFAULT_CONNECTION_CONFIG: DefaultConnectionConfig = {
  host: getEnvValue('VITE_DEFAULT_INFLUXDB_HOST', 'localhost'),
  port: getEnvValue('VITE_DEFAULT_INFLUXDB_PORT', 8086, parseInt),
  username: getEnvValue('VITE_DEFAULT_INFLUXDB_USERNAME', ''),
  password: getEnvValue('VITE_DEFAULT_INFLUXDB_PASSWORD', ''),
  ssl: getEnvValue('VITE_DEFAULT_INFLUXDB_SSL', false, (v) => v.toLowerCase() === 'true'),
  timeout: getEnvValue('VITE_DEFAULT_INFLUXDB_TIMEOUT', 60, parseInt),
  connectionTimeout: getEnvValue('VITE_DEFAULT_CONNECTION_TIMEOUT', 30, parseInt),
  queryTimeout: getEnvValue('VITE_DEFAULT_QUERY_TIMEOUT', 60, parseInt),
  defaultQueryLanguage: getEnvValue('VITE_DEFAULT_QUERY_LANGUAGE', 'InfluxQL'),
  dbType: 'influxdb' as const,
  version: getEnvValue('VITE_DEFAULT_INFLUXDB_VERSION', '1.x') as '1.x' | '2.x' | '3.x',
};

/**
 * 默认应用配置
 */
export const DEFAULT_APP_CONFIG: DefaultAppConfig = {
  queryTimeout: getEnvValue('VITE_DEFAULT_QUERY_TIMEOUT', 30000, parseInt),
  maxQueryResults: getEnvValue('VITE_DEFAULT_MAX_QUERY_RESULTS', 10000, parseInt),
  maxQueryLength: getEnvValue('VITE_DEFAULT_MAX_QUERY_LENGTH', 50000, parseInt),
  autoSave: getEnvValue('VITE_DEFAULT_AUTO_SAVE', true, (v) => v.toLowerCase() === 'true'),
  autoConnect: getEnvValue('VITE_DEFAULT_AUTO_CONNECT', false, (v) => v.toLowerCase() === 'true'),
  logLevel: getEnvValue('VITE_DEFAULT_LOG_LEVEL', 'info' as const, (v) => {
    const levels = ['debug', 'info', 'warn', 'error'] as const;
    return levels.includes(v as any) ? (v as any) : 'info';
  }),
};

/**
 * 默认性能配置
 */
export const DEFAULT_PERFORMANCE_CONFIG: DefaultPerformanceConfig = {
  cacheTimeout: getEnvValue('VITE_DEFAULT_CACHE_TIMEOUT', 5 * 60 * 1000, parseInt), // 5分钟
  connectionMonitorInterval: getEnvValue('VITE_DEFAULT_CONNECTION_MONITOR_INTERVAL', 30, parseInt), // 30秒
  performanceMonitorInterval: getEnvValue('VITE_DEFAULT_PERFORMANCE_MONITOR_INTERVAL', 1000, parseInt), // 1秒
  maxRetries: getEnvValue('VITE_DEFAULT_MAX_RETRIES', 3, parseInt),
};

/**
 * 创建默认连接配置的辅助函数
 */
export function createDefaultConnectionConfig() {
  return {
    name: '',
    description: '',
    dbType: DEFAULT_CONNECTION_CONFIG.dbType,
    version: DEFAULT_CONNECTION_CONFIG.version,
    host: DEFAULT_CONNECTION_CONFIG.host,
    port: DEFAULT_CONNECTION_CONFIG.port,
    username: DEFAULT_CONNECTION_CONFIG.username,
    password: DEFAULT_CONNECTION_CONFIG.password,
    ssl: DEFAULT_CONNECTION_CONFIG.ssl,
    timeout: DEFAULT_CONNECTION_CONFIG.timeout,
    connectionTimeout: DEFAULT_CONNECTION_CONFIG.connectionTimeout,
    queryTimeout: DEFAULT_CONNECTION_CONFIG.queryTimeout,
    defaultQueryLanguage: DEFAULT_CONNECTION_CONFIG.defaultQueryLanguage,
  };
}

/**
 * 获取填充后的连接配置
 */
export function getFilledConnectionConfig(config: any): any {
  return {
    ...config,
    dbType: config.dbType || DEFAULT_CONNECTION_CONFIG.dbType,
    version: config.version || DEFAULT_CONNECTION_CONFIG.version,
    host: config.host || DEFAULT_CONNECTION_CONFIG.host,
    port: config.port || DEFAULT_CONNECTION_CONFIG.port,
    username: config.username || DEFAULT_CONNECTION_CONFIG.username,
    password: config.password || DEFAULT_CONNECTION_CONFIG.password,
    ssl: config.ssl !== undefined ? config.ssl : DEFAULT_CONNECTION_CONFIG.ssl,
    timeout: config.timeout || DEFAULT_CONNECTION_CONFIG.timeout,
    connectionTimeout: config.connectionTimeout || DEFAULT_CONNECTION_CONFIG.connectionTimeout,
    queryTimeout: config.queryTimeout || DEFAULT_CONNECTION_CONFIG.queryTimeout,
    defaultQueryLanguage: config.defaultQueryLanguage || DEFAULT_CONNECTION_CONFIG.defaultQueryLanguage,
  };
}

/**
 * 环境变量配置说明
 */
export const ENV_CONFIG_DOCS = {
  VITE_DEFAULT_INFLUXDB_HOST: '默认 InfluxDB 主机地址 (默认: localhost)',
  VITE_DEFAULT_INFLUXDB_PORT: '默认 InfluxDB 端口 (默认: 8086)',
  VITE_DEFAULT_INFLUXDB_USERNAME: '默认 InfluxDB 用户名',
  VITE_DEFAULT_INFLUXDB_PASSWORD: '默认 InfluxDB 密码',
  VITE_DEFAULT_INFLUXDB_SSL: '默认是否使用 SSL (默认: false)',
  VITE_DEFAULT_INFLUXDB_TIMEOUT: '默认连接超时时间（秒）(默认: 60)',
  VITE_DEFAULT_QUERY_TIMEOUT: '默认查询超时时间（毫秒）(默认: 30000)',
  VITE_DEFAULT_MAX_QUERY_RESULTS: '默认最大查询结果数 (默认: 10000)',
  VITE_DEFAULT_MAX_QUERY_LENGTH: '默认最大查询语句长度 (默认: 50000)',
  VITE_DEFAULT_AUTO_SAVE: '默认是否自动保存 (默认: true)',
  VITE_DEFAULT_AUTO_CONNECT: '默认是否自动连接 (默认: false)',
  VITE_DEFAULT_LOG_LEVEL: '默认日志级别 (默认: info)',
  VITE_DEFAULT_CACHE_TIMEOUT: '默认缓存超时时间（毫秒）(默认: 300000)',
  VITE_DEFAULT_CONNECTION_MONITOR_INTERVAL: '默认连接监控间隔（秒）(默认: 30)',
  VITE_DEFAULT_PERFORMANCE_MONITOR_INTERVAL: '默认性能监控间隔（毫秒）(默认: 1000)',
  VITE_DEFAULT_MAX_RETRIES: '默认最大重试次数 (默认: 3)',
};