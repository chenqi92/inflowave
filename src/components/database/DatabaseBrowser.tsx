import React, { useState, useEffect, useMemo } from 'react';
import { Tree, Input, Button, Tooltip, Badge, Dropdown, Empty, Spin } from 'antd';
import { Space } from '@/components/ui';
import { 
  DatabaseOutlined,
  TableOutlined,
  TagOutlined,
  FieldTimeOutlined,
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  CopyOutlined,
  BarChartOutlined
} from '@/components/ui';
import { useDatabase } from '@/hooks/useDatabase';
import { useConnection } from '@/hooks/useConnection';
import { FormatUtils } from '@/utils/format';
import type { TreeNodeData, DatabaseInfo, MeasurementInfo, FieldInfo, TagInfo } from '@/types';
import '@/styles/database-management.css';

interface DatabaseBrowserProps {
  connectionId?: string;
  selectedKeys?: string[];
  onSelect?: (keys: string[], info: { node: TreeNodeData; selected: boolean }) => void;
  onDoubleClick?: (node: TreeNodeData) => void;
  className?: string;
}

export const DatabaseBrowser: React.FC<DatabaseBrowserProps> = ({
  connectionId,
  selectedKeys,
  onSelect,
  onDoubleClick,
  className,
}) => {
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedNodeKeys, setSelectedNodeKeys] = useState<string[]>(selectedKeys || []);
  const [contextMenuNode, setContextMenuNode] = useState<TreeNodeData | null>(null);

  const { getActiveConnection } = useConnection();
  const {
    databases,
    isLoading,
    error,
    fetchDatabases,
    fetchMeasurements,
    fetchFields,
    fetchTags,
    addDatabase,
    deleteDatabase,
    refreshDatabaseStructure,
  } = useDatabase(connectionId);

  const activeConnection = getActiveConnection();
  const currentConnectionId = connectionId || activeConnection?.id;

  // 构建树形数据
  const treeData = useMemo(() => {
    if (!databases || databases.length === 0) return [];

    return databases
      .filter(db => !searchText || db.name.toLowerCase().includes(searchText.toLowerCase()))
      .map(database => ({
        key: `db:${database.name}`,
        title: (
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <DatabaseOutlined className="text-blue-500" />
              <span>{database.name}</span>
              {database.measurementCount !== undefined && (
                <Badge 
                  count={database.measurementCount} 
                  size="small" 
                  style={{ backgroundColor: '#f0f0f0', color: '#666' }}
                />
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DatabaseContextMenu database={database} />
            </div>
          </div>
        ),
        icon: <DatabaseOutlined />,
        children: [],
        isLeaf: false,
        database: database.name,
        type: 'database',
      }));
  }, [databases, searchText]);

  // 加载子节点
  const loadData = async (node: TreeNodeData): Promise<void> => {
    if (!currentConnectionId) return;

    const { key, type, database, measurement } = node;

    try {
      if (type === 'database' && database) {
        // 加载测量列表
        const measurements = await fetchMeasurements(database);
        node.children = measurements.map(m => ({
          key: `measurement:${database}:${m.name}`,
          title: (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <TableOutlined className="text-green-500" />
                <span>{m.name}</span>
                {m.seriesCount !== undefined && (
                  <Badge 
                    count={m.seriesCount} 
                    size="small"
                    style={{ backgroundColor: '#e6f7ff', color: '#1890ff' }}
                  />
                )}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MeasurementContextMenu database={database} measurement={m.name} />
              </div>
            </div>
          ),
          icon: <TableOutlined />,
          children: [
            {
              key: `fields:${database}:${m.name}`,
              title: (
                <div className="flex items-center gap-2">
                  <FieldTimeOutlined className="text-purple-500" />
                  <span>字段</span>
                </div>
              ),
              icon: <FieldTimeOutlined />,
              children: [],
              isLeaf: false,
              database,
              measurement: m.name,
              type: 'fields-group',
            },
            {
              key: `tags:${database}:${m.name}`,
              title: (
                <div className="flex items-center gap-2">
                  <TagOutlined className="text-orange-500" />
                  <span>标签</span>
                </div>
              ),
              icon: <TagOutlined />,
              children: [],
              isLeaf: false,
              database,
              measurement: m.name,
              type: 'tags-group',
            },
          ],
          isLeaf: false,
          database,
          measurement: m.name,
          type: 'measurement',
        }));
      } else if (type === 'fields-group' && database && measurement) {
        // 加载字段列表
        const fields = await fetchFields(database, measurement);
        node.children = fields.map(f => ({
          key: `field:${database}:${measurement}:${f.name}`,
          title: (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getFieldTypeColor(f.type)}`} />
                <span>{f.name}</span>
                <span className="text-xs text-gray-500">({f.type})</span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <FieldContextMenu database={database} measurement={measurement} field={f.name} fieldType="field" />
              </div>
            </div>
          ),
          isLeaf: true,
          database,
          measurement,
          field: f.name,
          fieldType: f.type,
          type: 'field',
        }));
      } else if (type === 'tags-group' && database && measurement) {
        // 加载标签列表
        const tags = await fetchTags(database, measurement);
        node.children = tags.map(t => ({
          key: `tag:${database}:${measurement}:${t.name}`,
          title: (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <TagOutlined className="text-orange-500" />
                <span>{t.name}</span>
                {t.valueCount !== undefined && (
                  <Badge 
                    count={t.valueCount} 
                    size="small"
                    style={{ backgroundColor: '#fff7e6', color: '#fa8c16' }}
                  />
                )}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <FieldContextMenu database={database} measurement={measurement} field={t.name} fieldType="tag" />
              </div>
            </div>
          ),
          isLeaf: true,
          database,
          measurement,
          tag: t.name,
          type: 'tag',
        }));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'integer':
      case 'float':
        return 'bg-blue-500';
      case 'string':
        return 'bg-green-500';
      case 'boolean':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleRefresh = async () => {
    if (!currentConnectionId) return;
    await refreshDatabaseStructure(undefined, currentConnectionId);
  };

  const handleAddDatabase = () => {
    // TODO: 显示创建数据库对话框
    console.log('创建数据库');
  };

  const handleNodeSelect = (selectedKeys: string[], info: { node: TreeNodeData; selected: boolean }) => {
    setSelectedNodeKeys(selectedKeys);
    onSelect?.(selectedKeys, info);
  };

  const handleNodeDoubleClick = (node: TreeNodeData) => {
    onDoubleClick?.(node);
  };

  // 初始加载
  useEffect(() => {
    if (currentConnectionId && databases.length === 0) {
      fetchDatabases(currentConnectionId);
    }
  }, [currentConnectionId, databases.length, fetchDatabases]);

  if (!currentConnectionId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <DatabaseOutlined className="text-4xl mb-2" />
          <div>请先选择一个连接</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 text-center">
          <div className="mb-2">加载数据库结构失败</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <Button onClick={handleRefresh} icon={<ReloadOutlined />}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col database-management ${className}`}>
      {/* 工具栏 */}
      <div className="database-browser-toolbar">
        <Space className="w-full" size="middle">
          <Input
            placeholder="搜索数据库..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            className="flex-1"
            style={{ minWidth: '200px' }}
          />
          <Tooltip title="刷新">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={isLoading}
            />
          </Tooltip>
          <Tooltip title="新建数据库">
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddDatabase}
              type="primary"
            />
          </Tooltip>
        </Space>
      </div>

      {/* 树形结构 */}
      <div className="flex-1 overflow-auto">
        {isLoading && databases.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <Spin size="large" />
          </div>
        ) : treeData.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchText ? "未找到匹配的数据库" : "暂无数据库"}
          />
        ) : (
          <Tree
            treeData={treeData}
            selectedKeys={selectedNodeKeys}
            expandedKeys={expandedKeys}
            onSelect={handleNodeSelect}
            onExpand={(keys) => setExpandedKeys(keys)}
            loadData={loadData}
            showLine
            showIcon
            blockNode
            onDoubleClick={handleNodeDoubleClick}
            className="p-2"
          />
        )}
      </div>
    </div>
  );
};

// 数据库上下文菜单
const DatabaseContextMenu: React.FC<{ database: DatabaseInfo }> = ({ database }) => {
  const menuItems = [
    {
      key: 'browse',
      label: '浏览数据',
      icon: <EyeOutlined />,
      onClick: () => console.log('浏览数据库:', database.name),
    },
    {
      key: 'stats',
      label: '统计信息',
      icon: <InfoCircleOutlined />,
      onClick: () => console.log('查看统计:', database.name),
    },
    {
      key: 'copy',
      label: '复制名称',
      icon: <CopyOutlined />,
      onClick: () => navigator.clipboard.writeText(database.name),
    },
    {
      key: 'divider',
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除数据库',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => console.log('删除数据库:', database.name),
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button type="text" size="small" className="opacity-0 group-hover:opacity-100">
        ⋯
      </Button>
    </Dropdown>
  );
};

// 测量上下文菜单
const MeasurementContextMenu: React.FC<{ database: string; measurement: string }> = ({ 
  database, 
  measurement 
}) => {
  const menuItems = [
    {
      key: 'preview',
      label: '预览数据',
      icon: <EyeOutlined />,
      onClick: () => console.log('预览数据:', database, measurement),
    },
    {
      key: 'chart',
      label: '创建图表',
      icon: <BarChartOutlined />,
      onClick: () => console.log('创建图表:', database, measurement),
    },
    {
      key: 'copy',
      label: '复制名称',
      icon: <CopyOutlined />,
      onClick: () => navigator.clipboard.writeText(measurement),
    },
    {
      key: 'stats',
      label: '统计信息',
      icon: <InfoCircleOutlined />,
      onClick: () => console.log('查看统计:', database, measurement),
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button type="text" size="small" className="opacity-0 group-hover:opacity-100">
        ⋯
      </Button>
    </Dropdown>
  );
};

// 字段/标签上下文菜单
const FieldContextMenu: React.FC<{ 
  database: string; 
  measurement: string; 
  field: string;
  fieldType: 'field' | 'tag';
}> = ({ database, measurement, field, fieldType }) => {
  const menuItems = [
    {
      key: 'select',
      label: `查询${fieldType === 'field' ? '字段' : '标签'}`,
      icon: <EyeOutlined />,
      onClick: () => console.log('查询:', database, measurement, field),
    },
    {
      key: 'copy',
      label: '复制名称',
      icon: <CopyOutlined />,
      onClick: () => navigator.clipboard.writeText(field),
    },
    {
      key: 'info',
      label: '字段信息',
      icon: <InfoCircleOutlined />,
      onClick: () => console.log('字段信息:', database, measurement, field),
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button type="text" size="small" className="opacity-0 group-hover:opacity-100">
        ⋯
      </Button>
    </Dropdown>
  );
};