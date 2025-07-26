/**
 * 智能补全基础抽象类
 * 
 * 定义了智能补全的基础接口和通用方法。
 */

import {
  QueryLanguage,
  DatabaseConnection,
  SmartSuggestion,
  QueryContext
} from '../../../types/database/base';

/**
 * 补全上下文接口
 */
export interface CompletionContext extends QueryContext {
  currentWord?: string;
  previousWord?: string;
  nextWord?: string;
  lineText?: string;
  wordStartPosition?: number;
  wordEndPosition?: number;
  isInString?: boolean;
  isInComment?: boolean;
}

/**
 * 智能补全抽象基类
 */
export abstract class SmartComplete {
  abstract readonly language: QueryLanguage;
  abstract readonly displayName: string;

  /**
   * 获取智能建议
   * @param connection 数据库连接
   * @param context 查询上下文
   * @returns 智能建议列表
   */
  abstract getSuggestions(connection: DatabaseConnection, context: CompletionContext): Promise<SmartSuggestion[]>;

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
   * 解析补全上下文
   * @param context 原始上下文
   * @returns 解析后的补全上下文
   */
  protected parseCompletionContext(context: QueryContext): CompletionContext {
    const completionContext: CompletionContext = { ...context };

    if (context.cursorPosition && context.selectedText !== undefined) {
      const lines = (context.selectedText || '').split('\n');
      const currentLine = lines[context.cursorPosition.line - 1] || '';
      
      completionContext.lineText = currentLine;
      completionContext.currentWord = this.getCurrentWord(currentLine, context.cursorPosition.column);
      completionContext.previousWord = this.getPreviousWord(currentLine, context.cursorPosition.column);
      completionContext.nextWord = this.getNextWord(currentLine, context.cursorPosition.column);
      completionContext.isInString = this.isInString(currentLine, context.cursorPosition.column);
      completionContext.isInComment = this.isInComment(currentLine, context.cursorPosition.column);
    }

    return completionContext;
  }

  /**
   * 获取当前光标位置的单词
   * @param line 当前行文本
   * @param column 列位置
   * @returns 当前单词
   */
  protected getCurrentWord(line: string, column: number): string {
    const beforeCursor = line.substring(0, column);
    const afterCursor = line.substring(column);
    
    const wordStart = beforeCursor.search(/\w+$/);
    const wordEndMatch = afterCursor.match(/^\w*/);
    const wordEnd = wordEndMatch ? wordEndMatch[0].length : 0;
    
    if (wordStart === -1) {
      return wordEndMatch ? wordEndMatch[0] : '';
    }
    
    return beforeCursor.substring(wordStart) + (wordEndMatch ? wordEndMatch[0] : '');
  }

  /**
   * 获取前一个单词
   * @param line 当前行文本
   * @param column 列位置
   * @returns 前一个单词
   */
  protected getPreviousWord(line: string, column: number): string {
    const beforeCursor = line.substring(0, column);
    const words = beforeCursor.split(/\s+/).filter(word => word.length > 0);
    return words.length > 1 ? words[words.length - 2] : '';
  }

  /**
   * 获取后一个单词
   * @param line 当前行文本
   * @param column 列位置
   * @returns 后一个单词
   */
  protected getNextWord(line: string, column: number): string {
    const afterCursor = line.substring(column);
    const words = afterCursor.split(/\s+/).filter(word => word.length > 0);
    return words.length > 0 ? words[0] : '';
  }

  /**
   * 检查是否在字符串内
   * @param line 当前行文本
   * @param column 列位置
   * @returns 是否在字符串内
   */
  protected isInString(line: string, column: number): boolean {
    const beforeCursor = line.substring(0, column);
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escapeNext = false;

    for (const char of beforeCursor) {
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

    return inSingleQuote || inDoubleQuote;
  }

  /**
   * 检查是否在注释内
   * @param line 当前行文本
   * @param column 列位置
   * @returns 是否在注释内
   */
  protected isInComment(line: string, column: number): boolean {
    const beforeCursor = line.substring(0, column);
    
    // 检查单行注释
    const commentIndex = beforeCursor.indexOf('--');
    if (commentIndex !== -1) {
      return true;
    }

    // 检查多行注释开始
    const blockCommentStart = beforeCursor.lastIndexOf('/*');
    const blockCommentEnd = beforeCursor.lastIndexOf('*/');
    
    return blockCommentStart !== -1 && (blockCommentEnd === -1 || blockCommentStart > blockCommentEnd);
  }

  /**
   * 创建关键字建议
   * @param keywords 关键字列表
   * @param prefix 前缀过滤
   * @returns 建议列表
   */
  protected createKeywordSuggestions(keywords: string[], prefix: string = ''): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return keywords
      .filter(keyword => keyword.toLowerCase().startsWith(lowerPrefix))
      .map(keyword => ({
        type: 'keyword' as const,
        text: keyword,
        displayText: keyword,
        description: `${keyword} keyword`,
        insertText: keyword,
        sortText: `0_${keyword}` // 关键字优先级最高
      }));
  }

