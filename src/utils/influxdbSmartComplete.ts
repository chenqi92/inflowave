/**
 * InfluxDB 智能自动补全系统
 * 提供极致用户友好的输入体验，支持所有 InfluxDB 语法
 */

import { safeTauriInvoke } from '@/utils/tauri';
import { DEFAULT_PERFORMANCE_CONFIG } from '@/config/defaults';

// 建议项接口
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

// InfluxDB 完整语法库
const INFLUXDB_SYNTAX = {
  // 基础查询关键词
  BASIC_KEYWORDS: {
    SELECT: { desc: '选择数据', example: 'SELECT * FROM measurement' },
    FROM: { desc: '指定数据源', example: 'FROM "measurement_name"' },
    WHERE: { desc: '过滤条件', example: 'WHERE time > now() - 1h' },
    'GROUP BY': { desc: '分组', example: 'GROUP BY time(5m)' },
    'ORDER BY': { desc: '排序', example: 'ORDER BY time DESC' },
    LIMIT: { desc: '限制结果数量', example: 'LIMIT 100' },
    OFFSET: { desc: '跳过记录', example: 'OFFSET 10' },
    SLIMIT: { desc: '限制序列数量', example: 'SLIMIT 10' },
    SOFFSET: { desc: '跳过序列', example: 'SOFFSET 5' },
  },

  // 管理关键词
  ADMIN_KEYWORDS: {
    SHOW: { desc: '显示信息', example: 'SHOW DATABASES' },
    CREATE: { desc: '创建对象', example: 'CREATE DATABASE mydb' },
    DROP: { desc: '删除对象', example: 'DROP DATABASE mydb' },
    ALTER: { desc: '修改对象', example: 'ALTER RETENTION POLICY' },
    DESCRIBE: { desc: '描述结构', example: 'DESCRIBE measurement' },
    EXPLAIN: { desc: '解释查询计划', example: 'EXPLAIN SELECT * FROM cpu' },
  },

  // SHOW 子命令
  SHOW_COMMANDS: {
    DATABASES: { desc: '显示所有数据库', example: 'SHOW DATABASES' },
    MEASUREMENTS: { desc: '显示测量', example: 'SHOW MEASUREMENTS' },
    SERIES: { desc: '显示序列', example: 'SHOW SERIES' },
    'FIELD KEYS': { desc: '显示字段键', example: 'SHOW FIELD KEYS FROM cpu' },
    'TAG KEYS': { desc: '显示标签键', example: 'SHOW TAG KEYS FROM cpu' },
    'TAG VALUES': {
      desc: '显示标签值',
      example: 'SHOW TAG VALUES FROM cpu WITH KEY = "host"',
    },
    'RETENTION POLICIES': {
      desc: '显示保留策略',
      example: 'SHOW RETENTION POLICIES ON mydb',
    },
    'CONTINUOUS QUERIES': {
      desc: '显示连续查询',
      example: 'SHOW CONTINUOUS QUERIES',
    },
    USERS: { desc: '显示用户', example: 'SHOW USERS' },
    GRANTS: { desc: '显示权限', example: 'SHOW GRANTS FOR myuser' },
    STATS: { desc: '显示统计信息', example: 'SHOW STATS' },
    DIAGNOSTICS: { desc: '显示诊断信息', example: 'SHOW DIAGNOSTICS' },
  },

  // 聚合函数
  AGGREGATE_FUNCTIONS: {
    COUNT: { desc: '计数', example: 'COUNT(field)' },
    SUM: { desc: '求和', example: 'SUM(field)' },
    MEAN: { desc: '平均值', example: 'MEAN(field)' },
    MEDIAN: { desc: '中位数', example: 'MEDIAN(field)' },
    MODE: { desc: '众数', example: 'MODE(field)' },
    SPREAD: { desc: '范围', example: 'SPREAD(field)' },
    STDDEV: { desc: '标准偏差', example: 'STDDEV(field)' },
    MIN: { desc: '最小值', example: 'MIN(field)' },
    MAX: { desc: '最大值', example: 'MAX(field)' },
    FIRST: { desc: '第一个值', example: 'FIRST(field)' },
    LAST: { desc: '最后一个值', example: 'LAST(field)' },
    DISTINCT: { desc: '去重', example: 'DISTINCT(field)' },
    INTEGRAL: { desc: '积分', example: 'INTEGRAL(field)' },
    PERCENTILE: { desc: '百分位数', example: 'PERCENTILE(field, 95)' },
    SAMPLE: { desc: '采样', example: 'SAMPLE(field, 10)' },
    TOP: { desc: '最大的N个值', example: 'TOP(field, 5)' },
    BOTTOM: { desc: '最小的N个值', example: 'BOTTOM(field, 5)' },
  },

  // 选择器函数
  SELECTOR_FUNCTIONS: {
    BOTTOM: { desc: '最小值选择器', example: 'BOTTOM(field, host, 3)' },
    FIRST: { desc: '第一个值选择器', example: 'FIRST(field)' },
    LAST: { desc: '最后一个值选择器', example: 'LAST(field)' },
    MAX: { desc: '最大值选择器', example: 'MAX(field)' },
    MIN: { desc: '最小值选择器', example: 'MIN(field)' },
    PERCENTILE: { desc: '百分位选择器', example: 'PERCENTILE(field, 95)' },
    SAMPLE: { desc: '随机采样选择器', example: 'SAMPLE(field, 3)' },
    TOP: { desc: '最大值选择器', example: 'TOP(field, host, 3)' },
  },

  // 转换函数
  TRANSFORM_FUNCTIONS: {
    ABS: { desc: '绝对值', example: 'ABS(field)' },
    ACOS: { desc: '反余弦', example: 'ACOS(field)' },
    ASIN: { desc: '反正弦', example: 'ASIN(field)' },
    ATAN: { desc: '反正切', example: 'ATAN(field)' },
    ATAN2: { desc: '两参数反正切', example: 'ATAN2(y, x)' },
    CEIL: { desc: '向上取整', example: 'CEIL(field)' },
    COS: { desc: '余弦', example: 'COS(field)' },
    CUMULATIVE_SUM: { desc: '累积和', example: 'CUMULATIVE_SUM(field)' },
    DERIVATIVE: { desc: '导数', example: 'DERIVATIVE(field, 1s)' },
    DIFFERENCE: { desc: '差值', example: 'DIFFERENCE(field)' },
    ELAPSED: { desc: '经过时间', example: 'ELAPSED(field, 1s)' },
    EXP: { desc: '指数', example: 'EXP(field)' },
    FLOOR: { desc: '向下取整', example: 'FLOOR(field)' },
    HISTOGRAM: { desc: '直方图', example: 'HISTOGRAM(field, 0, 100, 10)' },
    LN: { desc: '自然对数', example: 'LN(field)' },
    LOG: { desc: '对数', example: 'LOG(field, 10)' },
    LOG2: { desc: '以2为底的对数', example: 'LOG2(field)' },
    LOG10: { desc: '以10为底的对数', example: 'LOG10(field)' },
    MOVING_AVERAGE: { desc: '移动平均', example: 'MOVING_AVERAGE(field, 5)' },
    NON_NEGATIVE_DERIVATIVE: {
      desc: '非负导数',
      example: 'NON_NEGATIVE_DERIVATIVE(field, 1s)',
    },
    NON_NEGATIVE_DIFFERENCE: {
      desc: '非负差值',
      example: 'NON_NEGATIVE_DIFFERENCE(field)',
    },
    POW: { desc: '幂运算', example: 'POW(field, 2)' },
    ROUND: { desc: '四舍五入', example: 'ROUND(field)' },
    SIN: { desc: '正弦', example: 'SIN(field)' },
    SQRT: { desc: '平方根', example: 'SQRT(field)' },
    TAN: { desc: '正切', example: 'TAN(field)' },
  },

  // 预测函数
  PREDICTION_FUNCTIONS: {
    HOLT_WINTERS: {
      desc: 'Holt-Winters预测',
      example: 'HOLT_WINTERS(field, 10, 4)',
    },
    HOLT_WINTERS_WITH_FIT: {
      desc: 'Holt-Winters带拟合',
      example: 'HOLT_WINTERS_WITH_FIT(field, 10, 4)',
    },
  },

  // 技术分析函数
  TECHNICAL_ANALYSIS: {
    CHANDE_MOMENTUM_OSCILLATOR: {
      desc: 'Chande动量振荡器',
      example: 'CHANDE_MOMENTUM_OSCILLATOR(field, 10)',
    },
    EXPONENTIAL_MOVING_AVERAGE: {
      desc: '指数移动平均',
      example: 'EXPONENTIAL_MOVING_AVERAGE(field, 10)',
    },
    DOUBLE_EXPONENTIAL_MOVING_AVERAGE: {
      desc: '双指数移动平均',
      example: 'DOUBLE_EXPONENTIAL_MOVING_AVERAGE(field, 10)',
    },
    KAUFMANS_EFFICIENCY_RATIO: {
      desc: 'Kaufman效率比率',
      example: 'KAUFMANS_EFFICIENCY_RATIO(field, 10)',
    },
    KAUFMANS_ADAPTIVE_MOVING_AVERAGE: {
      desc: 'Kaufman自适应移动平均',
      example: 'KAUFMANS_ADAPTIVE_MOVING_AVERAGE(field, 10)',
    },
    TRIPLE_EXPONENTIAL_MOVING_AVERAGE: {
      desc: '三重指数移动平均',
      example: 'TRIPLE_EXPONENTIAL_MOVING_AVERAGE(field, 10)',
    },
    TRIPLE_EXPONENTIAL_DERIVATIVE: {
      desc: '三重指数导数',
      example: 'TRIPLE_EXPONENTIAL_DERIVATIVE(field, 10)',
    },
    RELATIVE_STRENGTH_INDEX: {
      desc: '相对强弱指数',
      example: 'RELATIVE_STRENGTH_INDEX(field, 10)',
    },
  },

  // 逻辑操作符
  LOGICAL_OPERATORS: {
    AND: { desc: '逻辑与', example: 'field1 > 0 AND field2 < 100' },
    OR: { desc: '逻辑或', example: 'field1 > 100 OR field2 < 0' },
    NOT: { desc: '逻辑非', example: 'NOT field1 > 100' },
  },

  // 比较操作符
  COMPARISON_OPERATORS: {
    '=': { desc: '等于', example: 'field = "value"' },
    '!=': { desc: '不等于', example: 'field != "value"' },
    '<>': { desc: '不等于(替代)', example: 'field <> "value"' },
    '>': { desc: '大于', example: 'field > 100' },
    '>=': { desc: '大于等于', example: 'field >= 100' },
    '<': { desc: '小于', example: 'field < 100' },
    '<=': { desc: '小于等于', example: 'field <= 100' },
    '=~': { desc: '正则匹配', example: 'field =~ /pattern/' },
    '!~': { desc: '正则不匹配', example: 'field !~ /pattern/' },
  },

  // 时间相关
  TIME_KEYWORDS: {
    NOW: { desc: '当前时间', example: 'time > now() - 1h' },
    TIME: { desc: '时间字段', example: 'time >= "2023-01-01T00:00:00Z"' },
    DURATION: { desc: '时间间隔', example: 'GROUP BY time(5m)' },
    AGO: { desc: '之前', example: 'time > now() - 1h' },
    FILL: { desc: '填充空值', example: 'GROUP BY time(5m) fill(null)' },
    LINEAR: { desc: '线性填充', example: 'fill(linear)' },
    NONE: { desc: '不填充', example: 'fill(none)' },
    NULL: { desc: '空值填充', example: 'fill(null)' },
    PREVIOUS: { desc: '前值填充', example: 'fill(previous)' },
  },

  // 时间单位
  TIME_UNITS: {
    ns: { desc: '纳秒', example: '100ns' },
    u: { desc: '微秒', example: '100u' },
    µ: { desc: '微秒', example: '100µ' },
    ms: { desc: '毫秒', example: '100ms' },
    s: { desc: '秒', example: '30s' },
    m: { desc: '分钟', example: '5m' },
    h: { desc: '小时', example: '1h' },
    d: { desc: '天', example: '7d' },
    w: { desc: '周', example: '2w' },
  },

  // 特殊值
  SPECIAL_VALUES: {
    NULL: { desc: '空值', example: 'field IS NULL' },
    TRUE: { desc: '布尔真值', example: 'active = true' },
    FALSE: { desc: '布尔假值', example: 'active = false' },
    '*': { desc: '通配符/所有字段', example: 'SELECT *' },
  },

  // 数据写入
  INSERT_KEYWORDS: {
    INSERT: {
      desc: '插入数据',
      example: 'INSERT INTO measurement VALUES (...)',
    },
    INTO: { desc: '插入目标', example: 'INTO measurement' },
    VALUES: { desc: '插入值', example: 'VALUES (time, field1, field2)' },
  },

  // 数据库管理
  DATABASE_MANAGEMENT: {
    DATABASE: { desc: '数据库', example: 'CREATE DATABASE mydb' },
    'RETENTION POLICY': {
      desc: '保留策略',
      example: 'CREATE RETENTION POLICY "policy" ON "db"',
    },
    'CONTINUOUS QUERY': {
      desc: '连续查询',
      example: 'CREATE CONTINUOUS QUERY "cq" ON "db"',
    },
    USER: {
      desc: '用户',
      example: 'CREATE USER "username" WITH PASSWORD "password"',
    },
    SUBSCRIPTION: {
      desc: '订阅',
      example: 'CREATE SUBSCRIPTION "sub" ON "db"."rp"',
    },
  },

  // 权限管理
  PRIVILEGE_KEYWORDS: {
    GRANT: { desc: '授予权限', example: 'GRANT READ ON "db" TO "user"' },
    REVOKE: { desc: '撤销权限', example: 'REVOKE READ ON "db" FROM "user"' },
    ALL: { desc: '所有权限', example: 'GRANT ALL ON "db" TO "user"' },
    READ: { desc: '读权限', example: 'GRANT READ ON "db" TO "user"' },
    WRITE: { desc: '写权限', example: 'GRANT WRITE ON "db" TO "user"' },
    ADMIN: { desc: '管理员权限', example: 'GRANT ALL PRIVILEGES TO "admin"' },
  },
};

