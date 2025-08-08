/**
 * 数据源树节点类型定义
 */

export type TreeNodeType =
  // 通用节点类型
  | 'connection'
  | 'connection-active'
  | 'connection-inactive'

  // InfluxDB 1.x 节点类型
  | 'database'           // 数据库
  | 'system_database'    // 系统数据库
  | 'retention_policy'   // 保留策略
  | 'series'             // 序列
  | 'continuous_query'   // 连续查询
  | 'shard'              // 分片
  | 'shard_group'        // 分片组
  | 'user1x'             // InfluxDB 1.x 用户
  | 'privilege'          // 权限

  // InfluxDB 2.x 节点类型
  | 'organization'       // 组织
  | 'bucket'             // 存储桶
  | 'system_bucket'      // 系统存储桶
  | 'task'               // 任务
  | 'dashboard'          // 仪表板
  | 'cell'               // 仪表板单元格
  | 'variable'           // 变量
  | 'check'              // 监控检查
  | 'notification_rule'  // 通知规则
  | 'notification_endpoint' // 通知端点
  | 'scraper'            // 数据抓取器
  | 'telegraf'           // Telegraf 配置
  | 'authorization'      // 授权令牌
  | 'user2x'             // InfluxDB 2.x 用户
  | 'label'              // 组织标签

  // InfluxDB 3.x 节点类型（简化架构）
  | 'database3x'         // InfluxDB 3.x 数据库
  | 'schema'             // 模式
  | 'table'              // 表
  | 'column'             // 列
  | 'index'              // 索引
  | 'partition'          // 分区
  | 'view'               // 视图
  | 'materialized_view'  // 物化视图
  | 'function3x'         // InfluxDB 3.x 函数
  | 'procedure'          // 存储过程
  | 'trigger3x'          // InfluxDB 3.x 触发器
  | 'namespace'          // 命名空间

  // IoTDB 节点类型
  | 'storage_group'     // 存储组/数据库
  | 'device'            // 设备
  | 'timeseries'        // 时间序列
  | 'aligned_timeseries' // IoTDB 对齐时间序列
  | 'template'          // IoTDB 设备模板
  | 'function'          // IoTDB 用户定义函数
  | 'trigger'           // IoTDB 触发器
  | 'system_info'       // IoTDB 系统信息
  | 'version_info'      // IoTDB 版本信息
  | 'storage_engine_info' // IoTDB 存储引擎信息
  | 'cluster_info'      // IoTDB 集群信息
  | 'schema_template'   // IoTDB 模式模板
  | 'data_type'         // IoTDB 数据类型
  | 'encoding'          // IoTDB 编码方式
  | 'compression'       // IoTDB 压缩方式
  | 'attribute_group'   // IoTDB 属性分组

  // 通用测量相关
  | 'measurement'       // 测量/表
  | 'field_group'       // 字段分组
  | 'tag_group'         // 标签分组
  | 'field'             // 字段
  | 'tag'               // 标签

  // 系统节点
  | 'system_database'   // 系统数据库（如 _internal）
  | 'system_bucket';    // 系统存储桶（如 _monitoring）

export interface TreeNode {
  id: string;
  key?: string;                // 可选的键值，用于某些UI组件
  name: string;
  title?: string;              // 可选的标题，用于向后兼容
  nodeType: TreeNodeType;
  parentId?: string;
  children: TreeNode[];
  isLeaf: boolean;
  isSystem: boolean;           // 是否为系统节点
  isExpandable: boolean;       // 是否可展开
  isExpanded: boolean;         // 是否已展开
  isLoading: boolean;          // 是否正在加载
  metadata: Record<string, any>; // 额外元数据
  // UI 兼容属性
  icon?: React.ReactNode;      // 图标
  disabled?: boolean;          // 是否禁用
  selectable?: boolean;        // 是否可选择
}

export type DatabaseType = 'InfluxDB' | 'IoTDB' | 'InfluxDB2';




/**
 * 树节点描述映射
 */
