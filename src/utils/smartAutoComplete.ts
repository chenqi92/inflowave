/**
 * 智能自动补全引擎
 * 基于上下文的 InfluxDB SQL 智能提示系统
 */

import { safeTauriInvoke } from '@/utils/tauri';
import type { Measurement, Field, Tag } from '@/types';

// 自动补全建议项
export interface SmartSuggestion {
  label: string;
  insertText: string;
  type: 'keyword' | 'function' | 'database' | 'measurement' | 'field' | 'tag' | 'template' | 'operator' | 'value';
  priority: number;
  description?: string;
  documentation?: string;
  snippet?: boolean;
}

// SQL 语法状态
export interface SQLParseState {
  // 查询类型
  queryType: 'SELECT' | 'SHOW' | 'INSERT' | 'CREATE' | 'DROP' | 'ALTER' | 'UNKNOWN';
  
  // 当前所在的子句
  currentClause: 'SELECT' | 'FROM' | 'WHERE' | 'GROUP_BY' | 'ORDER_BY' | 'LIMIT' | 'INTO' | 'VALUES' | 'SHOW' | 'UNKNOWN';
  
  // 已解析的组件
  selectedFields: string[];
  fromTables: string[];
  whereConditions: string[];
  
  // 当前输入状态
  currentToken: string;
  previousToken: string;
  nextExpected: 'keyword' | 'identifier' | 'value' | 'operator' | 'field' | 'table' | 'function';
  
  // 上下文信息
  currentDatabase?: string;
  currentMeasurement?: string;
  
  // 位置信息
  cursorPosition: number;
  lineText: string;
  beforeCursor: string;
  afterCursor: string;
}

// InfluxDB 关键词定义
const INFLUXDB_KEYWORDS = {
  // 查询关键词
  QUERY_KEYWORDS: [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
    'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'AS',
    'ASC', 'DESC', 'DISTINCT', 'FILL', 'SLIMIT', 'SOFFSET'
  ],
  
  // 管理关键词
  ADMIN_KEYWORDS: [
    'SHOW', 'CREATE', 'DROP', 'ALTER', 'INSERT', 'DELETE', 'GRANT', 'REVOKE',
    'DATABASE', 'DATABASES', 'MEASUREMENT', 'MEASUREMENTS', 'SERIES',
    'RETENTION POLICY', 'CONTINUOUS QUERY', 'USER', 'USERS'
  ],
  
  // 时间关键词
  TIME_KEYWORDS: [
    'NOW', 'TIME', 'DURATION', 'AGO'
  ],
  
  // 聚合函数
  AGGREGATE_FUNCTIONS: [
    'COUNT', 'SUM', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV',
    'MIN', 'MAX', 'FIRST', 'LAST', 'DISTINCT', 'INTEGRAL',
    'PERCENTILE', 'SAMPLE', 'TOP', 'BOTTOM'
  ],
  
  // 转换函数
  TRANSFORM_FUNCTIONS: [
    'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS', 'EXP',
    'FLOOR', 'LN', 'LOG', 'LOG2', 'LOG10', 'POW', 'ROUND', 'SIN',
    'SQRT', 'TAN', 'DERIVATIVE', 'DIFFERENCE', 'MOVING_AVERAGE',
    'CUMULATIVE_SUM', 'NON_NEGATIVE_DERIVATIVE', 'NON_NEGATIVE_DIFFERENCE'
  ]
};

// 操作符定义
const OPERATORS = [
  { op: '=', desc: '等于' },
  { op: '!=', desc: '不等于' },
  { op: '<>', desc: '不等于' },
  { op: '>', desc: '大于' },
  { op: '>=', desc: '大于等于' },
  { op: '<', desc: '小于' },
  { op: '<=', desc: '小于等于' },
  { op: '=~', desc: '正则匹配' },
  { op: '!~', desc: '正则不匹配' },
  { op: 'AND', desc: '逻辑与' },
  { op: 'OR', desc: '逻辑或' },
  { op: 'NOT', desc: '逻辑非' }
];

class SmartAutoCompleteEngine {
  private databaseCache = new Map<string, string[]>(); // 数据库 -> 测量名列表
  private measurementCache = new Map<string, { fields: Field[], tags: Tag[] }>(); // 数据库.测量名 -> 字段和标签

