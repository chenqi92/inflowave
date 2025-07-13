#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. 修复错误的 onOpenChange 语法
    const onOpenChangePattern = /onOpenChange=\{\(open\) => !open && \(\(\) => \{([^}]*)\}\)/g;
    if (onOpenChangePattern.test(content)) {
      content = content.replace(onOpenChangePattern, (match, body) => {
        return `onOpenChange={(open) => { if (!open) { ${body.trim()} } }}`;
      });
      modified = true;
    }
    
    // 2. 移除 Modal 的 onOk, okText, cancelText 属性
    const modalPropsToRemove = [
      /onOk=\{[^}]*\}\s*/g,
      /okText="[^"]*"\s*/g,
      /cancelText="[^"]*"\s*/g
    ];
    
    modalPropsToRemove.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, '');
        modified = true;
      }
    });
    
    // 3. 修复 FormField -> FormItem
    if (content.includes('<FormField')) {
      content = content.replace(/<FormField(\s[^>]*)>/g, '<FormItem$1>');
      content = content.replace(/<\/FormField>/g, '</FormItem>');
      modified = true;
    }
    
    // 4. 修复 Form 组件 - 保持 Form 标签不变
    // 不修改 Form 组件，因为它们应该保持为 shadcn Form 组件
    
    // 5. 修复 TextArea -> Textarea
    if (content.includes('TextArea')) {
      content = content.replace(/TextArea/g, 'Textarea');
      modified = true;
    }
    
    // 6. 修复 Form.Item -> FormItem 的开始和结束标签
    if (content.includes('<Form.Item')) {
      content = content.replace(/<Form\.Item(\s[^>]*)>/g, '<FormItem$1>');
      modified = true;
    }
    if (content.includes('</Form.Item>')) {
      content = content.replace(/<\/Form\.Item>/g, '</FormItem>');
      modified = true;
    }

    // 7. 修复错误的结束标签 - 不要修改，保持 Form 组件原样

    // 8. 清理多余的空格
    content = content.replace(/\s+>/g, '>');
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已修复: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 修复失败 ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 开始批量修复错误...\n');
  
  // 重点修复有问题的文件
  const problematicFiles = [
    'src/components/dashboard/DashboardManager.tsx',
    'src/components/database/DatabaseManager.tsx',
    'src/components/monitoring/RealTimeMonitor.tsx',
    'src/components/settings/UserExperienceSettings.tsx',
    'src/components/settings/UserPreferences.tsx',
    'src/components/visualization/DashboardDesigner.tsx',
    'src/components/common/DataExportDialog.tsx',
    'src/components/common/DataWriteDialog.tsx',
    'src/components/ConnectionManager/ConnectionDialog.tsx',
    'src/components/dashboard/DashboardDesigner.tsx',
    'src/components/extensions/ExtensionManager.tsx',
    'src/components/query/QueryHistoryPanel.tsx',
    'src/components/query/SavedQueries.tsx',
    'src/components/visualization/ChartBuilder.tsx',
    'src/components/visualization/DashboardBuilder.tsx',
    'src/components/ConnectionTest.tsx',
    'src/pages/DataWrite/index.tsx',
    'src/pages/UITest.tsx'
  ];
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  problematicFiles.forEach(file => {
    if (fs.existsSync(file)) {
      totalFiles++;
      if (fixFile(file)) {
        fixedFiles++;
      }
    }
  });
  
  console.log(`\n📊 批量修复完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已修复: ${fixedFiles}`);
  console.log(`   跳过: ${totalFiles - fixedFiles}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
