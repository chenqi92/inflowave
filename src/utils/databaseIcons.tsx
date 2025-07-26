/**
 * 数据库图标工具函数
 * 统一管理各种数据库类型的图标显示
 */

import React from 'react';
import { 
  Database, 
  TreePine, 
  BarChart, 
  Search,
  Server,
  Activity,
  Zap,
  HardDrive
} from 'lucide-react';
import type { DatabaseType } from '@/types';

// 数据库类型图标配置
export const DATABASE_ICON_CONFIG = {
  influxdb: {
    icon: Database,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    name: 'InfluxDB',
    description: '时间序列数据库',
  },
  iotdb: {
    icon: TreePine,
    color: 'text-green-500', 
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    name: 'Apache IoTDB',
    description: '物联网时间序列数据库',
  },
  prometheus: {
    icon: BarChart,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50', 
    borderColor: 'border-orange-200',
    name: 'Prometheus',
    description: '监控和告警系统',
  },
  elasticsearch: {
    icon: Search,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200', 
    name: 'Elasticsearch',
    description: '搜索和分析引擎',
  },
  mysql: {
    icon: HardDrive,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    name: 'MySQL',
    description: '关系型数据库',
  },
  postgresql: {
    icon: Server,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    name: 'PostgreSQL', 
    description: '对象关系型数据库',
  },
  mongodb: {
    icon: Activity,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    name: 'MongoDB',
    description: '文档数据库',
  },
  redis: {
    icon: Zap,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    name: 'Redis',
    description: '内存数据库',
  },
} as const;

// 默认数据库配置
const DEFAULT_DATABASE_CONFIG = {
  icon: Database,
  color: 'text-gray-500',
  bgColor: 'bg-gray-50',
  borderColor: 'border-gray-200',
  name: '未知数据库',
  description: '未知数据库类型',
};

/**
 * 获取数据库图标组件
 */
export function getDatabaseIcon(
  dbType: DatabaseType | string, 
  className: string = 'w-4 h-4'
): React.ReactElement {
  const config = DATABASE_ICON_CONFIG[dbType as keyof typeof DATABASE_ICON_CONFIG] || DEFAULT_DATABASE_CONFIG;
  const IconComponent = config.icon;
  
  return <IconComponent className={`${className} ${config.color}`} />;
}

/**
 * 获取数据库图标配置
 */
export function getDatabaseIconConfig(dbType: DatabaseType | string) {
  return DATABASE_ICON_CONFIG[dbType as keyof typeof DATABASE_ICON_CONFIG] || DEFAULT_DATABASE_CONFIG;
}

/**
 * 获取数据库显示名称
 */
export function getDatabaseDisplayName(dbType: DatabaseType | string): string {
  const config = DATABASE_ICON_CONFIG[dbType as keyof typeof DATABASE_ICON_CONFIG] || DEFAULT_DATABASE_CONFIG;
  return config.name;
}

/**
 * 获取数据库描述
 */
export function getDatabaseDescription(dbType: DatabaseType | string): string {
  const config = DATABASE_ICON_CONFIG[dbType as keyof typeof DATABASE_ICON_CONFIG] || DEFAULT_DATABASE_CONFIG;
  return config.description;
}

/**
 * 获取数据库颜色类名
 */
export function getDatabaseColor(dbType: DatabaseType | string): string {
  const config = DATABASE_ICON_CONFIG[dbType as keyof typeof DATABASE_ICON_CONFIG] || DEFAULT_DATABASE_CONFIG;
  return config.color;
}

/**
 * 获取数据库背景颜色类名
 */
export function getDatabaseBgColor(dbType: DatabaseType | string): string {
  const config = DATABASE_ICON_CONFIG[dbType as keyof typeof DATABASE_ICON_CONFIG] || DEFAULT_DATABASE_CONFIG;
  return config.bgColor;
}

/**
 * 获取数据库边框颜色类名
 */
export function getDatabaseBorderColor(dbType: DatabaseType | string): string {
  const config = DATABASE_ICON_CONFIG[dbType as keyof typeof DATABASE_ICON_CONFIG] || DEFAULT_DATABASE_CONFIG;
  return config.borderColor;
}

/**
 * 渲染带图标的数据库选项
 */
export function renderDatabaseOption(
  dbType: DatabaseType | string,
  showDescription: boolean = false,
  className: string = ''
): React.ReactElement {
  const config = getDatabaseIconConfig(dbType);
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getDatabaseIcon(dbType)}
      <div className="flex-1">
        <span className="font-medium">{config.name}</span>
        {showDescription && (
          <p className="text-xs text-muted-foreground">{config.description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * 渲染数据库标签
 */
export function renderDatabaseBadge(
  dbType: DatabaseType | string,
  size: 'sm' | 'md' | 'lg' = 'md'
): React.ReactElement {
  const config = getDatabaseIconConfig(dbType);
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm', 
    lg: 'px-4 py-2 text-base',
  };
  
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full ${config.bgColor} ${config.borderColor} border ${sizeClasses[size]}`}>
      {getDatabaseIcon(dbType, size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')}
      <span className={`font-medium ${config.color}`}>{config.name}</span>
    </div>
  );
}

/**
 * 获取所有支持的数据库类型
 */
export function getSupportedDatabaseTypes(): Array<{
  type: string;
  name: string;
  description: string;
  icon: React.ReactElement;
}> {
  return Object.entries(DATABASE_ICON_CONFIG).map(([type, config]) => ({
    type,
    name: config.name,
    description: config.description,
    icon: getDatabaseIcon(type),
  }));
}

/**
 * 检查是否为支持的数据库类型
 */
export function isSupportedDatabaseType(dbType: string): boolean {
  return dbType in DATABASE_ICON_CONFIG;
}

// 向后兼容的导出
export const DATABASE_ICONS = Object.fromEntries(
  Object.entries(DATABASE_ICON_CONFIG).map(([key, config]) => [
    key,
    getDatabaseIcon(key)
  ])
);

export default {
  getDatabaseIcon,
  getDatabaseIconConfig,
  getDatabaseDisplayName,
  getDatabaseDescription,
  getDatabaseColor,
  getDatabaseBgColor,
  getDatabaseBorderColor,
  renderDatabaseOption,
  renderDatabaseBadge,
  getSupportedDatabaseTypes,
  isSupportedDatabaseType,
  DATABASE_ICONS,
  DATABASE_ICON_CONFIG,
};
