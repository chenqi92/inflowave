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
  database: '数据库',
  database3x: 'InfluxDB 3.x 数据库',
  system_database: '系统数据库',
  retention_policy: '保留策略',
  organization: '组织',
  bucket: '存储桶',
  system_bucket: '系统存储桶',
  storage_group: '存储组',
  device: '设备',
  timeseries: '时间序列',
  measurement: '测量',
  field_group: '字段组',
  tag_group: '标签组',
  field: '字段',
  tag: '标签',
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
      return ['storage_group', 'device', 'timeseries'];
    default:
      return ['database', 'measurement'];
  }
}

/**
 * 检查节点是否可以有子节点
 */
export function canHaveChildren(nodeType: TreeNodeType): boolean {
  const leafNodeTypes: TreeNodeType[] = ['field', 'tag', 'timeseries'];
  return !leafNodeTypes.includes(nodeType);
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
