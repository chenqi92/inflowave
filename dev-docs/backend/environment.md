# 🔧 后端环境配置指南

## 概述

本文档详细介绍如何在 Windows 环境下使用 **PowerShell + Scoop** 配置 Rust 后端开发环境。

## 🖥️ 系统要求

- **操作系统**: Windows 10 版本 1903+ 或 Windows 11
- **PowerShell**: 5.1+ (推荐 PowerShell 7+)
- **内存**: 最少 8GB RAM (推荐 16GB+)
- **存储**: 至少 5GB 可用空间

## 📦 Scoop 包管理器安装

### 1. 安装 Scoop
```powershell
# 设置执行策略 (如果需要)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 安装 Scoop
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# 验证安装
scoop --version
```

### 2. 添加必要的 Bucket
```powershell
# 添加主要软件源
scoop bucket add main
scoop bucket add extras
scoop bucket add versions

# 验证 bucket
scoop bucket list
```

## 🦀 Rust 工具链安装

### 1. 使用 Scoop 安装 Rust
```powershell
# 安装 Rust 工具链
scoop install rust

# 验证安装
rustc --version
cargo --version
rustup --version
```

### 2. 配置 Rust 环境
```powershell
# 设置默认工具链为稳定版
rustup default stable

# 更新工具链
rustup update

# 安装常用组件
rustup component add rustfmt
rustup component add clippy
rustup component add rust-analyzer
```

### 3. 配置 Cargo 镜像 (可选，提升下载速度)
```powershell
# 创建 Cargo 配置目录
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.cargo"

# 创建配置文件
@"
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"
"@ | Out-File -FilePath "$env:USERPROFILE\.cargo\config.toml" -Encoding UTF8
```

## 🔧 开发工具安装

### 1. 必需工具
```powershell
# Git 版本控制
scoop install git

# Node.js (前端依赖)
scoop install nodejs

# Windows Terminal (推荐)
scoop install windows-terminal

# PowerShell 7 (推荐)
scoop install pwsh
```

### 2. 可选工具
```powershell
# 代码编辑器
scoop install vscode

# 系统监控工具
scoop install btop

# 文件管理器
scoop install lf

# HTTP 客户端 (API 测试)
scoop install httpie
```

## 🏗️ Tauri 开发环境

### 1. 安装 Tauri CLI
```powershell
# 方法1: 使用 Cargo 安装 (推荐)
cargo install tauri-cli

# 方法2: 使用 npm 安装
npm install -g @tauri-apps/cli

# 验证安装
tauri --version
```

### 2. 安装 WebView2 (Windows 必需)
```powershell
# 检查是否已安装 WebView2
Get-AppxPackage -Name "*WebView*"

# 如果未安装，下载并安装
# 访问: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
# 或使用 Scoop 安装
scoop install webview2
```

### 3. 安装 Visual C++ 构建工具
```powershell
# 使用 Scoop 安装 (轻量级)
scoop install vcredist2022

# 或者安装完整的 Visual Studio Build Tools
# 下载地址: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
```

## 🔍 环境验证

### 1. 创建验证脚本
```powershell
# 创建环境检查脚本
@"
# InfluxDB GUI 开发环境检查脚本
Write-Host "🔍 检查开发环境..." -ForegroundColor Yellow

# 检查 PowerShell 版本
Write-Host "PowerShell 版本: $($PSVersionTable.PSVersion)" -ForegroundColor Green

# 检查 Scoop
try {
    $scoopVersion = scoop --version
    Write-Host "✅ Scoop: $scoopVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Scoop 未安装" -ForegroundColor Red
}

# 检查 Rust
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust 未安装" -ForegroundColor Red
}

# 检查 Cargo
try {
    $cargoVersion = cargo --version
    Write-Host "✅ Cargo: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Cargo 未安装" -ForegroundColor Red
}

# 检查 Tauri CLI
try {
    $tauriVersion = tauri --version
    Write-Host "✅ Tauri CLI: $tauriVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Tauri CLI 未安装" -ForegroundColor Red
}

# 检查 Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
}

# 检查 Git
try {
    $gitVersion = git --version
    Write-Host "✅ Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git 未安装" -ForegroundColor Red
}

Write-Host "🎉 环境检查完成！" -ForegroundColor Cyan
"@ | Out-File -FilePath "check-env.ps1" -Encoding UTF8

# 运行检查脚本
.\check-env.ps1
```

