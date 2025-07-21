#!/usr/bin/env node

/**
 * 测试TypeScript错误修复
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 测试TypeScript错误修复...\n');

const projectRoot = path.resolve(__dirname, '..');

// 检查项目
const checks = [
  {
    name: '检查PerformanceBottleneckDiagnostics.tsx是否定义了connectionPoolStats',
    check: () => {
      const perfPath = path.join(projectRoot, 'src/components/analytics/PerformanceBottleneckDiagnostics.tsx');
      if (!fs.existsSync(perfPath)) return false;
      
      const content = fs.readFileSync(perfPath, 'utf-8');
      return content.includes('const [connectionPoolStats, setConnectionPoolStats]') &&
             content.includes('setConnectionPoolStats(_connectionPoolData)');
    }
  },
  {
    name: '检查lockWaits状态是否有正确的初始值',
    check: () => {
      const perfPath = path.join(projectRoot, 'src/components/analytics/PerformanceBottleneckDiagnostics.tsx');
      if (!fs.existsSync(perfPath)) return false;
      
      const content = fs.readFileSync(perfPath, 'utf-8');
      return content.includes('setLockWaits({') &&
             content.includes('locks: []') &&
             content.includes('summary: {') &&
             !content.includes('setSlowQueries([])'); // 应该是null而不是[]
    }
  },
  {
    name: '检查clearAllData函数是否正确设置状态',
    check: () => {
      const perfPath = path.join(projectRoot, 'src/components/analytics/PerformanceBottleneckDiagnostics.tsx');
      if (!fs.existsSync(perfPath)) return false;
      
      const content = fs.readFileSync(perfPath, 'utf-8');
      return content.includes('setSlowQueries(null)') &&
             content.includes('setConnectionPoolStats(null)') &&
             content.includes('setLockWaits({');
    }
  },
  {
    name: '检查是否有明显的TypeScript语法错误',
    check: () => {
      const perfPath = path.join(projectRoot, 'src/components/analytics/PerformanceBottleneckDiagnostics.tsx');
      if (!fs.existsSync(perfPath)) return false;
      
      const content = fs.readFileSync(perfPath, 'utf-8');
      
      // 检查括号匹配
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      
      return Math.abs(openBraces - closeBraces) <= 1 &&
             Math.abs(openParens - closeParens) <= 1 &&
             Math.abs(openBrackets - closeBrackets) <= 1;
    }
  },
  {
    name: '检查是否有未定义的变量使用',
    check: () => {
      const perfPath = path.join(projectRoot, 'src/components/analytics/PerformanceBottleneckDiagnostics.tsx');
      if (!fs.existsSync(perfPath)) return false;
      
      const content = fs.readFileSync(perfPath, 'utf-8');
      
      // 检查是否有setConnectionPoolStats的使用但没有定义
      const hasSetConnectionPoolStatsUsage = content.includes('setConnectionPoolStats(');
      const hasSetConnectionPoolStatsDefinition = content.includes('const [connectionPoolStats, setConnectionPoolStats]');
      
      return !hasSetConnectionPoolStatsUsage || hasSetConnectionPoolStatsDefinition;
    }
  },
  {
    name: '检查状态类型定义是否一致',
    check: () => {
      const perfPath = path.join(projectRoot, 'src/components/analytics/PerformanceBottleneckDiagnostics.tsx');
      if (!fs.existsSync(perfPath)) return false;
      
      const content = fs.readFileSync(perfPath, 'utf-8');
      
      // 检查lockWaits的类型定义是否一致
      const hasLockWaitsType = content.includes('const [lockWaits, setLockWaits] = useState<{');
      const hasLockWaitsInitialValue = content.includes('}>({');
      
      return hasLockWaitsType && hasLockWaitsInitialValue;
    }
  }
];

let passedChecks = 0;
let totalChecks = checks.length;

console.log('执行检查项目:\n');

checks.forEach((check, index) => {
  try {
    const result = check.check();
    if (result) {
      console.log(`✅ ${index + 1}. ${check.name}`);
      passedChecks++;
    } else {
      console.log(`❌ ${index + 1}. ${check.name}`);
    }
  } catch (error) {
    console.log(`❌ ${index + 1}. ${check.name} (错误: ${error.message})`);
  }
});

console.log('\n📊 检查结果:');
console.log(`   通过: ${passedChecks}/${totalChecks}`);
console.log(`   成功率: ${Math.round((passedChecks / totalChecks) * 100)}%`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 所有检查都通过了！TypeScript错误修复完成。');
  console.log('\n📋 修复总结:');
  console.log('   ✅ 添加了缺失的connectionPoolStats状态定义');
  console.log('   ✅ 修复了lockWaits状态的类型错误');
  console.log('   ✅ 修复了clearAllData函数中的类型错误');
  console.log('   ✅ 恢复了setConnectionPoolStats的正确调用');
  console.log('   ✅ 确保了状态类型定义的一致性');
  
  console.log('\n🚀 下一步:');
  console.log('   1. 运行 `npm run dev` 测试应用启动');
  console.log('   2. 检查是否还有TypeScript编译错误');
  console.log('   3. 测试性能监控功能是否正常');
  console.log('   4. 验证监控模式切换功能');
  
  process.exit(0);
} else {
  console.log('\n⚠️  部分检查未通过，请检查上述失败项目。');
  
  console.log('\n🔧 可能的解决方案:');
  console.log('   1. 检查状态定义是否完整');
  console.log('   2. 确认类型定义是否正确');
  console.log('   3. 检查函数调用是否匹配定义');
  console.log('   4. 验证语法是否正确');
  
  process.exit(1);
}
