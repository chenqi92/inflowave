/**
 * IoTDB 智能补全实现
 * 
 * 这个文件实现了 IoTDB 特定的智能补全功能。
 */

import { SmartComplete, CompletionContext } from '../base/SmartComplete';
import { safeTauriInvoke } from '../../../utils/tauri';
import {
  QueryLanguage,
  DatabaseConnection,
  SmartSuggestion
} from '../../../types/database/base';

/**
 * IoTDB 智能补全实现
 */
export class IoTDBSmartComplete extends SmartComplete {
  readonly language: QueryLanguage = 'sql';
  readonly displayName = 'IoTDB Smart Complete';

  async getSuggestions(connection: DatabaseConnection, context: CompletionContext): Promise<SmartSuggestion[]> {
    const completionContext = this.parseCompletionContext(context);
    
    // 如果在字符串或注释中，不提供建议
    if (completionContext.isInString || completionContext.isInComment) {
      return [];
    }

    const suggestions: SmartSuggestion[] = [];
    const currentWord = completionContext.currentWord || '';
    const previousWord = completionContext.previousWord?.toUpperCase();
    const lineText = completionContext.lineText || '';

    // 根据上下文确定建议类型
    const suggestionTypes = this.determineSuggestionTypes(completionContext);

    // 关键字建议
    if (suggestionTypes.includeKeywords) {
      const keywords = this.getSupportedKeywords();
      suggestions.push(...this.createKeywordSuggestions(keywords, currentWord));
    }

    // 函数建议
    if (suggestionTypes.includeFunctions) {
      const functions = this.getSupportedFunctions();
      suggestions.push(...this.createFunctionSuggestions(functions, currentWord));
    }

    // 存储组建议
    if (suggestionTypes.includeTables || previousWord === 'FROM' || lineText.includes('STORAGE GROUP')) {
      try {
        const storageGroups = await this.getStorageGroups(connection);
        suggestions.push(...this.createTableSuggestions(storageGroups, currentWord));
      } catch (error) {
        console.warn('Failed to get storage groups:', error);
      }
    }

    // 设备建议
    if (previousWord === 'FROM' || lineText.includes('DEVICES')) {
      try {
        const devices = await this.getDevices(connection, context);
        suggestions.push(...this.createTableSuggestions(devices, currentWord));
      } catch (error) {
        console.warn('Failed to get devices:', error);
      }
    }

    // 时间序列建议
    if (suggestionTypes.includeColumns || previousWord === 'SELECT' || lineText.includes('TIMESERIES')) {
      try {
        const timeseries = await this.getTimeseries(connection, context);
        suggestions.push(...this.createColumnSuggestions(timeseries, currentWord));
      } catch (error) {
        console.warn('Failed to get timeseries:', error);
      }
    }

    // 特定上下文建议
    suggestions.push(...this.getContextSpecificSuggestions(completionContext, currentWord));

    // 过滤和排序建议
    return this.filterAndSortSuggestions(suggestions, currentWord);
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

  getSupportedFunctions(): string[] {
    return [
      // 聚合函数
      'COUNT', 'SUM', 'AVG', 'EXTREME', 'MAX_VALUE', 'MIN_VALUE',
      'FIRST_VALUE', 'LAST_VALUE', 'MAX_TIME', 'MIN_TIME',
      // 数学函数
      'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'SINH', 'COSH', 'TANH',
      'DEGREES', 'RADIANS', 'ABS', 'SIGN', 'CEIL', 'FLOOR', 'ROUND', 'EXP', 'LN', 'LOG10',
      'SQRT', 'POW',
      // 字符串函数
      'LENGTH', 'LOCATE', 'STARTSWITH', 'ENDSWITH', 'CONCAT', 'SUBSTRING',
      'UPPER', 'LOWER', 'TRIM', 'STRCMP', 'STRREPLACE',
      // 时间函数
      'DATE_BIN', 'DATE_BIN_GAPFILL',
      // 选择函数
      'TOP_K', 'BOTTOM_K',
      // 变化趋势计算函数
      'TIME_DIFFERENCE', 'DIFFERENCE', 'NON_NEGATIVE_DIFFERENCE',
      'DERIVATIVE', 'NON_NEGATIVE_DERIVATIVE',
      // 常序列生成函数
      'CONST', 'PI', 'E',
      // 区间查询函数
      'ZERO_DURATION', 'NON_ZERO_DURATION', 'ZERO_COUNT', 'NON_ZERO_COUNT'
    ];
  }

  /**
   * 获取上下文特定的建议
   */
  private getContextSpecificSuggestions(context: CompletionContext, prefix: string): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const lineText = context.lineText || '';
    const upperLineText = lineText.toUpperCase();
    const previousWord = context.previousWord?.toUpperCase();

    // SHOW 语句建议
    if (upperLineText.startsWith('SHOW')) {
      const showSuggestions = [
        'STORAGE GROUP', 'DEVICES', 'TIMESERIES', 'CHILD PATHS', 'CHILD NODES',
        'FUNCTIONS', 'TRIGGERS', 'CONTINUOUS QUERIES', 'SCHEMA TEMPLATES', 'USERS', 'ROLES'
      ];
      suggestions.push(...this.createKeywordSuggestions(showSuggestions, prefix));
    }

    // CREATE 语句建议
    if (upperLineText.startsWith('CREATE')) {
      const createSuggestions = [
        'STORAGE GROUP', 'TIMESERIES', 'ALIGNED TIMESERIES', 'USER', 'ROLE',
        'FUNCTION', 'TRIGGER', 'CONTINUOUS QUERY', 'SCHEMA TEMPLATE'
      ];
      suggestions.push(...this.createKeywordSuggestions(createSuggestions, prefix));
    }

    // ALIGN BY 建议
    if (previousWord === 'BY' && lineText.toUpperCase().includes('ALIGN BY')) {
      suggestions.push(...this.createKeywordSuggestions(['TIME', 'DEVICE'], prefix));
    }

    // FILL 建议
    if (previousWord === 'FILL') {
      suggestions.push(...this.createKeywordSuggestions(['NULL', 'PREVIOUS', 'LINEAR'], prefix));
    }

    // 数据类型建议
    if (upperLineText.includes('WITH DATATYPE')) {
      const dataTypes = ['BOOLEAN', 'INT32', 'INT64', 'FLOAT', 'DOUBLE', 'TEXT'];
      suggestions.push(...this.createValueSuggestions(dataTypes, prefix));
    }

    // 编码建议
    if (upperLineText.includes('ENCODING')) {
      const encodings = ['PLAIN', 'DICTIONARY', 'RLE', 'DIFF', 'TS_2DIFF', 'BITMAP', 'GORILLA', 'REGULAR'];
      suggestions.push(...this.createValueSuggestions(encodings, prefix));
    }

    // 压缩建议
    if (upperLineText.includes('COMPRESSOR')) {
      const compressors = ['UNCOMPRESSED', 'SNAPPY', 'GZIP', 'LZO', 'SDT', 'PAA', 'PLA'];
      suggestions.push(...this.createValueSuggestions(compressors, prefix));
    }

    return suggestions;
  }

