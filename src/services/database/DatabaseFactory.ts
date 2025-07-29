/**
 * 数据库服务工厂
 * 
 * 这个文件提供了数据库服务层的工厂模式实现，
 * 用于创建和管理不同类型的数据库服务实例。
 */

import {
  DatabaseType,
  DatabaseDriver,
  DatabaseConnectionConfig,
  Query,
  QueryResult,
  ValidationResult,
  ConnectionTestResult,
  DatabaseInfo,
  MeasurementInfo,
  FieldInfo,
  TagInfo,
  SmartSuggestion,
  QueryContext
} from '../../types/database/base';

import { databaseFactory as typeFactory } from '../../types/database/factory';
import { safeTauriInvoke } from '@utils/tauri.ts';

/**
 * 数据库服务接口
 * 
 * 定义了数据库服务层的统一接口，封装了与 Tauri 后端的通信。
 */
export interface DatabaseService {
  // 连接管理
  createConnection(config: DatabaseConnectionConfig): Promise<string>;
  testConnection(config: DatabaseConnectionConfig): Promise<ConnectionTestResult>;
  closeConnection(connectionId: string): Promise<void>;
  getConnectionStatus(connectionId: string): Promise<{
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    error?: string;
  }>;

  // 查询执行
  executeQuery(connectionId: string, query: Query): Promise<QueryResult>;
  validateQuery(query: string, language: string, connectionId?: string): Promise<ValidationResult>;
  formatQuery(query: string, language: string): Promise<string>;

  // 元数据获取
  getDatabases(connectionId: string): Promise<DatabaseInfo[]>;
  getMeasurements(connectionId: string, database: string): Promise<MeasurementInfo[]>;
  getFields(connectionId: string, database: string, measurement: string): Promise<FieldInfo[]>;
  getTags(connectionId: string, database: string, measurement: string): Promise<TagInfo[]>;

  // 智能功能
  getSmartSuggestions(connectionId: string, context: QueryContext): Promise<SmartSuggestion[]>;
}

/**
 * 基础数据库服务实现
 * 
 * 提供了与 Tauri 后端通信的基础实现。
 */
export class BaseDatabaseService implements DatabaseService {
  protected driver: DatabaseDriver;

  constructor(protected dbType: DatabaseType) {
    this.driver = typeFactory.createDriver(dbType);
  }

  async createConnection(config: DatabaseConnectionConfig): Promise<string> {
    // 首先验证配置
    const validation = await this.driver.validateConnection(config);
    if (!validation.valid) {
      throw new Error(`Invalid connection config: ${validation.errors.map((e: any) => e.message).join(', ')}`);
    }

    // 调用 Tauri 后端创建连接
    try {
      const connectionId = await safeTauriInvoke<string>('create_connection', { config });
      return connectionId;
    } catch (error) {
      throw new Error(`Failed to create connection: ${error}`);
    }
  }

