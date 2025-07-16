# 🔧 安装指南

本指南将帮助您在不同操作系统上安装 InfloWave。

## 📋 系统要求

### 最低系统要求

- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **内存**: 4GB RAM
- **存储空间**: 200MB 可用空间
- **网络**: 需要网络连接以访问 InfluxDB 服务器

### 推荐系统配置

- **操作系统**: Windows 11, macOS 12+, Ubuntu 20.04+
- **内存**: 8GB RAM 或更多
- **存储空间**: 1GB 可用空间
- **显示器**: 1920x1080 或更高分辨率

## 📦 安装方式

### 方式一：下载预构建版本（推荐）

访问 [GitHub Releases 页面](https://github.com/chenqi92/inflowave/releases) 下载最新版本。

#### Windows 安装

**支持的架构**：

- x64 (64位): `InfloWave_x.x.x_x64_en-US.msi`
- x86 (32位): `InfloWave_x.x.x_x86_en-US.msi`

**安装步骤**：

1. 下载对应架构的 `.msi` 安装包
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 从开始菜单或桌面快捷方式启动应用

**注意事项**：

- 如果出现 Windows Defender 警告，点击"更多信息"→"仍要运行"
- 首次运行可能需要管理员权限

#### macOS 安装

**支持的架构**：

- Intel (x64): `InfloWave_x.x.x_x64.dmg`
- Apple Silicon (ARM64): `InfloWave_x.x.x_aarch64.dmg`

**安装步骤**：

1. 下载对应架构的 `.dmg` 文件
2. 双击打开 DMG 文件
3. 将 InfloWave 拖拽到 Applications 文件夹
4. 从 Launchpad 或 Applications 文件夹启动应用

**注意事项**：

- 首次运行时，可能需要在"系统偏好设置"→"安全性与隐私"中允许运行
- 如果提示"无法验证开发者"，请按住 Control 键点击应用图标，选择"打开"

#### Linux 安装

**支持的架构**：

- x64: `inflowave_x.x.x_amd64.deb` 或 `inflowave_x.x.x_amd64.AppImage`
- ARM64: `inflowave_x.x.x_arm64.deb` 或 `inflowave_x.x.x_aarch64.AppImage`
- x86: `inflowave_x.x.x_i386.deb`

**DEB 包安装（Ubuntu/Debian）**：

```bash
# 下载 deb 包后执行
sudo dpkg -i inflowave_x.x.x_amd64.deb

# 如果有依赖问题，执行
sudo apt-get install -f
```

**AppImage 安装**：

```bash
# 下载 AppImage 文件后执行
chmod +x inflowave_x.x.x_amd64.AppImage
./inflowave_x.x.x_amd64.AppImage
```

### 方式二：从源码构建

如果您需要自定义构建或贡献代码，可以从源码构建。

#### 环境准备

**必需工具**：

- Node.js 18.0+
- Rust 1.70+
- Git

**Windows 环境设置**：

```powershell
# 使用 Scoop 安装（推荐）
scoop install nodejs rust git

# 或使用官方安装程序
# 访问 nodejs.org 和 rustup.rs 下载安装
```

**macOS 环境设置**：

```bash
# 使用 Homebrew 安装
brew install node rust git

# 或使用官方安装程序
```

**Linux 环境设置**：

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm git curl
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# CentOS/RHEL
sudo yum install nodejs npm git curl
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### 构建步骤

```bash
# 1. 克隆项目
git clone https://github.com/chenqi92/inflowave.git
cd inflowave

# 2. 安装前端依赖
npm install

# 3. 开发模式运行（可选）
npm run tauri:dev

# 4. 构建生产版本
npm run tauri:build
```

构建完成后，安装包将位于 `src-tauri/target/release/bundle/` 目录下。

## 🚀 首次启动

### 启动应用

- **Windows**: 从开始菜单或桌面快捷方式启动
- **macOS**: 从 Launchpad 或 Applications 文件夹启动
- **Linux**: 从应用菜单启动或运行 `inflowave` 命令

### 初始配置

1. 应用启动后会显示欢迎界面
2. 点击"添加连接"配置您的第一个 InfluxDB 连接
3. 输入连接信息并测试连接
4. 连接成功后即可开始使用

## 🔄 更新升级

### 自动更新检查

InfloWave 会在启动时检查更新，如有新版本会提示您下载。

### 手动更新

1. 访问 [Releases 页面](https://github.com/chenqi92/inflowave/releases)
2. 下载最新版本
3. 按照安装步骤重新安装（会自动覆盖旧版本）
4. 用户数据和配置会自动保留

## 🗑️ 卸载

### Windows

- 通过"控制面板"→"程序和功能"卸载
- 或通过"设置"→"应用"卸载

### macOS

- 将 Applications 文件夹中的 InfloWave 拖拽到废纸篓

### Linux

```bash
# DEB 包安装的版本
sudo apt remove inflowave

# AppImage 版本
直接删除 AppImage 文件即可
```

### 清理用户数据

如需完全清理用户数据和配置：

- **Windows**: 删除 `%APPDATA%\com.inflowave.app` 文件夹
- **macOS**: 删除 `~/Library/Application Support/com.inflowave.app` 文件夹
- **Linux**: 删除 `~/.local/share/com.inflowave.app` 文件夹

## ❓ 安装问题

### 常见问题

**Windows 安装失败**：

- 确保以管理员权限运行安装程序
- 检查是否有杀毒软件阻止安装
- 尝试关闭 Windows Defender 实时保护后重新安装

**macOS 无法打开**：

- 在"系统偏好设置"→"安全性与隐私"中允许运行
- 或按住 Control 键点击应用图标，选择"打开"

**Linux 依赖问题**：

```bash
# Ubuntu/Debian 安装缺失依赖
sudo apt-get install -f

# 或手动安装常见依赖
sudo apt install libwebkit2gtk-4.0-37 libgtk-3-0
```

如果遇到其他安装问题，请访问 [GitHub Issues](https://github.com/chenqi92/inflowave/issues) 寻求帮助。

---

**安装完成后，请查看 [快速开始](./quick-start.md) 了解如何使用 InfloWave！** 🚀
