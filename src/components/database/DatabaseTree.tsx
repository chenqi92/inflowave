import React, { useState, useEffect, useCallback } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { ChevronRight, ChevronDown, Loader2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { TreeNode, TreeNodeType, TreeNodeStyles, TreeNodeDescriptions, isSystemNode, TreeNodeUtils } from '@/types/tree';
import { DatabaseIcon, isOpenableNode } from '@/components/common/DatabaseIcon';
import { useConnection } from '@/hooks/useConnection';

interface DatabaseTreeProps {
  connectionId: string;
  onNodeSelect?: (node: TreeNode) => void;
  onNodeDoubleClick?: (node: TreeNode) => void;
  className?: string;
}

export const DatabaseTree: React.FC<DatabaseTreeProps> = ({
  connectionId,
  onNodeSelect,
  onNodeDoubleClick,
  className = '',
}) => {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showSystemNodes, setShowSystemNodes] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 获取连接信息
  const { connections } = useConnection();
  const connection = connections.find(conn => conn.id === connectionId);

  // 获取数据库类型和版本
  const dbType = connection?.dbType || 'influxdb';
  const dbVersion = connection?.version || '1.x';

  // 调试信息
  console.log(`DatabaseTree: connectionId=${connectionId}, dbType=${dbType}, dbVersion=${dbVersion}, connection=`, connection);

  // 加载树节点
  const loadTreeNodes = useCallback(async (forceRefresh = false) => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🌳 加载数据源树节点: ${connectionId}${forceRefresh ? ' (强制刷新)' : ''}`);

      const nodes: TreeNode[] = await safeTauriInvoke('get_tree_nodes', {
        connectionId,
      });

      console.log(`✅ 获取到 ${nodes.length} 个树节点:`, nodes.map(n => `${n.name} (${n.nodeType})`));
      setTreeNodes(nodes);

      // 自动展开第一级节点
      const firstLevelIds = nodes.map(node => node.id);
      setExpandedNodes(new Set(firstLevelIds));
    } catch (err) {
      console.error('加载数据源树失败:', err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  // 懒加载子节点
  const loadChildren = useCallback(async (parentNode: TreeNode) => {
    if (parentNode.isLeaf || parentNode.children.length > 0) return;

    try {
      // 设置加载状态
      setTreeNodes(prevNodes => 
        updateNodeInTree(prevNodes, parentNode.id, { isLoading: true })
      );

      const children: TreeNode[] = await safeTauriInvoke('get_tree_children', {
        connectionId,
        parentNodeId: parentNode.id,
        nodeType: parentNode.nodeType,
      });

      // 更新节点的子节点
      setTreeNodes(prevNodes => 
        updateNodeInTree(prevNodes, parentNode.id, { 
          children,
          isLoading: false,
          isExpanded: true 
        })
      );

      // 添加到展开节点集合
      setExpandedNodes(prev => new Set([...prev, parentNode.id]));
    } catch (err) {
      console.error('加载子节点失败:', err);
      setTreeNodes(prevNodes => 
        updateNodeInTree(prevNodes, parentNode.id, { isLoading: false })
      );
    }
  }, [connectionId]);

  // 更新树中的节点
  const updateNodeInTree = (
    nodes: TreeNode[], 
    nodeId: string, 
    updates: Partial<TreeNode>
  ): TreeNode[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, ...updates };
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateNodeInTree(node.children, nodeId, updates)
        };
      }
      return node;
    });
  };

  // 切换节点展开状态
  const toggleNodeExpansion = useCallback(async (node: TreeNode) => {
    const isExpanded = expandedNodes.has(node.id);

    if (!isExpanded && node.isExpandable) {
      // 展开节点
      if (node.children.length === 0) {
        // 懒加载子节点
        await loadChildren(node);
      } else {
        setExpandedNodes(prev => new Set([...prev, node.id]));
      }
    } else {
      // 折叠节点
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(node.id);
        return newSet;
      });
    }
  }, [expandedNodes, loadChildren]);

  // 处理节点点击
  const handleNodeClick = useCallback((node: TreeNode) => {
    setSelectedNodeId(node.id);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  // 处理节点双击
  const handleNodeDoubleClick = useCallback((node: TreeNode) => {
    onNodeDoubleClick?.(node);
    if (node.isExpandable) {
      toggleNodeExpansion(node);
    }
  }, [onNodeDoubleClick, toggleNodeExpansion]);

  // 初始加载
  useEffect(() => {
    loadTreeNodes();
  }, [loadTreeNodes]);



  // 渲染树节点
  const renderTreeNode = (node: TreeNode, level = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children.length > 0 || node.isExpandable;
    const styleClass = TreeNodeStyles[node.nodeType] || '';

    const nodeDescription = TreeNodeDescriptions[node.nodeType] || '数据节点';

    return (
      <div key={node.id} className="select-none">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`
                  flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded
                  ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}
                  ${isSystemNode(node) ? 'opacity-75' : ''}
                `}
                style={{ paddingLeft: `${level * 20 + 8}px` }}
                onClick={() => handleNodeClick(node)}
                onDoubleClick={() => handleNodeDoubleClick(node)}
              >
                {/* 展开/折叠图标 */}
                <div className="w-4 h-4 flex items-center justify-center mr-1">
                  {hasChildren && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNodeExpansion(node);
                      }}
                      className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5"
                    >
                      {node.isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                {/* 节点图标 */}
                <div className="mr-2 flex items-center justify-center" style={{ height: '20px' }}>
                  <DatabaseIcon
                    nodeType={node.nodeType}
                    size={16}
                    className="flex-shrink-0"
                    dbType={dbType}
                    dbVersion={dbVersion}
                    isConnected={true}
                    isOpen={isOpenableNode(node.nodeType) && isExpanded}
                  />
                </div>

                {/* 节点名称 */}
                <span className={`text-sm truncate ${styleClass}`}>
                  {node.name}
                </span>

                {/* 系统节点标识 */}
                {isSystemNode(node) && (
                  <span className="ml-2 text-xs text-gray-500 italic">system</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <div className="font-medium">{node.name}</div>
                <div className="text-sm text-muted-foreground">{nodeDescription}</div>
                {node.metadata && Object.keys(node.metadata).length > 0 && (
                  <div className="text-xs text-muted-foreground border-t pt-1">
                    {Object.entries(node.metadata).slice(0, 3).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 子节点 */}
        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 过滤节点（根据是否显示系统节点）
  const filteredNodes = showSystemNodes 
    ? treeNodes 
    : TreeNodeUtils.filterSystemNodes(treeNodes, false);

  if (loading && treeNodes.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm text-gray-600">加载数据源树...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600 text-sm mb-2">加载失败: {error}</div>
        <Button
          onClick={() => loadTreeNodes()}
          size="sm"
          variant="outline"
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          数据源
        </span>
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowSystemNodes(!showSystemNodes)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  {showSystemNodes ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showSystemNodes ? '隐藏系统节点' : '显示系统节点'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => loadTreeNodes(true)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  disabled={loading}
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 树内容 */}
      <div className="flex-1 overflow-auto">
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {showSystemNodes ? '暂无数据' : '暂无数据（系统节点已隐藏）'}
          </div>
        ) : (
          <div className="p-2">
            {filteredNodes.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseTree;
