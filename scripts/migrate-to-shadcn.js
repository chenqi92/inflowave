#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';

// 图标映射表：Ant Design -> Lucide React
const iconMappings = {
  // 基础图标
  'SearchOutlined': 'Search',
  'PlusOutlined': 'Plus',
  'DeleteOutlined': 'Trash2',
  'EditOutlined': 'Edit',
  'SaveOutlined': 'Save',
  'CloseOutlined': 'X',
  'CheckOutlined': 'Check',
  'DownOutlined': 'ChevronDown',
  'UpOutlined': 'ChevronUp',
  'LeftOutlined': 'ChevronLeft',
  'RightOutlined': 'ChevronRight',
  'ReloadOutlined': 'RefreshCw',
  'LoadingOutlined': 'Loader2',
  
  // 数据库相关
  'DatabaseOutlined': 'Database',
  'TableOutlined': 'Table',
  'FunctionOutlined': 'Zap',
  'FileTextOutlined': 'FileText',
  'SettingOutlined': 'Settings',
  'InfoCircleOutlined': 'Info',
  'QuestionCircleOutlined': 'HelpCircle',
  
  // 操作图标
  'CopyOutlined': 'Copy',
  'ExportOutlined': 'FileDown',
  'ImportOutlined': 'FileUp',
  'DownloadOutlined': 'Download',
  'UploadOutlined': 'Upload',
  'PrinterOutlined': 'Printer',
  
  // 图表图标
  'BarChartOutlined': 'BarChart',
  'LineChartOutlined': 'TrendingUp',
  'PieChartOutlined': 'PieChart',
  'AreaChartOutlined': 'AreaChart',
  
  // 状态图标
  'EyeOutlined': 'Eye',
  'EyeInvisibleOutlined': 'EyeOff',
  'LockOutlined': 'Lock',
  'UnlockOutlined': 'Unlock',
  'HeartOutlined': 'Heart',
  'StarOutlined': 'Star',
  
  // 文件图标
  'FolderOutlined': 'Folder',
  'FileOutlined': 'File',
  'PictureOutlined': 'Image',
  'VideoCameraOutlined': 'Video',
  'AudioOutlined': 'Music',
  
  // 通信图标
  'MailOutlined': 'Mail',
  'PhoneOutlined': 'Phone',
  'MessageOutlined': 'MessageSquare',
  'BellOutlined': 'Bell',
  
  // 导航图标
  'HomeOutlined': 'Home',
  'MenuOutlined': 'Menu',
  'AppstoreOutlined': 'Grid3X3',
  'CompassOutlined': 'Compass',
  
  // 用户图标
  'UserOutlined': 'User',
  'TeamOutlined': 'Users',
  'CrownOutlined': 'Crown',
  'IdcardOutlined': 'CreditCard',
  
  // 时间图标
  'ClockCircleOutlined': 'Clock',
  'CalendarOutlined': 'Calendar',
  'HistoryOutlined': 'History',
  
  // 其他常用图标
  'TagOutlined': 'Tag',
  'TagsOutlined': 'Tags',
  'BookOutlined': 'Book',
  'BulbOutlined': 'Lightbulb',
  'FireOutlined': 'Flame',
  'ThunderboltOutlined': 'Zap',
  'RocketOutlined': 'Rocket',
  'TrophyOutlined': 'Trophy',
  'GiftOutlined': 'Gift',
  'ShoppingOutlined': 'ShoppingCart',
  'CarOutlined': 'Car',
  'EnvironmentOutlined': 'MapPin',
  'GlobalOutlined': 'Globe',
  'WifiOutlined': 'Wifi',
  'CloudOutlined': 'Cloud',
  'SecurityScanOutlined': 'Shield',
  'KeyOutlined': 'Key',
  'ToolOutlined': 'Wrench',
  'BugOutlined': 'Bug',
  'CodeOutlined': 'Code',
  'ApiOutlined': 'Webhook',
  'LinkOutlined': 'Link',
  'DisconnectOutlined': 'Unlink',
  'SyncOutlined': 'RotateCcw',
  'SwapOutlined': 'ArrowLeftRight',
  'SortAscendingOutlined': 'ArrowUp',
  'SortDescendingOutlined': 'ArrowDown',
  'FilterOutlined': 'Filter',
  'FunnelPlotOutlined': 'Filter',
  'ZoomInOutlined': 'ZoomIn',
  'ZoomOutOutlined': 'ZoomOut',
  'FullscreenOutlined': 'Maximize',
  'FullscreenExitOutlined': 'Minimize',
  'ExpandOutlined': 'Expand',
  'CompressOutlined': 'Shrink',
  'NumberOutlined': 'Hash'
};

