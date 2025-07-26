/**
 * 性能测试
 * 
 * 测试应用的性能指标和响应时间
 */

import { test, expect } from '@playwright/test';
import { PERFORMANCE_CONFIG } from '../config/database-config';

test.describe('性能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible({ timeout: 30000 });
  });

  test.describe('应用启动性能', () => {
    
    test('应用启动时间应该在合理范围内', async ({ page }) => {
      const startTime = Date.now();
      
      // 重新加载页面
      await page.reload();
      
      // 等待应用完全加载
      await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // 验证启动时间（5秒内）
      expect(loadTime).toBeLessThan(5000);
      
      console.log(`应用启动时间: ${loadTime}ms`);
    });
    
    test('首次内容绘制时间应该合理', async ({ page }) => {
      // 使用 Performance API 测量 FCP
      const fcpTime = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              resolve(fcpEntry.startTime);
            }
          }).observe({ entryTypes: ['paint'] });
          
          // 超时处理
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      if (fcpTime > 0) {
        // FCP 应该在 2 秒内
        expect(fcpTime).toBeLessThan(2000);
        console.log(`首次内容绘制时间: ${fcpTime}ms`);
      }
    });
    
    test('最大内容绘制时间应该合理', async ({ page }) => {
      // 使用 Performance API 测量 LCP
      const lcpTime = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcpEntry = entries[entries.length - 1]; // 最后一个 LCP 条目
            if (lcpEntry) {
              resolve(lcpEntry.startTime);
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // 超时处理
          setTimeout(() => resolve(0), 10000);
        });
      });
      
      if (lcpTime > 0) {
        // LCP 应该在 4 秒内
        expect(lcpTime).toBeLessThan(4000);
        console.log(`最大内容绘制时间: ${lcpTime}ms`);
      }
    });
  });

  test.describe('UI 响应性能', () => {
    
    test('页面导航应该快速响应', async ({ page }) => {
      const pages = [
        { testId: 'nav-multi-database', pageTestId: 'multi-database-page' },
        { testId: 'nav-iotdb-test', pageTestId: 'iotdb-test-page' },
        { testId: 'nav-query', pageTestId: 'query-page' },
        { testId: 'nav-visualization', pageTestId: 'visualization-page' },
      ];
      
      for (const pageInfo of pages) {
        const startTime = Date.now();
        
        // 点击导航
        await page.click(`[data-testid="${pageInfo.testId}"]`);
        
        // 等待页面加载
        await expect(page.locator(`[data-testid="${pageInfo.pageTestId}"]`)).toBeVisible();
        
        const navigationTime = Date.now() - startTime;
        
        // 导航应该在 1 秒内完成
        expect(navigationTime).toBeLessThan(1000);
        
        console.log(`${pageInfo.testId} 导航时间: ${navigationTime}ms`);
      }
    });
    
    test('对话框打开应该快速响应', async ({ page }) => {
      const dialogs = [
        { triggerTestId: 'connection-manager-btn', dialogTestId: 'connection-manager-dialog' },
        { triggerTestId: 'settings-btn', dialogTestId: 'settings-dialog' },
      ];
      
      for (const dialog of dialogs) {
        const startTime = Date.now();
        
        // 点击触发按钮
        await page.click(`[data-testid="${dialog.triggerTestId}"]`);
        
        // 等待对话框出现
        await expect(page.locator(`[data-testid="${dialog.dialogTestId}"]`)).toBeVisible();
        
        const openTime = Date.now() - startTime;
        
        // 对话框打开应该在 500ms 内
        expect(openTime).toBeLessThan(500);
        
        console.log(`${dialog.triggerTestId} 对话框打开时间: ${openTime}ms`);
        
        // 关闭对话框
        const closeBtn = page.locator(`[data-testid="${dialog.dialogTestId}"] [data-testid="close-btn"]`);
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
        
        await expect(page.locator(`[data-testid="${dialog.dialogTestId}"]`)).not.toBeVisible();
      }
    });
    
    test('表单输入应该流畅响应', async ({ page }) => {
      // 打开连接管理
      await page.click('[data-testid="connection-manager-btn"]');
      await page.click('[data-testid="add-connection-btn"]');
      
      const form = page.locator('[data-testid="connection-form"]');
      await expect(form).toBeVisible();
      
      // 测试输入响应时间
      const inputs = [
        'connection-name',
        'host',
        'port',
        'username',
        'password',
      ];
      
      for (const inputTestId of inputs) {
        const input = form.locator(`[data-testid="${inputTestId}"]`);
        if (await input.isVisible()) {
          const startTime = Date.now();
          
          // 输入文本
          await input.fill('test-value');
          
          // 验证输入值
          await expect(input).toHaveValue('test-value');
          
          const inputTime = Date.now() - startTime;
          
          // 输入响应应该在 100ms 内
          expect(inputTime).toBeLessThan(100);
          
          console.log(`${inputTestId} 输入响应时间: ${inputTime}ms`);
        }
      }
    });
  });

  test.describe('数据加载性能', () => {
    
    test('数据源树加载应该快速', async ({ page }) => {
      // 假设有可用连接
      const connection = page.locator('[data-testid^="connection-"]').first();
      
      if (await connection.isVisible()) {
        const startTime = Date.now();
        
        // 点击连接
        await connection.click();
        
        // 等待数据源树加载
        const dataSourceTree = page.locator('[data-testid="data-source-tree"]');
        await expect(dataSourceTree).toBeVisible();
        
        // 等待树节点加载
        const treeNodes = page.locator('[data-testid*="node"]');
        await expect(treeNodes.first()).toBeVisible({ timeout: 10000 });
        
        const loadTime = Date.now() - startTime;
        
        // 数据源树加载应该在 5 秒内
        expect(loadTime).toBeLessThan(5000);
        
        console.log(`数据源树加载时间: ${loadTime}ms`);
      }
    });
    
    test('查询结果加载性能', async ({ page }) => {
      // 导航到查询页面
      await page.click('[data-testid="nav-query"]');
      
      // 输入简单查询
      const queryEditor = page.locator('[data-testid="query-editor"]');
      await queryEditor.fill('SHOW DATABASES');
      
      const startTime = Date.now();
      
      // 执行查询
      await page.click('[data-testid="execute-query-btn"]');
      
      // 等待查询结果
      const queryResult = page.locator('[data-testid="query-result"]');
      await expect(queryResult).toBeVisible({ timeout: PERFORMANCE_CONFIG.queryTimeout });
      
      const queryTime = Date.now() - startTime;
      
      // 简单查询应该在基准时间内完成
      expect(queryTime).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.simpleQueryTime);
      
      console.log(`查询执行时间: ${queryTime}ms`);
    });
  });

  test.describe('内存使用性能', () => {
    
    test('长时间使用后内存使用应该稳定', async ({ page }) => {
      // 获取初始内存使用
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // 执行一系列操作
      for (let i = 0; i < 10; i++) {
        // 导航到不同页面
        await page.click('[data-testid="nav-multi-database"]');
        await page.waitForTimeout(100);
        
        await page.click('[data-testid="nav-query"]');
        await page.waitForTimeout(100);
        
        await page.click('[data-testid="nav-visualization"]');
        await page.waitForTimeout(100);
        
        // 打开和关闭对话框
        await page.click('[data-testid="connection-manager-btn"]');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
      
      // 获取最终内存使用
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
        
        // 内存增长应该在合理范围内（不超过 50MB）
        expect(memoryIncreaseMB).toBeLessThan(50);
        
        console.log(`内存使用变化: ${memoryIncreaseMB.toFixed(2)}MB`);
        console.log(`初始内存: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`最终内存: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      }
    });
    
    test('大量数据处理性能', async ({ page }) => {
      // 导航到查询页面
      await page.click('[data-testid="nav-query"]');
      
      // 输入大数据量查询
      const largeQuery = `SELECT * FROM test_table LIMIT ${PERFORMANCE_CONFIG.largeQueryLimit}`;
      await page.fill('[data-testid="query-editor"]', largeQuery);
      
      const startTime = Date.now();
      
      // 执行查询
      await page.click('[data-testid="execute-query-btn"]');
      
      // 等待查询结果（使用更长的超时时间）
      const queryResult = page.locator('[data-testid="query-result"]');
      await expect(queryResult).toBeVisible({ timeout: PERFORMANCE_CONFIG.benchmarks.largeQueryTime });
      
      const queryTime = Date.now() - startTime;
      
      // 大数据量查询应该在基准时间内完成
      expect(queryTime).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.largeQueryTime);
      
      console.log(`大数据量查询时间: ${queryTime}ms`);
      
      // 验证结果表格渲染性能
      const resultTable = page.locator('[data-testid="result-table"]');
      if (await resultTable.isVisible()) {
        const renderStartTime = Date.now();
        
        // 等待表格完全渲染
        await expect(resultTable.locator('tbody tr')).toHaveCount(Math.min(100, PERFORMANCE_CONFIG.largeQueryLimit), { timeout: 10000 });
        
        const renderTime = Date.now() - renderStartTime;
        
        // 表格渲染应该在 5 秒内完成
        expect(renderTime).toBeLessThan(5000);
        
        console.log(`表格渲染时间: ${renderTime}ms`);
      }
    });
  });

  test.describe('网络性能', () => {
    
    test('慢网络条件下应用应该可用', async ({ page }) => {
      // 模拟慢网络
      await page.context().route('**/*', async (route) => {
        // 延迟 500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.continue();
      });
      
      const startTime = Date.now();
      
      // 执行网络相关操作
      await page.click('[data-testid="connection-manager-btn"]');
      await expect(page.locator('[data-testid="connection-manager-dialog"]')).toBeVisible();
      
      const operationTime = Date.now() - startTime;
      
      // 即使在慢网络下，操作也应该在合理时间内完成
      expect(operationTime).toBeLessThan(10000);
      
      console.log(`慢网络下操作时间: ${operationTime}ms`);
    });
    
    test('网络中断恢复后应用应该正常', async ({ page }) => {
      // 模拟网络中断
      await page.context().setOffline(true);
      
      // 尝试执行操作
      await page.click('[data-testid="connection-manager-btn"]');
      
      // 恢复网络
      await page.context().setOffline(false);
      
      // 验证应用恢复正常
      await expect(page.locator('[data-testid="connection-manager-dialog"]')).toBeVisible({ timeout: 5000 });
      
      console.log('网络恢复后应用正常工作');
    });
  });
});
