# 应用图标

这个目录包含了 InfluxDB GUI Manager 的应用图标，用于不同平台的安装包和应用程序。

## 图标文件

### 必需的图标文件
- `32x32.png` - 32x32 像素 PNG 图标
- `128x128.png` - 128x128 像素 PNG 图标  
- `128x128@2x.png` - 256x256 像素 PNG 图标 (高分辨率)
- `icon.icns` - macOS 图标文件
- `icon.ico` - Windows 图标文件

### 安装程序图标 (可选)
- `installer-header.bmp` - Windows 安装程序头部图像 (493x58 像素)
- `installer-sidebar.bmp` - Windows 安装程序侧边栏图像 (164x314 像素)

## 图标设计规范

### 设计原则
- **简洁明了**: 图标应该简洁，易于识别
- **品牌一致**: 与应用程序的整体设计风格保持一致
- **多尺寸适配**: 在不同尺寸下都应该清晰可见

### 技术要求
- **格式**: PNG (透明背景), ICO, ICNS
- **颜色**: 支持全彩色和透明度
- **分辨率**: 支持多种分辨率，包括高 DPI

### 平台特定要求

#### Windows (.ico)
- 包含多个尺寸: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- 支持透明背景
- 文件大小建议小于 100KB

#### macOS (.icns)
- 包含多个尺寸: 16x16 到 1024x1024
- 支持 Retina 显示屏
- 遵循 macOS 设计指南

#### Linux (.png)
- 标准尺寸: 32x32, 48x48, 64x64, 128x128, 256x256
- PNG 格式，透明背景
- 遵循 freedesktop.org 图标规范

## 生成图标

### 使用在线工具
推荐使用以下在线工具生成多平台图标：
- [Tauri Icon Generator](https://tauri.app/v1/guides/features/icons)
- [App Icon Generator](https://appicon.co/)
- [Icon Generator](https://icon.kitchen/)

### 使用命令行工具

#### ImageMagick
```bash
# 生成不同尺寸的 PNG 图标
convert icon-source.png -resize 32x32 32x32.png
convert icon-source.png -resize 128x128 128x128.png
convert icon-source.png -resize 256x256 128x128@2x.png

# 生成 Windows ICO 文件
convert icon-source.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

#### 使用 Tauri CLI
```bash
# 从源图像生成所有需要的图标
tauri icon path/to/source-icon.png
```

## 当前状态

⚠️ **需要添加图标文件**

请添加以下图标文件到此目录：
- [ ] 32x32.png
- [ ] 128x128.png
- [ ] 128x128@2x.png
- [ ] icon.icns
- [ ] icon.ico

### 临时解决方案
在开发阶段，可以使用 Tauri 提供的默认图标，或者创建简单的占位符图标。

### 图标设计建议
对于 InfluxDB GUI Manager，建议图标设计包含：
- 数据库相关的视觉元素
- 现代化的设计风格
- 与 InfluxDB 品牌色彩协调
- 在小尺寸下仍然清晰可见
