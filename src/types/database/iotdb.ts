/**
 * IoTDB 数据库驱动类型定义
 * 
 * 这个文件定义了 IoTDB 特定的类型和配置接口。
 */

import {
  DatabaseDriver,
  DatabaseConnectionConfig,
  DatabaseConnection,
  ValidationResult,
  ConnectionTestResult,
  Query,
  QueryResult,
  DatabaseInfo,
  MeasurementInfo,
  FieldInfo,
  TagInfo,
  SmartSuggestion,
  QueryContext,
  QueryLanguage
} from './base';

// IoTDB 版本类型
export type IoTDBVersion = '0.13.x' | '0.14.x' | '1.0.x' | '1.1.x' | '1.2.x';

// IoTDB 特定配置
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

// IoTDB 连接配置
export interface IoTDBConnectionConfig extends DatabaseConnectionConfig {
  dbType: 'iotdb';
  version?: IoTDBVersion;
  sessionPoolSize?: number;
  enableCompression?: boolean;
  timeZone?: string;
  fetchSize?: number;
  enableRedirection?: boolean;
  maxRetryCount?: number;
  retryIntervalMs?: number;
}

// IoTDB 存储组信息
export interface StorageGroup {
  name: string;
  ttl?: number;
  schemaReplicationFactor?: number;
  dataReplicationFactor?: number;
  timePartitionInterval?: number;
}

// IoTDB 设备信息
export interface DeviceInfo {
  name: string;
  storageGroup: string;
  sensors: SensorInfo[];
  isAligned?: boolean;
  template?: string;
}

// IoTDB 传感器信息
export interface SensorInfo {
  name: string;
  dataType: 'BOOLEAN' | 'INT32' | 'INT64' | 'FLOAT' | 'DOUBLE' | 'TEXT';
  encoding?: 'PLAIN' | 'DICTIONARY' | 'RLE' | 'DIFF' | 'TS_2DIFF' | 'BITMAP' | 'GORILLA' | 'REGULAR';
  compression?: 'UNCOMPRESSED' | 'SNAPPY' | 'GZIP' | 'LZO' | 'SDT' | 'PAA' | 'PLA';
  tags?: Record<string, string>;
  attributes?: Record<string, string>;
}

// IoTDB 数据库信息（存储组）
export interface IoTDBDatabaseInfo extends DatabaseInfo {
  storageGroups: StorageGroup[];
  deviceCount?: number;
  timeseriesCount?: number;
}

// IoTDB 测量信息（设备）
export interface IoTDBMeasurementInfo extends MeasurementInfo {
  storageGroup?: string;
  isAligned?: boolean;
  template?: string;
  sensorCount?: number;
}

// IoTDB 字段信息（传感器）
export interface IoTDBFieldInfo extends FieldInfo {
  type: 'float' | 'integer' | 'string' | 'boolean' | 'timestamp' | 'unknown';
  iotdbType?: 'BOOLEAN' | 'INT32' | 'INT64' | 'FLOAT' | 'DOUBLE' | 'TEXT';
  encoding?: string;
  compression?: string;
  device?: string;
  storageGroup?: string;
}

// IoTDB 标签信息（设备标签）
export interface IoTDBTagInfo extends TagInfo {
  device?: string;
  storageGroup?: string;
  tagType: 'tag' | 'attribute';
}

/**
 * IoTDB 数据库驱动实现
 */
export class IoTDBDriver implements DatabaseDriver {
  readonly type = 'iotdb' as const;
  readonly supportedVersions = ['0.13.x', '0.14.x', '1.0.x', '1.1.x', '1.2.x'];
  readonly defaultPort = 6667;
  readonly supportedLanguages: QueryLanguage[] = ['sql', 'iotdb-sql'];
  readonly displayName = 'Apache IoTDB';
  readonly description = 'Time series database for IoT scenarios with high write load and complex queries';

