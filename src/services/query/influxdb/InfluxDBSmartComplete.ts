/**
 * InfluxDB 智能补全实现
 * 
 * 这个文件实现了 InfluxDB 特定的智能补全功能，支持 InfluxQL 和 Flux。
 */

import { SmartComplete, CompletionContext } from '../base/SmartComplete';
import { safeTauriInvoke } from '../../../utils/tauri';
import {
  QueryLanguage,
  DatabaseConnection,
  SmartSuggestion
} from '../../../types/database/base';
import logger from '@/utils/logger';

/**
 * InfluxDB 智能补全实现
 */
export class InfluxDBSmartComplete extends SmartComplete {
  readonly language: QueryLanguage = 'influxql'; // 主要语言，但支持多种
  readonly displayName = 'InfluxDB Smart Complete';

  async getSuggestions(connection: DatabaseConnection, context: CompletionContext): Promise<SmartSuggestion[]> {
    const completionContext = this.parseCompletionContext(context);
    
    // 如果在字符串或注释中，不提供建议
    if (completionContext.isInString || completionContext.isInComment) {
      return [];
    }

    const suggestions: SmartSuggestion[] = [];
    const currentWord = completionContext.currentWord || '';
    const language = context.language;

    // 根据查询语言提供不同的建议
    if (language === 'influxql') {
      const influxqlSuggestions = await this.getInfluxQLSuggestions(connection, completionContext);
      suggestions.push(...influxqlSuggestions);
    } else if (language === 'flux') {
      const fluxSuggestions = await this.getFluxSuggestions(connection, completionContext);
      suggestions.push(...fluxSuggestions);
    }

    // 过滤和排序建议
    return this.filterAndSortSuggestions(suggestions, currentWord);
  }

  getSupportedKeywords(): string[] {
    return [
      // InfluxQL 关键字
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
      'SHOW', 'DATABASES', 'MEASUREMENTS', 'SERIES', 'FIELD KEYS', 'TAG KEYS', 'TAG VALUES',
      'CREATE', 'DATABASE', 'RETENTION POLICY', 'USER',
      'DROP', 'DELETE', 'GRANT', 'REVOKE',
      'AND', 'OR', 'NOT', 'LIKE', 'REGEXP', 'IN',
      'FILL', 'NULL', 'NONE', 'LINEAR', 'PREVIOUS',
      'TIME', 'NOW', 'ASC', 'DESC',
      // Flux 关键字
      'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
      'map', 'reduce', 'sort', 'limit', 'drop', 'keep', 'rename',
      'union', 'join', 'pivot', 'duplicate', 'yield', 'to', 'toBucket',
      'and', 'or', 'not', 'if', 'then', 'else',
      'import', 'option', 'builtin'
    ];
  }

  getSupportedFunctions(): string[] {
    return [
      // InfluxQL 函数
      'COUNT', 'DISTINCT', 'INTEGRAL', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SUM',
      'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP',
      'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS', 'CUMULATIVE_SUM', 'DERIVATIVE',
      'DIFFERENCE', 'ELAPSED', 'EXP', 'FLOOR', 'HISTOGRAM', 'LN', 'LOG', 'LOG2', 'LOG10',
      'MOVING_AVERAGE', 'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE', 'POW', 'ROUND',
      'SIN', 'SQRT', 'TAN', 'HOLT_WINTERS',
      // Flux 函数
      'math.abs', 'math.ceil', 'math.floor', 'math.round', 'math.sqrt', 'math.pow',
      'strings.contains', 'strings.hasPrefix', 'strings.hasSuffix', 'strings.toLower', 'strings.toUpper',
      'time.now', 'time.truncate', 'date.hour', 'date.minute', 'date.second',
      'int', 'float', 'string', 'bool', 'time', 'duration'
    ];
  }

  /**
   * 获取 InfluxQL 建议
   */
  private async getInfluxQLSuggestions(connection: DatabaseConnection, context: CompletionContext): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const currentWord = context.currentWord || '';
    const previousWord = context.previousWord?.toUpperCase();

    // 根据上下文确定建议类型
    const suggestionTypes = this.determineSuggestionTypes(context);

