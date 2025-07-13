#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

// 剩余的图标映射
const remainingIconMappings = {
  'ExclamationCircleOutlined': 'AlertCircle',
  'WarningOutlined': 'AlertTriangle',
  'CheckCircleOutlined': 'CheckCircle',
  'CloseCircleOutlined': 'XCircle',
  'MinusCircleOutlined': 'MinusCircle',
  'PlusCircleOutlined': 'PlusCircle',
  'QuestionCircleOutlined': 'HelpCircle',
  'InfoCircleOutlined': 'Info',
  'ExclamationOutlined': 'AlertTriangle',
  'StopOutlined': 'Square',
  'PlayCircleOutlined': 'PlayCircle',
  'PauseCircleOutlined': 'PauseCircle',
  'CaretRightOutlined': 'ChevronRight',
  'CaretLeftOutlined': 'ChevronLeft',
  'CaretUpOutlined': 'ChevronUp',
  'CaretDownOutlined': 'ChevronDown',
  'DoubleRightOutlined': 'ChevronsRight',
  'DoubleLeftOutlined': 'ChevronsLeft',
  'VerticalAlignTopOutlined': 'AlignVerticalJustifyStart',
  'VerticalAlignBottomOutlined': 'AlignVerticalJustifyEnd',
  'VerticalAlignMiddleOutlined': 'AlignVerticalJustifyCenter',
  'AlignLeftOutlined': 'AlignLeft',
  'AlignRightOutlined': 'AlignRight',
  'AlignCenterOutlined': 'AlignCenter',
  'BorderOutlined': 'Square',
  'DashOutlined': 'Minus',
  'OrderedListOutlined': 'List',
  'UnorderedListOutlined': 'List',
  'RadiusSettingOutlined': 'Circle',
  'ColumnHeightOutlined': 'AlignVerticalSpaceAround',
  'ColumnWidthOutlined': 'AlignHorizontalSpaceAround',
  'DragOutlined': 'GripVertical',
  'MenuFoldOutlined': 'PanelLeftClose',
  'MenuUnfoldOutlined': 'PanelLeftOpen',
  'TableOutlined': 'Table',
  'DesktopOutlined': 'Monitor',
  'LaptopOutlined': 'Laptop',
  'MobileOutlined': 'Smartphone',
  'TabletOutlined': 'Tablet',
  'BgColorsOutlined': 'Palette',
  'FontColorsOutlined': 'Type',
  'FontSizeOutlined': 'Type',
  'BoldOutlined': 'Bold',
  'ItalicOutlined': 'Italic',
  'UnderlineOutlined': 'Underline',
  'StrikethroughOutlined': 'Strikethrough',
  'RedoOutlined': 'Redo',
  'UndoOutlined': 'Undo',
  'ZoomInOutlined': 'ZoomIn',
  'ZoomOutOutlined': 'ZoomOut',
  'OneToOneOutlined': 'Maximize2',
  'RotateLeftOutlined': 'RotateCcw',
  'RotateRightOutlined': 'RotateCw',
  'SwapOutlined': 'ArrowLeftRight',
  'SwapLeftOutlined': 'ArrowLeft',
  'SwapRightOutlined': 'ArrowRight',
  'FieldTimeOutlined': 'Clock',
  'FieldNumberOutlined': 'Hash',
  'FieldStringOutlined': 'Type',
  'FieldBinaryOutlined': 'Binary',
  'FileAddOutlined': 'FilePlus',
  'FolderAddOutlined': 'FolderPlus',
  'FileExcelOutlined': 'FileSpreadsheet',
  'FilePdfOutlined': 'FileText',
  'FileImageOutlined': 'FileImage',
  'FileZipOutlined': 'FileArchive',
  'CloudDownloadOutlined': 'CloudDownload',
  'CloudUploadOutlined': 'CloudUpload',
  'InboxOutlined': 'Inbox',
  'SelectOutlined': 'MousePointer',
  'ScissorOutlined': 'Scissors',
  'HighlightOutlined': 'Highlighter',
  'FontSizeOutlined': 'Type',
  'LineHeightOutlined': 'AlignVerticalSpaceAround',
  'DashboardOutlined': 'LayoutDashboard',
  'ControlOutlined': 'Settings',
  'SlackOutlined': 'MessageSquare',
  'SkypeOutlined': 'Video',
  'FormatPainterOutlined': 'Paintbrush',
  'MacCommandOutlined': 'Command',
  'WindowsOutlined': 'Square',
  'AppleOutlined': 'Apple',
  'AndroidOutlined': 'Smartphone',
  'ChromeOutlined': 'Chrome',
  'IeOutlined': 'Globe',
  'FirefoxOutlined': 'Firefox',
  'SafariOutlined': 'Safari',
  'EdgeOutlined': 'Globe',
  'YahooOutlined': 'Globe',
  'GoogleOutlined': 'Globe',
  'GithubOutlined': 'Github',
  'GitlabOutlined': 'GitBranch',
  'Html5Outlined': 'Code',
  'MediumOutlined': 'FileText',
  'LinkedinOutlined': 'Linkedin',
  'YuqueOutlined': 'FileText',
  'DingtalkOutlined': 'MessageSquare',
  'WeiboOutlined': 'MessageSquare',
  'WechatOutlined': 'MessageSquare',
  'AlipayOutlined': 'CreditCard',
  'TaobaoOutlined': 'ShoppingCart',
  'ZhihuOutlined': 'MessageSquare',
  'RedditOutlined': 'MessageSquare',
  'SketchOutlined': 'Figma',
  'ZoomInOutlined': 'ZoomIn',
  'ZoomOutOutlined': 'ZoomOut',
  'AimOutlined': 'Target',
  'CompressOutlined': 'Minimize',
  'ExpandOutlined': 'Maximize',
  'ArrowsAltOutlined': 'Maximize2',
  'ShrinkOutlined': 'Minimize2',
  'ArrowUpOutlined': 'ArrowUp',
  'ArrowDownOutlined': 'ArrowDown',
  'ArrowLeftOutlined': 'ArrowLeft',
  'ArrowRightOutlined': 'ArrowRight',
  'PlaySquareOutlined': 'Play',
  'QuestionOutlined': 'HelpCircle',
  'PauseOutlined': 'Pause',
  'StepBackwardOutlined': 'SkipBack',
  'StepForwardOutlined': 'SkipForward',
  'FastBackwardOutlined': 'Rewind',
  'FastForwardOutlined': 'FastForward',
  'BackwardOutlined': 'ChevronLeft',
  'ForwardOutlined': 'ChevronRight',
  'EnterOutlined': 'CornerDownLeft',
  'RetweetOutlined': 'Repeat',
  'LoginOutlined': 'LogIn',
  'LogoutOutlined': 'LogOut',
  'MenuOutlined': 'Menu',
  'OrderedListOutlined': 'ListOrdered',
  'UnorderedListOutlined': 'List',
  'RadiusBottomleftOutlined': 'CornerDownLeft',
  'RadiusBottomrightOutlined': 'CornerDownRight',
  'RadiusUpleftOutlined': 'CornerUpLeft',
  'RadiusUprightOutlined': 'CornerUpRight',
  'FullscreenOutlined': 'Maximize',
  'FullscreenExitOutlined': 'Minimize',
  'QuestionCircleOutlined': 'HelpCircle',
  'PlusOutlined': 'Plus',
  'MinusOutlined': 'Minus',
  'CloseOutlined': 'X',
  'CheckOutlined': 'Check',
  'EllipsisOutlined': 'MoreHorizontal',
  'EyeOutlined': 'Eye',
  'EyeInvisibleOutlined': 'EyeOff'
};

