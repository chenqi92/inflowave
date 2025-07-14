import * as monaco from 'monaco-editor';

// InfluxDB 版本配置
export interface InfluxDBVersionConfig {
  version: string;
  supportedFunctions: string[];
  supportedKeywords: string[];
  supportedDataTypes: string[];
  features: {
    continuousQueries: boolean;
    retentionPolicies: boolean;
    flux: boolean;
    userManagement: boolean;
  };
}

// InfluxDB 版本定义
export const INFLUXDB_VERSIONS: Record<string, InfluxDBVersionConfig> = {
  '1.8': {
    version: '1.8',
    supportedFunctions: [
      // 聚合函数
      'COUNT', 'DISTINCT', 'INTEGRAL', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD',
      'STDDEV', 'SUM', 'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE',
      'SAMPLE', 'TOP',
      // 选择器函数
      'BOTTOM', 'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'SAMPLE', 'TOP',
      // 变换函数
      'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL', 'COS', 'CUMULATIVE_SUM',
      'DERIVATIVE', 'DIFFERENCE', 'EXP', 'FLOOR', 'HISTOGRAM', 'LN', 'LOG',
      'LOG2', 'LOG10', 'MOVING_AVERAGE', 'NON_NEGATIVE_DERIVATIVE',
      'NON_NEGATIVE_DIFFERENCE', 'POW', 'ROUND', 'SIN', 'SQRT', 'TAN',
      // 预测函数
      'HOLT_WINTERS',
      // 技术分析函数
      'CHANDE_MOMENTUM_OSCILLATOR', 'EXPONENTIAL_MOVING_AVERAGE',
      'DOUBLE_EXPONENTIAL_MOVING_AVERAGE', 'KAUFMANS_EFFICIENCY_RATIO',
      'KAUFMANS_ADAPTIVE_MOVING_AVERAGE', 'TRIPLE_EXPONENTIAL_MOVING_AVERAGE',
      'TRIPLE_EXPONENTIAL_DERIVATIVE', 'RELATIVE_STRENGTH_INDEX'
    ],
    supportedKeywords: [
      'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET',
      'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
      'SHOW', 'CREATE', 'DROP', 'ALTER', 'INSERT', 'DELETE', 'UPDATE',
      'DATABASE', 'DATABASES', 'MEASUREMENT', 'MEASUREMENTS', 'SERIES',
      'TAG', 'TAGS', 'FIELD', 'FIELDS', 'KEY', 'KEYS', 'VALUES',
      'RETENTION', 'POLICY', 'POLICIES', 'CONTINUOUS', 'QUERY', 'QUERIES',
      'USER', 'USERS', 'PRIVILEGE', 'PRIVILEGES', 'GRANT', 'REVOKE',
      'ON', 'TO', 'WITH', 'PASSWORD', 'ADMIN', 'ALL', 'READ', 'WRITE',
      'TIME', 'NOW', 'DURATION', 'FILL', 'PREVIOUS', 'LINEAR', 'NONE',
      'ASC', 'DESC', 'SLIMIT', 'SOFFSET', 'TZ', 'INTO'
    ],
    supportedDataTypes: ['INTEGER', 'FLOAT', 'STRING', 'BOOLEAN'],
    features: {
      continuousQueries: true,
      retentionPolicies: true,
      flux: false,
      userManagement: true
    }
  },
  '2.0': {
    version: '2.0',
    supportedFunctions: [
      // Flux 函数 (InfluxDB 2.0 主要使用 Flux)
      'from', 'range', 'filter', 'map', 'reduce', 'group', 'sort', 'limit',
      'mean', 'sum', 'count', 'min', 'max', 'first', 'last', 'aggregateWindow',
      'derivative', 'difference', 'increase', 'yield', 'pivot', 'drop', 'keep',
      'rename', 'union', 'join', 'set', 'duplicate', 'distinct', 'unique',
      'fill', 'interpolate', 'sample', 'findColumn', 'findRecord'
    ],
    supportedKeywords: [
      // Flux 关键字
      'from', 'range', 'filter', 'map', 'reduce', 'group', 'sort', 'limit',
      'yield', 'and', 'or', 'not', 'if', 'then', 'else', 'import', 'option',
      'builtin', 'package', 'return', 'true', 'false', 'null'
    ],
    supportedDataTypes: ['int', 'uint', 'float', 'string', 'bool', 'time', 'duration', 'bytes'],
    features: {
      continuousQueries: false,
      retentionPolicies: false,
      flux: true,
      userManagement: true
    }
  }
};

