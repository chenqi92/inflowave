#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要检查的文件扩展名
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// 需要排除的目录
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'docs',
  'scripts'
];

// 可能存在重复实现的组件模式
const DUPLICATE_PATTERNS = [
  // 连接管理相关
  {
    name: '连接管理',
    files: ['ConnectionManager', 'ConnectionTest'],
    keywords: ['connection', 'connect', 'disconnect', 'test']
  },
  // 数据库操作相关
  {
    name: '数据库管理',
    files: ['DatabaseManager', 'DatabaseBrowser'],
    keywords: ['database', 'db', 'create', 'drop']
  },
  // 导出功能相关
  {
    name: '数据导出',
    files: ['DataExportDialog', 'ExportDialog'],
    keywords: ['export', 'download', 'csv', 'json']
  },
  // 导入功能相关
  {
    name: '数据导入',
    files: ['DataImportWizard', 'SmartImportWizard', 'AdvancedImportDialog'],
    keywords: ['import', 'upload', 'wizard', 'csv']
  },
  // 设置相关
  {
    name: '设置管理',
    files: ['SettingsModal', 'UserPreferences'],
    keywords: ['settings', 'preferences', 'config']
  },
  // 查询相关
  {
    name: '查询功能',
    files: ['QueryEditor', 'QueryResults', 'QueryHistory'],
    keywords: ['query', 'sql', 'execute', 'result']
  }
];

/**
 * 递归获取所有需要检查的文件
 */
function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(item)) {
        getAllFiles(fullPath, files);
      }
    } else if (EXTENSIONS.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 分析文件内容，提取关键信息
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath, path.extname(filePath));
  
  return {
    path: filePath,
    name: fileName,
    content,
    lines: content.split('\n').length,
    imports: extractImports(content),
    exports: extractExports(content),
    functions: extractFunctions(content),
    components: extractComponents(content),
    hooks: extractHooks(content)
  };
}

/**
 * 提取导入语句
 */
function extractImports(content) {
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

/**
 * 提取导出语句
 */
function extractExports(content) {
  const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface|type)\s+(\w+)/g;
  const exports = [];
  let match;
  
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  return exports;
}

/**
 * 提取函数定义
 */
function extractFunctions(content) {
  const functionRegex = /(?:const|function)\s+(\w+)\s*[=\(]/g;
  const functions = [];
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    functions.push(match[1]);
  }
  
  return functions;
}

/**
 * 提取React组件
 */
function extractComponents(content) {
  const componentRegex = /(?:const|function)\s+([A-Z]\w+).*?(?:React\.FC|FunctionComponent)/g;
  const components = [];
  let match;
  
  while ((match = componentRegex.exec(content)) !== null) {
    components.push(match[1]);
  }
  
  return components;
}

/**
 * 提取自定义Hook
 */
function extractHooks(content) {
  const hookRegex = /(?:const|function)\s+(use[A-Z]\w+)/g;
  const hooks = [];
  let match;
  
  while ((match = hookRegex.exec(content)) !== null) {
    hooks.push(match[1]);
  }
  
  return hooks;
}

/**
 * 检查潜在的重复实现
 */
function checkDuplicateImplementations(files) {
  const duplicates = [];
  
  for (const pattern of DUPLICATE_PATTERNS) {
    const matchingFiles = files.filter(file => 
      pattern.files.some(fileName => 
        file.name.toLowerCase().includes(fileName.toLowerCase())
      )
    );
    
    if (matchingFiles.length > 1) {
      const similarity = analyzeSimilarity(matchingFiles, pattern.keywords);
      
      if (similarity.score > 0.3) { // 相似度阈值
        duplicates.push({
          category: pattern.name,
          files: matchingFiles,
          similarity,
          recommendations: generateRecommendations(matchingFiles, similarity)
        });
      }
    }
  }
  
  return duplicates;
}

/**
 * 分析文件相似度
 */
function analyzeSimilarity(files, keywords) {
  const similarities = [];
  
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const file1 = files[i];
      const file2 = files[j];
      
      const commonImports = file1.imports.filter(imp => file2.imports.includes(imp));
      const commonFunctions = file1.functions.filter(fn => file2.functions.includes(fn));
      const commonKeywords = keywords.filter(keyword => 
        file1.content.toLowerCase().includes(keyword) && 
        file2.content.toLowerCase().includes(keyword)
      );
      
      const score = (
        commonImports.length * 0.3 + 
        commonFunctions.length * 0.4 + 
        commonKeywords.length * 0.3
      ) / Math.max(file1.imports.length + file1.functions.length, file2.imports.length + file2.functions.length, 1);
      
      similarities.push({
        file1: file1.name,
        file2: file2.name,
        score,
        commonImports,
        commonFunctions,
        commonKeywords
      });
    }
  }
  
  return {
    score: Math.max(...similarities.map(s => s.score)),
    details: similarities
  };
}

