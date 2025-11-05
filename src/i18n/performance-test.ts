/**
 * 国际化系统性能测试脚本
 * 
 * 用于验证性能指标是否符合要求
 */

import { useI18nStore } from './store';
import { performanceMonitor } from './performance-monitor';

interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  actualTime: number;
  targetTime: number;
  details?: string;
}

/**
 * 运行性能测试套件
 */
export async function runPerformanceTests(): Promise<PerformanceTestResult[]> {
  const results: PerformanceTestResult[] = [];
  
  console.log('🚀 开始国际化性能测试...\n');
  
  // 测试 1: 语言切换性能
  results.push(await testLanguageSwitchPerformance());
  
  // 测试 2: 翻译函数性能
  results.push(await testTranslationPerformance());
  
  // 测试 3: 格式化函数性能
  results.push(await testFormattingPerformance());
  
  // 测试 4: 批量翻译性能
  results.push(await testBatchTranslationPerformance());
  
  // 测试 5: 内存使用
  results.push(await testMemoryUsage());
  
  // 输出结果
  printResults(results);
  
  return results;
}

/**
 * 测试语言切换性能
 */
async function testLanguageSwitchPerformance(): Promise<PerformanceTestResult> {
  const store = useI18nStore.getState();
  const targetTime = 500; // 500ms
  
  const startTime = performance.now();
  
  try {
    await store.setLanguage('en-US');
    await store.setLanguage('zh-CN');
    
    const actualTime = performance.now() - startTime;
    
    return {
      testName: '语言切换性能',
      passed: actualTime < targetTime,
      actualTime: Math.round(actualTime),
      targetTime,
      details: `切换时间: ${Math.round(actualTime)}ms (目标: < ${targetTime}ms)`,
    };
  } catch (error) {
    return {
      testName: '语言切换性能',
      passed: false,
      actualTime: -1,
      targetTime,
      details: `错误: ${error}`,
    };
  }
}

/**
 * 测试翻译函数性能
 */
async function testTranslationPerformance(): Promise<PerformanceTestResult> {
  const store = useI18nStore.getState();
  const targetTime = 1; // 1ms per translation
  const iterations = 1000;
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    store.t('common.ok');
    store.t('common.cancel');
    store.t('common.save');
  }
  
  const totalTime = performance.now() - startTime;
  const avgTime = totalTime / (iterations * 3);
  
  return {
    testName: '翻译函数性能',
    passed: avgTime < targetTime,
    actualTime: Number(avgTime.toFixed(3)),
    targetTime,
    details: `平均翻译时间: ${avgTime.toFixed(3)}ms (目标: < ${targetTime}ms)`,
  };
}

/**
 * 测试格式化函数性能
 */
async function testFormattingPerformance(): Promise<PerformanceTestResult> {
  const store = useI18nStore.getState();
  const targetTime = 5; // 5ms per format
  const iterations = 100;
  
  const date = new Date();
  const number = 1234567.89;
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    store.formatDate(date);
    store.formatNumber(number);
    store.formatRelativeTime(date);
  }
  
  const totalTime = performance.now() - startTime;
  const avgTime = totalTime / (iterations * 3);
  
  return {
    testName: '格式化函数性能',
    passed: avgTime < targetTime,
    actualTime: Number(avgTime.toFixed(3)),
    targetTime,
    details: `平均格式化时间: ${avgTime.toFixed(3)}ms (目标: < ${targetTime}ms)`,
  };
}

/**
 * 测试批量翻译性能
 */
async function testBatchTranslationPerformance(): Promise<PerformanceTestResult> {
  const store = useI18nStore.getState();
  const targetTime = 10; // 10ms for 100 translations
  const batchSize = 100;
  
  const keys = [
    'common.ok',
    'common.cancel',
    'common.save',
    'common.delete',
    'common.edit',
    'common.loading',
    'common.error',
    'common.success',
    'common.warning',
    'common.info',
  ];
  
  const startTime = performance.now();
  
  for (let i = 0; i < batchSize; i++) {
    const key = keys[i % keys.length];
    store.t(key);
  }
  
  const actualTime = performance.now() - startTime;
  
  return {
    testName: '批量翻译性能',
    passed: actualTime < targetTime,
    actualTime: Math.round(actualTime * 100) / 100,
    targetTime,
    details: `批量翻译时间: ${actualTime.toFixed(2)}ms (目标: < ${targetTime}ms)`,
  };
}

/**
 * 测试内存使用
 */
async function testMemoryUsage(): Promise<PerformanceTestResult> {
  const targetMemory = 50; // 50MB
  
  // 注意：这个测试在浏览器环境中可能不准确
  // 仅作为参考
  
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
    
    return {
      testName: '内存使用',
      passed: usedMemoryMB < targetMemory,
      actualTime: Math.round(usedMemoryMB),
      targetTime: targetMemory,
      details: `当前内存使用: ${usedMemoryMB.toFixed(2)}MB (目标: < ${targetMemory}MB)`,
    };
  }
  
  return {
    testName: '内存使用',
    passed: true,
    actualTime: 0,
    targetTime: targetMemory,
    details: '内存监控不可用（非 Chrome 浏览器）',
  };
}

/**
 * 打印测试结果
 */
function printResults(results: PerformanceTestResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 性能测试结果');
  console.log('='.repeat(60) + '\n');
  
  let passedCount = 0;
  let failedCount = 0;
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ 通过' : '❌ 失败';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${index + 1}. ${result.testName}`);
    console.log(`   状态: ${color}${status}${reset}`);
    console.log(`   ${result.details}`);
    console.log('');
    
    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log('='.repeat(60));
  console.log(`总计: ${results.length} 个测试`);
  console.log(`✅ 通过: ${passedCount}`);
  console.log(`❌ 失败: ${failedCount}`);
  console.log('='.repeat(60) + '\n');
  
  // 获取性能监控统计
  const stats = performanceMonitor.getMetrics();
  console.log('📈 性能监控统计:');
  console.log(`   总切换次数: ${stats.totalSwitches}`);
  console.log(`   平均切换时间: ${stats.averageSwitchTime.toFixed(2)}ms`);
  console.log(`   总加载次数: ${stats.totalLoads}`);
  console.log(`   平均加载时间: ${stats.averageLoadTime.toFixed(2)}ms`);
  console.log(`   缓存命中率: ${(stats.cacheHitRate * 100).toFixed(2)}%`);
  console.log(`   预加载成功率: ${(stats.preloadSuccessRate * 100).toFixed(2)}%`);
  console.log('');
}

/**
 * 快速性能检查
 */
export async function quickPerformanceCheck(): Promise<boolean> {
  console.log('⚡ 快速性能检查...\n');
  
  const store = useI18nStore.getState();
  
  // 测试语言切换
  const startTime = performance.now();
  await store.setLanguage('en-US');
  const switchTime = performance.now() - startTime;
  
  const passed = switchTime < 500;
  
  if (passed) {
    console.log(`✅ 性能检查通过 (${switchTime.toFixed(2)}ms < 500ms)`);
  } else {
    console.log(`❌ 性能检查失败 (${switchTime.toFixed(2)}ms >= 500ms)`);
  }
  
  // 恢复原语言
  await store.setLanguage('zh-CN');
  
  return passed;
}

// 导出到全局（开发模式）
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__I18N_PERF_TEST__ = {
    runPerformanceTests,
    quickPerformanceCheck,
  };
  
  console.log('💡 性能测试工具已加载:');
  console.log('   - __I18N_PERF_TEST__.runPerformanceTests()');
  console.log('   - __I18N_PERF_TEST__.quickPerformanceCheck()');
}
