#!/usr/bin/env node

/**
 * i18n 一致性检查和修复工具
 *
 * 功能：
 * 1. 检查中英文翻译文件的键值一致性
 * 2. 扫描代码中使用的翻译键
 * 3. 验证命名空间配置
 * 4. 自动修复缺失的键
 * 5. 生成详细报告
 *
 * 使用方法：
 * node scripts/check-i18n.cjs --check              # 仅检查
 * node scripts/check-i18n.cjs --fix                # 检查并修复
 * node scripts/check-i18n.cjs --check --report     # 生成报告
 * node scripts/check-i18n.cjs --namespace menu     # 检查特定命名空间
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// 配置
const CONFIG = {
  localesDir: 'public/locales',
  languages: ['zh-CN', 'en-US'],
  srcDir: 'src',
  configFile: 'src/i18n/config.ts',
  reportFile: 'i18n-report.md',
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 递归获取对象的所有键路径
function getKeyPaths(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getKeyPaths(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

// 递归设置嵌套对象的值
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

// 递归获取嵌套对象的值
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

// 加载指定语言的所有翻译文件
function loadLocaleFiles(language) {
  const localeDir = path.join(CONFIG.localesDir, language);
  const files = {};
  
  if (!fs.existsSync(localeDir)) {
    log(`⚠️  语言目录不存在: ${localeDir}`, 'yellow');
    return files;
  }
  
  const jsonFiles = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));
  
  for (const file of jsonFiles) {
    const namespace = path.basename(file, '.json');
    const filePath = path.join(localeDir, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      files[namespace] = JSON.parse(content);
    } catch (error) {
      log(`❌ 加载文件失败: ${filePath}`, 'red');
      log(`   错误: ${error.message}`, 'red');
    }
  }
  
  return files;
}

// 比较两个语言的翻译文件
function compareLocales(zhFiles, enFiles) {
  const issues = {
    missingInEn: {},
    missingInZh: {},
    extraInEn: {},
    extraInZh: {},
  };
  
  // 获取所有命名空间
  const allNamespaces = new Set([
    ...Object.keys(zhFiles),
    ...Object.keys(enFiles),
  ]);
  
  for (const namespace of allNamespaces) {
    const zhKeys = zhFiles[namespace] ? getKeyPaths(zhFiles[namespace]) : [];
    const enKeys = enFiles[namespace] ? getKeyPaths(enFiles[namespace]) : [];
    
    const zhKeySet = new Set(zhKeys);
    const enKeySet = new Set(enKeys);
    
    // 找出缺失的键
    const missingInEn = zhKeys.filter(key => !enKeySet.has(key));
    const missingInZh = enKeys.filter(key => !zhKeySet.has(key));
    
    if (missingInEn.length > 0) {
      issues.missingInEn[namespace] = missingInEn;
    }
    
    if (missingInZh.length > 0) {
      issues.missingInZh[namespace] = missingInZh;
    }
    
    // 检查命名空间是否只存在于一个语言中
    if (!zhFiles[namespace]) {
      issues.extraInEn[namespace] = true;
    }
    
    if (!enFiles[namespace]) {
      issues.extraInZh[namespace] = true;
    }
  }
  
  return issues;
}

// 从配置文件中提取命名空间列表
function extractNamespacesFromConfig() {
  const configPath = CONFIG.configFile;
  
  if (!fs.existsSync(configPath)) {
    log(`⚠️  配置文件不存在: ${configPath}`, 'yellow');
    return [];
  }
  
  const content = fs.readFileSync(configPath, 'utf-8');
  
  // 匹配 ns: [...] 数组
  const match = content.match(/ns:\s*\[([\s\S]*?)\]/);
  
  if (!match) {
    log(`⚠️  无法从配置文件中提取命名空间`, 'yellow');
    return [];
  }
  
  // 提取命名空间名称
  const namespaces = match[1]
    .split(',')
    .map(ns => ns.trim().replace(/['"]/g, ''))
    .filter(ns => ns.length > 0);
  
  return namespaces;
}

// 扫描代码中使用的翻译键
async function scanCodeForKeys() {
  const usedKeys = {
    byNamespace: {},
    crossNamespace: [],
    unknown: [],
  };
  
  // 查找所有 TypeScript 和 TSX 文件
  const files = await glob(`${CONFIG.srcDir}/**/*.{ts,tsx}`, {
    ignore: ['**/node_modules/**', '**/*.d.ts'],
  });
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // 提取当前文件使用的命名空间
    const namespaceMatches = content.matchAll(/useTranslation\(['"]([^'"]+)['"]\)/g);
    const fileNamespaces = [...namespaceMatches].map(m => m[1]);
    
    // 提取 t() 调用
    const tMatches = content.matchAll(/\bt\(['"]([^'"]+)['"]/g);
    
    for (const match of tMatches) {
      const key = match[1];
      
      // 检查是否是跨命名空间调用 (namespace:key)
      if (key.includes(':')) {
        const [namespace, ...keyParts] = key.split(':');
        usedKeys.crossNamespace.push({
          file,
          namespace,
          key: keyParts.join(':'),
          fullKey: key,
        });
      } else {
        // 使用当前文件的命名空间
        if (fileNamespaces.length > 0) {
          for (const namespace of fileNamespaces) {
            if (!usedKeys.byNamespace[namespace]) {
              usedKeys.byNamespace[namespace] = new Set();
            }
            usedKeys.byNamespace[namespace].add(key);
          }
        } else {
          // 无法确定命名空间
          usedKeys.unknown.push({ file, key });
        }
      }
    }
  }
  
  // 转换 Set 为数组
  for (const namespace in usedKeys.byNamespace) {
    usedKeys.byNamespace[namespace] = [...usedKeys.byNamespace[namespace]];
  }
  
  return usedKeys;
}

// 检查代码中使用的键是否存在于翻译文件中
function validateUsedKeys(usedKeys, zhFiles, enFiles) {
  const issues = {
    missingKeys: [],
  };
  
  // 检查按命名空间使用的键
  for (const [namespace, keys] of Object.entries(usedKeys.byNamespace)) {
    const zhData = zhFiles[namespace];
    const enData = enFiles[namespace];
    
    if (!zhData && !enData) {
      issues.missingKeys.push({
        namespace,
        keys: keys,
        reason: '命名空间不存在',
      });
      continue;
    }
    
    const zhKeySet = zhData ? new Set(getKeyPaths(zhData)) : new Set();
    const enKeySet = enData ? new Set(getKeyPaths(enData)) : new Set();
    
    for (const key of keys) {
      if (!zhKeySet.has(key) && !enKeySet.has(key)) {
        issues.missingKeys.push({
          namespace,
          key,
          reason: '键不存在于任何语言文件中',
        });
      }
    }
  }
  
  // 检查跨命名空间调用
  for (const { namespace, key, fullKey, file } of usedKeys.crossNamespace) {
    const zhData = zhFiles[namespace];
    const enData = enFiles[namespace];
    
    if (!zhData && !enData) {
      issues.missingKeys.push({
        namespace,
        key: fullKey,
        file,
        reason: '命名空间不存在',
      });
      continue;
    }
    
    const zhKeySet = zhData ? new Set(getKeyPaths(zhData)) : new Set();
    const enKeySet = enData ? new Set(getKeyPaths(enData)) : new Set();
    
    if (!zhKeySet.has(key) && !enKeySet.has(key)) {
      issues.missingKeys.push({
        namespace,
        key: fullKey,
        file,
        reason: '键不存在于任何语言文件中',
      });
    }
  }
  
  return issues;
}

// 自动修复缺失的键
function fixMissingKeys(issues, zhFiles, enFiles) {
  let fixedCount = 0;

  // 修复英文缺失的键
  for (const [namespace, keys] of Object.entries(issues.missingInEn)) {
    if (!enFiles[namespace]) {
      enFiles[namespace] = {};
    }

    for (const key of keys) {
      const zhValue = getNestedValue(zhFiles[namespace], key);
      const enValue = `[TODO: Translate] ${zhValue}`;
      setNestedValue(enFiles[namespace], key, enValue);
      fixedCount++;
    }
  }

  // 修复中文缺失的键
  for (const [namespace, keys] of Object.entries(issues.missingInZh)) {
    if (!zhFiles[namespace]) {
      zhFiles[namespace] = {};
    }

    for (const key of keys) {
      const enValue = getNestedValue(enFiles[namespace], key);
      const zhValue = `[待翻译] ${enValue}`;
      setNestedValue(zhFiles[namespace], key, zhValue);
      fixedCount++;
    }
  }

  return fixedCount;
}

// 保存翻译文件
function saveLocaleFiles(language, files) {
  const localeDir = path.join(CONFIG.localesDir, language);

  if (!fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir, { recursive: true });
  }

  for (const [namespace, data] of Object.entries(files)) {
    const filePath = path.join(localeDir, `${namespace}.json`);
    const content = JSON.stringify(data, null, 2) + '\n';

    try {
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      log(`❌ 保存文件失败: ${filePath}`, 'red');
      log(`   错误: ${error.message}`, 'red');
    }
  }
}

// 生成报告
function generateReport(issues, usedKeysIssues, configNamespaces, zhFiles, enFiles) {
  const lines = [];

  lines.push('# i18n 一致性检查报告\n');
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}\n`);

  // 命名空间配置检查
  lines.push('## 命名空间配置\n');
  const actualNamespaces = new Set([...Object.keys(zhFiles), ...Object.keys(enFiles)]);
  const configSet = new Set(configNamespaces);

  const missingInConfig = [...actualNamespaces].filter(ns => !configSet.has(ns));
  const missingFiles = configNamespaces.filter(ns => !actualNamespaces.has(ns));

  if (missingInConfig.length > 0) {
    lines.push('### ⚠️  配置中缺失的命名空间\n');
    missingInConfig.forEach(ns => lines.push(`- ${ns}`));
    lines.push('');
  }

  if (missingFiles.length > 0) {
    lines.push('### ⚠️  缺少文件的命名空间\n');
    missingFiles.forEach(ns => lines.push(`- ${ns}`));
    lines.push('');
  }

  // 翻译键一致性检查
  lines.push('## 翻译键一致性\n');

  if (Object.keys(issues.missingInEn).length > 0) {
    lines.push('### ❌ en-US 缺失的键\n');
    for (const [namespace, keys] of Object.entries(issues.missingInEn)) {
      lines.push(`#### ${namespace}\n`);
      keys.forEach(key => lines.push(`- \`${key}\``));
      lines.push('');
    }
  }

  if (Object.keys(issues.missingInZh).length > 0) {
    lines.push('### ❌ zh-CN 缺失的键\n');
    for (const [namespace, keys] of Object.entries(issues.missingInZh)) {
      lines.push(`#### ${namespace}\n`);
      keys.forEach(key => lines.push(`- \`${key}\``));
      lines.push('');
    }
  }

  // 代码使用检查
  if (usedKeysIssues.missingKeys.length > 0) {
    lines.push('## ⚠️  代码中使用但不存在的键\n');

    const byNamespace = {};
    for (const issue of usedKeysIssues.missingKeys) {
      if (!byNamespace[issue.namespace]) {
        byNamespace[issue.namespace] = [];
      }
      byNamespace[issue.namespace].push(issue);
    }

    for (const [namespace, issues] of Object.entries(byNamespace)) {
      lines.push(`### ${namespace}\n`);
      issues.forEach(issue => {
        lines.push(`- \`${issue.key}\``);
        if (issue.file) {
          lines.push(`  - 文件: ${issue.file}`);
        }
        if (issue.reason) {
          lines.push(`  - 原因: ${issue.reason}`);
        }
      });
      lines.push('');
    }
  }

  // 统计信息
  lines.push('## 统计信息\n');

  const totalMissingInEn = Object.values(issues.missingInEn).reduce((sum, keys) => sum + keys.length, 0);
  const totalMissingInZh = Object.values(issues.missingInZh).reduce((sum, keys) => sum + keys.length, 0);

  lines.push(`- en-US 缺失键数: ${totalMissingInEn}`);
  lines.push(`- zh-CN 缺失键数: ${totalMissingInZh}`);
  lines.push(`- 代码中使用但不存在的键: ${usedKeysIssues.missingKeys.length}`);
  lines.push(`- 总问题数: ${totalMissingInEn + totalMissingInZh + usedKeysIssues.missingKeys.length}`);

  return lines.join('\n');
}

