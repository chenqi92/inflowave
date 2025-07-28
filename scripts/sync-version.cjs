#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 统一版本管理脚本
 * 一次性更新所有文件中的版本号:
 * - package.json
 * - tauri.conf.json
 * - tauri.arm64.conf.json
 * - tauri.windows-nsis-only.conf.json
 * - tauri.linux.conf.json
 * - tauri.macos.conf.json
 * - tauri.windows.conf.json
 * - Cargo.toml
 * - README.md (中文)
 * - README-en.md (英文)
 */

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const tauriConfigPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriArm64ConfigPath = path.join(rootDir, 'src-tauri', 'tauri.arm64.conf.json');
const tauriWindowsNsisConfigPath = path.join(rootDir, 'src-tauri', 'tauri.windows-nsis-only.conf.json');
const tauriLinuxConfigPath = path.join(rootDir, 'src-tauri', 'tauri.linux.conf.json');
const tauriMacosConfigPath = path.join(rootDir, 'src-tauri', 'tauri.macos.conf.json');
const tauriWindowsConfigPath = path.join(rootDir, 'src-tauri', 'tauri.windows.conf.json');
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const readmeCnPath = path.join(rootDir, 'README.md');
const readmeEnPath = path.join(rootDir, 'README-en.md');

/**
 * 读取当前版本号
 */
function getCurrentVersion() {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
}

/**
 * 更新 package.json 版本
 */
function updatePackageJson(version) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    console.log(`✅ 更新 package.json 版本为: ${version}`);
}

/**
 * 更新单个 Tauri 配置文件版本
 */
function updateSingleTauriConfig(configPath, version) {
    if (!fs.existsSync(configPath)) {
        console.warn(`⚠️ 配置文件不存在: ${path.basename(configPath)}`);
        return false;
    }
    
    try {
        const tauriConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        tauriConfig.version = version;
        fs.writeFileSync(configPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);
        console.log(`✅ 更新 ${path.basename(configPath)} 版本为: ${version}`);
        return true;
    } catch (error) {
        console.error(`❌ 更新 ${path.basename(configPath)} 失败:`, error.message);
        return false;
    }
}

/**
 * 更新所有 Tauri 配置文件版本
 */
function updateTauriConfig(version) {
    console.log('📦 更新Tauri配置文件...');
    
    const tauriConfigFiles = [
        { path: tauriConfigPath, name: 'tauri.conf.json' },
        { path: tauriArm64ConfigPath, name: 'tauri.arm64.conf.json' },
        { path: tauriWindowsNsisConfigPath, name: 'tauri.windows-nsis-only.conf.json' },
        { path: tauriLinuxConfigPath, name: 'tauri.linux.conf.json' },
        { path: tauriMacosConfigPath, name: 'tauri.macos.conf.json' },
        { path: tauriWindowsConfigPath, name: 'tauri.windows.conf.json' }
    ];
    
    let successCount = 0;
    tauriConfigFiles.forEach(config => {
        if (updateSingleTauriConfig(config.path, version)) {
            successCount++;
        }
    });
    
    console.log(`📦 Tauri配置文件更新完成: ${successCount}/${tauriConfigFiles.length} 个文件`);
    return successCount;
}

/**
 * 更新 Cargo.toml 版本
 */
function updateCargoToml(version) {
    let cargoContent = fs.readFileSync(cargoTomlPath, 'utf8');
    cargoContent = cargoContent.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
    fs.writeFileSync(cargoTomlPath, cargoContent);
    console.log(`✅ 更新 Cargo.toml 版本为: ${version}`);
}

/**
 * 更新README文件中的版本号
 */
