# 🔗 集成对接文档

## 概述

本文档详细介绍 InfloWave 中前后端集成、InfluxDB 对接以及各系统间的数据流设计。

## 🏗️ 集成架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (React)                              │
├─────────────────────────────────────────────────────────────┤
│  UI Components  │  State Management  │  Service Layer      │
│  • Ant Design   │  • Zustand Store   │  • API Services     │
│  • ECharts      │  • Local Storage   │  • Error Handling   │
└─────────────────┬───────────────────┬───────────────────────┘
                  │                   │
                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 Tauri IPC 通信层                             │
├─────────────────────────────────────────────────────────────┤
│  • 命令调用 (invoke)     │  • 事件监听 (listen)           │
│  • 参数序列化           │  • 错误传播                    │
│  • 结果反序列化         │  • 异步处理                    │
└─────────────────┬───────────────────┬───────────────────────┘
                  │                   │
                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   后端 (Rust)                               │
├─────────────────────────────────────────────────────────────┤
│  Command Layer  │  Service Layer    │  Database Layer      │
│  • 参数验证     │  • 业务逻辑       │  • InfluxDB Client   │
│  • 权限检查     │  • 数据转换       │  • 连接池管理        │
│  • 响应格式化   │  • 错误处理       │  • 查询优化          │
└─────────────────┬───────────────────┬───────────────────────┘
                  │                   │
                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 InfluxDB 1.0                                │
├─────────────────────────────────────────────────────────────┤
│  • HTTP API      │  • 查询语言 (InfluxQL)  │  • 数据存储   │
│  • 认证授权      │  • 时间序列数据         │  • 索引管理   │
└─────────────────────────────────────────────────────────────┘
```

## 📚 文档导航

### 🔄 [通信协议](./communication.md)
- Tauri IPC 通信机制
- 命令定义和调用
- 事件系统设计
- 错误处理和传播

### 🗄️ [InfluxDB 对接](./influxdb.md)
- InfluxDB 1.0 兼容性
- 连接配置和管理
- 查询语言支持
- 数据写入和读取

### 📊 [数据流设计](./data-flow.md)
- 数据处理流程
- 状态同步机制
- 缓存策略
- 实时数据更新

### ❌ [错误处理](./error-handling.md)
- 统一错误处理机制
- 错误码定义
- 用户友好的错误提示
- 错误日志和监控

### ⚙️ [配置管理](./configuration.md)
- 应用配置结构
- 环境变量管理
- 用户设置持久化
- 配置验证和迁移

### 🔌 [插件系统](./plugins.md)
- 插件架构设计
- 插件开发规范
- 插件注册和加载
- 插件通信接口

## ⚠️ 重要提醒

**不要直接使用 `invoke` 函数！**

为了确保浏览器兼容性和错误处理，所有前端代码必须使用 `safeTauriInvoke` 包装器：

```typescript
// ❌ 错误 - 不要这样做
import { invoke } from '@tauri-apps/api/core';
const result = await invoke('command_name', args);

// ✅ 正确 - 使用安全包装器
import { safeTauriInvoke } from '@/utils/tauri';
const result = await safeTauriInvoke('command_name', args);
```

**为什么使用 safeTauriInvoke？**
- 🌐 **浏览器兼容性**：在浏览器开发模式下提供模拟数据
- 🛡️ **错误处理**：统一的错误处理和日志记录
- 🔧 **调试支持**：更好的开发体验和调试信息
- 📱 **环境检测**：自动检测运行环境并适配

## 🚀 快速开始

### 1. 理解通信流程
```typescript
// 前端调用后端命令 - 使用安全包装器
import { safeTauriInvoke } from '@/utils/tauri';

// 执行数据库查询
const executeQuery = async (query: string) => {
  try {
    const result = await safeTauriInvoke<QueryResult>('execute_query', {
      connectionId: 'conn-123',
      query: 'SHOW DATABASES'
    });
    return result;
  } catch (error) {
    console.error('查询执行失败:', error);
    throw error;
  }
};
```

```rust
// 后端命令处理
#[tauri::command]
async fn execute_query(
    connection_id: String,
    query: String
) -> Result<QueryResult, String> {
    let connection = get_connection(&connection_id)
        .map_err(|e| format!("获取连接失败: {}", e))?;
    
    let result = connection.query(&query).await
        .map_err(|e| format!("查询执行失败: {}", e))?;
    
    Ok(QueryResult::from(result))
}
```

### 2. 数据模型定义
```typescript
// 前端类型定义
export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  ssl: boolean;
  timeout: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  executionTime: number;
  rowCount: number;
}
```

```rust
// 后端数据模型
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub database: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub ssl: bool,
    pub timeout: u64,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub execution_time: u64,
    pub row_count: usize,
}
```

## 🔄 核心集成模式

### 1. 命令-响应模式
```typescript
// 前端服务层 - 使用安全包装器
export class ConnectionService {
  async testConnection(config: ConnectionConfig): Promise<boolean> {
    const result = await safeTauriInvoke<boolean>('test_connection', { config });
    return result || false;
  }

  async getConnections(): Promise<Connection[]> {
    const result = await safeTauriInvoke<Connection[]>('get_connections');
    return result || [];
  }

  async saveConnection(connection: Connection): Promise<void> {
    await safeTauriInvoke('save_connection', { connection });
  }
}
```

```rust
// 后端命令处理器
#[tauri::command]
async fn test_connection(config: ConnectionConfig) -> Result<bool, String> {
    match database::test_connection(&config).await {
        Ok(_) => Ok(true),
        Err(e) => {
            log::error!("连接测试失败: {}", e);
            Ok(false)
        }
    }
}

