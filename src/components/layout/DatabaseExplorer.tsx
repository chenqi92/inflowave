import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Input, Tabs, TabsList, TabsTrigger, TabsContent, Button, Space, Tooltip, Dropdown, Badge, Spin, Alert, Typography } from '@/components/ui';
import { Database, Table, RefreshCw, Settings, FileText, File, Hash, Tags, Key, Clock, Link, Search as SearchIcon, MoreHorizontal, Code, GitBranch } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';

// Note: Using Input directly for search functionality
// Note: Using TabsContent instead of TabPane

interface DataNode {
  key: string | number;
  title: React.ReactNode;
  children?: DataNode[];
  icon?: React.ReactNode;
  isLeaf?: boolean;
  disabled?: boolean;
  selectable?: boolean;
  checkable?: boolean;
}

interface MenuProps {
  items?: Array<{
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }>;
}

interface DatabaseExplorerProps {
  collapsed?: boolean;
  refreshTrigger?: number; // 用于触发刷新
}

interface TableInfo {
  name: string;
  tags: string[];
  fields: Array<{ name: string; type: string }>;
}

interface DatabaseInfo {
  name: string;
  tables: TableInfo[];
}

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({ collapsed = false, refreshTrigger }) => {
  const { connections, activeConnectionId, connectedConnectionIds, getConnection, connectToDatabase, disconnectFromDatabase, getConnectionStatus, isConnectionConnected } = useConnectionStore();
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  const activeConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

  // 加载指定连接的数据库列表
  const loadDatabases = useCallback(async (connectionId: string): Promise<string[]> => {
    console.log(`🔍 开始加载连接 ${connectionId} 的数据库列表...`);
    try {
      // 首先验证连接是否在后端存在
      const backendConnections = await safeTauriInvoke<any[]>('get_connections');
      const backendConnection = backendConnections?.find((c: any) => c.id === connectionId);
      
      if (!backendConnection) {
        console.warn(`⚠️ 连接 ${connectionId} 在后端不存在，尝试重新创建...`);
        
        // 从前端获取连接配置
        const connection = getConnection(connectionId);
        if (connection) {
          try {
            // 重新创建连接到后端
            const connectionWithTimestamp = {
              ...connection,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            const newConnectionId = await safeTauriInvoke<string>('create_connection', { config: connectionWithTimestamp });
            console.log(`✨ 连接已重新创建，新ID: ${newConnectionId}`);
            
            // 如果ID发生变化，需要通知用户
            if (newConnectionId !== connectionId) {
              showMessage.warning('连接配置已重新同步，请刷新页面或重新选择连接');
              return [];
            }
          } catch (createError) {
            console.error(`❌ 重新创建连接失败:`, createError);
            showMessage.error(`连接 ${connectionId} 不存在且重新创建失败`);
            return [];
          }
        } else {
          console.error(`❌ 前端也没有找到连接 ${connectionId} 的配置`);
          showMessage.error(`连接配置不存在: ${connectionId}`);
          return [];
        }
      }

      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: connectionId});
      console.log(`✅ 成功加载数据库列表:`, dbList);
      return dbList || [];
    } catch (error) {
      console.error(`❌ 加载连接 ${connectionId} 的数据库失败:`, error);
      
      // 如果是连接不存在的错误，显示更友好的消息
      const errorStr = String(error);
      if (errorStr.includes('连接') && errorStr.includes('不存在')) {
        showMessage.error(`连接不存在，请检查连接配置: ${connectionId}`);
      } else {
        showMessage.error(`加载数据库列表失败: ${error}`);
      }
      return [];
    }
  }, [getConnection]);

  // 加载指定数据库的表列表
  const loadTables = useCallback(async (connectionId: string, database: string): Promise<string[]> => {
    console.log(`🔍 开始加载数据库 "${database}" 的表列表...`);
    try {
      // 验证连接是否存在（简化版，因为loadDatabases已经做过验证）
      const tables = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId: connectionId,
        database});
      console.log(`✅ 成功加载表列表 (数据库: ${database}):`, tables);
      return tables || [];
    } catch (error) {
      console.error(`❌ 加载数据库 ${database} 的表失败:`, error);
      
      // 如果是连接不存在的错误，显示友好消息
      const errorStr = String(error);
      if (errorStr.includes('连接') && errorStr.includes('不存在')) {
        showMessage.error(`连接不存在，无法加载数据库 ${database} 的表列表`);
      }
      return [];
    }
  }, []);

  // 加载指定表的字段和标签信息
  const loadTableSchema = useCallback(async (connectionId: string, database: string, table: string): Promise<{ tags: string[]; fields: Array<{ name: string; type: string }> }> => {
    try {
      // 尝试分别获取字段和标签信息
      const [tags, fields] = await Promise.all([
        safeTauriInvoke<string[]>('get_tag_keys', {
          connectionId: connectionId,
          database,
          measurement: table}).catch(() => []),
        safeTauriInvoke<string[]>('get_field_keys', {
          connectionId: connectionId,
          database,
          measurement: table}).catch(() => []),
      ]);

      // 将字段转换为带类型的格式
      const fieldsWithType = fields.map(fieldName => ({
        name: fieldName,
        type: 'float' // 默认类型，因为 InfluxDB 字段类型需要额外查询
      }));

      return { tags: tags || [], fields: fieldsWithType };
    } catch (error) {
      console.error(`加载表 ${table} 的架构失败:`, error);
      
      // 如果是连接不存在的错误，显示友好消息
      const errorStr = String(error);
      if (errorStr.includes('连接') && errorStr.includes('不存在')) {
        showMessage.error(`连接不存在，无法加载表 ${table} 的架构`);
      }
      return { tags: [], fields: [] };
    }
  }, []);

  // 获取连接状态指示器颜色
  const getConnectionStatusColor = (connectionId: string) => {
    const status = getConnectionStatus(connectionId);
    const isConnected = isConnectionConnected(connectionId);
    
    if (status?.status === 'error') return 'bg-red-500';
    if (isConnected && status?.status === 'connected') return 'bg-green-500';
    if (status?.status === 'connecting') return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  // 构建完整的树形数据
  const buildCompleteTreeData = useCallback(async () => {
    console.log(`🏗️ 开始构建树形数据，已连接: [${connectedConnectionIds.join(', ')}]`);
    setLoading(true);
    const treeNodes: DataNode[] = [];

    for (const connection of connections) {
      const isConnected = isConnectionConnected(connection.id);
      const connectionNode: DataNode = {
        title: (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getConnectionStatusColor(connection.id)}`} />
            <span className="flex-1">{connection.name}</span>
          </div>
        ),
        key: `connection-${connection.id}`,
        icon: <Link className="w-4 h-4 text-primary"   />,
        children: []};

      // 为已连接的连接加载数据库
      if (isConnected && connection.id) {
        console.log(`🔗 处理已连接: ${connection.name} (${connection.id})`);
        try {
          const databases = await loadDatabases(connection.id);
          console.log(`📁 为连接 ${connection.name} 创建 ${databases.length} 个数据库节点`);
          connectionNode.children = databases.map(db => ({
            title: (
              <span className="flex items-center">
                {db}
              </span>
            ),
            key: `database-${connection.id}-${db}`,
            icon: <Database className="w-4 h-4 text-purple-600"   />,
            isLeaf: false,
            children: [], // 空数组表示有子节点但未加载
            // 延迟加载表数据
          }));
        } catch (error) {
          console.error('❌ 加载数据库失败:', error);
        }
      } else {
        console.log(`⏭️ 跳过未连接: ${connection.name}`);
      }

      treeNodes.push(connectionNode);
    }

    console.log(`🌳 树形数据构建完成，共 ${treeNodes.length} 个根节点`);
    setTreeData(treeNodes);
    setLoading(false);
  }, [connections, connectedConnectionIds, isConnectionConnected, getConnectionStatus, loadDatabases]);

  // 动态加载节点数据
  const loadData = useCallback(async (node: any): Promise<void> => {
    const { key } = node;
    console.log(`🔄 开始动态加载节点: ${key}`);
    
    if (loadingNodes.has(key)) {
      console.log(`⏳ 节点 ${key} 正在加载中，跳过`);
      return;
    }
    
    setLoadingNodes(prev => new Set(prev).add(key));

    try {
      if (key.startsWith('database-')) {
        // 加载表列表
        const [, connectionId, database] = key.split('-', 3);
        console.log(`📋 加载数据库表列表: connectionId=${connectionId}, database=${database}`);
        const tables = await loadTables(connectionId, database);
        
        const tableNodes: DataNode[] = tables.map(table => ({
          title: (
            <div className="flex items-center gap-2">
              <span className="flex-1">{table}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">表</span>
            </div>
          ),
          key: `table-${connectionId}-${database}-${table}`,
          icon: <Table className="w-4 h-4 text-success"   />,
          isLeaf: false,
          children: [] // 空数组表示有子节点但未加载
        }));

        // 更新树数据
        setTreeData(prevData => {
          const updateNode = (nodes: DataNode[]): DataNode[] => {
            return nodes.map(node => {
              if (node.key === key) {
                return { ...node, children: tableNodes };
              }
              if (node.children) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          };
          return updateNode(prevData);
        });
      } else if (key.startsWith('table-')) {
        // 加载表的字段和标签
        const [, connectionId, database, table] = key.split('-', 4);
        const { tags, fields } = await loadTableSchema(connectionId, database, table);
        
        const children: DataNode[] = [];
        
        // 直接添加标签列
        tags.forEach(tag => {
          children.push({
            title: (
              <div className="flex items-center gap-2">
                <span className="flex-1">{tag}</span>
                <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded flex-shrink-0">
                  Tag
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">string</span>
              </div>
            ),
            key: `tag-${connectionId}-${database}-${table}-${tag}`,
            icon: <Tags className="w-4 h-4 text-orange-500"   />,
            isLeaf: true});
        });
        
        // 直接添加字段列
        fields.forEach(field => {
          const getFieldIcon = (type: string) => {
            switch (type.toLowerCase()) {
              case 'number':
              case 'float':
              case 'integer':
              case 'int64':
                return <Hash className="w-4 h-4 text-primary"   />;
              case 'string':
              case 'text':
                return <FileText className="w-4 h-4 text-muted-foreground"   />;
              case 'time':
              case 'timestamp':
                return <Clock className="text-purple-500" />;
              case 'boolean':
              case 'bool':
                return <GitBranch className="w-4 h-4 text-success" />;
              default:
                return <File className="w-4 h-4 text-gray-400"   />;
            }
          };

          children.push({
            title: (
              <div className="flex items-center gap-2">
                <span className="flex-1">{field.name}</span>
                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-primary rounded flex-shrink-0">
                  Field
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{field.type}</span>
              </div>
            ),
            key: `field-${connectionId}-${database}-${table}-${field.name}`,
            icon: getFieldIcon(field.type),
            isLeaf: true});
        });

        // 更新树数据，同时更新表节点显示列数
        setTreeData(prevData => {
          const updateNode = (nodes: DataNode[]): DataNode[] => {
            return nodes.map(node => {
              if (node.key === key) {
                const totalColumns = tags.length + fields.length;
                const updatedTitle = (
                  <div className="flex items-center gap-2">
                    <span className="flex-1">{table}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {totalColumns} 列
                    </span>
                  </div>
                );
                return { 
                  ...node, 
                  children,
                  title: updatedTitle
                };
              }
              if (node.children) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          };
          return updateNode(prevData);
        });
      }
    } catch (error) {
      showMessage.error(`加载数据失败: ${error}`);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [loadingNodes]);

  // 处理节点右键菜单
  const getContextMenu = (node: DataNode): MenuProps['items'] => {
    const key = node.key as string;
    
    if (key.startsWith('database-')) {
      return [
        {
          key: 'refresh-db',
          label: '刷新数据库',
          icon: <RefreshCw className="w-4 h-4"  />},
        {
          key: 'new-query',
          label: '新建查询',
          icon: <FileText className="w-4 h-4"  />},
        { type: 'divider' },
        {
          key: 'db-properties',
          label: '属性',
          icon: <Settings className="w-4 h-4"  />},
      ];
    }

    if (key.startsWith('table-')) {
      return [
        {
          key: 'refresh-table',
          label: '刷新表结构',
          icon: <RefreshCw className="w-4 h-4"  />},
        {
          key: 'query-table',
          label: '查询此表',
          icon: <FileText className="w-4 h-4"  />},
        { type: 'divider' },
        {
          key: 'table-properties',
          label: '表属性',
          icon: <Settings className="w-4 h-4"  />},
      ];
    }

    if (key.startsWith('field-') || key.startsWith('tag-')) {
      return [
        {
          key: 'insert-column',
          label: '插入到查询',
          icon: <FileText className="w-4 h-4"  />},
        {
          key: 'copy-name',
          label: '复制列名',
          icon: <File className="w-4 h-4"  />},
      ];
    }

    return [];
  };

  // 处理树节点展开
  const handleExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue);
  };

  // 处理连接操作
  const handleConnectionToggle = async (connectionId: string) => {
    const isCurrentlyConnected = isConnectionConnected(connectionId);
    const connection = getConnection(connectionId);
    
    if (!connection) {
      showMessage.error('连接配置不存在');
      return;
    }
    
    try {
      if (isCurrentlyConnected) {
        // 断开连接
        await disconnectFromDatabase(connectionId);
        showMessage.success(`已断开连接: ${connection.name}`);
      } else {
        // 建立连接
        await connectToDatabase(connectionId);
        showMessage.success(`已连接: ${connection.name}`);
      }
      // 重新构建树数据以反映状态变化
      buildCompleteTreeData();
    } catch (error) {
      showMessage.error(`连接操作失败: ${error}`);
    }
  };

  // 处理节点双击
  const handleDoubleClick = (info: any) => {
    const { node } = info;
    const key = node.key as string;
    
    if (key.startsWith('connection-')) {
      // 连接节点被双击，切换连接状态
      const connectionId = key.replace('connection-', '');
      handleConnectionToggle(connectionId);
    }
  };

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const { node } = info;
    console.log('选中节点:', node);
    
    // 根据选中的节点类型执行相应操作
    if (node.key.startsWith('database-')) {
      // 数据库节点被选中
      console.log('选中数据库:', node.title);
    } else if (node.key.startsWith('table-')) {
      // 表节点被选中
      console.log('选中表:', node.title);
    } else if (node.key.startsWith('field-') || node.key.startsWith('tag-')) {
      // 字段或标签节点被选中
      console.log('选中字段/标签:', node.title);
    }
  };

  // 提取节点文本内容用于搜索
  const extractTextFromNode = (node: DataNode): string => {
    // 从key中提取实际的名称
    const key = node.key as string;
    if (key.startsWith('connection-')) {
      // 从连接store中获取连接名称
      const connectionId = key.replace('connection-', '');
      const connection = getConnection(connectionId);
      return connection?.name || '';
    } else if (key.startsWith('database-')) {
      // 提取数据库名称
      const parts = key.split('-');
      return parts[2] || '';
    } else if (key.startsWith('table-')) {
      // 提取表名称
      const parts = key.split('-');
      return parts[3] || '';
    } else if (key.startsWith('field-') || key.startsWith('tag-')) {
      // 提取字段/标签名称
      const parts = key.split('-');
      return parts[4] || '';
    }
    return '';
  };

  // 搜索过滤
  const filterTreeData = (data: DataNode[]): DataNode[] => {
    if (!searchValue.trim()) return data;

    const filterNode = (node: DataNode): DataNode | null => {
      const nodeText = extractTextFromNode(node);
      const titleMatch = nodeText.toLowerCase().includes(searchValue.toLowerCase());
      
      let filteredChildren: DataNode[] = [];
      if (node.children) {
        filteredChildren = node.children
          .map(child => filterNode(child))
          .filter(Boolean) as DataNode[];
      }
      
      if (titleMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children};
      }
      
      return null;
    };

    return data.map(node => filterNode(node)).filter(Boolean) as DataNode[];
  };

  // 刷新树数据
  const refreshTree = useCallback(() => {
    buildCompleteTreeData();
  }, [buildCompleteTreeData]);

  // 监听连接和连接变化
  useEffect(() => {
    console.log(`🔄 DatabaseExplorer: 连接或连接状态发生变化`);
    console.log(`🔗 所有连接 (${connections.length}):`, connections.map(c => `${c.name} (${c.id})`));
    console.log(`✨ 已连接ID: [${connectedConnectionIds.join(', ')}]`);
    console.log(`🎯 活跃连接ID: ${activeConnectionId}`);
    buildCompleteTreeData();
  }, [connections, connectedConnectionIds, activeConnectionId]); // 移除buildCompleteTreeData从依赖数组

  // 监听刷新触发器
  useEffect(() => {
    if (refreshTrigger) {
      console.log(`🔄 收到刷新触发器，重新加载数据...`);
      buildCompleteTreeData();
    }
  }, [refreshTrigger]); // 移除buildCompleteTreeData从依赖数组

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 space-y-4">
        <Tooltip title="数据库浏览器" placement="right">
          <Button 
            type="text" 
            icon={<Database className="w-4 h-4"  />}
            className="w-8 h-8"
          />
        </Tooltip>
        <Tooltip title="刷新" placement="right">
          <Button 
            type="text" 
            icon={<RefreshCw className="w-4 h-4"  />}
            className="w-8 h-8"
            onClick={refreshTree}
            disabled={loading}
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="database-explorer h-full flex flex-col bg-white">
      {/* 头部：连接状态和操作 */}
      <div className="p-3 border-b border">
        <div className="flex items-center justify-between mb-3">
          <Badge 
            status={activeConnection ? "success" : "default"} 
            text={
              <span className="text-sm font-medium">
                {activeConnection ? activeConnection.name : '未连接'}
              </span>
            }
          />
          <Tooltip title="刷新">
            <Button 
              type="text" 
              icon={<RefreshCw className="w-4 h-4"  />}
              size="small"
              onClick={refreshTree}
              disabled={loading}
            />
          </Tooltip>
        </div>

        {/* 搜索框 */}
        <Input
          placeholder="搜索连接、数据库、表..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* 主要内容：标签页 */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="explorer" className="h-full">
          <TabsList className="ml-3">
            <TabsTrigger value="explorer" className="flex items-center gap-1">
              <Database className="w-4 h-4" />
              数据源
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1">
              <Key className="w-4 h-4" />
              收藏
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorer" className="px-2 h-full overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spin tip="加载中..." />
              </div>
            ) : treeData.length > 0 ? (
              <Tree
                showIcon
                showLine
                loadData={loadData}
                treeData={filterTreeData(treeData)}
                expandedKeys={expandedKeys}
                onExpand={handleExpand}
                onSelect={handleSelect}
                onDoubleClick={handleDoubleClick}
                className="bg-transparent database-explorer-tree"
              />
            ) : (
              <div className="text-center text-muted-foreground mt-8">
                <Database className="w-4 h-4 text-2xl mb-2" />
                <p>暂无连接</p>
                <Typography.Text className="text-sm mt-1">请在连接管理中添加数据库连接</Typography.Text>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="p-4 text-center text-muted-foreground">
            <Key className="w-4 h-4 text-2xl mb-2" />
            <p>暂无收藏项</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DatabaseExplorer;