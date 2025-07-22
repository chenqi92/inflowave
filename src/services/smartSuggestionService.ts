/**
 * 智能提示服务
 * 根据数据源类型和上下文提供智能提示
 */

import { 
  SuggestionItem, 
  SuggestionContext, 
  DataSourceType,
  SuggestionConfig,
  DEFAULT_SUGGESTION_CONFIG,
  SUGGESTION_PRIORITY,
  INSERT_TEXT_RULES
} from '@/utils/suggestionTypes';
import { safeTauriInvoke } from '@/utils/tauri';

// 导入关键字和函数列表
const INFLUXQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
  'SHOW', 'DATABASES', 'MEASUREMENTS', 'SERIES', 'FIELD', 'KEYS', 'TAG',
  'VALUES', 'RETENTION', 'POLICIES', 'CONTINUOUS', 'QUERIES', 'USERS',
  'CREATE', 'DROP', 'ALTER', 'GRANT', 'REVOKE', 'AND', 'OR', 'NOT',
  'LIKE', 'REGEXP', 'IN', 'BETWEEN', 'IS', 'NULL', 'ASC', 'DESC',
  'DISTINCT', 'AS', 'INTO', 'FILL', 'TIME', 'NOW'
];

const INFLUXQL_FUNCTIONS = [
  'COUNT', 'DISTINCT', 'INTEGRAL', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD',
  'STDDEV', 'SUM', 'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE',
  'SAMPLE', 'TOP', 'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL',
  'COS', 'CUMULATIVE_SUM', 'DERIVATIVE', 'DIFFERENCE', 'EXP', 'FLOOR',
  'HISTOGRAM', 'LN', 'LOG', 'LOG2', 'LOG10', 'MOVING_AVERAGE',
  'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE', 'POW', 'ROUND',
  'SIN', 'SQRT', 'TAN', 'HOLT_WINTERS', 'CHANDE_MOMENTUM_OSCILLATOR',
  'EXPONENTIAL_MOVING_AVERAGE', 'DOUBLE_EXPONENTIAL_MOVING_AVERAGE',
  'KAUFMANS_EFFICIENCY_RATIO', 'KAUFMANS_ADAPTIVE_MOVING_AVERAGE',
  'TRIPLE_EXPONENTIAL_MOVING_AVERAGE', 'TRIPLE_EXPONENTIAL_DERIVATIVE',
  'RELATIVE_STRENGTH_INDEX'
];

const FLUX_FUNCTIONS = [
  'from', 'range', 'filter', 'group', 'sort', 'limit', 'map', 'reduce',
  'aggregateWindow', 'mean', 'sum', 'count', 'min', 'max', 'first', 'last',
  'median', 'mode', 'stddev', 'derivative', 'difference', 'increase',
  'rate', 'histogram', 'quantile', 'skew', 'spread', 'covariance',
  'correlation', 'pearsonr', 'join', 'union', 'pivot', 'duplicate',
  'drop', 'keep', 'rename', 'set', 'toString', 'toInt', 'toFloat',
  'toBool', 'toTime', 'yield', 'stop', 'debug', 'elapsed', 'timeShift',
  'fill', 'interpolate', 'window', 'cumulativeSum', 'movingAverage',
  'exponentialMovingAverage', 'doubleEMA', 'tripleEMA', 'kaufmansER',
  'kaufmansAMA', 'relativeStrengthIndex', 'chandeMomentumOscillator'
];

const COMMON_SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT',
  'OFFSET', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
  'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'CREATE', 'ALTER', 'DROP',
  'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'INDEX', 'VIEW', 'PROCEDURE',
  'FUNCTION', 'TRIGGER', 'DATABASE', 'TABLE', 'COLUMN', 'CONSTRAINT',
  'PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'NOT NULL', 'DEFAULT', 'CHECK',
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC'
];

export class SmartSuggestionService {
  private cache: Map<string, string[]> = new Map();
  private config: SuggestionConfig = DEFAULT_SUGGESTION_CONFIG;

