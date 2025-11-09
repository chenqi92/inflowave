/**
 * S3Browser 文件相关工具函数
 */

import type { S3Object } from '@/types/s3';

/**
 * 判断文件是否为图片
 */
export const isImageFile = (object: S3Object): boolean => {
  if (object.isDirectory) return false;
  const extension = object.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(
    extension || ''
  );
};

/**
 * 判断文件是否为视频
 */
export const isVideoFile = (object: S3Object): boolean => {
  if (object.isDirectory) return false;
  const extension = object.name.split('.').pop()?.toLowerCase();
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(
    extension || ''
  );
};

/**
 * 判断文件是否为音频
 */
export const isAudioFile = (object: S3Object): boolean => {
  if (object.isDirectory) return false;
  const extension = object.name.split('.').pop()?.toLowerCase();
  return ['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension || '');
};

/**
 * 判断文件是否可预览
 */
export const isPreviewableFile = (object: S3Object): boolean => {
  if (object.isDirectory) return false;
  const extension = object.name.split('.').pop()?.toLowerCase();

  const previewableExtensions = [
    // 图片
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp',
    // 视频
    'mp4', 'webm', 'ogg',
    // 音频
    'mp3', 'wav', 'ogg',
    // 文档
    'pdf', 'txt', 'md', 'json', 'xml', 'csv', 'log',
    'yaml', 'yml', 'ini', 'conf',
    // 代码
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp',
    'go', 'rs', 'html', 'css', 'scss', 'sass', 'less',
    'vue', 'php', 'rb', 'sh', 'bash',
    // Excel
    'xlsx', 'xls',
  ];

  return previewableExtensions.includes(extension || '');
};

/**
 * 获取文件扩展名
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * 判断文件类型分类
 */
export const getFileType = (object: S3Object): string => {
  if (object.isDirectory) return 'folder';

  const extension = getFileExtension(object.name);

  // 图片
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(extension)) {
    return 'image';
  }

  // 视频
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
    return 'video';
  }

  // 音频
  if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension)) {
    return 'audio';
  }

  // 文档
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(extension)) {
    return 'document';
  }

  // 表格
  if (['xlsx', 'xls', 'csv'].includes(extension)) {
    return 'spreadsheet';
  }

  // 代码
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs',
       'html', 'css', 'scss', 'sass', 'less', 'vue', 'php', 'rb', 'sh', 'bash'].includes(extension)) {
    return 'code';
  }

  // 压缩包
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
    return 'archive';
  }

  return 'file';
};

/**
 * 判断是否支持生成分享链接
 */
export const canGenerateShareLink = (object: S3Object): boolean => {
  return !object.isDirectory;
};

/**
 * 从路径中提取文件夹名称
 */
export const getFolderNameFromPath = (path: string): string => {
  // 移除末尾的斜杠
  const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
  // 获取最后一个路径段
  const segments = cleanPath.split('/');
  return segments[segments.length - 1] || '';
};

/**
 * 构建完整的对象路径
 */
export const buildObjectPath = (prefix: string, objectName: string): string => {
  if (!prefix) return objectName;
  return prefix.endsWith('/') ? `${prefix}${objectName}` : `${prefix}/${objectName}`;
};

/**
 * 解析路径为面包屑导航项
 */
export const parseBreadcrumbs = (
  bucket: string,
  prefix: string
): Array<{ label: string; path: string; isBucket?: boolean }> => {
  const items: Array<{ label: string; path: string; isBucket?: boolean }> = [];

  if (bucket) {
    items.push({ label: bucket, path: '', isBucket: true });

    if (prefix) {
      const segments = prefix.split('/').filter(Boolean);
      let currentPath = '';

      segments.forEach((segment, index) => {
        currentPath += `${segment  }/`;
        items.push({
          label: segment,
          path: currentPath,
          isBucket: false,
        });
      });
    }
  }

  return items;
};

/**
 * 检查文件名是否有效
 */
export const isValidFileName = (name: string): boolean => {
  if (!name || name.trim().length === 0) return false;

  // 检查是否包含非法字符
  const illegalChars = /[<>:"|?*\x00-\x1f]/;
  if (illegalChars.test(name)) return false;

  // 检查是否以点或空格开头/结尾
  if (name.startsWith('.') || name.startsWith(' ') ||
      name.endsWith('.') || name.endsWith(' ')) {
    return false;
  }

  return true;
};

/**
 * 检查是否为系统保留名称
 */
export const isReservedName = (name: string): boolean => {
  const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3',
                    'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
                    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6',
                    'LPT7', 'LPT8', 'LPT9'];

  return reserved.includes(name.toUpperCase());
};