export const TreeNodeDescriptions: Record<TreeNodeType, string> = {
  connection: '数据库连接',
  'connection-active': '数据库连接已建立',
  'connection-inactive': '数据库连接未建立',
  // InfluxDB 1.x 描述
  database: 'InfluxDB 1.x 数据库，支持时间序列数据存储',
  system_database: '系统数据库，包含内部监控和元数据',
  retention_policy: '数据保留策略，定义数据存储时长和分片策略',
  series: '时间序列，特定标签组合的数据点集合',
  continuous_query: '连续查询，自动化数据聚合和处理',
  shard: '数据分片，存储特定时间范围的数据',
  shard_group: '分片组，管理相关分片的集合',
  user1x: 'InfluxDB 1.x 用户账户',
  privilege: '用户权限，控制数据库访问级别',
  // InfluxDB 2.x 描述
  organization: 'InfluxDB 2.x 组织，用于多租户管理',
  bucket: 'InfluxDB 2.x 存储桶，类似于数据库',
  system_bucket: '系统存储桶，包含监控和内部数据',
  task: '任务，使用 Flux 语言的自动化数据处理',
  dashboard: '仪表板，数据可视化和监控界面',
  cell: '仪表板单元格，单个图表或可视化组件',
  variable: '变量，仪表板和查询中的动态参数',
  check: '监控检查，数据质量和阈值监控',
  notification_rule: '通知规则，定义告警触发条件',
  notification_endpoint: '通知端点，告警消息的发送目标',
  scraper: '数据抓取器，从外部源收集指标数据',
  telegraf: 'Telegraf 配置，数据收集代理设置',
  authorization: '授权令牌，API 访问凭证',
  user2x: 'InfluxDB 2.x 用户账户',
  label: '组织标签，用于资源分类和管理',
  // InfluxDB 3.x 描述
  database3x: 'InfluxDB 3.x 数据库，支持现代功能和 SQL 查询',
  schema: '数据库模式，定义表结构和约束',
  table: '数据表，存储结构化时间序列数据',
  column: '表列，定义数据字段和类型',
  index: '索引，优化查询性能的数据结构',
  partition: '分区，按时间或其他维度分割数据',
  view: '视图，基于查询的虚拟表',
  materialized_view: '物化视图，预计算的查询结果',
  function3x: '用户定义函数，扩展 SQL 查询功能',
  procedure: '存储过程，预定义的数据库操作序列',
  trigger3x: '触发器，自动响应数据变化的操作',
  namespace: '命名空间，逻辑分组和权限管理',
  storage_group: 'IoTDB 存储组，用于组织时间序列数据',
  device: 'IoTDB 设备，包含多个传感器时间序列',
  timeseries: 'IoTDB 时间序列，存储传感器数据',
  aligned_timeseries: 'IoTDB 对齐时间序列，优化存储和查询性能',
  template: 'IoTDB 设备模板，定义设备结构',
  function: 'IoTDB 用户定义函数，扩展查询功能',
  trigger: 'IoTDB 触发器，自动处理数据变化',
  system_info: 'IoTDB 系统信息，包含版本和配置',
  version_info: 'IoTDB 版本信息',
  storage_engine_info: 'IoTDB 存储引擎配置信息',
  cluster_info: 'IoTDB 集群节点信息',
  schema_template: 'IoTDB 模式模板，定义数据结构',
  data_type: '时间序列数据类型 (BOOLEAN, INT32, FLOAT, DOUBLE, TEXT)',
  encoding: '数据编码方式 (PLAIN, RLE, TS_2DIFF, GORILLA)',
  compression: '数据压缩算法 (SNAPPY, GZIP, LZO)',
  attribute_group: 'IoTDB 属性分组，包含元数据信息',
  measurement: 'InfluxDB 测量，类似于表',
  field_group: '字段分组，包含数值类型的数据',
  tag_group: '标签分组，包含索引的元数据',
  field: '字段，存储数值数据',
  tag: '标签，用于索引和过滤',
};

/**
 * 树节点样式类映射
 */
