/**
 * InfluxDB 数据库驱动类型定义
 * 
 * 这个文件定义了 InfluxDB 特定的类型和配置接口。
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

// InfluxDB 版本类型
export type InfluxDBVersion = '1.x' | '2.x' | '3.x';

// InfluxDB 特定配置
export interface InfluxDBConfig {
  version: InfluxDBVersion;
  database?: string; // 1.x 版本使用
  retentionPolicy?: string; // 1.x 版本使用
  // 2.x/3.x 版本配置
  v2Config?: InfluxDBV2Config;
}

export interface InfluxDBV2Config {
  apiToken: string;
  organization: string;
  bucket?: string;
  v1CompatibilityApi: boolean;
}

// InfluxDB 连接配置
export interface InfluxDBConnectionConfig extends DatabaseConnectionConfig {
  dbType: 'influxdb';
  version: InfluxDBVersion;
  database?: string;
  retentionPolicy?: string;
  v2Config?: InfluxDBV2Config;
  defaultQueryLanguage?: 'influxql' | 'flux';
}

// InfluxDB 保留策略
export interface RetentionPolicy {
  name: string;
  duration: string;
  shardGroupDuration: string;
  replicaN: number;
  default: boolean;
}

// InfluxDB 数据库信息
export interface InfluxDBDatabaseInfo extends DatabaseInfo {
  retentionPolicies: RetentionPolicy[];
  measurementCount?: number;
}

// InfluxDB 测量信息
export interface InfluxDBMeasurementInfo extends MeasurementInfo {
  retentionPolicy?: string;
}

// InfluxDB 字段信息
export interface InfluxDBFieldInfo extends FieldInfo {
  type: 'float' | 'integer' | 'string' | 'boolean';
}

// InfluxDB 标签信息
export type InfluxDBTagInfo = TagInfo;

/**
 * InfluxDB 数据库驱动实现
 */
export class InfluxDBDriver implements DatabaseDriver {
  readonly type = 'influxdb' as const;
  readonly supportedVersions = ['1.x', '2.x', '3.x'];
  readonly defaultPort = 8086;
  readonly supportedLanguages: QueryLanguage[] = ['influxql', 'flux'];
  readonly displayName = 'InfluxDB';
  readonly description = 'Time series database optimized for fast, high-availability storage and retrieval';

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

    // InfluxDB 特定验证
    const influxConfig = config as InfluxDBConnectionConfig;
    if (influxConfig.version === '2.x' || influxConfig.version === '3.x') {
      if (!influxConfig.v2Config?.apiToken) {
        errors.push({
          line: 0,
          column: 0,
          message: 'API Token is required for InfluxDB 2.x/3.x',
          errorType: 'validation',
          severity: 'error'
        });
      }
      
      if (!influxConfig.v2Config?.organization) {
        errors.push({
          line: 0,
          column: 0,
          message: 'Organization is required for InfluxDB 2.x/3.x',
          errorType: 'validation',
          severity: 'error'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  async createConnection(config: DatabaseConnectionConfig): Promise<DatabaseConnection> {
    // 这里会调用 Tauri 后端创建实际连接
    // 现在返回一个模拟的连接对象
    return {
      id: config.id || `influxdb_${Date.now()}`,
      config,
      status: 'disconnected',
      metadata: {
        driverType: 'influxdb',
        version: (config as InfluxDBConnectionConfig).version
      }
    };
  }

  async testConnection(config: DatabaseConnectionConfig): Promise<ConnectionTestResult> {
    // 这里会调用 Tauri 后端测试连接
    // 现在返回一个模拟的测试结果
    return {
      success: true,
      latency: 50,
      serverVersion: '1.8.10',
      databases: ['_internal', 'mydb']
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
      data: [['time', 'value'], ['2023-01-01T00:00:00Z', 100]],
      columns: ['time', 'value'],
      rowCount: 1,
      executionTime: 25
    };
  }

  async validateQuery(query: string, language: QueryLanguage): Promise<ValidationResult> {
    // 这里会根据语言类型调用相应的验证器
    if (language === 'influxql') {
      // 调用 InfluxQL 验证器
      return { valid: true, errors: [], warnings: [] };
    } else if (language === 'flux') {
      // 调用 Flux 验证器
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
    // 这里会调用 Tauri 后端获取数据库列表
    return [];
  }

  async getMeasurements(connection: DatabaseConnection, database: string): Promise<MeasurementInfo[]> {
    // 这里会调用 Tauri 后端获取测量列表
    return [];
  }

  async getFields(connection: DatabaseConnection, database: string, measurement: string): Promise<FieldInfo[]> {
    // 这里会调用 Tauri 后端获取字段列表
    return [];
  }

  async getTags(connection: DatabaseConnection, database: string, measurement: string): Promise<TagInfo[]> {
    // 这里会调用 Tauri 后端获取标签列表
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
      latency: 10
    };
  }
}

// 工具函数：根据版本获取支持的查询语言
export function getSupportedLanguages(version: InfluxDBVersion): QueryLanguage[] {
  switch (version) {
    case '1.x':
      return ['influxql'];
    case '2.x':
    case '3.x':
      return ['influxql', 'flux'];
    default:
      return ['influxql'];
  }
}

// 工具函数：根据版本获取默认查询语言
export function getDefaultLanguage(version: InfluxDBVersion): QueryLanguage {
  switch (version) {
    case '1.x':
      return 'influxql';
    case '2.x':
    case '3.x':
      return 'flux';
    default:
      return 'influxql';
  }
}
