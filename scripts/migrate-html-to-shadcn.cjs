#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置迁移规则
const migrations = [
  // 标题标签替换
  {
    name: 'h1-h6标签',
    pattern: /<h([1-6])\s+className="([^"]*)"([^>]*)>(.*?)<\/h[1-6]>/g,
    replacement: '<Typography variant="h$1" className="$2"$3>$4</Typography>',
    addImport: 'Typography'
  },
  {
    name: 'h1-h6标签（无className）',
    pattern: /<h([1-6])([^>]*)>(.*?)<\/h[1-6]>/g,
    replacement: '<Typography variant="h$1"$2>$3</Typography>',
    addImport: 'Typography'
  },
  
  // 段落标签替换
  {
    name: 'p标签',
    pattern: /<p\s+className="([^"]*)"([^>]*)>(.*?)<\/p>/g,
    replacement: '<Typography.Text className="$1"$2>$3</Typography.Text>',
    addImport: 'Typography'
  },
  
  // 按钮标签替换
  {
    name: '原生button标签',
    pattern: /<button\s+className="([^"]*)"([^>]*)>(.*?)<\/button>/g,
    replacement: '<Button className="$1"$2>$3</Button>',
    addImport: 'Button'
  },
  
  // 标签替换
  {
    name: 'label标签',
    pattern: /<label\s+className="([^"]*)"([^>]*)>(.*?)<\/label>/g,
    replacement: '<Label className="$1"$2>$3</Label>',
    addImport: 'Label'
  },
  
  // span标签替换（带有样式类的）
  {
    name: 'span标签（文本类）',
    pattern: /<span\s+className="([^"]*font[^"]*)"([^>]*)>(.*?)<\/span>/g,
    replacement: '<Typography.Text className="$1"$2>$3</Typography.Text>',
    addImport: 'Typography'
  },
  
  // hr标签替换
  {
    name: 'hr标签',
    pattern: /<hr\s+className="([^"]*)"([^>]*)\s*\/?>/g,
    replacement: '<Separator className="$1"$2 />',
    addImport: 'Separator'
  },
  {
    name: 'hr标签（无className）',
    pattern: /<hr([^>]*)\s*\/?>/g,
    replacement: '<Separator$1 />',
    addImport: 'Separator'
  }
];

// 硬编码颜色替换规则
const colorMigrations = [
  { from: 'text-gray-500', to: 'text-muted-foreground' },
  { from: 'text-gray-600', to: 'text-muted-foreground' },
  { from: 'bg-gray-100', to: 'bg-muted' },
  { from: 'bg-gray-50', to: 'bg-muted/50' },
  { from: 'border-gray-200', to: 'border' },
  { from: 'text-blue-500', to: 'text-primary' },
  { from: 'text-blue-600', to: 'text-primary' },
  { from: 'bg-blue-500', to: 'bg-primary' },
  { from: 'text-red-500', to: 'text-destructive' },
  { from: 'bg-red-50', to: 'bg-destructive/10' },
  { from: 'border-red-200', to: 'border-destructive' },
  { from: 'text-green-500', to: 'text-success' },
  { from: 'text-green-600', to: 'text-success' }
];

class HTMLToShadcnMigrator {
  constructor() {
    this.srcDir = path.join(process.cwd(), 'src');
    this.stats = {
      filesProcessed: 0,
      totalReplacements: 0,
      migrationCounts: {}
    };
  }

  // 获取所有需要处理的文件
  getTargetFiles() {
    const patterns = [
      'src/**/*.tsx',
      'src/**/*.ts',
      '!src/**/*.test.tsx',
      '!src/**/*.test.ts',
      '!src/**/*.d.ts'
    ];
    
    let files = [];
    patterns.forEach(pattern => {
      if (pattern.startsWith('!')) {
        // 排除模式
        const excludeFiles = glob.sync(pattern.substring(1));
        files = files.filter(file => !excludeFiles.includes(file));
      } else {
        files = files.concat(glob.sync(pattern));
      }
    });
    
    return files;
  }

  // 检查文件是否已经导入了指定组件
  hasImport(content, componentName) {
    const importRegex = new RegExp(`import.*\\{[^}]*\\b${componentName}\\b[^}]*\\}.*from.*@/components/ui`, 'g');
    return importRegex.test(content);
  }