// 查询模板
const QUERY_TEMPLATES = [
  {
    label: '基础查询',
    insertText:
      'SELECT ${1:*} FROM "${2:measurement}" WHERE time > now() - ${3:1h}',
    description: '基本的时间范围查询',
    category: 'query',
  },
  {
    label: '聚合查询',
    insertText:
      'SELECT ${1:MEAN}(${2:field}) FROM "${3:measurement}" WHERE time > now() - ${4:1h} GROUP BY time(${5:5m})${6: fill(null)}',
    description: '时间聚合查询',
    category: 'query',
  },
  {
    label: '分组查询',
    insertText:
      'SELECT ${1:field} FROM "${2:measurement}" WHERE time > now() - ${3:1h} GROUP BY ${4:tag}',
    description: '按标签分组查询',
    category: 'query',
  },
  {
    label: '多字段查询',
    insertText:
      'SELECT ${1:field1}, ${2:field2}, ${3:field3} FROM "${4:measurement}" WHERE time > now() - ${5:1h} LIMIT ${6:100}',
    description: '多字段数据查询',
    category: 'query',
  },
  {
    label: '条件过滤查询',
    insertText:
      'SELECT * FROM "${1:measurement}" WHERE time > now() - ${2:1h} AND ${3:field} ${4:>} ${5:value}',
    description: '带条件过滤的查询',
    category: 'query',
  },
  {
    label: '排序查询',
    insertText:
      'SELECT * FROM "${1:measurement}" WHERE time > now() - ${2:1h} ORDER BY time ${3:DESC} LIMIT ${4:100}',
    description: '排序后的结果查询',
    category: 'query',
  },
  {
    label: '正则表达式查询',
    insertText:
      'SELECT * FROM "${1:measurement}" WHERE ${2:tag} =~ /${3:pattern}/ AND time > now() - ${4:1h}',
    description: '使用正则表达式的查询',
    category: 'query',
  },
  {
    label: '显示所有数据库',
    insertText: 'SHOW DATABASES',
    description: '列出所有数据库',
    category: 'admin',
  },
  {
    label: '显示测量名',
    insertText: 'SHOW MEASUREMENTS${1: ON "${2:database}"}',
    description: '显示测量名列表',
    category: 'admin',
  },
  {
    label: '显示字段键',
    insertText: 'SHOW FIELD KEYS FROM "${1:measurement}"',
    description: '显示测量的字段键',
    category: 'admin',
  },
  {
    label: '显示标签键',
    insertText: 'SHOW TAG KEYS FROM "${1:measurement}"',
    description: '显示测量的标签键',
    category: 'admin',
  },
  {
    label: '显示标签值',
    insertText:
      'SHOW TAG VALUES FROM "${1:measurement}" WITH KEY = "${2:tag_key}"',
    description: '显示特定标签的所有值',
    category: 'admin',
  },
  {
    label: '创建数据库',
    insertText: 'CREATE DATABASE "${1:database_name}"',
    description: '创建新数据库',
    category: 'admin',
  },
  {
    label: '删除数据库',
    insertText: 'DROP DATABASE "${1:database_name}"',
    description: '删除数据库',
    category: 'admin',
  },
  {
    label: '创建保留策略',
    insertText:
      'CREATE RETENTION POLICY "${1:policy_name}" ON "${2:database}" DURATION ${3:30d} REPLICATION ${4:1}${5: DEFAULT}',
    description: '创建数据保留策略',
    category: 'admin',
  },
];

