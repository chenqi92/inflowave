#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 支持的图标映射
const supportedIcons = [
  'HomeOutlined', 'RightOutlined', 'LeftOutlined', 'UpOutlined', 'DownOutlined',
  'PlusOutlined', 'MinusOutlined', 'EditOutlined', 'DeleteOutlined', 'SearchOutlined',
  'SettingOutlined', 'CloseOutlined', 'CheckOutlined', 'InfoCircleOutlined',
  'ExclamationCircleOutlined', 'CheckCircleOutlined', 'CloseCircleOutlined',
  'EyeOutlined', 'EyeInvisibleOutlined', 'CopyOutlined', 'SaveOutlined',
  'DownloadOutlined', 'UploadOutlined', 'FileOutlined', 'FolderOutlined',
  'DatabaseOutlined', 'TableOutlined', 'ReloadOutlined', 'PlayCircleOutlined',
  'PauseCircleOutlined', 'StopOutlined', 'BarChartOutlined', 'LineChartOutlined',
  'PieChartOutlined', 'DashboardOutlined', 'WifiOutlined', 'DisconnectOutlined'
];

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 查找 @ant-design/icons 导入
    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@ant-design\/icons['"];/g;
    const matches = [...content.matchAll(importRegex)];
    
    if (matches.length === 0) {
      return false;
    }
    
    for (const match of matches) {
      const fullImport = match[0];
      const iconsString = match[1];
      
      // 解析导入的图标
      const importedIcons = iconsString
        .split(',')
        .map(icon => icon.trim())
        .filter(icon => icon);
      
      // 分类图标
      const supported = importedIcons.filter(icon => supportedIcons.includes(icon));
      const unsupported = importedIcons.filter(icon => !supportedIcons.includes(icon));
      
      let replacement = '';
      
      if (supported.length > 0) {
        replacement += `import { ${supported.join(', ')} } from '@/components/ui';`;
      }
      
      if (unsupported.length > 0) {
        if (replacement) replacement += '\n';
        replacement += `// TODO: Replace these icons: ${unsupported.join(', ')}`;
        replacement += '\n// You may need to find alternatives or create custom icons';
      }
      
      content = content.replace(fullImport, replacement);
      modified = true;
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
console.log('🔄 开始替换 @ant-design/icons 导入...');
const srcPath = path.join(__dirname, '..', 'src');
const updatedCount = processDirectory(srcPath);
console.log(`✅ 完成！共更新了 ${updatedCount} 个文件`);