  // 添加导入语句
  addImport(content, componentName) {
    if (this.hasImport(content, componentName)) {
      return content;
    }

    // 查找现有的 @/components/ui 导入
    const existingImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@\/components\/ui['"];?/;
    const match = content.match(existingImportRegex);
    
    if (match) {
      // 更新现有导入
      const existingComponents = match[1].trim();
      const newImport = `import { ${existingComponents}, ${componentName} } from '@/components/ui';`;
      return content.replace(existingImportRegex, newImport);
    } else {
      // 添加新的导入语句
      const newImport = `import { ${componentName} } from '@/components/ui';\n`;
      // 在第一个import语句后插入
      const firstImportMatch = content.match(/^import.*$/m);
      if (firstImportMatch) {
        const insertPos = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
        return content.slice(0, insertPos) + '\n' + newImport + content.slice(insertPos + 1);
      } else {
        return newImport + content;
      }
    }
  }

  // 应用颜色迁移
  applyColorMigrations(content) {
    let updatedContent = content;
    let replacements = 0;

    colorMigrations.forEach(({ from, to }) => {
      const regex = new RegExp(`\\b${from}\\b`, 'g');
      const matches = updatedContent.match(regex);
      if (matches) {
        updatedContent = updatedContent.replace(regex, to);
        replacements += matches.length;
      }
    });

    return { content: updatedContent, replacements };
  }

  // 处理单个文件
  processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let hasChanges = false;
      let fileReplacements = 0;
      const importsToAdd = new Set();

      console.log(`处理文件: ${filePath}`);

      // 应用HTML标签迁移
      migrations.forEach(migration => {
        const beforeLength = content.length;
        content = content.replace(migration.pattern, (...args) => {
          hasChanges = true;
          fileReplacements++;
          if (migration.addImport) {
            importsToAdd.add(migration.addImport);
          }
          return migration.replacement.replace(/\$(\d+)/g, (match, num) => args[parseInt(num)]);
        });
        
        const replacementCount = Math.floor((beforeLength - content.length) / -10); // 粗略估算
        if (replacementCount > 0) {
          this.stats.migrationCounts[migration.name] = 
            (this.stats.migrationCounts[migration.name] || 0) + replacementCount;
        }
      });

      // 应用颜色迁移
      const colorResult = this.applyColorMigrations(content);
      if (colorResult.replacements > 0) {
        content = colorResult.content;
        hasChanges = true;
        fileReplacements += colorResult.replacements;
        this.stats.migrationCounts['颜色类名'] = 
          (this.stats.migrationCounts['颜色类名'] || 0) + colorResult.replacements;
      }

      // 添加必要的导入
      importsToAdd.forEach(componentName => {
        content = this.addImport(content, componentName);
      });

      if (hasChanges) {
        fs.writeFileSync(filePath, content);
        console.log(`  ✅ 已更新，${fileReplacements} 处替换`);
        this.stats.totalReplacements += fileReplacements;
      } else {
        console.log(`  ⏭️  无需更改`);
      }

    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
    }
  }

  // 运行迁移
  run() {
    console.log('🚀 开始 HTML 标签到 shadcn/ui 组件迁移...\n');
    
    const files = this.getTargetFiles();
    console.log(`📁 找到 ${files.length} 个待处理文件\n`);

    files.forEach(file => {
      this.processFile(file);
      this.stats.filesProcessed++;
    });

    this.printSummary();
  }

  // 打印统计信息
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 迁移完成统计');
    console.log('='.repeat(60));
    console.log(`处理文件数: ${this.stats.filesProcessed}`);
    console.log(`总替换次数: ${this.stats.totalReplacements}`);
    console.log('\n按类型分类:');
    
    Object.entries(this.stats.migrationCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} 次`);
    });

    if (this.stats.totalReplacements > 0) {
      console.log('\n✅ 迁移完成！建议运行以下命令测试:');
      console.log('   npm run dev');
      console.log('   npm run build');
      console.log('   npm run type-check');
    } else {
      console.log('\n✨ 所有文件都已是最新状态！');
    }
  }

  // 预览模式（不实际修改文件）
  preview() {
    console.log('👀 预览模式 - 不会修改任何文件\n');
    
    const files = this.getTargetFiles();
    let totalMatches = 0;
    const previewStats = {};

    files.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      let fileMatches = 0;

      migrations.forEach(migration => {
        const matches = content.match(migration.pattern);
        if (matches) {
          fileMatches += matches.length;
          previewStats[migration.name] = (previewStats[migration.name] || 0) + matches.length;
        }
      });

      // 检查颜色类名
      colorMigrations.forEach(({ from }) => {
        const regex = new RegExp(`\\b${from}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
          fileMatches += matches.length;
          previewStats['颜色类名'] = (previewStats['颜色类名'] || 0) + matches.length;
        }
      });

      if (fileMatches > 0) {
        console.log(`📄 ${filePath}: ${fileMatches} 处可替换`);
        totalMatches += fileMatches;
      }
    });

    console.log('\n📊 预览统计:');
    console.log(`总可替换项: ${totalMatches}`);
    Object.entries(previewStats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} 次`);
    });
  }
}

// 主程序
function main() {
  const args = process.argv.slice(2);
  const migrator = new HTMLToShadcnMigrator();

  if (args.includes('--preview') || args.includes('-p')) {
    migrator.preview();
  } else {
    migrator.run();
  }
}

if (require.main === module) {
  main();
}

module.exports = HTMLToShadcnMigrator;