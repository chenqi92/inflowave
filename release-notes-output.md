# InfloWave Release Notes

> 📖 **最新版本**: [InfloWave v0.3.0 详细发布说明](./docs/release-notes/0.3.0.md)

---

# InfloWave v0.3.0

## 🚀 重大里程碑更新

InfloWave v0.3.0 是一个具有重大意义的版本升级，实现了从单一 InfluxDB 支持到**多数据库支持**的完整架构转型。这是 InfloWave 发展历程中的重要里程碑，为用户提供了统一的多数据库管理平台。

## ✨ 核心重大功能

### 🗄️ 多数据库支持架构
- **🎯 统一数据库支持** - 在单一平台中同时支持 InfluxDB、IoTDB、Prometheus、Elasticsearch
- **🔧 智能数据库识别** - 自动检测数据库类型并适配相应的查询语言和操作界面
- **⚡ 无缝切换体验** - 在不同数据库之间快速切换，保持一致的用户体验
- **🌐 统一连接管理** - 集中管理多种数据库连接，支持并发操作

### 🔍 全新多数据库工作台
- **📊 统一查询引擎** - 支持 InfluxQL、Flux、SQL、PromQL、Query DSL 等多种查询语言
- **🎨 智能语法高亮** - 根据数据库类型自动切换语法高亮和代码补全
- **📈 多格式可视化** - 统一的图表系统，支持不同数据库的数据可视化
- **🗂️ 智能数据源管理** - 树形结构浏览，支持搜索、收藏和快速访问

### 🌟 IoTDB 原生支持
- **🔗 完整 IoTDB 集成** - 通过 REST API 实现完整的 IoTDB 支持
- **📊 存储组管理** - 创建、删除、查询存储组，完整的生命周期管理
- **📱 设备与时间序列** - 查询设备列表、管理时间序列、数据浏览
- **🛠️ 专业测试工具** - 独立的 IoTDB 测试页面，支持所有 IoTDB 特性

### 🔧 高级查询与可视化
- **🤖 智能查询优化** - 根据数据库类型提供查询建议和性能优化
- **📊 多样化图表类型** - 折线图、柱状图、饼图、散点图等，智能适配数据类型
- **📋 高级结果展示** - 表格、JSON、图表多视图，支持搜索、过滤、分页
- **💾 智能数据导出** - 支持多种格式导出，保持数据完整性

## 🏗️ 技术架构革新

### 🔄 完整架构重构
- **🎯 抽象化设计** - 创建通用数据库抽象层，支持插件式扩展
- **🏭 工厂模式实现** - 数据库驱动工厂，动态加载和管理数据库客户端
- **⚡ 性能优化** - 查询缓存系统，LRU 策略，智能过期管理
- **🔒 类型安全** - 100% TypeScript 覆盖，强类型检查和接口定义

### 🦀 Rust 后端增强
- **🔧 多数据库客户端** - 统一的数据库客户端枚举，支持 InfluxDB 和 IoTDB
- **📡 HTTP 客户端集成** - IoTDBHttpClient 实现，完整的 REST API 支持
- **🛡️ 增强错误处理** - 完善的日志记录、错误捕获和用户友好提示
- **⚙️ 配置系统升级** - 支持多数据库特定配置，类型安全的参数管理

### 🎨 React 前端重构
- **🧩 组件化架构** - 可复用的多数据库组件，支持主题和响应式设计
- **📱 现代 UI 框架** - 基于 shadcn/ui，提供一致的设计语言
- **⚡ 性能优化** - React 18 特性应用，并发渲染和状态管理优化
- **🔧 开发工具集成** - Monaco 编辑器、ResizablePanel、拖拽支持

## 🧪 质量保障体系

### ✅ 完整测试覆盖
- **🔬 单元测试** - 组件级别的功能验证，Mock 配置完备
- **🔗 集成测试** - 端到端的系统测试，23个测试用例覆盖
- **📊 性能测试** - 实时性能监控，查询响应时间分析
- **🛡️ 边界测试** - 错误情况处理，异常恢复验证

### 📈 性能监控系统
- **📊 实时指标收集** - 查询执行时间、内存使用、连接状态监控
- **💡 智能优化建议** - 基于使用模式的性能优化建议
- **🔄 查询缓存系统** - LRU 策略缓存，显著提升查询响应速度
- **📈 性能报告** - 详细的性能分析报告和趋势图表

