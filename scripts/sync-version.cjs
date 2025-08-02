#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 统一版本管理脚本
 * 一次性更新所有文件中的版本号:
 * - package.json
 * - tauri.conf.json
 * - tauri.arm64.conf.json
 * - tauri.windows-nsis-only.conf.json
 * - tauri.windows-full.conf.json
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
const tauriLinuxConfigPath = path.join(rootDir, 'src-tauri', 'tauri.linux.conf.json');
const tauriMacosConfigPath = path.join(rootDir, 'src-tauri', 'tauri.macos.conf.json');
const tauriWindowsConfigPath = path.join(rootDir, 'src-tauri', 'tauri.windows.conf.json');
const tauriWindowsCargoWixConfigPath = path.join(rootDir, 'src-tauri', 'tauri.windows-cargo-wix.conf.json');
const tauriWindowsNsisConfigPath = path.join(rootDir, 'src-tauri', 'tauri.windows-nsis.conf.json');
const tauriWindowsNsisOnlyConfigPath = path.join(rootDir, 'src-tauri', 'tauri.windows-nsis-only.conf.json');

const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const readmeCnPath = path.join(rootDir, 'README.md');
const readmeEnPath = path.join(rootDir, 'README-en.md');

// 颜色输出支持
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

// 日志工具
const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
    step: (msg) => console.log(`${colors.cyan}🔄${colors.reset} ${msg}`),
    title: (msg) => console.log(`${colors.bright}${colors.magenta}📦 ${msg}${colors.reset}`),
    divider: () => console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`)
};

/**
 * 安全地读取JSON文件
 */
function safeReadJson(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        log.error(`读取文件失败 ${path.basename(filePath)}: ${error.message}`);
        return null;
    }
}

/**
 * 安全地写入JSON文件
 */
function safeWriteJson(filePath, data) {
    try {
        const content = JSON.stringify(data, null, 2) + '\n';
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    } catch (error) {
        log.error(`写入文件失败 ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

/**
 * 读取当前版本号
 */
function getCurrentVersion() {
    const packageJson = safeReadJson(packageJsonPath);
    if (!packageJson) {
        log.error('无法读取 package.json');
        process.exit(1);
    }
    return packageJson.version;
}

/**
 * 备份文件
 */
