/**
 * SQL智能提示增强工具
 * 根据不同的数据库类型提供相应的智能提示
 */

import * as monaco from 'monaco-editor';
import type { DatabaseType } from './sqlFormatter';

/**
 * InfluxDB 1.x (InfluxQL) 关键字和函数
 */
export const INFLUXQL_KEYWORDS = [
  // 基本查询关键字
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
  'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'INTO', 'VALUES',
  
  // InfluxDB特有关键字
  'DATABASES', 'MEASUREMENTS', 'SERIES', 'TAG', 'FIELD', 'TIME',
  'RETENTION', 'POLICY', 'CONTINUOUS', 'QUERY', 'USER', 'USERS',
  'GRANTS', 'REVOKE', 'GRANT', 'PRIVILEGES', 'ON', 'TO',
  
  // 逻辑操作符
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP', 'AS', 'ASC', 'DESC',
  
  // 时间相关
  'NOW', 'DURATION', 'FILL', 'NULL', 'NONE', 'LINEAR', 'PREVIOUS',
  
  // 聚合函数
  'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SUM', 'COUNT',
  'DISTINCT', 'INTEGRAL', 'DERIVATIVE', 'DIFFERENCE', 'NON_NEGATIVE_DERIVATIVE',
  'MOVING_AVERAGE', 'CUMULATIVE_SUM', 'HOLT_WINTERS', 'PERCENTILE',
  'TOP', 'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'SAMPLE'
];

/**
 * InfluxDB 2.x/3.x (Flux) 函数和关键字
 */
export const FLUX_FUNCTIONS = [
  // 数据源函数
  'from', 'bucket', 'range', 'start', 'stop',
  
  // 过滤和转换
  'filter', 'map', 'keep', 'drop', 'rename', 'duplicate',
  
  // 聚合函数
  'aggregateWindow', 'mean', 'sum', 'count', 'max', 'min',
  'median', 'stddev', 'spread', 'first', 'last',
  
  // 分组和排序
  'group', 'sort', 'limit', 'offset', 'unique', 'distinct',
  
  // 时间窗口
  'window', 'every', 'period', 'offset', 'timeShift',
  
  // 数据操作
  'pivot', 'join', 'union', 'yield', 'to',
  
  // 数学函数
  'math.abs', 'math.ceil', 'math.floor', 'math.round',
  'math.pow', 'math.sqrt', 'math.log', 'math.exp',
  
  // 字符串函数
  'strings.contains', 'strings.hasPrefix', 'strings.hasSuffix',
  'strings.toLower', 'strings.toUpper', 'strings.trim',
  
  // 类型转换
  'int', 'uint', 'float', 'string', 'bool', 'time', 'duration',
  
  // 条件函数
  'if', 'then', 'else'
];

/**
 * 通用SQL关键字
 */
export const COMMON_SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
  'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
  'IS', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP',
  'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA'
];

/**
 * 根据数据库类型获取关键字列表
 */
export function getKeywordsByDatabaseType(databaseType: DatabaseType): string[] {
  switch (databaseType) {
    case '1.x':
      return INFLUXQL_KEYWORDS;
    case '2.x':
    case '3.x':
      return FLUX_FUNCTIONS;
    default:
      return COMMON_SQL_KEYWORDS;
  }
}

/**
 * 创建关键字补全项
 */
export function createKeywordCompletions(
  keywords: string[],
  range: monaco.IRange
): monaco.languages.CompletionItem[] {
  return keywords.map(keyword => ({
    label: keyword,
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: keyword,
    documentation: `关键字: ${keyword}`,
    range,
  }));
}

/**
 * 创建函数补全项
 */
