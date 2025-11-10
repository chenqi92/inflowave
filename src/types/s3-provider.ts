/**
 * 对象存储服务商类型定义和功能能力矩阵
 */

// 对象存储服务商类型
export type S3Provider =
  | 's3'                    // AWS S3
  | 'minio'                 // MinIO
  | 'cloudflare-r2'         // Cloudflare R2
  | 'aliyun-oss'            // 阿里云 OSS
  | 'tencent-cos'           // 腾讯云 COS
  | 'digitalocean-spaces'   // DigitalOcean Spaces
  | 'backblaze-b2'          // Backblaze B2
  | 'wasabi'                // Wasabi
  | 'qiniu-kodo'            // 七牛云 Kodo
  | 'upyun'                 // 又拍云 UPYUN
  | 'github'                // GitHub
  | 'smms'                  // SM.MS
  | 'imgur';                // Imgur

// 服务商功能能力
export interface S3ProviderCapabilities {
  // 基础操作
  createBucket: boolean;
  deleteBucket: boolean;
  listBuckets: boolean;
  
  // 对象操作
  uploadObject: boolean;
  downloadObject: boolean;
  deleteObject: boolean;
  copyObject: boolean;
  moveObject: boolean;
  
  // 文件夹操作
  createFolder: boolean;
  deleteFolder: boolean;
  
  // ACL 权限
  bucketAcl: boolean;
  objectAcl: boolean;
  supportedAcls: Array<'private' | 'public-read' | 'public-read-write' | 'authenticated-read'>;

  // Bucket Policy
  bucketPolicy: boolean;

  // 推荐的访问控制方式
  preferredAccessControl: 'acl' | 'policy' | 'both';

  // 版本控制
  versioning: boolean;
  
  // 生命周期
  lifecycle: boolean;
  
  // 复制
  replication: boolean;
  
  // 标签
  tagging: boolean;
  
  // 共享链接
  presignedUrl: boolean;
  
  // 多部分上传
  multipartUpload: boolean;
  
  // 对象锁定
  objectLocking: boolean;
  
  // 批量操作
  batchDelete: boolean;
  
  // 元数据
  customMetadata: boolean;
  
  // 存储类型
  storageClasses: string[];
  
  // 其他功能
  cors: boolean;
  encryption: boolean;
  logging: boolean;
  notifications: boolean;
  analytics: boolean;
  inventory: boolean;
  
  // 限制说明
  limitations?: string[];
  
  // 推荐替代方案
  alternatives?: Record<string, string>;
}

