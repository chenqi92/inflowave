/**
 * 视频信息显示组件
 * 显示视频的详细元数据
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileVideo, Clock, Maximize2, HardDrive, Calendar, Tag } from 'lucide-react';
import { formatBytes, formatDate } from '@/utils/format';
import { useTranslation } from '@/hooks/useTranslation';
import type { S3Object } from '@/types/s3';

interface VideoInfoProps {
  object: S3Object;
  videoElement?: HTMLVideoElement | null;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
}

export const VideoInfo: React.FC<VideoInfoProps> = ({ object, videoElement }) => {
  const { t } = useTranslation('s3');
  const [metadata, setMetadata] = useState<VideoMetadata>({
    duration: 0,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      setMetadata({
        duration: videoElement.duration,
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      });
    };

    if (videoElement.readyState >= 1) {
      handleLoadedMetadata();
    } else {
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoElement]);

  const formatDuration = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'Unknown';
  };

  const getResolutionCategory = (width: number, height: number): string => {
    if (width >= 3840 && height >= 2160) return '4K/UHD';
    if (width >= 2560 && height >= 1440) return '2K/QHD';
    if (width >= 1920 && height >= 1080) return 'Full HD';
    if (width >= 1280 && height >= 720) return 'HD';
    if (width >= 854 && height >= 480) return 'SD';
    return 'Low';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileVideo className="h-4 w-4" />
          {t('video_info.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 文件名 */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-muted-foreground">{t('video_info.filename')}:</span>
          <span className="text-sm font-mono text-right break-all">{object.name}</span>
        </div>

        <Separator />

        {/* 文件大小 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {t('video_info.size')}:
          </span>
          <Badge variant="secondary">{formatBytes(object.size)}</Badge>
        </div>

        {/* 时长 */}
        {metadata.duration > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('video_info.duration')}:
            </span>
            <Badge variant="secondary">{formatDuration(metadata.duration)}</Badge>
          </div>
        )}

        {/* 分辨率 */}
        {metadata.width > 0 && metadata.height > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />
              {t('video_info.resolution')}:
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {metadata.width} × {metadata.height}
              </Badge>
              <Badge variant="outline">
                {getResolutionCategory(metadata.width, metadata.height)}
              </Badge>
            </div>
          </div>
        )}

        {/* 格式 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('video_info.format')}:</span>
          <Badge variant="outline">{getFileExtension(object.name)}</Badge>
        </div>

        {/* 修改时间 */}
        {object.lastModified && (
          <>
            <Separator />
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('video_info.modified')}:
              </span>
              <span className="text-sm text-right">{formatDate(object.lastModified)}</span>
            </div>
          </>
        )}

        {/* 标签 */}
        {object.tags && Object.keys(object.tags).length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {t('video_info.tags')}:
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(object.tags).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* 估算码率 */}
        {metadata.duration > 0 && object.size > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('video_info.bitrate')}:</span>
              <Badge variant="secondary">
                {Math.round((object.size * 8) / metadata.duration / 1000)} kbps
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
