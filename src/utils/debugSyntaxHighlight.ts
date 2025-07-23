import * as monaco from 'monaco-editor';

// 调试语法高亮的工具函数
export function debugMonarchTokenizer() {
  console.log('🔍 开始调试Monarch tokenizer...');

  // 创建一个简单的测试语言
  const testLanguageId = 'debug-test-lang';
  
  try {
    // 注册测试语言
    monaco.languages.register({
      id: testLanguageId,
      extensions: ['.test'],
      aliases: ['Test', 'test']
    });

    // 设置一个非常简单的tokenizer
    monaco.languages.setMonarchTokensProvider(testLanguageId, {
      keywords: ['SELECT', 'FROM', 'WHERE'],
      
      tokenizer: {
        root: [
          // 简单的关键字匹配
          [/SELECT/i, 'keyword'],
          [/FROM/i, 'keyword'],
          [/WHERE/i, 'keyword'],
          
          // 字符串
          [/'[^']*'/, 'string'],
          
          // 数字
          [/\d+/, 'number'],
          
          // 标识符
          [/[a-zA-Z_]\w*/, 'identifier'],
          
          // 空白字符
          [/\s+/, 'white'],
        ]
      }
    });

    console.log('✅ 测试语言注册成功');

    // 创建测试模型
    const testCode = 'SELECT * FROM table WHERE id = 123';
    const testModel = monaco.editor.createModel(testCode, testLanguageId);
    
    console.log('📝 测试代码:', testCode);
    console.log('📋 测试模型语言:', testModel.getLanguageId());

    // 清理
    testModel.dispose();
    
    return true;
  } catch (error) {
    console.error('❌ 调试测试失败:', error);
    return false;
  }
}

// 检查当前InfluxQL语言的tokenizer状态
export function checkInfluxQLTokenizer() {
  console.log('🔍 检查InfluxQL tokenizer状态...');
  
  const languageId = 'unified-influxql';
  
  try {
    // 检查语言是否注册
    const languages = monaco.languages.getLanguages();
    const isRegistered = languages.some(lang => lang.id === languageId);
    
    console.log('📝 语言注册状态:', {
      languageId,
      isRegistered,
      totalLanguages: languages.length
    });

    if (!isRegistered) {
      console.warn('⚠️ InfluxQL语言未注册');
      return false;
    }

    // 创建测试模型
    const testCode = 'SELECT COUNT(*) FROM measurement WHERE time > now() - 1h';
    const testModel = monaco.editor.createModel(testCode, languageId);
    
    console.log('📝 测试InfluxQL代码:', testCode);
    console.log('📋 模型语言ID:', testModel.getLanguageId());

    // 尝试获取tokenization信息
    setTimeout(() => {
      try {
        // 检查模型的tokenization状态
        const lineCount = testModel.getLineCount();
        console.log('📊 模型统计:', {
          lineCount,
          valueLength: testModel.getValue().length,
          language: testModel.getLanguageId()
        });

        // 清理
        testModel.dispose();
      } catch (tokenError) {
        console.error('❌ Tokenization检查失败:', tokenError);
      }
    }, 100);

    return true;
  } catch (error) {
    console.error('❌ InfluxQL tokenizer检查失败:', error);
    return false;
  }
}

// 修复InfluxQL tokenizer的函数
export function fixInfluxQLTokenizer() {
  console.log('🔧 开始修复InfluxQL tokenizer...');
  
  const languageId = 'unified-influxql';
  
  try {
    // 重新设置tokenizer，使用更简单的规则
    monaco.languages.setMonarchTokensProvider(languageId, {
      // 明确定义关键字列表
      keywords: [
        'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'OFFSET',
        'SHOW', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'INTO', 'VALUES',
        'AND', 'OR', 'NOT', 'IN', 'LIKE', 'REGEXP', 'AS', 'ASC', 'DESC',
        'DATABASES', 'MEASUREMENTS', 'SERIES', 'TAG', 'FIELD', 'TIME',
        'FILL', 'NULL', 'NONE', 'LINEAR', 'PREVIOUS', 'NOW'
      ],

      // 函数列表
      builtins: [
        'COUNT', 'SUM', 'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV',
        'FIRST', 'LAST', 'MAX', 'MIN', 'PERCENTILE', 'TOP', 'BOTTOM'
      ],

      tokenizer: {
        root: [
          // 注释（优先级最高）
          [/--.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],

          // 字符串（高优先级）
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@dstring'],

          // 数字（在标识符之前）
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],

          // 时间单位（特殊模式）
          [/\b\d+(?:ns|u|µ|ms|s|m|h|d|w)\b/, 'keyword.time'],

          // 关键字和函数匹配（关键部分）
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
          [/=~|!~/, 'operator'],

          // 分隔符和括号
          [/[;,.]/, 'delimiter'],
          [/[(){}[\]]/, 'bracket'],

          // 空白字符（最后处理）
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

    console.log('✅ InfluxQL tokenizer修复完成');
    return true;
  } catch (error) {
    console.error('❌ InfluxQL tokenizer修复失败:', error);
    return false;
  }
}

// 验证修复效果
export function validateTokenizerFix(editor: monaco.editor.IStandaloneCodeEditor) {
  console.log('🔍 验证tokenizer修复效果...');
  
  try {
    const model = editor.getModel();
    if (!model) {
      console.warn('⚠️ 无法获取编辑器模型');
      return false;
    }

    const languageId = model.getLanguageId();
    console.log('📋 当前语言ID:', languageId);

    // 强制重新tokenize
    monaco.editor.setModelLanguage(model, languageId);
    
    // 触发重新渲染
    editor.render(true);

    // 延迟检查结果
    setTimeout(() => {
      const editorDom = editor.getDomNode();
      if (editorDom) {
        const tokenElements = editorDom.querySelectorAll('.view-line .mtk1, .view-line .mtk2, .view-line .mtk3, .view-line .mtk4, .view-line .mtk5, .view-line .mtk6, .view-line .mtk7, .view-line .mtk8, .view-line .mtk9');
        
        const tokenStats: Record<string, number> = {};
        Array.from(tokenElements).forEach(el => {
          const className = el.className;
          tokenStats[className] = (tokenStats[className] || 0) + 1;
        });

        console.log('🎨 修复后语法高亮统计:', tokenStats);
        
        if (Object.keys(tokenStats).length > 1) {
          console.log('✅ Tokenizer修复成功！');
          return true;
        } else {
          console.warn('⚠️ Tokenizer修复可能未生效');
          return false;
        }
      }
    }, 500);

  } catch (error) {
    console.error('❌ 验证tokenizer修复失败:', error);
    return false;
  }
}
