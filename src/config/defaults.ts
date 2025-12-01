/**
 * 应用默认配置管理
 * 集中管理所有硬编码的配置值，支持环境变量覆盖，支持多数据库类型
 */

import type { DatabaseType, DatabaseVersion } from '@/types';
import logger from '@/utils/logger';

// 当前支持的数据库类型（已实现默认配置的）
type SupportedDatabaseType = 'influxdb' | 'iotdb';

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
  dbType: DatabaseType;
  version: DatabaseVersion;
}

// 数据库特定的默认配置
interface DatabaseSpecificDefaults {
  influxdb: {
    host: string;
    port: number;
    version: DatabaseVersion;
    defaultQueryLanguage: string;
  };
  iotdb: {
    host: string;
    port: number;
    version: DatabaseVersion;
    defaultQueryLanguage: string;
    sessionPoolSize: number;
    enableCompression: boolean;
    timeZone: string;
    fetchSize: number;
    enableRedirection: boolean;
    maxRetryCount: number;
    retryIntervalMs: number;
  };
}

interface DefaultAppConfig {
  queryTimeout: number;
  maxQueryResults: number;
  maxQueryLength: number;
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
      logger.warn(`Failed to parse environment variable ${key}: ${envValue}, using default`);
      return defaultValue;
    }
  }
  
  return envValue as T;
}

/**
 * 数据库特定的默认配置
 */
export const DATABASE_SPECIFIC_DEFAULTS: DatabaseSpecificDefaults = {
  influxdb: {
    host: getEnvValue('VITE_DEFAULT_INFLUXDB_HOST', 'localhost'),
    port: getEnvValue('VITE_DEFAULT_INFLUXDB_PORT', 8086, parseInt),
    version: getEnvValue('VITE_DEFAULT_INFLUXDB_VERSION', '1.x') as DatabaseVersion,
    defaultQueryLanguage: getEnvValue('VITE_DEFAULT_INFLUXDB_QUERY_LANGUAGE', 'InfluxQL'),
  },
  iotdb: {
    host: getEnvValue('VITE_DEFAULT_IOTDB_HOST', 'localhost'),
    port: getEnvValue('VITE_DEFAULT_IOTDB_PORT', 6667, parseInt),
    version: getEnvValue('VITE_DEFAULT_IOTDB_VERSION', '1.2.x') as DatabaseVersion,
    defaultQueryLanguage: getEnvValue('VITE_DEFAULT_IOTDB_QUERY_LANGUAGE', 'SQL'),
    sessionPoolSize: getEnvValue('VITE_DEFAULT_IOTDB_SESSION_POOL_SIZE', 5, parseInt),
    enableCompression: getEnvValue('VITE_DEFAULT_IOTDB_ENABLE_COMPRESSION', true, (v) => v.toLowerCase() === 'true'),
    timeZone: getEnvValue('VITE_DEFAULT_IOTDB_TIME_ZONE', 'Asia/Shanghai'),
    fetchSize: getEnvValue('VITE_DEFAULT_IOTDB_FETCH_SIZE', 10000, parseInt),
    enableRedirection: getEnvValue('VITE_DEFAULT_IOTDB_ENABLE_REDIRECTION', true, (v) => v.toLowerCase() === 'true'),
    maxRetryCount: getEnvValue('VITE_DEFAULT_IOTDB_MAX_RETRY_COUNT', 3, parseInt),
    retryIntervalMs: getEnvValue('VITE_DEFAULT_IOTDB_RETRY_INTERVAL_MS', 1000, parseInt),
  },
};

/**
 * 通用默认连接配置（向后兼容）
 */
export const DEFAULT_CONNECTION_CONFIG: DefaultConnectionConfig = {
  host: DATABASE_SPECIFIC_DEFAULTS.influxdb.host,
  port: DATABASE_SPECIFIC_DEFAULTS.influxdb.port,
  username: getEnvValue('VITE_DEFAULT_USERNAME', ''),
  password: getEnvValue('VITE_DEFAULT_PASSWORD', ''),
  ssl: getEnvValue('VITE_DEFAULT_SSL', false, (v) => v.toLowerCase() === 'true'),
  timeout: getEnvValue('VITE_DEFAULT_TIMEOUT', 60, parseInt),
  connectionTimeout: getEnvValue('VITE_DEFAULT_CONNECTION_TIMEOUT', 30, parseInt),
  queryTimeout: getEnvValue('VITE_DEFAULT_QUERY_TIMEOUT', 60, parseInt),
  defaultQueryLanguage: DATABASE_SPECIFIC_DEFAULTS.influxdb.defaultQueryLanguage,
  dbType: 'influxdb' as const,
  version: DATABASE_SPECIFIC_DEFAULTS.influxdb.version,
};

