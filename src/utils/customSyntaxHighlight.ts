import * as monaco from 'monaco-editor';
import type { DatabaseLanguageType } from '@/types/database';

// 语法高亮配置接口
export interface SyntaxHighlightConfig {
  id: string;
  name: string;
  keywords: string[];
  functions: string[];
  operators: string[];
  dataTypes?: string[];
  builtinConstants?: string[];
  commentPatterns: {
    singleLine: string[];
    multiLine?: { start: string; end: string };
  };
  stringPatterns: {
    single: boolean;
    double: boolean;
    backtick?: boolean;
  };
  numberPatterns: {
    integer: boolean;
    float: boolean;
    scientific: boolean;
    hex?: boolean;
    binary?: boolean;
  };
  specialPatterns?: Array<{
    pattern: RegExp;
    token: string;
    description: string;
  }>;
}

// 主题配置接口
export interface CustomThemeConfig {
  name: string;
  base: 'vs' | 'vs-dark' | 'hc-black';
  rules: Array<{
    token: string;
    foreground: string;
    fontStyle?: string;
    background?: string;
  }>;
  colors?: Record<string, string>;
}

// SQL语法配置
export const sqlSyntaxConfig: SyntaxHighlightConfig = {
  id: 'custom-sql',
  name: 'SQL',
  keywords: [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'AS',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'DISTINCT', 'ALL',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP',
    'INDEX', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION', 'DATABASE', 'SCHEMA',
    'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'NOT', 'NULL', 'DEFAULT',
    'CHECK', 'CONSTRAINT', 'AUTO_INCREMENT', 'IDENTITY',
    'UNION', 'INTERSECT', 'EXCEPT', 'EXISTS', 'IN', 'BETWEEN', 'LIKE', 'ILIKE',
    'IS', 'AND', 'OR', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'ELSEIF',
    'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'SAVEPOINT',
    'GRANT', 'REVOKE', 'DENY', 'EXECUTE', 'USAGE'
  ],
  functions: [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST', 'LAST',
    'UPPER', 'LOWER', 'LENGTH', 'SUBSTRING', 'TRIM', 'LTRIM', 'RTRIM',
    'CONCAT', 'REPLACE', 'REVERSE', 'LEFT', 'RIGHT',
    'NOW', 'GETDATE', 'DATEADD', 'DATEDIFF', 'DATEPART', 'YEAR', 'MONTH', 'DAY',
    'ABS', 'ROUND', 'FLOOR', 'CEILING', 'POWER', 'SQRT', 'LOG', 'EXP',
    'CAST', 'CONVERT', 'COALESCE', 'NULLIF', 'ISNULL', 'IFNULL',
    'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD'
  ],
  operators: ['=', '!=', '<>', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '||', '&&'],
  dataTypes: [
    'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL', 'DOUBLE',
    'CHAR', 'VARCHAR', 'TEXT', 'NCHAR', 'NVARCHAR', 'NTEXT',
    'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
    'BOOLEAN', 'BOOL', 'BIT', 'BINARY', 'VARBINARY', 'BLOB', 'CLOB'
  ],
  builtinConstants: ['TRUE', 'FALSE', 'NULL', 'UNKNOWN'],
  commentPatterns: {
    singleLine: ['--', '#'],
    multiLine: { start: '/*', end: '*/' }
  },
  stringPatterns: {
    single: true,
    double: true,
    backtick: true
  },
  numberPatterns: {
    integer: true,
    float: true,
    scientific: true,
    hex: true
  }
};

