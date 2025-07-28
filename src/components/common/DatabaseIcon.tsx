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

  // 如果图标路径不存在，使用 emoji 作为回退
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    
    // 创建 emoji 元素作为回退
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = getEmojiIcon(nodeType);
    emojiSpan.className = 'inline-block text-center';
    emojiSpan.style.width = `${size}px`;
    emojiSpan.style.height = `${size}px`;
    emojiSpan.style.fontSize = `${Math.floor(size * 0.8)}px`;
    emojiSpan.style.lineHeight = `${size}px`;
    
    img.parentNode?.insertBefore(emojiSpan, img);
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

// Emoji 回退图标 (原有的 emoji 映射)
const getEmojiIcon = (nodeType: TreeNodeType): string => {
  const emojiMap: Record<TreeNodeType, string> = {
    connection: '🔌',
    database: '💾',
    system_database: '🔧',
    retention_policy: '📅',
    series: '📈',
    continuous_query: '🔄',
    shard: '🧩',
    shard_group: '📦',
    user1x: '👤',
    privilege: '🔐',
    organization: '🏢',
    bucket: '🪣',
    system_bucket: '⚙️',
    task: '⚡',
    dashboard: '📊',
    cell: '📋',
    variable: '🔤',
    check: '✅',
    notification_rule: '🔔',
    notification_endpoint: '📡',
    scraper: '🕷️',
    telegraf: '📊',
    authorization: '🔑',
    user2x: '👤',
    label: '🏷️',
    database3x: '🗄️',
    schema: '📋',
    table: '📊',
    column: '📏',
    index: '🔍',
    partition: '🗂️',
    view: '👁️',
    materialized_view: '💎',
    function3x: '⚙️',
    procedure: '🔧',
    trigger3x: '🔔',
    namespace: '📁',
    storage_group: '🏢',
    device: '📱',
    timeseries: '📊',
    aligned_timeseries: '📊',
    template: '📋',
    function: '⚙️',
    trigger: '🔔',
    system_info: '🔧',
    version_info: '📋',
    storage_engine_info: '💾',
    cluster_info: '🌐',
    schema_template: '📋',
    data_type: '🔢',
    encoding: '🔧',
    compression: '📦',
    attribute_group: '📝',
    measurement: '📊',
    field_group: '📈',
    tag_group: '🏷️',
    field: '📊',
    tag: '🏷️',
  };
  
  return emojiMap[nodeType] || '📄';
};

export default DatabaseIcon;