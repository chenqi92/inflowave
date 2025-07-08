# InfluxDB GUI Manager - 构建脚本说明

## 📋 脚本概览

本项目提供了完整的构建脚本集合，支持 Windows (PowerShell) 和 Linux/macOS (Bash) 环境，能够自动解决常见的编译问题。

## 🚀 快速开始

### 一键构建 (推荐)

**Windows:**
```powershell
# 启动开发模式
.\scripts\one-click-build.ps1

# 构建项目
.\scripts\one-click-build.ps1 -Target build

# 强制清理重建
.\scripts\one-click-build.ps1 -Force
```

**Linux/macOS:**
```bash
# 启动开发模式
./scripts/quick-build.sh dev

# 构建项目
./scripts/quick-build.sh build

# 清理重建
./scripts/quick-build.sh -c build
```

## 📁 脚本文件说明

### 🔧 开发环境设置

#### `setup-dev.ps1` (Windows)
- **功能**: 自动安装和配置完整的开发环境
- **包含**: Scoop、Rust、Node.js、开发工具、项目依赖
- **用法**: `.\scripts\setup-dev.ps1`
- **选项**:
  - `-SkipScoop`: 跳过 Scoop 安装
  - `-SkipRust`: 跳过 Rust 安装
  - `-SkipNode`: 跳过 Node.js 安装
  - `-Force`: 强制重新安装

### 🏗️ 构建脚本

#### `build.ps1` / `build.sh` (跨平台)
- **功能**: 完整的生产构建脚本
- **用法**: 
  - Windows: `.\scripts\build.ps1`
  - Linux/macOS: `./scripts/build.sh`
- **选项**:
  - `--target <平台>`: 指定构建目标平台
  - `--release`: 构建发布版本

#### `quick-build.ps1` / `quick-build.sh` (跨平台)
- **功能**: 快速构建和开发脚本
- **模式**:
  - `check`: 仅检查代码语法
  - `build`: 构建 debug 版本
  - `dev`: 启动开发模式
  - `full`: 完整构建 (前端+后端)
- **选项**:
  - `-Clean`: 清理构建文件
  - `-Offline`: 离线模式
  - `-FixNetwork`: 修复网络问题

#### `one-click-build.ps1` (Windows)
- **功能**: 一键解决所有问题并完成构建
- **特点**: 自动修复网络、依赖、编译问题
- **用法**: `.\scripts\one-click-build.ps1 -Target <dev|build|check>`

### 🌐 网络问题修复

#### `fix-network.ps1` (Windows)
- **功能**: 解决 Git、Cargo、npm 网络连接问题
- **用法**: `.\scripts\fix-network.ps1 -All`
- **选项**:
  - `-SetMirrors`: 设置国内镜像源
  - `-ResetMirrors`: 重置为官方源
  - `-TestConnections`: 测试网络连接
  - `-FixGit`: 修复 Git 连接问题

### ⚡ **快速测试**

#### `quick-test.ps1` (Windows)
- **功能**: 快速验证环境和基础编译
- **用法**: `.\scripts\quick-test.ps1`
- **特点**:
  - 自动修复网络问题
  - 检查开发环境
  - 安装前端依赖
  - 验证后端代码编译

## 🎯 使用场景

### 场景 1: 首次设置开发环境
```powershell
# Windows - 完整设置
.\scripts\setup-dev.ps1
.\scripts\one-click-build.ps1

# 或者快速验证
.\scripts\quick-test.ps1
```

### 场景 2: 日常开发
```powershell
# 启动开发模式
.\scripts\one-click-build.ps1

# 或者使用快速脚本
.\scripts\quick-build.ps1 -Mode dev
```

### 场景 3: 网络问题
```powershell
# 修复网络问题
.\scripts\fix-network.ps1 -All

# 然后重新构建
.\scripts\one-click-build.ps1 -Force
```

### 场景 4: 生产构建
```powershell
# 完整构建
.\scripts\build.ps1 --release

# 或者
.\scripts\quick-build.ps1 -Mode full
```

### 场景 5: 代码检查
```powershell
# 快速检查代码
.\scripts\quick-build.ps1 -Mode check

# 或者
.\scripts\one-click-build.ps1 -Target check
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 网络连接问题
**症状**: Cargo 下载依赖失败、Git clone 失败
**解决**: 
```powershell
.\scripts\fix-network.ps1 -All
```

#### 2. 依赖冲突
**症状**: 编译错误、版本冲突
**解决**: 
```powershell
.\scripts\one-click-build.ps1 -Force
```

#### 3. 环境配置问题
**症状**: 找不到 Rust、Node.js 等工具
**解决**: 
```powershell
.\scripts\setup-dev.ps1 -Force
```

#### 4. 构建缓存问题
**症状**: 奇怪的编译错误
**解决**: 
```powershell
.\scripts\quick-build.ps1 -Clean -Mode build
```

## 📊 脚本功能对比

| 脚本 | 环境设置 | 网络修复 | 快速构建 | 生产构建 | 开发模式 | 快速验证 |
|------|----------|----------|----------|----------|----------|----------|
| `setup-dev.ps1` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `fix-network.ps1` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `quick-test.ps1` | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| `quick-build.ps1` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `build.ps1` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `one-click-build.ps1` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🎨 自定义配置

### Cargo 镜像配置
脚本会自动创建 `~/.cargo/config.toml`:
```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"
```

### npm 镜像配置
```bash
npm config set registry https://registry.npmmirror.com
```

### Git 配置优化
```bash
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```

## 🔍 调试模式

### 启用详细输出
```powershell
# Windows
.\scripts\quick-build.ps1 -Mode build -Verbose

# Linux/macOS
./scripts/quick-build.sh build -v
```

### 查看当前配置
```powershell
.\scripts\fix-network.ps1  # 不带参数会显示当前配置
```

## 📝 开发建议

1. **首次使用**: 运行 `setup-dev.ps1` 设置完整环境
2. **日常开发**: 使用 `one-click-build.ps1` 一键启动
3. **网络问题**: 优先使用 `fix-network.ps1` 修复
4. **生产构建**: 使用 `build.ps1` 进行正式构建
5. **问题调试**: 使用 `-Verbose` 参数查看详细信息

## 🆘 获取帮助

所有脚本都支持帮助参数:
```powershell
.\scripts\<script-name>.ps1 -h
.\scripts\<script-name>.ps1 --help
```

## 🎉 成功标志

构建成功后，您应该看到:
- ✅ 代码检查通过
- ✅ 依赖安装完成  
- ✅ 前端服务器启动 (开发模式)
- ✅ Tauri 应用启动 (开发模式)
- 📁 构建产物生成 (构建模式)

---

**提示**: 如果遇到任何问题，请先尝试运行 `.\scripts\one-click-build.ps1 -Force` 进行强制重建。
