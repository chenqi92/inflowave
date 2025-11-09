# S3Browser 组件

这是一个高度模块化的 S3/MinIO 文件浏览器组件。

## 文件结构

```
S3Browser/
├── index.tsx                        # 主组件（2891 行）⬇️⬇️
├── S3Browser.css                    # 样式文件
├── README.md                        # 本文档
├── components/                      # 子组件
│   └── FileThumbnail.tsx           # 文件缩略图组件（173 行）
└── utils/                          # 工具函数
    ├── fileHelpers.ts              # 文件相关工具函数（205 行）
    ├── navigationGuard.ts          # 预览导航拦截工具（187 行）
    └── previewHandler.ts           # 预览内容处理工具（242 行）✨ 新增
```

## 模块说明

### components/FileThumbnail.tsx
文件缩略图组件，负责：
- 在网格视图中显示图片和视频的缩略图
- 使用 presigned URL 加载预览
- 提供 `getFileIcon` 函数用于获取文件图标
- 使用 React.memo 优化性能

### utils/fileHelpers.ts
文件操作相关的工具函数：
- `isImageFile()` - 判断是否为图片文件
- `isVideoFile()` - 判断是否为视频文件
- `isAudioFile()` - 判断是否为音频文件
- `isPreviewableFile()` - 判断文件是否可预览
- `getFileExtension()` - 获取文件扩展名
- `getFileType()` - 获取文件类型分类
- `canGenerateShareLink()` - 判断是否支持生成分享链接
- `getFolderNameFromPath()` - 从路径中提取文件夹名称
- `buildObjectPath()` - 构建完整的对象路径
- `parseBreadcrumbs()` - 解析路径为面包屑导航项
- `isValidFileName()` - 检查文件名是否有效
- `isReservedName()` - 检查是否为系统保留名称

### utils/navigationGuard.ts
预览文件时的导航拦截工具，防止 iframe 内的链接导致 webview 导航到外部 URL：
- `setupLinkClickInterceptor()` - 设置链接点击拦截
- `setupWindowNavigationGuard()` - 拦截窗口级别的导航尝试
- `setupIframeNavigationMonitor()` - 监控 iframe 导航并阻止外部链接
- `setupPreviewNavigationGuard()` - 完整的预览对话框导航保护设置
- `cleanupNavigationGuard()` - 清理所有导航保护

### utils/previewHandler.ts ✨ 新增
预览内容生成和处理工具：
- `generatePreviewContent()` - 统一的预览内容生成入口
- `generateMediaPreview()` - 生成图片/视频/音频/PDF的blob预览
- `generateTextPreview()` - 生成文本文件预览
- `generateExcelPreview()` - 生成Excel文件预览
- `generateOfficePreview()` - 生成Office文件（Word/PowerPoint）的预签名URL
- `loadObjectTags()` - 加载文件标签
- `cleanupBlobUrl()` - 清理blob URL防止内存泄漏
- `getMimeType()` - 获取正确的MIME类型
- `createExcelHtmlDocument()` - 创建Excel的HTML文档

## 重构成果

### 第一轮重构（之前）
- **主组件**：从 3368 行减少到 3116 行（减少 252 行）
- **新增模块**：565 行

### 第二轮重构
- **主组件**：从 3116 行减少到 2970 行（减少 146 行）⬇️
- **新增模块**：807 行（+242 行 previewHandler.ts）
- **累计优化**：主组件减少 398 行（-11.8%）

### 第三轮优化（本次）✨
- **主组件**：从 2970 行减少到 2891 行（减少 79 行）⬇️⬇️
- **优化内容**：
  - 删除重复定义的 `isPreviewableFile` 函数
  - 统一使用 `getFileExtension` 工具函数（12+ 处替换）
  - 使用 `parseBreadcrumbs` 简化面包屑导航逻辑
  - 使用 `buildObjectPath` 统一路径构建（4 处替换）
- **总代码量**：3698 行
- **累计优化**：主组件减少 477 行（-14.2%）

### 改进总结
- ✅ **代码可维护性**：显著提升
- ✅ **模块职责**：清晰分离
- ✅ **预览逻辑**：统一处理，易于扩展
- ✅ **内存管理**：blob URL 自动清理
- ✅ **代码复用**：消除重复代码，统一使用工具函数
- ✅ **类型安全**：保持 TypeScript 零错误编译

## 使用示例

```tsx
import { S3Browser } from '@/components/S3Browser';

// 在父组件中使用
<S3Browser
  connectionId="your-connection-id"
  connectionName="My S3 Connection"
/>
```

## 开发指南

1. **添加新的文件类型支持**：在 `utils/fileHelpers.ts` 中修改相关函数
2. **修改缩略图逻辑**：编辑 `components/FileThumbnail.tsx`
3. **增强导航拦截**：在 `utils/navigationGuard.ts` 中添加新的保护机制
4. **添加新的对话框**：在 `components/` 目录下创建新的对话框组件

## 性能优化

- FileThumbnail 使用 `React.memo` 避免不必要的重新渲染
- 缩略图仅在网格视图下加载
- 使用 presigned URL 减少服务器负载
- 导航拦截使用事件委托减少监听器数量

## 安全性

- 所有外部链接在系统浏览器中打开
- PDF 和 Excel 预览使用 sandbox iframe
- 内容安全策略（CSP）阻止外部资源加载
- 多层导航拦截防止意外导航
