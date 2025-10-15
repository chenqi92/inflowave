/**
 * 树节点视觉样式配置
 * 用于统一管理节点的颜色、图标、层级样式等
 */

import { TreeNodeType } from '@/types/tree';

/**
 * 节点层级配置
 */
export const NODE_HIERARCHY = {
  CONNECTION: 0,      // 连接节点
  DATABASE: 1,        // 数据库/存储组/组织
  CONTAINER: 2,       // 容器节点（表、测量、设备等）
  GROUP: 3,           // 分组节点（字段组、标签组）
  LEAF: 4,            // 叶子节点（字段、标签、列等）
} as const;

/**
 * 获取节点层级
 */
export function getNodeHierarchyLevel(nodeType: TreeNodeType): number {
  // 连接节点
  if (nodeType === 'connection' || nodeType === 'connection-active' || nodeType === 'connection-inactive') {
    return NODE_HIERARCHY.CONNECTION;
  }
  
  // 数据库级别节点
  if (
    nodeType === 'database' || 
    nodeType === 'system_database' ||
    nodeType === 'database3x' ||
    nodeType === 'storage_group' ||
    nodeType === 'organization' ||
    nodeType === 'bucket' ||
    nodeType === 'system_bucket'
  ) {
    return NODE_HIERARCHY.DATABASE;
  }
  
  // 容器节点
  if (
    nodeType === 'table' ||
    nodeType === 'measurement' ||
    nodeType === 'device' ||
    nodeType === 'timeseries' ||
    nodeType === 'aligned_timeseries' ||
    nodeType === 'namespace' ||
    nodeType === 'schema'
  ) {
    return NODE_HIERARCHY.CONTAINER;
  }
  
  // 分组节点
  if (
    nodeType === 'field_group' ||
    nodeType === 'tag_group' ||
    nodeType === 'attribute_group'
  ) {
    return NODE_HIERARCHY.GROUP;
  }
  
  // 叶子节点
  return NODE_HIERARCHY.LEAF;
}

/**
 * 节点颜色配置（增强对比度）
 */
export const NODE_COLORS = {
  // 字段相关 - 蓝色系（加深）
  field: {
    light: 'text-blue-700',
    dark: 'text-blue-300',
    icon: 'text-blue-700 dark:text-blue-300',
  },
  field_group: {
    light: 'text-blue-700',
    dark: 'text-blue-300',
    icon: 'text-blue-700 dark:text-blue-300',
  },

  // 标签相关 - 琥珀色系（加深）
  tag: {
    light: 'text-amber-700',
    dark: 'text-amber-300',
    icon: 'text-amber-700 dark:text-amber-300',
  },
  tag_group: {
    light: 'text-amber-700',
    dark: 'text-amber-300',
    icon: 'text-amber-700 dark:text-amber-300',
  },

  // 系统节点 - 橙色系（加深）
  system: {
    light: 'text-orange-700',
    dark: 'text-orange-300',
    icon: 'text-orange-700 dark:text-orange-300',
  },

  // 连接节点 - 蓝色系（加深）
  connection: {
    light: 'text-blue-700',
    dark: 'text-blue-300',
    icon: 'text-blue-700 dark:text-blue-300',
  },

  // 连接节点（未连接）- 深灰色系（加深）
  connectionDisconnected: {
    light: 'text-gray-700',
    dark: 'text-gray-500',
    icon: 'text-gray-700 dark:text-gray-500',
  },

  // 数据库节点 - slate 系（加深）
  database: {
    light: 'text-slate-800',
    dark: 'text-slate-200',
    icon: 'text-slate-800 dark:text-slate-200',
  },

  // 数据库节点（未打开）- 深灰色系（加深）
  databaseClosed: {
    light: 'text-gray-700',
    dark: 'text-gray-500',
    icon: 'text-gray-700 dark:text-gray-500',
  },

  // 表/测量节点 - slate 系（加深）
  table: {
    light: 'text-slate-700',
    dark: 'text-slate-300',
    icon: 'text-slate-700 dark:text-slate-300',
  },

  // 设备节点 - slate 系（加深）
  device: {
    light: 'text-slate-700',
    dark: 'text-slate-300',
    icon: 'text-slate-700 dark:text-slate-300',
  },
} as const;

/**
 * 获取节点文本颜色类名
 * @param nodeType 节点类型
 * @param isConnected 连接节点是否已连接（仅对 connection 节点有效）
 * @param isActivated 数据库节点是否已打开（仅对 database 节点有效）
 */
export function getNodeTextColor(
  nodeType: TreeNodeType,
  isConnected?: boolean,
  isActivated?: boolean
): string {
  switch (nodeType) {
    case 'field':
      return NODE_COLORS.field.icon;
    case 'field_group':
      return NODE_COLORS.field_group.icon;
    case 'tag':
      return NODE_COLORS.tag.icon;
    case 'tag_group':
      return NODE_COLORS.tag_group.icon;
    case 'system_database':
    case 'system_bucket':
    case 'system_info':
    case 'version_info':
    case 'storage_engine_info':
    case 'cluster_info':
      return NODE_COLORS.system.icon;
    case 'connection':
    case 'connection-active':
    case 'connection-inactive':
      // 根据连接状态返回不同颜色
      return isConnected ? NODE_COLORS.connection.icon : NODE_COLORS.connectionDisconnected.icon;
    case 'database':
    case 'database3x':
    case 'storage_group':
      // 根据数据库打开状态返回不同颜色
      return isActivated ? NODE_COLORS.database.icon : NODE_COLORS.databaseClosed.icon;
    case 'table':
    case 'measurement':
      return NODE_COLORS.table.icon;
    case 'device':
    case 'timeseries':
    case 'aligned_timeseries':
      return NODE_COLORS.device.icon;
    default:
      return '';
  }
}

