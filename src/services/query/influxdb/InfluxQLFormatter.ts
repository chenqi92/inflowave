/**
 * InfluxQL 查询格式化器
 * 
 * 这个文件实现了 InfluxQL 查询的格式化功能。
 */

import { QueryFormatter, FormatOptions } from '../base/QueryFormatter';
import { QueryLanguage } from '../../../types/database/base';

/**
 * InfluxQL 格式化器实现
 */
export class InfluxQLFormatter extends QueryFormatter {
  readonly language: QueryLanguage = 'influxql';
  readonly displayName = 'InfluxQL Formatter';

  async format(query: string, options?: Partial<FormatOptions>): Promise<string> {
    if (options) {
      this.updateOptions(options);
    }

    // 预处理查询
    const preprocessed = this.preprocessQuery(query);
    
    // 标记化
    const tokens = this.tokenize(preprocessed);
    
    // 格式化标记
    return this.formatTokensToString(tokens);
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

  /**
   * 格式化标记列表为数组
   */
  private formatTokensArray(tokens: string[]): string[] {
    const formatted: string[] = [];
    let indentLevel = 0;
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];
      const upperToken = token.toUpperCase();
      const nextToken = tokens[i + 1];
      const prevToken = tokens[i - 1];

      // 处理主要关键字
      if (this.isMajorKeyword(upperToken)) {
        if (formatted.length > 0) {
          formatted.push('\n');
        }
        formatted.push(this.getIndent(indentLevel) + this.applyKeywordCase(token));
        
        // 处理复合关键字
        if (this.isCompoundKeyword(upperToken, nextToken)) {
          formatted.push(` ${  this.applyKeywordCase(nextToken)}`);
          i++; // 跳过下一个标记
        }
        
        if (this.options.lineBreakAfterKeywords) {
          formatted.push(`\n${  this.getIndent(indentLevel + 1)}`);
        } else {
          formatted.push(' ');
        }
      }
      // 处理子句关键字
      else if (this.isClauseKeyword(upperToken)) {
        if (this.options.lineBreakAfterKeywords) {
          formatted.push(`\n${  this.getIndent(indentLevel)  }${this.applyKeywordCase(token)  }\n${  this.getIndent(indentLevel + 1)}`);
        } else {
          formatted.push(` ${  this.applyKeywordCase(token)  } `);
        }
      }
      // 处理操作符
      else if (this.isOperator(token)) {
        formatted.push(` ${  token  } `);
      }
      // 处理逗号
      else if (token === ',') {
        formatted.push(token);
        if (this.options.lineBreakAfterKeywords) {
          formatted.push(`\n${  this.getIndent(indentLevel + 1)}`);
        } else {
          formatted.push(' ');
        }
      }
      // 处理括号
      else if (token === '(') {
        formatted.push(token);
        indentLevel++;
      }
      else if (token === ')') {
        indentLevel = Math.max(0, indentLevel - 1);
        formatted.push(token);
      }
      // 处理分号
      else if (token === ';') {
        formatted.push(token);
        if (i < tokens.length - 1) {
          formatted.push('\n\n');
        }
        indentLevel = 0;
      }
      // 处理其他标记
      else {
        if (this.isKeyword(token)) {
          formatted.push(this.applyKeywordCase(token));
        } else {
          formatted.push(token);
        }
      }

      i++;
    }

