import React, { useState, useEffect } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { ChevronRight, ChevronDown, Database, Loader2, RefreshCw } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getNodeStyle, normalizeNodeType, getIoTDBNodeBehavior } from '@/types/tree';
import { DatabaseIcon } from '@/components/common/DatabaseIcon';
import type { TreeNodeType } from '@/types/tree';

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
  // 添加双击激活状态
  isActivated?: boolean;
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
  const [activatedNodeId, setActivatedNodeId] = useState<string | null>(null);
  const [databaseVersion, setDatabaseVersion] = useState<string>('');

  // 加载树节点
  const loadTreeNodes = async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);

    try {
      // 检测数据库版本
      try {
        const versionInfo = await safeTauriInvoke<{version: string, type: string}>('detect_database_version', {
          connectionId,
        });
        setDatabaseVersion(`${versionInfo.type}-${versionInfo.version}`);
      } catch (versionError) {
        console.warn('版本检测失败，使用默认版本:', versionError);
        setDatabaseVersion('Database-1.x');
      }

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

  // 处理节点双击激活
  const handleNodeDoubleClick = (node: TreeNode) => {
    // 获取节点元数据和行为配置
    const isContainer = node.metadata?.is_container === true;
    const normalizedNodeType = normalizeNodeType(node.nodeType) as TreeNodeType;
    const behaviorConfig = getIoTDBNodeBehavior(normalizedNodeType, isContainer);

    // 根据节点行为配置决定双击行为
    if (behaviorConfig.canDoubleClick) {
      // 数据节点：打开查询标签页
      console.log(`双击数据节点: ${node.name}, 类型: ${node.nodeType}, 分类: ${node.metadata?.node_category}`);
      // TODO: 实现打开查询标签页的逻辑
      setActivatedNodeId(activatedNodeId === node.id ? null : node.id);
    } else if (behaviorConfig.canExpand) {
      // 容器节点：切换展开状态
      toggleNode(node.id);
    } else {
      // 其他节点：仅选中，不执行特殊操作
      console.log(`双击非数据节点: ${node.name}, 类型: ${node.nodeType}, 不支持查询`);
    }
  };

  // 处理节点右键菜单
  const handleNodeContextMenu = (node: TreeNode, event: React.MouseEvent) => {
    event.preventDefault();

    // 获取节点元数据和行为配置
    const isContainer = node.metadata?.is_container === true;
    const normalizedNodeType = normalizeNodeType(node.nodeType) as TreeNodeType;
    const behaviorConfig = getIoTDBNodeBehavior(normalizedNodeType, isContainer);

    console.log(`右键菜单: ${node.name}, 类型: ${behaviorConfig.contextMenuType}, 描述: ${behaviorConfig.description}`);

    // TODO: 根据 contextMenuType 显示不同的右键菜单
    // - 'data': 数据相关操作（查询、导出等）
    // - 'management': 管理操作（编辑、删除等）
    // - 'info': 信息操作（查看详情、复制等）
    // - 'container': 容器操作（刷新、展开全部等）
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
    const isActivated = activatedNodeId === node.id;

    // 获取节点元数据
    const isContainer = node.metadata?.is_container === true;
    const nodeCategory = node.metadata?.node_category as string;

    // 根据节点行为配置决定是否显示展开按钮
    const normalizedNodeType = normalizeNodeType(node.nodeType) as TreeNodeType;
    const behaviorConfig = getIoTDBNodeBehavior(normalizedNodeType, isContainer);
    const hasChildren = behaviorConfig.canExpand && node.isExpandable;



    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded
            ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''}
            ${node.isSystem ? 'opacity-75' : ''}
            ${isActivated ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => handleNodeClick(node)}
          onDoubleClick={() => handleNodeDoubleClick(node)}
          onContextMenu={(e) => handleNodeContextMenu(node, e)}
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
          <div className="mr-2 flex items-center justify-center w-4 h-4">
            <DatabaseIcon
              nodeType={normalizedNodeType}
              isOpen={isActivated || node.isExpanded}
              size={16}
              className="flex-shrink-0"
              title={`${node.name} (${normalizedNodeType}) - ${isActivated ? '激活' : '未激活'} - ${node.isExpanded ? '展开' : '折叠'}`}
            />
          </div>

          {/* 节点名称 */}
          <span className={`text-sm truncate flex items-center ${getNodeStyle(node.nodeType, node.isSystem)}`}>
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
