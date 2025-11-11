import { BaseConnector } from './BaseConnector';
import type { FormSection, BaseConnectionConfig, ValidationErrors } from './types';
import type { ConnectionConfig } from '@/types';
import { getDatabaseBrandIcon } from '@/utils/iconLoader';
import { tConn as t } from '@/i18n';
import { getProxyConfigSection } from './proxyConfig';

/**
 * 对象存储配置
 */
export interface ObjectStorageConfig extends BaseConnectionConfig {
  dbType: 'object-storage';
  objectStorageProvider: 's3' | 'minio' | 'aliyun-oss' | 'tencent-cos' | 'qiniu-kodo' | 'upyun' | 'github' | 'smms' | 'imgur' | 'cloudflare-r2' | 'digitalocean-spaces' | 'backblaze-b2' | 'wasabi';
  s3Endpoint?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3UseSSL?: boolean;
  s3PathStyle?: boolean;
  s3SessionToken?: string;
  bucket?: string;
  // 腾讯云COS特有字段
  cosAppId?: string;
  // 七牛云Kodo字段
  qiniuAccessUrl?: string;  // 七牛云访问网址
  // 又拍云UPYUN字段
  upyunOperator?: string;    // 操作员
  upyunOperatorPassword?: string;  // 操作员密码
  upyunServiceName?: string; // 服务名
  upyunAccelerateUrl?: string; // 加速域名
  // GitHub字段
  githubRepo?: string;       // 仓库名 username/repo
  githubBranch?: string;     // 分支名
  githubToken?: string;      // GitHub Token
  // SM.MS字段
  smmsToken?: string;        // SM.MS API Token
  smmsBackupDomain?: string; // 备用上传域名
  // Imgur字段
  imgurClientId?: string;    // Imgur Client ID
  proxyUrl?: string;         // 代理URL (Imgur)
  // 存储路径前缀（可选）
  storagePath?: string;
  // 自定义域名（可选）
  customDomain?: string;
  // 地址后缀（图片处理参数）
  urlSuffix?: string;
}

/**
 * 对象存储连接器
 */
export class ObjectStorageConnector extends BaseConnector<ObjectStorageConfig> {
  type = 'object-storage';
  displayName = t('object_storage.title');
  icon = getDatabaseBrandIcon('S3');

  /**
   * 获取服务商选项
   */
  private getProviderOptions() {
    return [
      { value: 's3', label: 'Amazon S3' },
      { value: 'minio', label: 'MinIO' },
      { value: 'cloudflare-r2', label: 'Cloudflare R2' },
      { value: 'digitalocean-spaces', label: 'DigitalOcean Spaces' },
      { value: 'backblaze-b2', label: 'Backblaze B2' },
      { value: 'wasabi', label: 'Wasabi' },
      { value: 'aliyun-oss', label: t('object_storage.aliyun_oss') },
      { value: 'tencent-cos', label: t('object_storage.tencent_cos') },
      { value: 'qiniu-kodo', label: t('object_storage.qiniu_kodo') },
      { value: 'upyun', label: t('object_storage.upyun') },
      { value: 'github', label: 'GitHub' },
      { value: 'smms', label: 'SM.MS' },
      { value: 'imgur', label: 'Imgur' }
    ];
  }