#[tauri::command]
async fn get_connections() -> Result<Vec<Connection>, String> {
    database::get_all_connections().await
        .map_err(|e| format!("获取连接列表失败: {}", e))
}
```

### 2. 事件驱动模式
```typescript
// 前端事件监听
import { listen } from '@tauri-apps/api/event';

// 监听查询进度事件
const unlisten = await listen<QueryProgress>('query-progress', (event) => {
  const progress = event.payload;
  updateQueryProgress(progress);
});

// 监听连接状态变化
await listen<ConnectionStatus>('connection-status', (event) => {
  const status = event.payload;
  updateConnectionStatus(status.connectionId, status.status);
});
```

```rust
// 后端事件发送
use tauri::Manager;

async fn execute_long_query(
    app_handle: tauri::AppHandle,
    query: String
) -> Result<QueryResult, String> {
    let total_steps = 100;
    
    for step in 0..total_steps {
        // 执行查询步骤
        process_query_step(&query, step).await?;
        
        // 发送进度事件
        let progress = QueryProgress {
            step,
            total: total_steps,
            message: format!("执行步骤 {}/{}", step + 1, total_steps),
        };
        
        app_handle.emit_all("query-progress", progress)
            .map_err(|e| format!("发送进度事件失败: {}", e))?;
    }
    
    Ok(result)
}
```

### 3. 状态同步模式
```typescript
// 前端状态管理
export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: [],
  currentConnection: null,
  
  // 从后端同步连接列表
  syncConnections: async () => {
    try {
      const connections = await connectionService.getConnections();
      set({ connections });
    } catch (error) {
      console.error('同步连接列表失败:', error);
    }
  },
  
  // 添加连接并同步到后端
  addConnection: async (connection: Connection) => {
    try {
      await connectionService.saveConnection(connection);
      set(state => ({
        connections: [...state.connections, connection]
      }));
    } catch (error) {
      console.error('添加连接失败:', error);
      throw error;
    }
  }
}));
```

## 🔒 安全集成

### 1. 凭据加密存储
```rust
// 后端凭据加密
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead};

pub struct CredentialManager {
    cipher: Aes256Gcm,
}

impl CredentialManager {
    pub fn new(key: &[u8; 32]) -> Self {
        let key = Key::from_slice(key);
        let cipher = Aes256Gcm::new(key);
        Self { cipher }
    }
    
    pub fn encrypt_password(&self, password: &str) -> Result<String, String> {
        let nonce = Nonce::from_slice(b"unique nonce");
        let ciphertext = self.cipher.encrypt(nonce, password.as_bytes())
            .map_err(|e| format!("加密失败: {}", e))?;
        Ok(base64::encode(ciphertext))
    }
    
    pub fn decrypt_password(&self, encrypted: &str) -> Result<String, String> {
        let ciphertext = base64::decode(encrypted)
            .map_err(|e| format!("解码失败: {}", e))?;
        let nonce = Nonce::from_slice(b"unique nonce");
        let plaintext = self.cipher.decrypt(nonce, ciphertext.as_ref())
            .map_err(|e| format!("解密失败: {}", e))?;
        String::from_utf8(plaintext)
            .map_err(|e| format!("字符串转换失败: {}", e))
    }
}
```

### 2. 权限验证
```rust
// 权限检查中间件
#[tauri::command]
async fn execute_admin_command(
    command: String,
    state: tauri::State<'_, AppState>
) -> Result<String, String> {
    // 检查用户权限
    if !state.current_user.has_admin_permission() {
        return Err("权限不足".to_string());
    }
    
    // 执行管理员命令
    execute_command(&command).await
}
```

## 📊 性能优化

### 1. 连接池管理
```rust
// 连接池实现
use tokio::sync::RwLock;
use std::collections::HashMap;

pub struct ConnectionPool {
    pools: RwLock<HashMap<String, influxdb::Client>>,
    max_connections: usize,
}

impl ConnectionPool {
    pub async fn get_connection(&self, config: &ConnectionConfig) -> Result<influxdb::Client, String> {
        let key = format!("{}:{}", config.host, config.port);
        
        // 尝试获取现有连接
        {
            let pools = self.pools.read().await;
            if let Some(client) = pools.get(&key) {
                return Ok(client.clone());
            }
        }
        
        // 创建新连接
        let client = self.create_client(config).await?;
        
        // 存储连接
        {
            let mut pools = self.pools.write().await;
            pools.insert(key, client.clone());
        }
        
        Ok(client)
    }
}
```

### 2. 查询结果缓存
```typescript
// 前端查询缓存
class QueryCache {
  private cache = new Map<string, { result: QueryResult; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分钟缓存
  
  getCachedResult(query: string): QueryResult | null {
    const cached = this.cache.get(query);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(query);
      return null;
    }
    
    return cached.result;
  }
  
  setCachedResult(query: string, result: QueryResult): void {
    this.cache.set(query, {
      result,
      timestamp: Date.now()
    });
  }
}
```

## 🔗 相关链接

- [Tauri IPC 文档](https://tauri.app/v1/guides/features/command)
- [InfluxDB 1.x 文档](https://docs.influxdata.com/influxdb/v1.8/)
- [Serde 序列化](https://serde.rs/)
- [Tokio 异步运行时](https://tokio.rs/)

---

> 💡 **下一步**: 建议先阅读 [通信协议](./communication.md) 文档，了解前后端通信机制，然后学习 [InfluxDB 对接](./influxdb.md)。
