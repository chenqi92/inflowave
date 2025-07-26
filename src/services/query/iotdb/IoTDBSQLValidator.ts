/**
 * IoTDB SQL 查询验证器
 * 
 * 这个文件实现了 IoTDB SQL 语法的验证逻辑。
 */

import { QueryValidator } from '../base/QueryValidator';
import { QueryLanguage, ValidationResult, ValidationError } from '../../../types/database/base';

/**
 * IoTDB SQL 验证器实现
 */
export class IoTDBSQLValidator extends QueryValidator {
  readonly language: QueryLanguage = 'sql';
  readonly displayName = 'IoTDB SQL Validator';

  async validate(query: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 基础语法检查
    const basicErrors = this.basicSyntaxCheck(query);
    errors.push(...basicErrors);

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // IoTDB SQL 特定验证
    const iotdbErrors = this.validateIoTDBSyntax(query);
    errors.push(...iotdbErrors);

    // 路径验证
    const pathErrors = this.validateTimeseriesPaths(query);
    errors.push(...pathErrors);

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

  getSupportedFunctions(): string[] {
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
   * 验证 IoTDB SQL 特定语法
   */
  private validateIoTDBSyntax(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const upperQuery = query.toUpperCase();
    const lines = query.split('\n');

    // 检查查询类型
    if (!this.isValidQueryType(upperQuery)) {
      errors.push(this.createError(
        'Invalid query type. IoTDB queries must start with SELECT, SHOW, CREATE, DROP, DELETE, INSERT, SET, GRANT, or REVOKE',
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

    // 检查对齐方式
    const alignErrors = this.validateAlignmentClause(query, lines);
    errors.push(...alignErrors);

    return errors;
  }

  /**
   * 检查是否为有效的查询类型
   */
  private isValidQueryType(upperQuery: string): boolean {
    const validStarts = ['SELECT', 'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'SET', 'GRANT', 'REVOKE'];
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

    // 检查 ALIGN BY 子句的使用
    if (upperQuery.includes('ALIGN BY DEVICE') && upperQuery.includes('ALIGN BY TIME')) {
      errors.push(this.createError(
        'Cannot use both ALIGN BY DEVICE and ALIGN BY TIME in the same query',
        1,
        1,
        'semantic'
      ));
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
      'SHOW STORAGE GROUP',
      'SHOW DEVICES',
      'SHOW TIMESERIES',
      'SHOW CHILD PATHS',
      'SHOW CHILD NODES',
      'SHOW FUNCTIONS',
      'SHOW TRIGGERS',
      'SHOW CONTINUOUS QUERIES',
      'SHOW SCHEMA TEMPLATES',
      'SHOW USERS',
      'SHOW ROLES'
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
   * 验证时间序列路径
   */
  private validateTimeseriesPaths(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 检查路径格式
    const pathRegex = /root\.[a-zA-Z0-9_.*]+/g;
    let match;
    
    while ((match = pathRegex.exec(query)) !== null) {
      const path = match[0];
      
      // 检查路径是否符合 IoTDB 规范
      if (!this.isValidTimeseriesPath(path)) {
        const lineNumber = query.substring(0, match.index).split('\n').length;
        errors.push(this.createError(
          `Invalid timeseries path: ${path}. Paths must start with 'root.' and contain valid identifiers`,
          lineNumber,
          match.index,
          'syntax'
        ));
      }
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
          `Invalid time format: ${timeStr}. Use ISO8601 format (e.g., '2023-01-01T00:00:00.000+08:00')`,
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
   * 验证对齐子句
   */
  private validateAlignmentClause(query: string, lines: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const upperQuery = query.toUpperCase();

    // 检查 ALIGN BY DEVICE 的使用限制
    if (upperQuery.includes('ALIGN BY DEVICE')) {
      if (upperQuery.includes('GROUP BY TIME')) {
        errors.push(this.createError(
          'ALIGN BY DEVICE cannot be used with GROUP BY TIME',
          1,
          1,
          'semantic'
        ));
      }
      
      if (upperQuery.includes('FILL')) {
        errors.push(this.createError(
          'ALIGN BY DEVICE cannot be used with FILL clause',
          1,
          1,
          'semantic'
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
        'Using SELECT * may impact performance. Consider selecting specific timeseries',
        1,
        1,
        'semantic'
      ));
    }

    // 检查通配符使用
    if (query.includes('root.**')) {
      warnings.push(this.createWarning(
        'Using root.** may return large amounts of data and impact performance',
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

    // 检查设备对齐查询的性能
    if (upperQuery.includes('ALIGN BY DEVICE') && !upperQuery.includes('LIMIT')) {
      warnings.push(this.createWarning(
        'ALIGN BY DEVICE queries can be slow without LIMIT clause',
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

    if (upperQuery.includes('SELECT') && !upperQuery.includes('ALIGN BY')) {
      suggestions.push('Consider using ALIGN BY TIME or ALIGN BY DEVICE for better data organization');
    }

    return suggestions;
  }

  /**
   * 检查时间序列路径是否有效
   */
  private isValidTimeseriesPath(path: string): boolean {
    // 简单的路径验证
    if (!path.startsWith('root.')) {
      return false;
    }
    
    // 检查路径段是否有效
    const segments = path.split('.');
    for (const segment of segments) {
      if (segment !== '*' && segment !== '**' && !/^[a-zA-Z0-9_]+$/.test(segment)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 检查时间格式是否有效
   */
  private isValidTimeFormat(timeStr: string): boolean {
    // 简单的 ISO8601 格式检查
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
    return iso8601Regex.test(timeStr);
  }

  /**
   * 检查是否为内置函数
   */
  private isBuiltinFunction(functionName: string): boolean {
    const builtinFunctions = ['CAST', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
    return builtinFunctions.includes(functionName);
  }
}
