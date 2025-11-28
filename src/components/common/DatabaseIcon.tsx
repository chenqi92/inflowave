import React from 'react';
import { TreeNodeType } from '@/types/tree';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getDatabaseBrandIcon, getFunctionalIcon } from '@/utils/iconLoader';

export interface DatabaseIconProps {
  nodeType: TreeNodeType;
  isConnected?: boolean;
  isOpen?: boolean; // 是否为打开状态
  className?: string;
  size?: number;
  dbType?: string;  // 用于品牌图标
  dbVersion?: string; // 数据库版本
  title?: string;   // 自定义 tooltip
}

// 可双击打开的节点类型
const OPENABLE_NODE_TYPES: TreeNodeType[] = [
  'database',
  'system_database',
  'database3x',
  'bucket',
  'system_bucket',
  'measurement',
  'table',
  'storage_group',
  'device',
  'organization',
  'schema',
  'namespace',
  'view',
  'materialized_view',
  'dashboard'
];

// 检查节点是否可以双击打开
export const isOpenableNode = (nodeType: TreeNodeType): boolean => {
  return OPENABLE_NODE_TYPES.includes(nodeType);
};

// 获取图标描述
const getIconDescription = (nodeType: TreeNodeType): string => {
  const descriptions: Record<string, string> = {
    // 连接和数据库
    'connection': '数据库连接',
    'database': '数据库',
    'system_database': '系统数据库',
    'database3x': 'InfluxDB 3.x 数据库',

    // 表和测量
    'table': '数据表',
    'measurement': '测量',
    'column': '列',
    'field': '字段',
    'field_group': '字段组',
    'tag': '标签',
    'tag_group': '标签组',

    // 索引和视图
    'index': '索引',
    'view': '视图',
    'materialized_view': '物化视图',

    // 用户和权限
    'user1x': 'InfluxDB 1.x 用户',
    'user2x': 'InfluxDB 2.x 用户',
    'authorization': '授权',
    'privilege': '权限',

    // InfluxDB 2.x 特有
    'bucket': '存储桶',
    'system_bucket': '系统存储桶',
    'organization': '组织',
    'task': '任务',
    'dashboard': '仪表板',
    'cell': '单元格',
    'variable': '变量',
    'check': '检查',
    'notification_rule': '通知规则',
    'notification_endpoint': '通知端点',
    'scraper': '采集器',
    'telegraf': 'Telegraf',
    'label': '标签',

    // IoTDB 特有
    'storage_group': '存储组',
    'device': '设备',
    'timeseries': '时间序列',
    'aligned_timeseries': '对齐时间序列',
    'attribute_group': '属性组',
    'data_type': '数据类型',
    'encoding': '编码方式',
    'compression': '压缩方式',
    'schema_template': '模式模板',
    'template': '模板',
    'system_info': '系统信息',
    'cluster_info': '集群信息',
    'storage_engine_info': '存储引擎信息',
    'version_info': '版本信息',

    // 通用功能
    'function': '函数',
    'function3x': 'InfluxDB 3.x 函数',
    'procedure': '存储过程',
    'trigger': '触发器',
    'trigger3x': 'InfluxDB 3.x 触发器',
    'namespace': '命名空间',
    'schema': '模式',
    'partition': '分区',
    'shard': '分片',
    'shard_group': '分片组',
    'retention_policy': '保留策略',
    'continuous_query': '连续查询',
    'series': '序列',
  };

  return descriptions[nodeType] || '数据节点';
};

// 内联 SVG 回退图标（当预加载的图标不可用时使用）
const FallbackIcon: React.FC<{ size: number; className?: string; title?: string }> = ({
  size,
  className = '',
  title
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ display: 'block' }}
  >
    {title && <title>{title}</title>}
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const DatabaseIcon: React.FC<DatabaseIconProps> = ({
  nodeType,
  isConnected = false,
  isOpen = false,
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
    const iconUrl = getDatabaseBrandIcon(dbType, isConnected, dbVersion);

    if (!iconUrl) {
      return <FallbackIcon size={size} className={className} title={iconTitle} />;
    }

    return (
      <img
        src={iconUrl}
        alt={iconTitle}
        title={iconTitle}
        width={size}
        height={size}
        className={`inline-block ${className}`}
        style={{ display: 'block', verticalAlign: 'middle' }}
        onError={(e) => {
          // 图标加载失败时隐藏
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // 其他节点使用功能图标
  const iconUrl = getFunctionalIcon(nodeType, resolvedTheme, isOpen);

  if (!iconUrl) {
    return <FallbackIcon size={size} className={className} title={iconTitle} />;
  }

  return (
    <img
      src={iconUrl}
      alt={iconTitle}
      title={iconTitle}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ display: 'block', verticalAlign: 'middle' }}
      onError={(e) => {
        // 图标加载失败时隐藏
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

// 导出可打开节点类型常量
export { OPENABLE_NODE_TYPES };

export default DatabaseIcon;
