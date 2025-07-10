# 构建超时问题排查指南

## 问题描述

在执行 `npm run tauri:build` 或相关构建命令时，出现 `timeout: global` 错误。

## 常见原因

1. **网络超时**：依赖下载超时
2. **资源不足**：内存或CPU资源不足
3. **缓存损坏**：npm 或 Cargo 缓存文件损坏
4. **依赖冲突**：版本冲突导致解析时间过长
5. **构建配置**：超时设置过短

## 解决方案

### 方案 1：使用清理脚本（推荐）

运行项目提供的清理脚本：

```powershell
# PowerShell
.\scripts\clean-rebuild.ps1

# 或者 CMD
.\scripts\clean-rebuild.bat
```

### 方案 2：手动清理

1. **清理 npm 缓存**：
   ```bash
   npm cache clean --force
   ```

2. **删除依赖目录**：
   ```bash
   rm -rf node_modules
   rm package-lock.json
   ```

3. **清理 Cargo 缓存**：
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   ```

4. **重新安装依赖**：
   ```bash
   npm install
   ```

### 方案 3：调整网络设置

1. **设置 npm 镜像**：
   ```bash
   npm config set registry https://registry.npmmirror.com/
   ```

2. **增加 npm 超时时间**：
   ```bash
   npm config set timeout 300000
   npm config set fetch-timeout 300000
   ```

3. **设置 Cargo 镜像**（中国用户）：
   在 `~/.cargo/config.toml` 中添加：
   ```toml
   [source.crates-io]
   replace-with = 'ustc'
   
   [source.ustc]
   registry = "https://mirrors.ustc.edu.cn/crates.io-index"
   ```

### 方案 4：分步构建

1. **先构建前端**：
   ```bash
   npm run build
   ```

2. **再构建 Tauri**：
   ```bash
   npm run tauri build
   ```

### 方案 5：使用开发模式测试

如果构建仍然失败，先尝试开发模式：
```bash
npm run tauri:dev
```

## 预防措施

1. **定期清理缓存**：每周运行一次清理脚本
2. **保持依赖更新**：定期更新依赖版本
3. **监控系统资源**：确保有足够的内存和磁盘空间
4. **使用稳定网络**：避免在网络不稳定时构建

## 配置优化

项目已经包含以下优化配置：

### Vite 配置优化
- 增加构建超时时间到 5 分钟
- 优化分包策略
- 配置 HMR 超时

### Cargo 配置优化
- 设置网络超时和重试
- 优化编译参数
- 配置并行编译

### 构建脚本优化
- 提供自动化清理脚本
- 支持 PowerShell 和 CMD

## 常见错误信息

| 错误信息 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `timeout: global` | 全局超时 | 运行清理脚本 |
| `ENOTFOUND` | DNS 解析失败 | 检查网络连接 |
| `ETIMEDOUT` | 网络超时 | 使用镜像源 |
| `ENOSPC` | 磁盘空间不足 | 清理磁盘空间 |
| `cargo build failed` | Rust 编译失败 | 检查 Rust 工具链 |

## 获取帮助

如果以上方案都无法解决问题，请：

1. 检查系统要求是否满足
2. 查看详细错误日志
3. 在项目 Issues 中搜索相似问题
4. 提供完整的错误信息和系统环境
