import React, { useState, useEffect } from 'react';
import { TreeNodeType } from '@/types/tree';
import { useTheme } from '@/components/providers/ThemeProvider';

export interface DatabaseIconProps {
  nodeType: TreeNodeType;
  isConnected?: boolean;
  className?: string;
  size?: number;
  dbType?: string;  // 用于品牌图标
  dbVersion?: string; // 数据库版本
  title?: string;   // 自定义 tooltip
}

// 获取品牌图标路径
const getBrandIconPath = (dbType: string, isConnected: boolean, dbVersion?: string): string => {
  const normalizedType = dbType.toLowerCase();
  const suffix = isConnected ? '' : '-dark';

  switch (normalizedType) {
    case 'influxdb':
    case 'influxdb1':
    case 'influxdb1x':
      return `/src/assets/icons/database/brands/influxdb-1x${suffix}.svg`;
    case 'influxdb2':
    case 'influxdb2x':
      return `/src/assets/icons/database/brands/influxdb-2x${suffix}.svg`;
    case 'influxdb3':
    case 'influxdb3x':
      return `/src/assets/icons/database/brands/influxdb-3x${suffix}.svg`;
    case 'iotdb':
      return `/src/assets/icons/database/brands/iotdb${suffix}.svg`;
    default:
      return `/src/assets/icons/database/brands/database-generic${suffix}.svg`;
  }
};

// 获取功能图标路径
const getFunctionalIconPath = (nodeType: TreeNodeType, theme: 'light' | 'dark'): string => {
  const iconMap: Record<string, string> = {
    'database': 'database.svg',
    'system_database': 'database-system.svg',
    'database3x': 'database3x.svg',
    'table': 'table.svg',
    'measurement': 'measurement.svg',
    'column': 'column.svg',
    'field': 'field.svg',
    'tag': 'tag.svg',
    'index': 'index.svg',
    'view': 'view.svg',
    'user1x': 'user1x.svg',
    'user2x': 'user2x.svg',
    'bucket': 'bucket.svg',
    'organization': 'organization.svg',
    'storage_group': 'storage-group.svg',
    'device': 'device.svg',
    'timeseries': 'timeseries.svg',
    'function': 'function.svg',
    'procedure': 'procedure.svg',
    'trigger': 'trigger.svg',
    'namespace': 'namespace.svg',
    'schema': 'schema.svg',
    'partition': 'partition.svg',
    'shard': 'shard.svg',
    'retention_policy': 'retention-policy.svg',
    'continuous_query': 'continuous-query.svg',
    'task': 'task.svg',
    'authorization': 'authorization.svg',
    'privilege': 'privilege.svg',
  };

  const iconFile = iconMap[nodeType] || 'default.svg';
  return `/src/assets/icons/database/${theme}/${iconFile}`;
};

// SVG图标加载组件
const SVGIcon: React.FC<{
  src: string;
  size: number;
  className?: string;
  title?: string;
  fallbackNodeType?: TreeNodeType;
  fallbackDbType?: string;
}> = ({ src, size, className = '', title, fallbackNodeType = 'database', fallbackDbType }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadSVG = async () => {
      try {
        setIsLoading(true);
        setError(false);

        const response = await fetch(src);
        if (response.ok) {
          let content = await response.text();
          // 确保SVG有正确的尺寸并保持居中对齐
          content = content.replace(
            /<svg([^>]*)>/,
            `<svg$1 width="${size}" height="${size}" style="display: block; margin: 0; vertical-align: middle;">`
          );
          setSvgContent(content);
        } else {
          throw new Error(`Failed to load SVG: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to load SVG: ${src}`, error);
        setError(true);
        // 使用内联SVG作为回退
        setSvgContent(getInlineSVG(fallbackNodeType, fallbackDbType, size));
      } finally {
        setIsLoading(false);
      }
    };

    loadSVG();
  }, [src, size]);

  if (isLoading) {
    return (
      <div
        className={`inline-flex items-center justify-center animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
        style={{ width: size, height: size }}
        title={title}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        lineHeight: 1,
        verticalAlign: 'middle'
      }}
      title={title}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// 内联SVG图标（作为回退）
const getInlineSVG = (nodeType: TreeNodeType, dbType?: string, size: number = 16): string => {
  const currentColor = 'currentColor';

  // 品牌图标（连接节点）
  if (nodeType === 'connection' && dbType) {
    switch (dbType.toLowerCase()) {
      case 'influxdb':
      case 'influxdb1':
      case 'influxdb1x':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; vertical-align: middle;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
      case 'influxdb2':
      case 'influxdb2x':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; margin: 0; vertical-align: middle;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
      case 'influxdb3':
      case 'influxdb3x':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; vertical-align: middle;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
      case 'iotdb':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; vertical-align: middle;">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
        </svg>`;
      default:
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; vertical-align: middle;">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>`;
    }
  }

  // 功能图标（子节点）
  switch (nodeType) {
    case 'database':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; margin: 0; vertical-align: middle;">
        <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zM4 14v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/>
      </svg>`;
    case 'system_database':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; margin: 0; vertical-align: middle;">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
      </svg>`;
    case 'table':
    case 'measurement':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; margin: 0; vertical-align: middle;">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v3h20V6c0-1.11-.89-2-2-2h-6V4zm0 5H2v6h8v-6zm10 0h-8v6h8v-6zM2 17v1c0 1.11.89 2 2 2h6v-3H2zm10 3h6c1.11 0 2-.89 2-2v-1h-8v3z"/>
      </svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}" style="display: block; margin: 0; vertical-align: middle;">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`;
  }
};

export const DatabaseIcon: React.FC<DatabaseIconProps> = ({
  nodeType,
  isConnected = false,
  className = '',
  size = 16,
  dbType,
  dbVersion,
  title
}) => {
  const { resolvedTheme } = useTheme();
  const iconTitle = title || getIconDescription(nodeType);

  // 如果是连接节点，使用品牌图标
  if (nodeType === 'connection' && dbType) {
    const iconPath = getBrandIconPath(dbType, isConnected, dbVersion);
    return (
      <SVGIcon
        src={iconPath}
        size={size}
        className={className}
        title={iconTitle}
        fallbackNodeType={nodeType}
        fallbackDbType={dbType}
      />
    );
  }

  // 其他节点使用功能图标
  const iconPath = getFunctionalIconPath(nodeType, resolvedTheme);
  return (
    <SVGIcon
      src={iconPath}
      size={size}
      className={className}
      title={iconTitle}
      fallbackNodeType={nodeType}
    />
  );
};

// 获取图标描述
const getIconDescription = (nodeType: TreeNodeType): string => {
  const descriptions: Record<string, string> = {
    'connection': '数据库连接',
    'database': '数据库',
    'system_database': '系统数据库',
    'database3x': 'InfluxDB 3.x 数据库',
    'table': '数据表',
    'measurement': '测量',
    'column': '列',
    'field': '字段',
    'tag': '标签',
    'index': '索引',
    'view': '视图',
    'user1x': '用户',
    'user2x': '用户',
    'bucket': '存储桶',
    'organization': '组织',
    'storage_group': '存储组',
    'device': '设备',
    'timeseries': '时间序列',
    'function': '函数',
    'procedure': '存储过程',
    'trigger': '触发器',
    'namespace': '命名空间',
    'schema': '模式',
    'partition': '分区',
    'shard': '分片',
    'retention_policy': '保留策略',
    'continuous_query': '连续查询',
    'task': '任务',
    'authorization': '授权',
    'privilege': '权限',
  };

  return descriptions[nodeType] || '数据节点';
};

export default DatabaseIcon;