function backupFile(filePath) {
    return true;
    if (!fs.existsSync(filePath)) {
        return false;
    }

    const backupPath = `${filePath}.backup.${Date.now()}`;
    try {
        fs.copyFileSync(filePath, backupPath);
        return backupPath;
    } catch (error) {
        log.warning(`备份文件失败 ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

/**
 * 更新 package.json 版本
 */
function updatePackageJson(version, createBackup = true) {
    if (createBackup) {
        backupFile(packageJsonPath);
    }

    const packageJson = safeReadJson(packageJsonPath);
    if (!packageJson) {
        return false;
    }

    packageJson.version = version;

    if (safeWriteJson(packageJsonPath, packageJson)) {
        log.success(`更新 package.json 版本为: ${version}`);
        return true;
    }
    return false;
}

/**
 * 更新单个 Tauri 配置文件版本
 */
function updateSingleTauriConfig(configPath, version, createBackup = true) {
    if (!fs.existsSync(configPath)) {
        log.warning(`配置文件不存在: ${path.basename(configPath)}`);
        return false;
    }

    if (createBackup) {
        backupFile(configPath);
    }

    const tauriConfig = safeReadJson(configPath);
    if (!tauriConfig) {
        return false;
    }

    tauriConfig.version = version;

    if (safeWriteJson(configPath, tauriConfig)) {
        log.success(`更新 ${path.basename(configPath)} 版本为: ${version}`);
        return true;
    }
    return false;
}

/**
 * 获取所有Tauri配置文件列表
 */
function getTauriConfigFiles() {
    return [
        { path: tauriConfigPath, name: 'tauri.conf.json', required: true },
        { path: tauriArm64ConfigPath, name: 'tauri.arm64.conf.json', required: false },
        { path: tauriLinuxConfigPath, name: 'tauri.linux.conf.json', required: false },
        { path: tauriMacosConfigPath, name: 'tauri.macos.conf.json', required: false },
        { path: tauriWindowsConfigPath, name: 'tauri.windows.conf.json', required: false },
        { path: tauriWindowsCargoWixConfigPath, name: 'tauri.windows-cargo-wix.conf.json', required: false },
        { path: tauriWindowsNsisConfigPath, name: 'tauri.windows-nsis.conf.json', required: false },
        { path: tauriWindowsNsisOnlyConfigPath, name: 'tauri.windows-nsis-only.conf.json', required: false }
    ];
}

/**
 * 更新所有 Tauri 配置文件版本
 */
function updateTauriConfig(version, createBackup = true) {
    log.step('更新Tauri配置文件...');

    const tauriConfigFiles = getTauriConfigFiles();
    let successCount = 0;
    let totalFiles = 0;

    tauriConfigFiles.forEach(config => {
        if (fs.existsSync(config.path)) {
            totalFiles++;
            if (updateSingleTauriConfig(config.path, version, createBackup)) {
                successCount++;
            }
        } else if (config.required) {
            log.error(`必需的配置文件不存在: ${config.name}`);
        }
    });

    if (successCount === totalFiles) {
        log.success(`Tauri配置文件更新完成: ${successCount}/${totalFiles} 个文件`);
    } else {
        log.warning(`Tauri配置文件部分更新: ${successCount}/${totalFiles} 个文件`);
    }

    return successCount;
}

/**
 * 更新 Cargo.toml 版本
 */
function updateCargoToml(version, createBackup = true) {
    if (!fs.existsSync(cargoTomlPath)) {
        log.error('Cargo.toml 文件不存在');
        return false;
    }

    if (createBackup) {
        backupFile(cargoTomlPath);
    }

    try {
        let cargoContent = fs.readFileSync(cargoTomlPath, 'utf8');
        const originalContent = cargoContent;

        // 更新版本号，支持多种格式
        cargoContent = cargoContent.replace(
            /^version\s*=\s*["'][^"']*["']/m,
            `version = "${version}"`
        );

        // 检查是否有更改
        if (cargoContent === originalContent) {
            log.warning('Cargo.toml 中未找到版本字段或格式不匹配');
            return false;
        }

        fs.writeFileSync(cargoTomlPath, cargoContent, 'utf8');
        log.success(`更新 Cargo.toml 版本为: ${version}`);
        return true;
    } catch (error) {
        log.error(`更新 Cargo.toml 失败: ${error.message}`);
        return false;
    }
}

/**
 * 更新README文件中的版本号
 */
function updateReadmeVersion(filePath, version, createBackup = true) {
    if (!fs.existsSync(filePath)) {
        log.warning(`文件不存在: ${path.basename(filePath)}`);
        return false;
    }

    if (createBackup) {
        backupFile(filePath);
    }

    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // 定义多种版本号匹配模式
        const patterns = [
            // GitHub下载链接中的版本号
            {
                regex: /https:\/\/github\.com\/chenqi92\/inflowave\/releases\/download\/v(\d+\.\d+\.\d+)\//g,
                replacement: (match, oldVersion) => match.replace(`v${oldVersion}`, `v${version}`),
                description: 'GitHub下载链接'
            },
            // Windows文件名中的版本号 (InfloWave_1.2.3 或 InfloWave-1.2.3)
            {
                regex: /InfloWave[_-](\d+\.\d+\.\d+)/g,
                replacement: (match, oldVersion) => match.replace(oldVersion, version),
                description: 'Windows文件名版本号'
            },
            // Linux文件名中的版本号 (inflowave_1.2.3 或 inflowave-1.2.3)
            {
                regex: /inflowave[_-](\d+\.\d+\.\d+)/g,
                replacement: (match, oldVersion) => match.replace(oldVersion, version),
                description: 'Linux文件名版本号'
            },
            // 版本徽章
            {
                regex: /version-(\d+\.\d+\.\d+)-/g,
                replacement: (match, oldVersion) => match.replace(oldVersion, version),
                description: '版本徽章'
            },
            // 安装命令中的文件名版本号
            {
                regex: /(sudo\s+(?:dpkg\s+-i|rpm\s+-i|dnf\s+install)\s+[^\s]+[_-])(\d+\.\d+\.\d+)/g,
                replacement: (match, prefix, oldVersion) => match.replace(oldVersion, version),
                description: '安装命令中的版本号'
            },
            // AppImage和其他可执行文件的版本号
            {
                regex: /(chmod\s+\+x\s+[^\s]+[_-])(\d+\.\d+\.\d+)/g,
                replacement: (match, prefix, oldVersion) => match.replace(oldVersion, version),
                description: '可执行文件版本号'
            }
        ];

        let totalReplacements = 0;
        const replacementDetails = [];

        patterns.forEach(pattern => {
            let count = 0;
            content = content.replace(pattern.regex, (...args) => {
                count++;
                return pattern.replacement(...args);
            });

            if (count > 0) {
                totalReplacements += count;
                replacementDetails.push(`${pattern.description}: ${count}处`);
            }
        });

        // 检查是否有更改
        if (content === originalContent) {
            log.info(`${path.basename(filePath)} 无需更新版本号`);
            return true;
        }

        // 写回文件
        fs.writeFileSync(filePath, content, 'utf8');

        const fileName = path.basename(filePath);
        log.success(`更新 ${fileName} 版本号: ${totalReplacements} 处替换`);
        if (replacementDetails.length > 0) {
            replacementDetails.forEach(detail => log.info(`  - ${detail}`));
        }

        return true;
    } catch (error) {
        log.error(`更新文件失败 ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

/**
 * 更新所有README文件
 */
function updateAllReadmes(version, createBackup = true) {
    log.step('更新README文件中的版本号...');

    const readmeFiles = [
        { path: readmeCnPath, name: 'README.md (中文)' },
        { path: readmeEnPath, name: 'README-en.md (英文)' }
    ];

    let successCount = 0;
    let totalFiles = 0;

    readmeFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
            totalFiles++;
            if (updateReadmeVersion(file.path, version, createBackup)) {
                successCount++;
            }
        } else {
            log.warning(`README文件不存在: ${file.name}`);
        }
    });

    if (successCount === totalFiles && totalFiles > 0) {
        log.success(`所有README文件更新完成 (${successCount}/${totalFiles})`);
    } else if (totalFiles > 0) {
        log.warning(`部分README文件更新失败 (${successCount}/${totalFiles})`);
    } else {
        log.warning('未找到任何README文件');
    }

    return successCount === totalFiles;
}

