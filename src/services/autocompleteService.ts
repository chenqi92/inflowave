/**
 * 智能自动补全服务
 * 提供基于数据库模式的智能SQL自动提示
 */

import { safeTauriInvoke } from '@/utils/tauri';
import type { Field, Tag, MeasurementInfo } from '@/types';
import logger from '@/utils/logger';

// 自动补全项类型
export interface AutocompleteItem {
  label: string;
  insertText: string;
  kind:
    | 'keyword'
    | 'function'
    | 'database'
    | 'measurement'
    | 'field'
    | 'tag'
    | 'snippet'
    | 'operator';
  detail?: string;
  documentation?: string;
  insertTextRules?: number;
  sortText?: string;
  filterText?: string;
}

// 自动补全上下文
export interface AutocompleteContext {
  line: string;
  position: number;
  previousToken?: string;
  currentToken?: string;
  queryType?: 'SELECT' | 'SHOW' | 'INSERT' | 'CREATE' | 'DROP' | 'ALTER';
  inClause?: 'FROM' | 'WHERE' | 'GROUP BY' | 'ORDER BY' | 'LIMIT';
}

// 数据库结构缓存
interface DatabaseSchema {
  databases: string[];
  measurements: Map<string, MeasurementInfo[]>;
  fields: Map<string, Field[]>;
  tags: Map<string, Tag[]>;
}

class AutocompleteService {
  private schemaCache: DatabaseSchema = {
    databases: [],
    measurements: new Map(),
    fields: new Map(),
    tags: new Map(),
  };

