#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

function finalCleanup(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. 统一所有 Form.Item 为 FormItem
    if (content.includes('<Form.Item')) {
      content = content.replace(/<Form\.Item(\s[^>]*)>/g, '<FormItem$1>');
      content = content.replace(/<Form\.Item>/g, '<FormItem>');
      modified = true;
    }
    
    if (content.includes('</Form.Item>')) {
      content = content.replace(/<\/Form\.Item>/g, '</FormItem>');
      modified = true;
    }
    
    // 2. 检查并修复不匹配的 form/Form 标签
    // 如果有 <Form 开始标签，确保结束标签是 </Form>
    const formStartMatches = content.match(/<Form\s/g);
    const formEndMatches = content.match(/<\/form>/g);
    
    if (formStartMatches && formEndMatches && formStartMatches.length === formEndMatches.length) {
      content = content.replace(/<\/form>/g, '</Form>');
      modified = true;
    }
    
    // 3. 移除重复的属性
    content = content.replace(/width=\{[^}]*\}\s*width=\{[^}]*\}/g, (match) => {
      const widthMatch = match.match(/width=\{[^}]*\}/);
      return widthMatch ? widthMatch[0] : match;
    });
    
    // 4. 清理空行
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 最终清理: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 清理失败 ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 开始最终清理...\n');
  
  // 处理所有 TSX 文件
  const files = glob.sync('src/**/*.tsx');
  let totalFiles = 0;
  let cleanedFiles = 0;
  
  files.forEach(file => {
    totalFiles++;
    if (finalCleanup(file)) {
      cleanedFiles++;
    }
  });
  
  console.log(`\n📊 最终清理完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已清理: ${cleanedFiles}`);
  console.log(`   跳过: ${totalFiles - cleanedFiles}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
