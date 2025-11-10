/**
 * S3/MinIO 相关类型定义
 */

// 导出服务商相关类型
export * from './s3-provider';

// S3 连接配置
export interface S3ConnectionConfig {
  provider?: string; // 服务商类型
  endpoint?: string;
  region?: string;
  accessKey: string;
  secretKey: string;
  useSSL?: boolean;
  pathStyle?: boolean;
  sessionToken?: string;
  signatureVersion?: 'v2' | 'v4';
}

// S3 预签名URL结果
export interface S3PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

// 重新定义S3Config以避免重复
export interface S3Config {
  endpoint: string; // S3服务端点，例如: http://localhost:9000
  accessKey: string; // Access Key ID
  secretKey: string; // Secret Access Key
  region?: string; // 地区，例如: us-east-1，MinIO可以使用默认值
  useSSL?: boolean; // 是否使用SSL/TLS
  pathStyle?: boolean; // 是否使用path-style URLs (MinIO通常需要true)
  sessionToken?: string; // 临时安全凭证的会话令牌
  signatureVersion?: 'v2' | 'v4'; // 签名版本，默认v4
}

// S3 Bucket 信息
export interface S3Bucket {
  name: string;
  creationDate: Date;
  region?: string;
}

// S3 对象（文件/文件夹）信息
export interface S3Object {
  key: string; // 完整路径
  name: string; // 文件名
  size: number; // 文件大小（字节）
  lastModified: Date; // 最后修改时间
  etag?: string; // 实体标签
  storageClass?: string; // 存储类型
  owner?: {
    id?: string;
    displayName?: string;
  };
  isDirectory: boolean; // 是否为文件夹
  contentType?: string; // MIME类型
  contentEncoding?: string; // 内容编码
  objectCount?: number; // 对象数量（仅用于bucket根目录显示）
  tags?: Record<string, string>; // 对象标签
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read'; // 访问控制列表
}

// S3 文件夹信息（用于文件浏览器树形结构）
export interface S3Folder {
  path: string; // 文件夹路径
  name: string; // 文件夹名称
  children?: (S3Folder | S3Object)[]; // 子文件和文件夹
  isExpanded?: boolean; // UI状态：是否展开
  isLoading?: boolean; // UI状态：是否正在加载子项
}

// S3 上传配置
export interface S3UploadConfig {
  bucket: string;
  key: string; // 目标路径
  file: File | Blob; // 要上传的文件
  contentType?: string; // MIME类型
  contentEncoding?: string; // 内容编码
  metadata?: Record<string, string>; // 自定义元数据
  storageClass?: 'STANDARD' | 'REDUCED_REDUNDANCY' | 'GLACIER' | 'STANDARD_IA' | 'ONEZONE_IA' | 'INTELLIGENT_TIERING' | 'DEEP_ARCHIVE' | 'OUTPOSTS' | 'GLACIER_IR';
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read' | 'aws-exec-read' | 'bucket-owner-read' | 'bucket-owner-full-control';
  serverSideEncryption?: 'AES256' | 'aws:kms';
  onProgress?: (progress: S3UploadProgress) => void; // 进度回调
}

// S3 上传进度
export interface S3UploadProgress {
  loaded: number; // 已上传字节
  total: number; // 总字节数
  percentage: number; // 百分比 (0-100)
  speed?: number; // 上传速度 (bytes/s)
  remainingTime?: number; // 预计剩余时间（秒）
}

// S3 下载配置
export interface S3DownloadConfig {
  bucket: string;
  key: string;
  versionId?: string; // 对象版本ID（如果启用了版本控制）
  responseContentType?: string; // 响应Content-Type头
  responseContentLanguage?: string;
  responseExpires?: string;
  responseCacheControl?: string;
  responseContentDisposition?: string;
  responseContentEncoding?: string;
  onProgress?: (progress: S3DownloadProgress) => void;
}

// S3 下载进度
export interface S3DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  remainingTime?: number;
}

// S3 预签名URL配置
export interface S3PresignedUrlConfig {
  bucket: string;
  key: string;
  operation: 'getObject' | 'putObject' | 'deleteObject';
  expires?: number; // URL过期时间（秒），默认900秒（15分钟）
  versionId?: string; // 对象版本ID
  responseContentType?: string;
  responseContentDisposition?: string;
}

