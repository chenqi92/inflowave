/**
 * 查询引擎基础抽象类
 * 
 * 定义了所有查询引擎必须实现的基础接口和方法。
 */

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
 * 查询引擎抽象基类
 */
export abstract class QueryEngine {
  abstract readonly databaseType: DatabaseType;
  abstract readonly supportedLanguages: QueryLanguage[];
  abstract readonly displayName: string;
  abstract readonly description: string;

  /**
   * 验证查询语法
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 验证结果
   */
  abstract validateQuery(query: string, language: QueryLanguage): Promise<ValidationResult>;

  /**
   * 格式化查询语句
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 格式化后的查询字符串
   */
  abstract formatQuery(query: string, language: QueryLanguage): Promise<string>;

  /**
   * 执行查询
   * @param connection 数据库连接
   * @param query 查询对象
   * @returns 查询结果
   */
  abstract executeQuery(connection: DatabaseConnection, query: Query): Promise<QueryResult>;

  /**
   * 获取智能建议
   * @param connection 数据库连接
   * @param context 查询上下文
   * @returns 智能建议列表
   */
  abstract getSmartSuggestions(connection: DatabaseConnection, context: QueryContext): Promise<SmartSuggestion[]>;

  /**
   * 检查是否支持指定的查询语言
   * @param language 查询语言
   * @returns 是否支持
   */
  public supportsLanguage(language: QueryLanguage): boolean {
    return this.supportedLanguages.includes(language);
  }

  /**
   * 获取默认查询语言
   * @returns 默认查询语言
   */
  public getDefaultLanguage(): QueryLanguage {
    return this.supportedLanguages[0];
  }

  /**
   * 预处理查询字符串
   * @param query 原始查询字符串
   * @param language 查询语言
   * @returns 预处理后的查询字符串
   */
  protected preprocessQuery(query: string, language: QueryLanguage): string {
    // 移除多余的空白字符
    let processed = query.trim();
    
    // 移除注释（基础实现，子类可以重写）
    processed = this.removeComments(processed, language);
    
    return processed;
  }

  /**
   * 移除查询中的注释
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 移除注释后的查询字符串
   */
  protected removeComments(query: string, language: QueryLanguage): string {
    // 基础实现：移除 SQL 风格的单行注释
    const lines = query.split('\n');
    const filteredLines = lines.map(line => {
      const commentIndex = line.indexOf('--');
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex).trim();
      }
      return line;
    }).filter(line => line.length > 0);
    
    return filteredLines.join('\n');
  }

  /**
   * 解析查询语句，提取关键信息
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 解析结果
   */
  protected parseQuery(query: string, language: QueryLanguage): {
    type: 'select' | 'insert' | 'update' | 'delete' | 'show' | 'describe' | 'create' | 'drop' | 'unknown';
    tables?: string[];
    fields?: string[];
    conditions?: string[];
    keywords?: string[];
  } {
    const processed = this.preprocessQuery(query, language);
    const upperQuery = processed.toUpperCase();
    
    // 基础查询类型检测
    let type: any = 'unknown';
    if (upperQuery.startsWith('SELECT')) {
      type = 'select';
    } else if (upperQuery.startsWith('INSERT')) {
      type = 'insert';
    } else if (upperQuery.startsWith('UPDATE')) {
      type = 'update';
    } else if (upperQuery.startsWith('DELETE')) {
      type = 'delete';
    } else if (upperQuery.startsWith('SHOW')) {
      type = 'show';
    } else if (upperQuery.startsWith('DESCRIBE') || upperQuery.startsWith('DESC')) {
      type = 'describe';
    } else if (upperQuery.startsWith('CREATE')) {
      type = 'create';
    } else if (upperQuery.startsWith('DROP')) {
      type = 'drop';
    }

    return {
      type,
      tables: this.extractTables(processed, language),
      fields: this.extractFields(processed, language),
      conditions: this.extractConditions(processed, language),
      keywords: this.extractKeywords(processed, language)
    };
  }

  /**
   * 提取查询中的表名
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 表名列表
   */
  protected extractTables(query: string, language: QueryLanguage): string[] {
    // 基础实现，子类可以重写
    return [];
  }

  /**
   * 提取查询中的字段名
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 字段名列表
   */
  protected extractFields(query: string, language: QueryLanguage): string[] {
    // 基础实现，子类可以重写
    return [];
  }

  /**
   * 提取查询中的条件
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 条件列表
   */
  protected extractConditions(query: string, language: QueryLanguage): string[] {
    // 基础实现，子类可以重写
    return [];
  }

  /**
   * 提取查询中的关键字
   * @param query 查询字符串
   * @param language 查询语言
   * @returns 关键字列表
   */
  protected extractKeywords(query: string, language: QueryLanguage): string[] {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
      'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
      'SHOW', 'DESCRIBE', 'EXPLAIN'
    ];
    
    const upperQuery = query.toUpperCase();
    return keywords.filter(keyword => upperQuery.includes(keyword));
  }

  /**
   * 生成错误信息
   * @param message 错误消息
   * @param line 行号
   * @param column 列号
   * @param errorType 错误类型
   * @returns 验证错误对象
   */
  protected createValidationError(
    message: string, 
    line: number = 0, 
    column: number = 0, 
    errorType: 'syntax' | 'semantic' | 'reference' | 'type' = 'syntax'
  ) {
    return {
      line,
      column,
      message,
      errorType,
      severity: 'error' as const
    };
  }

  /**
   * 生成警告信息
   * @param message 警告消息
   * @param line 行号
   * @param column 列号
   * @param errorType 错误类型
   * @returns 验证警告对象
   */
  protected createValidationWarning(
    message: string, 
    line: number = 0, 
    column: number = 0, 
    errorType: 'syntax' | 'semantic' | 'reference' | 'type' = 'semantic'
  ) {
    return {
      line,
      column,
      message,
      errorType,
      severity: 'warning' as const
    };
  }
}
