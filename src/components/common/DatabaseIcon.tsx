import React from 'react';
import { TreeNodeType } from '@/types/tree';

export interface DatabaseIconProps {
  nodeType: TreeNodeType;
  isConnected?: boolean;
  className?: string;
  size?: number;
  dbType?: string;  // 用于品牌图标
  dbVersion?: string; // 数据库版本
  title?: string;   // 自定义 tooltip
}

// 内联SVG图标定义
const getIconSVG = (nodeType: TreeNodeType, dbType?: string, dbVersion?: string, isConnected?: boolean, size: number = 16): string => {
  const currentColor = 'currentColor';

  // 品牌图标（连接节点）
  if (nodeType === 'connection' && dbType) {
    switch (dbType.toLowerCase()) {
      case 'influxdb':
      case 'influxdb2':
      case 'influxdb3':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`;
      case 'iotdb':
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
        </svg>`;
      default:
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>`;
    }
  }

  // 功能图标（子节点）
  switch (nodeType) {
    case 'database':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zM4 14v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"/>
      </svg>`;
    case 'table':
    case 'measurement':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v3h20V6c0-1.11-.89-2-2-2h-6V4zm0 5H2v6h8v-6zm10 0h-8v6h8v-6zM2 17v1c0 1.11.89 2 2 2h6v-3H2zm10 3h6c1.11 0 2-.89 2-2v-1h-8v3z"/>
      </svg>`;
    case 'column':
    case 'field':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M2 15.5v2h20v-2H2zm0-5v2h20v-2H2zm0-5v2h20v-2H2z"/>
      </svg>`;
    case 'tag':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z"/>
      </svg>`;
    case 'index':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>`;
    case 'view':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>`;
    case 'user1x':
    case 'user2x':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>`;
    case 'bucket':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>`;
    default:
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${currentColor}">
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
  const iconSVG = getIconSVG(nodeType, dbType, dbVersion, isConnected, size);
  const iconTitle = title || getIconDescription(nodeType);

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={iconTitle}
      dangerouslySetInnerHTML={{ __html: iconSVG }}
    />
  );
};

// 获取图标描述
const getIconDescription = (nodeType: TreeNodeType): string => {
  const descriptions: Record<string, string> = {
    'connection': '数据库连接',
    'database': '数据库',
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
  };

  return descriptions[nodeType] || '数据节点';
};

export default DatabaseIcon;
