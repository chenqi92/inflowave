/**
 * IoTDB 查询引擎实现
 * 
 * 这个文件实现了 IoTDB 特定的查询引擎，支持 IoTDB SQL 查询语言。
 */

import { QueryEngine } from '../base/QueryEngine';
import { IoTDBSQLValidator } from './IoTDBSQLValidator';
import { IoTDBSQLFormatter } from './IoTDBSQLFormatter';
import { IoTDBSmartComplete } from './IoTDBSmartComplete';

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

/**
 * IoTDB 查询引擎实现
 */
export class IoTDBQueryEngine extends QueryEngine {
  readonly databaseType: DatabaseType = 'iotdb';
  readonly supportedLanguages: QueryLanguage[] = ['sql', 'iotdb-sql'];
  readonly displayName = 'IoTDB Query Engine';
  readonly description = 'Query engine for Apache IoTDB with support for IoTDB SQL';

  private sqlValidator: IoTDBSQLValidator;
  private sqlFormatter: IoTDBSQLFormatter;
  private smartComplete: IoTDBSmartComplete;

  constructor() {
    super();
    this.sqlValidator = new IoTDBSQLValidator();
    this.sqlFormatter = new IoTDBSQLFormatter();
    this.smartComplete = new IoTDBSmartComplete();
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
      return await this.sqlValidator.validate(query);
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
      return await this.sqlFormatter.format(query);
    } catch (error) {
      console.warn(`Failed to format ${language} query:`, error);
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
          ['Time', 'root.sg1.d1.s1', 'root.sg1.d1.s2'],
          ['2023-01-01T00:00:00.000+08:00', 25.5, 'online'],
          ['2023-01-01T01:00:00.000+08:00', 26.2, 'online'],
          ['2023-01-01T02:00:00.000+08:00', 24.8, 'offline']
        ],
        columns: ['Time', 'root.sg1.d1.s1', 'root.sg1.d1.s2'],
        rowCount: 3,
        executionTime: 15,
        metadata: {
          queryLanguage: query.language,
          processedQuery,
          storageGroup: 'root.sg1'
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
      console.warn('Failed to get smart suggestions:', error);
      return [];
    }
  }

  /**
   * 获取 IoTDB SQL 关键字
   */
  getIoTDBKeywords(): string[] {
    return [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
      'SHOW', 'STORAGE GROUP', 'DEVICES', 'TIMESERIES', 'CHILD PATHS', 'CHILD NODES',
      'CREATE', 'STORAGE GROUP', 'TIMESERIES', 'ALIGNED TIMESERIES',
      'DROP', 'DELETE', 'INSERT', 'UPDATE',
      'SET', 'TTL', 'UNSET',
      'GRANT', 'REVOKE', 'CREATE USER', 'DROP USER', 'ALTER USER',
      'AND', 'OR', 'NOT',
      'LIKE', 'REGEXP', 'IN', 'IS NULL', 'IS NOT NULL',
      'FILL', 'NULL', 'PREVIOUS', 'LINEAR',
      'TIME', 'NOW',
      'ASC', 'DESC',
      'ALIGN BY TIME', 'ALIGN BY DEVICE',
      'DISABLE ALIGN', 'WITHOUT NULL'
    ];
  }

  /**
   * 获取 IoTDB 函数列表
   */
  getIoTDBFunctions(): string[] {
    return [
      // 聚合函数
      'COUNT', 'SUM', 'AVG', 'EXTREME', 'MAX_VALUE', 'MIN_VALUE',
      'FIRST_VALUE', 'LAST_VALUE', 'MAX_TIME', 'MIN_TIME',
      // 数学函数
      'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'SINH', 'COSH', 'TANH',
      'DEGREES', 'RADIANS', 'ABS', 'SIGN', 'CEIL', 'FLOOR', 'ROUND', 'EXP', 'LN', 'LOG10',
      'SQRT', 'POW',
      // 字符串函数
      'LENGTH', 'LOCATE', 'STARTSWITH', 'ENDSWITH', 'CONCAT', 'SUBSTRING',
      'UPPER', 'LOWER', 'TRIM', 'STRCMP', 'STRREPLACE',
      // 时间函数
      'DATE_BIN', 'DATE_BIN_GAPFILL',
      // 选择函数
      'TOP_K', 'BOTTOM_K',
      // 变化趋势计算函数
      'TIME_DIFFERENCE', 'DIFFERENCE', 'NON_NEGATIVE_DIFFERENCE',
      'DERIVATIVE', 'NON_NEGATIVE_DERIVATIVE',
      // 常序列生成函数
      'CONST', 'PI', 'E',
      // 区间查询函数
      'ZERO_DURATION', 'NON_ZERO_DURATION', 'ZERO_COUNT', 'NON_ZERO_COUNT'
    ];
  }

  /**
   * 检查查询是否为只读查询
   */
  isReadOnlyQuery(query: string, language: QueryLanguage): boolean {
    const upperQuery = query.toUpperCase().trim();
    
    return upperQuery.startsWith('SELECT') || 
           upperQuery.startsWith('SHOW') ||
           upperQuery.startsWith('DESCRIBE') ||
           upperQuery.startsWith('EXPLAIN');
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
    const keywords = this.getIoTDBKeywords();
    const keywordCount = keywords.filter(keyword => 
      upperQuery.includes(keyword)
    ).length;
    complexity += keywordCount;

    // 基于特定模式
    if (upperQuery.includes('GROUP BY')) complexity += 2;
    if (upperQuery.includes('ORDER BY')) complexity += 1;
    if (upperQuery.includes('ALIGN BY DEVICE')) complexity += 2;
    if (upperQuery.includes('FILL')) complexity += 1;
    if (upperQuery.includes('WHERE') && upperQuery.includes('AND')) complexity += 1;

    // IoTDB 特定复杂度
    if (upperQuery.includes('root.**')) complexity += 2; // 通配符查询
    if (upperQuery.includes('LAST_VALUE') || upperQuery.includes('FIRST_VALUE')) complexity += 1;

    if (complexity <= 3) return 'low';
    if (complexity <= 8) return 'medium';
    return 'high';
  }

  /**
   * 检查是否为设备对齐查询
   */
  isDeviceAlignedQuery(query: string): boolean {
    return query.toUpperCase().includes('ALIGN BY DEVICE');
  }

  /**
   * 检查是否为时间对齐查询
   */
  isTimeAlignedQuery(query: string): boolean {
    return query.toUpperCase().includes('ALIGN BY TIME') || 
           (!query.toUpperCase().includes('ALIGN BY DEVICE') && !query.toUpperCase().includes('DISABLE ALIGN'));
  }

  /**
   * 提取存储组路径
   */
  extractStorageGroups(query: string): string[] {
    const storageGroups: string[] = [];
    const upperQuery = query.toUpperCase();
    
    // 简单的存储组提取逻辑
    const fromMatch = upperQuery.match(/FROM\s+(root\.[^\s,]+)/g);
    if (fromMatch) {
      fromMatch.forEach(match => {
        const sgMatch = match.match(/root\.[^\s,]+/);
        if (sgMatch) {
          const path = sgMatch[0];
          const sgPath = path.split('.').slice(0, 3).join('.'); // 假设存储组深度为2
          if (!storageGroups.includes(sgPath)) {
            storageGroups.push(sgPath);
          }
        }
      });
    }
    
    return storageGroups;
  }

  /**
   * 检查查询是否使用了通配符
   */
  hasWildcardQuery(query: string): boolean {
    return query.includes('*') || query.includes('**');
  }

  /**
   * 获取查询涉及的时间序列路径
   */
  extractTimeseriesPaths(query: string): string[] {
    const paths: string[] = [];
    
    // 简单的路径提取逻辑
    const pathRegex = /root\.[a-zA-Z0-9_.*]+/g;
    const matches = query.match(pathRegex);
    
    if (matches) {
      matches.forEach(match => {
        if (!paths.includes(match)) {
          paths.push(match);
        }
      });
    }
    
    return paths;
  }
}
