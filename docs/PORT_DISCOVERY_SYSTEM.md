# 动态端口发现系统

## 概述

动态端口发现系统是为 InfloWave 应用程序设计的一个完整的端口管理解决方案，它能够自动检测、分配和管理端口，确保前后端服务的稳定通信。

## 核心特性

### 1. 智能端口分配
- **自动端口发现**: 自动寻找可用端口，优先使用首选端口（1421）
- **端口范围管理**: 支持在指定范围内（1421-1500）查找端口
- **系统端口分配**: 当指定范围内无可用端口时，自动使用系统分配的端口

### 2. 端口冲突检测与解决
- **实时冲突检测**: 持续监控端口使用状态，及时发现冲突
- **自动冲突解决**: 检测到冲突时自动重新分配端口
- **冲突通知系统**: 通过事件系统通知前端应用端口变更

### 3. 健康检查机制
- **多层健康检查**: 检查端口管理器、前端服务器、Tauri应用、系统资源和网络连接
- **定期健康监控**: 自动执行定期健康检查（每30秒）
- **健康状态报告**: 提供详细的健康状态信息和统计数据

### 4. 连接恢复机制
- **智能重连**: 连接失败时自动尝试重新连接
- **指数退避算法**: 使用指数退避策略减少重连频率
- **连接状态追踪**: 记录连接尝试历史和统计信息

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (React/TypeScript)                   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Port Discovery  │ │ Health Check    │ │ Connection      │ │
│ │ Hook            │ │ Service         │ │ Resilience      │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Tauri IPC Layer                         │
├─────────────────────────────────────────────────────────────┤
│                    后端 (Rust)                              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Port Manager    │ │ Port Commands   │ │ Global Port     │ │
│ │ Service         │ │ API             │ │ Registry        │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 核心组件

### 1. 后端组件 (Rust)

#### PortManager
位置: `src-tauri/src/services/port_manager.rs`

主要功能：
- 端口分配和释放
- 健康检查和监控
- 端口冲突检测
- 事件通知

核心方法：
```rust
impl PortManager {
    // 查找可用端口
    pub fn find_available_port(&self) -> Result<u16>;
    
    // 分配端口给服务
    pub fn allocate_port(&self, service_name: &str) -> Result<u16>;
    
    // 释放端口
    pub fn release_port(&self, service_name: &str) -> Result<()>;
    
    // 健康检查
    pub fn health_check(&self, service_name: &str) -> Result<bool>;
    
    // 检查端口冲突
    pub fn check_port_conflicts(&self) -> Vec<String>;
}
```

#### Port Commands
位置: `src-tauri/src/commands/port_manager.rs`

提供 Tauri 命令接口：
- `init_port_manager`: 初始化端口管理器
- `allocate_port`: 分配端口
- `release_port`: 释放端口
- `is_port_available`: 检查端口可用性
- `port_health_check`: 端口健康检查
- `check_port_conflicts`: 检查端口冲突

### 2. 前端组件 (TypeScript)

#### PortDiscoveryService
位置: `src/services/portDiscovery.ts`

主要功能：
- 与后端端口管理器通信
- 端口事件监听和处理
- 端口冲突自动解决

核心方法：
```typescript
class PortDiscoveryService {
    // 初始化服务
    async initialize(): Promise<void>;
    
    // 分配端口
    async allocatePort(serviceName: string): Promise<number>;
    
    // 检查端口可用性
    async isPortAvailable(port: number): Promise<boolean>;
    
    // 处理端口冲突
    async handlePortConflict(serviceName: string): Promise<number>;
    
    // 获取端口统计信息
    async getPortStats(): Promise<Record<string, PortInfo>>;
}
```

#### HealthCheckService
位置: `src/services/healthCheck.ts`

主要功能：
- 执行全面的系统健康检查
- 监控各个组件的健康状态
- 提供健康状态报告

核心方法：
```typescript
class HealthCheckService {
    // 执行健康检查
    async performHealthCheck(): Promise<SystemHealthStatus>;
    
    // 启动健康监控
    startHealthCheck(interval: number): void;
    
    // 添加健康状态监听器
    addListener(listener: (status: SystemHealthStatus) => void): void;
}
```

#### ConnectionResilienceService
位置: `src/services/connectionResilience.ts`

主要功能：
- 连接状态监控
- 自动重连机制
- 连接统计和分析

核心方法：
```typescript
class ConnectionResilienceService {
    // 开始连接监控
    async startMonitoring(): Promise<void>;
    
    // 检查连接状态
    async checkConnection(): Promise<boolean>;
    
    // 强制重连
    async forceReconnect(): Promise<void>;
    
    // 获取连接统计
    getConnectionStats(): ConnectionStats;
}
```

## 使用方式

### 1. 基本使用

```typescript
import { usePortDiscovery } from '@/hooks/usePortDiscovery';

function MyComponent() {
    const {
        currentPort,
        isInitialized,
        healthStatus,
        handlePortConflict,
        performHealthCheck,
    } = usePortDiscovery({
        autoStart: true,
        onPortChange: (newPort, oldPort) => {
            console.log(`Port changed: ${oldPort} -> ${newPort}`);
        },
        onPortConflict: (port, service) => {
            console.log(`Port conflict detected: ${port} for ${service}`);
        },
    });

    return (
        <div>
            <p>Current Port: {currentPort}</p>
            <p>Status: {healthStatus}</p>
            <button onClick={() => performHealthCheck()}>
                Check Health
            </button>
        </div>
    );
}
```

