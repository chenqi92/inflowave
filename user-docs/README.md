# 📖 InfloWave - 用户手册

## 欢迎使用 InfloWave

InfloWave 是一款现代化的时序数据库图形界面管理工具，提供直观易用的数据库管理、查询执行和数据可视化功能。

## 🌟 主要特性

### 📊 数据库管理
- **连接管理**: 支持多个 InfluxDB 实例连接
- **数据库操作**: 创建、删除、备份数据库
- **用户权限**: 用户和权限管理
- **监控面板**: 实时监控数据库状态

### 🔍 查询功能
- **SQL 编辑器**: 语法高亮的 InfluxQL 查询编辑器
- **查询历史**: 自动保存查询历史记录
- **结果导出**: 支持 CSV、JSON 等格式导出
- **查询优化**: 查询性能分析和建议

### 📈 数据可视化
- **多种图表**: 折线图、柱状图、饼图等
- **实时更新**: 支持实时数据刷新
- **自定义面板**: 创建个性化监控面板
- **数据钻取**: 支持数据深度分析

### 💾 数据写入
- **批量导入**: 支持 CSV、JSON 文件导入
- **实时写入**: 支持实时数据流写入
- **数据验证**: 自动验证数据格式和类型
- **写入监控**: 监控写入性能和状态

## 📚 文档导航

### 🚀 [快速开始](./quick-start.md)
- 系统要求
- 安装步骤
- 首次配置
- 基本使用

### 🔧 [安装指南](./installation.md)
- Windows 安装
- macOS 安装
- Linux 安装
- 升级指南

### 📋 [功能介绍](./features/README.md)
- [连接管理](./features/connections.md)
- [数据库操作](./features/database.md)
- [查询执行](./features/query.md)
- [数据可视化](./features/visualization.md)
- [数据写入](./features/data-write.md)
- [系统设置](./features/settings.md)

### 🎯 [使用教程](./tutorials/README.md)
- [创建第一个连接](./tutorials/first-connection.md)
- [执行基本查询](./tutorials/basic-query.md)
- [创建可视化图表](./tutorials/create-chart.md)
- [导入数据文件](./tutorials/import-data.md)
- [设置监控面板](./tutorials/dashboard.md)

### ❓ [常见问题](./faq.md)
- 连接问题
- 查询问题
- 性能问题
- 界面问题

### 🔧 [故障排除](./troubleshooting.md)
- 错误代码说明
- 日志文件位置
- 诊断工具
- 联系支持

## 🖥️ 系统要求

### 最低要求
- **操作系统**: Windows 10, macOS 10.15, Ubuntu 18.04
- **内存**: 4GB RAM
- **存储**: 500MB 可用空间
- **网络**: 能够访问 InfluxDB 服务器

### 推荐配置
- **操作系统**: Windows 11, macOS 12+, Ubuntu 20.04+
- **内存**: 8GB+ RAM
- **存储**: 2GB+ 可用空间
- **显示器**: 1920x1080 分辨率

## 🚀 快速开始

### 1. 下载安装
```bash
# Windows
下载 influx-gui-setup.exe 并运行安装程序

# macOS
下载 influx-gui.dmg 并拖拽到应用程序文件夹

# Linux
sudo dpkg -i influx-gui.deb
# 或
sudo rpm -i influx-gui.rpm
```

### 2. 首次启动
1. 启动 InfluxDB GUI Manager
2. 点击"添加连接"按钮
3. 填写 InfluxDB 服务器信息
4. 测试连接并保存
5. 开始使用！

### 3. 基本操作
```
连接数据库 → 选择数据库 → 执行查询 → 查看结果
```

## 🎨 界面概览

### 主界面布局
```
┌─────────────────────────────────────────────────────────────┐
│  菜单栏                                                      │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│   侧边栏    │              主工作区                          │
│             │                                               │
│ • 连接列表  │  • 查询编辑器                                  │
│ • 数据库    │  • 结果显示                                    │
│ • 表列表    │  • 图表面板                                    │
│ • 收藏夹    │  • 设置页面                                    │
│             │                                               │
├─────────────┼───────────────────────────────────────────────┤
│  状态栏     │  连接状态 | 查询状态 | 系统信息                │
└─────────────┴───────────────────────────────────────────────┘
```

