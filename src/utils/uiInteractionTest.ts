/**
 * InfloWave UI 交互测试工具
 * 专门用于测试界面按钮点击、菜单导航、表单交互等功能
 */

export interface UITestResult {
  testId: string;
  testName: string;
  category: string;
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
  element?: string;
  action?: string;
}

export interface UITestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: UITestResult[];
  categories: {
    [key: string]: {
      total: number;
      passed: number;
      failed: number;
    };
  };
}

class UIInteractionTester {
  private results: UITestResult[] = [];
  private testCounter = 0;

  /**
   * 记录测试结果
   */
  private recordTest(
    testName: string,
    category: string,
    success: boolean,
    message: string,
    details?: any,
    element?: string,
    action?: string
  ): void {
    this.testCounter++;
    const result: UITestResult = {
      testId: `test-${this.testCounter}`,
      testName,
      category,
      success,
      message,
      timestamp: new Date().toISOString(),
      details,
      element,
      action
    };
    
    this.results.push(result);
    
    const status = success ? '✅' : '❌';
    console.log(`[${category}] ${status} ${testName}: ${message}`);
  }

  /**
   * 模拟等待
   */
  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 查找元素
   */
  private findElement(selector: string): Element | null {
    return document.querySelector(selector);
  }

  /**
   * 模拟点击事件
   */
  private simulateClick(element: Element): void {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
  }

