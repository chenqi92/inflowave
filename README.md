# InfluxDB GUI Manager

一个现代化的 InfluxDB 1.x 桌面管理工具，基于 Tauri + React + TypeScript + Rust 开发，提供完整的数据库管理、查询分析和数据可视化功能。

## 🎯 项目状态

**✅ 项目已完成 (99%)**
**🚀 可投入生产使用**
**📦 支持自动化构建和发布**

## 🌟 核心功能

### 📊 **数据库管理**
- ✅ **多连接管理** - 支持多个 InfluxDB 实例连接，安全存储凭据
- ✅ **数据库操作** - 创建、删除、查看数据库，完整的 CRUD 操作
- ✅ **保留策略管理** - 查看和管理数据保留策略
- ✅ **连接状态监控** - 实时连接健康检查和状态显示
- ✅ **右键快捷操作** - 数据库表格右键菜单，快速执行常用操作

### 🔍 **高级查询系统**
- ✅ **专业查询编辑器** - Monaco Editor，支持 InfluxQL 语法高亮
- ✅ **智能代码提示** - 数据库、测量、字段、标签自动补全
- ✅ **查询历史管理** - 保存和管理查询历史，支持书签功能
- ✅ **结果多格式导出** - CSV、JSON、Excel (XLSX) 格式导出
- ✅ **查询性能分析** - 执行时间统计和性能监控

### 📈 **数据可视化**
- ✅ **多种图表类型** - 折线图、柱状图、饼图、面积图等
- ✅ **时序数据专用** - 针对时间序列数据优化的图表展示
- ✅ **交互式图表** - 缩放、平移、数据点提示等交互功能
- ✅ **实时数据监控** - 支持定时刷新和实时数据展示
- ✅ **响应式仪表板** - 自适应布局的数据仪表板

### 📥📤 **数据管理**
- ✅ **数据写入** - 单条和批量数据写入，支持 Line Protocol
- ✅ **文件导入** - CSV、JSON 文件导入，智能字段映射
- ✅ **数据验证** - 完整的数据格式验证和错误提示
- ✅ **导入预览** - 导入前数据预览和字段配置

### 🔧 **系统功能**
- ✅ **性能监控** - 系统资源使用情况和数据库性能指标
- ✅ **连接池管理** - 高效的连接池和资源管理
- ✅ **错误处理** - 完善的错误处理和用户友好的错误提示
- ✅ **配置管理** - 应用设置和用户偏好管理

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

## 📚 文档导航

### 🔧 开发文档
详细的开发指南和技术文档，按模块分类：

- **[📋 开发文档索引](./dev-docs/index.md)** - 完整的开发文档导航
- **[🦀 后端开发](./dev-docs/backend/README.md)** - Rust + Tauri 后端开发
  - [环境配置](./dev-docs/backend/environment.md) - PowerShell + Scoop 环境设置
  - [架构设计](./dev-docs/architecture.md) - 系统架构和模块设计
  - [API 开发](./dev-docs/backend/api.md) - Tauri 命令开发指南
  - [部署指南](./dev-docs/deployment.md) - 跨平台构建和部署
- **[⚛️ 前端开发](./dev-docs/frontend/README.md)** - React + TypeScript 前端开发
  - [组件开发](./dev-docs/frontend/components.md) - React 组件开发规范
  - [状态管理](./dev-docs/frontend/state.md) - Zustand 状态管理
  - [UI 设计](./dev-docs/frontend/ui-design.md) - Ant Design 使用规范
  - [数据可视化](./dev-docs/frontend/visualization.md) - ECharts 图表开发
- **[🔗 集成对接](./dev-docs/integration/README.md)** - 前后端集成和系统对接
  - [通信协议](./dev-docs/integration/communication.md) - 前后端 IPC 通信
  - [InfluxDB 对接](./dev-docs/integration/influxdb.md) - InfluxDB 1.0 兼容性
  - [数据流设计](./dev-docs/integration/data-flow.md) - 数据处理流程

### 📖 用户文档
面向最终用户的使用指南：

- **[📖 用户手册](./user-docs/README.md)** - 完整的用户使用指南
- **[🚀 快速开始](./user-docs/quick-start.md)** - 快速上手指南
- **[🔧 安装指南](./user-docs/installation.md)** - 详细安装步骤
- **[📋 功能介绍](./user-docs/features/README.md)** - 各功能模块详细介绍
  - [功能特性详解](./user-docs/features/overview.md) - 核心功能和创新特性
  - [用户体验增强](./user-docs/features/user-experience.md) - 右键快捷操作等