    return formatted;
  }

  /**
   * 将格式化的标记数组转换为字符串
   */
  private formatTokensToString(tokens: string[]): string {
    const formattedTokens = this.formatTokensToArray(tokens);
    let result = formattedTokens.join('');
    
    // 清理多余的空格和换行
    result = result.replace(/\s+/g, ' ');
    result = result.replace(/\s*\n\s*/g, '\n');
    result = result.replace(/\n+/g, '\n');
    result = result.trim();
    
    return result;
  }

  /**
   * 格式化标记数组
   */
  private formatTokensToArray(tokens: string[]): string[] {
    const formatted: string[] = [];
    let indentLevel = 0;
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];
      const upperToken = token.toUpperCase();
      const nextToken = tokens[i + 1];

      // 处理主要关键字
      if (this.isMajorKeyword(upperToken)) {
        if (formatted.length > 0 && !formatted[formatted.length - 1].endsWith('\n')) {
          formatted.push('\n');
        }
        formatted.push(this.getIndent(indentLevel) + this.applyKeywordCase(token));
        
        // 处理复合关键字
        if (this.isCompoundKeyword(upperToken, nextToken?.toUpperCase())) {
          formatted.push(` ${  this.applyKeywordCase(nextToken)}`);
          i++; // 跳过下一个标记
        }
        
        formatted.push(' ');
      }
      // 处理子句关键字
      else if (this.isClauseKeyword(upperToken)) {
        formatted.push(`\n${  this.getIndent(indentLevel)  }${this.applyKeywordCase(token)  } `);
      }
      // 处理操作符
      else if (this.isOperator(token)) {
        formatted.push(` ${  token  } `);
      }
      // 处理逗号
      else if (token === ',') {
        formatted.push(`${token  } `);
      }
      // 处理括号
      else if (token === '(') {
        formatted.push(token);
        indentLevel++;
      }
      else if (token === ')') {
        indentLevel = Math.max(0, indentLevel - 1);
        formatted.push(token);
      }
      // 处理分号
      else if (token === ';') {
        formatted.push(token);
        if (i < tokens.length - 1) {
          formatted.push('\n\n');
        }
        indentLevel = 0;
      }
      // 处理其他标记
      else {
        if (this.isKeyword(token)) {
          formatted.push(this.applyKeywordCase(token));
        } else {
          formatted.push(token);
        }
      }

      i++;
    }

    return formatted;
  }

  /**
   * 检查是否为主要关键字
   */
  private isMajorKeyword(token: string): boolean {
    const majorKeywords = ['SELECT', 'FROM', 'SHOW', 'CREATE', 'DROP', 'DELETE', 'GRANT', 'REVOKE'];
    return majorKeywords.includes(token);
  }

  /**
   * 检查是否为子句关键字
   */
  private isClauseKeyword(token: string): boolean {
    const clauseKeywords = ['WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'FILL'];
    return clauseKeywords.includes(token);
  }

  /**
   * 检查是否为复合关键字
   */
  private isCompoundKeyword(token: string, nextToken?: string): boolean {
    if (!nextToken) return false;
    
    const compounds = [
      ['GROUP', 'BY'],
      ['ORDER', 'BY'],
      ['FIELD', 'KEYS'],
      ['TAG', 'KEYS'],
      ['TAG', 'VALUES'],
      ['RETENTION', 'POLICY']
    ];
    
    return compounds.some(([first, second]) => 
      token === first && nextToken === second
    );
  }

  /**
   * 重写基类的 tokenize 方法以处理 InfluxQL 特定语法
   */
  protected tokenize(query: string): string[] {
    const tokens = super.tokenize(query);
    const processedTokens: string[] = [];
    
    // 处理复合关键字
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      
      if (this.isCompoundKeyword(token.toUpperCase(), nextToken?.toUpperCase())) {
        processedTokens.push(`${token  } ${  nextToken}`);
        i++; // 跳过下一个标记
      } else {
        processedTokens.push(token);
      }
    }
    
    return processedTokens;
  }

  /**
   * 检查是否为 InfluxQL 操作符
   */
  protected isOperator(token: string): boolean {
    const influxqlOperators = [
      '=', '!=', '<>', '<', '>', '<=', '>=',
      '+', '-', '*', '/', '%',
      'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP'
    ];
    return influxqlOperators.some(op => 
      op.toLowerCase() === token.toLowerCase()
    );
  }

  /**
   * 检查是否为 InfluxQL 函数
   */
  protected isFunction(token: string): boolean {
    const influxqlFunctions = [
      'COUNT', 'DISTINCT', 'INTEGRAL', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SUM',
      'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP',
      'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS', 'CUMULATIVE_SUM', 'DERIVATIVE',
      'DIFFERENCE', 'ELAPSED', 'EXP', 'FLOOR', 'HISTOGRAM', 'LN', 'LOG', 'LOG2', 'LOG10',
      'MOVING_AVERAGE', 'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE', 'POW', 'ROUND',
      'SIN', 'SQRT', 'TAN', 'HOLT_WINTERS'
    ];
    return influxqlFunctions.some(func => 
      func.toLowerCase() === token.toLowerCase()
    );
  }
}
