# InfloWave

<div align="center">

**[🇨🇳 中文](README.md) | [🇺🇸 English](README-en.md)**

</div>

<div align="center">

![InfloWave Logo](src-tauri/icons/icon.png)

**Modern Time-Series Database Management Tool**

Cross-platform desktop application built with Tauri + React + TypeScript + Rust

[![GitHub release](https://img.shields.io/github/release/chenqi92/inflowave.svg)](https://github.com/chenqi92/inflowave/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](https://github.com/chenqi92/inflowave)

</div>

## 🎯 Overview

**InfloWave** is a modern management tool specifically designed for time-series databases, providing an intuitive graphical interface for managing InfluxDB databases. Built with the Tauri framework combining React frontend and Rust backend, it delivers a high-performance, secure, and reliable database management experience.

### ✨ Key Features

- 🔗 **Multi-Connection Management** - Manage multiple InfluxDB instances simultaneously
- 📊 **Visual Queries** - Professional InfluxQL query editor with result visualization
- 📈 **Chart Analysis** - Multiple chart types for time-series data analysis
- 📥 **Data Import/Export** - Support for CSV, JSON, Excel, and other formats
- 🎨 **Modern Interface** - Beautiful UI design based on Shadcn/ui
- 🌐 **Cross-Platform** - Full support for Windows, macOS, and Linux
- 🔒 **Secure & Reliable** - Local storage ensures data security

## 🚀 Getting Started

### 📦 Installation

#### Method 1: Download Pre-built Binaries (Recommended)

Visit the [Releases page](https://github.com/chenqi92/inflowave/releases/latest) to download the latest version.

### 🔍 How to Choose the Right Version

#### Windows Users
- **Recommended**: 📥 **[InfloWave_0.1.5_x64.msi](https://github.com/chenqi92/inflowave/releases/download/v0.1.5/InfloWave_0.1.5_x64.msi)** 
  - ✅ For Windows 10/11 (64-bit systems)
  - ✅ Supports most modern Windows systems
  - ✅ MSI format, simple and reliable installation

- **Legacy**: 📥 **[InfloWave_0.1.5_x86.msi](https://github.com/chenqi92/inflowave/releases/download/v0.1.5/InfloWave_0.1.5_x86.msi)**
  - ✅ For older 32-bit Windows systems
  - ⚠️ Use only if 64-bit version doesn't work

#### macOS Users

**How to Identify Your Mac Type?**
- 🍎 Click the Apple logo in the top-left corner → About This Mac
- 💻 Check the "Processor" or "Chip" information

**Apple Silicon Mac (M1/M2/M3/M4 chips)**
- 📥 **[InfloWave_0.1.5_aarch64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.1.5/InfloWave_0.1.5_aarch64.dmg)**
  - ✅ Macs released after November 2020
  - ✅ Optimal performance with native support
  - ✅ Lower power consumption
  - ⚠️ **Will NOT run on Intel Macs**

**Intel Mac (Intel processors)**
- 📥 **[InfloWave_0.1.5_x64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.1.5/InfloWave_0.1.5_x64.dmg)**
  - ✅ Macs released before 2020
  - ✅ Compatible with macOS 10.15 or higher
  - ⚠️ Not compatible with Apple Silicon chips

#### Linux Users

**How to Identify Your Linux Distribution?**
- Run command: `cat /etc/os-release` or `lsb_release -a`

**Debian/Ubuntu Family (Recommended)**
- 📥 **[InfloWave_0.1.5_amd64.deb](https://github.com/chenqi92/inflowave/releases/download/v0.1.5/InfloWave_0.1.5_amd64.deb)**
  - ✅ Ubuntu 18.04+, Debian 10+
  - ✅ Better system integration, supports auto-updates
  - 📋 Install command: `sudo dpkg -i InfloWave_0.1.5_amd64.deb`
  - 🔧 Fix dependencies: `sudo apt-get install -f`

**Universal Linux (Works Everywhere)**
- 📥 **[InfloWave_0.1.5_amd64.AppImage](https://github.com/chenqi92/inflowave/releases/download/v0.1.5/InfloWave_0.1.5_amd64.AppImage)**
  - ✅ Works on most x64 Linux distributions
  - ✅ No installation required, run directly
  - ✅ Portable version, doesn't affect system
  - 📋 Usage: `chmod +x InfloWave_0.1.5_amd64.AppImage && ./InfloWave_0.1.5_amd64.AppImage`

**RPM Family (CentOS/RHEL/Fedora)**
- 📥 **[InfloWave-0.1.5-1.x86_64.rpm](https://github.com/chenqi92/inflowave/releases/download/v0.1.5/InfloWave-0.1.5-1.x86_64.rpm)**
  - ✅ CentOS 7+, RHEL 7+, Fedora 30+
  - 📋 Install command: `sudo rpm -i InfloWave-0.1.5-1.x86_64.rpm`
  - 📋 Or use: `sudo dnf install InfloWave-0.1.5-1.x86_64.rpm`

### 📝 Detailed Installation Steps

#### Windows Installation
1. Download the corresponding `.msi` file
2. Double-click to run the installer
3. Follow the installation wizard to complete
4. Launch InfloWave from the Start menu

#### macOS Installation
1. Download the corresponding `.dmg` file
2. Double-click to open the DMG image
3. Drag InfloWave.app to the Applications folder
4. On first run, you may need to allow it in "System Preferences → Security & Privacy"

#### Linux Installation
- **DEB package**: `sudo dpkg -i filename.deb`
- **AppImage**: `chmod +x filename.AppImage && ./filename.AppImage`
- **RPM package**: `sudo rpm -i filename.rpm`

### ⚠️ System Requirements

- **Windows**: Windows 10 or higher (Windows 11 recommended)
- **macOS**: macOS 10.15 (Catalina) or higher
- **Linux**: Modern Linux distributions supporting GTK 3.0

#### Method 2: Build from Source

**System Requirements**
- Node.js 18.0+
- Rust 1.70+
- OS: Windows 10+, macOS 10.15+, Ubuntu 18.04+

**Build Steps**

```bash
# Clone the project
git clone https://github.com/chenqi92/inflowave.git
cd inflowave

# Install dependencies
npm install

# Start development server
npm run tauri:dev

# Build for production
npm run tauri:build
```

### 🔧 First Use

1. **Launch Application** - Double-click the installed application icon
2. **Add Connection** - Click "Add Connection" to configure your InfluxDB server
3. **Test Connection** - Verify that the connection configuration is correct
4. **Start Using** - Browse databases, execute queries, create charts

## 🌟 Features

### 🔗 Connection Management
- ✅ Multi-database connection configuration and management
- ✅ Real-time connection monitoring and health checks
- ✅ Secure credential storage
- ✅ Connection pooling and auto-reconnection

### 🗄️ Database Operations
- ✅ Database listing and management
- ✅ Database creation and deletion operations
- ✅ Measurement and field browsing
- ✅ Right-click context menu shortcuts
- ✅ Data table browser

### 🔍 Query System
- ✅ Monaco Editor professional query editor
- ✅ InfluxQL syntax highlighting and smart suggestions
- ✅ Query result table display with pagination
- ✅ Query history management
- ✅ Multi-format result export

### 📊 Data Visualization
- ✅ Multiple chart types (line, bar, pie charts, etc.)
- ✅ Time-series specific chart components
- ✅ Interactive charts (zoom, pan, tooltips)
- ✅ Responsive dashboard layout

### 📥📤 Data Management
- ✅ Line Protocol format data writing
- ✅ CSV, JSON file import
- ✅ Smart field type inference
- ✅ Data validation and error handling

## 🏗️ Technical Architecture

### Frontend Tech Stack
- **Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **UI Components**: Shadcn/ui + Radix UI
- **Chart Library**: ECharts + Recharts
- **Code Editor**: Monaco Editor
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Backend Tech Stack
- **Framework**: Tauri 2.0
- **Language**: Rust
- **Database Client**: influxdb crate
- **Serialization**: serde
- **Async Runtime**: tokio

## 📁 Project Structure

```
inflowave/
├── src/                          # React frontend source
│   ├── components/              # Component library
│   │   ├── common/             # Common components
│   │   ├── query/              # Query-related components
│   │   ├── layout/             # Layout components
│   │   ├── visualization/      # Visualization components
│   │   └── ui/                 # UI base components
│   ├── pages/                  # Page components
│   ├── hooks/                  # Custom hooks
│   ├── services/               # API service layer
│   ├── store/                  # State management
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
├── src-tauri/                   # Rust backend source
│   ├── src/
│   │   ├── commands/           # Tauri command handlers
│   │   ├── database/           # Database connection and operations
│   │   ├── models/             # Data models
│   │   ├── services/           # Business logic services
│   │   └── utils/              # Utility functions
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── public/                      # Static assets
├── scripts/                     # Build scripts
└── README.md                    # Project documentation
```

## 📊 Feature Completion Status

### ✅ Completed Features (95%+)

- **Connection Management**: Multi-connection support, health checks, secure storage
- **Database Operations**: Complete CRUD operations, context menus
- **Query System**: Professional editor, smart suggestions, history management
- **Data Visualization**: Multiple chart types, interactive operations
- **Data Management**: Import/export, data validation
- **System Features**: Performance monitoring, error handling, configuration management

### 🚧 Continuous Optimization

- **Performance Optimization**: Connection pool optimization, query performance improvement
- **User Experience**: More shortcut operations, theme customization
- **Feature Extension**: Advanced analytics, plugin system

## 🛠️ Development Guide

### Development Environment Setup

```bash
# Install dependencies
npm install

# Start development server
npm run tauri:dev

# Run tests
npm test

# Format code
npm run format

# Lint code
npm run lint
```

### Build & Release

```bash
# Build for production
npm run tauri:build

# Cross-platform builds
npm run build:windows
npm run build:macos
npm run build:linux
```

## 🤝 Contributing

We welcome all forms of contributions!

1. **Report Issues** - Report bugs in [Issues](https://github.com/chenqi92/inflowave/issues)
2. **Feature Suggestions** - Propose new features
3. **Code Contributions** - Submit Pull Requests
4. **Documentation Improvements** - Help improve documentation

### Development Workflow

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Thanks to all developers and users who have contributed to the project!

- [Tauri](https://tauri.app/) - Cross-platform desktop application framework
- [React](https://reactjs.org/) - User interface library
- [Rust](https://www.rust-lang.org/) - Systems programming language
- [InfluxDB](https://www.influxdata.com/) - Time-series database

## 📞 Get Help

- **Issue Reports**: [GitHub Issues](https://github.com/chenqi92/inflowave/issues)
- **Feature Suggestions**: [GitHub Discussions](https://github.com/chenqi92/inflowave/discussions)
- **Project Homepage**: [https://allbs.cn](https://allbs.cn)

---

<div align="center">

**Making time-series data management simple and efficient** 🚀

[⭐ Star the project](https://github.com/chenqi92/inflowave) | [📋 Report issues](https://github.com/chenqi92/inflowave/issues) | [💡 Feature suggestions](https://github.com/chenqi92/inflowave/discussions)

</div>