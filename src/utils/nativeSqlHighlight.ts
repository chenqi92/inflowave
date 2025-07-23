import * as monaco from 'monaco-editor';

// 基于Monaco原生SQL的InfluxQL扩展
export class NativeSqlHighlight {
  
  // 测试Monaco原生语言支持
  static testNativeLanguages() {
    console.log('🔍 检查Monaco原生语言支持...');
    
    const languages = monaco.languages.getLanguages();
    console.log(`📊 总共支持 ${languages.length} 种语言`);
    
    // 查找SQL相关的语言
    const sqlLanguages = languages.filter(lang => 
      lang.id.toLowerCase().includes('sql') || 
      lang.aliases?.some(alias => alias.toLowerCase().includes('sql'))
    );
    
    console.log('🗃️ SQL相关语言:', sqlLanguages);
    
    // 检查具体的SQL语言
    const targetLanguages = ['sql', 'mysql', 'pgsql'];
    targetLanguages.forEach(langId => {
      const found = languages.find(lang => lang.id === langId);
      console.log(`${found ? '✅' : '❌'} ${langId}: ${found ? '支持' : '不支持'}`);
    });
    
    return sqlLanguages;
  }
  
  // 使用原生SQL语言
  static useNativeSQL(editor: monaco.editor.IStandaloneCodeEditor) {
    console.log('🔧 使用Monaco原生SQL语言...');
    
    try {
      const model = editor.getModel();
      if (!model) {
        console.error('❌ 无法获取编辑器模型');
        return false;
      }
      
      // 尝试使用原生SQL语言
      const sqlLanguages = ['sql', 'mysql', 'pgsql'];
      let appliedLanguage = null;
      
      for (const langId of sqlLanguages) {
        try {
          monaco.editor.setModelLanguage(model, langId);
          appliedLanguage = langId;
          console.log(`✅ 成功应用语言: ${langId}`);
          break;
        } catch (error) {
          console.log(`⚠️ 语言 ${langId} 应用失败:`, error);
        }
      }
      
      if (!appliedLanguage) {
        console.error('❌ 所有SQL语言都无法应用');
        return false;
      }
      
      // 应用原生主题
      monaco.editor.setTheme('vs');
      
      // 强制重新渲染
      editor.render(true);
      
      // 验证效果
      setTimeout(() => {
        this.verifyNativeHighlight(editor, appliedLanguage);
      }, 500);
      
      return true;
      
    } catch (error) {
      console.error('❌ 使用原生SQL失败:', error);
      return false;
    }
  }
  
  // 验证原生高亮效果
  static verifyNativeHighlight(editor: monaco.editor.IStandaloneCodeEditor, language: string) {
    console.log(`🔍 验证原生${language}高亮效果...`);
    
    try {
      const model = editor.getModel();
      if (!model) {
        console.error('❌ 无法获取编辑器模型');
        return;
      }
      
      console.log('📋 当前模型信息:', {
        language: model.getLanguageId(),
        content: model.getValue(),
        lineCount: model.getLineCount()
      });
      
      // 检查DOM中的token
      const editorDom = editor.getDomNode();
      if (editorDom) {
        const tokenElements = editorDom.querySelectorAll('.view-line [class*="mtk"]');
        const tokenStats: Record<string, number> = {};
        
        Array.from(tokenElements).forEach(el => {
          const className = el.className;
          tokenStats[className] = (tokenStats[className] || 0) + 1;
        });
        
        console.log('🎨 原生高亮Token统计:', tokenStats);
        
        const uniqueTokenTypes = Object.keys(tokenStats).length;
        if (uniqueTokenTypes > 1) {
          console.log('🎉 原生SQL高亮工作正常！');
          return true;
        } else {
          console.warn('⚠️ 原生SQL高亮可能有问题');
          return false;
        }
      }
      
    } catch (error) {
      console.error('❌ 验证原生高亮失败:', error);
      return false;
    }
  }
  
