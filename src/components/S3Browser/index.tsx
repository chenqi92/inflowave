import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Checkbox,
  ScrollArea,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  RadioGroup,
  RadioGroupItem,
  Label,
} from '@/components/ui';
import {
  Upload,
  Download,
  FolderPlus,
  Trash2,
  RefreshCw,
  Search,
  MoreVertical,
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  Archive,
  Copy,
  Scissors,
  Clipboard,
  Link,
  Grid,
  List,
  ChevronRight,
  Home,
  FolderOpen,
  Edit2,
  Eye,
  Tag,
  Shield,
} from 'lucide-react';
import { S3Service } from '@/services/s3Service';
import { showMessage } from '@/utils/message';
import { formatBytes, formatDate } from '@/utils/format';
import { t } from '@/i18n/translate';
import type {
  S3Object,
  S3Bucket,
  S3BrowserViewConfig,
} from '@/types/s3';
import './S3Browser.css';
import logger from '@/utils/logger';
import { safeTauriInvoke } from '@/utils/tauri';

// 判断文件是否为图片
const isImageFile = (object: S3Object): boolean => {
  if (object.isDirectory) return false;
  const extension = object.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(extension || '');
};

// 判断文件是否为视频
const isVideoFile = (object: S3Object): boolean => {
  if (object.isDirectory) return false;
  const extension = object.name.split('.').pop()?.toLowerCase();
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension || '');
};

// 获取文件图标
const getFileIcon = (object: S3Object) => {
  if (object.isDirectory) {
    return <Folder className="w-4 h-4" />;
  }

  const extension = object.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'txt':
    case 'md':
    case 'doc':
    case 'docx':
    case 'pdf':
      return <FileText className="w-4 h-4" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'bmp':
      return <FileImage className="w-4 h-4" />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return <FileVideo className="w-4 h-4" />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return <FileAudio className="w-4 h-4" />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'go':
    case 'rs':
      return <FileCode className="w-4 h-4" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <Archive className="w-4 h-4" />;
    default:
      return <File className="w-4 h-4" />;
  }
};

// 文件缩略图组件 - 移到外部并使用 React.memo 优化
const FileThumbnail = React.memo<{
  object: S3Object;
  connectionId: string;
  currentBucket: string;
  viewMode: 'list' | 'grid' | 'tree';
}>(({ object, connectionId, currentBucket, viewMode }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    // 重置状态
    setThumbnailUrl(null);
    setThumbnailError(false);

    if (!currentBucket) return;

    // 仅在网格视图下加载缩略图
    if (viewMode !== 'grid' || (!isImageFile(object) && !isVideoFile(object))) {
      return;
    }

    let isCancelled = false;

    const loadThumbnail = async () => {
      try {
        setIsLoadingThumbnail(true);
        // 使用 presigned URL 获取预览
        const result = await S3Service.generatePresignedUrl(
          connectionId,
          currentBucket,
          object.key,
          'get',
          300 // 5分钟过期
        );

        if (!isCancelled) {
          setThumbnailUrl(result.url);
        }
      } catch (error) {
        if (!isCancelled) {
          logger.warn(`Failed to generate thumbnail for ${object.name}:`, error);
          setThumbnailError(true);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingThumbnail(false);
        }
      }
    };

    loadThumbnail();

    // 清理函数：取消异步操作
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [object.key, connectionId, currentBucket, viewMode]);

  // 如果加载失败或不支持预览，显示图标
  if (thumbnailError || isLoadingThumbnail) {
    return getFileIcon(object);
  }

  if (isImageFile(object) && thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={object.name}
        className="w-full h-24 object-contain rounded-md bg-muted/20"
        onError={() => setThumbnailError(true)}
      />
    );
  }

  if (isVideoFile(object) && thumbnailUrl) {
    return (
      <video
        src={thumbnailUrl}
        className="w-full h-24 object-contain rounded-md bg-muted/20"
        onError={() => setThumbnailError(true)}
        preload="metadata"
      />
    );
  }

  return getFileIcon(object);
});

FileThumbnail.displayName = 'FileThumbnail';

interface S3BrowserProps {
  connectionId: string;
  connectionName?: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
  isBucket?: boolean; // 是否是 bucket 级别
}

interface FileOperation {
  type: 'copy' | 'cut';
  items: S3Object[];
  sourceBucket: string;
}

