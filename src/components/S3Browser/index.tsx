import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ScrollBar,
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
  Image as ImageIcon,
  Video,
  Music,
  Code,
  Table,
  Clock,
  HardDrive,
  Share2,
  FileX,
} from 'lucide-react';
import { S3Service } from '@/services/s3Service';
import { showMessage } from '@/utils/message';
import { formatBytes, formatDate } from '@/utils/format';
import { t } from '@/i18n/translate';
import type { S3Object, S3Bucket, S3BrowserViewConfig, S3Provider } from '@/types/s3';
import { getProviderCapabilities, isFeatureSupported, getSupportedAcls } from '@/types/s3-provider';
import './S3Browser.css';
import logger from '@/utils/logger';
import { safeTauriInvoke } from '@/utils/tauri';
import { open as openInBrowser } from '@tauri-apps/plugin-shell';
import { useConnectionStore } from '@/store/connection';

// 导入重构后的模块
import {
  isImageFile,
  isVideoFile,
  isPreviewableFile,
  getFileExtension,
  parseBreadcrumbs,
  buildObjectPath,
} from './utils/fileHelpers';
import { FileThumbnail, getFileIcon } from './components/FileThumbnail';
import { setupPreviewNavigationGuard, cleanupNavigationGuard, type NavigationGuardCleanup } from './utils/navigationGuard';
import { generatePreviewContent, loadObjectTags, cleanupBlobUrl } from './utils/previewHandler';
import { VideoPlayer } from './components/VideoPlayer';
import { VideoInfo } from './components/VideoInfo';
import { VideoPlaylist } from './components/VideoPlaylist';
import { VideoFilter } from './components/VideoFilter';
import {
  createPlaylistFromFolder,
  shuffleArray,
  extractUsedFormats,
  filterVideos,
  type VideoFilterOptions,
} from './utils/videoHelpers';

// ============================================================================
// 模块级别的加载状态管理（跨组件实例共享）
// ============================================================================
interface ConnectionLoadingState {
  isLoadingBuckets: boolean;
  loadSession: number;
  bucketStatsRequests: Map<string, boolean>;
  permissionFailureCache: Set<string>;
  objectPermissionsSession: number;
}

// 使用 Map 存储每个连接的加载状态
const connectionLoadingStates = new Map<string, ConnectionLoadingState>();

// 获取或创建连接的加载状态
function getConnectionLoadingState(connectionId: string): ConnectionLoadingState {
  if (!connectionLoadingStates.has(connectionId)) {
    connectionLoadingStates.set(connectionId, {
      isLoadingBuckets: false,
      loadSession: 0,
      bucketStatsRequests: new Map(),
      permissionFailureCache: new Set(),
      objectPermissionsSession: 0,
    });
  }
  return connectionLoadingStates.get(connectionId)!;
}

// 清理连接的加载状态（当连接断开时调用）
export function clearConnectionLoadingState(connectionId: string): void {
  connectionLoadingStates.delete(connectionId);
  logger.info(`📦 [S3Browser] 清理连接 ${connectionId} 的加载状态`);
}

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