// S3 批量操作结果
export interface S3BatchOperationResult {
  success: boolean;
  totalCount: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

// S3 复制对象配置
export interface S3CopyObjectConfig {
  sourceBucket: string;
  sourceKey: string;
  destinationBucket: string;
  destinationKey: string;
  copySource?: string; // 完整的源路径
  metadata?: Record<string, string>;
  metadataDirective?: 'COPY' | 'REPLACE';
  storageClass?: string;
  acl?: string;
  serverSideEncryption?: string;
}

// S3 移动对象配置（复制后删除）
export interface S3MoveObjectConfig extends S3CopyObjectConfig {
  deleteSource?: boolean; // 是否删除源文件，默认true
}

// S3 列表对象配置
export interface S3ListObjectsConfig {
  bucket: string;
  prefix?: string; // 前缀过滤
  delimiter?: string; // 分隔符，用于模拟文件夹
  maxKeys?: number; // 最大返回数量
  continuationToken?: string; // 分页令牌
  startAfter?: string; // 列出指定key之后的对象
}

// S3 列表对象结果
export interface S3ListObjectsResult {
  objects: S3Object[];
  commonPrefixes: string[]; // 文件夹列表（当使用delimiter时）
  isTruncated: boolean; // 是否有更多结果
  nextContinuationToken?: string; // 下一页令牌
  keyCount: number; // 返回的对象数量
}

// S3 Bucket 策略
export interface S3BucketPolicy {
  bucket: string;
  policy: string; // JSON字符串格式的策略
}

// S3 Bucket 生命周期规则
export interface S3LifecycleRule {
  id: string;
  status: 'Enabled' | 'Disabled';
  prefix?: string;
  tags?: Record<string, string>;
  transitions?: Array<{
    days?: number;
    date?: Date;
    storageClass: string;
  }>;
  expiration?: {
    days?: number;
    date?: Date;
    expiredObjectDeleteMarker?: boolean;
  };
  noncurrentVersionTransitions?: Array<{
    noncurrentDays: number;
    storageClass: string;
  }>;
  noncurrentVersionExpiration?: {
    noncurrentDays: number;
  };
}

// S3 Bucket 版本控制配置
export interface S3VersioningConfig {
  bucket: string;
  status: 'Enabled' | 'Suspended' | 'Off';
  mfaDelete?: 'Enabled' | 'Disabled';
}

// S3 多部分上传配置
export interface S3MultipartUploadConfig {
  bucket: string;
  key: string;
  uploadId?: string;
  partSize?: number; // 每个部分的大小（字节），默认5MB
  contentType?: string;
  metadata?: Record<string, string>;
  storageClass?: string;
  acl?: string;
  serverSideEncryption?: string;
  onProgress?: (progress: S3MultipartUploadProgress) => void;
}

// S3 多部分上传进度
export interface S3MultipartUploadProgress {
  uploadId: string;
  totalParts: number;
  completedParts: number;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed?: number;
  remainingTime?: number;
}

// S3 对象元数据
export interface S3ObjectMetadata {
  contentType?: string;
  contentLanguage?: string;
  expires?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
  versionId?: string;
  deleteMarker?: boolean;
  acceptRanges?: string;
  serverSideEncryption?: string;
  storageClass?: string;
  websiteRedirectLocation?: string;
  metadata?: Record<string, string>; // 用户自定义元数据
}

// S3 错误类型
export interface S3Error {
  code: string;
  message: string;
  resource?: string;
  requestId?: string;
  hostId?: string;
  region?: string;
  statusCode?: number;
}

// S3 操作权限
export interface S3Permission {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canGetAcl: boolean;
  canSetAcl: boolean;
  canGetPolicy: boolean;
  canSetPolicy: boolean;
}

// S3 文件操作上下文（用于右键菜单等）
export interface S3FileContext {
  bucket: string;
  key: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: Date;
  selectedItems?: S3Object[]; // 多选时的所有选中项
}

// S3 文件过滤器
export interface S3FileFilter {
  name?: string; // 文件名过滤
  extension?: string[]; // 文件扩展名过滤
  minSize?: number; // 最小文件大小
  maxSize?: number; // 最大文件大小
  modifiedAfter?: Date; // 修改时间晚于
  modifiedBefore?: Date; // 修改时间早于
  contentType?: string[]; // MIME类型过滤
}

// S3 排序选项
export interface S3SortOption {
  field: 'name' | 'size' | 'lastModified' | 'contentType';
  order: 'asc' | 'desc';
}

// S3 浏览器视图配置
export interface S3BrowserViewConfig {
  viewMode: 'list' | 'grid' | 'tree'; // 视图模式
  showHidden: boolean; // 是否显示隐藏文件（以.开头的）
  showDetails: boolean; // 是否显示详细信息
  sortBy: S3SortOption; // 排序选项
  filter?: S3FileFilter; // 过滤器
  pageSize: number; // 分页大小
}

// S3 文件传输任务
export interface S3TransferTask {
  id: string;
  type: 'upload' | 'download';
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  source: string; // 源路径
  destination: string; // 目标路径
  size: number; // 文件大小
  progress: number; // 进度百分比
  speed?: number; // 传输速度
  remainingTime?: number; // 剩余时间
  startTime?: Date; // 开始时间
  endTime?: Date; // 结束时间
  error?: string; // 错误信息
}

// S3 传输队列
export interface S3TransferQueue {
  tasks: S3TransferTask[];
  maxConcurrent: number; // 最大并发任务数
  totalSize: number; // 总大小
  completedSize: number; // 已完成大小
  activeCount: number; // 活动任务数
  pendingCount: number; // 待处理任务数
  completedCount: number; // 已完成任务数
  failedCount: number; // 失败任务数
}