export function createFunctionCompletions(
  functions: string[],
  range: monaco.IRange,
  databaseType: DatabaseType
): monaco.languages.CompletionItem[] {
  return functions.map(func => {
    let insertText = func;
    let documentation = `函数: ${func}`;
    
    // 为常用函数添加参数提示
    if (databaseType === '1.x') {
      // InfluxQL函数参数提示
      switch (func.toUpperCase()) {
        case 'MEAN':
        case 'SUM':
        case 'COUNT':
        case 'MAX':
        case 'MIN':
          insertText = `${func}($1)`;
          documentation = `聚合函数: ${func}(field)`;
          break;
        case 'TOP':
        case 'BOTTOM':
          insertText = `${func}($1, $2)`;
          documentation = `选择函数: ${func}(field, N)`;
          break;
        case 'PERCENTILE':
          insertText = `${func}($1, $2)`;
          documentation = `百分位函数: ${func}(field, N)`;
          break;
      }
    } else if (databaseType === '2.x' || databaseType === '3.x') {
      // Flux函数参数提示
      switch (func) {
        case 'from':
          insertText = `${func}(bucket: "$1")`;
          documentation = `数据源函数: ${func}(bucket: "bucket_name")`;
          break;
        case 'range':
          insertText = `${func}(start: $1, stop: $2)`;
          documentation = `时间范围函数: ${func}(start: time, stop: time)`;
          break;
        case 'filter':
          insertText = `${func}(fn: (r) => $1)`;
          documentation = `过滤函数: ${func}(fn: (r) => condition)`;
          break;
        case 'aggregateWindow':
          insertText = `${func}(every: $1, fn: $2)`;
          documentation = `聚合窗口函数: ${func}(every: duration, fn: aggregation)`;
          break;
      }
    }
    
    return {
      label: func,
      kind: monaco.languages.CompletionItemKind.Function,
      insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation,
      range,
    };
  });
}

/**
 * 创建数据库特定的智能提示
 */
export function createDatabaseSpecificCompletions(
  databaseType: DatabaseType,
  range: monaco.IRange,
  context?: {
    databases?: string[];
    measurements?: string[];
    fields?: string[];
    tags?: string[];
  }
): monaco.languages.CompletionItem[] {
  const completions: monaco.languages.CompletionItem[] = [];
  
  // 添加关键字补全
  const keywords = getKeywordsByDatabaseType(databaseType);
  completions.push(...createKeywordCompletions(keywords, range));
  
  // 添加函数补全
  if (databaseType === '2.x' || databaseType === '3.x') {
    completions.push(...createFunctionCompletions(FLUX_FUNCTIONS, range, databaseType));
  }
  
  // 添加数据库名称补全
  if (context?.databases) {
    context.databases.forEach(db => {
      completions.push({
        label: db,
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: `"${db}"`,
        documentation: `数据库: ${db}`,
        range,
      });
    });
  }
  
  // 添加测量名称补全
  if (context?.measurements) {
    context.measurements.forEach(measurement => {
      completions.push({
        label: measurement,
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: `"${measurement}"`,
        documentation: `测量: ${measurement}`,
        range,
      });
    });
  }
  
  // 添加字段名称补全
  if (context?.fields) {
    context.fields.forEach(field => {
      completions.push({
        label: field,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: `"${field}"`,
        documentation: `字段: ${field}`,
        range,
      });
    });
  }
  
  // 添加标签名称补全
  if (context?.tags) {
    context.tags.forEach(tag => {
      completions.push({
        label: tag,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: `"${tag}"`,
        documentation: `标签: ${tag}`,
        range,
      });
    });
  }
  
  return completions;
}

/**
 * 根据数据库类型设置编辑器语言
 */
export function setEditorLanguageByDatabaseType(
  editor: monaco.editor.IStandaloneCodeEditor,
  databaseType: DatabaseType
): void {
  let language = 'sql';
  
  switch (databaseType) {
    case '1.x':
      language = 'influxql';
      break;
    case '2.x':
    case '3.x':
      language = 'flux';
      break;
    default:
      language = 'sql';
      break;
  }
  
  // 设置编辑器语言
  const model = editor.getModel();
  if (model) {
    monaco.editor.setModelLanguage(model, language);
  }
}

/**
 * 注册InfluxQL语言支持
 */
