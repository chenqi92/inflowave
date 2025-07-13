#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

// 修复常见的语法错误
function fixSyntaxErrors(content) {
  let fixed = content;

  // 修复双逗号问题
  fixed = fixed.replace(/,\s*,/g, ',');

  // 修复导入语句中的多余逗号
  fixed = fixed.replace(/import\s*{\s*([^}]*),\s*,\s*([^}]*)\s*}/g, 'import { $1, $2 }');
  fixed = fixed.replace(/import\s*{\s*([^}]*),\s*,\s*}/g, 'import { $1 }');
  fixed = fixed.replace(/import\s*{\s*,\s*([^}]*)\s*}/g, 'import { $1 }');

  // 修复对象中的多余逗号
  fixed = fixed.replace(/{\s*,/g, '{');
  fixed = fixed.replace(/,\s*}/g, '}');

  // 修复JSX中的语法错误
  fixed = fixed.replace(/className="[^"]*"\s*\.\w+/g, (match) => {
    return match.replace(/\.\w+/, '');
  });

  // 修复重复的className属性
  fixed = fixed.replace(/className="([^"]*)"([^>]*?)className="([^"]*)"/g, 'className="$1 $3"$2');

  // 修复JSX中的direction属性错误
  fixed = fixed.replace(/direction="[^"]*"\s+className=/g, 'className=');

  return fixed;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixSyntaxErrors(content);
    
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
  console.log('🔧 开始修复语法错误...\n');
  
  const files = await glob('src/**/*.{ts,tsx}');
  let fixedCount = 0;
  
  for (const file of files) {
    if (processFile(file)) {
      fixedCount++;
    }
  }
  
  console.log(`\n📊 修复完成:`);
  console.log(`   总文件数: ${files.length}`);
  console.log(`   已修复: ${fixedCount}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 语法错误修复完成！');
  } else {
    console.log('\n💡 没有发现需要修复的语法错误。');
  }
}

main().catch(console.error);
