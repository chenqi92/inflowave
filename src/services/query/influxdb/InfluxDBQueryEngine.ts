/**
 * InfluxDB 查询引擎实现
 * 
 * 这个文件实现了 InfluxDB 特定的查询引擎，支持 InfluxQL 和 Flux 查询语言。
 */

import { QueryEngine } from '../base/QueryEngine';
import { InfluxQLValidator } from './InfluxQLValidator';
import { FluxValidator } from './FluxValidator';
import { InfluxQLFormatter } from './InfluxQLFormatter';
import { FluxFormatter } from './FluxFormatter';
import { InfluxDBSmartComplete } from './InfluxDBSmartComplete';

import {
  DatabaseType,
  QueryLanguage,
  DatabaseConnection,
  Query,
  QueryResult,
  ValidationResult,
  SmartSuggestion,
  QueryContext
} from '../../../types/database/base';
import logger from '@/utils/logger';

/**
 * InfluxDB 查询引擎实现
 */
export class InfluxDBQueryEngine extends QueryEngine {
  readonly databaseType: DatabaseType = 'influxdb';
  readonly supportedLanguages: QueryLanguage[] = ['influxql', 'flux'];
  readonly displayName = 'InfluxDB Query Engine';
  readonly description = 'Query engine for InfluxDB with support for InfluxQL and Flux languages';

  private influxqlValidator: InfluxQLValidator;
  private fluxValidator: FluxValidator;
  private influxqlFormatter: InfluxQLFormatter;
  private fluxFormatter: FluxFormatter;
  private smartComplete: InfluxDBSmartComplete;

  constructor() {
    super();
    this.influxqlValidator = new InfluxQLValidator();
    this.fluxValidator = new FluxValidator();
    this.influxqlFormatter = new InfluxQLFormatter();
    this.fluxFormatter = new FluxFormatter();
    this.smartComplete = new InfluxDBSmartComplete();
  }

  async validateQuery(query: string, language: QueryLanguage): Promise<ValidationResult> {
    if (!this.supportsLanguage(language)) {
      return {
        valid: false,
        errors: [this.createValidationError(
          `Unsupported query language: ${language}. Supported languages: ${this.supportedLanguages.join(', ')}`,
          0,
          0,
          'semantic'
        )],
        warnings: []
      };
    }

    try {
      switch (language) {
        case 'influxql':
          return await this.influxqlValidator.validate(query);
        case 'flux':
          return await this.fluxValidator.validate(query);
        default:
          return {
            valid: false,
            errors: [this.createValidationError(
              `Unsupported language: ${language}`,
              0,
              0,
              'semantic'
            )],
            warnings: []
          };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [this.createValidationError(
          `Validation error: ${error}`,
          0,
          0,
          'semantic'
        )],
        warnings: []
      };
    }
  }

  async formatQuery(query: string, language: QueryLanguage): Promise<string> {
    if (!this.supportsLanguage(language)) {
      return query; // 返回原查询如果不支持该语言
    }

    try {
      switch (language) {
        case 'influxql':
          return await this.influxqlFormatter.format(query);
        case 'flux':
          return await this.fluxFormatter.format(query);
        default:
          return query;
      }
    } catch (error) {
      logger.warn(`Failed to format ${language} query:`, error);
      return query; // 格式化失败时返回原查询
    }
  }

