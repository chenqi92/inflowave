# InfloWave - 跨平台部署指南

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
# 使用 Scoop 安装 (推荐)
scoop install rust
scoop install nodejs
scoop install webview2

# 或手动安装
# Visual Studio Build Tools 或 Visual Studio Community
# Windows SDK
# WebView2 Runtime
```

#### macOS 特定要求
```bash
# Xcode Command Line Tools
xcode-select --install

# 可选: 开发者证书用于代码签名
```

#### Linux 特定要求
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# CentOS/RHEL/Fedora
sudo dnf install -y webkit2gtk3-devel \
    openssl-devel \
    curl \
    wget \
    libappindicator-gtk3 \
    librsvg2-devel
```

### 构建步骤

#### 1. 克隆项目
```bash
git clone <repository-url>
cd influx-gui
```

#### 2. 安装依赖
```bash
# 安装前端依赖
npm install

# 构建前端
npm run build
```

#### 3. 构建应用

##### 开发构建
```bash
# 启动开发模式
npm run tauri:dev
```

##### 生产构建
```bash
# 构建所有平台
npm run tauri:build

# 构建特定平台
npm run build:windows
npm run build:macos
npm run build:linux
```

#### 4. 平台特定构建

##### Windows 构建
```powershell
# 使用 PowerShell 脚本
.\scripts\build.ps1

# 或直接使用 Tauri
tauri build --target x86_64-pc-windows-msvc
```

##### macOS 构建
```bash
# 通用二进制 (Intel + Apple Silicon)
tauri build --target universal-apple-darwin

# 仅 Intel
tauri build --target x86_64-apple-darwin

# 仅 Apple Silicon
tauri build --target aarch64-apple-darwin
```

##### Linux 构建
```bash
# x64
tauri build --target x86_64-unknown-linux-gnu

# ARM64
tauri build --target aarch64-unknown-linux-gnu
```

## 📦 打包配置

### Tauri 配置 (tauri.conf.json)
```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "package": {
    "productName": "InfloWave",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["msi", "nsis", "deb", "rpm", "dmg", "appimage"],
      "identifier": "com.kkape.inflowave",
      "icon": [
        "icons/windows/32x32.ico",
        "icons/windows/128x128.ico",
        "icons/mac/512x512.icns"
      ],
      "resources": [],
      "externalBin": [],
      "copyright": "",
      "category": "DeveloperTool",
      "shortDescription": "Modern time-series database management tool",
      "longDescription": "A modern, cross-platform GUI management tool for time-series databases built with Tauri + React + TypeScript."
    }
  }
}
```

### 包管理器配置

#### Windows (MSI)
```json
{
  "windows": {
    "certificateThumbprint": null,
    "digestAlgorithm": "sha256",
    "timestampUrl": "",
    "wix": {
      "language": ["en-US", "zh-CN"],
      "template": "templates/main.wxs"
    }
  }
}
```

#### macOS (DMG)
```json
{
  "macOS": {
    "frameworks": [],
    "minimumSystemVersion": "10.13",
    "exceptionDomain": "",
    "signingIdentity": null,
    "providerShortName": null,
    "entitlements": null
  }
}
```

#### Linux (AppImage)
```json
{
  "linux": {
    "deb": {
      "depends": [
        "libwebkit2gtk-4.1-0",
        "libgtk-3-0",
        "libayatana-appindicator3-1"
      ]
    },
    "rpm": {
      "depends": ["webkit2gtk3"]
    },
    "appimage": {
      "bundleMediaFramework": true,
      "files": {}
    }
  }
}
```

**重要提示**: AppImage 打包需要 PNG 格式的图标文件。确保在 `bundle.icon` 配置中包含 PNG 文件：

```json
{
  "bundle": {
    "icon": [
      "icons/icon.png",
      "icons/linux/icon.png",
      "icons/windows/32x32.ico",
      "icons/mac/512x512.icns"
    ]
  }
}
```

## 🚀 CI/CD 部署

### GitHub Actions 配置
```yaml
name: Build and Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        platform: [ubuntu-latest, windows-latest, macos-latest]
    
    runs-on: ${{ matrix.platform }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Install dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.0-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
          
      - name: Install frontend dependencies
        run: npm ci
        
      - name: Build application
        run: npm run tauri:build
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.platform }}-build
          path: src-tauri/target/release/bundle/
```

### Docker 构建
```dockerfile
# Dockerfile.build
FROM node:18-alpine AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM rust:1.70-alpine AS backend-builder

RUN apk add --no-cache \
    build-base \
    webkit2gtk-dev \
    openssl-dev

WORKDIR /app
COPY src-tauri/ ./
RUN cargo build --release

FROM alpine:latest

RUN apk add --no-cache \
    webkit2gtk \
    openssl

COPY --from=backend-builder /app/target/release/influx-gui /usr/local/bin/
COPY --from=frontend-builder /app/dist /usr/share/influx-gui/

EXPOSE 3000
CMD ["influx-gui"]
```

## 📋 发布清单

### 构建前检查
- [ ] 更新版本号 (package.json, Cargo.toml, tauri.conf.json)
- [ ] 更新 CHANGELOG.md
- [ ] 运行所有测试
- [ ] 检查依赖安全性
- [ ] 更新文档

### 构建过程
- [ ] 清理构建目录
- [ ] 安装最新依赖
- [ ] 执行完整构建
- [ ] 运行集成测试
- [ ] 验证构建产物

### 发布后验证
- [ ] 在各平台测试安装包
- [ ] 验证核心功能
- [ ] 检查性能指标
- [ ] 更新下载链接
- [ ] 发布发布说明

## 🔧 故障排除

### 常见构建问题

#### Windows
```powershell
# WebView2 未安装
scoop install webview2

# 构建工具缺失
# 安装 Visual Studio Build Tools

# 权限问题
# 以管理员身份运行 PowerShell
```

#### macOS
```bash
# Xcode 工具缺失
xcode-select --install

# 权限问题
sudo xcode-select --reset

# 代码签名问题
# 检查开发者证书配置
```

#### Linux
```bash
# 依赖缺失
sudo apt install -y libwebkit2gtk-4.0-dev

# 权限问题
chmod +x ./target/release/bundle/appimage/*.AppImage

# GTK 版本问题
# 检查 GTK 版本兼容性
```

### 性能优化
- **并行构建**: 使用 `cargo build --jobs 4`
- **增量构建**: 保留 target 目录
- **缓存依赖**: 使用 CI 缓存
- **优化配置**: 启用 LTO 和优化选项

---

> 💡 **提示**: 建议在发布前在所有目标平台上进行完整的构建和测试。