/**
 * 验证版本格式
 */
function isValidVersion(version) {
    // 支持语义化版本格式: x.y.z 或 x.y.z-prerelease
    const versionRegex = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
    return versionRegex.test(version);
}

/**
 * 比较版本号
 */
function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;

        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }

    return 0;
}

/**
 * 清理备份文件
 */
function cleanupBackups(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7天
    const backupPattern = /\.backup\.\d+$/;
    const now = Date.now();

    function cleanDirectory(dir) {
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);
        let cleanedCount = 0;

        files.forEach(file => {
            if (backupPattern.test(file)) {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    try {
                        fs.unlinkSync(filePath);
                        cleanedCount++;
                    } catch (error) {
                        log.warning(`删除备份文件失败: ${file}`);
                    }
                }
            }
        });

        return cleanedCount;
    }

    let totalCleaned = 0;
    totalCleaned += cleanDirectory(rootDir);
    totalCleaned += cleanDirectory(path.join(rootDir, 'src-tauri'));

    if (totalCleaned > 0) {
        log.info(`清理了 ${totalCleaned} 个过期备份文件`);
    }
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
        tauriLinuxConfig: getSingleTauriVersion(tauriLinuxConfigPath),
        tauriMacosConfig: getSingleTauriVersion(tauriMacosConfigPath),
        tauriWindowsConfig: getSingleTauriVersion(tauriWindowsConfigPath),
        tauriWindowsCargoWixConfig: getSingleTauriVersion(tauriWindowsCargoWixConfigPath),
        tauriWindowsNsisConfig: getSingleTauriVersion(tauriWindowsNsisConfigPath),
        tauriWindowsNsisOnlyConfig: getSingleTauriVersion(tauriWindowsNsisOnlyConfigPath),
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
        versions.tauriLinuxConfig,
        versions.tauriMacosConfig,
        versions.tauriWindowsConfig,
        versions.tauriWindowsCargoWixConfig,
        versions.tauriWindowsNsisConfig,
        versions.tauriWindowsNsisOnlyConfig
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
function syncVersions(targetVersion = null, options = {}) {
    const {
        createBackup = false,  // 默认不创建备份
        skipReadme = false,
        dryRun = false,
        cleanBackups = false
    } = options;

    log.title('版本同步工具');
    log.divider();

    if (dryRun) {
        log.info('🔍 干运行模式 - 不会实际修改文件');
    }

    if (cleanBackups) {
        cleanupBackups();
    }

    log.step('检查版本一致性...');
    const { isConsistent, versions, packageVersion } = checkVersionConsistency();

    log.info('📋 当前版本状态:');
    log.info(`  package.json:                     ${versions.packageJson}`);
    log.info(`  tauri.conf.json:                  ${versions.tauriConfig}`);
    log.info(`  tauri.arm64.conf.json:            ${versions.tauriArm64Config}`);
    log.info(`  tauri.linux.conf.json:            ${versions.tauriLinuxConfig}`);
    log.info(`  tauri.macos.conf.json:            ${versions.tauriMacosConfig}`);
    log.info(`  tauri.windows.conf.json:          ${versions.tauriWindowsConfig}`);
    log.info(`  tauri.windows-cargo-wix.conf.json:${versions.tauriWindowsCargoWixConfig}`);
    log.info(`  tauri.windows-nsis.conf.json:     ${versions.tauriWindowsNsisConfig}`);
    log.info(`  tauri.windows-nsis-only.conf.json:${versions.tauriWindowsNsisOnlyConfig}`);
    log.info(`  Cargo.toml:                       ${versions.cargoToml}`);

    const finalVersion = targetVersion || packageVersion;

    if (!isValidVersion(finalVersion)) {
        log.error(`无效的版本格式: ${finalVersion}`);
        log.info('版本格式应为: x.y.z 或 x.y.z-prerelease');
        process.exit(1);
    }

    if (isConsistent && !targetVersion) {
        log.success(`所有版本已统一为: ${packageVersion}`);
        return packageVersion;
    }

    log.divider();
    log.step(`同步版本到: ${finalVersion}`);

    if (dryRun) {
        log.info('干运行模式 - 以下是将要执行的操作:');
        log.info('  - 更新 package.json');
        log.info('  - 更新 Tauri 配置文件');
        log.info('  - 更新 Cargo.toml');
        if (!skipReadme) {
            log.info('  - 更新 README 文件');
        }
        return finalVersion;
    }

    let allSuccess = true;

    // 更新配置文件
    log.step('更新配置文件...');
    if (!updatePackageJson(finalVersion, createBackup)) allSuccess = false;
    if (updateTauriConfig(finalVersion, createBackup) === 0) allSuccess = false;
    if (!updateCargoToml(finalVersion, createBackup)) allSuccess = false;

    // 更新README文件
    if (!skipReadme) {
        log.divider();
        if (!updateAllReadmes(finalVersion, createBackup)) {
            log.warning('README文件更新有问题，但不影响主要功能');
        }
    }

    log.divider();
    if (allSuccess) {
        log.success(`🎉 版本同步完成: ${finalVersion}`);
    } else {
        log.warning(`⚠️ 版本同步部分完成: ${finalVersion}`);
        log.info('请检查上述错误信息，某些文件可能需要手动更新');
    }

    if (createBackup) {
        log.info('💡 提示: 备份文件已创建，如有问题可以恢复');
    }

    return finalVersion;
}

