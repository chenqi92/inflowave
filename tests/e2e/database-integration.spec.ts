/**
 * 真实数据库集成测试
 * 
 * 测试与真实数据库的连接和操作
 */

import { test, expect } from '@playwright/test';
import { 
  TEST_DATABASES, 
  getTestQueries, 
  PERFORMANCE_CONFIG,
  ERROR_TEST_CONFIG 
} from '../config/database-config';

test.describe('真实数据库集成测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 导航到应用首页
    await page.goto('/');
    
    // 等待应用加载完成
    await expect(page.locator('[data-testid="app-loaded"]')).toBeVisible({ timeout: 30000 });
  });

  test.describe('数据库连接测试', () => {
    
    for (const dbConfig of TEST_DATABASES) {
      test(`应该能够连接到 ${dbConfig.name}`, async ({ page }) => {
        // 点击添加连接按钮
        await page.click('[data-testid="add-connection-btn"]');
        
        // 填写连接信息
        await page.fill('[data-testid="connection-name"]', dbConfig.name);
        await page.selectOption('[data-testid="db-type"]', dbConfig.dbType);
        await page.fill('[data-testid="host"]', dbConfig.host);
        await page.fill('[data-testid="port"]', dbConfig.port.toString());
        
        if (dbConfig.username) {
          await page.fill('[data-testid="username"]', dbConfig.username);
        }
        
        if (dbConfig.password) {
          await page.fill('[data-testid="password"]', dbConfig.password);
        }
        
        if (dbConfig.database) {
          await page.fill('[data-testid="database"]', dbConfig.database);
        }
        
        if (dbConfig.token) {
          await page.fill('[data-testid="token"]', dbConfig.token);
        }
        
        if (dbConfig.org) {
          await page.fill('[data-testid="org"]', dbConfig.org);
        }
        
        if (dbConfig.bucket) {
          await page.fill('[data-testid="bucket"]', dbConfig.bucket);
        }
        
        // 测试连接
        const testConnectionBtn = page.locator('[data-testid="test-connection-btn"]');
        await testConnectionBtn.click();
        
        // 等待连接测试结果
        const connectionResult = page.locator('[data-testid="connection-result"]');
        await expect(connectionResult).toBeVisible({ timeout: PERFORMANCE_CONFIG.connectionTimeout });
        
        // 验证连接成功
        await expect(connectionResult).toContainText('连接成功');
        
        // 保存连接
        await page.click('[data-testid="save-connection-btn"]');
        
        // 验证连接已添加到列表
        await expect(page.locator(`[data-testid="connection-${dbConfig.id}"]`)).toBeVisible();
      });
    }
    
    test('应该正确处理连接失败', async ({ page }) => {
      const invalidConfig = ERROR_TEST_CONFIG.invalidConnections[0];
      
      // 点击添加连接按钮
      await page.click('[data-testid="add-connection-btn"]');
      
      // 填写无效连接信息
      await page.fill('[data-testid="connection-name"]', invalidConfig.name);
      await page.selectOption('[data-testid="db-type"]', invalidConfig.dbType);
      await page.fill('[data-testid="host"]', invalidConfig.host);
      await page.fill('[data-testid="port"]', invalidConfig.port.toString());
      await page.fill('[data-testid="username"]', invalidConfig.username!);
      await page.fill('[data-testid="password"]', invalidConfig.password!);
      
      // 测试连接
      await page.click('[data-testid="test-connection-btn"]');
      
      // 等待连接测试结果
      const connectionResult = page.locator('[data-testid="connection-result"]');
      await expect(connectionResult).toBeVisible({ timeout: PERFORMANCE_CONFIG.connectionTimeout });
      
      // 验证连接失败
      await expect(connectionResult).toContainText('连接失败');
    });
  });

  test.describe('查询执行测试', () => {
    
    test.beforeEach(async ({ page }) => {
      // 假设已经有一个可用的连接
      // 这里可以通过 API 或其他方式预先创建连接
    });
    
    for (const dbConfig of TEST_DATABASES) {
      test(`应该能够在 ${dbConfig.name} 中执行查询`, async ({ page }) => {
        // 选择连接
        await page.click(`[data-testid="connection-${dbConfig.id}"]`);
        
        // 等待连接激活
        await expect(page.locator('[data-testid="active-connection"]')).toContainText(dbConfig.name);
        
        // 获取测试查询
        const testQueries = getTestQueries(dbConfig.dbType);
        
        for (const query of testQueries.slice(0, 2)) { // 只测试前两个查询
          // 清空查询编辑器
          await page.fill('[data-testid="query-editor"]', '');
          
          // 输入查询
          await page.fill('[data-testid="query-editor"]', query);
          
          // 执行查询
          const executeBtn = page.locator('[data-testid="execute-query-btn"]');
          await executeBtn.click();
          
          // 等待查询结果
          const queryResult = page.locator('[data-testid="query-result"]');
          await expect(queryResult).toBeVisible({ timeout: PERFORMANCE_CONFIG.queryTimeout });
          
          // 验证查询成功
          const errorMessage = page.locator('[data-testid="query-error"]');
          await expect(errorMessage).not.toBeVisible();
          
          // 验证有结果数据
          const resultTable = page.locator('[data-testid="result-table"]');
          await expect(resultTable).toBeVisible();
        }
      });
    }
    
    test('应该正确处理无效查询', async ({ page }) => {
      // 选择第一个可用连接
      const firstDb = TEST_DATABASES[0];
      await page.click(`[data-testid="connection-${firstDb.id}"]`);
      
      // 等待连接激活
      await expect(page.locator('[data-testid="active-connection"]')).toContainText(firstDb.name);
      
      // 测试无效查询
      const invalidQuery = ERROR_TEST_CONFIG.invalidQueries[0];
      
      // 输入无效查询
      await page.fill('[data-testid="query-editor"]', invalidQuery);
      
      // 执行查询
      await page.click('[data-testid="execute-query-btn"]');
      
      // 等待错误消息
      const errorMessage = page.locator('[data-testid="query-error"]');
      await expect(errorMessage).toBeVisible({ timeout: PERFORMANCE_CONFIG.queryTimeout });
      
      // 验证错误消息包含相关信息
      await expect(errorMessage).toContainText('查询执行失败');
    });
  });

  test.describe('性能测试', () => {
    
    test('连接建立时间应该在合理范围内', async ({ page }) => {
      const dbConfig = TEST_DATABASES[0]; // 使用第一个数据库进行性能测试
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 点击添加连接按钮
      await page.click('[data-testid="add-connection-btn"]');
      
      // 快速填写连接信息
      await page.fill('[data-testid="connection-name"]', `${dbConfig.name}-性能测试`);
      await page.selectOption('[data-testid="db-type"]', dbConfig.dbType);
      await page.fill('[data-testid="host"]', dbConfig.host);
      await page.fill('[data-testid="port"]', dbConfig.port.toString());
      
      if (dbConfig.username) {
        await page.fill('[data-testid="username"]', dbConfig.username);
      }
      
      if (dbConfig.password) {
        await page.fill('[data-testid="password"]', dbConfig.password);
      }
      
      // 测试连接
      await page.click('[data-testid="test-connection-btn"]');
      
      // 等待连接结果
      await expect(page.locator('[data-testid="connection-result"]')).toBeVisible();
      
      // 计算连接时间
      const connectionTime = Date.now() - startTime;
      
      // 验证连接时间在合理范围内
      expect(connectionTime).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.connectionTime);
      
      console.log(`${dbConfig.name} 连接时间: ${connectionTime}ms`);
    });
    
    test('简单查询执行时间应该在合理范围内', async ({ page }) => {
      const dbConfig = TEST_DATABASES[0];
      
      // 选择连接
      await page.click(`[data-testid="connection-${dbConfig.id}"]`);
      await expect(page.locator('[data-testid="active-connection"]')).toContainText(dbConfig.name);
      
      // 获取简单查询
      const testQueries = getTestQueries(dbConfig.dbType);
      const simpleQuery = testQueries[0]; // 第一个通常是最简单的查询
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 执行查询
      await page.fill('[data-testid="query-editor"]', simpleQuery);
      await page.click('[data-testid="execute-query-btn"]');
      
      // 等待查询结果
      await expect(page.locator('[data-testid="query-result"]')).toBeVisible();
      
      // 计算查询时间
      const queryTime = Date.now() - startTime;
      
      // 验证查询时间在合理范围内
      expect(queryTime).toBeLessThan(PERFORMANCE_CONFIG.benchmarks.simpleQueryTime);
      
      console.log(`${dbConfig.name} 简单查询时间: ${queryTime}ms`);
    });
  });

  test.describe('数据操作测试', () => {
    
    test('应该能够浏览数据库结构', async ({ page }) => {
      const dbConfig = TEST_DATABASES.find(db => db.dbType === 'influxdb');
      if (!dbConfig) return;
      
      // 选择 InfluxDB 连接
      await page.click(`[data-testid="connection-${dbConfig.id}"]`);
      
      // 等待数据源树加载
      const dataSourceTree = page.locator('[data-testid="data-source-tree"]');
      await expect(dataSourceTree).toBeVisible();
      
      // 展开数据库节点
      const databaseNode = page.locator('[data-testid="database-node"]').first();
      await databaseNode.click();
      
      // 验证能看到表/测量值
      const measurementNodes = page.locator('[data-testid="measurement-node"]');
      await expect(measurementNodes.first()).toBeVisible({ timeout: 10000 });
      
      // 展开表节点查看字段
      await measurementNodes.first().click();
      
      // 验证能看到字段
      const fieldNodes = page.locator('[data-testid="field-node"]');
      await expect(fieldNodes.first()).toBeVisible({ timeout: 5000 });
    });
    
    test('应该能够浏览 IoTDB 存储组结构', async ({ page }) => {
      const dbConfig = TEST_DATABASES.find(db => db.dbType === 'iotdb');
      if (!dbConfig) return;
      
      // 选择 IoTDB 连接
      await page.click(`[data-testid="connection-${dbConfig.id}"]`);
      
      // 等待数据源树加载
      const dataSourceTree = page.locator('[data-testid="data-source-tree"]');
      await expect(dataSourceTree).toBeVisible();
      
      // 验证能看到存储组
      const storageGroupNodes = page.locator('[data-testid="storage-group-node"]');
      await expect(storageGroupNodes.first()).toBeVisible({ timeout: 10000 });
      
      // 展开存储组查看设备
      await storageGroupNodes.first().click();
      
      // 验证能看到设备
      const deviceNodes = page.locator('[data-testid="device-node"]');
      await expect(deviceNodes.first()).toBeVisible({ timeout: 5000 });
    });
  });
});
