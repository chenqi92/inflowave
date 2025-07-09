import * as monaco from 'monaco-editor';

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

  symbols: /[=><!~?:&|+\-*\/\^%]+/,
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
      [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],

      // 字符串
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],

      // 正则表达式
      [/\/([^\/\\]|\\.)*\//, 'regexp'],

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
    ],
  },
};

// InfluxQL 自动补全提供器
export const createInfluxQLCompletionProvider = (
  databases: string[],
  measurements: string[],
  fields: string[],
  tags: string[]
): monaco.languages.CompletionItemProvider => ({
  provideCompletionItems: (model, position) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    const suggestions: monaco.languages.CompletionItem[] = [];

    // 关键字建议
    influxqlLanguageDefinition.keywords?.forEach((keyword: string) => {
      suggestions.push({
        label: keyword,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: keyword,
        range,
        documentation: `InfluxQL keyword: ${keyword}`
      });
    });

    // 函数建议
    influxqlLanguageDefinition.functions?.forEach((func: string) => {
      suggestions.push({
        label: func,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `${func}()`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range,
        documentation: `InfluxQL function: ${func}`
      });
    });

    // 数据库建议
    databases.forEach(db => {
      suggestions.push({
        label: db,
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: `"${db}"`,
        range,
        documentation: `Database: ${db}`
      });
    });

    // 测量建议
    measurements.forEach(measurement => {
      suggestions.push({
        label: measurement,
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: `"${measurement}"`,
        range,
        documentation: `Measurement: ${measurement}`
      });
    });

    // 字段建议
    fields.forEach(field => {
      suggestions.push({
        label: field,
        kind: monaco.languages.CompletionItemKind.Field,
        insertText: `"${field}"`,
        range,
        documentation: `Field: ${field}`
      });
    });

    // 标签建议
    tags.forEach(tag => {
      suggestions.push({
        label: tag,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText: `"${tag}"`,
        range,
        documentation: `Tag: ${tag}`
      });
    });

    // 常用查询模板
    const templates = [
      {
        label: 'SELECT template',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'SELECT ${1:field} FROM "${2:measurement}" WHERE ${3:condition}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Basic SELECT query template'
      },
      {
        label: 'GROUP BY time template',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'SELECT ${1:function}(${2:field}) FROM "${3:measurement}" WHERE time >= ${4:start_time} GROUP BY time(${5:interval})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'GROUP BY time query template'
      },
      {
        label: 'SHOW MEASUREMENTS',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'SHOW MEASUREMENTS',
        documentation: 'Show all measurements'
      },
      {
        label: 'SHOW FIELD KEYS',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'SHOW FIELD KEYS FROM "${1:measurement}"',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Show field keys for a measurement'
      },
      {
        label: 'SHOW TAG KEYS',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'SHOW TAG KEYS FROM "${1:measurement}"',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Show tag keys for a measurement'
      }
    ];

    suggestions.push(...templates);

    return { suggestions };
  }
});

// 注册 InfluxQL 语言
export const registerInfluxQLLanguage = () => {
  // 注册语言
  monaco.languages.register({ id: 'influxql' });

  // 设置语言配置
  monaco.languages.setLanguageConfiguration('influxql', {
    comments: {
      lineComment: '--',
    },
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