export const TreeNodeStyles: Record<TreeNodeType, string> = {
  connection: 'text-blue-600 font-semibold',
  'connection-active': 'text-green-600 font-semibold',
  'connection-inactive': 'text-gray-600 font-semibold',
  // InfluxDB 1.x 样式
  database: 'text-green-600',
  system_database: 'text-orange-600 italic',
  retention_policy: 'text-purple-600',
  series: 'text-blue-500',
  continuous_query: 'text-indigo-600',
  shard: 'text-gray-600',
  shard_group: 'text-gray-700',
  user1x: 'text-blue-700',
  privilege: 'text-red-600',
  // InfluxDB 2.x 样式
  organization: 'text-indigo-600 font-medium',
  bucket: 'text-cyan-600',
  system_bucket: 'text-gray-600 italic',
  task: 'text-purple-600',
  dashboard: 'text-green-600',
  cell: 'text-green-500',
  variable: 'text-yellow-600',
  check: 'text-green-700',
  notification_rule: 'text-orange-600',
  notification_endpoint: 'text-orange-500',
  scraper: 'text-indigo-600',
  telegraf: 'text-blue-600',
  authorization: 'text-red-600',
  user2x: 'text-blue-700',
  label: 'text-pink-600',
  // InfluxDB 3.x 样式
  database3x: 'text-green-700 font-medium',
  schema: 'text-purple-600',
  table: 'text-green-600',
  column: 'text-blue-600',
  index: 'text-yellow-600',
  partition: 'text-gray-600',
  view: 'text-cyan-600',
  materialized_view: 'text-cyan-700',
  function3x: 'text-indigo-600',
  procedure: 'text-indigo-700',
  trigger3x: 'text-orange-600',
  namespace: 'text-purple-700',
  storage_group: 'text-emerald-600 font-medium',
  device: 'text-blue-500',
  timeseries: 'text-teal-600',
  aligned_timeseries: 'text-teal-700 font-medium',
  template: 'text-purple-600',
  function: 'text-indigo-600',
  trigger: 'text-orange-600',
  system_info: 'text-gray-600 font-medium',
  version_info: 'text-gray-500',
  storage_engine_info: 'text-gray-600',
  cluster_info: 'text-blue-600 font-medium',
  schema_template: 'text-purple-700',
  data_type: 'text-yellow-600',
  encoding: 'text-cyan-600',
  compression: 'text-green-600',
  attribute_group: 'text-pink-600',
  measurement: 'text-green-500',
  field_group: 'text-orange-500 font-medium',
  tag_group: 'text-pink-500 font-medium',
  field: 'text-orange-400',
  tag: 'text-pink-400',
};

/**
 * 判断节点是否为系统节点
 * 支持 InfluxDB 和 IoTDB 的系统节点识别
 */
export function isSystemNode(node: TreeNode): boolean {
  return node.isSystem ||
         // InfluxDB 系统节点
         node.nodeType === 'system_database' ||
         node.nodeType === 'system_bucket' ||
         node.name.startsWith('_') ||
         // IoTDB 系统节点
         node.nodeType === 'system_info' ||
         node.nodeType === 'version_info' ||
         node.nodeType === 'schema_template' ||
         node.name.includes('_internal') ||
         node.name.includes('_monitoring') ||
         node.name.includes('_tasks') ||
         node.name === 'System Information' ||
         node.name === 'Version Information' ||
         node.name === 'Schema Templates';
}

/**
 * 获取节点的完整路径
 */
export function getNodePath(node: TreeNode, allNodes: TreeNode[]): string[] {
  const path: string[] = [];
  let current: TreeNode | undefined = node;
  
  while (current) {
    path.unshift(current.name);
    if (current.parentId) {
      current = allNodes.find(n => n.id === current!.parentId);
    } else {
      break;
    }
  }
  
  return path;
}

/**
 * 根据数据库类型获取预期的树结构层级
 */
export function getExpectedTreeLevels(dbType: string): TreeNodeType[] {
  switch (dbType) {
    case 'InfluxDB':
    case 'influxdb':
      return ['database', 'system_database', 'retention_policy', 'measurement', 'series', 'field_group', 'field', 'continuous_query', 'user1x', 'privilege'];
    case 'InfluxDB2':
    case 'influxdb2':
      return ['organization', 'bucket', 'system_bucket', 'measurement', 'field_group', 'field', 'task', 'dashboard', 'variable', 'user2x', 'authorization'];
    case 'InfluxDB3':
    case 'influxdb3':
      return ['database3x', 'schema', 'table', 'column', 'index', 'view', 'materialized_view', 'function3x', 'namespace'];
    case 'IoTDB':
    case 'iotdb':
      return ['system_info', 'schema_template', 'storage_group', 'device', 'timeseries', 'data_type', 'encoding', 'compression'];
    default:
      return ['database', 'measurement'];
  }
}

