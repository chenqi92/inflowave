/**
 * InfluxQL 查询格式化器
 * 提供专业的 SQL 格式化功能
 */

export interface FormatterOptions {
  indentSize: number;
  useTabs: boolean;
  uppercaseKeywords: boolean;
  alignCommas: boolean;
  linesBetweenQueries: number;
  maxLineLength: number;
  breakBeforeKeywords: string[];
  indentInnerQuery: boolean;
}

export const DEFAULT_FORMATTER_OPTIONS: FormatterOptions = {
  indentSize: 2,
  useTabs: false,
  uppercaseKeywords: true,
  alignCommas: false,
  linesBetweenQueries: 1,
  maxLineLength: 120,
  breakBeforeKeywords: [
    'FROM',
    'WHERE',
    'GROUP BY',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
  ],
  indentInnerQuery: true,
};

interface ParsedToken {
  type:
    | 'keyword'
    | 'identifier'
    | 'operator'
    | 'literal'
    | 'function'
    | 'punctuation'
    | 'whitespace'
    | 'comment';
  value: string;
  upperValue: string;
  originalValue: string;
}

class InfluxQLFormatter {
  private options: FormatterOptions;

  constructor(options: FormatterOptions = DEFAULT_FORMATTER_OPTIONS) {
    this.options = { ...DEFAULT_FORMATTER_OPTIONS, ...options };
  }

  /**
   * 格式化 InfluxQL 查询
   */
  format(query: string, customOptions?: Partial<FormatterOptions>): string {
    if (customOptions) {
      this.options = { ...this.options, ...customOptions };
    }

    if (!query.trim()) {
      return query;
    }

    try {
      // 分词
      const tokens = this.tokenize(query);

      // 格式化
      const formatted = this.formatTokens(tokens);

      // 后处理
      return this.postProcess(formatted);
    } catch (error) {
      console.error('Query formatting failed:', error);
      return query; // 返回原始查询如果格式化失败
    }
  }

  /**
   * 分词器
   */
  private tokenize(query: string): ParsedToken[] {
    const tokens: ParsedToken[] = [];
    let i = 0;

    while (i < query.length) {
      const char = query[i];

      // 跳过空白字符
      if (/\s/.test(char)) {
        const whitespace = this.extractWhitespace(query, i);
        tokens.push({
          type: 'whitespace',
          value: whitespace,
          upperValue: whitespace,
          originalValue: whitespace,
        });
        i += whitespace.length;
        continue;
      }

      // 注释
      if (char === '-' && query[i + 1] === '-') {
        const comment = this.extractLineComment(query, i);
        tokens.push({
          type: 'comment',
          value: comment,
          upperValue: comment,
          originalValue: comment,
        });
        i += comment.length;
        continue;
      }

      if (char === '/' && query[i + 1] === '*') {
        const comment = this.extractBlockComment(query, i);
        tokens.push({
          type: 'comment',
          value: comment,
          upperValue: comment,
          originalValue: comment,
        });
        i += comment.length;
        continue;
      }

      // 字符串字面量
      if (char === '"' || char === "'") {
        const literal = this.extractStringLiteral(query, i);
        tokens.push({
          type: 'literal',
          value: literal,
          upperValue: literal,
          originalValue: literal,
        });
        i += literal.length;
        continue;
      }

      // 数字
      if (/\d/.test(char)) {
        const number = this.extractNumber(query, i);
        tokens.push({
          type: 'literal',
          value: number,
          upperValue: number,
          originalValue: number,
        });
        i += number.length;
        continue;
      }

      // 操作符
      if (this.isOperatorStart(char)) {
        const operator = this.extractOperator(query, i);
        tokens.push({
          type: 'operator',
          value: operator,
          upperValue: operator.toUpperCase(),
          originalValue: operator,
        });
        i += operator.length;
        continue;
      }

      // 标点符号
      if (/[(),;]/.test(char)) {
        tokens.push({
          type: 'punctuation',
          value: char,
          upperValue: char,
          originalValue: char,
        });
        i++;
        continue;
      }

      // 标识符、关键词、函数
      if (/[a-zA-Z_]/.test(char)) {
        const identifier = this.extractIdentifier(query, i);
        const upperIdentifier = identifier.toUpperCase();

        let type: ParsedToken['type'] = 'identifier';

        if (this.isKeyword(upperIdentifier)) {
          type = 'keyword';
        } else if (this.isFunction(upperIdentifier)) {
          type = 'function';
        }

        tokens.push({
          type,
          value:
            this.options.uppercaseKeywords && type === 'keyword'
              ? upperIdentifier
              : identifier,
          upperValue: upperIdentifier,
          originalValue: identifier,
        });
        i += identifier.length;
        continue;
      }

      // 其他字符
      tokens.push({
        type: 'identifier',
        value: char,
        upperValue: char.toUpperCase(),
        originalValue: char,
      });
      i++;
    }

    return tokens;
  }