  async validateConnection(config: DatabaseConnectionConfig): Promise<ValidationResult> {
    const errors: any[] = [];
    
    // 基础验证
    if (!config.host) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Host is required',
        errorType: 'validation',
        severity: 'error'
      });
    }
    
    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Valid port number is required (1-65535)',
        errorType: 'validation',
        severity: 'error'
      });
    }

    // IoTDB 特定验证
    const iotdbConfig = config as IoTDBConnectionConfig;
    if (iotdbConfig.sessionPoolSize && (iotdbConfig.sessionPoolSize < 1 || iotdbConfig.sessionPoolSize > 100)) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Session pool size must be between 1 and 100',
        errorType: 'validation',
        severity: 'warning'
      });
    }

    if (iotdbConfig.fetchSize && iotdbConfig.fetchSize < 1) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Fetch size must be greater than 0',
        errorType: 'validation',
        severity: 'warning'
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning')
    };
  }

  async createConnection(config: DatabaseConnectionConfig): Promise<DatabaseConnection> {
    // 这里会调用 Tauri 后端创建实际连接
    // 现在返回一个模拟的连接对象
    return {
      id: config.id || `iotdb_${Date.now()}`,
      config,
      status: 'disconnected',
      metadata: {
        driverType: 'iotdb',
        version: (config as IoTDBConnectionConfig).version || '1.2.x'
      }
    };
  }

  async testConnection(config: DatabaseConnectionConfig): Promise<ConnectionTestResult> {
    // 这里会调用 Tauri 后端测试连接
    // 现在返回一个模拟的测试结果
    return {
      success: true,
      latency: 30,
      serverVersion: '1.2.0',
      databases: ['root.sg1', 'root.sg2'],
      metadata: {
        storageGroups: ['root.sg1', 'root.sg2']
      }
    };
  }

  async closeConnection(connection: DatabaseConnection): Promise<void> {
    // 这里会调用 Tauri 后端关闭连接
    connection.status = 'disconnected';
  }

  async executeQuery(connection: DatabaseConnection, query: Query): Promise<QueryResult> {
    // 这里会调用 Tauri 后端执行查询
    // 现在返回一个模拟的查询结果
    return {
      success: true,
      data: [['Time', 'root.sg1.d1.s1'], ['2023-01-01T00:00:00.000+08:00', 25.5]],
      columns: ['Time', 'root.sg1.d1.s1'],
      rowCount: 1,
      executionTime: 15
    };
  }

  async validateQuery(query: string, language: QueryLanguage): Promise<ValidationResult> {
    // 这里会根据语言类型调用相应的验证器
    if (language === 'sql' || language === 'iotdb-sql') {
      // 调用 IoTDB SQL 验证器
      return { valid: true, errors: [], warnings: [] };
    }
    
    return {
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `Unsupported query language: ${language}`,
        errorType: 'validation',
        severity: 'error'
      }],
      warnings: []
    };
  }

  async formatQuery(query: string, language: QueryLanguage): Promise<string> {
    // 这里会根据语言类型调用相应的格式化器
    return query; // 暂时返回原查询
  }

  async getDatabases(connection: DatabaseConnection): Promise<DatabaseInfo[]> {
    // 这里会调用 Tauri 后端获取存储组列表
    return [];
  }

  async getMeasurements(connection: DatabaseConnection, database: string): Promise<MeasurementInfo[]> {
    // 这里会调用 Tauri 后端获取设备列表
    return [];
  }

  async getFields(connection: DatabaseConnection, database: string, measurement: string): Promise<FieldInfo[]> {
    // 这里会调用 Tauri 后端获取传感器列表
    return [];
  }

  async getTags(connection: DatabaseConnection, database: string, measurement: string): Promise<TagInfo[]> {
    // 这里会调用 Tauri 后端获取设备标签列表
    return [];
  }

  async getSmartSuggestions(connection: DatabaseConnection, context: QueryContext): Promise<SmartSuggestion[]> {
    // 这里会根据上下文提供智能建议
    return [];
  }

  async healthCheck(connection: DatabaseConnection): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    // 这里会检查连接健康状态
    return {
      healthy: true,
      latency: 8
    };
  }
}

// 工具函数：获取 IoTDB 数据类型映射
export function mapIoTDBDataType(iotdbType: string): 'float' | 'integer' | 'string' | 'boolean' | 'timestamp' | 'unknown' {
  switch (iotdbType.toUpperCase()) {
    case 'BOOLEAN':
      return 'boolean';
    case 'INT32':
    case 'INT64':
      return 'integer';
    case 'FLOAT':
    case 'DOUBLE':
      return 'float';
    case 'TEXT':
      return 'string';
    default:
      return 'unknown';
  }
}

// 工具函数：获取默认 IoTDB 配置
export function getDefaultIoTDBConfig(): IoTDBConfig {
  return {
    version: '1.2.x',
    sessionPoolSize: 5,
    enableCompression: true,
    timeZone: 'Asia/Shanghai',
    fetchSize: 10000,
    enableRedirection: true,
    maxRetryCount: 3,
    retryIntervalMs: 1000
  };
}
