# InfluxDB GUI Manager - 跨平台部署指南

## 🎯 支持的平台

### Windows
- **系统要求**: Windows 10 或更高版本
- **安装包格式**: 
  - `.msi` - Windows Installer 包（推荐）
  - `.exe` - 便携版可执行文件
- **架构支持**: x64, x86

### macOS
- **系统要求**: macOS 10.13 (High Sierra) 或更高版本
- **安装包格式**:
  - `.dmg` - 磁盘映像文件（推荐）
  - `.app` - 应用程序包
- **架构支持**: Intel (x64) + Apple Silicon (ARM64) 通用包

### Linux
- **系统要求**: 现代 Linux 发行版，支持 GTK 3.0+
- **安装包格式**:
  - `.deb` - Debian/Ubuntu 包
  - `.rpm` - Red Hat/SUSE 包
  - `.AppImage` - 便携版（推荐）
- **架构支持**: x64, ARM64

## 🔧 本地构建

### 环境准备

#### 通用要求
```bash
# Node.js 18+
node --version

# Rust 1.70+
rustc --version

# Tauri CLI
npm install -g @tauri-apps/cli
```

#### Windows 特定要求
```powershell
# Visual Studio Build Tools 或 Visual Studio Community
# Windows SDK
# 可选: 代码签名证书
```

#### macOS 特定要求
```bash
# Xcode Command Line Tools
xcode-select --install

# 可选: Apple Developer 证书用于签名和公证
```

#### Linux 特定要求
```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf

# CentOS/RHEL/Fedora
sudo yum install gtk3-devel webkit2gtk3-devel libappindicator-gtk3-devel librsvg2-devel

# Arch Linux
sudo pacman -S gtk3 webkit2gtk libappindicator-gtk3 librsvg
```

### 构建命令

#### 使用构建脚本（推荐）

**Windows (PowerShell)**:
```powershell
# 开发构建
.\scripts\build.ps1

# 生产构建
.\scripts\build.ps1 -Release

# 指定目标架构
.\scripts\build.ps1 -Target "x86_64-pc-windows-msvc" -Release
```

**macOS/Linux (Bash)**:
```bash
# 给脚本执行权限
chmod +x scripts/build.sh

# 开发构建
./scripts/build.sh

# 生产构建
./scripts/build.sh --release

# 构建通用 macOS 包
./scripts/build.sh --target universal-apple-darwin --release
```

#### 使用 Tauri CLI

```bash
# 开发构建
npm run tauri build

# 生产构建
npm run tauri build --release

# 指定目标平台
npm run tauri build --target x86_64-pc-windows-msvc
npm run tauri build --target universal-apple-darwin
npm run tauri build --target x86_64-unknown-linux-gnu
```

### 构建产物位置

构建完成后，安装包位于：
```
src-tauri/target/release/bundle/
├── msi/           # Windows MSI 安装包
├── nsis/          # Windows NSIS 安装包
├── deb/           # Linux DEB 包
├── rpm/           # Linux RPM 包
├── appimage/      # Linux AppImage
├── dmg/           # macOS DMG 包
└── macos/         # macOS APP 包
```

## 🚀 自动化构建 (GitHub Actions)

### 配置说明

项目已配置 GitHub Actions 工作流，支持：
- **多平台并行构建**: Windows, macOS, Linux
- **自动发布**: 推送标签时自动创建 Release
- **构建缓存**: 加速构建过程
- **代码签名**: 支持 Windows 和 macOS 代码签名

### 触发构建

#### 1. 标签发布（推荐）
```bash
# 创建版本标签
git tag v1.0.0
git push origin v1.0.0

# 自动触发构建和发布
```

#### 2. 手动触发
在 GitHub 仓库的 Actions 页面，点击 "Build and Release" 工作流的 "Run workflow" 按钮。

#### 3. Pull Request
每次提交 PR 到 main 分支时自动构建（不发布）。

### 配置代码签名

#### Windows 代码签名
```yaml
# 在 GitHub Secrets 中添加：
WINDOWS_CERTIFICATE: base64编码的证书文件
WINDOWS_CERTIFICATE_PASSWORD: 证书密码
```

