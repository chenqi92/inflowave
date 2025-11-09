/**
 * S3/MinIO Service
 * 提供S3/MinIO相关的前端服务
 */

import { safeTauriInvoke } from '@/utils/tauri';
import type {
  S3Bucket,
  S3ListObjectsResult,
  S3Object,
  S3PresignedUrlResult,
  S3ConnectionConfig,
} from '@/types/s3';

export class S3Service {
  /**
   * 连接到S3/MinIO服务
   */
  static async connect(connectionId: string, config: S3ConnectionConfig): Promise<boolean> {
    return await safeTauriInvoke<boolean>('s3_connect', {
      connectionId,
      config,
    });
  }

  /**
   * 断开S3/MinIO连接
   */
  static async disconnect(connectionId: string): Promise<void> {
    await safeTauriInvoke<void>('s3_disconnect', { connectionId });
  }

  /**
   * 测试S3/MinIO连接
   */
  static async testConnection(connectionId: string): Promise<boolean> {
    return await safeTauriInvoke<boolean>('s3_test_connection', { connectionId });
  }

  /**
   * 列出所有buckets
   */
  static async listBuckets(connectionId: string): Promise<S3Bucket[]> {
    return await safeTauriInvoke<S3Bucket[]>('s3_list_buckets', { connectionId });
  }

