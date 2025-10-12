import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Tree, NodeApi } from 'react-arborist';
import { safeTauriInvoke } from '@/utils/tauri';
import { Loader2, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { TreeNodeRenderer, TreeNodeData } from './TreeNodeRenderer';
import { TreeNodeType } from '@/types/tree';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';
import useResizeObserver from 'use-resize-observer';

interface ArboristTreeViewProps {
  connectionId: string;
  className?: string;
  useVersionAwareFilter?: boolean;
  onNodeSelect?: (node: TreeNodeData | null) => void;
  onNodeActivate?: (node: TreeNodeData) => void;
  onNodeContextMenu?: (node: TreeNodeData, event: React.MouseEvent) => void;
}

export const ArboristTreeView: React.FC<ArboristTreeViewProps> = ({
  connectionId,
  className = '',
  useVersionAwareFilter = false,
  onNodeSelect,
  onNodeActivate,
  onNodeContextMenu,
}) => {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activatedNodeId, setActivatedNodeId] = useState<string | null>(null);
  const [databaseVersion, setDatabaseVersion] = useState<string>('');
  const [loadedNodes, setLoadedNodes] = useState<Set<string>>(new Set()); // 缓存已加载的节点
  const treeRef = useRef<any>(null);
  
  // 使用 resize observer 获取容器尺寸
  const { ref: containerRef, width = 300, height = 600 } = useResizeObserver();

  // 加载树节点
  const loadTreeNodes = useCallback(async (clearCache = false) => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);

    // 清除缓存
    if (clearCache) {
      console.log('🗑️ 清除节点缓存');
      setLoadedNodes(new Set());
    }

    try {
      // 检测数据库版本
      try {
        setDatabaseVersion('unknown');
      } catch (versionError) {
        console.warn('版本检测失败，使用默认版本:', versionError);
        setDatabaseVersion('Database-1.x');
      }

      // 获取连接信息
      const connection = await safeTauriInvoke<any>('get_connection', {
        connectionId,
      });

      // 获取树节点
      const nodes = await safeTauriInvoke<any[]>('get_tree_nodes', {
        connectionId,
      });

      // 转换为 React Arborist 格式
      const convertedNodes = nodes.map(node => convertToArboristFormat(node, connection));

      // 根据版本感知过滤设置决定是否过滤系统节点
      const filteredNodes = useVersionAwareFilter 
        ? convertedNodes.filter(node => filterSystemNodes(node, connection))
        : convertedNodes;

      setTreeData(filteredNodes);
    } catch (err) {
      console.error('加载数据源树失败:', err);
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, [connectionId, useVersionAwareFilter]);

  // 转换节点格式为 React Arborist 格式
  const convertToArboristFormat = (node: any, connection: any): TreeNodeData => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpandable = node.isExpandable || node.is_expandable || false;

    return {
      id: node.id,
      name: node.name,
      nodeType: node.nodeType || node.node_type,
      isSystem: node.isSystem || node.is_system || false,
      isLoading: node.isLoading || node.is_loading || false,
      metadata: node.metadata || {},
      dbType: connection?.dbType,
      isConnected: connection?.isConnected,
      // 如果有子节点,转换它们;如果可展开但没有子节点,设为 undefined 表示需要懒加载
      children: hasChildren
        ? node.children.map((child: any) => convertToArboristFormat(child, connection))
        : isExpandable
          ? undefined  // undefined 表示需要懒加载
          : [],        // 空数组表示叶子节点
    };
  };

  // 过滤系统节点
  const filterSystemNodes = (node: TreeNodeData, connection: any): boolean => {
    const nodeType = node.nodeType;
    const nodeName = node.name || node.id;
    const nodeCategory = node.metadata?.node_category;

    // 过滤掉管理功能节点
    if (
      nodeCategory === 'management_container' ||
      nodeCategory === 'info_container' ||
      ['function', 'trigger', 'system_info', 'version_info', 'schema_template'].includes(nodeType)
    ) {
      return false;
    }

    // InfluxDB: 过滤掉 _internal 等系统数据库
    if (
      connection?.dbType === 'influxdb' ||
      connection?.dbType === 'influxdb1' ||
      connection?.dbType === 'influxdb2'
    ) {
      if (nodeName.startsWith('_')) {
        return false;
      }
    }

    // IoTDB: 只显示存储组，过滤掉系统信息节点
    if (connection?.dbType === 'iotdb') {
      if (nodeType !== 'storage_group' && nodeType !== 'database') {
        return false;
      }
      if (
        nodeName.toLowerCase().includes('system') ||
        nodeName.toLowerCase().includes('information') ||
        nodeName.toLowerCase().includes('schema')
      ) {
        return false;
      }
    }

    return true;
  };

  // 初始加载
  useEffect(() => {
    if (connectionId) {
      loadTreeNodes();
    }
  }, [connectionId, loadTreeNodes]);

  // 处理节点选择
  const handleSelect = useCallback((nodes: NodeApi<TreeNodeData>[]) => {
    const selectedNode = nodes.length > 0 ? nodes[0].data : null;
    onNodeSelect?.(selectedNode);
  }, [onNodeSelect]);

  // 处理节点激活（双击）
  const handleActivate = useCallback((node: NodeApi<TreeNodeData>) => {
    setActivatedNodeId(node.id);
    onNodeActivate?.(node.data);
  }, [onNodeActivate]);

  // 处理右键菜单
  const handleContextMenu = useCallback((node: NodeApi<TreeNodeData>, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onNodeContextMenu?.(node.data, event);
  }, [onNodeContextMenu]);

  // 自定义搜索匹配
  const searchMatch = useCallback((node: NodeApi<TreeNodeData>, term: string) => {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();
    return (
      node.data.name.toLowerCase().includes(lowerTerm) ||
      node.data.nodeType.toLowerCase().includes(lowerTerm)
    );
  }, []);

  // 懒加载子节点
  const handleToggle = useCallback(async (nodeId: string) => {
    // 检查缓存,避免重复加载
    if (loadedNodes.has(nodeId)) {
      console.log(`📦 使用缓存: ${nodeId}`);
      return;
    }

    const findAndUpdateNode = async (nodes: TreeNodeData[]): Promise<TreeNodeData[]> => {
      return Promise.all(nodes.map(async (node) => {
        if (node.id === nodeId) {
          // 找到目标节点
          if (node.children === undefined) {
            // 需要懒加载
            console.log(`🔄 懒加载子节点: ${node.name} (${node.nodeType})`);

            try {
              // 设置加载状态
              node.isLoading = true;
              setTreeData([...treeData]); // 触发重新渲染

              // 调用 Tauri 后端获取子节点
              const children = await safeTauriInvoke<any[]>('get_tree_children', {
                connectionId,
                parentNodeId: node.id,
                nodeType: node.nodeType,
              });

              console.log(`✅ 成功加载 ${children.length} 个子节点`);

              // 获取连接信息用于转换
              const connection = await safeTauriInvoke<any>('get_connection', {
                connectionId,
              });

              // 转换为 React Arborist 格式
              const convertedChildren = children.map(child => convertToArboristFormat(child, connection));

              // 过滤系统节点
              const filteredChildren = useVersionAwareFilter
                ? convertedChildren.filter(child => filterSystemNodes(child, connection))
                : convertedChildren;

              // 添加到缓存
              setLoadedNodes(prev => new Set([...prev, nodeId]));

              // 更新节点
              return {
                ...node,
                isLoading: false,
                children: filteredChildren,
              };
            } catch (error) {
              console.error('加载子节点失败:', error);
              return {
                ...node,
                isLoading: false,
                children: [],
              };
            }
          }
        } else if (node.children && node.children.length > 0) {
          // 递归查找子节点
          return {
            ...node,
            children: await findAndUpdateNode(node.children),
          };
        }
        return node;
      }));
    };

    const updatedData = await findAndUpdateNode(treeData);
    setTreeData(updatedData);
  }, [connectionId, treeData, useVersionAwareFilter, loadedNodes]);

  if (loading && treeData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">加载数据源树...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-destructive text-sm mb-2">加载失败: {error}</div>
          <Button onClick={() => loadTreeNodes(true)} size="sm" variant="outline" className="w-full">
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
            {loadedNodes.size > 0 && (
              <Badge variant="secondary" className="text-xs" title="已缓存节点数">
                📦 {loadedNodes.size}
              </Badge>
            )}
            <Button
              onClick={() => loadTreeNodes(true)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              disabled={loading}
              title="刷新并清除缓存"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* 搜索框 */}
        <Input
          placeholder="搜索节点..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-2"
        />
      </CardHeader>
      
      <CardContent className="pt-0 pb-2" ref={containerRef}>
        {treeData.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-4">暂无数据</div>
        ) : (
          <Tree
            ref={treeRef}
            data={treeData}
            width={width}
            height={Math.max(height - 120, 400)}
            indent={20}
            rowHeight={32}
            overscanCount={10}
            searchTerm={searchTerm}
            searchMatch={searchMatch}
            onSelect={handleSelect}
            onActivate={handleActivate}
            onToggle={(id) => handleToggle(id)}
            openByDefault={false}
            disableDrag={true}
            disableEdit={true}
            className="arborist-tree"
          >
            {TreeNodeRenderer}
          </Tree>
        )}
      </CardContent>
    </Card>
  );
};

export default ArboristTreeView;

