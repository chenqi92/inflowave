# 🔧 安装指南

## 系统要求

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

## 📥 下载安装包

### 官方下载
访问 [GitHub Releases](https://github.com/kkape/inflowave/releases) 页面下载最新版本。

### 选择合适的安装包
- **Windows**: `inflowave-setup.exe` (推荐) 或 `inflowave-portable.exe`
- **macOS**: `inflowave.dmg` (通用版本，支持 Intel 和 Apple Silicon)
- **Linux**: `inflowave.deb`, `inflowave.rpm`, 或 `inflowave.AppImage`

## 🖥️ Windows 安装

### 方法一：使用安装程序 (推荐)
1. 下载 `inflowave-setup.exe`
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 从开始菜单或桌面快捷方式启动应用

### 方法二：便携版
1. 下载 `inflowave-portable.exe`
2. 将文件放置到任意目录
3. 双击运行即可使用

### Windows 特殊要求
- **WebView2**: 如果系统提示缺少 WebView2，请访问 [Microsoft WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) 下载安装

## 🍎 macOS 安装

### 安装步骤
1. 下载 `inflowave.dmg`
2. 双击打开 DMG 文件
3. 将 InfloWave 拖拽到 Applications 文件夹
4. 从启动台或应用程序文件夹启动应用

### 首次运行
由于应用未经过 Apple 公证，首次运行时可能会显示安全警告：
1. 右键点击应用图标
2. 选择"打开"
3. 在弹出的对话框中点击"打开"

## 🐧 Linux 安装

### Ubuntu/Debian (.deb)
```bash
# 下载 deb 包
wget https://github.com/kkape/inflowave/releases/latest/download/inflowave.deb

# 安装
sudo dpkg -i inflowave.deb

# 如果有依赖问题，运行
sudo apt-get install -f
```

### CentOS/RHEL/Fedora (.rpm)
```bash
# 下载 rpm 包
wget https://github.com/kkape/inflowave/releases/latest/download/inflowave.rpm

# 安装
sudo rpm -i inflowave.rpm

# 或使用 dnf (Fedora)
sudo dnf install inflowave.rpm
```

### AppImage (通用)
```bash
# 下载 AppImage
wget https://github.com/kkape/inflowave/releases/latest/download/inflowave.AppImage

# 添加执行权限
chmod +x inflowave.AppImage

# 运行
./inflowave.AppImage
```

### Linux 依赖
如果遇到依赖问题，请安装以下包：

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.0-37 libgtk-3-0
```

#### CentOS/RHEL/Fedora
```bash
sudo dnf install -y webkit2gtk3 gtk3
```

## 🔄 升级指南

### 自动更新
应用会自动检查更新，当有新版本时会提示用户下载。

### 手动升级
1. 下载最新版本的安装包
2. 按照相同的安装步骤进行安装
3. 新版本会自动覆盖旧版本

### 配置迁移
- 用户配置和连接信息会自动保留
- 如需手动备份，配置文件位置：
  - **Windows**: `%APPDATA%\inflowave\`
  - **macOS**: `~/Library/Application Support/inflowave/`
  - **Linux**: `~/.config/inflowave/`

## 🗑️ 卸载指南

### Windows
- **安装版**: 通过"控制面板" → "程序和功能"卸载
- **便携版**: 直接删除可执行文件

### macOS
1. 从应用程序文件夹删除 InfloWave
2. 删除配置文件（可选）：`~/Library/Application Support/inflowave/`

### Linux
```bash
# Ubuntu/Debian
sudo apt remove inflowave

# CentOS/RHEL/Fedora
sudo rpm -e inflowave

# AppImage
# 直接删除 AppImage 文件
```

## 🔧 故障排除

### 常见问题

#### Windows
- **应用无法启动**: 检查是否安装了 WebView2
- **防火墙警告**: 允许应用通过防火墙
- **权限问题**: 以管理员身份运行

#### macOS
- **"应用已损坏"**: 在终端运行 `sudo xattr -rd com.apple.quarantine /Applications/InfloWave.app`
- **权限问题**: 在"系统偏好设置" → "安全性与隐私"中允许应用运行

#### Linux
- **依赖缺失**: 安装所需的系统依赖包
- **权限问题**: 确保用户有执行权限
- **显示问题**: 检查 GTK 和 WebKit 版本

### 获取帮助
如果遇到安装问题：
1. 查看 [常见问题](./faq.md)
2. 搜索 [GitHub Issues](https://github.com/kkape/inflowave/issues)
3. 提交新的 Issue 报告问题

---

> 💡 **提示**: 建议在安装前关闭杀毒软件，避免误报。安装完成后可重新启用。
