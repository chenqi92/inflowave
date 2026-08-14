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

**InfloWave** is a modern management tool designed for time-series databases and object storage, providing an intuitive graphical interface for managing InfluxDB databases and S3-compatible object storage. Built with the Tauri framework combining React frontend and Rust backend, it delivers a high-performance, secure, and reliable data management experience.

### ✨ Key Highlights

- 🗄️ **Multi-Source Support** - InfluxDB (1.x/2.x/3.x) + S3/MinIO Object Storage
- 📊 **Powerful Query Engine** - InfluxQL/Flux query editor with smart suggestions and syntax highlighting
- 📦 **Object Storage Management** - Complete S3 file management, preview, and permission control
- 📈 **Data Visualization** - Multiple chart types for professional time-series analysis
- 🌍 **Full Internationalization** - Chinese and English interfaces with multi-language support
- 🎨 **Modern Design** - Beautiful interface based on Shadcn/ui
- 🌐 **Cross-Platform** - Windows, macOS, and Linux support
- 🔒 **Secure & Reliable** - Local storage with API Token encryption

## 🚀 Getting Started

### 📦 Download & Installation

Visit the [Releases page](https://github.com/chenqi92/inflowave/releases/latest) to download the version for your system:

#### 🔍 Version Selection Guide

#### Windows Users
- **MSI Installer (Recommended)**: 📥 **[InflowWave_0.9.5_x64_zh-CN.msi](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_x64_zh-CN.msi)**
  - ✅ For Windows 10/11 (64-bit systems)
  - ✅ Enterprise-grade installer, supports GPO deployment
  - ✅ MSI format, high system trust

- **EXE Installer**: 📥 **[InflowWave_0.9.5_x64-setup.exe](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_x64-setup.exe)**
  - ✅ For Windows 10/11 (64-bit systems)
  - ✅ User-friendly installation wizard (NSIS)
  - ✅ Supports Chinese and English interface

- **32-bit MSI**: 📥 **[InflowWave_0.9.5_x86_zh-CN.msi](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_x86_zh-CN.msi)**
  - ✅ For older 32-bit Windows systems
  - ⚠️ Use only if 64-bit version doesn't work

- **32-bit EXE**: 📥 **[InflowWave_0.9.5_x86-setup.exe](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_x86-setup.exe)**
  - ✅ For Windows 7/8/10/11 (32-bit/64-bit)
  - ✅ User-friendly installation wizard (NSIS)

#### macOS Users

**How to Identify Your Mac Type?**
- 🍎 Click the Apple logo in the top-left corner → About This Mac
- 💻 Check the "Processor" or "Chip" information

**Apple Silicon Mac (M1/M2/M3/M4 chips)**
- 📥 **[InflowWave_0.9.5_aarch64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_aarch64.dmg)**
  - ✅ Macs released after November 2020
  - ✅ Optimal performance with native support
  - ✅ Lower power consumption
  - ⚠️ **Will NOT run on Intel Macs**

**Intel Mac (Intel processors)**
- 📥 **[InflowWave_0.9.5_x64.dmg](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_x64.dmg)**
  - ✅ Macs released before 2020
  - ✅ Compatible with macOS 10.15 or higher
  - ⚠️ Not compatible with Apple Silicon chips

**Portable (No Installation Required)**
- **Apple Silicon**: 📥 **[InflowWave_aarch64.app.tar.gz](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_aarch64.app.tar.gz)**
  - ✅ Extract and run directly, no installation needed
  - 📋 Usage: `tar -xzf InflowWave_aarch64.app.tar.gz && open InflowWave.app`

- **Intel Mac**: 📥 **[InflowWave_x64.app.tar.gz](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_x64.app.tar.gz)**
  - ✅ Extract and run directly, no installation needed
  - 📋 Usage: `tar -xzf InflowWave_x64.app.tar.gz && open InflowWave.app`

**⚠️ macOS Security Notice**

If you encounter "Cannot open the app because the developer cannot be verified" when first launching the app, run the following command in Terminal:

```bash
sudo xattr -r -d com.apple.quarantine /Applications/Inflowave.app
```

Then enter your macOS password to allow the app to run normally.

#### Linux Users

**How to Identify Your Linux Distribution?**
- Run command: `cat /etc/os-release` or `lsb_release -a`

**Debian/Ubuntu Family (Recommended)**
- 📥 **[InflowWave_0.9.5_amd64.deb](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_amd64.deb)**
  - ✅ Ubuntu 18.04+, Debian 10+
  - ✅ Better system integration, supports auto-updates
  - 📋 Install command: `sudo dpkg -i InflowWave_0.9.5_amd64.deb`
  - 🔧 Fix dependencies: `sudo apt-get install -f`

**Universal Linux (Works Everywhere)**
- 📥 **[InflowWave_0.9.5_amd64.AppImage](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave_0.9.5_amd64.AppImage)**
  - ✅ Works on most x64 Linux distributions
  - ✅ No installation required, run directly
  - ✅ Portable version, doesn't affect system
  - 📋 Usage: `chmod +x InflowWave_0.9.5_amd64.AppImage && ./InflowWave_0.9.5_amd64.AppImage`

**RPM Family (CentOS/RHEL/Fedora)**
- 📥 **[InflowWave-0.9.5-1.x86_64.rpm](https://github.com/chenqi92/inflowave/releases/download/v0.9.5/InflowWave-0.9.5-1.x86_64.rpm)**
  - ✅ CentOS 7+, RHEL 7+, Fedora 30+
  - 📋 Install command: `sudo rpm -i InflowWave-0.9.5-1.x86_64.rpm`
  - 📋 Or use: `sudo dnf install InflowWave-0.9.5-1.x86_64.rpm`

### ⚠️ System Requirements

- **Windows**: Windows 10 or higher
- **macOS**: macOS 10.15 (Catalina) or higher
- **Linux**: Modern Linux distributions supporting GTK 3.0

### 🔧 First Use

1. **Launch Application** - Double-click the installed application icon
2. **Add Connection** - Click "Add Connection" to configure data sources (InfluxDB or S3)
3. **Test Connection** - Verify that the connection configuration is correct
4. **Start Using** - Browse data, execute queries, manage files

## 🌟 Core Features

### 🗄️ InfluxDB Database Management

#### Multi-Version Support
- ✅ **InfluxDB 1.x** - Complete database, retention policy, and measurement management
- ✅ **InfluxDB 2.x** - Organization, Bucket, and API Token management
- ✅ **InfluxDB 3.x** - Latest version support
- ✅ **Multi-Connection** - Manage multiple InfluxDB instances simultaneously
- ✅ **Connection Monitoring** - Real-time health checks and auto-reconnection
- ✅ **Secure Storage** - Encrypted API Token storage

#### Database Operations
- ✅ Create, delete, and view databases/buckets
- ✅ Retention Policy management
- ✅ Measurement browsing and management
- ✅ Field and Tag viewing
- ✅ Tree structure with expand/collapse
- ✅ Right-click context menu for quick actions

### 🔍 Powerful Query System

#### Query Editor
- ✅ **CodeMirror 6** professional code editor
- ✅ **InfluxQL Support** - Syntax highlighting, smart suggestions, auto-completion
- ✅ **Flux Support** - InfluxDB 2.x query language
- ✅ **Multi-Tab** - Edit multiple queries simultaneously
- ✅ **Shortcuts** - Ctrl+Enter to execute, Ctrl+S to save
- ✅ **Query History** - Auto-save and quick reuse

#### Query Results
- ✅ Table display with virtual scrolling
- ✅ Pagination and lazy loading for large datasets
- ✅ Column width adjustment and custom display
- ✅ Data filtering and sorting
- ✅ Multi-format export (CSV, JSON, Excel)
- ✅ Multi-format copy (Text, Markdown, INSERT SQL)

### 📦 S3/Object Storage Management

#### File Management
- ✅ **Bucket Browser** - Tree structure for all buckets
- ✅ **File Operations** - Upload, download, delete, rename
- ✅ **Drag & Drop** - Drag files to upload
- ✅ **Batch Operations** - Select, copy, cut, paste
- ✅ **Context Menu** - Quick action menu
- ✅ **Infinite Scroll** - Auto-load more files

#### File Preview
- ✅ **Image Preview** - JPG, PNG, GIF, WebP, etc.
- ✅ **Video Preview** - MP4, WebM, OGG, etc.
- ✅ **Audio Preview** - MP3, WAV, OGG, etc.
- ✅ **Document Preview** - PDF, Excel, text, code
- ✅ **Secure Preview** - Blob URL mechanism with auto-cleanup
- ✅ **External Links** - Auto-open in system browser

#### Permissions & Tags
- ✅ **ACL Management** - Set object access permissions
- ✅ **Tag Management** - Add, edit, delete object tags
- ✅ **Permission Dialog** - Visual permission settings
- ✅ **Tag Dialog** - Batch tag management

#### Object Storage Support
- ✅ **AWS S3** - Full support
- ✅ **MinIO** - Open-source object storage
- ✅ **Alibaba Cloud OSS** - S3 API compatible
- ✅ **Tencent Cloud COS** - S3 API compatible
- ✅ **Custom Endpoint** - Any S3-compatible storage

### 📊 Data Visualization

#### Chart Types
- ✅ **Line Chart** - Time-series trend analysis
- ✅ **Bar Chart** - Data comparison analysis
- ✅ **Pie Chart** - Proportion analysis
- ✅ **Radar Chart** - Multi-dimensional analysis
- ✅ **Scatter Chart** - Correlation analysis
- ✅ **Area Chart** - Cumulative trend analysis

#### Chart Features
- ✅ Interactive operations (zoom, pan, tooltips)
- ✅ Custom chart titles and field aliases
- ✅ Chart export (PNG)
- ✅ Responsive layout
- ✅ Theme adaptation (light/dark mode)

### 📥📤 Data Import/Export

#### Data Writing
- ✅ **Line Protocol** - InfluxDB native format
- ✅ **Batch Writing** - Support multiple data points
- ✅ **Data Validation** - Auto-check format

#### Data Export
- ✅ **CSV Format** - Universal table format
- ✅ **JSON Format** - Structured data
- ✅ **Excel Format** - Complete XLSX files
- ✅ **Export Preview** - View export content
- ✅ **Custom Options** - Select fields and format

### 💼 Workspace Management

- ✅ **Tab Management** - Multiple query tabs
- ✅ **Tab Dragging** - Free sorting
- ✅ **Detached Windows** - Separate tabs to new windows
- ✅ **Window Reattach** - Reattach to main window
- ✅ **State Persistence** - Auto-save query results
- ✅ **Workspace Save** - Save current work state

### 🎨 User Interface

#### Theme System
- ✅ **Light/Dark Mode** - Auto-switch or manual selection
- ✅ **Theme Customization** - Custom color schemes
- ✅ **Font Selection** - Multiple modern fonts
- ✅ **Layout Adjustment** - Resizable panels

#### Internationalization
- ✅ **Chinese Interface** - Complete Simplified Chinese
- ✅ **English Interface** - Complete English support
- ✅ **Language Switching** - Real-time language change
- ✅ **Extension Support** - Easy to add new languages

### ⚡ Performance & Monitoring

- ✅ **Performance Monitoring** - CPU, memory usage
- ✅ **Query Statistics** - Query time, success rate
- ✅ **Connection Monitoring** - Connection status, health checks
- ✅ **Historical Data** - Performance trend analysis
- ✅ **Logging System** - Separate frontend/backend logs
- ✅ **Error Handling** - Friendly error messages

## 🏗️ Technical Architecture

### Frontend Tech Stack
- **Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **UI Components**: Shadcn/ui + Radix UI
- **Chart Library**: ECharts + Recharts
- **Code Editor**: CodeMirror 6
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Internationalization**: i18next

### Backend Tech Stack
- **Framework**: Tauri 2.0
- **Language**: Rust
- **Database Client**: influxdb crate
- **Object Storage**: aws-sdk-s3
- **Serialization**: serde
- **Async Runtime**: tokio
- **Encryption**: aes-gcm

## 📚 Documentation

- **Release Notes**: [docs/release-notes](docs/release-notes) - View update history
- **User Guide**: Built-in user guide in the application
- **Developer Docs**: See source code comments and type definitions

## 🤝 Contributing

We welcome all forms of contributions!

1. **Report Issues** - Report bugs in [Issues](https://github.com/chenqi92/inflowave/issues)
2. **Feature Suggestions** - Propose ideas in [Discussions](https://github.com/chenqi92/inflowave/discussions)
3. **Code Contributions** - Submit Pull Requests
4. **Documentation Improvements** - Help improve documentation

### Development Environment

```bash
# Clone the project
git clone https://github.com/chenqi92/inflowave.git
cd inflowave

# Install dependencies
npm install

# Start development server
npm run tauri:dev
```

### Code Standards

- Follow TypeScript and Rust best practices
- Run `npm run lint` before committing
- Write clear commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Thanks to all developers and users who have contributed to the project!

**Core Technologies**
- [Tauri](https://tauri.app/) - Cross-platform desktop application framework
- [React](https://reactjs.org/) - User interface library
- [Rust](https://www.rust-lang.org/) - Systems programming language

**Data Source Support**
- [InfluxDB](https://www.influxdata.com/) - Time-series database
- [AWS S3](https://aws.amazon.com/s3/) - Object storage service
- [MinIO](https://min.io/) - Open-source object storage

**UI Components**
- [Shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [ECharts](https://echarts.apache.org/) - Data visualization

## 📞 Get Help

- **Issue Reports**: [GitHub Issues](https://github.com/chenqi92/inflowave/issues)
- **Feature Suggestions**: [GitHub Discussions](https://github.com/chenqi92/inflowave/discussions)
- **Project Homepage**: [https://allbs.cn](https://allbs.cn)

## 🌟 Star History

If this project helps you, please give us a ⭐️!

[![Star History Chart](https://api.star-history.com/svg?repos=chenqi92/inflowave&type=Date)](https://star-history.com/#chenqi92/inflowave&Date)

---

<div align="center">

**Making data management simple and efficient** 🚀

[⭐ Star the project](https://github.com/chenqi92/inflowave) | [📋 Report issues](https://github.com/chenqi92/inflowave/issues) | [💡 Feature suggestions](https://github.com/chenqi92/inflowave/discussions)

Made with ❤️ by [chenqi92](https://github.com/chenqi92)

</div>