class InfluxDBSmartCompleteEngine {
  private databaseCache = new Map<string, string[]>();
  private measurementCache = new Map<string, { fields: any[]; tags: any[] }>();
  private lastCacheUpdate = new Map<string, number>();
  private readonly CACHE_TTL = DEFAULT_PERFORMANCE_CONFIG.cacheTimeout;

  /**
   * 生成智能建议
   */
  async generateSuggestions(
    connectionId: string,
    database: string,
    text: string,
    cursorPosition: number
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // 获取当前输入的上下文
    const context = this.analyzeContext(text, cursorPosition);

    // 确保缓存是最新的
    await this.ensureFreshCache(connectionId, database);

    // 根据上下文生成建议
    await this.addContextualSuggestions(suggestions, context, database);

    // 排序并返回
    return this.sortSuggestions(suggestions, context);
  }

  /**
   * 分析输入上下文
   */
  private analyzeContext(text: string, cursorPosition: number) {
    const beforeCursor = text.substring(0, cursorPosition).trim();
    const afterCursor = text.substring(cursorPosition).trim();
    const words = beforeCursor.split(/\s+/).filter(w => w.length > 0);
    const currentWord = this.getCurrentWord(text, cursorPosition);
    const previousWord =
      words.length > 1 ? words[words.length - 2].toUpperCase() : '';
    const lastWord =
      words.length > 0 ? words[words.length - 1].toUpperCase() : '';

    return {
      beforeCursor,
      afterCursor,
      words,
      currentWord,
      previousWord,
      lastWord,
      queryType: this.detectQueryType(beforeCursor),
      currentClause: this.detectCurrentClause(beforeCursor),
      isEmptyInput: !beforeCursor.trim(),
      isStartOfWord: /\w$/.test(beforeCursor),
      expectsKeyword: this.expectsKeyword(beforeCursor, currentWord),
      expectsValue: this.expectsValue(beforeCursor),
      expectsOperator: this.expectsOperator(beforeCursor),
      inStringLiteral: this.inStringLiteral(text, cursorPosition),
      measurements: this.extractMeasurements(beforeCursor),
      fields: this.extractFields(beforeCursor),
    };
  }

