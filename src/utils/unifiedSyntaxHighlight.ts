import * as monaco from 'monaco-editor';
import type {DatabaseLanguageType} from '@/types/database';

// 数据库特定的语法配置
interface DatabaseSyntaxConfig {
    keywords: string[];
    functions: string[];
    dataTypes: string[];
    operators: string[];
    specialTokens: string[];
    timeUnits?: string[];
}

// 各数据库的语法配置
const DATABASE_SYNTAX_CONFIGS: Record<string, DatabaseSyntaxConfig> = {
    'influxdb-1.x': {
        keywords: [
            'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET',
            'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'INTO', 'VALUES',
            'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP', 'AS', 'ASC', 'DESC',
            'DATABASES', 'MEASUREMENTS', 'SERIES', 'TAG', 'FIELD', 'KEYS',
            'RETENTION', 'POLICIES', 'CONTINUOUS', 'QUERIES', 'FILL', 'NOW', 'TIME'
        ],
        functions: [
            'COUNT', 'SUM', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV',
            'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'TOP', 'BOTTOM',
            'DERIVATIVE', 'DIFFERENCE', 'MOVING_AVERAGE', 'CUMULATIVE_SUM'
        ],
        dataTypes: ['INTEGER', 'FLOAT', 'STRING', 'BOOLEAN', 'TIMESTAMP'],
        operators: ['=', '!=', '<>', '<', '<=', '>', '>=', '=~', '!~', '+', '-', '*', '/', '%'],
        specialTokens: ['NULL', 'NONE', 'LINEAR', 'PREVIOUS'],
        timeUnits: ['ns', 'u', 'µ', 'ms', 's', 'm', 'h', 'd', 'w']
    },

    'influxdb-2.x': {
        keywords: [
            'FROM', 'RANGE', 'FILTER', 'GROUP', 'AGGREGATEWINDOW', 'YIELD',
            'IMPORT', 'OPTION', 'BUILTIN', 'AND', 'OR', 'NOT'
        ],
        functions: [
            'mean', 'sum', 'count', 'min', 'max', 'first', 'last',
            'stddev', 'median', 'mode', 'spread', 'skew', 'derivative',
            'difference', 'increase', 'rate', 'histogram', 'quantile'
        ],
        dataTypes: ['int', 'uint', 'float', 'string', 'bool', 'time', 'duration'],
        operators: ['==', '!=', '<', '<=', '>', '>=', '=~', '!~', '+', '-', '*', '/', '%', 'and', 'or'],
        specialTokens: ['_measurement', '_field', '_value', '_time', '_start', '_stop']
    },

    'influxdb-3.x': {
        keywords: [
            'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET',
            'WITH', 'AS', 'UNION', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
            'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CAST', 'EXTRACT'
        ],
        functions: [
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'STDDEV', 'VARIANCE',
            'FIRST_VALUE', 'LAST_VALUE', 'LAG', 'LEAD', 'ROW_NUMBER',
            'RANK', 'DENSE_RANK', 'PERCENTILE_CONT', 'PERCENTILE_DISC'
        ],
        dataTypes: ['BIGINT', 'DOUBLE', 'VARCHAR', 'BOOLEAN', 'TIMESTAMP', 'INTERVAL'],
        operators: ['=', '!=', '<>', '<', '<=', '>', '>=', 'LIKE', 'ILIKE', 'IN', 'IS'],
        specialTokens: ['NULL', 'TRUE', 'FALSE', 'CURRENT_TIMESTAMP']
    },

    'iotdb': {
        keywords: [
            'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET',
            'SHOW', 'CREATE', 'DROP', 'INSERT', 'INTO', 'VALUES', 'TIMESERIES',
            'STORAGE', 'GROUP', 'DEVICE', 'ALIGN', 'BY', 'DEVICE', 'TIME'
        ],
        functions: [
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST_VALUE', 'LAST_VALUE',
            'MIN_TIME', 'MAX_TIME', 'STDDEV', 'STDDEV_POP', 'STDDEV_SAMP',
            'VARIANCE', 'VAR_POP', 'VAR_SAMP'
        ],
        dataTypes: ['INT32', 'INT64', 'FLOAT', 'DOUBLE', 'BOOLEAN', 'TEXT', 'TIMESTAMP'],
        operators: ['=', '!=', '<>', '<', '<=', '>', '>=', 'LIKE', 'REGEXP', 'IN'],
        specialTokens: ['NULL', 'TRUE', 'FALSE', 'NOW()']
    }
};

