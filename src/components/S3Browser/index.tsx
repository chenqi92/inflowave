import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { S3Service } from '@/services/s3Service';
import { showMessage } from '@/utils/message';
import { formatBytes, formatDate } from '@/utils/format';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import type {
  S3Object,
  S3Bucket,
  S3BrowserViewConfig,
} from '@/types/s3';
import './S3Browser.css';
import logger from '@/utils/logger';

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
  const { t } = useI18nTranslation(['s3', 'common']);
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [currentBucket, setCurrentBucket] = useState<string>(''); // 当前所在的 bucket
  const [currentPath, setCurrentPath] = useState<string>(''); // 当前路径（bucket内的路径）
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewConfig, setViewConfig] = useState<S3BrowserViewConfig>({
    viewMode: 'list',
    showHidden: false,
    showDetails: true,
    sortBy: { field: 'name', order: 'asc' },
    pageSize: 100,
  });

  // 分页相关
  const [continuationToken, setcontinuationToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  // 文件操作
  const [fileOperation, setFileOperation] = useState<FileOperation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 对话框状态
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showPresignedUrlDialog, setShowPresignedUrlDialog] = useState(false);
  const [presignedUrl, setPresignedUrl] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

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

  const loadBuckets = async () => {
    try {
      setIsLoading(true);
      logger.info(`📦 [S3Browser] 开始加载 buckets, connectionId: ${connectionId}`);
      const bucketList = await S3Service.listBuckets(connectionId);
      logger.info(`📦 [S3Browser] 加载到 ${bucketList.length} 个 buckets:`, bucketList.map(b => b.name));
      setBuckets(bucketList);

      // 将 buckets 转换为文件夹对象显示
      let bucketObjects: S3Object[] = bucketList.map(bucket => ({
        key: `${bucket.name  }/`,
        name: bucket.name,
        size: 0,
        lastModified: bucket.creationDate || new Date(),
        isDirectory: true,
      }));

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
      showMessage.error(`${String(t('error.load_buckets_failed'))}: ${error}`);
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
      let newObjects = result.objects.filter(obj => !obj.isDirectory);

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
      showMessage.error(`${String(t('error.load_objects_failed'))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    setSelectedObjects(new Set());
  };

  const handleObjectClick = (object: S3Object) => {
    if (object.isDirectory) {
      // 如果当前在根级别（没有选择 bucket），则进入该 bucket
      if (!currentBucket) {
        logger.info(`📦 [S3Browser] 进入 bucket: ${object.name}`);
        setCurrentBucket(object.name);
        setCurrentPath('');
        setSelectedObjects(new Set());
      } else {
        // 否则进入文件夹
        logger.info(`📦 [S3Browser] 进入文件夹: ${object.key}`);
        navigateToPath(object.key);
      }
    } else {
      // 预览或下载文件
      handleDownload([object]);
    }
  };

  const handleObjectSelect = (object: S3Object, selected: boolean) => {
    const newSelection = new Set(selectedObjects);
    if (selected) {
      newSelection.add(object.key);
    } else {
      newSelection.delete(object.key);
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
      showMessage.success(String(t('upload.success', { count: successCount })));
      loadObjects();
    }

    if (failCount > 0) {
      showMessage.error(String(t('upload.failed', { count: failCount })));
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
      showMessage.warning(String(t('download.no_selection')));
      return;
    }

    setIsLoading(true);

    for (const object of toDownload) {
      if (object.isDirectory) continue;

      try {
        const blob = await S3Service.downloadObjectAsBlob(
          connectionId,
          currentBucket,
          object.key,
          object.contentType
        );
        S3Service.triggerDownload(blob, object.name);
      } catch (error) {
        showMessage.error(`${String(t('download.failed', { name: object.name }))}: ${error}`);
      }
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    const toDelete = Array.from(selectedObjects);
    if (toDelete.length === 0) {
      showMessage.warning(String(t('delete.no_selection')));
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
      showMessage.success(String(t('delete.success', { count: deletedKeys.length })));
      setSelectedObjects(new Set());
      loadObjects();
    } catch (error) {
      showMessage.error(`${String(t('delete.failed'))}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showMessage.warning(String(t('folder.name_required')));
      return;
    }

    setShowCreateFolderDialog(false);
    setIsLoading(true);

    try {
      const folderPath = currentPath + newFolderName.trim();
      await S3Service.createFolder(connectionId, currentBucket, folderPath);
      showMessage.success(String(t('folder.created')));
      setNewFolderName('');
      loadObjects();
    } catch (error) {
      showMessage.error(`${String(t('folder.create_failed'))}: ${error}`);
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
    showMessage.info(String(t('copy.copied', { count: items.length })));
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
    showMessage.info(String(t('cut.cut', { count: items.length })));
  };

  const handlePaste = async () => {
    if (!fileOperation) {
      showMessage.warning(String(t('paste.nothing')));
      return;
    }

    setIsLoading(true);

    for (const item of fileOperation.items) {
      const destKey = currentPath + item.name;

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
        showMessage.error(`${String(t('paste.failed', { name: item.name }))}: ${error}`);
      }
    }

    setFileOperation(null);
    setIsLoading(false);
    loadObjects();
    showMessage.success(String(t('paste.success')));
  };

  const handleGeneratePresignedUrl = async () => {
    const selected = Array.from(selectedObjects);
    if (selected.length !== 1) {
      showMessage.warning(String(t('presigned_url.select_one')));
      return;
    }

    try {
      const result = await S3Service.generatePresignedUrl(
        connectionId,
        currentBucket,
        selected[0],
        'get',
        3600 // 1小时
      );
      setPresignedUrl(result.url);
      setShowPresignedUrlDialog(true);
    } catch (error) {
      showMessage.error(`${String(t('presigned_url.failed'))}: ${error}`);
    }
  };

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
    } else if (item.isBucket) {
      // 返回 bucket 根目录
      logger.info(`📦 [S3Browser] 返回 bucket 根目录: ${item.label}`);
      setCurrentPath('');
      setSelectedObjects(new Set());
    } else {
      // 导航到指定路径
      logger.info(`📦 [S3Browser] 导航到路径: ${item.path}`);
      navigateToPath(item.path);
    }
  };

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

  return (
    <div className="s3-browser h-full flex flex-col">
      {/* 工具栏 */}
      <div className="toolbar p-2 border-b flex items-center gap-2">
        <div className="flex-1" />

        {/* 操作按钮 */}
        <Button size="sm" variant="ghost" onClick={handleUpload} disabled={!currentBucket}>
          <Upload className="w-4 h-4 mr-1" />
          {t('upload.label')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDownload()}
          disabled={selectedObjects.size === 0}
        >
          <Download className="w-4 h-4 mr-1" />
          {t('download.label')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreateFolderDialog(true)}
          disabled={!currentBucket}
        >
          <FolderPlus className="w-4 h-4 mr-1" />
          {t('new_folder')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowDeleteConfirmDialog(true)}
          disabled={selectedObjects.size === 0}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('delete.label')}
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
              {t('copy.label')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCut} disabled={selectedObjects.size === 0}>
              <Scissors className="w-4 h-4 mr-2" />
              {t('cut.label')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePaste} disabled={!fileOperation}>
              <Clipboard className="w-4 h-4 mr-2" />
              {t('paste.label')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleGeneratePresignedUrl}
              disabled={selectedObjects.size !== 1}
            >
              <Link className="w-4 h-4 mr-2" />
              {t('generate_link')}
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
            placeholder={t('search')}
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
      <ScrollArea className="flex-1">
        {viewConfig.viewMode === 'list' ? (
          <table className="w-full">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b">
                <th className="text-left p-2 w-8">
                  <Checkbox
                    checked={objects.length > 0 && selectedObjects.size === objects.length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left p-2">{t('name')}</th>
                <th className="text-left p-2">{t('size')}</th>
                <th className="text-left p-2">{t('modified')}</th>
              </tr>
            </thead>
            <tbody>
              {objects.map(object => (
                <tr
                  key={object.key}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onDoubleClick={() => handleObjectClick(object)}
                >
                  <td className="p-2">
                    <Checkbox
                      checked={selectedObjects.has(object.key)}
                      onCheckedChange={checked => handleObjectSelect(object, checked as boolean)}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {getFileIcon(object)}
                      <span>{object.name}</span>
                    </div>
                  </td>
                  <td className="p-2">
                    {object.isDirectory ? '-' : formatBytes(object.size)}
                  </td>
                  <td className="p-2">
                    {formatDate(object.lastModified)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-6 gap-2 p-2">
            {objects.map(object => (
              <div
                key={object.key}
                className={`
                  flex flex-col items-center p-4 rounded-lg cursor-pointer
                  hover:bg-muted/50 transition-colors
                  ${selectedObjects.has(object.key) ? 'bg-muted' : ''}
                `}
                onDoubleClick={() => handleObjectClick(object)}
                onClick={() => handleObjectSelect(object, !selectedObjects.has(object.key))}
              >
                <div className="text-4xl mb-2">
                  {object.isDirectory ? (
                    <FolderOpen className="w-12 h-12" />
                  ) : (
                    getFileIcon(object)
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
            ))}
          </div>
        )}

        {hasMore && (
          <div className="text-center p-4">
            <Button onClick={() => loadObjects(true)} disabled={isLoading}>
              {t('load_more')}
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* 状态栏 */}
      <div className="statusbar px-2 py-1 border-t text-sm text-muted-foreground flex justify-between">
        <span>
          {t('items', { count: objects.length })}
          {selectedObjects.size > 0 && ` | ${t('selected', { count: selectedObjects.size })}`}
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

      {/* 创建文件夹对话框 */}
      <Dialog open={showCreateFolderDialog} onOpenChange={setShowCreateFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('new_folder')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('folder.name_placeholder')}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              {String(t('cancel', { ns: 'common' }))}
            </Button>
            <Button onClick={handleCreateFolder}>{String(t('create', { ns: 'common' }))}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete.confirm_title')}</DialogTitle>
            <DialogDescription>
              {t('delete.confirm_message', { count: selectedObjects.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>
              {String(t('cancel', { ns: 'common' }))}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {String(t('delete', { ns: 'common' }))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预签名URL对话框 */}
      <Dialog open={showPresignedUrlDialog} onOpenChange={setShowPresignedUrlDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('presigned_url.title')}</DialogTitle>
            <DialogDescription>{t('presigned_url.description')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input value={presignedUrl} readOnly className="font-mono text-sm" />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(presignedUrl);
                showMessage.success(String(t('copied', { ns: 'common' })));
              }}
            >
              {String(t('copy', { ns: 'common' }))}
            </Button>
            <Button onClick={() => setShowPresignedUrlDialog(false)}>
              {String(t('close', { ns: 'common' }))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default S3Browser;