  async testConnection(config: DatabaseConnectionConfig): Promise<ConnectionTestResult> {
    try {
      const result = await safeTauriInvoke<ConnectionTestResult>('test_connection', { config });
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to test connection: ${error}`
      };
    }
  }

  async closeConnection(connectionId: string): Promise<void> {
    try {
      await safeTauriInvoke('delete_connection', { connectionId });
    } catch (error) {
      throw new Error(`Failed to close connection: ${error}`);
    }
  }

  async getConnectionStatus(connectionId: string): Promise<{
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    error?: string;
  }> {
    try {
      const status = await safeTauriInvoke<{
        status: 'connected' | 'disconnected' | 'connecting' | 'error';
        error?: string;
      }>('get_connection_status', { connectionId });
      return status;
    } catch (error) {
      return {
        status: 'error',
        error: `Failed to get connection status: ${error}`
      };
    }
  }

  async executeQuery(connectionId: string, query: Query): Promise<QueryResult> {
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        connectionId,
        query: query.sql,
        language: query.language,
        database: query.database,
        parameters: query.parameters,
        timeout: query.timeout,
        maxRows: query.maxRows
      });
      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute query: ${error}`
      };
    }
  }

  async validateQuery(query: string, language: string, connectionId?: string): Promise<ValidationResult> {
    try {
      // 首先使用前端驱动进行基础验证
      const driverResult = await this.driver.validateQuery(query, language as any);
      
      // 如果有连接ID，可以调用后端进行更深入的验证
      if (connectionId) {
        try {
          const backendResult = await safeTauriInvoke<ValidationResult>('validate_query', {
            connectionId,
            query,
            language
          });
          return backendResult;
        } catch {
          // 如果后端验证失败，返回前端验证结果
          return driverResult;
        }
      }
      
      return driverResult;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          line: 0,
          column: 0,
          message: `Validation error: ${error}`,
          errorType: 'validation',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  async formatQuery(query: string, language: string): Promise<string> {
    try {
      // 首先尝试使用前端驱动格式化
      const formatted = await this.driver.formatQuery(query, language as any);
      return formatted;
    } catch (error) {
      // 如果前端格式化失败，尝试调用后端
      try {
        const result = await safeTauriInvoke<string>('format_query', { query, language });
        return result;
      } catch {
        // 如果都失败了，返回原查询
        return query;
      }
    }
  }

  async getDatabases(connectionId: string): Promise<DatabaseInfo[]> {
    try {
      const databases = await safeTauriInvoke<DatabaseInfo[]>('get_databases', { connectionId });
      return databases;
    } catch (error) {
      throw new Error(`Failed to get databases: ${error}`);
    }
  }

  async getMeasurements(connectionId: string, database: string): Promise<MeasurementInfo[]> {
    try {
      const measurements = await safeTauriInvoke<MeasurementInfo[]>('get_measurements', { connectionId, database });
      return measurements;
    } catch (error) {
      throw new Error(`Failed to get measurements: ${error}`);
    }
  }

  async getFields(connectionId: string, database: string, measurement: string): Promise<FieldInfo[]> {
    try {
      const fields = await safeTauriInvoke<FieldInfo[]>('get_field_keys', { connectionId, database, measurement });
      return fields;
    } catch (error) {
      throw new Error(`Failed to get fields: ${error}`);
    }
  }

  async getTags(connectionId: string, database: string, measurement: string): Promise<TagInfo[]> {
    try {
      const tags = await safeTauriInvoke<TagInfo[]>('get_tag_keys', { connectionId, database, measurement });
      return tags;
    } catch (error) {
      throw new Error(`Failed to get tags: ${error}`);
    }
  }

  async getSmartSuggestions(connectionId: string, context: QueryContext): Promise<SmartSuggestion[]> {
    try {
      const suggestions = await safeTauriInvoke<SmartSuggestion[]>('get_query_suggestions', { connectionId, context });
      return suggestions;
    } catch (error) {
      // 如果后端获取建议失败，返回空数组
      return [];
    }
  }
}

/**
 * 数据库服务工厂
 */
export class DatabaseServiceFactory {
  private static instance: DatabaseServiceFactory;
  private services = new Map<DatabaseType, DatabaseService>();

  private constructor() {}

  public static getInstance(): DatabaseServiceFactory {
    if (!DatabaseServiceFactory.instance) {
      DatabaseServiceFactory.instance = new DatabaseServiceFactory();
    }
    return DatabaseServiceFactory.instance;
  }

  public getService(type: DatabaseType): DatabaseService {
    if (!this.services.has(type)) {
      this.services.set(type, new BaseDatabaseService(type));
    }
    return this.services.get(type)!;
  }

  public getSupportedTypes(): DatabaseType[] {
    return typeFactory.getSupportedTypes();
  }
}

// 导出工厂单例
export const databaseServiceFactory = DatabaseServiceFactory.getInstance();

// 便捷函数
export function getDatabaseService(type: DatabaseType): DatabaseService {
  return databaseServiceFactory.getService(type);
}

export function getSupportedDatabaseTypes(): DatabaseType[] {
  return databaseServiceFactory.getSupportedTypes();
}