- **[🎯 使用教程](./user-docs/tutorials/README.md)** - 详细使用教程
  - [功能演示场景](./user-docs/tutorials/demo-scenarios.md) - 完整使用场景演示
- **[❓ 常见问题](./user-docs/faq.md)** - 常见问题解答
- **[🔧 故障排除](./user-docs/troubleshooting.md)** - 问题诊断和解决

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
├── dev-docs/              # 开发文档
│   ├── backend/           # 后端开发文档
│   ├── frontend/          # 前端开发文档
│   └── integration/       # 集成对接文档
├── user-docs/             # 用户文档
│   ├── features/          # 功能介绍
│   └── tutorials/         # 使用教程
├── scripts/               # 构建脚本
├── tests/                 # 测试文件
└── README.md              # 项目说明
```

## 🚀 快速开始

### 📦 安装使用

#### 方式一：下载预构建版本 (推荐)
1. 访问 [Releases 页面](https://github.com/your-username/influx-gui/releases)
2. 下载适合您系统的安装包：
   - **Windows**: `.msi` 安装程序
   - **macOS**: `.dmg` 磁盘映像
   - **Linux**: `.deb` 或 `.AppImage` 包
3. 运行安装程序并按照向导完成安装

#### 方式二：从源码构建

**系统要求**
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: 18.0+
- **Rust**: 1.70+ (推荐通过 Scoop 安装)
- **InfluxDB**: 1.x 服务器

**Windows 自动化设置**
```powershell
# 克隆项目
git clone https://github.com/your-username/influx-gui.git
cd influx-gui

# 运行自动化设置脚本 (PowerShell + Scoop)
.\scripts\setup-dev.ps1

# 启动开发服务器
npm run tauri:dev
```

**手动安装**
```bash
# 1. 克隆项目
git clone https://github.com/your-username/influx-gui.git
cd influx-gui

# 2. 安装前端依赖
npm install

# 3. 启动开发服务器
npm run tauri:dev
```

**生产构建**
```powershell
# Windows 一键构建
.\scripts\one-click-build.ps1 -Target build

# 或使用 npm 脚本
npm run tauri:build
```

### 🔧 首次使用

1. **启动应用** - 双击桌面图标或从开始菜单启动
2. **添加连接** - 点击"添加连接"配置您的 InfluxDB 服务器
3. **测试连接** - 验证连接配置是否正确
4. **开始使用** - 浏览数据库、执行查询、创建图表

## 📊 功能完成状态

### ✅ 已完成功能 (99%)

#### 🔗 连接管理
- ✅ 多数据库连接配置和管理
- ✅ 连接状态实时监控和健康检查
- ✅ 安全的连接凭据存储
- ✅ 连接测试和验证功能
- ✅ 连接池管理和自动重连

#### 🗄️ 数据库操作
- ✅ 数据库列表展示和管理
- ✅ 数据库创建、删除操作
- ✅ 保留策略查看和管理
- ✅ 测量 (Measurement) 浏览
- ✅ 字段和标签信息查看
- ✅ 右键快捷操作菜单

#### 🔍 查询系统
- ✅ 专业的 InfluxQL 查询编辑器 (Monaco Editor)
- ✅ 语法高亮和智能代码提示
- ✅ 数据库、测量、字段自动补全
- ✅ 查询结果表格展示和分页
- ✅ 查询历史记录和书签管理
- ✅ 多格式结果导出 (CSV, JSON, Excel)

#### 📈 数据可视化
- ✅ 多种图表类型 (折线图、柱状图、饼图、面积图)
- ✅ 时序数据专用图表组件
- ✅ 交互式图表 (缩放、平移、提示)
- ✅ 响应式仪表板布局
- ✅ 实时数据刷新和监控

#### 📥📤 数据管理
- ✅ 单条和批量数据写入
- ✅ Line Protocol 格式支持
- ✅ CSV、JSON 文件导入
- ✅ 智能字段类型推断和映射
- ✅ 数据验证和错误处理

#### 🔧 系统功能
- ✅ 性能监控和系统资源显示
- ✅ 应用配置和用户偏好管理
- ✅ 完善的错误处理和用户提示
- ✅ 跨平台支持 (Windows, macOS, Linux)

### 🚧 待优化功能 (1%)

#### 🔄 连接池优化
- ⏳ 连接池性能调优
- ⏳ 连接超时和重试策略优化

#### 🎨 用户体验增强
- ⏳ 更多右键快捷操作
- ⏳ 键盘快捷键支持
- ⏳ 主题和外观定制

#### 📊 高级分析
- ⏳ 查询执行计划分析
- ⏳ 数据基数统计
- ⏳ 性能瓶颈诊断

## 🛠️ 开发环境

### 系统要求
- **Node.js**: 18.0+
- **Rust**: 1.70+
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

### 快速设置 (Windows)
```powershell
# 使用自动化脚本设置完整开发环境
.\scripts\setup-dev.ps1

