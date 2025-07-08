# 🚀 发布指南

本文档说明如何使用自动化发布系统来发布 InfluxDB GUI Manager 的新版本。

## 📋 发布流程概览

1. **更新版本号** - 使用版本更新脚本
2. **提交更改** - 推送到 GitHub
3. **自动构建** - GitHub Actions 自动处理
4. **发布完成** - 多平台安装包自动发布

## 🔧 使用方法

### 步骤 1: 更新版本号

使用提供的脚本来更新版本号：

**Windows (PowerShell):**
```powershell
.\scripts\update-version.ps1 -Version "1.0.1"
```

**Linux/macOS (Bash):**
```bash
./scripts/update-version.sh 1.0.1
```

### 步骤 2: 检查更改

脚本会自动更新以下文件：
- `package.json` - 前端项目版本（主版本文件）
- `src-tauri/tauri.conf.json` - Tauri 应用版本

检查更改是否正确：
```bash
git diff
```

### 步骤 3: 提交并推送

```bash
git add .
git commit -m "chore: bump version to 1.0.1"
git push origin main
```

### 步骤 4: 等待自动构建

推送后，GitHub Actions 会自动执行以下流程：

#### 🔍 版本检查阶段
1. **读取版本号** - 从 package.json 文件读取新版本号
2. **检查标签冲突** - 验证对应的 Git tag 是否已存在
3. **决定是否发布** - 如果版本号未使用过，继续发布流程

#### 🏷️ 标签创建阶段
1. **创建 Git tag** - 自动创建 `v1.0.1` 格式的标签
2. **推送标签** - 将标签推送到远程仓库

#### 🔨 多平台构建阶段
并行构建三个平台的安装包：
- **Windows** (windows-latest)
- **macOS** (macos-latest) - Universal Binary
- **Linux** (ubuntu-20.04)

每个平台的构建步骤：
1. 设置构建环境 (Rust + Node.js)
2. 安装系统依赖
3. 安装项目依赖
4. 更新 Tauri 配置中的版本号
5. 执行 Tauri 构建
6. 上传构建产物到 GitHub Release

## 📦 构建产物

自动构建会生成以下安装包：

### Windows
- `.msi` - Windows 安装程序

### macOS
- `.dmg` - macOS 磁盘映像
- Universal Binary (支持 Intel 和 Apple Silicon)

### Linux
- `.deb` - Debian/Ubuntu 包
- `.AppImage` - 通用 Linux 应用

## 🔍 监控构建状态

### 查看构建进度
1. 访问 GitHub 仓库的 **Actions** 标签页
2. 找到 "Auto Release" 工作流
3. 点击最新的运行实例查看详细状态

### 构建阶段说明
- **check-version** ✅ - 版本检查和验证
- **create-tag** ✅ - Git 标签创建
- **build-and-release** (3个并行任务) - 多平台构建
  - **macos-latest** - macOS 构建
  - **ubuntu-20.04** - Linux 构建
  - **windows-latest** - Windows 构建

### 完成标志
- 所有构建任务显示绿色 ✅
- **Releases** 页面出现新版本
- 每个平台的安装包都已上传

### 构建时间预估
- **总时间**: 约 15-30 分钟
- **版本检查**: 1-2 分钟
- **标签创建**: 1 分钟
- **多平台构建**: 10-25 分钟 (并行执行)

## 📝 版本号规范

使用 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **主版本号** (MAJOR): 不兼容的 API 修改
- **次版本号** (MINOR): 向下兼容的功能性新增
- **修订号** (PATCH): 向下兼容的问题修正

示例：
- `1.0.0` - 首个正式版本
- `1.0.1` - 修复 bug
- `1.1.0` - 新增功能
- `2.0.0` - 重大更新

## ⚠️ 注意事项

1. **版本号唯一性**: 确保版本号未被使用过
2. **测试验证**: 发布前确保代码已充分测试
3. **发布说明**: 可以在 GitHub Release 页面编辑发布说明
4. **回滚**: 如需回滚，可以删除对应的 tag 和 release

## 🛠️ 故障排除

### 构建失败
1. 检查 GitHub Actions 日志
2. 确认代码编译无误
3. 检查依赖项是否正确

### 版本冲突
1. 确认版本号未被使用
2. 检查 Git tag 是否已存在
3. 使用新的版本号重新发布

### 权限问题
1. 确认 GitHub token 权限
2. 检查仓库设置中的 Actions 权限

## 📞 获取帮助

如果遇到问题，请：
1. 查看 GitHub Actions 构建日志
2. 检查本文档的故障排除部分
3. 在项目仓库中创建 Issue
