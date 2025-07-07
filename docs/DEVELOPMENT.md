# InfluxDB GUI Manager - 开发指南

## 开发环境设置

### 系统要求
- Node.js 18+
- Rust 1.70+
- Windows 10+, macOS 10.15+, 或 Linux

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd influx-gui
```

2. **安装前端依赖**
```bash
npm install
```

3. **安装 Rust 和 Tauri CLI**
```bash
# 如果还没有安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安装 Tauri CLI
npm install -g @tauri-apps/cli
```

4. **验证环境**
```bash
node --version
npm --version
rustc --version
cargo --version
tauri --version
```

## 开发工作流

### 启动开发服务器
```bash
# 启动 Tauri 开发模式（同时启动前端和后端）
npm run tauri:dev

# 或者分别启动
npm run dev          # 仅前端开发服务器
npm run tauri dev    # Tauri 开发模式
```

### 构建项目
```bash
# 开发构建
npm run build

# 生产构建
npm run tauri:build
```

### 代码质量检查
```bash
# ESLint 检查
npm run lint
npm run lint:fix

# Prettier 格式化
npm run format
npm run format:check

# TypeScript 类型检查
npm run type-check
```

### 测试
```bash
# 运行测试
npm test

# 测试覆盖率
npm run test:coverage

# 测试 UI
npm run test:ui
```

## 项目结构详解

### 前端结构 (`src/`)
```
src/
├── components/          # 可复用组件
│   ├── common/         # 通用组件（按钮、输入框等）
│   ├── charts/         # 图表组件
│   ├── forms/          # 表单组件
│   └── layout/         # 布局组件
├── pages/              # 页面组件
│   ├── Dashboard/      # 仪表板页面
│   ├── Connections/    # 连接管理页面
│   ├── Query/          # 查询页面
│   ├── Database/       # 数据库管理页面
│   ├── Visualization/  # 数据可视化页面
│   ├── DataWrite/      # 数据写入页面
│   └── Settings/       # 设置页面
├── hooks/              # 自定义 React Hooks
├── services/           # API 服务层
├── store/              # 状态管理（Zustand）
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
├── styles/             # 全局样式
└── assets/             # 静态资源
```

### 后端结构 (`src-tauri/`)
```
src-tauri/
├── src/
│   ├── commands/       # Tauri 命令处理器
│   ├── database/       # 数据库连接和操作
│   ├── models/         # 数据模型
│   ├── services/       # 业务逻辑服务
│   ├── utils/          # 工具函数
│   ├── config/         # 配置管理
│   └── main.rs         # 主入口文件
├── Cargo.toml          # Rust 依赖配置
├── tauri.conf.json     # Tauri 配置文件
└── build.rs            # 构建脚本
```

## 开发规范

### 代码风格
- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 和 Prettier 配置
- 使用 Conventional Commits 规范提交信息
- 组件使用 PascalCase 命名
- 文件和目录使用 kebab-case 命名

### Git 工作流
1. 从 `main` 分支创建功能分支
2. 功能开发完成后提交 Pull Request
3. 代码审查通过后合并到 `main`
4. 使用语义化版本号进行发布

### 提交信息规范
```
type(scope): description

feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具或辅助工具的变动
```

## 组件开发指南

### 创建新组件
1. 在 `src/components/` 下创建组件目录
2. 创建 `index.tsx` 主文件
3. 如需要，创建 `types.ts` 类型定义
4. 添加相应的测试文件

### 组件模板
```typescript
import React from 'react';
import { ComponentProps } from './types';

const ComponentName: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2,
  ...props 
}) => {
  return (
    <div {...props}>
      {/* 组件内容 */}
    </div>
  );
};

export default ComponentName;
```

### 页面组件开发
1. 在 `src/pages/` 下创建页面目录
2. 实现页面主要功能
3. 添加到路由配置中
4. 更新侧边栏菜单

## 状态管理

### Zustand Store 创建
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  // 状态定义
  data: any[];
  loading: boolean;
  
  // 操作方法
  setData: (data: any[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // 初始状态
      data: [],
      loading: false,
      
      // 操作方法实现
      setData: (data) => set({ data }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'store-name',
      partialize: (state) => ({
        // 选择需要持久化的状态
        data: state.data,
      }),
    }
  )
);
```

## API 开发

### Tauri Command 创建
```rust
#[tauri::command]
async fn command_name(param: String) -> Result<String, String> {
    // 实现逻辑
    Ok("success".to_string())
}

// 在 main.rs 中注册
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![command_name])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 前端调用 Tauri Command
```typescript
import { invoke } from '@tauri-apps/api/tauri';

const callCommand = async () => {
  try {
    const result = await invoke('command_name', { param: 'value' });
    console.log(result);
  } catch (error) {
    console.error('Command failed:', error);
  }
};
```

## 测试指南

### 组件测试
```typescript
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Rust 测试
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_function() {
        let result = function_to_test();
        assert_eq!(result, expected_value);
    }
}
```

## 调试技巧

### 前端调试
- 使用浏览器开发者工具
- React DevTools 扩展
- Zustand DevTools

### 后端调试
- 使用 `println!` 或 `dbg!` 宏
- 配置日志级别
- 使用 Rust 调试器

### Tauri 调试
```bash
# 启用调试模式
TAURI_DEBUG=true npm run tauri:dev

# 查看 Tauri 日志
tail -f ~/.local/share/com.tauri.dev/logs/main.log
```

## 性能优化

### 前端优化
- 使用 React.memo 避免不必要的重渲染
- 实现虚拟滚动处理大数据集
- 使用 useMemo 和 useCallback 优化计算
- 代码分割和懒加载

### 后端优化
- 使用连接池管理数据库连接
- 实现查询结果缓存
- 异步处理耗时操作
- 内存管理优化

## 部署指南

### 开发环境部署
```bash
npm run tauri:dev
```

### 生产环境构建
```bash
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录下。

## 常见问题

### Q: Tauri 开发模式启动失败
A: 检查 Rust 环境是否正确安装，确保 Cargo.toml 依赖正确

### Q: 前端热更新不工作
A: 检查 Vite 配置，确保端口没有被占用

### Q: 类型错误
A: 运行 `npm run type-check` 检查类型问题

### Q: 构建失败
A: 检查依赖版本兼容性，清理 node_modules 重新安装

## 贡献指南

1. Fork 项目到个人仓库
2. 创建功能分支进行开发
3. 确保代码通过所有测试
4. 提交 Pull Request
5. 等待代码审查和合并

## 资源链接

- [Tauri 官方文档](https://tauri.app/)
- [React 官方文档](https://react.dev/)
- [Ant Design 组件库](https://ant.design/)
- [Zustand 状态管理](https://github.com/pmndrs/zustand)
- [InfluxDB 文档](https://docs.influxdata.com/)
