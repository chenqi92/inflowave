import { TreeNodeType } from '@/types/tree';

/**
 * 完整的数据库图标映射配置
 */

export interface IconConfig {
  light: string;
  dark: string;
  description: string;
}

// 完整的图标映射表
export const DatabaseIconMap: Record<TreeNodeType | string, IconConfig> = {
  // === 连接状态图标 ===
  'connection-active': {
    light: '/src/assets/icons/database/light/connection-active.svg',
    dark: '/src/assets/icons/database/dark/connection-active.svg',
    description: '数据库连接已建立'
  },
  'connection-inactive': {
    light: '/src/assets/icons/database/light/connection-inactive.svg', 
    dark: '/src/assets/icons/database/dark/connection-inactive.svg',
    description: '数据库连接未建立'
  },
  'connection-error': {
    light: '/src/assets/icons/database/light/connection-error.svg',
    dark: '/src/assets/icons/database/dark/connection-error.svg', 
    description: '数据库连接错误'
  },
  'connection-loading': {
    light: '/src/assets/icons/database/light/connection-loading.svg',
    dark: '/src/assets/icons/database/dark/connection-loading.svg',
    description: '正在连接数据库'
  },

  // === 通用节点 ===
  'connection': {
    light: '/src/assets/icons/database/light/connection-inactive.svg',
    dark: '/src/assets/icons/database/dark/connection-inactive.svg',
    description: '数据库连接'
  },

  // === 基础数据库节点 ===
  'database': {
    light: '/src/assets/icons/database/light/database.svg',
    dark: '/src/assets/icons/database/dark/database.svg',
    description: 'InfluxDB 1.x 数据库'
  },
  'system_database': {
    light: '/src/assets/icons/database/light/database-system.svg',
    dark: '/src/assets/icons/database/dark/database-system.svg',
    description: '系统数据库'
  },
  'database3x': {
    light: '/src/assets/icons/database/light/database3x.svg',
    dark: '/src/assets/icons/database/dark/database3x.svg',
    description: 'InfluxDB 3.x 数据库'
  },
  'storage_group': {
    light: '/src/assets/icons/database/light/storage-group.svg',
    dark: '/src/assets/icons/database/dark/storage-group.svg',
    description: 'IoTDB 存储组'
  },

  // === InfluxDB 1.x 节点 ===
  'retention_policy': {
    light: '/src/assets/icons/database/light/retention-policy.svg',
    dark: '/src/assets/icons/database/dark/retention-policy.svg',
    description: '数据保留策略'
  },
  'series': {
    light: '/src/assets/icons/database/light/series.svg',
    dark: '/src/assets/icons/database/dark/series.svg',
    description: '时间序列'
  },
  'continuous_query': {
    light: '/src/assets/icons/database/light/continuous-query.svg',
    dark: '/src/assets/icons/database/dark/continuous-query.svg',
    description: '连续查询'
  },
  'shard': {
    light: '/src/assets/icons/database/light/shard.svg',
    dark: '/src/assets/icons/database/dark/shard.svg',
    description: '数据分片'
  },
  'shard_group': {
    light: '/src/assets/icons/database/light/shard-group.svg',
    dark: '/src/assets/icons/database/dark/shard-group.svg',
    description: '分片组'
  },
  'user1x': {
    light: '/src/assets/icons/database/light/user1x.svg',
    dark: '/src/assets/icons/database/dark/user1x.svg',
    description: 'InfluxDB 1.x 用户'
  },
  'privilege': {
    light: '/src/assets/icons/database/light/privilege.svg',
    dark: '/src/assets/icons/database/dark/privilege.svg',
    description: '用户权限'
  },

  // === InfluxDB 2.x 节点 ===
  'organization': {
    light: '/src/assets/icons/database/light/organization.svg',
    dark: '/src/assets/icons/database/dark/organization.svg',
    description: 'InfluxDB 2.x 组织'
  },
  'bucket': {
    light: '/src/assets/icons/database/light/bucket.svg',
    dark: '/src/assets/icons/database/dark/bucket.svg',
    description: 'InfluxDB 2.x 存储桶'
  },
  'system_bucket': {
    light: '/src/assets/icons/database/light/system-bucket.svg',
    dark: '/src/assets/icons/database/dark/system-bucket.svg',
    description: '系统存储桶'
  },
  'task': {
    light: '/src/assets/icons/database/light/task.svg',
    dark: '/src/assets/icons/database/dark/task.svg',
    description: '自动化任务'
  },
  'dashboard': {
    light: '/src/assets/icons/database/light/dashboard.svg',
    dark: '/src/assets/icons/database/dark/dashboard.svg',
    description: '数据仪表板'
  },
  'cell': {
    light: '/src/assets/icons/database/light/cell.svg',
    dark: '/src/assets/icons/database/dark/cell.svg',
    description: '仪表板单元格'
  },
  'variable': {
    light: '/src/assets/icons/database/light/variable.svg',
    dark: '/src/assets/icons/database/dark/variable.svg',
    description: '仪表板变量'
  },
  'check': {
    light: '/src/assets/icons/database/light/check.svg',
    dark: '/src/assets/icons/database/dark/check.svg',
    description: '监控检查'
  },
  'notification_rule': {
    light: '/src/assets/icons/database/light/notification-rule.svg',
    dark: '/src/assets/icons/database/dark/notification-rule.svg',
    description: '通知规则'
  },
  'notification_endpoint': {
    light: '/src/assets/icons/database/light/notification-endpoint.svg',
    dark: '/src/assets/icons/database/dark/notification-endpoint.svg',
    description: '通知端点'
  },
  'scraper': {
    light: '/src/assets/icons/database/light/scraper.svg',
    dark: '/src/assets/icons/database/dark/scraper.svg',
    description: '数据抓取器'
  },
  'telegraf': {
    light: '/src/assets/icons/database/light/telegraf.svg',
    dark: '/src/assets/icons/database/dark/telegraf.svg',
    description: 'Telegraf 配置'
  },
  'authorization': {
    light: '/src/assets/icons/database/light/authorization.svg',
    dark: '/src/assets/icons/database/dark/authorization.svg',
    description: '授权令牌'
  },
  'user2x': {
    light: '/src/assets/icons/database/light/user2x.svg',
    dark: '/src/assets/icons/database/dark/user2x.svg',
    description: 'InfluxDB 2.x 用户'
  },
  'label': {
    light: '/src/assets/icons/database/light/label.svg',
    dark: '/src/assets/icons/database/dark/label.svg',
    description: '组织标签'
  },

  // === InfluxDB 3.x 节点 ===
  'schema': {
    light: '/src/assets/icons/database/light/schema.svg',
    dark: '/src/assets/icons/database/dark/schema.svg',
    description: '数据库模式'
  },
  'table': {
    light: '/src/assets/icons/database/light/table.svg',
    dark: '/src/assets/icons/database/dark/table.svg',
    description: '数据表'
  },
  'column': {
    light: '/src/assets/icons/database/light/column.svg',
    dark: '/src/assets/icons/database/dark/column.svg',
    description: '表列'
  },
  'index': {
    light: '/src/assets/icons/database/light/index.svg',
    dark: '/src/assets/icons/database/dark/index.svg',
    description: '数据库索引'
  },
  'partition': {
    light: '/src/assets/icons/database/light/partition.svg',
    dark: '/src/assets/icons/database/dark/partition.svg',
    description: '数据分区'
  },
  'view': {
    light: '/src/assets/icons/database/light/view.svg',
    dark: '/src/assets/icons/database/dark/view.svg',
    description: '数据视图'
  },
  'materialized_view': {
    light: '/src/assets/icons/database/light/materialized-view.svg',
    dark: '/src/assets/icons/database/dark/materialized-view.svg',
    description: '物化视图'
  },
  'function3x': {
    light: '/src/assets/icons/database/light/function3x.svg',
    dark: '/src/assets/icons/database/dark/function3x.svg',
    description: 'InfluxDB 3.x 函数'
  },
  'procedure': {
    light: '/src/assets/icons/database/light/procedure.svg',
    dark: '/src/assets/icons/database/dark/procedure.svg',
    description: '存储过程'
  },
  'trigger3x': {
    light: '/src/assets/icons/database/light/trigger3x.svg',
    dark: '/src/assets/icons/database/dark/trigger3x.svg',
    description: 'InfluxDB 3.x 触发器'
  },
  'namespace': {
    light: '/src/assets/icons/database/light/namespace.svg',
    dark: '/src/assets/icons/database/dark/namespace.svg',
    description: '命名空间'
  },

  // === IoTDB 节点 ===
  'device': {
    light: '/src/assets/icons/database/light/device.svg',
    dark: '/src/assets/icons/database/dark/device.svg',
    description: 'IoT 设备'
  },
  'timeseries': {
    light: '/src/assets/icons/database/light/timeseries.svg',
    dark: '/src/assets/icons/database/dark/timeseries.svg',
    description: 'IoTDB 时间序列'
  },
  'aligned_timeseries': {
    light: '/src/assets/icons/database/light/aligned-timeseries.svg',
    dark: '/src/assets/icons/database/dark/aligned-timeseries.svg',
    description: '对齐时间序列'
  },
  'template': {
    light: '/src/assets/icons/database/light/template.svg', 
    dark: '/src/assets/icons/database/dark/template.svg',
    description: '设备模板'
  },
  'function': {
    light: '/src/assets/icons/database/light/function.svg',
    dark: '/src/assets/icons/database/dark/function.svg',
    description: 'IoTDB UDF 函数'
  },
  'trigger': {
    light: '/src/assets/icons/database/light/trigger.svg',
    dark: '/src/assets/icons/database/dark/trigger.svg',
    description: 'IoTDB 触发器' 
  },
  'system_info': {
    light: '/src/assets/icons/database/light/system-info.svg',
    dark: '/src/assets/icons/database/dark/system-info.svg',
    description: '系统信息'
  },
  'version_info': {
    light: '/src/assets/icons/database/light/version-info.svg',
    dark: '/src/assets/icons/database/dark/version-info.svg',
    description: '版本信息'
  },
  'storage_engine_info': {
    light: '/src/assets/icons/database/light/storage-engine-info.svg',
    dark: '/src/assets/icons/database/dark/storage-engine-info.svg',
    description: '存储引擎信息'
  },
  'cluster_info': {
    light: '/src/assets/icons/database/light/cluster-info.svg',
    dark: '/src/assets/icons/database/dark/cluster-info.svg',
    description: '集群信息'
  },
  'schema_template': {
    light: '/src/assets/icons/database/light/schema-template.svg',
    dark: '/src/assets/icons/database/dark/schema-template.svg',
    description: '模式模板'
  },
  'data_type': {
    light: '/src/assets/icons/database/light/data-type.svg',
    dark: '/src/assets/icons/database/dark/data-type.svg',
    description: '数据类型' 
  },
  'encoding': {
    light: '/src/assets/icons/database/light/encoding.svg',
    dark: '/src/assets/icons/database/dark/encoding.svg',
    description: '编码方式'
  },
  'compression': {
    light: '/src/assets/icons/database/light/compression.svg',
    dark: '/src/assets/icons/database/dark/compression.svg',
    description: '压缩方式'
  },
  'attribute_group': {
    light: '/src/assets/icons/database/light/attribute-group.svg',
    dark: '/src/assets/icons/database/dark/attribute-group.svg', 
    description: '属性分组'
  },

  // === 通用测量节点 ===
  'measurement': {
    light: '/src/assets/icons/database/light/measurement.svg',
    dark: '/src/assets/icons/database/dark/measurement.svg',
    description: '测量/表'
  },
  'field_group': {
    light: '/src/assets/icons/database/light/field-group.svg',
    dark: '/src/assets/icons/database/dark/field-group.svg',
    description: '字段分组'
  },
  'tag_group': {
    light: '/src/assets/icons/database/light/tag-group.svg',
    dark: '/src/assets/icons/database/dark/tag-group.svg',
    description: '标签分组'
  },
  'field': {
    light: '/src/assets/icons/database/light/field.svg',
    dark: '/src/assets/icons/database/dark/field.svg',
    description: '数据字段'
  },
  'tag': {
    light: '/src/assets/icons/database/light/tag.svg',
    dark: '/src/assets/icons/database/dark/tag.svg',
    description: '索引标签'
  },

  // === 默认图标 ===
  'default': {
    light: '/src/assets/icons/database/light/default.svg',
    dark: '/src/assets/icons/database/dark/default.svg',
    description: '默认节点'
  }
};

