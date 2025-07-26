/**
 * InfluxDB 智能自动补全系统 - 重构版本
 * 
 * 这个文件现在使用新的查询引擎抽象层，同时保持向后兼容的接口。
 */

import { InfluxDBSmartComplete as NewInfluxDBSmartComplete } from '../services/query/influxdb/InfluxDBSmartComplete';
import type { SmartSuggestion as NewSmartSuggestion, DatabaseConnection, QueryContext } from '../types/database/base';

// 保持向后兼容的接口
export interface SmartSuggestion {
  label: string;
  insertText: string;
  type:
    | 'keyword'
    | 'function'
    | 'database'
    | 'measurement'
    | 'field'
    | 'tag'
    | 'template'
    | 'operator'
    | 'value'
    | 'constant';
  priority: number;
  description: string;
  documentation: string;
  snippet?: boolean;
  category?: string;
  example?: string;
}

/**
 * 适配器类：将新的智能补全接口适配到旧的接口
 */
class InfluxDBSmartCompleteEngine {
  private newSmartComplete: NewInfluxDBSmartComplete;

  constructor() {
    this.newSmartComplete = new NewInfluxDBSmartComplete();
  }

  /**
   * 生成智能建议 - 使用新的智能补全引擎
   */
  async generateSuggestions(
    connectionId: string,
    database: string,
    text: string,
    cursorPosition: number
  ): Promise<SmartSuggestion[]> {
    try {
      // 创建模拟的连接和上下文对象
      const connection: DatabaseConnection = {
        id: connectionId,
        config: {
          id: connectionId,
          name: 'connection',
          dbType: 'influxdb',
          host: 'localhost',
          port: 8086
        },
        status: 'connected'
      };

      const context: QueryContext = {
        connectionId,
        database,
        language: 'influxql',
        cursorPosition: {
          line: 1,
          column: cursorPosition
        },
        selectedText: text
      };

      // 使用新的智能补全引擎
      const newSuggestions = await this.newSmartComplete.getSuggestions(connection, context);
      
      // 转换结果格式
      return this.convertSuggestions(newSuggestions);
    } catch (error) {
      console.error('Smart complete failed:', error);
      return [];
    }
  }

  /**
   * 转换新建议格式到旧格式
   */
  private convertSuggestions(newSuggestions: NewSmartSuggestion[]): SmartSuggestion[] {
    return newSuggestions.map(suggestion => ({
      label: suggestion.displayText || suggestion.text,
      insertText: suggestion.insertText || suggestion.text,
      type: this.mapSuggestionType(suggestion.type),
      priority: this.calculatePriority(suggestion),
      description: suggestion.description || '',
      documentation: suggestion.documentation || suggestion.description || '',
      snippet: suggestion.insertText !== suggestion.text,
      category: suggestion.type,
      example: suggestion.detail || ''
    }));
  }

  /**
   * 映射建议类型
   */
  private mapSuggestionType(type: string): SmartSuggestion['type'] {
    const typeMap: Record<string, SmartSuggestion['type']> = {
      'keyword': 'keyword',
      'function': 'function',
      'table': 'measurement',
      'column': 'field',
      'value': 'value'
    };
    
    return typeMap[type] || 'keyword';
  }

  /**
   * 计算优先级
   */
  private calculatePriority(suggestion: NewSmartSuggestion): number {
    const priorityMap: Record<string, number> = {
      'keyword': 100,
      'function': 90,
      'table': 80,
      'column': 70,
      'value': 60
    };
    
    return priorityMap[suggestion.type] || 50;
  }

  /**
   * 清除缓存（向后兼容）
   */
  clearCache(): void {
    // 新的实现中缓存由后端管理，这里保持接口兼容
    console.log('Cache cleared (compatibility method)');
  }
}

// 导出实例
export const influxdbSmartComplete = new InfluxDBSmartCompleteEngine();
export default influxdbSmartComplete;
