/**
 * 文本提取工具
 * 用于扫描组件中的硬编码文本并生成翻译键
 */

export interface ExtractedText {
  file: string;
  line: number;
  column: number;
  text: string;
  suggestedKey: string;
  context: string;
  namespace: string;
}

export interface ExtractionResult {
  extractedTexts: ExtractedText[];
  totalFiles: number;
  totalTexts: number;
  suggestions: TranslationSuggestion[];
}

export interface TranslationSuggestion {
  key: string;
  zhCN: string;
  enUS: string;
  namespace: string;
  description?: string;
}

export class TextExtractor {
  private chineseTextRegex = /[\u4e00-\u9fff]+/;
  private stringLiteralRegex = /(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\1/g;
  private jsxTextRegex = />([^<]*[\u4e00-\u9fff][^<]*)</g;
  
  /**
   * 扫描文件中的中文文本
   */
  extractFromFile(filePath: string, content: string): ExtractedText[] {
    const extractedTexts: ExtractedText[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, lineIndex) => {
      // 提取字符串字面量中的中文
      const stringMatches = this.extractStringLiterals(line, lineIndex, filePath);
      extractedTexts.push(...stringMatches);
      
      // 提取 JSX 文本中的中文
      const jsxMatches = this.extractJSXText(line, lineIndex, filePath);
      extractedTexts.push(...jsxMatches);
    });
    
    return extractedTexts;
  }
  
  /**
   * 提取字符串字面量中的中文
   */
  private extractStringLiterals(line: string, lineIndex: number, filePath: string): ExtractedText[] {
    const matches: ExtractedText[] = [];
    let match;
    
    // 重置正则表达式
    this.stringLiteralRegex.lastIndex = 0;
    
    while ((match = this.stringLiteralRegex.exec(line)) !== null) {
      const text = match[2];
      
      // 跳过注释和特殊情况
      if (this.shouldSkipText(text, line)) {
        continue;
      }
      
      const suggestedKey = this.generateTranslationKey(text);
      const namespace = this.determineNamespace(filePath, text);
      
      matches.push({
        file: filePath,
        line: lineIndex + 1,
        column: match.index || 0,
        text,
        suggestedKey,
        context: line.trim(),
        namespace,
      });
    }
    
    return matches;
  }
  