// 数据库品牌图标
export const DatabaseBrandIcons: Record<string, string> = {
  'InfluxDB': '/src/assets/icons/database/brands/influxdb-1x.svg',
  'InfluxDB2': '/src/assets/icons/database/brands/influxdb-2x.svg', 
  'InfluxDB3': '/src/assets/icons/database/brands/influxdb-3x.svg',
  'IoTDB': '/src/assets/icons/database/brands/iotdb.svg',
  'Generic': '/src/assets/icons/database/brands/database-generic.svg'
};

/**
 * 获取当前主题
 */
export const getCurrentTheme = (): 'light' | 'dark' => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

/**
 * 获取主题感知的图标路径
 */
export const getThemeAwareIcon = (nodeType: TreeNodeType, isConnected?: boolean): string => {
  const theme = getCurrentTheme();
  let iconKey: keyof typeof DatabaseIconMap = nodeType;

  // 特殊处理连接状态
  if (nodeType === 'connection') {
    iconKey = isConnected ? 'connection-active' : 'connection-inactive';
  }

  const iconConfig = DatabaseIconMap[iconKey];
  if (iconConfig) {
    return iconConfig[theme];
  }
  
  // 回退到默认图标
  return DatabaseIconMap['default'][theme];
};

/**
 * 获取图标描述
 */
export const getIconDescription = (nodeType: TreeNodeType): string => {
  const iconConfig = DatabaseIconMap[nodeType];
  return iconConfig?.description || '数据节点';
};

/**
 * 获取数据库品牌图标
 */  
export const getDatabaseBrandIcon = (dbType: string): string => {
  return DatabaseBrandIcons[dbType] || DatabaseBrandIcons['Generic'];
};