  constructor(config?: Partial<SuggestionConfig>) {
    if (config) {
      this.config = { ...DEFAULT_SUGGESTION_CONFIG, ...config };
    }
  }

  /**
   * 获取智能提示
   */
  async getSuggestions(
    connectionId: string,
    database: string,
    context: SuggestionContext,
    dataSourceType: DataSourceType
  ): Promise<SuggestionItem[]> {
    const suggestions: SuggestionItem[] = [];

    // 如果输入字符数不足，不显示提示
    if (context.wordBeforeCursor.length < this.config.minChars) {
      return [];
    }

    try {
      // 添加关键字
      this.addKeywords(suggestions, dataSourceType);

      // 添加函数
      this.addFunctions(suggestions, dataSourceType);

      // 添加表名（在FROM子句后或者独立使用时）
      if (this.shouldSuggestTables(context)) {
        await this.addTables(suggestions, connectionId, database);
      }

      // 添加字段和标签（在SELECT子句或WHERE子句中）
      if (this.shouldSuggestFieldsOrTags(context)) {
        const tableName = this.extractTableName(context);
        if (tableName) {
          await this.addFieldsAndTags(suggestions, connectionId, database, tableName);
        }
      }

      // 过滤和排序
      return this.filterAndSort(suggestions, context.wordBeforeCursor);
    } catch (error) {
      console.warn('获取智能提示失败:', error);
      return [];
    }
  }

  /**
   * 添加关键字提示
   */
  private addKeywords(suggestions: SuggestionItem[], dataSourceType: DataSourceType) {
    let keywords: string[] = [];

    switch (dataSourceType) {
      case '1.x':
        keywords = INFLUXQL_KEYWORDS;
        break;
      case '2.x':
      case '3.x':
        keywords = [...COMMON_SQL_KEYWORDS, 'BUCKET', 'ORGANIZATION', 'TOKEN'];
        break;
      default:
        keywords = COMMON_SQL_KEYWORDS;
        break;
    }

    keywords.forEach(keyword => {
      suggestions.push({
        label: keyword,
        value: keyword,
        type: 'keyword',
        detail: '关键字',
        documentation: `SQL关键字: ${keyword}`,
        priority: SUGGESTION_PRIORITY.KEYWORD,
        sortText: `0_${keyword}`,
      });
    });
  }

  /**
   * 添加函数提示
   */
  private addFunctions(suggestions: SuggestionItem[], dataSourceType: DataSourceType) {
    let functions: string[] = [];

    switch (dataSourceType) {
      case '1.x':
        functions = INFLUXQL_FUNCTIONS;
        break;
      case '2.x':
      case '3.x':
        functions = FLUX_FUNCTIONS;
        break;
      default:
        functions = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT'];
        break;
    }

    functions.forEach(func => {
      const insertText = this.getFunctionInsertText(func, dataSourceType);
      suggestions.push({
        label: func,
        value: func,
        type: 'function',
        detail: '函数',
        documentation: this.getFunctionDocumentation(func, dataSourceType),
        insertText: insertText,
        insertTextRules: insertText.includes('$') ? INSERT_TEXT_RULES.INSERT_AS_SNIPPET : INSERT_TEXT_RULES.NONE,
        priority: SUGGESTION_PRIORITY.FUNCTION,
        sortText: `1_${func}`,
      });
    });
  }