export function registerInfluxQLLanguage(): void {
  console.log('🚀 开始注册InfluxQL语言...');

  // 检查是否已经注册
  const languages = monaco.languages.getLanguages();
  const isAlreadyRegistered = languages.some(lang => lang.id === 'influxql');

  console.log('🔍 InfluxQL语言注册状态检查:', {
    totalLanguages: languages.length,
    isAlreadyRegistered,
    existingLanguages: languages.map(l => l.id).slice(0, 10) // 只显示前10个
  });

  if (isAlreadyRegistered) {
    console.log('⏭️ InfluxQL语言已注册，跳过');
    return;
  }

  try {
    // 注册InfluxQL语言
    console.log('📝 注册InfluxQL语言标识符...');
    monaco.languages.register({ id: 'influxql' });
    console.log('✅ InfluxQL语言标识符注册成功');
  } catch (registerError) {
    console.error('❌ InfluxQL语言标识符注册失败:', registerError);
    return;
  }

  // 设置InfluxQL语法高亮
  try {
    console.log('🎨 设置InfluxQL语法高亮规则...');
    monaco.languages.setMonarchTokensProvider('influxql', {
    tokenizer: {
      root: [
        // 注释
        [/--.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // 字符串
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, 'string', '@string_single'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],

        // 数字
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],

        // InfluxQL关键字
        [/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|OFFSET|SLIMIT|SOFFSET)\b/i, 'keyword'],
        [/\b(SHOW|CREATE|DROP|DELETE|INSERT|INTO|VALUES|UPDATE|SET)\b/i, 'keyword'],
        [/\b(DATABASE|DATABASES|MEASUREMENT|MEASUREMENTS|SERIES|TAG|TAGS|FIELD|FIELDS)\b/i, 'keyword'],
        [/\b(RETENTION|POLICY|POLICIES|USER|USERS|PRIVILEGE|PRIVILEGES|GRANT|REVOKE)\b/i, 'keyword'],
        [/\b(AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|TRUE|FALSE|AS|ASC|DESC|DISTINCT)\b/i, 'keyword'],
        [/\b(FILL|LINEAR|NONE|NULL|PREVIOUS|TIME|NOW|DURATION)\b/i, 'keyword'],

        // InfluxQL聚合函数
        [/\b(COUNT|SUM|MEAN|MEDIAN|MODE|SPREAD|STDDEV|FIRST|LAST|MAX|MIN)\b/i, 'keyword.function'],
        [/\b(PERCENTILE|HISTOGRAM|TOP|BOTTOM|SAMPLE|DERIVATIVE|DIFFERENCE|ELAPSED_TIME)\b/i, 'keyword.function'],
        [/\b(MOVING_AVERAGE|CUMULATIVE_SUM|HOLT_WINTERS|HOLT_WINTERS_WITH_FIT)\b/i, 'keyword.function'],

        // InfluxQL选择器函数
        [/\b(FIRST|LAST|MAX|MIN|PERCENTILE|SAMPLE|TOP|BOTTOM)\b/i, 'keyword.function'],

        // InfluxQL转换函数
        [/\b(ABS|ACOS|ASIN|ATAN|ATAN2|CEIL|COS|CUMULATIVE_SUM|DERIVATIVE|DIFFERENCE)\b/i, 'keyword.function'],
        [/\b(ELAPSED|EXP|FLOOR|HISTOGRAM|LN|LOG|LOG2|LOG10|MOVING_AVERAGE|POW|ROUND|SIN|SQRT|TAN)\b/i, 'keyword.function'],

        // 时间函数
        [/\b(time|now)\b/i, 'keyword.function'],

        // 正则表达式
        [/\/.*?\/[gimuy]*/, 'regexp'],

        // 操作符
        [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],
        [/[=><]=?/, 'operator'],

        // 分隔符
        [/[;,.]/, 'delimiter'],
        [/[()[\]{}]/, 'bracket'],

        // 标识符（可能是测量名、字段名、标签名）
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

        // 空白字符
        [/[ \t\r\n]+/, 'white'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop']
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ],
    },
  });
  console.log('✅ InfluxQL语法高亮规则设置成功');
  } catch (tokensError) {
    console.error('❌ InfluxQL语法高亮规则设置失败:', tokensError);
    return;
  }

  // 为InfluxQL定义主题颜色
  try {
    console.log('🎨 定义InfluxQL主题颜色...');
    monaco.editor.defineTheme('influxql-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' },
      { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
      { token: 'keyword.function', foreground: 'FF0000', fontStyle: 'bold' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'operator', foreground: '000000' },
      { token: 'identifier', foreground: '000000' },
      { token: 'delimiter', foreground: '000000' },
      { token: 'bracket', foreground: '000000' },
    ],
    colors: {}
  });

  monaco.editor.defineTheme('influxql-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'keyword.function', foreground: 'DCDCAA', fontStyle: 'bold' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'identifier', foreground: 'D4D4D4' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'bracket', foreground: 'FFD700' },
    ],
    colors: {}
  });
  console.log('✅ InfluxQL主题颜色定义成功');
  } catch (themeError) {
    console.error('❌ InfluxQL主题颜色定义失败:', themeError);
  }

  console.log('🎉 InfluxQL语言注册完全完成');
}

