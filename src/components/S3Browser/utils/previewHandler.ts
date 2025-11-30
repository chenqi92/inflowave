/**
 * 预览文件处理工具
 * 负责生成不同类型文件的预览内容
 */

import * as XLSX from 'xlsx';
import { S3Service } from '@/services/s3Service';
import type { S3Object } from '@/types/s3';
import { isImageFile, isVideoFile, getFileExtension } from './fileHelpers';
import { isTauriEnvironment, safeTauriInvoke } from '@/utils/tauri';
import { tempFileCache } from './tempFileCache';
import logger from '@/utils/logger';

/**
 * 预览内容类型
 */
export type PreviewContentType = 'blob' | 'text' | 'html' | 'url';

/**
 * 预览结果
 */
export interface PreviewResult {
  content: string;
  type: PreviewContentType;
  tempFilePath?: string; // 临时文件路径，用于清理
}

/**
 * 获取 MIME 类型
 */
const getMimeType = (object: S3Object, extension: string): string => {
  if (isImageFile(object)) {
    if (extension === 'svg') return 'image/svg+xml';
    if (extension === 'jpg') return 'image/jpeg';
    return `image/${extension}`;
  }

  if (isVideoFile(object)) {
    if (extension === 'mp4') return 'video/mp4';
    if (extension === 'webm') return 'video/webm';
    if (extension === 'ogg') return 'video/ogg';
    return `video/${extension}`;
  }

  if (['mp3', 'wav', 'ogg'].includes(extension)) {
    if (extension === 'mp3') return 'audio/mpeg';
    if (extension === 'wav') return 'audio/wav';
    if (extension === 'ogg') return 'audio/ogg';
    return `audio/${extension}`;
  }

  if (extension === 'pdf') return 'application/pdf';

  return 'application/octet-stream';
};

/**
 * 创建 Excel HTML 文档
 */