  /**
   * 解析 SQL 状态
   */
  private parseSQL(text: string, cursorPosition: number): SQLParseState {
    const lineText = text;
    const beforeCursor = text.substring(0, cursorPosition).trim();
    const afterCursor = text.substring(cursorPosition).trim();
    
    // 规范化文本（转大写，简化分析）
    const normalizedText = beforeCursor.toUpperCase();
    
    // 分词
    const tokens = this.tokenize(beforeCursor);
    const currentToken = this.getCurrentToken(beforeCursor, cursorPosition);
    const previousToken = tokens.length > 1 ? tokens[tokens.length - 2] : '';
    
    // 确定查询类型
    const queryType = this.determineQueryType(normalizedText);
    
    // 确定当前子句
    const currentClause = this.determineCurrentClause(normalizedText);
    
    // 解析已有组件
    const selectedFields = this.extractSelectedFields(normalizedText);
    const fromTables = this.extractFromTables(normalizedText);
    const whereConditions = this.extractWhereConditions(normalizedText);
    
    // 确定下一个期望的输入类型
    const nextExpected = this.determineNextExpected(normalizedText, currentClause, currentToken, previousToken);
    
    return {
      queryType,
      currentClause,
      selectedFields,
      fromTables,
      whereConditions,
      currentToken,
      previousToken,
      nextExpected,
      currentMeasurement: fromTables[0] || undefined,
      cursorPosition,
      lineText,
      beforeCursor,
      afterCursor
    };
  }