/**
 * 注册Flux语言支持
 */
export function registerFluxLanguage(): void {
  console.log('🚀 开始注册Flux语言...');

  // 检查是否已经注册
  const languages = monaco.languages.getLanguages();
  const isAlreadyRegistered = languages.some(lang => lang.id === 'flux');

  console.log('🔍 Flux语言注册状态检查:', {
    totalLanguages: languages.length,
    isAlreadyRegistered
  });

  if (isAlreadyRegistered) {
    console.log('⏭️ Flux语言已注册，跳过');
    return;
  }

  try {
    // 注册Flux语言
    console.log('📝 注册Flux语言标识符...');
    monaco.languages.register({ id: 'flux' });
    console.log('✅ Flux语言标识符注册成功');
  } catch (registerError) {
    console.error('❌ Flux语言标识符注册失败:', registerError);
    return;
  }
  
  // 设置Flux语言的语法高亮
  monaco.languages.setMonarchTokensProvider('flux', {
    tokenizer: {
      root: [
        // 注释
        [/\/\/.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],

        // 字符串
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, 'string', '@string_single'],

        // 数字
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],

        // 管道操作符
        [/\|>/, 'operator.pipe'],

        // Flux函数
        [/\b(from|range|filter|group|aggregateWindow|mean|sum|count|max|min|first|last)\b/, 'keyword.function'],
        [/\b(map|keep|drop|pivot|join|union|yield|to|sort|limit|unique|distinct)\b/, 'keyword.function'],
        [/\b(window|timeShift|fill|interpolate|derivative|difference|increase)\b/, 'keyword.function'],

        // Flux关键字
        [/\b(bucket|start|stop|every|period|offset|fn|r|tables|column|columns|record|records)\b/, 'keyword'],
        [/\b(if|then|else|and|or|not|true|false|null)\b/, 'keyword'],

        // 类型关键字
        [/\b(int|uint|float|string|bool|time|duration)\b/, 'type'],

        // 函数名（后跟括号的标识符）
        [/[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/, 'function'],

        // 操作符
        [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],
        [/[=><]=?/, 'operator'],

        // 分隔符
        [/[;,.]/, 'delimiter'],
        [/[()[\]{}]/, 'bracket'],

        // 标识符
        [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

        // 空白字符
        [/[ \t\r\n]+/, 'white'],
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop']
      ],
    },
  });

  // 为Flux定义主题颜色
  monaco.editor.defineTheme('flux-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000' },
      { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
      { token: 'keyword.function', foreground: 'FF0000', fontStyle: 'bold' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'operator', foreground: '000000' },
      { token: 'operator.pipe', foreground: 'FF6600', fontStyle: 'bold' },
      { token: 'type', foreground: '267F99', fontStyle: 'bold' },
      { token: 'function', foreground: '795E26' },
      { token: 'identifier', foreground: '000000' },
      { token: 'delimiter', foreground: '000000' },
      { token: 'bracket', foreground: '000000' },
    ],
    colors: {}
  });

  monaco.editor.defineTheme('flux-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'keyword.function', foreground: 'DCDCAA', fontStyle: 'bold' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'operator.pipe', foreground: 'FF8C00', fontStyle: 'bold' },
      { token: 'type', foreground: '4EC9B0', fontStyle: 'bold' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'identifier', foreground: 'D4D4D4' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'bracket', foreground: 'FFD700' },
    ],
    colors: {}
  });
}