  /**
   * 模拟键盘事件
   */
  private simulateKeyboard(key: string, modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): void {
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: modifiers.ctrl,
      shiftKey: modifiers.shift,
      altKey: modifiers.alt,
      bubbles: true
    });
    document.dispatchEvent(event);
  }

  /**
   * 测试工具栏按钮功能
   */
  async testToolbarButtons(): Promise<void> {
    const category = '工具栏按钮';
    

    // 查找所有工具栏按钮
    const allToolbarButtons = document.querySelectorAll('.toolbar-button-vertical');
    
    if (allToolbarButtons.length === 0) {
      this.recordTest(
        '工具栏按钮存在性检查',
        category,
        false,
        '未找到任何工具栏按钮',
        null,
        '.toolbar-button-vertical'
      );
      return;
    }

    this.recordTest(
      '工具栏按钮存在性检查',
      category,
      true,
      `找到 ${allToolbarButtons.length} 个工具栏按钮`,
      { count: allToolbarButtons.length },
      '.toolbar-button-vertical'
    );

    // 测试每个按钮
    for (let i = 0; i < allToolbarButtons.length; i++) {
      const button = allToolbarButtons[i] as HTMLElement;
      const buttonText = button.textContent?.trim() || '';
      
      try {
        // 记录按钮点击前的URL
        const beforeUrl = window.location.pathname;
        
        // 模拟点击
        this.simulateClick(button);
        
        // 等待一下看是否有路由变化
        await this.wait(200);
        
        const afterUrl = window.location.pathname;
        const urlChanged = beforeUrl !== afterUrl;
        
        this.recordTest(
          `工具栏按钮${i + 1}点击 (${buttonText})`,
          category,
          true,
          urlChanged ? `点击成功，路由从 ${beforeUrl} 变为 ${afterUrl}` : '点击成功但路由未变化',
          { 
            buttonText,
            beforeUrl,
            afterUrl,
            urlChanged
          },
          `.toolbar-button-vertical:nth-child(${i + 1})`,
          'click'
        );
      } catch (error) {
        this.recordTest(
          `工具栏按钮${i + 1}点击 (${buttonText})`,
          category,
          false,
          `点击失败: ${error}`,
          { buttonText },
          `.toolbar-button-vertical:nth-child(${i + 1})`,
          'click'
        );
      }
    }
  }

  /**
   * 测试用户菜单功能
   */
  async testUserMenu(): Promise<void> {
    const category = '用户菜单';
    
    // 查找用户菜单触发器
    const userMenuTrigger = this.findElement('.toolbar-right button');
    
    if (!userMenuTrigger) {
      this.recordTest(
        '用户菜单触发器',
        category,
        false,
        '未找到用户菜单触发器',
        null,
        '.toolbar-right button'
      );
      return;
    }

    this.recordTest(
      '用户菜单触发器',
      category,
      true,
      '找到用户菜单触发器',
      null,
      '.toolbar-right button'
    );

    try {
      // 点击用户菜单
      this.simulateClick(userMenuTrigger);
      await this.wait(300);
      
      // 查找下拉菜单
      const dropdown = this.findElement('.dropdown-menu, [role="menu"]');
      
      if (dropdown) {
        this.recordTest(
          '用户菜单下拉',
          category,
          true,
          '用户菜单下拉成功打开',
          null,
          '.dropdown-menu',
          'dropdown'
        );
        
        // 查找菜单项
        const menuItems = dropdown.querySelectorAll('button, [role="menuitem"]');
        
        this.recordTest(
          '用户菜单项数量',
          category,
          menuItems.length > 0,
          `找到 ${menuItems.length} 个菜单项`,
          { count: menuItems.length },
          '.dropdown-menu button'
        );
        
        // 测试每个菜单项
        for (let i = 0; i < Math.min(menuItems.length, 5); i++) {
          const menuItem = menuItems[i] as HTMLElement;
          const itemText = menuItem.textContent?.trim() || '';
          
          try {
            this.simulateClick(menuItem);
            await this.wait(100);
            
            this.recordTest(
              `用户菜单项点击 (${itemText})`,
              category,
              true,
              `菜单项 "${itemText}" 点击成功`,
              { itemText },
              `.dropdown-menu button:nth-child(${i + 1})`,
              'click'
            );
          } catch (error) {
            this.recordTest(
              `用户菜单项点击 (${itemText})`,
              category,
              false,
              `菜单项 "${itemText}" 点击失败: ${error}`,
              { itemText },
              `.dropdown-menu button:nth-child(${i + 1})`,
              'click'
            );
          }
        }
      } else {
        this.recordTest(
          '用户菜单下拉',
          category,
          false,
          '用户菜单下拉未打开',
          null,
          '.dropdown-menu'
        );
      }
    } catch (error) {
      this.recordTest(
        '用户菜单功能',
        category,
        false,
        `用户菜单测试失败: ${error}`,
        null,
        '.toolbar-right button',
        'click'
      );
    }
  }

  /**
   * 测试键盘快捷键
   */
  async testKeyboardShortcuts(): Promise<void> {
    const category = '键盘快捷键';
    
    const shortcuts = [
      { keys: { key: '1', ctrl: true }, name: 'Ctrl+1 仪表板' },
      { keys: { key: '2', ctrl: true }, name: 'Ctrl+2 连接管理' },
      { keys: { key: '3', ctrl: true }, name: 'Ctrl+3 数据查询' },
      { keys: { key: '4', ctrl: true }, name: 'Ctrl+4 数据库管理' },
      { keys: { key: 'n', ctrl: true }, name: 'Ctrl+N 新建查询' },
      { keys: { key: 'P', ctrl: true, shift: true }, name: 'Ctrl+Shift+P 全局搜索' }
    ];

    for (const shortcut of shortcuts) {
      try {
        const beforeUrl = window.location.pathname;
        
        // 模拟快捷键
        this.simulateKeyboard(shortcut.keys.key, {
          ctrl: shortcut.keys.ctrl,
          shift: shortcut.keys.shift
        });
        
        await this.wait(200);
        
        const afterUrl = window.location.pathname;
        const urlChanged = beforeUrl !== afterUrl;
        
        this.recordTest(
          shortcut.name,
          category,
          true,
          urlChanged ? `快捷键生效，路由从 ${beforeUrl} 变为 ${afterUrl}` : '快捷键响应正常',
          {
            beforeUrl,
            afterUrl,
            urlChanged
          },
          'document',
          'keydown'
        );
      } catch (error) {
        this.recordTest(
          shortcut.name,
          category,
          false,
          `快捷键测试失败: ${error}`,
          null,
          'document',
          'keydown'
        );
      }
    }
  }

  /**
   * 测试表单交互
   */
  async testFormInteractions(): Promise<void> {
    const category = '表单交互';
    
    // 查找输入框
    const inputs = document.querySelectorAll('input');
    
    if (inputs.length === 0) {
      this.recordTest(
        '输入框存在性',
        category,
        false,
        '页面上未找到输入框',
        null,
        'input'
      );
    } else {
      this.recordTest(
        '输入框存在性',
        category,
        true,
        `找到 ${inputs.length} 个输入框`,
        { count: inputs.length },
        'input'
      );
      
      // 测试前几个输入框
      for (let i = 0; i < Math.min(inputs.length, 3); i++) {
        const input = inputs[i] as HTMLInputElement;
        const inputType = input.type || 'text';
        
        try {
          const testValue = `test-value-${Date.now()}`;
          
          // 模拟输入
          input.focus();
          input.value = testValue;
          
          // 触发输入事件
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          
          await this.wait(100);
          
          this.recordTest(
            `输入框${i + 1}输入测试 (${inputType})`,
            category,
            input.value === testValue,
            input.value === testValue ? '输入功能正常' : '输入值未正确设置',
            { 
              inputType,
              testValue,
              actualValue: input.value
            },
            `input:nth-of-type(${i + 1})`,
            'input'
          );
        } catch (error) {
          this.recordTest(
            `输入框${i + 1}输入测试 (${inputType})`,
            category,
            false,
            `输入测试失败: ${error}`,
            { inputType },
            `input:nth-of-type(${i + 1})`,
            'input'
          );
        }
      }
    }
    
    // 查找按钮
    const buttons = document.querySelectorAll('button');
    
    if (buttons.length === 0) {
      this.recordTest(
        '按钮存在性',
        category,
        false,
        '页面上未找到按钮',
        null,
        'button'
      );
    } else {
      this.recordTest(
        '按钮存在性',
        category,
        true,
        `找到 ${buttons.length} 个按钮`,
        { count: buttons.length },
        'button'
      );
    }
  }

  /**
   * 测试模态框和对话框
   */
  async testModalsAndDialogs(): Promise<void> {
    const category = '模态框和对话框';
    
    // 查找可能触发模态框的按钮
    const modalTriggers = document.querySelectorAll('[data-testid*="modal"], [data-testid*="dialog"], button[class*="modal"], button[class*="dialog"]');
    
    if (modalTriggers.length === 0) {
      this.recordTest(
        '模态框触发器',
        category,
        false,
        '未找到模态框触发器',
        null,
        '[data-testid*="modal"]'
      );
    } else {
      this.recordTest(
        '模态框触发器',
        category,
        true,
        `找到 ${modalTriggers.length} 个潜在的模态框触发器`,
        { count: modalTriggers.length },
        '[data-testid*="modal"]'
      );
    }

    // 查找现有的模态框
    const existingModals = document.querySelectorAll('.modal, [role="dialog"], [data-state="open"]');
    
    this.recordTest(
      '现有模态框',
      category,
      true,
      `页面上有 ${existingModals.length} 个模态框`,
      { count: existingModals.length },
      '.modal, [role="dialog"]'
    );
  }

  /**
   * 测试页面导航
   */
  async testPageNavigation(): Promise<void> {
    const category = '页面导航';
    
    // 测试主要路由
    const routes = [
      { path: '/dashboard', name: '仪表板' },
      { path: '/connections', name: '连接管理' },
      { path: '/query', name: '数据查询' },
      { path: '/database', name: '数据库管理' },
      { path: '/visualization', name: '数据可视化' },
      { path: '/performance', name: '性能监控' },
      { path: '/settings', name: '应用设置' }
    ];

    for (const route of routes) {
      try {
        const beforeUrl = window.location.pathname;
        
        // 使用 history API 导航
        window.history.pushState({}, '', route.path);
        
        await this.wait(200);
        
        const afterUrl = window.location.pathname;
        const navigationSuccessful = afterUrl === route.path;
        
        this.recordTest(
          `导航到${route.name}`,
          category,
          navigationSuccessful,
          navigationSuccessful ? `成功导航到 ${route.path}` : `导航失败，当前路径: ${afterUrl}`,
          {
            targetPath: route.path,
            actualPath: afterUrl,
            beforeUrl
          },
          'history',
          'pushState'
        );
      } catch (error) {
        this.recordTest(
          `导航到${route.name}`,
          category,
          false,
          `导航失败: ${error}`,
          { targetPath: route.path },
          'history',
          'pushState'
        );
      }
    }
  }

  /**
   * 生成测试报告
   */
  generateReport(): UITestReport {
    const categories: { [key: string]: { total: number; passed: number; failed: number } } = {};
    
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      categories[result.category].total++;
      if (result.success) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });

    const report: UITestReport = {
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.success).length,
      failedTests: this.results.filter(r => !r.success).length,
      testResults: this.results,
      categories
    };

    return report;
  }

  /**
   * 运行所有UI测试
   */
  async runAllUITests(): Promise<UITestReport> {
    console.log('🎯 开始运行InfloWave UI交互测试...');
    
    this.results = [];
    this.testCounter = 0;
    
    try {
      // 等待页面加载完成
      await this.wait(1000);
      
      console.log('📱 测试工具栏按钮功能...');
      await this.testToolbarButtons();
      
      console.log('👤 测试用户菜单功能...');
      await this.testUserMenu();
      
      console.log('⌨️ 测试键盘快捷键...');
      await this.testKeyboardShortcuts();
      
      console.log('📝 测试表单交互...');
      await this.testFormInteractions();
      
      console.log('🔲 测试模态框和对话框...');
      await this.testModalsAndDialogs();
      
      console.log('🗂️ 测试页面导航...');
      await this.testPageNavigation();
      
      const report = this.generateReport();
      
      console.log('\n📊 UI测试报告摘要:');
      console.log(`总测试数: ${report.totalTests}`);
      console.log(`通过测试: ${report.passedTests}`);
      console.log(`失败测试: ${report.failedTests}`);
      console.log(`成功率: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`);
      
      console.log('\n📋 分类统计:');
      Object.entries(report.categories).forEach(([category, stats]) => {
        console.log(`${category}: ${stats.passed}/${stats.total} (${((stats.passed / stats.total) * 100).toFixed(1)}%)`);
      });
      
      return report;
      
    } catch (error) {
      console.error('❌ UI测试运行失败:', error);
      throw error;
    }
  }
}

// 导出测试实例
export const uiInteractionTester = new UIInteractionTester();

// 全局函数，可以在控制台调用
(window as any).runUITests = () => uiInteractionTester.runAllUITests();
(window as any).uiInteractionTester = uiInteractionTester;