const S3Browser: React.FC<S3BrowserProps> = ({ connectionId, connectionName = 'S3' }) => {
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [currentBucket, setCurrentBucket] = useState<string>(''); // 当前所在的 bucket
  const [currentPath, setCurrentPath] = useState<string>(''); // 当前路径（bucket内的路径）
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1); // 用于 Shift 范围选择
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewConfig, setViewConfig] = useState<S3BrowserViewConfig>({
    viewMode: 'list',
    showHidden: false,
    showDetails: true,
    sortBy: { field: 'name', order: 'asc' },
    pageSize: 100,
  });

  // 列宽状态
  const [columnWidths, setColumnWidths] = useState({
    name: 400,
    size: 150,
    count: 150, // bucket 文件数量列
    tags: 200, // 标签列
    modified: 200,
  });

  // 分页相关
  const [continuationToken, setcontinuationToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  // 文件操作
  const [fileOperation, setFileOperation] = useState<FileOperation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 无限滚动加载
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 列宽调整
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // 对话框状态
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showPresignedUrlDialog, setShowPresignedUrlDialog] = useState(false);
  const [presignedUrl, setPresignedUrl] = useState('');
  const [shareObject, setShareObject] = useState<S3Object | null>(null);
  const [shareDays, setShareDays] = useState(0);
  const [shareHours, setShareHours] = useState(12);
  const [shareMinutes, setShareMinutes] = useState(0);
  const [shareExpireTime, setShareExpireTime] = useState('');

  // 文件预览状态
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewObject, setPreviewObject] = useState<S3Object | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 重命名状态
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameObject, setRenameObject] = useState<S3Object | null>(null);
  const [newName, setNewName] = useState('');

  // 框选状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 拖放状态
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    object: S3Object | null;
  }>({ visible: false, x: 0, y: 0, object: null });

  // 权限设置对话框状态
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [permissionsObject, setPermissionsObject] = useState<S3Object | null>(null);
  const [selectedAcl, setSelectedAcl] = useState<'private' | 'public-read' | 'public-read-write' | 'authenticated-read'>('private');

  // Tags 管理对话框状态
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [tagsObject, setTagsObject] = useState<S3Object | null>(null);
  const [objectTags, setObjectTags] = useState<Array<{ key: string; value: string }>>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // 加载根级别内容（buckets 或 bucket 内的对象）
  useEffect(() => {
    logger.info(`📦 [S3Browser] useEffect 触发: bucket=${currentBucket}, path=${currentPath}`);
    if (!currentBucket) {
      // 在根级别，显示所有 buckets
      loadBuckets();
    } else {
      // 在某个 bucket 内，显示对象
      loadObjects();
    }
  }, [connectionId, currentBucket, currentPath, searchTerm, viewConfig.sortBy]);

  // 无限滚动：使用 IntersectionObserver 监听触发器元素
  useEffect(() => {
    if (!hasMore || isLoading || !loadMoreTriggerRef.current) {
      return;
    }

    // 查找 ScrollArea 的 viewport 元素作为滚动容器
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // 当触发器元素进入视口时，加载更多数据
        if (entry.isIntersecting && hasMore && !isLoading) {
          logger.info('📦 [S3Browser] 触发无限滚动加载');
          loadObjects(true);
        }
      },
      {
        root: scrollViewport || null, // 使用 ScrollArea 的 viewport 作为根，如果找不到则使用视口
        rootMargin: '100px', // 提前100px触发加载
        threshold: 0.1, // 当10%可见时触发
      }
    );

    observer.observe(loadMoreTriggerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, currentBucket]);

  const loadBuckets = async () => {
    try {
      setIsLoading(true);
      logger.info(`📦 [S3Browser] 开始加载 buckets, connectionId: ${connectionId}`);
      const bucketList = await S3Service.listBuckets(connectionId);
      logger.info(`📦 [S3Browser] 加载到 ${bucketList.length} 个 buckets:`, bucketList.map(b => b.name));
      setBuckets(bucketList);

      // 将 buckets 转换为文件夹对象显示，并获取每个bucket的对象数量
      const bucketObjectsPromises = bucketList.map(async (bucket) => {
        let objectCount = 0;
        try {
          // 使用原生 API 获取 bucket 统计信息
          const stats = await S3Service.getBucketStats(connectionId, bucket.name);
          objectCount = stats.total_count;
        } catch (error) {
          logger.warn(`📦 [S3Browser] 获取 bucket ${bucket.name} 对象数量失败:`, error);
        }

        return {
          key: `${bucket.name}/`,
          name: bucket.name,
          size: 0,
          lastModified: bucket.creationDate || new Date(),
          isDirectory: true,
          objectCount, // 添加对象数量
        };
      });

      let bucketObjects: S3Object[] = await Promise.all(bucketObjectsPromises);

      // 应用搜索过滤
      if (searchTerm) {
        bucketObjects = bucketObjects.filter(obj =>
          obj.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        logger.info(`📦 [S3Browser] 搜索过滤后剩余 ${bucketObjects.length} 个 bucket`);
      }

      // 排序
      bucketObjects.sort((a, b) => {
        const field = viewConfig.sortBy.field;
        const order = viewConfig.sortBy.order === 'asc' ? 1 : -1;

        switch (field) {
          case 'name':
            return a.name.localeCompare(b.name) * order;
          case 'lastModified':
            return (a.lastModified.getTime() - b.lastModified.getTime()) * order;
          default:
            return 0;
        }
      });

      setObjects(bucketObjects);
      logger.info(`📦 [S3Browser] 显示 ${bucketObjects.length} 个 bucket 作为文件夹`);
    } catch (error) {
      logger.error(`📦 [S3Browser] 加载 buckets 失败:`, error);
      showMessage.error(`${String(t('s3:error.load_buckets_failed'))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadObjects = async (append: boolean = false) => {
    if (!currentBucket) {
      logger.warn(`📦 [S3Browser] loadObjects 被调用但 currentBucket 为空`);
      return;
    }

    try {
      setIsLoading(true);
      logger.info(`📦 [S3Browser] 开始加载对象: bucket=${currentBucket}, path=${currentPath}, append=${append}`);
      const result = await S3Service.listObjects(
        connectionId,
        currentBucket,
        currentPath,
        '/',
        viewConfig.pageSize,
        append ? continuationToken : undefined
      );

      const commonPrefixes = result.commonPrefixes || [];
      logger.info(`📦 [S3Browser] 加载到 ${result.objects.length} 个对象, ${commonPrefixes.length} 个文件夹前缀`);
      logger.info(`📦 [S3Browser] 当前路径: "${currentPath}"`);
      logger.debug(`📦 [S3Browser] 对象列表:`, result.objects.map(o => ({ key: o.key, name: o.name, isDir: o.isDirectory })));
      logger.debug(`📦 [S3Browser] 文件夹前缀:`, commonPrefixes);
      logger.debug(`📦 [S3Browser] 完整响应:`, result);

      // 过滤掉 objects 中已经是文件夹的项（避免与 commonPrefixes 重复）
      // 同时过滤掉名称为空的对象（通常是文件夹标记对象）
      // 注意：无论是否标记为目录，只要名称为空就过滤掉
      // 还要过滤掉那些 key 对应 commonPrefixes 中文件夹的对象（避免同名文件）
      // 特别注意：过滤掉所有以 / 结尾的 key（文件夹标记对象），因为文件夹已在 commonPrefixes 中表示
      const prefixSet = new Set(commonPrefixes);
      let newObjects = result.objects.filter(obj => {
        const hasValidName = obj.name && obj.name.trim() !== '';
        const isNotDirectory = !obj.isDirectory;
        // 检查是否是文件夹标记对象（key 在 commonPrefixes 中或以 / 结尾）
        const isNotFolderMarker = !prefixSet.has(obj.key) && !prefixSet.has(`${obj.key  }/`) && !obj.key.endsWith('/');
        return hasValidName && isNotDirectory && isNotFolderMarker;
      });

      logger.info(`📦 [S3Browser] 过滤后文件数: ${newObjects.length}`);

      // 添加文件夹（从 commonPrefixes）
      commonPrefixes.forEach(prefix => {
        logger.debug(`📦 [S3Browser] 处理前缀: "${prefix}", 当前路径: "${currentPath}"`);
        const folderName = prefix.replace(currentPath, '').replace(/\/$/, '');
        logger.debug(`📦 [S3Browser] 提取的文件夹名: "${folderName}"`);
        if (folderName) { // 确保文件夹名称不为空
          const folderObj = {
            key: prefix,
            name: folderName,
            size: 0,
            lastModified: new Date(),
            isDirectory: true,
          };
          logger.debug(`📦 [S3Browser] 添加文件夹对象:`, folderObj);
          newObjects.push(folderObj);
        } else {
          logger.warn(`📦 [S3Browser] 跳过空文件夹名: prefix="${prefix}", currentPath="${currentPath}"`);
        }
      });

      logger.info(`📦 [S3Browser] 合并后共 ${newObjects.length} 个项目（${commonPrefixes.length} 个文件夹 + ${result.objects.filter(o => !o.isDirectory).length} 个文件）`);

      // 过滤和排序
      if (!viewConfig.showHidden) {
        newObjects = newObjects.filter(obj => !obj.name.startsWith('.'));
      }

      if (searchTerm) {
        newObjects = newObjects.filter(obj =>
          obj.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      logger.info(`📦 [S3Browser] 过滤后共 ${newObjects.length} 个项目`);

      // 排序
      newObjects.sort((a, b) => {
        // 文件夹优先
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }

        const field = viewConfig.sortBy.field;
        const order = viewConfig.sortBy.order === 'asc' ? 1 : -1;

        switch (field) {
          case 'name':
            return a.name.localeCompare(b.name) * order;
          case 'size':
            return (a.size - b.size) * order;
          case 'lastModified':
            return (a.lastModified.getTime() - b.lastModified.getTime()) * order;
          default:
            return 0;
        }
      });

      if (append) {
        setObjects(prev => {
          const updated = [...prev, ...newObjects];
          logger.info(`📦 [S3Browser] 追加对象，总数: ${updated.length}`);
          return updated;
        });
      } else {
        logger.info(`📦 [S3Browser] 设置对象列表，共 ${newObjects.length} 个项目`);
        setObjects(newObjects);
      }

      setcontinuationToken(result.nextContinuationToken);
      setHasMore(result.isTruncated);
      logger.info(`📦 [S3Browser] 加载完成: hasMore=${result.isTruncated}, nextToken=${result.nextContinuationToken ? '有' : '无'}`);
    } catch (error) {
      logger.error(`📦 [S3Browser] 加载对象失败:`, error);
      showMessage.error(`${String(t('s3:error.load_objects_failed'))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    setSelectedObjects(new Set());
    setLastSelectedIndex(-1);
  };

  const handleObjectClick = async (object: S3Object) => {
    if (object.isDirectory) {
      // 如果当前在根级别（没有选择 bucket），则进入该 bucket
      if (!currentBucket) {
        logger.info(`📦 [S3Browser] 进入 bucket: ${object.name}`);
        setCurrentBucket(object.name);
        setCurrentPath('');
        setSelectedObjects(new Set());
        setLastSelectedIndex(-1);
      } else {
        // 否则进入文件夹
        logger.info(`📦 [S3Browser] 进入文件夹: ${object.key}`);
        navigateToPath(object.key);
      }
    } else {
      // 双击文件：预览
      await handlePreviewFile(object);
    }
  };

  // 判断文件是否可以预览
  const isPreviewableFile = (object: S3Object): boolean => {
    if (object.isDirectory) return false;
    const extension = object.name.split('.').pop()?.toLowerCase();
    const previewableExtensions = [
      // 图片
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp',
      // 视频
      'mp4', 'webm', 'ogg',
      // 音频
      'mp3', 'wav', 'ogg',
      // 文本
      'txt', 'md', 'json', 'xml', 'csv',
      // 代码
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'html', 'css',
      // Office
      'xlsx', 'xls', 'csv',
      // PDF
      'pdf',
    ];
    return previewableExtensions.includes(extension || '');
  };

  // 预览文件
  const handlePreviewFile = async (object: S3Object) => {
    if (!isPreviewableFile(object)) {
      // 不支持预览的文件类型，直接下载
      handleDownload([object]);
      return;
    }

    setPreviewObject(object);
    setShowPreviewDialog(true);
    setPreviewLoading(true);
    setPreviewContent(null);

    try {
      const extension = object.name.split('.').pop()?.toLowerCase();

      // 图片、视频、音频、PDF：使用 presigned URL
      if (
        isImageFile(object) ||
        isVideoFile(object) ||
        ['mp3', 'wav', 'ogg', 'pdf'].includes(extension || '')
      ) {
        const result = await S3Service.generatePresignedUrl(
          connectionId,
          currentBucket,
          object.key,
          'get',
          300
        );
        logger.info('Generated presigned URL for preview:', result.url);

        // 对于图片，使用blob URL以避免CORS和URL编码问题
        if (isImageFile(object)) {
          try {
            const data = await S3Service.downloadObject(connectionId, currentBucket, object.key);
            const blob = new Blob([data], { type: `image/${extension}` });
            const blobUrl = URL.createObjectURL(blob);
            setPreviewContent(blobUrl);
          } catch (error) {
            logger.error('Failed to load image as blob:', error);
            // 降级到直接使用presigned URL
            setPreviewContent(result.url);
          }
        } else {
          setPreviewContent(result.url);
        }
      }
      // 文本文件：下载并显示内容
      else if (
        ['txt', 'md', 'json', 'xml', 'csv', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'html', 'css'].includes(
          extension || ''
        )
      ) {
        const data = await S3Service.downloadObject(connectionId, currentBucket, object.key);
        const text = new TextDecoder('utf-8').decode(data);
        setPreviewContent(text);
      }
      // Excel 文件：解析并显示
      else if (['xlsx', 'xls'].includes(extension || '')) {
        const data = await S3Service.downloadObject(connectionId, currentBucket, object.key);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const html = XLSX.utils.sheet_to_html(firstSheet);
        setPreviewContent(html);
      }
    } catch (error) {
      logger.error(`Preview file failed:`, error);
      showMessage.error(`${String(t('s3:preview.failed'))}: ${error}`);
      setShowPreviewDialog(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleObjectSelect = (
    object: S3Object,
    index: number,
    event: React.MouseEvent | React.ChangeEvent
  ) => {
    const isCtrlOrCmd = 'ctrlKey' in event ? event.ctrlKey || event.metaKey : false;
    const isShift = 'shiftKey' in event ? event.shiftKey : false;

    let newSelection = new Set(selectedObjects);

    if (isShift && lastSelectedIndex !== -1) {
      // Shift + 点击：范围选择
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      newSelection = new Set(selectedObjects);
      for (let i = start; i <= end; i++) {
        if (objects[i]) {
          newSelection.add(objects[i].key);
        }
      }
    } else if (isCtrlOrCmd) {
      // Ctrl/Cmd + 点击：切换单个选择
      if (newSelection.has(object.key)) {
        newSelection.delete(object.key);
      } else {
        newSelection.add(object.key);
      }
      setLastSelectedIndex(index);
    } else {
      // 普通点击：只选中当前项（清除其他选择）
      newSelection = new Set([object.key]);
      setLastSelectedIndex(index);
    }

    setSelectedObjects(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedObjects(new Set(objects.map(obj => obj.key)));
    } else {
      setSelectedObjects(new Set());
    }
  };

  const handleUpload = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const key = currentPath + file.name;
        const data = await S3Service.fileToUint8Array(file);
        await S3Service.uploadObject(
          connectionId,
          currentBucket,
          key,
          data,
          file.type
        );
        successCount++;
      } catch (error) {
        failCount++;
        logger.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      showMessage.success(String(t('s3:upload.success', { count: successCount })));
      loadObjects();
    }

    if (failCount > 0) {
      showMessage.error(String(t('s3:upload.failed', { count: failCount })));
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (items?: S3Object[]) => {
    const toDownload = items || Array.from(selectedObjects)
      .map(key => objects.find(obj => obj.key === key))
      .filter(Boolean) as S3Object[];

    if (toDownload.length === 0) {
      showMessage.warning(String(t('s3:download.no_selection')));
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const object of toDownload) {
      if (object.isDirectory) continue;

      try {
        // 获取文件扩展名
        const extension = object.name.split('.').pop()?.toLowerCase() || '';

        // 显示原生文件保存对话框
        const dialogResult = await safeTauriInvoke<{ path?: string; name?: string } | null>(
          'save_file_dialog',
          {
            params: {
              default_path: object.name,
              filters: extension ? [
                { name: `${extension.toUpperCase()} Files`, extensions: [extension] },
                { name: 'All Files', extensions: ['*'] }
              ] : [
                { name: 'All Files', extensions: ['*'] }
              ]
            }
          }
        );

        // 用户取消了保存
        if (!dialogResult || !dialogResult.path) {
          continue;
        }

        // 使用原生下载方法保存到用户选择的路径
        await S3Service.downloadFile(
          connectionId,
          currentBucket,
          object.key,
          dialogResult.path
        );

        successCount++;
      } catch (error) {
        failCount++;
        logger.error(`Download failed for ${object.name}:`, error);
        showMessage.error(`${String(t('s3:download.failed', { name: object.name }))}: ${error}`);
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      showMessage.success(String(t('s3:download.success', { count: successCount })));
    }
  };

  const handleDelete = async () => {
    const toDelete = Array.from(selectedObjects);
    if (toDelete.length === 0) {
      showMessage.warning(String(t('s3:delete.no_selection')));
      return;
    }

    setShowDeleteConfirmDialog(false);
    setIsLoading(true);

    try {
      const deletedKeys = await S3Service.deleteObjects(
        connectionId,
        currentBucket,
        toDelete
      );
      showMessage.success(String(t('s3:delete.success', { count: deletedKeys.length })));
      setSelectedObjects(new Set());
      loadObjects();
    } catch (error) {
      showMessage.error(`${String(t('s3:delete.failed'))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 生成唯一的文件夹名称
  const generateUniqueFolderName = (baseName: string): string => {
    const existingNames = new Set(objects.map(obj => obj.name));

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let counter = 1;
    let newName = `${baseName} (${counter})`;
    while (existingNames.has(newName)) {
      counter++;
      newName = `${baseName} (${counter})`;
    }

    return newName;
  };

  const handleCreateFolder = async () => {
    if (!currentBucket) {
      showMessage.warning(String(t('s3:folder.select_bucket_first', { defaultValue: '请先选择存储桶' })));
      return;
    }

    setIsLoading(true);

    try {
      // 生成唯一的文件夹名称
      const baseName = String(t('s3:folder.default_name', { defaultValue: '新建文件夹' }));
      const uniqueName = generateUniqueFolderName(baseName);
      const folderPath = currentPath + uniqueName;

      // 确保路径以 / 结尾
      const folderKey = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

      // 创建文件夹（上传空对象）
      await S3Service.uploadObject(
        connectionId,
        currentBucket,
        folderKey,
        new Uint8Array(0),
        'application/x-directory'
      );

      showMessage.success(String(t('s3:folder.created_rename_tip', { defaultValue: '文件夹已创建，双击可重命名' })));

      // 重新加载对象列表
      await loadObjects();
    } catch (error) {
      logger.error('Create folder failed:', error);
      showMessage.error(`${String(t('s3:folder.create_failed'))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const items = Array.from(selectedObjects)
      .map(key => objects.find(obj => obj.key === key))
      .filter(Boolean) as S3Object[];

    setFileOperation({
      type: 'copy',
      items,
      sourceBucket: currentBucket,
    });
    showMessage.info(String(t('s3:copy.copied', { count: items.length })));
  };

  const handleCut = () => {
    const items = Array.from(selectedObjects)
      .map(key => objects.find(obj => obj.key === key))
      .filter(Boolean) as S3Object[];

    setFileOperation({
      type: 'cut',
      items,
      sourceBucket: currentBucket,
    });
    showMessage.info(String(t('s3:cut.cut', { count: items.length })));
  };

  const handlePaste = async () => {
    if (!fileOperation) {
      showMessage.warning(String(t('s3:paste.nothing')));
      return;
    }

    setIsLoading(true);

    for (const item of fileOperation.items) {
      let destKey = currentPath + item.name;

      // 如果是文件夹，确保目标 key 以 / 结尾
      if (item.isDirectory && !destKey.endsWith('/')) {
        destKey = `${destKey  }/`;
      }

      try {
        if (fileOperation.type === 'copy') {
          await S3Service.copyObject(
            connectionId,
            fileOperation.sourceBucket,
            item.key,
            currentBucket,
            destKey
          );
        } else {
          await S3Service.moveObject(
            connectionId,
            fileOperation.sourceBucket,
            item.key,
            currentBucket,
            destKey
          );
        }
      } catch (error) {
        showMessage.error(`${String(t('s3:paste.failed', { name: item.name }))}: ${error}`);
      }
    }

    setFileOperation(null);
    setIsLoading(false);
    loadObjects();
    showMessage.success(String(t('s3:paste.success')));
  };

  const handleGeneratePresignedUrl = async (object?: S3Object) => {
    let fullObject: S3Object | null = null;

    if (object) {
      // 如果直接传入了对象（如右键菜单），直接使用
      fullObject = object;
    } else if (selectedObjects.size === 1) {
      // 如果是通过选择触发的，从选中的对象中查找
      const selectedKey = Array.from(selectedObjects)[0];
      fullObject = objects.find(obj => obj.key === selectedKey) || null;
    }

    if (!fullObject) {
      showMessage.warning(String(t('s3:presigned_url.select_one')));
      return;
    }

    if (fullObject.isDirectory) {
      showMessage.warning(String(t('s3:presigned_url.only_files')));
      return;
    }

    // 设置对象并显示对话框，让用户设置过期时间
    setShareObject(fullObject);
    setPresignedUrl(''); // 清空之前的URL
    setShowPresignedUrlDialog(true);
  };

  // 生成分享链接
  const generateShareUrl = async () => {
    if (!shareObject || !currentBucket) return;

    try {
      // 计算过期秒数
      const expiresInSeconds = shareDays * 86400 + shareHours * 3600 + shareMinutes * 60;

      if (expiresInSeconds <= 0) {
        showMessage.warning(String(t('s3:presigned_url.invalid_time')));
        return;
      }

      const result = await S3Service.generatePresignedUrl(
        connectionId,
        currentBucket,
        shareObject.key,
        'get',
        expiresInSeconds
      );

      setPresignedUrl(result.url);

      // 计算过期时间
      const expireDate = new Date();
      expireDate.setSeconds(expireDate.getSeconds() + expiresInSeconds);
      setShareExpireTime(formatDate(expireDate));

      showMessage.success(String(t('s3:presigned_url.success')));
    } catch (error) {
      logger.error('生成预签名URL失败:', error);
      showMessage.error(`${String(t('s3:presigned_url.failed'))}: ${error}`);
    }
  };

  // 重命名处理
  const handleRename = (object: S3Object) => {
    setRenameObject(object);
    setNewName(object.name);
    setShowRenameDialog(true);
  };

  const handleRenameSubmit = async () => {
    if (!renameObject || !currentBucket || !newName.trim()) return;

    setIsLoading(true);
    try {
      const oldKey = renameObject.key;
      let newKey = currentPath + newName;

      // 如果是文件夹，确保新的 key 以 / 结尾
      if (renameObject.isDirectory && !newKey.endsWith('/')) {
        newKey = `${newKey  }/`;
      }

      // 复制到新位置
      await S3Service.copyObject(
        connectionId,
        currentBucket,
        oldKey,
        currentBucket,
        newKey
      );

      // 删除旧对象
      await S3Service.deleteObject(connectionId, currentBucket, oldKey);

      showMessage.success(String(t('s3:rename.success', { defaultValue: '重命名成功' })));
      setShowRenameDialog(false);
      setRenameObject(null);
      setNewName('');
      loadObjects();
    } catch (error) {
      logger.error('Rename failed:', error);
      showMessage.error(`${String(t('s3:rename.failed', { defaultValue: '重命名失败' }))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新处理
  const handleRefresh = () => {
    if (!currentBucket) {
      loadBuckets();
    } else {
      loadObjects();
    }
  };

  // 拖放处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 根目录不允许上传
    if (!currentBucket) return;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // 根目录不允许上传
    if (!currentBucket) {
      showMessage.warning(String(t('s3:upload.no_bucket', { defaultValue: '请先选择存储桶' })));
      return;
    }

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const uploadKey = currentPath ? `${currentPath}${file.name}` : file.name;
        const data = await S3Service.fileToUint8Array(file);
        await S3Service.uploadObject(
          connectionId,
          currentBucket,
          uploadKey,
          data,
          file.type || 'application/octet-stream'
        );
        successCount++;
      } catch (error) {
        failCount++;
        logger.error('Upload file failed:', error);
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      showMessage.success(String(t('s3:upload.success', { count: successCount })));
      loadObjects();
    }

    if (failCount > 0) {
      showMessage.error(String(t('s3:upload.failed', { count: failCount })));
    }
  };

  // 框选处理
  const handleMouseDown = (e: React.MouseEvent) => {
    // 如果正在调整列宽，不触发框选
    if (resizingColumn.current) return;

    // 只在空白区域开始框选
    if ((e.target as HTMLElement).closest('.object-item')) return;

    // 不在表头区域触发框选（避免干扰列宽调整）
    if ((e.target as HTMLElement).closest('thead')) return;
    if ((e.target as HTMLElement).closest('.column-resizer')) return;

    // 右键不触发框选
    if (e.button !== 0) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsSelecting(true);
    setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 如果正在调整列宽，不处理框选移动
    if (resizingColumn.current) return;

    if (!isSelecting || !selectionStart) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSelectionEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // 计算选择框覆盖的对象
    const selectionBox = {
      left: Math.min(selectionStart.x, e.clientX - rect.left),
      right: Math.max(selectionStart.x, e.clientX - rect.left),
      top: Math.min(selectionStart.y, e.clientY - rect.top),
      bottom: Math.max(selectionStart.y, e.clientY - rect.top),
    };

    const newSelected = new Set<string>();
    const itemElements = containerRef.current?.querySelectorAll('.object-item');

    itemElements?.forEach((el, index) => {
      const itemRect = el.getBoundingClientRect();
      const relativeRect = {
        left: itemRect.left - rect.left,
        right: itemRect.right - rect.left,
        top: itemRect.top - rect.top,
        bottom: itemRect.bottom - rect.top,
      };

      // 检查是否与选择框相交
      if (
        relativeRect.left < selectionBox.right &&
        relativeRect.right > selectionBox.left &&
        relativeRect.top < selectionBox.bottom &&
        relativeRect.bottom > selectionBox.top
      ) {
        if (objects[index]) {
          newSelected.add(objects[index].key);
        }
      }
    });

    setSelectedObjects(newSelected);
  };

  const handleMouseUp = () => {
    // 如果正在调整列宽，不处理框选结束
    if (resizingColumn.current) return;

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // 获取对象标签
  const fetchObjectTags = async (object: S3Object) => {
    if (!currentBucket || object.isDirectory) return;

    setTagsLoading(true);
    try {
      const tags = await S3Service.getObjectTagging(connectionId, currentBucket, object.key);
      const tagsArray = Object.entries(tags).map(([key, value]) => ({ key, value }));
      setObjectTags(tagsArray);
    } catch (error) {
      logger.error('获取标签失败:', error);
      setObjectTags([]);
    } finally {
      setTagsLoading(false);
    }
  };

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, object: S3Object) => {
    e.preventDefault();
    e.stopPropagation();

    // 如果右键的对象不在已选中列表中，只选中这一个
    if (!selectedObjects.has(object.key)) {
      setSelectedObjects(new Set([object.key]));
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      object,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, object: null });
  };

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    const handleScroll = () => closeContextMenu();

    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      document.addEventListener('scroll', handleScroll, true);
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [contextMenu.visible]);

  // 清理blob URL以避免内存泄漏
  useEffect(() => {
    if (!showPreviewDialog && previewContent && previewContent.startsWith('blob:')) {
      URL.revokeObjectURL(previewContent);
    }
  }, [showPreviewDialog, previewContent]);

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // 根目录
    items.push({ label: connectionName, path: '', isBucket: false });

    // 如果在某个 bucket 内
    if (currentBucket) {
      items.push({ label: currentBucket, path: '', isBucket: true });

      // 如果有路径
      if (currentPath) {
        const parts = currentPath.split('/').filter(Boolean);
        let path = '';
        for (const part of parts) {
          path += `${part  }/`;
          items.push({ label: part, path, isBucket: false });
        }
      }
    }

    return items;
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem, index: number) => {
    if (index === 0) {
      // 返回根目录（显示所有 buckets）
      logger.info(`📦 [S3Browser] 返回根目录`);
      setCurrentBucket('');
      setCurrentPath('');
      setSelectedObjects(new Set());
      setLastSelectedIndex(-1);
    } else if (item.isBucket) {
      // 返回 bucket 根目录
      logger.info(`📦 [S3Browser] 返回 bucket 根目录: ${item.label}`);
      setCurrentPath('');
      setSelectedObjects(new Set());
      setLastSelectedIndex(-1);
    } else {
      // 导航到指定路径
      logger.info(`📦 [S3Browser] 导航到路径: ${item.path}`);
      navigateToPath(item.path);
    }
  };

  // 列宽调整处理函数
  const handleColumnResizeStart = (columnName: string, nextColumnName: string | null, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡，避免触发容器的框选功能
    resizingColumn.current = columnName;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnName as keyof typeof columnWidths];

    // 保存下一列的初始宽度（如果存在）
    const nextColumnStartWidth = nextColumnName
      ? columnWidths[nextColumnName as keyof typeof columnWidths]
      : 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn.current) return;

      const diff = e.clientX - startX.current;
      const newWidth = Math.max(80, startWidth.current + diff); // 最小宽度 80px

      // 如果有下一列，同时调整下一列的宽度（保持总宽度不变）
      if (nextColumnName) {
        const nextNewWidth = Math.max(80, nextColumnStartWidth - diff);

        // 只有当两列都满足最小宽度要求时才更新
        if (newWidth >= 80 && nextNewWidth >= 80) {
          setColumnWidths(prev => ({
            ...prev,
            [resizingColumn.current!]: newWidth,
            [nextColumnName]: nextNewWidth,
          }));
        }
      } else {
        // 如果没有下一列（最后一列），只调整当前列
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn.current!]: newWidth,
        }));
      }
    };

    const handleMouseUp = () => {
      resizingColumn.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };


  return (
    <div className="s3-browser h-full flex flex-col">
      {/* 工具栏 */}
      <div className="toolbar p-2 border-b flex items-center gap-2">
        <div className="flex-1" />

        {/* 操作按钮 */}
        <Button size="sm" variant="ghost" onClick={handleUpload} disabled={!currentBucket}>
          <Upload className="w-4 h-4 mr-1" />
          {t('s3:upload.label')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDownload()}
          disabled={selectedObjects.size === 0}
        >
          <Download className="w-4 h-4 mr-1" />
          {t('s3:download.label')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleCreateFolder}
          disabled={!currentBucket}
        >
          <FolderPlus className="w-4 h-4 mr-1" />
          {t('s3:new_folder')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowDeleteConfirmDialog(true)}
          disabled={selectedObjects.size === 0}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('s3:delete.label')}
        </Button>

        <Button size="sm" variant="ghost" onClick={() => loadObjects()}>
          <RefreshCw className="w-4 h-4" />
        </Button>

        {/* 更多操作 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleCopy} disabled={selectedObjects.size === 0}>
              <Copy className="w-4 h-4 mr-2" />
              {t('s3:copy.label')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCut} disabled={selectedObjects.size === 0}>
              <Scissors className="w-4 h-4 mr-2" />
              {t('s3:cut.label')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePaste} disabled={!fileOperation}>
              <Clipboard className="w-4 h-4 mr-2" />
              {t('s3:paste.label')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleGeneratePresignedUrl()}
              disabled={selectedObjects.size !== 1}
            >
              <Link className="w-4 h-4 mr-2" />
              {t('s3:generate_link')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 视图切换 */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={viewConfig.viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() => setViewConfig(prev => ({ ...prev, viewMode: 'list' }))}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={viewConfig.viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() => setViewConfig(prev => ({ ...prev, viewMode: 'grid' }))}
          >
            <Grid className="w-4 h-4" />
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 w-48 h-9"
            placeholder={t('s3:search')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 面包屑导航 */}
      <div className="breadcrumbs">
        {getBreadcrumbs().map((item, index) => (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <button
              className="hover:underline hover:text-primary flex items-center gap-1 text-sm py-0"
              onClick={() => handleBreadcrumbClick(item, index)}
            >
              {index === 0 && <Home className="w-3.5 h-3.5" />}
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* 文件列表 */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center pointer-events-none">
            <div className="text-lg font-semibold text-primary">
              {t('s3:upload.drop_here', { defaultValue: '释放文件以上传' })}
            </div>
          </div>
        )}
        {isSelecting && selectionStart && selectionEnd && (
          <div
            className="absolute border-2 border-primary bg-primary/10 pointer-events-none z-40"
            style={{
              left: Math.min(selectionStart.x, selectionEnd.x),
              top: Math.min(selectionStart.y, selectionEnd.y),
              width: Math.abs(selectionEnd.x - selectionStart.x),
              height: Math.abs(selectionEnd.y - selectionStart.y),
            }}
          />
        )}
        <ScrollArea ref={scrollAreaRef} className="h-full">
        {viewConfig.viewMode === 'list' ? (
          <table className="w-full">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b">
                <th className="text-left p-2 w-8">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={objects.length > 0 && selectedObjects.size === objects.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </div>
                </th>
                <th className="text-left p-2" style={{ width: columnWidths.name }}>
                  <div className="flex items-center">
                    <span>{t('s3:name')}</span>
                    <div
                      className="column-resizer"
                      onMouseDown={(e) => handleColumnResizeStart('name', 'size', e)}
                    />
                  </div>
                </th>
                <th className="text-left p-2" style={{ width: columnWidths.size }}>
                  <div className="flex items-center">
                    <span>{t('s3:size')}</span>
                    <div
                      className="column-resizer"
                      onMouseDown={(e) => handleColumnResizeStart('size', !currentBucket ? 'count' : 'modified', e)}
                    />
                  </div>
                </th>
                {/* 在根目录显示文件数量列 */}
                {!currentBucket && (
                  <th className="text-left p-2" style={{ width: columnWidths.count }}>
                    <div className="flex items-center">
                      <span>{t('s3:object_count', { defaultValue: '对象数量' })}</span>
                      <div
                        className="column-resizer"
                        onMouseDown={(e) => handleColumnResizeStart('count', 'modified', e)}
                      />
                    </div>
                  </th>
                )}
                {/* 在非根目录（bucket 内）显示标签列 */}
                {currentBucket && (
                  <th className="text-left p-2" style={{ width: columnWidths.tags }}>
                    <div className="flex items-center">
                      <span>{t('s3:tags', { defaultValue: '标签' })}</span>
                      <div
                        className="column-resizer"
                        onMouseDown={(e) => handleColumnResizeStart('tags', 'modified', e)}
                      />
                    </div>
                  </th>
                )}
                <th className="text-left p-2" style={{ width: columnWidths.modified }}>
                  <div className="flex items-center">
                    <span>{t('s3:modified')}</span>
                    <div
                      className="column-resizer"
                      onMouseDown={(e) => handleColumnResizeStart('modified', null, e)}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {objects.map((object, index) => (
                <tr
                  key={object.key}
                  className="border-b hover:bg-muted/50 cursor-pointer object-item"
                  onClick={(e) => {
                    // 如果点击的是 checkbox，不触发行选择
                    if ((e.target as HTMLElement).closest('button[role="checkbox"]')) {
                      return;
                    }
                    handleObjectSelect(object, index, e);
                  }}
                  onDoubleClick={() => handleObjectClick(object)}
                  onContextMenu={(e) => handleContextMenu(e, object)}
                >
                  <td className="p-2">
                    <div className="flex items-center justify-center h-full">
                      <Checkbox
                        checked={selectedObjects.has(object.key)}
                        onCheckedChange={(checked) => {
                          // Checkbox 点击时模拟一个带 Ctrl 键的事件（切换选择）
                          const syntheticEvent = {
                            ctrlKey: true,
                            metaKey: false,
                            shiftKey: false,
                          } as React.MouseEvent;
                          handleObjectSelect(object, index, syntheticEvent);
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </td>
                  <td className="p-2" style={{ width: columnWidths.name }}>
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(object)}
                      <span className="truncate" title={object.name}>{object.name}</span>
                    </div>
                  </td>
                  <td className="p-2" style={{ width: columnWidths.size }}>
                    <span className="truncate block" title={object.isDirectory ? '-' : formatBytes(object.size)}>
                      {object.isDirectory ? '-' : formatBytes(object.size)}
                    </span>
                  </td>
                  {/* 在根目录显示文件数量 */}
                  {!currentBucket && (
                    <td className="p-2" style={{ width: columnWidths.count }}>
                      <span className="truncate block">
                        {object.objectCount !== undefined ? object.objectCount : '-'}
                      </span>
                    </td>
                  )}
                  {/* 在 bucket 内显示标签 */}
                  {currentBucket && (
                    <td className="p-2" style={{ width: columnWidths.tags }}>
                      {object.tags && Object.keys(object.tags).length > 0 ? (
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {Object.entries(object.tags).slice(0, 2).map(([key, value]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary truncate"
                              title={`${key}: ${value}`}
                            >
                              {key}
                            </span>
                          ))}
                          {Object.keys(object.tags).length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                              +{Object.keys(object.tags).length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </td>
                  )}
                  <td className="p-2" style={{ width: columnWidths.modified }}>
                    <span className="truncate block" title={formatDate(object.lastModified)}>
                      {formatDate(object.lastModified)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-6 gap-2 p-2">
            {objects.map((object, index) => (
              <ContextMenu key={object.key}>
                <ContextMenuTrigger asChild>
                  <div
                    className={`
                      flex flex-col items-center p-4 rounded-lg cursor-pointer object-item
                      hover:bg-muted/50 transition-colors
                      ${selectedObjects.has(object.key) ? 'bg-muted' : ''}
                    `}
                    onDoubleClick={() => handleObjectClick(object)}
                    onClick={(e) => handleObjectSelect(object, index, e)}
                  >
                    <div className="w-full mb-2 flex items-center justify-center min-h-[96px]">
                      {object.isDirectory ? (
                        <FolderOpen className="w-12 h-12" />
                      ) : (isImageFile(object) || isVideoFile(object)) ? (
                        <FileThumbnail
                          object={object}
                          connectionId={connectionId}
                          currentBucket={currentBucket}
                          viewMode={viewConfig.viewMode}
                        />
                      ) : (
                        <div className="text-4xl">
                          {getFileIcon(object)}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-center truncate w-full" title={object.name}>
                      {object.name}
                    </div>
                    {!object.isDirectory && (
                      <div className="text-xs text-muted-foreground">
                        {formatBytes(object.size)}
                      </div>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {currentBucket && (
                    <>
                      <ContextMenuItem onClick={() => handleRename(object)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        {t('s3:rename.label', { defaultValue: '重命名' })}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                    </>
                  )}
                  <ContextMenuItem onClick={() => handleDownload([object])}>
                    <Download className="w-4 h-4 mr-2" />
                    {t('s3:download.label', { defaultValue: '下载' })}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    {t('s3:copy.label', { defaultValue: '复制' })}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={handleCut}>
                    <Scissors className="w-4 h-4 mr-2" />
                    {t('s3:cut.label', { defaultValue: '剪切' })}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => setShowDeleteConfirmDialog(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('s3:delete.label', { defaultValue: '删除' })}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}

        {/* 无限滚动触发器 */}
        {hasMore && (
          <div ref={loadMoreTriggerRef} className="text-center p-4">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">{t('common:loading')}</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('s3:scroll_to_load_more', { defaultValue: '向下滚动加载更多' })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      </div>

      {/* 状态栏 */}
      <div className="statusbar px-2 py-1 border-t text-sm text-muted-foreground flex justify-between">
        <span>
          {t('s3:items', { count: objects.length })}
          {selectedObjects.size > 0 && ` | ${t('s3:selected', { count: selectedObjects.size })}`}
        </span>
        <span>{connectionName}</span>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('s3:delete.confirm_title')}</DialogTitle>
            <DialogDescription>
              {t('s3:delete.confirm_message', { count: selectedObjects.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>
              {String(t('common:cancel'))}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {String(t('common:delete'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预签名URL对话框 */}
      <Dialog
        open={showPresignedUrlDialog}
        onOpenChange={(open) => {
          setShowPresignedUrlDialog(open);
          if (!open) {
            // 关闭时重置状态
            setPresignedUrl('');
            setShareObject(null);
            setShareDays(0);
            setShareHours(12);
            setShareMinutes(0);
            setShareExpireTime('');
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              {t('s3:presigned_url.title')}
            </DialogTitle>
            <DialogDescription>{t('s3:presigned_url.description')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 过期时间设置 */}
            <div className="space-y-2">
              <Label>{t('s3:presigned_url.active_for')}</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={shareDays}
                    onChange={(e) => setShareDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('s3:presigned_url.days')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={shareHours}
                    onChange={(e) => setShareHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('s3:presigned_url.hours')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={shareMinutes}
                    onChange={(e) => setShareMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('s3:presigned_url.minutes')}
                  </span>
                </div>
              </div>
            </div>

            {/* 显示过期时间 */}
            {shareExpireTime && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Link className="w-4 h-4" />
                {t('s3:presigned_url.expire_at')}: {shareExpireTime}
              </div>
            )}

            {/* 生成的URL */}
            {presignedUrl && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    value={presignedUrl}
                    readOnly
                    className="font-mono text-xs pr-10"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1 h-7 w-7 p-0"
                    onClick={() => {
                      navigator.clipboard.writeText(presignedUrl);
                      showMessage.success(String(t('common:copied')));
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPresignedUrlDialog(false)}>
              {String(t('common:close'))}
            </Button>
            {!presignedUrl ? (
              <Button onClick={generateShareUrl}>
                {String(t('s3:presigned_url.generate'))}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(presignedUrl);
                  showMessage.success(String(t('common:copied')));
                }}
              >
                {String(t('common:copy'))}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 文件预览对话框 */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewObject?.name || ''}</DialogTitle>
            <DialogDescription>
              {previewObject && (
                <>
                  {formatBytes(previewObject.size)}
                  {previewObject.lastModified && (
                    <> • {previewObject.lastModified.toLocaleString()}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] w-full">
            {previewLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
            ) : previewObject && previewContent ? (
              <div className="w-full">
                {/* 图片预览 */}
                {isImageFile(previewObject) && (
                  <img
                    src={previewContent}
                    alt={previewObject.name}
                    className="w-full h-auto rounded-md"
                  />
                )}

                {/* 视频预览 */}
                {isVideoFile(previewObject) && (
                  <video
                    src={previewContent}
                    controls
                    className="w-full h-auto rounded-md"
                  />
                )}

                {/* 音频预览 */}
                {['mp3', 'wav', 'ogg'].includes(
                  previewObject.name.split('.').pop()?.toLowerCase() || ''
                ) && (
                  <audio src={previewContent} controls className="w-full" />
                )}

                {/* PDF预览 */}
                {previewObject.name.endsWith('.pdf') && (
                  <iframe
                    src={previewContent}
                    className="w-full h-[600px] rounded-md"
                    title="PDF Preview"
                  />
                )}

                {/* 文本/代码预览 */}
                {['txt', 'md', 'json', 'xml', 'csv', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'html', 'css'].includes(
                  previewObject.name.split('.').pop()?.toLowerCase() || ''
                ) && (
                  <pre className="p-4 bg-muted rounded-md overflow-auto text-sm">
                    <code>{previewContent}</code>
                  </pre>
                )}

                {/* Excel预览 */}
                {['xlsx', 'xls'].includes(
                  previewObject.name.split('.').pop()?.toLowerCase() || ''
                ) && (
                  <div
                    className="overflow-auto"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                )}
              </div>
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                {t('s3:preview.no_content', { defaultValue: '无法预览此文件' })}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => previewObject && handleDownload([previewObject])}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('s3:download.label')}
            </Button>
            <Button onClick={() => setShowPreviewDialog(false)}>
              {String(t('common:close'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('s3:rename.title', { defaultValue: '重命名' })}</DialogTitle>
            <DialogDescription>
              {t('s3:rename.description', { defaultValue: '请输入新的名称' })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('s3:rename.placeholder', { defaultValue: '输入新名称' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              {String(t('common:cancel'))}
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newName.trim()}>
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 权限设置对话框 */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('s3:permissions.title', { defaultValue: '设置权限' })}</DialogTitle>
            <DialogDescription>
              {permissionsObject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={selectedAcl} onValueChange={(value: any) => setSelectedAcl(value)}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="font-normal cursor-pointer flex-1">
                  {t('s3:permissions.private', { defaultValue: '私有（仅所有者可读写）' })}
                </Label>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="public-read" id="public-read" />
                <Label htmlFor="public-read" className="font-normal cursor-pointer flex-1">
                  {t('s3:permissions.public_read', { defaultValue: '公开读（所有人可读）' })}
                </Label>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="public-read-write" id="public-read-write" />
                <Label htmlFor="public-read-write" className="font-normal cursor-pointer flex-1">
                  {t('s3:permissions.public_read_write', { defaultValue: '公开读写（所有人可读写）' })}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="authenticated-read" id="authenticated-read" />
                <Label htmlFor="authenticated-read" className="font-normal cursor-pointer flex-1">
                  {t('s3:permissions.authenticated_read', { defaultValue: '授权读（已认证用户可读）' })}
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsDialog(false)}>
              {String(t('common:cancel'))}
            </Button>
            <Button onClick={async () => {
              if (!permissionsObject || !currentBucket) return;

              try {
                await S3Service.putObjectAcl(
                  connectionId,
                  currentBucket,
                  permissionsObject.key,
                  selectedAcl
                );
                showMessage.success(String(t('s3:permissions.success')));
                setShowPermissionsDialog(false);
                await loadObjects(); // 重新加载以更新对象信息
              } catch (error) {
                logger.error('设置权限失败:', error);
                showMessage.error(String(t('s3:permissions.failed')));
              }
            }}>
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags 管理对话框 */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('s3:tags_mgmt.title', { defaultValue: '管理标签' })}</DialogTitle>
            <DialogDescription>
              {tagsObject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {tagsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">
                    {t('s3:tags_mgmt.loading', { defaultValue: '正在加载标签...' })}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {objectTags.length > 0 ? (
                  objectTags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={t('s3:tags_mgmt.key_placeholder', { defaultValue: '输入标签键' })}
                        value={tag.key}
                        onChange={(e) => {
                          const newTags = [...objectTags];
                          newTags[index].key = e.target.value;
                          setObjectTags(newTags);
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder={t('s3:tags_mgmt.value_placeholder', { defaultValue: '输入标签值' })}
                        value={tag.value}
                        onChange={(e) => {
                          const newTags = [...objectTags];
                          newTags[index].value = e.target.value;
                          setObjectTags(newTags);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newTags = objectTags.filter((_, i) => i !== index);
                          setObjectTags(newTags);
                        }}
                      >
                        {t('s3:tags_mgmt.remove', { defaultValue: '移除' })}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    {t('s3:tags_mgmt.no_tags', { defaultValue: '无标签' })}
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setObjectTags([...objectTags, { key: '', value: '' }]);
                  }}
                  className="w-full"
                >
                  + {t('s3:tags_mgmt.add', { defaultValue: '添加标签' })}
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTagsDialog(false)}>
              {String(t('common:cancel'))}
            </Button>
            <Button onClick={async () => {
              if (!tagsObject || !currentBucket) return;

              try {
                // 将数组形式的tags转换为对象
                const tagsMap: Record<string, string> = {};
                objectTags.forEach(tag => {
                  if (tag.key.trim() && tag.value.trim()) {
                    tagsMap[tag.key.trim()] = tag.value.trim();
                  }
                });

                await S3Service.putObjectTagging(
                  connectionId,
                  currentBucket,
                  tagsObject.key,
                  tagsMap
                );

                // 更新本地对象状态以显示标签
                setObjects(prevObjects =>
                  prevObjects.map(obj =>
                    obj.key === tagsObject.key
                      ? { ...obj, tags: tagsMap }
                      : obj
                  )
                );

                showMessage.success(String(t('s3:tags_mgmt.success')));
                setShowTagsDialog(false);
              } catch (error) {
                logger.error('设置标签失败:', error);
                showMessage.error(String(t('s3:tags_mgmt.failed')));
              }
            }}>
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 自定义右键菜单 */}
      {contextMenu.visible && contextMenu.object && (
        <div
          className="fixed bg-background border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 重命名 - 文件和文件夹都有 */}
          {currentBucket && (
            <>
              <div
                className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm"
                onClick={() => {
                  handleRename(contextMenu.object!);
                  closeContextMenu();
                }}
              >
                <Edit2 className="w-4 h-4" />
                {t('s3:rename.label', { defaultValue: '重命名' })}
              </div>
              <div className="h-px bg-border my-1" />
            </>
          )}

          {/* 下载 - 文件和文件夹都有 */}
          <div
            className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm"
            onClick={() => {
              handleDownload([contextMenu.object!]);
              closeContextMenu();
            }}
          >
            <Download className="w-4 h-4" />
            {t('s3:download.label', { defaultValue: '下载' })}
          </div>

          {/* 文件特有的菜单项 */}
          {!contextMenu.object.isDirectory && (
            <>
              {/* 预览 */}
              <div
                className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm"
                onClick={() => {
                  setPreviewObject(contextMenu.object);
                  setShowPreviewDialog(true);
                  closeContextMenu();
                }}
              >
                <Eye className="w-4 h-4" />
                {t('s3:preview.label', { defaultValue: '预览' })}
              </div>

              {/* 创建分享链接 */}
              <div
                className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm"
                onClick={() => {
                  handleGeneratePresignedUrl(contextMenu.object || undefined);
                  closeContextMenu();
                }}
              >
                <Link className="w-4 h-4" />
                {t('s3:generate_link', { defaultValue: '生成分享链接' })}
              </div>

              {/* 设置标签 */}
              <div
                className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm"
                onClick={async () => {
                  setTagsObject(contextMenu.object);
                  setShowTagsDialog(true);
                  closeContextMenu();
                  // 异步获取标签
                  if (contextMenu.object) {
                    await fetchObjectTags(contextMenu.object);
                  }
                }}
              >
                <Tag className="w-4 h-4" />
                {t('s3:tags_mgmt.label', { defaultValue: '管理标签' })}
              </div>
            </>
          )}

          {/* 文件夹特有的菜单项 */}
          {contextMenu.object.isDirectory && (
            <>
              {/* 设置权限 */}
              <div
                className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm"
                onClick={() => {
                  setPermissionsObject(contextMenu.object);
                  setSelectedAcl(contextMenu.object!.acl || 'private');
                  setShowPermissionsDialog(true);
                  closeContextMenu();
                }}
              >
                <Shield className="w-4 h-4" />
                {t('s3:permissions.label', { defaultValue: '设置权限' })}
              </div>
            </>
          )}

          <div className="h-px bg-border my-1" />

          {/* 删除 - 文件和文件夹都有 */}
          <div
            className="px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm text-destructive"
            onClick={() => {
              setShowDeleteConfirmDialog(true);
              closeContextMenu();
            }}
          >
            <Trash2 className="w-4 h-4" />
            {t('s3:delete.label', { defaultValue: '删除' })}
          </div>
        </div>
      )}
    </div>
  );
};

export default S3Browser;