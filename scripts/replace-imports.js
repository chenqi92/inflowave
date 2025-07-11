#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要替换的导入映射
const importReplacements = {
  "import { message } from 'antd';": "import { message } from '@/components/ui';",
  "import { Typography } from 'antd';": "import { Typography } from '@/components/ui';",
  "import { Button } from 'antd';": "import { Button } from '@/components/ui';",
  "import { Card } from 'antd';": "import { Card } from '@/components/ui';",
  "import { Input } from 'antd';": "import { Input } from '@/components/ui';",
  "import { Table } from 'antd';": "import { Table } from '@/components/ui';",
  "import { Modal } from 'antd';": "import { Modal } from '@/components/ui';",
  "import { Form } from 'antd';": "import { Form } from '@/components/ui';",
  "import { Select } from 'antd';": "import { Select } from '@/components/ui';",
  "import { Space } from 'antd';": "import { Space } from '@/components/ui';",
  "import { Alert } from 'antd';": "import { Alert } from '@/components/ui';",
  "import { Spin } from 'antd';": "import { Spin } from '@/components/ui';",
  "import { Tag } from 'antd';": "import { Tag } from '@/components/ui';",
  "import { Empty } from 'antd';": "import { Empty } from '@/components/ui';",
  "import { Layout } from 'antd';": "import { Layout } from '@/components/ui';",
  "import { Row, Col } from 'antd';": "import { Row, Col } from '@/components/ui';",
  "import { Statistic } from 'antd';": "import { Statistic } from '@/components/ui';",
  "import { Tabs } from 'antd';": "import { Tabs } from '@/components/ui';",
};

// 复杂导入的正则表达式替换
const regexReplacements = [
  {
    pattern: /import\s*{\s*([^}]*)\s*}\s*from\s*['"]antd['"];/g,
    replacement: (match, imports) => {
      // 分析导入的组件
      const components = imports.split(',').map(c => c.trim());
      const supportedComponents = [
        'message', 'Typography', 'Button', 'Card', 'Input', 'Table', 'Modal', 
        'Form', 'Select', 'Space', 'Alert', 'Spin', 'Tag', 'Empty', 'Layout',
        'Row', 'Col', 'Statistic', 'Tabs'
      ];
      
      const supported = components.filter(c => supportedComponents.includes(c));
      const unsupported = components.filter(c => !supportedComponents.includes(c));
      
      let result = '';
      if (supported.length > 0) {
        result += `import { ${supported.join(', ')} } from '@/components/ui';`;
      }
      if (unsupported.length > 0) {
        result += `${result ? '\n' : ''}// TODO: Replace these Ant Design components: ${unsupported.join(', ')}`;
      }
      
      return result;
    }
  }
];

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 简单字符串替换
    for (const [oldImport, newImport] of Object.entries(importReplacements)) {
      if (content.includes(oldImport)) {
        content = content.replace(new RegExp(oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImport);
        modified = true;
      }
    }
    
    // 正则表达式替换
    for (const { pattern, replacement } of regexReplacements) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let totalUpdated = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      totalUpdated += processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      if (replaceInFile(fullPath)) {
        totalUpdated++;
      }
    }
  }
  
  return totalUpdated;
}

// 主执行
console.log('🔄 开始替换 Ant Design 导入...');
const srcPath = path.join(__dirname, '..', 'src');
const updatedCount = processDirectory(srcPath);
console.log(`✅ 完成！共更新了 ${updatedCount} 个文件`);
