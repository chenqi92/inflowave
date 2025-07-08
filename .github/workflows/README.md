# GitHub Actions 工作流说明

本目录包含了项目的 GitHub Actions 自动化工作流配置。

## 📋 工作流列表

### 🚀 `release.yml` - 自动发布工作流

**触发条件**:
- 当 `VERSION` 文件发生变化并推送到 `main` 或 `master` 分支时
- 手动触发 (`workflow_dispatch`)

**功能**:
1. **版本检查** - 读取 VERSION 文件并检查对应的 Git tag 是否已存在
2. **创建标签** - 如果版本不存在，自动创建 Git tag
3. **多平台构建** - 并行构建 Windows、macOS、Linux 版本
4. **自动发布** - 创建 GitHub Release 并上传安装包

**构建产物**:
- **Windows**: `.msi` 安装程序
- **macOS**: `.dmg` 磁盘映像 (Universal Binary)
- **Linux**: `.deb` 和 `.AppImage` 包

### 🧪 `test-release.yml` - 测试工作流

**触发条件**:
- 手动触发，用于测试发布流程

**功能**:
- 测试版本读取和标签检查逻辑
- 验证构建环境配置
- 检查项目结构完整性

### 🔨 `build.yml` - 构建工作流 (已存在)

**触发条件**:
- 推送标签时 (`v*`)
- Pull Request 到 main 分支
- 手动触发

**功能**:
- 基础的构建和测试流程

## 🔧 使用方法

### 自动发布新版本

1. **更新版本号**:
   ```powershell
   # Windows
   .\scripts\update-version.ps1 -Version "1.0.1"
   
   # Linux/macOS
   ./scripts/update-version.sh 1.0.1
   ```

2. **提交并推送**:
   ```bash
   git add .
   git commit -m "chore: bump version to 1.0.1"
   git push origin main
   ```

3. **自动化流程**:
   - GitHub Actions 检测到 VERSION 文件变化
   - 自动创建 `v1.0.1` 标签
   - 并行构建所有平台的安装包
   - 创建 GitHub Release 并上传文件

### 测试发布流程

1. 访问 GitHub 仓库的 **Actions** 标签页
2. 选择 **Test Release Workflow**
3. 点击 **Run workflow**
4. 输入测试版本号（如 `1.0.0-test`）
5. 运行测试以验证配置

### 手动触发发布

1. 访问 GitHub 仓库的 **Actions** 标签页
2. 选择 **Auto Release**
3. 点击 **Run workflow**
4. 选择分支并运行

## ⚙️ 配置说明

### 环境要求

工作流会自动安装以下依赖：
- **Node.js**: LTS 版本
- **Rust**: 最新稳定版
- **系统依赖**: 各平台构建所需的系统库

### 权限配置

确保仓库设置中启用了以下权限：
- **Actions**: 读写权限
- **Contents**: 读写权限 (用于创建 release)
- **Metadata**: 读权限

### 密钥配置

工作流使用 `GITHUB_TOKEN`，这是 GitHub 自动提供的，无需额外配置。

## 🐛 故障排除

### 常见问题

1. **构建失败**:
   - 检查 Actions 日志中的错误信息
   - 确认代码可以在本地正常构建
   - 验证依赖项配置是否正确

2. **版本冲突**:
   - 确认版本号未被使用过
   - 检查是否存在同名的 Git tag
   - 删除冲突的 tag 后重新运行

3. **权限错误**:
   - 检查仓库的 Actions 权限设置
   - 确认 GITHUB_TOKEN 有足够权限

### 调试方法

1. **查看日志**: 在 Actions 页面查看详细的构建日志
2. **本地测试**: 使用相同的命令在本地环境测试
3. **测试工作流**: 使用 `test-release.yml` 验证配置

## 📚 相关文档

- [发布指南](../../RELEASE_GUIDE.md) - 详细的版本发布流程
- [构建脚本](../../scripts/README.md) - 本地构建脚本说明
- [Tauri 文档](https://tauri.app/v1/guides/building/) - Tauri 构建指南