/**
 * IoTDB 节点行为配置
 */
export interface NodeBehaviorConfig {
  canExpand: boolean;           // 是否可以展开
  canQuery: boolean;            // 是否可以查询数据
  canDoubleClick: boolean;      // 是否支持双击打开查询
  contextMenuType: 'data' | 'management' | 'info' | 'container'; // 右键菜单类型
  description: string;          // 节点描述
}

/**
 * 获取 IoTDB 节点行为配置
 */
export function getIoTDBNodeBehavior(nodeType: TreeNodeType, isContainer: boolean = false): NodeBehaviorConfig {
  // 容器节点（管理分组）
  if (isContainer) {
    switch (nodeType) {
      case 'function':
        return {
          canExpand: true,
          canQuery: false,
          canDoubleClick: false,
          contextMenuType: 'container',
          description: '函数管理容器，包含用户定义函数列表'
        };
      case 'trigger':
        return {
          canExpand: true,
          canQuery: false,
          canDoubleClick: false,
          contextMenuType: 'container',
          description: '触发器管理容器，包含数据库触发器列表'
        };
      case 'schema_template':
        return {
          canExpand: true,
          canQuery: false,
          canDoubleClick: false,
          contextMenuType: 'container',
          description: '模式模板管理容器，包含设备模板列表'
        };
      case 'system_info':
        return {
          canExpand: true,
          canQuery: false,
          canDoubleClick: false,
          contextMenuType: 'container',
          description: '系统信息容器，包含系统状态信息'
        };
      case 'version_info':
        return {
          canExpand: true,
          canQuery: false,
          canDoubleClick: false,
          contextMenuType: 'container',
          description: '版本信息容器，包含软件版本详情'
        };
      default:
        return {
          canExpand: true,
          canQuery: false,
          canDoubleClick: false,
          contextMenuType: 'container',
          description: '管理容器节点'
        };
    }
  }

  // 具体节点
  switch (nodeType) {
    // 数据层级节点（可查询数据）
    case 'storage_group':
      return {
        canExpand: true,
        canQuery: true,
        canDoubleClick: true,
        contextMenuType: 'data',
        description: '存储组，包含设备和时间序列数据'
      };
    case 'device':
      return {
        canExpand: true,
        canQuery: true,
        canDoubleClick: true,
        contextMenuType: 'data',
        description: '设备，包含多个时间序列'
      };
    case 'timeseries':
    case 'aligned_timeseries':
      return {
        canExpand: false,
        canQuery: true,
        canDoubleClick: true,
        contextMenuType: 'data',
        description: '时间序列，存储具体的传感器数据'
      };

    // 管理功能节点（不可查询数据）
    case 'function':
      return {
        canExpand: false,
        canQuery: false,
        canDoubleClick: false,
        contextMenuType: 'management',
        description: '用户定义函数，用于数据处理和计算'
      };
    case 'trigger':
      return {
        canExpand: false,
        canQuery: false,
        canDoubleClick: false,
        contextMenuType: 'management',
        description: '数据库触发器，用于自动化数据处理'
      };
    case 'schema_template':
    case 'template':
      return {
        canExpand: false,
        canQuery: false,
        canDoubleClick: false,
        contextMenuType: 'management',
        description: '设备模板，定义设备的时间序列结构'
      };

    // 系统信息节点（只读信息）
    case 'system_info':
    case 'version_info':
    case 'storage_engine_info':
    case 'cluster_info':
    case 'data_type':
    case 'encoding':
    case 'compression':
      return {
        canExpand: false,
        canQuery: false,
        canDoubleClick: false,
        contextMenuType: 'info',
        description: '系统信息，只读配置或状态数据'
      };

    // 默认行为
    default:
      return {
        canExpand: false,
        canQuery: false,
        canDoubleClick: false,
        contextMenuType: 'info',
        description: '未知节点类型'
      };
  }
}

/**
 * 检查节点是否可以有子节点（基于行为配置）
 */
export function canHaveChildren(nodeType: TreeNodeType, isContainer: boolean = false): boolean {
  return getIoTDBNodeBehavior(nodeType, isContainer).canExpand;
}

/**
 * 将 PascalCase 节点类型转换为 snake_case
 * 用于后端返回的 PascalCase 类型与前端 snake_case 类型的转换
 */