// 服务商功能能力矩阵
export const S3_PROVIDER_CAPABILITIES: Record<S3Provider, S3ProviderCapabilities> = {
  // AWS S3 - 完整支持
  's3': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: true,
    objectAcl: true,
    supportedAcls: ['private', 'public-read', 'public-read-write', 'authenticated-read'],
    bucketPolicy: true,
    preferredAccessControl: 'both',
    versioning: true,
    lifecycle: true,
    replication: true,
    tagging: true,
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: true,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD', 'STANDARD_IA', 'ONEZONE_IA', 'INTELLIGENT_TIERING', 'GLACIER', 'GLACIER_IR', 'DEEP_ARCHIVE'],
    cors: true,
    encryption: true,
    logging: true,
    notifications: true,
    analytics: true,
    inventory: true,
  },
  
  // MinIO - 高度兼容 S3
  'minio': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: true,  // 支持 ACL，但推荐使用 Bucket Policy
    objectAcl: true,  // 支持 ACL，但推荐使用 Bucket Policy
    supportedAcls: ['private', 'public-read', 'public-read-write', 'authenticated-read'],
    bucketPolicy: true,
    preferredAccessControl: 'policy',  // MinIO 推荐使用 Bucket Policy
    versioning: true,
    lifecycle: true,
    replication: true,
    tagging: true,
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: true,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD', 'STANDARD_IA'],
    cors: true,
    encryption: true,
    logging: false,
    notifications: true,
    analytics: false,
    inventory: false,
    limitations: [
      '虽然支持 ACL，但推荐使用 Bucket Policy 进行更细粒度的访问控制',
      '不支持 BucketWebsite，推荐使用 caddy 或 nginx',
      '不支持 BucketAnalytics 和 BucketLogging，推荐使用 Bucket Notifications'
    ],
    alternatives: {
      'ACL': 'Bucket Policy (推荐)',
      'BucketWebsite': 'caddy/nginx',
      'BucketAnalytics': 'Bucket Notifications'
    }
  },
  
  // Cloudflare R2 - 不支持 ACL 和 Tagging
  'cloudflare-r2': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: false,  // 不支持
    objectAcl: false,  // 不支持
    supportedAcls: [],
    bucketPolicy: true,
    preferredAccessControl: 'policy',  // 仅支持 Bucket Policy
    versioning: true,
    lifecycle: true,
    replication: false,
    tagging: false,  // 不支持
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: false,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD'],
    cors: true,
    encryption: true,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: [
      '不支持 ACL 操作（GetBucketAcl, PutBucketAcl, GetObjectAcl, PutObjectAcl）',
      '不支持 Object Tagging',
      '推荐使用 Bucket Policy 进行访问控制'
    ],
    alternatives: {
      'ACL': 'Bucket Policy'
    }
  },
  
  // 阿里云 OSS - 兼容 S3 协议
  'aliyun-oss': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: true,
    objectAcl: true,
    supportedAcls: ['private', 'public-read'],  // 仅支持 2 种
    bucketPolicy: true,
    preferredAccessControl: 'both',
    versioning: true,
    lifecycle: true,
    replication: true,
    tagging: true,
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: false,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD', 'IA', 'ARCHIVE', 'COLD_ARCHIVE'],
    cors: true,
    encryption: true,
    logging: true,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: [
      '仅支持 private 和 public-read 两种 ACL',
      '不支持 public-read-write 和 authenticated-read'
    ]
  },
  
  // 腾讯云 COS - 兼容 S3 协议
  'tencent-cos': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: true,
    objectAcl: true,
    supportedAcls: ['private', 'public-read'],  // 仅支持 2 种
    bucketPolicy: true,
    preferredAccessControl: 'both',
    versioning: true,
    lifecycle: true,
    replication: true,
    tagging: true,
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: false,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD', 'STANDARD_IA', 'ARCHIVE', 'DEEP_ARCHIVE'],
    cors: true,
    encryption: true,
    logging: true,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: [
      '仅支持 private 和 public-read 两种 ACL',
      '不支持 public-read-write 和 authenticated-read'
    ]
  },

  // DigitalOcean Spaces - 有限的 ACL 支持
  'digitalocean-spaces': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: true,
    objectAcl: true,
    supportedAcls: ['private', 'public-read'],  // 仅支持 2 种
    bucketPolicy: false,
    preferredAccessControl: 'acl',
    versioning: true,
    lifecycle: true,
    replication: false,
    tagging: false,
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: false,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD'],
    cors: true,
    encryption: false,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: [
      '仅支持 private 和 public-read 两种 canned ACL',
      '不支持复杂的 ACL 配置'
    ]
  },

  // Backblaze B2 - 有限的 ACL 支持
  'backblaze-b2': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: true,
    objectAcl: false,  // ACL 仅在 bucket 级别
    supportedAcls: ['private', 'public-read'],  // 仅支持 2 种
    bucketPolicy: false,
    preferredAccessControl: 'acl',
    versioning: true,
    lifecycle: false,  // 需使用 B2 Native API
    replication: false,
    tagging: false,  // 需使用 B2 Native API
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: false,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD'],
    cors: true,
    encryption: false,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: [
      '仅支持 private 和 public-read 两种 canned ACL',
      '不支持复杂的 ACL XML 配置',
      'ACL 仅在 bucket 级别设置',
      '不支持 IAM roles, Object Tagging, Lifecycle Rules（需使用 B2 Native API）'
    ]
  },
  
  // Wasabi - 标准 S3 ACL 支持
  'wasabi': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: true,
    moveObject: true,
    createFolder: true,
    deleteFolder: true,
    bucketAcl: true,
    objectAcl: true,
    supportedAcls: ['private', 'public-read', 'public-read-write', 'authenticated-read'],
    bucketPolicy: true,
    preferredAccessControl: 'acl',
    versioning: true,
    lifecycle: true,
    replication: true,
    tagging: true,
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: true,
    batchDelete: true,
    customMetadata: true,
    storageClasses: ['STANDARD'],
    cors: true,
    encryption: true,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
  },

  // 以下为图床服务，功能有限
  'qiniu-kodo': {
    createBucket: true,
    deleteBucket: true,
    listBuckets: true,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: false,
    moveObject: false,
    createFolder: false,
    deleteFolder: false,
    bucketAcl: true,
    objectAcl: false,
    supportedAcls: ['private', 'public-read'],
    bucketPolicy: false,
    preferredAccessControl: 'acl',
    versioning: false,
    lifecycle: false,
    replication: false,
    tagging: false,
    presignedUrl: true,
    multipartUpload: true,
    objectLocking: false,
    batchDelete: true,
    customMetadata: false,
    storageClasses: ['STANDARD'],
    cors: false,
    encryption: false,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: ['主要用于图床，功能有限']
  },
  
  'upyun': {
    createBucket: false,
    deleteBucket: false,
    listBuckets: false,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: false,
    moveObject: false,
    createFolder: false,
    deleteFolder: false,
    bucketAcl: false,
    objectAcl: false,
    supportedAcls: [],
    bucketPolicy: false,
    preferredAccessControl: 'acl',
    versioning: false,
    lifecycle: false,
    replication: false,
    tagging: false,
    presignedUrl: false,
    multipartUpload: false,
    objectLocking: false,
    batchDelete: false,
    customMetadata: false,
    storageClasses: [],
    cors: false,
    encryption: false,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: ['主要用于图床，功能非常有限']
  },

  'github': {
    createBucket: false,
    deleteBucket: false,
    listBuckets: false,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: false,
    moveObject: false,
    createFolder: false,
    deleteFolder: false,
    bucketAcl: false,
    objectAcl: false,
    supportedAcls: [],
    bucketPolicy: false,
    preferredAccessControl: 'acl',
    versioning: true,  // Git 版本控制
    lifecycle: false,
    replication: false,
    tagging: false,
    presignedUrl: false,
    multipartUpload: false,
    objectLocking: false,
    batchDelete: false,
    customMetadata: false,
    storageClasses: [],
    cors: false,
    encryption: false,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: ['使用 GitHub 作为图床，功能非常有限']
  },

  'smms': {
    createBucket: false,
    deleteBucket: false,
    listBuckets: false,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: false,
    moveObject: false,
    createFolder: false,
    deleteFolder: false,
    bucketAcl: false,
    objectAcl: false,
    supportedAcls: [],
    bucketPolicy: false,
    preferredAccessControl: 'acl',
    versioning: false,
    lifecycle: false,
    replication: false,
    tagging: false,
    presignedUrl: false,
    multipartUpload: false,
    objectLocking: false,
    batchDelete: false,
    customMetadata: false,
    storageClasses: [],
    cors: false,
    encryption: false,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: ['免费图床服务，功能非常有限']
  },
  
  'imgur': {
    createBucket: false,
    deleteBucket: false,
    listBuckets: false,
    uploadObject: true,
    downloadObject: true,
    deleteObject: true,
    copyObject: false,
    moveObject: false,
    createFolder: false,
    deleteFolder: false,
    bucketAcl: false,
    objectAcl: false,
    supportedAcls: [],
    bucketPolicy: false,
    preferredAccessControl: 'acl',
    versioning: false,
    lifecycle: false,
    replication: false,
    tagging: false,
    presignedUrl: false,
    multipartUpload: false,
    objectLocking: false,
    batchDelete: false,
    customMetadata: false,
    storageClasses: [],
    cors: false,
    encryption: false,
    logging: false,
    notifications: false,
    analytics: false,
    inventory: false,
    limitations: ['免费图床服务，功能非常有限，可能需要代理']
  },
};

