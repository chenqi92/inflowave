# GitHub Actions Workflows 说明

## 📋 Workflow 列表

### 1. `version-release.yml` - 版本自动发布（主要）
**自动触发**：修改 `package.json` 版本号时自动运行
- ✅ **监听 `package.json` 版本变更**
- ✅ **全平台全架构构建**
- ✅ **自动创建 GitHub Release**
- ✅ **自动上传到 Cloudflare R2**（国内访问优化）
- ✅ **支持手动触发**

### 2. `build.yml` - 单版本构建（备用）
**自动触发**：推送标签时自动运行
- ✅ **推送 `v*` 标签时自动构建**
- ✅ **默认构建标准版（纯 Tauri 模式）**
- ✅ **可手动选择服务器模式**
- ✅ **包含 PR 测试**

### 3. `upload-to-r2.yml` - Cloudflare R2 上传（独立）
**手动触发或自动调用**：灵活的上传方式
- ☁️ **独立的 R2 上传 workflow**
- ☁️ **支持手动触发上传指定版本**
- ☁️ **可被其他 workflow 调用**
- ☁️ **灵活选择上传的平台**

### 4. `dual-build.yml` - 双版本构建（手动）
**手动触发**：需要手动运行
- 🔧 **仅手动触发**
- 🔧 **同时构建两个版本**
- 🔧 **可选择是否创建 Release**

## 🚀 使用方式

### 常规发布（推荐）
1. 创建并推送标签：
```bash
git tag v1.0.0
git push origin v1.0.0
```
2. 自动构建**标准版**并发布到 GitHub Releases

### 手动构建双版本
1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **"Dual Mode Build"**
4. 点击 **"Run workflow"**
5. 填写参数：
   - **Tag name**: `v1.0.0`
   - **Create GitHub release**: `true` (是否创建发布)

### 手动构建单版本（服务器模式）
1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **"Build and Release (Single Mode)"**
4. 点击 **"Run workflow"**
5. 选择 **Enable embedded server mode**: `true`

## 📦 构建结果

### 标准版构建
```
Release: InfloWave v1.0.0 (Standard)
├── InfloWave_1.0.0_x64.msi           # Windows
├── InfloWave_1.0.0_universal.dmg     # macOS
└── inflowave_1.0.0_amd64.deb         # Linux
```

### 双版本构建
```
Release 1: InfloWave v1.0.0 (Standard)
├── InfloWave_1.0.0_x64.msi
├── InfloWave_1.0.0_universal.dmg
└── inflowave_1.0.0_amd64.deb

Release 2: InfloWave v1.0.0 (Server Mode)
├── InfloWave_1.0.0-server_x64.msi
├── InfloWave_1.0.0-server_universal.dmg
└── inflowave_1.0.0-server_amd64.deb
```

## ⚙️ 配置说明

### 默认行为
- **推送标签** → 自动构建标准版
- **Pull Request** → 运行测试（不发布）
- **手动触发** → 可选择构建模式

### 构建模式对比

| 特性 | 标准版 | 服务器版        |
|------|--------|-------------|
| 端口使用 | 无 | 14222-15000 |
| 通信方式 | IPC | IPC + HTTP  |
| 性能 | 最优 | 良好          |
| 安全性 | 最高 | 高           |
| 体积 | 最小 | 稍大          |
| API 支持 | 无 | ✅           |
| 调试工具 | 基础 | 增强          |

## 🎯 推荐策略

### 面向普通用户
- 使用默认的自动构建（标准版）
- 简单、安全、无端口问题

### 面向开发者/高级用户
- 需要时手动触发双版本构建
- 提供选择余地

### 企业/特殊需求
- 修改 `build.yml` 中的默认环境变量
- 或创建自定义 workflow

## 🔄 修改默认行为

### 改为默认构建服务器版
编辑 `build.yml` 第 82 行：
```yaml
ENABLE_EMBEDDED_SERVER: true  # 改为 true
```

### 启用自动双版本构建
编辑 `dual-build.yml` 第 3-4 行：
```yaml
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
```

## ☁️ Cloudflare R2 上传功能

### 功能说明
为了解决 GitHub 在某些地区访问受限的问题，提供了独立的 R2 上传 workflow，支持自动和手动两种方式。

### 使用方式

#### 方式一：自动上传（默认）
`version-release.yml` 完成构建后会自动调用 `upload-to-r2.yml` 上传到 Cloudflare R2。

#### 方式二：手动上传
1. 进入 **Actions** > **Upload to Cloudflare R2**
2. 点击 **Run workflow**
3. 填写参数：
   - **版本号**: 例如 `1.0.0`
   - **上传 macOS ARM64 包**: 是/否
   - **上传 Windows x64 MSI 包**: 是/否
   - **更新 Release 说明**: 是/否

### 上传的文件
- **macOS ARM64**: `*aarch64*.dmg` - 适用于 Apple Silicon (M1/M2/M3) Mac
- **Windows x64**: `*x64*.msi` - 适用于 64 位 Windows 系统

### 配置方法
详细配置步骤请参考：[R2-SETUP.md](./R2-SETUP.md)

需要在 GitHub Secrets 中配置以下密钥：
- `R2_ACCESS_KEY_ID` - R2 访问密钥 ID
- `R2_SECRET_ACCESS_KEY` - R2 密钥
- `R2_ENDPOINT` - R2 S3 API 端点
- `R2_BUCKET_NAME` - R2 存储桶名称
- `R2_PUBLIC_URL` - R2 公共访问 URL（可选）

### 优势
- ✅ **解耦设计**：上传流程独立，不影响构建
- ✅ **灵活控制**：可随时手动上传任意版本
- ✅ **选择性上传**：可只上传特定平台的包
- ✅ **可禁用**：不需要时可轻松禁用自动上传

## ✅ 当前配置总结

- ✅ **版本自动化**：修改 package.json 版本号即可触发发布
- ✅ **全平台支持**：Windows (x64/x86) + macOS (Intel/ARM) + Linux (x64/ARM64)
- ✅ **国内优化**：自动上传到 Cloudflare R2，提供备用下载源
- ✅ **默认安全**：自动构建标准版，无端口冲突
- ✅ **灵活选择**：需要时可手动构建服务器版
- ✅ **双版本可选**：高级用户可构建两个版本
- ✅ **测试完整**：包含端口冲突测试