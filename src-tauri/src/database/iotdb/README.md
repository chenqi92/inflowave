# IoTDB 全版本兼容连接管理工具

## 概述

这是一个兼容 **IoTDB 0.13 → 1.x → 2.x** 全谱系的 Rust 连接管理工具，采用 **"运行时探测 + 编译期特性 + 可插拔驱动"** 的设计思路，将版本差异封装在适配层里，让业务逻辑"看不见"历史包袱。

## 核心特性

### 1. 运行时探测
- 自动检测 IoTDB 服务器版本和能力
- 支持树模型/表模型检测
- 智能协议选择

### 2. 驱动分层
- 统一的 `IoTDBDriver` 抽象接口
- 可插拔的驱动实现（Thrift、REST V2）
- 自动选择最佳驱动

### 3. 方言适配
- 树模型 vs 表模型 SQL 转换
- 自动语法兼容性处理
- 查询构建器支持

### 4. 类型兼容
- 自动类型降级（新类型 → 兼容类型）
- 数据值转换
- 版本特性检测

### 5. 编译期控制
- Cargo features 控制版本支持
- 条件编译减小二进制体积
- 灵活的功能组合

## 架构设计

```
IoTDBManager
├── Capability (版本探测)
├── DriverFactory (驱动工厂)
├── Drivers (驱动实现)
│   ├── ThriftDriver
│   └── RestV2Driver
├── Dialect (方言适配)
│   ├── TreeDialect
│   └── TableDialect
└── Types (类型兼容)
    ├── TypeMapper
    └── DataValue
```

## 使用方法

### 基本用法

```rust
use crate::database::iotdb::{IoTDBManager, DriverConfig};
use std::time::Duration;
use std::collections::HashMap;

// 创建管理器
let mut manager = IoTDBManager::new();

// 配置连接
let config = DriverConfig {
    host: "localhost".to_string(),
    port: 6667,
    username: Some("root".to_string()),
    password: Some("root".to_string()),
    ssl: false,
    timeout: Duration::from_secs(30),
    extra_params: HashMap::new(),
};

// 添加连接（自动探测版本和选择驱动）
manager.add_connection("conn1".to_string(), config).await?;

// 获取驱动并执行查询
if let Some(driver) = manager.get_driver("conn1") {
    let request = QueryRequest {
        sql: "SHOW VERSION".to_string(),
        database: None,
        session_id: None,
        fetch_size: Some(10),
        timeout: Some(Duration::from_secs(5)),
        parameters: None,
    };
    
    let result = driver.query(request).await?;
    println!("查询结果: {:?}", result);
}
```

### 高级用法

```rust
use crate::database::iotdb::{
    DriverFactory, Capability, 
    dialect::{QueryBuilder, SqlDialect},
    types::TypeMapper
};

// 手动探测能力
let capability = Capability::detect(&config).await?;
println!("服务器版本: {}", capability.server.version.raw);
println!("支持表模型: {}", capability.server.table_model);

// 创建指定驱动
let driver = DriverFactory::create_driver("thrift", config, &capability).await?;

// 使用方言适配器
let dialect = if capability.server.table_model {
    SqlDialect::Table
} else {
    SqlDialect::Tree
};
let query_builder = QueryBuilder::new(dialect);
let sql = query_builder.build_show_databases_query();

// 使用类型映射器
let type_mapper = TypeMapper::new(&capability.server.version);
let mapped_type = type_mapper.map_type(&IoTDBDataType::String);
```

## 编译特性

在 `Cargo.toml` 中配置：

```toml
[features]
# IoTDB 版本兼容性特性
iotdb-v0_13 = []
iotdb-v1 = []
iotdb-v2 = []
iotdb-rest = []

# 默认启用 v1, v2 和 REST 支持
default = ["iotdb-v1", "iotdb-v2", "iotdb-rest"]
```

编译时选择特性：

```bash
# 编译支持所有版本
cargo build --features "iotdb-v0_13,iotdb-v1,iotdb-v2,iotdb-rest"

# 仅支持新版本
cargo build --features "iotdb-v2,iotdb-rest"

# 最小化构建
cargo build --no-default-features --features "iotdb-v1"
```

## 版本兼容性

| IoTDB 版本 | 树模型 | 表模型 | 新类型 | REST V2 | 支持状态 |
|-----------|--------|--------|--------|---------|----------|
| 0.13.x    | ✅     | ❌     | ❌     | ❌      | 完全支持 |
| 1.0-1.2   | ✅     | ❌     | ❌     | ❌      | 完全支持 |
| 1.3+      | ✅     | ❌     | ✅     | ✅      | 完全支持 |
| 2.0+      | ✅     | ✅     | ✅     | ✅      | 完全支持 |

## 协议支持

| 协议类型 | 端口 | 特性 | 适用版本 | 优先级 |
|----------|------|------|----------|--------|
| Thrift   | 6667 | 原生协议，性能最佳 | 全版本 | 高 |
| REST V2  | 18080/31999 | HTTP 协议，易调试 | 1.2+ | 中 |

## 类型映射

当连接到不支持新类型的旧版本时，自动进行类型降级：

| 新类型 | 映射到 | 说明 |
|--------|--------|------|
| STRING | TEXT | 字符串类型 |
| BLOB | TEXT | 转为十六进制字符串 |
| DATE | INT64 | 转为时间戳 |
| TIMESTAMP | INT64 | 保持时间戳格式 |

## 错误处理

```rust
use anyhow::Result;

// 连接错误
match manager.add_connection("conn1".to_string(), config).await {
    Ok(_) => println!("连接成功"),
    Err(e) => {
        eprintln!("连接失败: {}", e);
        // 检查是否为版本不兼容
        if e.to_string().contains("不支持的版本") {
            eprintln!("请检查 IoTDB 版本或启用相应的编译特性");
        }
    }
}

// 查询错误
match driver.query(request).await {
    Ok(result) => println!("查询成功: {:?}", result),
    Err(e) => {
        eprintln!("查询失败: {}", e);
        // 检查是否为方言不兼容
        if e.to_string().contains("语法错误") {
            eprintln!("可能是 SQL 方言不兼容，请检查服务器模型设置");
        }
    }
}
```

## 测试

运行兼容性测试：

```bash
# 运行所有测试
cargo test

# 运行特定模块测试
cargo test iotdb::capability
cargo test iotdb::driver
cargo test iotdb::dialect

# 运行兼容性测试示例
cargo run --example test_compatibility
```

## 性能优化

1. **连接池**: 使用连接池减少连接开销
2. **批量操作**: 使用 Tablet 进行批量写入
3. **协议选择**: Thrift > REST V2 性能优先级
4. **编译优化**: 仅启用需要的版本特性

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 IoTDB 服务是否启动
   - 验证端口配置（6667 for Thrift, 18080 for REST）
   - 确认用户名密码正确

2. **版本探测失败**
   - 检查网络连通性
   - 验证 IoTDB 版本是否受支持
   - 启用相应的编译特性

3. **查询语法错误**
   - 检查 SQL 方言设置
   - 验证表模型/树模型配置
   - 使用查询构建器生成兼容 SQL

4. **类型转换错误**
   - 检查数据类型兼容性
   - 验证版本特性支持
   - 使用类型映射器处理兼容性

### 调试技巧

启用详细日志：

```rust
env_logger::init();
log::set_max_level(log::LevelFilter::Debug);
```

查看能力检测结果：

```rust
let capability = Capability::detect(&config).await?;
println!("服务器能力: {:#?}", capability);
```

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 添加测试用例
4. 确保所有测试通过
5. 提交 Pull Request

## 许可证

MIT License
