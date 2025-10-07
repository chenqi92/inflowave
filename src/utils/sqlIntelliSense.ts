/**
 * SQL智能提示增强工具
 * 根据不同的数据库类型提供相应的智能提示
 */

import * as monaco from 'monaco-editor';
import type { InfluxDBVersion } from '@/types/database';
import type { DatabaseType as SQLFormatterDatabaseType } from './sqlFormatter';

/**
 * InfluxDB 1.x (InfluxQL) 关键字和函数
 * 注意: 'time' 是字段名,不是关键字,应该保持小写
 * 注意: InfluxDB 1.x 只支持 'ORDER BY time',不支持 ASC/DESC
 */
export const INFLUXQL_KEYWORDS = [
  // 基本查询关键字
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
  'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'INTO', 'VALUES',

  // InfluxDB特有关键字
  'DATABASES', 'MEASUREMENTS', 'SERIES', 'TAG', 'FIELD',
  'RETENTION', 'POLICY', 'CONTINUOUS', 'QUERY', 'USER', 'USERS',
  'GRANTS', 'REVOKE', 'GRANT', 'PRIVILEGES', 'ON', 'TO',

  // 逻辑操作符
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP', 'AS',

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
 * 根据数据库版本获取关键字列表
 */
export function getKeywordsByDatabaseVersion(version: SQLFormatterDatabaseType): string[] {
  switch (version) {
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
  version: InfluxDBVersion
): monaco.languages.CompletionItem[] {
  return functions.map(func => {
    let insertText = func;
    let documentation = `函数: ${func}`;
    
    // 为常用函数添加参数提示
    if (version === '1.x') {
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
    } else if (version === '2.x' || version === '3.x') {
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
  version: SQLFormatterDatabaseType,
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
  const keywords = getKeywordsByDatabaseVersion(version);
  completions.push(...createKeywordCompletions(keywords, range));

  // 添加函数补全
  if (version === '2.x' || version === '3.x') {
    completions.push(...createFunctionCompletions(FLUX_FUNCTIONS, range, version));
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

  // 为InfluxDB 1.x添加常用字段建议(包括time字段)
  if (version === '1.x') {
    const commonFields = ['time', 'value', 'host', 'region'];
    commonFields.forEach(field => {
      completions.push({
        label: field,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: field,
        documentation: `常用字段: ${field}`,
        sortText: `0_${field}`, // 优先显示
        range,
      });
    });
  }

  return completions;
}

/**
 * 根据数据库版本设置编辑器语言
 */
export function setEditorLanguageByDatabaseVersion(
  editor: monaco.editor.IStandaloneCodeEditor,
  version: InfluxDBVersion
): void {
  let language = 'sql';

  switch (version) {
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

// 注意：InfluxQL语言注册已移至 monacoLanguages.ts 中统一管理
// 此处保留注释以说明代码迁移



// 注意：语法高亮功能已移至 customSyntaxHighlight.ts 中统一管理
// 此文件专注于智能提示功能
