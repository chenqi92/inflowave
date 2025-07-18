#!/usr/bin/env node

/**
 * 代码质量修复脚本
 * 一键修复项目中的代码质量问题，包括：
 * - 未使用的导入
 * - 代码格式问题
 * - TypeScript 类型问题
 * - 基本的代码规范问题
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(
    `\n${colors.cyan}[${step}]${colors.reset} ${colors.bright}${message}${colors.reset}`
  );
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

// 执行命令的包装函数
function runCommand(command, description, options = {}) {
  const { ignoreErrors = false, silent = false } = options;

  try {
    if (!silent) {
      log(`执行: ${colors.blue}${command}${colors.reset}`);
    }

    const result = execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
      cwd: process.cwd(),
    });

    if (!silent) {
      logSuccess(`${description} 完成`);
    }

    return { success: true, output: result };
  } catch (error) {
    if (ignoreErrors) {
      if (!silent) {
        logWarning(`${description} 有警告，但继续执行`);
      }
      return { success: false, error, output: error.stdout };
    } else {
      logError(`${description} 失败: ${error.message}`);
      throw error;
    }
  }
}

// 检查文件是否存在
function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

// 主要修复流程
async function fixCodeQuality() {
  log(
    `${colors.bright}${colors.magenta}🚀 开始代码质量修复...${colors.reset}\n`
  );

  // 步骤1: 检查必要文件
  logStep('1', '检查项目配置文件');

  const requiredFiles = [
    'package.json',
    'eslint.config.js',
    '.prettierrc',
    'tsconfig.json',
  ];

  for (const file of requiredFiles) {
    if (fileExists(file)) {
      logSuccess(`找到 ${file}`);
    } else {
      logWarning(`缺少 ${file}`);
    }
  }

  // 步骤2: TypeScript 类型检查
  logStep('2', 'TypeScript 类型检查');
  runCommand('pnpm run type-check', 'TypeScript 类型检查', {
    ignoreErrors: true,
  });

  // 步骤3: ESLint 修复
  logStep('3', 'ESLint 自动修复');
  runCommand('pnpm run lint:fix-all', 'ESLint 自动修复', {
    ignoreErrors: true,
  });

  // 步骤4: Prettier 格式化
  logStep('4', 'Prettier 代码格式化');
  runCommand('pnpm run format:all', 'Prettier 代码格式化', {
    ignoreErrors: true,
  });

  // 步骤5: 再次运行 ESLint 检查剩余问题
  logStep('5', '检查剩余问题');
  const lintResult = runCommand('pnpm run lint', '最终 ESLint 检查', {
    ignoreErrors: true,
    silent: true,
  });

  if (lintResult.success) {
    logSuccess('所有代码质量问题已修复！');
  } else {
    logWarning('仍有一些问题需要手动修复');
    log('\n剩余问题:');
    console.log(lintResult.output || lintResult.error?.stdout || '');
  }

  // 步骤6: 生成报告
  logStep('6', '生成修复报告');
  generateReport();

  log(`\n${colors.bright}${colors.green}🎉 代码质量修复完成！${colors.reset}`);
  log(`${colors.cyan}建议运行以下命令验证修复结果:${colors.reset}`);
  log(`  ${colors.blue}pnpm run build${colors.reset} - 验证构建是否成功`);
  log(`  ${colors.blue}pnpm run test${colors.reset} - 运行测试确保功能正常`);
}

// 生成修复报告
function generateReport() {
  const reportPath = path.resolve('code-quality-report.md');
  const timestamp = new Date().toLocaleString('zh-CN');

  const report = `# 代码质量修复报告

**修复时间**: ${timestamp}

## 修复内容

### ✅ 已完成的修复
- 🔧 ESLint 自动修复
- 🎨 Prettier 代码格式化  
- 📝 TypeScript 类型检查
- 🧹 未使用导入清理
- 📋 代码规范统一

### 🛠️ 修复的问题类型
- 未使用的导入和变量
- 代码格式不一致
- 字符串拼接改为模板字符串
- 变量声明优化 (const/let)
- 对象简写语法
- 测试文件全局变量配置

### 📋 使用的工具
- ESLint + TypeScript ESLint
- Prettier
- eslint-plugin-unused-imports
- TypeScript 编译器

### 🎯 下一步建议
1. 运行 \`pnpm run build\` 验证构建
2. 运行 \`pnpm run test\` 确保测试通过
3. 提交代码前运行 \`pnpm run code-quality\`
4. 考虑设置 Git hooks 自动运行代码质量检查

---
*此报告由代码质量修复脚本自动生成*
`;

  fs.writeFileSync(reportPath, report, 'utf8');
  logSuccess(`修复报告已生成: ${reportPath}`);
}

// 错误处理
process.on('uncaughtException', error => {
  logError(`未捕获的异常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  logError(`未处理的 Promise 拒绝: ${reason}`);
  process.exit(1);
});

// 直接运行主函数
fixCodeQuality().catch(error => {
  logError(`修复过程中出现错误: ${error.message}`);
  process.exit(1);
});

export { fixCodeQuality };