// InfluxQL语法配置
export const influxqlSyntaxConfig: SyntaxHighlightConfig = {
  id: 'custom-influxql',
  name: 'InfluxQL',
  keywords: [
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET', 'SLIMIT', 'SOFFSET',
    'INTO', 'FILL', 'TIME', 'AS', 'AND', 'OR', 'NOT', 'LIKE', 'REGEXP', 'RLIKE',
    'IN', 'BETWEEN', 'IS', 'NULL', 'TRUE', 'FALSE', 'ASC', 'DESC', 'DISTINCT',
    'SHOW', 'CREATE', 'DROP', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'GRANT', 'REVOKE',
    'EXPLAIN', 'ANALYZE', 'BEGIN', 'COMMIT', 'ROLLBACK',
    'DATABASES', 'MEASUREMENTS', 'SERIES', 'FIELD', 'KEYS', 'TAG', 'VALUES',
    'USERS', 'QUERIES', 'STATS', 'DIAGNOSTICS', 'SHARDS', 'SHARD', 'GROUPS',
    'SUBSCRIPTIONS', 'RETENTION', 'POLICIES', 'CONTINUOUS'
  ],
  functions: [
    'COUNT', 'SUM', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV', 'SAMPLE',
    'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'TOP', 'BOTTOM',
    'DERIVATIVE', 'DIFFERENCE', 'ELAPSED_TIME', 'MOVING_AVERAGE', 'CUMULATIVE_SUM',
    'HOLT_WINTERS', 'HOLT_WINTERS_WITH_FIT', 'INTEGRAL', 'NON_NEGATIVE_DERIVATIVE',
    'NON_NEGATIVE_DIFFERENCE', 'ABS', 'ACOS', 'ASIN', 'ATAN', 'ATAN2', 'CEIL',
    'COS', 'EXP', 'FLOOR', 'LN', 'LOG', 'LOG2', 'LOG10', 'POW', 'ROUND',
    'SIN', 'SQRT', 'TAN', 'NOW'
  ],
  operators: ['=', '!=', '<>', '<', '>', '<=', '>=', '+', '-', '*', '/', '=~', '!~'],
  builtinConstants: ['TRUE', 'FALSE', 'NULL', 'LINEAR', 'NONE', 'PREVIOUS'],
  commentPatterns: {
    singleLine: ['--'],
    multiLine: { start: '/*', end: '*/' }
  },
  stringPatterns: {
    single: true,
    double: true
  },
  numberPatterns: {
    integer: true,
    float: true,
    scientific: true
  },
  specialPatterns: [
    {
      pattern: /\b\d+(?:ns|u|µ|ms|s|m|h|d|w)\b/,
      token: 'keyword.time',
      description: 'Time duration literals'
    },
    {
      pattern: /\b(?:ns|u|µ|ms|s|m|h|d|w)\b/,
      token: 'keyword.time',
      description: 'Time units'
    }
  ]
};

// Flux语法配置
export const fluxSyntaxConfig: SyntaxHighlightConfig = {
  id: 'custom-flux',
  name: 'Flux',
  keywords: [
    'import', 'package', 'option', 'builtin', 'testcase',
    'if', 'then', 'else', 'return', 'and', 'or', 'not',
    'true', 'false', 'null', 'exists'
  ],
  functions: [
    'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
    'max', 'min', 'first', 'last', 'map', 'keep', 'drop', 'pivot', 'join',
    'union', 'yield', 'to', 'sort', 'limit', 'unique', 'distinct',
    'window', 'timeShift', 'fill', 'interpolate', 'derivative', 'difference',
    'increase', 'rate', 'histogram', 'quantile', 'covariance', 'correlation',
    'pearsonr', 'skew', 'spread', 'stddev', 'median', 'mode'
  ],
  operators: ['==', '!=', '<', '>', '<=', '>=', '+', '-', '*', '/', '%', '=~', '!~', '|>'],
  builtinConstants: ['true', 'false', 'null'],
  commentPatterns: {
    singleLine: ['//'],
    multiLine: { start: '/*', end: '*/' }
  },
  stringPatterns: {
    single: false,
    double: true
  },
  numberPatterns: {
    integer: true,
    float: true,
    scientific: true
  },
  specialPatterns: [
    {
      pattern: /\|>/,
      token: 'operator.pipe',
      description: 'Pipe operator'
    }
  ]
};

// 数据库类型到语法配置的映射
export const syntaxConfigMap: Record<DatabaseLanguageType, SyntaxHighlightConfig> = {
  sql: sqlSyntaxConfig,
  influxql: influxqlSyntaxConfig,
  flux: fluxSyntaxConfig,
  mysql: sqlSyntaxConfig, // 暂时使用通用SQL配置
  postgresql: sqlSyntaxConfig, // 暂时使用通用SQL配置
  mongodb: sqlSyntaxConfig, // 暂时使用通用SQL配置，后续可扩展
  unknown: sqlSyntaxConfig
};

// 主题配置
export const lightTheme: CustomThemeConfig = {
  name: 'custom-light',
  base: 'vs',
  rules: [
    { token: 'comment', foreground: '008000', fontStyle: 'italic' },
    { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
    { token: 'keyword.function', foreground: 'DC143C', fontStyle: 'bold' },
    { token: 'keyword.time', foreground: 'FF6600', fontStyle: 'bold' },
    { token: 'datatype', foreground: '2B91AF', fontStyle: 'bold' },
    { token: 'constant', foreground: '800080', fontStyle: 'bold' },
    { token: 'string', foreground: 'A31515' },
    { token: 'string.escape', foreground: 'FF0000' },
    { token: 'number', foreground: '098658' },
    { token: 'number.float', foreground: '098658' },
    { token: 'number.hex', foreground: '3030c0' },
    { token: 'operator', foreground: '666666', fontStyle: 'bold' },
    { token: 'operator.pipe', foreground: 'FF6600', fontStyle: 'bold' },
    { token: 'identifier', foreground: '000000' },
    { token: 'delimiter', foreground: '666666' },
    { token: 'bracket', foreground: '000000', fontStyle: 'bold' }
  ]
};

export const darkTheme: CustomThemeConfig = {
  name: 'custom-dark',
  base: 'vs-dark',
  rules: [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'keyword.function', foreground: 'FF6B6B', fontStyle: 'bold' },
    { token: 'keyword.time', foreground: 'FF9500', fontStyle: 'bold' },
    { token: 'datatype', foreground: '4EC9B0', fontStyle: 'bold' },
    { token: 'constant', foreground: 'C586C0', fontStyle: 'bold' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'string.escape', foreground: 'D7BA7D' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'number.float', foreground: 'B5CEA8' },
    { token: 'number.hex', foreground: '6CBFFF' },
    { token: 'operator', foreground: 'CCCCCC', fontStyle: 'bold' },
    { token: 'operator.pipe', foreground: 'FF9500', fontStyle: 'bold' },
    { token: 'identifier', foreground: 'D4D4D4' },
    { token: 'delimiter', foreground: 'CCCCCC' },
    { token: 'bracket', foreground: 'FFD700', fontStyle: 'bold' }
  ]
};

