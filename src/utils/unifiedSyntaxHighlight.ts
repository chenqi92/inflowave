import * as monaco from 'monaco-editor';
import type { DatabaseLanguageType } from '@/types/database';

// 统一的语法高亮管理器 - 支持多种数据库类型
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
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
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
            [/[+\-*/]/, 'operator'],

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
          { token: 'comment', foreground: '008000', fontStyle: 'italic' },
          { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
          { token: 'keyword.function', foreground: 'DC143C', fontStyle: 'bold' },
          { token: 'string', foreground: 'A31515' },
          { token: 'string.escape', foreground: 'FF0000' },
          { token: 'number', foreground: '098658' },
          { token: 'number.float', foreground: '098658' },
          { token: 'operator', foreground: '666666', fontStyle: 'bold' },
          { token: 'identifier', foreground: '000000' },
          { token: 'delimiter', foreground: '666666' },
          { token: 'bracket', foreground: '000000', fontStyle: 'bold' }
        ],
        colors: {}
      });

      // 定义SQL暗色主题
      this.defineTheme('unified-sql-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
          { token: 'keyword.function', foreground: 'FF6B6B', fontStyle: 'bold' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'string.escape', foreground: 'D7BA7D' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'number.float', foreground: 'B5CEA8' },
          { token: 'operator', foreground: 'CCCCCC', fontStyle: 'bold' },
          { token: 'identifier', foreground: 'D4D4D4' },
          { token: 'delimiter', foreground: 'CCCCCC' },
          { token: 'bracket', foreground: 'FFD700', fontStyle: 'bold' }
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
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
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
            [/[+\-*/]/, 'operator'],

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
          { token: 'comment', foreground: '008000', fontStyle: 'italic' },
          { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
          { token: 'keyword.function', foreground: 'DC143C', fontStyle: 'bold' },
          { token: 'string', foreground: 'A31515' },
          { token: 'string.escape', foreground: 'FF0000' },
          { token: 'number', foreground: '098658' },
          { token: 'number.float', foreground: '098658' },
          { token: 'operator', foreground: '666666', fontStyle: 'bold' },
          { token: 'operator.pipe', foreground: 'FF6600', fontStyle: 'bold' },
          { token: 'identifier', foreground: '000000' },
          { token: 'delimiter', foreground: '666666' },
          { token: 'bracket', foreground: '000000', fontStyle: 'bold' }
        ],
        colors: {}
      });

      this.defineTheme('unified-flux-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
          { token: 'keyword.function', foreground: 'FF6B6B', fontStyle: 'bold' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'string.escape', foreground: 'D7BA7D' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'number.float', foreground: 'B5CEA8' },
          { token: 'operator', foreground: 'CCCCCC', fontStyle: 'bold' },
          { token: 'operator.pipe', foreground: 'FF9500', fontStyle: 'bold' },
          { token: 'identifier', foreground: 'D4D4D4' },
          { token: 'delimiter', foreground: 'CCCCCC' },
          { token: 'bracket', foreground: 'FFD700', fontStyle: 'bold' }
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

// 为了向后兼容，保留旧的导出名称
export const simpleSyntaxManager = unifiedSyntaxManager;
