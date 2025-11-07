/**
 * IoTDB 查询引擎实现
 * 
 * 实现 IoTDB 特定的查询逻辑，支持不同版本的 IoTDB SQL
 */

import { QueryEngineBase } from './QueryEngineBase';
import { safeTauriInvoke } from '@/utils/tauri';
import logger from '@/utils/logger';
import type { 
  QueryOperation,
  QueryParams,
  FieldInfo,
  QueryCapabilities
} from '@/types/database/features';

export class IoTDBQueryEngine extends QueryEngineBase {
  constructor(version: string) {
    const capabilities: QueryCapabilities = {
      languages: ['iotdb-sql'],
      supportedOperations: ['select', 'show', 'describe', 'insert', 'delete', 'create', 'drop'],
      maxQuerySize: 500000,
      timeoutSeconds: 180,
      supportsBatch: true,
      supportsTransaction: false,
      supportsAsync: false
    };

    super('iotdb', version, capabilities);
  }

  async getDatabases(connectionId: string): Promise<string[]> {
    this.validateParams({ connectionId });
    
    try {
      const query = this.getStorageGroupQuery();
      this.logQuery(query);
      
      const { result, executionTime } = await this.measureExecutionTime(
        () => safeTauriInvoke('get_databases', { connectionId }),
        'getDatabases'
      );
      
      if (!this.validateResult(result, 'array')) {
        throw new Error('存储组列表格式无效');
      }
      
      this.logResult(result, executionTime);
      return result;
    } catch (error) {
      this.handleQueryError(error, this.getStorageGroupQuery(), { connectionId });
    }
  }

  async getTables(connectionId: string, database: string): Promise<string[]> {
    this.validateParams({ connectionId, database });
    
    try {
      const query = this.getDevicesQuery(database);
      this.logQuery(query);
      
      const { result, executionTime } = await this.measureExecutionTime(
        () => safeTauriInvoke('get_tables', { connectionId, database }),
        'getTables'
      );
      
      if (!this.validateResult(result, 'array')) {
        throw new Error('设备列表格式无效');
      }
      
      // 处理 IoTDB 设备路径，提取设备名称
      const devices = result.map((device: string) => {
        // 如果设备路径包含存储组前缀，则移除它
        if (device.startsWith(`${database  }.`)) {
          return device.substring(database.length + 1);
        }
        return device;
      });
      
      this.logResult(devices, executionTime);
      return devices;
    } catch (error) {
      this.handleQueryError(error, `获取设备列表 - 存储组: ${database}`, { connectionId, database });
    }
  }

  async getFields(connectionId: string, database: string, table: string): Promise<FieldInfo[]> {
    this.validateParams({ connectionId, database, table });
    
    try {
      const devicePath = this.buildDevicePath(database, table);
      const query = this.getTimeseriesQuery(devicePath);
      this.logQuery(query);
      
      const { result, executionTime } = await this.measureExecutionTime(
        () => safeTauriInvoke('get_fields', { connectionId, database, table }),
        'getFields'
      );
      
      if (!this.validateResult(result, 'array')) {
        throw new Error('时间序列列表格式无效');
      }
      
      // 转换为 FieldInfo 格式
      const fields: FieldInfo[] = result.map((field: any) => {
        if (typeof field === 'string') {
          return {
            name: this.extractTimeseriesName(field, devicePath),
            type: 'unknown',
            nullable: true,
            metadata: {
              fullPath: field,
              devicePath
            }
          };
        } else {
          return {
            name: field.name || this.extractTimeseriesName(field.timeseries || field, devicePath),
            type: field.dataType || field.type || 'unknown',
            nullable: field.nullable !== false,
            description: field.description,
            metadata: {
              fullPath: field.timeseries || field.name,
              devicePath,
              encoding: field.encoding,
              compression: field.compression,
              tags: field.tags,
              attributes: field.attributes
            }
          };
        }
      });
      
      this.logResult(fields, executionTime);
      return fields;
    } catch (error) {
      this.handleQueryError(error, `获取时间序列列表 - 存储组: ${database}, 设备: ${table}`, { connectionId, database, table });
    }
  }

