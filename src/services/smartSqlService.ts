import { invoke } from '@tauri-apps/api/core';

export interface SqlGenerationRequest {
  sql_type: string;
  database?: string;
  measurement?: string;
  fields?: string[];
  tags?: string[];
  time_range?: {
    start: string;
    end: string;
  };
  limit?: number;
  group_by?: string[];
  order_by?: {
    field: string;
    direction: string;
  };
}

export interface SqlGenerationResult {
  sql: string;
  description: string;
}

export interface ContextMenuResponse {
  id: string;
  label: string;
  icon?: string;
  action?: {
    type: string;
    [key: string]: any;
  };
  children?: ContextMenuResponse[];
  type?: string;
  danger?: boolean;
}

export class SmartSqlService {
  private static instance: SmartSqlService;

  private constructor() {}

  static getInstance(): SmartSqlService {
    if (!SmartSqlService.instance) {
      SmartSqlService.instance = new SmartSqlService();
    }
    return SmartSqlService.instance;
  }

  /**
   * 生成智能 SQL 查询
   */
  async generateSmartSql(request: SqlGenerationRequest): Promise<SqlGenerationResult> {
    try {
      const result = await invoke<SqlGenerationResult>('generate_smart_sql', { request });
      return result;
    } catch (error) {
      console.error('Failed to generate smart SQL:', error);
      throw new Error(`SQL 生成失败: ${error}`);
    }
  }

  /**
   * 获取数据库上下文菜单
   */
  async getDatabaseContextMenu(
    connectionId: string,
    database: string
  ): Promise<ContextMenuResponse[]> {
    try {
      const result = await invoke<ContextMenuResponse[]>('get_database_context_menu', {
        connectionId,
        database,
      });
      return result;
    } catch (error) {
      console.error('Failed to get database context menu:', error);
      throw new Error(`获取数据库菜单失败: ${error}`);
    }
  }

  /**
   * 获取测量上下文菜单
   */
  async getMeasurementContextMenu(
    connectionId: string,
    database: string,
    measurement: string
  ): Promise<ContextMenuResponse[]> {
    try {
      const result = await invoke<ContextMenuResponse[]>('get_measurement_context_menu', {
        connectionId,
        database,
        measurement,
      });
      return result;
    } catch (error) {
      console.error('Failed to get measurement context menu:', error);
      throw new Error(`获取测量菜单失败: ${error}`);
    }
  }

  /**
   * 获取字段上下文菜单
   */
  async getFieldContextMenu(
    connectionId: string,
    database: string,
    measurement: string,
    field: string,
    fieldType: string
  ): Promise<ContextMenuResponse[]> {
    try {
      const result = await invoke<ContextMenuResponse[]>('get_field_context_menu', {
        connectionId,
        database,
        measurement,
        field,
        fieldType,
      });
      return result;
    } catch (error) {
      console.error('Failed to get field context menu:', error);
      throw new Error(`获取字段菜单失败: ${error}`);
    }
  }

  /**
   * 生成 SELECT 查询
   */
  async generateSelectQuery(
    database: string,
    measurement: string,
    fields?: string[],
    limit?: number
  ): Promise<SqlGenerationResult> {
    const request: SqlGenerationRequest = {
      sql_type: fields && fields.length > 0 ? 'select_fields' : 'select_all',
      database,
      measurement,
      fields,
      limit: limit || 100,
    };

    return this.generateSmartSql(request);
  }

  /**
   * 生成 COUNT 查询
   */
  async generateCountQuery(
    database: string,
    measurement: string
  ): Promise<SqlGenerationResult> {
    const request: SqlGenerationRequest = {
      sql_type: 'count_records',
      database,
      measurement,
    };

    return this.generateSmartSql(request);
  }

  /**
   * 生成时间序列查询
   */
  async generateTimeSeriesQuery(
    database: string,
    measurement: string,
    timeRange?: { start: string; end: string },
    limit?: number
  ): Promise<SqlGenerationResult> {
    const request: SqlGenerationRequest = {
      sql_type: 'time_series',
      database,
      measurement,
      time_range: timeRange || {
        start: 'now() - 1h',
        end: 'now()',
      },
      limit: limit || 100,
    };

    return this.generateSmartSql(request);
  }

  /**
   * 生成聚合查询
   */
  async generateAggregationQuery(
    database: string,
    measurement: string,
    fields: string[],
    groupBy?: string[]
  ): Promise<SqlGenerationResult> {
    const request: SqlGenerationRequest = {
      sql_type: 'aggregation',
      database,
      measurement,
      fields,
      group_by: groupBy,
    };

    return this.generateSmartSql(request);
  }

  /**
   * 生成 SHOW 查询
   */
  async generateShowQuery(
    database: string,
    showType: 'measurements' | 'tag_keys' | 'field_keys' | 'tag_values',
    measurement?: string,
    tagKey?: string
  ): Promise<SqlGenerationResult> {
    const request: SqlGenerationRequest = {
      sql_type: `show_${showType}`,
      database,
      measurement,
      tags: tagKey ? [tagKey] : undefined,
    };

    return this.generateSmartSql(request);
  }

