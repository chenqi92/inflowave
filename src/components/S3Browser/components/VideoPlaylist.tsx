/**
 * 视频播放列表组件
 * 管理和显示视频播放队列
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  List,
  Play,
  Trash2,
  MoveUp,
  MoveDown,
  Shuffle,
  X,
} from 'lucide-react';
import { formatBytes } from '@/utils/format';
import { useTranslation } from '@/hooks/useTranslation';
import type { S3Object } from '@/types/s3';
import { getFileIcon } from './FileThumbnail';

interface VideoPlaylistProps {
  videos: S3Object[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onRemove?: (index: number) => void;
  onClear?: () => void;
  onShuffle?: () => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const VideoPlaylist: React.FC<VideoPlaylistProps> = ({
  videos,
  currentIndex,
  onSelect,
  onRemove,
  onClear,
  onShuffle,
  onMoveUp,
  onMoveDown,
}) => {
  const { t } = useTranslation('s3');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (videos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <List className="h-4 w-4" />
            {t('playlist.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <List className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('playlist.empty')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <List className="h-4 w-4" />
            {t('playlist.title')}
            <Badge variant="secondary" className="ml-2">
              {videos.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            {onShuffle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShuffle}
                title={t('playlist.shuffle')}
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            )}
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                title={t('playlist.clear')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-3">
            {videos.map((video, index) => {
              const isPlaying = index === currentIndex;
              const isHovered = index === hoveredIndex;

              return (
                <div
                  key={`${video.key}-${index}`}
                  className={cn(
                    'group flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                    isPlaying && 'bg-primary/10 border border-primary/20',
                    !isPlaying && 'hover:bg-muted'
                  )}
                  onClick={() => onSelect(index)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* 序号或播放图标 */}
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {isPlaying ? (
                      <Play className="h-4 w-4 text-primary fill-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        {(index + 1).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {/* 文件图标 */}
                  <div className="flex-shrink-0 scale-150">
                    {getFileIcon(video)}
                  </div>

                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'text-sm font-medium truncate',
                      isPlaying && 'text-primary'
                    )}>
                      {video.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(video.size)}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {isHovered && !isPlaying && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onMoveUp && index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp(index);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                      )}
                      {onMoveDown && index < videos.length - 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown(index);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <MoveDown className="h-3 w-3" />
                        </Button>
                      )}
                      {onRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(index);
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