  buildQuery(operation: QueryOperation, params: QueryParams): string {
    switch (operation) {
      case 'select':
        return this.buildSelectQuery(params);
      case 'show':
        return this.buildShowQuery(params);
      case 'describe':
        return this.buildDescribeQuery(params);
      case 'create':
        return this.buildCreateQuery(params);
      case 'drop':
        return this.buildDropQuery(params);
      default:
        throw new Error(`不支持的查询操作: ${operation}`);
    }
  }

  async executeQuery(connectionId: string, query: string, params?: QueryParams): Promise<any> {
    this.validateParams({ connectionId });
    
    try {
      const optimizedQuery = this.optimizeQuery(query, params);
      this.logQuery(optimizedQuery, params);
      
      const { result, executionTime } = await this.measureExecutionTime(
        () => safeTauriInvoke('execute_query', { 
          connectionId, 
          query: optimizedQuery,
          database: params?.database 
        }),
        'executeQuery'
      );
      
      const normalizedResult = this.normalizeResponse(result);
      this.logResult(normalizedResult, executionTime);
      
      return normalizedResult;
    } catch (error) {
      this.handleQueryError(error, query, params);
    }
  }

  // 版本适配方法
  adaptQuery(query: string, targetVersion: string): string {
    if (this.version.startsWith('0.') && targetVersion.startsWith('1.')) {
      return this.adaptV0ToV1(query);
    } else if (this.version.startsWith('1.') && targetVersion.startsWith('0.')) {
      return this.adaptV1ToV0(query);
    }
    
    return query;
  }

  // IoTDB 特定的查询构建方法
  protected buildSelectQuery(params: QueryParams): string {
    const { database, table, field, limit, timeRange } = params;
    
    let query = 'SELECT ';
    
    if (field) {
      const devicePath = this.buildDevicePath(database!, table!);
      query += `${devicePath}.${field}`;
    } else if (table) {
      const devicePath = this.buildDevicePath(database!, table);
      query += `${devicePath}.*`;
    } else {
      query += '*';
    }
    
    if (timeRange) {
      query += ` WHERE time >= ${timeRange.start} AND time <= ${timeRange.end}`;
    }
    
    query += ' ORDER BY time DESC';
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    return query;
  }

  protected buildShowQuery(params: QueryParams): string {
    const { database, table } = params;
    
    if (table) {
      const devicePath = this.buildDevicePath(database!, table);
      return this.getTimeseriesQuery(devicePath);
    } else if (database) {
      return this.getDevicesQuery(database);
    } else {
      return this.getStorageGroupQuery();
    }
  }

  protected buildDescribeQuery(params: QueryParams): string {
    const { database, table, field } = params;
    
    if (field) {
      const devicePath = this.buildDevicePath(database!, table!);
      return `SHOW TIMESERIES ${devicePath}.${field}`;
    } else if (table) {
      const devicePath = this.buildDevicePath(database!, table);
      return `SHOW TIMESERIES ${devicePath}.*`;
    } else {
      throw new Error('DESCRIBE 查询需要指定设备或时间序列');
    }
  }

  protected buildCreateQuery(params: QueryParams): string {
    const { database, table, field } = params;
    
    if (field && table && database) {
      const devicePath = this.buildDevicePath(database, table);
      return `CREATE TIMESERIES ${devicePath}.${field} WITH DATATYPE=FLOAT, ENCODING=RLE`;
    } else if (database) {
      return `CREATE STORAGE GROUP ${database}`;
    } else {
      throw new Error('CREATE 查询需要指定创建的对象类型');
    }
  }

  protected buildDropQuery(params: QueryParams): string {
    const { database, table, field } = params;
    
    if (field && table && database) {
      const devicePath = this.buildDevicePath(database, table);
      return `DROP TIMESERIES ${devicePath}.${field}`;
    } else if (database) {
      return `DROP STORAGE GROUP ${database}`;
    } else {
      throw new Error('DROP 查询需要指定删除的对象');
    }
  }

