import * as monaco from 'monaco-editor';

// 语言配置接口
export interface LanguageConfig {
  id: string;
  extensions?: string[];
  aliases?: string[];
  mimetypes?: string[];
}

// 主题配置接口
export interface ThemeConfig {
  name: string;
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: monaco.editor.ITokenThemeRule[];
  colors: monaco.editor.IColors;
}

// InfluxQL 语言配置
export const influxqlLanguageConfig: LanguageConfig = {
  id: 'influxql',
  extensions: ['.influxql', '.iql'],
  aliases: ['InfluxQL', 'influxql'],
  mimetypes: ['text/x-influxql']
};

// InfluxQL 语法规则
export const influxqlMonarchLanguage: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      // 注释（优先级最高）
      [/--.*$/, 'comment'],
      [/\/\*/, 'comment', '@comment'],

      // 字符串（高优先级）
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string'],
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@dblstring'],

      // 关键字（必须在标识符之前）
      [/\b(?:SELECT|FROM|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT|OFFSET|INTO|FILL|TIME|AS|AND|OR|NOT|LIKE|REGEXP|RLIKE|IN|BETWEEN|IS|NULL|TRUE|FALSE|ASC|DESC|DISTINCT)\b/i, 'keyword'],
      [/\b(?:SHOW|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|GRANT|REVOKE|EXPLAIN|ANALYZE|BEGIN|COMMIT|ROLLBACK)\b/i, 'keyword'],
      [/\b(?:DATABASES|MEASUREMENTS|SERIES|FIELD\s+KEYS|TAG\s+KEYS|TAG\s+VALUES|USERS|QUERIES|STATS|DIAGNOSTICS|SHARDS|SHARD\s+GROUPS|SUBSCRIPTIONS|RETENTION\s+POLICIES|CONTINUOUS\s+QUERIES)\b/i, 'keyword'],

      // InfluxQL函数（在关键字之后，标识符之前）
      [/\b(?:COUNT|SUM|MEAN|MEDIAN|MODE|SPREAD|STDDEV|SAMPLE|FIRST|LAST|MAX|MIN|PERCENTILE|DERIVATIVE|DIFFERENCE|ELAPSED_TIME|MOVING_AVERAGE|CUMULATIVE_SUM|HOLT_WINTERS|HOLT_WINTERS_WITH_FIT|TOP|BOTTOM|INTEGRAL|NON_NEGATIVE_DERIVATIVE|NON_NEGATIVE_DIFFERENCE|ABS|ACOS|ASIN|ATAN|ATAN2|CEIL|COS|EXP|FLOOR|LN|LOG|LOG2|LOG10|POW|ROUND|SIN|SQRT|TAN)\b/i, 'keyword.function'],

      // 数字
      [/\d*\.\d+([eE][+\-]?\d+)?/, 'number.float'],
      [/\d+([eE][+\-]?\d+)?/, 'number'],

      // 时间单位（在数字之后）
      [/\b\d+(?:ns|u|µ|ms|s|m|h|d|w)\b/, 'keyword.time'],
      [/\b(?:ns|u|µ|ms|s|m|h|d|w)\b/, 'keyword.time'],

      // 操作符
      [/[=!<>]=?/, 'operator'],
      [/[+\-*/]/, 'operator'],
      [/[(){}[\]]/, 'bracket'],
      [/[,;]/, 'delimiter'],

      // 标识符（最后匹配）
      [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],

      // 空白字符
      [/\s+/, 'white'],
    ],
    
    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment']
    ],
    
    string: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop']
    ],
    
    dblstring: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop']
    ]
  }
};

