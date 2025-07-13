#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 修复 Link 组件的函数
function fixLinkComponents(content) {
  let fixed = content;
  
  // 替换 Link 组件为 a 标签，处理各种属性
  fixed = fixed.replace(
    /<Link\s+href="([^"]*)"([^>]*?)>(.*?)<\/Link>/gs,
    (match, href, attributes, children) => {
      // 解析属性
      let className = 'text-blue-600 hover:text-blue-800 underline';
      let otherAttrs = attributes;
      
      // 检查是否有 strong 属性
      if (attributes.includes('strong')) {
        className += ' font-semibold';
        otherAttrs = otherAttrs.replace(/\s*strong\s*/g, '');
      }
      
      // 检查是否有 disabled 属性
      if (attributes.includes('disabled')) {
        className = 'text-gray-400 cursor-not-allowed';
        otherAttrs = otherAttrs.replace(/\s*disabled\s*/g, '');
      }
      
      // 检查是否有 underline 属性
      if (attributes.includes('underline')) {
        // underline 已经在默认样式中
        otherAttrs = otherAttrs.replace(/\s*underline\s*/g, '');
      }
      
      // 清理属性
      otherAttrs = otherAttrs.trim();
      
      return `<a href="${href}" className="${className}"${otherAttrs ? ' ' + otherAttrs : ''}>${children}</a>`;
    }
  );
  
  // 替换自闭合的 Link 组件
  fixed = fixed.replace(
    /<Link\s+href="([^"]*)"([^>]*?)\/>/g,
    (match, href, attributes) => {
      let className = 'text-blue-600 hover:text-blue-800 underline';
      let otherAttrs = attributes;
      
      if (attributes.includes('strong')) {
        className += ' font-semibold';
        otherAttrs = otherAttrs.replace(/\s*strong\s*/g, '');
      }
      
      if (attributes.includes('disabled')) {
        className = 'text-gray-400 cursor-not-allowed';
        otherAttrs = otherAttrs.replace(/\s*disabled\s*/g, '');
      }
      
      if (attributes.includes('underline')) {
        otherAttrs = otherAttrs.replace(/\s*underline\s*/g, '');
      }
      
      otherAttrs = otherAttrs.trim();
      
      return `<a href="${href}" className="${className}"${otherAttrs ? ' ' + otherAttrs : ''} />`;
    }
  );
  
  return fixed;
}

// 处理单个文件
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixLinkComponents(content);
    
    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ 修复: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 开始修复 Link 组件...\n');
  
  // 查找所有可能需要修复的文件
  const patterns = [
    'src/**/*.tsx',
    'src/**/*.ts',
    '!src/components/ui/**', // 排除ui组件目录'!node_modules/**'
  ];
  
  let totalFiles = 0;
  let processedFiles = 0;
  
  const allFiles = [];
  patterns.forEach(pattern => {
    if (!pattern.startsWith('!')) {
      const files = glob.sync(pattern);
      allFiles.push(...files);
    }
  });
  
  // 过滤需要处理的文件
  const filesToProcess = allFiles.filter(file => {
    // 检查是否被排除
    const isExcluded = patterns.some(p =>
      p.startsWith('!') && file.match(p.substring(1).replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
    );
    
    if (isExcluded) return false;
    
    // 检查文件是否包含 Link 组件
    try {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes('<Link ') && !content.includes('react-router-dom');
    } catch {
      return false;
    }
  });
  
  filesToProcess.forEach(file => {
    totalFiles++;
    if (processFile(file)) {
      processedFiles++;
    }
  });
  
  console.log(`\n📊 处理完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已修复: ${processedFiles}`);
  console.log(`   未修改: ${totalFiles - processedFiles}`);
  
  if (processedFiles > 0) {
    console.log('\n✨ Link 组件修复完成！');
    console.log('\n📝 请注意：');
    console.log('   1. Link 组件已替换为 <a> 标签');
    console.log('   2. 样式已自动应用，请检查是否符合预期');
    console.log('   3. disabled 链接已设置为灰色且不可点击');
  } else {
    console.log('\n✅ 没有找到需要修复的 Link 组件');
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processFile, fixLinkComponents };
