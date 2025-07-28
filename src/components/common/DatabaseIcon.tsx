import React, { useState, useEffect } from 'react';
import { TreeNodeType } from '@/types/tree';
import { getThemeAwareIcon, getDatabaseBrandIcon, getIconDescription } from '@/utils/iconLoader';

export interface DatabaseIconProps {
  nodeType: TreeNodeType;
  isConnected?: boolean;
  className?: string;
  size?: number;
  dbType?: string;  // 用于品牌图标
  dbVersion?: string; // 数据库版本
  title?: string;   // 自定义 tooltip
}

// SVG图标加载组件
const SVGIcon: React.FC<{
  src: string;
  size: number;
  className?: string;
  title?: string;
}> = ({ src, size, className = '', title }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSVG = async () => {
      try {
        if (!src) {
          setSvgContent(getDefaultSVG(size));
          setIsLoading(false);
          return;
        }

        const response = await fetch(src);
        if (response.ok) {
          let content = await response.text();
          // 确保SVG有正确的尺寸
          content = content.replace(
            /<svg([^>]*)>/,
            `<svg$1 width="${size}" height="${size}">`
          );
          setSvgContent(content);
        } else {
          // 如果加载失败，使用默认图标
          setSvgContent(getDefaultSVG(size));
        }
      } catch (error) {
        console.warn(`Failed to load SVG: ${src}`, error);
        setSvgContent(getDefaultSVG(size));
      } finally {
        setIsLoading(false);
      }
    };

    loadSVG();
  }, [src, size]);

  if (isLoading) {
    return (
      <div
        className={`inline-block animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
        style={{ width: size, height: size }}
        title={title}
      />
    );
  }

  return (
    <div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      title={title}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

// 默认SVG图标
const getDefaultSVG = (size: number): string => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="currentColor">
    <path d="M5 4a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5zM4.5 7a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2h-7zM5 10a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H5z"/>
    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H4z"/>
  </svg>`;
};

// 获取正确的图标路径
const getIconPath = (nodeType: TreeNodeType, dbType?: string, dbVersion?: string, isConnected?: boolean): string => {
  // 如果是连接节点，使用品牌图标
  if (nodeType === 'connection' && dbType) {
    return getDatabaseBrandIcon(dbType, dbVersion);
  }

  // 其他节点使用主题感知的功能图标
  return getThemeAwareIcon(nodeType, isConnected);
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
  const iconTitle = title || getIconDescription(nodeType);
  const iconPath = getIconPath(nodeType, dbType, dbVersion, isConnected);

  return (
    <SVGIcon
      src={iconPath}
      size={size}
      className={className}
      title={iconTitle}
    />
  );
};

export default DatabaseIcon;
