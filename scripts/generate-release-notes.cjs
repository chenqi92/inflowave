#!/usr/bin/env node

/**
 * Release Notes Generator
 * 生成GitHub Release的发布说明
 * 
 * Usage:
 *   node scripts/generate-release-notes.cjs                    # 生成正式版本的release notes
 *   node scripts/generate-release-notes.cjs --dev             # 生成开发版本的release notes
 *   node scripts/generate-release-notes.cjs --output=file.md  # 将输出保存到文件
 *   
 * NPM Scripts:
 *   npm run release:notes                                      # 生成正式版本的release notes
 *   npm run release:notes:dev                                  # 生成开发版本的release notes
 *   npm run release:notes:save                                 # 生成并保存到文件
 * 
 * Features:
 *   - 自动读取 src-tauri/tauri.conf.json 中的版本号
 *   - 查找对应版本的 docs/release-notes/{version}.md 文件
 *   - 如果没有找到版本文件，使用 docs/release-notes/default.md 作为通用模板
 *   - 如果通用模板也不存在，则使用硬编码的默认内容
 *   - 根据构建类型(release/development)生成不同的下载说明
 *   - 支持输出到文件或控制台
 * 
 * Directory Structure:
 *   docs/
 *   └── release-notes/
 *       ├── 0.1.1.md          # 版本特定的发布说明
 *       ├── 0.1.2.md          # 版本特定的发布说明
 *       ├── 0.1.3.md          # 版本特定的发布说明
 *       ├── default.md        # 通用回退模板
 *       ├── TEMPLATE.md       # 编写模板参考
 *       └── README.md         # 说明文档
 * 
 * Release Notes File Format:
 *   每个版本的release notes文件应该包含:
 *   - 版本介绍和主要特性
 *   - 新功能列表
 *   - 改进优化内容
 *   - 错误修复
 *   - 兼容性说明
 *   
 *   下载说明部分会自动生成，无需在markdown文件中包含
 */

const fs = require('fs');
const path = require('path');

/**
 * 获取当前版本号
 */
function getCurrentVersion() {
  const tauriConfig = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  return tauriConfig.version;
}

/**
 * 读取版本对应的release notes文件
 */
function loadReleaseNotes(version) {
  const notesPath = path.join('docs', 'release-notes', `${version}.md`);
  
  if (fs.existsSync(notesPath)) {
    console.log(`📝 Found release notes file: ${notesPath}`);
    return fs.readFileSync(notesPath, 'utf8');
  }
  
  // 尝试读取通用默认文档
  const defaultPath = path.join('docs', 'release-notes', 'default.md');
  if (fs.existsSync(defaultPath)) {
    console.log(`📄 Using default release notes file: ${defaultPath}`);
    const defaultContent = fs.readFileSync(defaultPath, 'utf8');
    // 替换版本占位符
    return defaultContent.replace(/{VERSION}/g, version);
  }
  
  console.log(`⚠️ No release notes file found for version ${version} and no default.md exists`);
  return null;
}

/**
 * 生成下载链接部分
 */