// 统一的语法高亮管理器 - 基于原生SQL扩展
export class UnifiedSyntaxHighlightManager {
    private registeredLanguages = new Set<string>();
    private registeredThemes = new Set<string>();

    // 通用主题定义方法
    private defineTheme(name: string, config: monaco.editor.IStandaloneThemeData): void {
        if (this.registeredThemes.has(name)) {
            console.log(`✅ 主题 ${name} 已存在，跳过`);
            return;
        }

        try {
            monaco.editor.defineTheme(name, config);
            this.registeredThemes.add(name);
            console.log(`✅ 主题 ${name} 注册完成`);
        } catch (error) {
            console.error(`❌ 注册主题 ${name} 失败:`, error);
        }
    }

    // 注册InfluxQL语言
    registerInfluxQL(): void {
        const languageId = 'unified-influxql';

        if (this.registeredLanguages.has(languageId)) {
            console.log('✅ InfluxQL语言已注册，跳过');
            return;
        }

        console.log('📝 注册统一InfluxQL语言...');

        try {
            // 注册语言
            monaco.languages.register({
                id: languageId,
                extensions: ['.influxql'],
                aliases: ['InfluxQL', 'influxql'],
                mimetypes: ['text/x-influxql']
            });

            // 不设置复杂的tokenizer，让Monaco使用默认处理
            console.log('🔧 跳过复杂tokenizer设置，使用默认处理');

            // 使用简单的主题定义
            this.defineTheme('unified-influxql-light', {
                base: 'vs',
                inherit: true,
                rules: [],
                colors: {}
            });

            this.defineTheme('unified-influxql-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [],
                colors: {}
            });

            this.registeredLanguages.add(languageId);
            console.log('✅ 统一InfluxQL语言注册完成');

        } catch (error) {
            console.error('❌ 注册简化InfluxQL语言失败:', error);
        }
    }

    // 为特定数据库创建增强的语法高亮
    createEnhancedLanguage(databaseType: string): string {
        const config = DATABASE_SYNTAX_CONFIGS[databaseType];
        if (!config) {
            console.warn(`⚠️ 未找到数据库 ${databaseType} 的语法配置，使用默认SQL`);
            return 'sql';
        }

        // Monaco Editor不允许主题名称中包含点号，将点号替换为下划线
        const safeDbType = databaseType.replace(/\./g, '_');
        const languageId = `enhanced-${safeDbType}`;

        if (this.registeredLanguages.has(languageId)) {
            console.log(`✅ 语言 ${languageId} 已注册，跳过`);
            return languageId;
        }

        console.log(`📝 注册增强语言: ${languageId}...`);

        try {
            // 注册语言
            monaco.languages.register({
                id: languageId,
                extensions: ['.sql'],
                aliases: [databaseType.toUpperCase()],
                mimetypes: ['text/x-sql']
            });

            // 设置增强的tokenizer规则
            this.setEnhancedTokenizer(languageId, config);

            // 定义增强的主题
            this.defineEnhancedThemes(languageId, databaseType);

            this.registeredLanguages.add(languageId);
            console.log(`✅ 增强语言 ${languageId} 注册完成`);

            return languageId;

        } catch (error) {
            console.error(`❌ 注册增强语言 ${languageId} 失败:`, error);
            return 'sql'; // 回退到原生SQL
        }
    }

    // 设置增强的tokenizer规则
    private setEnhancedTokenizer(languageId: string, config: DatabaseSyntaxConfig): void {
        // 使用Monaco支持的简单字符串模式而不是RegExp对象
        const keywordPattern = `\\b(?:${config.keywords.join('|')})\\b`;
        const functionPattern = `\\b(?:${config.functions.join('|')})\\b`;
        const dataTypePattern = `\\b(?:${config.dataTypes.join('|')})\\b`;
        const specialTokenPattern = `\\b(?:${config.specialTokens.join('|')})\\b`;

        // 构建tokenizer规则数组
        const tokenizerRules: any[] = [
            // 注释
            [/--.*$/, 'comment'],
            [/\/\*[\s\S]*?\*\//, 'comment'],

            // 字符串
            [/'([^'\\]|\\.)*'/, 'string'],
            [/"([^"\\]|\\.)*"/, 'string'],
            [/`([^`\\]|\\.)*`/, 'string'], // 反引号字符串

            // 数字
            [/\d*\.\d+([eE][+-]?\d+)?/, 'number.float'],
            [/\d+/, 'number'],
        ];

        // 添加时间单位规则（如果存在）
        if (config.timeUnits && config.timeUnits.length > 0) {
            const timeUnitPattern = `\\b\\d+(?:${config.timeUnits.join('|')})\\b`;
            tokenizerRules.push([new RegExp(timeUnitPattern, 'i'), 'number.time']);
        }

        // 添加其他规则
        tokenizerRules.push(
            // 操作符
            [/[=!<>]=?/, 'operator'],
            [/[+*/-]/, 'operator'],
            [/=~|!~/, 'operator'],
            [/\*/, 'operator'],

            // 分隔符
            [/[;,.]/, 'delimiter'],
            [/[(){}[\]]/, 'bracket'],

            // 关键字、函数、数据类型、特殊标记（使用cases）
            [/[a-zA-Z_]\w*/, {
                cases: {
                    [keywordPattern]: {token: 'keyword'},
                    [functionPattern]: {token: 'function'},
                    [dataTypePattern]: {token: 'type'},
                    [specialTokenPattern]: {token: 'constant'},
                    '@default': 'identifier'
                }
            }],

            // 空白字符
            [/\s+/, ''],

            // 其他
            [/./, 'text']
        );

        monaco.languages.setMonarchTokensProvider(languageId, {
            // 定义关键字列表
            keywords: config.keywords,
            functions: config.functions,
            dataTypes: config.dataTypes,
            specialTokens: config.specialTokens,

            // 不区分大小写
            ignoreCase: true,

            tokenizer: {
                root: tokenizerRules
            }
        });
    }

    // 定义增强的主题
    private defineEnhancedThemes(languageId: string, databaseType: string): void {
        // Monaco Editor 不允许主题名称中包含下划线，需要替换为连字符
        const safeLanguageId = languageId.replace(/_/g, '-');

        // 亮色主题
        this.defineTheme(`${safeLanguageId}-light`, {
            base: 'vs',
            inherit: true,
            rules: [
                {token: 'comment', foreground: '008000', fontStyle: 'italic'},
                {token: 'keyword', foreground: '0000FF', fontStyle: 'bold'},
                {token: 'function', foreground: 'FF6600', fontStyle: 'bold'},
                {token: 'type', foreground: '2B91AF', fontStyle: 'bold'},
                {token: 'constant', foreground: '800080', fontStyle: 'bold'},
                {token: 'number', foreground: '098658'},
                {token: 'number.float', foreground: '098658'},
                {token: 'number.time', foreground: 'FF6600', fontStyle: 'bold'},
                {token: 'string', foreground: 'A31515'},
                {token: 'operator', foreground: '666666', fontStyle: 'bold'},
                {token: 'identifier', foreground: '000000'},
                {token: 'delimiter', foreground: '666666'},
                {token: 'bracket', foreground: '000000', fontStyle: 'bold'}
            ],
            colors: {}
        });

        // 暗色主题
        this.defineTheme(`${safeLanguageId}-dark`, {
            base: 'vs-dark',
            inherit: true,
            rules: [
                {token: 'comment', foreground: '6A9955', fontStyle: 'italic'},
                {token: 'keyword', foreground: '569CD6', fontStyle: 'bold'},
                {token: 'function', foreground: 'DCDCAA', fontStyle: 'bold'},
                {token: 'type', foreground: '4EC9B0', fontStyle: 'bold'},
                {token: 'constant', foreground: 'D19A66', fontStyle: 'bold'},
                {token: 'number', foreground: 'B5CEA8'},
                {token: 'number.float', foreground: 'B5CEA8'},
                {token: 'number.time', foreground: 'FF9500', fontStyle: 'bold'},
                {token: 'string', foreground: 'CE9178'},
                {token: 'operator', foreground: 'CCCCCC', fontStyle: 'bold'},
                {token: 'identifier', foreground: 'D4D4D4'},
                {token: 'delimiter', foreground: 'CCCCCC'},
                {token: 'bracket', foreground: 'FFD700', fontStyle: 'bold'}
            ],
            colors: {}
        });
    }

    // 获取数据库特定的语言ID
    getLanguageForDatabase(databaseType: string): string {
        // 检查是否有特定的数据库配置
        if (DATABASE_SYNTAX_CONFIGS[databaseType]) {
            return this.createEnhancedLanguage(databaseType);
        }

        // 回退到原生SQL
        return 'sql';
    }

    // 获取数据库特定的主题名称
    getThemeForDatabase(databaseType: string, isDark: boolean): string {
        const languageId = this.getLanguageForDatabase(databaseType);

        if (languageId.startsWith('enhanced-')) {
            // Monaco Editor 不允许主题名称中包含下划线，需要替换为连字符
            const safeLanguageId = languageId.replace(/_/g, '-');
            return `${safeLanguageId}-${isDark ? 'dark' : 'light'}`;
        }

        // 原生主题
        return isDark ? 'vs-dark' : 'vs';
    }

    // 获取支持的数据库类型列表
    getSupportedDatabases(): string[] {
        return Object.keys(DATABASE_SYNTAX_CONFIGS);
    }

    // 检查数据库是否支持增强语法高亮
    isDatabaseSupported(databaseType: string): boolean {
        return databaseType in DATABASE_SYNTAX_CONFIGS;
    }

    // 注册SQL语言
    registerSQL(): void {
        const languageId = 'unified-sql';

        if (this.registeredLanguages.has(languageId)) {
            console.log('✅ SQL语言已注册，跳过');
            return;
        }

        console.log('📝 注册统一SQL语言...');

        try {
            // 注册语言
            monaco.languages.register({
                id: languageId,
                extensions: ['.sql'],
                aliases: ['SQL', 'sql'],
                mimetypes: ['text/x-sql']
            });

            // 设置语法高亮规则
            monaco.languages.setMonarchTokensProvider(languageId, {
                keywords: [
                    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
                    'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
                    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
                    'ALTER', 'DROP', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA',
                    'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
                    'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
                ],

                builtins: [
                    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST', 'LAST',
                    'UPPER', 'LOWER', 'LENGTH', 'SUBSTRING', 'TRIM', 'CONCAT',
                    'NOW', 'GETDATE', 'DATEADD', 'DATEDIFF', 'YEAR', 'MONTH', 'DAY',
                    'ABS', 'ROUND', 'FLOOR', 'CEILING', 'CAST', 'CONVERT'
                ],

                tokenizer: {
                    root: [
                        // 注释
                        [/--.*$/, 'comment'],
                        [/\/\*/, 'comment', '@comment'],

                        // 字符串
                        [/'([^'\\]|\\.)*$/, 'string.invalid'],
                        [/'/, 'string', '@string'],
                        [/"([^"\\]|\\.)*$/, 'string.invalid'],
                        [/"/, 'string', '@dstring'],

                        // 数字
                        [/\d*\.\d+([eE][+-]?\d+)?/, 'number.float'],
                        [/\d+/, 'number'],

                        // 关键字和函数
                        [/[a-zA-Z_]\w*/, {
                            cases: {
                                '@keywords': 'keyword',
                                '@builtins': 'keyword.function',
                                '@default': 'identifier'
                            }
                        }],

                        // 操作符
                        [/[=!<>]=?/, 'operator'],
                        [/[+*/-]/, 'operator'],

                        // 分隔符
                        [/[;,.]/, 'delimiter'],
                        [/[(){}[\]]/, 'bracket'],

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

                    dstring: [
                        [/[^\\"]+/, 'string'],
                        [/\\./, 'string.escape'],
                        [/"/, 'string', '@pop']
                    ]
                }
            });

            // 定义SQL主题
            this.defineTheme('unified-sql-light', {
                base: 'vs',
                inherit: true,
                rules: [
                    {token: 'comment', foreground: '008000', fontStyle: 'italic'},
                    {token: 'keyword', foreground: '0000FF', fontStyle: 'bold'},
                    {token: 'keyword.function', foreground: 'DC143C', fontStyle: 'bold'},
                    {token: 'string', foreground: 'A31515'},
                    {token: 'string.escape', foreground: 'FF0000'},
                    {token: 'number', foreground: '098658'},
                    {token: 'number.float', foreground: '098658'},
                    {token: 'operator', foreground: '666666', fontStyle: 'bold'},
                    {token: 'identifier', foreground: '000000'},
                    {token: 'delimiter', foreground: '666666'},
                    {token: 'bracket', foreground: '000000', fontStyle: 'bold'}
                ],
                colors: {}
            });

            // 定义SQL暗色主题
            this.defineTheme('unified-sql-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    {token: 'comment', foreground: '6A9955', fontStyle: 'italic'},
                    {token: 'keyword', foreground: '569CD6', fontStyle: 'bold'},
                    {token: 'keyword.function', foreground: 'FF6B6B', fontStyle: 'bold'},
                    {token: 'string', foreground: 'CE9178'},
                    {token: 'string.escape', foreground: 'D7BA7D'},
                    {token: 'number', foreground: 'B5CEA8'},
                    {token: 'number.float', foreground: 'B5CEA8'},
                    {token: 'operator', foreground: 'CCCCCC', fontStyle: 'bold'},
                    {token: 'identifier', foreground: 'D4D4D4'},
                    {token: 'delimiter', foreground: 'CCCCCC'},
                    {token: 'bracket', foreground: 'FFD700', fontStyle: 'bold'}
                ],
                colors: {}
            });

            this.registeredLanguages.add(languageId);
            console.log('✅ 统一SQL语言注册完成');

        } catch (error) {
            console.error('❌ 注册简化SQL语言失败:', error);
        }
    }

    // 注册Flux语言
    registerFlux(): void {
        const languageId = 'unified-flux';

        if (this.registeredLanguages.has(languageId)) {
            console.log('✅ Flux语言已注册，跳过');
            return;
        }

        console.log('📝 注册统一Flux语言...');

        try {
            // 注册语言
            monaco.languages.register({
                id: languageId,
                extensions: ['.flux'],
                aliases: ['Flux', 'flux'],
                mimetypes: ['text/x-flux']
            });

            // 设置语法高亮规则
            monaco.languages.setMonarchTokensProvider(languageId, {
                keywords: [
                    'import', 'package', 'option', 'builtin', 'testcase',
                    'if', 'then', 'else', 'return', 'and', 'or', 'not',
                    'true', 'false', 'null', 'exists'
                ],

                builtins: [
                    'from', 'range', 'filter', 'group', 'aggregateWindow', 'mean', 'sum', 'count',
                    'max', 'min', 'first', 'last', 'map', 'keep', 'drop', 'pivot', 'join',
                    'union', 'yield', 'to', 'sort', 'limit', 'unique', 'distinct',
                    'window', 'timeShift', 'fill', 'interpolate', 'derivative', 'difference'
                ],

                tokenizer: {
                    root: [
                        // 注释
                        [/\/\/.*$/, 'comment'],
                        [/\/\*/, 'comment', '@comment'],

                        // 字符串
                        [/"([^"\\]|\\.)*$/, 'string.invalid'],
                        [/"/, 'string', '@dstring'],

                        // 数字
                        [/\d*\.\d+([eE][+-]?\d+)?/, 'number.float'],
                        [/\d+/, 'number'],

                        // 管道操作符
                        [/\|>/, 'operator.pipe'],

                        // 关键字和函数
                        [/[a-zA-Z_]\w*/, {
                            cases: {
                                '@keywords': 'keyword',
                                '@builtins': 'keyword.function',
                                '@default': 'identifier'
                            }
                        }],

                        // 操作符
                        [/[=!<>]=?/, 'operator'],
                        [/[+*/-]/, 'operator'],

                        // 分隔符
                        [/[;,.]/, 'delimiter'],
                        [/[(){}[\]]/, 'bracket'],

                        // 空白字符
                        [/\s+/, 'white'],
                    ],

                    comment: [
                        [/[^/*]+/, 'comment'],
                        [/\*\//, 'comment', '@pop'],
                        [/[/*]/, 'comment']
                    ],

                    dstring: [
                        [/[^\\"]+/, 'string'],
                        [/\\./, 'string.escape'],
                        [/"/, 'string', '@pop']
                    ]
                }
            });

            // 定义Flux主题
            this.defineTheme('unified-flux-light', {
                base: 'vs',
                inherit: true,
                rules: [
                    {token: 'comment', foreground: '008000', fontStyle: 'italic'},
                    {token: 'keyword', foreground: '0000FF', fontStyle: 'bold'},
                    {token: 'keyword.function', foreground: 'DC143C', fontStyle: 'bold'},
                    {token: 'string', foreground: 'A31515'},
                    {token: 'string.escape', foreground: 'FF0000'},
                    {token: 'number', foreground: '098658'},
                    {token: 'number.float', foreground: '098658'},
                    {token: 'operator', foreground: '666666', fontStyle: 'bold'},
                    {token: 'operator.pipe', foreground: 'FF6600', fontStyle: 'bold'},
                    {token: 'identifier', foreground: '000000'},
                    {token: 'delimiter', foreground: '666666'},
                    {token: 'bracket', foreground: '000000', fontStyle: 'bold'}
                ],
                colors: {}
            });

            this.defineTheme('unified-flux-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    {token: 'comment', foreground: '6A9955', fontStyle: 'italic'},
                    {token: 'keyword', foreground: '569CD6', fontStyle: 'bold'},
                    {token: 'keyword.function', foreground: 'FF6B6B', fontStyle: 'bold'},
                    {token: 'string', foreground: 'CE9178'},
                    {token: 'string.escape', foreground: 'D7BA7D'},
                    {token: 'number', foreground: 'B5CEA8'},
                    {token: 'number.float', foreground: 'B5CEA8'},
                    {token: 'operator', foreground: 'CCCCCC', fontStyle: 'bold'},
                    {token: 'operator.pipe', foreground: 'FF9500', fontStyle: 'bold'},
                    {token: 'identifier', foreground: 'D4D4D4'},
                    {token: 'delimiter', foreground: 'CCCCCC'},
                    {token: 'bracket', foreground: 'FFD700', fontStyle: 'bold'}
                ],
                colors: {}
            });

            this.registeredLanguages.add(languageId);
            console.log('✅ 统一Flux语言注册完成');

        } catch (error) {
            console.error('❌ 注册统一Flux语言失败:', error);
        }
    }

    // 注册所有语言
    registerAll(): void {
        console.log('🚀 开始注册所有统一语法高亮...');
        this.registerSQL();
        this.registerInfluxQL();
        this.registerFlux();
        console.log('🎉 所有统一语法高亮注册完成');
    }

    // 获取语言ID
    getLanguageId(databaseType: DatabaseLanguageType): string {
        switch (databaseType) {
            case 'influxql':
                return 'unified-influxql';
            case 'flux':
                return 'unified-flux';
            case 'sql':
            case 'mysql':
            case 'postgresql':
            case 'mongodb':
            default:
                return 'unified-sql';
        }
    }

    // 获取主题名称
    getThemeName(languageType: DatabaseLanguageType, isDark: boolean): string {
        const suffix = isDark ? '-dark' : '-light';
        switch (languageType) {
            case 'influxql':
                return `unified-influxql${suffix}`;
            case 'flux':
                return `unified-flux${suffix}`;
            case 'sql':
            case 'mysql':
            case 'postgresql':
            case 'mongodb':
            default:
                return `unified-sql${suffix}`;
        }
    }

    // 验证语法高亮
    validateSyntaxHighlight(editor: monaco.editor.IStandaloneCodeEditor): void {
        console.log('🔍 验证统一语法高亮状态...');

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
                    console.log('✅ 统一语法高亮验证成功');
                } else {
                    console.warn('⚠️ 统一语法高亮可能未正确工作');
                }
            }
        } catch (error) {
            console.error('❌ 验证语法高亮失败:', error);
        }
    }
}

// 创建全局实例
export const unifiedSyntaxManager = new UnifiedSyntaxHighlightManager();