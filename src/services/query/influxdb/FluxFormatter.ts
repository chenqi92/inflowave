/**
 * Flux 查询格式化器
 * 
 * 这个文件实现了 Flux 查询的格式化功能。
 */

import { QueryFormatter, FormatOptions } from '../base/QueryFormatter';
import { QueryLanguage } from '../../../types/database/base';

/**
 * Flux 格式化器实现
 */
export class FluxFormatter extends QueryFormatter {
  readonly language: QueryLanguage = 'flux';
  readonly displayName = 'Flux Formatter';

  async format(query: string, options?: Partial<FormatOptions>): Promise<string> {
    if (options) {
      this.updateOptions(options);
    }

    // 预处理查询
    const preprocessed = this.preprocessQuery(query);
    
    // 格式化 Flux 管道
    return this.formatFluxPipeline(preprocessed);
  }

  getSupportedKeywords(): string[] {
    return [
      'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
      'map', 'reduce', 'sort', 'limit', 'drop', 'keep', 'rename',
      'union', 'join', 'pivot', 'duplicate',
      'yield', 'to', 'toBucket',
      'and', 'or', 'not',
      'if', 'then', 'else',
      'import', 'option', 'builtin'
    ];
  }

  /**
   * 格式化 Flux 管道
   */
  private formatFluxPipeline(query: string): string {
    const lines = query.split('\n');
    const formatted: string[] = [];
    let indentLevel = 0;
    let inPipeline = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line || this.isCommentLine(line)) {
        formatted.push(line);
        continue;
      }

      // 检查是否为导入或选项语句
      if (line.startsWith('import ') || line.startsWith('option ')) {
        formatted.push(line);
        continue;
      }

      // 检查是否为变量声明
      if (this.isVariableDeclaration(line)) {
        if (inPipeline) {
          formatted.push(''); // 添加空行分隔
          inPipeline = false;
          indentLevel = 0;
        }
        formatted.push(this.formatVariableDeclaration(line));
        continue;
      }

      // 处理管道操作
      if (line.includes('|>')) {
        inPipeline = true;
        const parts = line.split('|>');
        
        for (let j = 0; j < parts.length; j++) {
          const part = parts[j].trim();
          
          if (j === 0) {
            // 第一部分
            if (part) {
              formatted.push(this.getIndent(indentLevel) + this.formatFunction(part));
            }
          } else {
            // 管道后的部分
            if (part) {
              indentLevel = 1;
              formatted.push(`${this.getIndent(indentLevel)  }|> ${  this.formatFunction(part)}`);
            } else if (j === parts.length - 1) {
              // 行末的管道操作符
              formatted[formatted.length - 1] += ' |>';
            }
          }
        }
      } else {
        // 非管道行
        if (inPipeline) {
          // 继续管道
          formatted.push(`${this.getIndent(indentLevel)  }|> ${  this.formatFunction(line)}`);
        } else {
          // 独立语句
          formatted.push(this.formatFunction(line));
        }
      }
    }

    return formatted.join('\n');
  }

  /**
   * 检查是否为变量声明
   */
  private isVariableDeclaration(line: string): boolean {
    return /^\s*\w+\s*=\s*/.test(line) && !line.includes('|>');
  }

  /**
   * 格式化变量声明
   */
  private formatVariableDeclaration(line: string): string {
    const match = line.match(/^(\s*)(\w+)(\s*=\s*)(.+)$/);
    if (match) {
      const [, indent, varName, equals, value] = match;
      return `${varName} = ${this.formatExpression(value.trim())}`;
    }
    return line;
  }

  /**
   * 格式化函数调用
   */
  private formatFunction(expression: string): string {
    expression = expression.trim();
    
    // 处理函数调用
    const functionMatch = expression.match(/^(\w+)\s*\((.*)\)$/s);
    if (functionMatch) {
      const [, funcName, params] = functionMatch;
      const formattedParams = this.formatParameters(params);
      return `${funcName}(${formattedParams})`;
    }
    
    return this.formatExpression(expression);
  }

  /**
   * 格式化参数列表
   */
  private formatParameters(params: string): string {
    if (!params.trim()) {
      return '';
    }

    // 简单的参数格式化
    const paramList = this.parseParameters(params);
    
    if (paramList.length === 1 && paramList[0].length < 50) {
      return paramList[0];
    }
    
    // 多行格式化
    const indentedParams = paramList.map(param => 
      `\n${  this.getIndent(2)  }${param.trim()}`
    );
    
    return `${indentedParams.join(',')  }\n${  this.getIndent(1)}`;
  }

  /**
   * 解析参数列表
   */
  private parseParameters(params: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < params.length; i++) {
      const char = params[i];
      
      if (!inString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
        } else if (char === '(' || char === '[' || char === '{') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}') {
          depth--;
        } else if (char === ',' && depth === 0) {
          result.push(current.trim());
          current = '';
          continue;
        }
      } else {
        if (char === stringChar && params[i - 1] !== '\\') {
          inString = false;
          stringChar = '';
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }

  /**
   * 格式化表达式
   */
  private formatExpression(expression: string): string {
    // 处理关键字大小写
    let formatted = this.applyKeywordCase(expression);
    
    // 格式化操作符周围的空格
    formatted = formatted.replace(/\s*(==|!=|<=|>=|<|>)\s*/g, ' $1 ');
    formatted = formatted.replace(/\s*(and|or)\s+/gi, ' $1 ');
    
    return formatted;
  }

  /**
   * 重写关键字大小写应用
   */
  protected applyKeywordCase(text: string): string {
    if (this.options.keywordCase === 'preserve') {
      return text;
    }

    const keywords = this.getSupportedKeywords();
    let result = text;

    // Flux 关键字通常是小写的
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
   * 检查是否为 Flux 操作符
   */
  protected isOperator(token: string): boolean {
    const fluxOperators = [
      '==', '!=', '<', '>', '<=', '>=',
      '+', '-', '*', '/', '%',
      'and', 'or', 'not'
    ];
    return fluxOperators.some(op => 
      op.toLowerCase() === token.toLowerCase()
    );
  }

  /**
   * 检查是否为 Flux 函数
   */
  protected isFunction(token: string): boolean {
    const fluxFunctions = [
      'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
      'map', 'reduce', 'sort', 'limit', 'drop', 'keep', 'rename',
      'union', 'join', 'pivot', 'duplicate', 'yield', 'to', 'toBucket'
    ];
    return fluxFunctions.some(func => 
      func.toLowerCase() === token.toLowerCase()
    );
  }
}
