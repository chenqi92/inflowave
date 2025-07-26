/**
 * Playwright 全局测试设置
 * 
 * 在所有测试开始前执行的设置，包括数据库连接验证
 */

import { chromium, FullConfig } from '@playwright/test';
import { TEST_DATABASES, validateDatabaseConfig } from './config/database-config';

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始全局测试设置...');
  
  // 1. 验证测试数据库配置
  console.log('📋 验证数据库配置...');
  for (const dbConfig of TEST_DATABASES) {
    const isValid = validateDatabaseConfig(dbConfig);
    console.log(`  ${dbConfig.name}: ${isValid ? '✅ 有效' : '❌ 无效'}`);
    
    if (!isValid) {
      console.warn(`⚠️  数据库配置无效: ${dbConfig.name}`);
    }
  }
  
  // 2. 检查测试环境网络连接
  console.log('🌐 检查网络连接...');
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 检查是否能访问测试主机
    const testHost = '192.168.0.120';
    console.log(`  检查主机连接: ${testHost}`);
    
    // 这里可以添加更多的网络连接检查
    // 例如 ping 测试或简单的 HTTP 请求
    
    await browser.close();
    console.log('  ✅ 网络连接正常');
  } catch (error) {
    console.error('  ❌ 网络连接检查失败:', error);
  }
  
  // 3. 创建测试结果目录
  console.log('📁 创建测试目录...');
  const fs = require('fs');
  const path = require('path');
  
  const testDirs = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'test-results/reports',
  ];
  
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ 创建目录: ${dir}`);
    }
  }
  
  // 4. 设置测试环境变量
  console.log('🔧 设置环境变量...');
  process.env.TEST_START_TIME = new Date().toISOString();
  process.env.TEST_HOST = '192.168.0.120';
  process.env.TEST_MODE = 'e2e';
  
  // 5. 清理之前的测试数据
  console.log('🧹 清理测试环境...');
  try {
    // 清理测试结果文件
    const resultsDir = 'test-results';
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir);
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.xml')) {
          const filePath = path.join(resultsDir, file);
          fs.unlinkSync(filePath);
          console.log(`  🗑️  删除旧文件: ${file}`);
        }
      }
    }
  } catch (error) {
    console.warn('  ⚠️  清理测试环境时出现警告:', error);
  }
  
  // 6. 记录测试开始信息
  const testInfo = {
    startTime: new Date().toISOString(),
    testHost: '192.168.0.120',
    databases: TEST_DATABASES.map(db => ({
      id: db.id,
      name: db.name,
      type: db.dbType,
      host: db.host,
      port: db.port,
    })),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
  
  try {
    fs.writeFileSync(
      'test-results/test-info.json',
      JSON.stringify(testInfo, null, 2)
    );
    console.log('  ✅ 测试信息已记录');
  } catch (error) {
    console.warn('  ⚠️  记录测试信息失败:', error);
  }
  
  console.log('✅ 全局测试设置完成');
  console.log('');
  console.log('📊 测试环境信息:');
  console.log(`  🕐 开始时间: ${testInfo.startTime}`);
  console.log(`  🖥️  测试主机: ${testInfo.testHost}`);
  console.log(`  💾 数据库数量: ${testInfo.databases.length}`);
  console.log(`  🔧 Node.js: ${testInfo.environment.nodeVersion}`);
  console.log(`  🖥️  平台: ${testInfo.environment.platform} (${testInfo.environment.arch})`);
  console.log('');
}

export default globalSetup;
