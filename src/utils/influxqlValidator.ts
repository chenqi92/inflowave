/**
 * InfluxQL 语法验证器
 * 提供实时语法检查和错误提示
 */

export interface ValidationError {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  quickFix?: {
    title: string;
    newText: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: ValidationError[];
}

class InfluxQLValidator {
  private readonly KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET',
    'SHOW', 'CREATE', 'DROP', 'ALTER', 'INSERT', 'DELETE', 'UPDATE',
    'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
    'TIME', 'NOW', 'AGO', 'FILL', 'SLIMIT', 'SOFFSET', 'AS',
    'DATABASE', 'DATABASES', 'MEASUREMENT', 'MEASUREMENTS', 'SERIES',
    'FIELD', 'FIELDS', 'TAG', 'TAGS', 'KEY', 'KEYS', 'VALUES',
    'RETENTION', 'POLICY', 'POLICIES', 'CONTINUOUS', 'QUERY', 'QUERIES',
    'USER', 'USERS', 'PRIVILEGE', 'PRIVILEGES', 'GRANT', 'REVOKE',
    'ON', 'TO', 'WITH', 'PASSWORD', 'ADMIN', 'ALL', 'READ', 'WRITE',
    'INTO', 'DURATION', 'REPLICATION', 'DEFAULT'
  ]);

  private readonly FUNCTIONS = new Set([
    'COUNT', 'SUM', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV',
    'MIN', 'MAX', 'FIRST', 'LAST', 'DISTINCT', 'INTEGRAL',
    'PERCENTILE', 'SAMPLE', 'TOP', 'BOTTOM',
    'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS',
    'CUMULATIVE_SUM', 'DERIVATIVE', 'DIFFERENCE', 'ELAPSED',
    'EXP', 'FLOOR', 'HISTOGRAM', 'LN', 'LOG', 'LOG2', 'LOG10',
    'MOVING_AVERAGE', 'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE',
    'POW', 'ROUND', 'SIN', 'SQRT', 'TAN', 'HOLT_WINTERS'
  ]);

  private readonly OPERATORS = new Set([
    '=', '!=', '<>', '<', '<=', '>', '>=', '=~', '!~', '+', '-', '*', '/', '%'
  ]);

  /**
   * 验证 InfluxQL 查询
   */
  validate(query: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: ValidationError[] = [];

    if (!query.trim()) {
      return { isValid: true, errors, warnings, suggestions };
    }

    try {
      // 基础语法检查
      this.validateBasicSyntax(query, errors, warnings);
      
      // 语义检查
      this.validateSemantics(query, errors, warnings, suggestions);
      
      // 性能检查
      this.validatePerformance(query, warnings, suggestions);
      
      // 安全检查
      this.validateSecurity(query, warnings);

    } catch (error) {
      errors.push({
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: query.length,
        message: '语法解析失败',
        severity: 'error',
        code: 'PARSE_ERROR'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * 基础语法验证
   */
  private validateBasicSyntax(
    query: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const lines = query.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // 检查括号匹配
      this.checkBracketMatching(line, lineIndex, errors);
      
      // 检查引号匹配
      this.checkQuoteMatching(line, lineIndex, errors);
      
      // 检查关键词拼写
      this.checkKeywordSpelling(line, lineIndex, warnings);
      
      // 检查函数调用
      this.checkFunctionCalls(line, lineIndex, errors, warnings);
      
      // 检查操作符使用
      this.checkOperatorUsage(line, lineIndex, warnings);
    });

    // 检查整体结构
    this.checkQueryStructure(query, errors);
  }

  /**
   * 检查括号匹配
   */
  private checkBracketMatching(line: string, lineIndex: number, errors: ValidationError[]): void {
    const stack: { char: string; pos: number }[] = [];
    const pairs = { '(': ')', '[': ']', '{': '}' };
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char in pairs) {
        stack.push({ char, pos: i });
      } else if (Object.values(pairs).includes(char)) {
        if (stack.length === 0) {
          errors.push({
            line: lineIndex + 1,
            column: i + 1,
            endLine: lineIndex + 1,
            endColumn: i + 2,
            message: `意外的 '${char}'`,
            severity: 'error',
            code: 'UNMATCHED_BRACKET'
          });
        } else {
          const last = stack.pop()!;
          if (pairs[last.char as keyof typeof pairs] !== char) {
            errors.push({
              line: lineIndex + 1,
              column: i + 1,
              endLine: lineIndex + 1,
              endColumn: i + 2,
              message: `括号不匹配，期望 '${pairs[last.char as keyof typeof pairs]}' 但找到 '${char}'`,
              severity: 'error',
              code: 'MISMATCHED_BRACKET'
            });
          }
        }
      }
    }
    
    // 检查未闭合的括号
    stack.forEach(item => {
      errors.push({
        line: lineIndex + 1,
        column: item.pos + 1,
        endLine: lineIndex + 1,
        endColumn: item.pos + 2,
        message: `未闭合的 '${item.char}'`,
        severity: 'error',
        code: 'UNCLOSED_BRACKET'
      });
    });
  }

  /**
   * 检查引号匹配
   */
  private checkQuoteMatching(line: string, lineIndex: number, errors: ValidationError[]): void {
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let lastQuotePos = -1;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : '';
      
      if (char === '"' && prevChar !== '\\') {
        if (inSingleQuote) continue;
        if (inDoubleQuote) {
          inDoubleQuote = false;
        } else {
          inDoubleQuote = true;
          lastQuotePos = i;
        }
      } else if (char === "'" && prevChar !== '\\') {
        if (inDoubleQuote) continue;
        if (inSingleQuote) {
          inSingleQuote = false;
        } else {
          inSingleQuote = true;
          lastQuotePos = i;
        }
      }
    }
    
    if (inSingleQuote || inDoubleQuote) {
      errors.push({
        line: lineIndex + 1,
        column: lastQuotePos + 1,
        endLine: lineIndex + 1,
        endColumn: line.length + 1,
        message: '未闭合的引号',
        severity: 'error',
        code: 'UNCLOSED_QUOTE'
      });
    }
  }

  /**
   * 检查关键词拼写
   */
  private checkKeywordSpelling(
    line: string,
    lineIndex: number,
    warnings: ValidationError[]
  ): void {
    const words = line.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
    
    words.forEach(word => {
      const upperWord = word.toUpperCase();
      const wordIndex = line.indexOf(word);
      
      // 检查是否是拼写错误的关键词
      if (this.isLikelyKeyword(word) && !this.KEYWORDS.has(upperWord) && !this.FUNCTIONS.has(upperWord)) {
        const suggestion = this.findClosestKeyword(upperWord);
        if (suggestion) {
          warnings.push({
            line: lineIndex + 1,
            column: wordIndex + 1,
            endLine: lineIndex + 1,
            endColumn: wordIndex + word.length + 1,
            message: `可能的拼写错误，您是否想输入 '${suggestion}'？`,
            severity: 'warning',
            code: 'POSSIBLE_TYPO',
            quickFix: {
              title: `替换为 '${suggestion}'`,
              newText: suggestion
            }
          });
        }
      }
    });
  }

  /**
   * 检查函数调用
   */
  private checkFunctionCalls(
    line: string,
    lineIndex: number,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const functionPattern = /([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    let match;
    
    while ((match = functionPattern.exec(line)) !== null) {
      const funcName = match[1].toUpperCase();
      const startPos = match.index;
      
      if (!this.FUNCTIONS.has(funcName) && !this.KEYWORDS.has(funcName)) {
        // 检查是否是未知函数
        const suggestion = this.findClosestFunction(funcName);
        if (suggestion) {
          warnings.push({
            line: lineIndex + 1,
            column: startPos + 1,
            endLine: lineIndex + 1,
            endColumn: startPos + match[1].length + 1,
            message: `未知函数 '${match[1]}'，您是否想使用 '${suggestion}'？`,
            severity: 'warning',
            code: 'UNKNOWN_FUNCTION',
            quickFix: {
              title: `替换为 '${suggestion}'`,
              newText: suggestion
            }
          });
        } else {
          errors.push({
            line: lineIndex + 1,
            column: startPos + 1,
            endLine: lineIndex + 1,
            endColumn: startPos + match[1].length + 1,
            message: `未知函数 '${match[1]}'`,
            severity: 'error',
            code: 'UNKNOWN_FUNCTION'
          });
        }
      }
    }
  }

  /**
   * 检查操作符使用
   */
  private checkOperatorUsage(
    line: string,
    lineIndex: number,
    warnings: ValidationError[]
  ): void {
    // 检查连续操作符
    const consecutiveOps = /([=!<>~]+){2,}/g;
    let match;
    
    while ((match = consecutiveOps.exec(line)) !== null) {
      const validOps = ['=', '!=', '<>', '<=', '>=', '=~', '!~'];
      if (!validOps.includes(match[0])) {
        warnings.push({
          line: lineIndex + 1,
          column: match.index + 1,
          endLine: lineIndex + 1,
          endColumn: match.index + match[0].length + 1,
          message: `可能的操作符错误: '${match[0]}'`,
          severity: 'warning',
          code: 'INVALID_OPERATOR'
        });
      }
    }
  }

  /**
   * 检查查询结构
   */
  private checkQueryStructure(query: string, errors: ValidationError[]): void {
    const upperQuery = query.toUpperCase().trim();
    
    // 检查 SELECT 查询结构
    if (upperQuery.startsWith('SELECT')) {
      if (!upperQuery.includes('FROM')) {
        errors.push({
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: query.length,
          message: 'SELECT 查询必须包含 FROM 子句',
          severity: 'error',
          code: 'MISSING_FROM_CLAUSE'
        });
      }
    }
    
    // 检查 GROUP BY 中的时间函数
    const groupByMatch = upperQuery.match(/GROUP\s+BY\s+(.+?)(?:ORDER|LIMIT|$)/);
    if (groupByMatch) {
      const groupByClause = groupByMatch[1];
      if (groupByClause.includes('TIME(') && !upperQuery.includes('WHERE')) {
        errors.push({
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: query.length,
          message: '使用 GROUP BY time() 时建议添加 WHERE 子句限制时间范围',
          severity: 'warning',
          code: 'MISSING_TIME_FILTER'
        });
      }
    }
  }

  /**
   * 语义验证
   */
  private validateSemantics(
    query: string,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    const upperQuery = query.toUpperCase();
    
    // 检查时间字段使用
    if (upperQuery.includes('TIME') && !upperQuery.includes('WHERE')) {
      suggestions.push({
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: query.length,
        message: '建议添加时间范围条件以提高查询性能',
        severity: 'info',
        code: 'SUGGEST_TIME_FILTER',
        quickFix: {
          title: '添加时间条件',
          newText: query + ' WHERE time > now() - 1h'
        }
      });
    }
    
    // 检查 LIMIT 使用
    if (upperQuery.startsWith('SELECT') && !upperQuery.includes('LIMIT') && !upperQuery.includes('GROUP BY')) {
      suggestions.push({
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: query.length,
        message: '建议添加 LIMIT 子句以限制返回结果数量',
        severity: 'info',
        code: 'SUGGEST_LIMIT',
        quickFix: {
          title: '添加 LIMIT 100',
          newText: query + ' LIMIT 100'
        }
      });
    }
  }

  /**
   * 性能验证
   */
  private validatePerformance(
    query: string,
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ): void {
    const upperQuery = query.toUpperCase();
    
    // 检查全表扫描
    if (upperQuery.includes('SELECT *') && !upperQuery.includes('WHERE')) {
      warnings.push({
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: query.length,
        message: '全表扫描可能导致性能问题，建议添加过滤条件',
        severity: 'warning',
        code: 'FULL_TABLE_SCAN'
      });
    }
    
    // 检查正则表达式使用
    if (upperQuery.includes('=~') || upperQuery.includes('!~')) {
      suggestions.push({
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: query.length,
        message: '正则表达式查询可能较慢，如可能请使用精确匹配',
        severity: 'info',
        code: 'REGEX_PERFORMANCE'
      });
    }
    
    // 检查大时间范围
    const timeRangePattern = /time\s*>\s*now\(\)\s*-\s*(\d+)([dwmy])/i;
    const match = query.match(timeRangePattern);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      
      let days = 0;
      switch (unit) {
        case 'd': days = value; break;
        case 'w': days = value * 7; break;
        case 'm': days = value * 30; break;
        case 'y': days = value * 365; break;
      }
      
      if (days > 30) {
        warnings.push({
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: query.length,
          message: '大时间范围查询可能导致性能问题',
          severity: 'warning',
          code: 'LARGE_TIME_RANGE'
        });
      }
    }
  }

  /**
   * 安全验证
   */
  private validateSecurity(query: string, warnings: ValidationError[]): void {
    const upperQuery = query.toUpperCase();
    
    // 检查危险操作
    const dangerousOps = ['DROP', 'DELETE', 'ALTER'];
    dangerousOps.forEach(op => {
      if (upperQuery.includes(op)) {
        warnings.push({
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: query.length,
          message: `检测到危险操作 '${op}'，请确认操作的正确性`,
          severity: 'warning',
          code: 'DANGEROUS_OPERATION'
        });
      }
    });
  }

  /**
   * 判断是否可能是关键词
   */
  private isLikelyKeyword(word: string): boolean {
    return word.length > 2 && /^[A-Za-z]+$/.test(word);
  }

  /**
   * 查找最接近的关键词
   */
  private findClosestKeyword(word: string): string | null {
    let bestMatch = '';
    let minDistance = Infinity;
    
    for (const keyword of this.KEYWORDS) {
      const distance = this.levenshteinDistance(word, keyword);
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        bestMatch = keyword;
      }
    }
    
    return bestMatch || null;
  }

  /**
   * 查找最接近的函数
   */
  private findClosestFunction(word: string): string | null {
    let bestMatch = '';
    let minDistance = Infinity;
    
    for (const func of this.FUNCTIONS) {
      const distance = this.levenshteinDistance(word, func);
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        bestMatch = func;
      }
    }
    
    return bestMatch || null;
  }

  /**
   * 计算 Levenshtein 距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // 插入
          matrix[j - 1][i] + 1, // 删除
          matrix[j - 1][i - 1] + substitutionCost // 替换
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const influxqlValidator = new InfluxQLValidator();
export default influxqlValidator;