/**
 * 获取节点图标颜色类名
 * @param nodeType 节点类型
 * @param isSystem 是否为系统节点
 * @param isConnected 连接节点是否已连接（仅对 connection 节点有效）
 * @param isActivated 数据库节点是否已打开（仅对 database 节点有效）
 */
export function getNodeIconColor(
  nodeType: TreeNodeType,
  isSystem: boolean = false,
  isConnected?: boolean,
  isActivated?: boolean
): string {
  if (isSystem) {
    return NODE_COLORS.system.icon;
  }

  return getNodeTextColor(nodeType, isConnected, isActivated);
}

/**
 * 节点字体样式配置（增强可读性）
 */
export const NODE_FONT_STYLES = {
  connection: 'font-bold',        // 连接节点：加粗（700）
  database: 'font-semibold',      // 数据库节点：半粗（600）
  database3x: 'font-semibold',
  storage_group: 'font-semibold',
  organization: 'font-semibold',
  bucket: 'font-semibold',
  system: 'italic font-medium',   // 系统节点：中等粗细（500）+ 斜体
  normal: 'font-medium',          // 普通节点：中等粗细（500）
} as const;

/**
 * 获取节点字体样式
 */
export function getNodeFontStyle(nodeType: TreeNodeType, isSystem: boolean = false): string {
  if (isSystem) {
    return NODE_FONT_STYLES.system;
  }
  
  switch (nodeType) {
    case 'connection':
    case 'connection-active':
    case 'connection-inactive':
      return NODE_FONT_STYLES.connection;
    case 'database':
    case 'database3x':
    case 'storage_group':
    case 'organization':
    case 'bucket':
      return NODE_FONT_STYLES.database;
    default:
      return NODE_FONT_STYLES.normal;
  }
}

/**
 * 判断是否为系统管理节点
 */
export function isSystemManagementNode(nodeType: TreeNodeType, isSystem: boolean = false): boolean {
  return isSystem || 
    nodeType === 'system_database' || 
    nodeType === 'system_bucket' ||
    nodeType === 'system_info' ||
    nodeType === 'version_info' ||
    nodeType === 'storage_engine_info' ||
    nodeType === 'cluster_info';
}

/**
 * 获取节点层级透明度
 */
export function getNodeOpacity(level: number, isSystem: boolean = false): string {
  if (isSystem) return 'opacity-80';
  
  // 根据层级调整透明度
  if (level >= 4) return 'opacity-95';
  if (level >= 3) return 'opacity-100';
  return 'opacity-100';
}

/**
 * 获取节点背景样式
 */
export function getNodeBackgroundStyle(
  nodeType: TreeNodeType,
  isSystem: boolean,
  isSelected: boolean,
  hasError: boolean
): string {
  const classes: string[] = [];
  
  // 基础样式
  classes.push('transition-colors');
  
  // 选中状态
  if (isSelected) {
    classes.push('bg-accent text-accent-foreground');
  }
  
  // 系统节点背景
  if (isSystemManagementNode(nodeType, isSystem) && !isSelected) {
    classes.push('bg-muted/30');
  }
  
  // 错误状态
  if (hasError) {
    classes.push('border-l-2 border-destructive');
  }
  
  return classes.join(' ');
}

/**
 * 节点状态指示器配置
 */
export const NODE_STATUS_INDICATORS = {
  system: {
    icon: 'Settings',
    size: 'w-3.5 h-3.5',
    color: 'text-orange-500 dark:text-orange-400',
    title: '系统节点',
  },
  favorite: {
    icon: 'Star',
    size: 'w-3.5 h-3.5',
    color: 'text-yellow-500 fill-yellow-500',
    title: '收藏',
  },
  error: {
    icon: 'AlertCircle',
    size: 'w-3.5 h-3.5',
    color: 'text-destructive',
    animation: 'animate-pulse',
    title: '错误',
  },
  warning: {
    icon: 'AlertTriangle',
    size: 'w-3.5 h-3.5',
    color: 'text-yellow-600 dark:text-yellow-400',
    title: '警告',
  },
  loading: {
    icon: 'Loader2',
    size: 'w-3.5 h-3.5',
    color: 'text-muted-foreground',
    animation: 'animate-spin',
    title: '加载中',
  },
  connected: {
    icon: 'CheckCircle2',
    size: 'w-3.5 h-3.5',
    color: 'text-green-500 dark:text-green-400',
    title: '已连接',
  },
  disconnected: {
    icon: 'XCircle',
    size: 'w-3.5 h-3.5',
    color: 'text-red-500 dark:text-red-400',
    title: '未连接',
  },
  locked: {
    icon: 'Lock',
    size: 'w-3 h-3',
    color: 'text-gray-500 dark:text-gray-400',
    title: '已锁定',
  },
  readonly: {
    icon: 'Eye',
    size: 'w-3 h-3',
    color: 'text-blue-500 dark:text-blue-400',
    title: '只读',
  },
} as const;

/**
 * 图标尺寸配置
 */
export const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
} as const;

/**
 * 图标间距配置
 */
export const ICON_SPACING = {
  tight: 'ml-0.5',
  normal: 'ml-1',
  relaxed: 'ml-1.5',
  loose: 'ml-2',
} as const;

