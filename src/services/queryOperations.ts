import { safeTauriInvoke } from '@/utils/tauri';
import { message } from '@/components/ui';
import type { QueryResult } from '@/types';

/**
 * 查询操作服务 - 处理右键菜单触发的各种查询操作
 */
export class QueryOperationsService {
  
  /**
   * 预览测量数据
   */
  static async previewData(params: {
    database: string;
    measurement: string;
    limit?: number;
    orderBy?: string;
    timeRange?: string;
  }): Promise<QueryResult> {
    let query = '';
    
    if (params.timeRange) {
      query = `SELECT * FROM "${params.measurement}" WHERE time >= now() - ${params.timeRange}`;
    } else {
      query = `SELECT * FROM "${params.measurement}"`;
      if (params.orderBy) {
        query += ` ORDER BY ${params.orderBy}`;
      }
      if (params.limit) {
        query += ` LIMIT ${params.limit}`;
      }
    }

    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current', // 当前活跃连接
          database: params.database,
          query
        }
      });
      
      message.success(`查询完成，返回 ${result.rowCount} 行数据`);
      return result;
    } catch (error) {
      message.error(`查询失败: ${error}`);
      throw error;
    }
  }

  /**
   * 显示测量的字段信息
   */
  static async showFields(params: {
    database: string;
    measurement: string;
  }): Promise<QueryResult> {
    const query = `SHOW FIELD KEYS FROM "${params.measurement}"`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取字段信息失败: ${error}`);
      throw error;
    }
  }

  /**
   * 显示测量的标签键
   */
  static async showTagKeys(params: {
    database: string;
    measurement: string;
  }): Promise<QueryResult> {
    const query = `SHOW TAG KEYS FROM "${params.measurement}"`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取标签键失败: ${error}`);
      throw error;
    }
  }

  /**
   * 显示标签值
   */
  static async showTagValues(params: {
    database: string;
    measurement: string;
    tagKey?: string;
  }): Promise<QueryResult> {
    let query = `SHOW TAG VALUES FROM "${params.measurement}"`;
    if (params.tagKey) {
      query += ` WITH KEY = "${params.tagKey}"`;
    }
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取标签值失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取记录总数
   */
  static async getRecordCount(params: {
    database: string;
    measurement: string;
  }): Promise<QueryResult> {
    const query = `SELECT COUNT(*) FROM "${params.measurement}"`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      const count = result.series[0]?.values[0]?.[1] || 0;
      message.info(`测量 "${params.measurement}" 共有 ${count} 条记录`);
      return result;
    } catch (error) {
      message.error(`获取记录数失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取时间范围
   */
  static async getTimeRange(params: {
    database: string;
    measurement: string;
  }): Promise<QueryResult> {
    const query = `SELECT MIN(time), MAX(time) FROM "${params.measurement}"`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取时间范围失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取字段基础统计信息
   */
  static async getFieldBasicStats(params: {
    database: string;
    measurement: string;
    field: string;
  }): Promise<QueryResult> {
    const query = `SELECT MIN("${params.field}"), MAX("${params.field}"), MEAN("${params.field}"), COUNT("${params.field}") FROM "${params.measurement}"`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取字段统计失败: ${error}`);
      throw error;
    }
  }

  /**
   * 获取字段分位数统计
   */
  static async getFieldPercentileStats(params: {
    database: string;
    measurement: string;
    field: string;
  }): Promise<QueryResult> {
    const query = `SELECT PERCENTILE("${params.field}", 50), PERCENTILE("${params.field}", 90), PERCENTILE("${params.field}", 95), PERCENTILE("${params.field}", 99) FROM "${params.measurement}"`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取分位数统计失败: ${error}`);
      throw error;
    }
  }

  /**
   * 按标签值查询
   */
  static async queryByTagValue(params: {
    database: string;
    measurement: string;
    tagKey: string;
    tagValue: string;
    limit?: number;
  }): Promise<QueryResult> {
    const query = `SELECT * FROM "${params.measurement}" WHERE "${params.tagKey}" = '${params.tagValue}' ORDER BY time DESC LIMIT ${params.limit || 100}`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`按标签查询失败: ${error}`);
      throw error;
    }
  }

  /**
   * 生成时序聚合查询
   */
  static async generateTimeAggregationQuery(params: {
    database: string;
    measurement: string;
    field: string;
    aggregation: 'MEAN' | 'SUM' | 'COUNT' | 'MIN' | 'MAX';
    interval: string;
    timeRange: string;
  }): Promise<string> {
    return `SELECT ${params.aggregation}("${params.field}") FROM "${params.measurement}" WHERE time >= now() - ${params.timeRange} GROUP BY time(${params.interval})`;
  }

  /**
   * 生成按标签分组查询
   */
  static async generateTagGroupQuery(params: {
    database: string;
    measurement: string;
    field: string;
    tagKey: string;
    aggregation: 'MEAN' | 'SUM' | 'COUNT' | 'MIN' | 'MAX';
    timeRange: string;
  }): Promise<string> {
    return `SELECT ${params.aggregation}("${params.field}") FROM "${params.measurement}" WHERE time >= now() - ${params.timeRange} GROUP BY "${params.tagKey}"`;
  }

  /**
   * 导出数据
   */
  static async exportData(params: {
    database: string;
    measurement: string;
    format: 'csv' | 'json' | 'excel';
    query?: string;
    limit?: number;
  }): Promise<void> {
    const query = params.query || `SELECT * FROM "${params.measurement}" LIMIT ${params.limit || 10000}`;
    
    try {
      // 首先执行查询获取数据
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });

      // 调用导出功能
      await safeTauriInvoke('export_query_result', {
        result,
        format: params.format,
        filename: `${params.measurement}_export_${Date.now()}.${params.format}`
      });

      message.success(`数据已导出为 ${params.format.toUpperCase()} 格式`);
    } catch (error) {
      message.error(`导出失败: ${error}`);
      throw error;
    }
  }

  /**
   * 删除测量
   */
  static async deleteMeasurement(params: {
    database: string;
    measurement: string;
  }): Promise<void> {
    const query = `DROP MEASUREMENT "${params.measurement}"`;
    
    try {
      await safeTauriInvoke('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });

      message.success(`测量 "${params.measurement}" 已删除`);
    } catch (error) {
      message.error(`删除测量失败: ${error}`);
      throw error;
    }
  }

  /**
   * 删除数据库
   */
  static async deleteDatabase(params: {
    database: string;
  }): Promise<void> {
    const query = `DROP DATABASE "${params.database}"`;
    
    try {
      await safeTauriInvoke('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });

      message.success(`数据库 "${params.database}" 已删除`);
    } catch (error) {
      message.error(`删除数据库失败: ${error}`);
      throw error;
    }
  }

  /**
   * 显示数据库信息
   */
  static async showDatabaseInfo(params: {
    database: string;
  }): Promise<any> {
    try {
      const info = await safeTauriInvoke('get_database_stats', {
        connectionId: 'current',
        database: params.database
      });

      return info;
    } catch (error) {
      message.error(`获取数据库信息失败: ${error}`);
      throw error;
    }
  }

  /**
   * 显示保留策略
   */
  static async showRetentionPolicies(params: {
    database: string;
  }): Promise<QueryResult> {
    const query = `SHOW RETENTION POLICIES ON "${params.database}"`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取保留策略失败: ${error}`);
      throw error;
    }
  }

  /**
   * 显示所有测量
   */
  static async showMeasurements(params: {
    database: string;
  }): Promise<QueryResult> {
    const query = `SHOW MEASUREMENTS`;
    
    try {
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: 'current',
          database: params.database,
          query
        }
      });
      
      return result;
    } catch (error) {
      message.error(`获取测量列表失败: ${error}`);
      throw error;
    }
  }
}

export default QueryOperationsService;