  /**
   * 获取当前单词
   */
  private getCurrentWord(text: string, position: number): string {
    const beforeCursor = text.substring(0, position);
    const match = beforeCursor.match(/[\w]*$/);
    return match ? match[0] : '';
  }

  /**
   * 检测查询类型
   */
  private detectQueryType(text: string): string {
    const upperText = text.toUpperCase();
    if (upperText.startsWith('SELECT')) return 'SELECT';
    if (upperText.startsWith('SHOW')) return 'SHOW';
    if (upperText.startsWith('CREATE')) return 'CREATE';
    if (upperText.startsWith('DROP')) return 'DROP';
    if (upperText.startsWith('INSERT')) return 'INSERT';
    if (upperText.startsWith('GRANT')) return 'GRANT';
    if (upperText.startsWith('REVOKE')) return 'REVOKE';
    if (upperText.startsWith('ALTER')) return 'ALTER';
    return 'UNKNOWN';
  }

  /**
   * 检测当前子句
   */
  private detectCurrentClause(text: string): string {
    const upperText = text.toUpperCase();
    const clauses = [
      'ORDER BY',
      'GROUP BY',
      'WHERE',
      'FROM',
      'SELECT',
      'INTO',
      'VALUES',
    ];

    for (const clause of clauses) {
      const lastIndex = upperText.lastIndexOf(clause);
      if (lastIndex !== -1) {
        // 检查这个子句后面是否还有其他子句
        const afterClause = upperText.substring(lastIndex + clause.length);
        const hasLaterClause = clauses.some(
          c => c !== clause && afterClause.includes(c)
        );
        if (!hasLaterClause) {
          return clause.replace(' ', '_');
        }
      }
    }
    return 'UNKNOWN';
  }

  /**
   * 检查是否期望关键词
   */
  private expectsKeyword(text: string, currentWord: string): boolean {
    if (!text.trim()) return true;
    if (text.endsWith(' ')) return true;

    // 检查是否在输入关键词的一部分
    const allKeywords = this.getAllKeywords();
    return allKeywords.some(
      keyword =>
        keyword.toLowerCase().startsWith(currentWord.toLowerCase()) &&
        keyword.toLowerCase() !== currentWord.toLowerCase()
    );
  }

  /**
   * 检查是否期望值
   */
  private expectsValue(text: string): boolean {
    return /(=|!=|<>|>|>=|<|<=|=~|!~)\s*$/.test(text);
  }

  /**
   * 检查是否期望操作符
   */
  private expectsOperator(text: string): boolean {
    return (
      /\b\w+\s*$/.test(text) &&
      !/\b(WHERE|AND|OR|SELECT|FROM|GROUP|ORDER)\s+\w*$/.test(
        text.toUpperCase()
      )
    );
  }

