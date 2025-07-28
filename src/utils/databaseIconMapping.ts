/**
 * 数据库图标映射工具
 * 
 * 提供统一的数据库节点类型到图标的映射管理
 */

import { TreeNodeType } from '@/types/tree';

/**
 * 数据库类型定义
 */
export type DatabaseType = 'influxdb1' | 'influxdb2' | 'influxdb3' | 'iotdb';

/**
 * 图标配置接口
 */
export interface IconConfig {
  /** 图标文件名 */
  fileName: string;
  /** 打开状态图标文件名 */
  openFileName?: string;
  /** 中文描述 */
  description: string;
  /** 适用的数据库类型 */
  databases: DatabaseType[];
  /** 是否为叶子节点 */
  isLeaf?: boolean;
  /** 是否可以双击打开 */
  isOpenable?: boolean;
}

/**
 * 完整的图标映射配置
 */
export const ICON_MAPPING: Record<TreeNodeType, IconConfig> = {
  // 连接节点
  'connection': {
    fileName: 'connection-active.svg',
    description: '数据库连接',
    databases: ['influxdb1', 'influxdb2', 'influxdb3', 'iotdb'],
  },
  'connection-active': {
    fileName: 'connection-active.svg',
    description: '活跃连接',
    databases: ['influxdb1', 'influxdb2', 'influxdb3', 'iotdb'],
  },
  'connection-inactive': {
    fileName: 'connection-inactive.svg',
    description: '非活跃连接',
    databases: ['influxdb1', 'influxdb2', 'influxdb3', 'iotdb'],
  },

  // 数据库相关
  'database': {
    fileName: 'database.svg',
    openFileName: 'database-open.svg',
    description: '数据库',
    databases: ['influxdb1'],
    isOpenable: true,
  },
  'system_database': {
    fileName: 'database-system.svg',
    description: '系统数据库',
    databases: ['influxdb1'],
  },
  'database3x': {
    fileName: 'database3x.svg',
    openFileName: 'database3x-open.svg',
    description: 'InfluxDB 3.x 数据库',
    databases: ['influxdb3'],
    isOpenable: true,
  },

  // 表和测量相关
  'table': {
    fileName: 'table.svg',
    openFileName: 'table-open.svg',
    description: '数据表',
    databases: ['influxdb3'],
    isOpenable: true,
  },
  'measurement': {
    fileName: 'measurement.svg',
    openFileName: 'measurement-open.svg',
    description: '测量',
    databases: ['influxdb1', 'influxdb2'],
    isOpenable: true,
  },
  'column': {
    fileName: 'column.svg',
    description: '列',
    databases: ['influxdb3'],
    isLeaf: true,
  },
  'field': {
    fileName: 'field.svg',
    description: '字段',
    databases: ['influxdb1', 'influxdb2'],
    isLeaf: true,
  },
  'field_group': {
    fileName: 'field-group.svg',
    description: '字段组',
    databases: ['influxdb1', 'influxdb2'],
  },
  'tag': {
    fileName: 'tag.svg',
    description: '标签',
    databases: ['influxdb1', 'influxdb2'],
    isLeaf: true,
  },
  'tag_group': {
    fileName: 'tag-group.svg',
    description: '标签组',
    databases: ['influxdb1', 'influxdb2'],
  },

  // 索引和视图
  'index': {
    fileName: 'index.svg',
    description: '索引',
    databases: ['influxdb3'],
    isLeaf: true,
  },
  'view': {
    fileName: 'view.svg',
    description: '视图',
    databases: ['influxdb3'],
  },
  'materialized_view': {
    fileName: 'materialized-view.svg',
    description: '物化视图',
    databases: ['influxdb3'],
  },

  // 用户和权限
  'user1x': {
    fileName: 'user1x.svg',
    description: 'InfluxDB 1.x 用户',
    databases: ['influxdb1'],
    isLeaf: true,
  },
  'user2x': {
    fileName: 'user2x.svg',
    description: 'InfluxDB 2.x 用户',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'authorization': {
    fileName: 'authorization.svg',
    description: '授权',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'privilege': {
    fileName: 'privilege.svg',
    description: '权限',
    databases: ['influxdb1'],
    isLeaf: true,
  },

  // InfluxDB 2.x 特有
  'bucket': {
    fileName: 'bucket.svg',
    description: '存储桶',
    databases: ['influxdb2'],
  },
  'system_bucket': {
    fileName: 'system-bucket.svg',
    description: '系统存储桶',
    databases: ['influxdb2'],
  },
  'organization': {
    fileName: 'organization.svg',
    description: '组织',
    databases: ['influxdb2'],
  },
  'task': {
    fileName: 'task.svg',
    description: '任务',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'dashboard': {
    fileName: 'dashboard.svg',
    description: '仪表板',
    databases: ['influxdb2'],
  },
  'cell': {
    fileName: 'cell.svg',
    description: '单元格',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'variable': {
    fileName: 'variable.svg',
    description: '变量',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'check': {
    fileName: 'check.svg',
    description: '检查',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'notification_rule': {
    fileName: 'notification-rule.svg',
    description: '通知规则',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'notification_endpoint': {
    fileName: 'notification-endpoint.svg',
    description: '通知端点',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'scraper': {
    fileName: 'scraper.svg',
    description: '采集器',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'telegraf': {
    fileName: 'telegraf.svg',
    description: 'Telegraf',
    databases: ['influxdb2'],
    isLeaf: true,
  },
  'label': {
    fileName: 'label.svg',
    description: '标签',
    databases: ['influxdb2'],
    isLeaf: true,
  },

  // IoTDB 特有
  'storage_group': {
    fileName: 'storage-group.svg',
    description: '存储组',
    databases: ['iotdb'],
  },
  'device': {
    fileName: 'device.svg',
    description: '设备',
    databases: ['iotdb'],
  },
  'timeseries': {
    fileName: 'timeseries.svg',
    description: '时间序列',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'aligned_timeseries': {
    fileName: 'aligned-timeseries.svg',
    description: '对齐时间序列',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'attribute_group': {
    fileName: 'attribute-group.svg',
    description: '属性组',
    databases: ['iotdb'],
  },
  'data_type': {
    fileName: 'data-type.svg',
    description: '数据类型',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'encoding': {
    fileName: 'encoding.svg',
    description: '编码方式',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'compression': {
    fileName: 'compression.svg',
    description: '压缩方式',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'schema_template': {
    fileName: 'schema-template.svg',
    description: '模式模板',
    databases: ['iotdb'],
  },
  'template': {
    fileName: 'template.svg',
    description: '模板',
    databases: ['iotdb'],
  },
  'system_info': {
    fileName: 'system-info.svg',
    description: '系统信息',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'cluster_info': {
    fileName: 'cluster-info.svg',
    description: '集群信息',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'storage_engine_info': {
    fileName: 'storage-engine-info.svg',
    description: '存储引擎信息',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'version_info': {
    fileName: 'version-info.svg',
    description: '版本信息',
    databases: ['iotdb'],
    isLeaf: true,
  },

  // 通用功能
  'function': {
    fileName: 'function.svg',
    description: '函数',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'function3x': {
    fileName: 'function3x.svg',
    description: 'InfluxDB 3.x 函数',
    databases: ['influxdb3'],
    isLeaf: true,
  },
  'procedure': {
    fileName: 'procedure.svg',
    description: '存储过程',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'trigger': {
    fileName: 'trigger.svg',
    description: '触发器',
    databases: ['iotdb'],
    isLeaf: true,
  },
  'trigger3x': {
    fileName: 'trigger3x.svg',
    description: 'InfluxDB 3.x 触发器',
    databases: ['influxdb3'],
    isLeaf: true,
  },
  'namespace': {
    fileName: 'namespace.svg',
    description: '命名空间',
    databases: ['influxdb3'],
  },
  'schema': {
    fileName: 'schema.svg',
    description: '模式',
    databases: ['influxdb3'],
  },
  'partition': {
    fileName: 'partition.svg',
    description: '分区',
    databases: ['influxdb3'],
    isLeaf: true,
  },
  'shard': {
    fileName: 'shard.svg',
    description: '分片',
    databases: ['influxdb1'],
    isLeaf: true,
  },
  'shard_group': {
    fileName: 'shard-group.svg',
    description: '分片组',
    databases: ['influxdb1'],
  },
  'retention_policy': {
    fileName: 'retention-policy.svg',
    description: '保留策略',
    databases: ['influxdb1'],
  },
  'continuous_query': {
    fileName: 'continuous-query.svg',
    description: '连续查询',
    databases: ['influxdb1'],
    isLeaf: true,
  },
  'series': {
    fileName: 'series.svg',
    description: '序列',
    databases: ['influxdb1'],
    isLeaf: true,
  },
};

/**
 * 获取节点类型的图标配置
 */
export function getIconConfig(nodeType: TreeNodeType): IconConfig | undefined {
  return ICON_MAPPING[nodeType];
}

/**
 * 获取节点类型的图标文件名
 */
export function getIconFileName(nodeType: TreeNodeType): string {
  const config = getIconConfig(nodeType);
  return config?.fileName || 'default.svg';
}

/**
 * 获取节点类型的描述
 */
export function getIconDescription(nodeType: TreeNodeType): string {
  const config = getIconConfig(nodeType);
  return config?.description || '数据节点';
}

/**
 * 检查节点类型是否为叶子节点
 */
export function isLeafNode(nodeType: TreeNodeType): boolean {
  const config = getIconConfig(nodeType);
  return config?.isLeaf || false;
}

/**
 * 获取数据库类型支持的所有节点类型
 */
export function getSupportedNodeTypes(dbType: DatabaseType): TreeNodeType[] {
  return Object.entries(ICON_MAPPING)
    .filter(([_, config]) => config.databases.includes(dbType))
    .map(([nodeType]) => nodeType as TreeNodeType);
}

/**
 * 检查节点类型是否可以双击打开
 */
export function isOpenableNodeType(nodeType: TreeNodeType): boolean {
  const config = getIconConfig(nodeType);
  return config?.isOpenable || false;
}

/**
 * 获取节点类型的打开状态图标文件名
 */
export function getOpenIconFileName(nodeType: TreeNodeType): string {
  const config = getIconConfig(nodeType);
  return config?.openFileName || config?.fileName || 'default.svg';
}

/**
 * 生成图标路径
 */
export function generateIconPath(nodeType: TreeNodeType, theme: 'light' | 'dark' = 'light', isOpen: boolean = false): string {
  const fileName = isOpen ? getOpenIconFileName(nodeType) : getIconFileName(nodeType);
  return `/src/assets/icons/database/${theme}/${fileName}`;
}
