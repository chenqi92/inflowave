import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  Archive,
  File,
} from 'lucide-react';
import type { S3Object } from '@/types/s3';
import { S3Service } from '@/services/s3Service';
import { isImageFile, isVideoFile } from '../utils/fileHelpers';
import logger from '@/utils/logger';

/**
 * 获取文件图标
 */
export const getFileIcon = (object: S3Object) => {
  if (object.isDirectory) {
    return <Folder className='w-4 h-4' />;
  }

  const extension = object.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'txt':
    case 'md':
    case 'doc':
    case 'docx':
    case 'pdf':
      return <FileText className='w-4 h-4' />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'bmp':
      return <FileImage className='w-4 h-4' />;
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
    case 'flv':
      return <FileVideo className='w-4 h-4' />;
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return <FileAudio className='w-4 h-4' />;
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
      return <FileCode className='w-4 h-4' />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <Archive className='w-4 h-4' />;
    default:
      return <File className='w-4 h-4' />;
  }
};

/**
 * 文件缩略图组件
 */
interface FileThumbnailProps {
  object: S3Object;
  connectionId: string;
  currentBucket: string;
  viewMode: 'list' | 'grid' | 'tree';
}

export const FileThumbnail = React.memo<FileThumbnailProps>(
  ({ object, connectionId, currentBucket, viewMode }) => {
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
            logger.warn(
              `Failed to generate thumbnail for ${object.name}:`,
              error
            );
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
          className='w-full h-24 object-contain rounded-md bg-muted/20'
          onError={() => setThumbnailError(true)}
        />
      );
    }

    if (isVideoFile(object) && thumbnailUrl) {
      return (
        <video
          src={thumbnailUrl}
          className='w-full h-24 object-contain rounded-md bg-muted/20'
          onError={() => setThumbnailError(true)}
          preload='metadata'
        />
      );
    }

    return getFileIcon(object);
  }
);

FileThumbnail.displayName = 'FileThumbnail';