# 一键构建和运行
.\scripts\one-click-build.ps1
```

### 手动设置
```bash
# 1. 安装前端依赖
npm install

# 2. 验证 Rust 环境
rustc --version
cargo --version

# 3. 启动开发服务器
npm run tauri:dev
```

### 开发命令
```bash
# 启动开发服务器
npm run tauri:dev

# 构建生产版本
npm run tauri:build

# 运行测试
npm test

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 🚀 版本发布

### 自动化发布流程
项目支持基于 package.json 版本的自动化发布：

```powershell
# Windows - 更新版本并触发发布
.\scripts\update-version.ps1 -Version "1.0.1"

# Linux/macOS
./scripts/update-version.sh 1.0.1

# 提交并推送 (自动触发 GitHub Actions)
git add .
git commit -m "chore: bump version to 1.0.1"
git push origin main
```

### 发布产物
- **Windows**: `.msi` 安装程序
- **macOS**: `.dmg` 磁盘映像 (Universal Binary)
- **Linux**: `.deb` 和 `.AppImage` 包

详细发布指南请参考 [RELEASE_GUIDE.md](./RELEASE_GUIDE.md)

## 📖 文档

### 📚 完整文档导航
- **[🔧 开发文档](./dev-docs/index.md)** - 详细的开发指南和技术文档
  - [后端开发](./dev-docs/backend/README.md) - Rust + Tauri 后端开发
  - [前端开发](./dev-docs/frontend/README.md) - React + TypeScript 前端开发
  - [集成对接](./dev-docs/integration/README.md) - 前后端集成和系统对接
- **[📖 用户文档](./user-docs/README.md)** - 面向用户的使用指南
- **[🚀 发布指南](./RELEASE_GUIDE.md)** - 版本发布和构建指南
- **[📊 功能进度](./PROGRESS.md)** - 详细的功能实现进度跟踪

### 🛠️ 构建脚本
项目提供了完整的跨平台构建脚本：
- **[📋 脚本说明](./scripts/README.md)** - 所有构建脚本的详细说明

## 🤝 贡献指南

我们欢迎任何形式的贡献！

### 贡献方式
1. **报告问题** - 在 [Issues](https://github.com/your-username/influx-gui/issues) 中报告 bug 或提出功能建议
2. **改进文档** - 帮助完善文档和使用指南
3. **代码贡献** - 提交代码修复或新功能

### 开发流程
1. Fork 项目到您的 GitHub 账户
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 进行开发并确保代码质量
4. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
5. 推送到分支 (`git push origin feature/AmazingFeature`)
6. 创建 Pull Request

### 代码规范
- 遵循项目的代码风格和命名约定
- 添加必要的注释和文档
- 确保所有测试通过
- 遵循 Git 提交信息规范

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🌟 支持项目

如果这个项目对您有帮助，请考虑：

- ⭐ 给项目点个星标
- 🐛 报告问题和建议
- 📢 分享给其他可能需要的人
- 🤝 参与项目贡献

## 📞 获取帮助

- **问题报告**: [GitHub Issues](https://github.com/your-username/influx-gui/issues)
- **功能建议**: [GitHub Discussions](https://github.com/your-username/influx-gui/discussions)
- **文档**: 查看 [用户文档](./user-docs/README.md) 和 [开发文档](./dev-docs/index.md)

---

**InfluxDB GUI Manager** - 让时序数据管理变得简单高效 🚀