export function normalizeNodeType(nodeType: string): TreeNodeType {
  const normalized = nodeType.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') as TreeNodeType;
  return normalized;
}

/**
 * 获取节点类型的图标 - 现在由DatabaseIcon组件处理
 * @deprecated 此函数已废弃，图标现在由DatabaseIcon组件和SVG系统处理
 */
export function getNodeIcon(nodeType: string): string {
  // 图标现在由DatabaseIcon组件和SVG系统处理
  return '';
}

/**
 * 获取节点类型的样式
 */
export function getNodeStyle(nodeType: string, isSystem: boolean = false): string {
  if (isSystem) {
    return 'text-orange-600 italic';
  }
  const normalized = normalizeNodeType(nodeType);
  return TreeNodeStyles[normalized] || 'text-gray-600';
}

/**
 * 获取节点类型的描述
 */
export function getNodeDescription(nodeType: string): string {
  const normalized = normalizeNodeType(nodeType);
  return TreeNodeDescriptions[normalized] || '数据节点';
}

/**
 * 获取节点的默认展开状态
 */
export function getDefaultExpandedState(nodeType: TreeNodeType): boolean {
  // 系统节点默认折叠，其他节点默认展开
  const systemNodeTypes: TreeNodeType[] = ['system_database', 'system_bucket'];
  return !systemNodeTypes.includes(nodeType);
}

/**
 * 树节点工厂函数
 */
export class TreeNodeFactory {
  static createNode(
    id: string,
    name: string,
    nodeType: TreeNodeType,
    options: Partial<TreeNode> = {}
  ): TreeNode {
    return {
      id,
      key: id,
      name,
      title: name,
      nodeType,
      children: [],
      isLeaf: !canHaveChildren(nodeType),
      isSystem: isSystemNode({ nodeType } as TreeNode),
      isExpandable: canHaveChildren(nodeType),
      isExpanded: getDefaultExpandedState(nodeType),
      isLoading: false,
      metadata: {},
      disabled: false,
      selectable: true,
      ...options,
    };
  }

  static createInfluxDBDatabase(name: string, isSystem = false): TreeNode {
    return this.createNode(
      `db_${name}`,
      name,
      isSystem ? 'system_database' : 'database',
      { isSystem }
    );
  }

  static createRetentionPolicy(database: string, name: string): TreeNode {
    return this.createNode(
      `rp_${database}_${name}`,
      name,
      'retention_policy',
      { parentId: `db_${database}` }
    );
  }

  static createMeasurement(parentId: string, name: string): TreeNode {
    return this.createNode(
      `measurement_${parentId}_${name}`,
      name,
      'measurement',
      { parentId }
    );
  }

  static createFieldGroup(parentId: string): TreeNode {
    return this.createNode(
      `fields_${parentId}`,
      '📈 Fields',
      'field_group',
      { parentId }
    );
  }

  static createTagGroup(parentId: string): TreeNode {
    return this.createNode(
      `tags_${parentId}`,
      '🏷️ Tags',
      'tag_group',
      { parentId }
    );
  }

  static createField(parentId: string, name: string, dataType?: string): TreeNode {
    const displayName = dataType ? `${name} (${dataType})` : name;
    return this.createNode(
      `field_${parentId}_${name}`,
      displayName,
      'field',
      { parentId, isLeaf: true }
    );
  }

  static createTag(parentId: string, name: string): TreeNode {
    return this.createNode(
      `tag_${parentId}_${name}`,
      name,
      'tag',
      { parentId, isLeaf: true }
    );
  }

  static createStorageGroup(name: string): TreeNode {
    return this.createNode(
      `sg_${name}`,
      name,
      'storage_group'
    );
  }

  static createDevice(storageGroup: string, name: string): TreeNode {
    return this.createNode(
      `device_${storageGroup}_${name}`,
      name,
      'device',
      { parentId: `sg_${storageGroup}` }
    );
  }

  static createTimeseries(devicePath: string, name: string): TreeNode {
    return this.createNode(
      `ts_${devicePath.replace(/\./g, '_')}_${name}`,
      name,
      'timeseries',
      { isLeaf: true }
    );
  }
}

/**
 * 树节点搜索和过滤工具
 */
