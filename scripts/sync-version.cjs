#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 版本管理脚本
 * 同步 package.json、tauri.conf.json 和 Cargo.toml 的版本号
 */

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const tauriConfigPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');

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
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ 更新 package.json 版本为: ${version}`);
}

/**
 * 更新 tauri.conf.json 版本
 */
function updateTauriConfig(version) {
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
    tauriConfig.version = version;
    fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + '\n');
    console.log(`✅ 更新 tauri.conf.json 版本为: ${version}`);
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
 * 验证版本格式
 */
function isValidVersion(version) {
    const versionRegex = /^\d+\.\d+\.\d+(-[\w.-]+)?$/;
    return versionRegex.test(version);
}

/**
 * 获取所有文件当前版本
 */
function getAllVersions() {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
    const cargoContent = fs.readFileSync(cargoTomlPath, 'utf8');
    const cargoMatch = cargoContent.match(/^version\s*=\s*"([^"]*)"/m);
    const cargoVersion = cargoMatch ? cargoMatch[1] : 'unknown';

    return {
        packageJson: packageJson.version,
        tauriConfig: tauriConfig.version,
        cargoToml: cargoVersion
    };
}

/**
 * 检查版本是否统一
 */
function checkVersionConsistency() {
    const versions = getAllVersions();
    const packageVersion = versions.packageJson;
    
    const isConsistent = 
        versions.tauriConfig === packageVersion && 
        versions.cargoToml === packageVersion;
    
    return { isConsistent, versions, packageVersion };
}

/**
 * 同步所有版本
 */
function syncVersions(targetVersion = null) {
    console.log('🔍 检查版本一致性...');
    
    const { isConsistent, versions, packageVersion } = checkVersionConsistency();
    
    console.log('📋 当前版本状态:');
    console.log(`  package.json:    ${versions.packageJson}`);
    console.log(`  tauri.conf.json: ${versions.tauriConfig}`);
    console.log(`  Cargo.toml:      ${versions.cargoToml}`);
    
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
    
    updatePackageJson(finalVersion);
    updateTauriConfig(finalVersion);
    updateCargoToml(finalVersion);
    
    console.log(`🎉 版本同步完成: ${finalVersion}`);
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
        case 'check':
            const { isConsistent, versions } = checkVersionConsistency();
            console.log('📋 版本检查结果:');
            console.log(`  package.json:    ${versions.packageJson}`);
            console.log(`  tauri.conf.json: ${versions.tauriConfig}`);
            console.log(`  Cargo.toml:      ${versions.cargoToml}`);
            console.log(`  状态: ${isConsistent ? '✅ 统一' : '❌ 不统一'}`);
            break;
            
        case 'sync':
            const targetVersion = args[1];
            syncVersions(targetVersion);
            break;
            
        case 'bump':
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
            
        case 'tag':
            const currentVersion = getCurrentVersion();
            createVersionTag(currentVersion);
            break;
            
        default:
            console.log(`
📦 版本管理工具

使用方法:
  node scripts/sync-version.cjs [command] [options]

命令:
  check           检查版本一致性
  sync [version]  同步版本号（可选指定版本）
  bump [type]     增加版本号 (major|minor|patch)
  bump [type] --tag  增加版本号并创建Git标签
  tag             为当前版本创建Git标签

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