  /**
   * 检查是否在字符串字面量中
   */
  private inStringLiteral(text: string, position: number): boolean {
    const beforeCursor = text.substring(0, position);
    const quotes = beforeCursor.match(/['"]/g);
    return quotes ? quotes.length % 2 !== 0 : false;
  }

  /**
   * 提取测量名
   */
  private extractMeasurements(text: string): string[] {
    const matches = text.match(/FROM\s+["`]?([^"`\s,]+)["`]?/gi);
    return matches
      ? matches.map(m => m.replace(/FROM\s+["`]?([^"`\s,]+)["`]?/i, '$1'))
      : [];
  }

  /**
   * 提取字段名
   */
  private extractFields(text: string): string[] {
    const selectMatch = text.match(/SELECT\s+(.*?)(?:\s+FROM|$)/i);
    if (!selectMatch) return [];

    return selectMatch[1]
      .split(',')
      .map(f => f.trim().replace(/["`]/g, ''))
      .filter(f => f && f !== '*');
  }

  /**
   * 获取所有关键词
   */
  private getAllKeywords(): string[] {
    return [
      ...Object.keys(INFLUXDB_SYNTAX.BASIC_KEYWORDS),
      ...Object.keys(INFLUXDB_SYNTAX.ADMIN_KEYWORDS),
      ...Object.keys(INFLUXDB_SYNTAX.SHOW_COMMANDS),
      ...Object.keys(INFLUXDB_SYNTAX.AGGREGATE_FUNCTIONS),
      ...Object.keys(INFLUXDB_SYNTAX.SELECTOR_FUNCTIONS),
      ...Object.keys(INFLUXDB_SYNTAX.TRANSFORM_FUNCTIONS),
      ...Object.keys(INFLUXDB_SYNTAX.PREDICTION_FUNCTIONS),
      ...Object.keys(INFLUXDB_SYNTAX.TECHNICAL_ANALYSIS),
      ...Object.keys(INFLUXDB_SYNTAX.LOGICAL_OPERATORS),
      ...Object.keys(INFLUXDB_SYNTAX.TIME_KEYWORDS),
      ...Object.keys(INFLUXDB_SYNTAX.INSERT_KEYWORDS),
      ...Object.keys(INFLUXDB_SYNTAX.DATABASE_MANAGEMENT),
      ...Object.keys(INFLUXDB_SYNTAX.PRIVILEGE_KEYWORDS),
    ];
  }

  /**
   * 确保缓存是最新的
   */
  private async ensureFreshCache(
    connectionId: string,
    database: string
  ): Promise<void> {
    const cacheKey = `${connectionId}:${database}`;
    const lastUpdate = this.lastCacheUpdate.get(cacheKey) || 0;
    const now = Date.now();

    if (now - lastUpdate > this.CACHE_TTL) {
      await this.updateCache(connectionId, database);
      this.lastCacheUpdate.set(cacheKey, now);
    }
  }

  /**
   * 更新缓存
   */
  private async updateCache(
    connectionId: string,
    database: string
  ): Promise<void> {
    try {
      // 获取测量名
      const measurements = await safeTauriInvoke<any[]>('get_measurements', {
        connectionId,
        database,
      });

      this.databaseCache.set(
        database,
        measurements.map(m => m.name)
      );

      // 获取字段和标签信息
      for (const measurement of measurements.slice(0, 10)) {
        // 限制数量避免过多请求
        try {
          const [fields, tags] = await Promise.all([
            safeTauriInvoke<any[]>('get_field_keys', {
              connectionId,
              database,
              measurement: measurement.name,
            }),
            safeTauriInvoke<any[]>('get_tag_keys', {
              connectionId,
              database,
              measurement: measurement.name,
            }),
          ]);

          const cacheKey = `${database}.${measurement.name}`;
          this.measurementCache.set(cacheKey, { fields, tags });
        } catch (error) {
          console.warn(
            `Failed to get fields/tags for ${measurement.name}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('Failed to update cache:', error);
    }
  }

  /**
   * 添加上下文相关建议
   */
  private async addContextualSuggestions(
    suggestions: SmartSuggestion[],
    context: any,
    database: string
  ): Promise<void> {
    // 1. 如果是空输入或期望关键词，添加所有匹配的关键词和模板
    if (context.isEmptyInput) {
      this.addQueryTemplates(suggestions);
      this.addBasicKeywords(suggestions);
      return;
    }

    // 2. 如果期望关键词，添加匹配的关键词
    if (context.expectsKeyword) {
      this.addMatchingKeywords(suggestions, context.currentWord);
    }

    // 3. 根据查询类型添加特定建议
    switch (context.queryType) {
      case 'SELECT':
        await this.addSelectSuggestions(suggestions, context, database);
        break;
      case 'SHOW':
        this.addShowSuggestions(suggestions, context);
        break;
      case 'CREATE':
        this.addCreateSuggestions(suggestions, context);
        break;
      case 'DROP':
        this.addDropSuggestions(suggestions, context);
        break;
      case 'INSERT':
        this.addInsertSuggestions(suggestions, context, database);
        break;
    }

    // 4. 根据当前子句添加建议
    switch (context.currentClause) {
      case 'FROM':
        this.addMeasurementSuggestions(
          suggestions,
          database,
          context.currentWord
        );
        break;
      case 'WHERE':
        await this.addWhereSuggestions(suggestions, context, database);
        break;
      case 'GROUP_BY':
        await this.addGroupBySuggestions(suggestions, context, database);
        break;
      case 'ORDER_BY':
        await this.addOrderBySuggestions(suggestions, context, database);
        break;
    }

    // 5. 如果期望值，添加值建议
    if (context.expectsValue) {
      this.addValueSuggestions(suggestions, context);
    }

    // 6. 如果期望操作符，添加操作符建议
    if (context.expectsOperator) {
      this.addOperatorSuggestions(suggestions);
    }
  }

  /**
   * 添加查询模板
   */
  private addQueryTemplates(suggestions: SmartSuggestion[]): void {
    QUERY_TEMPLATES.forEach(template => {
      suggestions.push({
        label: template.label,
        insertText: template.insertText,
        type: 'template',
        priority: 95,
        description: template.description,
        documentation: `模板: ${template.description}`,
        snippet: true,
        category: template.category,
      });
    });
  }

  /**
   * 添加基础关键词
   */
  private addBasicKeywords(suggestions: SmartSuggestion[]): void {
    Object.entries(INFLUXDB_SYNTAX.BASIC_KEYWORDS).forEach(
      ([keyword, info]) => {
        suggestions.push({
          label: keyword,
          insertText: `${keyword} `,
          type: 'keyword',
          priority: 90,
          description: info.desc,
          documentation: `${keyword} - ${info.desc}\n示例: ${info.example}`,
          category: 'query',
        });
      }
    );

    Object.entries(INFLUXDB_SYNTAX.ADMIN_KEYWORDS).forEach(
      ([keyword, info]) => {
        suggestions.push({
          label: keyword,
          insertText: `${keyword} `,
          type: 'keyword',
          priority: 85,
          description: info.desc,
          documentation: `${keyword} - ${info.desc}\n示例: ${info.example}`,
          category: 'admin',
        });
      }
    );
  }

  /**
   * 添加匹配的关键词
   */
  private addMatchingKeywords(
    suggestions: SmartSuggestion[],
    prefix: string
  ): void {
    if (!prefix) return;

    const lowerPrefix = prefix.toLowerCase();

    // 搜索所有语法类别
    const syntaxCategories = [
      {
        data: INFLUXDB_SYNTAX.BASIC_KEYWORDS,
        type: 'keyword',
        priority: 95,
        category: 'query',
      },
      {
        data: INFLUXDB_SYNTAX.ADMIN_KEYWORDS,
        type: 'keyword',
        priority: 90,
        category: 'admin',
      },
      {
        data: INFLUXDB_SYNTAX.SHOW_COMMANDS,
        type: 'keyword',
        priority: 85,
        category: 'admin',
      },
      {
        data: INFLUXDB_SYNTAX.AGGREGATE_FUNCTIONS,
        type: 'function',
        priority: 80,
        category: 'function',
      },
      {
        data: INFLUXDB_SYNTAX.SELECTOR_FUNCTIONS,
        type: 'function',
        priority: 80,
        category: 'function',
      },
      {
        data: INFLUXDB_SYNTAX.TRANSFORM_FUNCTIONS,
        type: 'function',
        priority: 75,
        category: 'function',
      },
      {
        data: INFLUXDB_SYNTAX.PREDICTION_FUNCTIONS,
        type: 'function',
        priority: 70,
        category: 'function',
      },
      {
        data: INFLUXDB_SYNTAX.TECHNICAL_ANALYSIS,
        type: 'function',
        priority: 70,
        category: 'function',
      },
      {
        data: INFLUXDB_SYNTAX.LOGICAL_OPERATORS,
        type: 'operator',
        priority: 85,
        category: 'operator',
      },
      {
        data: INFLUXDB_SYNTAX.TIME_KEYWORDS,
        type: 'keyword',
        priority: 80,
        category: 'time',
      },
      {
        data: INFLUXDB_SYNTAX.INSERT_KEYWORDS,
        type: 'keyword',
        priority: 75,
        category: 'insert',
      },
      {
        data: INFLUXDB_SYNTAX.DATABASE_MANAGEMENT,
        type: 'keyword',
        priority: 75,
        category: 'admin',
      },
      {
        data: INFLUXDB_SYNTAX.PRIVILEGE_KEYWORDS,
        type: 'keyword',
        priority: 70,
        category: 'admin',
      },
    ];

    syntaxCategories.forEach(({ data, type, priority, category }) => {
      Object.entries(data).forEach(([keyword, info]) => {
        if (keyword.toLowerCase().startsWith(lowerPrefix)) {
          const matchPriority = this.calculateMatchPriority(
            keyword,
            prefix,
            priority
          );

          suggestions.push({
            label: keyword,
            insertText: type === 'function' ? `${keyword}(` : `${keyword} `,
            type: type as any,
            priority: matchPriority,
            description: info.desc,
            documentation: `${keyword} - ${info.desc}\n示例: ${info.example}`,
            category,
          });
        }
      });
    });
  }

  /**
   * 计算匹配优先级
   */
  private calculateMatchPriority(
    keyword: string,
    prefix: string,
    basePriority: number
  ): number {
    const lowerKeyword = keyword.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();

    if (lowerKeyword === lowerPrefix) return basePriority + 10; // 完全匹配
    if (lowerKeyword.startsWith(lowerPrefix)) return basePriority + 5; // 前缀匹配
    return basePriority; // 基础优先级
  }

  /**
   * 添加 SELECT 建议
   */
  private async addSelectSuggestions(
    suggestions: SmartSuggestion[],
    context: any,
    database: string
  ): Promise<void> {
    if (context.currentClause === 'SELECT') {
      // 添加特殊字段
      suggestions.push({
        label: '*',
        insertText: '* ',
        type: 'constant',
        priority: 100,
        description: '所有字段',
        documentation: '选择所有字段和标签',
        category: 'field',
      });

      suggestions.push({
        label: 'time',
        insertText: 'time',
        type: 'field',
        priority: 95,
        description: '时间戳字段',
        documentation: '记录的时间戳',
        category: 'field',
      });

      // 添加聚合函数
      this.addFunctionSuggestions(suggestions, context.currentWord);

      // 如果有已知的测量，添加字段建议
      if (context.measurements.length > 0) {
        await this.addFieldSuggestions(
          suggestions,
          context.measurements[0],
          database
        );
      }
    }
  }

  /**
   * 添加函数建议
   */
  private addFunctionSuggestions(
    suggestions: SmartSuggestion[],
    prefix: string = ''
  ): void {
    const functionCategories = [
      { data: INFLUXDB_SYNTAX.AGGREGATE_FUNCTIONS, priority: 85 },
      { data: INFLUXDB_SYNTAX.SELECTOR_FUNCTIONS, priority: 80 },
      { data: INFLUXDB_SYNTAX.TRANSFORM_FUNCTIONS, priority: 75 },
      { data: INFLUXDB_SYNTAX.PREDICTION_FUNCTIONS, priority: 70 },
      { data: INFLUXDB_SYNTAX.TECHNICAL_ANALYSIS, priority: 65 },
    ];

    functionCategories.forEach(({ data, priority }) => {
      Object.entries(data).forEach(([func, info]) => {
        if (!prefix || func.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            label: func,
            insertText: `${func}($1)`,
            type: 'function',
            priority: prefix
              ? this.calculateMatchPriority(func, prefix, priority)
              : priority,
            description: info.desc,
            documentation: `${func} - ${info.desc}\n示例: ${info.example}`,
            snippet: true,
            category: 'function',
          });
        }
      });
    });
  }

  /**
   * 添加 SHOW 建议
   */
  private addShowSuggestions(
    suggestions: SmartSuggestion[],
    context: any
  ): void {
    Object.entries(INFLUXDB_SYNTAX.SHOW_COMMANDS).forEach(([command, info]) => {
      if (
        !context.currentWord ||
        command.toLowerCase().includes(context.currentWord.toLowerCase())
      ) {
        suggestions.push({
          label: command,
          insertText: command,
          type: 'keyword',
          priority: 90,
          description: info.desc,
          documentation: `SHOW ${command} - ${info.desc}\n示例: ${info.example}`,
          category: 'admin',
        });
      }
    });
  }

  /**
   * 添加 CREATE 建议
   */
  private addCreateSuggestions(
    suggestions: SmartSuggestion[],
    context: any
  ): void {
    Object.entries(INFLUXDB_SYNTAX.DATABASE_MANAGEMENT).forEach(
      ([obj, info]) => {
        if (
          !context.currentWord ||
          obj.toLowerCase().includes(context.currentWord.toLowerCase())
        ) {
          suggestions.push({
            label: obj,
            insertText: `${obj} `,
            type: 'keyword',
            priority: 85,
            description: info.desc,
            documentation: `CREATE ${obj} - ${info.desc}\n示例: ${info.example}`,
            category: 'admin',
          });
        }
      }
    );
  }

  /**
   * 添加 DROP 建议
   */
  private addDropSuggestions(
    suggestions: SmartSuggestion[],
    context: any
  ): void {
    const dropObjects = [
      'DATABASE',
      'MEASUREMENT',
      'SERIES',
      'RETENTION POLICY',
      'CONTINUOUS QUERY',
      'USER',
    ];

    dropObjects.forEach(obj => {
      if (
        !context.currentWord ||
        obj.toLowerCase().includes(context.currentWord.toLowerCase())
      ) {
        suggestions.push({
          label: obj,
          insertText: `${obj} `,
          type: 'keyword',
          priority: 85,
          description: `删除${obj.toLowerCase()}`,
          documentation: `DROP ${obj} - 删除${obj.toLowerCase()}`,
          category: 'admin',
        });
      }
    });
  }

  /**
   * 添加 INSERT 建议
   */
  private addInsertSuggestions(
    suggestions: SmartSuggestion[],
    context: any,
    database: string
  ): Promise<void> {
    // INSERT 语句的建议逻辑
    if (context.previousWord === 'INSERT') {
      suggestions.push({
        label: 'INTO',
        insertText: 'INTO ',
        type: 'keyword',
        priority: 95,
        description: '指定插入目标',
        documentation: 'INSERT INTO - 指定要插入数据的测量',
        category: 'insert',
      });
    }

    if (context.previousWord === 'INTO') {
      this.addMeasurementSuggestions(
        suggestions,
        database,
        context.currentWord
      );
    }

    return Promise.resolve();
  }

  /**
   * 添加测量建议
   */
  private addMeasurementSuggestions(
    suggestions: SmartSuggestion[],
    database: string,
    prefix: string = ''
  ): void {
    const measurements = this.databaseCache.get(database) || [];

    measurements.forEach(measurement => {
      if (!prefix || measurement.toLowerCase().includes(prefix.toLowerCase())) {
        suggestions.push({
          label: measurement,
          insertText: `"${measurement}" `,
          type: 'measurement',
          priority: 90,
          description: '测量名',
          documentation: `测量: ${measurement}`,
          category: 'measurement',
        });
      }
    });
  }

  /**
   * 添加字段建议
   */
  private async addFieldSuggestions(
    suggestions: SmartSuggestion[],
    measurement: string,
    database: string
  ): Promise<void> {
    const cacheKey = `${database}.${measurement}`;
    const cachedData = this.measurementCache.get(cacheKey);

    if (cachedData) {
      // 添加字段
      cachedData.fields.forEach(field => {
        suggestions.push({
          label: field.name,
          insertText: `"${field.name}"`,
          type: 'field',
          priority: 85,
          description: `字段 (${field.type})`,
          documentation: `字段: ${field.name}\n类型: ${field.type}`,
          category: 'field',
        });
      });

      // 添加标签
      cachedData.tags.forEach(tag => {
        suggestions.push({
          label: tag.name,
          insertText: `"${tag.name}"`,
          type: 'tag',
          priority: 80,
          description: '标签',
          documentation: `标签: ${tag.name}`,
          category: 'tag',
        });
      });
    }
  }

  /**
   * 添加 WHERE 建议
   */
  private async addWhereSuggestions(
    suggestions: SmartSuggestion[],
    context: any,
    database: string
  ): Promise<void> {
    // 添加时间相关建议
    suggestions.push({
      label: 'time',
      insertText: 'time ',
      type: 'field',
      priority: 95,
      description: '时间字段',
      documentation: '时间字段，用于时间范围查询',
      category: 'field',
    });

    // 添加常用时间条件
    const timeConditions = [
      'time > now() - 1h',
      'time > now() - 1d',
      'time > now() - 1w',
      'time >= now() - 24h AND time <= now()',
    ];

    timeConditions.forEach(condition => {
      suggestions.push({
        label: condition,
        insertText: condition,
        type: 'template',
        priority: 90,
        description: '时间条件',
        documentation: `时间条件: ${condition}`,
        category: 'time',
      });
    });

    // 如果有测量名，添加字段和标签建议
    if (context.measurements.length > 0) {
      await this.addFieldSuggestions(
        suggestions,
        context.measurements[0],
        database
      );
    }
  }

  /**
   * 添加 GROUP BY 建议
   */
  private async addGroupBySuggestions(
    suggestions: SmartSuggestion[],
    context: any,
    database: string
  ): Promise<void> {
    // 时间分组建议
    const timeGroups = [
      'time(1s)',
      'time(10s)',
      'time(1m)',
      'time(5m)',
      'time(15m)',
      'time(1h)',
      'time(1d)',
    ];

    timeGroups.forEach(group => {
      suggestions.push({
        label: group,
        insertText: group,
        type: 'template',
        priority: 95,
        description: '时间分组',
        documentation: `按时间分组: ${group}`,
        category: 'time',
      });
    });

    // 如果有测量名，添加标签建议
    if (context.measurements.length > 0) {
      await this.addFieldSuggestions(
        suggestions,
        context.measurements[0],
        database
      );
    }
  }

  /**
   * 添加 ORDER BY 建议
   */
  private async addOrderBySuggestions(
    suggestions: SmartSuggestion[],
    context: any,
    database: string
  ): Promise<void> {
    // 排序方向
    ['ASC', 'DESC'].forEach(direction => {
      suggestions.push({
        label: direction,
        insertText: direction,
        type: 'keyword',
        priority: 95,
        description: direction === 'ASC' ? '升序' : '降序',
        documentation: `排序方向: ${direction}`,
        category: 'keyword',
      });
    });

    // 时间字段
    suggestions.push({
      label: 'time',
      insertText: 'time ',
      type: 'field',
      priority: 90,
      description: '时间字段',
      documentation: '按时间排序',
      category: 'field',
    });

    // 如果有测量名，添加字段建议
    if (context.measurements.length > 0) {
      await this.addFieldSuggestions(
        suggestions,
        context.measurements[0],
        database
      );
    }
  }

  /**
   * 添加值建议
   */
  private addValueSuggestions(
    suggestions: SmartSuggestion[],
    context: any
  ): void {
    // 布尔值
    ['true', 'false'].forEach(bool => {
      suggestions.push({
        label: bool,
        insertText: bool,
        type: 'value',
        priority: 80,
        description: `布尔值: ${bool}`,
        documentation: `布尔值: ${bool}`,
        category: 'value',
      });
    });

    // NULL
    suggestions.push({
      label: 'NULL',
      insertText: 'NULL',
      type: 'value',
      priority: 75,
      description: '空值',
      documentation: '空值',
      category: 'value',
    });

    // 时间值（如果字段包含time）
    if (context.beforeCursor.toLowerCase().includes('time')) {
      const timeValues = [
        'now()',
        'now() - 1h',
        'now() - 6h',
        'now() - 1d',
        'now() - 7d',
        '"2023-01-01T00:00:00Z"',
      ];

      timeValues.forEach(timeValue => {
        suggestions.push({
          label: timeValue,
          insertText: timeValue,
          type: 'value',
          priority: 85,
          description: '时间值',
          documentation: `时间值: ${timeValue}`,
          category: 'time',
        });
      });
    }
  }

  /**
   * 添加操作符建议
   */
  private addOperatorSuggestions(suggestions: SmartSuggestion[]): void {
    Object.entries(INFLUXDB_SYNTAX.COMPARISON_OPERATORS).forEach(
      ([op, info]) => {
        suggestions.push({
          label: op,
          insertText: ` ${op} `,
          type: 'operator',
          priority: 90,
          description: info.desc,
          documentation: `${op} - ${info.desc}\n示例: ${info.example}`,
          category: 'operator',
        });
      }
    );
  }

  /**
   * 排序建议
   */
  private sortSuggestions(
    suggestions: SmartSuggestion[],
    context: any
  ): SmartSuggestion[] {
    return suggestions.sort((a, b) => {
      // 首先按优先级排序
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // 然后按标签字母顺序排序
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.databaseCache.clear();
    this.measurementCache.clear();
    this.lastCacheUpdate.clear();
  }
}

// 导出单例
export const influxDBSmartCompleteEngine = new InfluxDBSmartCompleteEngine();
export default influxDBSmartCompleteEngine;