  /**
   * 生成字段统计查询
   */
  async generateFieldStatsQuery(
    database: string,
    measurement: string,
    field: string,
    statType: 'sum' | 'mean' | 'max' | 'min' | 'count'
  ): Promise<SqlGenerationResult> {
    const functionName = statType.toUpperCase();
    const request: SqlGenerationRequest = {
      sql_type: 'aggregation',
      database,
      measurement,
      fields: [`${functionName}("${field}")`],
    };

    return this.generateSmartSql(request);
  }

  /**
   * 生成标签分组查询
   */
  async generateTagGroupQuery(
    database: string,
    measurement: string,
    tagKeys: string[],
    fields?: string[]
  ): Promise<SqlGenerationResult> {
    const request: SqlGenerationRequest = {
      sql_type: 'aggregation',
      database,
      measurement,
      fields: fields || ['COUNT(*)'],
      group_by: tagKeys,
    };

    return this.generateSmartSql(request);
  }

  /**
   * 生成描述测量结构的查询
   */
  async generateDescribeQuery(
    database: string,
    measurement: string
  ): Promise<SqlGenerationResult> {
    const request: SqlGenerationRequest = {
      sql_type: 'describe_measurement',
      database,
      measurement,
    };

    return this.generateSmartSql(request);
  }

  /**
   * 根据字段类型获取建议的查询操作
   */
  getFieldSuggestions(fieldType: string): string[] {
    switch (fieldType.toLowerCase()) {
      case 'integer':
      case 'float':
      case 'number':
        return ['sum', 'mean', 'max', 'min', 'count'];
      case 'string':
      case 'tag':
        return ['count', 'group_by'];
      case 'boolean':
        return ['count'];
      case 'timestamp':
        return ['max', 'min', 'range'];
      default:
        return ['count'];
    }
  }

  /**
   * 获取时间范围选项
   */
  getTimeRangeOptions(): Array<{ label: string; value: { start: string; end: string } }> {
    return [
      { label: '最近 1 小时', value: { start: 'now() - 1h', end: 'now()' } },
      { label: '最近 6 小时', value: { start: 'now() - 6h', end: 'now()' } },
      { label: '最近 1 天', value: { start: 'now() - 1d', end: 'now()' } },
      { label: '最近 7 天', value: { start: 'now() - 7d', end: 'now()' } },
      { label: '最近 30 天', value: { start: 'now() - 30d', end: 'now()' } },
      { label: '今天', value: { start: 'now() - 1d', end: 'now()' } },
      { label: '本周', value: { start: 'now() - 7d', end: 'now()' } },
      { label: '本月', value: { start: 'now() - 30d', end: 'now()' } },
    ];
  }

  /**
   * 验证查询参数
   */
  validateQueryParams(params: Partial<SqlGenerationRequest>): string | null {
    if (!params.sql_type) {
      return 'SQL 类型不能为空';
    }

    if (!params.database) {
      return '数据库名称不能为空';
    }

    if (params.sql_type !== 'show_measurements' && !params.measurement) {
      return '测量名称不能为空';
    }

    if (params.limit && (params.limit < 1 || params.limit > 10000)) {
      return '限制数量必须在 1-10000 之间';
    }

    return null;
  }

  /**
   * 格式化 SQL 查询
   */
  formatSql(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*=\s*/g, ' = ')
      .replace(/\s*>\s*/g, ' > ')
      .replace(/\s*<\s*/g, ' < ')
      .replace(/\s*>=\s*/g, ' >= ')
      .replace(/\s*<=\s*/g, ' <= ')
      .replace(/\s*!=\s*/g, ' != ')
      .replace(/\bSELECT\b/gi, 'SELECT')
      .replace(/\bFROM\b/gi, 'FROM')
      .replace(/\bWHERE\b/gi, 'WHERE')
      .replace(/\bGROUP BY\b/gi, 'GROUP BY')
      .replace(/\bORDER BY\b/gi, 'ORDER BY')
      .replace(/\bLIMIT\b/gi, 'LIMIT')
      .trim();
  }

  /**
   * 获取 SQL 查询的说明
   */
  getSqlDescription(sqlType: string, params: Partial<SqlGenerationRequest>): string {
    const descriptions: Record<string, string> = {
      select_all: `查询 ${params.measurement} 测量的所有数据`,
      select_fields: `查询 ${params.measurement} 测量的指定字段: ${params.fields?.join(', ')}`,
      count_records: `统计 ${params.measurement} 测量的记录总数`,
      show_measurements: `显示 ${params.database} 数据库中的所有测量`,
      show_tag_keys: `显示 ${params.measurement} 测量的标签键`,
      show_field_keys: `显示 ${params.measurement} 测量的字段键`,
      show_tag_values: `显示 ${params.measurement} 测量中标签的值`,
      describe_measurement: `描述 ${params.measurement} 测量的结构`,
      time_series: `查询 ${params.measurement} 测量的时间序列数据`,
      aggregation: `对 ${params.measurement} 测量进行聚合查询`,
    };

    return descriptions[sqlType] || '执行自定义查询';
  }
}

// 默认导出单例实例
export const smartSqlService = SmartSqlService.getInstance();