import { BaseConnector } from './BaseConnector';
import type { FormSection, BaseConnectionConfig, ValidationErrors } from './types';
import type { ConnectionConfig } from '@/types';
import { getDatabaseBrandIcon } from '@/utils/iconLoader';
import { tConn as t } from '@/i18n';
import { getProxyConfigSection } from './proxyConfig';

/**
 * IoTDB连接配置
 */
export interface IoTDBConfig extends BaseConnectionConfig {
  dbType: 'iotdb';
  database?: string;
  sessionPoolSize?: number;
  enableCompression?: boolean;
  timeZone?: string;
  fetchSize?: number;
  enableRedirection?: boolean;
  maxRetryCount?: number;
  retryIntervalMs?: number;
}

/**
 * IoTDB连接器
 */
export class IoTDBConnector extends BaseConnector<IoTDBConfig> {
  type = 'iotdb';
  displayName = 'Apache IoTDB';
  icon = getDatabaseBrandIcon('IoTDB');

  /**
   * 获取表单配置
   */
  getFormSections(): FormSection[] {
    const baseSections = super.getBaseFormSections();

    // IoTDB特定配置
    const iotdbSection: FormSection = {
      id: 'iotdb',
      title: t('iotdb.settings'),
      fields: [
        {
          name: 'database',
          label: t('iotdb.database'),
          type: 'text',
          placeholder: 'root',
          defaultValue: 'root',
          description: t('iotdb.database_description')
        },
        {
          name: 'sessionPoolSize',
          label: t('iotdb.session_pool_size'),
          type: 'number',
          defaultValue: 5,
          min: 1,
          max: 50,
          width: 'half',
          description: t('iotdb.session_pool_size_description'),
          validation: (value: number) => {
            if (value < 1 || value > 50) {
              return t('iotdb.session_pool_size_range');
            }
          }
        },
        {
          name: 'fetchSize',
          label: t('iotdb.fetch_size'),
          type: 'number',
          defaultValue: 5000,
          min: 100,
          max: 100000,
          step: 100,
          width: 'half',
          description: t('iotdb.fetch_size_description'),
          validation: (value: number) => {
            if (value < 100 || value > 100000) {
              return t('iotdb.fetch_size_range');
            }
          }
        },
        {
          name: 'enableCompression',
          label: t('iotdb.enable_compression'),
          type: 'switch',
          defaultValue: false,
          description: t('iotdb.enable_compression_description')
        },
        {
          name: 'timeZone',
          label: t('iotdb.timezone'),
          type: 'select',
          defaultValue: 'Asia/Shanghai',
          options: [
            { value: 'Asia/Shanghai', label: t('iotdb.timezone_shanghai') },
            { value: 'Asia/Tokyo', label: t('iotdb.timezone_tokyo') },
            { value: 'Europe/London', label: t('iotdb.timezone_london') },
            { value: 'America/New_York', label: t('iotdb.timezone_newyork') },
            { value: 'UTC', label: 'UTC' }
          ],
          description: t('iotdb.timezone_description')
        }
      ]
    };

    // 高级配置
    const advancedSection: FormSection = {
      id: 'iotdb-advanced',
      title: t('iotdb.advanced_settings'),
      fields: [
        {
          name: 'enableRedirection',
          label: t('iotdb.enable_redirection'),
          type: 'switch',
          defaultValue: false,
          description: t('iotdb.enable_redirection_description')
        },
        {
          name: 'maxRetryCount',
          label: t('iotdb.max_retry_count'),
          type: 'number',
          defaultValue: 3,
          min: 0,
          max: 10,
          width: 'half',
          description: t('iotdb.max_retry_count_description'),
          validation: (value: number) => {
            if (value < 0 || value > 10) {
              return t('iotdb.max_retry_count_range');
            }
          }
        },
        {
          name: 'retryIntervalMs',
          label: t('iotdb.retry_interval'),
          type: 'number',
          defaultValue: 1000,
          min: 100,
          max: 10000,
          step: 100,
          width: 'half',
          description: t('iotdb.retry_interval_description'),
          validation: (value: number) => {
            if (value < 100 || value > 10000) {
              return t('iotdb.retry_interval_range');
            }
          }
        }
      ]
    };

    // 将IoTDB特定配置插入到连接设置后
    return [
      baseSections[0], // 连接设置
      iotdbSection,    // IoTDB特定配置
      advancedSection, // IoTDB高级配置
      baseSections[1], // 通用高级设置
      getProxyConfigSection('iotdb') // 代理配置
    ];
  }