  /**
   * 过滤和排序建议
   */
  private filterAndSortSuggestions(suggestions: SmartSuggestion[], prefix: string): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    const filtered = suggestions.filter(suggestion => 
      suggestion.text.toLowerCase().startsWith(lowerPrefix)
    );
    
    return this.mergeSuggestions(filtered);
  }

  /**
   * 创建时间序列路径建议
   */
  private createTimeseriesPathSuggestions(paths: string[], prefix: string): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return paths
      .filter(path => path.toLowerCase().startsWith(lowerPrefix))
      .map(path => ({
        type: 'column' as const,
        text: path,
        displayText: path,
        description: `Timeseries: ${path}`,
        insertText: path,
        sortText: `3_${path}`,
        detail: 'Timeseries Path'
      }));
  }

  /**
   * 创建存储组建议
   */
  private createStorageGroupSuggestions(storageGroups: string[], prefix: string): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return storageGroups
      .filter(sg => sg.toLowerCase().startsWith(lowerPrefix))
      .map(sg => ({
        type: 'table' as const,
        text: sg,
        displayText: sg,
        description: `Storage Group: ${sg}`,
        insertText: sg,
        sortText: `2_${sg}`,
        detail: 'Storage Group'
      }));
  }

  /**
   * 创建设备建议
   */
  private createDeviceSuggestions(devices: string[], prefix: string): SmartSuggestion[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return devices
      .filter(device => device.toLowerCase().startsWith(lowerPrefix))
      .map(device => ({
        type: 'table' as const,
        text: device,
        displayText: device,
        description: `Device: ${device}`,
        insertText: device,
        sortText: `2_${device}`,
        detail: 'Device'
      }));
  }

  // 模拟数据获取方法（实际实现中应该调用后端）
  private async getStorageGroups(connection: DatabaseConnection): Promise<string[]> {
    // 实现实际的存储组获取逻辑
    try {
      const storageGroups = await safeTauriInvoke<string[]>('get_iotdb_storage_groups', {
        connectionId: connection.id
      });
      return storageGroups;
    } catch (error) {
      console.warn('获取存储组失败，使用默认值:', error);
      return ['root.sg1', 'root.sg2', 'root.vehicle', 'root.factory'];
    }
  }

  private async getDevices(connection: DatabaseConnection, context: CompletionContext): Promise<string[]> {
    // 实现实际的设备获取逻辑
    try {
      const devices = await safeTauriInvoke<string[]>('get_iotdb_devices', {
        connectionId: connection.id,
        storageGroup: (context as any).storageGroup
      });
      return devices;
    } catch (error) {
      console.warn('获取设备失败，使用默认值:', error);
      return ['root.sg1.d1', 'root.sg1.d2', 'root.sg2.d1', 'root.vehicle.d1'];
    }
  }

  private async getTimeseries(connection: DatabaseConnection, context: CompletionContext): Promise<string[]> {
    // 实现实际的时间序列获取逻辑
    try {
      const timeseries = await safeTauriInvoke<string[]>('get_iotdb_timeseries', {
        connectionId: connection.id,
        devicePath: (context as any).device,
        storageGroup: (context as any).storageGroup
      });
      return timeseries;
    } catch (error) {
      console.warn('获取时间序列失败，使用默认值:', error);
      return [
        'root.sg1.d1.s1', 'root.sg1.d1.s2', 'root.sg1.d2.s1',
        'root.sg2.d1.temperature', 'root.sg2.d1.humidity',
        'root.vehicle.d1.speed', 'root.vehicle.d1.fuel'
      ];
    }
  }

  /**
   * 重写基类方法以支持 IoTDB 特定的建议类型判断
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
    const lineText = context.lineText?.toUpperCase() || '';
    
    // 根据前一个单词确定建议类型
    switch (previousWord) {
      case 'FROM':
        return {
          includeKeywords: false,
          includeFunctions: false,
          includeTables: true, // 存储组和设备
          includeColumns: false,
          includeValues: false
        };
        
      case 'SELECT':
        return {
          includeKeywords: true,
          includeFunctions: true,
          includeTables: false,
          includeColumns: true, // 时间序列
          includeValues: false
        };
        
      case 'WHERE':
      case 'AND':
      case 'OR':
        return {
          includeKeywords: true,
          includeFunctions: true,
          includeTables: false,
          includeColumns: true,
          includeValues: false
        };

      case 'SHOW':
        return {
          includeKeywords: true,
          includeFunctions: false,
          includeTables: false,
          includeColumns: false,
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
          includeColumns: false,
          includeValues: true
        };
        
      default:
        // 默认情况下提供所有类型的建议
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
