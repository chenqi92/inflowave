# 📖 InfloWave 用户手册

欢迎使用 InfloWave！这是一款现代化的时序数据库桌面管理工具，专为 InfluxDB 设计，提供直观易用的数据库管理、查询执行和数据可视化功能。

## 🌟 软件特色

InfloWave 是基于 Tauri + React + TypeScript + Rust 开发的跨平台桌面应用，具有以下特色：

- **🚀 高性能** - Rust 后端确保高效的数据处理和连接管理
- **🎨 现代化界面** - 基于 React 和 Shadcn/ui 的现代化用户界面
- **🔒 安全可靠** - 本地存储连接信息，数据安全有保障
- **📊 专业可视化** - 基于 ECharts 的专业时序数据图表
- **🔍 智能查询** - Monaco Editor 提供专业的 InfluxQL 编辑体验

## 🎯 核心功能

### 📊 连接管理

- 支持多个 InfluxDB 实例连接
- 连接状态实时监控
- 安全的凭据存储
- 连接测试和验证

### 🗄️ 数据库操作

- 数据库创建、删除、查看
- 保留策略管理
- 测量（Measurement）浏览
- 字段和标签信息查看
- 右键快捷操作菜单

### 🔍 查询系统

- 专业的 InfluxQL 查询编辑器
- 语法高亮和智能代码提示
- 查询历史记录和书签管理
- 多格式结果导出（CSV、JSON、Excel）
- 查询性能分析

### 📈 数据可视化

- 多种图表类型（折线图、柱状图、饼图、面积图）
- 时序数据专用图表组件
- 交互式图表操作
- 响应式仪表板布局
- 实时数据刷新

### 📥 数据写入

- 单条和批量数据写入
- Line Protocol 格式支持
- CSV、JSON 文件导入
- 智能字段类型推断
- 数据验证和错误处理

## 📚 文档导航

### 🚀 快速开始

- **[安装指南](./installation.md)** - 详细的安装步骤和系统要求
- **[快速开始](./quick-start.md)** - 5分钟快速上手指南

### 📋 功能指南

- **[连接管理](./connection-management.md)** - 如何配置和管理数据库连接
- **[数据库操作](./database-operations.md)** - 数据库和保留策略管理
- **[查询功能](./query-features.md)** - InfluxQL 查询编辑和执行
- **[数据可视化](./data-visualization.md)** - 图表创建和仪表板配置
- **[数据写入](./data-import.md)** - 数据导入和写入操作

### 🔧 高级功能

- **[性能优化](./performance-tips.md)** - 查询优化和性能调优
- **[快捷操作](./shortcuts.md)** - 右键菜单和键盘快捷键
- **[故障排除](./troubleshooting.md)** - 常见问题诊断和解决

### ❓ 帮助支持

- **[常见问题](./faq.md)** - 常见问题解答
- **[更新日志](./changelog.md)** - 版本更新记录

## 🎯 学习路径

### 新手用户

1. [安装软件](./installation.md) → 下载并安装 InfloWave
2. [快速开始](./quick-start.md) → 5分钟快速上手
3. [连接管理](./connection-management.md) → 配置第一个数据库连接
4. [数据库操作](./database-operations.md) → 学习基本的数据库管理

### 进阶用户

1. [查询功能](./query-features.md) → 掌握 InfluxQL 查询技巧
2. [数据可视化](./data-visualization.md) → 创建专业的数据图表
3. [数据写入](./data-import.md) → 批量导入和写入数据
4. [性能优化](./performance-tips.md) → 优化查询性能

## 💡 使用提示

- **右键菜单** - 在数据库表格中右键可快速执行常用操作
- **查询历史** - 所有查询都会自动保存，方便重复使用
- **书签功能** - 可以将常用查询保存为书签
- **实时刷新** - 图表支持自动刷新，适合监控场景
- **多格式导出** - 查询结果支持导出为 CSV、JSON、Excel 格式

## 🔗 相关链接

- **项目主页**: [GitHub Repository](https://github.com/chenqi92/inflowave)
- **问题反馈**: [GitHub Issues](https://github.com/chenqi92/inflowave/issues)
- **InfluxDB 官方文档**: [InfluxDB Documentation](https://docs.influxdata.com/)

---

**开始您的 InfloWave 之旅吧！** 🚀

如果您是第一次使用，建议从 [快速开始](./quick-start.md) 开始。
