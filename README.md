# InfloWave

<div align="center">

**[🇨🇳 中文](README.md) | [🇺🇸 English](README-en.md)**

</div>

<div align="center">

![InfloWave Logo](src-tauri/icons/icon.png)

**现代化的时序数据库管理工具**

基于 Tauri + React + TypeScript + Rust 构建的跨平台桌面应用

[![GitHub release](https://img.shields.io/github/release/chenqi92/inflowave.svg)](https://github.com/chenqi92/inflowave/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/chenqi92/inflowave)

</div>

## 🎯 项目概述

**InfloWave** 是一个专为时序数据库设计的现代化管理工具，提供直观的图形界面来管理 InfluxDB 数据库。通过 Tauri 框架结合 React 前端和 Rust 后端，为用户提供高性能、安全可靠的数据库管理体验。

### ✨ 核心特性

- 🔗 **多连接管理** - 同时管理多个 InfluxDB 实例
- 📊 **可视化查询** - 专业的 InfluxQL 查询编辑器和结果可视化
- 📈 **图表分析** - 多种图表类型支持时序数据分析
- 📥 **数据导入导出** - 支持 CSV、JSON、Excel 等多种格式
- 🎨 **现代化界面** - 基于 Shadcn/ui 的美观界面设计
- 🌐 **跨平台支持** - Windows、macOS、Linux 全平台支持
- 🔒 **安全可靠** - 本地存储，数据安全有保障

## 🚀 快速开始

### 📦 安装使用

#### 方式一：下载预构建版本 (推荐)

1. 访问 [Releases 页面](https://github.com/chenqi92/inflowave/releases)
2. 根据您的系统选择合适的安装包：

   **Windows**
   - x64: `InfloWave_x.x.x_x64.msi`
   - x86: `InfloWave_x.x.x_x86.msi`

   **macOS**
   - Intel: `InfloWave_x.x.x_x64.dmg`
   - Apple Silicon: `InfloWave_x.x.x_aarch64.dmg`

   **Linux**
   - x64: `inflowave_x.x.x_amd64.deb` / `inflowave_x.x.x_amd64.AppImage`
   - ARM64: `inflowave_x.x.x_arm64.deb` / `inflowave_x.x.x_aarch64.AppImage`

#### 方式二：从源码构建

**系统要求**
- Node.js 18.0+
- Rust 1.70+
- 操作系统：Windows 10+, macOS 10.15+, Ubuntu 18.04+

**构建步骤**

```bash
# 克隆项目
git clone https://github.com/chenqi92/inflowave.git
cd inflowave

# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev

# 构建生产版本
npm run tauri:build
```

### 🔧 首次使用

1. **启动应用** - 双击安装的应用图标
2. **添加连接** - 点击"添加连接"配置 InfluxDB 服务器
3. **测试连接** - 验证连接配置是否正确
4. **开始使用** - 浏览数据库、执行查询、创建图表

## 🌟 功能特性

### 🔗 连接管理
- ✅ 多数据库连接配置和管理
- ✅ 连接状态实时监控和健康检查
- ✅ 安全的连接凭据存储
- ✅ 连接池管理和自动重连

### 🗄️ 数据库操作
- ✅ 数据库列表展示和管理
- ✅ 数据库创建、删除操作
- ✅ 测量 (Measurement) 和字段浏览
- ✅ 右键快捷操作菜单
- ✅ 数据表格浏览器

### 🔍 查询系统
- ✅ Monaco Editor 专业查询编辑器
- ✅ InfluxQL 语法高亮和智能提示
- ✅ 查询结果表格展示和分页
- ✅ 查询历史记录管理
- ✅ 多格式结果导出

### 📊 数据可视化
- ✅ 多种图表类型（折线图、柱状图、饼图等）
- ✅ 时序数据专用图表组件
- ✅ 交互式图表（缩放、平移、提示）
- ✅ 响应式仪表板布局

### 📥📤 数据管理
- ✅ Line Protocol 格式数据写入
- ✅ CSV、JSON 文件导入
- ✅ 智能字段类型推断
- ✅ 数据验证和错误处理

## 🏗️ 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: Shadcn/ui + Radix UI
- **图表库**: ECharts + Recharts
- **代码编辑器**: Monaco Editor
- **样式**: Tailwind CSS
- **构建工具**: Vite

### 后端技术栈
- **框架**: Tauri 2.0
- **语言**: Rust
- **数据库客户端**: influxdb crate
- **序列化**: serde
- **异步运行时**: tokio

## 📁 项目结构

```
inflowave/
├── src/                          # React 前端源码
│   ├── components/              # 组件库
│   │   ├── common/             # 通用组件
│   │   ├── query/              # 查询相关组件
│   │   ├── layout/             # 布局组件
│   │   ├── visualization/      # 可视化组件
│   │   └── ui/                 # UI 基础组件
│   ├── pages/                  # 页面组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── services/               # API 服务层
│   ├── store/                  # 状态管理
│   ├── types/                  # TypeScript 类型定义
│   └── utils/                  # 工具函数
├── src-tauri/                   # Rust 后端源码
│   ├── src/
│   │   ├── commands/           # Tauri 命令处理
│   │   ├── database/           # 数据库连接和操作
│   │   ├── models/             # 数据模型
│   │   ├── services/           # 业务逻辑服务
│   │   └── utils/              # 工具函数
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
├── public/                      # 静态资源
├── scripts/                     # 构建脚本
└── README.md                    # 项目说明
```

## 📊 功能完成状态

### ✅ 已完成功能 (95%+)

- **连接管理**: 多连接支持、健康检查、安全存储
- **数据库操作**: 完整的 CRUD 操作、右键菜单
- **查询系统**: 专业编辑器、智能提示、历史管理
- **数据可视化**: 多种图表类型、交互式操作
- **数据管理**: 导入导出、数据验证
- **系统功能**: 性能监控、错误处理、配置管理

### 🚧 持续优化

- **性能优化**: 连接池优化、查询性能提升
- **用户体验**: 更多快捷操作、主题定制
- **功能扩展**: 高级分析、插件系统

## 🛠️ 开发指南

### 开发环境设置

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev

# 运行测试
npm test

# 代码格式化
npm run format

# 代码检查
npm run lint
```

### 构建发布

```bash
# 构建生产版本
npm run tauri:build

# 跨平台构建
npm run build:windows
npm run build:macos
npm run build:linux
```

## 🤝 贡献指南

我们欢迎各种形式的贡献！

1. **报告问题** - 在 [Issues](https://github.com/chenqi92/inflowave/issues) 中报告 bug
2. **功能建议** - 提出新功能建议
3. **代码贡献** - 提交 Pull Request
4. **文档改进** - 帮助完善文档

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为项目做出贡献的开发者和用户！

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Rust](https://www.rust-lang.org/) - 系统编程语言
- [InfluxDB](https://www.influxdata.com/) - 时序数据库

## 📞 获取帮助

- **问题报告**: [GitHub Issues](https://github.com/chenqi92/inflowave/issues)
- **功能建议**: [GitHub Discussions](https://github.com/chenqi92/inflowave/discussions)
- **项目主页**: [https://allbs.cn](https://allbs.cn)

---

<div align="center">

**让时序数据管理变得简单高效** 🚀

[⭐ 给项目点个星](https://github.com/chenqi92/inflowave) | [📋 报告问题](https://github.com/chenqi92/inflowave/issues) | [💡 功能建议](https://github.com/chenqi92/inflowave/discussions)

</div>