  /**
   * 创建bucket
   */
  static async createBucket(
    connectionId: string,
    bucketName: string,
    region?: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_create_bucket', {
      connectionId,
      bucketName,
      region,
    });
  }

  /**
   * 删除bucket
   */
  static async deleteBucket(connectionId: string, bucketName: string): Promise<void> {
    await safeTauriInvoke<void>('s3_delete_bucket', {
      connectionId,
      bucketName,
    });
  }

  /**
   * 列出对象
   */
  static async listObjects(
    connectionId: string,
    bucket: string,
    prefix?: string,
    delimiter?: string,
    maxKeys?: number,
    continuationToken?: string
  ): Promise<S3ListObjectsResult> {
    return await safeTauriInvoke<S3ListObjectsResult>('s3_list_objects', {
      request: {
        connection_id: connectionId,
        bucket,
        prefix,
        delimiter,
        max_keys: maxKeys,
        continuation_token: continuationToken,
      },
    });
  }

  /**
   * 上传对象
   */
  static async uploadObject(
    connectionId: string,
    bucket: string,
    key: string,
    data: Uint8Array,
    contentType?: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_upload_object', {
      request: {
        connection_id: connectionId,
        bucket,
        key,
        data: Array.from(data),
        content_type: contentType,
      },
    });
  }

  /**
   * 下载对象
   */
  static async downloadObject(
    connectionId: string,
    bucket: string,
    key: string
  ): Promise<Uint8Array> {
    const data = await safeTauriInvoke<number[]>('s3_download_object', {
      request: {
        connection_id: connectionId,
        bucket,
        key,
      },
    });
    return new Uint8Array(data);
  }

  /**
   * 删除对象
   */
  static async deleteObject(
    connectionId: string,
    bucket: string,
    key: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_delete_object', {
      connectionId,
      bucket,
      key,
    });
  }

  /**
   * 批量删除对象
   */
  static async deleteObjects(
    connectionId: string,
    bucket: string,
    keys: string[]
  ): Promise<string[]> {
    return await safeTauriInvoke<string[]>('s3_delete_objects', {
      request: {
        connection_id: connectionId,
        bucket,
        keys,
      },
    });
  }

  /**
   * 复制对象
   */
  static async copyObject(
    connectionId: string,
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_copy_object', {
      request: {
        connection_id: connectionId,
        source_bucket: sourceBucket,
        source_key: sourceKey,
        dest_bucket: destBucket,
        dest_key: destKey,
      },
    });
  }

  /**
   * 移动对象
   */
  static async moveObject(
    connectionId: string,
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_move_object', {
      request: {
        connection_id: connectionId,
        source_bucket: sourceBucket,
        source_key: sourceKey,
        dest_bucket: destBucket,
        dest_key: destKey,
      },
    });
  }

  /**
   * 创建文件夹
   */
  static async createFolder(
    connectionId: string,
    bucket: string,
    folderPath: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_create_folder', {
      connection_id: connectionId,
      bucket,
      folder_path: folderPath,
    });
  }

  /**
   * 获取对象元数据
   */
  static async getObjectMetadata(
    connectionId: string,
    bucket: string,
    key: string
  ): Promise<Record<string, string>> {
    return await safeTauriInvoke<Record<string, string>>('s3_get_object_metadata', {
      connection_id: connectionId,
      bucket,
      key,
    });
  }

  /**
   * 生成预签名URL
   */
  static async generatePresignedUrl(
    connectionId: string,
    bucket: string,
    key: string,
    operation: 'get' | 'put',
    expiresInSeconds: number = 900
  ): Promise<S3PresignedUrlResult> {
    return await safeTauriInvoke<S3PresignedUrlResult>('s3_generate_presigned_url', {
      request: {
        connection_id: connectionId,
        bucket,
        key,
        operation,
        expires_in_seconds: expiresInSeconds,
      },
    });
  }

  /**
   * 搜索对象
   */
  static async searchObjects(
    connectionId: string,
    bucket: string,
    searchTerm: string,
    prefix?: string
  ): Promise<S3Object[]> {
    return await safeTauriInvoke<S3Object[]>('s3_search_objects', {
      request: {
        connection_id: connectionId,
        bucket,
        search_term: searchTerm,
        prefix,
      },
    });
  }

  /**
   * 上传文件（通过文件路径）
   */
  static async uploadFile(
    connectionId: string,
    bucket: string,
    key: string,
    filePath: string,
    contentType?: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_upload_file', {
      connection_id: connectionId,
      bucket,
      key,
      file_path: filePath,
      content_type: contentType,
    });
  }

  /**
   * 下载文件（保存到指定路径）
   */
  static async downloadFile(
    connectionId: string,
    bucket: string,
    key: string,
    savePath: string
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_download_file', {
      connection_id: connectionId,
      bucket,
      key,
      save_path: savePath,
    });
  }

  /**
   * 获取bucket统计信息
   */
  static async getBucketStats(
    connectionId: string,
    bucket: string
  ): Promise<{
    total_size: number;
    total_count: number;
    bucket_name: string;
  }> {
    return await safeTauriInvoke('s3_get_bucket_stats', {
      connection_id: connectionId,
      bucket,
    });
  }

  /**
   * 将文件转换为Uint8Array
   */
  static async fileToUint8Array(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 下载对象为Blob
   */
  static async downloadObjectAsBlob(
    connectionId: string,
    bucket: string,
    key: string,
    contentType?: string
  ): Promise<Blob> {
    const data = await this.downloadObject(connectionId, bucket, key);
    // 确保使用 ArrayBuffer 而不是 ArrayBufferLike
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    return new Blob([buffer], { type: contentType || 'application/octet-stream' });
  }

  /**
   * 触发浏览器下载
   */
  static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 获取对象标签
   */
  static async getObjectTagging(
    connectionId: string,
    bucket: string,
    key: string
  ): Promise<Record<string, string>> {
    return await safeTauriInvoke<Record<string, string>>('s3_get_object_tagging', {
      request: {
        connection_id: connectionId,
        bucket,
        key,
      },
    });
  }

  /**
   * 设置对象标签
   */
  static async putObjectTagging(
    connectionId: string,
    bucket: string,
    key: string,
    tags: Record<string, string>
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_put_object_tagging', {
      request: {
        connection_id: connectionId,
        bucket,
        key,
        tags,
      },
    });
  }

  /**
   * 设置对象ACL权限
   */
  static async putObjectAcl(
    connectionId: string,
    bucket: string,
    key: string,
    acl: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read'
  ): Promise<void> {
    await safeTauriInvoke<void>('s3_put_object_acl', {
      request: {
        connection_id: connectionId,
        bucket,
        key,
        acl,
      },
    });
  }
}