/**
 * IoTDB SQL 查询格式化器
 * 
 * 这个文件实现了 IoTDB SQL 查询的格式化功能。
 */

import { QueryFormatter, FormatOptions } from '../base/QueryFormatter';
import { QueryLanguage } from '../../../types/database/base';

/**
 * IoTDB SQL 格式化器实现
 */
export class IoTDBSQLFormatter extends QueryFormatter {
  readonly language: QueryLanguage = 'sql';
  readonly displayName = 'IoTDB SQL Formatter';

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
          
          // 处理三元复合关键字
          const thirdToken = tokens[i + 1];
          if (this.isTripleCompoundKeyword(upperToken, nextToken?.toUpperCase(), thirdToken?.toUpperCase())) {
            formatted.push(` ${  this.applyKeywordCase(thirdToken)}`);
            i++; // 跳过第三个标记
          }
        }
        
        formatted.push(' ');
      }
      // 处理子句关键字
      else if (this.isClauseKeyword(upperToken)) {
        formatted.push(`\n${  this.getIndent(indentLevel)  }${this.applyKeywordCase(token)  } `);
      }
      // 处理对齐关键字
      else if (this.isAlignKeyword(upperToken, nextToken?.toUpperCase())) {
        formatted.push(`\n${  this.getIndent(indentLevel)  }${this.applyKeywordCase(token)  } ${  this.applyKeywordCase(nextToken)  } `);
        i++; // 跳过下一个标记
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
    const majorKeywords = ['SELECT', 'FROM', 'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'SET', 'GRANT', 'REVOKE'];
    return majorKeywords.includes(token);
  }

  /**
   * 检查是否为子句关键字
   */
  private isClauseKeyword(token: string): boolean {
    const clauseKeywords = ['WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'FILL', 'WITHOUT NULL', 'DISABLE ALIGN'];
    return clauseKeywords.includes(token);
  }

  /**
   * 检查是否为对齐关键字
   */
  private isAlignKeyword(token: string, nextToken?: string): boolean {
    return token === 'ALIGN' && (nextToken === 'BY');
  }

  /**
   * 检查是否为复合关键字
   */
  private isCompoundKeyword(token: string, nextToken?: string): boolean {
    if (!nextToken) return false;
    
    const compounds = [
      ['GROUP', 'BY'],
      ['ORDER', 'BY'],
      ['ALIGN', 'BY'],
      ['STORAGE', 'GROUP'],
      ['CHILD', 'PATHS'],
      ['CHILD', 'NODES'],
      ['ALIGNED', 'TIMESERIES'],
      ['CREATE', 'USER'],
      ['DROP', 'USER'],
      ['ALTER', 'USER'],
      ['IS', 'NULL'],
      ['IS', 'NOT'],
      ['WITHOUT', 'NULL'],
      ['DISABLE', 'ALIGN']
    ];
    
    return compounds.some(([first, second]) => 
      token === first && nextToken === second
    );
  }

  /**
   * 检查是否为三元复合关键字
   */
  private isTripleCompoundKeyword(token: string, nextToken?: string, thirdToken?: string): boolean {
    if (!nextToken || !thirdToken) return false;
    
    const triples = [
      ['ALIGN', 'BY', 'TIME'],
      ['ALIGN', 'BY', 'DEVICE'],
      ['IS', 'NOT', 'NULL']
    ];
    
    return triples.some(([first, second, third]) => 
      token === first && nextToken === second && thirdToken === third
    );
  }

  /**
   * 重写基类的 tokenize 方法以处理 IoTDB SQL 特定语法
   */
  protected tokenize(query: string): string[] {
    const tokens = super.tokenize(query);
    const processedTokens: string[] = [];
    
    // 处理复合关键字
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = tokens[i + 1];
      const thirdToken = tokens[i + 2];
      
      // 处理三元复合关键字
      if (this.isTripleCompoundKeyword(token.toUpperCase(), nextToken?.toUpperCase(), thirdToken?.toUpperCase())) {
        processedTokens.push(`${token  } ${  nextToken  } ${  thirdToken}`);
        i += 2; // 跳过接下来的两个标记
      }
      // 处理二元复合关键字
      else if (this.isCompoundKeyword(token.toUpperCase(), nextToken?.toUpperCase())) {
        processedTokens.push(`${token  } ${  nextToken}`);
        i++; // 跳过下一个标记
      } else {
        processedTokens.push(token);
      }
    }
    
    return processedTokens;
  }

  /**
   * 检查是否为 IoTDB SQL 操作符
   */
  protected isOperator(token: string): boolean {
    const iotdbOperators = [
      '=', '!=', '<>', '<', '>', '<=', '>=',
      '+', '-', '*', '/', '%',
      'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP',
      'IS NULL', 'IS NOT NULL'
    ];
    return iotdbOperators.some(op => 
      op.toLowerCase() === token.toLowerCase()
    );
  }

  /**
   * 检查是否为 IoTDB SQL 函数
   */
  protected isFunction(token: string): boolean {
    const iotdbFunctions = [
      'COUNT', 'SUM', 'AVG', 'EXTREME', 'MAX_VALUE', 'MIN_VALUE',
      'FIRST_VALUE', 'LAST_VALUE', 'MAX_TIME', 'MIN_TIME',
      'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'SINH', 'COSH', 'TANH',
      'DEGREES', 'RADIANS', 'ABS', 'SIGN', 'CEIL', 'FLOOR', 'ROUND', 'EXP', 'LN', 'LOG10',
      'SQRT', 'POW', 'LENGTH', 'LOCATE', 'STARTSWITH', 'ENDSWITH', 'CONCAT', 'SUBSTRING',
      'UPPER', 'LOWER', 'TRIM', 'STRCMP', 'STRREPLACE',
      'DATE_BIN', 'DATE_BIN_GAPFILL', 'TOP_K', 'BOTTOM_K',
      'TIME_DIFFERENCE', 'DIFFERENCE', 'NON_NEGATIVE_DIFFERENCE',
      'DERIVATIVE', 'NON_NEGATIVE_DERIVATIVE', 'CONST', 'PI', 'E',
      'ZERO_DURATION', 'NON_ZERO_DURATION', 'ZERO_COUNT', 'NON_ZERO_COUNT'
    ];
    return iotdbFunctions.some(func => 
      func.toLowerCase() === token.toLowerCase()
    );
  }

  /**
   * 特殊处理时间序列路径的格式化
   */
  private formatTimeseriesPath(path: string): string {
    // 保持时间序列路径的原始格式，不进行大小写转换
    return path;
  }

  /**
   * 重写格式化标记方法以处理时间序列路径
   */
  protected formatToken(token: string, context?: {
    previousToken?: string;
    nextToken?: string;
    indentLevel?: number;
  }): string {
    // 如果是时间序列路径，保持原格式
    if (token.startsWith('root.')) {
      return this.formatTimeseriesPath(token);
    }
    
    if (this.isKeyword(token)) {
      return this.applyKeywordCase(token);
    }
    
    return token;
  }
}
