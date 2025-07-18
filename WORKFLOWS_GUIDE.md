# GitHub Actions 工作流程指南

本项目配置了多个 GitHub Actions 工作流程，用于自动化构建、测试和发布。

## 🔄 工作流程概览

### 1. 版本自动发布流程 (`version-release.yml`) ⭐ 推荐

**触发条件**：
- 推送到 `main` 或 `master` 分支
- 手动触发

**工作原理**：
1. 检测 `package.json` 中的版本号
2. 如果版本对应的 git 标签不存在，则触发自动发布
3. 构建全平台全架构的安装包
4. 创建 GitHub Release 并上传安装包

**支持的平台和架构**：
- **Windows**: x64, x86
- **macOS**: Intel (x64), Apple Silicon (ARM64), Universal
- **Linux**: x64, ARM64, x86

### 2. 完整自动发布流程 (`auto-release.yml`)

**触发条件**：
- 推送到 `main` 或 `master` 分支时，如果以下文件有变化：
  - `package.json`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
- 手动触发

**额外功能**：
- 版本一致性检查和自动同步
- 更详细的发布说明
- 构建后的通知摘要

### 3. 传统构建流程 (`build.yml`)

**触发条件**：
- 推送 git 标签 (`v*`)
- Pull Request 到 `main` 或 `master`
- 手动触发

### 4. 双模式构建流程 (`dual-build.yml`)

**触发条件**：
- 仅手动触发

## 🚀 如何使用

### 方法 1: 自动版本发布（推荐）

1. 更新版本号：
   ```bash
   # 升级补丁版本 (1.0.0 → 1.0.1)
   npm run version:bump patch
   
   # 升级次版本 (1.0.0 → 1.1.0)
   npm run version:bump minor
   
   # 升级主版本 (1.0.0 → 2.0.0)
   npm run version:bump major
   ```

2. 提交并推送到主分支：
   ```bash
   git add .
   git commit -m "chore: bump version to x.x.x"
   git push origin main
   ```

3. GitHub Actions 将自动：
   - 检测版本变化
   - 构建全平台安装包
   - 创建 GitHub Release
   - 上传所有构建产物

### 方法 2: 手动创建标签

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 方法 3: 手动触发

1. 在 GitHub 仓库页面，进入 "Actions" 标签页
2. 选择相应的工作流程
3. 点击 "Run workflow" 按钮

## 📦 构建模式

### Standard Mode（标准模式）
- ✅ 零端口冲突 - IPC 通信
- ✅ 最佳性能 - 原生通信  
- ✅ 增强安全性 - 无网络暴露
- ✅ 更小体积 - 最小依赖

### Server Mode（服务器模式）
- 🔌 智能端口管理 (1422-1500)
- 🌐 HTTP API 支持
- 🔄 CORS 代理功能
- 🛠️ 调试工具
- 📡 WebSocket 支持

## 🔧 版本管理

### 版本同步
项目包含版本同步脚本，确保以下文件的版本一致：
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

### 版本管理命令
```bash
# 检查版本一致性
npm run version:check

# 同步版本
npm run version:sync

# 升级版本并创建标签
npm run version:bump patch --tag
npm run version:bump minor --tag
npm run version:bump major --tag
```

## 📋 发布检查清单

在发布新版本前，请确保：

1. ✅ 所有测试通过
2. ✅ 版本号已更新
3. ✅ 版本在各配置文件中一致
4. ✅ 更新日志已更新
5. ✅ 图标和资源文件已更新
6. ✅ 文档已更新

## 🔍 故障排除

### 常见问题

1. **版本标签已存在**
   - 错误信息：Tag already exists
   - 解决方案：删除现有标签或使用新版本号

2. **构建失败**
   - 检查依赖项是否正确安装
   - 查看构建日志中的错误信息
   - 确保所有必要的权限已设置

3. **跨平台构建问题**
   - Linux ARM64: 确保交叉编译工具链正确安装
   - Windows x86: 确保 32 位依赖项可用
   - macOS Universal: 确保两种架构的目标都已安装