# 代码质量和架构优化建议

## 🔧 立即改进项

### 1. TypeScript 严格模式配置

#### 升级 tsconfig.json
```json
{
  "compilerOptions": {
    // 启用更严格的类型检查
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    
    // 改善开发体验
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.tsbuildinfo",
    
    // 路径映射优化
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/services/*": ["src/services/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"],
      "@/store/*": ["src/store/*"]
    }
  }
}
```

### 2. 改进错误处理

#### 全局错误边界增强
```typescript
// components/ErrorBoundary.tsx 增强版
interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  eventType?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class EnhancedErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 详细错误日志
    console.error('Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // 发送错误报告到后端
    this.reportError(error, errorInfo);
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await invoke('report_frontend_error', {
        error: {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}
```

### 3. API 调用标准化

#### 统一的 API 客户端
```typescript
// services/apiClient.ts
class APIClient {
  private static instance: APIClient;
  private requestQueue = new Map<string, Promise<any>>();

  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient();
    }
    return APIClient.instance;
  }

  // 防重复请求
  async request<T>(
    command: string, 
    params?: any, 
    options: { 
      dedupe?: boolean, 
      timeout?: number,
      retries?: number 
    } = {}
  ): Promise<T> {
    const { dedupe = true, timeout = 10000, retries = 3 } = options;
    const key = `${command}-${JSON.stringify(params)}`;

    // 去重逻辑
    if (dedupe && this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const requestPromise = this.executeWithRetry(command, params, timeout, retries);
    
    if (dedupe) {
      this.requestQueue.set(key, requestPromise);
      requestPromise.finally(() => {
        this.requestQueue.delete(key);
      });
    }

    return requestPromise;
  }

  private async executeWithRetry<T>(
    command: string, 
    params: any, 
    timeout: number, 
    retries: number
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.executeWithTimeout(command, params, timeout);
      } catch (error) {
        if (attempt === retries) throw error;
        
        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  private async executeWithTimeout<T>(
    command: string, 
    params: any, 
    timeout: number
  ): Promise<T> {
    return Promise.race([
      invoke<T>(command, params),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }
}

export const apiClient = APIClient.getInstance();
```

### 4. 类型安全改进

#### 严格的类型定义
```typescript
// types/api.ts
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  metadata: {
    executionTime: number;
    rowCount: number;
    query: string;
  };
}

// 使用 branded types 增加类型安全
export type ConnectionId = string & { readonly __brand: unique symbol };
export type QueryId = string & { readonly __brand: unique symbol };

export const createConnectionId = (id: string): ConnectionId => id as ConnectionId;
export const createQueryId = (id: string): QueryId => id as QueryId;
```

### 5. 测试覆盖率提升

#### 添加关键路径测试
```typescript
// __tests__/critical-paths.test.ts
describe('Critical User Paths', () => {
  test('should connect to database and execute query', async () => {
    // 连接数据库
    const connection = await createTestConnection();
    expect(connection.status).toBe('connected');

    // 执行查询
    const result = await executeQuery(connection.id, 'SELECT * FROM test');
    expect(result.rows.length).toBeGreaterThan(0);

    // 清理
    await disconnectFromDatabase(connection.id);
  });

  test('should handle port conflicts gracefully', async () => {
    // 占用端口
    const server = createTestServer(1422);
    
    // 尝试启动应用
    const result = await startApplication();
    
    // 应该自动分配新端口
    expect(result.port).not.toBe(1422);
    expect(result.status).toBe('running');
    
    server.close();
  });
});
```

## 📈 代码质量指标目标

- **TypeScript 严格模式**: 100% 覆盖
- **测试覆盖率**: 70%+ (关键路径 90%+)
- **ESLint 规则通过率**: 100%
- **代码重复率**: <5%
- **圈复杂度**: 平均 <10