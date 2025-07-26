/**
 * 查询格式化器基础抽象类
 * 
 * 定义了查询格式化的基础接口和通用方法。
 */

import { QueryLanguage } from '../../../types/database/base';

/**
 * 格式化选项接口
 */
export interface FormatOptions {
  indentSize?: number;
  indentType?: 'space' | 'tab';
  keywordCase?: 'upper' | 'lower' | 'preserve';
  lineBreakAfterKeywords?: boolean;
  alignColumns?: boolean;
  maxLineLength?: number;
  removeExtraWhitespace?: boolean;
  preserveComments?: boolean;
}

/**
 * 默认格式化选项
 */
export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indentSize: 2,
  indentType: 'space',
  keywordCase: 'upper',
  lineBreakAfterKeywords: true,
  alignColumns: false,
  maxLineLength: 120,
  removeExtraWhitespace: true,
  preserveComments: true
};

/**
 * 查询格式化器抽象基类
 */
export abstract class QueryFormatter {
  abstract readonly language: QueryLanguage;
  abstract readonly displayName: string;

  protected options: FormatOptions;

  constructor(options: Partial<FormatOptions> = {}) {
    this.options = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  }

  /**
   * 格式化查询语句
   * @param query 查询字符串
   * @param options 格式化选项
   * @returns 格式化后的查询字符串
   */
  abstract format(query: string, options?: Partial<FormatOptions>): Promise<string>;

  /**
   * 获取支持的关键字列表
   * @returns 关键字数组
   */
  abstract getSupportedKeywords(): string[];

  /**
   * 预处理查询字符串
   * @param query 原始查询字符串
   * @returns 预处理后的查询字符串
   */
  protected preprocessQuery(query: string): string {
    let processed = query;

    // 移除多余的空白字符
    if (this.options.removeExtraWhitespace) {
      processed = this.removeExtraWhitespace(processed);
    }

    return processed;
  }

  /**
   * 移除多余的空白字符
   * @param query 查询字符串
   * @returns 处理后的查询字符串
   */
  protected removeExtraWhitespace(query: string): string {
    // 移除行首行尾空白
    const lines = query.split('\n').map(line => line.trim());
    
    // 移除空行（保留注释行）
    const nonEmptyLines = lines.filter(line => 
      line.length > 0 || (this.options.preserveComments && this.isCommentLine(line))
    );

    // 合并多个空格为单个空格
    return nonEmptyLines.map(line => 
      line.replace(/\s+/g, ' ')
    ).join('\n');
  }

  /**
   * 检查是否为注释行
   * @param line 行内容
   * @returns 是否为注释行
   */
  protected isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('--') || 
           trimmed.startsWith('/*') || 
           trimmed.startsWith('*') ||
           trimmed.startsWith('//');
  }

  /**
   * 应用关键字大小写规则
   * @param text 文本
   * @returns 处理后的文本
   */
  protected applyKeywordCase(text: string): string {
    if (this.options.keywordCase === 'preserve') {
      return text;
    }

    const keywords = this.getSupportedKeywords();
    let result = text;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const replacement = this.options.keywordCase === 'upper' 
        ? keyword.toUpperCase() 
        : keyword.toLowerCase();
      
      result = result.replace(regex, replacement);
    }

    return result;
  }

  /**
   * 生成缩进字符串
   * @param level 缩进级别
   * @returns 缩进字符串
   */
  protected getIndent(level: number): string {
    const indentChar = this.options.indentType === 'tab' ? '\t' : ' ';
    const indentSize = this.options.indentType === 'tab' ? 1 : (this.options.indentSize || 2);
    
    return indentChar.repeat(level * indentSize);
  }

  /**
   * 分割查询为标记
   * @param query 查询字符串
   * @returns 标记数组
   */
  protected tokenize(query: string): string[] {
    // 基础标记化实现
    const tokens: string[] = [];
    let currentToken = '';
    let inQuotes = false;
    let quoteChar = '';
    let inComment = false;

    for (let i = 0; i < query.length; i++) {
      const char = query[i];
      const nextChar = query[i + 1];

      // 处理注释
      if (!inQuotes && !inComment) {
        if (char === '-' && nextChar === '-') {
          if (currentToken.trim()) {
            tokens.push(currentToken.trim());
            currentToken = '';
          }
          // 读取到行末的注释
          const lineEnd = query.indexOf('\n', i);
          const commentEnd = lineEnd === -1 ? query.length : lineEnd;
          tokens.push(query.substring(i, commentEnd));
          i = commentEnd - 1;
          continue;
        }
        
        if (char === '/' && nextChar === '*') {
          if (currentToken.trim()) {
            tokens.push(currentToken.trim());
            currentToken = '';
          }
          inComment = true;
          currentToken = char;
          continue;
        }
      }

      if (inComment) {
        currentToken += char;
        if (char === '*' && nextChar === '/') {
          currentToken += nextChar;
          tokens.push(currentToken);
          currentToken = '';
          inComment = false;
          i++; // 跳过下一个字符
        }
        continue;
      }

      // 处理引号
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        currentToken += char;
        continue;
      }

      if (inQuotes) {
        currentToken += char;
        if (char === quoteChar && query[i - 1] !== '\\') {
          inQuotes = false;
          quoteChar = '';
        }
        continue;
      }

      // 处理分隔符
      if (/\s/.test(char)) {
        if (currentToken.trim()) {
          tokens.push(currentToken.trim());
          currentToken = '';
        }
        continue;
      }

      // 处理操作符和标点符号
      if (/[(),;]/.test(char)) {
        if (currentToken.trim()) {
          tokens.push(currentToken.trim());
          currentToken = '';
        }
        tokens.push(char);
        continue;
      }

      currentToken += char;
    }

    if (currentToken.trim()) {
      tokens.push(currentToken.trim());
    }

    return tokens.filter(token => token.length > 0);
  }

  /**
   * 检查是否为关键字
   * @param token 标记
   * @returns 是否为关键字
   */
  protected isKeyword(token: string): boolean {
    const keywords = this.getSupportedKeywords();
    return keywords.some(keyword => 
      keyword.toLowerCase() === token.toLowerCase()
    );
  }

  /**
   * 检查是否为操作符
   * @param token 标记
   * @returns 是否为操作符
   */
  protected isOperator(token: string): boolean {
    const operators = [
      '=', '!=', '<>', '<', '>', '<=', '>=',
      '+', '-', '*', '/', '%',
      'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN'
    ];
    return operators.some(op => 
      op.toLowerCase() === token.toLowerCase()
    );
  }

  /**
   * 检查是否为函数
   * @param token 标记
   * @returns 是否为函数
   */
  protected isFunction(token: string): boolean {
    // 基础实现，子类可以重写
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token) && 
           token.toLowerCase() !== token && 
           !this.isKeyword(token);
  }

  /**
   * 格式化单个标记
   * @param token 标记
   * @param context 上下文信息
   * @returns 格式化后的标记
   */
  protected formatToken(token: string, context?: {
    previousToken?: string;
    nextToken?: string;
    indentLevel?: number;
  }): string {
    if (this.isKeyword(token)) {
      return this.applyKeywordCase(token);
    }
    
    return token;
  }

  /**
   * 更新格式化选项
   * @param options 新的格式化选项
   */
  public updateOptions(options: Partial<FormatOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 获取当前格式化选项
   * @returns 当前格式化选项
   */
  public getOptions(): FormatOptions {
    return { ...this.options };
  }
}
