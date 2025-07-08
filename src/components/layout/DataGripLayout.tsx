import React, { useState, useEffect } from 'react';
import { Layout, Card, Tree, Typography, Space, Button, Tag, Tooltip, message, Row, Col } from 'antd';
import {
  DatabaseOutlined,
  TableOutlined,
  FieldTimeOutlined,
  TagsOutlined,
  ApiOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  StopOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '@/store/connection';
import QueryEditor from '@/components/query/QueryEditor';
import QueryResults from '@/components/query/QueryResults';
import type { DataNode } from 'antd/es/tree';
import type { QueryResult } from '@/types';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

interface DatabaseStructure {
  databases: string[];
  measurements: Record<string, string[]>;
  fields: Record<string, string[]>;
  tags: Record<string, string[]>;
}

const DataGripLayout: React.FC = () => {
  const { connections, activeConnectionId, connectionStatuses, setActiveConnection } = useConnectionStore();
  const [structure, setStructure] = useState<DatabaseStructure>({
    databases: [],
    measurements: {},
    fields: {},
    tags: {},
  });
  const [loading, setLoading] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // 加载数据库结构
  const loadDatabaseStructure = async (connectionId: string) => {
    if (!connectionId) return;

    setLoading(true);
    try {
      // 获取数据库列表
      const databases = await invoke<string[]>('get_databases', { connectionId });
      
      const newStructure: DatabaseStructure = {
        databases,
        measurements: {},
        fields: {},
        tags: {},
      };

      // 为每个数据库加载测量
      for (const db of databases) {
        try {
          const measurements = await invoke<string[]>('get_measurements', {
            connectionId,
            database: db,
          });
          newStructure.measurements[db] = measurements;

          // 为第一个测量加载字段和标签（示例）
          if (measurements.length > 0) {
            const measurement = measurements[0];
            try {
              const [fields, tags] = await Promise.all([
                invoke<string[]>('get_field_keys', {
                  connectionId,
                  database: db,
                  measurement,
                }).catch(() => []),
                invoke<string[]>('get_tag_keys', {
                  connectionId,
                  database: db,
                  measurement,
                }).catch(() => []),
              ]);
              
              newStructure.fields[`${db}.${measurement}`] = fields;
              newStructure.tags[`${db}.${measurement}`] = tags;
            } catch (error) {
              console.warn(`Failed to load fields/tags for ${db}.${measurement}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to load measurements for ${db}:`, error);
          newStructure.measurements[db] = [];
        }
      }

      setStructure(newStructure);
      if (databases.length > 0 && !selectedDatabase) {
        setSelectedDatabase(databases[0]);
      }
    } catch (error) {
      message.error(`加载数据库结构失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 构建树形数据
  const buildTreeData = (): DataNode[] => {
    const treeData: DataNode[] = [];

    // 连接节点
    connections.forEach(conn => {
      const status = connectionStatuses[conn.id!];
      const isActive = activeConnectionId === conn.id;
      const isConnected = status?.status === 'connected';

      const connectionNode: DataNode = {
        title: (
          <div className="flex items-center justify-between w-full">
            <Space>
              <ApiOutlined style={{ color: isConnected ? '#52c41a' : '#ff4d4f' }} />
              <span className={isActive ? 'font-bold' : ''}>{conn.name}</span>
              {isActive && <Tag color="blue" size="small">活跃</Tag>}
            </Space>
            <Space>
              <Tooltip title={isConnected ? '断开连接' : '连接'}>
                <Button
                  type="text"
                  size="small"
                  icon={isConnected ? <StopOutlined /> : <PlayCircleOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectionToggle(conn.id!);
                  }}
                />
              </Tooltip>
            </Space>
          </div>
        ),
        key: `conn-${conn.id}`,
        icon: <ApiOutlined />,
        children: isActive && isConnected ? buildDatabaseNodes() : [],
      };

      treeData.push(connectionNode);
    });

    return treeData;
  };

  // 构建数据库节点
  const buildDatabaseNodes = (): DataNode[] => {
    return structure.databases.map(db => ({
      title: (
        <Space>
          <DatabaseOutlined />
          <span>{db}</span>
          <Text type="secondary">({structure.measurements[db]?.length || 0})</Text>
        </Space>
      ),
      key: `db-${db}`,
      icon: <DatabaseOutlined />,
      children: buildMeasurementNodes(db),
    }));
  };

  // 构建测量节点
  const buildMeasurementNodes = (database: string): DataNode[] => {
    const measurements = structure.measurements[database] || [];
    return measurements.map(measurement => ({
      title: (
        <Space>
          <TableOutlined />
          <span>{measurement}</span>
        </Space>
      ),
      key: `measurement-${database}-${measurement}`,
      icon: <TableOutlined />,
      children: [
        {
          title: (
            <Space>
              <FieldTimeOutlined />
              <span>Fields</span>
              <Text type="secondary">({structure.fields[`${database}.${measurement}`]?.length || 0})</Text>
            </Space>
          ),
          key: `fields-${database}-${measurement}`,
          icon: <FieldTimeOutlined />,
          children: (structure.fields[`${database}.${measurement}`] || []).map(field => ({
            title: field,
            key: `field-${database}-${measurement}-${field}`,
            icon: <FieldTimeOutlined />,
            isLeaf: true,
          })),
        },
        {
          title: (
            <Space>
              <TagsOutlined />
              <span>Tags</span>
              <Text type="secondary">({structure.tags[`${database}.${measurement}`]?.length || 0})</Text>
            </Space>
          ),
          key: `tags-${database}-${measurement}`,
          icon: <TagsOutlined />,
          children: (structure.tags[`${database}.${measurement}`] || []).map(tag => ({
            title: tag,
            key: `tag-${database}-${measurement}-${tag}`,
            icon: <TagsOutlined />,
            isLeaf: true,
          })),
        },
      ],
    }));
  };

  // 处理连接切换
  const handleConnectionToggle = async (connectionId: string) => {
    try {
      const status = connectionStatuses[connectionId];
      if (status?.status === 'connected') {
        await invoke('disconnect_from_database', { connectionId });
        setActiveConnection(null);
        setStructure({ databases: [], measurements: {}, fields: {}, tags: {} });
        message.info('已断开连接');
      } else {
        await invoke('connect_to_database', { connectionId });
        setActiveConnection(connectionId);
        await loadDatabaseStructure(connectionId);
        message.success('连接成功');
      }
    } catch (error) {
      message.error(`连接操作失败: ${error}`);
    }
  };

  // 处理树节点选择
  const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    
    if (key?.startsWith('db-')) {
      const database = key.replace('db-', '');
      setSelectedDatabase(database);
    } else if (key?.startsWith('measurement-')) {
      const parts = key.split('-');
      const database = parts[1];
      const measurement = parts[2];
      setSelectedDatabase(database);
      // 可以在这里触发查询编辑器的更新
    }
  };

  // 组件挂载时加载活跃连接的结构
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabaseStructure(activeConnectionId);
    }
  }, [activeConnectionId]);

  const treeData = buildTreeData();

  // 处理查询结果
  const handleQueryResult = (result: QueryResult) => {
    setQueryResult(result);
  };

  // 处理查询加载状态
  const handleQueryLoading = (loading: boolean) => {
    setQueryLoading(loading);
  };

  return (
    <Layout style={{ height: '100vh', background: '#f5f5f5' }}>
      <Row style={{ height: '100%' }} gutter={8}>
        {/* 左侧：连接和数据库结构 */}
        <Col span={6} style={{ height: '100%' }}>
          <Card
            title={
              <Space>
                <DatabaseOutlined />
                <span>数据库结构</span>
              </Space>
            }
            extra={
              <Button
                type="text"
                icon={<ReloadOutlined />}
                size="small"
                loading={loading}
                onClick={() => activeConnectionId && loadDatabaseStructure(activeConnectionId)}
              />
            }
            bodyStyle={{ padding: 0, height: 'calc(100vh - 57px)', overflow: 'auto' }}
            style={{ height: '100%' }}
          >
            <Tree
              showIcon
              treeData={treeData}
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              onSelect={handleTreeSelect}
              style={{ padding: '8px' }}
            />
          </Card>
        </Col>

        {/* 右侧：查询编辑器和结果 */}
        <Col span={18} style={{ height: '100%' }}>
          <Row style={{ height: '100%' }} gutter={[0, 8]}>
            {/* 查询编辑器 */}
            <Col span={24} style={{ height: '50%' }}>
              <QueryEditor
                selectedDatabase={selectedDatabase}
                onDatabaseChange={setSelectedDatabase}
                databases={structure.databases}
                onQueryResult={handleQueryResult}
                onLoadingChange={handleQueryLoading}
              />
            </Col>

            {/* 查询结果 */}
            <Col span={24} style={{ height: '50%' }}>
              <QueryResults
                result={queryResult}
                loading={queryLoading}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Layout>
  );
};

export default DataGripLayout;
