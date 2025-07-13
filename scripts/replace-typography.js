#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Typography 替换规则
const typographyReplacements = [
  {
    // 替换 Typography 导入
    pattern: /import\s*{\s*Typography\s*}\s*from\s*['"]antd['"];?/g,
    replacement: "import { Typography } from '@/components/ui';"
  },
  {
    // 替换包含 Typography 的混合导入
    pattern: /import\s*{\s*([^}]*Typography[^}]*)\s*}\s*from\s*['"]antd['"];?/g,
    replacement: (match, imports) => {
      const components = imports.split(',').map(c => c.trim()).filter(c => c);
      const supportedComponents = [
        'Typography', 'Button', 'Card', 'Input', 'Table', 'Modal',
        'Form', 'Select', 'Space', 'Alert', 'Spin', 'Tag', 'Empty', 'Layout',
        'Row', 'Col', 'Statistic', 'Tabs', 'Dropdown', 'Switch', 'Checkbox',
        'Radio', 'DatePicker', 'TimePicker', 'Upload', 'Progress', 'Steps',
        'Breadcrumb', 'Menu', 'Pagination', 'Rate', 'Slider', 'Transfer',
        'Tree', 'TreeSelect', 'Cascader', 'AutoComplete', 'Mentions',
        'InputNumber', 'ColorPicker', 'Segmented', 'Divider'
      ];
      
      const supported = components.filter(c => supportedComponents.includes(c));
      const unsupported = components.filter(c => !supportedComponents.includes(c));
      
      let result = '';
      if (supported.length > 0) {
        result += `import { ${supported.join(', ')} } from '@/components/ui';`;
      }
      
      if (unsupported.length > 0) {
        if (result) result += '\n';
        result += `// TODO: Replace these Ant Design components: ${unsupported.join(', ')}`;
      }
      
      return result;
    }
  },
  {
    // 替换 Typography 解构赋值
    pattern: /const\s*{\s*([^}]*)\s*}\s*=\s*Typography;?/g,
    replacement: (match, destructured) => {
      const components = destructured.split(',').map(c => c.trim()).filter(c => c);
      const supportedComponents = ['Title', 'Text', 'Paragraph'];
      const unsupportedComponents = ['Link']; // Link 不在我们的实现中
      
      const supported = components.filter(c => supportedComponents.includes(c));
      const unsupported = components.filter(c => unsupportedComponents.includes(c));
      
      let result = '';
      if (supported.length > 0) {
        result += `const { ${supported.join(', ')} } = Typography;`;
      }
      
      if (unsupported.length > 0) {
        if (result) result += '\n';
        result += `// TODO: Replace these Typography components: ${unsupported.join(', ')}`;
        result += '\n// Consider using <a> tag or custom Link component instead';
      }
      
      return result;
    }
  },
  {
    // 替换 Typography.Title 使用
    pattern: /Typography\.Title/g,
    replacement: 'Typography.Title'
  },
  {
    // 替换 Typography.Text 使用
    pattern: /Typography\.Text/g,
    replacement: 'Typography.Text'
  },
  {
    // 替换 Typography.Paragraph 使用
    pattern: /Typography\.Paragraph/g,
    replacement: 'Typography.Paragraph'
  },
  {
    // 替换 Divider 组件使用 - 保持原有组件
    pattern: /<Divider\s*\/>/g,
    replacement: '<Divider />'
  },
  {
    // 替换带属性的 Divider 组件
    pattern: /<Divider([^>]*?)>/g,
    replacement: '<Divider$1>'
  },
  {
    // 替换 Link 组件为 a 标签
    pattern: /<Link\s+href="([^"]*)"([^>]*?)>(.*?)<\/Link>/g,
    replacement: '<a href="$1" className="text-blue-600 hover:text-blue-800 underline"$2>$3</a>'
  },
  {
    // 替换自闭合的 Link 组件
    pattern: /<Link\s+href="([^"]*)"([^>]*?)\/>/g,
    replacement: '<a href="$1" className="text-blue-600 hover:text-blue-800 underline"$2 />'
  }
];

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 应用所有替换规则
    typographyReplacements.forEach(rule => {
      const newContent = content.replace(rule.pattern, rule.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已处理: ${filePath}`);
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
  console.log('🚀 开始批量替换 Typography 组件...\n');
  
  // 需要处理的特定文件
  const targetFiles = [
    'src/components/test/TypographyTest.tsx',
    'src/components/common/TypographyDemo.tsx',
    'src/components/settings/UserPreferences.tsx',
    'src/components/query/QueryResults.tsx'
  ];
  
  let totalFiles = 0;
  let processedFiles = 0;
  
  targetFiles.forEach(file => {
    if (fs.existsSync(file)) {
      totalFiles++;
      if (processFile(file)) {
        processedFiles++;
      }
    } else {
      console.log(`⚠️  文件不存在: ${file}`);
    }
  });
  
  // 也可以搜索所有可能包含 Typography 的文件
  console.log('\n🔍 搜索其他可能包含 Typography 的文件...');
  
  const patterns = [
    'src/**/*.tsx',
    'src/**/*.ts',
    '!src/components/ui/**', // 排除ui组件目录'!node_modules/**'
  ];
  
  const allFiles = [];
  patterns.forEach(pattern => {
    if (!pattern.startsWith('!')) {
      const files = glob.sync(pattern);
      allFiles.push(...files);
    }
  });
  
  // 过滤掉已经处理过的文件和排除的文件
  const additionalFiles = allFiles.filter(file => {
    if (targetFiles.includes(file)) return false;
    
    // 检查是否被排除
    const isExcluded = patterns.some(p =>
      p.startsWith('!') && file.match(p.substring(1).replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
    );
    
    if (isExcluded) return false;
    
    // 检查文件是否包含 Typography
    try {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes('Typography') && content.includes('antd');
    } catch {
      return false;
    }
  });
  
  additionalFiles.forEach(file => {
    totalFiles++;
    if (processFile(file)) {
      processedFiles++;
    }
  });
  
  console.log(`\n📊 处理完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已处理: ${processedFiles}`);
  console.log(`   未修改: ${totalFiles - processedFiles}`);
  
  if (processedFiles > 0) {
    console.log('\n✨ Typography 组件替换完成！');
    console.log('\n📝 请注意：');
    console.log('   1. Link 组件已替换为 <a> 标签，请检查样式是否正确');
    console.log('   2. Divider 组件已替换为简单的分割线，可能需要调整样式');
    console.log('   3. 请测试所有修改的页面确保功能正常');
  } else {
    console.log('\n✅ 没有找到需要替换的 Typography 组件');
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processFile, typographyReplacements };
