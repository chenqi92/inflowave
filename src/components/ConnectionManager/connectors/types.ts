import { ReactNode } from 'react';
import type { ConnectionConfig, ConnectionTestResult } from '@/types';

/**
 * 连接器配置基础接口
 */
export interface BaseConnectionConfig {
  id: string;
  name: string;
  description?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  ssl?: boolean;
  timeout?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
}

/**
 * 连接器表单字段定义
 */
export interface FormField {
  name: string;
  label: string | ((formData: any) => string);
  type: 'text' | 'number' | 'password' | 'select' | 'switch' | 'textarea';
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }> | ((formData: any) => Array<{ value: string; label: string }>);
  validation?: (value: any, formData?: any) => string | undefined;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  visible?: (formData: any) => boolean;
  disabled?: (formData: any) => boolean;
}

/**
 * 表单分组
 */
export interface FormSection {
  id: string;
  title: string;
  icon?: ReactNode;
  fields: FormField[];
  visible?: (formData: any) => boolean;
}

/**
 * 验证错误
 */
export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * 连接器接口
 */
export interface IConnectionConnector<T extends BaseConnectionConfig = BaseConnectionConfig> {
  /**
   * 连接器类型标识
   */
  type: string;

  /**
   * 连接器显示名称
   */
  displayName: string;

  /**
   * 连接器图标
   */
  icon: string;

  /**
   * 获取表单配置
   */
  getFormSections(): FormSection[];

  /**
   * 验证表单数据
   */
  validate(formData: T): ValidationErrors;

  /**
   * 获取默认配置
   */
  getDefaultConfig(): Partial<T>;

  /**
   * 转换为完整的连接配置
   */
  toConnectionConfig(formData: T): ConnectionConfig;

  /**
   * 从连接配置转换为表单数据
   */
  fromConnectionConfig(config: ConnectionConfig): T;

  /**
   * 测试连接
   */
  testConnection(formData: T): Promise<ConnectionTestResult>;

  /**
   * 获取端口默认值
   */
  getDefaultPort(): number;

  /**
   * 获取版本选项
   */
  getVersionOptions?(): Array<{ value: string; label: string }>;

  /**
   * 渲染自定义字段
   */
  renderCustomField?(field: FormField, value: any, onChange: (value: any) => void): ReactNode;
}

/**
 * 连接器注册表
 */
export interface ConnectorRegistry {
  register(connector: IConnectionConnector): void;
  get(type: string): IConnectionConnector | undefined;
  getAll(): IConnectionConnector[];
  getTypes(): string[];
}