const createExcelHtmlDocument = (html: string): string => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    table { border-collapse: collapse; min-width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; white-space: nowrap; }
    th { background-color: #f9fafb; font-weight: 600; }
    tr:nth-child(even) { background-color: #f9fafb; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
};

/**
 * 文本文件扩展名列表
 */
const TEXT_EXTENSIONS = [
  'txt', 'md', 'json', 'xml', 'csv', 'log',
  'yaml', 'yml', 'ini', 'conf',
  'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'c', 'cpp', 'go', 'rs',
  'html', 'css', 'scss', 'sass', 'less',
  'vue', 'php', 'rb', 'sh', 'bash',
];

/**
 * 生成图片/视频/音频/PDF的blob预览
 */
export async function generateMediaPreview(
  connectionId: string,
  bucket: string,
  object: S3Object
): Promise<PreviewResult> {
  logger.info('Downloading file for preview:', object.key);

  const data = await S3Service.downloadObject(connectionId, bucket, object.key);
  const extension = getFileExtension(object.name);
  const mimeType = getMimeType(object, extension);

  // 在 Tauri 环境中，对于视频文件使用临时文件而不是 blob URL
  const isTauri = isTauriEnvironment();
  const isVideo = isVideoFile(object);

  if (isTauri && isVideo) {
    try {
      // 获取临时目录路径
      const { appCacheDir, join } = await import('@tauri-apps/api/path');
      const cacheDir = await appCacheDir();

      // 生成临时文件名
      const timestamp = Date.now();
      const fileName = `video_preview_${timestamp}.${extension}`;
      const tempPath = await join(cacheDir, 'video_previews', fileName);

      // 将二进制数据转换为 base64
      const uint8Array = new Uint8Array(data);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = btoa(binary);

      // 写入临时文件
      await safeTauriInvoke('write_binary_file', {
        path: tempPath,
        data: base64Data,
      });

      logger.info('Saved video to temp file:', tempPath);

      // 添加到缓存管理器
      await tempFileCache.addFile(tempPath, data.byteLength);

      // 使用 Tauri 的 convertFileSrc 转换路径为可访问的 URL
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      const assetUrl = convertFileSrc(tempPath);

      logger.info('Created asset URL for video preview:', assetUrl);

      // 记录缓存统计信息
      const stats = tempFileCache.getStats();
      logger.info(`Temp file cache stats: ${stats.fileCount} files, ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB / ${(stats.maxSize / 1024 / 1024).toFixed(2)}MB (${stats.utilizationPercent.toFixed(1)}%)`);

      return {
        content: assetUrl,
        type: 'url',
        tempFilePath: tempPath,
      };
    } catch (error) {
      logger.error('Failed to save video to temp file:', error);
      // 如果保存失败，回退到 blob URL
    }
  }

  // 对于其他情况，使用 blob URL
  const blob = new Blob([data.slice()], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);

  logger.info('Created blob URL for preview:', blobUrl);

  return {
    content: blobUrl,
    type: 'blob',
  };
}

/**
 * 生成文本文件预览
 */
export async function generateTextPreview(
  connectionId: string,
  bucket: string,
  object: S3Object
): Promise<PreviewResult> {
  const data = await S3Service.downloadObject(connectionId, bucket, object.key);
  const text = new TextDecoder('utf-8').decode(data);

  return {
    content: text,
    type: 'text',
  };
}

/**
 * 生成 Excel 文件预览
 */
export async function generateExcelPreview(
  connectionId: string,
  bucket: string,
  object: S3Object
): Promise<PreviewResult> {
  const data = await S3Service.downloadObject(connectionId, bucket, object.key);
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const html = XLSX.utils.sheet_to_html(firstSheet);

  // 创建完整的 HTML 文档并转换为 blob URL
  const fullHtml = createExcelHtmlDocument(html);
  const blob = new Blob([fullHtml], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  logger.info('Created blob URL for Excel preview:', blobUrl);

  return {
    content: blobUrl,
    type: 'blob',
  };
}

/**
 * 生成 Office 文件（Word/PowerPoint）的预签名 URL
 */
export async function generateOfficePreview(
  connectionId: string,
  bucket: string,
  object: S3Object
): Promise<PreviewResult> {
  const result = await S3Service.generatePresignedUrl(
    connectionId,
    bucket,
    object.key,
    'get',
    300 // 5分钟过期
  );

  return {
    content: result.url,
    type: 'url',
  };
}

/**
 * 生成预览内容（主入口）
 */
export async function generatePreviewContent(
  connectionId: string,
  bucket: string,
  object: S3Object
): Promise<PreviewResult> {
  const extension = getFileExtension(object.name);

  // 图片、视频、音频、PDF：使用 blob URL
  if (
    isImageFile(object) ||
    isVideoFile(object) ||
    ['mp3', 'wav', 'ogg', 'pdf'].includes(extension)
  ) {
    return generateMediaPreview(connectionId, bucket, object);
  }

  // 文本文件
  if (TEXT_EXTENSIONS.includes(extension)) {
    return generateTextPreview(connectionId, bucket, object);
  }

  // Excel 文件
  if (['xlsx', 'xls'].includes(extension)) {
    return generateExcelPreview(connectionId, bucket, object);
  }

  // Word/PowerPoint 文件
  if (['doc', 'docx', 'ppt', 'pptx'].includes(extension)) {
    return generateOfficePreview(connectionId, bucket, object);
  }

  throw new Error(`Unsupported file type: ${extension}`);
}

/**
 * 加载文件标签
 */
export async function loadObjectTags(
  connectionId: string,
  bucket: string,
  objectKey: string
): Promise<Record<string, string>> {
  try {
    return await S3Service.getObjectTagging(connectionId, bucket, objectKey);
  } catch (error) {
    logger.error('获取文件标签失败:', error);
    return {};
  }
}

/**
 * 清理 blob URL
 */
export function cleanupBlobUrl(url: string | null): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    logger.info('Revoked blob URL:', url);
  }
}