/**
 * 默认应用配置
 */
export const DEFAULT_APP_CONFIG: DefaultAppConfig = {
  queryTimeout: getEnvValue('VITE_DEFAULT_QUERY_TIMEOUT', 30000, parseInt),
  maxQueryResults: getEnvValue('VITE_DEFAULT_MAX_QUERY_RESULTS', 10000, parseInt),
  maxQueryLength: getEnvValue('VITE_DEFAULT_MAX_QUERY_LENGTH', 50000, parseInt),
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
 * 根据数据库类型创建默认连接配置
 */
export function createDefaultConnectionConfig(dbType: DatabaseType = 'influxdb') {
  // 检查是否为支持的数据库类型
  if (!isSupportedDatabaseType(dbType)) {
    logger.warn(`Unsupported database type: ${dbType}, falling back to influxdb`);
    dbType = 'influxdb';
  }

  const dbDefaults = DATABASE_SPECIFIC_DEFAULTS[dbType as SupportedDatabaseType];

  const baseConfig = {
    name: '',
    description: '',
    dbType,
    version: dbDefaults.version,
    host: dbDefaults.host,
    port: dbDefaults.port,
    username: getEnvValue('VITE_DEFAULT_USERNAME', ''),
    password: getEnvValue('VITE_DEFAULT_PASSWORD', ''),
    ssl: getEnvValue('VITE_DEFAULT_SSL', false, (v) => v.toLowerCase() === 'true'),
    timeout: getEnvValue('VITE_DEFAULT_TIMEOUT', 60, parseInt),
    connectionTimeout: getEnvValue('VITE_DEFAULT_CONNECTION_TIMEOUT', 30, parseInt),
    queryTimeout: getEnvValue('VITE_DEFAULT_QUERY_TIMEOUT', 60, parseInt),
    defaultQueryLanguage: dbDefaults.defaultQueryLanguage,
  };

  // 添加数据库特定的配置
  if (dbType === 'iotdb') {
    const iotdbDefaults = DATABASE_SPECIFIC_DEFAULTS.iotdb;
    return {
      ...baseConfig,
      driverConfig: {
        iotdb: {
          sessionPoolSize: iotdbDefaults.sessionPoolSize,
          enableCompression: iotdbDefaults.enableCompression,
          timeZone: iotdbDefaults.timeZone,
          fetchSize: iotdbDefaults.fetchSize,
          enableRedirection: iotdbDefaults.enableRedirection,
          maxRetryCount: iotdbDefaults.maxRetryCount,
          retryIntervalMs: iotdbDefaults.retryIntervalMs,
        }
      }
    };
  }

  return baseConfig;
}

/**
 * 获取填充后的连接配置，支持多数据库类型
 */
export function getFilledConnectionConfig(config: any): any {
  let dbType = config.dbType || DEFAULT_CONNECTION_CONFIG.dbType;

  // 检查是否为支持的数据库类型
  if (!isSupportedDatabaseType(dbType)) {
    logger.warn(`Unsupported database type: ${dbType}, falling back to influxdb`);
    dbType = 'influxdb';
  }

  const dbDefaults = DATABASE_SPECIFIC_DEFAULTS[dbType as SupportedDatabaseType];

  const filledConfig = {
    ...config,
    dbType,
    version: config.version || dbDefaults.version,
    host: config.host || dbDefaults.host,
    port: config.port || dbDefaults.port,
    username: config.username || DEFAULT_CONNECTION_CONFIG.username,
    password: config.password || DEFAULT_CONNECTION_CONFIG.password,
    ssl: config.ssl !== undefined ? config.ssl : DEFAULT_CONNECTION_CONFIG.ssl,
    timeout: config.timeout || DEFAULT_CONNECTION_CONFIG.timeout,
    connectionTimeout: config.connectionTimeout || DEFAULT_CONNECTION_CONFIG.connectionTimeout,
    queryTimeout: config.queryTimeout || DEFAULT_CONNECTION_CONFIG.queryTimeout,
    defaultQueryLanguage: config.defaultQueryLanguage || dbDefaults.defaultQueryLanguage,
  };

  // 为 IoTDB 添加特定的默认配置
  if (dbType === 'iotdb') {
    const iotdbDefaults = DATABASE_SPECIFIC_DEFAULTS.iotdb;
    filledConfig.driverConfig = {
      ...filledConfig.driverConfig,
      iotdb: {
        sessionPoolSize: config.driverConfig?.iotdb?.sessionPoolSize ?? iotdbDefaults.sessionPoolSize,
        enableCompression: config.driverConfig?.iotdb?.enableCompression ?? iotdbDefaults.enableCompression,
        timeZone: config.driverConfig?.iotdb?.timeZone || iotdbDefaults.timeZone,
        fetchSize: config.driverConfig?.iotdb?.fetchSize || iotdbDefaults.fetchSize,
        enableRedirection: config.driverConfig?.iotdb?.enableRedirection ?? iotdbDefaults.enableRedirection,
        maxRetryCount: config.driverConfig?.iotdb?.maxRetryCount || iotdbDefaults.maxRetryCount,
        retryIntervalMs: config.driverConfig?.iotdb?.retryIntervalMs || iotdbDefaults.retryIntervalMs,
        ...config.driverConfig?.iotdb,
      }
    };
  }

  return filledConfig;
}

/**
 * 获取数据库特定的默认配置
 */
export function getDatabaseDefaults(dbType: DatabaseType) {
  if (!isSupportedDatabaseType(dbType)) {
    logger.warn(`Unsupported database type: ${dbType}, falling back to influxdb`);
    return DATABASE_SPECIFIC_DEFAULTS.influxdb;
  }
  return DATABASE_SPECIFIC_DEFAULTS[dbType as SupportedDatabaseType];
}

/**
 * 检查数据库类型是否支持
 */
export function isSupportedDatabaseType(dbType: string): dbType is SupportedDatabaseType {
  return dbType === 'influxdb' || dbType === 'iotdb';
}

/**
 * 环境变量配置说明
 */
export const ENV_CONFIG_DOCS = {
  // InfluxDB 配置
  VITE_DEFAULT_INFLUXDB_HOST: '默认 InfluxDB 主机地址 (默认: localhost)',
  VITE_DEFAULT_INFLUXDB_PORT: '默认 InfluxDB 端口 (默认: 8086)',
  VITE_DEFAULT_INFLUXDB_VERSION: '默认 InfluxDB 版本 (默认: 1.x)',
  VITE_DEFAULT_INFLUXDB_QUERY_LANGUAGE: '默认 InfluxDB 查询语言 (默认: InfluxQL)',

  // IoTDB 配置
  VITE_DEFAULT_IOTDB_HOST: '默认 IoTDB 主机地址 (默认: localhost)',
  VITE_DEFAULT_IOTDB_PORT: '默认 IoTDB 端口 (默认: 6667)',
  VITE_DEFAULT_IOTDB_VERSION: '默认 IoTDB 版本 (默认: 1.2.x)',
  VITE_DEFAULT_IOTDB_QUERY_LANGUAGE: '默认 IoTDB 查询语言 (默认: SQL)',
  VITE_DEFAULT_IOTDB_SESSION_POOL_SIZE: '默认 IoTDB 会话池大小 (默认: 5)',
  VITE_DEFAULT_IOTDB_ENABLE_COMPRESSION: '默认是否启用 IoTDB 压缩 (默认: true)',
  VITE_DEFAULT_IOTDB_TIME_ZONE: '默认 IoTDB 时区 (默认: Asia/Shanghai)',
  VITE_DEFAULT_IOTDB_FETCH_SIZE: '默认 IoTDB 获取大小 (默认: 10000)',
  VITE_DEFAULT_IOTDB_ENABLE_REDIRECTION: '默认是否启用 IoTDB 重定向 (默认: true)',
  VITE_DEFAULT_IOTDB_MAX_RETRY_COUNT: '默认 IoTDB 最大重试次数 (默认: 3)',
  VITE_DEFAULT_IOTDB_RETRY_INTERVAL_MS: '默认 IoTDB 重试间隔毫秒 (默认: 1000)',

  // 通用配置
  VITE_DEFAULT_USERNAME: '默认用户名',
  VITE_DEFAULT_PASSWORD: '默认密码',
  VITE_DEFAULT_SSL: '默认是否使用 SSL (默认: false)',
  VITE_DEFAULT_TIMEOUT: '默认连接超时时间（秒）(默认: 60)',
  VITE_DEFAULT_CONNECTION_TIMEOUT: '默认连接超时时间（秒）(默认: 30)',
  VITE_DEFAULT_QUERY_TIMEOUT: '默认查询超时时间（秒）(默认: 60)',
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