function generateDownloadSection(version, type = 'release') {
  const repository = process.env.GITHUB_REPOSITORY || 'chenqi92/inflowave';
  
  if (type === 'development') {
    return `

---

## 💻 开发版本下载

> ⚠️ **重要提醒**: 这是一个开发版本构建，可能包含未完全测试的功能和已知问题。建议开发者和测试用户使用。

### 📦 Assets 下载说明

请在下方的 **Assets** 区域选择适合您系统的安装包：

#### 🪟 Windows 用户
- MSI 安装包: InfloWave-${version}-x86_64.msi (64位系统)
- EXE 安装包: InfloWave_${version}_x64-setup.exe (64位系统)
- 32位版本: InfloWave-${version}-i686.msi (32位系统)

#### 🍎 macOS 用户
- Apple Silicon (M1/M2/M3): InfloWave_${version}_aarch64.dmg
- Intel 处理器: InfloWave_${version}_x64.dmg

#### 🐧 Linux 用户
- Ubuntu/Debian: inflowave_${version}_amd64.deb
- 通用版本: inflowave_${version}_amd64.AppImage
- RPM 发行版: inflowave-${version}-1.x86_64.rpm

### 🔄 开发版本特点

- ✅ 最新功能预览
- ⚠️ 可能存在不稳定因素
- 🐛 欢迎反馈问题和建议
- 🚀 帮助改进正式版本

### 📋 安装注意事项

1. **备份数据**: 安装前请备份重要数据
2. **系统兼容**: 确保系统满足最低要求
3. **问题反馈**: 遇到问题请在 [Issues](https://github.com/${repository}/issues) 中报告

---

> 🎯 **获取稳定版本**: 如需生产环境使用，请下载 [最新正式版本](https://github.com/${repository}/releases/latest)`;
  }

  // 正式版本的详细下载说明
  return `

---

## 💻 下载安装

### 🔍 如何选择适合的版本

#### Windows 用户
- **MSI 安装包 (推荐)**: 📥 **[InfloWave-${version}-x86_64.msi](https://github.com/${repository}/releases/download/v${version}/InfloWave-${version}-x86_64.msi)**
  - ✅ 适用于 Windows 10/11 (64位系统)
  - ✅ 企业级安装包，支持 GPO 部署
  - ✅ MSI 格式，系统信任度高

- **EXE 安装包**: 📥 **[InfloWave_${version}_x64-setup.exe](https://github.com/${repository}/releases/download/v${version}/InfloWave_${version}_x64-setup.exe)**
  - ✅ 适用于 Windows 10/11 (64位系统)
  - ✅ 用户友好的安装向导
  - ✅ 支持中英文界面

- **32位版本**: 📥 **[InfloWave-${version}-i686.msi](https://github.com/${repository}/releases/download/v${version}/InfloWave-${version}-i686.msi)**
  - ✅ 适用于较老的32位 Windows 系统
  - ⚠️ 仅在无法运行64位版本时使用

**便携版 (免安装)**

- **64位便携版**: 📥 **[InfloWave-x64-portable-${version}.zip](https://github.com/${repository}/releases/download/v${version}/InfloWave-x64-portable-${version}.zip)**
  - ✅ 解压即用，无需安装
  - ✅ 绿色环保，不写入注册表
  - ✅ 便于携带，可放在U盘中
  - ✅ 适用于 Windows 10/11 (64位)

- **32位便携版**: 📥 **[InfloWave-x86-portable-${version}.zip](https://github.com/${repository}/releases/download/v${version}/InfloWave-x86-portable-${version}.zip)**
  - ✅ 解压即用，无需安装
  - ✅ 兼容性更好，支持老旧系统
  - ✅ 适用于 Windows 7/8/10/11 (32位/64位)

#### macOS 用户

**如何判断你的 Mac 类型？**
- 🍎 点击屏幕左上角苹果图标 → 关于本机
- 💻 查看「处理器」或「芯片」信息

**Apple Silicon Mac (M1/M2/M3/M4 芯片)**
- 📥 **[InfloWave_${version}_aarch64.dmg](https://github.com/${repository}/releases/download/v${version}/InfloWave_${version}_aarch64.dmg)**
  - ✅ 2020年11月后发布的 Mac
  - ✅ 性能最优，原生支持
  - ✅ 更低的电量消耗
  - ⚠️ **无法在 Intel Mac 上运行**

**Intel Mac (Intel 处理器)**
- 📥 **[InfloWave_${version}_x64.dmg](https://github.com/${repository}/releases/download/v${version}/InfloWave_${version}_x64.dmg)**
  - ✅ 2020年前发布的 Mac
  - ✅ 兼容 macOS 10.15 或更高版本
  - ⚠️ 不支持 Apple Silicon 芯片

#### Linux 用户

**如何判断你的 Linux 发行版？**
- 运行命令: \`cat /etc/os-release\` 或 \`lsb_release -a\`

**Debian/Ubuntu 系列 (推荐)**
- 📥 **[inflowave_${version}_amd64.deb](https://github.com/${repository}/releases/download/v${version}/inflowave_${version}_amd64.deb)**
  - ✅ Ubuntu 18.04+, Debian 10+
  - ✅ 系统集成度高，支持自动更新
  - 📋 安装命令: \`sudo dpkg -i inflowave_${version}_amd64.deb\`
  - 🔧 依赖修复: \`sudo apt-get install -f\`

**通用 Linux (万能选择)**
- 📥 **[inflowave_${version}_amd64.AppImage](https://github.com/${repository}/releases/download/v${version}/inflowave_${version}_amd64.AppImage)**
  - ✅ 适用于大部分 x64 Linux 发行版
  - ✅ 免安装，下载后直接运行
  - ✅ 便携版，不影响系统
  - 📋 使用方法: \`chmod +x inflowave_${version}_amd64.AppImage && ./inflowave_${version}_amd64.AppImage\`

**RPM 系列 (CentOS/RHEL/Fedora)**
- 📥 **[inflowave-${version}-1.x86_64.rpm](https://github.com/${repository}/releases/download/v${version}/inflowave-${version}-1.x86_64.rpm)**
  - ✅ CentOS 7+, RHEL 7+, Fedora 30+
  - 📋 安装命令: \`sudo rpm -i inflowave-${version}-1.x86_64.rpm\`
  - 📋 或使用: \`sudo dnf install inflowave-${version}-1.x86_64.rpm\`

### 📝 详细安装步骤

#### Windows 安装

**安装版 (推荐)**
1. 下载对应的 \`.msi\` 文件
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 从开始菜单启动 InfloWave

**便携版 (免安装)**
1. 下载对应的 \`.zip\` 文件
2. 解压到任意目录 (如 \`C:\\InfloWave\` 或 \`D:\\Tools\\InfloWave\`)
3. 双击 \`InfloWave.exe\` 直接运行
4. 首次运行可能需要安装 Microsoft Edge WebView2 运行时

#### macOS 安装
1. 下载对应的 \`.dmg\` 文件
2. 双击打开 DMG 镜像
3. 将 InfloWave.app 拖入 Applications 文件夹
4. 首次运行时，可能需要在「系统偏好设置 → 安全性与隐私」中允许运行

#### Linux 安装
- **DEB 包**: \`sudo dpkg -i 文件名.deb\`
- **AppImage**: \`chmod +x 文件名.AppImage && ./文件名.AppImage\`
- **RPM 包**: \`sudo rpm -i 文件名.rpm\`

### ⚠️ 系统要求

- **Windows**: Windows 10 或更高版本 (推荐 Windows 11)
- **macOS**: macOS 10.15 (Catalina) 或更高版本
- **Linux**: 支持 GTK 3.0 的现代 Linux 发行版

### 🆘 遇到问题？

- 📖 [查看文档](https://github.com/${repository}/wiki)
- 🐛 [报告问题](https://github.com/${repository}/issues)
- 💬 [讨论交流](https://github.com/${repository}/discussions)`;
}

