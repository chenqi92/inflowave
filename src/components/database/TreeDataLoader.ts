/**
 * TreeDataLoader - Headless Tree 数据加载器
 * 
 * 为 Headless Tree 提供数据访问接口
 * 负责管理树节点数据的存储和检索
 */

import { TreeNodeData } from './TreeNodeRenderer';
import { logger } from '@/utils/logger';

export class TreeDataLoader {
  private dataMap: Map<string, TreeNodeData>;
  private childrenMap: Map<string, string[]>;
  private rootChildrenIds: string[] = []; // 存储顶层节点 ID
  private filterFn?: (node: TreeNodeData) => boolean; // 过滤函数

  constructor(treeData: TreeNodeData[], filterFn?: (node: TreeNodeData) => boolean) {
    this.dataMap = new Map();
    this.childrenMap = new Map();
    this.filterFn = filterFn;
    this.buildDataMaps(treeData);
  }

  /**
   * 递归构建数据映射表
   * @param nodes 树节点数组
   * @param parentId 父节点 ID（可选）
   */
  private buildDataMaps(nodes: TreeNodeData[], parentId?: string) {
    // 如果是顶层节点（没有 parentId），记录它们的 ID
    if (!parentId) {
      this.rootChildrenIds = nodes.map(node => node.id);
      logger.debug(`[TreeDataLoader] 记录 ${this.rootChildrenIds.length} 个顶层节点:`, this.rootChildrenIds);
    }

    nodes.forEach(node => {
      // 存储节点数据
      this.dataMap.set(node.id, node);

      // 构建子节点 ID 列表
      if (node.children && node.children.length > 0) {
        const childrenIds = node.children.map(child => child.id);
        this.childrenMap.set(node.id, childrenIds);

        // 递归处理子节点
        this.buildDataMaps(node.children, node.id);
      } else if (node.children === undefined) {
        // children === undefined 表示未加载，设置为空数组
        // 这样 Headless Tree 会知道这是一个可展开的节点
        this.childrenMap.set(node.id, []);
      } else {
        // children === [] 表示已加载但为空
        this.childrenMap.set(node.id, []);
      }
    });
  }

  /**
   * 获取节点数据
   * @param itemId 节点 ID
   * @returns 节点数据或 undefined
   */
  getItem = (itemId: string): TreeNodeData | undefined => {
    const item = this.dataMap.get(itemId);
    if (!item && itemId !== 'root') {
      logger.debug(`[TreeDataLoader] 未找到节点: ${itemId}`);
    }
    return item;
  };

  /**
   * 获取子节点 ID 列表
   * @param itemId 节点 ID
   * @returns 子节点 ID 数组
   */
  getChildren = (itemId: string): string[] => {
    // 根节点返回顶层节点
    if (itemId === 'root') {
      logger.debug(`[TreeDataLoader] getChildren('root') 返回 ${this.rootChildrenIds.length} 个顶层节点:`, this.rootChildrenIds);
      return this.rootChildrenIds;
    }

    const children = this.childrenMap.get(itemId);
    if (!children) {
      logger.debug(`[TreeDataLoader] 节点 ${itemId} 没有子节点`);
      return [];
    }

    // 如果有过滤函数，应用过滤
    if (this.filterFn) {
      const filteredChildren = children.filter(childId => {
        const childNode = this.dataMap.get(childId);
        if (!childNode) return true; // 如果节点不存在，保留（避免错误）
        return this.filterFn!(childNode);
      });
      return filteredChildren;
    }

    return children;
  };

  /**
   * 更新树数据
   * @param treeData 新的树数据
   * @param filterFn 可选的过滤函数
   */
  updateData(treeData: TreeNodeData[], filterFn?: (node: TreeNodeData) => boolean) {
    logger.debug(`[TreeDataLoader] 更新树数据，节点数: ${treeData.length}`);
    if (filterFn !== undefined) {
      this.filterFn = filterFn;
    }
    this.dataMap.clear();
    this.childrenMap.clear();
    this.buildDataMaps(treeData);
    logger.debug(`[TreeDataLoader] 更新完成，dataMap 大小: ${this.dataMap.size}, childrenMap 大小: ${this.childrenMap.size}`);
  }

  /**
   * 更新单个节点的数据
   * @param nodeId 节点 ID
   * @param updates 要更新的字段
   */
  updateNode(nodeId: string, updates: Partial<TreeNodeData>) {
    const node = this.dataMap.get(nodeId);
    if (!node) {
      logger.warn(`[TreeDataLoader] 尝试更新不存在的节点: ${nodeId}`);
      return;
    }

    const updatedNode = { ...node, ...updates };
    this.dataMap.set(nodeId, updatedNode);

    // 如果更新了 children，也要更新 childrenMap
    if (updates.children !== undefined) {
      if (updates.children && updates.children.length > 0) {
        const childrenIds = updates.children.map(child => child.id);
        this.childrenMap.set(nodeId, childrenIds);
        
        // 递归添加新的子节点到 dataMap
        this.buildDataMaps(updates.children, nodeId);
      } else {
        this.childrenMap.set(nodeId, []);
      }
    }
  }

  /**
   * 获取所有节点数据（用于调试）
   */
  getAllNodes(): TreeNodeData[] {
    return Array.from(this.dataMap.values());
  }

  /**
   * 获取节点数量（用于调试）
   */
  getNodeCount(): number {
    return this.dataMap.size;
  }

  /**
   * 检查节点是否存在
   */
  hasNode(nodeId: string): boolean {
    return this.dataMap.has(nodeId);
  }

  /**
   * 清除所有数据
   */
  clear() {
    this.dataMap.clear();
    this.childrenMap.clear();
  }
}