### 2. 使用 Provider

```typescript
import { PortDiscoveryProvider } from '@/components/PortDiscoveryProvider';
import { HealthCheck } from '@/components/HealthCheck';
import { ConnectionStatus } from '@/components/ConnectionStatus';

function App() {
    return (
        <PortDiscoveryProvider>
            <div>
                <HealthCheck showDetails={true} />
                <ConnectionStatus showDetails={true} />
            </div>
        </PortDiscoveryProvider>
    );
}
```

### 3. 手动服务操作

```typescript
import { portDiscoveryService } from '@/services/portDiscovery';

// 初始化服务
await portDiscoveryService.initialize();

// 分配端口
const port = await portDiscoveryService.allocatePort('my-service');

// 检查端口可用性
const available = await portDiscoveryService.isPortAvailable(1421);

// 处理端口冲突
const newPort = await portDiscoveryService.handlePortConflict('my-service');
```

## 配置选项

### 1. 端口配置

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortConfig {
    pub preferred_port: u16,        // 首选端口: 1421
    pub port_range: (u16, u16),     // 端口范围: (1421, 1500)
    pub max_retries: u32,           // 最大重试次数: 10
    pub health_check_interval: Duration, // 健康检查间隔: 30秒
}
```

### 2. 重连配置

```typescript
interface ReconnectionConfig {
    maxRetries: number;      // 最大重试次数: 10
    initialDelay: number;    // 初始延迟: 1000ms
    maxDelay: number;        // 最大延迟: 30000ms
    backoffFactor: number;   // 退避因子: 2
    jitter: boolean;         // 是否添加随机抖动: true
}
```

## 事件系统

### 1. 端口事件

```typescript
interface PortEvent {
    type: 'PortChanged' | 'PortConflict' | 'PortAvailable' | 'HealthCheckFailed' | 'HealthCheckSuccess';
    old_port?: number;
    new_port?: number;
    port?: number;
    service?: string;
    error?: string;
}
```

### 2. 健康检查事件

```typescript
interface HealthCheckResult {
    component: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    message: string;
    timestamp: number;
    latency?: number;
    details?: Record<string, any>;
}
```

## 错误处理

### 1. 常见错误类型

- **端口分配失败**: 当无法找到可用端口时
- **健康检查失败**: 当服务无法响应健康检查时
- **连接中断**: 当网络连接失败时
- **端口冲突**: 当端口被其他服务占用时

### 2. 错误恢复策略

1. **自动重试**: 使用指数退避算法自动重试
2. **端口重分配**: 检测到冲突时自动分配新端口
3. **服务重启**: 必要时重启相关服务
4. **用户通知**: 通过 toast 通知用户重要状态变化

## 性能优化

### 1. 缓存机制
- 端口状态缓存
- 健康检查结果缓存
- 连接状态缓存

### 2. 事件防抖
- 端口变更事件防抖
- 健康检查防抖
- 重连尝试防抖

### 3. 资源管理
- 自动清理监听器
- 定时器管理
- 内存使用优化

## 监控和调试

### 1. 日志记录
- 端口分配日志
- 健康检查日志
- 连接状态日志
- 错误日志

### 2. 统计信息
- 端口使用统计
- 健康检查统计
- 连接成功率统计
- 重连尝试统计

### 3. 调试工具
- 端口状态查看器
- 健康检查面板
- 连接状态监控
- 事件日志查看

## 测试

### 1. 单元测试
位置: `src/test/portDiscoveryTest.ts`

测试覆盖：
- 端口分配和释放
- 健康检查机制
- 连接恢复逻辑
- 错误处理流程

### 2. 集成测试
- 端口冲突和恢复
- 健康监控和端口变更
- 多服务协调
- 系统资源监控

## 部署建议

### 1. 开发环境
- 启用详细日志
- 使用开发端口范围
- 启用调试工具

### 2. 生产环境
- 关闭调试日志
- 配置生产端口范围
- 启用性能监控

### 3. 配置建议
- 根据系统资源调整检查间隔
- 配置适当的重试策略
- 设置合适的端口范围

## 故障排除

### 1. 常见问题

**端口分配失败**
- 检查端口范围配置
- 确认系统端口权限
- 检查防火墙设置

**健康检查失败**
- 验证服务是否正常运行
- 检查网络连接
- 确认端口监听状态

**连接中断**
- 检查网络状态
- 验证服务可用性
- 检查系统资源

### 2. 调试步骤

1. 查看端口状态面板
2. 检查健康检查结果
3. 分析连接统计信息
4. 查看事件日志
5. 检查系统资源使用

## 未来扩展

### 1. 计划功能
- 端口预留机制
- 服务发现集成
- 负载均衡支持
- 集群端口管理

### 2. 性能优化
- 异步健康检查
- 批量端口操作
- 智能缓存策略
- 资源使用优化

### 3. 监控增强
- 实时性能图表
- 预警机制
- 自动化报告
- 历史数据分析

## 总结

动态端口发现系统为 InfloWave 应用程序提供了一个完整的端口管理解决方案，确保了前后端服务的稳定通信。通过智能端口分配、实时健康检查和自动故障恢复，系统能够在各种环境下保持高可用性和稳定性。