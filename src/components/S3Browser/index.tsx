import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  ChevronDown,
  Home,
  FolderOpen,
} from 'lucide-react';
import { S3Service } from '@/services/s3Service';
import { showMessage } from '@/utils/message';
import { formatBytes, formatDate } from '@/utils/format';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  S3Object,
  S3Bucket,
  S3ListObjectsResult,
  S3BrowserViewConfig,
} from '@/types/s3';
import './S3Browser.css';

interface S3BrowserProps {
  connectionId: string;
  connectionName?: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface FileOperation {
  type: 'copy' | 'cut';
  items: S3Object[];
  sourceBucket: string;
}

const S3Browser: React.FC<S3BrowserProps> = ({ connectionId, connectionName }) => {
  const { t } = useTranslation();
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
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

  // 加载buckets
  useEffect(() => {
    loadBuckets();
  }, [connectionId]);

  // 加载对象列表
  useEffect(() => {
    if (selectedBucket) {
      loadObjects();
    }
  }, [selectedBucket, currentPath, searchTerm, viewConfig.sortBy]);

  const loadBuckets = async () => {
    try {
      setIsLoading(true);
      const bucketList = await S3Service.listBuckets(connectionId);
      setBuckets(bucketList);
      if (bucketList.length > 0 && !selectedBucket) {
        setSelectedBucket(bucketList[0].name);
      }
    } catch (error) {
      showMessage.error(t('s3.error.load_buckets_failed') + ': ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadObjects = async (append: boolean = false) => {
    if (!selectedBucket) return;

    try {
      setIsLoading(true);
      const result = await S3Service.listObjects(
        connectionId,
        selectedBucket,
        currentPath,
        '/',
        viewConfig.pageSize,
        append ? continuationToken : undefined
      );

      let newObjects = result.objects;

      // 添加文件夹
      result.commonPrefixes.forEach(prefix => {
        newObjects.push({
          key: prefix,
          name: prefix.replace(currentPath, '').replace(/\/$/, ''),
          size: 0,
          lastModified: new Date(),
          isDirectory: true,
        });
      });

      // 过滤和排序
      if (!viewConfig.showHidden) {
        newObjects = newObjects.filter(obj => !obj.name.startsWith('.'));
      }

      if (searchTerm) {
        newObjects = newObjects.filter(obj =>
          obj.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

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
        setObjects(prev => [...prev, ...newObjects]);
      } else {
        setObjects(newObjects);
      }

      setcontinuationToken(result.nextContinuationToken);
      setHasMore(result.isTruncated);
    } catch (error) {
      showMessage.error(t('s3.error.load_objects_failed') + ': ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBucketChange = (bucket: string) => {
    setSelectedBucket(bucket);
    setCurrentPath('');
    setSelectedObjects(new Set());
  };

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    setSelectedObjects(new Set());
  };

  const handleObjectClick = (object: S3Object) => {
    if (object.isDirectory) {
      navigateToPath(object.key);
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
          selectedBucket,
          key,
          data,
          file.type
        );
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      showMessage.success(t('s3.upload.success', { count: successCount }));
      loadObjects();
    }

    if (failCount > 0) {
      showMessage.error(t('s3.upload.failed', { count: failCount }));
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
      showMessage.warning(t('s3.download.no_selection'));
      return;
    }

    setIsLoading(true);

    for (const object of toDownload) {
      if (object.isDirectory) continue;

      try {
        const blob = await S3Service.downloadObjectAsBlob(
          connectionId,
          selectedBucket,
          object.key,
          object.contentType
        );
        S3Service.triggerDownload(blob, object.name);
      } catch (error) {
        showMessage.error(t('s3.download.failed', { name: object.name }) + ': ' + error);
      }
    }

    setIsLoading(false);
  };

  const handleDelete = async () => {
    const toDelete = Array.from(selectedObjects);
    if (toDelete.length === 0) {
      showMessage.warning(t('s3.delete.no_selection'));
      return;
    }

    setShowDeleteConfirmDialog(false);
    setIsLoading(true);

    try {
      const deletedKeys = await S3Service.deleteObjects(
        connectionId,
        selectedBucket,
        toDelete
      );
      showMessage.success(t('s3.delete.success', { count: deletedKeys.length }));
      setSelectedObjects(new Set());
      loadObjects();
    } catch (error) {
      showMessage.error(t('s3.delete.failed') + ': ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showMessage.warning(t('s3.folder.name_required'));
      return;
    }

    setShowCreateFolderDialog(false);
    setIsLoading(true);

    try {
      const folderPath = currentPath + newFolderName.trim();
      await S3Service.createFolder(connectionId, selectedBucket, folderPath);
      showMessage.success(t('s3.folder.created'));
      setNewFolderName('');
      loadObjects();
    } catch (error) {
      showMessage.error(t('s3.folder.create_failed') + ': ' + error);
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
      sourceBucket: selectedBucket,
    });
    showMessage.info(t('s3.copy.copied', { count: items.length }));
  };

  const handleCut = () => {
    const items = Array.from(selectedObjects)
      .map(key => objects.find(obj => obj.key === key))
      .filter(Boolean) as S3Object[];

    setFileOperation({
      type: 'cut',
      items,
      sourceBucket: selectedBucket,
    });
    showMessage.info(t('s3.cut.cut', { count: items.length }));
  };

  const handlePaste = async () => {
    if (!fileOperation) {
      showMessage.warning(t('s3.paste.nothing'));
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
            selectedBucket,
            destKey
          );
        } else {
          await S3Service.moveObject(
            connectionId,
            fileOperation.sourceBucket,
            item.key,
            selectedBucket,
            destKey
          );
        }
      } catch (error) {
        showMessage.error(t('s3.paste.failed', { name: item.name }) + ': ' + error);
      }
    }

    setFileOperation(null);
    setIsLoading(false);
    loadObjects();
    showMessage.success(t('s3.paste.success'));
  };

  const handleGeneratePresignedUrl = async () => {
    const selected = Array.from(selectedObjects);
    if (selected.length !== 1) {
      showMessage.warning(t('s3.presigned_url.select_one'));
      return;
    }

    try {
      const result = await S3Service.generatePresignedUrl(
        connectionId,
        selectedBucket,
        selected[0],
        'get',
        3600 // 1小时
      );
      setPresignedUrl(result.url);
      setShowPresignedUrlDialog(true);
    } catch (error) {
      showMessage.error(t('s3.presigned_url.failed') + ': ' + error);
    }
  };

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: selectedBucket || 'Root', path: '' }];

    if (currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      let path = '';
      for (const part of parts) {
        path += part + '/';
        items.push({ label: part, path });
      }
    }

    return items;
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
        {/* Bucket选择器 */}
        <Select value={selectedBucket} onValueChange={handleBucketChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('s3.select_bucket')} />
          </SelectTrigger>
          <SelectContent>
            {buckets.map(bucket => (
              <SelectItem key={bucket.name} value={bucket.name}>
                {bucket.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* 操作按钮 */}
        <Button size="sm" variant="ghost" onClick={handleUpload} disabled={!selectedBucket}>
          <Upload className="w-4 h-4 mr-1" />
          {t('s3.upload')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDownload()}
          disabled={selectedObjects.size === 0}
        >
          <Download className="w-4 h-4 mr-1" />
          {t('s3.download')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowCreateFolderDialog(true)}
          disabled={!selectedBucket}
        >
          <FolderPlus className="w-4 h-4 mr-1" />
          {t('s3.new_folder')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowDeleteConfirmDialog(true)}
          disabled={selectedObjects.size === 0}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('s3.delete')}
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
              {t('s3.copy')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCut} disabled={selectedObjects.size === 0}>
              <Scissors className="w-4 h-4 mr-2" />
              {t('s3.cut')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePaste} disabled={!fileOperation}>
              <Clipboard className="w-4 h-4 mr-2" />
              {t('s3.paste')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleGeneratePresignedUrl}
              disabled={selectedObjects.size !== 1}
            >
              <Link className="w-4 h-4 mr-2" />
              {t('s3.generate_link')}
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
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-8 w-48"
            placeholder={t('s3.search')}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 面包屑导航 */}
      <div className="breadcrumbs px-2 py-1 border-b flex items-center gap-1 text-sm">
        <Home className="w-4 h-4" />
        {getBreadcrumbs().map((item, index) => (
          <React.Fragment key={item.path}>
            {index > 0 && <ChevronRight className="w-4 h-4" />}
            <button
              className="hover:underline"
              onClick={() => navigateToPath(item.path)}
            >
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
                <th className="text-left p-2">{t('s3.name')}</th>
                <th className="text-left p-2">{t('s3.size')}</th>
                <th className="text-left p-2">{t('s3.modified')}</th>
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
              {t('s3.load_more')}
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* 状态栏 */}
      <div className="statusbar px-2 py-1 border-t text-sm text-muted-foreground flex justify-between">
        <span>
          {t('s3.items', { count: objects.length })}
          {selectedObjects.size > 0 && ` | ${t('s3.selected', { count: selectedObjects.size })}`}
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
            <DialogTitle>{t('s3.new_folder')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('s3.folder.name_placeholder')}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateFolder}>{t('common.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('s3.delete.confirm_title')}</DialogTitle>
            <DialogDescription>
              {t('s3.delete.confirm_message', { count: selectedObjects.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirmDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预签名URL对话框 */}
      <Dialog open={showPresignedUrlDialog} onOpenChange={setShowPresignedUrlDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('s3.presigned_url.title')}</DialogTitle>
            <DialogDescription>{t('s3.presigned_url.description')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input value={presignedUrl} readOnly className="font-mono text-sm" />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(presignedUrl);
                showMessage.success(t('common.copied'));
              }}
            >
              {t('common.copy')}
            </Button>
            <Button onClick={() => setShowPresignedUrlDialog(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default S3Browser;