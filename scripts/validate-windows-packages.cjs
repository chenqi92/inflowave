#!/usr/bin/env node

/**
 * Windows 安装包验证工具
 * 验证 MSI、EXE、MSIX 安装包的完整性和配置
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function calculateFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    return null;
  }
}

function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function validatePackage(packagePath, packageType) {
  log(`\n🔍 验证 ${packageType} 包: ${path.basename(packagePath)}`, 'cyan');
  
  if (!fs.existsSync(packagePath)) {
    log(`❌ 文件不存在: ${packagePath}`, 'red');
    return false;
  }

  const stats = fs.statSync(packagePath);
  const fileSize = formatFileSize(stats.size);
  const fileHash = calculateFileHash(packagePath);

  log(`📦 文件大小: ${fileSize}`, 'blue');
  log(`🔐 SHA256: ${fileHash}`, 'blue');

  // ZIP 文件特殊处理
  if (packageType === 'ZIP') {
    // 检查 ZIP 文件头
    try {
      const buffer = fs.readFileSync(packagePath, { start: 0, end: 4 });
      const signature = buffer.toString('hex').toUpperCase();

      if (signature.startsWith('504B0304') || signature.startsWith('504B0506') || signature.startsWith('504B0708')) {
        log(`✅ 有效的 ZIP 文件格式`, 'green');

        // ZIP 文件大小检查
        if (stats.size < 5 * 1024 * 1024) { // 小于 5MB
          log(`⚠️ ZIP 文件较小，可能不包含完整应用`, 'yellow');
        } else if (stats.size > 500 * 1024 * 1024) { // 大于 500MB
          log(`⚠️ ZIP 文件过大，请检查是否正常`, 'yellow');
        } else {
          log(`✅ ZIP 文件大小正常`, 'green');
        }

        return true;
      } else {
        log(`❌ 无效的 ZIP 文件格式 (签名: ${signature})`, 'red');
        return false;
      }
    } catch (error) {
      log(`❌ 无法读取 ZIP 文件: ${error.message}`, 'red');
      return false;
    }
  }

  // 其他文件类型的大小检查
  const minSizes = {
    'MSI': 5 * 1024 * 1024,    // 5MB
    'EXE': 10 * 1024 * 1024,   // 10MB
    'MSIX': 8 * 1024 * 1024    // 8MB
  };

  if (stats.size < minSizes[packageType]) {
    log(`⚠️ 文件大小可能过小 (< ${formatFileSize(minSizes[packageType])})`, 'yellow');
  } else {
    log(`✅ 文件大小正常`, 'green');
  }

  return true;
}

function findWindowsPackages() {
  const packages = [];
  const searchPaths = [
    'src-tauri/target/wix',
    'src-tauri/target/release/bundle/nsis',
    'src-tauri/target/release/bundle/msix',
    'src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis',
    'src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msix',
    'src-tauri/target/i686-pc-windows-msvc/release/bundle/nsis',
    'src-tauri/target/i686-pc-windows-msvc/release/bundle/msix'
  ];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const files = fs.readdirSync(searchPath);
      
      for (const file of files) {
        const filePath = path.join(searchPath, file);
        const ext = path.extname(file).toLowerCase();
        
        if (ext === '.msi') {
          packages.push({ path: filePath, type: 'MSI' });
        } else if (ext === '.exe' && file.includes('setup')) {
          packages.push({ path: filePath, type: 'EXE' });
        } else if (ext === '.msix') {
          packages.push({ path: filePath, type: 'MSIX' });
        } else if (ext === '.zip') {
          packages.push({ path: filePath, type: 'ZIP' });
        }
      }
    }
  }

  return packages;
}

function validateConfigurations() {
  log('\n🔧 验证配置文件...', 'cyan');
  
  const configs = [
    'src-tauri/tauri.conf.json',
    'src-tauri/tauri.windows-cargo-wix.conf.json',
    'src-tauri/tauri.windows-msix.conf.json'
  ];

  let allValid = true;

  for (const configPath of configs) {
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const version = config.version;
        
        log(`✅ ${path.basename(configPath)}: v${version}`, 'green');
        
        // 检查必要的配置
        if (configPath.includes('msix') && config.bundle && config.bundle.windows && config.bundle.windows.msix) {
          log(`  📱 MSIX 配置完整`, 'blue');
        }
        
        if (configPath.includes('wix') && config.bundle && config.bundle.windows && config.bundle.windows.wix) {
          log(`  🔧 WiX 配置完整`, 'blue');
        }
        
      } catch (error) {
        log(`❌ ${path.basename(configPath)}: 配置文件解析失败`, 'red');
        allValid = false;
      }
    } else {
      log(`⚠️ ${path.basename(configPath)}: 配置文件不存在`, 'yellow');
    }
  }

  return allValid;
}

function main() {
  log('🔍 Windows 安装包验证工具', 'bright');
  log('═'.repeat(50), 'cyan');

  // 验证配置文件
  const configsValid = validateConfigurations();

  // 查找并验证安装包
  const packages = findWindowsPackages();
  
  if (packages.length === 0) {
    log('\n❌ 未找到任何 Windows 安装包', 'red');
    log('请先运行构建命令生成安装包:', 'yellow');
    log('  npm run build:windows:msi', 'yellow');
    log('  npm run build:windows:msix', 'yellow');
    process.exit(1);
  }

  log(`\n📦 找到 ${packages.length} 个安装包:`, 'cyan');
  
  let allValid = true;
  const packageSummary = {};

  for (const pkg of packages) {
    const isValid = validatePackage(pkg.path, pkg.type);
    allValid = allValid && isValid;
    
    if (!packageSummary[pkg.type]) {
      packageSummary[pkg.type] = 0;
    }
    packageSummary[pkg.type]++;
  }

  // 输出摘要
  log('\n📊 验证摘要:', 'cyan');
  log('═'.repeat(30), 'cyan');
  
  for (const [type, count] of Object.entries(packageSummary)) {
    log(`${type} 包: ${count} 个`, 'blue');
  }

  if (allValid && configsValid) {
    log('\n✅ 所有 Windows 安装包验证通过!', 'green');
    process.exit(0);
  } else {
    log('\n❌ 验证失败，请检查上述问题', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validatePackage,
  findWindowsPackages,
  validateConfigurations
};
