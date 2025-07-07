# ⚛️ React 前端开发文档

## 概述

InfluxDB GUI Manager 的前端基于 **React 18 + TypeScript + Vite** 架构，使用 **Ant Design** 组件库和 **TailwindCSS** 样式框架，提供现代化的用户界面。

## 🏗️ 前端架构

```
src/
├── main.tsx                # 应用入口点
├── App.tsx                 # 根组件
├── components/             # 可复用组件
│   ├── common/            # 通用组件
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Loading/
│   ├── charts/            # 图表组件
│   │   ├── LineChart/
│   │   ├── BarChart/
│   │   └── TimeSeriesChart/
│   ├── forms/             # 表单组件
│   │   ├── ConnectionForm/
│   │   ├── QueryForm/
│   │   └── DatabaseForm/
│   └── layout/            # 布局组件
│       ├── Header/
│       ├── Sidebar/
│       └── Footer/
├── pages/                 # 页面组件
│   ├── Dashboard/         # 仪表板
│   ├── Connections/       # 连接管理
│   ├── Query/            # 查询界面
│   ├── Database/         # 数据库管理
│   ├── Visualization/    # 数据可视化
│   ├── DataWrite/        # 数据写入
│   └── Settings/         # 设置页面
├── hooks/                # 自定义 Hooks
│   ├── useConnection.ts
│   ├── useQuery.ts
│   └── useDatabase.ts
├── services/             # API 服务层
│   ├── api.ts           # API 基础配置
│   ├── connection.ts    # 连接相关 API
│   ├── database.ts      # 数据库相关 API
│   └── query.ts         # 查询相关 API
├── store/               # 状态管理
│   ├── index.ts         # Store 入口
│   ├── connectionStore.ts
│   ├── queryStore.ts
│   └── settingsStore.ts
├── types/               # TypeScript 类型定义
│   ├── api.ts          # API 类型
│   ├── database.ts     # 数据库类型
│   └── common.ts       # 通用类型
├── utils/              # 工具函数
│   ├── format.ts       # 格式化工具
│   ├── validation.ts   # 验证工具
│   └── constants.ts    # 常量定义
├── styles/             # 样式文件
│   ├── globals.css     # 全局样式
│   ├── components.css  # 组件样式
│   └── variables.css   # CSS 变量
└── assets/             # 静态资源
    ├── images/
    ├── icons/
    └── fonts/
```

## 📚 文档导航

### 🔧 [环境配置](./environment.md)
- Node.js 和 npm 环境设置
- 开发工具配置
- 依赖管理
- 开发服务器配置

### 🧩 [组件开发](./components.md)
- React 组件开发规范
- 组件设计原则
- Props 类型定义
- 组件测试策略

### 🗃️ [状态管理](./state.md)
- Zustand 状态管理模式
- Store 设计原则
- 状态持久化
- 状态调试工具

### 🎨 [UI 设计](./ui-design.md)
- Ant Design 使用规范
- 主题定制
- 响应式设计
- 无障碍访问

### 📊 [数据可视化](./visualization.md)
- ECharts 图表开发
- 图表类型选择
- 数据处理和格式化
- 交互设计

### 🛣️ [路由管理](./routing.md)
- React Router 配置
- 路由守卫
- 动态路由
- 面包屑导航

### 🧪 [测试开发](./testing.md)
- 单元测试策略
- 组件测试
- 集成测试
- E2E 测试

### 💅 [样式管理](./styling.md)
- TailwindCSS 使用规范
- CSS Modules
- 样式组织
- 主题切换

## 🚀 快速开始

### 1. 环境检查
```bash
# 检查 Node.js 版本 (需要 18+)
node --version

# 检查 npm 版本
npm --version

# 检查 TypeScript
npx tsc --version
```

### 2. 安装依赖
```bash
# 安装项目依赖
npm install

# 安装开发工具 (可选)
npm install -g @typescript-eslint/eslint-plugin
npm install -g prettier
```

### 3. 启动开发服务器
```bash
# 启动前端开发服务器
npm run dev

# 启动完整开发环境 (前端 + 后端)
npm run tauri:dev
```

## 🔧 核心技术栈

### 主要依赖
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "antd": "^5.12.8",
    "zustand": "^4.4.7",
    "echarts": "^5.4.3",
    "echarts-for-react": "^3.0.2",
    "@monaco-editor/react": "^4.6.0",
    "dayjs": "^1.11.10",
    "lodash-es": "^4.17.21",
    "classnames": "^2.3.2"
  }
}
```

### 开发依赖
```json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.8",
    "vitest": "^1.0.4",
    "tailwindcss": "^3.3.6",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1"
  }
}
```

## 📋 开发规范

### 组件命名规范
```typescript
// 组件文件命名: PascalCase
// 文件: ConnectionForm.tsx
export const ConnectionForm: React.FC<ConnectionFormProps> = ({ ... }) => {
  return <div>...</div>;
};