  async executeQuery(connection: DatabaseConnection, query: Query): Promise<QueryResult> {
    try {
      // 首先验证查询
      const validation = await this.validateQuery(query.sql, query.language);
      if (!validation.valid) {
        return {
          success: false,
          error: `Query validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // 预处理查询
      const processedQuery = this.preprocessQuery(query.sql, query.language);

      // 这里应该调用实际的数据库执行逻辑
      // 目前返回模拟结果
      return {
        success: true,
        data: [
          ['time', 'value'],
          ['2023-01-01T00:00:00Z', 100],
          ['2023-01-01T01:00:00Z', 150],
          ['2023-01-01T02:00:00Z', 200]
        ],
        columns: ['time', 'value'],
        rowCount: 3,
        executionTime: 25,
        metadata: {
          queryLanguage: query.language,
          processedQuery
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Query execution failed: ${error}`
      };
    }
  }

  async getSmartSuggestions(connection: DatabaseConnection, context: QueryContext): Promise<SmartSuggestion[]> {
    try {
      return await this.smartComplete.getSuggestions(connection, context);
    } catch (error) {
      logger.warn('Failed to get smart suggestions:', error);
      return [];
    }
  }

  /**
   * 获取 InfluxDB 特定的关键字
   */
  getInfluxQLKeywords(): string[] {
    return [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
      'SHOW', 'DATABASES', 'MEASUREMENTS', 'SERIES', 'FIELD KEYS', 'TAG KEYS', 'TAG VALUES',
      'CREATE', 'DATABASE', 'RETENTION POLICY', 'USER',
      'DROP', 'DELETE',
      'GRANT', 'REVOKE',
      'AND', 'OR', 'NOT',
      'LIKE', 'REGEXP', 'IN',
      'FILL', 'NULL', 'NONE', 'LINEAR', 'PREVIOUS',
      'TIME', 'NOW',
      'ASC', 'DESC'
    ];
  }

  /**
   * 获取 Flux 特定的关键字
   */
  getFluxKeywords(): string[] {
    return [
      'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
      'map', 'reduce', 'sort', 'limit', 'drop', 'keep', 'rename',
      'union', 'join', 'pivot', 'duplicate',
      'yield', 'to', 'toBucket',
      'and', 'or', 'not',
      'if', 'then', 'else',
      'import', 'option', 'builtin'
    ];
  }

  /**
   * 获取 InfluxDB 函数列表
   */
  getInfluxDBFunctions(): string[] {
    return [
      // 聚合函数
      'COUNT', 'DISTINCT', 'INTEGRAL', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SUM',
      // 选择函数
      'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP',
      // 转换函数
      'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS', 'CUMULATIVE_SUM', 'DERIVATIVE',
      'DIFFERENCE', 'ELAPSED', 'EXP', 'FLOOR', 'HISTOGRAM', 'LN', 'LOG', 'LOG2', 'LOG10',
      'MOVING_AVERAGE', 'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE', 'POW', 'ROUND',
      'SIN', 'SQRT', 'TAN',
      // 预测函数
      'HOLT_WINTERS'
    ];
  }

  /**
   * 根据查询语言获取相应的关键字
   */
  getKeywordsByLanguage(language: QueryLanguage): string[] {
    switch (language) {
      case 'influxql':
        return this.getInfluxQLKeywords();
      case 'flux':
        return this.getFluxKeywords();
      default:
        return [];
    }
  }

  /**
   * 根据查询语言获取相应的函数
   */
  getFunctionsByLanguage(language: QueryLanguage): string[] {
    switch (language) {
      case 'influxql':
        return this.getInfluxDBFunctions();
      case 'flux':
        return []; // Flux 函数列表可以在需要时添加
      default:
        return [];
    }
  }

  /**
   * 检查查询是否为只读查询
   */
  isReadOnlyQuery(query: string, language: QueryLanguage): boolean {
    const upperQuery = query.toUpperCase().trim();
    
    if (language === 'influxql') {
      return upperQuery.startsWith('SELECT') || 
             upperQuery.startsWith('SHOW') ||
             upperQuery.startsWith('EXPLAIN');
    } else if (language === 'flux') {
      // Flux 查询通常是只读的，除非使用 to() 函数
      return !upperQuery.includes('TO(');
    }
    
    return true; // 默认认为是只读的
  }

  /**
   * 估算查询复杂度
   */
  estimateQueryComplexity(query: string, language: QueryLanguage): 'low' | 'medium' | 'high' {
    const upperQuery = query.toUpperCase();
    let complexity = 0;

    // 基于查询长度
    complexity += Math.floor(query.length / 100);

    // 基于关键字数量
    const keywords = this.getKeywordsByLanguage(language);
    const keywordCount = keywords.filter(keyword => 
      upperQuery.includes(keyword)
    ).length;
    complexity += keywordCount;

    // 基于特定模式
    if (upperQuery.includes('GROUP BY')) complexity += 2;
    if (upperQuery.includes('ORDER BY')) complexity += 1;
    if (upperQuery.includes('JOIN')) complexity += 3;
    if (upperQuery.includes('SUBQUERY') || upperQuery.includes('(SELECT')) complexity += 3;

    if (complexity <= 3) return 'low';
    if (complexity <= 8) return 'medium';
    return 'high';
  }
}
