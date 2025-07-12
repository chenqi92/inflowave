import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Input, Tabs, Button, Space, Tooltip, Dropdown, Badge, message, Spin } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { MenuProps } from 'antd';
import { 
  DatabaseOutlined, 
  TableOutlined, 
  SearchOutlined,
  ReloadOutlined,
  MoreOutlined,
  KeyOutlined,
  FieldTimeOutlined,
  TagsOutlined,
  FunctionOutlined,
  FileTextOutlined,
  SettingOutlined,
  LinkOutlined,
  NumberOutlined,
  FileOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';

const { Search } = Input;
const { TabPane } = Tabs;

interface DatabaseExplorerProps {
  collapsed?: boolean;
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

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({ collapsed = false }) => {
  const { connections, activeConnectionId, getConnection } = useConnectionStore();
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  const activeConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

  // 加载指定连接的数据库列表
  const loadDatabases = async (connectionId: string): Promise<string[]> => {
    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId,
      });
      return dbList || [];
    } catch (error) {
      console.error(`加载连接 ${connectionId} 的数据库失败:`, error);
      return [];
    }
  };

  // 加载指定数据库的表列表
  const loadTables = async (connectionId: string, database: string): Promise<string[]> => {
    try {
      const tables = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId,
        database,
      });
      return tables || [];
    } catch (error) {
      console.error(`加载数据库 ${database} 的表失败:`, error);
      return [];
    }
  };

  // 加载指定表的字段和标签信息
  const loadTableSchema = async (connectionId: string, database: string, table: string): Promise<{ tags: string[]; fields: Array<{ name: string; type: string }> }> => {
    try {
      const schema = await safeTauriInvoke<{ tags: string[]; fields: Array<{ name: string; type: string }> }>('get_table_schema', {
        connectionId,
        database,
        measurement: table,
      });
      return schema || { tags: [], fields: [] };
    } catch (error) {
      console.error(`加载表 ${table} 的架构失败:`, error);
      return { tags: [], fields: [] };
    }
  };

  // 构建完整的树形数据
  const buildCompleteTreeData = useCallback(async () => {
    setLoading(true);
    const treeNodes: DataNode[] = [];

    for (const connection of connections) {
      const connectionNode: DataNode = {
        title: (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connection.id === activeConnectionId ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span>{connection.name}</span>
          </div>
        ),
        key: `connection-${connection.id}`,
        icon: <LinkOutlined className="text-blue-600" />,
        children: [],
      };

      // 为活跃连接加载数据库
      if (connection.id === activeConnectionId) {
        try {
          const databases = await loadDatabases(connection.id!);
          connectionNode.children = databases.map(db => ({
            title: db,
            key: `database-${connection.id}-${db}`,
            icon: <DatabaseOutlined className="text-purple-600" />,
            isLeaf: false,
            // 延迟加载表数据
          }));
        } catch (error) {
          console.error('加载数据库失败:', error);
        }
      }

      treeNodes.push(connectionNode);
    }

    setTreeData(treeNodes);
    setLoading(false);
  }, [connections, activeConnectionId]);

  // 动态加载节点数据
  const loadData = useCallback(async (node: any): Promise<void> => {
    const { key } = node;
    
    if (loadingNodes.has(key)) return;
    
    setLoadingNodes(prev => new Set(prev).add(key));

    try {
      if (key.startsWith('database-')) {
        // 加载表列表
        const [, connectionId, database] = key.split('-', 3);
        const tables = await loadTables(connectionId, database);
        
        const tableNodes: DataNode[] = tables.map(table => ({
          title: table,
          key: `table-${connectionId}-${database}-${table}`,
          icon: <TableOutlined className="text-green-600" />,
          isLeaf: false,
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
        
        // 添加标签节点
        if (tags.length > 0) {
          children.push({
            title: `标签 (${tags.length})`,
            key: `tags-${connectionId}-${database}-${table}`,
            icon: <TagsOutlined className="text-orange-500" />,
            children: tags.map(tag => ({
              title: tag,
              key: `tag-${connectionId}-${database}-${table}-${tag}`,
              icon: <BranchesOutlined className="text-orange-400" />,
              isLeaf: true,
            })),
          });
        }
        
        // 添加字段节点
        if (fields.length > 0) {
          children.push({
            title: `字段 (${fields.length})`,
            key: `fields-${connectionId}-${database}-${table}`,
            icon: <FieldTimeOutlined className="text-blue-500" />,
            children: fields.map(field => ({
              title: (
                <div className="flex items-center gap-2">
                  <span>{field.name}</span>
                  <span className="text-xs text-gray-500">({field.type})</span>
                </div>
              ),
              key: `field-${connectionId}-${database}-${table}-${field.name}`,
              icon: field.type === 'number' ? 
                <NumberOutlined className="text-blue-400" /> : 
                <FileOutlined className="text-gray-400" />,
              isLeaf: true,
            })),
          });
        }

        // 更新树数据
        setTreeData(prevData => {
          const updateNode = (nodes: DataNode[]): DataNode[] => {
            return nodes.map(node => {
              if (node.key === key) {
                return { ...node, children };
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
      message.error(`加载数据失败: ${error}`);
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
          icon: <ReloadOutlined />,
        },
        {
          key: 'new-query',
          label: '新建查询',
          icon: <FileTextOutlined />,
        },
        { type: 'divider' },
        {
          key: 'db-properties',
          label: '属性',
          icon: <SettingOutlined />,
        },
      ];
    }

    if (key.includes('-tables')) {
      return [
        {
          key: 'refresh-tables',
          label: '刷新表列表',
          icon: <ReloadOutlined />,
        },
        {
          key: 'create-table',
          label: '创建表',
          icon: <TableOutlined />,
        },
      ];
    }

    return [];
  };

  // 处理树节点展开
  const handleExpand = (expandedKeysValue: React.Key[]) => {
    setExpandedKeys(expandedKeysValue);
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

  // 搜索过滤
  const filterTreeData = (data: DataNode[]): DataNode[] => {
    if (!searchValue) return data;

    const filterNode = (node: DataNode): DataNode | null => {
      const title = typeof node.title === 'string' ? node.title : '';
      const titleMatch = title.toLowerCase().includes(searchValue.toLowerCase());
      
      let filteredChildren: DataNode[] = [];
      if (node.children) {
        filteredChildren = node.children
          .map(child => filterNode(child))
          .filter(Boolean) as DataNode[];
      }
      
      if (titleMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        };
      }
      
      return null;
    };

    return data.map(node => filterNode(node)).filter(Boolean) as DataNode[];
  };

  // 刷新树数据
  const refreshTree = useCallback(() => {
    buildCompleteTreeData();
  }, [buildCompleteTreeData]);

  // 初始化数据
  useEffect(() => {
    buildCompleteTreeData();
  }, [buildCompleteTreeData]);

  if (collapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 space-y-4">
        <Tooltip title="数据库浏览器" placement="right">
          <Button 
            type="text" 
            icon={<DatabaseOutlined />}
            className="w-8 h-8"
          />
        </Tooltip>
        <Tooltip title="刷新" placement="right">
          <Button 
            type="text" 
            icon={<ReloadOutlined />}
            className="w-8 h-8"
            onClick={refreshTree}
            loading={loading}
          />
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="database-explorer h-full flex flex-col bg-white">
      {/* 头部：连接状态和操作 */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge 
              status={activeConnection ? "success" : "default"} 
              text={
                <span className="text-sm font-medium">
                  {activeConnection ? activeConnection.name : '未连接'}
                </span>
              }
            />
          </div>
          <Space size="small">
            <Tooltip title="刷新">
              <Button 
                type="text" 
                icon={<ReloadOutlined />}
                size="small"
                onClick={refreshTree}
                loading={loading}
              />
            </Tooltip>
            <Dropdown 
              menu={{ items: [] }}
              trigger={['click']}
            >
              <Button 
                type="text" 
                icon={<MoreOutlined />}
                size="small"
              />
            </Dropdown>
          </Space>
        </div>

        {/* 搜索框 */}
        <Search
          placeholder="搜索连接、数据库、表..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="small"
          allowClear
        />
      </div>

      {/* 主要内容：标签页 */}
      <div className="flex-1 overflow-hidden">
        <Tabs 
          defaultActiveKey="explorer" 
          size="small"
          className="h-full"
          items={[
            {
              key: 'explorer',
              label: (
                <span className="flex items-center gap-1">
                  <DatabaseOutlined />
                  数据源
                </span>
              ),
              children: (
                <div className="px-2 h-full overflow-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Spin tip="加载中..." />
                    </div>
                  ) : treeData.length > 0 ? (
                    <Tree
                      showIcon
                      loadData={loadData}
                      treeData={filterTreeData(treeData)}
                      expandedKeys={expandedKeys}
                      onExpand={handleExpand}
                      onSelect={handleSelect}
                      className="bg-transparent"
                    />
                  ) : (
                    <div className="text-center text-gray-500 mt-8">
                      <DatabaseOutlined className="text-2xl mb-2" />
                      <p>暂无连接</p>
                      <p className="text-sm mt-1">请在连接管理中添加数据库连接</p>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'favorites',
              label: (
                <span className="flex items-center gap-1">
                  <KeyOutlined />
                  收藏
                </span>
              ),
              children: (
                <div className="p-4 text-center text-gray-500">
                  <KeyOutlined className="text-2xl mb-2" />
                  <p>暂无收藏项</p>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default DatabaseExplorer;