  /**
   * 提取 JSX 文本中的中文
   */
  private extractJSXText(line: string, lineIndex: number, filePath: string): ExtractedText[] {
    const matches: ExtractedText[] = [];
    let match;
    
    // 重置正则表达式
    this.jsxTextRegex.lastIndex = 0;
    
    while ((match = this.jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      
      // 跳过空文本和特殊情况
      if (!text || !this.chineseTextRegex.test(text) || this.shouldSkipText(text, line)) {
        continue;
      }
      
      const suggestedKey = this.generateTranslationKey(text);
      const namespace = this.determineNamespace(filePath, text);
      
      matches.push({
        file: filePath,
        line: lineIndex + 1,
        column: match.index || 0,
        text,
        suggestedKey,
        context: line.trim(),
        namespace,
      });
    }
    
    return matches;
  }
  
  /**
   * 判断是否应该跳过某个文本
   */
  private shouldSkipText(text: string, line: string): boolean {
    // 跳过注释
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return true;
    }
    
    // 跳过控制台输出
    if (line.includes('console.') || line.includes('logger.')) {
      return true;
    }
    
    // 跳过测试文件中的文本
    if (line.includes('expect(') || line.includes('describe(') || line.includes('it(')) {
      return true;
    }
    
    // 跳过已经使用翻译函数的文本
    if (line.includes('t(') || line.includes('i18n.t(')) {
      return true;
    }
    
    // 跳过很短的文本（可能是标点符号等）
    if (text.length < 2) {
      return true;
    }
    
    // 跳过纯数字或特殊字符
    if (/^[\d\s\-_#]+$/.test(text)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 生成翻译键
   */
  private generateTranslationKey(text: string): string {
    // 移除标点符号和特殊字符
    let key = text.replace(/[^\u4e00-\u9fff\w\s]/g, '');
    
    // 转换为拼音或英文描述（简化版）
    key = this.convertToEnglishKey(key);
    
    // 转换为 camelCase
    key = key
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return key || 'unknown_text';
  }
  
  /**
   * 简单的中文到英文键转换
   */
  private convertToEnglishKey(text: string): string {
    const commonTranslations: { [key: string]: string } = {
      '确定': 'ok',
      '取消': 'cancel',
      '保存': 'save',
      '删除': 'delete',
      '编辑': 'edit',
      '创建': 'create',
      '新建': 'new',
      '添加': 'add',
      '移除': 'remove',
      '刷新': 'refresh',
      '搜索': 'search',
      '查询': 'query',
      '连接': 'connection',
      '设置': 'settings',
      '配置': 'config',
      '用户': 'user',
      '密码': 'password',
      '登录': 'login',
      '注销': 'logout',
      '主页': 'home',
      '仪表板': 'dashboard',
      '数据库': 'database',
      '表格': 'table',
      '列': 'column',
      '行': 'row',
      '数据': 'data',
      '结果': 'result',
      '错误': 'error',
      '成功': 'success',
      '警告': 'warning',
      '信息': 'info',
      '加载中': 'loading',
      '请稍候': 'please_wait',
      '暂无数据': 'no_data',
      '操作': 'operation',
      '功能': 'feature',
      '工具': 'tool',
      '帮助': 'help',
      '关于': 'about',
      '版本': 'version',
      '更新': 'update',
      '下载': 'download',
      '上传': 'upload',
      '导出': 'export',
      '导入': 'import',
      '复制': 'copy',
      '粘贴': 'paste',
      '打开': 'open',
      '关闭': 'close',
      '最大化': 'maximize',
      '最小化': 'minimize',
      '全屏': 'fullscreen',
      '退出': 'exit',
    };
    
    // 尝试直接匹配
    if (commonTranslations[text]) {
      return commonTranslations[text];
    }
    
    // 尝试部分匹配
    for (const [chinese, english] of Object.entries(commonTranslations)) {
      if (text.includes(chinese)) {
        return text.replace(chinese, english);
      }
    }
    
    // 如果没有匹配，返回拼音或描述性名称
    return this.generateDescriptiveKey(text);
  }
  
  /**
   * 生成描述性键名
   */
  private generateDescriptiveKey(text: string): string {
    // 根据文本内容生成描述性键名
    if (text.includes('连接')) return 'connection_related';
    if (text.includes('查询')) return 'query_related';
    if (text.includes('设置')) return 'settings_related';
    if (text.includes('数据')) return 'data_related';
    if (text.includes('用户')) return 'user_related';
    if (text.includes('错误') || text.includes('失败')) return 'error_related';
    if (text.includes('成功')) return 'success_related';
    if (text.includes('警告')) return 'warning_related';
    if (text.includes('提示') || text.includes('信息')) return 'info_related';
    
    // 默认使用文本长度和首字符生成键名
    const firstChar = text.charAt(0);
    const length = text.length;
    return `text_${firstChar}_${length}`;
  }
  
  /**
   * 确定命名空间
   */
  private determineNamespace(filePath: string, text: string): string {
    // 根据文件路径确定命名空间
    if (filePath.includes('/connection')) return 'connections';
    if (filePath.includes('/query')) return 'query';
    if (filePath.includes('/settings')) return 'settings';
    if (filePath.includes('/visualization')) return 'visualization';
    if (filePath.includes('/database')) return 'connections';
    if (filePath.includes('/error') || filePath.includes('/Error')) return 'errors';
    
    // 根据文本内容确定命名空间
    if (text.includes('连接') || text.includes('数据库')) return 'connections';
    if (text.includes('查询') || text.includes('SQL')) return 'query';
    if (text.includes('设置') || text.includes('配置')) return 'settings';
    if (text.includes('图表') || text.includes('可视化')) return 'visualization';
    if (text.includes('错误') || text.includes('失败')) return 'errors';
    
    // 默认使用 common 命名空间
    return 'common';
  }
  
  /**
   * 生成翻译建议
   */
  generateTranslationSuggestions(extractedTexts: ExtractedText[]): TranslationSuggestion[] {
    const suggestions: TranslationSuggestion[] = [];
    const keyMap = new Map<string, ExtractedText[]>();
    
    // 按键分组
    extractedTexts.forEach(extracted => {
      const key = `${extracted.namespace}.${extracted.suggestedKey}`;
      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }
      keyMap.get(key)!.push(extracted);
    });
    
    // 生成建议
    keyMap.forEach((texts, key) => {
      const [namespace, ...keyParts] = key.split('.');
      const keyName = keyParts.join('.');
      const firstText = texts[0];
      
      suggestions.push({
        key: keyName,
        zhCN: firstText.text,
        enUS: this.generateEnglishTranslation(firstText.text),
        namespace,
        description: `Found in ${texts.length} location(s): ${texts.map(t => `${t.file}:${t.line}`).join(', ')}`,
      });
    });
    
    return suggestions;
  }
  
  /**
   * 生成英文翻译
   */
  private generateEnglishTranslation(chineseText: string): string {
    const translations: { [key: string]: string } = {
      '确定': 'OK',
      '取消': 'Cancel',
      '保存': 'Save',
      '删除': 'Delete',
      '编辑': 'Edit',
      '创建': 'Create',
      '新建': 'New',
      '添加': 'Add',
      '移除': 'Remove',
      '刷新': 'Refresh',
      '搜索': 'Search',
      '查询': 'Query',
      '连接': 'Connection',
      '连接管理': 'Connection Management',
      '设置': 'Settings',
      '配置': 'Configuration',
      '用户': 'User',
      '密码': 'Password',
      '登录': 'Login',
      '注销': 'Logout',
      '主页': 'Home',
      '仪表板': 'Dashboard',
      '数据库': 'Database',
      '表格': 'Table',
      '列': 'Column',
      '行': 'Row',
      '数据': 'Data',
      '结果': 'Result',
      '错误': 'Error',
      '成功': 'Success',
      '警告': 'Warning',
      '信息': 'Information',
      '加载中': 'Loading',
      '加载中...': 'Loading...',
      '请稍候': 'Please wait',
      '暂无数据': 'No data available',
      '操作': 'Operation',
      '功能': 'Feature',
      '工具': 'Tool',
      '帮助': 'Help',
      '关于': 'About',
      '版本': 'Version',
      '更新': 'Update',
      '下载': 'Download',
      '上传': 'Upload',
      '导出': 'Export',
      '导入': 'Import',
      '复制': 'Copy',
      '粘贴': 'Paste',
      '打开': 'Open',
      '关闭': 'Close',
      '测试连接': 'Test Connection',
      '连接成功': 'Connection Successful',
      '连接失败': 'Connection Failed',
      '查询结果': 'Query Result',
      '执行查询': 'Execute Query',
      '查询历史': 'Query History',
      '语言设置': 'Language Settings',
      '主题设置': 'Theme Settings',
      '外观设置': 'Appearance Settings',
      '搜索...': 'Search...',
      '请输入...': 'Please enter...',
      '选择数据库': 'Select Database',
      '选择表': 'Select Table',
      '无法加载独立窗口': 'Unable to load detached window',
      '请关闭此窗口并重试': 'Please close this window and try again',
      '点击"新建"创建您的第一个图表': 'Click "New" to create your first chart',
      '输入图表标题': 'Enter chart title',
      '选择图表类型': 'Select chart type',
      '输入 InfluxQL 查询语句': 'Enter InfluxQL query',
      '重新加载': 'Reload',
      '放大': 'Zoom In',
      '缩小': 'Zoom Out',
      '刷新表列表': 'Refresh Table List',
      '刷新表结构信息': 'Refresh Table Structure',
    };
    
    // 直接匹配
    if (translations[chineseText]) {
      return translations[chineseText];
    }
    
    // 部分匹配和替换
    let result = chineseText;
    for (const [chinese, english] of Object.entries(translations)) {
      if (result.includes(chinese)) {
        result = result.replace(new RegExp(chinese, 'g'), english);
      }
    }
    
    // 如果还是包含中文，返回占位符
    if (/[\u4e00-\u9fff]/.test(result)) {
      return `[TODO: Translate "${chineseText}"]`;
    }
    
    return result;
  }
}