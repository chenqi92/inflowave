/**
 * MultiConnectionTreeView - 多连接数据源树组件
 * 
 * 基于 React Arborist 实现的多连接树视图，用于 DatabaseExplorer
 * 
 * 功能特性:
 * - ✅ 支持多个数据库连接
 * - ✅ 虚拟化渲染 (支持大数据量)
 * - ✅ 懒加载子节点
 * - ✅ 节点缓存优化
 * - ✅ 实时搜索/过滤
 * - ✅ 键盘导航
 * - ✅ 右键菜单
 * - ✅ 自定义图标
 * - ✅ 主题切换
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { safeTauriInvoke } from '@/utils/tauri';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { TreeNodeRenderer, TreeNodeData } from './TreeNodeRenderer';
import { UnifiedContextMenu } from './UnifiedContextMenu';
import { TreeNodeType } from '@/types/tree';
import useResizeObserver from 'use-resize-observer';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';

interface ConnectionInfo {
  id: string;
  name: string;
  dbType: string;
  host: string;
  port: number;
  isConnected?: boolean;
}

interface MultiConnectionTreeViewProps {
  connections: ConnectionInfo[];
  className?: string;
  useVersionAwareFilter?: boolean;
  searchValue?: string;
  onNodeSelect?: (node: TreeNodeData | null) => void;
  onNodeActivate?: (node: TreeNodeData) => void;
  onNodeContextMenu?: (node: TreeNodeData, event: React.MouseEvent) => void;
  onContextMenuAction?: (action: string, node: TreeNodeData) => void;
  onRefresh?: () => void;
  // 连接处理
  onConnectionToggle?: (connectionId: string) => Promise<void>;
  // 加载状态
  connectionStatuses?: Map<string, 'connecting' | 'connected' | 'disconnected'>;
  databaseLoadingStates?: Map<string, boolean>;
  // 错误状态
  connectionErrors?: Map<string, string>;
  databaseErrors?: Map<string, string>;
  // 收藏状态
  isFavorite?: (path: string) => boolean;
  // 数据库打开状态
  isDatabaseOpened?: (connectionId: string, database: string) => boolean;
  // 节点元素引用映射（用于错误提示定位）
  nodeRefsMap?: React.MutableRefObject<Map<string, HTMLElement>>;
}

export const MultiConnectionTreeView: React.FC<MultiConnectionTreeViewProps> = ({
  connections,
  className = '',
  useVersionAwareFilter = false,
  searchValue = '',
  onNodeSelect,
  onNodeActivate,
  onNodeContextMenu,
  onContextMenuAction,
  onRefresh,
  onConnectionToggle,
  connectionStatuses,
  databaseLoadingStates,
  connectionErrors,
  databaseErrors,
  isFavorite,
  isDatabaseOpened,
  nodeRefsMap,
}) => {
  // 添加渲染计数器（仅在开发环境）
  const renderCountRef = useRef(0);
  if (process.env.NODE_ENV === 'development') {
    renderCountRef.current++;
    console.log(`🎨 [Render] MultiConnectionTreeView 重新渲染 (第 ${renderCountRef.current} 次)`);
  }

  // 调试：打印 connectionStatuses
  useEffect(() => {
    if (connectionStatuses) {
      console.log('🔍 [MultiConnectionTreeView] connectionStatuses 更新:',
        Array.from(connectionStatuses.entries()).map(([id, status]) => `${id}: ${status}`)
      );
    }
  }, [connectionStatuses]);

  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 直接订阅 openedDatabasesList 以监听数据库打开/关闭状态变化
  const openedDatabasesList = useOpenedDatabasesStore(state => state.openedDatabasesList);
  const [loadedNodes, setLoadedNodes] = useState<Set<string>>(new Set());
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  // 移除 selectedNode 状态，避免不必要的重新渲染
  // const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const treeRef = useRef<any>(null);

  // 跟踪需要自动展开的数据库节点
  const nodesToAutoExpandRef = useRef<Set<string>>(new Set());

  // 防止双击重复触发
  const lastActivateTimeRef = useRef<number>(0);
  const lastActivateNodeRef = useRef<string>('');

  // 使用 resize observer 获取容器尺寸
  const { ref: containerRef, width = 300, height = 600 } = useResizeObserver();

  // 递归清除节点及其所有子节点的缓存
  const clearNodeAndChildrenCache = useCallback((node: TreeNodeData, cacheSet: Set<string>) => {
    cacheSet.delete(node.id);
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => clearNodeAndChildrenCache(child, cacheSet));
    }
  }, []);

  // 加载所有连接的树节点
  // clearCache: 是否清除缓存并重新加载整个树
  // 注意：只有在点击"刷新"按钮时才应该传入 clearCache=true
  // 其他操作（如展开节点、打开表数据）不应该触发全树重新加载
  const loadAllTreeNodes = useCallback(async (clearCache = false) => {
    console.log(`🔄 [树刷新] loadAllTreeNodes 被调用, clearCache: ${clearCache}`);
    console.trace('🔄 [树刷新] 调用栈:');

    if (connections.length === 0) {
      setTreeData([]);
      return;
    }

    // 优化：只在初始加载或强制刷新时显示全局 loading
    // 避免在更新节点状态时整个树闪烁
    const isInitialLoad = treeData.length === 0;
    if (isInitialLoad || clearCache) {
      setLoading(true);
    }
    setError(null);

    // 清除缓存
    if (clearCache) {
      console.log('🗑️ [树刷新] 清除节点缓存，重新加载整个树');
      setLoadedNodes(new Set());
    } else {
      console.log('⏭️ [树刷新] 不清除缓存，只更新节点状态');
    }

    try {
      // 只在初始化或强制刷新时创建新节点
      // 否则更新现有节点的状态，保留 children
      // 优化：只为真正变化的节点创建新对象
      setTreeData(prevData => {
        // 如果是强制刷新或初始加载，创建全新的节点
        if (clearCache || prevData.length === 0) {
          const allNodes: TreeNodeData[] = [];
          for (const connection of connections) {
            const connectionId = connection.id;
            const status = connectionStatuses?.get(connectionId);
            const error = connectionErrors?.get(connectionId);
            const nodeId = `connection-${connection.id}`;

            const connectionNode: TreeNodeData = {
              id: nodeId,
              name: connection.name,
              nodeType: 'connection' as TreeNodeType,
              dbType: connection.dbType,
              metadata: {
                connectionId: connection.id,
                connectionName: connection.name,
                connectionType: connection.dbType,
                host: connection.host,
                port: connection.port,
                isConnected: connection.isConnected,
                is_container: true,
              },
              isLoading: status === 'connecting',
              error,
              isConnected: connection.isConnected,
              children: undefined,
            };
            allNodes.push(connectionNode);
          }
          return allNodes;
        }

        // 否则，只更新变化的节点，保留其他节点的引用
        let hasChanges = false;
        const newNodes = prevData.map(existingNode => {
          const connection = connections.find(c => `connection-${c.id}` === existingNode.id);
          if (!connection) {
            hasChanges = true;
            return null; // 连接已删除
          }

          const connectionId = connection.id;
          const status = connectionStatuses?.get(connectionId);
          const error = connectionErrors?.get(connectionId);
          const isConnected = connection.isConnected;
          const isLoading = status === 'connecting';

          // 调试日志
          if (isLoading || existingNode.isLoading !== isLoading) {
            console.log(`🔄 [loadAllTreeNodes] 连接 ${connectionId} loading 状态:`, {
              status,
              isLoading,
              prevIsLoading: existingNode.isLoading,
              changed: existingNode.isLoading !== isLoading
            });
          }

          // 检查是否有变化
          if (
            existingNode.name !== connection.name ||
            existingNode.isLoading !== isLoading ||
            existingNode.error !== error ||
            existingNode.isConnected !== isConnected
          ) {
            hasChanges = true;
            return {
              ...existingNode,
              name: connection.name,
              isLoading,
              error,
              isConnected,
            };
          }

          return existingNode;
        }).filter(Boolean) as TreeNodeData[];

        // 检查是否有新增的连接
        for (const connection of connections) {
          const nodeId = `connection-${connection.id}`;
          if (!prevData.find(n => n.id === nodeId)) {
            hasChanges = true;
            const connectionId = connection.id;
            const status = connectionStatuses?.get(connectionId);
            const error = connectionErrors?.get(connectionId);

            newNodes.push({
              id: nodeId,
              name: connection.name,
              nodeType: 'connection' as TreeNodeType,
              dbType: connection.dbType,
              metadata: {
                connectionId: connection.id,
                connectionName: connection.name,
                connectionType: connection.dbType,
                host: connection.host,
                port: connection.port,
                isConnected: connection.isConnected,
                is_container: true,
              },
              isLoading: status === 'connecting',
              error,
              isConnected: connection.isConnected,
              children: undefined,
            });
          }
        }

        return hasChanges ? newNodes : prevData;
      });
    } catch (err) {
      console.error('加载数据源树失败:', err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, [connections, connectionStatuses, connectionErrors]);

  // 使用 ref 跟踪 loadedNodes，避免 handleToggle 依赖它
  const loadedNodesStateRef = useRef(loadedNodes);
  useEffect(() => {
    loadedNodesStateRef.current = loadedNodes;
  }, [loadedNodes]);

  // 懒加载子节点
  const handleToggle = useCallback(async (nodeId: string) => {
    const node = treeRef.current?.get(nodeId);
    if (!node) return;

    const nodeData = node.data as TreeNodeData;

    // 如果是连接节点且未连接，先建立连接
    if (nodeData.nodeType === 'connection') {
      const connectionId = nodeData.metadata?.connectionId;
      const isConnected = connectionStatuses?.get(connectionId) === 'connected';

      if (!isConnected && onConnectionToggle) {
        console.log(`🔗 连接节点未连接，先建立连接: ${connectionId}`);

        // 不再设置 loading 状态，避免触发额外的重新渲染
        try {
          // 建立连接
          await onConnectionToggle(connectionId);
          console.log(`✅ 连接建立成功，继续加载子节点: ${connectionId}`);
          // 连接建立后，继续加载子节点（不要 return）
        } catch (err) {
          console.error(`❌ 连接失败:`, err);
          return;
        }
      }
    }

    // 如果节点已经加载过（在缓存中），直接返回，让 react-arborist 处理展开/收起
    if (loadedNodesStateRef.current.has(nodeId)) {
      console.log(`📦 使用缓存: ${nodeId}`);
      return;
    }

    // 如果节点的 children 不是 undefined，说明已经加载过了（可能是空数组）
    // children === undefined 表示未加载，需要懒加载
    // children === [] 表示已加载但为空，不需要重新加载
    if (nodeData.children !== undefined) {
      console.log(`✅ 节点已加载，跳过: ${nodeId}`);
      return;
    }

    console.log(`🔄 懒加载节点: ${nodeId}`, nodeData);
    console.log(`📊 [性能] 当前树节点总数: ${treeData.length}, 已加载节点数: ${loadedNodes.size}`);

    // 不再设置 loading 状态，避免触发额外的重新渲染
    // 直接加载数据，在加载完成后一次性更新节点

    try {
      // 获取连接 ID
      const connectionId = nodeData.metadata?.connectionId;
      if (!connectionId) {
        console.error('节点缺少 connectionId:', nodeData);
        return;
      }

      // 调用后端获取子节点
      const children = await safeTauriInvoke<any[]>('get_tree_children', {
        connectionId,
        parentNodeId: nodeData.id,
        nodeType: nodeData.nodeType,
        metadata: nodeData.metadata || null,
      });

      console.log(`✅ 加载到 ${children.length} 个子节点`, children);

      // 获取连接信息
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        console.error('找不到连接:', connectionId);
        return;
      }

      // 转换子节点格式
      const convertedChildren = children.map(child =>
        convertToArboristFormat(child, connection, connectionId, isDatabaseOpened)
      );

      // 一次性更新节点数据，避免多次 setTreeData 调用
      // 优化：只为真正变化的节点创建新对象，其他节点保持原引用
      setTreeData(prevData => {
        console.log('🔄 [状态更新] 更新节点子节点，prevData 引用:', prevData);

        const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
          // 使用 for 循环而不是 map，只在找到目标节点时才创建新数组
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];

            if (n.id === nodeId) {
              // 找到目标节点，创建新数组并更新该节点
              const newNodes = [...nodes];
              newNodes[i] = {
                ...n,
                children: convertedChildren,
                isLoading: false
              };
              console.log('🔄 [状态更新] 更新节点子节点完成:', {
                nodeId,
                childrenCount: convertedChildren.length,
                oldReference: nodes,
                newReference: newNodes,
                referenceChanged: nodes !== newNodes
              });
              return newNodes;
            }

            if (n.children) {
              const updatedChildren = updateNode(n.children);
              if (updatedChildren !== n.children) {
                // 子节点有变化，创建新数组并更新该节点
                const newNodes = [...nodes];
                newNodes[i] = { ...n, children: updatedChildren };
                return newNodes;
              }
            }
          }

          // 没有找到目标节点，返回原数组
          return nodes;
        };

        const result = updateNode(prevData);
        console.log('🔄 [状态更新] 更新子节点完成:', {
          prevReference: prevData,
          newReference: result,
          referenceChanged: prevData !== result
        });
        return result;
      });

      // 标记节点已加载
      setLoadedNodes(prev => new Set([...prev, nodeId]));

      // 加载完成后自动展开节点
      const treeNode = treeRef.current?.get(nodeId);
      if (treeNode && !treeNode.isOpen) {
        console.log(`📂 自动展开已加载的节点: ${nodeId}`);
        treeNode.open();
      }
    } catch (err) {
      console.error(`❌ 加载子节点失败:`, err);
      // 加载失败时，设置空的 children 数组，避免重复加载
      setTreeData(prevData => {
        const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
          for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];

            if (n.id === nodeId) {
              const newNodes = [...nodes];
              newNodes[i] = { ...n, children: [], error: String(err) };
              return newNodes;
            }

            if (n.children) {
              const updatedChildren = updateNode(n.children);
              if (updatedChildren !== n.children) {
                const newNodes = [...nodes];
                newNodes[i] = { ...n, children: updatedChildren };
                return newNodes;
              }
            }
          }
          return nodes;
        };
        return updateNode(prevData);
      });
    }
  }, [connections, connectionStatuses, databaseLoadingStates, connectionErrors, databaseErrors, isFavorite, onConnectionToggle]); // 移除 loadedNodes 依赖

  // 转换节点格式为 React Arborist 格式
  const convertToArboristFormat = (
    node: any,
    connection: any,
    connectionId: string,
    isDatabaseOpenedFn?: (connectionId: string, database: string) => boolean
  ): TreeNodeData => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpandable = node.isExpandable || node.is_expandable || node.metadata?.is_container || false;
    const nodeType = node.nodeType || node.node_type;

    // 获取节点状态
    const nodeId = node.id;
    const database = node.metadata?.database || node.metadata?.databaseName || node.name || '';
    const table = node.metadata?.table || node.metadata?.tableName || '';

    // 检查加载状态
    let isLoading = false;
    if (nodeType === 'connection') {
      const status = connectionStatuses?.get(connectionId);
      isLoading = status === 'connecting';
    } else if (nodeType.includes('database')) {
      const dbKey = `${connectionId}/${database}`;
      isLoading = databaseLoadingStates?.get(dbKey) || false;
    }

    // 检查错误状态
    let error: string | undefined;
    if (nodeType === 'connection') {
      error = connectionErrors?.get(connectionId);
    } else if (nodeType.includes('database')) {
      const dbKey = `${connectionId}/${database}`;
      error = databaseErrors?.get(dbKey);
    }

    // 检查收藏状态
    let isFav = false;
    if ((nodeType === 'measurement' || nodeType === 'table') && isFavorite) {
      const favPath = `${connectionId}/${database}/${table}`;
      isFav = isFavorite(favPath);
    }

    // 不再在这里计算 isActivated，而是在 TreeNodeRenderer 中动态计算
    // 这样可以避免 openedDatabasesList 变化时触发整个树的重新渲染

    // 只为连接节点设置 isConnected 属性
    const result: TreeNodeData = {
      id: node.id,
      name: node.name,
      nodeType,
      dbType: connection.dbType, // 添加 dbType 用于图标显示
      metadata: {
        ...node.metadata,
        connectionId,
        connectionType: connection.dbType,
        databaseType: connection.dbType,
      },
      isLoading,
      error,
      isFavorite: isFav,
      // 不再设置 isActivated，在渲染时动态计算
      // 如果有子节点，直接设置；如果可展开但没有子节点，设置为 undefined 表示需要懒加载
      children: hasChildren
        ? node.children.map((child: any) => convertToArboristFormat(child, connection, connectionId, isDatabaseOpenedFn))
        : isExpandable
          ? undefined
          : [],
    };

    // 只为连接节点设置 isConnected
    if (nodeType === 'connection') {
      result.isConnected = node.isConnected;
    }

    return result;
  };

  // 过滤系统节点
  const filterSystemNodes = (node: TreeNodeData, connection: any): boolean => {
    // 实现系统节点过滤逻辑
    return true; // 暂时返回 true，保留所有节点
  };

  // 🔧 性能优化：监听 connections 变化，自动更新树
  // 使用 ref 跟踪上一次的 connections，避免不必要的重新加载
  const prevConnectionsRef = useRef<ConnectionInfo[]>([]);

  useEffect(() => {
    const prevConnections = prevConnectionsRef.current;

    // 检查连接列表是否真的发生了变化
    const connectionsChanged =
      connections.length !== prevConnections.length ||
      connections.some((conn, index) => {
        const prevConn = prevConnections[index];
        return !prevConn || conn.id !== prevConn.id || conn.name !== prevConn.name;
      });

    if (connectionsChanged) {
      console.log('🔄 [MultiConnectionTreeView] connections 变化，重新加载树');
      console.log('  - 之前:', prevConnections.map(c => c.name));
      console.log('  - 现在:', connections.map(c => c.name));

      // 不清除缓存，只更新节点列表
      loadAllTreeNodes(false);
      prevConnectionsRef.current = connections;
    } else if (prevConnections.length === 0 && connections.length > 0) {
      // 初始加载
      console.log('🔄 [MultiConnectionTreeView] 组件挂载，初始加载树');
      loadAllTreeNodes();
      prevConnectionsRef.current = connections;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]); // 依赖 connections，当连接列表变化时重新加载

  // 使用 ref 来跟踪需要清除缓存的节点
  const disconnectedNodesRef = useRef<Map<string, TreeNodeData>>(new Map());

  // 使用 ref 来跟踪上次的连接状态，避免不必要的更新
  const prevConnectionStatusesRef = useRef<Map<string, 'connecting' | 'connected' | 'disconnected'>>(new Map());

  // 监听连接状态变化，更新节点状态（不重新加载整个树）
  useEffect(() => {
    if (!connectionStatuses) return;

    // 检查连接状态是否真的发生了变化
    let statusChanged = false;
    const prevStatuses = prevConnectionStatusesRef.current;

    // 检查是否有新的状态或状态值变化
    connectionStatuses.forEach((status, connectionId) => {
      if (prevStatuses.get(connectionId) !== status) {
        statusChanged = true;
      }
    });

    // 检查是否有连接被移除
    prevStatuses.forEach((status, connectionId) => {
      if (!connectionStatuses.has(connectionId)) {
        statusChanged = true;
      }
    });

    if (!statusChanged) {
      console.log('👀 [MultiConnectionTreeView] 连接状态无实际变化，跳过更新');
      return;
    }

    console.log('🔄 [MultiConnectionTreeView] 连接状态发生变化，更新节点状态');

    // 更新 ref
    prevConnectionStatusesRef.current = new Map(connectionStatuses);

    setTreeData(prevData => {
      // 🔧 性能优化：使用 Map 记录需要更新的节点索引和新数据
      const nodesToUpdate = new Map<number, TreeNodeData>();

      prevData.forEach((node, index) => {
        if (node.nodeType === 'connection') {
          const connectionId = node.metadata?.connectionId;
          const status = connectionStatuses.get(connectionId);
          const error = connectionErrors?.get(connectionId);
          const isConnected = status === 'connected';
          const isLoading = status === 'connecting';

          console.log(`🔍 [MultiConnectionTreeView] 检查连接 ${connectionId}:`, {
            status,
            isConnected,
            isLoading,
            prevIsLoading: node.isLoading,
            hasChildren: !!node.children
          });

          // 检查是否需要更新节点状态
          const needsUpdate =
            node.isLoading !== isLoading ||
            node.error !== error ||
            node.isConnected !== isConnected ||
            ((status === 'disconnected' || !isConnected) && node.children);

          if (needsUpdate) {
            // 如果 loading 状态变化，记录日志
            if (node.isLoading !== isLoading) {
              console.log(`🔄 [MultiConnectionTreeView] 连接 ${connectionId} loading 状态变化: ${node.isLoading} -> ${isLoading}`);
            }

            // 如果连接断开且有子节点，需要清除子节点
            if ((status === 'disconnected' || !isConnected) && node.children) {
              console.log(`🗑️ 连接断开，清除子节点: ${connectionId}`);

              // 保存节点数据到 ref，用于后续清除缓存
              const nodeId = `connection-${connectionId}`;
              disconnectedNodesRef.current.set(nodeId, node);

              // 记录需要更新的节点
              nodesToUpdate.set(index, {
                ...node,
                isLoading,
                error,
                isConnected,
                children: undefined,
              });
            } else {
              // 记录需要更新的节点
              nodesToUpdate.set(index, {
                ...node,
                isLoading,
                error,
                isConnected,
              });
            }
          }
        }
      });

      // 🔧 关键优化：只有真正有变化时才创建新数组
      if (nodesToUpdate.size === 0) {
        console.log('⏭️ [MultiConnectionTreeView] 树数据无变化，跳过更新');
        return prevData; // 返回原数组引用
      }

      console.log(`✅ [MultiConnectionTreeView] 树数据已更新（${nodesToUpdate.size} 个节点状态变化）`);

      // 🔧 只复制需要更新的节点，其他节点保持原引用
      const newData = prevData.map((node, index) => {
        const updatedNode = nodesToUpdate.get(index);
        return updatedNode || node; // 如果有更新则使用新节点，否则使用原节点
      });

      return newData;
    });
  }, [connectionStatuses]);

  // 单独的 useEffect 处理断开连接后的清理工作
  useEffect(() => {
    if (disconnectedNodesRef.current.size === 0) return;

    console.log(`🧹 处理 ${disconnectedNodesRef.current.size} 个断开连接的节点`);

    disconnectedNodesRef.current.forEach((nodeData, nodeId) => {
      // 清除该连接节点的所有子节点缓存
      const connectionId = nodeId.replace('connection-', '');
      console.log(`🗑️ 清除连接 ${connectionId} 的所有子节点缓存`);

      setLoadedNodes(prev => {
        const newSet = new Set(prev);
        const sizeBefore = newSet.size;
        // 递归清除该连接节点及其所有子节点的缓存
        clearNodeAndChildrenCache(nodeData, newSet);
        const clearedCount = sizeBefore - newSet.size;
        if (clearedCount > 0) {
          console.log(`  ✅ 已清除 ${clearedCount} 个节点的缓存`);
        }
        return newSet;
      });
    });

    // 清空 ref
    disconnectedNodesRef.current.clear();
  }, [treeData, clearNodeAndChildrenCache]);

  // 使用 ref 跟踪 handleToggle、loadedNodes 和 treeData，避免循环依赖
  const handleToggleRef = useRef(handleToggle);
  const loadedNodesRef = useRef(loadedNodes);
  const treeDataRef = useRef(treeData);

  useEffect(() => {
    handleToggleRef.current = handleToggle;
    loadedNodesRef.current = loadedNodes;
    treeDataRef.current = treeData;
  });

  // 使用 ref 跟踪上一次的 openedDatabasesList，用于检测数据库关闭
  const prevOpenedDatabasesListRef = useRef<string[]>([]);

  // 辅助函数：在树中查找数据库节点（通过 connectionId 和 database 名称）
  const findDatabaseNodeInTree = useCallback((
    nodes: TreeNodeData[],
    connectionId: string,
    databaseName: string
  ): TreeNodeData | null => {
    for (const node of nodes) {
      // 检查是否为目标数据库节点
      // 数据库节点的 nodeType 可能是: database, system_database, database3x, storage_group
      if (
        (node.nodeType === 'database' ||
         node.nodeType === 'system_database' ||
         node.nodeType === 'database3x' ||
         node.nodeType === 'storage_group') &&
        node.metadata?.connectionId === connectionId &&
        node.name === databaseName
      ) {
        return node;
      }

      // 递归查找子节点
      if (node.children && Array.isArray(node.children)) {
        const found = findDatabaseNodeInTree(node.children, connectionId, databaseName);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // 监听 openedDatabasesList 的变化
  useEffect(() => {
    const prevList = prevOpenedDatabasesListRef.current;
    const currentList = openedDatabasesList;

    // 检查是否有数据库被关闭
    const closedDatabases = prevList.filter(db => !currentList.includes(db));

    // 检查是否有数据库被打开（新增的数据库）
    const openedDatabases = currentList.filter(db => !prevList.includes(db));

    // 处理关闭的数据库
    if (closedDatabases.length > 0) {
      console.log('🔒 [关闭数据库] 检测到数据库关闭:', closedDatabases);

      // 🔧 修复2：先收起节点，然后清除子节点和缓存
      // 收起节点是同步操作，不需要等待状态更新
      closedDatabases.forEach(dbKey => {
        const parts = dbKey.split('/');
        if (parts.length >= 2) {
          const connectionId = parts[0];
          const database = parts.slice(1).join('/');

          console.log(`🔒 [关闭数据库] 处理数据库: ${database}, connectionId: ${connectionId}`);
          console.log(`🔒 [关闭数据库] 当前 treeData 长度: ${treeDataRef.current.length}`);

          // 在树中查找数据库节点
          const dbNode = findDatabaseNodeInTree(treeDataRef.current, connectionId, database);
          if (dbNode) {
            console.log(`🔒 [关闭数据库] 找到数据库节点: ${dbNode.id}, nodeType: ${dbNode.nodeType}`);
            const node = treeRef.current?.get(dbNode.id);
            if (node) {
              console.log(`🔒 [关闭数据库] 获取到 arborist 节点, isOpen: ${node.isOpen}`);
              if (node.isOpen) {
                console.log(`🔒 [关闭数据库] 收起节点: ${dbNode.id}`);
                node.close();
              } else {
                console.log(`🔒 [关闭数据库] 节点已经是收起状态: ${dbNode.id}`);
              }
            } else {
              console.warn(`🔒 [关闭数据库] 无法从 treeRef 获取节点: ${dbNode.id}`);
            }
          } else {
            console.warn(`🔒 [关闭数据库] 未找到数据库节点: ${database}, connectionId: ${connectionId}`);
          }
        }
      });

      // 然后更新 treeData 清除子节点
      setTreeData(prevData => {
        let dataChanged = false;

        const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
          return nodes.map(n => {
            // 检查是否是需要关闭的数据库节点
            for (const dbKey of closedDatabases) {
              const parts = dbKey.split('/');
              if (parts.length >= 2) {
                const connectionId = parts[0];
                const database = parts.slice(1).join('/');

                // 检查是否为目标数据库节点
                if (
                  (n.nodeType === 'database' ||
                   n.nodeType === 'system_database' ||
                   n.nodeType === 'database3x' ||
                   n.nodeType === 'storage_group') &&
                  n.metadata?.connectionId === connectionId &&
                  n.name === database
                ) {
                  console.log(`🔒 [关闭数据库] 找到节点: ${n.id}, 清除子节点`);

                  // 清除缓存
                  if (n.children) {
                    setLoadedNodes(prev => {
                      const newSet = new Set(prev);
                      clearNodeAndChildrenCache(n, newSet);
                      console.log(`🔒 [关闭数据库] 已清除节点缓存: ${n.id}`);
                      return newSet;
                    });
                  }

                  dataChanged = true;
                  // 返回清除了子节点的新节点
                  return { ...n, children: undefined };
                }
              }
            }

            // 递归处理子节点
            if (n.children && Array.isArray(n.children)) {
              const updatedChildren = updateNode(n.children);
              if (updatedChildren !== n.children) {
                dataChanged = true;
                return { ...n, children: updatedChildren };
              }
            }

            return n;
          });
        };

        const newData = updateNode(prevData);
        return dataChanged ? newData : prevData;
      });
    }

    // 处理打开的数据库（右键菜单打开数据库时）
    if (openedDatabases.length > 0) {
      console.log('🔓 [打开数据库] 检测到数据库打开:', openedDatabases);

      openedDatabases.forEach(dbKey => {
        // dbKey 格式: "connectionId/database"
        const parts = dbKey.split('/');
        if (parts.length >= 2) {
          const connectionId = parts[0];
          const database = parts.slice(1).join('/');

          console.log(`🔓 [打开数据库] 处理数据库: ${database}, connectionId: ${connectionId}`);

          // 在树中查找数据库节点（使用 ref 获取最新的 treeData）
          const dbNode = findDatabaseNodeInTree(treeDataRef.current, connectionId, database);
          if (!dbNode) {
            console.warn(`🔓 [打开数据库] 未找到数据库节点: ${database}`);
            return;
          }

          const nodeId = dbNode.id;
          console.log(`🔓 [打开数据库] 找到节点: ${nodeId}, 节点类型: ${dbNode.nodeType}`);

          // 🔧 修复3：标记节点需要自动展开（与双击打开数据库保持一致）
          nodesToAutoExpandRef.current.add(nodeId);
          console.log(`🔓 [打开数据库] 标记节点 ${nodeId} 需要自动展开`);

          const node = treeRef.current?.get(nodeId);
          if (node) {
            const nodeData = node.data as TreeNodeData;

            // 先加载子节点，然后再展开节点
            // 这样可以确保展开时子节点已经加载，箭头会正确显示
            if (nodeData.children === undefined && !loadedNodesRef.current.has(nodeId)) {
              console.log(`🔓 [打开数据库] 触发子节点加载: ${nodeId}`);
              // 加载子节点后会自动展开（在 handleToggle 的回调中）
              handleToggleRef.current(nodeId);
            } else {
              // 如果子节点已加载，直接展开
              if (!node.isOpen) {
                console.log(`🔓 [打开数据库] 展开节点: ${nodeId}`);
                node.open();
              } else {
                console.log(`🔓 [打开数据库] 节点已经是展开状态: ${nodeId}`);
              }
            }
          }
        }
      });
    }

    // 检查是否有需要自动展开的节点（双击打开数据库时）
    if (nodesToAutoExpandRef.current.size > 0) {
      console.log('🔓 [打开数据库] 检查需要自动展开的节点:', Array.from(nodesToAutoExpandRef.current));

      nodesToAutoExpandRef.current.forEach(nodeId => {
        const node = treeRef.current?.get(nodeId);
        if (node) {
          const nodeData = node.data as TreeNodeData;
          const connectionId = nodeData.metadata?.connectionId || '';
          const database = nodeData.name;

          // 检查数据库是否已打开
          const isActivated = isDatabaseOpened ? isDatabaseOpened(connectionId, database) : false;

          // 只展开已打开的数据库节点
          if (isActivated && !node.isOpen) {
            console.log(`🔓 [打开数据库] 自动展开节点: ${nodeId}`);
            // 1. 展开节点（立即执行）
            node.open();
            // 2. 如果子节点未加载，触发加载
            if (nodeData.children === undefined && !loadedNodesRef.current.has(nodeId)) {
              console.log(`🔓 [打开数据库] 触发子节点加载: ${nodeId}`);
              handleToggleRef.current(nodeId);
            }
          }
        }
      });
      // 清空待展开列表
      nodesToAutoExpandRef.current.clear();
    }

    // 更新 ref
    prevOpenedDatabasesListRef.current = currentList;
  }, [openedDatabasesList, isDatabaseOpened, clearNodeAndChildrenCache, findDatabaseNodeInTree]);

  // 搜索过滤
  // 优化：使用 ref 缓存上次的 treeData，避免因引用变化导致不必要的重新计算
  const prevTreeDataRef = useRef<TreeNodeData[]>([]);
  const prevFilteredDataRef = useRef<TreeNodeData[]>([]);
  const prevSearchValueRef = useRef<string>('');

  const filteredData = useMemo(() => {
    // 如果 treeData 和 searchValue 都没有实质性变化，返回缓存的结果
    const treeDataChanged = prevTreeDataRef.current !== treeData;
    const searchValueChanged = prevSearchValueRef.current !== searchValue;

    if (!treeDataChanged && !searchValueChanged) {
      console.log('✅ [filteredData] 使用缓存，避免重新计算');
      return prevFilteredDataRef.current;
    }

    console.log('🎨 [filteredData] 重新计算:', {
      treeDataChanged,
      searchValueChanged,
      treeDataLength: treeData.length,
      searchValue,
      prevTreeDataReference: prevTreeDataRef.current,
      currentTreeDataReference: treeData,
      referenceChanged: prevTreeDataRef.current !== treeData
    });

    prevTreeDataRef.current = treeData;
    prevSearchValueRef.current = searchValue;

    if (!searchValue.trim()) {
      console.log('✅ [filteredData] 无搜索值，直接返回 treeData');
      prevFilteredDataRef.current = treeData;
      return treeData;
    }

    const filterNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      const result: TreeNodeData[] = [];

      for (const node of nodes) {
        const matchesSearch = node.name.toLowerCase().includes(searchValue.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : undefined;

        if (matchesSearch || (filteredChildren && filteredChildren.length > 0)) {
          // 只有在 children 真正变化时才创建新对象
          if (filteredChildren && filteredChildren !== node.children) {
            result.push({
              ...node,
              children: filteredChildren,
            });
          } else {
            // children 没有变化，直接使用原节点
            result.push(node);
          }
        }
      }

      return result;
    };

    const result = filterNodes(treeData);
    prevFilteredDataRef.current = result;
    return result;
  }, [treeData, searchValue]);

  // 处理节点选择
  const handleSelect = useCallback((nodes: NodeApi<TreeNodeData>[]) => {
    const selected = nodes.length > 0 ? nodes[0].data : null;

    // 直接调用回调，不更新内部状态，避免不必要的重新渲染
    console.log('✅ [MultiConnectionTreeView] 选中节点:', selected?.id);
    onNodeSelect?.(selected);
  }, [onNodeSelect]);

  // 处理节点双击
  const handleNodeDoubleClick = useCallback(async (nodeData: TreeNodeData, node: any) => {
    const now = Date.now();
    const nodeId = nodeData.id;

    console.log(`🖱️🖱️ 双击节点: ${nodeId}, 节点类型: ${nodeData.nodeType}`);

    // 防止双击重复触发（300ms 内的重复双击会被忽略）
    // 但如果节点有错误状态，允许立即重试
    const hasError = nodeData.error;
    if (!hasError && lastActivateNodeRef.current === nodeId && now - lastActivateTimeRef.current < 300) {
      console.log('⚠️ 忽略重复的双击事件:', nodeId);
      return;
    }

    lastActivateTimeRef.current = now;
    lastActivateNodeRef.current = nodeId;

    const nodeType = nodeData.nodeType;

    // measurement/table 节点：双击时打开数据 tab，不展开节点
    if (nodeType === 'measurement' || nodeType === 'table') {
      console.log(`📊 双击表节点，打开数据浏览器: ${nodeType}`);
      onNodeActivate?.(nodeData);
      return;
    }

    // 容器节点（需要展开/收起的节点）
    if (nodeType === 'connection' ||
        nodeType === 'database' ||
        nodeType === 'system_database' ||
        nodeType === 'bucket' ||
        nodeType === 'system_bucket' ||
        nodeType === 'database3x' ||
        nodeType === 'storage_group' ||
        nodeType === 'device') {

      // 特殊处理：连接节点
      if (nodeType === 'connection') {
        // 如果有错误状态，允许重新尝试连接
        if (hasError) {
          console.log(`🔄 双击有错误的连接节点，重新尝试连接: ${nodeType}`);
          await handleToggle(node.id);
          return;
        }

        // 如果未连接，先建立连接
        if (!nodeData.isConnected) {
          console.log(`📂 双击未连接的连接节点，建立连接: ${nodeType}`);
          await handleToggle(node.id);
          return;
        }

        // 如果已连接且已加载子节点，切换展开/收起
        if (nodeData.children !== undefined || loadedNodesStateRef.current.has(nodeId)) {
          console.log(`📂 双击已连接且已加载的连接节点，切换展开/收起: ${nodeType}`);
          node.toggle();
          return;
        }
      }

      // 其他容器节点：先检查是否已加载子节点
      if (nodeData.children !== undefined || loadedNodesStateRef.current.has(nodeId)) {
        console.log(`📂 双击已加载的容器节点，切换展开/收起: ${nodeType}`);
        node.toggle();
        return;
      }

      // 特殊处理：数据库节点
      if (nodeType === 'database' || nodeType === 'system_database') {
        // 使用 isDatabaseOpened 函数检查数据库是否已打开
        const connectionId = nodeData.metadata?.connectionId || '';
        const database = nodeData.name;
        const isActivated = isDatabaseOpened ? isDatabaseOpened(connectionId, database) : false;

        // 如果数据库未打开，双击应该打开数据库
        if (!isActivated) {
          console.log(`🔓 [打开数据库] 双击未打开的数据库节点: ${nodeData.name}`);
          // 标记此节点需要在打开后自动展开
          nodesToAutoExpandRef.current.add(nodeId);
          console.log(`🔓 [打开数据库] 标记节点 ${nodeId} 需要自动展开`);
          // 通知父组件打开数据库（通过 onNodeActivate）
          onNodeActivate?.(nodeData);
          return;
        }

        // 如果数据库已打开，双击只切换展开/收起
        console.log(`📂 双击已打开的数据库节点，切换展开/收起: ${nodeType}`);
        node.toggle();
        return;
      }

      // 如果节点未加载子节点（children === undefined 且不在缓存中），调用 handleToggle 加载数据
      console.log(`📂 双击容器节点，加载子节点: ${nodeType}`);
      await handleToggle(node.id);
      return;
    }

    // 其他叶子节点：通知父组件
    console.log(`📄 双击叶子节点，通知父组件: ${nodeType}`);
    onNodeActivate?.(nodeData);
  }, [onNodeActivate, handleToggle, isDatabaseOpened]);

  // 处理右键菜单
  const handleContextMenu = useCallback((node: NodeApi<TreeNodeData>, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation(); // 阻止事件冒泡，避免触发其他节点的事件
    onNodeContextMenu?.(node.data, event);
  }, [onNodeContextMenu]);

  // 刷新
  const handleRefresh = useCallback(() => {
    loadAllTreeNodes(true);
    onRefresh?.();
  }, [loadAllTreeNodes, onRefresh]);

  // 创建稳定的 onToggle 回调
  const handleTreeToggle = useCallback(async (nodeId: string) => {
    const node = treeRef.current?.get(nodeId);
    if (!node) return;

    const nodeData = node.data as TreeNodeData;

    // 只在需要加载数据时调用 handleToggle
    // 如果节点已有 children（不是 undefined），让 react-arborist 自己处理展开/收起
    if (nodeData.children === undefined && !loadedNodesStateRef.current.has(nodeId)) {
      console.log('Tree onToggle - 需要加载数据:', nodeId);
      await handleToggle(nodeId);
    } else {
      console.log('Tree onToggle - 切换展开状态:', nodeId);
      // 让 react-arborist 自己处理展开/收起，不做任何操作
    }
  }, [handleToggle]);

  // 创建稳定的 children 渲染函数
  // 传递 isDatabaseOpened，让 TreeNodeRenderer 动态计算状态
  // 使用 UnifiedContextMenu 包装节点以提供右键菜单
  const renderNode = useCallback((props: any) => {
    const nodeData = props.node.data;

    // 如果提供了 onContextMenuAction，使用 UnifiedContextMenu
    if (onContextMenuAction) {
      return (
        <UnifiedContextMenu
          node={nodeData}
          onAction={onContextMenuAction}
          isDatabaseOpened={isDatabaseOpened}
          isFavorite={isFavorite}
        >
          <TreeNodeRenderer
            {...props}
            onNodeDoubleClick={handleNodeDoubleClick}
            isDatabaseOpened={isDatabaseOpened}
            nodeRefsMap={nodeRefsMap}
          />
        </UnifiedContextMenu>
      );
    }

    // 否则使用旧的 onContextMenu 方式（向后兼容）
    return (
      <div onContextMenu={(e) => handleContextMenu(props.node, e)}>
        <TreeNodeRenderer
          {...props}
          onNodeDoubleClick={handleNodeDoubleClick}
          isDatabaseOpened={isDatabaseOpened}
          nodeRefsMap={nodeRefsMap}
        />
      </div>
    );
  }, [onContextMenuAction, handleContextMenu, handleNodeDoubleClick, isDatabaseOpened, isFavorite, nodeRefsMap]);

  // 优化：只在初始加载且没有数据时显示全局 loading
  // 避免在后续操作时整个树闪烁
  if (loading && treeData.length === 0 && !loadedNodes.size) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 优化：只在没有任何数据时显示全局错误
  // 如果已经有部分数据，错误会显示在具体的节点上
  if (error && treeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
        <p>加载失败: {error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  // 移除渲染日志，避免性能影响
  // console.log('🎨 [MultiConnectionTreeView] 渲染，treeData 节点数:', treeData.length);

  return (
    <div ref={containerRef} className={`h-full w-full ${className}`}>
      <Tree
        ref={treeRef}
        data={filteredData}
        idAccessor={(node) => node.id}
        width={width}
        height={height}
        indent={20}
        rowHeight={36}
        overscanCount={10}
        onSelect={handleSelect}
        onToggle={handleTreeToggle}
        disableMultiSelection={true}
        disableEdit={true}
      >
        {renderNode}
      </Tree>
    </div>
  );
};

// 自定义比较函数，用于 React.memo
// 注意：这个函数主要用于避免父组件重新渲染时不必要的 props 传递
// 但它不能解决内部 treeData 状态更新导致的重新渲染问题
const arePropsEqual = (
  prevProps: MultiConnectionTreeViewProps,
  nextProps: MultiConnectionTreeViewProps
): boolean => {
  // 比较基本 props
  const classNameChanged = prevProps.className !== nextProps.className;
  const filterChanged = prevProps.useVersionAwareFilter !== nextProps.useVersionAwareFilter;
  const searchChanged = prevProps.searchValue !== nextProps.searchValue;

  if (classNameChanged || filterChanged || searchChanged) {
    console.log('🔍 [Props比较] 基本 props 变化:', {
      classNameChanged,
      filterChanged,
      searchChanged
    });
    return false;
  }

  // 比较 connections 数组
  const connectionsLengthChanged = prevProps.connections.length !== nextProps.connections.length;
  if (connectionsLengthChanged) {
    console.log('🔍 [Props比较] connections 长度变化:', {
      prev: prevProps.connections.length,
      next: nextProps.connections.length
    });
    return false;
  }

  let connectionsContentChanged = false;
  for (let i = 0; i < prevProps.connections.length; i++) {
    const prev = prevProps.connections[i];
    const next = nextProps.connections[i];
    if (
      prev.id !== next.id ||
      prev.name !== next.name ||
      prev.dbType !== next.dbType ||
      prev.isConnected !== next.isConnected
    ) {
      connectionsContentChanged = true;
      console.log('🔍 [Props比较] connections 内容变化:', {
        index: i,
        prevId: prev.id,
        nextId: next.id,
        prevConnected: prev.isConnected,
        nextConnected: next.isConnected
      });
      return false;
    }
  }

  // 比较 Map 对象（比较内容而不是引用）
  const compareMaps = (
    map1: Map<string, any> | undefined,
    map2: Map<string, any> | undefined,
    mapName: string
  ): boolean => {
    if (!map1 && !map2) return true;
    if (!map1 || !map2) {
      console.log(`🔍 [Props比较] ${mapName} 一个为空:`, { map1: !!map1, map2: !!map2 });
      return false;
    }
    if (map1.size !== map2.size) {
      console.log(`🔍 [Props比较] ${mapName} 大小变化:`, { prev: map1.size, next: map2.size });
      return false;
    }
    for (const [key, value] of map1) {
      if (map2.get(key) !== value) {
        console.log(`🔍 [Props比较] ${mapName} 内容变化:`, { key, prevValue: value, nextValue: map2.get(key) });
        return false;
      }
    }
    return true;
  };

  if (!compareMaps(prevProps.connectionStatuses, nextProps.connectionStatuses, 'connectionStatuses')) {
    return false;
  }
  if (!compareMaps(prevProps.databaseLoadingStates, nextProps.databaseLoadingStates, 'databaseLoadingStates')) {
    return false;
  }
  if (!compareMaps(prevProps.connectionErrors, nextProps.connectionErrors, 'connectionErrors')) {
    return false;
  }
  if (!compareMaps(prevProps.databaseErrors, nextProps.databaseErrors, 'databaseErrors')) {
    return false;
  }

  // 比较回调函数（引用比较）
  if (
    prevProps.onNodeSelect !== nextProps.onNodeSelect ||
    prevProps.onNodeActivate !== nextProps.onNodeActivate ||
    prevProps.onNodeContextMenu !== nextProps.onNodeContextMenu ||
    prevProps.onContextMenuAction !== nextProps.onContextMenuAction ||
    prevProps.onRefresh !== nextProps.onRefresh ||
    prevProps.onConnectionToggle !== nextProps.onConnectionToggle ||
    prevProps.isFavorite !== nextProps.isFavorite ||
    prevProps.isDatabaseOpened !== nextProps.isDatabaseOpened
  ) {
    console.log('🔍 [Props比较] 回调函数引用变化');
    return false;
  }

  // Props 无变化，跳过重新渲染
  return true;
};

// 使用 React.memo 避免不必要的重新渲染
export default React.memo(MultiConnectionTreeView, arePropsEqual);