/**
 * 增加版本号
 */
function bumpVersion(type = 'patch', options = {}) {
    const currentVersion = getCurrentVersion();

    // 处理预发布版本
    const versionMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!versionMatch) {
        log.error(`无法解析当前版本: ${currentVersion}`);
        process.exit(1);
    }

    let [, major, minor, patch, prerelease] = versionMatch;
    major = parseInt(major);
    minor = parseInt(minor);
    patch = parseInt(patch);

    let newVersion;

    switch (type) {
        case 'major':
            major++;
            minor = 0;
            patch = 0;
            prerelease = null;
            break;
        case 'minor':
            minor++;
            patch = 0;
            prerelease = null;
            break;
        case 'patch':
            patch++;
            prerelease = null;
            break;
        case 'prerelease':
            if (prerelease) {
                // 增加预发布版本号
                const prereleaseMatch = prerelease.match(/^(.+?)\.?(\d+)?$/);
                if (prereleaseMatch) {
                    const [, identifier, num] = prereleaseMatch;
                    const nextNum = num ? parseInt(num) + 1 : 1;
                    prerelease = `${identifier}.${nextNum}`;
                } else {
                    prerelease = `${prerelease}.1`;
                }
            } else {
                // 创建新的预发布版本
                patch++;
                prerelease = 'alpha.1';
            }
            break;
        default:
            log.error(`无效的版本类型: ${type}`);
            log.info('支持的类型: major, minor, patch, prerelease');
            process.exit(1);
    }

    newVersion = `${major}.${minor}.${patch}`;
    if (prerelease) {
        newVersion += `-${prerelease}`;
    }

    log.info(`📈 版本升级: ${currentVersion} → ${newVersion} (${type})`);

    return syncVersions(newVersion, options);
}

