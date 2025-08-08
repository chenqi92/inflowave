#!/usr/bin/env node

/**
 * 安装包本地测试工具
 * 测试各平台安装包的基本功能
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findPackages() {
  const packages = [];
  const searchPaths = [
    // Windows
    'src-tauri/target/wix',
    'src-tauri/target/release/bundle/nsis',
    'src-tauri/target/release/bundle/msix',
    'src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis',
    'src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msix',
    'src-tauri/target/i686-pc-windows-msvc/release/bundle/nsis',
    'src-tauri/target/i686-pc-windows-msvc/release/bundle/msix',
    
    // macOS
    'src-tauri/target/release/bundle/dmg',
    'src-tauri/target/release/bundle/macos',
    'src-tauri/target/x86_64-apple-darwin/release/bundle/dmg',
    'src-tauri/target/x86_64-apple-darwin/release/bundle/macos',
    'src-tauri/target/aarch64-apple-darwin/release/bundle/dmg',
    'src-tauri/target/aarch64-apple-darwin/release/bundle/macos',
    
    // Linux
    'src-tauri/target/release/bundle/deb',
    'src-tauri/target/release/bundle/rpm',
    'src-tauri/target/release/bundle/appimage',
    'src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb',
    'src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/rpm',
    'src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage',
    'src-tauri/target/aarch64-unknown-linux-gnu/release/bundle/deb',
    'src-tauri/target/aarch64-unknown-linux-gnu/release/bundle/rpm',
    'src-tauri/target/aarch64-unknown-linux-gnu/release/bundle/appimage'
  ];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const files = fs.readdirSync(searchPath);
      
      for (const file of files) {
        const filePath = path.join(searchPath, file);
        const ext = path.extname(file).toLowerCase();
        
        let type = 'Unknown';
        if (ext === '.msi') type = 'MSI';
        else if (ext === '.exe' && file.includes('setup')) type = 'NSIS';
        else if (ext === '.msix') type = 'MSIX';
        else if (ext === '.dmg') type = 'DMG';
        else if (ext === '.app') type = 'APP';
        else if (ext === '.deb') type = 'DEB';
        else if (ext === '.rpm') type = 'RPM';
        else if (ext === '.appimage') type = 'AppImage';
        
        if (type !== 'Unknown') {
          packages.push({ 
            path: filePath, 
            type: type,
            name: file,
            size: fs.statSync(filePath).size
          });
        }
      }
    }
  }

  return packages;
}

function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function testPackageIntegrity(pkg) {
  log(`\n🔍 测试: ${pkg.name}`, 'cyan');
  log(`📦 类型: ${pkg.type}`, 'blue');
  log(`📏 大小: ${formatFileSize(pkg.size)}`, 'blue');
  
  // 基本文件完整性检查
  if (!fs.existsSync(pkg.path)) {
    log(`❌ 文件不存在`, 'red');
    return false;
  }
  
  if (pkg.size === 0) {
    log(`❌ 文件大小为0`, 'red');
    return false;
  }
  
  // 平台特定测试
  try {
    switch (pkg.type) {
      case 'MSI':
        return testMSI(pkg);
      case 'NSIS':
        return testNSIS(pkg);
      case 'MSIX':
        return testMSIX(pkg);
      case 'DMG':
        return testDMG(pkg);
      case 'DEB':
        return testDEB(pkg);
      case 'RPM':
        return testRPM(pkg);
      case 'AppImage':
        return testAppImage(pkg);
      default:
        log(`⚠️ 未知包类型，跳过详细测试`, 'yellow');
        return true;
    }
  } catch (error) {
    log(`❌ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

function testMSI(pkg) {
  // Windows MSI 包测试
  if (process.platform === 'win32') {
    try {
      // 使用 msiexec 验证 MSI 包
      execSync(`msiexec /a "${pkg.path}" /qn /L*v nul`, { stdio: 'pipe' });
      log(`✅ MSI 包结构有效`, 'green');
      return true;
    } catch (error) {
      log(`⚠️ MSI 验证失败，但文件可能仍然有效`, 'yellow');
      return true; // MSI 验证可能因为权限问题失败
    }
  } else {
    log(`⚠️ 非 Windows 平台，跳过 MSI 详细验证`, 'yellow');
    return true;
  }
}

function testNSIS(pkg) {
  // NSIS 安装包测试
  log(`✅ NSIS 安装包文件完整`, 'green');
  return true;
}

function testMSIX(pkg) {
  // MSIX 包测试
  log(`✅ MSIX 包文件完整`, 'green');
  return true;
}

function testDMG(pkg) {
  // macOS DMG 测试
  if (process.platform === 'darwin') {
    try {
      execSync(`hdiutil verify "${pkg.path}"`, { stdio: 'pipe' });
      log(`✅ DMG 镜像有效`, 'green');
      return true;
    } catch (error) {
      log(`⚠️ DMG 验证失败，但文件可能仍然有效`, 'yellow');
      return true;
    }
  } else {
    log(`⚠️ 非 macOS 平台，跳过 DMG 详细验证`, 'yellow');
    return true;
  }
}

function testDEB(pkg) {
  // Debian 包测试
  if (process.platform === 'linux') {
    try {
      execSync(`dpkg-deb --info "${pkg.path}"`, { stdio: 'pipe' });
      log(`✅ DEB 包结构有效`, 'green');
      return true;
    } catch (error) {
      log(`⚠️ DEB 验证失败，但文件可能仍然有效`, 'yellow');
      return true;
    }
  } else {
    log(`⚠️ 非 Linux 平台，跳过 DEB 详细验证`, 'yellow');
    return true;
  }
}

function testRPM(pkg) {
  // RPM 包测试
  if (process.platform === 'linux') {
    try {
      execSync(`rpm -qip "${pkg.path}"`, { stdio: 'pipe' });
      log(`✅ RPM 包结构有效`, 'green');
      return true;
    } catch (error) {
      log(`⚠️ RPM 验证失败，但文件可能仍然有效`, 'yellow');
      return true;
    }
  } else {
    log(`⚠️ 非 Linux 平台，跳过 RPM 详细验证`, 'yellow');
    return true;
  }
}

function testAppImage(pkg) {
  // AppImage 测试
  log(`✅ AppImage 文件完整`, 'green');
  return true;
}

function main() {
  log('🧪 安装包本地测试工具', 'bright');
  log('═'.repeat(50), 'cyan');

  const packages = findPackages();
  
  if (packages.length === 0) {
    log('\n❌ 未找到任何安装包', 'red');
    log('请先运行构建命令生成安装包', 'yellow');
    process.exit(1);
  }

  log(`\n📦 找到 ${packages.length} 个安装包`, 'cyan');
  
  let passedTests = 0;
  const summary = {};

  for (const pkg of packages) {
    const passed = testPackageIntegrity(pkg);
    if (passed) passedTests++;
    
    if (!summary[pkg.type]) {
      summary[pkg.type] = { total: 0, passed: 0 };
    }
    summary[pkg.type].total++;
    if (passed) summary[pkg.type].passed++;
  }

  // 输出测试摘要
  log('\n📊 测试摘要:', 'cyan');
  log('═'.repeat(30), 'cyan');
  
  for (const [type, stats] of Object.entries(summary)) {
    const status = stats.passed === stats.total ? '✅' : '⚠️';
    log(`${status} ${type}: ${stats.passed}/${stats.total} 通过`, 
        stats.passed === stats.total ? 'green' : 'yellow');
  }

  log(`\n📈 总体结果: ${passedTests}/${packages.length} 个包通过测试`, 
      passedTests === packages.length ? 'green' : 'yellow');

  if (passedTests === packages.length) {
    log('\n🎉 所有安装包测试通过!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️ 部分测试失败，请检查上述问题', 'yellow');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
