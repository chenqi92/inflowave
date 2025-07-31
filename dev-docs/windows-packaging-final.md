# Windows 打包方案 - cargo-wix (最终版本)

本项目已完全迁移到使用 `cargo-wix` 进行 Windows 打包，并且已经在本地环境中验证成功。

## 🎯 方案优势

### 1. **简化构建流程**
- 使用标准的 `cargo-wix` 工具链
- 一键安装脚本自动配置环境
- 统一的 Rust 生态系统工具
- 本地构建完全可用

### 2. **更好的稳定性**
- 避免了 Tauri WiX 集成的兼容性问题
- 直接使用 WiX Toolset 3.14 标准功能
- 已解决所有依赖项和路径问题
- 生成标准 MSI 安装包

### 3. **企业级功能**
- 100% 原生 Windows Installer (MSI)
- 支持 AD/GPO 部署
- 完整的升级和卸载支持
- 系统信任度高

## 🚀 快速开始

### 一键设置环境
```bash
# 安装所有必需的工具（WiX Toolset + cargo-wix）
npm run setup:windows

# 或者直接运行脚本
powershell -ExecutionPolicy Bypass -File scripts/setup-windows-build.ps1
```

### 构建 MSI 安装包
```bash
# 使用 npm 脚本
npm run build:windows:cargo-wix

# 或者直接运行构建脚本
powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1

# 带详细输出
powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1 -Verbose
```

## 🛠️ 环境要求

### 自动安装的组件
- **WiX Toolset 3.14.1** - 安装到用户目录
- **cargo-wix 0.3.9** - Rust 的 WiX 集成工具

### 手动要求
- **Rust 工具链** - 需要预先安装
- **Node.js** - 用于前端构建

## 📦 构建输出

构建成功后，MSI 文件位于：
```
src-tauri/target/wix/InfloWave-{version}-{arch}.msi
```

示例输出：
```
InfloWave-0.5.0-x86_64.msi (5.95 MB)
```

## 🔧 技术细节

### WiX Toolset 安装
- 下载地址：`https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip`
- 安装位置：`%LOCALAPPDATA%\WiX Toolset v3.14`
- 可执行文件：`bin\candle.exe`, `bin\light.exe`
- 验证文件：`bin\darice.cub`, `bin\mergemod.cub`

### cargo-wix 配置
在 `Cargo.toml` 中：
```toml
[package.metadata.wix]
upgrade-guid = "12345678-1234-1234-1234-123456789012"
path-guid = "87654321-4321-4321-4321-210987654321"
eula = false
```

### WiX 模板
- 位置：`src-tauri/wix/main.wxs`
- 自动生成：`cargo wix init --force`
- 支持自定义：可手动编辑模板

## 🌏 多语言支持

### 英文版本（默认）
```bash
npm run build:windows:cargo-wix
```

### 中文版本
```bash
npm run build:windows:cargo-wix:chinese
# 或
powershell -ExecutionPolicy Bypass -File scripts/build-windows.ps1 -Chinese
```

## 🔄 GitHub Actions 集成

### 新的构建流程
1. **环境设置**：运行 `setup-windows-build.ps1`
2. **构建 MSI**：运行 `build-windows.ps1`
3. **上传文件**：自动上传到 GitHub Release

### 备用方案
如果 cargo-wix 构建失败，自动回退到 Tauri NSIS 构建。

## 🐛 故障排除

### 常见问题

1. **WiX Toolset 未找到**
   ```bash
   # 重新运行安装脚本
   npm run setup:windows
   ```

2. **cargo-wix 命令不存在**
   ```bash
   # 手动安装
   cargo install cargo-wix --force --locked
   ```

3. **candle.exe 执行失败**
   ```bash
   # 检查 PATH 环境变量
   echo $env:PATH | Select-String "WiX"
   ```

### 验证安装
```bash
# 测试所有组件
powershell -ExecutionPolicy Bypass -File scripts/test-build-simple.ps1
```

## 📋 已解决的问题

- ✅ **candle.exe 路径问题** - 正确配置 WiX 工具路径
- ✅ **依赖文件缺失** - 自动安装所有必需的 .cub 和 .dll 文件
- ✅ **环境变量设置** - 自动配置 PATH 和 WIX 环境变量
- ✅ **模板变量错误** - 使用 cargo-wix 标准模板
- ✅ **本地构建验证** - 完整测试并确认可用

## 🎉 构建成功示例

```
InfloWave Windows Build Script
Target Platform: x86_64-pc-windows-msvc
Build Profile: release
WiX Toolset Path: C:\Users\...\AppData\Local\WiX Toolset v3.14
cargo-wix installed: cargo-wix-wix 0.3.9
WiX configuration exists
Building Rust application...
    Finished `release` profile [optimized] target(s) in 0.51s
Building MSI installer...
Build completed!
Generated MSI files:
  InfloWave-0.5.0-x86_64.msi (5.95 MB)
  Path: ...\src-tauri\target\wix\InfloWave-0.5.0-x86_64.msi
Windows build script completed!
```

这个方案已经在本地环境中完全验证，可以稳定地生成 Windows MSI 安装包！
