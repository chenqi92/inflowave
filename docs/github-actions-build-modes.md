# GitHub Actions 构建模式说明

## 🎯 回答你的问题

**GitHub Actions 默认使用的是 "纯 Tauri 模式"**

## 📋 构建模式详解

### 当前配置分析

根据你的 `package.json` 配置：

```json
{
  "tauri:build": "npm run copy-docs && tauri build",           // 纯 Tauri 模式
  "tauri:build:server": "ENABLE_EMBEDDED_SERVER=true npm run tauri:build"  // 服务器模式
}
```

### GitHub Actions 构建行为

#### 1. 默认构建（当前）
- **触发条件**: 推送标签 `v*` 时
- **使用命令**: `npm run tauri:build`
- **环境变量**: `ENABLE_EMBEDDED_SERVER=false`
- **结果**: 构建**纯 Tauri 模式**

#### 2. 新增的双模式构建
我为你创建了两个 workflow 文件：

##### `build.yml` - 智能模式选择
- 默认构建标准模式
- 支持手动选择服务器模式
- 包含开发测试

##### `dual-build.yml` - 同时构建两个版本
- 自动构建两个版本
- 分别发布到不同的 Release

## 🚀 使用方式

### 方式 1：手动选择模式
1. 进入 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Build and Release" workflow
4. 点击 "Run workflow"
5. 选择是否启用嵌入式服务器

### 方式 2：标签触发双模式构建
1. 推送标签：`git tag v1.0.0 && git push origin v1.0.0`
2. 自动构建两个版本：
   - `v1.0.0` - 标准版
   - `v1.0.0-server` - 服务器版

### 方式 3：分支名称控制
- 推送包含 "server" 的标签会自动启用服务器模式
- 例如：`v1.0.0-server`

## 📦 发布包差异

### 标准版（默认）
```
InfloWave v1.0.0 (Standard)
├── Windows: InfloWave_1.0.0_x64.msi
├── macOS: InfloWave_1.0.0_universal.dmg  
└── Linux: inflowave_1.0.0_amd64.deb
```

**特点**：
- ✅ 无端口冲突风险
- ✅ 最佳性能
- ✅ 最高安全性
- ✅ 体积最小

### 服务器版（可选）
```
InfloWave v1.0.0 (Server Mode)
├── Windows: InfloWave_1.0.0-server_x64.msi
├── macOS: InfloWave_1.0.0-server_universal.dmg
└── Linux: inflowave_1.0.0-server_amd64.deb
```

**特点**：
- ✅ 智能端口管理
- ✅ HTTP API 支持
- ✅ 调试工具
- ✅ 扩展功能

## 🔧 修改默认行为

### 改为默认构建服务器模式

1. **修改 package.json**：
```json
{
  "tauri:build": "ENABLE_EMBEDDED_SERVER=true npm run copy-docs && tauri build"
}
```

2. **或修改 workflow 环境变量**：
```yaml
env:
  ENABLE_EMBEDDED_SERVER: true  # 改为 true
```

### 只构建特定平台

修改 workflow 中的 matrix：
```yaml
strategy:
  matrix:
    include:
      # 只构建 Windows
      - platform: 'windows-latest'
        args: '--target x86_64-pc-windows-msvc'
```

## 📊 推荐配置

### 方案 A：主推标准版（推荐）
- 默认构建：标准版
- 手动触发：服务器版
- 适合：大多数用户

### 方案 B：同时发布两版本
- 使用 `dual-build.yml`
- 用户可选择下载
- 适合：高级用户多的场景

### 方案 C：只发布服务器版
- 修改默认环境变量
- 统一使用服务器模式
- 适合：需要 API 功能的场景

## 🎉 总结

**目前 GitHub Actions 构建的是纯 Tauri 模式**，这是最适合桌面应用的选择：

- ✅ **零端口冲突** - 不使用 HTTP 端口
- ✅ **最佳用户体验** - 启动即可用，无需等待服务器
- ✅ **最高安全性** - 无网络暴露面
- ✅ **最优性能** - 直接的 IPC 通信

如果需要服务器模式的功能，可以使用我创建的 workflow 手动构建或同时发布两个版本。