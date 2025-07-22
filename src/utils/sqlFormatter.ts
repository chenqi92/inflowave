/**
 * SQL格式化工具
 * 支持不同类型的数据库SQL格式化
 */

export type DatabaseType = '1.x' | '2.x' | '3.x' | 'unknown';

interface FormatOptions {
  indent: string;
  uppercase: boolean;
  linesBetweenQueries: number;
}

const DEFAULT_OPTIONS: FormatOptions = {
  indent: '  ', // 2个空格缩进
  uppercase: true, // 关键字大写
  linesBetweenQueries: 1,
};

/**
 * InfluxDB 1.x (InfluxQL) 关键字
 */
const INFLUXQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET',
  'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'INTO', 'VALUES',
  'DATABASES', 'MEASUREMENTS', 'SERIES', 'TAG', 'FIELD', 'TIME',
  'RETENTION', 'POLICY', 'CONTINUOUS', 'QUERY', 'USER', 'USERS',
  'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP', 'AS', 'ASC', 'DESC',
  'FILL', 'NULL', 'NONE', 'LINEAR', 'PREVIOUS', 'NOW', 'DURATION',
  'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SUM', 'COUNT',
  'DISTINCT', 'INTEGRAL', 'DERIVATIVE', 'DIFFERENCE', 'NON_NEGATIVE_DERIVATIVE',
  'MOVING_AVERAGE', 'CUMULATIVE_SUM', 'HOLT_WINTERS', 'PERCENTILE',
  'TOP', 'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'SAMPLE'
];

/**
 * InfluxDB 2.x/3.x (Flux) 关键字
 */
const FLUX_KEYWORDS = [
  'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
  'map', 'keep', 'drop', 'pivot', 'join', 'union', 'sort', 'limit', 'first',
  'last', 'max', 'min', 'yield', 'to', 'bucket', 'measurement', 'field',
  'tag', 'time', 'value', 'start', 'stop', 'every', 'period', 'offset',
  'fn', 'r', 'tables', 'column', 'columns', 'record', 'records'
];

/**
 * 通用SQL关键字
 */
const COMMON_SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
  'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
  'IS', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP',
  'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA'
];

/**
 * 检测SQL类型
 */
export function detectSQLType(sql: string): DatabaseType {
  const upperSQL = sql.toUpperCase();
  
  // 检测Flux语法特征
  if (sql.includes('from(') || sql.includes('|>') || sql.includes('range(')) {
    return '2.x'; // Flux语法，用于InfluxDB 2.x/3.x
  }
  
  // 检测InfluxQL语法特征
  if (upperSQL.includes('SHOW MEASUREMENTS') || 
      upperSQL.includes('SHOW DATABASES') ||
      upperSQL.includes('SHOW SERIES') ||
      upperSQL.includes('RETENTION POLICY')) {
    return '1.x'; // InfluxQL语法，用于InfluxDB 1.x
  }
  
  // 默认返回未知类型
  return 'unknown';
}

/**
 * 格式化InfluxQL (InfluxDB 1.x)
 */
function formatInfluxQL(sql: string, options: FormatOptions): string {
  let formatted = sql.trim();

  // 先保护注释，避免被格式化影响
  const comments: string[] = [];
  const commentPlaceholder = '___COMMENT_PLACEHOLDER___';

  // 提取单行注释
  formatted = formatted.replace(/--.*$/gm, (match) => {
    comments.push(match);
    return commentPlaceholder + (comments.length - 1);
  });

  // 提取多行注释
  formatted = formatted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    comments.push(match);
    return commentPlaceholder + (comments.length - 1);
  });

  // 处理关键字大小写
  if (options.uppercase) {
    INFLUXQL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, keyword.toUpperCase());
    });
  }

  // 基本格式化
  formatted = formatted
    // 在主要关键字前添加换行
    .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|SHOW|CREATE|DROP|INSERT)\b/gi, '\n$1')
    // 在逗号后添加空格和换行（对于SELECT子句）
    .replace(/,(?=\s*[^,\s])/g, ',\n  ')
    // 在操作符周围添加空格
    .replace(/([=<>!]+)/g, ' $1 ')
    // 清理多余空格，但保留换行
    .replace(/[ \t]+/g, ' ')
    // 清理行首空格
    .replace(/^\s+/gm, '')
    // 添加适当缩进
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || index === 0) return trimmed;

      // 主要关键字不缩进
      if (/^(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|SHOW|CREATE|DROP|INSERT)\b/i.test(trimmed)) {
        return trimmed;
      }

      return options.indent + trimmed;
    })
    .filter(line => line.length > 0)
    .join('\n');

  // 恢复注释
  comments.forEach((comment, index) => {
    const placeholder = commentPlaceholder + index;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), comment);
  });

  return formatted.trim();
}

/**
 * 格式化Flux (InfluxDB 2.x/3.x)
 */
