/**
 * 视频过滤器组件
 * 提供视频筛选功能
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Filter, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { formatBytes } from '@/utils/format';
import type { VideoFilterOptions, VideoResolution, VideoDuration } from '../utils/videoHelpers';

interface VideoFilterProps {
  availableFormats: string[];
  onFilterChange: (filters: VideoFilterOptions) => void;
  totalCount: number;
  filteredCount: number;
  maxFileSize?: number;
}

export const VideoFilter: React.FC<VideoFilterProps> = ({
  availableFormats,
  onFilterChange,
  totalCount,
  filteredCount,
  maxFileSize = 10 * 1024 * 1024 * 1024, // 默认最大10GB
}) => {
  const { t } = useTranslation('s3');
  const [selectedFormats, setSelectedFormats] = React.useState<string[]>([]);
  const [selectedResolution, setSelectedResolution] = React.useState<VideoResolution>('All');
  const [selectedDuration, setSelectedDuration] = React.useState<VideoDuration>('all');
  const [sizeRange, setSizeRange] = React.useState<[number, number]>([0, maxFileSize]);

  const resolutions: VideoResolution[] = ['All', '4K', '2K', 'FullHD', 'HD', 'SD', 'Low'];
  const durations: VideoDuration[] = ['all', 'short', 'medium', 'long'];

  const handleFormatToggle = (format: string, checked: boolean) => {
    const newFormats = checked
      ? [...selectedFormats, format]
      : selectedFormats.filter(f => f !== format);
    setSelectedFormats(newFormats);
  };

  const handleApplyFilter = () => {
    const filters: VideoFilterOptions = {};

    if (selectedFormats.length > 0) {
      filters.formats = selectedFormats;
    }

    if (selectedResolution !== 'All') {
      filters.resolution = selectedResolution;
    }

    if (selectedDuration !== 'all') {
      filters.durationRange = selectedDuration;
    }

    if (sizeRange[0] > 0 || sizeRange[1] < maxFileSize) {
      filters.minSize = sizeRange[0];
      filters.maxSize = sizeRange[1];
    }

    onFilterChange(filters);
  };

  const handleClearFilter = () => {
    setSelectedFormats([]);
    setSelectedResolution('All');
    setSelectedDuration('all');
    setSizeRange([0, maxFileSize]);
    onFilterChange({});
  };

  const hasActiveFilters =
    selectedFormats.length > 0 ||
    selectedResolution !== 'All' ||
    selectedDuration !== 'all' ||
    sizeRange[0] > 0 ||
    sizeRange[1] < maxFileSize;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            {t('video_filter.title')}
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilter}
              className="h-8 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              {t('video_filter.clear_filter')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 格式过滤 */}
        {availableFormats.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('video_filter.format')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableFormats.map(format => (
                <div key={format} className="flex items-center space-x-2">
                  <Checkbox
                    id={`format-${format}`}
                    checked={selectedFormats.includes(format)}
                    onCheckedChange={(checked) =>
                      handleFormatToggle(format, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`format-${format}`}
                    className="text-sm cursor-pointer uppercase"
                  >
                    {format}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 分辨率过滤 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('video_filter.resolution')}</Label>
          <Select value={selectedResolution} onValueChange={(value) => setSelectedResolution(value as VideoResolution)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resolutions.map(resolution => (
                <SelectItem key={resolution} value={resolution}>
                  {resolution === 'All' ? t('video_filter.all_resolutions') : resolution}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 时长过滤 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('video_filter.duration')}</Label>
          <Select value={selectedDuration} onValueChange={(value) => setSelectedDuration(value as VideoDuration)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('video_filter.all_durations')}</SelectItem>
              <SelectItem value="short">{t('video_filter.short')}</SelectItem>
              <SelectItem value="medium">{t('video_filter.medium')}</SelectItem>
              <SelectItem value="long">{t('video_filter.long')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 文件大小范围 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t('video_filter.size_range')}</Label>
            <div className="text-xs text-muted-foreground">
              {formatBytes(sizeRange[0])} - {formatBytes(sizeRange[1])}
            </div>
          </div>
          <Slider
            min={0}
            max={maxFileSize}
            step={1024 * 1024} // 1MB步长
            value={sizeRange}
            onValueChange={(value) => setSizeRange(value as [number, number])}
            className="py-2"
          />
        </div>

        {/* 应用按钮和结果统计 */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleApplyFilter}
            className="w-full"
            disabled={!hasActiveFilters}
          >
            {t('video_filter.apply_filter')}
          </Button>
          {hasActiveFilters && (
            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                {t('video_filter.showing_results', { count: filteredCount })} / {totalCount}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
