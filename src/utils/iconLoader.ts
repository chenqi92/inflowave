import { TreeNodeType } from '@/types/tree';

/**
 * 使用Vite的glob import功能预加载所有SVG图标
 */

// 预加载所有light主题图标
const lightIcons = import.meta.glob('../assets/icons/database/light/*.svg', {
  query: '?url',
  eager: true
}) as Record<string, { default: string }>;

// 预加载所有dark主题图标
const darkIcons = import.meta.glob('../assets/icons/database/dark/*.svg', {
  query: '?url',
  eager: true
}) as Record<string, { default: string }>;

// 预加载所有品牌图标
const brandIcons = import.meta.glob('../assets/icons/database/brands/*.svg', {
  query: '?url',
  eager: true
}) as Record<string, { default: string }>;

/**
 * 图标配置接口
 */
export interface IconConfig {
  light: string;
  dark: string;
  description: string;
}

/**
 * 从文件路径提取图标名称
 */
const getIconNameFromPath = (path: string): string => {
  return path.split('/').pop()?.replace('.svg', '') || '';
};

/**
 * 构建图标映射表
 */
const buildIconMap = (): Record<string, IconConfig> => {
  const iconMap: Record<string, IconConfig> = {};
  
  // 处理light主题图标
  Object.entries(lightIcons).forEach(([path, module]) => {
    const iconName = getIconNameFromPath(path);
    if (!iconMap[iconName]) {
      iconMap[iconName] = {
        light: module.default,
        dark: '',
        description: getInternalIconDescription(iconName)
      };
    } else {
      iconMap[iconName].light = module.default;
    }
  });
  
  // 处理dark主题图标
  Object.entries(darkIcons).forEach(([path, module]) => {
    const iconName = getIconNameFromPath(path);
    if (!iconMap[iconName]) {
      iconMap[iconName] = {
        light: '',
        dark: module.default,
        description: getInternalIconDescription(iconName)
      };
    } else {
      iconMap[iconName].dark = module.default;
    }
  });
  
  return iconMap;
};

/**
 * 构建品牌图标映射表
 */
const buildBrandIconMap = (): Record<string, string> => {
  const brandMap: Record<string, string> = {};
  
  Object.entries(brandIcons).forEach(([path, module]) => {
    const iconName = getIconNameFromPath(path);
    brandMap[iconName] = module.default;
  });
  
  return brandMap;
};

/**
 * 获取图标描述（内部使用）
 */
const getInternalIconDescription = (iconName: string): string => {
  const descriptions: Record<string, string> = {
    // 连接状态
    'connection-active': '数据库连接已建立',
    'connection-inactive': '数据库连接未建立', 
    'connection-error': '数据库连接错误',
    'connection-loading': '正在连接数据库',
    'connection': '数据库连接',
    
    // 基础数据库节点
    'database': 'InfluxDB 1.x 数据库',
    'database-system': '系统数据库',
    'database3x': 'InfluxDB 3.x 数据库',
    'storage-group': 'IoTDB 存储组',
    
    // InfluxDB 1.x 节点
    'retention-policy': '数据保留策略',
    'series': '时间序列',
    'continuous-query': '连续查询',
    'shard': '数据分片',
    'shard-group': '分片组',
    'user1x': 'InfluxDB 1.x 用户',
    'privilege': '用户权限',
    
    // InfluxDB 2.x 节点
    'organization': 'InfluxDB 2.x 组织',
    'bucket': 'InfluxDB 2.x 存储桶',
    'system-bucket': '系统存储桶',
    'task': '自动化任务',
    'dashboard': '数据仪表板',
    'cell': '仪表板单元格',
    'variable': '仪表板变量',
    'check': '监控检查',
    'notification-rule': '通知规则',
    'notification-endpoint': '通知端点',
    'scraper': '数据抓取器',
    'telegraf': 'Telegraf 配置',
    'authorization': '授权令牌',
    'user2x': 'InfluxDB 2.x 用户',
    'label': '组织标签',
    
    // InfluxDB 3.x 节点
    'schema': '数据库模式',
    'table': '数据表',
    'column': '表列',
    'index': '数据库索引',
    'partition': '数据分区',
    'view': '数据视图',
    'materialized-view': '物化视图',
    'function3x': 'InfluxDB 3.x 函数',
    'procedure': '存储过程',
    'trigger3x': 'InfluxDB 3.x 触发器',
    'namespace': '命名空间',
    
    // IoTDB 节点
    'device': 'IoT 设备',
    'timeseries': 'IoTDB 时间序列',
    'aligned-timeseries': '对齐时间序列',
    'template': '设备模板',
    'function': 'IoTDB UDF 函数',
    'trigger': 'IoTDB 触发器',
    'system-info': '系统信息',
    'version-info': '版本信息',
    'storage-engine-info': '存储引擎信息',
    'cluster-info': '集群信息',
    'schema-template': '模式模板',
    'data-type': '数据类型',
    'encoding': '编码方式',
    'compression': '压缩方式',
    'attribute-group': '属性分组',
    
    // 通用测量节点
    'measurement': '测量/表',
    'field-group': '字段分组',
    'tag-group': '标签分组',
    'field': '数据字段',
    'tag': '索引标签',
    
    // 默认
    'default': '默认节点'
  };
  
  return descriptions[iconName] || '数据节点';
};

