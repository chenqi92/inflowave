#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

// 语法错误修复映射
const syntaxFixMappings = [
  // 修复错误的 onOpenChange 语法
  {
    pattern: /onOpenChange=\{([^}]*)\(\)\}\}/g,
    replacement: 'onOpenChange={$1}'
  },
  
  // 修复复杂的 onOpenChange 语法
  {
    pattern: /onOpenChange=\{\(open\) => !open && \(\(\) => \{([^}]*)\}\)/g,
    replacement: 'onOpenChange={(open) => { if (!open) { $1 } }}'
  },
  
  // 修复 FormField -> FormItem
  {
    pattern: /<FormField(\s[^>]*)>/g,
    replacement: '<FormItem$1>'
  },
  {
    pattern: /<\/FormField>/g,
    replacement: '</FormItem>'
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 修复语法错误
    for (const { pattern, replacement } of syntaxFixMappings) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已修复语法错误: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 修复失败 ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 开始修复语法错误...\n');
  
  const files = glob.sync('src/**/*.tsx');
  let totalFiles = 0;
  let fixedFiles = 0;
  
  files.forEach(file => {
    totalFiles++;
    if (fixFile(file)) {
      fixedFiles++;
    }
  });
  
  console.log(`\n📊 语法修复完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已修复: ${fixedFiles}`);
  console.log(`   跳过: ${totalFiles - fixedFiles}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