  /**
   * 格式化令牌
   */
  private formatTokens(tokens: ParsedToken[]): string {
    let result = '';
    let indentLevel = 0;
    let needsNewLine = false;
    let currentLineLength = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      const prevToken = tokens[i - 1];

      // 跳过原始空白符，我们会自己管理格式
      if (token.type === 'whitespace') {
        continue;
      }

      // 处理换行需求
      if (needsNewLine || this.shouldBreakBefore(token, prevToken)) {
        result += '\n';
        currentLineLength = 0;
        needsNewLine = false;

        // 添加缩进
        if (token.type !== 'comment') {
          const indent = this.getIndent(indentLevel);
          result += indent;
          currentLineLength += indent.length;
        }
      }

      // 检查是否需要在当前token前添加空格
      if (currentLineLength > 0 && this.needsSpaceBefore(token, prevToken)) {
        result += ' ';
        currentLineLength += 1;
      }

      // 添加当前token
      result += token.value;
      currentLineLength += token.value.length;

      // 检查缩进变化
      if (token.type === 'keyword') {
        if (
          ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY'].includes(
            token.upperValue
          )
        ) {
          // 主要子句不增加缩进
        } else if (token.upperValue === '(') {
          indentLevel++;
        } else if (token.upperValue === ')') {
          indentLevel = Math.max(0, indentLevel - 1);
        }
      }

      if (token.type === 'punctuation' && token.value === '(') {
        indentLevel++;
      } else if (token.type === 'punctuation' && token.value === ')') {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // 检查是否需要在当前token后换行
      if (this.shouldBreakAfter(token, nextToken)) {
        needsNewLine = true;
      }

      // 检查行长度
      if (
        currentLineLength > this.options.maxLineLength &&
        this.canBreakAfter(token, nextToken)
      ) {
        needsNewLine = true;
      }
    }

