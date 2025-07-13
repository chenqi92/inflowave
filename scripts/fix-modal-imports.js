#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

// 修复Modal导入问题
function fixModalImports(content) {
  let fixed = content;
  
  // 替换Modal导入为Dialog导入
  fixed = fixed.replace(
    /import\s*{\s*([^}]*?)Modal([^}]*?)\s*}\s*from\s*['"]@\/components\/ui['"];?/g,
    (match, before, after) => {
      // 移除Modal，添加Dialog相关组件
      let imports = (before + after).split(',').map(imp => imp.trim()).filter(imp => imp && imp !== 'Modal');
      
      // 添加Dialog相关组件
      const dialogImports = ['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle'];
      dialogImports.forEach(imp => {
        if (!imports.includes(imp)) {
          imports.push(imp);
        }
      });
      
      return `import { ${imports.join(', ')} } from '@/components/ui';`;
    }
  );
  
  return fixed;
}

async function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixModalImports(content);
    
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

async function main() {
  console.log('🔧 开始修复Modal导入...\n');
  
  const files = await glob('src/**/*.{ts,tsx}');
  let fixedCount = 0;
  
  for (const file of files) {
    if (await processFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n📊 修复完成:`);
  console.log(`   总文件数: ${files.length}`);
  console.log(`   已修复: ${fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Modal导入修复完成！');
  } else {
    console.log('\n💡 没有发现需要修复的Modal导入。');
  }
}

main().catch(console.error);