  /**
   * 获取区域选项
   */
  private getRegionOptions(provider: string) {
    switch (provider) {
      case 's3':
        return [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'Europe (Ireland)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
          { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' }
        ];
      case 'cloudflare-r2':
        return [
          { value: 'auto', label: 'Automatic' }
        ];
      case 'digitalocean-spaces':
        return [
          { value: 'nyc3', label: 'New York 3' },
          { value: 'sfo3', label: 'San Francisco 3' },
          { value: 'sgp1', label: 'Singapore 1' },
          { value: 'fra1', label: 'Frankfurt 1' }
        ];
      case 'backblaze-b2':
        return [
          { value: 'us-west-001', label: 'US West (California)' },
          { value: 'us-west-002', label: 'US West (Arizona)' },
          { value: 'eu-central-003', label: 'EU Central (Amsterdam)' }
        ];
      case 'wasabi':
        return [
          { value: 'us-east-1', label: 'US East 1 (N. Virginia)' },
          { value: 'us-east-2', label: 'US East 2 (N. Virginia)' },
          { value: 'us-west-1', label: 'US West 1 (Oregon)' },
          { value: 'eu-central-1', label: 'EU Central 1 (Amsterdam)' },
          { value: 'ap-northeast-1', label: 'AP Northeast 1 (Tokyo)' }
        ];
      case 'aliyun-oss':
        return [
          { value: 'oss-cn-beijing', label: t('object_storage.region_beijing') },
          { value: 'oss-cn-shanghai', label: t('object_storage.region_shanghai') },
          { value: 'oss-cn-shenzhen', label: t('object_storage.region_shenzhen') },
          { value: 'oss-cn-hangzhou', label: t('object_storage.region_hangzhou') }
        ];
      case 'tencent-cos':
        return [
          { value: 'ap-beijing', label: t('object_storage.region_beijing') },
          { value: 'ap-shanghai', label: t('object_storage.region_shanghai') },
          { value: 'ap-guangzhou', label: t('object_storage.region_guangzhou') }
        ];
      case 'qiniu-kodo':
        return [
          { value: 'z0', label: t('object_storage.qiniu_z0') },
          { value: 'z1', label: t('object_storage.qiniu_z1') },
          { value: 'z2', label: t('object_storage.qiniu_z2') },
          { value: 'na0', label: t('object_storage.qiniu_na0') },
          { value: 'as0', label: t('object_storage.qiniu_as0') }
        ];
      default:
        return [];
    }
  }

  /**
   * 获取服务商选择字段
   * 这个字段会在对话框级别渲染，在 name 和 description 之后，tabs 之前
   */
  getProviderField(): any {
    return {
      name: 'objectStorageProvider',
      label: t('object_storage.provider'),
      type: 'select',
      required: true,
      defaultValue: 's3',
      options: this.getProviderOptions(),
      description: t('object_storage.provider_description')
    };
  }

  /**
   * 获取表单配置
   */
  getFormSections(): FormSection[] {
    // 不使用 basic section，服务商选择器会在对话框级别渲染

    // 对象存储配置
    const storageSection: FormSection = {
      id: 'storage',
      title: t('object_storage.settings'),
      fields: [
        // S3/MinIO/OSS/COS/R2/Spaces/B2/Wasabi - Endpoint (内网端点)
        {
          name: 's3Endpoint',
          label: t('object_storage.endpoint'),
          type: 'text',
          visible: (formData: any) => ['s3', 'minio', 'aliyun-oss', 'tencent-cos', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          placeholder: 'https://s3.amazonaws.com',
          description: t('object_storage.endpoint_description'),
          validation: (value: string, formData: any) => {
            if (['minio', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider) && !value?.trim()) {
              return t('object_storage.endpoint_required');
            }
          }
        },
        // S3/OSS/COS/七牛云/R2/Spaces/B2/Wasabi - Region
        {
          name: 's3Region',
          label: t('object_storage.region'),
          type: 'select',
          required: true,
          options: (formData: any) => this.getRegionOptions(formData.objectStorageProvider || 's3'),
          visible: (formData) => ['s3', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          validation: (value: string, formData: any) => {
            if (['s3', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider) && !value?.trim()) {
              return t('object_storage.region_required');
            }
          }
        },
        // S3/MinIO/OSS/COS/七牛云/又拍云/R2/Spaces/B2/Wasabi - Bucket/服务名 (可选)
        {
          name: 'bucket',
          label: (formData: any) => {
            if (formData.objectStorageProvider === 'upyun') {
              return t('object_storage.upyun_service_name');
            }
            return t('object_storage.bucket');
          },
          type: 'text',
          required: false,  // 改为非必填
          visible: (formData) => ['s3', 'minio', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'upyun', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          placeholder: t('object_storage.bucket_placeholder_optional'),
          description: t('object_storage.bucket_description_optional'),
          // 移除验证，因为现在是可选字段
        },
        // 七牛云 - 访问网址
        {
          name: 'qiniuAccessUrl',
          label: t('object_storage.qiniu_access_url'),
          type: 'text',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'qiniu-kodo',
          placeholder: t('object_storage.qiniu_access_url_placeholder'),
          description: t('object_storage.qiniu_access_url_description'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'qiniu-kodo' && !value?.trim()) {
              return t('object_storage.qiniu_access_url_required');
            }
          }
        },
        // 又拍云 - 加速域名
        {
          name: 'upyunAccelerateUrl',
          label: t('object_storage.upyun_accelerate_url'),
          type: 'text',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'upyun',
          placeholder: t('object_storage.upyun_accelerate_url_placeholder'),
          description: t('object_storage.upyun_accelerate_url_description'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'upyun' && !value?.trim()) {
              return t('object_storage.upyun_accelerate_url_required');
            }
          }
        },
        // GitHub - 仓库名
        {
          name: 'githubRepo',
          label: t('object_storage.github_repo'),
          type: 'text',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'github',
          placeholder: t('object_storage.github_repo_placeholder'),
          description: t('object_storage.github_repo_description'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'github' && !value?.trim()) {
              return t('object_storage.github_repo_required');
            }
          }
        },
        // GitHub - 分支名
        {
          name: 'githubBranch',
          label: t('object_storage.github_branch'),
          type: 'text',
          required: true,
          defaultValue: 'main',
          visible: (formData) => formData.objectStorageProvider === 'github',
          placeholder: t('object_storage.github_branch_placeholder'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'github' && !value?.trim()) {
              return t('object_storage.github_branch_required');
            }
          }
        },
        // SM.MS - 备用上传域名
        {
          name: 'smmsBackupDomain',
          label: t('object_storage.smms_backup_domain'),
          type: 'text',
          visible: (formData) => formData.objectStorageProvider === 'smms',
          placeholder: t('object_storage.smms_backup_domain_placeholder'),
          description: t('object_storage.smms_backup_domain_description')
        }
      ]
    };

    // 认证配置
    const authSection: FormSection = {
      id: 'auth',
      title: t('object_storage.auth_settings'),
      fields: [
        // S3/MinIO/阿里云OSS/腾讯云COS/七牛云/R2/Spaces/B2/Wasabi - Access Key
        {
          name: 's3AccessKey',
          label: t('object_storage.access_key'),
          type: 'text',
          required: true,
          visible: (formData) => ['s3', 'minio', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          placeholder: t('object_storage.access_key_placeholder'),
          width: 'half',
          validation: (value: string, formData: any) => {
            if (['s3', 'minio', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider) && !value?.trim()) {
              return t('object_storage.access_key_required');
            }
          }
        },
        // S3/MinIO/阿里云OSS/腾讯云COS/七牛云/R2/Spaces/B2/Wasabi - Secret Key
        {
          name: 's3SecretKey',
          label: t('object_storage.secret_key'),
          type: 'password',
          required: true,
          visible: (formData) => ['s3', 'minio', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          placeholder: t('object_storage.secret_key_placeholder'),
          width: 'half',
          validation: (value: string, formData: any) => {
            if (['s3', 'minio', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider) && !value?.trim()) {
              return t('object_storage.secret_key_required');
            }
          }
        },
        // 腾讯云COS - AppId
        {
          name: 'cosAppId',
          label: t('object_storage.cos_app_id'),
          type: 'text',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'tencent-cos',
          placeholder: t('object_storage.cos_app_id_placeholder'),
          description: t('object_storage.cos_app_id_description'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'tencent-cos' && !value?.trim()) {
              return t('object_storage.cos_app_id_required');
            }
          }
        },
        // 又拍云 - 操作员
        {
          name: 'upyunOperator',
          label: t('object_storage.upyun_operator'),
          type: 'text',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'upyun',
          placeholder: t('object_storage.upyun_operator_placeholder'),
          width: 'half',
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'upyun' && !value?.trim()) {
              return t('object_storage.upyun_operator_required');
            }
          }
        },
        // 又拍云 - 操作员密码
        {
          name: 'upyunOperatorPassword',
          label: t('object_storage.upyun_operator_password'),
          type: 'password',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'upyun',
          placeholder: t('object_storage.upyun_operator_password_placeholder'),
          description: t('object_storage.upyun_operator_password_description'),
          width: 'half',
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'upyun' && !value?.trim()) {
              return t('object_storage.upyun_operator_password_required');
            }
          }
        },
        // GitHub - Token
        {
          name: 'githubToken',
          label: t('object_storage.github_token'),
          type: 'password',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'github',
          placeholder: t('object_storage.github_token_placeholder'),
          description: t('object_storage.github_token_description'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'github' && !value?.trim()) {
              return t('object_storage.github_token_required');
            }
          }
        },
        // SM.MS - Token
        {
          name: 'smmsToken',
          label: t('object_storage.smms_token'),
          type: 'password',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'smms',
          placeholder: t('object_storage.smms_token_placeholder'),
          description: t('object_storage.smms_token_description'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'smms' && !value?.trim()) {
              return t('object_storage.smms_token_required');
            }
          }
        },
        // Imgur - Client ID
        {
          name: 'imgurClientId',
          label: t('object_storage.imgur_client_id'),
          type: 'text',
          required: true,
          visible: (formData) => formData.objectStorageProvider === 'imgur',
          placeholder: t('object_storage.imgur_client_id_placeholder'),
          description: t('object_storage.imgur_client_id_description'),
          validation: (value: string, formData: any) => {
            if (formData.objectStorageProvider === 'imgur' && !value?.trim()) {
              return t('object_storage.imgur_client_id_required');
            }
          }
        },
        // S3/MinIO - Session Token (可选)
        {
          name: 's3SessionToken',
          label: t('object_storage.session_token'),
          type: 'password',
          visible: (formData) => ['s3', 'minio'].includes(formData.objectStorageProvider),
          placeholder: t('object_storage.session_token_placeholder'),
          description: t('object_storage.session_token_description')
        }
      ]
    };

    // 高级配置
    const advancedSection: FormSection = {
      id: 'advanced',
      title: t('advanced_settings'),
      fields: [
        // 通用选项
        {
          name: 'storagePath',
          label: t('object_storage.storage_path'),
          type: 'text',
          visible: (formData) => !['smms', 'imgur'].includes(formData.objectStorageProvider),
          placeholder: t('object_storage.storage_path_placeholder'),
          description: t('object_storage.storage_path_description')
        },
        {
          name: 'customDomain',
          label: t('object_storage.custom_domain'),
          type: 'text',
          visible: (formData) => ['s3', 'minio', 'aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'upyun', 'github', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          placeholder: t('object_storage.custom_domain_placeholder'),
          description: t('object_storage.custom_domain_description')
        },
        {
          name: 'urlSuffix',
          label: t('object_storage.url_suffix'),
          type: 'text',
          visible: (formData) => ['aliyun-oss', 'tencent-cos', 'qiniu-kodo', 'upyun'].includes(formData.objectStorageProvider),
          placeholder: t('object_storage.url_suffix_placeholder'),
          description: t('object_storage.url_suffix_description')
        },
        // S3/MinIO/R2/Spaces/B2/Wasabi 特有选项
        {
          name: 's3UseSSL',
          label: t('object_storage.use_ssl'),
          type: 'switch',
          defaultValue: true,
          visible: (formData) => ['s3', 'minio', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          description: t('object_storage.use_ssl_description')
        },
        {
          name: 's3PathStyle',
          label: t('object_storage.path_style'),
          type: 'switch',
          defaultValue: false,
          visible: (formData) => ['s3', 'minio', 'cloudflare-r2', 'digitalocean-spaces', 'backblaze-b2', 'wasabi'].includes(formData.objectStorageProvider),
          description: t('object_storage.path_style_description')
        },
        // Imgur 代理
        {
          name: 'proxyUrl',
          label: t('object_storage.proxy_url'),
          type: 'text',
          visible: (formData) => formData.objectStorageProvider === 'imgur',
          placeholder: 'http://127.0.0.1:1080',
          description: t('object_storage.proxy_url_description')
        },
        {
          name: 'timeout',
          label: t('timeout'),
          type: 'number',
          defaultValue: 30,
          min: 5,
          max: 300,
          description: t('timeout_description'),
          validation: (value: number) => {
            if (value < 5 || value > 300) {
              return t('validation.timeout_range');
            }
          }
        }
      ]
    };

    return [
      storageSection,
      authSection,
      advancedSection
    ];
  }

  /**
   * 验证表单数据
   */
  validate(formData: ObjectStorageConfig): ValidationErrors {
    const errors: ValidationErrors = {};
    const sections = this.getFormSections();

    for (const section of sections) {
      for (const field of section.fields) {
        // 检查是否可见
        if (field.visible && !field.visible(formData)) {
          continue;
        }

        const value = (formData as any)[field.name];

        // 检查必填
        if (field.required && !value) {
          errors[field.name] = t('validation.field_required', { field: field.label });
        }

        // 自定义验证
        if (field.validation && value !== undefined && value !== null) {
          const error = field.validation(value, formData);
          if (error) {
            errors[field.name] = error;
          }
        }
      }
    }

    return errors;
  }

  /**
   * 获取默认端口
   */
  getDefaultPort(): number {
    // 对象存储不使用端口概念，返回0
    return 0;
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Partial<ObjectStorageConfig> {
    return {
      dbType: 'object-storage',
      objectStorageProvider: 's3',
      s3UseSSL: true,
      s3PathStyle: false,
      timeout: 30,
      connectionTimeout: 30,
      queryTimeout: 300
    };
  }

  /**
   * 转换为连接配置
   */
  toConnectionConfig(formData: ObjectStorageConfig): ConnectionConfig {
    const config: ConnectionConfig = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      dbType: 'object-storage' as any,
      host: formData.s3Endpoint || formData.qiniuAccessUrl || formData.upyunAccelerateUrl || '',
      port: 0,
      username: formData.s3AccessKey || formData.upyunOperator || '',
      password: formData.s3SecretKey || formData.upyunOperatorPassword || formData.githubToken || formData.smmsToken || formData.imgurClientId || '',
      database: formData.bucket || formData.upyunServiceName || formData.githubRepo || '',
      ssl: formData.s3UseSSL || true,
      timeout: formData.timeout || 30,
      connectionTimeout: formData.connectionTimeout || 30,
      queryTimeout: formData.queryTimeout || 300,
      driverConfig: {
        s3: {
          provider: formData.objectStorageProvider,
          endpoint: formData.s3Endpoint || '',
          region: formData.s3Region || '',
          accessKey: formData.s3AccessKey || '',
          secretKey: formData.s3SecretKey || '',
          useSSL: formData.s3UseSSL || true,
          pathStyle: formData.s3PathStyle || false,
          sessionToken: formData.s3SessionToken || '',
          cosAppId: formData.cosAppId || '',
          storagePath: formData.storagePath || '',
          customDomain: formData.customDomain || '',
          urlSuffix: formData.urlSuffix || '',
          proxyUrl: formData.proxyUrl || '',
          // 七牛云
          qiniuAccessUrl: formData.qiniuAccessUrl || '',
          // 又拍云
          upyunOperator: formData.upyunOperator || '',
          upyunOperatorPassword: formData.upyunOperatorPassword || '',
          upyunServiceName: formData.upyunServiceName || '',
          upyunAccelerateUrl: formData.upyunAccelerateUrl || '',
          // GitHub
          githubRepo: formData.githubRepo || '',
          githubBranch: formData.githubBranch || '',
          githubToken: formData.githubToken || '',
          // SM.MS
          smmsToken: formData.smmsToken || '',
          smmsBackupDomain: formData.smmsBackupDomain || '',
          // Imgur
          imgurClientId: formData.imgurClientId || ''
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return config;
  }

  /**
   * 从连接配置转换
   */
  fromConnectionConfig(config: ConnectionConfig): ObjectStorageConfig {
    const s3Config = config.driverConfig?.s3;
    return {
      id: config.id || '',
      name: config.name,
      description: config.description,
      dbType: 'object-storage',
      host: s3Config?.endpoint || config.host,
      port: 0,
      username: s3Config?.accessKey || config.username,
      password: s3Config?.secretKey || config.password,
      ssl: s3Config?.useSSL ?? config.ssl,
      timeout: config.timeout,
      connectionTimeout: config.connectionTimeout,
      queryTimeout: config.queryTimeout,
      objectStorageProvider: s3Config?.provider || 's3',
      s3Endpoint: s3Config?.endpoint,
      s3Region: s3Config?.region,
      s3AccessKey: s3Config?.accessKey,
      s3SecretKey: s3Config?.secretKey,
      s3UseSSL: s3Config?.useSSL,
      s3PathStyle: s3Config?.pathStyle,
      s3SessionToken: s3Config?.sessionToken,
      cosAppId: s3Config?.cosAppId,
      storagePath: s3Config?.storagePath,
      customDomain: s3Config?.customDomain,
      urlSuffix: s3Config?.urlSuffix,
      proxyUrl: s3Config?.proxyUrl,
      // 七牛云
      qiniuAccessUrl: s3Config?.qiniuAccessUrl,
      // 又拍云
      upyunOperator: s3Config?.upyunOperator,
      upyunOperatorPassword: s3Config?.upyunOperatorPassword,
      upyunServiceName: s3Config?.upyunServiceName,
      upyunAccelerateUrl: s3Config?.upyunAccelerateUrl,
      // GitHub
      githubRepo: s3Config?.githubRepo,
      githubBranch: s3Config?.githubBranch,
      githubToken: s3Config?.githubToken,
      // SM.MS
      smmsToken: s3Config?.smmsToken,
      smmsBackupDomain: s3Config?.smmsBackupDomain,
      // Imgur
      imgurClientId: s3Config?.imgurClientId,
      bucket: config.database
    };
  }
}