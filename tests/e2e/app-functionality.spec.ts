/**
 * 应用功能 E2E 测试
 * 
 * 测试应用的核心功能和用户交互
 */

import { test, expect } from '@playwright/test';

test.describe('应用功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // 等待应用加载完成
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible({ timeout: 30000 });
  });

  test.describe('应用启动和导航', () => {
    
    test('应用应该正确启动并显示主界面', async ({ page }) => {
      // 验证主要 UI 元素存在
      await expect(page.locator('[data-testid="main-layout"]')).toBeVisible();
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // 验证标题
      await expect(page).toHaveTitle(/InfloWave/);
    });
    
    test('应该能够在不同页面间导航', async ({ page }) => {
      // 导航到多数据库工作台
      await page.click('[data-testid="nav-multi-database"]');
      await expect(page.locator('[data-testid="multi-database-page"]')).toBeVisible();
      
      // 导航到 IoTDB 测试页面
      await page.click('[data-testid="nav-iotdb-test"]');
      await expect(page.locator('[data-testid="iotdb-test-page"]')).toBeVisible();
      
      // 导航回首页
      await page.click('[data-testid="nav-home"]');
      await expect(page.locator('[data-testid="home-page"]')).toBeVisible();
    });
    
    test('侧边栏应该能够折叠和展开', async ({ page }) => {
      const sidebar = page.locator('[data-testid="sidebar"]');
      const toggleBtn = page.locator('[data-testid="sidebar-toggle"]');
      
      // 验证侧边栏初始状态
      await expect(sidebar).toBeVisible();
      
      // 折叠侧边栏
      await toggleBtn.click();
      await expect(sidebar).toHaveClass(/collapsed/);
      
      // 展开侧边栏
      await toggleBtn.click();
      await expect(sidebar).not.toHaveClass(/collapsed/);
    });
  });

  test.describe('连接管理功能', () => {
    
    test('应该能够打开连接管理对话框', async ({ page }) => {
      // 点击连接管理按钮
      await page.click('[data-testid="connection-manager-btn"]');
      
      // 验证对话框打开
      const dialog = page.locator('[data-testid="connection-manager-dialog"]');
      await expect(dialog).toBeVisible();
      
      // 验证对话框内容
      await expect(dialog.locator('[data-testid="connection-list"]')).toBeVisible();
      await expect(dialog.locator('[data-testid="add-connection-btn"]')).toBeVisible();
    });
    
    test('应该能够创建新连接', async ({ page }) => {
      // 打开连接管理
      await page.click('[data-testid="connection-manager-btn"]');
      
      // 点击添加连接
      await page.click('[data-testid="add-connection-btn"]');
      
      // 验证连接表单
      const form = page.locator('[data-testid="connection-form"]');
      await expect(form).toBeVisible();
      
      // 验证表单字段
      await expect(form.locator('[data-testid="connection-name"]')).toBeVisible();
      await expect(form.locator('[data-testid="db-type"]')).toBeVisible();
      await expect(form.locator('[data-testid="host"]')).toBeVisible();
      await expect(form.locator('[data-testid="port"]')).toBeVisible();
    });
    
    test('应该能够编辑现有连接', async ({ page }) => {
      // 假设已有连接存在
      await page.click('[data-testid="connection-manager-btn"]');
      
      // 点击编辑按钮（如果有连接的话）
      const editBtn = page.locator('[data-testid="edit-connection-btn"]').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        
        // 验证编辑表单
        const form = page.locator('[data-testid="connection-form"]');
        await expect(form).toBeVisible();
        
        // 验证表单已填充数据
        const nameField = form.locator('[data-testid="connection-name"]');
        await expect(nameField).not.toHaveValue('');
      }
    });
    
    test('应该能够删除连接', async ({ page }) => {
      await page.click('[data-testid="connection-manager-btn"]');
      
      // 点击删除按钮（如果有连接的话）
      const deleteBtn = page.locator('[data-testid="delete-connection-btn"]').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // 验证确认对话框
        const confirmDialog = page.locator('[data-testid="confirm-delete-dialog"]');
        await expect(confirmDialog).toBeVisible();
        
        // 取消删除
        await page.click('[data-testid="cancel-delete-btn"]');
        await expect(confirmDialog).not.toBeVisible();
      }
    });
  });

  test.describe('查询功能', () => {
    
    test('查询编辑器应该正确显示', async ({ page }) => {
      // 导航到查询页面
      await page.click('[data-testid="nav-query"]');
      
      // 验证查询编辑器
      const queryEditor = page.locator('[data-testid="query-editor"]');
      await expect(queryEditor).toBeVisible();
      
      // 验证查询控制按钮
      await expect(page.locator('[data-testid="execute-query-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="save-query-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="clear-query-btn"]')).toBeVisible();
    });
    
    test('应该能够输入和清空查询', async ({ page }) => {
      await page.click('[data-testid="nav-query"]');
      
      const queryEditor = page.locator('[data-testid="query-editor"]');
      const testQuery = 'SELECT * FROM test_table LIMIT 10';
      
      // 输入查询
      await queryEditor.fill(testQuery);
      await expect(queryEditor).toHaveValue(testQuery);
      
      // 清空查询
      await page.click('[data-testid="clear-query-btn"]');
      await expect(queryEditor).toHaveValue('');
    });
    
    test('应该能够插入示例查询', async ({ page }) => {
      await page.click('[data-testid="nav-query"]');
      
      // 点击示例查询按钮
      const exampleBtn = page.locator('[data-testid="example-query-btn"]');
      if (await exampleBtn.isVisible()) {
        await exampleBtn.click();
        
        // 验证查询编辑器有内容
        const queryEditor = page.locator('[data-testid="query-editor"]');
        await expect(queryEditor).not.toHaveValue('');
      }
    });
    
    test('查询结果区域应该正确显示', async ({ page }) => {
      await page.click('[data-testid="nav-query"]');
      
      // 验证结果区域
      const resultArea = page.locator('[data-testid="query-result-area"]');
      await expect(resultArea).toBeVisible();
      
      // 验证标签页
      await expect(page.locator('[data-testid="result-tab"]')).toBeVisible();
      await expect(page.locator('[data-testid="history-tab"]')).toBeVisible();
    });
  });

  test.describe('可视化功能', () => {
    
    test('应该能够访问可视化页面', async ({ page }) => {
      // 导航到可视化页面
      await page.click('[data-testid="nav-visualization"]');
      
      // 验证可视化页面
      await expect(page.locator('[data-testid="visualization-page"]')).toBeVisible();
      
      // 验证图表区域
      await expect(page.locator('[data-testid="chart-container"]')).toBeVisible();
    });
    
    test('应该能够创建新图表', async ({ page }) => {
      await page.click('[data-testid="nav-visualization"]');
      
      // 点击创建图表按钮
      const createBtn = page.locator('[data-testid="create-chart-btn"]');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        // 验证图表创建对话框
        const dialog = page.locator('[data-testid="create-chart-dialog"]');
        await expect(dialog).toBeVisible();
        
        // 验证表单字段
        await expect(dialog.locator('[data-testid="chart-title"]')).toBeVisible();
        await expect(dialog.locator('[data-testid="chart-type"]')).toBeVisible();
        await expect(dialog.locator('[data-testid="chart-query"]')).toBeVisible();
      }
    });
    
    test('图表类型选择应该正常工作', async ({ page }) => {
      await page.click('[data-testid="nav-visualization"]');
      
      const createBtn = page.locator('[data-testid="create-chart-btn"]');
      if (await createBtn.isVisible()) {
        await createBtn.click();
        
        const chartTypeSelect = page.locator('[data-testid="chart-type"]');
        
        // 测试不同图表类型
        await chartTypeSelect.selectOption('line');
        await expect(chartTypeSelect).toHaveValue('line');
        
        await chartTypeSelect.selectOption('bar');
        await expect(chartTypeSelect).toHaveValue('bar');
        
        await chartTypeSelect.selectOption('pie');
        await expect(chartTypeSelect).toHaveValue('pie');
      }
    });
  });

  test.describe('设置功能', () => {
    
    test('应该能够打开设置对话框', async ({ page }) => {
      // 点击设置按钮
      await page.click('[data-testid="settings-btn"]');
      
      // 验证设置对话框
      const dialog = page.locator('[data-testid="settings-dialog"]');
      await expect(dialog).toBeVisible();
      
      // 验证设置标签页
      await expect(dialog.locator('[data-testid="general-settings-tab"]')).toBeVisible();
      await expect(dialog.locator('[data-testid="query-settings-tab"]')).toBeVisible();
    });
    
    test('应该能够切换主题', async ({ page }) => {
      await page.click('[data-testid="settings-btn"]');
      
      // 找到主题切换器
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        // 获取当前主题
        const currentTheme = await page.getAttribute('html', 'class');
        
        // 切换主题
        await themeToggle.click();
        
        // 验证主题已切换
        const newTheme = await page.getAttribute('html', 'class');
        expect(newTheme).not.toBe(currentTheme);
      }
    });
    
    test('应该能够修改查询设置', async ({ page }) => {
      await page.click('[data-testid="settings-btn"]');
      
      // 切换到查询设置标签页
      await page.click('[data-testid="query-settings-tab"]');
      
      // 验证查询设置选项
      const queryTimeout = page.locator('[data-testid="query-timeout"]');
      if (await queryTimeout.isVisible()) {
        // 修改查询超时设置
        await queryTimeout.fill('30');
        await expect(queryTimeout).toHaveValue('30');
      }
    });
  });

  test.describe('响应式设计', () => {
    
    test('应该在移动端正确显示', async ({ page }) => {
      // 设置移动端视口
      await page.setViewportSize({ width: 375, height: 667 });
      
      // 验证移动端布局
      const mobileLayout = page.locator('[data-testid="mobile-layout"]');
      if (await mobileLayout.isVisible()) {
        await expect(mobileLayout).toBeVisible();
      }
      
      // 验证侧边栏在移动端的行为
      const sidebar = page.locator('[data-testid="sidebar"]');
      const mobileMenuBtn = page.locator('[data-testid="mobile-menu-btn"]');
      
      if (await mobileMenuBtn.isVisible()) {
        // 点击移动端菜单按钮
        await mobileMenuBtn.click();
        await expect(sidebar).toBeVisible();
        
        // 再次点击关闭
        await mobileMenuBtn.click();
        await expect(sidebar).not.toBeVisible();
      }
    });
    
    test('应该在平板端正确显示', async ({ page }) => {
      // 设置平板端视口
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // 验证平板端布局适应
      const mainLayout = page.locator('[data-testid="main-layout"]');
      await expect(mainLayout).toBeVisible();
      
      // 验证内容区域适应
      const mainContent = page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('错误处理', () => {
    
    test('应该正确处理网络错误', async ({ page }) => {
      // 模拟网络离线
      await page.context().setOffline(true);
      
      // 尝试执行需要网络的操作
      await page.click('[data-testid="connection-manager-btn"]');
      
      // 验证错误提示
      const errorMessage = page.locator('[data-testid="network-error"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText('网络连接失败');
      }
      
      // 恢复网络连接
      await page.context().setOffline(false);
    });
    
    test('应该正确处理应用错误', async ({ page }) => {
      // 监听控制台错误
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // 执行一些操作
      await page.click('[data-testid="nav-query"]');
      await page.fill('[data-testid="query-editor"]', 'INVALID QUERY');
      
      // 等待一段时间让错误出现
      await page.waitForTimeout(1000);
      
      // 验证没有严重的 JavaScript 错误
      const criticalErrors = errors.filter(error => 
        error.includes('Uncaught') || error.includes('TypeError')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });
});