  /**
   * 验证表单数据
   */
  validate(formData: IoTDBConfig): ValidationErrors {
    const errors = super.validateBase(formData);

    // IoTDB特定验证
    if (formData.sessionPoolSize !== undefined) {
      if (formData.sessionPoolSize < 1 || formData.sessionPoolSize > 50) {
        errors.sessionPoolSize = t('iotdb.session_pool_size_range');
      }
    }

    if (formData.fetchSize !== undefined) {
      if (formData.fetchSize < 100 || formData.fetchSize > 100000) {
        errors.fetchSize = t('iotdb.fetch_size_range');
      }
    }

    if (formData.maxRetryCount !== undefined) {
      if (formData.maxRetryCount < 0 || formData.maxRetryCount > 10) {
        errors.maxRetryCount = t('iotdb.max_retry_count_range');
      }
    }

    if (formData.retryIntervalMs !== undefined) {
      if (formData.retryIntervalMs < 100 || formData.retryIntervalMs > 10000) {
        errors.retryIntervalMs = t('iotdb.retry_interval_range');
      }
    }

    return errors;
  }

  /**
   * 获取默认端口
   */
  getDefaultPort(): number {
    return 6667;
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Partial<IoTDBConfig> {
    const baseConfig = super.getDefaultConfig();
    return {
      ...baseConfig,
      dbType: 'iotdb',
      port: 6667,
      database: 'root',
      username: 'root',
      password: 'root',
      sessionPoolSize: 5,
      enableCompression: false,
      timeZone: 'Asia/Shanghai',
      fetchSize: 5000,
      enableRedirection: false,
      maxRetryCount: 3,
      retryIntervalMs: 1000,
      ssl: false,
      timeout: 30,
      connectionTimeout: 30,
      queryTimeout: 300
    };
  }

  /**
   * 转换为连接配置
   */
  toConnectionConfig(formData: IoTDBConfig): ConnectionConfig {
    const config: ConnectionConfig = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      dbType: 'iotdb',
      host: formData.host,
      port: formData.port,
      username: formData.username || 'root',
      password: formData.password || 'root',
      database: formData.database || 'root',
      ssl: formData.ssl || false,
      timeout: formData.timeout || 30,
      connectionTimeout: formData.connectionTimeout || 30,
      queryTimeout: formData.queryTimeout || 300,
      driverConfig: {
        iotdb: {
          sessionPoolSize: formData.sessionPoolSize || 5,
          enableCompression: formData.enableCompression || false,
          timeZone: formData.timeZone || 'Asia/Shanghai',
          fetchSize: formData.fetchSize || 5000,
          enableRedirection: formData.enableRedirection || false,
          maxRetryCount: formData.maxRetryCount || 3,
          retryIntervalMs: formData.retryIntervalMs || 1000
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
  fromConnectionConfig(config: ConnectionConfig): IoTDBConfig {
    const iotdbConfig = config.driverConfig?.iotdb || {};
    return {
      id: config.id || '',
      name: config.name,
      description: config.description,
      dbType: 'iotdb',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl,
      timeout: config.timeout,
      connectionTimeout: config.connectionTimeout,
      queryTimeout: config.queryTimeout,
      sessionPoolSize: iotdbConfig.sessionPoolSize,
      enableCompression: iotdbConfig.enableCompression,
      timeZone: iotdbConfig.timeZone,
      fetchSize: iotdbConfig.fetchSize,
      enableRedirection: iotdbConfig.enableRedirection,
      maxRetryCount: iotdbConfig.maxRetryCount,
      retryIntervalMs: iotdbConfig.retryIntervalMs
    };
  }
}