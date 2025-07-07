# InfluxDB GUI Manager

一个基于 Tauri + React + TypeScript + Rust 开发的现代化 InfluxDB 1.x 桌面管理工具。

## 🚀 项目特性

### 核心功能
- **连接管理**: 多数据库连接配置、状态监控、自动重连
- **数据库操作**: 数据库的创建、删除、查看，保留策略管理
- **数据查询**: InfluxQL 查询编辑器，语法高亮，自动补全
- **数据可视化**: 时序数据图表展示（折线图、柱状图等）
- **数据写入**: 单条数据写入、批量数据导入（CSV、JSON）
- **系统监控**: 数据库性能指标、存储使用情况、查询性能分析
- **用户管理**: 用户权限管理和认证

### 技术优势
- **高性能**: 基于 Rust 后端，原生性能
- **轻量级**: 使用系统 WebView，无需捆绑 Chromium
- **跨平台**: 支持 Windows、macOS、Linux
- **现代化**: React + TypeScript 前端，组件化开发
- **安全性**: 连接配置安全存储，数据传输加密

## 🏗️ 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: Ant Design
- **图表库**: ECharts
- **代码编辑器**: Monaco Editor
- **样式**: Tailwind CSS
- **构建工具**: Vite

### 后端技术栈
- **框架**: Tauri 2.0
- **语言**: Rust
- **数据库客户端**: influxdb crate
- **序列化**: serde
- **异步运行时**: tokio
- **配置管理**: config crate

## 📁 项目结构

```
influx-gui/
├── src/                    # React 前端源码
│   ├── components/         # 可复用组件
│   │   ├── common/        # 通用组件
│   │   ├── charts/        # 图表组件
│   │   └── forms/         # 表单组件
│   ├── pages/             # 页面组件
│   │   ├── Dashboard/     # 仪表板
│   │   ├── Query/         # 查询页面
│   │   ├── Database/      # 数据库管理
│   │   └── Settings/      # 设置页面
│   ├── hooks/             # 自定义 Hooks
│   ├── services/          # API 服务层
│   ├── store/             # 状态管理
│   ├── types/             # TypeScript 类型定义
│   └── utils/             # 工具函数
├── src-tauri/             # Rust 后端源码
│   ├── src/
│   │   ├── commands/      # Tauri 命令处理
│   │   ├── database/      # 数据库连接和操作
│   │   ├── models/        # 数据模型
│   │   ├── services/      # 业务逻辑服务
│   │   └── utils/         # 工具函数
│   ├── Cargo.toml         # Rust 依赖配置
│   └── tauri.conf.json    # Tauri 配置
├── docs/                  # 项目文档
├── tests/                 # 测试文件
└── README.md              # 项目说明
```

## 🎯 开发计划

### Phase 1: 基础架构 (Week 1-2)
- [x] 项目初始化和环境配置
- [ ] Tauri 项目搭建
- [ ] React 前端基础架构
- [ ] 基础 UI 组件库集成
- [ ] 路由和状态管理配置

### Phase 2: 连接管理 (Week 3)
- [ ] 数据库连接配置界面
- [ ] 连接状态监控
- [ ] 连接配置安全存储
- [ ] 连接测试功能

### Phase 3: 数据库操作 (Week 4)
- [ ] 数据库列表展示
- [ ] 数据库创建/删除
- [ ] 保留策略管理
- [ ] 用户权限管理

### Phase 4: 查询功能 (Week 5-6)
- [ ] InfluxQL 查询编辑器
- [ ] 语法高亮和自动补全
- [ ] 查询结果表格展示
- [ ] 查询历史记录

### Phase 5: 数据可视化 (Week 7-8)
- [ ] 图表组件开发
- [ ] 时序数据可视化
- [ ] 图表配置和导出
- [ ] 实时数据监控

### Phase 6: 数据写入 (Week 9)
- [ ] 单条数据写入界面
- [ ] 批量数据导入
- [ ] 数据格式验证
- [ ] 写入性能优化

### Phase 7: 系统监控 (Week 10)
- [ ] 性能指标监控
- [ ] 存储使用情况
- [ ] 查询性能分析
- [ ] 系统健康检查

### Phase 8: 优化和测试 (Week 11-12)
- [ ] 性能优化
- [ ] 单元测试和集成测试
- [ ] 用户体验优化
- [ ] 文档完善

## 🛠️ 开发环境

### 系统要求
- Node.js 18+
- Rust 1.70+
- 操作系统: Windows 10+, macOS 10.15+, Linux

### 安装依赖
```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI
npm install -g @tauri-apps/cli

# 验证 Rust 环境
rustc --version
cargo --version
```

### 开发命令
```bash
# 启动开发服务器
npm run tauri dev

# 构建应用
npm run tauri build

# 运行测试
npm test

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 📝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 支持

如果您觉得这个项目有用，请给它一个 ⭐️！

如有问题或建议，请提交 [Issue](https://github.com/your-username/influx-gui/issues)。