// 修复图标导入和使用
function fixRemainingIcons(content) {
  let fixed = content;
  
  // 替换从@/components/ui导入的图标
  Object.entries(remainingIconMappings).forEach(([oldIcon, newIcon]) => {
    // 替换导入语句中的图标
    const importRegex = new RegExp(`\\b${oldIcon}\\b`, 'g');
    fixed = fixed.replace(importRegex, newIcon);
    
    // 替换JSX中的图标使用
    const jsxRegex = new RegExp(`<${oldIcon}([^>]*?)\\s*/>`, 'g');
    fixed = fixed.replace(jsxRegex, `<${newIcon} className="w-4 h-4"$1 />`);
  });
  
  // 修复导入语句，将剩余的图标导入从@/components/ui改为lucide-react
  fixed = fixed.replace(
    /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@\/components\/ui['"];?\s*\n\s*import\s*{\s*([^}]*)\s*}\s*from\s*['"]lucide-react['"];?/g,
    (match, uiImports, lucideImports) => {
      const uiList = uiImports.split(',').map(imp => imp.trim()).filter(imp => imp);
      const lucideList = lucideImports.split(',').map(imp => imp.trim()).filter(imp => imp);
      
      const realUIImports = [];
      const iconImports = [];
      
      uiList.forEach(imp => {
        if (remainingIconMappings[imp] || Object.values(remainingIconMappings).includes(imp)) {
          iconImports.push(remainingIconMappings[imp] || imp);
        } else {
          realUIImports.push(imp);
        }
      });
      
      // 合并lucide图标
      const allLucideIcons = [...new Set([...lucideList, ...iconImports])];
      
      let result = '';
      if (realUIImports.length > 0) {
        result += `import { ${realUIImports.join(', ')} } from '@/components/ui';\n`;
      }
      if (allLucideIcons.length > 0) {
        result += `import { ${allLucideIcons.join(', ')} } from 'lucide-react';`;
      }
      
      return result;
    }
  );
  
  return fixed;
}

async function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixRemainingIcons(content);
    
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
  console.log('🔧 开始修复剩余图标...\n');
  
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
    console.log('\n🎉 剩余图标修复完成！');
  } else {
    console.log('\n💡 没有发现需要修复的剩余图标。');
  }
}

main().catch(console.error);