// 获取服务商功能能力
export function getProviderCapabilities(provider?: S3Provider): S3ProviderCapabilities {
  if (!provider) {
    // 默认返回 AWS S3 的能力
    return S3_PROVIDER_CAPABILITIES['s3'];
  }
  return S3_PROVIDER_CAPABILITIES[provider] || S3_PROVIDER_CAPABILITIES['s3'];
}

// 检查服务商是否支持某个功能
export function isFeatureSupported(provider: S3Provider | undefined, feature: keyof S3ProviderCapabilities): boolean {
  const capabilities = getProviderCapabilities(provider);
  const value = capabilities[feature];
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  return false;
}

// 获取服务商支持的 ACL 类型
export function getSupportedAcls(provider: S3Provider | undefined): Array<'private' | 'public-read' | 'public-read-write' | 'authenticated-read'> {
  const capabilities = getProviderCapabilities(provider);
  return capabilities.supportedAcls;
}

// 获取服务商的限制说明
export function getProviderLimitations(provider: S3Provider | undefined): string[] {
  const capabilities = getProviderCapabilities(provider);
  return capabilities.limitations || [];
}

// 获取服务商的替代方案
export function getProviderAlternatives(provider: S3Provider | undefined): Record<string, string> {
  const capabilities = getProviderCapabilities(provider);
  return capabilities.alternatives || {};
}