/**
 * 检查Git状态
 */
function checkGitStatus() {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        const hasChanges = status.trim().length > 0;

        const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();

        return {
            hasChanges,
            branch,
            changes: status.trim().split('\n').filter(line => line.trim())
        };
    } catch (error) {
        log.warning('无法获取Git状态，可能不在Git仓库中');
        return null;
    }
}

/**
 * 创建版本标签
 */
function createVersionTag(version, options = {}) {
    const {
        push = true,
        commit = true,
        commitMessage = null,
        force = false
    } = options;

    const gitStatus = checkGitStatus();
    if (!gitStatus) {
        log.error('不在Git仓库中，无法创建标签');
        return false;
    }

    try {
        log.step(`创建版本标签: v${version}`);

        // 检查标签是否已存在
        try {
            execSync(`git rev-parse v${version}`, { stdio: 'ignore' });
            if (!force) {
                log.error(`标签 v${version} 已存在，使用 --force 强制覆盖`);
                return false;
            } else {
                log.warning(`强制覆盖已存在的标签: v${version}`);
                execSync(`git tag -d v${version}`, { stdio: 'ignore' });
            }
        } catch {
            // 标签不存在，继续
        }

        // 检查是否有未提交的更改
        if (gitStatus.hasChanges && commit) {
            log.info('📝 检测到未提交的更改:');
            gitStatus.changes.forEach(change => log.info(`  ${change}`));

            log.step('提交更改...');
            execSync('git add -A');
            const message = commitMessage || `chore: bump version to ${version}`;
            execSync(`git commit -m "${message}"`);
            log.success('更改已提交');
        } else if (gitStatus.hasChanges) {
            log.warning('存在未提交的更改，但跳过自动提交');
        }

        // 创建标签
        execSync(`git tag -a v${version} -m "Release v${version}"`);
        log.success(`创建版本标签: v${version}`);

        // 推送标签
        if (push) {
            log.step('推送标签到远程仓库...');
            if (force) {
                execSync(`git push origin v${version} --force`);
            } else {
                execSync(`git push origin v${version}`);
            }
            log.success('标签已推送到远程仓库');
        }

        return true;
    } catch (error) {
        log.error(`Git 操作失败: ${error.message}`);
        return false;
    }
}