  /**
   * 添加表名提示
   */
  private async addTables(suggestions: SuggestionItem[], connectionId: string, database: string) {
    try {
      const cacheKey = `tables_${connectionId}_${database}`;
      let tables = this.cache.get(cacheKey);

      if (!tables) {
        // 尝试获取表名/测量名
        try {
          tables = await safeTauriInvoke<string[]>('get_query_suggestions', {
            connectionId,
            database,
            partialQuery: '',
          });
        } catch (apiError) {
          console.warn('API获取表名失败，使用备用方法:', apiError);
          // 如果API失败，尝试其他方法获取表名
          tables = await this.getTablesAlternative(connectionId, database);
        }

        if (tables && tables.length > 0) {
          this.cache.set(cacheKey, tables);
          // 设置缓存过期时间（5分钟）
          setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        }
      }

      if (tables && tables.length > 0) {
        tables.forEach(table => {
          // 过滤掉关键字，只保留真实的表名
          if (this.isValidTableName(table)) {
            suggestions.push({
              label: table,
              value: `"${table}"`,
              type: 'table',
              detail: '表/测量',
              documentation: `数据库 ${database} 中的表: ${table}`,
              priority: SUGGESTION_PRIORITY.TABLE,
              sortText: `2_${table}`,
            });
          }
        });
      }

      // 添加数据库提示
      if (database) {
        suggestions.push({
          label: database,
          value: `"${database}"`,
          type: 'database',
          detail: '数据库',
          documentation: `当前选择的数据库: ${database}`,
          priority: SUGGESTION_PRIORITY.DATABASE,
          sortText: `6_${database}`,
        });
      }
    } catch (error) {
      console.warn('获取表名失败:', error);
    }
  }

  /**
   * 备用方法获取表名
   */
  private async getTablesAlternative(connectionId: string, database: string): Promise<string[]> {
    try {
      // 尝试执行SHOW MEASUREMENTS查询获取表名
      const result = await safeTauriInvoke<any>('execute_query', {
        connectionId,
        database,
        query: 'SHOW MEASUREMENTS',
      });

      if (result && result.data && Array.isArray(result.data)) {
        return result.data.map((row: any) => row.name || row.measurement || row[0]).filter(Boolean);
      }
    } catch (error) {
      console.warn('备用方法获取表名失败:', error);
    }
    return [];
  }

  /**
   * 验证是否为有效的表名
   */
  private isValidTableName(name: string): boolean {
    if (!name || typeof name !== 'string') return false;

    // 过滤掉SQL关键字
    const sqlKeywords = new Set([
      'FROM', 'SELECT', 'WHERE', 'GROUP', 'ORDER', 'BY', 'LIMIT', 'OFFSET',
      'SHOW', 'MEASUREMENTS', 'SERIES', 'DATABASES', 'FIELD', 'KEYS', 'TAG',
      'VALUES', 'CREATE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE'
    ]);

    return !sqlKeywords.has(name.toUpperCase());
  }

  /**
   * 添加字段和标签提示
   */
  private async addFieldsAndTags(
    suggestions: SuggestionItem[], 
    connectionId: string, 
    database: string, 
    tableName: string
  ) {
    try {
      // 这里可以调用后端API获取字段和标签信息
      // 暂时添加一些常见的字段名
      const commonFields = ['time', 'value', 'host', 'region', 'cpu', 'memory', 'disk'];
      const commonTags = ['host', 'region', 'datacenter', 'environment', 'service'];

      commonFields.forEach(field => {
        suggestions.push({
          label: field,
          value: field,
          type: 'field',
          detail: '字段',
          documentation: `字段: ${field}`,
          priority: SUGGESTION_PRIORITY.FIELD,
          sortText: `3_${field}`,
        });
      });

      commonTags.forEach(tag => {
        suggestions.push({
          label: tag,
          value: tag,
          type: 'tag',
          detail: '标签',
          documentation: `标签: ${tag}`,
          priority: SUGGESTION_PRIORITY.TAG,
          sortText: `4_${tag}`,
        });
      });
    } catch (error) {
      console.warn('获取字段和标签失败:', error);
    }
  }