    // 关键字建议
    if (suggestionTypes.includeKeywords) {
      const influxqlKeywords = this.getInfluxQLKeywords();
      suggestions.push(...this.createKeywordSuggestions(influxqlKeywords, currentWord));
    }

    // 函数建议
    if (suggestionTypes.includeFunctions) {
      const influxqlFunctions = this.getInfluxQLFunctions();
      suggestions.push(...this.createFunctionSuggestions(influxqlFunctions, currentWord));
    }

    // 表/测量建议
    if (suggestionTypes.includeTables) {
      try {
        const measurements = await this.getMeasurements(connection, context.database);
        suggestions.push(...this.createTableSuggestions(measurements, currentWord));
      } catch (error) {
        logger.warn('Failed to get measurements:', error);
      }
    }

    // 字段建议
    if (suggestionTypes.includeColumns) {
      try {
        const fields = await this.getFields(connection, context);
        suggestions.push(...this.createColumnSuggestions(fields, currentWord));
      } catch (error) {
        logger.warn('Failed to get fields:', error);
      }
    }

    // 特定上下文建议
    if (previousWord === 'FROM') {
      suggestions.push(...await this.getMeasurementSuggestions(connection, context.database, currentWord));
    } else if (previousWord === 'WHERE' || previousWord === 'AND' || previousWord === 'OR') {
      suggestions.push(...await this.getFieldAndTagSuggestions(connection, context, currentWord));
    }

