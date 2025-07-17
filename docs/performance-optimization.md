# 前端性能优化建议

## 🎯 立即可实施的优化

### 1. Vite 构建优化

#### 代码分割改进
当前的 vite.config.ts 已经有基础分包，但可以进一步优化：

```typescript
// vite.config.ts 优化版本
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 基础框架
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          
          // UI 组件库
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          
          // 图表库（较大）
          'vendor-charts': ['echarts', 'echarts-for-react', 'recharts'],
          
          // 编辑器（很大）
          'vendor-editor': ['@monaco-editor/react'],
          
          // 工具库
          'vendor-utils': ['lodash-es', 'dayjs', 'classnames', 'clsx'],
          
          // 表单处理
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Tauri 相关
          'vendor-tauri': ['@tauri-apps/api', '@tauri-apps/plugin-shell'],
          
          // 业务模块
          'app-intelligence': ['src/services/intelligentQuery/**'],
          'app-visualization': ['src/components/visualization/**'],
          'app-analytics': ['src/components/analytics/**'],
        },
      },
    },
    
    // 增加并行度
    minify: 'esbuild',
    
    // 压缩优化
    chunkSizeWarningLimit: 1000,
    
    // 启用压缩
    sourcemap: false, // 生产环境关闭 sourcemap
  },
  
  // 预构建优化
  optimizeDeps: {
    include: [
      'react/jsx-runtime',
      'react-dom/client',
      'echarts/core',
      'echarts/charts',
      'echarts/components',
      'echarts/renderers',
    ],
    exclude: ['@tauri-apps/api'],
  },
})
```

### 2. React 组件优化

#### 组件懒加载
```typescript
// 在主要页面组件中实施
const LazyVisualization = React.lazy(() => import('@/pages/Visualization'));
const LazyAnalytics = React.lazy(() => import('@/components/analytics/PerformanceBottleneckDiagnostics'));
const LazyDashboard = React.lazy(() => import('@/pages/Dashboard'));

// 在 App.tsx 中使用
<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    <Route path="/visualization" element={<LazyVisualization />} />
    <Route path="/analytics" element={<LazyAnalytics />} />
  </Routes>
</Suspense>
```

#### React.memo 优化
```typescript
// 对频繁重渲染的组件使用 memo
export const PortStatus = React.memo<PortStatusProps>(({ showDetails, onPortChange }) => {
  // 组件实现
});

// 对回调函数使用 useCallback
const handlePortChange = useCallback((newPort: number, oldPort: number) => {
  // 处理逻辑
}, []);
```

### 3. 状态管理优化

#### Zustand Store 分片
```typescript
// 将大的 store 拆分成多个小的 store
// stores/connection.ts - 只管理连接状态
// stores/query.ts - 只管理查询状态
// stores/ui.ts - 只管理 UI 状态

// 使用 subscribeWithSelector 进行精确订阅
import { subscribeWithSelector } from 'zustand/middleware'

const useConnectionStore = create(
  subscribeWithSelector((set) => ({
    // state
  }))
)

// 组件中精确订阅
const connections = useConnectionStore(state => state.connections)
```

### 4. 虚拟化长列表

对于大数据集的显示：

```typescript
// 安装 react-window
npm install react-window @types/react-window

// 在查询结果表格中使用
import { VariableSizeList } from 'react-window'

const VirtualizedTable = ({ data }) => (
  <VariableSizeList
    height={400}
    itemCount={data.length}
    itemSize={() => 50}
    itemData={data}
  >
    {({ index, style, data }) => (
      <div style={style}>
        {/* 渲染行内容 */}
      </div>
    )}
  </VariableSizeList>
)
```

## 📊 性能监控工具

### 添加性能监控
```typescript
// utils/performance.ts
export const performanceMonitor = {
  startTiming: (label: string) => {
    performance.mark(`${label}-start`)
  },
  
  endTiming: (label: string) => {
    performance.mark(`${label}-end`)
    performance.measure(label, `${label}-start`, `${label}-end`)
    
    const measures = performance.getEntriesByName(label)
    const duration = measures[measures.length - 1].duration
    
    console.log(`${label}: ${duration.toFixed(2)}ms`)
    return duration
  }
}

// 在组件中使用
useEffect(() => {
  performanceMonitor.startTiming('query-execution')
  
  return () => {
    performanceMonitor.endTiming('query-execution')
  }
}, [])
```

### 内存泄漏检测
```typescript
// hooks/useMemoryLeakDetector.ts
export const useMemoryLeakDetector = (componentName: string) => {
  useEffect(() => {
    let mounted = true
    
    const checkMemory = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory
        console.log(`${componentName} Memory:`, {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        })
      }
    }
    
    const interval = setInterval(checkMemory, 5000)
    
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [componentName])
}
```

## 🎯 预期收益

- **包体积减少**: 30-50%
- **首次加载**: 提升 40-60%
- **页面切换**: 提升 50-70%
- **内存使用**: 降低 20-30%
- **运行时性能**: 提升 30-50%