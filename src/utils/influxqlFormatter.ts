/**
 * InfluxQL 查询格式化器 - 重构版本
 * 
 * 这个文件现在使用新的查询引擎抽象层，同时保持向后兼容的接口。
 */

import { InfluxQLFormatter as NewInfluxQLFormatter } from '../services/query/influxdb/InfluxQLFormatter';
import { FormatOptions } from '../services/query/base/QueryFormatter';
import logger from '@/utils/logger';

// 保持向后兼容的接口
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

// 保持向后兼容的 Token 接口
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

/**
 * 适配器类：将新的格式化器接口适配到旧的接口
 */
class InfluxQLFormatter {
  private options: FormatterOptions;
  private newFormatter: NewInfluxQLFormatter;

  constructor(options: FormatterOptions = DEFAULT_FORMATTER_OPTIONS) {
    this.options = { ...DEFAULT_FORMATTER_OPTIONS, ...options };
    this.newFormatter = new NewInfluxQLFormatter(this.convertToNewOptions(this.options));
  }

  /**
   * 格式化 InfluxQL 查询
   */
  async format(query: string, customOptions?: Partial<FormatterOptions>): Promise<string> {
    if (customOptions) {
      this.options = { ...this.options, ...customOptions };
      this.newFormatter.updateOptions(this.convertToNewOptions(this.options));
    }

    if (!query.trim()) {
      return query;
    }

    try {
      return await this.newFormatter.format(query);
    } catch (error) {
      logger.error('Query formatting failed:', error);
      return query; // 返回原始查询如果格式化失败
    }
  }

  /**
   * 同步版本的格式化方法（向后兼容）
   */
  formatSync(query: string, customOptions?: Partial<FormatterOptions>): string {
    if (customOptions) {
      this.options = { ...this.options, ...customOptions };
    }

    if (!query.trim()) {
      return query;
    }

    // 提供基础的格式化
    return this.basicFormat(query);
  }

  /**
   * 转换选项格式
   */
  private convertToNewOptions(oldOptions: FormatterOptions): FormatOptions {
    return {
      indentSize: oldOptions.indentSize,
      indentType: oldOptions.useTabs ? 'tab' : 'space',
      keywordCase: oldOptions.uppercaseKeywords ? 'upper' : 'lower',
      lineBreakAfterKeywords: oldOptions.breakBeforeKeywords.length > 0,
      alignColumns: oldOptions.alignCommas,
      maxLineLength: oldOptions.maxLineLength,
      removeExtraWhitespace: true,
      preserveComments: true
    };
  }

  /**
   * 基础格式化（同步版本）
   */
  private basicFormat(query: string): string {
    // 简单的格式化逻辑
    let formatted = query;
    
    // 关键字大小写
    if (this.options.uppercaseKeywords) {
      const keywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'SHOW'];
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        formatted = formatted.replace(regex, keyword.toUpperCase());
      });
    }
    
    // 基础缩进
    const lines = formatted.split('\n');
    const indentStr = this.options.useTabs ? '\t' : ' '.repeat(this.options.indentSize);
    
    return lines.map((line, index) => {
      if (index === 0) return line.trim();
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // 简单的缩进逻辑
      const shouldIndent = this.options.breakBeforeKeywords.some(keyword => 
        trimmed.toUpperCase().startsWith(keyword.toUpperCase())
      );
      
      return shouldIndent ? trimmed : indentStr + trimmed;
    }).join('\n');
  }
}

// 导出实例
export const influxqlFormatter = new InfluxQLFormatter();
export default influxqlFormatter;
