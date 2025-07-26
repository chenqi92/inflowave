/**
 * InfluxQL 查询验证器
 * 
 * 这个文件实现了 InfluxQL 语法的验证逻辑。
 */

import { QueryValidator } from '../base/QueryValidator';
import { QueryLanguage, ValidationResult, ValidationError } from '../../../types/database/base';

/**
 * InfluxQL 验证器实现
 */
export class InfluxQLValidator extends QueryValidator {
  readonly language: QueryLanguage = 'influxql';
  readonly displayName = 'InfluxQL Validator';

  async validate(query: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 基础语法检查
    const basicErrors = this.basicSyntaxCheck(query);
    errors.push(...basicErrors);

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // InfluxQL 特定验证
    const influxqlErrors = this.validateInfluxQLSyntax(query);
    errors.push(...influxqlErrors);

    // 语义检查
    const semanticWarnings = this.validateSemantics(query);
    warnings.push(...semanticWarnings);

    // 性能建议
    const performanceWarnings = this.checkPerformance(query);
    warnings.push(...performanceWarnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateSuggestions(query, errors, warnings)
    };
  }

  getSupportedKeywords(): string[] {
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

  getSupportedFunctions(): string[] {
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
   * 验证 InfluxQL 特定语法
   */
  private validateInfluxQLSyntax(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const upperQuery = query.toUpperCase();
    const lines = query.split('\n');

    // 检查查询类型
    if (!this.isValidQueryType(upperQuery)) {
      errors.push(this.createError(
        'Invalid query type. InfluxQL queries must start with SELECT, SHOW, CREATE, DROP, DELETE, GRANT, or REVOKE',
        1,
        1,
        'syntax'
      ));
    }

    // 检查 SELECT 语句结构
    if (upperQuery.startsWith('SELECT')) {
      const selectErrors = this.validateSelectStatement(query, lines);
      errors.push(...selectErrors);
    }

    // 检查 SHOW 语句结构
    if (upperQuery.startsWith('SHOW')) {
      const showErrors = this.validateShowStatement(query, lines);
      errors.push(...showErrors);
    }

    // 检查时间格式
    const timeErrors = this.validateTimeFormats(query, lines);
    errors.push(...timeErrors);

    // 检查函数使用
    const functionErrors = this.validateFunctionUsage(query, lines);
    errors.push(...functionErrors);

    return errors;
  }

  /**
   * 检查是否为有效的查询类型
   */
  private isValidQueryType(upperQuery: string): boolean {
    const validStarts = ['SELECT', 'SHOW', 'CREATE', 'DROP', 'DELETE', 'GRANT', 'REVOKE'];
    return validStarts.some(start => upperQuery.startsWith(start));
  }

  /**
   * 验证 SELECT 语句
   */
  private validateSelectStatement(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const upperQuery = query.toUpperCase();

    // 检查是否有 FROM 子句
    if (!upperQuery.includes(' FROM ')) {
      errors.push(this.createError(
        'SELECT statement must include a FROM clause',
        1,
        1,
        'syntax'
      ));
    }

    // 检查 GROUP BY 和聚合函数的配合
    if (upperQuery.includes('GROUP BY')) {
      const hasAggregateFunction = this.getSupportedFunctions().some(func => 
        upperQuery.includes(func + '(')
      );
      
      if (!hasAggregateFunction) {
        errors.push(this.createError(
          'GROUP BY clause requires at least one aggregate function',
          1,
          1,
          'semantic'
        ));
      }
    }

    return errors;
  }

  /**
   * 验证 SHOW 语句
   */
  private validateShowStatement(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const upperQuery = query.toUpperCase();

    const validShowCommands = [
      'SHOW DATABASES',
      'SHOW MEASUREMENTS',
      'SHOW SERIES',
      'SHOW FIELD KEYS',
      'SHOW TAG KEYS',
      'SHOW TAG VALUES',
      'SHOW RETENTION POLICIES',
      'SHOW USERS',
      'SHOW GRANTS'
    ];

    const isValidShow = validShowCommands.some(cmd => upperQuery.includes(cmd));
    
    if (!isValidShow) {
      errors.push(this.createError(
        `Invalid SHOW command. Valid commands: ${validShowCommands.join(', ')}`,
        1,
        1,
        'syntax'
      ));
    }

    return errors;
  }

  /**
   * 验证时间格式
   */
  private validateTimeFormats(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 检查时间字面量格式
    const timeRegex = /'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)'/g;
    let match;
    
    while ((match = timeRegex.exec(query)) !== null) {
      const timeStr = match[1];
      if (!this.isValidTimeFormat(timeStr)) {
        const lineNumber = query.substring(0, match.index).split('\n').length;
        errors.push(this.createError(
          `Invalid time format: ${timeStr}. Use RFC3339 format (e.g., '2023-01-01T00:00:00Z')`,
          lineNumber,
          match.index,
          'syntax'
        ));
      }
    }

    return errors;
  }

  /**
   * 验证函数使用
   */
  private validateFunctionUsage(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const supportedFunctions = this.getSupportedFunctions();
    
    // 查找函数调用
    const functionRegex = /(\w+)\s*\(/g;
    let match;
    
    while ((match = functionRegex.exec(query)) !== null) {
      const functionName = match[1].toUpperCase();
      
      if (!supportedFunctions.includes(functionName) && !this.isBuiltinFunction(functionName)) {
        const lineNumber = query.substring(0, match.index).split('\n').length;
        errors.push(this.createError(
          `Unknown function: ${functionName}`,
          lineNumber,
          match.index,
          'reference'
        ));
      }
    }

    return errors;
  }

  /**
   * 语义验证
   */
  private validateSemantics(query: string): ValidationError[] {
    const warnings: ValidationError[] = [];
    const upperQuery = query.toUpperCase();

    // 检查可能的性能问题
    if (upperQuery.includes('SELECT *')) {
      warnings.push(this.createWarning(
        'Using SELECT * may impact performance. Consider selecting specific fields',
        1,
        1,
        'semantic'
      ));
    }

    // 检查时间范围
    if (!upperQuery.includes('WHERE') && upperQuery.startsWith('SELECT')) {
      warnings.push(this.createWarning(
        'Query without WHERE clause may return large amounts of data',
        1,
        1,
        'semantic'
      ));
    }

    return warnings;
  }

  /**
   * 性能检查
   */
  private checkPerformance(query: string): ValidationError[] {
    const warnings: ValidationError[] = [];
    const upperQuery = query.toUpperCase();

    // 检查是否缺少时间过滤
    if (upperQuery.startsWith('SELECT') && !upperQuery.includes('TIME >') && !upperQuery.includes('TIME <')) {
      warnings.push(this.createWarning(
        'Consider adding time range filters to improve query performance',
        1,
        1,
        'semantic'
      ));
    }

    // 检查 LIMIT 子句
    if (upperQuery.startsWith('SELECT') && !upperQuery.includes('LIMIT')) {
      warnings.push(this.createWarning(
        'Consider adding LIMIT clause to prevent returning too many results',
        1,
        1,
        'semantic'
      ));
    }

    return warnings;
  }

  /**
   * 生成建议
   */
  private generateSuggestions(query: string, errors: ValidationError[], warnings: ValidationError[]): string[] {
    const suggestions: string[] = [];

    if (errors.length > 0) {
      suggestions.push('Fix syntax errors before executing the query');
    }

    if (warnings.length > 0) {
      suggestions.push('Consider addressing performance warnings for better query execution');
    }

    const upperQuery = query.toUpperCase();
    if (upperQuery.startsWith('SELECT') && !upperQuery.includes('ORDER BY')) {
      suggestions.push('Add ORDER BY time DESC for chronological data ordering');
    }

    return suggestions;
  }

  /**
   * 检查时间格式是否有效
   */
  private isValidTimeFormat(timeStr: string): boolean {
    // 简单的 RFC3339 格式检查
    const rfc3339Regex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
    return rfc3339Regex.test(timeStr);
  }

  /**
   * 检查是否为内置函数
   */
  private isBuiltinFunction(functionName: string): boolean {
    const builtinFunctions = ['IF', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
    return builtinFunctions.includes(functionName);
  }
}
