import React, { useState, useEffect } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { ChevronRight, ChevronDown, Database, Loader2, RefreshCw } from 'lucide-react';
import { Button,Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TreeNode {
  id: string;
  name: string;
  nodeType: string;
  parentId?: string;
  children: TreeNode[];
  isLeaf: boolean;
  isSystem: boolean;
  isExpandable: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  metadata: Record<string, any>;
}

interface SimpleTreeViewProps {
  connectionId: string;
  className?: string;
}

export const SimpleTreeView: React.FC<SimpleTreeViewProps> = ({
  connectionId,
  className = '',
}) => {
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [databaseVersion, setDatabaseVersion] = useState<string>('');

  // 加载树节点
  const loadTreeNodes = async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);

    try {
      // 暂时跳过版本检测，直接设置默认版本
      // TODO: 实现版本检测 API 调用
      setDatabaseVersion('Database-1.x');

      // 获取树节点
      const nodes = await safeTauriInvoke<TreeNode[]>('get_tree_nodes', {
        connectionId,
      });
      setTreeNodes(nodes);
    } catch (err) {
      console.error('加载数据源树失败:', err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  // 展开/折叠节点
  const toggleNode = async (nodeId: string) => {
    const node = treeNodes.find(n => n.id === nodeId);
    if (!node) return;

    // 如果节点已展开，直接折叠
    if (node.isExpanded) {
      setTreeNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === nodeId
            ? { ...n, isExpanded: false }
            : n
        )
      );
      return;
    }

    // 如果节点未展开且没有子节点，需要懒加载
    if (!node.isExpanded && node.children.length === 0 && node.isExpandable) {
      try {
        // 设置加载状态
        setTreeNodes(prevNodes =>
          prevNodes.map(n =>
            n.id === nodeId
              ? { ...n, isLoading: true }
              : n
          )
        );

        // 获取子节点
        const children = await safeTauriInvoke<TreeNode[]>('get_tree_children', {
          connectionId,
          parentNodeId: nodeId,
          nodeType: node.nodeType,
        });

        // 更新节点状态
        setTreeNodes(prevNodes =>
          prevNodes.map(n =>
            n.id === nodeId
              ? { ...n, isExpanded: true, isLoading: false, children }
              : n
          )
        );
      } catch (error) {
        console.error('加载子节点失败:', error);
        // 清除加载状态
        setTreeNodes(prevNodes =>
          prevNodes.map(n =>
            n.id === nodeId
              ? { ...n, isLoading: false }
              : n
          )
        );
      }
    } else {
      // 直接展开已有子节点的节点
      setTreeNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === nodeId
            ? { ...n, isExpanded: true }
            : n
        )
      );
    }
  };

  // 处理节点点击
  const handleNodeClick = (node: TreeNode) => {
    setSelectedNodeId(node.id);
  };

  // 初始加载
  useEffect(() => {
    if (connectionId) {
      loadTreeNodes();
    }
  }, [connectionId]);

  // 渲染树节点
  const renderTreeNode = (node: TreeNode, level = 0): React.ReactNode => {
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children.length > 0 || node.isExpandable;

    // 根据节点类型选择图标
    const getNodeIcon = (nodeType: string) => {
      switch (nodeType) {
        case 'Database':
        case 'SystemDatabase':
          return '💾';
        case 'StorageGroup':
          return '🏢';
        case 'RetentionPolicy':
          return '📅';
        case 'Device':
          return '📱';
        case 'Measurement':
          return '📊';
        case 'Timeseries':
          return '📈';
        case 'Field':
          return '📊';
        case 'Tag':
          return '🏷️';
        default:
          return '📄';
      }
    };

    // 根据节点类型选择样式
    const getNodeStyle = (nodeType: string, isSystem: boolean) => {
      if (isSystem) {
        return 'text-orange-600 italic';
      }
      switch (nodeType) {
        case 'Database':
          return 'text-green-600';
        case 'StorageGroup':
          return 'text-emerald-600';
        case 'RetentionPolicy':
          return 'text-purple-600';
        case 'Device':
          return 'text-blue-500';
        case 'Measurement':
          return 'text-green-500';
        case 'Timeseries':
          return 'text-teal-600';
        case 'Field':
          return 'text-blue-600';
        case 'Tag':
          return 'text-yellow-600';
        default:
          return 'text-gray-700';
      }
    };

    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded
            ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}
            ${node.isSystem ? 'opacity-75' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {/* 展开/折叠图标 */}
          <div
            className="w-4 h-4 flex items-center justify-center mr-1"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleNode(node.id);
              }
            }}
          >
            {hasChildren && (
              <div className="w-3 h-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer">
                {node.isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : node.isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            )}
          </div>

          {/* 节点图标 */}
          <span className="mr-2 text-sm">{getNodeIcon(node.nodeType)}</span>

          {/* 节点名称 */}
          <span className={`text-sm truncate ${getNodeStyle(node.nodeType, node.isSystem)}`}>
            {node.name}
          </span>

          {/* 系统节点标识 */}
          {node.isSystem && (
            <span className="ml-2 text-xs text-gray-500 italic">system</span>
          )}
        </div>

        {/* 子节点 */}
        {node.isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && treeNodes.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm text-gray-600">加载数据源树...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-red-600 text-sm mb-2">加载失败: {error}</div>
          <Button
            onClick={loadTreeNodes}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Database className="w-5 h-5 mr-2" />
            数据源
          </CardTitle>
          <div className="flex items-center space-x-2">
            {databaseVersion && (
              <Badge variant="outline" className="text-xs">
                {databaseVersion}
              </Badge>
            )}
            <Button
              onClick={loadTreeNodes}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {treeNodes.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            暂无数据
          </div>
        ) : (
          <div className="space-y-1">
            {treeNodes.map(node => renderTreeNode(node))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleTreeView;
