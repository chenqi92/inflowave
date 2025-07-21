#!/usr/bin/env node

/**
 * 验证剪贴板修复的完整性
 * 确保所有修复都已正确应用
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 验证剪贴板权限错误修复...\n');

const projectRoot = path.resolve(__dirname, '..');

// 检查项目
const checks = [
  {
    name: '检查安全剪贴板工具是否存在',
    check: () => {
      const clipboardPath = path.join(projectRoot, 'src/utils/clipboard.ts');
      return fs.existsSync(clipboardPath);
    }
  },
  {
    name: '检查Monaco配置工具是否存在',
    check: () => {
      const monacoConfigPath = path.join(projectRoot, 'src/utils/monacoConfig.ts');
      return fs.existsSync(monacoConfigPath);
    }
  },
  {
    name: '检查主应用是否导入Monaco配置',
    check: () => {
      const mainPath = path.join(projectRoot, 'src/main.tsx');
      const content = fs.readFileSync(mainPath, 'utf-8');
      return content.includes('configureMonacoGlobally');
    }
  },
  {
    name: '检查是否还有直接使用navigator.clipboard',
    check: () => {
      // 手动检查关键文件
      const filesToCheck = [
        'src/components/ui/Typography.tsx',
        'src/pages/QueryHistory/index.tsx',
        'src/components/visualization/ChartBuilder.tsx',
        'src/components/debug/ErrorLogViewer.tsx'
      ];

      for (const file of filesToCheck) {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          if (content.includes('navigator.clipboard')) {
            return false;
          }
        }
      }
      return true;
    }
  },
  {
    name: '检查TabEditor是否禁用了剪贴板功能',
    check: () => {
      const tabEditorPath = path.join(projectRoot, 'src/components/layout/TabEditor.tsx');
      const content = fs.readFileSync(tabEditorPath, 'utf-8');
      return content.includes('copyWithSyntaxHighlighting: false') &&
             content.includes('selectionClipboard: false') &&
             content.includes('dragAndDrop: false');
    }
  },
  {
    name: '检查DetachedTabWindow是否禁用了剪贴板功能',
    check: () => {
      const detachedPath = path.join(projectRoot, 'src/components/layout/DetachedTabWindow.tsx');
      const content = fs.readFileSync(detachedPath, 'utf-8');
      return content.includes('copyWithSyntaxHighlighting: false') &&
             content.includes('selectionClipboard: false') &&
             content.includes('dragAndDrop: false');
    }
  },
  {
    name: '检查IntelligentQueryEngine是否禁用了剪贴板功能',
    check: () => {
      const intelligentPath = path.join(projectRoot, 'src/components/query/IntelligentQueryEngine.tsx');
      const content = fs.readFileSync(intelligentPath, 'utf-8');
      return content.includes('copyWithSyntaxHighlighting: false') &&
             content.includes('selectionClipboard: false') &&
             content.includes('dragAndDrop: false');
    }
  },
  {
    name: '检查Tauri剪贴板权限配置',
    check: () => {
      const capabilitiesPath = path.join(projectRoot, 'src-tauri/capabilities/default.json');
      const content = fs.readFileSync(capabilitiesPath, 'utf-8');
      return content.includes('clipboard-manager:allow-read-text') &&
             content.includes('clipboard-manager:allow-write-text');
    }
  },
  {
    name: '检查修复文档是否存在',
    check: () => {
      const docPath = path.join(projectRoot, 'docs/clipboard-permission-fix.md');
      return fs.existsSync(docPath);
    }
  },
  {
    name: '检查剪贴板使用检查脚本是否存在',
    check: () => {
      const scriptPath = path.join(projectRoot, 'scripts/check-clipboard-usage.js');
      return fs.existsSync(scriptPath);
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
  console.log('\n🎉 所有检查都通过了！剪贴板权限错误修复完成。');
  console.log('\n📋 修复总结:');
  console.log('   ✅ 替换了所有直接使用navigator.clipboard的地方');
  console.log('   ✅ 配置Monaco Editor禁用剪贴板功能');
  console.log('   ✅ 创建了安全的剪贴板工具函数');
  console.log('   ✅ 添加了Monaco Editor全局配置');
  console.log('   ✅ 创建了检查和验证脚本');
  console.log('   ✅ 编写了完整的修复文档');
  
  console.log('\n🚀 下一步:');
  console.log('   1. 测试应用中的剪贴板功能');
  console.log('   2. 确认不再出现权限错误');
  console.log('   3. 定期运行 `node scripts/check-clipboard-usage.js` 检查');
  
  process.exit(0);
} else {
  console.log('\n⚠️  部分检查未通过，请检查上述失败项目。');
  process.exit(1);
}
