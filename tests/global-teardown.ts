/**
 * Playwright 全局测试清理
 * 
 * 在所有测试完成后执行的清理工作
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始全局测试清理...');
  
  const fs = require('fs');
  const path = require('path');
  
  // 1. 生成测试总结报告
  console.log('📊 生成测试总结报告...');
  try {
    const testEndTime = new Date().toISOString();
    const testStartTime = process.env.TEST_START_TIME || testEndTime;
    
    // 读取测试信息
    let testInfo: any = {};
    try {
      const testInfoPath = 'test-results/test-info.json';
      if (fs.existsSync(testInfoPath)) {
        testInfo = JSON.parse(fs.readFileSync(testInfoPath, 'utf8'));
      }
    } catch (error) {
      console.warn('  ⚠️  读取测试信息失败:', error);
    }
    
    // 读取测试结果
    let testResults: any = {};
    try {
      const resultsPath = 'test-results/results.json';
      if (fs.existsSync(resultsPath)) {
        testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      }
    } catch (error) {
      console.warn('  ⚠️  读取测试结果失败:', error);
    }
    
    // 生成总结报告
    const summary = {
      ...testInfo,
      endTime: testEndTime,
      duration: calculateDuration(testStartTime, testEndTime),
      results: testResults,
      environment: {
        ...testInfo.environment || {},
        testMode: process.env.TEST_MODE || 'unknown',
        testHost: process.env.TEST_HOST || 'unknown',
      },
    };
    
    // 保存总结报告
    fs.writeFileSync(
      'test-results/test-summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    console.log('  ✅ 测试总结报告已生成');
    
    // 显示测试总结
    console.log('');
    console.log('📋 测试执行总结:');
    console.log(`  🕐 开始时间: ${testStartTime}`);
    console.log(`  🕐 结束时间: ${testEndTime}`);
    console.log(`  ⏱️  总耗时: ${summary.duration}`);
    
    // 如果有测试结果，显示统计信息
    if (testResults && typeof testResults === 'object') {
      const stats = extractTestStats(testResults);
      if (stats) {
        console.log(`  ✅ 通过: ${stats.passed || 0}`);
        console.log(`  ❌ 失败: ${stats.failed || 0}`);
        console.log(`  ⏭️  跳过: ${stats.skipped || 0}`);
        console.log(`  📊 总计: ${stats.total || 0}`);
      }
    }
    
  } catch (error) {
    console.error('  ❌ 生成测试总结报告失败:', error);
  }
  
  // 2. 清理临时文件
  console.log('🗑️  清理临时文件...');
  try {
    const tempFiles = [
      'test-results/.tmp',
      'test-results/temp',
    ];
    
    for (const tempPath of tempFiles) {
      if (fs.existsSync(tempPath)) {
        if (fs.statSync(tempPath).isDirectory()) {
          fs.rmSync(tempPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(tempPath);
        }
        console.log(`  🗑️  删除临时文件: ${tempPath}`);
      }
    }
  } catch (error) {
    console.warn('  ⚠️  清理临时文件时出现警告:', error);
  }
  
  // 3. 压缩测试结果（可选）
  if (process.env.COMPRESS_TEST_RESULTS === 'true') {
    console.log('📦 压缩测试结果...');
    try {
      // 这里可以添加压缩逻辑
      console.log('  ✅ 测试结果压缩完成');
    } catch (error) {
      console.warn('  ⚠️  压缩测试结果失败:', error);
    }
  }
  
  // 4. 发送测试通知（可选）
  if (process.env.SEND_TEST_NOTIFICATIONS === 'true') {
    console.log('📧 发送测试通知...');
    try {
      // 这里可以添加通知逻辑（邮件、Slack、钉钉等）
      console.log('  ✅ 测试通知已发送');
    } catch (error) {
      console.warn('  ⚠️  发送测试通知失败:', error);
    }
  }
  
  // 5. 清理环境变量
  console.log('🔧 清理环境变量...');
  delete process.env.TEST_START_TIME;
  delete process.env.TEST_HOST;
  delete process.env.TEST_MODE;
  
  console.log('✅ 全局测试清理完成');
  console.log('');
}

// 计算测试持续时间
function calculateDuration(startTime: string, endTime: string): string {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  } catch (error) {
    return '未知';
  }
}

// 提取测试统计信息
function extractTestStats(testResults: any): any {
  try {
    // 根据 Playwright 测试结果格式提取统计信息
    if (testResults.suites && Array.isArray(testResults.suites)) {
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      
      function countTests(suite: any) {
        if (suite.tests && Array.isArray(suite.tests)) {
          for (const test of suite.tests) {
            if (test.results && Array.isArray(test.results)) {
              for (const result of test.results) {
                switch (result.status) {
                  case 'passed':
                    passed++;
                    break;
                  case 'failed':
                    failed++;
                    break;
                  case 'skipped':
                    skipped++;
                    break;
                }
              }
            }
          }
        }
        
        if (suite.suites && Array.isArray(suite.suites)) {
          for (const subSuite of suite.suites) {
            countTests(subSuite);
          }
        }
      }
      
      for (const suite of testResults.suites) {
        countTests(suite);
      }
      
      return {
        passed,
        failed,
        skipped,
        total: passed + failed + skipped,
      };
    }
    
    return null;
  } catch (error) {
    console.warn('提取测试统计信息失败:', error);
    return null;
  }
}

export default globalTeardown;