// 组件映射表：旧组件 -> 新组件
const componentMappings = {
  'message': 'toast',
  'Modal': 'Dialog',
  'Space': 'div', // 需要手动处理样式
};

// 导入替换规则
const importReplacements = [
  {
    // 替换图标导入
    pattern: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/components\/ui['"];?/g,
    replacement: (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const iconImports = [];
      const componentImports = [];
      
      importList.forEach(imp => {
        if (iconMappings[imp]) {
          iconImports.push(iconMappings[imp]);
        } else {
          componentImports.push(imp);
        }
      });
      
      let result = '';
      if (componentImports.length > 0) {
        result += `import { ${componentImports.join(', ')} } from '@/components/ui';\n`;
      }
      if (iconImports.length > 0) {
        result += `import { ${iconImports.join(', ')} } from 'lucide-react';`;
      }
      
      return result;
    }
  },
  {
    // 替换message导入
    pattern: /import\s*{\s*([^}]*message[^}]*)\s*}\s*from\s*['"]@\/components\/ui['"];?/g,
    replacement: (match, imports) => {
      const cleanImports = imports.replace(/message,?/g, '').replace(/,\s*,/g, ',').replace(/^,|,$/g, '').trim();
      let result = '';
      if (cleanImports) {
        result += `import { ${cleanImports}, toast } from '@/components/ui';\n`;
      } else {
        result += `import { toast } from '@/components/ui';`;
      }
      return result;
    }
  }
];

// 使用替换规则
const usageReplacements = [
  // message 替换为 toast
  {
    pattern: /message\.success\(['"`]([^'"`]+)['"`]\)/g,
    replacement: 'toast({ title: "成功", description: "$1" })'
  },
  {
    pattern: /message\.error\(['"`]([^'"`]+)['"`]\)/g,
    replacement: 'toast({ title: "错误", description: "$1", variant: "destructive" })'
  },
  {
    pattern: /message\.warning\(['"`]([^'"`]+)['"`]\)/g,
    replacement: 'toast({ title: "警告", description: "$1" })'
  },
  {
    pattern: /message\.info\(['"`]([^'"`]+)['"`]\)/g,
    replacement: 'toast({ title: "信息", description: "$1" })'
  },
  {
    pattern: /message\.loading\(['"`]([^'"`]+)['"`]\)/g,
    replacement: 'toast({ title: "加载中", description: "$1" })'
  },
  
  // 图标使用替换
  ...Object.entries(iconMappings).map(([oldIcon, newIcon]) => ({
    pattern: new RegExp(`<${oldIcon}\\s*([^>]*)\\s*/>`, 'g'),
    replacement: `<${newIcon} className="w-4 h-4" $1 />`
  })),
  
  // Space 组件替换
  {
    pattern: /<Space([^>]*)>/g,
    replacement: '<div className="flex gap-2"$1>'
  },
  {
    pattern: /<\/Space>/g,
    replacement: '</div>'
  },
  {
    pattern: /<Space\s+direction=['"`]vertical['"`]([^>]*)>/g,
    replacement: '<div className="flex flex-col gap-2"$1>'
  }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 应用导入替换
    importReplacements.forEach(rule => {
      const newContent = content.replace(rule.pattern, rule.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    // 应用使用替换
    usageReplacements.forEach(rule => {
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

function main() {
  console.log('🚀 开始批量替换 Ant Design 组件为 Shadcn/ui...\n');
  
  // 查找所有需要处理的文件
  const patterns = [
    'src/**/*.tsx',
    'src/**/*.ts',
    '!src/components/ui/**', // 排除ui组件目录'!node_modules/**'
  ];
  
  let totalFiles = 0;
  let processedFiles = 0;
  
  patterns.forEach(pattern => {
    if (pattern.startsWith('!')) return; // 跳过排除模式
    
    const files = glob.sync(pattern);
    files.forEach(file => {
      // 检查是否被排除
      const isExcluded = patterns.some(p =>
        p.startsWith('!') && minimatch(file, p.substring(1))
      );
      
      if (!isExcluded) {
        totalFiles++;
        if (processFile(file)) {
          processedFiles++;
        }
      }
    });
  });
  
  console.log(`\n📊 处理完成:`);
  console.log(`   总文件数: ${totalFiles}`);
  console.log(`   已处理: ${processedFiles}`);
  console.log(`   未修改: ${totalFiles - processedFiles}`);
  
  if (processedFiles > 0) {
    console.log('\n🎉 批量替换完成！请运行构建命令检查结果。');
  } else {
    console.log('\n💡 没有找到需要替换的内容。');
  }
}

// 检查是否为主模块
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processFile, iconMappings, componentMappings };
