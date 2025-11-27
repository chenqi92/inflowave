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

**InfloWave** 是一个专为时序数据库和对象存储设计的现代化管理工具，提供直观的图形界面来管理 InfluxDB 数据库和 S3 兼容对象存储。通过 Tauri 框架结合 React 前端和 Rust 后端，为用户提供高性能、安全可靠的数据管理体验。

### ✨ 核心亮点

- 🗄️ **多数据源支持** - InfluxDB (1.x/2.x/3.x) + S3/MinIO 对象存储
- 📊 **强大查询引擎** - InfluxQL/Flux 查询编辑器，智能提示与语法高亮
- 📦 **对象存储管理** - 完整的 S3 文件管理、预览、权限控制
- 📈 **数据可视化** - 多种图表类型，时序数据专业分析
- 🌍 **完整国际化** - 中英文界面，支持多语言扩展
- 🎨 **现代化设计** - 基于 Shadcn/ui 的精美界面
- 🌐 **跨平台支持** - Windows、macOS、Linux 全平台
- 🔒 **安全可靠** - 本地存储，API Token 加密

## 🚀 快速开始

### 📦 下载安装

访问 [Releases 页面](https://github.com/chenqi92/inflowave/releases/latest) 下载适合您系统的版本：

#### 🔍 版本选择指南

#### Windows 用户
- **MSI 安装包 (推荐)**: 📥 **[InfloWave-0.8.5-x86_64.msi](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/InfloWave-0.8.5-x86_64.msi)**
  - ✅ 适用于 Windows 10/11 (64位系统)
  - ✅ 企业级安装包，支持 GPO 部署
  - ✅ MSI 格式，系统信任度高

- **EXE 安装包**: 📥 **[InfloWave_0.8.5_x64-setup.exe](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/InfloWave_0.8.5_x64-setup.exe)**
  - ✅ 适用于 Windows 10/11 (64位系统)
  - ✅ 用户友好的安装向导
  - ✅ 支持中英文界面

- **32位版本**: 📥 **[InfloWave-0.8.5-i686.msi](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/InfloWave-0.8.5-i686.msi)**
  - ✅ 适用于较老的32位 Windows 系统
  - ⚠️ 仅在无法运行64位版本时使用

**便携版 (免安装)**

- **64位便携版**: 📥 **[InfloWave-x64-portable-0.8.5.exe](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/InfloWave-x64-portable-0.8.5.exe)**
  - ✅ 绿色软件，无需安装
  - ✅ 不写入注册表，不留痕迹
  - ✅ 便于携带，可放在U盘中
  - ✅ 适用于 Windows 10/11 (64位)

- **32位便携版**: 📥 **[InfloWave-x86-portable-0.8.5.exe](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/InfloWave-x86-portable-0.8.5.exe)**
  - ✅ 绿色软件，无需安装
  - ✅ 兼容性更好，支持老旧系统
  - ✅ 适用于 Windows 7/8/10/11 (32位/64位)

#### macOS 用户

**如何判断你的 Mac 类型？**
- 🍎 点击屏幕左上角苹果图标 → 关于本机
- 💻 查看「处理器」或「芯片」信息

**Apple Silicon Mac (M1/M2/M3/M4 芯片)**
- 📥 **[InfloWave_0.8.5_aarch64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/InfloWave_0.8.5_aarch64.dmg)**
  - ✅ 2020年11月后发布的 Mac
  - ✅ 性能最优，原生支持
  - ✅ 更低的电量消耗
  - ⚠️ **无法在 Intel Mac 上运行**

**Intel Mac (Intel 处理器)**
- 📥 **[InfloWave_0.8.5_x64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/InfloWave_0.8.5_x64.dmg)**
  - ✅ 2020年前发布的 Mac
  - ✅ 兼容 macOS 10.15 或更高版本
  - ⚠️ 不支持 Apple Silicon 芯片

#### Linux 用户

**如何判断你的 Linux 发行版？**
- 运行命令: `cat /etc/os-release` 或 `lsb_release -a`

**Debian/Ubuntu 系列 (推荐)**
- 📥 **[inflowave_0.8.5_amd64.deb](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/inflowave_0.8.5_amd64.deb)**
  - ✅ Ubuntu 18.04+, Debian 10+
  - ✅ 系统集成度高，支持自动更新
  - 📋 安装命令: `sudo dpkg -i inflowave_0.8.5_amd64.deb`
  - 🔧 依赖修复: `sudo apt-get install -f`

**通用 Linux (万能选择)**
- 📥 **[inflowave_0.8.5_amd64.AppImage](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/inflowave_0.8.5_amd64.AppImage)**
  - ✅ 适用于大部分 x64 Linux 发行版
  - ✅ 免安装，下载后直接运行
  - ✅ 便携版，不影响系统
  - 📋 使用方法: `chmod +x inflowave_0.8.5_amd64.AppImage && ./inflowave_0.8.5_amd64.AppImage`

**RPM 系列 (CentOS/RHEL/Fedora)**
- 📥 **[inflowave-0.8.5-1.x86_64.rpm](https://github.com/chenqi92/inflowave/releases/download/v0.8.5/inflowave-0.8.5-1.x86_64.rpm)**
  - ✅ CentOS 7+, RHEL 7+, Fedora 30+
  - 📋 安装命令: `sudo rpm -i inflowave-0.8.5-1.x86_64.rpm`
  - 📋 或使用: `sudo dnf install inflowave-0.8.5-1.x86_64.rpm`

### ⚠️ 系统要求

- **Windows**: Windows 10 或更高版本
- **macOS**: macOS 10.15 (Catalina) 或更高版本
- **Linux**: 支持 GTK 3.0 的现代 Linux 发行版

### 🔧 首次使用

1. **启动应用** - 双击安装的应用图标
2. **添加连接** - 点击"添加连接"配置数据源（InfluxDB 或 S3）
3. **测试连接** - 验证连接配置是否正确
4. **开始使用** - 浏览数据、执行查询、管理文件

## 🌟 核心功能

### 🗄️ InfluxDB 数据库管理

#### 多版本支持
- ✅ **InfluxDB 1.x** - 完整的数据库、保留策略、测量管理
- ✅ **InfluxDB 2.x** - Organization、Bucket、API Token 管理
- ✅ **InfluxDB 3.x** - 最新版本支持
- ✅ **多连接管理** - 同时管理多个 InfluxDB 实例
- ✅ **连接状态监控** - 实时健康检查和自动重连
- ✅ **安全存储** - API Token 加密存储

#### 数据库操作
- ✅ 数据库/Bucket 的创建、删除、查看
- ✅ 保留策略 (Retention Policy) 管理
- ✅ 测量 (Measurement) 浏览和管理
- ✅ 字段 (Field) 和标签 (Tag) 查看
- ✅ 树形结构展示，支持节点展开/收起
- ✅ 右键快捷菜单，快速操作

### 🔍 强大的查询系统

#### 查询编辑器
- ✅ **CodeMirror 6** 专业代码编辑器
- ✅ **InfluxQL 支持** - 语法高亮、智能提示、自动补全
- ✅ **Flux 支持** - InfluxDB 2.x 查询语言
- ✅ **多标签页** - 同时编辑多个查询
- ✅ **快捷键** - Ctrl+Enter 执行，Ctrl+S 保存
- ✅ **查询历史** - 自动保存，快速重用

#### 查询结果
- ✅ 表格展示，支持虚拟滚动
- ✅ 分页和懒加载，处理大数据集
- ✅ 列宽调整，自定义显示
- ✅ 数据筛选和排序
- ✅ 多格式导出 (CSV、JSON、Excel)
- ✅ 多格式复制 (Text、Markdown、INSERT SQL)

### 📦 S3/对象存储管理

#### 文件管理
- ✅ **Bucket 浏览** - 树形结构展示所有 Bucket
- ✅ **文件操作** - 上传、下载、删除、重命名
- ✅ **拖放上传** - 支持拖拽文件上传
- ✅ **批量操作** - 框选、复制、剪切、粘贴
- ✅ **右键菜单** - 快捷操作菜单
- ✅ **无限滚动** - 自动加载更多文件

#### 文件预览
- ✅ **图片预览** - JPG、PNG、GIF、WebP 等
- ✅ **视频预览** - MP4、WebM、OGG 等
- ✅ **音频预览** - MP3、WAV、OGG 等
- ✅ **文档预览** - PDF、Excel、文本、代码
- ✅ **安全预览** - Blob URL 机制，自动清理
- ✅ **外部链接** - 自动使用系统浏览器打开

#### 权限与标签
- ✅ **ACL 权限管理** - 设置对象访问权限
- ✅ **标签管理** - 添加、编辑、删除对象标签
- ✅ **权限对话框** - 可视化权限设置
- ✅ **标签对话框** - 批量标签管理

#### 对象存储支持
- ✅ **AWS S3** - 完整支持
- ✅ **MinIO** - 开源对象存储
- ✅ **阿里云 OSS** - 兼容 S3 API
- ✅ **腾讯云 COS** - 兼容 S3 API
- ✅ **自定义端点** - 支持任何 S3 兼容存储

### 📊 数据可视化

#### 图表类型
- ✅ **折线图** - 时序数据趋势分析
- ✅ **柱状图** - 数据对比分析
- ✅ **饼图** - 占比分析
- ✅ **雷达图** - 多维度分析
- ✅ **散点图** - 相关性分析
- ✅ **面积图** - 累积趋势分析

#### 图表功能
- ✅ 交互式操作（缩放、平移、提示）
- ✅ 自定义图表标题和字段别名
- ✅ 图表导出 (PNG)
- ✅ 响应式布局
- ✅ 主题适配（明暗模式）

### 📥📤 数据导入导出

#### 数据写入
- ✅ **Line Protocol** - InfluxDB 原生格式
- ✅ **批量写入** - 支持多条数据
- ✅ **数据验证** - 自动检查格式

#### 数据导出
- ✅ **CSV 格式** - 通用表格格式
- ✅ **JSON 格式** - 结构化数据
- ✅ **Excel 格式** - 完整的 XLSX 文件
- ✅ **导出预览** - 查看导出内容
- ✅ **自定义选项** - 选择导出字段和格式

### 💼 工作区管理

- ✅ **标签页管理** - 多查询标签页
- ✅ **标签页拖拽** - 自由排序
- ✅ **独立窗口** - 标签页分离到新窗口
- ✅ **窗口回收** - 重新附加到主窗口
- ✅ **状态持久化** - 查询结果自动保存
- ✅ **工作区保存** - 保存当前工作状态

### 🎨 用户界面

#### 主题系统
- ✅ **明暗模式** - 自动切换或手动选择
- ✅ **主题定制** - 自定义颜色方案
- ✅ **字体选择** - 多种现代字体
- ✅ **布局调整** - 可调整面板大小

#### 国际化
- ✅ **中文界面** - 完整的简体中文
- ✅ **英文界面** - 完整的英文支持
- ✅ **语言切换** - 实时切换语言
- ✅ **扩展支持** - 易于添加新语言

### ⚡ 性能与监控

- ✅ **性能监控** - CPU、内存使用率
- ✅ **查询统计** - 查询耗时、成功率
- ✅ **连接监控** - 连接状态、健康检查
- ✅ **历史数据** - 性能趋势分析
- ✅ **日志系统** - 前后端日志分离查看
- ✅ **错误处理** - 友好的错误提示

## 🏗️ 技术架构

### 前端技术栈
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: Shadcn/ui + Radix UI
- **图表库**: ECharts + Recharts
- **代码编辑器**: CodeMirror 6
- **样式**: Tailwind CSS
- **构建工具**: Vite
- **国际化**: i18next

### 后端技术栈
- **框架**: Tauri 2.0
- **语言**: Rust
- **数据库客户端**: influxdb crate
- **对象存储**: aws-sdk-s3
- **序列化**: serde
- **异步运行时**: tokio
- **加密**: aes-gcm

## 📚 文档

- **发布说明**: [docs/release-notes](docs/release-notes) - 查看各版本更新内容
- **用户文档**: 应用内置用户指南
- **开发文档**: 查看源码注释和类型定义

## 🤝 贡献指南

我们欢迎各种形式的贡献！

1. **报告问题** - 在 [Issues](https://github.com/chenqi92/inflowave/issues) 中报告 bug
2. **功能建议** - 在 [Discussions](https://github.com/chenqi92/inflowave/discussions) 提出建议
3. **代码贡献** - 提交 Pull Request
4. **文档改进** - 帮助完善文档

### 开发环境

```bash
# 克隆项目
git clone https://github.com/chenqi92/inflowave.git
cd inflowave

# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev
```

### 代码规范

- 遵循 TypeScript 和 Rust 最佳实践
- 提交前运行 `npm run lint` 检查代码
- 编写清晰的提交信息

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为项目做出贡献的开发者和用户！

**核心技术**
- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Rust](https://www.rust-lang.org/) - 系统编程语言

**数据源支持**
- [InfluxDB](https://www.influxdata.com/) - 时序数据库
- [AWS S3](https://aws.amazon.com/s3/) - 对象存储服务
- [MinIO](https://min.io/) - 开源对象存储

**UI 组件**
- [Shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Radix UI](https://www.radix-ui.com/) - 无障碍组件
- [ECharts](https://echarts.apache.org/) - 数据可视化

## 📞 获取帮助

- **问题报告**: [GitHub Issues](https://github.com/chenqi92/inflowave/issues)
- **功能建议**: [GitHub Discussions](https://github.com/chenqi92/inflowave/discussions)
- **项目主页**: [https://allbs.cn](https://allbs.cn)

## 🌟 Star History

如果这个项目对您有帮助，请给我们一个 ⭐️！

[![Star History Chart](https://api.star-history.com/svg?repos=chenqi92/inflowave&type=Date)](https://star-history.com/#chenqi92/inflowave&Date)

---

<div align="center">

**让数据管理变得简单高效** 🚀

[⭐ 给项目点个星](https://github.com/chenqi92/inflowave) | [📋 报告问题](https://github.com/chenqi92/inflowave/issues) | [💡 功能建议](https://github.com/chenqi92/inflowave/discussions)

Made with ❤️ by [chenqi92](https://github.com/chenqi92)

</div>