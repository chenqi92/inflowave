import { ReactNode } from 'react';
import type {
  IConnectionConnector,
  BaseConnectionConfig,
  FormSection,
  ValidationErrors,
  FormField
} from './types';
import type { ConnectionConfig, ConnectionTestResult } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';
import { ValidationUtils } from '@/utils/validation';
import { t } from '@/i18n';

/**
 * 连接器基类
 */
export abstract class BaseConnector<T extends BaseConnectionConfig = BaseConnectionConfig>
  implements IConnectionConnector<T> {

  abstract type: string;
  abstract displayName: string;
  abstract icon: string;

  /**
   * 获取基础表单配置
   */
  protected getBaseFormSections(): FormSection[] {
    return [
      {
        id: 'basic',
        title: t('connections.basic_info'),
        fields: [
          {
            name: 'name',
            label: t('connections.connection_name'),
            type: 'text',
            required: true,
            placeholder: t('connections.name_placeholder'),
            validation: (value: string) => {
              if (!value?.trim()) {
                return t('connections.validation.name_required');
              }
              if (value.length > 100) {
                return t('connections.validation.name_too_long');
              }
            }
          },
          {
            name: 'description',
            label: t('connections.description'),
            type: 'textarea',
            placeholder: t('connections.description_placeholder'),
            validation: (value: string) => {
              if (value && value.length > 500) {
                return t('connections.validation.description_too_long');
              }
            }
          }
        ]
      },
      {
        id: 'connection',
        title: t('connections.connection_settings'),
        fields: [
          {
            name: 'host',
            label: t('connections.host'),
            type: 'text',
            required: true,
            placeholder: 'localhost',
            validation: (value: string) => {
              if (!value?.trim()) {
                return t('connections.validation.host_required');
              }
              const ipError = ValidationUtils.ipAddress(value);
              const hostnameError = ValidationUtils.hostname(value);
              if (ipError && hostnameError) {
                return t('connections.validation.host_format_invalid');
              }
            }
          },
          {
            name: 'port',
            label: t('connections.port'),
            type: 'number',
            required: true,
            defaultValue: this.getDefaultPort(),
            min: 1,
            max: 65535,
            validation: (value: number) => {
              if (!value || value < 1 || value > 65535) {
                return t('connections.validation.port_range');
              }
            }
          },
          {
            name: 'username',
            label: t('connections.username'),
            type: 'text',
            placeholder: t('connections.username_placeholder')
          },
          {
            name: 'password',
            label: t('connections.password'),
            type: 'password',
            placeholder: t('connections.password_placeholder')
          },
          {
            name: 'ssl',
            label: t('connections.use_ssl'),
            type: 'switch',
            defaultValue: false
          }
        ]
      },
      {
        id: 'advanced',
        title: t('connections.advanced_settings'),
        fields: [
          {
            name: 'timeout',
            label: t('connections.timeout'),
            type: 'number',
            defaultValue: 30,
            min: 5,
            max: 300,
            description: t('connections.timeout_description'),
            validation: (value: number) => {
              if (value < 5 || value > 300) {
                return t('connections.validation.timeout_range');
              }
            }
          },
          {
            name: 'connectionTimeout',
            label: t('connections.connection_timeout'),
            type: 'number',
            defaultValue: 30,
            min: 5,
            max: 300,
            description: t('connections.connection_timeout_description'),
            validation: (value: number) => {
              if (value < 5 || value > 300) {
                return t('connections.validation.connection_timeout_range');
              }
            }
          },
          {
            name: 'queryTimeout',
            label: t('connections.query_timeout'),
            type: 'number',
            defaultValue: 300,
            min: 10,
            max: 3600,
            description: t('connections.query_timeout_description'),
            validation: (value: number) => {
              if (value < 10 || value > 3600) {
                return t('connections.validation.query_timeout_range');
              }
            }
          }
        ]
      }
    ];
  }

  /**
   * 获取表单配置（子类可以覆盖或扩展）
   */
  abstract getFormSections(): FormSection[];

  /**
   * 基础验证逻辑
   */
  protected validateBase(formData: T): ValidationErrors {
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
          errors[field.name] = t('connections.validation.field_required', { field: field.label });
        }

        // 自定义验证
        if (field.validation && value !== undefined && value !== null) {
          const error = field.validation(value);
          if (error) {
            errors[field.name] = error;
          }
        }
      }
    }

    return errors;
  }

  /**
   * 验证表单数据
   */
  validate(formData: T): ValidationErrors {
    return this.validateBase(formData);
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Partial<T> {
    const config: any = {};
    const sections = this.getFormSections();

    for (const section of sections) {
      for (const field of section.fields) {
        if (field.defaultValue !== undefined) {
          config[field.name] = field.defaultValue;
        }
      }
    }

    config.port = this.getDefaultPort();
    return config as Partial<T>;
  }

  /**
   * 获取默认端口（子类必须实现）
   */
  abstract getDefaultPort(): number;

  /**
   * 转换为连接配置（子类必须实现）
   */
  abstract toConnectionConfig(formData: T): ConnectionConfig;

  /**
   * 从连接配置转换（子类必须实现）
   */
  abstract fromConnectionConfig(config: ConnectionConfig): T;

  /**
   * 测试连接（默认实现，子类可以覆盖）
   */
  async testConnection(formData: T): Promise<ConnectionTestResult> {
    const config = this.toConnectionConfig(formData);

    try {
      const startTime = Date.now();
      const result = await safeTauriInvoke<ConnectionTestResult>('test_connection', {
        config,
      });

      result.latency = Date.now() - startTime;
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || t('connections.test_failed'),
        latency: 0
      };
    }
  }

  /**
   * 渲染自定义字段（子类可以覆盖）
   */
  renderCustomField?(field: FormField, value: any, onChange: (value: any) => void): ReactNode {
    return null;
  }
}