# 🦀 Rust 后端开发文档

## 概述

InfluxDB GUI Manager 的后端基于 **Rust + Tauri 2.0** 架构，提供高性能、内存安全的 InfluxDB 1.0 管理功能。

## 🏗️ 后端架构

```
src-tauri/src/
├── main.rs                 # 应用入口点
├── commands/               # Tauri 命令处理器
│   ├── mod.rs
│   ├── connection.rs       # 连接管理命令
│   ├── database.rs         # 数据库操作命令
│   ├── query.rs           # 查询执行命令
│   └── system.rs          # 系统信息命令
├── database/              # 数据库连接层
│   ├── mod.rs
│   ├── client.rs          # InfluxDB 客户端
│   ├── connection.rs      # 连接管理
│   └── pool.rs           # 连接池
├── models/                # 数据模型
│   ├── mod.rs
│   ├── connection.rs      # 连接配置模型
│   ├── query.rs          # 查询结果模型
│   └── database.rs       # 数据库信息模型
├── services/              # 业务逻辑服务
│   ├── mod.rs
│   ├── connection_service.rs
│   ├── query_service.rs
│   └── database_service.rs
├── utils/                 # 工具函数
│   ├── mod.rs
│   ├── crypto.rs         # 加密解密
│   ├── config.rs         # 配置管理
│   └── logger.rs         # 日志管理
└── config/               # 配置模块
    ├── mod.rs
    └── app_config.rs     # 应用配置
```

## 📚 文档导航

### 🔧 [环境配置](./environment.md)
- PowerShell + Scoop 环境设置
- Rust 工具链安装和配置
- 开发工具推荐
- 环境变量配置

### 🏛️ [架构设计](./architecture.md)
- 模块化设计原则
- 依赖注入模式
- 错误处理策略
- 异步编程模式

### 🗄️ [数据库操作](./database.md)
- InfluxDB 1.0 客户端集成
- 连接池管理
- 查询优化
- 事务处理

### 🔌 [API 开发](./api.md)
- Tauri 命令开发规范
- 参数验证和序列化
- 响应格式标准化
- 错误码定义

### 🔒 [安全管理](./security.md)
- 连接凭据加密存储
- 数据传输安全
- 权限控制
- 安全审计

### 🧪 [测试调试](./testing.md)
- 单元测试编写
- 集成测试策略
- 调试技巧和工具
- 性能分析

### ⚡ [性能优化](./performance.md)
- 内存管理优化
- 并发处理优化
- 查询性能调优
- 资源监控

## 🚀 快速开始

### 1. 环境检查
```powershell
# 检查 Rust 版本
rustc --version
cargo --version

# 检查 Tauri CLI
tauri --version

# 如果未安装，使用 Scoop 安装
scoop install rust
cargo install tauri-cli
```

### 2. 依赖安装
```powershell
# 进入后端目录
cd src-tauri

# 安装依赖
cargo build
```

### 3. 开发模式启动
```powershell
# 启动开发服务器
cargo tauri dev

# 或者从项目根目录
npm run tauri:dev
```

## 🔧 核心依赖

### 主要依赖
```toml
[dependencies]
tauri = { version = "2.0", features = ["shell-open"] }
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }
influxdb = { version = "0.7", features = ["derive"] }
anyhow = "1.0"
thiserror = "1.0"
```

### 功能说明
- **tauri**: 应用框架和前后端桥接
- **serde**: 序列化和反序列化
- **tokio**: 异步运行时
- **influxdb**: InfluxDB 客户端库
- **anyhow/thiserror**: 错误处理

## 📋 开发规范

### 代码风格
- 使用 `rustfmt` 格式化代码
- 遵循 Rust 官方命名规范
- 使用 `clippy` 进行代码检查
- 编写详细的文档注释

### 错误处理
```rust
use anyhow::{Context, Result};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("连接失败: {0}")]
    ConnectionFailed(String),
    #[error("查询执行失败: {0}")]
    QueryFailed(String),
}

pub fn connect_database() -> Result<Connection> {
    let conn = create_connection()
        .context("创建数据库连接失败")?;
    Ok(conn)
}
```

### 异步编程
```rust
use tokio;

#[tauri::command]
async fn execute_query(query: String) -> Result<QueryResult, String> {
    let result = tokio::spawn(async move {
        // 异步查询执行
        database::execute(&query).await
    }).await
    .map_err(|e| format!("查询执行失败: {}", e))?;
    
    Ok(result)
}
```

## 🔍 调试技巧

### 日志配置
```rust
use log::{info, warn, error, debug};
use env_logger;

fn main() {
    env_logger::init();
    
    info!("应用启动");
    debug!("调试信息: {}", debug_info);
}
```

### 开发模式调试
```powershell
# 启用详细日志
$env:RUST_LOG = "debug"
$env:TAURI_DEBUG = "true"
npm run tauri:dev
```

## 📊 性能监控

### 内存使用监控
```rust
use std::alloc::{GlobalAlloc, Layout, System};

#[global_allocator]
static ALLOCATOR: System = System;

// 监控内存分配
fn monitor_memory() {
    let memory_usage = get_memory_usage();
    log::info!("当前内存使用: {} MB", memory_usage / 1024 / 1024);
}
```

### 查询性能分析
```rust
use std::time::Instant;

async fn execute_query_with_timing(query: &str) -> Result<QueryResult> {
    let start = Instant::now();
    let result = database::execute(query).await?;
    let duration = start.elapsed();
    
    log::info!("查询执行时间: {:?}", duration);
    Ok(result)
}
```

## 🧪 测试策略

### 单元测试
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_database_connection() {
        let config = ConnectionConfig::default();
        let result = connect_database(&config).await;
        assert!(result.is_ok());
    }
}
```

### 集成测试
```rust
// tests/integration_test.rs
use influx_gui::database;

#[tokio::test]
async fn test_full_query_flow() {
    let conn = database::connect().await.unwrap();
    let result = database::execute_query(&conn, "SHOW DATABASES").await;
    assert!(result.is_ok());
}
```

## 🔗 相关链接

- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [Rust 异步编程](https://rust-lang.github.io/async-book/)
- [InfluxDB Rust 客户端](https://docs.rs/influxdb/)
- [Serde 序列化指南](https://serde.rs/)

---

> 💡 **下一步**: 建议先阅读 [环境配置](./environment.md) 文档，设置好开发环境后再深入学习其他模块。
