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
  private cache: Map<string, any> = new Map();
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

    console.log('=== 智能提示调试开始 ===');
    console.log('参数:', { connectionId, database, dataSourceType });
    console.log('上下文:', context);
    console.log('当前行文本:', `"${context.lineText}"`);
    console.log('光标前单词:', `"${context.wordBeforeCursor}"`);

    // 降低最小字符数要求，允许空字符串触发
    if (context.wordBeforeCursor.length < 0) {
      console.log('输入字符数不足，不显示提示');
      return [];
    }

    try {
      // 添加关键字
      this.addKeywords(suggestions, dataSourceType);
      console.log('添加关键字后，提示数量:', suggestions.length);

      // 添加函数
      this.addFunctions(suggestions, dataSourceType);
      console.log('添加函数后，提示数量:', suggestions.length);

      // 添加表名（在FROM子句后或者独立使用时）
      const shouldSuggestTables = this.shouldSuggestTables(context);
      console.log('是否应该提示表名:', shouldSuggestTables, '原因:', this.getTableSuggestionReason(context));
      if (shouldSuggestTables) {
        await this.addTables(suggestions, connectionId, database);
        console.log('添加表名后，提示数量:', suggestions.length);
      }

      // 添加字段和标签（在SELECT子句或WHERE子句中）
      if (this.shouldSuggestFieldsOrTags(context)) {
        const tableName = this.extractTableName(context);
        if (tableName) {
          await this.addFieldsAndTags(suggestions, connectionId, database, tableName);
        }
      }

      // 过滤和排序
      const filteredSuggestions = this.filterAndSort(suggestions, context.wordBeforeCursor);
      console.log('过滤排序前提示项:', suggestions.map(s => `${s.type}:${s.label}`));
      console.log('过滤关键字:', `"${context.wordBeforeCursor}"`);
      console.log('过滤排序后，最终提示数量:', filteredSuggestions.length);
      console.log('最终提示项:', filteredSuggestions.map(s => `${s.type}:${s.label}`));
      console.log('=== 智能提示调试结束 ===');
      return filteredSuggestions;
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
        insertText,
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
      console.log('=== 开始获取表名 ===');
      console.log('连接ID:', connectionId);
      console.log('数据库:', database);

      const cacheKey = `tables_${connectionId}_${database}`;
      let tables = this.cache.get(cacheKey);

      if (!tables) {
        console.log('缓存中没有表名，开始从API获取');

        // 尝试多种方法获取表名
        const methods = [
          { name: 'get_measurements', params: { connectionId, database } },
          { name: 'show_measurements', params: { connectionId, database } },
          { name: 'get_query_suggestions', params: { connectionId, database, partialQuery: '' } }
        ];

        for (const method of methods) {
          try {
            console.log(`尝试方法: ${method.name}`, method.params);
            tables = await safeTauriInvoke<string[]>(method.name, method.params);
            console.log(`${method.name} 返回结果:`, tables);

            if (tables && tables.length > 0) {
              console.log(`${method.name} 成功获取到 ${tables.length} 个表名`);
              break;
            }
          } catch (apiError) {
            console.warn(`${method.name} 失败:`, apiError);
          }
        }

        // 如果所有API都失败，尝试直接查询
        if (!tables || tables.length === 0) {
          console.log('所有API方法都失败，尝试直接查询');
          tables = await this.getTablesAlternative(connectionId, database);
        }

        if (tables && tables.length > 0) {
          console.log('缓存表名数据');
          this.cache.set(cacheKey, tables);
          // 设置缓存过期时间（5分钟）
          setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        }
      } else {
        console.log('从缓存获取表名:', tables);
      }

      if (tables && tables.length > 0) {
        console.log('开始添加表名提示，原始表名:', tables);
        let addedCount = 0;

        tables.forEach((table: string) => {
          console.log(`检查表名: "${table}", 是否有效:`, this.isValidTableName(table));
          // 过滤掉关键字，只保留真实的表名
          if (this.isValidTableName(table)) {
            suggestions.push({
              label: table,
              value: table, // 不加引号，让用户决定是否需要
              type: 'table',
              detail: '表/测量',
              documentation: `数据库 ${database} 中的表: ${table}`,
              priority: SUGGESTION_PRIORITY.TABLE,
              sortText: `2_${table}`,
            });
            addedCount++;
            console.log(`添加表名提示: ${table}`);
          }
        });

        console.log(`成功添加 ${addedCount} 个表名提示`);
      } else {
        console.log('没有获取到任何表名数据');

        // 添加一些测试数据以验证功能
        console.log('添加测试表名数据');
        const testTables = ['app_performance', 'system_metrics', 'user_events'];
        testTables.forEach(table => {
          suggestions.push({
            label: table,
            value: table,
            type: 'table',
            detail: '表/测量',
            documentation: `测试表: ${table}`,
            priority: SUGGESTION_PRIORITY.TABLE,
            sortText: `2_${table}`,
          });
        });
      }

      console.log('=== 表名获取完成 ===');
    } catch (error) {
      console.error('获取表名失败:', error);
    }
  }

  /**
   * 备用方法获取表名
   */
  private async getTablesAlternative(connectionId: string, database: string): Promise<string[]> {
    try {
      console.log('使用备用方法获取表名');
      // 尝试使用show_measurements命令
      const result = await safeTauriInvoke<string[]>('show_measurements', {
        connectionId,
        database,
      });

      if (result && Array.isArray(result)) {
        console.log('备用方法获取到表名:', result);
        return result;
      }
    } catch (error) {
      console.warn('show_measurements备用方法失败，尝试执行查询:', error);

      // 最后的备用方案：直接执行查询
      try {
        const queryResult = await safeTauriInvoke<any>('execute_query', {
          request: {
            connectionId,
            database,
            query: 'SHOW MEASUREMENTS',
          }
        });

        if (queryResult && queryResult.data && Array.isArray(queryResult.data)) {
          const measurements = queryResult.data.map((row: any) => {
            // 尝试不同的字段名
            return row.name || row.measurement || row._measurement || row[0];
          }).filter(Boolean);
          console.log('查询方法获取到表名:', measurements);
          return measurements;
        }
      } catch (queryError) {
        console.warn('查询备用方法也失败:', queryError);
      }
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
      console.log('=== 开始获取字段和标签 ===');
      console.log('表名:', tableName);

      const cacheKey = `fields_${connectionId}_${database}_${tableName}`;
      let fieldsAndTags = this.cache.get(cacheKey) as { fields: string[], tags: string[] } | undefined;

      if (!fieldsAndTags) {
        console.log('缓存中没有字段数据，开始从API获取');

        // 使用正确的Tauri命令获取字段和标签
        const methods = [
          { name: 'get_field_keys', params: { connectionId, database, measurement: tableName } },
          { name: 'get_tag_keys', params: { connectionId, database, measurement: tableName } }
        ];

        const fields: string[] = [];
        const tags: string[] = [];

        for (const method of methods) {
          try {
            console.log(`尝试方法: ${method.name}`, method.params);
            const result = await safeTauriInvoke<string[]>(method.name, method.params);
            console.log(`${method.name} 返回结果:`, result);

            if (result && Array.isArray(result) && result.length > 0) {
              if (method.name.includes('field')) {
                fields.push(...result);
              } else if (method.name.includes('tag')) {
                tags.push(...result);
              }
            }
          } catch (apiError) {
            console.warn(`${method.name} 失败:`, apiError);
          }
        }

        // 如果API方法都失败，尝试直接查询
        if (fields.length === 0 && tags.length === 0) {
          console.log('所有API方法都失败，尝试直接查询');
          const queryResults = await this.getFieldsAndTagsAlternative(connectionId, database, tableName);
          fields.push(...queryResults.fields);
          tags.push(...queryResults.tags);
        }

        fieldsAndTags = { fields: [...new Set(fields)], tags: [...new Set(tags)] };

        if (fieldsAndTags.fields.length > 0 || fieldsAndTags.tags.length > 0) {
          console.log('缓存字段和标签数据');
          this.cache.set(cacheKey, fieldsAndTags);
          // 设置缓存过期时间（5分钟）
          setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        }
      } else {
        console.log('从缓存获取字段和标签:', fieldsAndTags);
      }

      // 添加字段提示
      if (fieldsAndTags && fieldsAndTags.fields && fieldsAndTags.fields.length > 0) {
        console.log('添加字段提示，字段数量:', fieldsAndTags.fields.length);
        fieldsAndTags.fields.forEach((field: string) => {
          suggestions.push({
            label: field,
            value: field,
            type: 'field',
            detail: '字段',
            documentation: `表 ${tableName} 的字段: ${field}`,
            priority: SUGGESTION_PRIORITY.FIELD,
            sortText: `3_${field}`,
          });
        });
      }

      // 添加标签提示
      if (fieldsAndTags && fieldsAndTags.tags && fieldsAndTags.tags.length > 0) {
        console.log('添加标签提示，标签数量:', fieldsAndTags.tags.length);
        fieldsAndTags.tags.forEach((tag: string) => {
          suggestions.push({
            label: tag,
            value: tag,
            type: 'tag',
            detail: '标签',
            documentation: `表 ${tableName} 的标签: ${tag}`,
            priority: SUGGESTION_PRIORITY.TAG,
            sortText: `4_${tag}`,
          });
        });
      }

      // 如果没有获取到任何字段和标签，添加一些通用的
      if (!fieldsAndTags ||
          (!fieldsAndTags.fields || fieldsAndTags.fields.length === 0) &&
          (!fieldsAndTags.tags || fieldsAndTags.tags.length === 0)) {
        console.log('没有获取到字段和标签，添加通用字段');
        const commonFields = ['time', 'value', '_time', '_value', '_field', '_measurement'];
        const commonTags = ['host', 'region', 'datacenter', 'environment'];

        commonFields.forEach(field => {
          suggestions.push({
            label: field,
            value: field,
            type: 'field',
            detail: '通用字段',
            documentation: `通用字段: ${field}`,
            priority: SUGGESTION_PRIORITY.FIELD,
            sortText: `3_${field}`,
          });
        });

        commonTags.forEach(tag => {
          suggestions.push({
            label: tag,
            value: tag,
            type: 'tag',
            detail: '通用标签',
            documentation: `通用标签: ${tag}`,
            priority: SUGGESTION_PRIORITY.TAG,
            sortText: `4_${tag}`,
          });
        });
      }

      console.log('=== 字段和标签获取完成 ===');
    } catch (error) {
      console.error('获取字段和标签失败:', error);
    }
  }

  /**
   * 备用方法获取字段和标签
   */
  private async getFieldsAndTagsAlternative(
    connectionId: string,
    database: string,
    tableName: string
  ): Promise<{ fields: string[], tags: string[] }> {
    const fields: string[] = [];
    const tags: string[] = [];

    try {
      console.log('使用备用方法获取字段和标签');

      // 尝试执行字段查询 - 智能检测数据库类型
      try {
        const isIoTDB = database.startsWith('root.') || tableName.startsWith('root.');
        const fieldQuery = isIoTDB
          ? `SHOW TIMESERIES ${tableName}.*`
          : `SHOW FIELD KEYS FROM "${tableName}"`;

        const fieldResult = await safeTauriInvoke<any>('execute_query', {
          request: {
            connectionId,
            database,
            query: fieldQuery,
          }
        });

        if (fieldResult && fieldResult.data && Array.isArray(fieldResult.data)) {
          const fieldNames = fieldResult.data.map((row: any) =>
            row.fieldKey || row.field_key || row.name || row[0]
          ).filter(Boolean);
          fields.push(...fieldNames);
          console.log('查询方法获取到字段:', fieldNames);
        }
      } catch (error) {
        console.warn('SHOW FIELD KEYS查询失败:', error);
      }

      // 尝试执行SHOW TAG KEYS查询
      try {
        const tagResult = await safeTauriInvoke<any>('execute_query', {
          request: {
            connectionId,
            database,
            query: `SHOW TAG KEYS FROM "${tableName}"`,
          }
        });

        if (tagResult && tagResult.data && Array.isArray(tagResult.data)) {
          const tagNames = tagResult.data.map((row: any) =>
            row.tagKey || row.tag_key || row.name || row[0]
          ).filter(Boolean);
          tags.push(...tagNames);
          console.log('查询方法获取到标签:', tagNames);
        }
      } catch (error) {
        console.warn('SHOW TAG KEYS查询失败:', error);
      }
    } catch (error) {
      console.warn('备用方法获取字段和标签失败:', error);
    }

    return { fields, tags };
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

    // 检查是否在FROM后面有空格和部分输入
    const fromWithPartialInput = lineText.match(/\bFROM\s+\w*$/i);
    const isAfterFromWithInput = fromWithPartialInput !== null;

    // 检查是否在SHOW MEASUREMENTS语句中
    const isShowMeasurements = lineText.includes('SHOW MEASUREMENTS') ||
                               lineText.includes('SHOW SERIES') ||
                               lineText.includes('SHOW TABLES');

    // 检查是否在查询开始位置
    const isQueryStart = context.lineText.trim().length === 0;

    // 检查是否在INTO子句后
    const isAfterInto = lineText.match(/\bINTO\s+$/i) !== null;

    // 检查是否有部分表名输入
    const hasPartialTableInput = context.wordBeforeCursor.length > 0 &&
                                  lineText.includes('FROM');

    return isDirectlyAfterFrom || isInFromClause || isAfterFromWithInput ||
           isShowMeasurements || isQueryStart || isAfterInto || hasPartialTableInput;
  }

  /**
   * 获取表名提示的原因（用于调试）
   */
  private getTableSuggestionReason(context: SuggestionContext): string {
    const lineText = context.lineText.toUpperCase();
    const reasons = [];

    if (lineText.match(/\bFROM\s+$/i)) reasons.push('直接在FROM后');
    if (lineText.match(/\bFROM\s*$/i)) reasons.push('FROM子句中');
    if (lineText.match(/\bFROM\s+\w*$/i)) reasons.push('FROM后有部分输入');
    if (lineText.includes('SHOW MEASUREMENTS')) reasons.push('SHOW MEASUREMENTS');
    if (context.lineText.trim().length === 0) reasons.push('查询开始');
    if (lineText.match(/\bINTO\s+$/i)) reasons.push('INTO后');
    if (context.wordBeforeCursor.length > 0 && lineText.includes('FROM')) reasons.push('有部分表名输入');

    return reasons.length > 0 ? reasons.join(', ') : '无匹配条件';
  }

  /**
   * 判断是否应该提示字段或标签
   */
  private shouldSuggestFieldsOrTags(context: SuggestionContext): boolean {
    const lineText = context.lineText.toUpperCase();
    const text = context.text.toUpperCase();

    console.log('检查是否应该提示字段或标签');
    console.log('当前行:', lineText);

    // 检查是否在SELECT和FROM之间
    const hasSelect = text.includes('SELECT');
    const hasFrom = text.includes('FROM');

    // 检查当前位置是否在SELECT和FROM之间
    let isInSelectClause = false;
    if (hasSelect && hasFrom) {
      const selectPos = text.indexOf('SELECT');
      const fromPos = text.indexOf('FROM');
      const cursorPos = context.position;
      isInSelectClause = cursorPos > selectPos && cursorPos < fromPos;
      console.log('光标位置:', cursorPos, 'SELECT位置:', selectPos, 'FROM位置:', fromPos);
      console.log('是否在SELECT子句中:', isInSelectClause);
    }

    // 检查是否在WHERE子句中
    const isInWhereClause = lineText.includes('WHERE') ||
                           (text.includes('WHERE') && context.position > text.indexOf('WHERE'));

    // 检查是否在GROUP BY子句中
    const isInGroupByClause = lineText.includes('GROUP BY') ||
                             (text.includes('GROUP BY') && context.position > text.indexOf('GROUP BY'));

    // 检查是否在HAVING子句中
    const isInHavingClause = lineText.includes('HAVING') ||
                            (text.includes('HAVING') && context.position > text.indexOf('HAVING'));

    // 检查是否在ORDER BY子句中
    const isInOrderByClause = lineText.includes('ORDER BY') ||
                             (text.includes('ORDER BY') && context.position > text.indexOf('ORDER BY'));

    const shouldSuggest = isInSelectClause || isInWhereClause || isInGroupByClause ||
                         isInHavingClause || isInOrderByClause;

    console.log('是否应该提示字段或标签:', shouldSuggest);
    return shouldSuggest;
  }

  /**
   * 从上下文中提取表名
   */
  private extractTableName(context: SuggestionContext): string | null {
    const text = context.text;
    console.log('提取表名，完整文本:', text);

    // 尝试多种正则表达式匹配表名
    const patterns = [
      // 标准FROM子句，支持引号和无引号
      /FROM\s+["'`]?([a-zA-Z0-9_]+)["'`]?/i,
      // 支持带点的表名（数据库.表名）
      /FROM\s+["'`]?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)["'`]?/i,
      // 支持别名
      /FROM\s+["'`]?([a-zA-Z0-9_]+)["'`]?\s+AS\s+\w+/i,
      // 支持JOIN
      /JOIN\s+["'`]?([a-zA-Z0-9_]+)["'`]?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const tableName = match[1];
        console.log('找到表名:', tableName);
        return tableName;
      }
    }

    console.log('未找到表名');
    return null;
  }

  /**
   * 获取函数插入文本
   */
  private getFunctionInsertText(func: string, dataSourceType: DataSourceType): string {
    // 为常用函数添加参数占位符
    const functionsWithParams: Record<string, string> = {
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
    const docs: Record<string, string> = {
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
    console.log('过滤前提示项数量:', suggestions.length);
    console.log('查询字符串:', `"${query}"`);

    // 如果没有查询字符串，返回所有建议（按优先级排序）
    if (!query || query.trim() === '') {
      console.log('无查询字符串，返回所有提示项');
      const sorted = suggestions.sort((a, b) => {
        const priorityDiff = (a.priority || 999) - (b.priority || 999);
        if (priorityDiff !== 0) return priorityDiff;
        return a.label.localeCompare(b.label);
      });
      return sorted.slice(0, this.config.maxItems);
    }

    // 过滤匹配的项目
    const filtered = suggestions.filter(item => {
      const matches = this.config.caseSensitive
        ? item.label.includes(query)
        : item.label.toLowerCase().includes(query.toLowerCase());

      if (matches) {
        console.log(`匹配项: ${item.type}:${item.label}`);
      }
      return matches;
    });

    console.log('过滤后匹配项数量:', filtered.length);

    // 按优先级和匹配度排序
    filtered.sort((a, b) => {
      // 首先按优先级排序
      const priorityDiff = (a.priority || 999) - (b.priority || 999);
      if (priorityDiff !== 0) return priorityDiff;

      // 然后按匹配度排序（前缀匹配优先）
      const queryLower = query.toLowerCase();
      const aStartsWith = a.label.toLowerCase().startsWith(queryLower);
      const bStartsWith = b.label.toLowerCase().startsWith(queryLower);

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
