# InfloWave 自动更新功能

## 概述

InfloWave 内置了自动更新功能，可以检测 GitHub 上的新版本发布，并提醒用户进行更新。该功能包括：

- 自动检查 GitHub Releases 中的新版本
- 用户友好的更新通知界面
- 灵活的更新设置和用户偏好
- 版本跳过功能
- 跨平台下载链接自动识别

## 功能特性

### 1. 自动版本检查

- **定期检查**：可配置的检查间隔（1小时到1周）
- **启动检查**：应用启动时自动检查更新
- **手动检查**：用户可以随时手动检查更新
- **智能过滤**：过滤预发布版本和草稿版本

### 2. 更新通知

- **通知弹窗**：发现新版本时显示详细的更新信息
- **版本对比**：显示当前版本和最新版本的对比
- **发布说明**：展示新版本的更新内容和改进
- **下载链接**：自动识别当前平台的安装包

### 3. 用户设置

- **自动检查开关**：可以启用或禁用自动检查
- **检查频率**：自定义检查间隔时间
- **通知偏好**：控制是否显示更新通知
- **版本跳过**：可以跳过特定版本的更新
- **预发布版本**：选择是否包含 Beta 和 RC 版本

## 使用方法

### 基本使用

1. **查看更新设置**：
   - 在应用设置页面选择"更新设置"标签
   - 配置自动检查和通知偏好

2. **手动检查更新**：
   - 在更新设置中点击"检查更新"按钮
   - 或使用菜单栏的"帮助" → "检查更新"

3. **处理更新通知**：
   - 点击"立即更新"下载新版本
   - 点击"跳过此版本"忽略该版本
   - 点击"查看详情"访问 GitHub 发布页面

### 高级配置

#### 自动检查设置

```typescript
interface UpdaterSettings {
  auto_check: boolean;           // 启用自动检查
  check_interval: number;        // 检查间隔（小时）
  include_prerelease: boolean;   // 包含预发布版本
  notify_on_update: boolean;     // 更新通知
  skipped_versions: string[];    // 跳过的版本列表
}
```

#### 检查间隔选项

- 每小时（1 小时）
- 每 6 小时
- 每 12 小时
- 每天（24 小时）
- 每 3 天（72 小时）
- 每周（168 小时）

## 技术实现

### 架构组件

1. **后端服务（Rust）**
   - `src-tauri/src/updater.rs`：核心更新检查逻辑
   - GitHub API 集成和版本比较
   - 跨平台下载链接识别

2. **前端服务（TypeScript）**
   - `src/services/updaterService.ts`：更新服务管理
   - `src/hooks/useUpdater.ts`：React Hook 集成
   - 设置管理和用户交互

3. **用户界面（React）**
   - `src/components/updater/UpdateNotification.tsx`：更新通知弹窗
   - `src/components/updater/UpdateSettings.tsx`：设置面板
   - 响应式设计和用户体验优化

### 版本管理脚本

项目包含统一的版本管理脚本：

```bash
# 检查版本一致性
npm run version:check

# 同步版本号
npm run version:sync

# 版本升级
npm run version:bump:patch  # 补丁版本 (1.0.0 → 1.0.1)
npm run version:bump:minor  # 次版本 (1.0.0 → 1.1.0)
npm run version:bump:major  # 主版本 (1.0.0 → 2.0.0)
```

### API 接口

#### Rust 命令

```rust
// 检查更新
check_for_app_updates() -> Result<UpdateInfo, String>

// 跳过版本
skip_version(version: String) -> Result<(), String>

// 获取设置
get_updater_settings() -> Result<HashMap<String, Value>, String>

// 更新设置
update_updater_settings(settings: HashMap<String, Value>) -> Result<(), String>
```

#### 数据结构

```rust
struct UpdateInfo {
    available: bool,
    current_version: String,
    latest_version: String,
    release_notes: String,
    download_url: Option<String>,
    release_url: String,
    published_at: String,
    is_skipped: bool,
}
```

### 平台支持

自动识别并提供适合的下载链接：

- **Windows**：`.msi`、`.exe` 安装包
- **macOS**：`.dmg` 磁盘映像（支持 Intel 和 Apple Silicon）
- **Linux**：`.AppImage`、`.deb`、`.rpm` 包

## 配置文件

更新设置存储在应用配置目录：

- **位置**：`{APP_CONFIG_DIR}/updater_settings.json`
- **格式**：JSON
- **内容**：包含用户偏好和跳过的版本列表

示例配置：

```json
{
  "auto_check": true,
  "check_interval": 24,
  "include_prerelease": false,
  "notify_on_update": true,
  "skipped_versions": ["v1.0.5"],
  "last_check": "2024-01-15T10:30:00Z"
}
```

## 安全考虑

1. **HTTPS 通信**：所有与 GitHub API 的通信都通过 HTTPS
2. **签名验证**：建议对发布的安装包进行数字签名
3. **用户控制**：用户完全控制是否检查和安装更新
4. **隐私保护**：不收集用户的个人信息或使用数据

## 故障排除

### 常见问题

1. **无法检查更新**
   - 检查网络连接
   - 确认 GitHub API 可访问
   - 查看应用日志中的错误信息

2. **设置无法保存**
   - 检查应用配置目录的写入权限
   - 确认磁盘空间充足

3. **通知不显示**
   - 检查通知权限设置
   - 确认已启用更新通知

### 调试信息

查看更新相关的日志信息：

```typescript
// 启用调试模式
localStorage.setItem('updater-debug', 'true');

// 查看服务状态
console.log(updaterService.getSettings());
```

## 开发指南

### 添加新功能

1. **后端扩展**：在 `updater.rs` 中添加新的命令
2. **前端集成**：更新 `updaterService.ts` 和相关组件
3. **用户界面**：修改设置面板或通知组件

### 测试更新功能

```bash
# 模拟版本检查
cargo test test_version_comparison

# 前端组件测试
npm run test -- --testPathPattern=updater
```

## 未来改进

- [ ] 增量更新支持
- [ ] 自动下载和安装
- [ ] 更新回滚功能
- [ ] 企业环境支持（自定义更新服务器）
- [ ] 更新统计和分析