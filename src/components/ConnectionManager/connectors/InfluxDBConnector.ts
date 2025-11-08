import { BaseConnector } from './BaseConnector';
import type { FormSection, BaseConnectionConfig, ValidationErrors } from './types';
import type { ConnectionConfig } from '@/types';
import { getDatabaseBrandIcon } from '@/utils/iconLoader';
import { tConn as t } from '@/i18n';
import { getProxyConfigSection } from './proxyConfig';

/**
 * InfluxDB连接配置
 */
export interface InfluxDBConfig extends BaseConnectionConfig {
  dbType: 'influxdb';
  version: '1.x' | '2.x' | '3.x';
  database?: string;
  retentionPolicy?: string;
  apiToken?: string;
  organization?: string;
  bucket?: string;
  v1CompatibilityApi?: boolean;
  defaultQueryLanguage?: string;
}

/**
 * InfluxDB连接器
 */
export class InfluxDBConnector extends BaseConnector<InfluxDBConfig> {
  type = 'influxdb';
  displayName = 'InfluxDB';
  icon = getDatabaseBrandIcon('InfluxDB');

  /**
   * 获取版本选项
   */
  getVersionOptions() {
    return [
      { value: '1.x', label: 'InfluxDB 1.x' },
      { value: '2.x', label: 'InfluxDB 2.x' },
      { value: '3.x', label: 'InfluxDB 3.x (Cloud)' }
    ];
  }

  /**
   * 获取查询语言选项
   */
  private getQueryLanguageOptions(version: string) {
    switch (version) {
      case '1.x':
        return [{ value: 'influxql', label: 'InfluxQL' }];
      case '2.x':
        return [
          { value: 'flux', label: 'Flux' },
          { value: 'influxql', label: 'InfluxQL' }
        ];
      case '3.x':
        return [
          { value: 'sql', label: 'SQL' },
          { value: 'influxql', label: 'InfluxQL' }
        ];
      default:
        return [];
    }
  }

  /**
   * 获取表单配置
   */
  getFormSections(): FormSection[] {
    const baseSections = super.getBaseFormSections();

    // 在基础配置后添加版本选择
    const basicSection = baseSections[0];
    basicSection.fields.push({
      name: 'version',
      label: t('influxdb.version'),
      type: 'select',
      required: true,
      defaultValue: '2.x',
      options: this.getVersionOptions(),
      description: t('influxdb.version_description')
    });

    // InfluxDB特定配置
    const influxdbSection: FormSection = {
      id: 'influxdb',
      title: t('influxdb.settings'),
      fields: [
        // InfluxDB 1.x 字段
        {
          name: 'database',
          label: t('influxdb.database'),
          type: 'text',
          placeholder: t('influxdb.database_placeholder'),
          visible: (formData) => formData.version === '1.x',
          validation: (value: string, formData: any) => {
            if (formData.version === '1.x' && !value?.trim()) {
              return t('influxdb.database_required');
            }
          }
        },
        {
          name: 'retentionPolicy',
          label: t('influxdb.retention_policy'),
          type: 'text',
          placeholder: 'autogen',
          defaultValue: 'autogen',
          visible: (formData) => formData.version === '1.x',
          description: t('influxdb.retention_policy_description')
        },

        // InfluxDB 2.x/3.x 字段
        {
          name: 'apiToken',
          label: t('influxdb.api_token'),
          type: 'password',
          placeholder: t('influxdb.api_token_placeholder'),
          required: true,
          visible: (formData) => formData.version === '2.x' || formData.version === '3.x',
          validation: (value: string, formData: any) => {
            if ((formData.version === '2.x' || formData.version === '3.x') && !value?.trim()) {
              return t('influxdb.api_token_required');
            }
          }
        },
        {
          name: 'organization',
          label: t('influxdb.organization'),
          type: 'text',
          placeholder: t('influxdb.organization_placeholder'),
          visible: (formData) => formData.version === '2.x' || formData.version === '3.x',
          required: true,
          validation: (value: string, formData: any) => {
            if (formData.version === '2.x' && !value?.trim()) {
              return t('influxdb.organization_required');
            }
          },
          description: t('influxdb.organization_description')
        },
        {
          name: 'bucket',
          label: t('influxdb.bucket'),
          type: 'text',
          placeholder: t('influxdb.bucket_placeholder'),
          visible: (formData) => formData.version === '2.x' || formData.version === '3.x',
          description: t('influxdb.bucket_description')
        },

        // 兼容性选项
        {
          name: 'v1CompatibilityApi',
          label: t('influxdb.v1_compatibility'),
          type: 'switch',
          defaultValue: false,
          visible: (formData) => formData.version === '2.x',
          description: t('influxdb.v1_compatibility_description')
        },

        // 查询语言
        {
          name: 'defaultQueryLanguage',
          label: t('influxdb.query_language'),
          type: 'select',
          defaultValue: 'flux',
          options: [],
          visible: (formData) => !!formData.version,
          description: t('influxdb.query_language_description')
        }
      ]
    };

    // 将InfluxDB特定配置插入到连接设置后
    return [
      baseSections[0], // 基本信息
      baseSections[1], // 连接设置
      influxdbSection, // InfluxDB特定配置
      baseSections[2], // 高级设置
      getProxyConfigSection('influxdb') // 代理配置
    ];
  }