  /**
   * 创建函数建议
   * @param functions 函数列表
   * @param prefix 前缀过滤
   * @returns 建议列表
   */
  protected createFunctionSuggestions(functions: string[], prefix: string = ''): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return functions
      .filter(func => func.toLowerCase().startsWith(lowerPrefix))
      .map(func => ({
        type: 'function' as const,
        text: func,
        displayText: `${func}()`,
        description: `${func} function`,
        insertText: `${func}()`,
        sortText: `1_${func}` // 函数优先级次之
      }));
  }

  /**
   * 创建表/测量建议
   * @param tables 表名列表
   * @param prefix 前缀过滤
   * @returns 建议列表
   */
  protected createTableSuggestions(tables: string[], prefix: string = ''): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return tables
      .filter(table => table.toLowerCase().startsWith(lowerPrefix))
      .map(table => ({
        type: 'table' as const,
        text: table,
        displayText: table,
        description: `Table: ${table}`,
        insertText: table,
        sortText: `2_${table}`
      }));
  }

  /**
   * 创建列/字段建议
   * @param columns 列名列表
   * @param prefix 前缀过滤
   * @returns 建议列表
   */
  protected createColumnSuggestions(columns: string[], prefix: string = ''): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return columns
      .filter(column => column.toLowerCase().startsWith(lowerPrefix))
      .map(column => ({
        type: 'column' as const,
        text: column,
        displayText: column,
        description: `Column: ${column}`,
        insertText: column,
        sortText: `3_${column}`
      }));
  }

  /**
   * 创建值建议
   * @param values 值列表
   * @param prefix 前缀过滤
   * @returns 建议列表
   */
  protected createValueSuggestions(values: string[], prefix: string = ''): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return values
      .filter(value => value.toLowerCase().startsWith(lowerPrefix))
      .map(value => ({
        type: 'value' as const,
        text: value,
        displayText: value,
        description: `Value: ${value}`,
        insertText: `'${value}'`,
        sortText: `4_${value}`
      }));
  }

  /**
   * 合并和排序建议
   * @param suggestions 建议列表数组
   * @returns 合并后的建议列表
   */
  protected mergeSuggestions(...suggestions: SmartSuggestion[][]): SmartSuggestion[] {
    const merged = suggestions.flat();
    
    // 去重
    const unique = merged.filter((suggestion, index, array) => 
      array.findIndex(s => s.text === suggestion.text && s.type === suggestion.type) === index
    );
    
    // 排序
    return unique.sort((a, b) => {
      const sortA = a.sortText || a.text;
      const sortB = b.sortText || b.text;
      return sortA.localeCompare(sortB);
    });
  }

  /**
   * 根据上下文确定建议类型
   * @param context 补全上下文
   * @returns 应该提供的建议类型
   */
  protected determineSuggestionTypes(context: CompletionContext): {
    includeKeywords: boolean;
    includeFunctions: boolean;
    includeTables: boolean;
    includeColumns: boolean;
    includeValues: boolean;
  } {
    // 如果在字符串或注释中，不提供建议
    if (context.isInString || context.isInComment) {
      return {
        includeKeywords: false,
        includeFunctions: false,
        includeTables: false,
        includeColumns: false,
        includeValues: false
      };
    }

    const previousWord = context.previousWord?.toUpperCase();
    
    // 根据前一个单词确定建议类型
    switch (previousWord) {
      case 'FROM':
      case 'JOIN':
      case 'INTO':
        return {
          includeKeywords: false,
          includeFunctions: false,
          includeTables: true,
          includeColumns: false,
          includeValues: false
        };
        
      case 'SELECT':
      case 'WHERE':
      case 'GROUP':
      case 'ORDER':
        return {
          includeKeywords: true,
          includeFunctions: true,
          includeTables: false,
          includeColumns: true,
          includeValues: false
        };
        
      case '=':
      case '!=':
      case '<>':
      case '<':
      case '>':
      case '<=':
      case '>=':
        return {
          includeKeywords: false,
          includeFunctions: true,
          includeTables: false,
          includeColumns: true,
          includeValues: true
        };
        
      default:
        return {
          includeKeywords: true,
          includeFunctions: true,
          includeTables: true,
          includeColumns: true,
          includeValues: false
        };
    }
  }
}