// 构建图标映射表
export const DatabaseIconMap = buildIconMap();
export const DatabaseBrandIconMap = buildBrandIconMap();

/**
 * 获取当前主题
 */
export const getCurrentTheme = (): 'light' | 'dark' => {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

/**
 * 获取主题感知的图标URL
 */
export const getThemeAwareIcon = (nodeType: TreeNodeType, isConnected?: boolean): string => {
  const theme = getCurrentTheme();
  let iconKey = nodeType;

  // 特殊处理连接状态
  if (nodeType === 'connection') {
    iconKey = isConnected ? 'connection-active' : 'connection-inactive';
  }

  const iconConfig = DatabaseIconMap[iconKey];
  if (iconConfig && iconConfig[theme]) {
    return iconConfig[theme];
  }

  // 回退到默认图标
  const defaultIcon = DatabaseIconMap['default'];
  return defaultIcon?.[theme] || '';
};

/**
 * 获取图标描述
 */
export const getIconDescription = (nodeType: TreeNodeType): string => {
  const iconConfig = DatabaseIconMap[nodeType];
  return iconConfig?.description || '数据节点';
};

/**
 * 获取数据库品牌图标URL
 * @param dbType 数据库类型
 * @param isConnected 是否已连接（未连接时使用 -dark 后缀的图标）
 * @param dbVersion 数据库版本
 */
export const getDatabaseBrandIcon = (dbType: string, isConnected: boolean = true, dbVersion?: string): string => {
  // 标准化数据库类型名称
  const normalizedDbType = dbType.toLowerCase();

  // 未连接时使用 -dark 后缀
  const suffix = isConnected ? '' : '-dark';

  // 处理InfluxDB的不同版本
  if (normalizedDbType === 'influxdb' && dbVersion) {
    const versionKey = `influxdb-${dbVersion}${suffix}`;
    const fallbackKey = `influxdb-${dbVersion}`;
    return DatabaseBrandIconMap[versionKey] || DatabaseBrandIconMap[fallbackKey] || DatabaseBrandIconMap['influxdb-1x'];
  }

  // 处理特殊的数据库类型映射
  const typeMapping: Record<string, string> = {
    'influxdb': 'influxdb-1x',
    'influxdb1': 'influxdb-1x',
    'influxdb1x': 'influxdb-1x',
    'influxdb2': 'influxdb-2x',
    'influxdb2x': 'influxdb-2x',
    'influxdb3': 'influxdb-3x',
    'influxdb3x': 'influxdb-3x',
    'iotdb': 'iotdb'
  };

  const baseType = typeMapping[normalizedDbType] || 'database-generic';
  const iconKey = `${baseType}${suffix}`;

  return DatabaseBrandIconMap[iconKey] || DatabaseBrandIconMap[baseType] || DatabaseBrandIconMap['database-generic'] || '';
};

/**
 * 获取功能图标URL（支持打开/关闭状态）
 * @param nodeType 节点类型
 * @param theme 主题
 * @param isOpen 是否为打开状态
 */
export const getFunctionalIcon = (nodeType: TreeNodeType | string, theme: 'light' | 'dark', isOpen: boolean = false): string => {
  // 节点类型到图标名称的映射（处理下划线到连字符的转换）
  const nodeTypeToIconName: Record<string, string> = {
    'database': 'database',
    'system_database': 'database-system',
    'database3x': 'database3x',
    'table': 'table',
    'measurement': 'measurement',
    'column': 'column',
    'field': 'field',
    'field_group': 'field-group',
    'tag': 'tag',
    'tag_group': 'tag-group',
    'index': 'index',
    'view': 'view',
    'materialized_view': 'materialized-view',
    'user1x': 'user1x',
    'user2x': 'user2x',
    'authorization': 'authorization',
    'privilege': 'privilege',
    'bucket': 'bucket',
    'system_bucket': 'system-bucket',
    'organization': 'organization',
    'task': 'task',
    'dashboard': 'dashboard',
    'cell': 'cell',
    'variable': 'variable',
    'check': 'check',
    'notification_rule': 'notification-rule',
    'notification_endpoint': 'notification-endpoint',
    'scraper': 'scraper',
    'telegraf': 'telegraf',
    'label': 'label',
    'storage_group': 'storage-group',
    'device': 'device',
    'timeseries': 'timeseries',
    'aligned_timeseries': 'aligned-timeseries',
    'attribute_group': 'attribute-group',
    'data_type': 'data-type',
    'encoding': 'encoding',
    'compression': 'compression',
    'schema_template': 'schema-template',
    'template': 'template',
    'system_info': 'system-info',
    'cluster_info': 'cluster-info',
    'storage_engine_info': 'storage-engine-info',
    'version_info': 'version-info',
    'function': 'function',
    'function_group': 'function-group',
    'function3x': 'function3x',
    'procedure': 'procedure',
    'trigger': 'trigger',
    'trigger_group': 'trigger-group',
    'trigger3x': 'trigger3x',
    'user_group': 'user-group',
    'namespace': 'namespace',
    'schema': 'schema',
    'partition': 'partition',
    'shard': 'shard',
    'shard_group': 'shard-group',
    'retention_policy': 'retention-policy',
    'continuous_query': 'continuous-query',
    'series': 'series',
  };

  // 支持打开状态的节点类型
  const openableNodeTypes = new Set([
    'database', 'database-system', 'database3x',
    'bucket', 'system-bucket', 'measurement', 'table',
    'storage-group', 'device', 'organization', 'schema',
    'namespace', 'view', 'materialized-view', 'dashboard',
    'attribute-group', 'schema-template', 'template',
    'system-info', 'function', 'trigger'
  ]);

  const iconName = nodeTypeToIconName[nodeType] || nodeType.toString().replace(/_/g, '-');

  // 如果是可打开的节点且处于打开状态，使用 _cur 后缀
  const finalIconName = (isOpen && openableNodeTypes.has(iconName))
    ? `${iconName}_cur`
    : iconName;

  const iconConfig = DatabaseIconMap[finalIconName] || DatabaseIconMap[iconName];

  if (iconConfig && iconConfig[theme]) {
    return iconConfig[theme];
  }

  // 回退到默认图标
  const defaultIcon = DatabaseIconMap['default'];
  return defaultIcon?.[theme] || '';
};