/**
 * 解析命令行参数
 */
function parseArgs(args) {
    const options = {
        createBackup: false,
        skipReadme: false,
        dryRun: false,
        cleanBackups: false,
        force: false,
        push: true,
        commit: true,
        commitMessage: null
    };

    const filteredArgs = [];

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--no-backup':
                options.createBackup = false;
                break;
            case '--skip-readme':
                options.skipReadme = true;
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
            case '--clean-backups':
                options.cleanBackups = true;
                break;
            case '--force':
                options.force = true;
                break;
            case '--no-push':
                options.push = false;
                break;
            case '--no-commit':
                options.commit = false;
                break;
            case '--commit-message':
                if (i + 1 < args.length) {
                    options.commitMessage = args[++i];
                }
                break;
            case '--tag':
                options.createTag = true;
                break;
            default:
                filteredArgs.push(arg);
        }
    }

    return { options, args: filteredArgs };
}

// 命令行接口
function main() {
    const rawArgs = process.argv.slice(2);
    const { options, args } = parseArgs(rawArgs);

    if (args.length === 0) {
        // 默认同步版本
        syncVersions(null, options);
        return;
    }

    const command = args[0];

    switch (command) {
        case 'check': {
            log.title('版本一致性检查');
            log.divider();

            const { isConsistent, versions } = checkVersionConsistency();

            log.info('📋 版本检查结果:');
            log.info(`  package.json:                     ${versions.packageJson}`);
            log.info(`  tauri.conf.json:                  ${versions.tauriConfig}`);
            log.info(`  tauri.arm64.conf.json:            ${versions.tauriArm64Config}`);
            log.info(`  tauri.linux.conf.json:            ${versions.tauriLinuxConfig}`);
            log.info(`  tauri.macos.conf.json:            ${versions.tauriMacosConfig}`);
            log.info(`  tauri.windows.conf.json:          ${versions.tauriWindowsConfig}`);
            log.info(`  tauri.windows-cargo-wix.conf.json:${versions.tauriWindowsCargoWixConfig}`);
            log.info(`  tauri.windows-nsis.conf.json:     ${versions.tauriWindowsNsisConfig}`);
            log.info(`  tauri.windows-nsis-only.conf.json:${versions.tauriWindowsNsisOnlyConfig}`);
            log.info(`  Cargo.toml:                       ${versions.cargoToml}`);

            log.divider();
            if (isConsistent) {
                log.success(`状态: 所有版本统一 (${versions.packageJson})`);
            } else {
                log.error('状态: 版本不统一');
                log.info('运行 sync 命令来统一版本');
            }
            break;
        }

        case 'sync': {
            const targetVersion = args[1];
            syncVersions(targetVersion, options);
            break;
        }

        case 'bump': {
            const bumpType = args[1] || 'patch';
            const validTypes = ['major', 'minor', 'patch', 'prerelease'];

            if (!validTypes.includes(bumpType)) {
                log.error(`无效的版本类型: ${bumpType}`);
                log.info(`支持的类型: ${validTypes.join(', ')}`);
                process.exit(1);
            }

            const newVersion = bumpVersion(bumpType, options);

            // 可选择是否创建Git标签
            if (options.createTag) {
                createVersionTag(newVersion, options);
            }
            break;
        }

        case 'tag': {
            const currentVersion = getCurrentVersion();
            createVersionTag(currentVersion, options);
            break;
        }

        case 'clean': {
            log.title('清理备份文件');
            log.divider();
            cleanupBackups();
            break;
        }

        default:
            showHelp();
            break;
    }
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(`
${colors.bright}${colors.magenta}📦 统一版本管理工具${colors.reset}

${colors.bright}🎯 功能:${colors.reset}
  一次性更新所有文件中的版本号，包括:
  • package.json
  • tauri.conf.json
  • tauri.arm64.conf.json
  • tauri.linux.conf.json
  • tauri.macos.conf.json
  • tauri.windows.conf.json
  • tauri.windows-cargo-wix.conf.json
  • tauri.windows-nsis.conf.json
  • tauri.windows-nsis-only.conf.json
  • Cargo.toml
  • README.md (中文)
  • README-en.md (英文)

${colors.bright}📋 使用方法:${colors.reset}
  node scripts/sync-version.cjs [command] [options]

${colors.bright}🛠️ 命令:${colors.reset}
  ${colors.green}check${colors.reset}               检查所有文件版本一致性
  ${colors.green}sync [version]${colors.reset}      同步版本号到指定版本（默认使用package.json版本）
  ${colors.green}bump [type]${colors.reset}         增加版本号 (major|minor|patch|prerelease，默认patch)
  ${colors.green}tag${colors.reset}                 为当前版本创建Git标签
  ${colors.green}clean${colors.reset}               清理过期的备份文件

${colors.bright}⚙️ 选项:${colors.reset}
  ${colors.cyan}--no-backup${colors.reset}         不创建备份文件
  ${colors.cyan}--skip-readme${colors.reset}       跳过README文件更新
  ${colors.cyan}--dry-run${colors.reset}           干运行模式，不实际修改文件
  ${colors.cyan}--clean-backups${colors.reset}     执行前清理过期备份文件
  ${colors.cyan}--force${colors.reset}             强制执行（覆盖已存在的标签等）
  ${colors.cyan}--no-push${colors.reset}           创建标签时不推送到远程
  ${colors.cyan}--no-commit${colors.reset}         创建标签时不自动提交更改
  ${colors.cyan}--commit-message${colors.reset}    自定义提交信息
  ${colors.cyan}--tag${colors.reset}               bump命令后自动创建标签

${colors.bright}✨ 特点:${colors.reset}
  • 智能版本检测和验证
  • 安全的正则表达式替换
  • 详细的操作日志和颜色输出
  • 自动备份和错误恢复
  • 支持预发布版本
  • Git集成和标签管理

${colors.bright}💡 NPM快捷方式:${colors.reset}
  npm run version:sync        # 同步版本
  npm run version:bump        # 升级patch版本
  npm run version:bump:minor  # 升级minor版本
  npm run version:bump:major  # 升级major版本

${colors.bright}📝 示例:${colors.reset}
  node scripts/sync-version.cjs                    # 同步版本
  node scripts/sync-version.cjs check              # 检查版本
  node scripts/sync-version.cjs sync 1.2.0         # 同步到指定版本
  node scripts/sync-version.cjs bump patch         # 增加补丁版本
  node scripts/sync-version.cjs bump minor --tag   # 增加次版本并创建标签
  node scripts/sync-version.cjs bump prerelease    # 增加预发布版本
  node scripts/sync-version.cjs --dry-run          # 预览将要执行的操作
  node scripts/sync-version.cjs clean              # 清理备份文件
`);
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    // 核心功能
    getCurrentVersion,
    syncVersions,
    bumpVersion,
    checkVersionConsistency,
    createVersionTag,

    // 工具函数
    isValidVersion,
    compareVersions,
    cleanupBackups,
    checkGitStatus,

    // 文件操作
    safeReadJson,
    safeWriteJson,
    backupFile,

    // 更新函数
    updatePackageJson,
    updateTauriConfig,
    updateCargoToml,
    updateAllReadmes,

    // 配置
    getTauriConfigFiles,

    // 日志工具
    log
};