  // IoTDB 特定的辅助方法
  private getStorageGroupQuery(): string {
    if (this.version.startsWith('1.')) {
      return 'SHOW DATABASES';
    } else {
      return 'SHOW STORAGE GROUP';
    }
  }

  private getDevicesQuery(storageGroup: string): string {
    return `SHOW DEVICES ${storageGroup}.*`;
  }

  private getTimeseriesQuery(devicePath: string): string {
    return `SHOW TIMESERIES ${devicePath}.*`;
  }

  private buildDevicePath(storageGroup: string, device: string): string {
    // 确保设备路径格式正确
    if (device.startsWith(`${storageGroup  }.`)) {
      return device;
    } else {
      return `${storageGroup}.${device}`;
    }
  }

  private extractTimeseriesName(fullPath: string, devicePath: string): string {
    // 从完整路径中提取时间序列名称
    if (fullPath.startsWith(`${devicePath  }.`)) {
      return fullPath.substring(devicePath.length + 1);
    }
    
    // 如果路径不包含设备前缀，返回最后一部分
    const parts = fullPath.split('.');
    return parts[parts.length - 1];
  }

  // 版本适配辅助方法
  private adaptV0ToV1(query: string): string {
    // IoTDB 0.x 到 1.x 的查询适配
    return query.replace(/SHOW STORAGE GROUP/g, 'SHOW DATABASES');
  }

  private adaptV1ToV0(query: string): string {
    // IoTDB 1.x 到 0.x 的查询适配
    return query.replace(/SHOW DATABASES/g, 'SHOW STORAGE GROUP');
  }

  // 响应处理方法
  protected extractDatabases(response: any): string[] {
    if (Array.isArray(response)) {
      return response;
    }
    
    // 处理 IoTDB 的标准响应格式
    if (response.data && Array.isArray(response.data)) {
      return response.data.map((item: any) => {
        if (typeof item === 'string') {
          return item;
        } else if (Array.isArray(item) && item.length > 0) {
          return item[0];
        } else {
          return item.storageGroup || item.database || item;
        }
      });
    }
    
    return [];
  }

  protected extractTables(response: any): string[] {
    return this.extractDatabases(response); // 使用相同的提取逻辑
  }

  protected extractFields(response: any): FieldInfo[] {
    if (Array.isArray(response)) {
      return response.map(field => ({
        name: typeof field === 'string' ? field : field.name,
        type: typeof field === 'object' ? field.dataType || field.type || 'unknown' : 'unknown',
        nullable: true
      }));
    }
    
    return [];
  }

  // 查询优化
  protected optimizeQuery(query: string, params?: QueryParams): string {
    let optimizedQuery = query;
    
    // 为 SELECT 查询添加默认时间范围以提高性能
    if (query.toUpperCase().startsWith('SELECT') && !query.toUpperCase().includes('WHERE')) {
      // 添加最近1小时的时间范围
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      optimizedQuery += ` WHERE time >= ${oneHourAgo} AND time <= ${now}`;
    }
    
    // 为没有 LIMIT 的查询添加默认限制
    if (!query.toUpperCase().includes('LIMIT') && query.toUpperCase().startsWith('SELECT')) {
      optimizedQuery += ' LIMIT 1000';
    }
    
    return optimizedQuery;
  }

  // IoTDB 特定的连接测试
  async testConnection(connectionId: string): Promise<boolean> {
    try {
      // 使用存储组查询测试连接
      const query = this.getStorageGroupQuery();
      await this.executeQuery(connectionId, query);
      return true;
    } catch (error) {
      logger.error(`❌ [${this.dbType}] IoTDB 连接测试失败:`, error);
      return false;
    }
  }

  // 批量操作优化
  async executeBatch(queries: string[], connectionId: string): Promise<any[]> {
    // IoTDB 支持批量插入，但查询需要逐个执行
    const results: any[] = [];
    
    for (const query of queries) {
      try {
        const result = await this.executeQuery(connectionId, query);
        results.push(result);
      } catch (error) {
        results.push({ 
          error: error instanceof Error ? error.message : String(error),
          query
        });
      }
    }
    
    return results;
  }
}

export default IoTDBQueryEngine;
