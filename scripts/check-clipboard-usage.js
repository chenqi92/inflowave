#!/usr/bin/env node

/**
 * 检查剪贴板使用情况的脚本
 * 确保所有剪贴板操作都使用了安全的Tauri API
 */

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
  'scripts',
];

// 危险的剪贴板使用模式
const DANGEROUS_PATTERNS = [
  {
    pattern: /navigator\.clipboard/g,
    description: '直接使用 navigator.clipboard API',
    severity: 'error'
  },
  {
    pattern: /\.writeText\(/g,
    description: '可能的剪贴板写入操作',
    severity: 'warning'
  },
  {
    pattern: /\.readText\(/g,
    description: '可能的剪贴板读取操作',
    severity: 'warning'
  },
  {
    pattern: /copyWithSyntaxHighlighting:\s*true/g,
    description: 'Monaco编辑器启用了语法高亮复制',
    severity: 'warning'
  }
];

// 安全的剪贴板使用模式
const SAFE_PATTERNS = [
  {
    pattern: /writeToClipboard/g,
    description: '使用安全的 writeToClipboard 函数'
  },
  {
    pattern: /readFromClipboard/g,
    description: '使用安全的 readFromClipboard 函数'
  },
  {
    pattern: /from '@\/utils\/clipboard'/g,
    description: '导入安全的剪贴板工具'
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
 * 检查文件中的剪贴板使用情况
 */
function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  const lines = content.split('\n');
  
  const issues = [];
  const safeUsages = [];

  // 检查危险模式
  DANGEROUS_PATTERNS.forEach(({ pattern, description, severity }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() || '';
      
      issues.push({
        file: relativePath,
        line: lineNumber,
        content: lineContent,
        description,
        severity,
        type: 'dangerous'
      });
    }
  });

  // 检查安全模式
  SAFE_PATTERNS.forEach(({ pattern, description }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() || '';
      
      safeUsages.push({
        file: relativePath,
        line: lineNumber,
        content: lineContent,
        description,
        type: 'safe'
      });
    }
  });

  return { issues, safeUsages };
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 检查剪贴板使用情况...\n');

  const projectRoot = path.resolve(__dirname, '..');
  const srcDir = path.join(projectRoot, 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ src 目录不存在');
    process.exit(1);
  }

  const filePaths = getAllFiles(srcDir);
  console.log(`📁 扫描 ${filePaths.length} 个文件\n`);

  let totalIssues = 0;
  let totalSafeUsages = 0;
  const allIssues = [];
  const allSafeUsages = [];

  filePaths.forEach(filePath => {
    const { issues, safeUsages } = checkFile(filePath);
    allIssues.push(...issues);
    allSafeUsages.push(...safeUsages);
    totalIssues += issues.length;
    totalSafeUsages += safeUsages.length;
  });

  // 报告危险使用
  if (totalIssues > 0) {
    console.log('⚠️  发现潜在的剪贴板问题:\n');
    
    const errorIssues = allIssues.filter(issue => issue.severity === 'error');
    const warningIssues = allIssues.filter(issue => issue.severity === 'warning');

    if (errorIssues.length > 0) {
      console.log('🚨 错误 (需要立即修复):');
      errorIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.file}:${issue.line}`);
        console.log(`   ${issue.description}`);
        console.log(`   代码: ${issue.content}`);
        console.log('');
      });
    }

    if (warningIssues.length > 0) {
      console.log('⚠️  警告 (建议检查):');
      warningIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.file}:${issue.line}`);
        console.log(`   ${issue.description}`);
        console.log(`   代码: ${issue.content}`);
        console.log('');
      });
    }
  } else {
    console.log('✅ 未发现危险的剪贴板使用\n');
  }

  // 报告安全使用
  if (totalSafeUsages > 0) {
    console.log(`✅ 发现 ${totalSafeUsages} 处安全的剪贴板使用:\n`);
    
    const fileGroups = {};
    allSafeUsages.forEach(usage => {
      if (!fileGroups[usage.file]) {
        fileGroups[usage.file] = [];
      }
      fileGroups[usage.file].push(usage);
    });

    Object.entries(fileGroups).forEach(([file, usages]) => {
      console.log(`📄 ${file}:`);
      usages.forEach(usage => {
        console.log(`   第${usage.line}行: ${usage.description}`);
      });
      console.log('');
    });
  }

  // 总结
  console.log('📊 检查总结:');
  console.log(`   扫描文件: ${filePaths.length}`);
  console.log(`   发现问题: ${totalIssues}`);
  console.log(`   安全使用: ${totalSafeUsages}`);
  
  if (totalIssues > 0) {
    const errorCount = allIssues.filter(issue => issue.severity === 'error').length;
    if (errorCount > 0) {
      console.log(`\n❌ 发现 ${errorCount} 个严重问题，需要立即修复`);
      process.exit(1);
    } else {
      console.log(`\n⚠️  发现 ${totalIssues} 个警告，建议检查`);
    }
  } else {
    console.log('\n🎉 所有剪贴板使用都是安全的！');
  }
}

// 执行检查
main();