// 默认导出
export default ConnectionForm;
```

### Props 类型定义
```typescript
// 定义 Props 接口
interface ConnectionFormProps {
  connection?: Connection;
  onSubmit: (data: ConnectionData) => void;
  onCancel: () => void;
  loading?: boolean;
}

// 使用泛型组件
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

const List = <T,>({ items, renderItem, keyExtractor }: ListProps<T>) => {
  return (
    <div>
      {items.map(item => (
        <div key={keyExtractor(item)}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
};
```

### Hooks 使用规范
```typescript
// 自定义 Hook
export const useConnection = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await connectionService.getAll();
      setConnections(data);
    } catch (error) {
      console.error('获取连接列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);
  
  return {
    connections,
    loading,
    refetch: fetchConnections
  };
};
```

### 状态管理模式
```typescript
// Zustand Store 定义
interface ConnectionStore {
  connections: Connection[];
  currentConnection: Connection | null;
  loading: boolean;
  
  // Actions
  setConnections: (connections: Connection[]) => void;
  setCurrentConnection: (connection: Connection | null) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      connections: [],
      currentConnection: null,
      loading: false,
      
      setConnections: (connections) => set({ connections }),
      setCurrentConnection: (connection) => set({ currentConnection: connection }),
      
      addConnection: (connection) => set((state) => ({
        connections: [...state.connections, connection]
      })),
      
      updateConnection: (id, updates) => set((state) => ({
        connections: state.connections.map(conn => 
          conn.id === id ? { ...conn, ...updates } : conn
        )
      })),
      
      removeConnection: (id) => set((state) => ({
        connections: state.connections.filter(conn => conn.id !== id)
      }))
    }),
    {
      name: 'connection-store',
      partialize: (state) => ({
        connections: state.connections,
        currentConnection: state.currentConnection
      })
    }
  )
);
```

## 🎨 UI 组件示例

### 基础组件
```typescript
// Button 组件
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  onClick,
  children
}) => {
  const className = classNames(
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    {
      'btn-loading': loading,
      'btn-disabled': disabled
    }
  );
  
  return (
    <button
      className={className}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <LoadingIcon />}
      {children}
    </button>
  );
};
```

### 表单组件
```typescript
// 连接表单组件
export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  connection,
  onSubmit,
  onCancel
}) => {
  const [form] = Form.useForm();
  
  const handleSubmit = async (values: ConnectionFormData) => {
    try {
      await onSubmit(values);
      message.success('连接保存成功');
    } catch (error) {
      message.error('连接保存失败');
    }
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={connection}
      onFinish={handleSubmit}
    >
      <Form.Item
        name="name"
        label="连接名称"
        rules={[{ required: true, message: '请输入连接名称' }]}
      >
        <Input placeholder="输入连接名称" />
      </Form.Item>
      
      <Form.Item
        name="host"
        label="主机地址"
        rules={[{ required: true, message: '请输入主机地址' }]}
      >
        <Input placeholder="localhost" />
      </Form.Item>
      
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
          <Button onClick={onCancel}>
            取消
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};
```

## 📊 性能优化

### 组件优化
```typescript
// 使用 React.memo 优化组件
export const ConnectionItem = React.memo<ConnectionItemProps>(({
  connection,
  onEdit,
  onDelete
}) => {
  return (
    <div className="connection-item">
      <h3>{connection.name}</h3>
      <p>{connection.host}:{connection.port}</p>
      <Space>
        <Button onClick={() => onEdit(connection)}>编辑</Button>
        <Button danger onClick={() => onDelete(connection.id)}>删除</Button>
      </Space>
    </div>
  );
});

// 使用 useMemo 优化计算
const ExpensiveComponent: React.FC<Props> = ({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      processed: expensiveCalculation(item)
    }));
  }, [data]);
  
  return <div>{/* 渲染处理后的数据 */}</div>;
};
```

### 代码分割
```typescript
// 路由级别的代码分割
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Connections = lazy(() => import('../pages/Connections'));
const Query = lazy(() => import('../pages/Query'));

// 在路由中使用
<Routes>
  <Route path="/dashboard" element={
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  } />
</Routes>
```

## 🔗 相关链接

- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Ant Design 组件库](https://ant.design/)
- [Zustand 状态管理](https://github.com/pmndrs/zustand)
- [Vite 构建工具](https://vitejs.dev/)

---

> 💡 **下一步**: 建议先阅读 [环境配置](./environment.md) 文档，然后学习 [组件开发](./components.md) 规范。