// 生成Monaco Monarch语言定义
export function generateMonarchLanguage(config: SyntaxHighlightConfig): monaco.languages.IMonarchLanguage {
  const rules: monaco.languages.IMonarchLanguageRule[] = [];

  // 注释处理
  config.commentPatterns.singleLine.forEach(pattern => {
    rules.push([new RegExp(`${escapeRegExp(pattern)}.*$`), 'comment']);
  });

  // 多行注释
  if (config.commentPatterns.multiLine) {
    rules.push([new RegExp(`${escapeRegExp(config.commentPatterns.multiLine.start)}`), 'comment', '@comment']);
  }

  // 字符串处理
  if (config.stringPatterns.single) {
    rules.push([/'([^'\\]|\\.)*$/, 'string.invalid']);
    rules.push([/'/, 'string', '@string_single']);
  }
  if (config.stringPatterns.double) {
    rules.push([/"([^"\\]|\\.)*$/, 'string.invalid']);
    rules.push([/"/, 'string', '@string_double']);
  }
  if (config.stringPatterns.backtick) {
    rules.push([/`([^`\\]|\\.)*$/, 'string.invalid']);
    rules.push([/`/, 'string', '@string_backtick']);
  }

  // 特殊模式处理
  if (config.specialPatterns) {
    config.specialPatterns.forEach(sp => {
      rules.push([sp.pattern, sp.token]);
    });
  }

  // 关键字、函数、数据类型、常量匹配
  rules.push([/[a-zA-Z_]\w*/, {
    cases: {
      '@keywords': 'keyword',
      '@builtins': 'keyword.function',
      '@datatypes': 'datatype',
      '@constants': 'constant',
      '@default': 'identifier'
    }
  }]);

  // 数字处理
  if (config.numberPatterns.hex) {
    rules.push([/0[xX][0-9a-fA-F]+/, 'number.hex']);
  }
  if (config.numberPatterns.binary) {
    rules.push([/0[bB][01]+/, 'number.binary']);
  }
  if (config.numberPatterns.scientific) {
    rules.push([/\d*\.\d+([eE][+-]?\d+)?/, 'number.float']);
    rules.push([/\d+[eE][+-]?\d+/, 'number.float']);
  }
  if (config.numberPatterns.float) {
    rules.push([/\d*\.\d+/, 'number.float']);
  }
  if (config.numberPatterns.integer) {
    rules.push([/\d+/, 'number']);
  }

  // 操作符
  config.operators.forEach(op => {
    rules.push([new RegExp(escapeRegExp(op)), 'operator']);
  });

  // 分隔符和括号
  rules.push([/[;,.]/, 'delimiter']);
  rules.push([/[(){}[\]]/, 'bracket']);

  // 空白字符
  rules.push([/\s+/, 'white']);

  // 构建comment规则
  const commentRules: monaco.languages.IMonarchLanguageRule[] = [
    [/[^/*]+/, 'comment'],
    [/[/*]/, 'comment']
  ];

  if (config.commentPatterns.multiLine) {
    commentRules.splice(1, 0, [new RegExp(`${escapeRegExp(config.commentPatterns.multiLine.end)}`), 'comment', '@pop']);
  }

  const monarchLanguage: monaco.languages.IMonarchLanguage = {
    keywords: config.keywords,
    builtins: config.functions,
    datatypes: config.dataTypes || [],
    constants: config.builtinConstants || [],
    operators: config.operators,

    tokenizer: {
      root: rules,
      comment: commentRules,
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
      string_backtick: [
        [/[^\\`]+/, 'string'],
        [/\\./, 'string.escape'],
        [/`/, 'string', '@pop']
      ]
    }
  };

  return monarchLanguage;
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 自定义语法高亮管理器
export class CustomSyntaxHighlightManager {
  private registeredLanguages = new Set<string>();
  private registeredThemes = new Set<string>();

  // 注册语言
  registerLanguage(databaseType: DatabaseLanguageType): void {
    const config = syntaxConfigMap[databaseType];
    if (!config) {
      console.warn(`⚠️ 未找到数据库类型 ${databaseType} 的语法配置`);
      return;
    }

    const languageId = config.id;

    try {
      // 检查是否已注册
      if (!this.registeredLanguages.has(languageId)) {
        console.log(`📝 注册自定义语言: ${config.name} (${languageId})`);

        // 注册语言标识符
        monaco.languages.register({
          id: languageId,
          extensions: [`.${databaseType}`],
          aliases: [config.name, languageId],
          mimetypes: [`text/x-${databaseType}`]
        });

        this.registeredLanguages.add(languageId);
      } else {
        console.log(`✅ 语言 ${config.name} 已注册，更新语法规则...`);
      }

      // 生成并设置Monarch语言定义
      const monarchLanguage = generateMonarchLanguage(config);
      console.log(`🔧 设置 ${config.name} 的语法高亮规则...`);
      console.log(`🔍 语法规则预览:`, {
        keywords: config.keywords.length,
        functions: config.functions.length,
        operators: config.operators.length,
        specialPatterns: config.specialPatterns?.length || 0
      });

      monaco.languages.setMonarchTokensProvider(languageId, monarchLanguage);
      console.log(`✅ ${config.name} 语法高亮规则设置完成`);

    } catch (error) {
      console.error(`❌ 注册语言 ${config.name} 失败:`, error);
    }
  }

  // 注册主题
  registerTheme(theme: CustomThemeConfig): void {
    try {
      if (!this.registeredThemes.has(theme.name)) {
        console.log(`🎨 注册自定义主题: ${theme.name}`);

        monaco.editor.defineTheme(theme.name, {
          base: theme.base,
          inherit: true,
          rules: theme.rules.map(rule => ({
            token: rule.token,
            foreground: rule.foreground,
            fontStyle: rule.fontStyle,
            background: rule.background
          })),
          colors: theme.colors || {}
        });

        this.registeredThemes.add(theme.name);
        console.log(`✅ 主题 ${theme.name} 注册完成`);
      } else {
        console.log(`✅ 主题 ${theme.name} 已存在`);
      }
    } catch (error) {
      console.error(`❌ 注册主题 ${theme.name} 失败:`, error);
    }
  }

  // 注册所有语言和主题
  registerAll(): void {
    console.log('🚀 开始注册所有自定义语法高亮...');

    // 注册所有支持的数据库语言
    Object.keys(syntaxConfigMap).forEach(dbType => {
      this.registerLanguage(dbType as DatabaseLanguageType);
    });

    // 注册主题
    this.registerTheme(lightTheme);
    this.registerTheme(darkTheme);

    console.log('🎉 所有自定义语法高亮注册完成');
  }

  // 获取语言ID
  getLanguageId(databaseType: DatabaseLanguageType): string {
    const config = syntaxConfigMap[databaseType];
    return config ? config.id : 'custom-sql';
  }

  // 获取主题名称
  getThemeName(isDark: boolean): string {
    return isDark ? 'custom-dark' : 'custom-light';
  }

  // 验证语法高亮
  validateSyntaxHighlight(editor: monaco.editor.IStandaloneCodeEditor): void {
    console.log('🔍 验证自定义语法高亮状态...');

    try {
      const model = editor.getModel();
      if (!model) {
        console.warn('⚠️ 无法获取编辑器模型');
        return;
      }

      const languageId = model.getLanguageId();
      console.log('📋 当前语言ID:', languageId);

      // 检查DOM中的语法高亮元素
      const editorDom = editor.getDomNode();
      if (editorDom) {
        const tokenElements = editorDom.querySelectorAll('.view-line .mtk1, .view-line .mtk2, .view-line .mtk3, .view-line .mtk4, .view-line .mtk5, .view-line .mtk6, .view-line .mtk7, .view-line .mtk8, .view-line .mtk9');
        console.log('🎨 找到的语法高亮元素数量:', tokenElements.length);

        const tokenStats: Record<string, number> = {};
        Array.from(tokenElements).forEach(el => {
          const className = el.className;
          tokenStats[className] = (tokenStats[className] || 0) + 1;
        });
        console.log('🎨 语法高亮元素统计:', tokenStats);

        if (Object.keys(tokenStats).length > 1) {
          console.log('✅ 自定义语法高亮验证成功');
        } else {
          console.warn('⚠️ 自定义语法高亮可能未正确工作');
        }
      }
    } catch (error) {
      console.error('❌ 验证语法高亮失败:', error);
    }
  }
}

// 创建全局实例
export const customSyntaxManager = new CustomSyntaxHighlightManager();
