# 生产环境端口处理方案

## 概述

这个方案解决了前后端分离项目打包为桌面应用时的端口冲突问题，支持两种部署模式：

1. **纯 Tauri 模式**：前端和后端通过 IPC 通信，无需 HTTP 端口
2. **嵌入式服务器模式**：内置 HTTP 服务器，支持 API、代理等功能

## 部署模式详解

### 模式 1：纯 Tauri 模式（推荐）

**特点**：
- 前端通过 Tauri IPC 与后端通信
- 无需 HTTP 端口，完全避免端口冲突
- 性能最优，安全性最高
- 打包体积最小

**适用场景**：
- 纯桌面应用
- 不需要 HTTP API
- 不需要与外部系统通过 HTTP 通信

**启动方式**：
```bash
# 开发环境
npm run tauri:dev

# 生产环境
npm run tauri:build
```

### 模式 2：嵌入式服务器模式

**特点**：
- 内置 HTTP 服务器
- 自动端口冲突检测和解决
- 支持多种功能（调试、代理、WebSocket）
- 完整的端口管理

**适用场景**：
- 需要提供 HTTP API
- 需要 CORS 代理功能
- 需要与外部系统 HTTP 通信
- 需要调试接口

**启动方式**：
```bash
# 开发环境（带嵌入式服务器）
npm run tauri:dev:server

# 生产环境（带嵌入式服务器）
npm run tauri:build:server
```

## 技术实现

### 1. 端口管理器

**位置**：`src-tauri/src/services/port_manager.rs`

**功能**：
- 端口可用性检测
- 智能端口分配（1422-1500 范围）
- 端口健康监控
- 冲突自动解决

**配置**：
```rust
PortConfig {
    preferred_port: 1422,
    port_range: (1422, 1500),
    max_retries: 10,
    health_check_interval: 30s
}
```

### 2. 嵌入式服务器

**位置**：`src-tauri/src/services/embedded_server.rs`

**功能**：
- 可选的 HTTP 服务器
- 自动端口分配
- 多功能模块（调试、代理、WebSocket）
- 优雅启停

**配置**：
```rust
ServerConfig {
    enabled: true,              // 是否启用
    preferred_port: 1422,       // 首选端口
    port_range: (1422, 1500),   // 端口范围
    auto_start: true,           // 自动启动
    features: ["debug", "proxy"] // 功能模块
}
```

### 3. 前端端口监控

**位置**：`src/services/embeddedServer.ts`

**功能**：
- 实时监控服务器状态
- 自动重连机制
- 用户界面控制

## 环境变量配置

### 开发环境

```bash
# 启用嵌入式服务器
ENABLE_EMBEDDED_SERVER=true

# 端口配置
PREFERRED_PORT=1422
PORT_RANGE_START=1422
PORT_RANGE_END=1500
```

### 生产环境

打包时的环境变量会被编译进二进制文件：

```bash
# Windows
set ENABLE_EMBEDDED_SERVER=true && npm run tauri:build

# macOS/Linux
ENABLE_EMBEDDED_SERVER=true npm run tauri:build
```

## 端口冲突处理流程

### 开发环境

1. **启动前检查**：脚本检查端口 1422 可用性
2. **动态配置**：如果冲突，自动更新 `tauri.conf.json` 和 `vite.config.ts`
3. **通知用户**：显示实际使用的端口

### 生产环境

1. **应用启动**：检查配置的端口
2. **自动分配**：如果冲突，在范围内查找可用端口
3. **服务启动**：启动嵌入式服务器（如果启用）
4. **状态通知**：通知前端端口信息

## 用户界面

### 端口状态显示

- **简化模式**：状态栏显示端口和状态
- **详细模式**：完整的控制面板

### 嵌入式服务器控制

- **启动/停止**：手动控制服务器
- **重启**：处理端口冲突
- **状态监控**：实时显示运行状态

## 最佳实践

### 1. 选择部署模式

```typescript
// 检查是否需要 HTTP API
const needHttpApi = checkApiRequirements();

if (needHttpApi) {
    // 启用嵌入式服务器模式
    process.env.ENABLE_EMBEDDED_SERVER = 'true';
} else {
    // 使用纯 Tauri 模式
    process.env.ENABLE_EMBEDDED_SERVER = 'false';
}
```

### 2. 端口范围配置

```rust
// 为不同环境配置不同端口范围
let port_range = match env::var("ENVIRONMENT") {
    Ok(env) if env == "development" => (1422, 1500),
    Ok(env) if env == "testing" => (2000, 2100),
    _ => (3000, 3100), // 生产环境
};
```

### 3. 错误处理

```typescript
try {
    await embeddedServerService.startServer();
} catch (error) {
    if (error.message.includes('port conflict')) {
        // 尝试重新分配端口
        await embeddedServerService.restartServer();
    } else {
        // 其他错误处理
        console.error('服务器启动失败:', error);
    }
}
```

## 故障排除

### 常见问题

1. **端口被占用**
   - 检查端口范围配置
   - 确认没有其他服务占用整个范围
   - 尝试扩大端口范围

2. **嵌入式服务器启动失败**
   - 检查 `ENABLE_EMBEDDED_SERVER` 环境变量
   - 确认防火墙设置
   - 查看应用日志

3. **前端无法连接后端**
   - 检查端口状态面板
   - 确认服务器已启动
   - 验证 URL 配置

### 调试命令

```bash
# 检查端口占用
netstat -an | grep 1422

# 查看进程
ps aux | grep inflowave

# 测试端口连接
telnet localhost 1422
```

## 总结

这个端口冲突解决方案提供了：

✅ **灵活的部署模式**：支持纯 Tauri 和嵌入式服务器两种模式  
✅ **智能端口管理**：自动检测和解决端口冲突  
✅ **用户友好界面**：实时状态显示和控制  
✅ **生产环境支持**：完整的桌面应用端口处理  
✅ **开发工具**：调试和监控功能  

无论是开发环境还是打包后的桌面应用，都能确保端口冲突得到妥善处理，用户体验流畅。