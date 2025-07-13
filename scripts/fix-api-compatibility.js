#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// API 兼容性修复映射
const apiFixMappings = [
  // Progress 组件
  {
    pattern: /<Progress\s+value=\{([^}]+)\}/g,
    replacement: '<Progress percent={$1}'
  },
  
  // Select onChange 修复
  {
    pattern: /onValueChange=\{([^}]+)\}/g,
    replacement: 'onChange={$1}'
  },
  
  // Button loading 属性
  {
    pattern: /loading=\{([^}]+)\}/g,
    replacement: 'disabled={$1}'
  },
  
  // Table pagination 修复
  {
    pattern: /pagination=\{\s*\{\s*current:\s*([^,]+),\s*pageSize:\s*([^,]+),\s*total:\s*([^,]+),\s*onChange:\s*([^}]+)\s*\}\s*\}/g,
    replacement: 'pagination={{ page: $1, pageSize: $2, total: $3, onPageChange: $4 }}'
  },
  
  // Modal visible -> open
  {
    pattern: /visible=\{([^}]+)\}/g,
    replacement: 'open={$1}'
  },
  
  // Modal onCancel -> onOpenChange (简化版本)
  {
    pattern: /onCancel=\{([^}]+)\}/g,
    replacement: 'onOpenChange={$1}'
  },

  // 修复错误的 onOpenChange 语法
  {
    pattern: /onOpenChange=\{([^}]+)\(\)\}\}/g,
    replacement: 'onOpenChange={$1}'
  },
  
  // Form.Item 完整替换
  {
    pattern: /<Form\.Item(\s[^>]*)>/g,
    replacement: '<FormItem$1>'
  },
  {
    pattern: /<\/Form\.Item>/g,
    replacement: '</FormItem>'
  },
  
  // Input.TextArea -> Textarea
  {
    pattern: /<Input\.TextArea/g,
    replacement: '<Textarea'
  },
  {
    pattern: /Input\.TextArea/g,
    replacement: 'Textarea'
  },
  
  // Switch checked -> value
  {
    pattern: /checked=\{([^}]+)\}/g,
    replacement: 'checked={$1}'
  },
  
  // DatePicker onChange 参数修复
  {
    pattern: /onChange=\{([^}]+)\}/g,
    replacement: 'onValueChange={$1}'
  }
];

// 导入修复映射
const importFixMappings = [
  // 移除未使用的 antd 导入
  {
    pattern: /import\s+\{[^}]*\}\s+from\s+['"]antd['"];?\s*\n/g,
    replacement: ''
  },
  {
    pattern: /import\s+\{[^}]*\}\s+from\s+['"]@ant-design\/icons['"];?\s*\n/g,
    replacement: ''
  },
  
  // 修复组件导入
  {
    pattern: /import\s+\{\s*([^}]*Row[^}]*)\s*\}\s+from\s+['"]antd['"];?/g,
    replacement: 'import { $1 } from "@/components/ui";'
  },
  {
    pattern: /import\s+\{\s*([^}]*Col[^}]*)\s*\}\s+from\s+['"]antd['"];?/g,
    replacement: 'import { $1 } from "@/components/ui";'
  },
  {
    pattern: /import\s+\{\s*([^}]*Progress[^}]*)\s*\}\s+from\s+['"]antd['"];?/g,
    replacement: 'import { $1 } from "@/components/ui";'
  },
  {
    pattern: /import\s+\{\s*([^}]*Select[^}]*)\s*\}\s+from\s+['"]antd['"];?/g,
    replacement: 'import { $1 } from "@/components/ui";'
  },
  {
    pattern: /import\s+\{\s*([^}]*Empty[^}]*)\s*\}\s+from\s+['"]antd['"];?/g,
    replacement: 'import { $1 } from "@/components/ui";'
  },
  {
    pattern: /import\s+\{\s*([^}]*List[^}]*)\s*\}\s+from\s+['"]antd['"];?/g,
    replacement: 'import { $1 } from "@/components/ui";'
  },
  {
    pattern: /import\s+\{\s*([^}]*Statistic[^}]*)\s*\}\s+from\s+['"]antd['"];?/g,
    replacement: 'import { $1 } from "@/components/ui";'
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 修复导入
    for (const { pattern, replacement } of importFixMappings) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    // 修复 API
    for (const { pattern, replacement } of apiFixMappings) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    // 清理空行
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
  console.log('🚀 开始修复 API 兼容性问题...\n');
  
  // 查找所有 TypeScript 和 TSX 文件
  const patterns = [
    'src/**/*.tsx',
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!node_modules/**'
  ];
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  patterns.forEach(pattern => {
    if (pattern.startsWith('!')) return;
    
    const files = glob.sync(pattern);
    files.forEach(file => {
      // 检查是否被排除
      const isExcluded = patterns.some(p =>
        p.startsWith('!') && file.match(p.substring(1).replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
      );
      
      if (!isExcluded) {
        totalFiles++;
        if (fixFile(file)) {
          fixedFiles++;
        }
      }
    });
  });
  
  console.log(`\n📊 修复完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已修复: ${fixedFiles}`);
  console.log(`   跳过: ${totalFiles - fixedFiles}`);
}

// 检查是否为主模块
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fixFile, apiFixMappings, importFixMappings };
