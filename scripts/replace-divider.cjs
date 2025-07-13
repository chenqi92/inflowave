const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{tsx,ts}');
let totalChanges = 0;

console.log('🔄 开始替换 Divider 为 Separator...\n');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // 替换导入语句中的 Divider
  content = content.replace(
    /import\s*{([^}]*)\bDivider\b([^}]*)\}\s*from\s*['"]@\/components\/ui['"];?/g,
    (match, before, after) => {
      // 分割组件列表
      const allComponents = (before + after).split(',').map(c => c.trim()).filter(c => c);
      // 移除 Divider，添加 Separator（如果还没有）
      const withoutDivider = allComponents.filter(c => c !== 'Divider');
      if (!withoutDivider.includes('Separator')) {
        withoutDivider.push('Separator');
      }
      return `import { ${withoutDivider.join(', ')} } from '@/components/ui';`;
    }
  );
  
  // 替换单独导入的Divider
  content = content.replace(
    /import\s*{\s*Divider\s*}\s*from\s*['"]@\/components\/ui['"];?/g,
    "import { Separator } from '@/components/ui';"
  );
  
  // 替换JSX使用
  content = content.replace(/<Divider\s*\/>/g, '<Separator />');
  content = content.replace(/<Divider(\s[^>]*)>/g, '<Separator$1>');
  content = content.replace(/<\/Divider>/g, '</Separator>');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalChanges++;
    console.log(`✅ Updated: ${file}`);
  }
});

console.log(`\n🎉 替换完成！总共更新了 ${totalChanges} 个文件`);

if (totalChanges > 0) {
  console.log('\n📋 下一步：');
  console.log('1. 删除 Divider 组件文件');
  console.log('2. 从 index.ts 中移除 Divider 导出');
  console.log('3. 运行 npm run build 测试');
}