### 🔒 安全性增强
- **🛡️ Tauri 原生 API** - 避免浏览器权限限制，使用原生系统 API
- **🔐 安全剪贴板** - Tauri 剪贴板管理器，绕过浏览器安全限制
- **🌐 智能环境检测** - 自动识别 Tauri 环境，确保 API 正确调用
- **📋 权限最小化** - 仅请求必要权限，保护用户隐私和系统安全

## 📦 升级亮点统计

### 📊 开发统计
- **新增文件**: 50+ 个核心组件和工具文件
- **重构文件**: 80+ 个现有文件得到架构级改进
- **代码行数**: 新增 8000+ 行高质量功能代码
- **测试代码**: 1100+ 行测试代码，保障代码质量

### 🎯 功能统计
- **数据库支持**: 从 1 种扩展到 4 种主流时序数据库
- **查询语言**: 支持 5 种不同的查询语言
- **图表类型**: 8 种不同类型的数据可视化图表
- **UI 组件**: 25+ 个专业级 UI 组件

## 🔄 兼容性与迁移

### 📋 版本兼容性
- **InfluxDB 支持**: 完全兼容 InfluxDB 1.x、2.x、3.x 版本
- **IoTDB 支持**: 支持 IoTDB 0.13.x、1.0.x、1.1.x、1.2.x 版本
- **操作系统**: Windows 10/11、macOS 10.15+、主流 Linux 发行版
- **配置迁移**: 自动检测并迁移旧版本配置，无需手动操作

### 🔧 升级建议
1. **备份重要数据**: 升级前备份连接配置和查询历史
2. **检查数据库版本**: 确认目标数据库版本兼容性
3. **测试连接**: 升级后重新测试数据库连接配置
4. **探索新功能**: 体验多数据库工作台和 IoTDB 支持

## 🐛 问题修复

- 修复了 InfluxDB 连接在某些网络环境下的稳定性问题
- 解决了查询结果在大数据集下的内存占用问题
- 修复了 Monaco 编辑器在 Tauri 环境下的剪贴板兼容性
- 改进了错误日志的收集和展示机制
- 优化了应用启动时的黑屏问题和加载体验

---

> 🎯 **开发亮点**: 本版本实现了 InfloWave 架构的根本性变革，从单一数据库工具升级为专业的多数据库管理平台。通过 16 周的系统性重构，我们为用户带来了更强大、更灵活的数据管理体验。

---

> 📝 **重要提醒**: 这是一个重大版本更新，包含架构级变更。建议仔细阅读升级说明，并在测试环境中验证后再部署到生产环境。

## 💻 下载安装

### 🔍 如何选择适合的版本

