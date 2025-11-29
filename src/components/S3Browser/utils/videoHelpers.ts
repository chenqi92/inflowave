/**
 * 视频相关辅助函数
 */
import type { S3Object } from '@/types/s3';

/**
 * 视频文件格式
 */
export const VIDEO_FORMATS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'] as const;

/**
 * 视频分辨率分类
 */
export type VideoResolution = '4K' | '2K' | 'FullHD' | 'HD' | 'SD' | 'Low' | 'All';

/**
 * 视频时长分类（秒）
 */
export type VideoDuration = 'short' | 'medium' | 'long' | 'all';

export const DURATION_RANGES = {
  short: { min: 0, max: 300 }, // 0-5分钟
  medium: { min: 300, max: 1800 }, // 5-30分钟
  long: { min: 1800, max: Infinity }, // 30分钟以上
  all: { min: 0, max: Infinity },
} as const;

/**
 * 视频过滤器选项
 */
export interface VideoFilterOptions {
  formats?: string[];
  resolution?: VideoResolution;
  durationRange?: VideoDuration;
  minSize?: number;
  maxSize?: number;
}

/**
 * 检查文件是否为视频格式
 */
export function isVideoFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? VIDEO_FORMATS.includes(ext as any) : false;
}

/**
 * 获取文件扩展名
 */
export function getVideoFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || 'unknown';
}

/**
 * 根据分辨率分类视频
 */
export function categorizeResolution(width: number, height: number): VideoResolution {
  if (width >= 3840 && height >= 2160) return '4K';
  if (width >= 2560 && height >= 1440) return '2K';
  if (width >= 1920 && height >= 1080) return 'FullHD';
  if (width >= 1280 && height >= 720) return 'HD';
  if (width >= 854 && height >= 480) return 'SD';
  return 'Low';
}

/**
 * 根据时长分类视频
 */
export function categorizeDuration(durationInSeconds: number): VideoDuration {
  if (durationInSeconds < 300) return 'short';
  if (durationInSeconds < 1800) return 'medium';
  return 'long';
}

/**
 * 过滤视频列表
 */
export function filterVideos(
  videos: S3Object[],
  options: VideoFilterOptions
): S3Object[] {
  let filtered = [...videos];

  // 按格式过滤
  if (options.formats && options.formats.length > 0) {
    filtered = filtered.filter(video => {
      const format = getVideoFormat(video.name);
      return options.formats!.includes(format);
    });
  }

  // 按文件大小过滤
  if (options.minSize !== undefined) {
    filtered = filtered.filter(video => video.size >= options.minSize!);
  }
  if (options.maxSize !== undefined) {
    filtered = filtered.filter(video => video.size <= options.maxSize!);
  }

  return filtered;
}

/**
 * 从视频列表中提取所有使用的格式
 */
export function extractUsedFormats(videos: S3Object[]): string[] {
  const formats = new Set<string>();
  videos.forEach(video => {
    if (!video.isDirectory) {
      const format = getVideoFormat(video.name);
      if (format !== 'unknown') {
        formats.add(format);
      }
    }
  });
  return Array.from(formats).sort();
}

/**
 * 获取视频统计信息
 */
export interface VideoStatistics {
  total: number;
  totalSize: number;
  formats: Record<string, number>;
  avgSize: number;
}

export function getVideoStatistics(videos: S3Object[]): VideoStatistics {
  const stats: VideoStatistics = {
    total: videos.length,
    totalSize: 0,
    formats: {},
    avgSize: 0,
  };

  videos.forEach(video => {
    if (!video.isDirectory) {
      stats.totalSize += video.size;
      const format = getVideoFormat(video.name);
      stats.formats[format] = (stats.formats[format] || 0) + 1;
    }
  });

  stats.avgSize = stats.total > 0 ? stats.totalSize / stats.total : 0;

  return stats;
}

/**
 * 随机打乱数组
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 创建播放列表 - 从当前文件夹中提取所有视频文件
 */
export function createPlaylistFromFolder(
  objects: S3Object[],
  currentObject?: S3Object
): { playlist: S3Object[]; currentIndex: number } {
  const videos = objects.filter(obj => !obj.isDirectory && isVideoFile(obj.name));

  let currentIndex = 0;
  if (currentObject) {
    currentIndex = videos.findIndex(v => v.key === currentObject.key);
    if (currentIndex === -1) currentIndex = 0;
  }

  return { playlist: videos, currentIndex };
}