    return suggestions;
  }

  /**
   * 获取 Flux 建议
   */
  private async getFluxSuggestions(connection: DatabaseConnection, context: CompletionContext): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const currentWord = context.currentWord || '';
    const lineText = context.lineText || '';

    // Flux 关键字和函数
    const fluxKeywords = this.getFluxKeywords();
    const fluxFunctions = this.getFluxFunctions();

    suggestions.push(...this.createKeywordSuggestions(fluxKeywords, currentWord));
    suggestions.push(...this.createFunctionSuggestions(fluxFunctions, currentWord));

    // 管道操作建议
    if (lineText.includes('|>') || lineText.trim().endsWith('|>')) {
      suggestions.push(...this.getFluxPipelineSuggestions(currentWord));
    }

    // bucket 建议
    if (lineText.includes('from(bucket:') || lineText.includes('to(bucket:')) {
      try {
        const databases = await this.getDatabases(connection);
        suggestions.push(...this.createValueSuggestions(databases, currentWord));
      } catch (error) {
        logger.warn('Failed to get databases:', error);
      }
    }

    return suggestions;
  }

  /**
   * 获取 InfluxQL 关键字
   * 注意: 'time' 是字段名,不是关键字,应该保持小写
   * 注意: InfluxDB 1.x 只支持 'ORDER BY time',不支持 DESC
   */
  private getInfluxQLKeywords(): string[] {
    return [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
      'SHOW', 'DATABASES', 'MEASUREMENTS', 'SERIES', 'FIELD KEYS', 'TAG KEYS', 'TAG VALUES',
      'CREATE', 'DATABASE', 'RETENTION POLICY', 'USER',
      'DROP', 'DELETE', 'GRANT', 'REVOKE',
      'AND', 'OR', 'NOT', 'LIKE', 'REGEXP', 'IN',
      'FILL', 'NULL', 'NONE', 'LINEAR', 'PREVIOUS',
      'NOW'
    ];
  }

  /**
   * 获取 Flux 关键字
   */
  private getFluxKeywords(): string[] {
    return [
      'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
      'map', 'reduce', 'sort', 'limit', 'drop', 'keep', 'rename',
      'union', 'join', 'pivot', 'duplicate', 'yield', 'to', 'toBucket',
      'and', 'or', 'not', 'if', 'then', 'else',
      'import', 'option', 'builtin'
    ];
  }

  /**
   * 获取 InfluxQL 函数
   */
  private getInfluxQLFunctions(): string[] {
    return [
      'COUNT', 'DISTINCT', 'INTEGRAL', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SUM',
      'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP',
      'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS', 'CUMULATIVE_SUM', 'DERIVATIVE',
      'DIFFERENCE', 'ELAPSED', 'EXP', 'FLOOR', 'HISTOGRAM', 'LN', 'LOG', 'LOG2', 'LOG10',
      'MOVING_AVERAGE', 'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE', 'POW', 'ROUND',
      'SIN', 'SQRT', 'TAN', 'HOLT_WINTERS'
    ];
  }

  /**
   * 获取 Flux 函数
   */
  private getFluxFunctions(): string[] {
    return [
      'math.abs', 'math.ceil', 'math.floor', 'math.round', 'math.sqrt', 'math.pow',
      'strings.contains', 'strings.hasPrefix', 'strings.hasSuffix', 'strings.toLower', 'strings.toUpper',
      'time.now', 'time.truncate', 'date.hour', 'date.minute', 'date.second',
      'int', 'float', 'string', 'bool', 'time', 'duration'
    ];
  }

  /**
   * 获取 Flux 管道建议
   */
  private getFluxPipelineSuggestions(prefix: string): SmartSuggestion[] {
    const pipelineFunctions = [
      'filter', 'group', 'aggregateWindow', 'map', 'reduce', 'sort', 'limit',
      'drop', 'keep', 'rename', 'pivot', 'duplicate', 'yield', 'to'
    ];
    
    return this.createFunctionSuggestions(pipelineFunctions, prefix);
  }

  /**
   * 获取测量建议
   */
  private async getMeasurementSuggestions(connection: DatabaseConnection, database?: string, prefix: string = ''): Promise<SmartSuggestion[]> {
    try {
      const measurements = await this.getMeasurements(connection, database);
      return this.createTableSuggestions(measurements, prefix);
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取字段和标签建议
   */
  private async getFieldAndTagSuggestions(connection: DatabaseConnection, context: CompletionContext, prefix: string = ''): Promise<SmartSuggestion[]> {
    try {
      const fields = await this.getFields(connection, context);
      const tags = await this.getTags(connection, context);
      
      return [
        ...this.createColumnSuggestions(fields, prefix),
        ...this.createColumnSuggestions(tags, prefix)
      ];
    } catch (error) {
      return [];
    }
  }

  /**
   * 过滤和排序建议
   */
  private filterAndSortSuggestions(suggestions: SmartSuggestion[], prefix: string): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    const filtered = suggestions.filter(suggestion => 
      suggestion.text.toLowerCase().startsWith(lowerPrefix)
    );
    
    return this.mergeSuggestions(filtered);
  }

  // 模拟数据获取方法（实际实现中应该调用后端）
  private async getMeasurements(connection: DatabaseConnection, database?: string): Promise<string[]> {
    // 实现实际的测量获取逻辑
    try {
      const measurements = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId: connection.id,
        database: database || (connection.config as any).database
      });
      return measurements;
    } catch (error) {
      logger.warn('获取测量失败，使用默认值:', error);
      return ['cpu', 'memory', 'disk', 'network'];
    }
  }

  private async getDatabases(connection: DatabaseConnection): Promise<string[]> {
    // 实现实际的数据库获取逻辑
    try {
      const databases = await safeTauriInvoke<{name: string}[]>('get_databases', {
        connectionId: connection.id
      });
      return databases.map(db => db.name);
    } catch (error) {
      logger.warn('获取数据库失败，使用默认值:', error);
      return ['mydb', 'telegraf', '_internal'];
    }
  }

  private async getFields(connection: DatabaseConnection, context: CompletionContext): Promise<string[]> {
    // 实现实际的字段获取逻辑
    try {
      const fields = await safeTauriInvoke<{name: string}[]>('get_field_keys', {
        connectionId: connection.id,
        database: context.database || (connection.config as any).database,
        measurement: (context as any).measurement
      });
      return fields.map(field => field.name);
    } catch (error) {
      logger.warn('获取字段失败，使用默认值:', error);
      return ['time', 'value', 'usage_idle', 'usage_system', 'usage_user'];
    }
  }

  private async getTags(connection: DatabaseConnection, context: CompletionContext): Promise<string[]> {
    // 实现实际的标签获取逻辑
    try {
      const tags = await safeTauriInvoke<{name: string}[]>('get_tag_keys', {
        connectionId: connection.id,
        database: context.database || (connection.config as any).database,
        measurement: (context as any).measurement
      });
      return tags.map(tag => tag.name);
    } catch (error) {
      logger.warn('获取标签失败，使用默认值:', error);
      return ['host', 'cpu', 'region', 'datacenter'];
    }
  }
}