// 查询上下文分析
interface QueryContext {
  isSelectQuery: boolean;
  isShowQuery: boolean;
  isCreateQuery: boolean;
  isDropQuery: boolean;
  inFromClause: boolean;
  inWhereClause: boolean;
  inGroupByClause: boolean;
  inOrderByClause: boolean;
  currentClause: string;
  currentPosition: number;
  precedingWord: string;
  currentWord: string;
  currentDatabase?: string;
  tablesInQuery: string[];
  currentTable?: string;
  expectingFieldName: boolean;
  expectingTableName: boolean;
}

// 分析查询上下文
const analyzeQueryContext = (model: monaco.editor.ITextModel, position: monaco.Position, currentDatabase?: string): QueryContext => {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column
  });

  const fullText = model.getValue();
  const words = textUntilPosition.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  const currentWord = model.getWordAtPosition(position)?.word || '';
  const precedingWord = words.length > 1 ? words[words.length - 2] : '';

  const text = textUntilPosition.toUpperCase();
  const fullTextUpper = fullText.toUpperCase();
  
  // 提取查询中的表名
  const tablesInQuery = extractTablesFromQuery(fullTextUpper);
  
  // 判断当前位置是否期望表名
  const expectingTableName = /\bFROM\s+$/.test(text) || 
                            /\bFROM\s+\w+\s*,\s*$/.test(text) ||
                            /\bJOIN\s+$/.test(text) ||
                            /\bINTO\s+$/.test(text);
  
  // 判断当前位置是否期望字段名
  const expectingFieldName = /\bSELECT\s+$/.test(text) || 
                             /\bSELECT\s+[\w\s,]+,\s*$/.test(text) ||
                             /\bWHERE\s+$/.test(text) ||
                             /\bWHERE\s+[\w\s]+\s+(AND|OR)\s+$/.test(text) ||
                             /\bGROUP\s+BY\s+$/.test(text) ||
                             /\bORDER\s+BY\s+$/.test(text);
  
  // 尝试确定当前正在引用的表
  const currentTable = getCurrentTableContext(textUntilPosition, tablesInQuery);
  
  return {
    isSelectQuery: /\bSELECT\b/.test(text),
    isShowQuery: /\bSHOW\b/.test(text),
    isCreateQuery: /\bCREATE\b/.test(text),
    isDropQuery: /\bDROP\b/.test(text),
    inFromClause: /\bFROM\b/.test(text) && !/\bWHERE\b/.test(text.split('FROM')[1] || ''),
    inWhereClause: /\bWHERE\b/.test(text) && !/\bGROUP\s+BY\b/.test(text.split('WHERE')[1] || ''),
    inGroupByClause: /\bGROUP\s+BY\b/.test(text) && !/\bORDER\s+BY\b/.test(text.split('GROUP BY')[1] || ''),
    inOrderByClause: /\bORDER\s+BY\b/.test(text),
    currentClause: getCurrentClause(text),
    currentPosition: position.column,
    precedingWord: precedingWord.toUpperCase(),
    currentWord: currentWord.toUpperCase(),
    currentDatabase,
    tablesInQuery,
    currentTable,
    expectingFieldName,
    expectingTableName
  };
};

// 获取当前子句
const getCurrentClause = (text: string): string => {
  const clauses = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET'];
  let currentClause = '';
  
  for (const clause of clauses) {
    if (text.includes(clause)) {
      currentClause = clause;
    }
  }
  
  return currentClause;
};

