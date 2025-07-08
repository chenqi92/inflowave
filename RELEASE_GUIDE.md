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
- `VERSION` - 主版本文件
- `package.json` - 前端项目版本
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

推送后，GitHub Actions 会自动：
1. 检测 VERSION 文件变化
2. 创建对应的 Git tag (例如: v1.0.1)
3. 构建多平台安装包
4. 创建 GitHub Release

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

1. 访问 GitHub 仓库的 **Actions** 标签页
2. 查看 "Auto Release" 工作流状态
3. 构建完成后，在 **Releases** 页面查看新发布的版本

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
