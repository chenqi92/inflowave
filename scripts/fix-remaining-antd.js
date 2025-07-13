#!/usr/bin/env node

import fs from 'fs';
import { glob } from 'glob';

// Icon mappings from @ant-design/icons to lucide-react
const iconMappings = {
  'UploadOutlined': 'Upload',
  'DatabaseOutlined': 'Database',
  'CheckCircle': 'CheckCircle',
  'Info': 'Info',
  'AlertCircle': 'AlertCircle',
  'BugOutlined': 'Bug',
  'ExperimentOutlined': 'FlaskConical',
  'ClearOutlined': 'X',
  'PlayCircle': 'PlayCircle',
  'ReloadOutlined': 'RefreshCw',
  'AreaChartOutlined': 'AreaChart',
  'SaveOutlined': 'Save',
  'DeleteOutlined': 'Trash2',
  'ExportOutlined': 'Download',
  'ImportOutlined': 'Upload',
  'SettingOutlined': 'Settings',
  'UserOutlined': 'User',
  'BellOutlined': 'Bell',
  'ThunderboltOutlined': 'Zap',
  'Table': 'Table',
  'SearchOutlined': 'Search',
  'MoreOutlined': 'MoreHorizontal',
  'KeyOutlined': 'Key',
  'ClockCircleOutlined': 'Clock',
  'TagsOutlined': 'Tags',
  'FunctionOutlined': 'Code',
  'FileTextOutlined': 'FileText',
  'LinkOutlined': 'Link',
  'NumberOutlined': 'Hash',
  'FileOutlined': 'File',
  'BranchesOutlined': 'GitBranch',
  'FolderOpenOutlined': 'FolderOpen'
};

// Component mappings from antd to shadcn/ui
const componentMappings = {
  'Modal': 'Dialog',
  'message': 'toast'
};

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace @ant-design/icons imports
    const iconImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@ant-design\/icons['"];?/g;
    content = content.replace(iconImportRegex, (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const mappedIcons = [];
      const unmappedIcons = [];

      importList.forEach(icon => {
        if (iconMappings[icon]) {
          mappedIcons.push(iconMappings[icon]);
        } else {
          unmappedIcons.push(icon);
        }
      });

      let result = '';
      if (mappedIcons.length > 0) {
        result = `import { ${mappedIcons.join(', ')} } from 'lucide-react';`;
      }
      
      if (unmappedIcons.length > 0) {
        console.warn(`⚠️  Unmapped icons in ${filePath}: ${unmappedIcons.join(', ')}`);
        if (result) result += '\n';
        result += `// TODO: Replace these icons: ${unmappedIcons.join(', ')}`;
      }

      modified = true;
      return result;
    });

    // Replace antd component imports
    const antdImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]antd['"];?/g;
    content = content.replace(antdImportRegex, (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const mappedComponents = [];
      const unmappedComponents = [];

      importList.forEach(comp => {
        if (componentMappings[comp]) {
          mappedComponents.push(componentMappings[comp]);
        } else {
          mappedComponents.push(comp); // Most components have same name
        }
      });

      modified = true;
      return `import { ${mappedComponents.join(', ')} } from '@/components/ui';`;
    });

    // Replace antd type imports
    const antdTypeRegex = /import\s+type\s*{\s*([^}]+)\s*}\s*from\s*['"]antd[^'"]*['"];?/g;
    content = content.replace(antdTypeRegex, (match, types) => {
      modified = true;
      return `// TODO: Replace antd types: ${types}`;
    });

    // Replace Modal usage with Dialog
    if (content.includes('<Modal')) {
      content = content.replace(/<Modal/g, '<Dialog');
      content = content.replace(/<\/Modal>/g, '</Dialog>');
      modified = true;
    }

    // Replace message usage with toast
    if (content.includes('message.')) {
      content = content.replace(/message\./g, 'toast.');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🚀 Fixing remaining antd imports...\n');

  // Files that still have antd imports
  const filesToFix = [
    'src/components/common/ConnectionModal.tsx',
    'src/components/common/DataExportDialog.tsx',
    'src/components/common/ExportDialog.tsx',
    'src/components/common/SimpleChart.tsx',
    'src/components/ConnectionContextMenu/index.tsx',
    'src/components/ConnectionManager/index.tsx',
    'src/components/ConnectionTest.tsx',
    'src/components/database/DatabaseBrowser.tsx',
    'src/components/database/DatabaseContextMenu.tsx',
    'src/components/database/TableContextMenu.tsx',
    'src/components/layout/AppMenuBar.tsx',
    'src/components/layout/DatabaseExplorer.tsx',
    'src/components/layout/DataGripLayout.tsx',
    'src/components/layout/ResultPanel.tsx',
    'src/components/layout/TabEditor.tsx',
    'src/components/test/ErrorTestButton.tsx',
    'src/components/test/TestButton.tsx',
    'src/pages/Visualization/index.tsx'
  ];

  let totalFiles = 0;
  let fixedFiles = 0;

  filesToFix.forEach(file => {
    if (fs.existsSync(file)) {
      totalFiles++;
      if (fixFile(file)) {
        fixedFiles++;
      }
    } else {
      console.warn(`⚠️  File not found: ${file}`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Fixed files: ${fixedFiles}`);
  console.log(`   Unchanged: ${totalFiles - fixedFiles}`);

  if (fixedFiles > 0) {
    console.log('\n🎉 Fixed remaining antd imports!');
  } else {
    console.log('\n💡 No files needed fixing.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fixFile };
