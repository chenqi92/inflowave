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
}) => {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedNodes, setLoadedNodes] = useState<Set<string>>(new Set());
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<TreeNodeData | null>(null);
  const treeRef = useRef<any>(null);

  // 防止双击重复触发
  const lastActivateTimeRef = useRef<number>(0);
  const lastActivateNodeRef = useRef<string>('');

  // 使用 resize observer 获取容器尺寸
  const { ref: containerRef, width = 300, height = 600 } = useResizeObserver();

  // 加载所有连接的树节点
  const loadAllTreeNodes = useCallback(async (clearCache = false) => {
    if (connections.length === 0) {
      setTreeData([]);
      return;
    }

    setLoading(true);
    setError(null);

    // 清除缓存
    if (clearCache) {
      console.log('🗑️ 清除节点缓存');
      setLoadedNodes(new Set());
    }

    try {
      // 只在初始化或强制刷新时创建新节点
      // 否则更新现有节点的状态，保留 children
      setTreeData(prevData => {
        const allNodes: TreeNodeData[] = [];

        for (const connection of connections) {
          const connectionId = connection.id;
          const status = connectionStatuses?.get(connectionId);
          const error = connectionErrors?.get(connectionId);
          const nodeId = `connection-${connection.id}`;

          // 查找现有节点
          const existingNode = prevData.find(n => n.id === nodeId);

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
            // 保留现有的 children，除非是强制刷新
            children: clearCache ? undefined : (existingNode?.children ?? undefined),
          };

          allNodes.push(connectionNode);
        }

        return allNodes;
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
        setTreeData(prevData => {
          const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
            return nodes.map(n => {
              if (n.id === nodeId) {
                return { ...n, isLoading: true };
              }
              if (n.children) {
                return { ...n, children: updateNode(n.children) };
              }
              return n;
            });
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
          setTreeData(prevData => {
            const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
              return nodes.map(n => {
                if (n.id === nodeId) {
                  return { ...n, isLoading: false };
                }
                if (n.children) {
                  return { ...n, children: updateNode(n.children) };
                }
                return n;
              });
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
        convertToArboristFormat(child, connection, connectionId)
      );

      // 一次性更新节点数据，避免多次 setTreeData 调用
      setTreeData(prevData => {
        const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
          return nodes.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                children: convertedChildren,
                isLoading: false
              };
            }
            if (n.children) {
              return { ...n, children: updateNode(n.children) };
            }
            return n;
          });
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
    }
  }, [loadedNodes, connections, connectionStatuses, databaseLoadingStates, connectionErrors, databaseErrors, isFavorite, onConnectionToggle]);

  // 转换节点格式为 React Arborist 格式
  const convertToArboristFormat = (node: any, connection: any, connectionId: string): TreeNodeData => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpandable = node.isExpandable || node.is_expandable || node.metadata?.is_container || false;
    const nodeType = node.nodeType || node.node_type;

    // 获取节点状态
    const nodeId = node.id;
    const database = node.metadata?.database || node.metadata?.databaseName || '';
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
      // 如果有子节点，直接设置；如果可展开但没有子节点，设置为 undefined 表示需要懒加载
      children: hasChildren
        ? node.children.map((child: any) => convertToArboristFormat(child, connection, connectionId))
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
    loadAllTreeNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

  // 监听连接状态变化，更新节点状态（不重新加载整个树）
  useEffect(() => {
    if (!connectionStatuses) return;

    setTreeData(prevData => {
      let hasChanges = false;
      const newData = prevData.map(node => {
        if (node.nodeType === 'connection') {
          const connectionId = node.metadata?.connectionId;
          const status = connectionStatuses.get(connectionId);
          const error = connectionErrors?.get(connectionId);
          const isConnected = status === 'connected';
          const isLoading = status === 'connecting';

          // 检查是否有变化
          if (node.isConnected !== isConnected || node.isLoading !== isLoading || node.error !== error) {
            hasChanges = true;

            // 如果连接断开，清除子节点
            if (status === 'disconnected') {
              console.log(`🗑️ 连接断开，清除子节点: ${connectionId}`);
              return {
                ...node,
                isConnected,
                isLoading,
                error,
                children: undefined,
              };
            }

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

      return hasChanges ? newData : prevData;
    });

    // 清除断开连接的缓存
    connectionStatuses.forEach((status, connectionId) => {
      const nodeId = `connection-${connectionId}`;
      if (status === 'disconnected' && loadedNodes.has(nodeId)) {
        console.log(`🗑️ 连接断开，清除缓存: ${nodeId}`);
        setLoadedNodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      }
    });
  }, [connectionStatuses, connectionErrors, loadedNodes]);

  // 搜索过滤
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return treeData;

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

    return filterNodes(treeData);
  }, [treeData, searchValue]);

  // 处理节点选择
  const handleSelect = useCallback((nodes: NodeApi<TreeNodeData>[]) => {
    const selected = nodes.length > 0 ? nodes[0].data : null;
    setSelectedNode(selected);
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
        console.log(`📂 双击容器节点，加载子节点: ${nodeType}`);
        await handleToggle(node.id);
        return;
      }

      // 如果节点已加载子节点（children !== undefined），直接切换展开/收起状态
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

  if (loading && treeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
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

export default MultiConnectionTreeView;

