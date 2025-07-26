/**
 * 查询验证器基础抽象类
 * 
 * 定义了查询验证的基础接口和通用方法。
 */

import {
  QueryLanguage,
  ValidationResult,
  ValidationError
} from '../../../types/database/base';

/**
 * 查询验证器抽象基类
 */
export abstract class QueryValidator {
  abstract readonly language: QueryLanguage;
  abstract readonly displayName: string;

  /**
   * 验证查询语法
   * @param query 查询字符串
   * @returns 验证结果
   */
  abstract validate(query: string): Promise<ValidationResult>;

  /**
   * 获取支持的关键字列表
   * @returns 关键字数组
   */
  abstract getSupportedKeywords(): string[];

  /**
   * 获取支持的函数列表
   * @returns 函数数组
   */
  abstract getSupportedFunctions(): string[];

  /**
   * 基础语法检查
   * @param query 查询字符串
   * @returns 验证错误列表
   */
  protected basicSyntaxCheck(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 检查空查询
    if (!query || query.trim().length === 0) {
      errors.push(this.createError('Query cannot be empty', 0, 0, 'syntax'));
      return errors;
    }

    // 检查括号匹配
    const bracketErrors = this.checkBracketMatching(query);
    errors.push(...bracketErrors);

    // 检查引号匹配
    const quoteErrors = this.checkQuoteMatching(query);
    errors.push(...quoteErrors);

    return errors;
  }

  /**
   * 检查括号匹配
   * @param query 查询字符串
   * @returns 验证错误列表
   */
  protected checkBracketMatching(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const stack: Array<{ char: string; line: number; column: number }> = [];
    const lines = query.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        
        if (char === '(' || char === '[' || char === '{') {
          stack.push({ char, line: lineIndex + 1, column: charIndex + 1 });
        } else if (char === ')' || char === ']' || char === '}') {
          if (stack.length === 0) {
            errors.push(this.createError(
              `Unmatched closing bracket '${char}'`,
              lineIndex + 1,
              charIndex + 1,
              'syntax'
            ));
          } else {
            const last = stack.pop()!;
            const expectedClosing = this.getMatchingBracket(last.char);
            if (char !== expectedClosing) {
              errors.push(this.createError(
                `Mismatched bracket: expected '${expectedClosing}' but found '${char}'`,
                lineIndex + 1,
                charIndex + 1,
                'syntax'
              ));
            }
          }
        }
      }
    }

    // 检查未闭合的括号
    for (const unclosed of stack) {
      const expectedClosing = this.getMatchingBracket(unclosed.char);
      errors.push(this.createError(
        `Unclosed bracket '${unclosed.char}', expected '${expectedClosing}'`,
        unclosed.line,
        unclosed.column,
        'syntax'
      ));
    }

    return errors;
  }

  /**
   * 检查引号匹配
   * @param query 查询字符串
   * @returns 验证错误列表
   */
  protected checkQuoteMatching(query: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = query.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let inSingleQuote = false;
      let inDoubleQuote = false;
      let escapeNext = false;

      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === "'" && !inDoubleQuote) {
          inSingleQuote = !inSingleQuote;
        } else if (char === '"' && !inSingleQuote) {
          inDoubleQuote = !inDoubleQuote;
        }
      }

      // 检查行末是否有未闭合的引号
      if (inSingleQuote) {
        errors.push(this.createError(
          "Unclosed single quote",
          lineIndex + 1,
          line.length,
          'syntax'
        ));
      }
      if (inDoubleQuote) {
        errors.push(this.createError(
          "Unclosed double quote",
          lineIndex + 1,
          line.length,
          'syntax'
        ));
      }
    }

    return errors;
  }

  /**
   * 获取匹配的括号
   * @param openBracket 开括号
   * @returns 对应的闭括号
   */
  private getMatchingBracket(openBracket: string): string {
    const bracketMap: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}'
    };
    return bracketMap[openBracket] || '';
  }

  /**
   * 检查关键字拼写
   * @param query 查询字符串
   * @returns 验证警告列表
   */
  protected checkKeywordSpelling(query: string): ValidationError[] {
    const warnings: ValidationError[] = [];
    const supportedKeywords = this.getSupportedKeywords();
    const words = query.split(/\s+/);
    
    for (const word of words) {
      const upperWord = word.toUpperCase();
      // 简单的拼写检查：如果单词与关键字相似但不完全匹配
      for (const keyword of supportedKeywords) {
        if (this.isSimilar(upperWord, keyword) && upperWord !== keyword) {
          warnings.push(this.createWarning(
            `Did you mean '${keyword}'? Found '${word}'`,
            0,
            0,
            'reference'
          ));
        }
      }
    }

    return warnings;
  }

  /**
   * 检查两个字符串是否相似（简单的编辑距离）
   * @param str1 字符串1
   * @param str2 字符串2
   * @returns 是否相似
   */
  private isSimilar(str1: string, str2: string): boolean {
    if (Math.abs(str1.length - str2.length) > 2) {
      return false;
    }

    let differences = 0;
    const maxLength = Math.max(str1.length, str2.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (str1[i] !== str2[i]) {
        differences++;
        if (differences > 2) {
          return false;
        }
      }
    }

    return differences <= 2 && differences > 0;
  }

  /**
   * 创建验证错误
   * @param message 错误消息
   * @param line 行号
   * @param column 列号
   * @param errorType 错误类型
   * @returns 验证错误对象
   */
  protected createError(
    message: string,
    line: number,
    column: number,
    errorType: 'syntax' | 'semantic' | 'reference' | 'type'
  ): ValidationError {
    return {
      line,
      column,
      message,
      errorType,
      severity: 'error'
    };
  }

  /**
   * 创建验证警告
   * @param message 警告消息
   * @param line 行号
   * @param column 列号
   * @param errorType 错误类型
   * @returns 验证警告对象
   */
  protected createWarning(
    message: string,
    line: number,
    column: number,
    errorType: 'syntax' | 'semantic' | 'reference' | 'type'
  ): ValidationError {
    return {
      line,
      column,
      message,
      errorType,
      severity: 'warning'
    };
  }

  /**
   * 创建验证信息
   * @param message 信息消息
   * @param line 行号
   * @param column 列号
   * @param errorType 错误类型
   * @returns 验证信息对象
   */
  protected createInfo(
    message: string,
    line: number,
    column: number,
    errorType: 'syntax' | 'semantic' | 'reference' | 'type'
  ): ValidationError {
    return {
      line,
      column,
      message,
      errorType,
      severity: 'info'
    };
  }
}