/**
 * 生成默认的release notes内容
 */
function generateDefaultContent(version, type = 'release') {
  if (type === 'development') {
    return `InfloWave v${version}

A modern time-series database management tool:
- Frontend and backend communicate via IPC
- Optimal performance and security
- Cross-platform support
- Modern UI with shadcn/ui components`;
  }

  return `## 🚀 InfloWave v${version}

现代化的时序数据库管理工具，提供直观的用户界面和强大的数据分析功能。

### ✨ 主要特性
- 🔒 **安全稳定** - 采用 IPC 通信，无端口冲突风险
- ⚡ **性能优异** - 原生通信机制，响应速度更快
- 🛡️ **隐私保护** - 不暴露网络端口，数据更安全
- 📦 **体积精简** - 最小化依赖，安装包更小`;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const type = args.includes('--dev') ? 'development' : 'release';
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1];

  try {
    const version = getCurrentVersion();
    console.log(`🔍 Generating release notes for version ${version} (${type})`);

    // 读取版本特定的发布说明
    const releaseNotes = loadReleaseNotes(version);
    
    // 生成完整内容
    let fullContent;
    if (releaseNotes) {
      fullContent = releaseNotes + generateDownloadSection(version, type);
    } else {
      fullContent = generateDefaultContent(version, type) + generateDownloadSection(version, type);
    }

    // 输出结果
    if (outputFile) {
      fs.writeFileSync(outputFile, fullContent, 'utf8');
      console.log(`✅ Release notes written to ${outputFile}`);
    } else {
      console.log('\n--- Release Notes ---');
      console.log(fullContent);
    }

  } catch (error) {
    console.error('❌ Error generating release notes:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { getCurrentVersion, loadReleaseNotes, generateDownloadSection, generateDefaultContent };