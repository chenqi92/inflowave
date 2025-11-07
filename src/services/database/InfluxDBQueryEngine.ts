/**
 * InfluxDB 查询引擎实现
 *
 * 实现 InfluxDB 特定的查询逻辑，支持 InfluxQL 和 Flux 查询语言
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

export class InfluxDBQueryEngine extends QueryEngineBase {
  constructor(version: string) {
    const capabilities: QueryCapabilities = {
      languages: version.startsWith('2.') ? ['flux', 'influxql'] : ['influxql'],
      supportedOperations: ['select', 'show', 'describe', 'explain', 'insert', 'delete'],
      maxQuerySize: 1000000,
      timeoutSeconds: 300,
      supportsBatch: true,
      supportsTransaction: false,
      supportsAsync: true
    };

    super('influxdb', version, capabilities);
  }

  async getDatabases(connectionId: string): Promise<string[]> {
    this.validateParams({ connectionId });
    
    try {
      this.logQuery('SHOW DATABASES');
      
      const { result, executionTime } = await this.measureExecutionTime(
        () => safeTauriInvoke('get_databases', { connectionId }),
        'getDatabases'
      );
      
      if (!this.validateResult(result, 'array')) {
        throw new Error('数据库列表格式无效');
      }
      
      this.logResult(result, executionTime);
      return result;
    } catch (error) {
      this.handleQueryError(error, 'SHOW DATABASES', { connectionId });
    }
  }

  async getTables(connectionId: string, database: string): Promise<string[]> {
    this.validateParams({ connectionId, database });
    
    try {
      const query = this.buildShowMeasurementsQuery(database);
      this.logQuery(query);
      
      const { result, executionTime } = await this.measureExecutionTime(
        () => safeTauriInvoke('get_tables', { connectionId, database }),
        'getTables'
      );
      
      if (!this.validateResult(result, 'array')) {
        throw new Error('表列表格式无效');
      }
      
      this.logResult(result, executionTime);
      return result;
    } catch (error) {
      this.handleQueryError(error, `获取表列表 - 数据库: ${database}`, { connectionId, database });
    }
  }

  async getFields(connectionId: string, database: string, table: string): Promise<FieldInfo[]> {
    this.validateParams({ connectionId, database, table });
    
    try {
      const query = this.buildShowFieldKeysQuery(database, table);
      this.logQuery(query);
      
      const { result, executionTime } = await this.measureExecutionTime(
        () => safeTauriInvoke('get_fields', { connectionId, database, table }),
        'getFields'
      );
      
      if (!this.validateResult(result, 'array')) {
        throw new Error('字段列表格式无效');
      }
      
      // 转换为 FieldInfo 格式
      const fields: FieldInfo[] = result.map((field: any) => {
        if (typeof field === 'string') {
          return {
            name: field,
            type: 'unknown',
            nullable: true
          };
        } else {
          return {
            name: field.name || field.fieldKey || field,
            type: field.type || field.fieldType || 'unknown',
            nullable: field.nullable !== false,
            description: field.description,
            tags: field.tags,
            metadata: field.metadata
          };
        }
      });
      
      this.logResult(fields, executionTime);
      return fields;
    } catch (error) {
      this.handleQueryError(error, `获取字段列表 - 数据库: ${database}, 表: ${table}`, { connectionId, database, table });
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
    if (this.version.startsWith('1.') && targetVersion.startsWith('2.')) {
      return this.adaptInfluxQLToFlux(query);
    } else if (this.version.startsWith('2.') && targetVersion.startsWith('1.')) {
      return this.adaptFluxToInfluxQL(query);
    }
    
    return query;
  }

  adaptResponse(response: any, sourceVersion: string): any {
    if (sourceVersion.startsWith('2.') && this.version.startsWith('1.')) {
      return this.adaptFluxResponseToInfluxQL(response);
    } else if (sourceVersion.startsWith('1.') && this.version.startsWith('2.')) {
      return this.adaptInfluxQLResponseToFlux(response);
    }
    
    return response;
  }

  // InfluxDB 特定的查询构建方法
  protected buildSelectQuery(params: QueryParams): string {
    const { database, table, field, limit, timeRange } = params;
    
    if (this.version.startsWith('2.')) {
      // Flux 查询
      let query = `from(bucket: "${database}")`;
      
      if (timeRange) {
        query += `\n  |> range(start: ${timeRange.start}, stop: ${timeRange.end})`;
      }
      
      if (table) {
        query += `\n  |> filter(fn: (r) => r._measurement == "${table}")`;
      }
      
      if (field) {
        query += `\n  |> filter(fn: (r) => r._field == "${field}")`;
      }
      
      if (limit) {
        query += `\n  |> limit(n: ${limit})`;
      }
      
      query += '\n  |> yield()';
      
      return query;
    } else {
      // InfluxQL 查询
      let query = 'SELECT ';
      
      if (field) {
        query += `"${field}"`;
      } else {
        query += '*';
      }
      
      query += ` FROM "${table}"`;
      
      if (timeRange) {
        query += ` WHERE time >= '${timeRange.start}' AND time <= '${timeRange.end}'`;
      }
      
      query += ' ORDER BY time DESC';
      
      if (limit) {
        query += ` LIMIT ${limit}`;
      }
      
      return query;
    }
  }

  protected buildShowQuery(params: QueryParams): string {
    const { database, table } = params;
    
    if (table) {
      return this.buildShowFieldKeysQuery(database!, table);
    } else if (database) {
      return this.buildShowMeasurementsQuery(database);
    } else {
      return 'SHOW DATABASES';
    }
  }

  protected buildDescribeQuery(params: QueryParams): string {
    const { database, table } = params;
    
    if (!database || !table) {
      throw new Error('DESCRIBE 查询需要指定数据库和表名');
    }
    
    return `SHOW FIELD KEYS ON "${database}" FROM "${table}"`;
  }

  // InfluxDB 特定的辅助方法
  private buildShowMeasurementsQuery(database: string): string {
    if (this.version.startsWith('2.')) {
      return `from(bucket: "${database}") |> range(start: -1h) |> group(columns: ["_measurement"]) |> distinct(column: "_measurement") |> yield()`;
    } else {
      return `SHOW MEASUREMENTS ON "${database}"`;
    }
  }

  private buildShowFieldKeysQuery(database: string, measurement: string): string {
    if (this.version.startsWith('2.')) {
      return `from(bucket: "${database}") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "${measurement}") |> group(columns: ["_field"]) |> distinct(column: "_field") |> yield()`;
    } else {
      return `SHOW FIELD KEYS ON "${database}" FROM "${measurement}"`;
    }
  }

  // 版本适配辅助方法
  private adaptInfluxQLToFlux(influxql: string): string {
    // 简化的 InfluxQL 到 Flux 转换
    // 实际实现需要更复杂的解析和转换逻辑
    
    if (influxql.includes('SHOW DATABASES')) {
      return 'buckets() |> yield()';
    }
    
    if (influxql.includes('SHOW MEASUREMENTS')) {
      const dbMatch = influxql.match(/ON "([^"]+)"/);
      const database = dbMatch ? dbMatch[1] : 'default';
      return `from(bucket: "${database}") |> range(start: -1h) |> group(columns: ["_measurement"]) |> distinct(column: "_measurement") |> yield()`;
    }

    // 对于复杂查询，返回原查询并记录警告
    logger.warn('⚠️ InfluxQL 到 Flux 的自动转换可能不完整:', influxql);
    return influxql;
  }

  private adaptFluxToInfluxQL(flux: string): string {
    // 简化的 Flux 到 InfluxQL 转换
    // 实际实现需要更复杂的解析和转换逻辑
    
    if (flux.includes('buckets()')) {
      return 'SHOW DATABASES';
    }

    // 对于复杂查询，返回原查询并记录警告
    logger.warn('⚠️ Flux 到 InfluxQL 的自动转换可能不完整:', flux);
    return flux;
  }

  private adaptFluxResponseToInfluxQL(response: any): any {
    // 将 Flux 响应格式转换为 InfluxQL 格式
    // 这里需要根据实际的响应格式进行转换
    return response;
  }

  private adaptInfluxQLResponseToFlux(response: any): any {
    // 将 InfluxQL 响应格式转换为 Flux 格式
    // 这里需要根据实际的响应格式进行转换
    return response;
  }

  // 响应处理方法
  protected extractDatabases(response: any): string[] {
    if (Array.isArray(response)) {
      return response;
    }
    
    // 处理 InfluxDB 的标准响应格式
    if (response.results && Array.isArray(response.results)) {
      const result = response.results[0];
      if (result.series && Array.isArray(result.series)) {
        const series = result.series[0];
        if (series.values && Array.isArray(series.values)) {
          return series.values.map((value: any[]) => value[0]);
        }
      }
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
        type: typeof field === 'object' ? field.type || 'unknown' : 'unknown',
        nullable: true
      }));
    }
    
    return [];
  }

  // 查询优化
  protected optimizeQuery(query: string, params?: QueryParams): string {
    let optimizedQuery = query;
    
    // 添加默认时间范围以提高性能
    if (this.version.startsWith('2.') && !query.includes('range(') && !query.includes('SHOW')) {
      optimizedQuery = optimizedQuery.replace(
        'from(bucket:',
        'from(bucket:'
      );
      
      if (!optimizedQuery.includes('|> range(')) {
        const bucketMatch = optimizedQuery.match(/from\(bucket:\s*"([^"]+)"\)/);
        if (bucketMatch) {
          optimizedQuery = optimizedQuery.replace(
            bucketMatch[0],
            `${bucketMatch[0]}\n  |> range(start: -1h)`
          );
        }
      }
    }
    
    return optimizedQuery;
  }
}

export default InfluxDBQueryEngine;