  /**
   * 分词器
   */
  private tokenize(text: string): string[] {
    // 移除多余空格，按空格、逗号、括号等分割
    return text
      .replace(/\s+/g, ' ')
      .replace(/([(),])/g, ' $1 ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  /**
   * 获取当前输入的词
   */
  private getCurrentToken(text: string, position: number): string {
    const beforeCursor = text.substring(0, position);
    const match = beforeCursor.match(/(\w+)$/);
    return match ? match[1] : '';
  }

  /**
   * 确定查询类型
   */
  private determineQueryType(text: string): SQLParseState['queryType'] {
    if (text.startsWith('SELECT')) return 'SELECT';
    if (text.startsWith('SHOW')) return 'SHOW';
    if (text.startsWith('INSERT')) return 'INSERT';
    if (text.startsWith('CREATE')) return 'CREATE';
    if (text.startsWith('DROP')) return 'DROP';
    if (text.startsWith('ALTER')) return 'ALTER';
    return 'UNKNOWN';
  }

  /**
   * 确定当前子句
   */
  private determineCurrentClause(text: string): SQLParseState['currentClause'] {
    // 按照SQL执行顺序检查子句
    const clauses = [
      { keyword: 'ORDER BY', clause: 'ORDER_BY' as const },
      { keyword: 'GROUP BY', clause: 'GROUP_BY' as const },
      { keyword: 'WHERE', clause: 'WHERE' as const },
      { keyword: 'FROM', clause: 'FROM' as const },
      { keyword: 'INTO', clause: 'INTO' as const },
      { keyword: 'VALUES', clause: 'VALUES' as const },
      { keyword: 'SELECT', clause: 'SELECT' as const },
      { keyword: 'SHOW', clause: 'SHOW' as const },
      { keyword: 'LIMIT', clause: 'LIMIT' as const }
    ];

    for (const { keyword, clause } of clauses) {
      const keywordIndex = text.lastIndexOf(keyword);
      if (keywordIndex !== -1) {
        // 检查是否还有后续的子句关键词
        const afterKeyword = text.substring(keywordIndex + keyword.length);
        const hasLaterClause = clauses.some(laterClause => 
          laterClause.keyword !== keyword && afterKeyword.includes(laterClause.keyword)
        );
        
        if (!hasLaterClause) {
          return clause;
        }
      }
    }

    return 'UNKNOWN';
  }

  /**
   * 提取已选择的字段
   */
  private extractSelectedFields(text: string): string[] {
    const match = text.match(/SELECT\s+(.*?)(?:\s+FROM|$)/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(field => field.trim().replace(/["']/g, ''))
      .filter(field => field.length > 0);
  }

  /**
   * 提取FROM表名
   */
  private extractFromTables(text: string): string[] {
    const match = text.match(/FROM\s+(.*?)(?:\s+WHERE|\s+GROUP|\s+ORDER|\s+LIMIT|$)/);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(table => table.trim().replace(/["']/g, ''))
      .filter(table => table.length > 0);
  }

  /**
   * 提取WHERE条件
   */
  private extractWhereConditions(text: string): string[] {
    const match = text.match(/WHERE\s+(.*?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/);
    if (!match) return [];
    
    // 简单分割条件（可以进一步改进）
    return match[1]
      .split(/\s+(?:AND|OR)\s+/)
      .map(condition => condition.trim())
      .filter(condition => condition.length > 0);
  }

  /**
   * 确定下一个期望的输入类型
   */
  private determineNextExpected(
    text: string, 
    currentClause: SQLParseState['currentClause'],
    currentToken: string,
    previousToken: string
  ): SQLParseState['nextExpected'] {
    
    // 如果当前没有输入任何内容，期望关键词
    if (!text.trim()) {
      return 'keyword';
    }

    // 检查是否在输入关键词的开始部分
    const potentialKeywords = ['SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'SHOW', 'CREATE', 'DROP', 'INSERT'];
    for (const keyword of potentialKeywords) {
      if (keyword.toLowerCase().startsWith(currentToken.toLowerCase()) && currentToken.length > 0) {
        return 'keyword';
      }
    }

    // 根据当前子句确定期望
    switch (currentClause) {
      case 'SELECT':
        // SELECT 子句中期望字段名或函数
        if (text.endsWith(',') || text.endsWith('SELECT') || text.endsWith('SELECT ') || 
            /SELECT\s+[^,\s]*$/i.test(text)) {
          return 'field';
        }
        return 'field';

      case 'FROM':
        // FROM 子句中期望表名
        if (text.endsWith(',') || text.endsWith('FROM') || text.endsWith('FROM ') ||
            /FROM\s+[^,\s]*$/i.test(text)) {
          return 'table';
        }
        return 'table';

      case 'WHERE':
        // WHERE 子句中可能期望字段、操作符或值
        // 检查最后的表达式
        const whereMatch = text.match(/WHERE\s+(.*)$/i);
        if (whereMatch) {
          const whereExpression = whereMatch[1];
          // 如果最后是字段名，期望操作符
          if (/\w+\s*$/.test(whereExpression) && !/(=|!=|<>|<=|>=|<|>|=~|!~)\s*$/.test(whereExpression)) {
            return 'operator';
          }
          // 如果最后是操作符，期望值
          if (/(=|!=|<>|<=|>=|<|>|=~|!~)\s*$/.test(whereExpression)) {
            return 'value';
          }
          // 如果最后是 AND 或 OR，期望字段
          if (/(AND|OR)\s*$/i.test(whereExpression)) {
            return 'field';
          }
        }
        return 'field';

      case 'GROUP_BY':
      case 'ORDER_BY':
        return 'field';

      case 'SHOW':
        // SHOW 语句后期望特定关键词
        if (/SHOW\s*$/i.test(text)) {
          return 'keyword';
        }
        return 'keyword';

      default:
        // 检查前一个token来确定期望
        const upperPrevious = previousToken.toUpperCase();
        if (['SELECT', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'SHOW'].includes(upperPrevious)) {
          return 'keyword';
        }
        
        // 如果没有明确的上下文，但用户正在输入，猜测期望
        if (currentToken.length > 0) {
          return 'keyword';
        }
        
        return 'keyword';
    }
  }

  /**
   * 更新数据库结构缓存
   */
  async updateDatabaseCache(connectionId: string, database?: string): Promise<void> {
    try {
      // 获取数据库列表
      const databases = await safeTauriInvoke<string[]>('get_databases', { connectionId });
      
      // 为每个数据库获取测量名
      for (const db of databases) {
        try {
          const measurements = await safeTauriInvoke<Measurement[]>('get_measurements', {
            connectionId,
            database: db
          });
          this.databaseCache.set(db, measurements.map(m => m.name));

          // 如果指定了特定数据库，也更新字段信息
          if (database === db) {
            await this.updateMeasurementCache(connectionId, db, measurements);
          }
        } catch (error) {
          console.warn(`Failed to get measurements for database ${db}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to update database cache:', error);
    }
  }

  /**
   * 更新测量结构缓存
   */
  private async updateMeasurementCache(
    connectionId: string,
    database: string,
    measurements: Measurement[]
  ): Promise<void> {
    for (const measurement of measurements) {
      const key = `${database}.${measurement.name}`;
      
      try {
        const [fields, tags] = await Promise.all([
          safeTauriInvoke<Field[]>('get_field_keys', {
            connectionId,
            database,
            measurement: measurement.name
          }),
          safeTauriInvoke<Tag[]>('get_tag_keys', {
            connectionId,
            database,
            measurement: measurement.name
          })
        ]);

        this.measurementCache.set(key, { fields, tags });
      } catch (error) {
        console.warn(`Failed to get fields/tags for ${measurement.name}:`, error);
      }
    }
  }

  /**
   * 生成智能建议
   */
  async generateSuggestions(
    connectionId: string,
    database: string,
    text: string,
    cursorPosition: number
  ): Promise<SmartSuggestion[]> {
    const state = this.parseSQL(text, cursorPosition);
    const suggestions: SmartSuggestion[] = [];

    // 确保有最新的数据库结构
    if (!this.databaseCache.has(database)) {
      await this.updateDatabaseCache(connectionId, database);
    }

    // 根据状态生成建议
    await this.addContextualSuggestions(suggestions, state, database);

    // 排序建议（按优先级）
    suggestions.sort((a, b) => b.priority - a.priority);

    return suggestions;
  }

  /**
   * 添加上下文相关的建议
   */
  private async addContextualSuggestions(
    suggestions: SmartSuggestion[],
    state: SQLParseState,
    database: string
  ): Promise<void> {
    
    // 1. 始终检查关键词匹配（优先级最高）
    this.addKeywordSuggestions(suggestions, state.currentToken);

    // 2. 根据当前期望的类型添加建议
    switch (state.nextExpected) {
      case 'keyword':
        // 关键词已在上面添加
        if (!state.beforeCursor.trim()) {
          this.addQueryTemplates(suggestions);
        }
        break;

      case 'field':
        await this.addFieldSuggestions(suggestions, state, database);
        this.addFunctionSuggestions(suggestions, state.currentToken);
        this.addSpecialFieldSuggestions(suggestions, state);
        break;

      case 'table':
        this.addTableSuggestions(suggestions, database, state.currentToken);
        break;

      case 'operator':
        this.addOperatorSuggestions(suggestions);
        break;

      case 'value':
        this.addValueSuggestions(suggestions, state);
        break;
    }

    // 3. 添加上下文特定的建议
    this.addContextSpecificSuggestions(suggestions, state, database);
  }

  /**
   * 添加关键词建议（支持模糊匹配）
   */
  private addKeywordSuggestions(suggestions: SmartSuggestion[], prefix: string = ''): void {
    const allKeywords = [
      ...INFLUXDB_KEYWORDS.QUERY_KEYWORDS,
      ...INFLUXDB_KEYWORDS.ADMIN_KEYWORDS,
      ...INFLUXDB_KEYWORDS.TIME_KEYWORDS
    ];

    for (const keyword of allKeywords) {
      if (!prefix || keyword.toLowerCase().startsWith(prefix.toLowerCase())) {
        suggestions.push({
          label: keyword,
          insertText: keyword,
          type: 'keyword',
          priority: this.calculateKeywordPriority(keyword, prefix),
          description: `InfluxDB 关键词`,
          documentation: `${keyword} - InfluxDB SQL 关键词`
        });
      }
    }
  }

  /**
   * 计算关键词优先级
   */
  private calculateKeywordPriority(keyword: string, prefix: string): number {
    if (!prefix) return 50;
    
    const lowerKeyword = keyword.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();
    
    // 完全匹配最高优先级
    if (lowerKeyword === lowerPrefix) return 100;
    
    // 前缀匹配较高优先级
    if (lowerKeyword.startsWith(lowerPrefix)) {
      return 90 - (lowerKeyword.length - lowerPrefix.length);
    }
    
    // 包含匹配较低优先级
    if (lowerKeyword.includes(lowerPrefix)) return 60;
    
    return 30;
  }

  /**
   * 添加字段建议
   */
  private async addFieldSuggestions(
    suggestions: SmartSuggestion[],
    state: SQLParseState,
    database: string
  ): Promise<void> {
    const measurement = state.currentMeasurement;
    if (!measurement) return;

    const cacheKey = `${database}.${measurement}`;
    const cachedData = this.measurementCache.get(cacheKey);

    if (cachedData) {
      // 添加字段建议
      for (const field of cachedData.fields) {
        if (!state.currentToken || field.name.toLowerCase().includes(state.currentToken.toLowerCase())) {
          suggestions.push({
            label: field.name,
            insertText: this.needsQuotes(field.name) ? `"${field.name}"` : field.name,
            type: 'field',
            priority: 80,
            description: `字段 (${field.type})`,
            documentation: `字段: ${field.name}\n类型: ${field.type}`
          });
        }
      }

      // 添加标签建议
      for (const tag of cachedData.tags) {
        if (!state.currentToken || tag.name.toLowerCase().includes(state.currentToken.toLowerCase())) {
          suggestions.push({
            label: tag.name,
            insertText: this.needsQuotes(tag.name) ? `"${tag.name}"` : tag.name,
            type: 'tag',
            priority: 75,
            description: `标签`,
            documentation: `标签: ${tag.name}`
          });
        }
      }
    }
  }

  /**
   * 添加函数建议
   */
  private addFunctionSuggestions(suggestions: SmartSuggestion[], prefix: string = ''): void {
    const allFunctions = [
      ...INFLUXDB_KEYWORDS.AGGREGATE_FUNCTIONS,
      ...INFLUXDB_KEYWORDS.TRANSFORM_FUNCTIONS
    ];

    for (const func of allFunctions) {
      if (!prefix || func.toLowerCase().startsWith(prefix.toLowerCase())) {
        suggestions.push({
          label: func,
          insertText: `${func}()`,
          type: 'function',
          priority: 70,
          description: '聚合函数',
          documentation: `${func}() - InfluxDB 聚合函数`,
          snippet: true
        });
      }
    }
  }

  /**
   * 添加特殊字段建议
   */
  private addSpecialFieldSuggestions(suggestions: SmartSuggestion[], state?: SQLParseState): void {
    // 在 SELECT 子句中，"*" 应该有很高的优先级
    const isInSelectClause = state?.currentClause === 'SELECT';
    const starPriority = isInSelectClause ? 98 : 85;
    
    suggestions.push(
      {
        label: '*',
        insertText: '*',
        type: 'field',
        priority: starPriority,
        description: '所有字段',
        documentation: '选择所有字段和标签'
      },
      {
        label: 'time',
        insertText: 'time',
        type: 'field',
        priority: 90,
        description: '时间戳字段',
        documentation: '时间戳字段'
      }
    );
  }

  /**
   * 添加表建议
   */
  private addTableSuggestions(suggestions: SmartSuggestion[], database: string, prefix: string = ''): void {
    const measurements = this.databaseCache.get(database) || [];
    
    for (const measurement of measurements) {
      if (!prefix || measurement.toLowerCase().includes(prefix.toLowerCase())) {
        suggestions.push({
          label: measurement,
          insertText: this.needsQuotes(measurement) ? `"${measurement}"` : measurement,
          type: 'measurement',
          priority: 85,
          description: '测量',
          documentation: `测量: ${measurement}`
        });
      }
    }
  }

  /**
   * 添加操作符建议
   */
  private addOperatorSuggestions(suggestions: SmartSuggestion[]): void {
    for (const { op, desc } of OPERATORS) {
      suggestions.push({
        label: op,
        insertText: ` ${op} `,
        type: 'operator',
        priority: 65,
        description: desc,
        documentation: `${op} - ${desc}`
      });
    }
  }

  /**
   * 添加值建议
   */
  private addValueSuggestions(suggestions: SmartSuggestion[], state: SQLParseState): void {
    // 时间相关值
    if (state.beforeCursor.includes('time')) {
      const timeValues = [
        { label: 'now()', desc: '当前时间' },
        { label: 'now() - 1h', desc: '1小时前' },
        { label: 'now() - 1d', desc: '1天前' },
        { label: 'now() - 1w', desc: '1周前' }
      ];

      for (const { label, desc } of timeValues) {
        suggestions.push({
          label,
          insertText: label,
          type: 'value',
          priority: 70,
          description: desc,
          documentation: `时间值: ${label}`
        });
      }
    }

    // 布尔值
    suggestions.push(
      {
        label: 'true',
        insertText: 'true',
        type: 'value',
        priority: 60,
        description: '布尔值',
        documentation: '布尔值: true'
      },
      {
        label: 'false',
        insertText: 'false',
        type: 'value',
        priority: 60,
        description: '布尔值',
        documentation: '布尔值: false'
      }
    );
  }

  /**
   * 添加上下文特定建议
   */
  private addContextSpecificSuggestions(
    suggestions: SmartSuggestion[],
    state: SQLParseState,
    database: string
  ): void {
    // 根据查询类型添加特定建议
    switch (state.queryType) {
      case 'SELECT':
        this.addSelectSpecificSuggestions(suggestions, state);
        break;
      case 'SHOW':
        this.addShowSpecificSuggestions(suggestions, state);
        break;
    }
  }

  /**
   * 添加 SELECT 特定建议
   */
  private addSelectSpecificSuggestions(suggestions: SmartSuggestion[], state: SQLParseState): void {
    if (state.currentClause === 'SELECT' && state.selectedFields.length === 0) {
      // 如果用户刚输入 SELECT，优先建议 * 和常用字段
      if (state.beforeCursor.trim().toUpperCase() === 'SELECT' || 
          state.beforeCursor.trim().toUpperCase() === 'SELECT ') {
        suggestions.push({
          label: '*',
          insertText: '* ',
          type: 'field',
          priority: 100,
          description: '选择所有字段',
          documentation: '选择所有字段和标签'
        });
      }

      // 建议完整的查询模板
      suggestions.push({
        label: 'SELECT * FROM',
        insertText: 'SELECT * FROM ',
        type: 'template',
        priority: 95,
        description: '基本查询模板',
        documentation: '基本的 SELECT 查询模板',
        snippet: true
      });
    }

    // 在 FROM 后建议添加 WHERE 时间条件
    if (state.fromTables.length > 0 && !state.beforeCursor.toUpperCase().includes('WHERE')) {
      suggestions.push({
        label: 'WHERE time >',
        insertText: ' WHERE time > now() - 1h',
        type: 'template',
        priority: 80,
        description: '时间条件',
        documentation: '添加时间范围条件',
        snippet: true
      });
    }

    // 在 SELECT 后建议 FROM 关键词
    if (state.currentClause === 'SELECT' && !state.beforeCursor.toUpperCase().includes(' FROM')) {
      suggestions.push({
        label: 'FROM',
        insertText: ' FROM ',
        type: 'keyword',
        priority: 85,
        description: 'FROM 子句',
        documentation: '指定查询的测量名'
      });
    }
  }

  /**
   * 添加 SHOW 特定建议
   */
  private addShowSpecificSuggestions(suggestions: SmartSuggestion[], state: SQLParseState): void {
    const showCommands = [
      'DATABASES', 'MEASUREMENTS', 'SERIES', 'FIELD KEYS', 'TAG KEYS', 'TAG VALUES',
      'RETENTION POLICIES', 'CONTINUOUS QUERIES', 'USERS'
    ];

    for (const cmd of showCommands) {
      if (!state.currentToken || cmd.toLowerCase().includes(state.currentToken.toLowerCase())) {
        suggestions.push({
          label: cmd,
          insertText: cmd,
          type: 'keyword',
          priority: 85,
          description: `显示 ${cmd.toLowerCase()}`,
          documentation: `SHOW ${cmd} - 显示${cmd.toLowerCase()}`
        });
      }
    }
  }

  /**
   * 添加查询模板
   */
  private addQueryTemplates(suggestions: SmartSuggestion[]): void {
    const templates = [
      {
        label: 'SELECT 基本查询',
        insertText: 'SELECT * FROM "${1:measurement}" WHERE time > now() - ${2:1h}',
        description: '基本查询模板',
        priority: 90
      },
      {
        label: 'SELECT 聚合查询',
        insertText: 'SELECT ${1:MEAN}(${2:field}) FROM "${3:measurement}" WHERE time > now() - ${4:1h} GROUP BY time(${5:5m})${6: fill(null)}',
        description: '聚合查询模板',
        priority: 85
      },
      {
        label: 'SHOW MEASUREMENTS',
        insertText: 'SHOW MEASUREMENTS',
        description: '显示所有测量',
        priority: 80
      },
      {
        label: 'SHOW FIELD KEYS',
        insertText: 'SHOW FIELD KEYS FROM "${1:measurement}"',
        description: '显示字段列表',
        priority: 75
      }
    ];

    for (const template of templates) {
      suggestions.push({
        label: template.label,
        insertText: template.insertText,
        type: 'template',
        priority: template.priority,
        description: template.description,
        documentation: `模板: ${template.description}`,
        snippet: true
      });
    }
  }

  /**
   * 判断是否需要引号
   */
  private needsQuotes(name: string): boolean {
    return /[^a-zA-Z0-9_]/.test(name) || /^\d/.test(name) || name.includes(' ');
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.databaseCache.clear();
    this.measurementCache.clear();
  }
}

// 导出单例
export const smartAutoCompleteEngine = new SmartAutoCompleteEngine();
export default smartAutoCompleteEngine;