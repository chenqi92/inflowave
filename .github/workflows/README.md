# GitHub Actions Workflows 说明

## 📋 Workflow 列表

### 1. `build.yml` - 单版本构建（默认）
**自动触发**：推送标签时自动运行
- ✅ **推送 `v*` 标签时自动构建**
- ✅ **默认构建标准版（纯 Tauri 模式）**
- ✅ **可手动选择服务器模式**
- ✅ **包含 PR 测试**

### 2. `dual-build.yml` - 双版本构建（手动）
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

| 特性 | 标准版 | 服务器版 |
|------|--------|----------|
| 端口使用 | 无 | 1422-1500 |
| 通信方式 | IPC | IPC + HTTP |
| 性能 | 最优 | 良好 |
| 安全性 | 最高 | 高 |
| 体积 | 最小 | 稍大 |
| API 支持 | 无 | ✅ |
| 调试工具 | 基础 | 增强 |

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

## ✅ 当前配置总结

- ✅ **默认安全**：自动构建标准版，无端口冲突
- ✅ **灵活选择**：需要时可手动构建服务器版
- ✅ **双版本可选**：高级用户可构建两个版本
- ✅ **测试完整**：包含端口冲突测试