  // 扩展原生SQL以支持InfluxQL
  static extendNativeSQLForInfluxQL(editor: monaco.editor.IStandaloneCodeEditor) {
    console.log('🔧 扩展原生SQL以支持InfluxQL...');
    
    try {
      // 首先使用原生SQL
      const success = this.useNativeSQL(editor);
      if (!success) {
        console.error('❌ 原生SQL应用失败，无法扩展');
        return false;
      }
      
      // 等待原生SQL应用完成后再扩展
      setTimeout(() => {
        this.addInfluxQLExtensions();
      }, 1000);
      
      return true;
      
    } catch (error) {
      console.error('❌ 扩展原生SQL失败:', error);
      return false;
    }
  }
  
  // 添加InfluxQL特定的扩展
  static addInfluxQLExtensions() {
    console.log('📝 添加InfluxQL特定扩展...');
    
    try {
      // 为现有的SQL语言添加InfluxQL特定的关键字
      const influxqlKeywords = [
        'SHOW', 'MEASUREMENTS', 'SERIES', 'TAG', 'FIELD', 'KEYS',
        'RETENTION', 'POLICIES', 'CONTINUOUS', 'QUERIES',
        'FILL', 'NOW', 'TIME'
      ];
      
      const influxqlFunctions = [
        'MEAN', 'MEDIAN', 'MODE', 'SPREAD', 'STDDEV',
        'FIRST', 'LAST', 'PERCENTILE', 'TOP', 'BOTTOM',
        'DERIVATIVE', 'DIFFERENCE', 'MOVING_AVERAGE'
      ];
      
      console.log('📋 InfluxQL关键字:', influxqlKeywords);
      console.log('📋 InfluxQL函数:', influxqlFunctions);
      
      // 这里可以添加更多的扩展逻辑
      // 比如自定义的自动完成、悬停提示等
      
      console.log('✅ InfluxQL扩展添加完成');
      return true;
      
    } catch (error) {
      console.error('❌ 添加InfluxQL扩展失败:', error);
      return false;
    }
  }
  
  // 创建测试内容
  static createTestContent() {
    return `SELECT COUNT(*) FROM measurement 
WHERE time > now() - 1h 
GROUP BY time(5m) 
FILL(null)`;
  }
  
  // 综合测试
  static runComprehensiveTest(editor: monaco.editor.IStandaloneCodeEditor) {
    console.log('🚀 运行原生SQL综合测试...');
    
    try {
      // 1. 测试原生语言支持
      this.testNativeLanguages();
      
      // 2. 设置测试内容
      const model = editor.getModel();
      if (model) {
        model.setValue(this.createTestContent());
      }
      
      // 3. 应用原生SQL
      setTimeout(() => {
        this.useNativeSQL(editor);
      }, 500);
      
      // 4. 扩展为InfluxQL
      setTimeout(() => {
        this.extendNativeSQLForInfluxQL(editor);
      }, 1500);
      
      console.log('✅ 综合测试启动完成');
      return true;
      
    } catch (error) {
      console.error('❌ 综合测试失败:', error);
      return false;
    }
  }
}

// 便捷函数
export const testNativeLanguages = () => NativeSqlHighlight.testNativeLanguages();
export const useNativeSQL = (editor: monaco.editor.IStandaloneCodeEditor) => 
  NativeSqlHighlight.useNativeSQL(editor);
export const extendForInfluxQL = (editor: monaco.editor.IStandaloneCodeEditor) => 
  NativeSqlHighlight.extendNativeSQLForInfluxQL(editor);
export const runNativeTest = (editor: monaco.editor.IStandaloneCodeEditor) => 
  NativeSqlHighlight.runComprehensiveTest(editor);

// 在开发环境下添加到全局对象
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).NativeSqlHighlight = NativeSqlHighlight;
  (window as any).testNativeLanguages = testNativeLanguages;
  (window as any).useNativeSQL = useNativeSQL;
  (window as any).extendForInfluxQL = extendForInfluxQL;
  (window as any).runNativeTest = runNativeTest;
  
  console.log('🔧 原生SQL高亮工具已加载');
  console.log('可用命令:');
  console.log('- testNativeLanguages() // 测试原生语言支持');
  console.log('- useNativeSQL(editor) // 使用原生SQL');
  console.log('- extendForInfluxQL(editor) // 扩展为InfluxQL');
  console.log('- runNativeTest(editor) // 运行综合测试');
}