export class TreeNodeUtils {
  /**
   * 在树中搜索节点
   */
  static searchNodes(nodes: TreeNode[], searchTerm: string): TreeNode[] {
    const results: TreeNode[] = [];
    
    function search(nodeList: TreeNode[]) {
      for (const node of nodeList) {
        if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push(node);
        }
        if (node.children.length > 0) {
          search(node.children);
        }
      }
    }
    
    search(nodes);
    return results;
  }

  /**
   * 过滤系统节点
   */
  static filterSystemNodes(nodes: TreeNode[], showSystem = false): TreeNode[] {
    if (showSystem) return nodes;

    return nodes.filter(node => !isSystemNode(node)).map(node => ({
      ...node,
      children: this.filterSystemNodes(node.children, showSystem)
    }));
  }

  /**
   * 按节点类型分组节点
   */
  static groupNodesByType(nodes: TreeNode[]): TreeNode[] {
  const systemNodes: TreeNode[] = [];
  const storageNodes: TreeNode[] = [];
  const managementNodes: TreeNode[] = [];

  for (const node of nodes) {
    if (isSystemNode(node)) {
      systemNodes.push(node);
    } else if (isStorageNode(node)) {
      storageNodes.push(node);
    } else if (isManagementNode(node)) {
      managementNodes.push(node);
    }
  }

  const groupedNodes: TreeNode[] = [];

  // 添加系统信息分组
  if (systemNodes.length > 0) {
    const systemGroup: TreeNode = {
      id: 'system_group',
      key: 'system_group',
      name: '📊 System Information',
      nodeType: 'system_info',
      isSystem: true,
      isLeaf: false,
      isExpandable: true,
      isExpanded: false,
      isLoading: false,
      children: systemNodes,
      metadata: {}
    };
    groupedNodes.push(systemGroup);
  }

  // 添加存储组
  if (storageNodes.length > 0) {
    const storageGroup: TreeNode = {
      id: 'storage_group',
      key: 'storage_group',
      name: '📁 Storage Groups',
      nodeType: 'storage_group',
      isSystem: false,
      isLeaf: false,
      isExpandable: true,
      isExpanded: false,
      isLoading: false,
      children: storageNodes,
      metadata: {}
    };
    groupedNodes.push(storageGroup);
  }

  // 添加管理功能分组
  if (managementNodes.length > 0) {
    const managementGroup: TreeNode = {
      id: 'management_group',
      key: 'management_group',
      name: '⚙️ Management',
      nodeType: 'function',
      isSystem: true,
      isLeaf: false,
      isExpandable: true,
      isExpanded: false,
      isLoading: false,
      children: managementNodes,
      metadata: {}
    };
    groupedNodes.push(managementGroup);
  }

    return groupedNodes;
  }

  /**
   * 展平树结构
   */
  static flattenTree(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    
    function flatten(nodeList: TreeNode[]) {
      for (const node of nodeList) {
        result.push(node);
        if (node.children.length > 0) {
          flatten(node.children);
        }
      }
    }
    
    flatten(nodes);
    return result;
  }

  /**
   * 根据ID查找节点
   */
  static findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children.length > 0) {
        const found = this.findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * 获取节点的所有祖先节点
   */
  static getAncestors(nodes: TreeNode[], nodeId: string): TreeNode[] {
    const ancestors: TreeNode[] = [];
    const allNodes = this.flattenTree(nodes);
    
    let current = allNodes.find(n => n.id === nodeId);
    while (current && current.parentId) {
      const parent = allNodes.find(n => n.id === current!.parentId);
      if (parent) {
        ancestors.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return ancestors;
  }
}

/**
 * 检查是否为存储节点
 * 支持 InfluxDB 和 IoTDB 的存储节点识别
 */
export function isStorageNode(node: TreeNode): boolean {
  return node.nodeType === 'storage_group' ||
         node.nodeType === 'database' ||
         (!!node.name && node.name.startsWith('root.'));
}

/**
 * 检查是否为管理节点
 * 支持 InfluxDB 和 IoTDB 的管理节点识别
 */
export function isManagementNode(node: TreeNode): boolean {
  return node.nodeType === 'function' ||
         node.nodeType === 'trigger' ||
         node.name === 'Functions' ||
         node.name === 'Triggers';
}
