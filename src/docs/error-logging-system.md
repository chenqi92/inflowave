# 错误日志系统文档

## 概述

InfloWave 应用内置了一套完整的错误日志系统，能够自动捕获和记录各种类型的错误，提供详细的错误分析和查看功能。

## 系统架构

### 核心组件

1. **错误日志器** (`src/utils/errorLogger.ts`)
   - 全局单例模式
   - 自动捕获多种类型错误
   - 缓冲写入机制
   - 会话管理

2. **错误边界** (`src/components/common/ErrorBoundary.tsx`)
   - React 组件错误捕获
   - 友好的错误显示界面
   - 错误恢复机制

3. **错误查看器** (`src/components/debug/ErrorLogViewer.tsx`)
   - 可视化错误日志管理
   - 过滤和搜索功能
   - 错误导出功能

4. **文件操作** (`src/utils/fileOperations.ts`)
   - 安全的文件读写封装
   - Tauri 后端集成

## 功能特性

### 自动错误捕获

- ✅ **JavaScript 运行时错误**：`window.onerror`
- ✅ **Promise 未处理拒绝**：`window.onunhandledrejection`
- ✅ **React 组件错误**：ErrorBoundary
- ✅ **网络请求错误**：fetch 拦截器
- ✅ **控制台错误**：console.error/warn 拦截

### 错误分类

- `javascript`：JavaScript 运行时错误
- `promise`：Promise 拒绝错误
- `react`：React 组件错误
- `network`：网络请求错误
- `tauri`：后端调用错误
- `console`：控制台输出

### 错误级别

- `error`：严重错误
- `warn`：警告信息
- `info`：信息记录

### 错误记录格式

```
[2025-07-11T10:30:45.123Z] [session-abc123] [JAVASCRIPT:ERROR] 错误消息
  URL: http://localhost:14222/query:42:15
  Page: /query
  Stack:
    at Component.render (http://localhost:14222/query:42:15)
    at ReactDOMServer.renderToString...
  Component Stack:
    in Component (at Query.tsx:42:15)
    in QueryPage (at App.tsx:108:23)
  Additional:
    {
      "userId": 123,
      "action": "query-execution"
    }
================================================================================
```

## 使用指南

### 查看错误日志

1. 启动应用
2. 导航到 "设置" → "开发者工具"
3. 在 "错误日志查看器" 中查看所有错误

### 测试错误系统（开发环境）

1. 在开发者工具页面使用 "错误测试工具"
2. 点击不同按钮测试各种错误类型
3. 查看错误日志查看器中的记录

### 手动记录错误

```typescript
import { errorLogger } from '@/utils/errorLogger';

// 记录自定义错误
await errorLogger.logCustomError('用户操作失败', {
  userId: 123,
  action: 'save-document',
  error: errorObject,
});

// 记录警告
await errorLogger.logCustomWarning('性能问题检测', {
  loadTime: 5000,
  component: 'DataTable',
});
```

## 配置选项

### 日志文件配置

- **路径**：`logs/error.log`
- **最大大小**：10MB
- **自动清理**：每次启动时清除旧日志
- **缓冲写入**：1秒延迟批量写入

### 会话管理

- 每次应用启动生成新的会话 ID
- 会话 ID 格式：`session-{timestamp}-{random}`
- 所有错误都关联到当前会话

## API 参考

### ErrorLogger 类

```typescript
class ErrorLogger {
  // 记录错误
  logError(errorInfo: Partial<ErrorLogEntry>): void;

  // 记录 React 错误
  logReactError(error: Error, errorInfo: { componentStack: string }): void;

  // 记录自定义错误
  async logCustomError(
    message: string,
    additional?: Record<string, any>
  ): Promise<void>;

  // 记录自定义警告
  async logCustomWarning(
    message: string,
    additional?: Record<string, any>
  ): Promise<void>;

  // 获取会话 ID
  getSessionId(): string;

  // 强制刷新缓冲区
  async forceFlush(): Promise<void>;

  // 清理资源
  async cleanup(): Promise<void>;
}
```

### ErrorBoundary 组件

```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
```

## 最佳实践

1. **在关键操作周围添加错误处理**

   ```typescript
   try {
     await criticalOperation();
   } catch (error) {
     await errorLogger.logCustomError('关键操作失败', {
       operation: 'data-sync',
       error: error.message,
     });
     throw error;
   }
   ```

2. **为用户交互添加错误上下文**

   ```typescript
   const handleUserAction = async () => {
     try {
       await userAction();
     } catch (error) {
       await errorLogger.logCustomError('用户操作失败', {
         userId: user.id,
         action: 'save-settings',
         timestamp: Date.now(),
       });
     }
   };
   ```

3. **在组件卸载时清理**
   ```typescript
   useEffect(() => {
     return () => {
       errorLogger.forceFlush();
     };
   }, []);
   ```

## 安全考虑

- 敏感信息自动过滤（密码、token 等）
- 本地文件存储，不上传到服务器
- 错误堆栈信息仅在开发环境显示详细内容
- 生产环境下错误信息简化显示

## 性能优化

- 批量写入减少 I/O 操作
- 错误记录异步处理
- 内存缓冲避免频繁文件操作
- 自动清理避免日志文件过大

## 故障排除

### 常见问题

1. **日志文件写入失败**
   - 检查文件权限
   - 确认 Tauri 后端正常运行

2. **错误未被捕获**
   - 检查错误处理器是否正确初始化
   - 确认在 App 组件中正确配置 ErrorBoundary

3. **错误查看器显示空白**
   - 检查日志文件是否存在
   - 确认文件操作权限正常

### 调试模式

开发环境下：

- 错误详情在控制台输出
- 错误边界显示详细堆栈信息
- 可通过 `?debug=1` 参数启用生产环境调试

## 更新日志

### v1.0.5 (2025-07-11)

- ✅ 实现完整的错误日志系统
- ✅ 添加错误查看和分析工具
- ✅ 集成到设置页面开发者工具
- ✅ 添加错误测试工具
- ✅ 支持错误导出功能
