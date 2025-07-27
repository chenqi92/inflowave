/**
 * 数据源树节点类型定义
 */

export type TreeNodeType =
  // 通用节点类型
  | 'connection'

  // InfluxDB 1.x 节点类型
  | 'database'           // 数据库
  | 'retention_policy'   // 保留策略

  // InfluxDB 2.x 节点类型
  | 'organization'       // 组织
  | 'bucket'            // 存储桶

  // InfluxDB 3.x 节点类型（简化架构）
  | 'database3x'        // InfluxDB 3.x 数据库

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
  name: string;
  nodeType: TreeNodeType;
  parentId?: string;
  children: TreeNode[];
  isLeaf: boolean;
  isSystem: boolean;           // 是否为系统节点
  isExpandable: boolean;       // 是否可展开
  isExpanded: boolean;         // 是否已展开
  isLoading: boolean;          // 是否正在加载
  metadata: Record<string, any>; // 额外元数据
}

export type DatabaseType = 'InfluxDB' | 'IoTDB' | 'InfluxDB2';

/**
 * 树节点图标映射
 */
export const TreeNodeIcons: Record<TreeNodeType, string> = {
  connection: '🔌',
  database: '💾',
  database3x: '🗄️',
  system_database: '🔧',
  retention_policy: '📅',
  organization: '🏢',
  bucket: '🪣',
  system_bucket: '⚙️',
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

/**
 * 树节点描述映射
 */
export const TreeNodeDescriptions: Record<TreeNodeType, string> = {
  connection: '数据库连接',
  database: 'InfluxDB 1.x 数据库',
  database3x: 'InfluxDB 3.x 数据库，支持现代功能和 SQL 查询',
  system_database: '系统数据库，包含内部监控和元数据',
  retention_policy: '数据保留策略，定义数据存储时长',
  organization: 'InfluxDB 2.x 组织，用于多租户管理',
  bucket: 'InfluxDB 2.x 存储桶，类似于数据库',
  system_bucket: '系统存储桶，包含监控和内部数据',
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
  database: 'text-green-600',
  database3x: 'text-green-700 font-medium',
  system_database: 'text-orange-600 italic',
  retention_policy: 'text-purple-600',
  organization: 'text-indigo-600 font-medium',
  bucket: 'text-cyan-600',
  system_bucket: 'text-gray-600 italic',
  storage_group: 'text-emerald-600',
  device: 'text-blue-500',
  timeseries: 'text-teal-600',
  measurement: 'text-green-500',
  field_group: 'text-orange-500 font-medium',
  tag_group: 'text-pink-500 font-medium',
  field: 'text-orange-400',
  tag: 'text-pink-400',
  function: '',
  aligned_timeseries: '',
  template: '',
  trigger: '',
  system_info: '',
  version_info: '',
  storage_engine_info: '',
  cluster_info: '',
  schema_template: '',
  data_type: '',
  encoding: '',
  compression: '',
  attribute_group: '',
};

/**
 * 判断节点是否为系统节点
 */
export function isSystemNode(node: TreeNode): boolean {
  return node.isSystem || 
         node.nodeType === 'system_database' || 
         node.nodeType === 'system_bucket' ||
         node.name.startsWith('_');
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
export function getExpectedTreeLevels(dbType: DatabaseType): TreeNodeType[] {
  switch (dbType) {
    case 'InfluxDB':
      return ['database', 'retention_policy', 'measurement', 'field_group', 'field'];
    case 'InfluxDB2':
      return ['organization', 'bucket', 'measurement', 'field_group', 'field'];
    case 'IoTDB':
      return ['system_info', 'schema_template', 'storage_group', 'device', 'timeseries', 'data_type'];
    default:
      return ['database', 'measurement'];
  }
}

/**
 * 检查节点是否可以有子节点
 */
export function canHaveChildren(nodeType: TreeNodeType): boolean {
  const leafNodeTypes: TreeNodeType[] = [
    'field', 'tag', 'version_info', 'data_type', 'encoding', 'compression'
  ];
  return !leafNodeTypes.includes(nodeType);
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
 * 获取节点类型的图标
 */
export function getNodeIcon(nodeType: string): string {
  const normalized = normalizeNodeType(nodeType);
  return TreeNodeIcons[normalized] || '📄';
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
      name,
      nodeType,
      children: [],
      isLeaf: !canHaveChildren(nodeType),
      isSystem: isSystemNode({ nodeType } as TreeNode),
      isExpandable: canHaveChildren(nodeType),
      isExpanded: getDefaultExpandedState(nodeType),
      isLoading: false,
      metadata: {},
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