// 从查询中提取表名
const extractTablesFromQuery = (queryText: string): string[] => {
  const tables: string[] = [];
  
  // 匹配 FROM 后面的表名
  const fromMatches = queryText.match(/\bFROM\s+["']?([a-zA-Z_][a-zA-Z0-9_.]*)["']?/gi);
  if (fromMatches) {
    fromMatches.forEach(match => {
      const tableName = match.replace(/\bFROM\s+["']?/i, '').replace(/["']?$/, '');
      if (tableName && !tables.includes(tableName)) {
        tables.push(tableName);
      }
    });
  }
  
  // 匹配 JOIN 后面的表名
  const joinMatches = queryText.match(/\b(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+)?JOIN\s+["']?([a-zA-Z_][a-zA-Z0-9_.]*)["']?/gi);
  if (joinMatches) {
    joinMatches.forEach(match => {
      const tableName = match.replace(/\b(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+)?JOIN\s+["']?/i, '').replace(/["']?$/, '');
      if (tableName && !tables.includes(tableName)) {
        tables.push(tableName);
      }
    });
  }
  
  // 匹配 INTO 后面的表名
  const intoMatches = queryText.match(/\bINTO\s+["']?([a-zA-Z_][a-zA-Z0-9_.]*)["']?/gi);
  if (intoMatches) {
    intoMatches.forEach(match => {
      const tableName = match.replace(/\bINTO\s+["']?/i, '').replace(/["']?$/, '');
      if (tableName && !tables.includes(tableName)) {
        tables.push(tableName);
      }
    });
  }
  
  return tables;
};

// 根据上下文确定当前表
const getCurrentTableContext = (textUntilPosition: string, tablesInQuery: string[]): string | undefined => {
  if (tablesInQuery.length === 0) return undefined;
  if (tablesInQuery.length === 1) return tablesInQuery[0];
  
  const text = textUntilPosition.toUpperCase();
  
  // 如果在FROM子句中，返回最近的表名
  const fromMatch = text.match(/\bFROM\s+["']?([a-zA-Z_][a-zA-Z0-9_.]*)["']?[^,]*$/i);
  if (fromMatch) {
    const tableName = fromMatch[1];
    if (tablesInQuery.includes(tableName)) {
      return tableName;
    }
  }
  
  // 默认返回第一个表
  return tablesInQuery[0];
};

// InfluxQL 语言定义
export const influxqlLanguageDefinition: monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.influxql',
  ignoreCase: true,

  keywords: [
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET',
    'AS', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
    'SHOW', 'CREATE', 'DROP', 'ALTER', 'INSERT', 'DELETE', 'UPDATE',
    'DATABASE', 'DATABASES', 'MEASUREMENT', 'MEASUREMENTS', 'SERIES',
    'TAG', 'TAGS', 'FIELD', 'FIELDS', 'KEY', 'KEYS', 'VALUES',
    'RETENTION', 'POLICY', 'POLICIES', 'CONTINUOUS', 'QUERY', 'QUERIES',
    'USER', 'USERS', 'PRIVILEGE', 'PRIVILEGES', 'GRANT', 'REVOKE',
    'ON', 'TO', 'WITH', 'PASSWORD', 'ADMIN', 'ALL', 'READ', 'WRITE',
    'TIME', 'NOW', 'DURATION', 'FILL', 'PREVIOUS', 'LINEAR', 'NONE',
    'ASC', 'DESC', 'SLIMIT', 'SOFFSET', 'TZ'
  ],

  functions: [
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
  ],

  operators: [
    '=', '!=', '<>', '<', '<=', '>', '>=', '+', '-', '*', '/', '%',
    '=~', '!~'
  ],

  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // 标识符和关键字
      [/[a-z_$][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@functions': 'predefined',
          '@default': 'identifier'
        }
      }],

      // 数字
      [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],

      // 字符串
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],

      // 正则表达式
      [/\/([^/\\]|\\.)*\//, 'regexp'],

      // 时间字面量
      [/\d+[a-z]+/, 'number.time'],

      // 操作符
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': ''
        }
      }],

      // 分隔符
      [/[;,.]/, 'delimiter'],
      [/[(){}[\]]/, '@brackets'],

      // 空白字符
      [/[ \t\r\n]+/, 'white'],

      // 注释
      [/--.*$/, 'comment'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop']
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop']
    ]}};

// 定义字段和标签信息的映射类型
interface FieldTagMap {
  [measurementName: string]: {
    fields: string[];
    tags: string[];
  };
}

// 增强的 InfluxQL 自动补全提供器
export const createInfluxQLCompletionProvider = (
  databases: string[],
  measurements: string[],
  fields: string[],
  tags: string[],
  influxVersion: string = '1.8',
  currentDatabase?: string,
  fieldTagMap?: FieldTagMap,
  getFieldsForMeasurement?: (measurement: string) => Promise<string[]>,
  getTagsForMeasurement?: (measurement: string) => Promise<string[]>
): monaco.languages.CompletionItemProvider => ({
  provideCompletionItems: async (model, position) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    const context = analyzeQueryContext(model, position, currentDatabase);
    const versionConfig = INFLUXDB_VERSIONS[influxVersion] || INFLUXDB_VERSIONS['1.8'];
    const suggestions: monaco.languages.CompletionItem[] = [];

    // 智能上下文建议系统
    if (context.expectingTableName) {
      // 当期望表名时，优先显示当前数据库中的测量名
      const currentMeasurements = currentDatabase ? measurements : measurements;
      addMeasurementSuggestions(suggestions, currentMeasurements, range);
    } else if (context.expectingFieldName) {
      // 当期望字段名时，根据当前表上下文提供字段建议
      if (context.currentTable && fieldTagMap && fieldTagMap[context.currentTable]) {
        // 如果有特定表的字段信息，使用该信息
        const tableInfo = fieldTagMap[context.currentTable];
        addFieldSuggestions(suggestions, tableInfo.fields, range);
        addTagSuggestions(suggestions, tableInfo.tags, range);
      } else if (context.currentTable && getFieldsForMeasurement && getTagsForMeasurement) {
        // 异步获取字段信息
        try {
          const [tableFields, tableTags] = await Promise.all([
            getFieldsForMeasurement(context.currentTable),
            getTagsForMeasurement(context.currentTable)
          ]);
          addFieldSuggestions(suggestions, tableFields, range);
          addTagSuggestions(suggestions, tableTags, range);
        } catch (error) {
          // 如果获取失败，使用默认字段
          addFieldSuggestions(suggestions, fields, range);
          addTagSuggestions(suggestions, tags, range);
        }
      } else {
        // 使用默认字段和标签
        addFieldSuggestions(suggestions, fields, range);
        addTagSuggestions(suggestions, tags, range);
      }
      addSpecialFieldSuggestions(suggestions, range);
      addFunctionSuggestions(suggestions, versionConfig.supportedFunctions, range);
    } else if (context.precedingWord === 'SELECT' || (context.isSelectQuery && context.currentClause === 'SELECT')) {
      // SELECT 子句中优先显示字段和函数
      addFieldSuggestions(suggestions, fields, range);
      addFunctionSuggestions(suggestions, versionConfig.supportedFunctions, range);
      addSpecialFieldSuggestions(suggestions, range);
    } else if (context.precedingWord === 'FROM' || context.inFromClause) {
      // FROM 子句中显示当前数据库的测量名
      const currentMeasurements = currentDatabase ? measurements : measurements;
      addMeasurementSuggestions(suggestions, currentMeasurements, range);
    } else if (context.precedingWord === 'WHERE' || context.inWhereClause) {
      // WHERE 子句中根据表上下文显示字段、标签和操作符
      if (context.currentTable && fieldTagMap && fieldTagMap[context.currentTable]) {
        const tableInfo = fieldTagMap[context.currentTable];
        addFieldSuggestions(suggestions, tableInfo.fields, range);
        addTagSuggestions(suggestions, tableInfo.tags, range);
      } else {
        addFieldSuggestions(suggestions, fields, range);
        addTagSuggestions(suggestions, tags, range);
      }
      addOperatorSuggestions(suggestions, range);
      addTimeSuggestions(suggestions, range);
    } else if (context.precedingWord === 'GROUP' || context.inGroupByClause) {
      // GROUP BY 子句
      if (context.currentTable && fieldTagMap && fieldTagMap[context.currentTable]) {
        const tableInfo = fieldTagMap[context.currentTable];
        addGroupBySuggestions(suggestions, tableInfo.tags, range);
      } else {
        addGroupBySuggestions(suggestions, tags, range);
      }
    } else if (context.precedingWord === 'ORDER' || context.inOrderByClause) {
      // ORDER BY 子句
      if (context.currentTable && fieldTagMap && fieldTagMap[context.currentTable]) {
        const tableInfo = fieldTagMap[context.currentTable];
        addOrderBySuggestions(suggestions, tableInfo.fields, range);
      } else {
        addOrderBySuggestions(suggestions, fields, range);
      }
    } else if (context.precedingWord === 'SHOW') {
      // SHOW 语句建议
      addShowSuggestions(suggestions, range, versionConfig);
    } else if (context.precedingWord === 'CREATE') {
      // CREATE 语句建议
      addCreateSuggestions(suggestions, range, versionConfig);
    } else if (context.precedingWord === 'DROP') {
      // DROP 语句建议
      addDropSuggestions(suggestions, range, versionConfig);
    } else {
      // 默认建议：关键字、函数、数据等
      addKeywordSuggestions(suggestions, versionConfig.supportedKeywords, range);
      addFunctionSuggestions(suggestions, versionConfig.supportedFunctions, range);
      if (currentDatabase) {
        // 如果有当前数据库，只显示该数据库的建议
        addMeasurementSuggestions(suggestions, measurements, range);
      } else {
        addDatabaseSuggestions(suggestions, databases, range);
      }
    }

    // 添加查询模板（在合适的上下文中）
    if (!context.isSelectQuery && !context.isShowQuery && !context.isCreateQuery) {
      addQueryTemplates(suggestions, range, versionConfig);
    }

    // 排序建议：优先级高的在前
    suggestions.sort((a, b) => {
      const priorityA = getSuggestionPriority(a, context);
      const priorityB = getSuggestionPriority(b, context);
      return priorityB - priorityA;
    });

    return { suggestions };
  }
});

// 获取建议优先级
const getSuggestionPriority = (suggestion: monaco.languages.CompletionItem, context: QueryContext): number => {
  if (context.inFromClause && suggestion.kind === monaco.languages.CompletionItemKind.Class) return 100;
  if (context.inWhereClause && suggestion.kind === monaco.languages.CompletionItemKind.Field) return 90;
  if (context.inWhereClause && suggestion.kind === monaco.languages.CompletionItemKind.Property) return 85;
  if (suggestion.kind === monaco.languages.CompletionItemKind.Function) return 80;
  if (suggestion.kind === monaco.languages.CompletionItemKind.Keyword) return 70;
  if (suggestion.kind === monaco.languages.CompletionItemKind.Snippet) return 60;
  return 50;
};

// 添加字段建议
const addFieldSuggestions = (suggestions: monaco.languages.CompletionItem[], fields: string[], range: monaco.IRange) => {
  fields.forEach(field => {
    suggestions.push({
      label: field,
      kind: monaco.languages.CompletionItemKind.Field,
      insertText: needsQuotes(field) ? `"${field}"` : field,
      range,
      documentation: `Field: ${field}`,
      detail: 'Field Key'
    });
  });
};

// 添加标签建议
const addTagSuggestions = (suggestions: monaco.languages.CompletionItem[], tags: string[], range: monaco.IRange) => {
  tags.forEach(tag => {
    suggestions.push({
      label: tag,
      kind: monaco.languages.CompletionItemKind.Property,
      insertText: needsQuotes(tag) ? `"${tag}"` : tag,
      range,
      documentation: `Tag: ${tag}`,
      detail: 'Tag Key'
    });
  });
};

// 添加测量建议
const addMeasurementSuggestions = (suggestions: monaco.languages.CompletionItem[], measurements: string[], range: monaco.IRange) => {
  measurements.forEach(measurement => {
    suggestions.push({
      label: measurement,
      kind: monaco.languages.CompletionItemKind.Class,
      insertText: needsQuotes(measurement) ? `"${measurement}"` : measurement,
      range,
      documentation: `Measurement: ${measurement}`,
      detail: 'Measurement'
    });
  });
};

// 添加数据库建议
const addDatabaseSuggestions = (suggestions: monaco.languages.CompletionItem[], databases: string[], range: monaco.IRange) => {
  databases.forEach(db => {
    suggestions.push({
      label: db,
      kind: monaco.languages.CompletionItemKind.Module,
      insertText: needsQuotes(db) ? `"${db}"` : db,
      range,
      documentation: `Database: ${db}`,
      detail: 'Database'
    });
  });
};

// 添加函数建议
const addFunctionSuggestions = (suggestions: monaco.languages.CompletionItem[], functions: string[], range: monaco.IRange) => {
  const functionDocs: Record<string, string> = {
    'COUNT': 'Returns the number of non-null field values',
    'MEAN': 'Returns the arithmetic mean (average) of field values',
    'SUM': 'Returns the sum of field values',
    'MIN': 'Returns the lowest field value',
    'MAX': 'Returns the highest field value',
    'FIRST': 'Returns the field value with the oldest timestamp',
    'LAST': 'Returns the field value with the most recent timestamp',
    'MEDIAN': 'Returns the middle value from a sorted list of field values',
    'MODE': 'Returns the most frequent value in a list of field values',
    'STDDEV': 'Returns the standard deviation of field values',
    'DERIVATIVE': 'Returns the rate of change between subsequent field values',
    'DIFFERENCE': 'Returns the result of subtraction between subsequent field values',
    'MOVING_AVERAGE': 'Returns the rolling average across a window of subsequent field values'
  };

  functions.forEach(func => {
    const hasParameters = !['NOW'].includes(func);
    suggestions.push({
      label: func,
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: hasParameters ? `${func}(\${1})` : func,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      documentation: functionDocs[func] || `InfluxQL function: ${func}`,
      detail: 'Function'
    });
  });
};

// 添加关键字建议
const addKeywordSuggestions = (suggestions: monaco.languages.CompletionItem[], keywords: string[], range: monaco.IRange) => {
  keywords.forEach(keyword => {
    suggestions.push({
      label: keyword,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: keyword,
      range,
      documentation: `InfluxQL keyword: ${keyword}`,
      detail: 'Keyword'
    });
  });
};

// 添加特殊字段建议
const addSpecialFieldSuggestions = (suggestions: monaco.languages.CompletionItem[], range: monaco.IRange) => {
  ['*', 'time'].forEach(field => {
    suggestions.push({
      label: field,
      kind: monaco.languages.CompletionItemKind.Field,
      insertText: field,
      range,
      documentation: field === '*' ? 'Select all fields and tags' : 'Timestamp field',
      detail: 'Special Field'
    });
  });
};

// 添加操作符建议
const addOperatorSuggestions = (suggestions: monaco.languages.CompletionItem[], range: monaco.IRange) => {
  const operators = [
    { op: '=', desc: 'Equal to' },
    { op: '!=', desc: 'Not equal to' },
    { op: '<>', desc: 'Not equal to (alternative)' },
    { op: '>', desc: 'Greater than' },
    { op: '>=', desc: 'Greater than or equal to' },
    { op: '<', desc: 'Less than' },
    { op: '<=', desc: 'Less than or equal to' },
    { op: '=~', desc: 'Matches regular expression' },
    { op: '!~', desc: 'Does not match regular expression' },
    { op: 'AND', desc: 'Logical AND' },
    { op: 'OR', desc: 'Logical OR' }
  ];

  operators.forEach(({ op, desc }) => {
    suggestions.push({
      label: op,
      kind: monaco.languages.CompletionItemKind.Operator,
      insertText: ` ${op} `,
      range,
      documentation: desc,
      detail: 'Operator'
    });
  });
};

// 添加时间建议
const addTimeSuggestions = (suggestions: monaco.languages.CompletionItem[], range: monaco.IRange) => {
  const timeExpressions = [
    { label: 'now()', insert: 'now()', desc: 'Current timestamp' },
    { label: 'time > now() - 1h', insert: 'time > now() - 1h', desc: 'Last 1 hour' },
    { label: 'time > now() - 1d', insert: 'time > now() - 1d', desc: 'Last 1 day' },
    { label: 'time > now() - 1w', insert: 'time > now() - 1w', desc: 'Last 1 week' },
    { label: 'time > now() - 30d', insert: 'time > now() - 30d', desc: 'Last 30 days' }
  ];

  timeExpressions.forEach(({ label, insert, desc }) => {
    suggestions.push({
      label,
      kind: monaco.languages.CompletionItemKind.Value,
      insertText: insert,
      range,
      documentation: desc,
      detail: 'Time Expression'
    });
  });
};

// 添加 GROUP BY 建议
const addGroupBySuggestions = (suggestions: monaco.languages.CompletionItem[], tags: string[], range: monaco.IRange) => {
  // 时间分组
  ['time(1s)', 'time(1m)', 'time(5m)', 'time(1h)', 'time(1d)'].forEach(timeGroup => {
    suggestions.push({
      label: timeGroup,
      kind: monaco.languages.CompletionItemKind.Value,
      insertText: timeGroup,
      range,
      documentation: `Group by ${timeGroup}`,
      detail: 'Time Grouping'
    });
  });

  // 标签分组
  tags.forEach(tag => {
    suggestions.push({
      label: tag,
      kind: monaco.languages.CompletionItemKind.Property,
      insertText: needsQuotes(tag) ? `"${tag}"` : tag,
      range,
      documentation: `Group by tag: ${tag}`,
      detail: 'Tag Grouping'
    });
  });
};

// 添加 ORDER BY 建议
const addOrderBySuggestions = (suggestions: monaco.languages.CompletionItem[], fields: string[], range: monaco.IRange) => {
  ['time', 'ASC', 'DESC'].forEach(item => {
    suggestions.push({
      label: item,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: item,
      range,
      documentation: `Order by ${item}`,
      detail: 'Order'
    });
  });

  fields.forEach(field => {
    suggestions.push({
      label: field,
      kind: monaco.languages.CompletionItemKind.Field,
      insertText: needsQuotes(field) ? `"${field}"` : field,
      range,
      documentation: `Order by field: ${field}`,
      detail: 'Field'
    });
  });
};

// 添加 SHOW 语句建议
const addShowSuggestions = (suggestions: monaco.languages.CompletionItem[], range: monaco.IRange, config: InfluxDBVersionConfig) => {
  const showCommands = [
    'DATABASES', 'MEASUREMENTS', 'SERIES', 'FIELD KEYS', 'TAG KEYS', 'TAG VALUES'
  ];

  if (config.features.retentionPolicies) {
    showCommands.push('RETENTION POLICIES');
  }
  if (config.features.continuousQueries) {
    showCommands.push('CONTINUOUS QUERIES');
  }
  if (config.features.userManagement) {
    showCommands.push('USERS', 'GRANTS');
  }

  showCommands.forEach(cmd => {
    suggestions.push({
      label: cmd,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: cmd,
      range,
      documentation: `Show ${cmd.toLowerCase()}`,
      detail: 'Show Command'
    });
  });
};

// 添加 CREATE 语句建议
const addCreateSuggestions = (suggestions: monaco.languages.CompletionItem[], range: monaco.IRange, config: InfluxDBVersionConfig) => {
  const createCommands = ['DATABASE'];

  if (config.features.retentionPolicies) {
    createCommands.push('RETENTION POLICY');
  }
  if (config.features.continuousQueries) {
    createCommands.push('CONTINUOUS QUERY');
  }
  if (config.features.userManagement) {
    createCommands.push('USER');
  }

  createCommands.forEach(cmd => {
    suggestions.push({
      label: cmd,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: cmd,
      range,
      documentation: `Create ${cmd.toLowerCase()}`,
      detail: 'Create Command'
    });
  });
};

// 添加 DROP 语句建议
const addDropSuggestions = (suggestions: monaco.languages.CompletionItem[], range: monaco.IRange, config: InfluxDBVersionConfig) => {
  const dropCommands = ['DATABASE', 'MEASUREMENT', 'SERIES'];

  if (config.features.retentionPolicies) {
    dropCommands.push('RETENTION POLICY');
  }
  if (config.features.continuousQueries) {
    dropCommands.push('CONTINUOUS QUERY');
  }
  if (config.features.userManagement) {
    dropCommands.push('USER');
  }

  dropCommands.forEach(cmd => {
    suggestions.push({
      label: cmd,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: cmd,
      range,
      documentation: `Drop ${cmd.toLowerCase()}`,
      detail: 'Drop Command'
    });
  });
};

// 添加查询模板
const addQueryTemplates = (suggestions: monaco.languages.CompletionItem[], range: monaco.IRange, config: InfluxDBVersionConfig) => {
  const templates = [
    {
      label: 'SELECT basic query',
      insertText: 'SELECT ${1:field} FROM "${2:measurement}" WHERE ${3:condition}',
      documentation: 'Basic SELECT query template',
      detail: 'Template'
    },
    {
      label: 'SELECT with time range',
      insertText: 'SELECT ${1:field} FROM "${2:measurement}" WHERE time > now() - ${3:1h}',
      documentation: 'SELECT query with time range',
      detail: 'Template'
    },
    {
      label: 'GROUP BY time',
      insertText: 'SELECT ${1:function}(${2:field}) FROM "${3:measurement}" WHERE time > now() - ${4:1h} GROUP BY time(${5:5m})${6: fill(null)}',
      documentation: 'GROUP BY time query template',
      detail: 'Template'
    },
    {
      label: 'SHOW MEASUREMENTS',
      insertText: 'SHOW MEASUREMENTS',
      documentation: 'Show all measurements',
      detail: 'Template'
    }
  ];

  if (config.features.retentionPolicies) {
    templates.push({
      label: 'SHOW RETENTION POLICIES',
      insertText: 'SHOW RETENTION POLICIES',
      documentation: 'Show retention policies',
      detail: 'Template'
    });
  }

  templates.forEach(template => {
    suggestions.push({
      label: template.label,
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: template.insertText,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      range,
      documentation: template.documentation,
      detail: template.detail
    });
  });
};

// 判断是否需要引号
const needsQuotes = (name: string): boolean => {
  // 如果包含特殊字符、空格或以数字开头，需要引号
  return /[^a-zA-Z0-9_]/.test(name) || /^\d/.test(name);
};

// 注册 InfluxQL 语言
export const registerInfluxQLLanguage = () => {
  // 注册语言
  monaco.languages.register({ id: 'influxql' });

  // 设置语言配置
  monaco.languages.setLanguageConfiguration('influxql', {
    comments: {
      lineComment: '--'},
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ]
  });

  // 设置语法高亮
  monaco.languages.setMonarchTokensProvider('influxql', influxqlLanguageDefinition);
};