### 2. 测试 Tauri 项目创建
```powershell
# 创建测试项目
mkdir test-tauri
cd test-tauri

# 初始化 Tauri 项目
tauri init --name "test-app" --window-title "Test App" --dist-dir "../dist" --dev-path "http://localhost:3000"

# 构建测试
cargo build

# 如果成功，删除测试项目
cd ..
Remove-Item -Recurse -Force test-tauri
```

## ⚙️ 开发环境配置

### 1. PowerShell 配置文件
```powershell
# 编辑 PowerShell 配置文件
notepad $PROFILE

# 添加以下内容到配置文件
@"
# InfluxDB GUI 开发环境配置

# 设置别名
Set-Alias -Name ll -Value Get-ChildItem
Set-Alias -Name grep -Value Select-String

# 设置环境变量
$env:RUST_LOG = "info"
$env:RUST_BACKTRACE = "1"

# 项目快捷函数
function Start-InfluxGUI {
    Set-Location "E:\workspace-rust\influx-gui"
    npm run tauri:dev
}

function Build-InfluxGUI {
    Set-Location "E:\workspace-rust\influx-gui"
    .\scripts\build.ps1
}

# 显示欢迎信息
Write-Host "🦀 Rust 开发环境已加载" -ForegroundColor Green
"@

# 重新加载配置
. $PROFILE
```

### 2. VS Code 配置 (如果使用)
```powershell
# 安装 VS Code 扩展
code --install-extension rust-lang.rust-analyzer
code --install-extension tauri-apps.tauri-vscode
code --install-extension ms-vscode.powershell

# 创建工作区配置
mkdir .vscode
@"
{
    "rust-analyzer.cargo.features": "all",
    "rust-analyzer.checkOnSave.command": "clippy",
    "files.associations": {
        "*.rs": "rust"
    },
    "terminal.integrated.defaultProfile.windows": "PowerShell"
}
"@ | Out-File -FilePath ".vscode\settings.json" -Encoding UTF8
```

## 🚀 项目初始化

### 1. 克隆项目
```powershell
# 克隆项目到工作目录
git clone <repository-url> influx-gui
cd influx-gui
```

### 2. 安装依赖
```powershell
# 安装前端依赖
npm install

# 构建后端依赖
cd src-tauri
cargo build
cd ..
```

### 3. 启动开发环境
```powershell
# 启动开发服务器
npm run tauri:dev
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. Scoop 安装失败
```powershell
# 问题: 执行策略限制
# 解决: 临时设置执行策略
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# 问题: 网络连接问题
# 解决: 使用代理或更换网络
```

#### 2. Rust 编译错误
```powershell
# 问题: 链接器错误
# 解决: 安装 Visual C++ 构建工具
scoop install vcredist2022

# 问题: 依赖版本冲突
# 解决: 清理并重新构建
cargo clean
cargo build
```

#### 3. Tauri 开发模式启动失败
```powershell
# 问题: WebView2 未安装
# 解决: 安装 WebView2
scoop install webview2

# 问题: 端口被占用
# 解决: 检查并释放端口
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## 📚 参考资源

- [Scoop 官方文档](https://scoop.sh/)
- [Rust 官方安装指南](https://www.rust-lang.org/tools/install)
- [Tauri 开发指南](https://tauri.app/v1/guides/getting-started/prerequisites)
- [PowerShell 文档](https://docs.microsoft.com/en-us/powershell/)

---

> 💡 **下一步**: 环境配置完成后，建议阅读 [架构设计](./architecture.md) 文档，了解后端系统的整体架构。