/**
 * 生成重构建议
 */
function generateRecommendations(files, similarity) {
  const recommendations = [];
  
  if (similarity.score > 0.7) {
    recommendations.push('🔴 高度重复 - 建议合并为单一组件');
  } else if (similarity.score > 0.5) {
    recommendations.push('🟡 中度重复 - 考虑提取公共逻辑');
  } else if (similarity.score > 0.3) {
    recommendations.push('🟢 轻度重复 - 可以优化共享部分');
  }
  
  // 基于文件大小的建议
  const avgLines = files.reduce((sum, f) => sum + f.lines, 0) / files.length;
  if (avgLines > 500) {
    recommendations.push('📏 文件过大 - 考虑拆分为更小的组件');
  }
  
  return recommendations;
}

/**
 * 检查未使用的文件
 */
function checkUnusedFiles(files) {
  const unused = [];
  const projectRoot = path.resolve(__dirname, '..');
  
  for (const file of files) {
    const relativePath = path.relative(projectRoot, file.path);
    
    // 跳过入口文件和配置文件
    if (relativePath.includes('main.tsx') || relativePath.includes('App.tsx') || 
        relativePath.includes('index.ts') || relativePath.includes('vite.config')) {
      continue;
    }
    
    // 检查是否被其他文件引用
    const isReferenced = files.some(otherFile => {
      if (otherFile.path === file.path) return false;
      
      const importPath = relativePath.replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '');
      return otherFile.imports.some(imp => 
        imp.includes(file.name) || imp.includes(importPath)
      );
    });
    
    if (!isReferenced && file.exports.length > 0) {
      unused.push({
        path: relativePath,
        name: file.name,
        lines: file.lines,
        exports: file.exports
      });
    }
  }
  
  return unused;
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 开始检查前端页面重复实现...\n');
  
  const projectRoot = path.resolve(__dirname, '..');
  const srcDir = path.join(projectRoot, 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ 找不到 src 目录');
    process.exit(1);
  }
  
  const filePaths = getAllFiles(srcDir);
  const files = filePaths.map(analyzeFile);
  
  console.log(`📁 分析了 ${files.length} 个文件\n`);
  
  // 检查重复实现
  const duplicates = checkDuplicateImplementations(files);
  
  if (duplicates.length > 0) {
    console.log('🔄 发现潜在的重复实现:\n');
    
    duplicates.forEach((duplicate, index) => {
      console.log(`${index + 1}. ${duplicate.category}`);
      console.log(`   相似度: ${(duplicate.similarity.score * 100).toFixed(1)}%`);
      console.log(`   涉及文件:`);
      duplicate.files.forEach(file => {
        console.log(`     - ${path.relative(projectRoot, file.path)} (${file.lines} 行)`);
      });
      console.log(`   建议:`);
      duplicate.recommendations.forEach(rec => {
        console.log(`     ${rec}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ 未发现明显的重复实现\n');
  }
  
  // 检查未使用的文件
  const unused = checkUnusedFiles(files);
  
  if (unused.length > 0) {
    console.log('🗑️  发现可能未使用的文件:\n');
    
    unused.forEach(file => {
      console.log(`   - ${file.path} (${file.lines} 行)`);
      console.log(`     导出: ${file.exports.join(', ')}`);
    });
    console.log('');
  } else {
    console.log('✅ 未发现明显未使用的文件\n');
  }
  
  // 生成总结报告
  console.log('📊 分析总结:');
  console.log(`   - 总文件数: ${files.length}`);
  console.log(`   - 重复实现: ${duplicates.length} 组`);
  console.log(`   - 未使用文件: ${unused.length} 个`);
  console.log(`   - 平均文件大小: ${Math.round(files.reduce((sum, f) => sum + f.lines, 0) / files.length)} 行`);
}

// 直接运行主函数
main();

export {
  getAllFiles,
  analyzeFile,
  checkDuplicateImplementations,
  checkUnusedFiles
};