  /**
   * 验证表单数据
   */
  validate(formData: InfluxDBConfig): ValidationErrors {
    const errors = super.validateBase(formData);

    // InfluxDB特定验证
    if (formData.version === '1.x') {
      if (!formData.database?.trim()) {
        errors.database = t('influxdb.database_required');
      }
    } else if (formData.version === '2.x' || formData.version === '3.x') {
      if (!formData.apiToken?.trim()) {
        errors.apiToken = t('influxdb.api_token_required');
      }
      if (formData.version === '2.x' && !formData.organization?.trim()) {
        errors.organization = t('influxdb.organization_required');
      }
    }

    return errors;
  }

  /**
   * 获取默认端口
   */
  getDefaultPort(): number {
    return 8086;
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Partial<InfluxDBConfig> {
    const baseConfig = super.getDefaultConfig();
    return {
      ...baseConfig,
      dbType: 'influxdb',
      version: '2.x',
      port: 8086,
      retentionPolicy: 'autogen',
      defaultQueryLanguage: 'flux',
      v1CompatibilityApi: false,
      ssl: false,
      timeout: 30,
      connectionTimeout: 30,
      queryTimeout: 300
    };
  }

  /**
   * 转换为连接配置
   */
  toConnectionConfig(formData: InfluxDBConfig): ConnectionConfig {
    const config: ConnectionConfig = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      dbType: 'influxdb',
      host: formData.host,
      port: formData.port,
      username: formData.username || '',
      password: formData.password || '',
      database: formData.database || '',
      ssl: formData.ssl || false,
      timeout: formData.timeout || 30,
      connectionTimeout: formData.connectionTimeout || 30,
      queryTimeout: formData.queryTimeout || 300,
      version: formData.version,
      retentionPolicy: formData.retentionPolicy || 'autogen',
      defaultQueryLanguage: formData.defaultQueryLanguage || this.getDefaultQueryLanguage(formData.version),
      v2Config: formData.version !== '1.x' ? {
        apiToken: formData.apiToken || '',
        organization: formData.organization || '',
        bucket: formData.bucket || '',
        v1CompatibilityApi: formData.v1CompatibilityApi || false
      } : undefined,
      proxyConfig: formData.proxyEnabled ? {
        enabled: formData.proxyEnabled,
        proxyType: formData.proxyType || 'http',
        host: formData.proxyHost || '',
        port: formData.proxyPort || 0,
        username: formData.proxyUsername,
        password: formData.proxyPassword
      } : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return config;
  }

  /**
   * 从连接配置转换
   */
  fromConnectionConfig(config: ConnectionConfig): InfluxDBConfig {
    return {
      id: config.id || '',
      name: config.name,
      description: config.description,
      dbType: 'influxdb',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
      timeout: config.timeout,
      connectionTimeout: config.connectionTimeout,
      queryTimeout: config.queryTimeout,
      version: (config.version || '2.x') as '1.x' | '2.x' | '3.x',
      retentionPolicy: config.retentionPolicy,
      apiToken: config.v2Config?.apiToken,
      organization: config.v2Config?.organization,
      bucket: config.v2Config?.bucket,
      v1CompatibilityApi: config.v2Config?.v1CompatibilityApi,
      defaultQueryLanguage: config.defaultQueryLanguage,
      proxyEnabled: config.proxyConfig?.enabled,
      proxyType: config.proxyConfig?.proxyType,
      proxyHost: config.proxyConfig?.host,
      proxyPort: config.proxyConfig?.port,
      proxyUsername: config.proxyConfig?.username,
      proxyPassword: config.proxyConfig?.password
    };
  }

  /**
   * 获取默认查询语言
   */
  private getDefaultQueryLanguage(version: string): string {
    switch (version) {
      case '1.x':
        return 'influxql';
      case '2.x':
        return 'flux';
      case '3.x':
        return 'sql';
      default:
        return 'influxql';
    }
  }
}