### 主要功能区域

#### 🔗 连接管理区
- 显示所有已配置的数据库连接
- 支持连接分组和标签
- 快速连接/断开操作
- 连接状态实时显示

#### 📝 查询编辑器
- 语法高亮的 InfluxQL 编辑器
- 自动补全和语法检查
- 查询模板和代码片段
- 多标签页支持

#### 📊 结果显示区
- 表格形式显示查询结果
- 支持排序、筛选、搜索
- 数据导出功能
- 分页显示大数据集

#### 📈 可视化面板
- 多种图表类型选择
- 实时数据更新
- 图表配置和定制
- 全屏显示模式

## 🔧 核心功能

### 连接管理
- **多连接支持**: 同时管理多个 InfluxDB 实例
- **连接测试**: 验证连接配置的正确性
- **安全存储**: 加密存储连接凭据
- **连接池**: 优化连接性能和资源使用

### 查询执行
- **InfluxQL 支持**: 完整支持 InfluxDB 查询语言
- **查询优化**: 自动分析和优化查询性能
- **结果缓存**: 缓存查询结果提升响应速度
- **异步执行**: 支持长时间运行的查询

### 数据可视化
- **图表类型**: 折线图、柱状图、饼图、散点图等
- **实时更新**: 支持数据实时刷新和流式更新
- **交互功能**: 缩放、平移、数据点选择
- **主题定制**: 支持明暗主题和自定义配色

### 数据管理
- **数据导入**: 支持 CSV、JSON、Line Protocol 格式
- **数据导出**: 多种格式导出查询结果
- **批量操作**: 支持批量数据写入和删除
- **数据验证**: 自动验证数据格式和完整性

## 📱 快捷键

### 通用快捷键
- `Ctrl + N`: 新建查询标签页
- `Ctrl + S`: 保存当前查询
- `Ctrl + O`: 打开查询文件
- `Ctrl + W`: 关闭当前标签页
- `F5`: 刷新数据
- `F11`: 全屏模式

### 查询编辑器
- `Ctrl + Enter`: 执行查询
- `Ctrl + /`: 注释/取消注释
- `Ctrl + D`: 复制当前行
- `Ctrl + L`: 选择当前行
- `Ctrl + F`: 查找和替换
- `Tab`: 自动补全

### 结果显示
- `Ctrl + A`: 全选数据
- `Ctrl + C`: 复制选中数据
- `Ctrl + E`: 导出数据
- `Page Up/Down`: 翻页
- `Home/End`: 跳转到首页/末页

## 🎯 使用技巧

### 查询优化
1. **使用时间范围**: 总是在查询中指定时间范围
2. **选择必要字段**: 避免使用 `SELECT *`
3. **合理使用聚合**: 使用 GROUP BY 减少返回数据量
4. **索引利用**: 在 WHERE 子句中使用索引字段

### 可视化最佳实践
1. **选择合适图表**: 根据数据类型选择最佳图表类型
2. **设置合理刷新间隔**: 平衡实时性和性能
3. **使用数据过滤**: 通过过滤减少图表数据量
4. **配置告警阈值**: 设置数据异常告警

### 性能优化
1. **连接复用**: 避免频繁创建和销毁连接
2. **结果缓存**: 利用查询结果缓存
3. **分页查询**: 对大数据集使用分页
4. **异步操作**: 使用异步查询避免界面阻塞

## 🔗 相关资源

- [InfluxDB 官方文档](https://docs.influxdata.com/influxdb/v1.8/)
- [InfluxQL 语法参考](https://docs.influxdata.com/influxdb/v1.8/query_language/)
- [项目 GitHub 仓库](https://github.com/kkape/inflowave)
- [问题反馈](https://github.com/kkape/inflowave/issues)

---

> 💡 **提示**: 建议新用户先阅读 [快速开始](./quick-start.md) 指南，然后根据需要查看具体功能文档。