#### macOS 代码签名和公证
```yaml
# 在 GitHub Secrets 中添加：
APPLE_CERTIFICATE: base64编码的开发者证书
APPLE_CERTIFICATE_PASSWORD: 证书密码
APPLE_SIGNING_IDENTITY: 签名身份
APPLE_ID: Apple ID
APPLE_PASSWORD: 应用专用密码
APPLE_TEAM_ID: 开发者团队 ID
```

## 📦 分发策略

### 1. GitHub Releases（推荐）
- **优势**: 免费、版本管理、自动更新检查
- **适用**: 开源项目、技术用户
- **配置**: 已在 GitHub Actions 中配置

### 2. 官方应用商店

#### Microsoft Store (Windows)
```bash
# 生成 MSIX 包
tauri build --target x86_64-pc-windows-msvc --format msix
```

#### Mac App Store (macOS)
```bash
# 需要 Mac App Store 证书和配置文件
tauri build --target universal-apple-darwin --format app
```

#### Snap Store (Linux)
```bash
# 生成 Snap 包
tauri build --target x86_64-unknown-linux-gnu --format snap
```

### 3. 第三方分发平台
- **Chocolatey** (Windows)
- **Homebrew** (macOS)
- **Flathub** (Linux)

## 🔄 自动更新

### 配置 Tauri Updater

1. **启用更新器**:
```json
// tauri.conf.json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/your-username/influx-gui/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

2. **生成密钥对**:
```bash
tauri signer generate -w ~/.tauri/myapp.key
```

3. **前端更新检查**:
```typescript
import { checkUpdate, installUpdate } from '@tauri-apps/api/updater';

async function checkForUpdates() {
  try {
    const { shouldUpdate, manifest } = await checkUpdate();
    
    if (shouldUpdate) {
      // 显示更新对话框
      await installUpdate();
      // 重启应用
    }
  } catch (error) {
    console.error('更新检查失败:', error);
  }
}
```

## 🛡️ 安全考虑

### 代码签名
- **Windows**: 使用 Authenticode 签名
- **macOS**: 使用 Apple Developer 证书签名和公证
- **Linux**: 使用 GPG 签名

### 分发安全
- **HTTPS**: 所有下载链接使用 HTTPS
- **校验和**: 提供 SHA256 校验和
- **签名验证**: 用户可验证安装包签名

## 📊 部署监控

### 下载统计
- GitHub Releases 提供下载统计
- 可集成 Google Analytics 或其他分析工具

### 错误报告
- 集成 Sentry 或类似服务
- 收集崩溃报告和性能数据

### 用户反馈
- GitHub Issues
- 应用内反馈系统
- 用户调查

## 🔧 故障排除

### 常见构建问题

#### Windows
```powershell
# 缺少 Visual Studio Build Tools
# 解决: 安装 Visual Studio Community 或 Build Tools

# 缺少 Windows SDK
# 解决: 通过 Visual Studio Installer 安装
```

#### macOS
```bash
# 缺少 Xcode Command Line Tools
xcode-select --install

# 签名失败
# 检查证书是否正确安装在钥匙串中
```

#### Linux
```bash
# 缺少系统依赖
sudo apt-get install libgtk-3-dev libwebkit2gtk-4.0-dev

# AppImage 权限问题
chmod +x *.AppImage
```

### 性能优化

#### 减小包大小
```toml
# Cargo.toml
[profile.release]
opt-level = "s"  # 优化大小
lto = true       # 链接时优化
codegen-units = 1
panic = "abort"
strip = true     # 移除调试符号
```

#### 启动速度优化
- 延迟加载非关键模块
- 优化依赖项
- 使用 WebView 预热

## 📋 发布清单

### 发布前检查
- [ ] 所有测试通过
- [ ] 文档更新完成
- [ ] 版本号更新
- [ ] 更新日志编写
- [ ] 安全扫描通过
- [ ] 性能测试完成

### 发布步骤
1. 创建发布分支
2. 更新版本号和文档
3. 创建 Git 标签
4. 触发自动构建
5. 测试安装包
6. 发布 Release
7. 更新官网和文档
8. 通知用户

### 发布后
- [ ] 监控下载量
- [ ] 收集用户反馈
- [ ] 修复紧急问题
- [ ] 规划下一版本