// InfluxQL 主题配置
export const influxqlThemes: ThemeConfig[] = [
  {
    name: 'influxql-light',
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
      { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
      { token: 'keyword.function', foreground: 'DC143C', fontStyle: 'bold' },
      { token: 'keyword.time', foreground: 'FF6600', fontStyle: 'bold' },
      { token: 'string', foreground: 'A31515' },
      { token: 'string.escape', foreground: 'FF0000' },
      { token: 'number', foreground: '098658' },
      { token: 'number.float', foreground: '098658' },
      { token: 'operator', foreground: '666666', fontStyle: 'bold' },
      { token: 'identifier', foreground: '000000' },
      { token: 'delimiter', foreground: '666666' },
      { token: 'bracket', foreground: '8B4513', fontStyle: 'bold' },
    ],
    colors: {}
  },
  {
    name: 'influxql-dark',
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'keyword.function', foreground: 'FF6B6B', fontStyle: 'bold' },
      { token: 'keyword.time', foreground: 'FF9500', fontStyle: 'bold' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.escape', foreground: 'D7BA7D' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'number.float', foreground: 'B5CEA8' },
      { token: 'operator', foreground: 'CCCCCC', fontStyle: 'bold' },
      { token: 'identifier', foreground: 'D4D4D4' },
      { token: 'delimiter', foreground: 'CCCCCC' },
      { token: 'bracket', foreground: 'FFD700', fontStyle: 'bold' },
    ],
    colors: {}
  }
];

// SQL 语言配置
export const sqlLanguageConfig: LanguageConfig = {
  id: 'sql',
  extensions: ['.sql'],
  aliases: ['SQL', 'sql'],
  mimetypes: ['text/x-sql']
};

// SQL 主题配置
export const sqlThemes: ThemeConfig[] = [
  {
    name: 'sql-light',
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
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
  },
  {
    name: 'sql-dark',
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
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
  }
];

// Flux 语言配置
export const fluxLanguageConfig: LanguageConfig = {
  id: 'flux',
  extensions: ['.flux'],
  aliases: ['Flux', 'flux'],
  mimetypes: ['text/x-flux']
};

// Flux 主题配置
export const fluxThemes: ThemeConfig[] = [
  {
    name: 'flux-light',
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '008000', fontStyle: 'italic' },
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
  },
  {
    name: 'flux-dark',
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
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
  }
];

// 语言注册函数
export function registerLanguage(config: LanguageConfig, monarchLanguage?: monaco.languages.IMonarchLanguage): void {
  // 检查语言是否已注册
  const existingLanguages = monaco.languages.getLanguages();
  const isRegistered = existingLanguages.some(lang => lang.id === config.id);

  if (!isRegistered) {
    console.log(`📝 注册${config.id}语言...`);
    monaco.languages.register(config);
  } else {
    console.log(`✅ ${config.id}语言已存在，更新语法规则...`);
  }

  // 总是设置或更新语法高亮规则，确保最新规则生效
  if (monarchLanguage) {
    monaco.languages.setMonarchTokensProvider(config.id, monarchLanguage);
    console.log(`✅ ${config.id}语法高亮规则设置完成`);
  }
}

// 主题注册函数
export function registerThemes(themes: ThemeConfig[]): void {
  themes.forEach(theme => {
    try {
      console.log(`🎨 定义${theme.name}主题...`);
      monaco.editor.defineTheme(theme.name, theme);
      console.log(`✅ ${theme.name}主题定义完成`);
    } catch (error) {
      console.error(`❌ ${theme.name}主题定义失败:`, error);
    }
  });
}

// 注册所有语言和主题
export function registerAllLanguagesAndThemes(): void {
  console.log('🔧 开始注册所有语言和主题...');
  
  // 注册 InfluxQL
  registerLanguage(influxqlLanguageConfig, influxqlMonarchLanguage);
  registerThemes(influxqlThemes);
  
  // 注册 Flux
  registerLanguage(fluxLanguageConfig);
  registerThemes(fluxThemes);
  
  // 注册 SQL 主题（SQL语言已内置）
  registerThemes(sqlThemes);
  
  console.log('🎉 所有语言和主题注册完成');
}