    return result;
  }

  /**
   * 后处理
   */
  private postProcess(formatted: string): string {
    // 清理多余的空行
    let result = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');

    // 清理行尾空白
    result = result.replace(/[ \t]+$/gm, '');

    // 确保文件末尾有换行符
    if (result && !result.endsWith('\n')) {
      result += '\n';
    }

    return result.trim();
  }

  /**
   * 提取空白字符
   */
  private extractWhitespace(query: string, start: number): string {
    let end = start;
    while (end < query.length && /\s/.test(query[end])) {
      end++;
    }
    return query.substring(start, end);
  }

  /**
   * 提取行注释
   */
  private extractLineComment(query: string, start: number): string {
    let end = start;
    while (end < query.length && query[end] !== '\n') {
      end++;
    }
    return query.substring(start, end);
  }

  /**
   * 提取块注释
   */
  private extractBlockComment(query: string, start: number): string {
    let end = start + 2;
    while (end < query.length - 1) {
      if (query[end] === '*' && query[end + 1] === '/') {
        end += 2;
        break;
      }
      end++;
    }
    return query.substring(start, end);
  }

  /**
   * 提取字符串字面量
   */
  private extractStringLiteral(query: string, start: number): string {
    const quote = query[start];
    let end = start + 1;

    while (end < query.length) {
      if (query[end] === quote) {
        end++;
        break;
      }
      if (query[end] === '\\') {
        end += 2; // 跳过转义字符
      } else {
        end++;
      }
    }

    return query.substring(start, end);
  }

  /**
   * 提取数字
   */
  private extractNumber(query: string, start: number): string {
    let end = start;
    let hasDot = false;

    while (end < query.length) {
      const char = query[end];
      if (/\d/.test(char)) {
        end++;
      } else if (char === '.' && !hasDot) {
        hasDot = true;
        end++;
      } else if ((char === 'e' || char === 'E') && end > start) {
        end++;
        if (end < query.length && (query[end] === '+' || query[end] === '-')) {
          end++;
        }
      } else {
        break;
      }
    }

    return query.substring(start, end);
  }

  /**
   * 检查是否是操作符开始
   */
  private isOperatorStart(char: string): boolean {
    return /[=!<>~+\-*/%]/.test(char);
  }

  /**
   * 提取操作符
   */
  private extractOperator(query: string, start: number): string {
    const twoCharOps = ['!=', '<>', '<=', '>=', '=~', '!~'];
    const twoChar = query.substring(start, start + 2);

    if (twoCharOps.includes(twoChar)) {
      return twoChar;
    }

    return query[start];
  }

  /**
   * 提取标识符
   */
  private extractIdentifier(query: string, start: number): string {
    let end = start;
    while (end < query.length && /[a-zA-Z0-9_]/.test(query[end])) {
      end++;
    }
    return query.substring(start, end);
  }

  /**
   * 检查是否是关键词
   */
  private isKeyword(word: string): boolean {
    const keywords = new Set([
      'SELECT',
      'FROM',
      'WHERE',
      'GROUP',
      'BY',
      'ORDER',
      'LIMIT',
      'OFFSET',
      'SHOW',
      'CREATE',
      'DROP',
      'ALTER',
      'INSERT',
      'DELETE',
      'UPDATE',
      'AND',
      'OR',
      'NOT',
      'IN',
      'LIKE',
      'BETWEEN',
      'IS',
      'NULL',
      'TIME',
      'NOW',
      'AGO',
      'FILL',
      'SLIMIT',
      'SOFFSET',
      'AS',
      'DATABASE',
      'DATABASES',
      'MEASUREMENT',
      'MEASUREMENTS',
      'SERIES',
      'FIELD',
      'FIELDS',
      'TAG',
      'TAGS',
      'KEY',
      'KEYS',
      'VALUES',
      'RETENTION',
      'POLICY',
      'POLICIES',
      'CONTINUOUS',
      'QUERY',
      'QUERIES',
      'USER',
      'USERS',
      'PRIVILEGE',
      'PRIVILEGES',
      'GRANT',
      'REVOKE',
      'ON',
      'TO',
      'WITH',
      'PASSWORD',
      'ADMIN',
      'ALL',
      'READ',
      'WRITE',
      'INTO',
      'DURATION',
      'REPLICATION',
      'DEFAULT',
      'TRUE',
      'FALSE',
    ]);
    return keywords.has(word);
  }

  /**
   * 检查是否是函数
   */
  private isFunction(word: string): boolean {
    const functions = new Set([
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
      'PERCENTILE',
      'SAMPLE',
      'TOP',
      'BOTTOM',
      'ABS',
      'ACOS',
      'ASIN',
      'ATAN',
      'ATAN2',
      'CEIL',
      'COS',
      'CUMULATIVE_SUM',
      'DERIVATIVE',
      'DIFFERENCE',
      'ELAPSED',
      'EXP',
      'FLOOR',
      'HISTOGRAM',
      'LN',
      'LOG',
      'LOG2',
      'LOG10',
      'MOVING_AVERAGE',
      'NON_NEGATIVE_DERIVATIVE',
      'NON_NEGATIVE_DIFFERENCE',
      'POW',
      'ROUND',
      'SIN',
      'SQRT',
      'TAN',
      'HOLT_WINTERS',
    ]);
    return functions.has(word);
  }

  /**
   * 检查是否应该在token前换行
   */
  private shouldBreakBefore(
    token: ParsedToken,
    prevToken?: ParsedToken
  ): boolean {
    if (!prevToken) return false;

    if (
      token.type === 'keyword' &&
      this.options.breakBeforeKeywords.includes(token.upperValue)
    ) {
      return true;
    }

    if (token.type === 'comment') {
      return true;
    }

    return false;
  }

  /**
   * 检查是否应该在token后换行
   */
  private shouldBreakAfter(
    token: ParsedToken,
    nextToken?: ParsedToken
  ): boolean {
    if (token.type === 'comment') {
      return true;
    }

    if (token.type === 'punctuation' && token.value === ';') {
      return true;
    }

    return false;
  }

  /**
   * 检查是否可以在token后换行
   */
  private canBreakAfter(token: ParsedToken, nextToken?: ParsedToken): boolean {
    if (token.type === 'punctuation' && token.value === ',') {
      return true;
    }

    if (token.type === 'keyword') {
      return true;
    }

    if (token.type === 'operator') {
      return true;
    }

    return false;
  }

  /**
   * 检查是否需要在token前添加空格
   */
  private needsSpaceBefore(
    token: ParsedToken,
    prevToken?: ParsedToken
  ): boolean {
    if (!prevToken) return false;

    // 注释前总是需要空格
    if (token.type === 'comment') {
      return true;
    }

    // 标点符号特殊处理
    if (token.type === 'punctuation') {
      if (token.value === '(' && prevToken.type === 'function') {
        return false; // 函数名和括号之间不要空格
      }
      if (token.value === ',') {
        return false; // 逗号前不要空格
      }
      return true;
    }

    if (prevToken.type === 'punctuation') {
      if (prevToken.value === '(' || prevToken.value === ',') {
        return false;
      }
      return true;
    }

    // 操作符前后需要空格
    if (token.type === 'operator' || prevToken.type === 'operator') {
      return true;
    }

    // 关键词前后需要空格
    if (token.type === 'keyword' || prevToken.type === 'keyword') {
      return true;
    }

    return true;
  }

  /**
   * 获取缩进字符串
   */
  private getIndent(level: number): string {
    if (this.options.useTabs) {
      return '\t'.repeat(level);
    } else {
      return ' '.repeat(level * this.options.indentSize);
    }
  }

  /**
   * 智能格式化 - 只格式化用户选择的部分或整个查询
   */
  smartFormat(
    query: string,
    selection?: { start: number; end: number }
  ): string {
    if (selection && selection.start !== selection.end) {
      const before = query.substring(0, selection.start);
      const selected = query.substring(selection.start, selection.end);
      const after = query.substring(selection.end);

      const formatted = this.format(selected);
      return before + formatted + after;
    }

    return this.format(query);
  }

  /**
   * 格式化单行查询（用于建议中的预览）
   */
  formatOneLine(query: string): string {
    const options: FormatterOptions = {
      ...this.options,
      breakBeforeKeywords: [],
      maxLineLength: Infinity,
    };

    return this.format(query, options).replace(/\n\s*/g, ' ').trim();
  }
}

export const influxqlFormatter = new InfluxQLFormatter();
export default influxqlFormatter;
