import React from 'react';
import { TreeNodeType } from '@/types/tree';
import { getThemeAwareIcon, getIconDescription, getDatabaseBrandIcon } from '@/utils/databaseIconMap';

interface DatabaseIconProps {
  nodeType: TreeNodeType;
  isConnected?: boolean;
  className?: string;
  size?: number;
  dbType?: string;  // 用于品牌图标
  title?: string;   // 自定义 tooltip
}

export const DatabaseIcon: React.FC<DatabaseIconProps> = ({ 
  nodeType, 
  isConnected = false, 
  className = '', 
  size = 16,
  dbType,
  title
}) => {
  // 获取图标路径
  const getIconPath = () => {
    // 如果是连接节点且指定了数据库类型，使用品牌图标
    if (nodeType === 'connection' && dbType) {
      return getDatabaseBrandIcon(dbType);
    }
    
    // 使用主题感知图标
    return getThemeAwareIcon(nodeType, isConnected);
  };

  const iconPath = getIconPath();
  const iconTitle = title || getIconDescription(nodeType);

  // 如果图标路径不存在，使用默认SVG图标作为回退
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    // 使用默认图标作为回退
    img.src = getThemeAwareIcon('default' as any);
  };

  return (
    <img 
      src={iconPath}
      alt={`${nodeType} icon`}
      title={iconTitle}
      className={`inline-block ${className}`}
      width={size}
      height={size}
      style={{ minWidth: size, minHeight: size }}
      onError={handleImageError}
    />
  );
};



export default DatabaseIcon;