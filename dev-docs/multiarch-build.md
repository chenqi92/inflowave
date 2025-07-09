# 多架构构建系统

## 📋 概述

本文档描述了 InfloWave 项目的多架构构建系统，该系统支持为多个平台和 CPU 架构构建应用程序。

## 🎯 支持的平台和架构

### Windows
- **x64** (x86_64-pc-windows-msvc) - 64位 Intel/AMD 处理器
- **x86** (i686-pc-windows-msvc) - 32位 Intel/AMD 处理器  
- **ARM64** (aarch64-pc-windows-msvc) - ARM64 处理器

### macOS
- **x64** (x86_64-apple-darwin) - Intel 处理器
- **ARM64** (aarch64-apple-darwin) - Apple Silicon (M1/M2/M3)

### Linux
- **x64** (x86_64-unknown-linux-gnu) - 64位 Intel/AMD 处理器
- **ARM64** (aarch64-unknown-linux-gnu) - ARM64 处理器
- **x86** (i686-unknown-linux-gnu) - 32位 Intel/AMD 处理器

## 📦 构建产物格式

### Windows
- **MSI** - Windows Installer 包
- **NSIS** - Nullsoft 安装程序

### macOS
- **DMG** - 磁盘映像文件
- **APP** - 应用程序包

### Linux
- **DEB** - Debian 包格式
- **RPM** - Red Hat 包格式
- **AppImage** - 便携式应用程序格式

## 🛠️ 构建工具

### 核心脚本

#### 1. `build-multiarch.ps1`
多架构构建的主要脚本，支持：
- 单平台多架构构建
- 全平台构建
- 特定目标构建
- 自动依赖管理

```powershell
# 使用示例
.\scripts\build-multiarch.ps1 -Platform windows -Architecture all
.\scripts\build-multiarch.ps1 -Platform all -Architecture all
.\scripts\build-multiarch.ps1 -Platform linux -Architecture arm64
```

#### 2. `detect-arch.ps1`
系统架构检测和优化建议脚本：
- 自动检测当前系统架构
- 提供构建优化建议
- 显示系统性能信息
- 推荐最佳构建配置

```powershell
# 使用示例
.\scripts\detect-arch.ps1
.\scripts\detect-arch.ps1 -Verbose
```

#### 3. `manage-targets.ps1`
Rust 构建目标管理脚本：
- 安装/卸载构建目标
- 查看已安装目标
- 批量目标管理
- 预定义目标组合

```powershell
# 使用示例
.\scripts\manage-targets.ps1 -Action install -Targets "common"
.\scripts\manage-targets.ps1 -Action list
.\scripts\manage-targets.ps1 -Action check -Platform windows
```

#### 4. `check-build-status.ps1`
构建状态检查脚本：
- 验证构建产物完整性
- 显示构建统计信息
- 生成构建报告
- 检测构建问题

```powershell
# 使用示例
.\scripts\check-build-status.ps1
.\scripts\check-build-status.ps1 -Platform windows -ShowDetails
```

## ⚙️ 配置文件

### 1. GitHub Actions 工作流

#### `.github/workflows/release.yml`
自动发布工作流，支持：
- 多平台并行构建
- 架构特定的构建环境
- 交叉编译支持
- 自动发布到 GitHub Releases

#### `.github/workflows/build.yml`
构建测试工作流，用于：
- Pull Request 构建验证
- 多架构构建测试
- 构建产物验证

### 2. Tauri 配置

#### `src-tauri/tauri.conf.json`
更新的 Tauri 配置：
- 支持多种包格式
- 优化的图标配置
- 平台特定设置

### 3. Cargo 配置

#### `src-tauri/.cargo/config.toml`
Rust 编译优化配置：
- 架构特定的编译标志
- 性能优化设置
- 交叉编译链接器配置
- 国内镜像加速

### 4. Package.json 脚本

