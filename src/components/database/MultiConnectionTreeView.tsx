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
}

export const MultiConnectionTreeView: React.FC<MultiConnectionTreeViewProps> = ({
  connections,
  className = '',
  useVersionAwareFilter = false,
  searchValue = '',
  onNodeSelect,
  onNodeActivate,
  onNodeContextMenu,
  onRefresh,
  onConnectionToggle,
  connectionStatuses,
  databaseLoadingStates,
  connectionErrors,
  databaseErrors,
  isFavorite,
  isDatabaseOpened,
}) => {
  // 添加渲染计数器
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  console.log(`🎨 [Render] MultiConnectionTreeView 重新渲染 (第 ${renderCountRef.current} 次)`);

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

        // 设置节点为 loading 状态
        // 优化：只为真正变化的节点创建新对象
        setTreeData(prevData => {
          const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
            let hasChanges = false;
            const newNodes = nodes.map(n => {
              if (n.id === nodeId) {
                hasChanges = true;
                return { ...n, isLoading: true };
              }
              if (n.children) {
                const updatedChildren = updateNode(n.children);
                if (updatedChildren !== n.children) {
                  hasChanges = true;
                  return { ...n, children: updatedChildren };
                }
              }
              return n;
            });
            return hasChanges ? newNodes : nodes;
          };
          return updateNode(prevData);
        });

        try {
          // 建立连接
          await onConnectionToggle(connectionId);
          console.log(`✅ 连接建立成功，继续加载子节点: ${connectionId}`);
          // 连接建立后，继续加载子节点（不要 return）
        } catch (err) {
          console.error(`❌ 连接失败:`, err);
          // 清除 loading 状态
          // 优化：只为真正变化的节点创建新对象
          setTreeData(prevData => {
            const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
              let hasChanges = false;
              const newNodes = nodes.map(n => {
                if (n.id === nodeId) {
                  hasChanges = true;
                  return { ...n, isLoading: false };
                }
                if (n.children) {
                  const updatedChildren = updateNode(n.children);
                  if (updatedChildren !== n.children) {
                    hasChanges = true;
                    return { ...n, children: updatedChildren };
                  }
                }
                return n;
              });
              return hasChanges ? newNodes : nodes;
            };
            return updateNode(prevData);
          });
          return;
        }
      }
    }

    // 如果节点已经加载过（在缓存中），直接返回，让 react-arborist 处理展开/收起
    if (loadedNodes.has(nodeId)) {
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

    // 设置节点为 loading 状态
    setTreeData(prevData => {
      const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
        let hasChanges = false;
        const newNodes = nodes.map(n => {
          if (n.id === nodeId) {
            hasChanges = true;
            return { ...n, isLoading: true };
          }
          if (n.children) {
            const updatedChildren = updateNode(n.children);
            if (updatedChildren !== n.children) {
              hasChanges = true;
              return { ...n, children: updatedChildren };
            }
          }
          return n;
        });
        return hasChanges ? newNodes : nodes;
      };
      return updateNode(prevData);
    });

    try {
      // 获取连接 ID
      const connectionId = nodeData.metadata?.connectionId;
      if (!connectionId) {
        console.error('节点缺少 connectionId:', nodeData);
        // 清除 loading 状态
        setTreeData(prevData => {
          const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
            let hasChanges = false;
            const newNodes = nodes.map(n => {
              if (n.id === nodeId) {
                hasChanges = true;
                return { ...n, isLoading: false };
              }
              if (n.children) {
                const updatedChildren = updateNode(n.children);
                if (updatedChildren !== n.children) {
                  hasChanges = true;
                  return { ...n, children: updatedChildren };
                }
              }
              return n;
            });
            return hasChanges ? newNodes : nodes;
          };
          return updateNode(prevData);
        });
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
        const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
          let hasChanges = false;
          const newNodes = nodes.map(n => {
            if (n.id === nodeId) {
              hasChanges = true;
              return {
                ...n,
                children: convertedChildren,
                isLoading: false
              };
            }
            if (n.children) {
              const updatedChildren = updateNode(n.children);
              if (updatedChildren !== n.children) {
                hasChanges = true;
                return { ...n, children: updatedChildren };
              }
            }
            return n;
          });
          return hasChanges ? newNodes : nodes;
        };
        return updateNode(prevData);
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
      // 清除 loading 状态
      setTreeData(prevData => {
        const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
          let hasChanges = false;
          const newNodes = nodes.map(n => {
            if (n.id === nodeId) {
              hasChanges = true;
              return { ...n, isLoading: false, error: String(err) };
            }
            if (n.children) {
              const updatedChildren = updateNode(n.children);
              if (updatedChildren !== n.children) {
                hasChanges = true;
                return { ...n, children: updatedChildren };
              }
            }
            return n;
          });
          return hasChanges ? newNodes : nodes;
        };
        return updateNode(prevData);
      });
    }
  }, [loadedNodes, connections, connectionStatuses, databaseLoadingStates, connectionErrors, databaseErrors, isFavorite, onConnectionToggle]);

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

    // 检查数据库是否已打开（用于控制图标颜色）
    let isActivated = false;
    if (nodeType.includes('database') && isDatabaseOpenedFn && database) {
      isActivated = isDatabaseOpenedFn(connectionId, database);
      console.log(`🎨 数据库节点 ${database} 的 isActivated 状态: ${isActivated}`);
    }

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
      isActivated, // 设置 isActivated 状态
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

  // 初始加载 - 只在 connections 变化时重新加载
  useEffect(() => {
    console.log('🔄 [MultiConnectionTreeView] connections 变化，重新加载树');
    loadAllTreeNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

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

    console.log('🔄 [MultiConnectionTreeView] 连接状态发生变化，更新树节点');

    // 更新 ref
    prevConnectionStatusesRef.current = new Map(connectionStatuses);

    setTreeData(prevData => {
      let hasChanges = false;
      const newData = prevData.map(node => {
        if (node.nodeType === 'connection') {
          const connectionId = node.metadata?.connectionId;
          const status = connectionStatuses.get(connectionId);
          const error = connectionErrors?.get(connectionId);
          const isConnected = status === 'connected';
          const isLoading = status === 'connecting';

          console.log(`🔍 [MultiConnectionTreeView] 检查连接 ${connectionId}:`, {
            status,
            isConnected,
            'node.isConnected': node.isConnected,
            hasChildren: !!node.children
          });

          // 如果连接断开且有子节点，需要清除子节点
          if ((status === 'disconnected' || !isConnected) && node.children) {
            hasChanges = true;
            console.log(`🗑️ 连接断开，清除子节点: ${connectionId}`);

            // 保存节点数据到 ref，用于后续清除缓存
            const nodeId = `connection-${connectionId}`;
            disconnectedNodesRef.current.set(nodeId, node);

            return {
              ...node,
              isConnected,
              isLoading,
              error,
              children: undefined,
            };
          }

          // 检查是否有其他变化
          if (node.isConnected !== isConnected || node.isLoading !== isLoading || node.error !== error) {
            hasChanges = true;
            console.log(`🔄 [MultiConnectionTreeView] 连接状态变化: ${connectionId}, status: ${status}`);

            return {
              ...node,
              isConnected,
              isLoading,
              error,
            };
          }
        }
        return node;
      });

      if (hasChanges) {
        console.log('✅ [MultiConnectionTreeView] 树数据已更新');
      } else {
        console.log('⏭️ [MultiConnectionTreeView] 树数据无变化，跳过更新');
      }

      return hasChanges ? newData : prevData;
    });
  }, [connectionStatuses, connectionErrors]);

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

  // 监听 openedDatabasesList 的变化，更新数据库节点的 isActivated 状态
  useEffect(() => {
    if (!isDatabaseOpened || treeData.length === 0) return;

    console.log('🔄 [MultiConnectionTreeView] openedDatabasesList 变化，更新数据库节点状态', openedDatabasesList);
    console.log('🔄 [状态更新] 准备更新 treeData，当前节点数:', treeData.length);

    setTreeData(prevData => {
      console.log('🔄 [状态更新] setTreeData 回调执行，prevData 节点数:', prevData.length);
      let hasChanges = false;

      const updateNodeActivation = (nodes: TreeNodeData[]): TreeNodeData[] => {
        let arrayChanged = false;
        const newNodes = nodes.map(node => {
          // 只处理数据库节点
          if (node.nodeType === 'database' || node.nodeType === 'system_database') {
            const connectionId = node.metadata?.connectionId || '';
            const database = node.name;
            const isActivated = isDatabaseOpened(connectionId, database);

            // 检查 isActivated 状态是否变化
            if (node.isActivated !== isActivated) {
              hasChanges = true;
              arrayChanged = true;
              console.log(`🎨 [图标] 更新数据库节点 ${database} 的 isActivated: ${node.isActivated} -> ${isActivated}`);

              // 如果数据库被关闭，清除其子节点并清除缓存
              if (!isActivated && node.isActivated) {
                console.log(`🗑️ [MultiConnectionTreeView] 数据库关闭，清除子节点: ${database}`);

                // 清除该数据库节点及其所有子节点的缓存
                setLoadedNodes(prev => {
                  const newSet = new Set(prev);
                  clearNodeAndChildrenCache(node, newSet);
                  return newSet;
                });

                return {
                  ...node,
                  isActivated,
                  children: undefined, // 清除子节点
                };
              }

              return {
                ...node,
                isActivated,
                // 递归更新子节点
                children: node.children ? updateNodeActivation(node.children) : node.children
              };
            }
          }

          // 递归处理子节点
          if (node.children) {
            const updatedChildren = updateNodeActivation(node.children);
            if (updatedChildren !== node.children) {
              hasChanges = true;
              arrayChanged = true;
              return { ...node, children: updatedChildren };
            }
          }

          return node;
        });

        // 只有在数组真正有变化时才返回新数组，否则返回原数组
        return arrayChanged ? newNodes : nodes;
      };

      const newData = updateNodeActivation(prevData);

      if (hasChanges) {
        console.log('✅ [MultiConnectionTreeView] 数据库打开状态已更新');

        // 检查是否有需要自动展开的节点
        if (nodesToAutoExpandRef.current.size > 0) {
          console.log('🔓 [打开数据库] 检查需要自动展开的节点:', Array.from(nodesToAutoExpandRef.current));

          // 使用 setTimeout 确保状态更新完成后再展开节点
          setTimeout(() => {
            nodesToAutoExpandRef.current.forEach(nodeId => {
              const node = treeRef.current?.get(nodeId);
              if (node) {
                const nodeData = node.data as TreeNodeData;
                // 只展开已打开的数据库节点
                if (nodeData.isActivated && !node.isOpen) {
                  console.log(`🔓 [打开数据库] 自动展开节点: ${nodeId}`);
                  // 先展开节点，然后加载子节点
                  node.open();
                  // 如果子节点未加载，触发加载
                  if (nodeData.children === undefined && !loadedNodes.has(nodeId)) {
                    console.log(`🔓 [打开数据库] 触发子节点加载: ${nodeId}`);
                    handleToggle(nodeId);
                  }
                }
              }
            });
            // 清空待展开列表
            nodesToAutoExpandRef.current.clear();
          }, 100);
        }
      } else {
        console.log('⏭️ [MultiConnectionTreeView] 数据库打开状态无变化，跳过更新');
      }

      return hasChanges ? newData : prevData;
    });
  }, [openedDatabasesList, isDatabaseOpened, clearNodeAndChildrenCache, loadedNodes, handleToggle]); // 监听 openedDatabasesList 的变化

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
      console.log('🎨 [性能] filteredData 使用缓存，避免重新计算');
      return prevFilteredDataRef.current;
    }

    console.log('🎨 [性能] filteredData 重新计算', {
      treeDataChanged,
      searchValueChanged,
      treeDataLength: treeData.length,
      searchValue
    });

    prevTreeDataRef.current = treeData;
    prevSearchValueRef.current = searchValue;

    if (!searchValue.trim()) {
      prevFilteredDataRef.current = treeData;
      return treeData;
    }

    const filterNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.reduce((acc: TreeNodeData[], node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchValue.toLowerCase());
        const filteredChildren = node.children ? filterNodes(node.children) : [];

        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }

        return acc;
      }, []);
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
    if (lastActivateNodeRef.current === nodeId && now - lastActivateTimeRef.current < 300) {
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

      // 特殊处理：连接节点未连接时，先建立连接
      if (nodeType === 'connection' && !nodeData.isConnected) {
        console.log(`📂 双击未连接的连接节点，建立连接: ${nodeType}`);
        await handleToggle(node.id);
        return;
      }

      // 特殊处理：数据库节点
      if (nodeType === 'database' || nodeType === 'system_database') {
        // 如果数据库未打开，双击应该打开数据库
        if (!nodeData.isActivated) {
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

      // 其他容器节点：如果已加载子节点，直接切换展开/收起状态
      if (nodeData.children !== undefined) {
        console.log(`📂 双击已加载的容器节点，切换展开/收起: ${nodeType}`);
        node.toggle();
        return;
      }

      // 如果节点未加载子节点（children === undefined），调用 handleToggle 加载数据
      console.log(`📂 双击容器节点，加载子节点: ${nodeType}`);
      await handleToggle(node.id);
      return;
    }

    // 其他叶子节点：通知父组件
    console.log(`📄 双击叶子节点，通知父组件: ${nodeType}`);
    onNodeActivate?.(nodeData);
  }, [onNodeActivate, handleToggle]);

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
        width={width}
        height={height}
        indent={24}
        rowHeight={32}
        overscanCount={10}
        onSelect={handleSelect}
        onToggle={async (nodeId) => {
          const node = treeRef.current?.get(nodeId);
          if (!node) return;

          const nodeData = node.data as TreeNodeData;

          // 只在需要加载数据时调用 handleToggle
          // 如果节点已有 children（不是 undefined），让 react-arborist 自己处理展开/收起
          if (nodeData.children === undefined && !loadedNodes.has(nodeId)) {
            console.log('Tree onToggle - 需要加载数据:', nodeId);
            await handleToggle(nodeId);
          } else {
            console.log('Tree onToggle - 切换展开状态:', nodeId);
            // 让 react-arborist 自己处理展开/收起，不做任何操作
          }
        }}
        disableMultiSelection={true}
        disableEdit={true}
      >
        {(props) => (
          <div onContextMenu={(e) => handleContextMenu(props.node, e)}>
            <TreeNodeRenderer {...props} onNodeDoubleClick={handleNodeDoubleClick} />
          </div>
        )}
      </Tree>
    </div>
  );
};

