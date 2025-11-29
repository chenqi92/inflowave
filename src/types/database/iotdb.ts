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
import { safeTauriInvoke } from '@/utils/tauri';
import logger from '@/utils/logger';

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
    const connectionId = config.id || `iotdb_${Date.now()}`;

    try {
      // 调用 Tauri 后端创建实际连接
      await safeTauriInvoke('test_connection', {
        connectionId,
        config: {
          id: connectionId,
          name: config.name,
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          ssl: config.ssl,
          timeout: config.timeout,
          db_type: 'iotdb',
          iotdb_config: (config as IoTDBConnectionConfig)
        }
      });

      return {
        id: connectionId,
        config,
        status: 'connected',
        metadata: {
          driverType: 'iotdb',
          version: (config as IoTDBConnectionConfig).version || '1.2.x'
        }
      };
    } catch (error) {
      logger.error('IoTDB 连接创建失败:', error);
      return {
        id: connectionId,
        config,
        status: 'error',
        metadata: {
          driverType: 'iotdb',
          version: (config as IoTDBConnectionConfig).version || '1.2.x',
          error: String(error)
        }
      };
    }
  }

  async testConnection(config: DatabaseConnectionConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const connectionId = config.id || `iotdb_test_${Date.now()}`;

    try {
      // 调用 Tauri 后端测试连接
      const result = await safeTauriInvoke<{
        success: boolean;
        version?: string;
        latency?: number;
        error?: string;
      }>('test_connection', {
        connectionId,
        config: {
          id: connectionId,
          name: config.name || 'test',
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          ssl: config.ssl,
          timeout: config.timeout,
          db_type: 'iotdb',
          iotdb_config: (config as IoTDBConnectionConfig)
        }
      });

      if (!result?.success) {
        return {
          success: false,
          error: result?.error || '连接测试失败'
        };
      }

      // 获取存储组列表
      const storageGroups = await safeTauriInvoke<string[]>('get_iotdb_storage_groups', {
        connectionId
      }).catch(() => []);

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency: result?.latency || latency,
        serverVersion: result?.version,
        databases: storageGroups,
        metadata: {
          storageGroups
        }
      };
    } catch (error) {
      logger.error('IoTDB 连接测试失败:', error);
      return {
        success: false,
        error: String(error)
      };
    }
  }

  async closeConnection(connection: DatabaseConnection): Promise<void> {
    try {
      await safeTauriInvoke('disconnect', {
        connectionId: connection.id
      });
      connection.status = 'disconnected';
    } catch (error) {
      logger.error('IoTDB 断开连接失败:', error);
      connection.status = 'error';
    }
  }

  async executeQuery(connection: DatabaseConnection, query: Query): Promise<QueryResult> {
    try {
      const result = await safeTauriInvoke<{
        columns: string[];
        data: any[][];
        row_count: number;
        execution_time: number;
      }>('execute_iotdb_query', {
        connectionId: connection.id,
        query: query.sql,
        storageGroup: query.database
      });

      return {
        success: true,
        data: result?.data || [],
        columns: result?.columns || [],
        rowCount: result?.row_count || 0,
        executionTime: result?.execution_time || 0
      };
    } catch (error) {
      logger.error('IoTDB 查询执行失败:', error);
      return {
        success: false,
        data: [],
        columns: [],
        rowCount: 0,
        executionTime: 0,
        error: String(error)
      };
    }
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
    try {
      const storageGroups = await safeTauriInvoke<string[]>('get_iotdb_storage_groups', {
        connectionId: connection.id
      });

      return (storageGroups || []).map(name => ({
        name,
        type: 'storage_group' as const,
        metadata: {}
      }));
    } catch (error) {
      logger.error('IoTDB 获取存储组列表失败:', error);
      return [];
    }
  }

  async getMeasurements(connection: DatabaseConnection, database: string): Promise<MeasurementInfo[]> {
    try {
      const devices = await safeTauriInvoke<string[]>('get_iotdb_devices', {
        connectionId: connection.id,
        storageGroup: database
      });

      return (devices || []).map(name => ({
        name,
        database,
        type: 'device' as const,
        metadata: {
          storageGroup: database
        }
      }));
    } catch (error) {
      logger.error('IoTDB 获取设备列表失败:', error);
      return [];
    }
  }

  async getFields(connection: DatabaseConnection, database: string, measurement: string): Promise<FieldInfo[]> {
    try {
      const timeseries = await safeTauriInvoke<string[]>('get_iotdb_timeseries', {
        connectionId: connection.id,
        storageGroup: database,
        device: measurement
      });

      return (timeseries || []).map(name => ({
        name,
        type: 'unknown' as const,
        nullable: true,
        metadata: {
          device: measurement,
          storageGroup: database
        }
      }));
    } catch (error) {
      logger.error('IoTDB 获取时间序列列表失败:', error);
      return [];
    }
  }

  async getTags(connection: DatabaseConnection, database: string, measurement: string): Promise<TagInfo[]> {
    // IoTDB 的标签需要通过 SHOW TIMESERIES 查询获取
    try {
      const result = await safeTauriInvoke<{
        columns: string[];
        data: any[][];
      }>('execute_iotdb_query', {
        connectionId: connection.id,
        query: `SHOW TIMESERIES ${database}.${measurement}.**`,
        storageGroup: database
      });

      // 从结果中提取标签信息
      const tags: TagInfo[] = [];
      const tagIndex = result?.columns?.indexOf('tags') ?? -1;

      if (tagIndex >= 0 && result?.data) {
        const tagSet = new Set<string>();
        for (const row of result.data) {
          const tagStr = row[tagIndex];
          if (tagStr && typeof tagStr === 'string') {
            // 解析标签字符串
            const tagPairs = tagStr.split(',');
            for (const pair of tagPairs) {
              const [key] = pair.split('=');
              if (key) tagSet.add(key.trim());
            }
          }
        }
        for (const tagName of tagSet) {
          tags.push({
            name: tagName,
            metadata: {
              device: measurement,
              storageGroup: database,
              tagType: 'tag'
            }
          });
        }
      }

      return tags;
    } catch (error) {
      logger.error('IoTDB 获取标签列表失败:', error);
      return [];
    }
  }

  async getSmartSuggestions(connection: DatabaseConnection, context: QueryContext): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    try {
      // 根据上下文提供智能建议
      const queryText = context.selectedText || '';
      const cursorLine = context.cursorPosition?.line ?? 0;
      const cursorColumn = context.cursorPosition?.column ?? 0;

      // 简单的基于位置的建议
      const textLower = queryText.toLowerCase();

      // 如果用户输入了 SELECT 但还没有 FROM
      if (textLower.includes('select') && !textLower.includes('from')) {
        suggestions.push({
          text: ' FROM ',
          type: 'keyword',
          description: 'Add FROM clause'
        });
      }

      // 如果用户输入了 FROM，建议存储组
      if (textLower.includes('from') && context.database) {
        const devices = await this.getMeasurements(connection, context.database);
        for (const device of devices.slice(0, 10)) {
          suggestions.push({
            text: device.name,
            type: 'table',
            description: `Device: ${device.name}`
          });
        }
      }
    } catch (error) {
      logger.error('IoTDB 获取智能建议失败:', error);
    }

    return suggestions;
  }

  async healthCheck(connection: DatabaseConnection): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
    metadata?: Record<string, any>;
  }> {
    const startTime = Date.now();

    try {
      // 执行简单查询检查健康状态
      const result = await safeTauriInvoke<{
        success: boolean;
        version?: string;
        error?: string;
      }>('get_iotdb_server_info', {
        connectionId: connection.id
      });

      const latency = Date.now() - startTime;

      if (result?.success !== false) {
        return {
          healthy: true,
          latency,
          metadata: {
            version: result?.version
          }
        };
      }

      return {
        healthy: false,
        latency,
        error: result?.error || '健康检查失败'
      };
    } catch (error) {
      logger.error('IoTDB 健康检查失败:', error);
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: String(error)
      };
    }
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