// 打印控制台报告
function printConsoleReport(issues, usedKeysIssues, configNamespaces, zhFiles, enFiles) {
  log('\n📊 i18n 一致性检查报告', 'cyan');
  log('='.repeat(60), 'cyan');

  // 命名空间配置检查
  const actualNamespaces = new Set([...Object.keys(zhFiles), ...Object.keys(enFiles)]);
  const configSet = new Set(configNamespaces);

  const missingInConfig = [...actualNamespaces].filter(ns => !configSet.has(ns));
  const missingFiles = configNamespaces.filter(ns => !actualNamespaces.has(ns));

  if (missingInConfig.length > 0 || missingFiles.length > 0) {
    log('\n📁 命名空间配置', 'yellow');

    if (missingInConfig.length > 0) {
      log('  ⚠️  配置中缺失的命名空间:', 'yellow');
      missingInConfig.forEach(ns => log(`    - ${ns}`, 'yellow'));
    }

    if (missingFiles.length > 0) {
      log('  ⚠️  缺少文件的命名空间:', 'yellow');
      missingFiles.forEach(ns => log(`    - ${ns}`, 'yellow'));
    }
  }

  // 翻译键一致性
  const totalMissingInEn = Object.values(issues.missingInEn).reduce((sum, keys) => sum + keys.length, 0);
  const totalMissingInZh = Object.values(issues.missingInZh).reduce((sum, keys) => sum + keys.length, 0);

  if (totalMissingInEn > 0 || totalMissingInZh > 0) {
    log('\n🔑 翻译键一致性', 'blue');

    if (totalMissingInEn > 0) {
      log(`  ❌ en-US 缺失 ${totalMissingInEn} 个键:`, 'red');
      for (const [namespace, keys] of Object.entries(issues.missingInEn)) {
        log(`    📦 ${namespace}: ${keys.length} 个`, 'red');
        if (keys.length <= 5) {
          keys.forEach(key => log(`      - ${key}`, 'red'));
        } else {
          keys.slice(0, 3).forEach(key => log(`      - ${key}`, 'red'));
          log(`      ... 还有 ${keys.length - 3} 个`, 'red');
        }
      }
    }

    if (totalMissingInZh > 0) {
      log(`  ❌ zh-CN 缺失 ${totalMissingInZh} 个键:`, 'red');
      for (const [namespace, keys] of Object.entries(issues.missingInZh)) {
        log(`    📦 ${namespace}: ${keys.length} 个`, 'red');
        if (keys.length <= 5) {
          keys.forEach(key => log(`      - ${key}`, 'red'));
        } else {
          keys.slice(0, 3).forEach(key => log(`      - ${key}`, 'red'));
          log(`      ... 还有 ${keys.length - 3} 个`, 'red');
        }
      }
    }
  }

  // 代码使用检查
  if (usedKeysIssues.missingKeys.length > 0) {
    log(`\n⚠️  代码中使用但不存在的键: ${usedKeysIssues.missingKeys.length} 个`, 'yellow');

    const byNamespace = {};
    for (const issue of usedKeysIssues.missingKeys) {
      if (!byNamespace[issue.namespace]) {
        byNamespace[issue.namespace] = [];
      }
      byNamespace[issue.namespace].push(issue);
    }

    for (const [namespace, issues] of Object.entries(byNamespace)) {
      log(`  📦 ${namespace}: ${issues.length} 个`, 'yellow');
      issues.slice(0, 3).forEach(issue => {
        log(`    - ${issue.key}`, 'yellow');
        if (issue.file) {
          log(`      文件: ${issue.file}`, 'yellow');
        }
      });
      if (issues.length > 3) {
        log(`    ... 还有 ${issues.length - 3} 个`, 'yellow');
      }
    }
  }

  // 统计信息
  log('\n📈 统计信息', 'green');
  log(`  - en-US 缺失键数: ${totalMissingInEn}`, totalMissingInEn > 0 ? 'red' : 'green');
  log(`  - zh-CN 缺失键数: ${totalMissingInZh}`, totalMissingInZh > 0 ? 'red' : 'green');
  log(`  - 代码中使用但不存在的键: ${usedKeysIssues.missingKeys.length}`, usedKeysIssues.missingKeys.length > 0 ? 'yellow' : 'green');

  const totalIssues = totalMissingInEn + totalMissingInZh + usedKeysIssues.missingKeys.length;
  log(`  - 总问题数: ${totalIssues}`, totalIssues > 0 ? 'red' : 'green');

  log('\n' + '='.repeat(60), 'cyan');

  if (totalIssues === 0) {
    log('✅ 所有检查通过！', 'green');
  } else {
    log(`⚠️  发现 ${totalIssues} 个问题`, 'yellow');
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const options = {
    check: args.includes('--check'),
    fix: args.includes('--fix'),
    report: args.includes('--report'),
    namespace: args.includes('--namespace') ? args[args.indexOf('--namespace') + 1] : null,
  };

  // 如果没有指定任何选项，默认为检查模式
  if (!options.check && !options.fix) {
    options.check = true;
  }

  log('🔍 开始检查 i18n 一致性...', 'cyan');

  // 加载翻译文件
  log('\n📂 加载翻译文件...', 'blue');
  const zhFiles = loadLocaleFiles('zh-CN');
  const enFiles = loadLocaleFiles('en-US');

  log(`  ✓ zh-CN: ${Object.keys(zhFiles).length} 个命名空间`, 'green');
  log(`  ✓ en-US: ${Object.keys(enFiles).length} 个命名空间`, 'green');

  // 如果指定了命名空间，只检查该命名空间
  if (options.namespace) {
    const ns = options.namespace;
    const filteredZh = zhFiles[ns] ? { [ns]: zhFiles[ns] } : {};
    const filteredEn = enFiles[ns] ? { [ns]: enFiles[ns] } : {};

    Object.keys(zhFiles).forEach(key => {
      if (key !== ns) delete zhFiles[key];
    });
    Object.keys(enFiles).forEach(key => {
      if (key !== ns) delete enFiles[key];
    });
  }

  // 比较翻译文件
  log('\n🔄 比较翻译文件...', 'blue');
  const issues = compareLocales(zhFiles, enFiles);

  // 提取配置中的命名空间
  log('\n📋 检查命名空间配置...', 'blue');
  const configNamespaces = extractNamespacesFromConfig();
  log(`  ✓ 配置中定义了 ${configNamespaces.length} 个命名空间`, 'green');

  // 扫描代码中使用的键
  log('\n🔎 扫描代码中使用的翻译键...', 'blue');
  const usedKeys = await scanCodeForKeys();
  const usedNamespaces = Object.keys(usedKeys.byNamespace).length;
  const totalUsedKeys = Object.values(usedKeys.byNamespace).reduce((sum, keys) => sum + keys.length, 0);
  log(`  ✓ 发现 ${usedNamespaces} 个命名空间中使用了 ${totalUsedKeys} 个键`, 'green');
  log(`  ✓ 跨命名空间调用: ${usedKeys.crossNamespace.length} 个`, 'green');

  // 验证代码中使用的键
  log('\n✅ 验证代码中使用的键...', 'blue');
  const usedKeysIssues = validateUsedKeys(usedKeys, zhFiles, enFiles);

  // 打印报告
  printConsoleReport(issues, usedKeysIssues, configNamespaces, zhFiles, enFiles);

  // 自动修复
  if (options.fix) {
    log('\n🔧 自动修复缺失的键...', 'yellow');
    const fixedCount = fixMissingKeys(issues, zhFiles, enFiles);

    if (fixedCount > 0) {
      log(`  ✓ 修复了 ${fixedCount} 个缺失的键`, 'green');

      // 保存文件
      log('\n💾 保存翻译文件...', 'blue');
      saveLocaleFiles('zh-CN', zhFiles);
      saveLocaleFiles('en-US', enFiles);
      log('  ✓ 文件已保存', 'green');
    } else {
      log('  ✓ 没有需要修复的键', 'green');
    }
  }

  // 生成报告文件
  if (options.report) {
    log('\n📄 生成报告文件...', 'blue');
    const reportContent = generateReport(issues, usedKeysIssues, configNamespaces, zhFiles, enFiles);
    fs.writeFileSync(CONFIG.reportFile, reportContent, 'utf-8');
    log(`  ✓ 报告已保存到: ${CONFIG.reportFile}`, 'green');
  }

  log('');
}

// 运行主函数
main().catch(error => {
  log(`\n❌ 发生错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
