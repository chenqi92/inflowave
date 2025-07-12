import React, { useState, useEffect } from 'react';
import { Tree, Input, Tabs, Button, Space, Tooltip, Dropdown, Badge } from 'antd';
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
  SettingOutlined
} from '@ant-design/icons';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';

const { Search } = Input;
const { TabPane } = Tabs;

interface DatabaseExplorerProps {
  collapsed?: boolean;
}

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({ collapsed = false }) => {
  const { activeConnectionId, getConnection } = useConnectionStore();
  const [databases, setDatabases] = useState<string[]>([]);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);

  const activeConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) return;

    setLoading(true);
    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(dbList);
      buildTreeData(dbList);
    } catch (error) {
      console.error('加载数据库失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 构建树形数据
  const buildTreeData = (databases: string[]) => {
    const treeNodes: DataNode[] = databases.map((db, index) => ({
      title: db,
      key: `database-${db}`,
      icon: <DatabaseOutlined className="text-blue-500" />,
      children: [
        {
          title: '表',
          key: `${db}-tables`,
          icon: <TableOutlined className="text-green-500" />,
          children: [],
        },
        {
          title: '字段',
          key: `${db}-fields`,
          icon: <FieldTimeOutlined className="text-orange-500" />,
          children: [],
        },
        {
          title: '标签',
          key: `${db}-tags`,
          icon: <TagsOutlined className="text-purple-500" />,
          children: [],
        },
        {
          title: '函数',
          key: `${db}-functions`,
          icon: <FunctionOutlined className="text-red-500" />,
          children: [],
        },
      ],
    }));
    setTreeData(treeNodes);
  };

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
    }
  };

  // 搜索过滤
  const filterTreeData = (data: DataNode[]): DataNode[] => {
    if (!searchValue) return data;

    return data.filter(node => {
      const title = node.title as string;
      return title.toLowerCase().includes(searchValue.toLowerCase());
    });
  };

  // 初始化数据
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    } else {
      setDatabases([]);
      setTreeData([]);
    }
  }, [activeConnectionId]);

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
            onClick={loadDatabases}
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
                onClick={loadDatabases}
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
          placeholder="搜索数据库..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="small"
          allowClear
        />
      </div>

      {/* 主要内容：标签页 */}
      <div className="flex-1 overflow-hidden">
        <Tabs 
          defaultActiveKey="databases" 
          size="small"
          className="h-full"
          items={[
            {
              key: 'databases',
              label: (
                <span className="flex items-center gap-1">
                  <DatabaseOutlined />
                  数据库
                </span>
              ),
              children: (
                <div className="px-2 h-full overflow-auto">
                  {activeConnection ? (
                    <Tree
                      showIcon
                      treeData={filterTreeData(treeData)}
                      expandedKeys={expandedKeys}
                      onExpand={handleExpand}
                      onSelect={handleSelect}
                      className="bg-transparent"
                    />
                  ) : (
                    <div className="text-center text-gray-500 mt-8">
                      <DatabaseOutlined className="text-2xl mb-2" />
                      <p>请先连接到数据库</p>
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