const S3Browser: React.FC<S3BrowserProps> = ({
  connectionId,
  connectionName = 'S3',
}) => {
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [currentBucket, setCurrentBucket] = useState<string>(''); // 当前所在的 bucket
  const [currentPath, setCurrentPath] = useState<string>(''); // 当前路径（bucket内的路径）
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(
    new Set()
  );
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
    permissions: 150, // bucket 权限列
    modified: 200,
  });

  // 分页相关
  const [continuationToken, setcontinuationToken] = useState<
    string | undefined
  >();
  const [hasMore, setHasMore] = useState(false);

  // 文件操作
  const [fileOperation, setFileOperation] = useState<FileOperation | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 无限滚动加载
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 预览内容引用
  const previewContentRef = useRef<HTMLDivElement>(null);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);
  const excelIframeRef = useRef<HTMLIFrameElement>(null);

  // 列宽调整
  const resizingColumn = useRef<string | null>(null);
  const nextResizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const nextStartWidth = useRef<number>(0);

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
  const [previewProgress, setPreviewProgress] = useState<string>('');
  const [showShareInPreview, setShowShareInPreview] = useState(false);
  const [currentTempFile, setCurrentTempFile] = useState<string | null>(null);

  // 视频播放状态
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [videoPlaylist, setVideoPlaylist] = useState<S3Object[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideoInfo, setShowVideoInfo] = useState(true);
  const [showVideoPlaylist, setShowVideoPlaylist] = useState(false);
  const [showVideoFilter, setShowVideoFilter] = useState(false);
  const [videoFilterOptions, setVideoFilterOptions] = useState<VideoFilterOptions>({});
  const [filteredVideos, setFilteredVideos] = useState<S3Object[]>([]);

  // 重命名状态
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameObject, setRenameObject] = useState<S3Object | null>(null);
  const [newName, setNewName] = useState('');

  // 创建bucket对话框状态
  const [showCreateBucketDialog, setShowCreateBucketDialog] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [bucketNameError, setBucketNameError] = useState('');

  // 创建文件夹对话框状态
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderNameError, setFolderNameError] = useState('');

  // 框选状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    x: number;
    y: number;
  } | null>(null);
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
  const [permissionsObject, setPermissionsObject] = useState<S3Object | null>(
    null
  );
  const [selectedAcl, setSelectedAcl] = useState<
    'private' | 'public-read' | 'public-read-write' | 'authenticated-read'
  >('private');

  // Tags 管理对话框状态
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [tagsObject, setTagsObject] = useState<S3Object | null>(null);
  const [objectTags, setObjectTags] = useState<
    Array<{ key: string; value: string }>
  >([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // 获取当前连接的加载状态（模块级别，跨组件实例共享）
  // 这样即使组件被卸载并重新挂载，加载状态也不会丢失
  const loadingStateRef = useRef(getConnectionLoadingState(connectionId));

  // 为了方便访问，创建快捷引用
  const isLoadingBucketsRef = {
    get current() { return loadingStateRef.current.isLoadingBuckets; },
    set current(value: boolean) { loadingStateRef.current.isLoadingBuckets = value; }
  };
  const loadSessionRef = {
    get current() { return loadingStateRef.current.loadSession; },
    set current(value: number) { loadingStateRef.current.loadSession = value; }
  };
  const bucketStatsRequestsRef = {
    get current() { return loadingStateRef.current.bucketStatsRequests; }
  };
  const permissionFailureCacheRef = {
    get current() { return loadingStateRef.current.permissionFailureCache; }
  };
  const objectPermissionsSessionRef = {
    get current() { return loadingStateRef.current.objectPermissionsSession; },
    set current(value: number) { loadingStateRef.current.objectPermissionsSession = value; }
  };

  // 获取连接配置和服务商类型
  const { getConnection } = useConnectionStore();
  const connection = getConnection(connectionId);
  const provider = (connection?.driverConfig?.s3?.provider || 's3') as S3Provider;
  const capabilities = getProviderCapabilities(provider);
  const allSupportedAcls = getSupportedAcls(provider);

  // 根据对象类型获取可用的 ACL 选项
  // Bucket: 所有服务商支持的 ACL（包括 authenticated-read）
  // 文件夹/对象: 只有 private, public-read, public-read-write
  const getAvailableAcls = (isBucket: boolean) => {
    if (isBucket) {
      return allSupportedAcls;
    } else {
      // 对象和文件夹只支持基本的 ACL，不包括 authenticated-read
      return allSupportedAcls.filter(acl =>
        acl === 'private' || acl === 'public-read' || acl === 'public-read-write'
      );
    }
  };

  // 当前权限对话框中可用的 ACL 选项
  const supportedAcls = permissionsObject
    ? getAvailableAcls(!currentBucket) // 如果没有 currentBucket，说明是在设置 bucket 权限
    : allSupportedAcls;

  // 组件卸载时取消所有正在进行的请求
  useEffect(() => {
    return () => {
      cancelAllBucketStatsRequests();
    };
  }, []);

  // 组件挂载和卸载日志
  useEffect(() => {
    const componentId = Math.random().toString(36).substring(7);
    logger.info(`📦 [S3Browser] 组件挂载 (ID: ${componentId})`);

    return () => {
      logger.info(`📦 [S3Browser] 组件卸载 (ID: ${componentId})`);

      // 🔧 修复：组件卸载时，如果还在加载中，重置加载状态
      // 这样下次挂载时可以重新加载
      if (isLoadingBucketsRef.current) {
        logger.warn(`📦 [S3Browser] 组件卸载时仍在加载中，重置加载状态`);
        isLoadingBucketsRef.current = false;
      }

      // 清理临时视频文件
      if (currentTempFile) {
        cleanupTempFile(currentTempFile);
      }
    };
  }, [currentTempFile]);

  // 加载根级别内容（buckets 或 bucket 内的对象）
  // 注意：不包含 sortBy 依赖项，因为排序在前端完成，不需要重新加载数据
  useEffect(() => {
    logger.info(
      `📦 [S3Browser] useEffect 触发: bucket=${currentBucket}, path=${currentPath}, isLoading=${isLoadingBucketsRef.current}`
    );

    // ✅ 在 useEffect 内部检查加载状态，防止并发调用
    if (!currentBucket) {
      // 在根级别，显示所有 buckets
      if (isLoadingBucketsRef.current) {
        logger.warn('📦 [S3Browser] ⚠️ useEffect: 跳过重复的 loadBuckets 调用（已在加载中）');
        return;
      }
      loadBuckets();
    } else {
      // 在某个 bucket 内，显示对象
      // 取消 bucket stats 请求，因为我们要进入某个 bucket 了
      cancelAllBucketStatsRequests();
      loadObjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, currentBucket, currentPath, searchTerm]);

  // 对 objects 进行排序（使用 useMemo 避免不必要的重新排序）
  const sortedObjects = useMemo(() => {
    const sorted = [...objects];

    sorted.sort((a, b) => {
      // 在 bucket 内时，文件夹优先
      if (currentBucket && a.isDirectory !== b.isDirectory) {
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
          return (
            (a.lastModified.getTime() - b.lastModified.getTime()) * order
          );
        default:
          return 0;
      }
    });

    return sorted;
  }, [objects, viewConfig.sortBy.field, viewConfig.sortBy.order, currentBucket]);

  // 无限滚动：使用 IntersectionObserver 监听触发器元素
  useEffect(() => {
    if (!hasMore || isLoading || !loadMoreTriggerRef.current) {
      return;
    }

    // 查找 ScrollArea 的 viewport 元素作为滚动容器
    const scrollViewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );

    const observer = new IntersectionObserver(
      entries => {
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
    // 防止短时间内重复加载 - 必须在最开始就设置标志
    if (isLoadingBucketsRef.current) {
      logger.warn('📦 [S3Browser] ⚠️ 跳过重复的 loadBuckets 调用（已在加载中）', {
        connectionId,
        currentSession: loadSessionRef.current,
        stackTrace: new Error().stack?.split('\n').slice(0, 5).join('\n')
      });
      return;
    }

    // ✅ 立即设置加载标志，防止并发调用
    isLoadingBucketsRef.current = true;

    // 创建新的加载会话
    const currentSession = ++loadSessionRef.current;

    logger.info(
      `📦 [S3Browser] 🚀 loadBuckets 开始 (session: ${currentSession}), connectionId: ${connectionId}, 调用栈:`,
      new Error().stack?.split('\n').slice(0, 5).join('\n')
    );

    try {

      // 取消之前所有正在进行的 bucket stats 请求
      cancelAllBucketStatsRequests();

      setIsLoading(true);
      logger.info(
        `📦 [S3Browser] 📡 调用 S3Service.listBuckets (session: ${currentSession}), connectionId: ${connectionId}`
      );
      const bucketList = await S3Service.listBuckets(connectionId);
      logger.info(
        `📦 [S3Browser] 加载到 ${bucketList.length} 个 buckets:`,
        bucketList.map(b => b.name)
      );
      setBuckets(bucketList);

      // 先快速显示 bucket 列表，对象数量和权限设为 undefined（表示加载中）
      let bucketObjects: S3Object[] = bucketList.map(bucket => ({
        key: `${bucket.name}/`,
        name: bucket.name,
        size: 0,
        lastModified: bucket.creationDate || new Date(),
        isDirectory: true,
        objectCount: undefined, // 初始为 undefined，表示正在加载
        acl: undefined, // 初始为 undefined，表示正在加载
      }));

      // 应用搜索过滤
      if (searchTerm) {
        bucketObjects = bucketObjects.filter(obj =>
          obj.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        logger.info(
          `📦 [S3Browser] 搜索过滤后剩余 ${bucketObjects.length} 个 bucket`
        );
      }

      // 注意：排序逻辑已移至 useMemo，不在这里执行

      // 立即显示 bucket 列表
      setObjects(bucketObjects);
      setIsLoading(false);
      logger.info(
        `📦 [S3Browser] 显示 ${bucketObjects.length} 个 bucket 作为文件夹`
      );
      // Buckets 列表没有分页，所以没有更多内容
      setHasMore(false);

      // 在后台异步加载每个 bucket 的对象数量和权限
      // 使用 Promise.all 实现真正的并行加载
      const loadBucketStatsPromises = bucketList.map(async bucket => {
        // 标记这个请求正在进行
        bucketStatsRequestsRef.current.set(bucket.name, true);

        try {
          logger.info(
            `📦 [S3Browser] 开始加载 bucket ${bucket.name} 的对象数量和权限 (session: ${currentSession})`
          );

          // 并行加载对象数量和权限
          // 根据服务商推荐的访问控制方式选择使用 ACL 还是 Bucket Policy
          const getPermissions = async () => {
            const cacheKey = `bucket:${bucket.name}`;

            // 检查是否已经缓存了失败结果
            if (permissionFailureCacheRef.current.has(cacheKey)) {
              logger.debug(`📦 [S3Browser] 使用缓存的权限失败结果: ${bucket.name}`);
              return 'private';
            }

            try {
              if (capabilities.preferredAccessControl === 'policy' && capabilities.bucketPolicy) {
                // 优先使用 Bucket Policy
                return await S3Service.getBucketPolicy(connectionId, bucket.name);
              } else if (capabilities.bucketAcl) {
                // 使用 ACL
                return await S3Service.getBucketAcl(connectionId, bucket.name);
              } else {
                return 'private';
              }
            } catch (err) {
              logger.warn(`获取 bucket ${bucket.name} 权限失败:`, err);
              // 缓存失败结果，避免重复请求
              permissionFailureCacheRef.current.add(cacheKey);
              return 'private'; // 默认为私有
            }
          };

          const [stats, acl] = await Promise.all([
            S3Service.getBucketStats(connectionId, bucket.name),
            getPermissions()
          ]);

          // 检查这个请求是否已被取消（通过检查会话ID和请求Map）
          if (loadSessionRef.current !== currentSession ||
              !bucketStatsRequestsRef.current.has(bucket.name)) {
            logger.info(
              `📦 [S3Browser] bucket ${bucket.name} 的请求已被取消，忽略结果`
            );
            return null;
          }

          return {
            bucketName: bucket.name,
            stats,
            acl
          };
        } catch (error) {
          logger.error(`加载 bucket ${bucket.name} 统计信息失败:`, error);
          bucketStatsRequestsRef.current.delete(bucket.name);
          return null;
        }
      });

      // 等待所有 bucket 的统计信息加载完成，然后批量更新
      Promise.all(loadBucketStatsPromises).then(results => {
        // 过滤掉 null 结果（被取消或失败的请求）
        const validResults = results.filter(r => r !== null);

        if (validResults.length > 0 && loadSessionRef.current === currentSession) {
          setObjects(prevObjects => {
            const updatedObjects = [...prevObjects];
            validResults.forEach(result => {
              const index = updatedObjects.findIndex(obj => obj.name === result!.bucketName);
              if (index !== -1) {
                updatedObjects[index] = {
                  ...updatedObjects[index],
                  objectCount: result!.stats.total_count,
                  acl: result!.acl as 'private' | 'public-read' | 'public-read-write' | 'authenticated-read'
                };
              }
            });
            return updatedObjects;
          });

          logger.info(
            `📦 [S3Browser] 批量更新了 ${validResults.length} 个 bucket 的统计信息`
          );
        }

        // 清理所有请求标记
        bucketList.forEach(bucket => {
          bucketStatsRequestsRef.current.delete(bucket.name);
        });

        // 重置加载标志（在统计信息加载完成后）
        isLoadingBucketsRef.current = false;
      }).catch(error => {
        logger.error('批量加载 bucket 统计信息失败:', error);
        // 清理所有请求标记
        bucketList.forEach(bucket => {
          bucketStatsRequestsRef.current.delete(bucket.name);
        });

        // 重置加载标志（即使失败也要重置）
        isLoadingBucketsRef.current = false;
      });
    } catch (error) {
      logger.error(`📦 [S3Browser] 加载 buckets 失败:`, error);
      showMessage.error(
        `${String(t('s3:error.load_buckets_failed'))}: ${error}`
      );
      setIsLoading(false);
      // 重置加载标志（发生异常时）
      isLoadingBucketsRef.current = false;
    }
  };

  const loadObjects = async (append: boolean = false) => {
    if (!currentBucket) {
      logger.warn(`📦 [S3Browser] loadObjects 被调用但 currentBucket 为空`);
      return;
    }

    try {
      setIsLoading(true);
      logger.info(
        `📦 [S3Browser] 开始加载对象: bucket=${currentBucket}, path=${currentPath}, append=${append}`
      );
      const result = await S3Service.listObjects(
        connectionId,
        currentBucket,
        currentPath,
        '/',
        viewConfig.pageSize,
        append ? continuationToken : undefined
      );

      const commonPrefixes = result.commonPrefixes || [];
      logger.info(
        `📦 [S3Browser] 加载到 ${result.objects.length} 个对象, ${commonPrefixes.length} 个文件夹前缀`
      );
      logger.info(`📦 [S3Browser] 当前路径: "${currentPath}"`);
      logger.debug(
        `📦 [S3Browser] 对象列表:`,
        result.objects.map(o => ({
          key: o.key,
          name: o.name,
          isDir: o.isDirectory,
        }))
      );
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
        const isNotFolderMarker =
          !prefixSet.has(obj.key) &&
          !prefixSet.has(`${obj.key}/`) &&
          !obj.key.endsWith('/');
        return hasValidName && isNotDirectory && isNotFolderMarker;
      });

      logger.info(`📦 [S3Browser] 过滤后文件数: ${newObjects.length}`);

      // 添加文件夹（从 commonPrefixes）
      commonPrefixes.forEach(prefix => {
        logger.debug(
          `📦 [S3Browser] 处理前缀: "${prefix}", 当前路径: "${currentPath}"`
        );
        const folderName = prefix.replace(currentPath, '').replace(/\/$/, '');
        logger.debug(`📦 [S3Browser] 提取的文件夹名: "${folderName}"`);
        if (folderName) {
          // 确保文件夹名称不为空
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
          logger.warn(
            `📦 [S3Browser] 跳过空文件夹名: prefix="${prefix}", currentPath="${currentPath}"`
          );
        }
      });

      logger.info(
        `📦 [S3Browser] 合并后共 ${newObjects.length} 个项目（${commonPrefixes.length} 个文件夹 + ${result.objects.filter(o => !o.isDirectory).length} 个文件）`
      );

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

      // 注意：排序逻辑已移至 useMemo，不在这里执行

      if (append) {
        setObjects(prev => {
          const updated = [...prev, ...newObjects];
          logger.info(`📦 [S3Browser] 追加对象，总数: ${updated.length}`);
          return updated;
        });
      } else {
        logger.info(
          `📦 [S3Browser] 设置对象列表，共 ${newObjects.length} 个项目`
        );
        setObjects(newObjects);
      }

      setcontinuationToken(result.nextContinuationToken);
      setHasMore(result.isTruncated);
      logger.info(
        `📦 [S3Browser] 加载完成: hasMore=${result.isTruncated}, nextToken=${result.nextContinuationToken ? '有' : '无'}`
      );

      // 🔧 性能优化：批量加载对象权限，限制并发数量
      // 使用并发控制避免同时发起大量请求导致CPU飙升
      const loadObjectPermissionsInBatches = async () => {
        // 创建新的加载会话，取消之前的权限加载
        const currentPermissionsSession = ++objectPermissionsSessionRef.current;

        const BATCH_SIZE = 10; // 每批处理10个对象
        const CONCURRENT_LIMIT = 5; // 最多同时5个请求
        const SMALL_LIST_THRESHOLD = 20; // 少于20个对象时直接并发加载

        // 过滤出需要加载权限的对象（排除已缓存失败的和文件夹）
        const objectsToLoad = newObjects.filter(obj => {
          // 跳过文件夹，因为文件夹的 ACL 获取可能不被支持
          if (obj.isDirectory) {
            return false;
          }
          const cacheKey = `object:${currentBucket}:${obj.key}`;
          return !permissionFailureCacheRef.current.has(cacheKey);
        });

        // 如果对象数量很少，直接并发加载所有权限
        if (objectsToLoad.length === 0) {
          logger.debug(`📦 [S3Browser] 所有对象权限已缓存或为文件夹，跳过加载`);
          // 将文件夹的 acl 设置为 null，表示不支持权限信息
          setObjects(prevObjects =>
            prevObjects.map(o =>
              o.isDirectory && o.acl === undefined
                ? { ...o, acl: null }
                : o
            )
          );
          return;
        }

        if (objectsToLoad.length <= SMALL_LIST_THRESHOLD) {
          logger.info(`📦 [S3Browser] 对象数量较少（${objectsToLoad.length}），直接并发加载所有权限`);

          // 检查provider是否支持ACL
          if (!capabilities.objectAcl) {
            logger.info(`📦 [S3Browser] 当前存储提供商 (${provider}) 不支持对象ACL，跳过权限加载`);
            // 直接返回，不加载权限
            return;
          }

          const results = await Promise.allSettled(
            objectsToLoad.map(async obj => {
              const cacheKey = `object:${currentBucket}:${obj.key}`;
              try {
                const acl = await S3Service.getObjectAcl(connectionId, currentBucket, obj.key);
                return { key: obj.key, acl, success: true };
              } catch (error) {
                logger.warn(`📦 [S3Browser] 获取对象 ${obj.name} 权限失败:`, error);
                permissionFailureCacheRef.current.add(cacheKey);
                // 返回 null 表示无权限信息，而不是默认 'private'
                return { key: obj.key, acl: null, success: false };
              }
            })
          );

          // 检查会话是否已被取消
          if (objectPermissionsSessionRef.current !== currentPermissionsSession) {
            logger.info(`📦 [S3Browser] 权限加载会话 ${currentPermissionsSession} 已被取消，忽略结果`);
            return;
          }

          // 批量更新状态 - 包括失败的情况（设置为 null 表示无权限信息）
          const aclMap = new Map<string, string | null>();
          results.forEach(result => {
            if (result.status === 'fulfilled') {
              aclMap.set(result.value.key, result.value.acl);
            }
          });

          // 总是更新对象，即使所有权限获取都失败了
          // 同时将文件夹的 acl 设置为 null
          setObjects(prevObjects =>
            prevObjects.map(o => {
              if (aclMap.has(o.key)) {
                return { ...o, acl: aclMap.get(o.key) as 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | null };
              } else if (o.isDirectory && o.acl === undefined) {
                return { ...o, acl: null };
              }
              return o;
            })
          );
          logger.info(`📦 [S3Browser] 批量更新了 ${aclMap.size} 个对象的权限`);
          return;
        }

        // 检查provider是否支持ACL
        if (!capabilities.objectAcl) {
          logger.info(`📦 [S3Browser] 当前存储提供商 (${provider}) 不支持对象ACL，跳过权限加载`);
          // 直接返回，不加载权限
          return;
        }

        logger.info(`📦 [S3Browser] 开始批量加载 ${objectsToLoad.length} 个对象的权限（并发限制: ${CONCURRENT_LIMIT}, session: ${currentPermissionsSession}）`);

        // 分批处理
        for (let i = 0; i < objectsToLoad.length; i += BATCH_SIZE) {
          // 检查会话是否已被取消
          if (objectPermissionsSessionRef.current !== currentPermissionsSession) {
            logger.info(`📦 [S3Browser] 权限加载会话 ${currentPermissionsSession} 已被取消`);
            return;
          }

          const batch = objectsToLoad.slice(i, i + BATCH_SIZE);

          // 限制并发数量
          const chunks: typeof batch[] = [];
          for (let j = 0; j < batch.length; j += CONCURRENT_LIMIT) {
            chunks.push(batch.slice(j, j + CONCURRENT_LIMIT));
          }

          // 逐个chunk处理
          for (const chunk of chunks) {
            // 再次检查会话
            if (objectPermissionsSessionRef.current !== currentPermissionsSession) {
              logger.info(`📦 [S3Browser] 权限加载会话 ${currentPermissionsSession} 已被取消`);
              return;
            }

            const results = await Promise.allSettled(
              chunk.map(async obj => {
                const cacheKey = `object:${currentBucket}:${obj.key}`;
                try {
                  const acl = await S3Service.getObjectAcl(connectionId, currentBucket, obj.key);
                  return { key: obj.key, acl, success: true };
                } catch (error) {
                  logger.warn(`📦 [S3Browser] 获取对象 ${obj.name} 权限失败:`, error);
                  permissionFailureCacheRef.current.add(cacheKey);
                  // 返回 null 表示无权限信息，而不是默认 'private'
                  return { key: obj.key, acl: null, success: false };
                }
              })
            );

            // 最后一次检查会话
            if (objectPermissionsSessionRef.current !== currentPermissionsSession) {
              logger.info(`📦 [S3Browser] 权限加载会话 ${currentPermissionsSession} 已被取消，忽略结果`);
              return;
            }

            // 批量更新状态 - 包括失败的情况（设置为 null 表示无权限信息）
            const aclMap = new Map<string, string | null>();
            results.forEach(result => {
              if (result.status === 'fulfilled') {
                aclMap.set(result.value.key, result.value.acl);
              }
            });

            // 总是更新对象，即使所有权限获取都失败了
            // 同时将文件夹的 acl 设置为 null
            setObjects(prevObjects =>
              prevObjects.map(o => {
                if (aclMap.has(o.key)) {
                  return { ...o, acl: aclMap.get(o.key) as 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | null };
                } else if (o.isDirectory && o.acl === undefined) {
                  return { ...o, acl: null };
                }
                return o;
              })
            );
            logger.debug(`📦 [S3Browser] 批量更新了 ${aclMap.size} 个对象的权限`);
          }
        }

        logger.info(`📦 [S3Browser] 权限加载完成 (session: ${currentPermissionsSession})`);
      };

      // 异步执行权限加载，不阻塞主流程
      loadObjectPermissionsInBatches().catch(error => {
        logger.error('批量加载对象权限失败:', error);
      });
    } catch (error) {
      logger.error(`📦 [S3Browser] 加载对象失败:`, error);
      showMessage.error(
        `${String(t('s3:error.load_objects_failed'))}: ${error}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 取消所有正在进行的 bucket stats 请求
  const cancelAllBucketStatsRequests = () => {
    const count = bucketStatsRequestsRef.current.size;
    if (count > 0) {
      logger.info(
        `📦 [S3Browser] 取消 ${count} 个正在进行的 bucket stats 请求`
      );
      bucketStatsRequestsRef.current.clear();
      // 增加会话ID，使得所有旧请求的响应被忽略
      loadSessionRef.current++;
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
        // 立即显示加载状态，清空旧内容
        setIsLoading(true);
        setObjects([]);
        setCurrentBucket(object.name);
        setCurrentPath('');
        setSelectedObjects(new Set());
        setLastSelectedIndex(-1);
      } else {
        // 否则进入文件夹
        logger.info(`📦 [S3Browser] 进入文件夹: ${object.key}`);
        // 立即显示加载状态，清空旧内容
        setIsLoading(true);
        setObjects([]);
        navigateToPath(object.key);
      }
    } else {
      // 双击文件：预览
      await handlePreviewFile(object);
    }
  };

  // 清理临时文件
  const cleanupTempFile = async (filePath: string) => {
    const { tempFileCache } = await import('./utils/tempFileCache');
    await tempFileCache.removeFile(filePath);
  };

  // 关闭预览对话框
  const handleClosePreview = async () => {
    // 清理临时文件
    if (currentTempFile) {
      await cleanupTempFile(currentTempFile);
      setCurrentTempFile(null);
    }
    setShowPreviewDialog(false);
  };

  // 预览文件
  const handlePreviewFile = async (object: S3Object) => {
    if (!isPreviewableFile(object)) {
      // 不支持预览的文件类型，直接下载
      handleDownload([object]);
      return;
    }

    // 清理之前的临时文件
    if (currentTempFile) {
      await cleanupTempFile(currentTempFile);
      setCurrentTempFile(null);
    }

    setPreviewObject(object);
    setShowPreviewDialog(true);
    setPreviewLoading(true);
    setPreviewContent(null);
    setPreviewProgress('');

    // 如果是视频文件，创建播放列表
    if (isVideoFile(object)) {
      setPreviewProgress(t('s3:preview.downloading_video'));
      const { playlist, currentIndex } = createPlaylistFromFolder(objects, object);
      setVideoPlaylist(playlist);
      setCurrentVideoIndex(currentIndex);
      setFilteredVideos(playlist);
    }

    // 异步获取标签并更新预览对象
    // 检查provider是否支持tagging
    if (currentBucket && !object.isDirectory && capabilities.tagging) {
      loadObjectTags(connectionId, currentBucket, object.key)
        .then(tags => {
          setPreviewObject(prev => (prev ? { ...prev, tags } : null));
        })
        .catch(error => {
          logger.error('获取预览文件标签失败:', error);
        });
    } else if (currentBucket && !object.isDirectory && !capabilities.tagging) {
      logger.info(`📦 [S3Browser] 当前存储提供商 (${provider}) 不支持对象标签，跳过标签加载`);
    }

    try {
      // 为视频添加额外的进度状态
      if (isVideoFile(object)) {
        setPreviewProgress(t('s3:preview.preparing_video'));
      }

      // 使用统一的预览内容生成器
      const result = await generatePreviewContent(
        connectionId,
        currentBucket,
        object
      );

      setPreviewContent(result.content);
      // 保存临时文件路径，用于后续清理
      if (result.tempFilePath) {
        setCurrentTempFile(result.tempFilePath);
      }
    } catch (error) {
      logger.error(`Preview file failed:`, error);
      showMessage.error(`${String(t('s3:preview.failed'))}: ${error}`);
      setShowPreviewDialog(false);
    } finally {
      setPreviewLoading(false);
      setPreviewProgress('');
    }
  };

  // 视频播放列表处理函数
  const handleVideoNext = () => {
    if (currentVideoIndex < filteredVideos.length - 1) {
      const nextVideo = filteredVideos[currentVideoIndex + 1];
      setCurrentVideoIndex(currentVideoIndex + 1);
      handlePreviewFile(nextVideo);
    }
  };

  const handleVideoPrevious = () => {
    if (currentVideoIndex > 0) {
      const prevVideo = filteredVideos[currentVideoIndex - 1];
      setCurrentVideoIndex(currentVideoIndex - 1);
      handlePreviewFile(prevVideo);
    }
  };

  const handleVideoSelect = (index: number) => {
    const selectedVideo = filteredVideos[index];
    setCurrentVideoIndex(index);
    handlePreviewFile(selectedVideo);
  };

  const handleVideoRemove = (index: number) => {
    const newFiltered = filteredVideos.filter((_, i) => i !== index);
    setFilteredVideos(newFiltered);
    if (index === currentVideoIndex && newFiltered.length > 0) {
      // 如果删除的是当前播放的视频，播放下一个或上一个
      const nextIndex = Math.min(index, newFiltered.length - 1);
      setCurrentVideoIndex(nextIndex);
      handlePreviewFile(newFiltered[nextIndex]);
    } else if (index < currentVideoIndex) {
      // 如果删除的视频在当前播放之前，调整索引
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleVideoClearPlaylist = () => {
    setFilteredVideos([]);
    setVideoPlaylist([]);
  };

  const handleVideoShuffle = () => {
    const shuffled = shuffleArray(filteredVideos);
    setFilteredVideos(shuffled);
    // 找到当前播放视频在新列表中的位置
    const currentVideo = filteredVideos[currentVideoIndex];
    const newIndex = shuffled.findIndex(v => v.key === currentVideo.key);
    setCurrentVideoIndex(newIndex >= 0 ? newIndex : 0);
  };

  const handleVideoFilterChange = (filters: VideoFilterOptions) => {
    setVideoFilterOptions(filters);
    const filtered = filterVideos(videoPlaylist, filters);
    setFilteredVideos(filtered);
    // 重置当前索引
    setCurrentVideoIndex(0);
  };

  // 设置预览对话框的导航保护
  useEffect(() => {
    if (!showPreviewDialog) return;

    const iframes = [
      { ref: pdfIframeRef, name: 'PDF' },
      { ref: excelIframeRef, name: 'Excel' },
    ];

    const cleanup = setupPreviewNavigationGuard(
      previewContentRef,
      iframes,
      previewContent,
      t
    );

    return () => {
      cleanupNavigationGuard(cleanup);
    };
  }, [showPreviewDialog, previewContent]);

  const handleObjectSelect = (
    object: S3Object,
    index: number,
    event: React.MouseEvent | React.ChangeEvent
  ) => {
    const isCtrlOrCmd =
      'ctrlKey' in event ? event.ctrlKey || event.metaKey : false;
    const isShift = 'shiftKey' in event ? event.shiftKey : false;

    let newSelection = new Set(selectedObjects);

    if (isShift && lastSelectedIndex !== -1) {
      // Shift + 点击：范围选择
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      newSelection = new Set(selectedObjects);
      for (let i = start; i <= end; i++) {
        if (sortedObjects[i]) {
          newSelection.add(sortedObjects[i].key);
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
      setSelectedObjects(new Set(sortedObjects.map(obj => obj.key)));
    } else {
      setSelectedObjects(new Set());
    }
    setLastSelectedIndex(-1);
  };

  const handleCheckboxToggle = (object: S3Object, index: number) => {
    const newSelection = new Set(selectedObjects);
    if (newSelection.has(object.key)) {
      newSelection.delete(object.key);
    } else {
      newSelection.add(object.key);
    }
    setSelectedObjects(newSelection);
    setLastSelectedIndex(index);
  };

  const handleUpload = async () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const key = buildObjectPath(currentPath, file.name);
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
      showMessage.success(
        String(t('s3:upload.success', { count: successCount }))
      );
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
    const toDownload =
      items ||
      (Array.from(selectedObjects)
        .map(key => objects.find(obj => obj.key === key))
        .filter(Boolean) as S3Object[]);

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
        const extension = getFileExtension(object.name);

        // 显示原生文件保存对话框
        const dialogResult = await safeTauriInvoke<{
          path?: string;
          name?: string;
        } | null>('save_file_dialog', {
          params: {
            default_path: object.name,
            filters: extension
              ? [
                  {
                    name: `${extension.toUpperCase()} Files`,
                    extensions: [extension],
                  },
                  { name: 'All Files', extensions: ['*'] },
                ]
              : [{ name: 'All Files', extensions: ['*'] }],
          },
        });

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
        showMessage.error(
          `${String(t('s3:download.failed', { name: object.name }))}: ${error}`
        );
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      showMessage.success(
        String(t('s3:download.success', { count: successCount }))
      );
    }
  };

  const handleDelete = async () => {
    const toDelete = Array.from(selectedObjects);
    if (toDelete.length === 0) {
      showMessage.warning(String(t('s3:delete.no_selection')));
      return;
    }

    setShowDeleteConfirmDialog(false);

    // 如果在根目录，删除的是 bucket
    if (!currentBucket) {
      await handleDeleteBuckets(toDelete);
    } else {
      // 否则删除的是对象
      await handleDeleteObjects(toDelete);
    }
  };

  // 删除 bucket
  const handleDeleteBuckets = async (bucketKeys: string[]) => {
    // 先取消所有正在进行的 bucket stats 请求
    cancelAllBucketStatsRequests();

    setIsLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const key of bucketKeys) {
      // bucket 的 key 格式是 "bucketName/"，需要去掉末尾的 /
      const bucketName = key.replace(/\/$/, '');
      try {
        await S3Service.deleteBucket(connectionId, bucketName);
        successCount++;
        logger.info(`📦 [S3Browser] 成功删除 bucket: ${bucketName}`);
      } catch (error) {
        failCount++;
        logger.error(`📦 [S3Browser] 删除 bucket ${bucketName} 失败:`, error);
      }
    }

    setIsLoading(false);
    setSelectedObjects(new Set());

    if (successCount > 0) {
      showMessage.success(
        String(t('s3:bucket.deleted', {
          defaultValue: `成功删除 ${successCount} 个存储桶`,
          count: successCount
        }))
      );
      // 重新加载 bucket 列表
      loadBuckets();
    }

    if (failCount > 0) {
      showMessage.error(
        String(t('s3:bucket.delete_failed', {
          defaultValue: `${failCount} 个存储桶删除失败`,
          count: failCount
        }))
      );
    }
  };

  // 删除对象
  const handleDeleteObjects = async (objectKeys: string[]) => {
    setIsLoading(true);

    try {
      const deletedKeys = await S3Service.deleteObjects(
        connectionId,
        currentBucket,
        objectKeys
      );
      showMessage.success(
        String(t('s3:delete.success', { count: deletedKeys.length }))
      );
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

  // 验证bucket名称
  const validateBucketName = (name: string): string => {
    if (!name) {
      return String(t('s3:bucket.name_required', { defaultValue: '请输入存储桶名称' }));
    }

    // 长度检查
    if (name.length < 3 || name.length > 63) {
      return String(t('s3:bucket.name_length_error', { defaultValue: '名称长度必须在3-63个字符之间' }));
    }

    // 字符检查：只能包含小写字母、数字、点(.)和连字符(-)
    if (!/^[a-z0-9.-]+$/.test(name)) {
      return String(t('s3:bucket.name_format_error', { defaultValue: '只能包含小写字母、数字、点(.)和连字符(-)' }));
    }

    // 开头和结尾检查：必须以字母或数字开头和结尾
    if (!/^[a-z0-9]/.test(name) || !/[a-z0-9]$/.test(name)) {
      return String(t('s3:bucket.name_start_end_error', { defaultValue: '必须以字母或数字开头和结尾' }));
    }

    // 不能包含连续的点
    if (/\.\./.test(name)) {
      return String(t('s3:bucket.name_consecutive_dots', { defaultValue: '不能包含连续的点' }));
    }

    // 不能是IP地址格式
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(name)) {
      return String(t('s3:bucket.name_ip_format', { defaultValue: '不能使用IP地址格式' }));
    }

    // 检查是否与现有bucket重复
    const existingBuckets = new Set(buckets.map(b => b.name));
    if (existingBuckets.has(name)) {
      return String(t('s3:bucket.name_exists', { defaultValue: '该名称已存在' }));
    }

    return '';
  };

  // 验证文件夹名称
  const validateFolderName = (name: string): string => {
    if (!name || !name.trim()) {
      return String(t('s3:folder.name_required', { defaultValue: '请输入文件夹名称' }));
    }

    const trimmedName = name.trim();

    // 不能包含斜杠
    if (trimmedName.includes('/')) {
      return String(t('s3:folder.name_no_slash', { defaultValue: '文件夹名称不能包含斜杠' }));
    }

    // 不能是 . 或 ..
    if (trimmedName === '.' || trimmedName === '..') {
      return String(t('s3:folder.name_invalid', { defaultValue: '文件夹名称不能为 . 或 ..' }));
    }

    // 检查是否与现有文件夹重复
    const existingFolders = new Set(
      objects
        .filter(obj => obj.isDirectory)
        .map(obj => obj.name)
    );
    if (existingFolders.has(trimmedName)) {
      return String(t('s3:folder.name_exists', { defaultValue: '该文件夹已存在' }));
    }

    return '';
  };

  const handleCreateBucket = async () => {
    // 验证bucket名称
    const error = validateBucketName(newBucketName);
    if (error) {
      setBucketNameError(error);
      return;
    }

    setIsLoading(true);
    setShowCreateBucketDialog(false);

    try {
      // 创建bucket
      await S3Service.createBucket(connectionId, newBucketName);

      showMessage.success(
        String(
          t('s3:bucket.created', {
            defaultValue: '存储桶已创建',
          })
        )
      );

      // 重置状态
      setNewBucketName('');
      setBucketNameError('');

      // 重新加载bucket列表
      await loadBuckets();
    } catch (error) {
      logger.error('Create bucket failed:', error);
      showMessage.error(`${String(t('s3:bucket.create_failed', { defaultValue: '创建存储桶失败' }))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    // 如果在根目录（没有选择bucket），则打开创建bucket对话框
    if (!currentBucket) {
      setNewBucketName('');
      setBucketNameError('');
      setShowCreateBucketDialog(true);
      return;
    }

    // 打开创建文件夹对话框
    setNewFolderName('');
    setFolderNameError('');
    setShowCreateFolderDialog(true);
  };

  const handleCreateFolderSubmit = async () => {
    // 验证文件夹名称
    const error = validateFolderName(newFolderName);
    if (error) {
      setFolderNameError(error);
      return;
    }

    setIsLoading(true);
    setShowCreateFolderDialog(false);

    try {
      const trimmedName = newFolderName.trim();
      const folderPath = buildObjectPath(currentPath, trimmedName);

      // 确保路径以 / 结尾
      const folderKey = folderPath.endsWith('/')
        ? folderPath
        : `${folderPath}/`;

      // 创建文件夹（上传空对象）
      await S3Service.uploadObject(
        connectionId,
        currentBucket,
        folderKey,
        new Uint8Array(0),
        'application/x-directory'
      );

      showMessage.success(
        String(
          t('s3:folder.created', {
            defaultValue: '文件夹已创建',
          })
        )
      );

      // 重置状态
      setNewFolderName('');
      setFolderNameError('');

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
      let destKey = buildObjectPath(currentPath, item.name);

      // 如果是文件夹，确保目标 key 以 / 结尾
      if (item.isDirectory && !destKey.endsWith('/')) {
        destKey = `${destKey}/`;
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
        showMessage.error(
          `${String(t('s3:paste.failed', { name: item.name }))}: ${error}`
        );
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
      const expiresInSeconds =
        shareDays * 86400 + shareHours * 3600 + shareMinutes * 60;

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
      let newKey = buildObjectPath(currentPath, newName);

      // 如果是文件夹，确保新的 key 以 / 结尾
      if (renameObject.isDirectory && !newKey.endsWith('/')) {
        newKey = `${newKey}/`;
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

      showMessage.success(
        String(t('s3:rename.success', { defaultValue: '重命名成功' }))
      );
      setShowRenameDialog(false);
      setRenameObject(null);
      setNewName('');
      loadObjects();
    } catch (error) {
      logger.error('Rename failed:', error);
      showMessage.error(
        `${String(t('s3:rename.failed', { defaultValue: '重命名失败' }))}: ${error}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 权限设置处理
  const handleSetPermissions = async () => {
    if (!permissionsObject) return;

    try {
      setIsLoading(true);

      // 如果在根目录，设置的是 bucket 权限
      if (!currentBucket) {
        const bucketName = permissionsObject.name;

        // 根据服务商推荐的访问控制方式选择使用 ACL 还是 Bucket Policy
        if (capabilities.preferredAccessControl === 'policy' && capabilities.bucketPolicy) {
          // 使用 Bucket Policy
          // 注意：Bucket Policy 不支持 authenticated-read，需要转换
          const policyAccess = selectedAcl === 'authenticated-read' ? 'private' : selectedAcl;
          if (policyAccess !== 'private' && policyAccess !== 'public-read' && policyAccess !== 'public-read-write') {
            throw new Error(`Bucket Policy 不支持 ${selectedAcl} 权限`);
          }
          await S3Service.putBucketPolicy(connectionId, bucketName, policyAccess);
          showMessage.success(
            String(t('s3:permissions.bucket_updated', {
              defaultValue: '存储桶权限已更新（使用 Bucket Policy）',
              bucket: bucketName
            }))
          );
        } else if (capabilities.bucketAcl) {
          // 使用 ACL
          await S3Service.putBucketAcl(connectionId, bucketName, selectedAcl);
          showMessage.success(
            String(t('s3:permissions.bucket_updated', {
              defaultValue: '存储桶权限已更新',
              bucket: bucketName
            }))
          );
        } else {
          throw new Error('该服务商不支持设置 bucket 权限');
        }

        // 更新本地状态
        setObjects(prevObjects =>
          prevObjects.map(obj =>
            obj.name === bucketName
              ? { ...obj, acl: selectedAcl }
              : obj
          )
        );
      } else {
        // 设置对象权限（对象权限通常只支持 ACL）
        if (!capabilities.objectAcl) {
          throw new Error('该服务商不支持设置对象权限');
        }

        await S3Service.putObjectAcl(
          connectionId,
          currentBucket,
          permissionsObject.key,
          selectedAcl
        );
        showMessage.success(
          String(t('s3:permissions.object_updated', {
            defaultValue: '对象权限已更新'
          }))
        );

        // 更新本地状态
        setObjects(prevObjects =>
          prevObjects.map(obj =>
            obj.key === permissionsObject.key
              ? { ...obj, acl: selectedAcl }
              : obj
          )
        );
      }

      setShowPermissionsDialog(false);
      setPermissionsObject(null);
    } catch (error) {
      logger.error('设置权限失败:', error);
      showMessage.error(
        `${String(t('s3:permissions.update_failed', { defaultValue: '权限更新失败' }))}: ${error}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新处理
  const handleRefresh = () => {
    // 清除权限失败缓存，重新尝试获取权限
    permissionFailureCacheRef.current.clear();
    logger.info('📦 [S3Browser] 清除权限失败缓存');

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
      showMessage.warning(
        String(t('s3:upload.no_bucket', { defaultValue: '请先选择存储桶' }))
      );
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
        const uploadKey = currentPath
          ? `${currentPath}${file.name}`
          : file.name;
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
      showMessage.success(
        String(t('s3:upload.success', { count: successCount }))
      );
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
      const tags = await S3Service.getObjectTagging(
        connectionId,
        currentBucket,
        object.key
      );
      const tagsArray = Object.entries(tags).map(([key, value]) => ({
        key,
        value,
      }));
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
  // 只在对话框关闭时清理，不在 previewContent 变化时清理
  useEffect(() => {
    // 当对话框从打开变为关闭时，清理之前的 blob URL
    if (!showPreviewDialog && previewContent) {
      cleanupBlobUrl(previewContent);
    }
  }, [showPreviewDialog]); // 移除 previewContent 依赖，避免在内容更新时触发清理

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // 根目录
    items.push({ label: connectionName, path: '', isBucket: false });

    // 使用工具函数解析 bucket 和路径
    const pathItems = parseBreadcrumbs(currentBucket, currentPath);
    items.push(...pathItems);

    return items;
  };

  const handleBreadcrumbClick = (item: BreadcrumbItem, index: number) => {
    if (index === 0) {
      // 返回根目录（显示所有 buckets）
      logger.info(`📦 [S3Browser] 返回根目录`);
      // 立即显示加载状态，清空旧内容
      setIsLoading(true);
      setObjects([]);
      setCurrentBucket('');
      setCurrentPath('');
      setSelectedObjects(new Set());
      setLastSelectedIndex(-1);
    } else if (item.isBucket) {
      // 返回 bucket 根目录
      logger.info(`📦 [S3Browser] 返回 bucket 根目录: ${item.label}`);
      // 立即显示加载状态，清空旧内容
      setIsLoading(true);
      setObjects([]);
      setCurrentPath('');
      setSelectedObjects(new Set());
      setLastSelectedIndex(-1);
    } else {
      // 导航到指定路径
      logger.info(`📦 [S3Browser] 导航到路径: ${item.path}`);
      // 立即显示加载状态，清空旧内容
      setIsLoading(true);
      setObjects([]);
      navigateToPath(item.path);
    }
  };

  // 列宽调整处理函数
  const handleColumnResizeStart = (
    columnName: string,
    nextColumnName: string | null,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡，避免触发容器的框选功能
    resizingColumn.current = columnName;
    nextResizingColumn.current = nextColumnName;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnName as keyof typeof columnWidths];

    // 保存下一列的初始宽度（如果存在）
    nextStartWidth.current = nextColumnName
      ? columnWidths[nextColumnName as keyof typeof columnWidths]
      : 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn.current || !nextResizingColumn.current) return;

      const MIN_WIDTH = 80; // 最小宽度 80px
      let diff = e.clientX - startX.current;

      // 计算理想的新宽度
      let newWidth = startWidth.current + diff;
      let nextNewWidth = nextStartWidth.current - diff;

      // 限制diff，确保两列都不小于最小宽度
      if (newWidth < MIN_WIDTH) {
        diff = MIN_WIDTH - startWidth.current;
        newWidth = MIN_WIDTH;
        nextNewWidth = nextStartWidth.current - diff;
      } else if (nextNewWidth < MIN_WIDTH) {
        diff = nextStartWidth.current - MIN_WIDTH;
        newWidth = startWidth.current + diff;
        nextNewWidth = MIN_WIDTH;
      }

      // 更新列宽
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.current!]: newWidth,
        [nextResizingColumn.current!]: nextNewWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingColumn.current = null;
      nextResizingColumn.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className='s3-browser h-full flex flex-col'>
      {/* 工具栏 */}
      <div className='toolbar p-2 border-b flex items-center gap-2'>
        <div className='flex-1' />

        {/* 操作按钮 */}
        <Button
          size='sm'
          variant='ghost'
          onClick={handleUpload}
          disabled={!currentBucket || !capabilities.uploadObject}
        >
          <Upload className='w-4 h-4 mr-1' />
          {t('s3:upload.label')}
        </Button>

        <Button
          size='sm'
          variant='ghost'
          onClick={() => handleDownload()}
          disabled={selectedObjects.size === 0 || !capabilities.downloadObject}
        >
          <Download className='w-4 h-4 mr-1' />
          {t('s3:download.label')}
        </Button>

        <Button
          size='sm'
          variant='ghost'
          onClick={handleCreateFolder}
          disabled={!currentBucket ? !capabilities.createBucket : !capabilities.createFolder}
        >
          <FolderPlus className='w-4 h-4 mr-1' />
          {!currentBucket ? t('s3:new_bucket', { defaultValue: '新建存储桶' }) : t('s3:new_folder')}
        </Button>

        <Button
          size='sm'
          variant='ghost'
          onClick={() => setShowDeleteConfirmDialog(true)}
          disabled={selectedObjects.size === 0 || (!currentBucket ? !capabilities.deleteBucket : !capabilities.deleteObject)}
        >
          <Trash2 className='w-4 h-4 mr-1' />
          {t('s3:delete.label')}
        </Button>

        <Button size='sm' variant='ghost' onClick={() => loadObjects()}>
          <RefreshCw className='w-4 h-4' />
        </Button>

        {/* 更多操作 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='sm' variant='ghost'>
              <MoreVertical className='w-4 h-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={handleCopy}
              disabled={selectedObjects.size === 0 || !capabilities.copyObject}
            >
              <Copy className='w-4 h-4 mr-2' />
              {t('s3:copy.label')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCut}
              disabled={selectedObjects.size === 0 || !capabilities.moveObject}
            >
              <Scissors className='w-4 h-4 mr-2' />
              {t('s3:cut.label')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handlePaste}
              disabled={!fileOperation || (fileOperation.type === 'copy' ? !capabilities.copyObject : !capabilities.moveObject)}
            >
              <Clipboard className='w-4 h-4 mr-2' />
              {t('s3:paste.label')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleGeneratePresignedUrl()}
              disabled={selectedObjects.size !== 1 || !capabilities.presignedUrl}
            >
              <Link className='w-4 h-4 mr-2' />
              {t('s3:generate_link')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 视图切换 */}
        <div className='flex gap-1'>
          <Button
            size='sm'
            variant={viewConfig.viewMode === 'list' ? 'default' : 'ghost'}
            onClick={() =>
              setViewConfig(prev => ({ ...prev, viewMode: 'list' }))
            }
          >
            <List className='w-4 h-4' />
          </Button>
          <Button
            size='sm'
            variant={viewConfig.viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={() =>
              setViewConfig(prev => ({ ...prev, viewMode: 'grid' }))
            }
          >
            <Grid className='w-4 h-4' />
          </Button>
        </div>

        {/* 搜索框 */}
        <div className='relative flex items-center'>
          <Search className='absolute left-2 w-4 h-4 text-muted-foreground pointer-events-none' />
          <Input
            className='pl-8 w-48 h-9'
            placeholder={t('s3:search')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 面包屑导航 */}
      <div className='breadcrumbs'>
        {getBreadcrumbs().map((item, index, array) => {
          // 面包屑的最后一项（当前位置）不可点击
          const isCurrentLocation = index === array.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              {index > 0 && (
                <ChevronRight className='w-3.5 h-3.5 text-muted-foreground' />
              )}
              {isCurrentLocation ? (
                <span className='flex items-center gap-1 text-sm py-0 text-foreground font-medium'>
                  {index === 0 && <Home className='w-3.5 h-3.5' />}
                  {item.label}
                </span>
              ) : (
                <button
                  className='hover:underline hover:text-primary flex items-center gap-1 text-sm py-0'
                  onClick={() => handleBreadcrumbClick(item, index)}
                >
                  {index === 0 && <Home className='w-3.5 h-3.5' />}
                  {item.label}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 文件列表 */}
      <div
        ref={containerRef}
        className='flex-1 relative overflow-hidden'
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDraggingOver && (
          <div className='absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center pointer-events-none'>
            <div className='text-lg font-semibold text-primary'>
              {t('s3:upload.drop_here', { defaultValue: '释放文件以上传' })}
            </div>
          </div>
        )}
        {isSelecting && selectionStart && selectionEnd && (
          <div
            className='absolute border-2 border-primary bg-primary/10 pointer-events-none z-40'
            style={{
              left: Math.min(selectionStart.x, selectionEnd.x),
              top: Math.min(selectionStart.y, selectionEnd.y),
              width: Math.abs(selectionEnd.x - selectionStart.x),
              height: Math.abs(selectionEnd.y - selectionStart.y),
            }}
          />
        )}
        <ScrollArea ref={scrollAreaRef} className='h-full w-full'>
          {viewConfig.viewMode === 'list' ? (
            <div className='w-full'>
              <table
                className='w-full'
                style={{
                  tableLayout: 'fixed',
                  minWidth: `${48 + columnWidths.name + columnWidths.size + (currentBucket ? 0 : columnWidths.count) + columnWidths.modified}px`
                }}
              >
              <thead className='sticky top-0 bg-background z-10'>
                <tr className='border-b'>
                  <th
                    className='text-left p-2'
                    style={{
                      width: '48px',
                      minWidth: '48px',
                      maxWidth: '48px',
                    }}
                  >
                    <div className='flex items-center justify-center'>
                      <Checkbox
                        checked={
                          sortedObjects.length > 0 &&
                          selectedObjects.size === sortedObjects.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </div>
                  </th>
                  <th
                    className='text-left p-2'
                    style={{ width: columnWidths.name }}
                  >
                    <div className='flex items-center'>
                      <span>{t('s3:name')}</span>
                      <div
                        className='column-resizer'
                        onMouseDown={e =>
                          handleColumnResizeStart('name', 'size', e)
                        }
                      />
                    </div>
                  </th>
                  <th
                    className='text-left p-2'
                    style={{ width: columnWidths.size }}
                  >
                    <div className='flex items-center'>
                      <span>{t('s3:size')}</span>
                      <div
                        className='column-resizer'
                        onMouseDown={e =>
                          handleColumnResizeStart(
                            'size',
                            !currentBucket ? 'count' : 'modified',
                            e
                          )
                        }
                      />
                    </div>
                  </th>
                  {/* 在根目录显示文件数量列 */}
                  {!currentBucket && (
                    <th
                      className='text-left p-2'
                      style={{ width: columnWidths.count }}
                    >
                      <div className='flex items-center'>
                        <span>
                          {t('s3:object_count', { defaultValue: '对象数量' })}
                        </span>
                        <div
                          className='column-resizer'
                          onMouseDown={e =>
                            handleColumnResizeStart('count', 'permissions', e)
                          }
                        />
                      </div>
                    </th>
                  )}
                  {/* 权限列 - 根据服务商能力动态显示 */}
                  {((!currentBucket && capabilities.bucketAcl) || (currentBucket && capabilities.objectAcl)) && (
                    <th
                      className='text-left p-2'
                      style={{ width: columnWidths.permissions || '150px' }}
                    >
                      <div className='flex items-center'>
                        <span>
                          {t('s3:permissions.label', { defaultValue: '权限' })}
                        </span>
                        <div
                          className='column-resizer'
                          onMouseDown={e =>
                            handleColumnResizeStart('permissions', 'modified', e)
                          }
                        />
                      </div>
                    </th>
                  )}
                  <th
                    className='text-left p-2'
                    style={{ width: columnWidths.modified }}
                  >
                    <div className='flex items-center'>
                      <span>{t('s3:modified')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && sortedObjects.length === 0 ? (
                  // 骨架屏加载状态
                  Array.from({ length: 10 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className='border-b'>
                      <td className='p-2'>
                        <div className='flex items-center justify-center'>
                          <div className='w-4 h-4 bg-muted animate-pulse rounded' />
                        </div>
                      </td>
                      <td className='p-2'>
                        <div className='flex items-center gap-2'>
                          <div className='w-4 h-4 bg-muted animate-pulse rounded' />
                          <div className='h-4 bg-muted animate-pulse rounded flex-1' />
                        </div>
                      </td>
                      <td className='p-2'>
                        <div className='h-4 bg-muted animate-pulse rounded w-20' />
                      </td>
                      {!currentBucket && (
                        <td className='p-2'>
                          <div className='h-4 bg-muted animate-pulse rounded w-16' />
                        </td>
                      )}
                      {((!currentBucket && capabilities.bucketAcl) || (currentBucket && capabilities.objectAcl)) && (
                        <td className='p-2'>
                          <div className='h-4 bg-muted animate-pulse rounded w-24' />
                        </td>
                      )}
                      <td className='p-2'>
                        <div className='h-4 bg-muted animate-pulse rounded w-32' />
                      </td>
                    </tr>
                  ))
                ) : sortedObjects.map((object, index) => (
                  <tr
                    key={object.key}
                    className='border-b hover:bg-muted/50 cursor-pointer object-item'
                    onClick={e => {
                      // 如果点击的是 checkbox，不触发行选择
                      if (
                        (e.target as HTMLElement).closest(
                          'button[role="checkbox"]'
                        )
                      ) {
                        return;
                      }
                      handleObjectSelect(object, index, e);
                    }}
                    onDoubleClick={() => handleObjectClick(object)}
                    onContextMenu={e => handleContextMenu(e, object)}
                  >
                    <td
                      className='p-2'
                      style={{
                        width: '48px',
                        minWidth: '48px',
                        maxWidth: '48px',
                      }}
                    >
                      <div className='flex items-center justify-center h-full'>
                        <Checkbox
                          checked={selectedObjects.has(object.key)}
                          onCheckedChange={() => {
                            handleCheckboxToggle(object, index);
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    </td>
                    <td className='p-2' style={{ width: columnWidths.name }}>
                      <div className='flex items-center gap-2 min-w-0'>
                        {getFileIcon(object)}
                        <span className='truncate' title={object.name}>
                          {object.name}
                        </span>
                      </div>
                    </td>
                    <td className='p-2' style={{ width: columnWidths.size }}>
                      <span
                        className='truncate block'
                        title={
                          object.isDirectory ? '-' : formatBytes(object.size)
                        }
                      >
                        {object.isDirectory ? '-' : formatBytes(object.size)}
                      </span>
                    </td>
                    {/* 在根目录显示文件数量 */}
                    {!currentBucket && (
                      <td className='p-2' style={{ width: columnWidths.count }}>
                        <span className='truncate block flex items-center gap-1'>
                          {object.objectCount !== undefined ? (
                            object.objectCount
                          ) : (
                            <>
                              <span className='inline-block w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin' />
                              <span className='text-muted-foreground text-xs'>
                                {t('s3:loading', { defaultValue: '加载中...' })}
                              </span>
                            </>
                          )}
                        </span>
                      </td>
                    )}
                    {/* 显示权限 - 根据服务商能力动态显示 */}
                    {((!currentBucket && capabilities.bucketAcl) || (currentBucket && capabilities.objectAcl)) && (
                      <td className='p-2' style={{ width: columnWidths.permissions }}>
                        <span className='truncate block flex items-center gap-1'>
                          {object.acl !== undefined ? (
                            object.acl === null ? (
                              <span className='px-2 py-1 rounded text-xs bg-gray-50 text-gray-500'>
                                {t('s3:permissions.no_permission_info', { defaultValue: '无权限信息' })}
                              </span>
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs ${
                                object.acl === 'private' ? 'bg-gray-100 text-gray-700' :
                                object.acl === 'public-read' ? 'bg-blue-100 text-blue-700' :
                                object.acl === 'public-read-write' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {t(`s3:permissions.${object.acl}`, { defaultValue: object.acl })}
                              </span>
                            )
                          ) : (
                            <>
                              <span className='inline-block w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin' />
                              <span className='text-muted-foreground text-xs'>
                                {t('s3:loading', { defaultValue: '加载中...' })}
                              </span>
                            </>
                          )}
                        </span>
                      </td>
                    )}
                    <td className='p-2' style={{ width: columnWidths.modified }}>
                      <span
                        className='truncate block'
                        title={formatDate(object.lastModified)}
                      >
                        {formatDate(object.lastModified)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          ) : (
            <div className='grid grid-cols-6 gap-2 p-2'>
              {sortedObjects.map((object, index) => (
                <ContextMenu key={object.key}>
                  <ContextMenuTrigger asChild>
                    <div
                      className={`
                      flex flex-col items-center p-4 rounded-lg cursor-pointer object-item
                      hover:bg-muted/50 transition-colors
                      ${selectedObjects.has(object.key) ? 'bg-muted' : ''}
                    `}
                      onDoubleClick={() => handleObjectClick(object)}
                      onClick={e => handleObjectSelect(object, index, e)}
                    >
                      <div className='w-full mb-2 flex items-center justify-center min-h-[96px]'>
                        {object.isDirectory ? (
                          <FolderOpen className='w-12 h-12' />
                        ) : isImageFile(object) || isVideoFile(object) ? (
                          <FileThumbnail
                            object={object}
                            connectionId={connectionId}
                            currentBucket={currentBucket}
                            viewMode={viewConfig.viewMode}
                          />
                        ) : (
                          <div className='text-4xl'>{getFileIcon(object)}</div>
                        )}
                      </div>
                      <div
                        className='text-sm text-center truncate w-full'
                        title={object.name}
                      >
                        {object.name}
                      </div>
                      {!object.isDirectory && (
                        <div className='text-xs text-muted-foreground'>
                          {formatBytes(object.size)}
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {currentBucket && (
                      <>
                        <ContextMenuItem onClick={() => handleRename(object)}>
                          <Edit2 className='w-4 h-4 mr-2' />
                          {t('s3:rename.label', { defaultValue: '重命名' })}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                      </>
                    )}
                    {capabilities.downloadObject && (
                      <ContextMenuItem onClick={() => handleDownload([object])}>
                        <Download className='w-4 h-4 mr-2' />
                        {t('s3:download.label', { defaultValue: '下载' })}
                      </ContextMenuItem>
                    )}
                    {/* 文件特有的菜单项 */}
                    {!object.isDirectory && (
                      <>
                        <ContextMenuItem onClick={() => handlePreviewFile(object)}>
                          <Eye className='w-4 h-4 mr-2' />
                          {t('s3:preview.label', { defaultValue: '预览' })}
                        </ContextMenuItem>
                        {capabilities.presignedUrl && (
                          <ContextMenuItem onClick={() => handleGeneratePresignedUrl(object)}>
                            <Link className='w-4 h-4 mr-2' />
                            {t('s3:generate_link', { defaultValue: '生成分享链接' })}
                          </ContextMenuItem>
                        )}
                        {capabilities.tagging && (
                          <ContextMenuItem onClick={async () => {
                            setTagsObject(object);
                            setShowTagsDialog(true);
                            // 异步获取标签
                            await fetchObjectTags(object);
                          }}>
                            <Tag className='w-4 h-4 mr-2' />
                            {t('s3:tags_mgmt.label', { defaultValue: '管理标签' })}
                          </ContextMenuItem>
                        )}
                      </>
                    )}
                    <ContextMenuItem onClick={handleCopy}>
                      <Copy className='w-4 h-4 mr-2' />
                      {t('s3:copy.label', { defaultValue: '复制' })}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleCut}>
                      <Scissors className='w-4 h-4 mr-2' />
                      {t('s3:cut.label', { defaultValue: '剪切' })}
                    </ContextMenuItem>
                    {/* 设置权限 - 根据服务商能力动态显示 */}
                    {((!currentBucket && capabilities.bucketAcl) ||
                      (currentBucket && capabilities.objectAcl)) && (
                      <ContextMenuItem onClick={() => {
                        setPermissionsObject(object);
                        // 获取可用的 ACL 选项
                        const isBucket = !currentBucket;
                        const availableAcls = getAvailableAcls(isBucket);
                        // 如果当前 ACL 在可用选项中，使用当前值；否则默认为 'private'
                        const currentAcl = object.acl || 'private';
                        const initialAcl = availableAcls.includes(currentAcl) ? currentAcl : 'private';
                        setSelectedAcl(initialAcl);
                        setShowPermissionsDialog(true);
                      }}>
                        <Shield className='w-4 h-4 mr-2' />
                        {t('s3:permissions.label', { defaultValue: '设置权限' })}
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    {/* 删除 - 根据服务商能力和对象类型显示 */}
                    {((!currentBucket && capabilities.deleteBucket) ||
                      (currentBucket && object.isDirectory && capabilities.deleteFolder) ||
                      (currentBucket && !object.isDirectory && capabilities.deleteObject)) && (
                      <ContextMenuItem
                        onClick={() => setShowDeleteConfirmDialog(true)}
                      >
                        <Trash2 className='w-4 h-4 mr-2' />
                        {t('s3:delete.label', { defaultValue: '删除' })}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}

          {/* 无限滚动触发器 */}
          {hasMore && (
            <div ref={loadMoreTriggerRef} className='text-center p-4'>
              {isLoading ? (
                <div className='flex items-center justify-center gap-2 text-muted-foreground'>
                  <RefreshCw className='w-4 h-4 animate-spin' />
                  <span className='text-sm'>{t('common:loading')}</span>
                </div>
              ) : (
                <div className='text-sm text-muted-foreground'>
                  {t('s3:scroll_to_load_more', {
                    defaultValue: '向下滚动加载更多',
                  })}
                </div>
              )}
            </div>
          )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* 状态栏 */}
      <div className='statusbar px-2 py-1 border-t text-sm text-muted-foreground flex justify-between'>
        <span>
          {t('s3:items', { count: sortedObjects.length })}
          {selectedObjects.size > 0 &&
            ` | ${t('s3:selected', { count: selectedObjects.size })}`}
        </span>
        <span>{connectionName}</span>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type='file'
        multiple
        className='hidden'
        onChange={handleFileSelect}
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={showDeleteConfirmDialog}
        onOpenChange={setShowDeleteConfirmDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {!currentBucket
                ? t('s3:bucket.delete_confirm_title', { defaultValue: '确认删除存储桶' })
                : t('s3:delete.confirm_title')}
            </DialogTitle>
            <DialogDescription>
              {!currentBucket
                ? t('s3:bucket.delete_confirm_message', {
                    defaultValue: `确定要删除选中的 ${selectedObjects.size} 个存储桶吗？此操作将删除所有数据且不可撤销！`,
                    count: selectedObjects.size
                  })
                : t('s3:delete.confirm_message', { count: selectedObjects.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowDeleteConfirmDialog(false)}
            >
              {String(t('common:cancel'))}
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              {String(t('common:delete'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预签名URL对话框 */}
      <Dialog
        open={showPresignedUrlDialog}
        onOpenChange={open => {
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
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Link className='w-5 h-5' />
              {t('s3:presigned_url.title')}
            </DialogTitle>
            <DialogDescription>
              {t('s3:presigned_url.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            {/* 过期时间设置 */}
            <div className='space-y-2'>
              <Label>{t('s3:presigned_url.active_for')}</Label>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='0'
                    value={shareDays}
                    onChange={e =>
                      setShareDays(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    className='w-20 text-center'
                  />
                  <span className='text-sm text-muted-foreground'>
                    {t('s3:presigned_url.days')}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='0'
                    max='23'
                    value={shareHours}
                    onChange={e =>
                      setShareHours(
                        Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
                      )
                    }
                    className='w-20 text-center'
                  />
                  <span className='text-sm text-muted-foreground'>
                    {t('s3:presigned_url.hours')}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min='0'
                    max='59'
                    value={shareMinutes}
                    onChange={e =>
                      setShareMinutes(
                        Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                      )
                    }
                    className='w-20 text-center'
                  />
                  <span className='text-sm text-muted-foreground'>
                    {t('s3:presigned_url.minutes')}
                  </span>
                </div>
              </div>
            </div>

            {/* 显示过期时间 */}
            {shareExpireTime && (
              <div className='text-sm text-muted-foreground flex items-center gap-2'>
                <Link className='w-4 h-4' />
                {t('s3:presigned_url.expire_at')}: {shareExpireTime}
              </div>
            )}

            {/* 生成的URL */}
            {presignedUrl && (
              <div className='space-y-2'>
                <div className='relative'>
                  <Input
                    value={presignedUrl}
                    readOnly
                    className='font-mono text-xs pr-10'
                  />
                  <Button
                    size='sm'
                    variant='ghost'
                    className='absolute right-1 top-1 h-7 w-7 p-0'
                    onClick={() => {
                      navigator.clipboard.writeText(presignedUrl);
                      showMessage.success(String(t('common:copied')));
                    }}
                  >
                    <Copy className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowPresignedUrlDialog(false)}
            >
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
      <Dialog
        open={showPreviewDialog}
        onOpenChange={open => {
          setShowPreviewDialog(open);
          if (!open) {
            // 关闭时重置状态
            setShowShareInPreview(false);
            setPresignedUrl('');
            setShareExpireTime('');

            // 清理 blob URL 以避免内存泄漏
            cleanupBlobUrl(previewContent);
            setPreviewContent(null);
            setPreviewObject(null);
          }
        }}
      >
        <DialogContent className='max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col'>
          {/* 顶部标题栏 */}
          <div className='flex items-start gap-3 px-6 pt-6 pb-4 border-b bg-muted/30'>
            {/* 文件类型图标 */}
            <div className='flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center'>
              {previewObject && isImageFile(previewObject) && (
                <ImageIcon className='w-6 h-6 text-primary' />
              )}
              {previewObject && isVideoFile(previewObject) && (
                <Video className='w-6 h-6 text-primary' />
              )}
              {previewObject &&
                ['mp3', 'wav', 'ogg'].includes(
                  previewObject.name.split('.').pop()?.toLowerCase() || ''
                ) && <Music className='w-6 h-6 text-primary' />}
              {previewObject && previewObject.name.endsWith('.pdf') && (
                <FileText className='w-6 h-6 text-primary' />
              )}
              {previewObject &&
                [
                  'txt',
                  'md',
                  'json',
                  'xml',
                  'csv',
                  'js',
                  'jsx',
                  'ts',
                  'tsx',
                  'py',
                  'java',
                  'c',
                  'cpp',
                  'go',
                  'rs',
                  'html',
                  'css',
                ].includes(
                  previewObject.name.split('.').pop()?.toLowerCase() || ''
                ) && <Code className='w-6 h-6 text-primary' />}
              {previewObject &&
                ['xlsx', 'xls'].includes(
                  previewObject.name.split('.').pop()?.toLowerCase() || ''
                ) && <Table className='w-6 h-6 text-primary' />}
              {previewObject &&
                !isImageFile(previewObject) &&
                !isVideoFile(previewObject) &&
                ![
                  'mp3',
                  'wav',
                  'ogg',
                  'pdf',
                  'txt',
                  'md',
                  'json',
                  'xml',
                  'csv',
                  'js',
                  'jsx',
                  'ts',
                  'tsx',
                  'py',
                  'java',
                  'c',
                  'cpp',
                  'go',
                  'rs',
                  'html',
                  'css',
                  'xlsx',
                  'xls',
                ].some(ext =>
                  previewObject.name.toLowerCase().endsWith(`.${ext}`)
                ) && <File className='w-6 h-6 text-primary' />}
            </div>

            {/* 文件信息 */}
            <div className='flex-1 min-w-0'>
              <DialogTitle className='text-lg font-semibold truncate mb-1.5'>
                {previewObject?.name || ''}
              </DialogTitle>
              {previewObject && (
                <div className='flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground'>
                  <span className='inline-flex items-center gap-1.5'>
                    <HardDrive className='w-3.5 h-3.5' />
                    {formatBytes(previewObject.size)}
                  </span>
                  {previewObject.lastModified && (
                    <span className='inline-flex items-center gap-1.5'>
                      <Clock className='w-3.5 h-3.5' />
                      {previewObject.lastModified.toLocaleString()}
                    </span>
                  )}
                  <span className='inline-flex items-center gap-1.5'>
                    <FileText className='w-3.5 h-3.5' />
                    {getFileExtension(previewObject.name).toUpperCase() ||
                      'Unknown'}
                  </span>
                </div>
              )}
            </div>

            {/* 快捷操作按钮 */}
            <div className='flex items-center gap-1'>
              <Button
                variant='ghost'
                size='icon'
                className='h-9 w-9'
                onClick={() => previewObject && handleDownload([previewObject])}
                title={String(t('s3:download.label'))}
              >
                <Download className='w-4 h-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-9 w-9'
                onClick={() => {
                  if (previewObject) {
                    setShareObject(previewObject);
                    setShowShareInPreview(true);
                  }
                }}
                title={String(t('s3:generate_link'))}
              >
                <Share2 className='w-4 h-4' />
              </Button>
            </div>
          </div>

          {/* 标签区域 */}
          {previewObject &&
            previewObject.tags &&
            Object.keys(previewObject.tags).length > 0 && (
              <div className='px-6 py-3 border-b bg-background/50'>
                <div className='flex flex-wrap gap-2'>
                  {Object.entries(previewObject.tags).map(([key, value]) => (
                    <span
                      key={key}
                      className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/50 border hover:bg-muted transition-colors'
                      title={`${key}: ${value}`}
                    >
                      <Tag className='w-3 h-3 text-primary' />
                      <span className='text-muted-foreground'>{key}:</span>
                      <span className='font-semibold'>{value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* 预览内容区域 */}
          <ScrollArea className='flex-1 overflow-auto'>
            {previewLoading ? (
              <div className='flex flex-col items-center justify-center p-20'>
                <RefreshCw className='w-10 h-10 animate-spin text-primary mb-4' />
                <p className='text-sm text-muted-foreground'>
                  {previewProgress || t('s3:preview.loading')}
                </p>
                {previewObject && isVideoFile(previewObject) && (
                  <p className='text-xs text-muted-foreground mt-2'>
                    {t('s3:preview.video_size_hint', {
                      size: (previewObject.size / 1024 / 1024).toFixed(2)
                    })}
                  </p>
                )}
              </div>
            ) : previewObject && previewContent ? (
              <div className='p-6' ref={previewContentRef}>
                {/* 图片预览 */}
                {isImageFile(previewObject) && (
                  <div className='flex items-center justify-center bg-muted/20 rounded-lg p-6 min-h-[300px]'>
                    <img
                      src={previewContent}
                      alt={previewObject.name}
                      className='max-w-full h-auto rounded-md shadow-xl'
                      style={{ maxHeight: '65vh' }}
                    />
                  </div>
                )}

                {/* 视频预览 */}
                {isVideoFile(previewObject) && previewContent && (
                  <div className='space-y-4'>
                    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
                      {/* 主视频播放器 */}
                      <div className={showVideoInfo || showVideoPlaylist ? 'lg:col-span-2' : 'lg:col-span-3'}>
                        <VideoPlayer
                          src={previewContent}
                          object={previewObject}
                          tempFilePath={currentTempFile ?? undefined}
                          onNext={handleVideoNext}
                          onPrevious={handleVideoPrevious}
                          hasNext={currentVideoIndex < filteredVideos.length - 1}
                          hasPrevious={currentVideoIndex > 0}
                          playlist={filteredVideos}
                          currentIndex={currentVideoIndex}
                          onVideoReady={setVideoElement}
                        />
                      </div>

                      {/* 侧边栏：视频信息和播放列表 */}
                      {(showVideoInfo || showVideoPlaylist) && (
                        <div className='space-y-4'>
                          {showVideoInfo && (
                            <VideoInfo
                              object={previewObject}
                              videoElement={videoElement}
                            />
                          )}
                          {showVideoPlaylist && filteredVideos.length > 0 && (
                            <VideoPlaylist
                              videos={filteredVideos}
                              currentIndex={currentVideoIndex}
                              onSelect={handleVideoSelect}
                              onRemove={handleVideoRemove}
                              onClear={handleVideoClearPlaylist}
                              onShuffle={handleVideoShuffle}
                            />
                          )}
                          {showVideoFilter && (
                            <VideoFilter
                              availableFormats={extractUsedFormats(videoPlaylist)}
                              onFilterChange={handleVideoFilterChange}
                              totalCount={videoPlaylist.length}
                              filteredCount={filteredVideos.length}
                              maxFileSize={Math.max(...videoPlaylist.map(v => v.size), 0)}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* 工具栏 */}
                    <div className='flex items-center gap-2 justify-end px-4'>
                      <Button
                        variant={showVideoInfo ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setShowVideoInfo(!showVideoInfo)}
                      >
                        {t('s3:video_info.title')}
                      </Button>
                      <Button
                        variant={showVideoPlaylist ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setShowVideoPlaylist(!showVideoPlaylist)}
                      >
                        {t('s3:playlist.title')} ({filteredVideos.length})
                      </Button>
                      <Button
                        variant={showVideoFilter ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setShowVideoFilter(!showVideoFilter)}
                      >
                        {t('s3:video_filter.title')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 音频预览 */}
                {['mp3', 'wav', 'ogg'].includes(
                  getFileExtension(previewObject.name)
                ) && (
                  <div className='flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl'>
                    <div className='w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6'>
                      <Music className='w-10 h-10 text-primary' />
                    </div>
                    <h3 className='text-lg font-medium mb-6'>
                      {previewObject.name}
                    </h3>
                    <audio
                      src={previewContent}
                      controls
                      className='w-full max-w-lg shadow-lg'
                    />
                  </div>
                )}

                {/* PDF预览 */}
                {previewObject.name.endsWith('.pdf') && (
                  <div className='rounded-xl overflow-hidden border-2 shadow-lg'>
                    <iframe
                      ref={pdfIframeRef}
                      src={previewContent}
                      className='w-full h-[650px]'
                      title='PDF Preview'
                      sandbox='allow-scripts allow-same-origin'
                      referrerPolicy='no-referrer'
                      allow=''
                    />
                  </div>
                )}

                {/* 文本/代码预览 */}
                {[
                  'txt',
                  'md',
                  'json',
                  'xml',
                  'csv',
                  'log',
                  'yaml',
                  'yml',
                  'ini',
                  'conf',
                  'js',
                  'jsx',
                  'ts',
                  'tsx',
                  'py',
                  'java',
                  'c',
                  'cpp',
                  'go',
                  'rs',
                  'html',
                  'css',
                  'scss',
                  'sass',
                  'less',
                  'vue',
                  'php',
                  'rb',
                  'sh',
                  'bash',
                ].includes(
                  getFileExtension(previewObject.name)
                ) && (
                  <div className='rounded-xl overflow-hidden border-2 shadow-lg'>
                    <div className='bg-muted/50 px-4 py-2 border-b flex items-center gap-2'>
                      <Code className='w-4 h-4 text-muted-foreground' />
                      <span className='text-sm font-medium text-muted-foreground'>
                        {getFileExtension(previewObject.name).toUpperCase()}
                      </span>
                    </div>
                    <div className='relative max-h-[600px] overflow-auto'>
                      <pre className='p-6 bg-muted/30 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words'>
                        <code>{previewContent}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {/* Excel预览 */}
                {['xlsx', 'xls'].includes(
                  getFileExtension(previewObject.name)
                ) && (
                  <div className='rounded-xl overflow-hidden border-2 shadow-lg max-h-[600px] w-full'>
                    <iframe
                      ref={excelIframeRef}
                      src={previewContent}
                      className='w-full h-[600px]'
                      title='Excel Preview'
                      sandbox='allow-same-origin'
                      referrerPolicy='no-referrer'
                    />
                  </div>
                )}

                {/* Word/PowerPoint 文件预览提示 */}
                {['doc', 'docx', 'ppt', 'pptx'].includes(
                  getFileExtension(previewObject.name)
                ) && (
                  <div className='flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 rounded-xl'>
                    <div className='w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6'>
                      <FileText className='w-10 h-10 text-primary' />
                    </div>
                    <h3 className='text-lg font-medium mb-2'>{previewObject.name}</h3>
                    <p className='text-sm text-muted-foreground mb-6 text-center max-w-md'>
                      {t('s3:preview.office_not_supported', {
                        defaultValue: '暂不支持在线预览 Office 文档，请下载后使用本地应用打开',
                      })}
                    </p>
                    <Button
                      onClick={() => previewObject && handleDownload([previewObject])}
                      className='gap-2'
                    >
                      <Download className='w-4 h-4' />
                      {t('s3:download.label')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center p-20 text-center'>
                <div className='w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4'>
                  <FileX className='w-10 h-10 text-muted-foreground' />
                </div>
                <p className='text-base font-medium mb-2'>
                  {t('s3:preview.not_supported', {
                    defaultValue: '不支持预览此文件类型',
                  })}
                </p>
                <p className='text-sm text-muted-foreground'>
                  {t('s3:preview.download_to_view', {
                    defaultValue: '请下载后查看',
                  })}
                </p>
              </div>
            )}
          </ScrollArea>

          {/* 底部操作栏 / 分享表单 */}
          {showShareInPreview ? (
            <div className='border-t bg-muted/20'>
              <div className='px-6 py-4 space-y-4'>
                {/* 分享表单标题 */}
                <div className='flex items-center gap-2'>
                  <Share2 className='w-5 h-5 text-primary' />
                  <h3 className='font-semibold'>
                    {t('s3:presigned_url.title')}
                  </h3>
                </div>

                {/* 过期时间设置 */}
                <div className='space-y-2'>
                  <Label className='text-sm font-medium'>
                    {t('s3:presigned_url.active_for')}
                  </Label>
                  <div className='flex items-center gap-3'>
                    <div className='flex items-center gap-2'>
                      <Input
                        type='number'
                        min='0'
                        value={shareDays}
                        onChange={e =>
                          setShareDays(
                            Math.max(0, parseInt(e.target.value) || 0)
                          )
                        }
                        className='w-20 text-center'
                      />
                      <span className='text-sm text-muted-foreground'>
                        {t('s3:presigned_url.days')}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Input
                        type='number'
                        min='0'
                        max='23'
                        value={shareHours}
                        onChange={e =>
                          setShareHours(
                            Math.max(
                              0,
                              Math.min(23, parseInt(e.target.value) || 0)
                            )
                          )
                        }
                        className='w-20 text-center'
                      />
                      <span className='text-sm text-muted-foreground'>
                        {t('s3:presigned_url.hours')}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Input
                        type='number'
                        min='0'
                        max='59'
                        value={shareMinutes}
                        onChange={e =>
                          setShareMinutes(
                            Math.max(
                              0,
                              Math.min(59, parseInt(e.target.value) || 0)
                            )
                          )
                        }
                        className='w-20 text-center'
                      />
                      <span className='text-sm text-muted-foreground'>
                        {t('s3:presigned_url.minutes')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 显示过期时间 */}
                {shareExpireTime && (
                  <div className='text-sm text-muted-foreground flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md'>
                    <Clock className='w-4 h-4' />
                    {t('s3:presigned_url.expire_at')}: {shareExpireTime}
                  </div>
                )}

                {/* 生成的URL */}
                {presignedUrl && (
                  <div className='space-y-2'>
                    <Label className='text-sm font-medium'>
                      {t('s3:presigned_url.title')}
                    </Label>
                    <div className='relative'>
                      <Input
                        value={presignedUrl}
                        readOnly
                        className='font-mono text-xs pr-10'
                      />
                      <Button
                        size='sm'
                        variant='ghost'
                        className='absolute right-1 top-1 h-7 w-7 p-0'
                        onClick={() => {
                          navigator.clipboard.writeText(presignedUrl);
                          showMessage.success(String(t('common:copied')));
                        }}
                      >
                        <Copy className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className='flex items-center justify-end gap-2 pt-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setShowShareInPreview(false);
                      setPresignedUrl('');
                      setShareExpireTime('');
                    }}
                  >
                    {String(t('common:cancel'))}
                  </Button>
                  {!presignedUrl ? (
                    <Button onClick={generateShareUrl}>
                      <Share2 className='w-4 h-4 mr-2' />
                      {String(t('s3:presigned_url.generate'))}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(presignedUrl);
                        showMessage.success(String(t('common:copied')));
                      }}
                    >
                      <Copy className='w-4 h-4 mr-2' />
                      {String(t('common:copy'))}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className='flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20'>
              <Button onClick={handleClosePreview}>
                {String(t('common:close'))}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('s3:rename.title', { defaultValue: '重命名' })}
            </DialogTitle>
            <DialogDescription>
              {t('s3:rename.description', { defaultValue: '请输入新的名称' })}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t('s3:rename.placeholder', {
                defaultValue: '输入新名称',
              })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowRenameDialog(false)}
            >
              {String(t('common:cancel'))}
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newName.trim()}>
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建存储桶对话框 */}
      <Dialog open={showCreateBucketDialog} onOpenChange={setShowCreateBucketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('s3:bucket.create', { defaultValue: '创建存储桶' })}
            </DialogTitle>
            <DialogDescription>
              {t('s3:bucket.create_description', { defaultValue: '请输入存储桶名称（3-63个字符，只能包含小写字母、数字、点和连字符）' })}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div className='space-y-2'>
              <Input
                value={newBucketName}
                onChange={e => {
                  setNewBucketName(e.target.value);
                  // 实时验证
                  if (bucketNameError) {
                    setBucketNameError('');
                  }
                }}
                placeholder={t('s3:bucket.name_placeholder', {
                  defaultValue: '例如: my-bucket',
                })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCreateBucket();
                  }
                }}
                className={bucketNameError ? 'border-destructive' : ''}
              />
              {bucketNameError && (
                <p className='text-sm text-destructive'>{bucketNameError}</p>
              )}
            </div>
            <div className='text-sm text-muted-foreground space-y-1'>
              <p className='font-medium'>{t('s3:bucket.naming_rules', { defaultValue: '命名规则：' })}</p>
              <ul className='list-disc list-inside space-y-0.5 ml-2'>
                <li>{t('s3:bucket.rule_length', { defaultValue: '长度3-63个字符' })}</li>
                <li>{t('s3:bucket.rule_chars', { defaultValue: '只能包含小写字母、数字、点(.)和连字符(-)' })}</li>
                <li>{t('s3:bucket.rule_start_end', { defaultValue: '必须以字母或数字开头和结尾' })}</li>
                <li>{t('s3:bucket.rule_no_ip', { defaultValue: '不能使用IP地址格式' })}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowCreateBucketDialog(false);
                setNewBucketName('');
                setBucketNameError('');
              }}
            >
              {String(t('common:cancel'))}
            </Button>
            <Button onClick={handleCreateBucket}>
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建文件夹对话框 */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('s3:folder.create', { defaultValue: '创建文件夹' })}
            </DialogTitle>
            <DialogDescription>
              {t('s3:folder.create_description', { defaultValue: '请输入文件夹名称' })}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            <div className='space-y-2'>
              <Input
                value={newFolderName}
                onChange={e => {
                  setNewFolderName(e.target.value);
                  // 实时验证
                  if (folderNameError) {
                    setFolderNameError('');
                  }
                }}
                placeholder={t('s3:folder.name_placeholder', {
                  defaultValue: '例如: documents',
                })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleCreateFolderSubmit();
                  }
                }}
                className={folderNameError ? 'border-destructive' : ''}
              />
              {folderNameError && (
                <p className='text-sm text-destructive'>{folderNameError}</p>
              )}
            </div>
            <div className='text-sm text-muted-foreground space-y-1'>
              <p className='font-medium'>{t('s3:folder.naming_rules', { defaultValue: '命名规则：' })}</p>
              <ul className='list-disc list-inside space-y-0.5 ml-2'>
                <li>{t('s3:folder.rule_no_slash', { defaultValue: '不能包含斜杠 (/)' })}</li>
                <li>{t('s3:folder.rule_no_dots', { defaultValue: '不能为 . 或 ..' })}</li>
                <li>{t('s3:folder.rule_unique', { defaultValue: '不能与现有文件夹重复' })}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowCreateFolderDialog(false);
                setNewFolderName('');
                setFolderNameError('');
              }}
            >
              {String(t('common:cancel'))}
            </Button>
            <Button onClick={handleCreateFolderSubmit}>
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 权限设置对话框 - 根据服务商支持的 ACL 类型动态显示 */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('s3:permissions.dialog_title', { defaultValue: '设置访问权限' })}
            </DialogTitle>
            <DialogDescription>
              {!currentBucket
                ? t('s3:permissions.bucket_description', {
                    defaultValue: `设置存储桶 "${permissionsObject?.name}" 的访问权限`,
                    bucket: permissionsObject?.name
                  })
                : t('s3:permissions.object_description', {
                    defaultValue: `设置对象 "${permissionsObject?.name}" 的访问权限`,
                    object: permissionsObject?.name
                  })}
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            {supportedAcls.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                <Shield className='w-12 h-12 mx-auto mb-3 opacity-50' />
                <p className='font-medium mb-2'>
                  {t('s3:permissions.not_supported', { defaultValue: '当前服务商不支持 ACL 权限' })}
                </p>
                <p className='text-sm'>
                  {capabilities.alternatives?.['ACL']
                    ? t('s3:permissions.use_alternative', {
                        defaultValue: `请使用 ${capabilities.alternatives['ACL']} 进行访问控制`,
                        alternative: capabilities.alternatives['ACL']
                      })
                    : t('s3:permissions.no_acl_support', {
                        defaultValue: '该服务商不支持 ACL 功能'
                      })
                  }
                </p>
              </div>
            ) : (
              <RadioGroup value={selectedAcl} onValueChange={(value) => setSelectedAcl(value as any)}>
                <div className='space-y-3'>
                  {supportedAcls.includes('private') && (
                    <div className='flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer'>
                      <RadioGroupItem value='private' id='acl-private' />
                      <Label htmlFor='acl-private' className='flex-1 cursor-pointer'>
                        <div className='font-medium'>
                          {t('s3:permissions.private', { defaultValue: '私有' })}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {t('s3:permissions.private_desc', {
                            defaultValue: '只有所有者可以访问'
                          })}
                        </div>
                      </Label>
                    </div>
                  )}

                  {supportedAcls.includes('public-read') && (
                    <div className='flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer'>
                      <RadioGroupItem value='public-read' id='acl-public-read' />
                      <Label htmlFor='acl-public-read' className='flex-1 cursor-pointer'>
                        <div className='font-medium'>
                          {t('s3:permissions.public-read', { defaultValue: '公共读' })}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {t('s3:permissions.public-read_desc', {
                            defaultValue: '所有人可以读取，只有所有者可以写入'
                          })}
                        </div>
                      </Label>
                    </div>
                  )}

                  {supportedAcls.includes('public-read-write') && (
                    <div className='flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer'>
                      <RadioGroupItem value='public-read-write' id='acl-public-read-write' />
                      <Label htmlFor='acl-public-read-write' className='flex-1 cursor-pointer'>
                        <div className='font-medium'>
                          {t('s3:permissions.public-read-write', { defaultValue: '公共读写' })}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {t('s3:permissions.public-read-write_desc', {
                            defaultValue: '所有人可以读取和写入（不推荐）'
                          })}
                        </div>
                      </Label>
                    </div>
                  )}

                  {supportedAcls.includes('authenticated-read') && (
                    <div className='flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer'>
                      <RadioGroupItem value='authenticated-read' id='acl-authenticated-read' />
                      <Label htmlFor='acl-authenticated-read' className='flex-1 cursor-pointer'>
                        <div className='font-medium'>
                          {t('s3:permissions.authenticated-read', { defaultValue: '认证用户读' })}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {t('s3:permissions.authenticated-read_desc', {
                            defaultValue: '已认证的用户可以读取'
                          })}
                        </div>
                      </Label>
                    </div>
                  )}
                </div>
              </RadioGroup>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowPermissionsDialog(false)}
            >
              {String(t('common:cancel'))}
            </Button>
            <Button
              onClick={handleSetPermissions}
              disabled={supportedAcls.length === 0}
            >
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tags 管理对话框 */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {t('s3:tags_mgmt.title', { defaultValue: '管理标签' })}
            </DialogTitle>
            <DialogDescription>{tagsObject?.name}</DialogDescription>
          </DialogHeader>
          <div className='py-4 space-y-4'>
            {tagsLoading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='text-center'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2'></div>
                  <p className='text-sm text-muted-foreground'>
                    {t('s3:tags_mgmt.loading', {
                      defaultValue: '正在加载标签...',
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {objectTags.length > 0 ? (
                  objectTags.map((tag, index) => (
                    <div key={index} className='flex items-center gap-2'>
                      <Input
                        placeholder={t('s3:tags_mgmt.key_placeholder', {
                          defaultValue: '输入标签键',
                        })}
                        value={tag.key}
                        onChange={e => {
                          const newTags = [...objectTags];
                          newTags[index].key = e.target.value;
                          setObjectTags(newTags);
                        }}
                        className='flex-1'
                      />
                      <Input
                        placeholder={t('s3:tags_mgmt.value_placeholder', {
                          defaultValue: '输入标签值',
                        })}
                        value={tag.value}
                        onChange={e => {
                          const newTags = [...objectTags];
                          newTags[index].value = e.target.value;
                          setObjectTags(newTags);
                        }}
                        className='flex-1'
                      />
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          const newTags = objectTags.filter(
                            (_, i) => i !== index
                          );
                          setObjectTags(newTags);
                        }}
                      >
                        {t('s3:tags_mgmt.remove', { defaultValue: '移除' })}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className='text-center text-muted-foreground py-8'>
                    {t('s3:tags_mgmt.no_tags', { defaultValue: '无标签' })}
                  </div>
                )}
                <Button
                  variant='outline'
                  onClick={() => {
                    setObjectTags([...objectTags, { key: '', value: '' }]);
                  }}
                  className='w-full'
                >
                  + {t('s3:tags_mgmt.add', { defaultValue: '添加标签' })}
                </Button>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowTagsDialog(false)}>
              {String(t('common:cancel'))}
            </Button>
            <Button
              onClick={async () => {
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
              }}
            >
              {String(t('common:confirm'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 自定义右键菜单 */}
      {contextMenu.visible && contextMenu.object && (
        <div
          className='fixed bg-background border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]'
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 重命名 - 文件和文件夹都有 */}
          {currentBucket && (
            <>
              <div
                className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
                onClick={() => {
                  handleRename(contextMenu.object!);
                  closeContextMenu();
                }}
              >
                <Edit2 className='w-4 h-4' />
                {t('s3:rename.label', { defaultValue: '重命名' })}
              </div>
              <div className='h-px bg-border my-1' />
            </>
          )}

          {/* 下载 - 根据服务商能力显示 */}
          {capabilities.downloadObject && (
            <div
              className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
              onClick={() => {
                handleDownload([contextMenu.object!]);
                closeContextMenu();
              }}
            >
              <Download className='w-4 h-4' />
              {t('s3:download.label', { defaultValue: '下载' })}
            </div>
          )}

          {/* 文件特有的菜单项 */}
          {!contextMenu.object.isDirectory && (
            <>
              {/* 预览 */}
              <div
                className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
                onClick={() => {
                  if (contextMenu.object) {
                    handlePreviewFile(contextMenu.object);
                  }
                  closeContextMenu();
                }}
              >
                <Eye className='w-4 h-4' />
                {t('s3:preview.label', { defaultValue: '预览' })}
              </div>

              {/* 创建分享链接 - 根据服务商能力显示 */}
              {capabilities.presignedUrl && (
                <div
                  className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
                  onClick={() => {
                    handleGeneratePresignedUrl(contextMenu.object || undefined);
                    closeContextMenu();
                  }}
                >
                  <Link className='w-4 h-4' />
                  {t('s3:generate_link', { defaultValue: '生成分享链接' })}
                </div>
              )}

              {/* 设置标签 - 根据服务商能力显示 */}
              {capabilities.tagging && (
                <div
                  className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
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
                  <Tag className='w-4 h-4' />
                  {t('s3:tags_mgmt.label', { defaultValue: '管理标签' })}
                </div>
              )}
            </>
          )}

          {/* 复制 */}
          <div
            className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
            onClick={() => {
              handleCopy();
              closeContextMenu();
            }}
          >
            <Copy className='w-4 h-4' />
            {t('s3:copy.label', { defaultValue: '复制' })}
          </div>

          {/* 剪切 */}
          <div
            className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
            onClick={() => {
              handleCut();
              closeContextMenu();
            }}
          >
            <Scissors className='w-4 h-4' />
            {t('s3:cut.label', { defaultValue: '剪切' })}
          </div>

          {/* 设置权限 - 根据服务商能力动态显示 */}
          {((!currentBucket && capabilities.bucketAcl) ||
            (currentBucket && capabilities.objectAcl)) && (
            <div
              className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm'
              onClick={() => {
                const obj = contextMenu.object!;
                setPermissionsObject(obj);

                // 获取可用的 ACL 选项
                const isBucket = !currentBucket;
                const availableAcls = getAvailableAcls(isBucket);

                // 如果当前 ACL 在可用选项中，使用当前值；否则默认为 'private'
                const currentAcl = obj.acl || 'private';
                const initialAcl = availableAcls.includes(currentAcl) ? currentAcl : 'private';

                setSelectedAcl(initialAcl);
                setShowPermissionsDialog(true);
                closeContextMenu();
              }}
            >
              <Shield className='w-4 h-4' />
              {t('s3:permissions.label', { defaultValue: '设置权限' })}
            </div>
          )}

          <div className='h-px bg-border my-1' />

          {/* 删除 - 根据服务商能力和对象类型显示 */}
          {((!currentBucket && capabilities.deleteBucket) ||
            (currentBucket && contextMenu.object.isDirectory && capabilities.deleteFolder) ||
            (currentBucket && !contextMenu.object.isDirectory && capabilities.deleteObject)) && (
            <div
              className='px-3 py-2 hover:bg-muted cursor-pointer flex items-center gap-2 text-sm text-destructive'
              onClick={() => {
                setShowDeleteConfirmDialog(true);
                closeContextMenu();
              }}
            >
              <Trash2 className='w-4 h-4' />
              {t('s3:delete.label', { defaultValue: '删除' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default S3Browser;