function formatFlux(sql: string, options: FormatOptions): string {
  let formatted = sql.trim();

  // 先保护注释
  const comments: string[] = [];
  const commentPlaceholder = '___COMMENT_PLACEHOLDER___';

  // 提取单行注释
  formatted = formatted.replace(/\/\/.*$/gm, (match) => {
    comments.push(match);
    return commentPlaceholder + (comments.length - 1);
  });

  // 提取多行注释
  formatted = formatted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    comments.push(match);
    return commentPlaceholder + (comments.length - 1);
  });

  // Flux使用管道操作符，需要特殊处理
  formatted = formatted
    // 在管道操作符前添加换行和缩进
    .replace(/\s*\|\>\s*/g, '\n  |> ')
    // 在函数调用后添加适当格式
    .replace(/(\w+)\s*\(/g, '$1(')
    // 处理参数格式，在逗号后添加空格
    .replace(/,(?!\s)/g, ', ')
    // 在主要函数前添加换行
    .replace(/\b(from|range|filter|group|aggregateWindow|map|keep|drop|pivot|join|union|yield|to)\s*\(/gi, '\n$1(')
    // 清理多余空格，但保留换行
    .replace(/[ \t]+/g, ' ')
    // 处理换行和缩进
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      // 第一行不缩进
      if (index === 0) return trimmed;

      // 管道操作符行保持缩进
      if (trimmed.startsWith('|>')) {
        return options.indent + trimmed;
      }

      // 函数调用行不额外缩进
      if (/^\w+\s*\(/.test(trimmed)) {
        return trimmed;
      }

      return trimmed;
    })
    .filter(line => line.length > 0)
    .join('\n');

  // 恢复注释
  comments.forEach((comment, index) => {
    const placeholder = commentPlaceholder + index;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), comment);
  });

  return formatted.trim();
}

/**
 * 格式化通用SQL
 */
function formatCommonSQL(sql: string, options: FormatOptions): string {
  let formatted = sql.trim();

  // 先保护注释
  const comments: string[] = [];
  const commentPlaceholder = '___COMMENT_PLACEHOLDER___';

  // 提取单行注释
  formatted = formatted.replace(/--.*$/gm, (match) => {
    comments.push(match);
    return commentPlaceholder + (comments.length - 1);
  });

  // 提取多行注释
  formatted = formatted.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    comments.push(match);
    return commentPlaceholder + (comments.length - 1);
  });

  // 处理关键字大小写
  if (options.uppercase) {
    COMMON_SQL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, keyword.toUpperCase());
    });
  }

  // 基本格式化
  formatted = formatted
    // 在主要关键字前添加换行
    .replace(/\b(SELECT|FROM|WHERE|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/gi, '\n$1')
    // 在逗号后添加空格和换行（对于SELECT子句）
    .replace(/,(?=\s*[^,\s])/g, ',\n  ')
    // 在操作符周围添加空格
    .replace(/([=<>!]+)/g, ' $1 ')
    // 清理多余空格，但保留换行
    .replace(/[ \t]+/g, ' ')
    // 清理行首空格
    .replace(/^\s+/gm, '')
    // 添加适当缩进
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || index === 0) return trimmed;

      // 主要关键字不缩进
      if (/^(SELECT|FROM|WHERE|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|GROUP BY|HAVING|ORDER BY|LIMIT|UNION|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(trimmed)) {
        return trimmed;
      }

      return options.indent + trimmed;
    })
    .filter(line => line.length > 0)
    .join('\n');

  // 恢复注释
  comments.forEach((comment, index) => {
    const placeholder = commentPlaceholder + index;
    formatted = formatted.replace(new RegExp(placeholder, 'g'), comment);
  });

  return formatted.trim();
}

/**
 * 主格式化函数
 */
export function formatSQL(sql: string, databaseType?: DatabaseType, customOptions?: Partial<FormatOptions>): string {
  if (!sql || !sql.trim()) {
    return sql;
  }
  
  const options = { ...DEFAULT_OPTIONS, ...customOptions };
  const detectedType = databaseType || detectSQLType(sql);
  
  try {
    switch (detectedType) {
      case '1.x':
        return formatInfluxQL(sql, options);
      case '2.x':
      case '3.x':
        return formatFlux(sql, options);
      default:
        return formatCommonSQL(sql, options);
    }
  } catch (error) {
    console.warn('SQL格式化失败，返回原始SQL:', error);
    return sql;
  }
}

/**
 * 获取数据库类型的显示名称
 */
export function getDatabaseTypeDisplayName(type: DatabaseType): string {
  switch (type) {
    case '1.x':
      return 'InfluxDB 1.x (InfluxQL)';
    case '2.x':
      return 'InfluxDB 2.x (Flux)';
    case '3.x':
      return 'InfluxDB 3.x (Flux)';
    default:
      return '通用SQL';
  }
}
