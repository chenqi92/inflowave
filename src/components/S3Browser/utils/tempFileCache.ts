/**
 * 临时文件缓存管理器
 * 管理视频预览的临时文件，包括缓存大小限制和自动清理
 */

import { safeTauriInvoke } from '@/utils/tauri';
import logger from '@/utils/logger';

interface TempFileInfo {
  path: string;
  size: number;
  createdAt: number;
}

class TempFileCacheManager {
  private cache: Map<string, TempFileInfo> = new Map();
  private maxCacheSize = 500 * 1024 * 1024; // 500MB
  private maxFileAge = 24 * 60 * 60 * 1000; // 24小时

  /**
   * 添加临时文件到缓存
   */
  async addFile(path: string, size: number): Promise<void> {
    this.cache.set(path, {
      path,
      size,
      createdAt: Date.now(),
    });

    // 检查缓存大小并清理
    await this.enforceCacheLimit();
  }

  /**
   * 移除临时文件
   */
  async removeFile(path: string): Promise<void> {
    try {
      await safeTauriInvoke('delete_file_env', { path });
      this.cache.delete(path);
      logger.info('Removed temp file from cache:', path);
    } catch (error) {
      logger.error('Failed to remove temp file:', path, error);
    }
  }

  /**
   * 获取当前缓存大小
   */
  getCurrentCacheSize(): number {
    let total = 0;
    for (const file of this.cache.values()) {
      total += file.size;
    }
    return total;
  }

  /**
   * 强制执行缓存大小限制
   */
  private async enforceCacheLimit(): Promise<void> {
    const currentSize = this.getCurrentCacheSize();

    if (currentSize <= this.maxCacheSize) {
      return;
    }

    // 按创建时间排序，删除最旧的文件
    const sortedFiles = Array.from(this.cache.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );

    let freedSize = 0;
    for (const file of sortedFiles) {
      if (currentSize - freedSize <= this.maxCacheSize * 0.8) {
        break;
      }

      await this.removeFile(file.path);
      freedSize += file.size;
    }

    logger.info(`Cache cleanup: freed ${(freedSize / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * 清理过期文件
   */
  async cleanupExpiredFiles(): Promise<void> {
    const now = Date.now();
    const expiredFiles: string[] = [];

    for (const [path, info] of this.cache.entries()) {
      if (now - info.createdAt > this.maxFileAge) {
        expiredFiles.push(path);
      }
    }

    for (const path of expiredFiles) {
      await this.removeFile(path);
    }

    if (expiredFiles.length > 0) {
      logger.info(`Cleaned up ${expiredFiles.length} expired temp files`);
    }
  }

  /**
   * 清理所有临时文件
   */
  async clearAll(): Promise<void> {
    const paths = Array.from(this.cache.keys());
    for (const path of paths) {
      await this.removeFile(path);
    }
    logger.info('Cleared all temp files');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    fileCount: number;
    totalSize: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    const totalSize = this.getCurrentCacheSize();
    return {
      fileCount: this.cache.size,
      totalSize,
      maxSize: this.maxCacheSize,
      utilizationPercent: (totalSize / this.maxCacheSize) * 100,
    };
  }
}

// 导出单例实例
export const tempFileCache = new TempFileCacheManager();

// 启动定期清理
if (typeof window !== 'undefined') {
  // 每小时清理一次过期文件
  setInterval(() => {
    tempFileCache.cleanupExpiredFiles();
  }, 60 * 60 * 1000);
}