function updateReadmeVersion(filePath, version) {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ 文件不存在: ${filePath}`);
        return false;
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 替换下载链接中的版本号
        const versionPattern = /InfloWave[_-](\d+\.\d+\.\d+)/g;
        const downloadLinkPattern = /https:\/\/github\.com\/chenqi92\/inflowave\/releases\/download\/v(\d+\.\d+\.\d+)\//g;
        
        // 记录替换次数
        let replacements = 0;
        
        // 替换下载链接中的版本号
        content = content.replace(downloadLinkPattern, (match, oldVersion) => {
            replacements++;
            return match.replace(`v${oldVersion}`, `v${version}`);
        });
        
        // 替换文件名中的版本号
        content = content.replace(versionPattern, (match, oldVersion) => {
            replacements++;
            return match.replace(oldVersion, version);
        });
        
        // 写回文件
        fs.writeFileSync(filePath, content, 'utf8');
        
        const fileName = path.basename(filePath);
        console.log(`✅ 更新 ${fileName} 版本号: ${replacements} 处替换`);
        return true;
    } catch (error) {
        console.error(`❌ 更新文件失败 ${filePath}:`, error.message);
        return false;
    }
}

/**
 * 更新所有README文件
 */
function updateAllReadmes(version) {
    console.log('📝 更新README文件中的版本号...');
    
    const readmeFiles = [
        { path: readmeCnPath, name: 'README.md (中文)' },
        { path: readmeEnPath, name: 'README-en.md (英文)' }
    ];
    
    let successCount = 0;
    readmeFiles.forEach(file => {
        if (updateReadmeVersion(file.path, version)) {
            successCount++;
        }
    });
    
    if (successCount === readmeFiles.length) {
        console.log(`✅ 所有README文件更新完成`);
    } else {
        console.warn(`⚠️ 部分README文件更新失败 (${successCount}/${readmeFiles.length})`);
    }
    
    return successCount === readmeFiles.length;
}

/**
 * 验证版本格式
 */
function isValidVersion(version) {
    const versionRegex = /^\d+\.\d+\.\d+(-[\w.-]+)?$/;
    return versionRegex.test(version);
}

/**
 * 读取单个 Tauri 配置文件版本
 */
function getSingleTauriVersion(configPath) {
    if (!fs.existsSync(configPath)) {
        return 'not found';
    }
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.version || 'unknown';
    } catch (error) {
        return 'invalid';
    }
}

/**
 * 获取所有文件当前版本
 */
function getAllVersions() {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const cargoContent = fs.readFileSync(cargoTomlPath, 'utf8');
    const cargoMatch = cargoContent.match(/^version\s*=\s*"([^"]*)"/m);
    const cargoVersion = cargoMatch ? cargoMatch[1] : 'unknown';

    return {
        packageJson: packageJson.version,
        tauriConfig: getSingleTauriVersion(tauriConfigPath),
        tauriArm64Config: getSingleTauriVersion(tauriArm64ConfigPath),
        tauriWindowsNsisConfig: getSingleTauriVersion(tauriWindowsNsisConfigPath),
        tauriLinuxConfig: getSingleTauriVersion(tauriLinuxConfigPath),
        tauriMacosConfig: getSingleTauriVersion(tauriMacosConfigPath),
        tauriWindowsConfig: getSingleTauriVersion(tauriWindowsConfigPath),
        cargoToml: cargoVersion
    };
}

/**
 * 检查版本是否统一
 */
function checkVersionConsistency() {
    const versions = getAllVersions();
    const packageVersion = versions.packageJson;
    
    // 检查所有有效的Tauri配置文件版本是否与package.json一致
    const tauriVersions = [
        versions.tauriConfig,
        versions.tauriArm64Config,
        versions.tauriWindowsNsisConfig,
        versions.tauriLinuxConfig,
        versions.tauriMacosConfig,
        versions.tauriWindowsConfig
    ];
    
    const validTauriVersions = tauriVersions.filter(v => v !== 'not found' && v !== 'invalid');
    const isConsistent = 
        versions.cargoToml === packageVersion && 
        validTauriVersions.every(v => v === packageVersion);
    
    return { isConsistent, versions, packageVersion };
}

/**
 * 同步所有版本
 */
function syncVersions(targetVersion = null) {
    console.log('🔍 检查版本一致性...');
    
    const { isConsistent, versions, packageVersion } = checkVersionConsistency();
    
    console.log('📋 当前版本状态:');
    console.log(`  package.json:                    ${versions.packageJson}`);
    console.log(`  tauri.conf.json:                 ${versions.tauriConfig}`);
    console.log(`  tauri.arm64.conf.json:           ${versions.tauriArm64Config}`);
    console.log(`  tauri.windows-nsis-only.conf.json: ${versions.tauriWindowsNsisConfig}`);
    console.log(`  tauri.linux.conf.json:           ${versions.tauriLinuxConfig}`);
    console.log(`  tauri.macos.conf.json:           ${versions.tauriMacosConfig}`);
    console.log(`  tauri.windows.conf.json:         ${versions.tauriWindowsConfig}`);
    console.log(`  Cargo.toml:                      ${versions.cargoToml}`);
    
    const finalVersion = targetVersion || packageVersion;
    
    if (!isValidVersion(finalVersion)) {
        console.error(`❌ 无效的版本格式: ${finalVersion}`);
        process.exit(1);
    }
    
    if (isConsistent && !targetVersion) {
        console.log(`✅ 所有版本已统一为: ${packageVersion}`);
        return packageVersion;
    }
    
    console.log(`🔄 同步版本到: ${finalVersion}`);
    console.log('');
    
    // 更新配置文件
    console.log('📦 更新配置文件...');
    updatePackageJson(finalVersion);
    updateTauriConfig(finalVersion);
    updateCargoToml(finalVersion);
    
    console.log('');
    
    // 更新README文件
    const readmeSuccess = updateAllReadmes(finalVersion);
    
    console.log('');
    console.log(`🎉 版本同步完成: ${finalVersion}`);
    
    if (!readmeSuccess) {
        console.log('💡 提示: 如果README更新有问题，请检查文件格式或手动运行: npm run readme:update');
    }
    
    return finalVersion;
}

/**
 * 增加版本号
 */
function bumpVersion(type = 'patch') {
    const currentVersion = getCurrentVersion();
    const versionParts = currentVersion.split('.');
    let [major, minor, patch] = versionParts.map(Number);
    
    switch (type) {
        case 'major':
            major++;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor++;
            patch = 0;
            break;
        case 'patch':
        default:
            patch++;
            break;
    }
    
    const newVersion = `${major}.${minor}.${patch}`;
    console.log(`📈 版本升级: ${currentVersion} → ${newVersion} (${type})`);
    
    return syncVersions(newVersion);
}

/**
 * 创建版本标签
 */
function createVersionTag(version) {
    const { execSync } = require('child_process');
    
    try {
        // 检查是否有未提交的更改
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        if (status.trim()) {
            console.log('📝 检测到未提交的更改，正在提交...');
            execSync('git add -A');
            execSync(`git commit -m "chore: bump version to ${version}"`);
        }
        
        // 创建标签
        execSync(`git tag -a v${version} -m "Release v${version}"`);
        console.log(`🏷️  创建版本标签: v${version}`);
        
        // 推送标签
        execSync('git push origin --tags');
        console.log(`🚀 推送标签到远程仓库`);
        
    } catch (error) {
        console.error('❌ Git 操作失败:', error.message);
    }
}

// 命令行接口
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // 默认同步版本
        syncVersions();
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'check': {
            const { isConsistent, versions } = checkVersionConsistency();
            console.log('📋 版本检查结果:');
            console.log(`  package.json:                    ${versions.packageJson}`);
            console.log(`  tauri.conf.json:                 ${versions.tauriConfig}`);
            console.log(`  tauri.arm64.conf.json:           ${versions.tauriArm64Config}`);
            console.log(`  tauri.windows-nsis-only.conf.json: ${versions.tauriWindowsNsisConfig}`);
            console.log(`  tauri.linux.conf.json:           ${versions.tauriLinuxConfig}`);
            console.log(`  tauri.macos.conf.json:           ${versions.tauriMacosConfig}`);
            console.log(`  tauri.windows.conf.json:         ${versions.tauriWindowsConfig}`);
            console.log(`  Cargo.toml:                      ${versions.cargoToml}`);
            console.log(`  状态: ${isConsistent ? '✅ 统一' : '❌ 不统一'}`);
            break;
        }
            
        case 'sync': {
            const targetVersion = args[1];
            syncVersions(targetVersion);
            break;
        }
            
        case 'bump': {
            const bumpType = args[1] || 'patch';
            if (!['major', 'minor', 'patch'].includes(bumpType)) {
                console.error('❌ 无效的版本类型，应为: major, minor, patch');
                process.exit(1);
            }
            const newVersion = bumpVersion(bumpType);
            
            // 可选择是否创建Git标签
            if (args.includes('--tag')) {
                createVersionTag(newVersion);
            }
            break;
        }
            
        case 'tag': {
            const currentVersion = getCurrentVersion();
            createVersionTag(currentVersion);
            break;
        }
            
        default:
            console.log(`
📦 统一版本管理工具

🎯 功能:
  一次性更新所有文件中的版本号，包括:
  • package.json
  • tauri.conf.json
  • tauri.arm64.conf.json
  • tauri.windows-nsis-only.conf.json
  • tauri.linux.conf.json
  • tauri.macos.conf.json
  • tauri.windows.conf.json
  • Cargo.toml
  • README.md (中文)
  • README-en.md (英文)

📋 使用方法:
  node scripts/sync-version.cjs [command] [options]

🛠️ 命令:
  check               检查所有文件版本一致性
  sync [version]      同步版本号到指定版本（默认使用package.json版本）
  bump [type]         增加版本号 (major|minor|patch，默认patch)
  bump [type] --tag   增加版本号并创建Git标签
  tag                 为当前版本创建Git标签

✨ 特点:
  • 智能版本检测和验证
  • 安全的正则表达式替换
  • 详细的操作日志
  • 错误处理和回滚建议

💡 NPM快捷方式:
  npm run version:sync        # 同步版本
  npm run version:bump        # 升级patch版本
  npm run version:bump:minor  # 升级minor版本  
  npm run version:bump:major  # 升级major版本

示例:
  node scripts/sync-version.cjs                    # 同步版本
  node scripts/sync-version.cjs check              # 检查版本
  node scripts/sync-version.cjs sync 1.2.0         # 同步到指定版本
  node scripts/sync-version.cjs bump patch         # 增加补丁版本
  node scripts/sync-version.cjs bump minor --tag   # 增加次版本并创建标签
            `);
            break;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    getCurrentVersion,
    syncVersions,
    bumpVersion,
    checkVersionConsistency,
    createVersionTag
};