  /**
   * 判断是否应该提示表名
   */
  private shouldSuggestTables(context: SuggestionContext): boolean {
    const lineText = context.lineText.toUpperCase();
    const text = context.text.toUpperCase();

    // 检查是否在FROM关键字后面
    const fromMatch = lineText.match(/\bFROM\s+$/i);
    const isDirectlyAfterFrom = fromMatch !== null;

    // 检查是否在FROM子句中但还没有表名
    const fromWithoutTable = lineText.match(/\bFROM\s*$/i);
    const isInFromClause = fromWithoutTable !== null;

    // 检查是否在SHOW MEASUREMENTS语句中
    const isShowMeasurements = lineText.includes('SHOW MEASUREMENTS') ||
                               lineText.includes('SHOW SERIES') ||
                               lineText.includes('SHOW TABLES');

    // 检查是否在查询开始位置且没有其他关键字
    const isQueryStart = context.lineText.trim().length === 0 &&
                         !lineText.includes('SELECT') &&
                         !lineText.includes('SHOW');

    // 检查是否在INTO子句后
    const isAfterInto = lineText.match(/\bINTO\s+$/i) !== null;

    return isDirectlyAfterFrom || isInFromClause || isShowMeasurements || isQueryStart || isAfterInto;
  }

  /**
   * 判断是否应该提示字段或标签
   */
  private shouldSuggestFieldsOrTags(context: SuggestionContext): boolean {
    const lineText = context.lineText.toUpperCase();
    return lineText.includes('SELECT') || lineText.includes('WHERE') || lineText.includes('GROUP BY');
  }

  /**
   * 从上下文中提取表名
   */
  private extractTableName(context: SuggestionContext): string | null {
    const text = context.text.toUpperCase();
    const fromMatch = text.match(/FROM\s+["`]?(\w+)["`]?/);
    return fromMatch ? fromMatch[1] : null;
  }

  /**
   * 获取函数插入文本
   */
  private getFunctionInsertText(func: string, dataSourceType: DataSourceType): string {
    // 为常用函数添加参数占位符
    const functionsWithParams = {
      'COUNT': 'COUNT($1)',
      'SUM': 'SUM($1)',
      'AVG': 'AVG($1)',
      'MIN': 'MIN($1)',
      'MAX': 'MAX($1)',
      'MEAN': 'MEAN($1)',
      'TOP': 'TOP($1, $2)',
      'BOTTOM': 'BOTTOM($1, $2)',
      'PERCENTILE': 'PERCENTILE($1, $2)',
    };

    return functionsWithParams[func] || `${func}()`;
  }

  /**
   * 获取函数文档
   */
  private getFunctionDocumentation(func: string, dataSourceType: DataSourceType): string {
    const docs = {
      'COUNT': '计算非空值的数量',
      'SUM': '计算数值字段的总和',
      'AVG': '计算数值字段的平均值',
      'MIN': '返回字段的最小值',
      'MAX': '返回字段的最大值',
      'MEAN': '计算数值字段的平均值',
      'TOP': '返回字段的前N个最大值',
      'BOTTOM': '返回字段的前N个最小值',
      'PERCENTILE': '计算字段的百分位数',
    };

    return docs[func] || `函数: ${func}`;
  }

  /**
   * 过滤和排序提示项
   */
  private filterAndSort(suggestions: SuggestionItem[], query: string): SuggestionItem[] {
    if (!query) {
      return suggestions.slice(0, this.config.maxItems);
    }

    const filtered = suggestions.filter(item => {
      if (this.config.caseSensitive) {
        return item.label.includes(query);
      } else {
        return item.label.toLowerCase().includes(query.toLowerCase());
      }
    });

    // 按优先级和匹配度排序
    filtered.sort((a, b) => {
      // 首先按优先级排序
      const priorityDiff = (a.priority || 999) - (b.priority || 999);
      if (priorityDiff !== 0) return priorityDiff;

      // 然后按匹配度排序（前缀匹配优先）
      const aStartsWith = a.label.toLowerCase().startsWith(query.toLowerCase());
      const bStartsWith = b.label.toLowerCase().startsWith(query.toLowerCase());
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // 最后按字母顺序排序
      return a.label.localeCompare(b.label);
    });

    return filtered.slice(0, this.config.maxItems);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 导出单例
export const smartSuggestionService = new SmartSuggestionService();