// 自定义比较函数，用于 React.memo
const arePropsEqual = (
  prevProps: MultiConnectionTreeViewProps,
  nextProps: MultiConnectionTreeViewProps
): boolean => {
  // 比较基本 props
  if (
    prevProps.className !== nextProps.className ||
    prevProps.useVersionAwareFilter !== nextProps.useVersionAwareFilter ||
    prevProps.searchValue !== nextProps.searchValue
  ) {
    return false;
  }

  // 比较 connections 数组
  if (prevProps.connections.length !== nextProps.connections.length) {
    return false;
  }

  for (let i = 0; i < prevProps.connections.length; i++) {
    const prev = prevProps.connections[i];
    const next = nextProps.connections[i];
    if (
      prev.id !== next.id ||
      prev.name !== next.name ||
      prev.dbType !== next.dbType ||
      prev.isConnected !== next.isConnected
    ) {
      return false;
    }
  }

  // 比较 Map 对象（比较内容而不是引用）
  const compareMaps = (
    map1: Map<string, any> | undefined,
    map2: Map<string, any> | undefined
  ): boolean => {
    if (!map1 && !map2) return true;
    if (!map1 || !map2) return false;
    if (map1.size !== map2.size) return false;
    for (const [key, value] of map1) {
      if (map2.get(key) !== value) return false;
    }
    return true;
  };

  if (!compareMaps(prevProps.connectionStatuses, nextProps.connectionStatuses)) {
    return false;
  }
  if (!compareMaps(prevProps.databaseLoadingStates, nextProps.databaseLoadingStates)) {
    return false;
  }
  if (!compareMaps(prevProps.connectionErrors, nextProps.connectionErrors)) {
    return false;
  }
  if (!compareMaps(prevProps.databaseErrors, nextProps.databaseErrors)) {
    return false;
  }

  // 比较回调函数（引用比较）
  if (
    prevProps.onNodeSelect !== nextProps.onNodeSelect ||
    prevProps.onNodeActivate !== nextProps.onNodeActivate ||
    prevProps.onNodeContextMenu !== nextProps.onNodeContextMenu ||
    prevProps.onRefresh !== nextProps.onRefresh ||
    prevProps.onConnectionToggle !== nextProps.onConnectionToggle ||
    prevProps.isFavorite !== nextProps.isFavorite
  ) {
    return false;
  }

  return true;
};

// 使用 React.memo 避免不必要的重新渲染
export default React.memo(MultiConnectionTreeView, arePropsEqual);