#### Windows 用户
- **推荐**: 📥 **[InfloWave_0.3.0_x64.msi](https://github.com/chenqi92/inflowave/releases/download/v0.3.0/InfloWave_0.3.0_x64.msi)** 
  - ✅ 适用于 Windows 10/11 (64位系统)
  - ✅ 支持大部分现代 Windows 系统
  - ✅ MSI 格式，安装简单可靠
  - 🆕 **新增多数据库支持**

- **兼容版**: 📥 **[InfloWave_0.3.0_x86.msi](https://github.com/chenqi92/inflowave/releases/download/v0.3.0/InfloWave_0.3.0_x86.msi)**
  - ✅ 适用于较老的32位 Windows 系统
  - ⚠️ 仅在无法运行64位版本时使用

#### macOS 用户

**如何判断你的 Mac 类型？**
- 🍎 点击屏幕左上角苹果图标 → 关于本机
- 💻 查看「处理器」或「芯片」信息

**Apple Silicon Mac (M1/M2/M3/M4 芯片)**
- 📥 **[InfloWave_0.3.0_aarch64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.3.0/InfloWave_0.3.0_aarch64.dmg)**
  - ✅ 2020年11月后发布的 Mac
  - ✅ 性能最优，原生支持
  - ✅ 更低的电量消耗
  - 🆕 **包含 IoTDB 原生支持**
  - ⚠️ **无法在 Intel Mac 上运行**

**Intel Mac (Intel 处理器)**
- 📥 **[InfloWave_0.3.0_x64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.3.0/InfloWave_0.3.0_x64.dmg)**
  - ✅ 2020年前发布的 Mac
  - ✅ 兼容 macOS 10.15 或更高版本
  - 🆕 **完整多数据库工作台**
  - ⚠️ 不支持 Apple Silicon 芯片

#### Linux 用户

**如何判断你的 Linux 发行版？**
- 运行命令: `cat /etc/os-release` 或 `lsb_release -a`

**Debian/Ubuntu 系列 (推荐)**
- 📥 **[InfloWave_0.3.0_amd64.deb](https://github.com/chenqi92/inflowave/releases/download/v0.3.0/InfloWave_0.3.0_amd64.deb)**
  - ✅ Ubuntu 18.04+, Debian 10+
  - ✅ 系统集成度高，支持自动更新
  - 🆕 **包含完整的多数据库驱动**
  - 📋 安装命令: `sudo dpkg -i InfloWave_0.3.0_amd64.deb`
  - 🔧 依赖修复: `sudo apt-get install -f`

**通用 Linux (万能选择)**
- 📥 **[InfloWave_0.3.0_amd64.AppImage](https://github.com/chenqi92/inflowave/releases/download/v0.3.0/InfloWave_0.3.0_amd64.AppImage)**
  - ✅ 适用于大部分 x64 Linux 发行版
  - ✅ 免安装，下载后直接运行
  - ✅ 便携版，不影响系统
  - 🆕 **自包含多数据库支持**
  - 📋 使用方法: `chmod +x InfloWave_0.3.0_amd64.AppImage && ./InfloWave_0.3.0_amd64.AppImage`

**RPM 系列 (CentOS/RHEL/Fedora)**
- 📥 **[InfloWave-0.3.0-1.x86_64.rpm](https://github.com/chenqi92/inflowave/releases/download/v0.3.0/InfloWave-0.3.0-1.x86_64.rpm)**
  - ✅ CentOS 7+, RHEL 7+, Fedora 30+
  - 🆕 **企业级多数据库管理**
  - 📋 安装命令: `sudo rpm -i InfloWave-0.3.0-1.x86_64.rpm`
  - 📋 或使用: `sudo dnf install InfloWave-0.3.0-1.x86_64.rpm`

### 📝 详细安装步骤

#### Windows 安装
1. 下载对应的 `.msi` 文件
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 从开始菜单启动 InfloWave
5. 🆕 **首次启动将自动检测已安装的数据库**

#### macOS 安装
1. 下载对应的 `.dmg` 文件
2. 双击打开 DMG 镜像
3. 将 InfloWave.app 拖入 Applications 文件夹
4. 首次运行时，可能需要在「系统偏好设置 → 安全性与隐私」中允许运行
5. 🆕 **启动后可体验全新的多数据库工作台**

#### Linux 安装
- **DEB 包**: `sudo dpkg -i 文件名.deb`
- **AppImage**: `chmod +x 文件名.AppImage && ./文件名.AppImage`
- **RPM 包**: `sudo rpm -i 文件名.rpm`
- 🆕 **安装后支持 InfluxDB 和 IoTDB 的完整功能**

### ⚠️ 系统要求

- **Windows**: Windows 10 或更高版本 (推荐 Windows 11)
- **macOS**: macOS 10.15 (Catalina) 或更高版本
- **Linux**: 支持 GTK 3.0 的现代 Linux 发行版
- 🆕 **网络**: 支持 HTTP/HTTPS 连接用于 IoTDB REST API

### 🚀 0.3.0 版本特色

- 🎯 **多数据库统一管理** - 一个应用管理多种时序数据库
- 🔧 **智能查询引擎** - 根据数据库类型自动适配查询语言
- 📊 **专业可视化工具** - 统一的图表系统，支持多种数据格式
- 🛠️ **IoTDB 完整支持** - 企业级物联网时序数据库管理
- ⚡ **性能监控系统** - 实时监控和优化建议

### 🆘 遇到问题？

- 📖 [查看文档](https://github.com/chenqi92/inflowave/wiki)
- 🐛 [报告问题](https://github.com/chenqi92/inflowave/issues)
- 💬 [讨论交流](https://github.com/chenqi92/inflowave/discussions)
- 🆕 [多数据库使用指南](https://github.com/chenqi92/inflowave/wiki/Multi-Database-Guide)

---

# InfloWave v0.1.4

## 🚀 重大更新

InfloWave v0.1.4 带来了全面的性能监控系统和数据管理能力的重大提升，为用户提供更强大的数据库管理体验。

## ✨ 主要新功能

### 📊 全新性能监控系统
- **性能瓶颈诊断** - 添加智能性能分析工具，自动识别数据库性能问题
- **本地性能报告** - 支持生成详细的本地性能报告，便于离线分析
- **监控模式切换** - 新增本地和远程监控模式，满足不同使用场景
- **健康检查功能** - 实时监控数据库连接健康状态
- **系统指标获取** - 优化系统资源使用情况监控

### 📈 数据查询与分析增强
- **查询历史页面** - 全新的查询历史管理界面，方便回溯和复用 SQL 语句
- **SQL 语句类型检测** - 智能识别 SQL 语句类型，提供更精准的执行建议
- **高级数据表格** - 重新设计的数据表格组件，支持更多交互功能
- **导出选项对话框** - 新增多种数据导出格式，包括 CSV、JSON、Excel 等

### 🗂️ 数据库管理优化
- **数据库状态管理** - 新增 `openedDatabasesStore` 统一管理已打开的数据库连接
- **内部数据库显示** - 支持显示和管理内部系统数据库
- **自定义复制剪切** - 增强的复制粘贴功能，支持格式化数据操作

### 🎨 用户界面改进
- **通知系统优化** - 完善的消息通知机制，提升用户交互体验
- **InputNumber 组件** - 重构数字输入组件，支持更灵活的数值操作
- **设置界面增强** - 新增多项配置选项，包括性能监控和显示设置

## 🔧 技术改进

### 🛠️ 开发工具与构建
- **发布流程自动化** - 添加自动生成发布说明的脚本系统
- **Workflow 优化** - 改进 GitHub Actions 构建流程，提升构建效率
- **macOS 安装包** - 优化 macOS 安装包格式和安装说明

### ⚡ 性能优化
- **内存使用优化** - 改进内存管理，降低长时间运行的资源占用
- **连接服务改进** - 优化数据库连接管理逻辑
- **查询执行优化** - 提升 SQL 查询执行效率

### 🔒 稳定性提升
- **错误处理增强** - 改进错误捕获和用户提示机制
- **连接超时处理** - 优化网络连接超时处理逻辑
- **数据安全性** - 增强数据传输和存储的安全性

## 🐛 错误修复

- 修复了数据表格在大数据集下的渲染性能问题
- 解决了某些情况下数据库连接状态显示不准确的问题
- 修复了复制粘贴功能在特定格式下的异常
- 改进了版本检查和更新提醒的稳定性
- 修复了设置保存后需要重启才能生效的问题

## 📦 文件变更概览

- **新增文件**: 15+ 个新组件和工具文件
- **优化文件**: 40+ 个现有文件得到改进
- **核心改进**: 性能监控、数据管理、用户界面
- **代码行数**: 新增 2000+ 行功能代码

## 🔄 兼容性说明

- **数据库兼容性**: 完全兼容 InfluxDB 1.x 和 2.x 版本
- **操作系统支持**: Windows 10/11、macOS 10.15+、主流 Linux 发行版
- **配置迁移**: 自动迁移旧版本配置，无需手动设置

## 📋 升级建议

1. **备份数据**: 升级前建议备份重要的查询历史和配置
2. **清理缓存**: 建议清理旧版本的缓存数据以获得最佳性能
3. **重新配置**: 部分新功能需要重新配置监控参数

---

> 🎯 **开发亮点**: 本版本重点加强了性能监控和数据分析能力，为专业用户提供更深入的数据库管理工具。感谢社区用户的反馈和建议！

---

> 📝 **注意**: 本版本包含大量新功能，建议查看用户文档了解详细使用方法。如遇到问题，请在 GitHub 上提交 Issue。

---

## 💻 下载安装

### 🔍 如何选择适合的版本

#### Windows 用户
- **推荐**: 📥 **[InfloWave_0.1.4_x64.msi](https://github.com/chenqi92/inflowave/releases/download/v0.1.4/InfloWave_0.1.4_x64.msi)** 
  - ✅ 适用于 Windows 10/11 (64位系统)
  - ✅ 支持大部分现代 Windows 系统
  - ✅ MSI 格式，安装简单可靠

- **兼容版**: 📥 **[InfloWave_0.1.4_x86.msi](https://github.com/chenqi92/inflowave/releases/download/v0.1.4/InfloWave_0.1.4_x86.msi)**
  - ✅ 适用于较老的32位 Windows 系统
  - ⚠️ 仅在无法运行64位版本时使用

#### macOS 用户

**如何判断你的 Mac 类型？**
- 🍎 点击屏幕左上角苹果图标 → 关于本机
- 💻 查看「处理器」或「芯片」信息

**Apple Silicon Mac (M1/M2/M3/M4 芯片)**
- 📥 **[InfloWave_0.1.4_aarch64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.1.4/InfloWave_0.1.4_aarch64.dmg)**
  - ✅ 2020年11月后发布的 Mac
  - ✅ 性能最优，原生支持
  - ✅ 更低的电量消耗
  - ⚠️ **无法在 Intel Mac 上运行**

**Intel Mac (Intel 处理器)**
- 📥 **[InfloWave_0.1.4_x64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.1.4/InfloWave_0.1.4_x64.dmg)**
  - ✅ 2020年前发布的 Mac
  - ✅ 兼容 macOS 10.15 或更高版本
  - ⚠️ 不支持 Apple Silicon 芯片

#### Linux 用户

**如何判断你的 Linux 发行版？**
- 运行命令: `cat /etc/os-release` 或 `lsb_release -a`

**Debian/Ubuntu 系列 (推荐)**
- 📥 **[InfloWave_0.1.4_amd64.deb](https://github.com/chenqi92/inflowave/releases/download/v0.1.4/InfloWave_0.1.4_amd64.deb)**
  - ✅ Ubuntu 18.04+, Debian 10+
  - ✅ 系统集成度高，支持自动更新
  - 📋 安装命令: `sudo dpkg -i InfloWave_0.1.4_amd64.deb`
  - 🔧 依赖修复: `sudo apt-get install -f`

**通用 Linux (万能选择)**
- 📥 **[InfloWave_0.1.4_amd64.AppImage](https://github.com/chenqi92/inflowave/releases/download/v0.1.4/InfloWave_0.1.4_amd64.AppImage)**
  - ✅ 适用于大部分 x64 Linux 发行版
  - ✅ 免安装，下载后直接运行
  - ✅ 便携版，不影响系统
  - 📋 使用方法: `chmod +x InfloWave_0.1.4_amd64.AppImage && ./InfloWave_0.1.4_amd64.AppImage`

**RPM 系列 (CentOS/RHEL/Fedora)**
- 📥 **[InfloWave-0.1.4-1.x86_64.rpm](https://github.com/chenqi92/inflowave/releases/download/v0.1.4/InfloWave-0.1.4-1.x86_64.rpm)**
  - ✅ CentOS 7+, RHEL 7+, Fedora 30+
  - 📋 安装命令: `sudo rpm -i InfloWave-0.1.4-1.x86_64.rpm`
  - 📋 或使用: `sudo dnf install InfloWave-0.1.4-1.x86_64.rpm`

### 📝 详细安装步骤

#### Windows 安装
1. 下载对应的 `.msi` 文件
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 从开始菜单启动 InfloWave

#### macOS 安装
1. 下载对应的 `.dmg` 文件
2. 双击打开 DMG 镜像
3. 将 InfloWave.app 拖入 Applications 文件夹
4. 首次运行时，可能需要在「系统偏好设置 → 安全性与隐私」中允许运行

#### Linux 安装
- **DEB 包**: `sudo dpkg -i 文件名.deb`
- **AppImage**: `chmod +x 文件名.AppImage && ./文件名.AppImage`
- **RPM 包**: `sudo rpm -i 文件名.rpm`

### ⚠️ 系统要求

- **Windows**: Windows 10 或更高版本 (推荐 Windows 11)
- **macOS**: macOS 10.15 (Catalina) 或更高版本
- **Linux**: 支持 GTK 3.0 的现代 Linux 发行版

### 🆘 遇到问题？

- 📖 [查看文档](https://github.com/chenqi92/inflowave/wiki)
- 🐛 [报告问题](https://github.com/chenqi92/inflowave/issues)
- 💬 [讨论交流](https://github.com/chenqi92/inflowave/discussions)