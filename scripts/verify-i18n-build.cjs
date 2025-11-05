/**
 * 验证构建产物中的国际化资源
 * 
 * 此脚本检查：
 * 1. 所有语言资源文件是否存在于 dist 目录
 * 2. 资源文件是否完整且有效
 * 3. 文件大小是否合理
 */

const fs = require('fs');
const path = require('path');

// 配置
const DIST_DIR = path.join(__dirname, '..', 'dist');
const LOCALES_DIR = path.join(DIST_DIR, 'locales');
const REQUIRED_LANGUAGES = ['zh-CN', 'en-US'];
const REQUIRED_NAMESPACES = [
  'common',
  'connections',
  'dateTime',
  'errors',
  'menu',
  'navigation',
  'query',
  'settings',
  'visualization',
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    JSON.parse(content);
    return true;
  } catch (error) {
    return false;
  }
}

function verifyI18nBuild() {
  log('\n🔍 开始验证国际化构建产物...\n', 'blue');
  
  let hasErrors = false;
  let totalFiles = 0;
  let totalSize = 0;
  
  // 检查 dist 目录是否存在
  if (!checkFileExists(DIST_DIR)) {
    log('❌ dist 目录不存在！请先运行构建命令。', 'red');
    process.exit(1);
  }
  
  // 检查 locales 目录是否存在
  if (!checkFileExists(LOCALES_DIR)) {
    log('❌ locales 目录不存在于 dist 中！', 'red');
    hasErrors = true;
  } else {
    log('✅ locales 目录存在', 'green');
  }
  
  // 检查每个语言的资源文件
  for (const lang of REQUIRED_LANGUAGES) {
    log(`\n📦 检查语言: ${lang}`, 'blue');
    
    const langDir = path.join(LOCALES_DIR, lang);
    
    if (!checkFileExists(langDir)) {
      log(`  ❌ 语言目录不存在: ${lang}`, 'red');
      hasErrors = true;
      continue;
    }
    
    for (const namespace of REQUIRED_NAMESPACES) {
      const filePath = path.join(langDir, `${namespace}.json`);
      
      if (!checkFileExists(filePath)) {
        log(`  ❌ 缺失文件: ${namespace}.json`, 'red');
        hasErrors = true;
        continue;
      }
      
      // 验证 JSON 格式
      if (!validateJSON(filePath)) {
        log(`  ❌ 无效的 JSON 文件: ${namespace}.json`, 'red');
        hasErrors = true;
        continue;
      }
      
      // 检查文件大小
      const size = checkFileSize(filePath);
      totalSize += size;
      totalFiles++;
      
      if (size < 10) {
        log(`  ⚠️  文件可能为空: ${namespace}.json (${size} bytes)`, 'yellow');
      } else {
        log(`  ✅ ${namespace}.json (${(size / 1024).toFixed(2)} KB)`, 'green');
      }
    }
  }
  
  // 输出统计信息
  log('\n📊 统计信息:', 'blue');
  log(`  总文件数: ${totalFiles}`, 'blue');
  log(`  总大小: ${(totalSize / 1024).toFixed(2)} KB`, 'blue');
  log(`  平均文件大小: ${(totalSize / totalFiles / 1024).toFixed(2)} KB`, 'blue');
  
  // 检查是否有额外的语言文件
  if (checkFileExists(LOCALES_DIR)) {
    const actualLanguages = fs.readdirSync(LOCALES_DIR).filter(item => {
      const itemPath = path.join(LOCALES_DIR, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    const extraLanguages = actualLanguages.filter(lang => !REQUIRED_LANGUAGES.includes(lang));
    
    if (extraLanguages.length > 0) {
      log(`\n📦 发现额外的语言包: ${extraLanguages.join(', ')}`, 'blue');
    }
  }
  
  // 最终结果
  log('\n' + '='.repeat(50), 'blue');
  if (hasErrors) {
    log('❌ 验证失败！存在错误或缺失的文件。', 'red');
    process.exit(1);
  } else {
    log('✅ 验证成功！所有国际化资源文件都已正确构建。', 'green');
    process.exit(0);
  }
}

// 运行验证
verifyI18nBuild();
