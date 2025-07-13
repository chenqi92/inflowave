#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 修复 Divider 导入的函数
function fixDividerImports(content) {
  let fixed = content;
  
  // 如果文件使用了 <Divider 但没有导入 Divider
  if (fixed.includes('<Divider') && !fixed.includes('Divider') && fixed.includes('@/components/ui')) {
    // 查找现有的 @/components/ui 导入
    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/components\/ui['"];?/g;
    const matches = [...fixed.matchAll(importRegex)];
    
    if (matches.length > 0) {
      // 在第一个 @/components/ui 导入中添加 Divider
      const firstMatch = matches[0];
      const imports = firstMatch[1].split(',').map(imp => imp.trim()).filter(imp => imp);
      
      if (!imports.includes('Divider')) {
        imports.push('Divider');
        const newImport = `import { ${imports.join(', ')} } from '@/components/ui';`;
        fixed = fixed.replace(firstMatch[0], newImport);
      }
    }
  }
  
  // 移除 TODO 注释中的 Divider
  fixed = fixed.replace(/\/\/ TODO: Replace these Ant Design components: Divider\n?/g, '');
  fixed = fixed.replace(/\/\/ TODO: Replace these Ant Design components: ([^,\n]+), Divider/g, '// TODO: Replace these Ant Design components: $1');
  fixed = fixed.replace(/\/\/ TODO: Replace these Ant Design components: Divider, ([^\n]+)/g, '// TODO: Replace these Ant Design components: $1');
  
  // 替换之前的 div 分割线为 Divider 组件
  fixed = fixed.replace(/<div className="border-t border-gray-200 my-4" \/>/g, '<Divider />');
  
  return fixed;
}

// 处理单个文件
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixDividerImports(content);
    
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
  console.log('🚀 开始修复 Divider 导入...\n');
  
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
    
    // 检查文件是否需要修复
    try {
      const content = fs.readFileSync(file, 'utf8');
      return (content.includes('<Divider') || content.includes('TODO: Replace these Ant Design components: Divider')) 
             && content.includes('@/components/ui');
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
    console.log('\n✨ Divider 导入修复完成！');
  } else {
    console.log('\n✅ 没有找到需要修复的文件');
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processFile, fixDividerImports };