更新的 npm 脚本：
```json
{
  "build:windows-x64": "tauri build --target x86_64-pc-windows-msvc",
  "build:windows-x86": "tauri build --target i686-pc-windows-msvc",
  "build:windows-arm64": "tauri build --target aarch64-pc-windows-msvc",
  "build:macos-x64": "tauri build --target x86_64-apple-darwin",
  "build:macos-arm64": "tauri build --target aarch64-apple-darwin",
  "build:linux-x64": "tauri build --target x86_64-unknown-linux-gnu",
  "build:linux-arm64": "tauri build --target aarch64-unknown-linux-gnu",
  "build:linux-x86": "tauri build --target i686-unknown-linux-gnu"
}
```

## 🚀 使用指南

### 快速开始

1. **检测系统架构**
```powershell
.\scripts\detect-arch.ps1
```

2. **安装构建目标**
```powershell
.\scripts\manage-targets.ps1 -Action install -Targets "common"
```

3. **执行多架构构建**
```powershell
.\scripts\build-multiarch.ps1 -Platform all -Architecture all
```

4. **检查构建结果**
```powershell
.\scripts\check-build-status.ps1 -ShowDetails
```

### 常用构建场景

#### 场景 1: 构建当前平台的所有架构
```powershell
# Windows 用户
.\scripts\build-multiarch.ps1 -Platform windows -Architecture all

# macOS 用户  
.\scripts\build-multiarch.ps1 -Platform macos -Architecture all

# Linux 用户
.\scripts\build-multiarch.ps1 -Platform linux -Architecture all
```

#### 场景 2: 构建特定架构
```powershell
# 构建 ARM64 版本
.\scripts\build-multiarch.ps1 -Platform all -Architecture arm64

# 构建 x64 版本
.\scripts\build-multiarch.ps1 -Platform all -Architecture x64
```

#### 场景 3: 发布构建
```powershell
# 构建所有平台和架构（发布用）
.\scripts\build-multiarch.ps1 -Platform all -Architecture all -BuildType release
```

## 📊 构建优化

### 性能优化
- **并行构建**: 根据 CPU 核心数自动调整
- **增量编译**: 启用 Cargo 增量编译
- **LTO 优化**: 链接时优化
- **目标特定优化**: 针对不同架构的编译标志

### 缓存策略
- **Rust 缓存**: 使用 sccache 或内置缓存
- **依赖缓存**: npm 和 Cargo 依赖缓存
- **构建缓存**: GitHub Actions 缓存

### 交叉编译支持
- **Linux ARM64**: 使用 gcc-aarch64-linux-gnu
- **Linux x86**: 使用 gcc-multilib
- **Windows ARM64**: 使用 MSVC 工具链

## 🔧 故障排除

### 常见问题

#### 1. 构建目标未安装
```powershell
# 解决方案：安装缺失的目标
.\scripts\manage-targets.ps1 -Action install -Targets "目标名称"
```

#### 2. 交叉编译失败
```powershell
# 检查系统依赖
sudo apt-get install gcc-aarch64-linux-gnu  # Linux ARM64
sudo apt-get install gcc-multilib           # Linux x86
```

#### 3. 构建产物不完整
```powershell
# 检查构建状态
.\scripts\check-build-status.ps1 -ShowDetails

# 重新构建
.\scripts\build-multiarch.ps1 -Platform 平台 -Architecture 架构
```

### 调试技巧

1. **启用详细输出**
```powershell
$env:RUST_BACKTRACE = "1"
$env:RUST_LOG = "debug"
```

2. **检查构建日志**
```powershell
# 查看 Cargo 构建日志
cargo build --target 目标 --verbose
```

3. **验证构建环境**
```powershell
# 检查 Rust 工具链
rustup show
rustup target list --installed
```

## 📈 未来改进

### 计划中的功能
- [ ] 自动化性能基准测试
- [ ] 构建时间优化分析
- [ ] 更多包格式支持 (Snap, Flatpak)
- [ ] 云构建支持
- [ ] 构建缓存优化

### 性能目标
- 减少构建时间 30%
- 优化包大小 20%
- 提高构建成功率至 99%

## 📚 参考资源

- [Tauri 构建指南](https://tauri.app/v1/guides/building/)
- [Rust 交叉编译](https://rust-lang.github.io/rustup/cross-compilation.html)
- [GitHub Actions 矩阵构建](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [Cargo 配置](https://doc.rust-lang.org/cargo/reference/config.html)
