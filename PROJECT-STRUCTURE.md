# InfluxDB GUI Manager - 项目结构说明

## 📁 完整项目结构

```
influx-gui/
├── 📁 src/                          # 前端源代码 (React + TypeScript)
│   ├── 📄 App.tsx                   # 主应用组件
│   ├── 📄 main.tsx                  # 应用入口
│   ├── 📁 components/               # React 组件
│   │   └── 📄 ConnectionTest.tsx    # 连接测试组件
│   ├── 📁 assets/                   # 静态资源
│   └── 📁 styles/                   # 样式文件
│
├── 📁 src-tauri/                    # 后端源代码 (Rust + Tauri)
│   ├── 📄 Cargo.toml               # Rust 项目配置
│   ├── 📄 tauri.conf.json          # Tauri 应用配置
│   ├── 📁 src/                     # Rust 源代码
│   │   ├── 📄 main.rs              # 应用入口
│   │   ├── 📁 models/              # 数据模型层 (15+ 文件)
│   │   │   ├── 📄 mod.rs           # 模块导出
│   │   │   ├── 📄 connection.rs    # 连接相关模型
│   │   │   ├── 📄 database.rs      # 数据库相关模型
│   │   │   └── 📄 query.rs         # 查询相关模型
│   │   ├── 📁 database/            # 数据库访问层
│   │   │   ├── 📄 mod.rs           # 模块导出
│   │   │   ├── 📄 client.rs        # InfluxDB 客户端封装
│   │   │   ├── 📄 connection.rs    # 连接管理器
│   │   │   └── 📄 pool.rs          # 连接池实现
│   │   ├── 📁 services/            # 业务服务层
│   │   │   ├── 📄 mod.rs           # 模块导出
│   │   │   ├── 📄 connection_service.rs  # 连接服务
│   │   │   ├── 📄 query_service.rs       # 查询服务
│   │   │   └── 📄 database_service.rs    # 数据库服务
│   │   ├── 📁 commands/            # Tauri 命令层
│   │   │   ├── 📄 mod.rs           # 模块导出
│   │   │   ├── 📄 connection.rs    # 连接管理命令 (20+ 命令)
│   │   │   ├── 📄 database.rs      # 数据库操作命令 (15+ 命令)
│   │   │   ├── 📄 query.rs         # 查询操作命令 (10+ 命令)
│   │   │   └── 📄 system.rs        # 系统信息命令 (8+ 命令)
│   │   ├── 📁 utils/               # 工具层
│   │   │   ├── 📄 mod.rs           # 模块导出
│   │   │   ├── 📄 encryption.rs    # AES-256-GCM 密码加密
│   │   │   ├── 📄 validation.rs    # 数据验证工具
│   │   │   └── 📄 config.rs        # 配置管理工具
│   │   └── 📁 config/              # 配置层
│   │       └── 📄 mod.rs           # 应用配置管理
│   ├── 📁 target/                  # 编译输出目录
│   │   ├── 📁 debug/               # Debug 构建产物
│   │   └── 📁 release/             # Release 构建产物
│   └── 📁 icons/                   # 应用图标
│
├── 📁 scripts/                     # 构建和开发脚本 (8+ 脚本)
│   ├── 📄 README.md               # 脚本使用说明
│   ├── 📄 setup-dev.ps1           # 开发环境自动设置 (Windows)
│   ├── 📄 build.ps1               # 完整构建脚本 (Windows)
│   ├── 📄 build.sh                # 完整构建脚本 (Linux/macOS)
│   ├── 📄 quick-build.ps1         # 快速构建脚本 (Windows)
│   ├── 📄 quick-build.sh          # 快速构建脚本 (Linux/macOS)
│   ├── 📄 one-click-build.ps1     # 一键构建脚本 (Windows)
│   ├── 📄 fix-network.ps1         # 网络问题修复脚本
│   └── 📄 quick-test.ps1          # 快速验证脚本
│
├── 📁 dev-docs/                   # 开发文档
│   ├── 📄 architecture.md         # 架构设计文档
│   ├── 📄 backend-development.md  # 后端开发指南
│   ├── 📄 frontend-development.md # 前端开发指南
│   └── 📄 integration-methods.md  # 集成方法文档
│
├── 📁 user-docs/                  # 用户文档
│   └── 📁 features/               # 功能文档
│       └── 📄 overview.md         # 功能概览
│
├── 📁 node_modules/               # 前端依赖包 (自动生成)
├── 📁 dist/                       # 前端构建输出 (自动生成)
│
├── 📄 package.json               # 前端项目配置
├── 📄 package-lock.json          # 前端依赖锁定文件
├── 📄 vite.config.ts             # Vite 构建配置
├── 📄 tsconfig.json              # TypeScript 配置
├── 📄 tsconfig.node.json         # Node.js TypeScript 配置
├── 📄 tailwind.config.js         # Tailwind CSS 配置
├── 📄 postcss.config.js          # PostCSS 配置
├── 📄 index.html                 # HTML 模板
│
├── 📄 README.md                  # 项目主说明文档
├── 📄 PROGRESS.md                # 功能实现进度跟踪
├── 📄 PROJECT-STRUCTURE.md       # 项目结构说明 (本文件)
└── 📄 test-connection.md         # 连接测试指南
```

## 📋 目录功能说明