  // InfluxDB 1.x 只支持 'ORDER BY time',不支持 ASC/DESC
  private influxQLKeywords = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'SHOW',
    'DESCRIBE',
    'INSERT',
    'INTO',
    'VALUES',
    'CREATE',
    'DROP',
    'ALTER',
    'AND',
    'OR',
    'NOT',
    'IN',
    'LIKE',
    'BETWEEN',
    'IS',
    'NULL',
    'TRUE',
    'FALSE',
    'AS',
    'DISTINCT',
    'ON',
    'FILL',
    'SLIMIT',
    'SOFFSET',
  ];

  private influxQLFunctions = [
    'COUNT',
    'SUM',
    'MEAN',
    'MEDIAN',
    'MODE',
    'SPREAD',
    'STDDEV',
    'MIN',
    'MAX',
    'FIRST',
    'LAST',
    'DISTINCT',
    'INTEGRAL',
    'MOVING_AVERAGE',
    'CUMULATIVE_SUM',
    'DERIVATIVE',
    'DIFFERENCE',
    'NON_NEGATIVE_DERIVATIVE',
    'NON_NEGATIVE_DIFFERENCE',
    'ELAPSED',
    'FLOOR',
    'CEIL',
    'ROUND',
    'ABS',
    'SIN',
    'COS',
    'TAN',
    'ASIN',
    'ACOS',
    'ATAN',
    'EXP',
    'LN',
    'LOG',
    'LOG2',
    'LOG10',
    'SQRT',
    'POW',
  ];

  private timeKeywords = [
    'NOW',
    'TIME',
    'AGO',
    'DURATION',
    'FILL',
    'GROUP BY TIME',
    'time',
    'ns',
    'us',
    'µs',
    'ms',
    's',
    'm',
    'h',
    'd',
    'w',
  ];

  private operators = [
    '=',
    '!=',
    '<>',
    '<',
    '<=',
    '>',
    '>=',
    '~',
    '!~',
    'AND',
    'OR',
    'NOT',
  ];

  /**
   * 更新数据库结构缓存
   */
  async updateSchema(connectionId: string, database?: string): Promise<void> {
    try {
      // 获取数据库列表
      const databases = await safeTauriInvoke<string[]>('get_databases', {
        connectionId,
      });
      this.schemaCache.databases = databases;

      // 如果指定了数据库，获取其详细信息
      if (database) {
        await this.updateDatabaseSchema(connectionId, database);
      }
    } catch (error) {
      logger.error('Failed to update schema:', error);
    }
  }

  /**
   * 更新指定数据库的结构
   */
  private async updateDatabaseSchema(
    connectionId: string,
    database: string
  ): Promise<void> {
    try {
      // 获取 measurements
      const measurements = await safeTauriInvoke<MeasurementInfo[]>(
        'get_measurements',
        {
          connectionId,
          database,
        }
      );
      this.schemaCache.measurements.set(database, measurements);

      // 获取每个 measurement 的字段和标签
      for (const measurement of measurements) {
        const key = `${database}.${measurement.name}`;

        // 获取字段
        try {
          const fields = await safeTauriInvoke<Field[]>('get_field_keys', {
            connectionId,
            database,
            measurement: measurement.name,
          });
          this.schemaCache.fields.set(key, fields);
        } catch (error) {
          logger.warn(`Failed to get fields for ${measurement.name}:`, error);
        }

        // 获取标签
        try {
          const tags = await safeTauriInvoke<Tag[]>('get_tag_keys', {
            connectionId,
            database,
            measurement: measurement.name,
          });
          this.schemaCache.tags.set(key, tags);
        } catch (error) {
          logger.warn(`Failed to get tags for ${measurement.name}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to update database schema:', error);
    }
  }

  /**
   * 获取自动补全建议
   */
  async getCompletions(
    connectionId: string,
    database: string,
    context: AutocompleteContext
  ): Promise<AutocompleteItem[]> {
    const suggestions: AutocompleteItem[] = [];

    // 确保有最新的数据库结构
    if (!this.schemaCache.measurements.has(database)) {
      await this.updateDatabaseSchema(connectionId, database);
    }

    // 分析上下文
    const parsedContext = this.parseContext(context);

    // 根据上下文提供不同的建议
    if (parsedContext.expectingKeyword) {
      suggestions.push(...this.getKeywordSuggestions(parsedContext));
    }

    if (parsedContext.expectingFunction) {
      suggestions.push(...this.getFunctionSuggestions());
    }

    if (parsedContext.expectingMeasurement) {
      suggestions.push(...this.getMeasurementSuggestions(database));
    }

    if (parsedContext.expectingField) {
      suggestions.push(
        ...this.getFieldSuggestions(database, parsedContext.measurement)
      );
    }

    if (parsedContext.expectingTag) {
      suggestions.push(
        ...this.getTagSuggestions(database, parsedContext.measurement)
      );
    }

    if (parsedContext.expectingDatabase) {
      suggestions.push(...this.getDatabaseSuggestions());
    }

    if (parsedContext.expectingOperator) {
      suggestions.push(...this.getOperatorSuggestions());
    }

    if (parsedContext.expectingTimeValue) {
      suggestions.push(...this.getTimeSuggestions());
    }

    // 添加智能模板
    if (parsedContext.canInsertTemplate) {
      suggestions.push(...this.getTemplateSuggestions(database));
    }

    return suggestions.sort((a, b) =>
      (a.sortText || a.label).localeCompare(b.sortText || b.label)
    );
  }

  /**
   * 解析上下文
   */
  private parseContext(context: AutocompleteContext): any {
    const line = context.line.toLowerCase();
    const position = context.position;
    const beforeCursor = line.substring(0, position);
    const afterCursor = line.substring(position);

    // 检测查询类型
    let queryType = 'SELECT';
    if (line.includes('show ')) queryType = 'SHOW';
    else if (line.includes('insert ')) queryType = 'INSERT';
    else if (line.includes('create ')) queryType = 'CREATE';
    else if (line.includes('drop ')) queryType = 'DROP';

    // 检测当前所在的子句
    let inClause = null;
    if (beforeCursor.includes('from ') && !beforeCursor.includes('where ')) {
      inClause = 'FROM';
    } else if (beforeCursor.includes('where ')) {
      inClause = 'WHERE';
    } else if (beforeCursor.includes('group by ')) {
      inClause = 'GROUP BY';
    } else if (beforeCursor.includes('order by ')) {
      inClause = 'ORDER BY';
    }

    // 获取当前测量名
    const measurement = this.extractMeasurementName(beforeCursor);

    return {
      queryType,
      inClause,
      measurement,
      beforeCursor,
      afterCursor,
      expectingKeyword: this.isExpectingKeyword(beforeCursor),
      expectingFunction: this.isExpectingFunction(beforeCursor),
      expectingMeasurement: this.isExpectingMeasurement(beforeCursor),
      expectingField: this.isExpectingField(beforeCursor),
      expectingTag: this.isExpectingTag(beforeCursor),
      expectingDatabase: this.isExpectingDatabase(beforeCursor),
      expectingOperator: this.isExpectingOperator(beforeCursor),
      expectingTimeValue: this.isExpectingTimeValue(beforeCursor),
      canInsertTemplate: this.canInsertTemplate(beforeCursor),
    };
  }

  /**
   * 检测是否期望关键字
   */
  private isExpectingKeyword(beforeCursor: string): boolean {
    const trimmed = beforeCursor.trim();
    return (
      !trimmed ||
      trimmed.endsWith(' ') ||
      trimmed.endsWith('(') ||
      /\b(and|or|not)\s*$/i.test(trimmed)
    );
  }

  /**
   * 检测是否期望函数
   */
  private isExpectingFunction(beforeCursor: string): boolean {
    return (
      /\bselect\s+[^from]*$/i.test(beforeCursor) || /,\s*$/i.test(beforeCursor)
    );
  }

  /**
   * 检测是否期望测量名
   */
  private isExpectingMeasurement(beforeCursor: string): boolean {
    return /\bfrom\s+$/i.test(beforeCursor) || /\binto\s+$/i.test(beforeCursor);
  }

  /**
   * 检测是否期望字段名
   */
  private isExpectingField(beforeCursor: string): boolean {
    return (
      /\bselect\s+[^from]*$/i.test(beforeCursor) ||
      /,\s*$/i.test(beforeCursor) ||
      /\bwhere\s+[^=<>!~]*$/i.test(beforeCursor) ||
      /\bgroup\s+by\s+[^order]*$/i.test(beforeCursor) ||
      /\border\s+by\s+[^limit]*$/i.test(beforeCursor)
    );
  }

  /**
   * 检测是否期望标签名
   */
  private isExpectingTag(beforeCursor: string): boolean {
    return this.isExpectingField(beforeCursor); // 标签和字段在很多上下文中是相同的
  }

  /**
   * 检测是否期望数据库名
   */
  private isExpectingDatabase(beforeCursor: string): boolean {
    return (
      /\buse\s+$/i.test(beforeCursor) ||
      /\bshow\s+measurements\s+on\s+$/i.test(beforeCursor)
    );
  }

  /**
   * 检测是否期望操作符
   */
  private isExpectingOperator(beforeCursor: string): boolean {
    return (
      /\bwhere\s+\w+\s*$/i.test(beforeCursor) ||
      /\band\s+\w+\s*$/i.test(beforeCursor) ||
      /\bor\s+\w+\s*$/i.test(beforeCursor)
    );
  }

  /**
   * 检测是否期望时间值
   */
  private isExpectingTimeValue(beforeCursor: string): boolean {
    return (
      /\btime\s*[=<>!~]\s*$/i.test(beforeCursor) ||
      /\bnow\(\)\s*[-+]\s*$/i.test(beforeCursor)
    );
  }

  /**
   * 检测是否可以插入模板
   */
  private canInsertTemplate(beforeCursor: string): boolean {
    return !beforeCursor.trim() || /^\s*$/.test(beforeCursor);
  }

  /**
   * 提取测量名
   */
  private extractMeasurementName(beforeCursor: string): string | null {
    const match = beforeCursor.match(/\bfrom\s+(["\w]+)/i);
    return match ? match[1].replace(/"/g, '') : null;
  }

  /**
   * 获取关键字建议
   */
  private getKeywordSuggestions(context: any): AutocompleteItem[] {
    return this.influxQLKeywords.map(keyword => ({
      label: keyword,
      insertText: keyword,
      kind: 'keyword',
      detail: 'InfluxQL关键字',
      documentation: `InfluxQL关键字: ${keyword}`,
      sortText: `0_${keyword}`,
    }));
  }

  /**
   * 获取函数建议
   */
  private getFunctionSuggestions(): AutocompleteItem[] {
    return this.influxQLFunctions.map(func => ({
      label: func,
      insertText: `${func}($1)`,
      kind: 'function',
      detail: '聚合函数',
      documentation: `聚合函数: ${func}()`,
      insertTextRules: 4, // InsertAsSnippet
      sortText: `1_${func}`,
    }));
  }

  /**
   * 获取测量建议
   */
  private getMeasurementSuggestions(database: string): AutocompleteItem[] {
    const measurements = this.schemaCache.measurements.get(database) || [];
    return measurements.map(measurement => ({
      label: measurement.name,
      insertText: `"${measurement.name}"`,
      kind: 'measurement',
      detail: '测量',
      documentation: `测量: ${measurement.name}`,
      sortText: `2_${measurement.name}`,
    }));
  }

  /**
   * 获取字段建议
   */
  private getFieldSuggestions(
    database: string,
    measurement?: string | null
  ): AutocompleteItem[] {
    if (!measurement) return [];

    const key = `${database}.${measurement}`;
    const fields = this.schemaCache.fields.get(key) || [];

    return fields.map(field => ({
      label: field.name,
      insertText: `"${field.name}"`,
      kind: 'field',
      detail: `字段 (${field.type})`,
      documentation: `字段: ${field.name} (类型: ${field.type})`,
      sortText: `3_${field.name}`,
    }));
  }

  /**
   * 获取标签建议
   */
  private getTagSuggestions(
    database: string,
    measurement?: string | null
  ): AutocompleteItem[] {
    if (!measurement) return [];

    const key = `${database}.${measurement}`;
    const tags = this.schemaCache.tags.get(key) || [];

    return tags.map(tag => ({
      label: tag.name,
      insertText: `"${tag.name}"`,
      kind: 'tag',
      detail: '标签',
      documentation: `标签: ${tag.name}`,
      sortText: `3_${tag.name}`,
    }));
  }

  /**
   * 获取数据库建议
   */
  private getDatabaseSuggestions(): AutocompleteItem[] {
    return this.schemaCache.databases.map(db => ({
      label: db,
      insertText: `"${db}"`,
      kind: 'database',
      detail: '数据库',
      documentation: `数据库: ${db}`,
      sortText: `4_${db}`,
    }));
  }

  /**
   * 获取操作符建议
   */
  private getOperatorSuggestions(): AutocompleteItem[] {
    return this.operators.map(op => ({
      label: op,
      insertText: op,
      kind: 'operator',
      detail: '操作符',
      documentation: `操作符: ${op}`,
      sortText: `5_${op}`,
    }));
  }

  /**
   * 获取时间建议
   */
  private getTimeSuggestions(): AutocompleteItem[] {
    const timeValues = [
      'now()',
      'now() - 1h',
      'now() - 6h',
      'now() - 1d',
      'now() - 1w',
      'now() - 1m',
      ...this.timeKeywords,
    ];

    return timeValues.map(time => ({
      label: time,
      insertText: time,
      kind: 'keyword',
      detail: '时间值',
      documentation: `时间值: ${time}`,
      sortText: `6_${time}`,
    }));
  }

  /**
   * 获取模板建议
   */
  private getTemplateSuggestions(database: string): AutocompleteItem[] {
    const measurements = this.schemaCache.measurements.get(database) || [];
    const templates: AutocompleteItem[] = [
      {
        label: 'SELECT basic query',
        insertText: 'SELECT ${1:*} FROM ${2:measurement} WHERE ${3:condition}',
        kind: 'snippet',
        detail: '基本查询模板',
        documentation: '基本的SELECT查询模板',
        insertTextRules: 4,
        sortText: '0_template_basic',
      },
      {
        label: 'SELECT time range',
        insertText:
          'SELECT ${1:*} FROM ${2:measurement} WHERE time >= ${3:now() - 1h} AND time <= ${4:now()}',
        kind: 'snippet',
        detail: '时间范围查询模板',
        documentation: '带时间范围的SELECT查询模板',
        insertTextRules: 4,
        sortText: '0_template_time',
      },
      {
        label: 'SELECT aggregation',
        insertText:
          'SELECT ${1:MEAN}(${2:field}) FROM ${3:measurement} WHERE time >= ${4:now() - 1h} GROUP BY time(${5:5m})${6:, tag}',
        kind: 'snippet',
        detail: '聚合查询模板',
        documentation: '聚合查询模板',
        insertTextRules: 4,
        sortText: '0_template_agg',
      },
      {
        label: 'SHOW MEASUREMENTS',
        insertText: 'SHOW MEASUREMENTS',
        kind: 'snippet',
        detail: '显示所有测量',
        documentation: '显示数据库中的所有测量',
        sortText: '0_template_show_measurements',
      },
    ];

    // 为每个测量添加特定的模板
    measurements.forEach(measurement => {
      templates.push({
        label: `SELECT from ${measurement.name}`,
        insertText: `SELECT * FROM "${measurement.name}" WHERE time >= now() - 1h LIMIT 10`,
        kind: 'snippet',
        detail: `查询 ${measurement.name}`,
        documentation: `查询测量 ${measurement.name} 的数据`,
        sortText: `0_template_${measurement.name}`,
      });
    });

    return templates;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.schemaCache = {
      databases: [],
      measurements: new Map(),
      fields: new Map(),
      tags: new Map(),
    };
  }
}

// 单例实例
export const autocompleteService = new AutocompleteService();
export default autocompleteService;