### 🎨 **前端目录 (`src/`)**
- **技术栈**: React 18 + TypeScript + Vite + Tailwind CSS + Ant Design
- **架构模式**: 组件化设计，可复用的 React 组件
- **类型安全**: 完整的 TypeScript 类型定义
- **状态管理**: React Hooks + Context API
- **样式方案**: Tailwind CSS + Ant Design 组件库

### 🦀 **后端目录 (`src-tauri/`)**
- **技术栈**: Rust + Tauri 2.0 + Tokio + InfluxDB Client
- **架构模式**: 分层架构 (模型层 → 数据库层 → 服务层 → 命令层)
- **模块化设计**: 每个功能模块独立，便于维护和扩展
- **安全特性**: AES-256-GCM 加密、输入验证、SQL 注入防护
- **性能优化**: 连接池、异步操作、内存安全

### 🛠️ **脚本目录 (`scripts/`)**
- **跨平台支持**: Windows (PowerShell) 和 Linux/macOS (Bash)
- **完整工具链**: 从环境设置到生产构建的全流程自动化
- **问题修复**: 自动解决常见的网络和编译问题
- **开发效率**: 一键式开发环境设置和构建

### 📚 **文档目录**
- **开发文档 (`dev-docs/`)**: 面向开发者的技术文档
- **用户文档 (`user-docs/`)**: 面向用户的功能说明
- **根目录文档**: 项目概览、进度跟踪、结构说明

## 🔧 **核心模块详解**

### 后端模块架构

#### 1. **模型层 (`models/`)**
- **连接模型**: 连接配置、状态、测试结果
- **数据库模型**: 数据库信息、保留策略、测量信息
- **查询模型**: 查询请求、结果、历史记录
- **系统模型**: 系统信息、性能指标

#### 2. **数据库层 (`database/`)**
- **客户端封装**: InfluxDB 客户端的高级封装
- **连接管理**: 连接生命周期管理、健康检查
- **连接池**: 高效的连接复用和资源管理

#### 3. **服务层 (`services/`)**
- **连接服务**: 连接 CRUD、状态监控、批量操作
- **查询服务**: 查询执行、历史管理、保存查询
- **数据库服务**: 数据库管理、保留策略、测量操作

#### 4. **命令层 (`commands/`)**
- **连接命令**: 20+ 个连接相关的 Tauri 命令
- **数据库命令**: 15+ 个数据库管理命令
- **查询命令**: 10+ 个查询操作命令
- **系统命令**: 8+ 个系统监控命令

#### 5. **工具层 (`utils/`)**
- **加密服务**: AES-256-GCM 密码安全存储
- **验证工具**: 全面的输入验证和安全检查
- **配置管理**: 应用配置的持久化和管理

### 脚本工具链

#### 1. **环境设置脚本**
- **`setup-dev.ps1`**: 自动安装 Scoop、Rust、Node.js、开发工具
- **功能**: 一键式开发环境配置

#### 2. **构建脚本**
- **`build.ps1/sh`**: 完整的生产构建脚本
- **`quick-build.ps1/sh`**: 快速开发构建脚本
- **`one-click-build.ps1`**: 智能一键构建脚本

#### 3. **问题修复脚本**
- **`fix-network.ps1`**: 网络连接问题修复
- **`quick-test.ps1`**: 快速环境验证

## 📊 **代码统计**

| 组件 | 文件数 | 代码行数 | 功能模块 |
|------|--------|----------|----------|
| **后端 Rust** | 15+ | 3000+ | 连接管理、数据库操作、查询处理、安全加密 |
| **前端 React** | 5+ | 500+ | 基础 UI、连接测试、状态管理 |
| **构建脚本** | 8+ | 1500+ | 环境设置、构建自动化、问题修复 |
| **文档** | 8+ | 1000+ | 开发指南、用户手册、进度跟踪 |
| **配置文件** | 8+ | 300+ | 项目配置、依赖管理、构建配置 |

## 🎯 **开发工作流**

### 1. **首次设置**
```powershell
# 克隆项目
git clone <repository-url>
cd influx-gui

# 自动设置开发环境
.\scripts\setup-dev.ps1

# 快速验证
.\scripts\quick-test.ps1
```

### 2. **日常开发**
```powershell
# 启动开发模式
.\scripts\one-click-build.ps1 -Target dev

# 或分步启动
npm run dev                # 前端开发服务器
cargo tauri dev           # Tauri 开发模式
```

### 3. **代码检查**
```powershell
# 快速检查
.\scripts\quick-build.ps1 -Mode check

# 完整验证
.\scripts\one-click-build.ps1 -Target check
```

### 4. **生产构建**
```powershell
# 完整构建
.\scripts\build.ps1

# 快速构建
.\scripts\quick-build.ps1 -Mode build
```

## 🔍 **项目特点**

1. **模块化设计**: 清晰的分层架构，便于维护和扩展
2. **类型安全**: 端到端的类型安全，减少运行时错误
3. **自动化工具**: 完整的构建和开发工具链
4. **跨平台支持**: Windows、Linux、macOS 全平台支持
5. **安全优先**: 多层安全防护和数据加密
6. **性能优化**: 连接池、异步操作、内存安全
7. **开发友好**: 完整的文档和自动化脚本

---

**最后更新**: 2025-01-08  
**项目版本**: v0.1.0-alpha  
**架构状态**: ✅ 基础架构完成，🔄 功能开发中
