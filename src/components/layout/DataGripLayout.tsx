﻿import React, { useEffect, useState } from 'react';
import { Button, Col, Layout, Row, Tabs, Tag, Tooltip, Tree } from '@/components/ui';
import { Space } from '@/components/ui';
import { Database, TrendingUp, RefreshCw, Settings, Table, Webhook, Book, History, FileUp, Tags, Zap, LayoutDashboard, PlayCircle, Square, Clock } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';
import QueryEditor from '@/components/query/QueryEditor';
import QueryResults from '@/components/query/QueryResults';
import QueryHistory from '@/components/query/QueryHistory';
import SavedQueries from '@/components/query/SavedQueries';
import PerformanceMonitor from '@/components/performance/PerformanceMonitor';
import DatabaseManager from '@/components/database/DatabaseManager';
import RealTimeMonitor from '@/components/monitoring/RealTimeMonitor';
import DashboardDesigner from '@/components/dashboard/DashboardDesigner';
import DataImportWizard from '@/components/data/DataImportWizard';
import ConnectionsPage from '@/pages/Connections';
import type { QueryResult } from '@/types';

// Define DataNode type for Tree component
type DataNode = {
  key: string;
  title: string;
  icon?: React.ReactNode;
  children?: DataNode[];
};

// Fix for invoke function
const invoke = safeTauriInvoke;

interface DatabaseStructure {
  databases: string[];
  measurements: Record<string, string[]>;
  fields: Record<string, string[]>;
  tags: Record<string, string[]>;
}

const DataGripLayout: React.FC = () => {
  const {
    connections,
    activeConnectionId,
    connectionStatuses,
    setActiveConnection,
    connectToDatabase,
    disconnectFromDatabase} = useConnectionStore();
  const [structure, setStructure] = useState<DatabaseStructure>({
    databases: [],
    measurements: {},
    fields: {},
    tags: {}});
  const [loading, setLoading] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState('database');
  const [mainContentTab, setMainContentTab] = useState('datasource');
  const [showImportWizard, setShowImportWizard] = useState(false);

  // 加载数据库结构
  const loadDatabaseStructure = async (connectionId: string) => {
    if (!connectionId) return;

    setLoading(true);
    try {
      // 首先验证连接是否在后端存在
      const backendConnections = await invoke<any[]>('get_connections');
      const backendConnection = backendConnections?.find((c: any) => c.id === connectionId);
      
      if (!backendConnection) {
        console.warn(`⚠️ 连接 ${connectionId} 在后端不存在，跳过加载数据库结构`);
        showMessage.warning('连接不存在，请重新选择连接');
        setLoading(false);
        return;
      }

      // 获取数据库列表
      const databases = await invoke<string[]>('get_databases', {
        connectionId: connectionId});

      const newStructure: DatabaseStructure = {
        databases,
        measurements: {},
        fields: {},
        tags: {}};

      // 为每个数据库加载测量
      for (const db of databases) {
        try {
          const measurements = await invoke<string[]>('get_measurements', {
            connectionId: connectionId,
            database: db});
          newStructure.measurements[db] = measurements;

          // 为第一个测量加载字段和标签（示例）
          if (measurements.length > 0) {
            const measurement = measurements[0];
            try {
              const [fields, tags] = await Promise.all([
                invoke<string[]>('get_field_keys', {
                  connectionId: connectionId,
                  database: db,
                  measurement}).catch(() => []),
                invoke<string[]>('get_tag_keys', {
                  connectionId: connectionId,
                  database: db,
                  measurement}).catch(() => []),
              ]);

              newStructure.fields[`${db}.${measurement}`] = fields;
              newStructure.tags[`${db}.${measurement}`] = tags;
            } catch (error) {
              console.warn(
                `Failed to load fields/tags for ${db}.${measurement}:`,
                error
              );
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
      showMessage.error(`加载数据库结构失败: ${error}`);
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
          <div className='flex items-center justify-between w-full'>
            <div className="flex gap-2">
              <Webhook className="w-4 h-4" style={{ color: isConnected ? '#52c41a' : '#ff4d4f' }}
               />
              <span className={isActive ? 'font-bold' : ''}>{conn.name}</span>
              {isActive && (
                <Tag color='blue' size='small'>
                  活跃
                </Tag>
              )}
            </div>
            <div className="flex gap-2">
              <Tooltip title={isConnected ? '断开连接' : '连接'}>
                <Button
                  type='text'
                  size='small'
                  icon={isConnected ? <Square /> : <PlayCircle />}
                  onClick={e => {
                    e.stopPropagation();
                    handleConnectionToggle(conn.id!);
                  }}
                />
              </Tooltip>
            </div>
          </div>
        ),
        key: `conn-${conn.id}`,
        icon: <Webhook className="w-4 h-4"  />,
        children: isActive && isConnected ? buildDatabaseNodes() : []};

      treeData.push(connectionNode);
    });

    return treeData;
  };

  // 构建数据库节点
  const buildDatabaseNodes = (): DataNode[] => {
    return structure.databases.map(db => ({
      title: (
        <div className="flex gap-2">
          <Database className="w-4 h-4"  />
          <span>{db}</span>
          <span className="text-muted-foreground">
            ({structure.measurements[db]?.length || 0})
          </span>
        </div>
      ),
      key: `db-${db}`,
      icon: <Database className="w-4 h-4"  />,
      children: buildMeasurementNodes(db)}));
  };

  // 构建测量节点
  const buildMeasurementNodes = (database: string): DataNode[] => {
    const measurements = structure.measurements[database] || [];
    return measurements.map(measurement => ({
      title: (
        <div className="flex gap-2">
          <Table className="w-4 h-4"  />
          <span>{measurement}</span>
        </div>
      ),
      key: `measurement-${database}-${measurement}`,
      icon: <Table className="w-4 h-4"  />,
      children: [
        {
          title: (
            <div className="flex gap-2">
              <Clock />
              <span>Fields</span>
              <span className="text-muted-foreground">
                ({structure.fields[`${database}.${measurement}`]?.length || 0})
              </span>
            </div>
          ),
          key: `fields-${database}-${measurement}`,
          icon: <Clock />,
          children: (structure.fields[`${database}.${measurement}`] || []).map(
            field => ({
              title: field,
              key: `field-${database}-${measurement}-${field}`,
              icon: <Clock />,
              isLeaf: true})
          )},
        {
          title: (
            <div className="flex gap-2">
              <Tags className="w-4 h-4"  />
              <span>Tags</span>
              <span className="text-muted-foreground">
                ({structure.tags[`${database}.${measurement}`]?.length || 0})
              </span>
            </div>
          ),
          key: `tags-${database}-${measurement}`,
          icon: <Tags className="w-4 h-4"  />,
          children: (structure.tags[`${database}.${measurement}`] || []).map(
            tag => ({
              title: tag,
              key: `tag-${database}-${measurement}-${tag}`,
              icon: <Tags className="w-4 h-4"  />,
              isLeaf: true})
          )},
      ]}));
  };

  // 处理连接切换
  const handleConnectionToggle = async (connectionId: string) => {
    try {
      const status = connectionStatuses[connectionId];
      if (status?.status === 'connected') {
        await connectToDatabase(connectionId);
        setActiveConnection(connectionId);
        await loadDatabaseStructure(connectionId);
        showMessage.success('连接成功');
      } else {
        await disconnectFromDatabase(connectionId);
        setActiveConnection(null);
        setStructure({ databases: [], measurements: {}, fields: {}, tags: {} });
        showMessage.info('已断开连接');
      }
    } catch (error) {
      showMessage.error(`连接操作失败: ${error}`);
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

  // 处理从历史记录选择查询
  const handleQuerySelect = (query: string, database?: string) => {
    if (database && structure.databases.includes(database)) {
      setSelectedDatabase(database);
    }
    // 这里需要将查询传递给 QueryEditor，暂时通过事件或状态管理
    // 可以考虑使用 ref 或者状态提升
    showMessage.info('查询已选择，请在编辑器中查看');
  };

  return (
    <Layout style={{ height: '100vh', background: '#f5f5f5' }}>
      <Row style={{ height: '100%' }} gutter={8}>
        {/* 左侧：连接和数据库结构 */}
        <Col span={6} style={{ height: '100%' }}>
          <div
            title={
              <Tabs
                value={leftPanelTab}
                onValueChange={setLeftPanelTab}
                size='small'
                items={[
                  {
                    key: 'database',
                    label: (
                      <div className="flex gap-2">
                        <Database className="w-4 h-4"  />
                        <span>数据库</span>
                      </div>
                    )},
                  {
                    key: 'history',
                    label: (
                      <div className="flex gap-2">
                        <History className="w-4 h-4"  />
                        <span>历史</span>
                      </div>
                    )},
                  {
                    key: 'saved',
                    label: (
                      <div className="flex gap-2">
                        <Book className="w-4 h-4"  />
                        <span>收藏</span>
                      </div>
                    )},
                ]}
              />
            }
            extra={
              leftPanelTab === 'database' && (
                <Button
                  type='text'
                  icon={<RefreshCw className="w-4 h-4"  />}
                  size='small'
                  disabled={loading}
                  onClick={() =>
                    activeConnectionId &&
                    loadDatabaseStructure(activeConnectionId)
                  }
                />
              )
            }
            styles={{
              body: {
                padding: 0,
                height: 'calc(100vh - 57px)',
                overflow: 'auto'}}}
            style={{ height: '100%' }}
          >
            {leftPanelTab === 'database' && (
              <Tree
                showIcon
                treeData={treeData}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                onSelect={handleTreeSelect}
                style={{ padding: '8px' }}
              />
            )}
            {leftPanelTab === 'history' && (
              <div style={{ height: '100%' }}>
                <QueryHistory
                  onQuerySelect={handleQuerySelect}
                  open={true}
                />
              </div>
            )}
            {leftPanelTab === 'saved' && (
              <div style={{ height: '100%' }}>
                <SavedQueries
                  onQuerySelect={handleQuerySelect}
                  open={true}
                  databases={structure.databases}
                />
              </div>
            )}
          </div>
        </Col>

        {/* 右侧：主内容区域 */}
        <Col span={18} style={{ height: '100%' }}>
          <div
            style={{ height: '100%' }}
            styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
            tabList={[
              {
                key: 'datasource',
                tab: (
                  <div className="flex gap-2">
                    <Settings className="w-4 h-4"  />
                    <span>数据源管理</span>
                  </div>
                )},
              {
                key: 'database',
                tab: (
                  <div className="flex gap-2">
                    <Database className="w-4 h-4"  />
                    <span>数据库浏览</span>
                  </div>
                )},
              {
                key: 'query',
                tab: (
                  <div className="flex gap-2">
                    <PlayCircle />
                    <span>查询编辑器</span>
                  </div>
                )},
              {
                key: 'dashboard',
                tab: (
                  <div className="flex gap-2">
                    <LayoutDashboard />
                    <span>仪表板</span>
                  </div>
                )},
              {
                key: 'monitor',
                tab: (
                  <div className="flex gap-2">
                    <TrendingUp className="w-4 h-4"  />
                    <span>实时监控</span>
                  </div>
                )},
              {
                key: 'performance',
                tab: (
                  <div className="flex gap-2">
                    <Zap className="w-4 h-4"  />
                    <span>性能分析</span>
                  </div>
                )},
            ]}
            activeTabKey={mainContentTab}
            onTabChange={setMainContentTab}
            tabBarExtraContent={
              <div className="flex gap-2">
                <Button
                  icon={<FileUp className="w-4 h-4"  />}
                  onClick={() => setShowImportWizard(true)}
                  size='small'
                >
                  导入数据
                </Button>
                <Button icon={<Settings className="w-4 h-4"  />} size='small'>
                  设置
                </Button>
              </div>
            }
          >
            {mainContentTab === 'datasource' && (
              <div style={{ height: '100%', padding: '0' }}>
                <ConnectionsPage />
              </div>
            )}

            {mainContentTab === 'query' && (
              <Row style={{ height: '100%' }} gutter={[0, 8]}>
                <Col span={24} style={{ height: '50%' }}>
                  <QueryEditor
                    selectedDatabase={selectedDatabase}
                    onDatabaseChange={setSelectedDatabase}
                    databases={structure.databases}
                    onQueryResult={handleQueryResult}
                    onLoadingChange={handleQueryLoading}
                  />
                </Col>
                <Col span={24} style={{ height: '50%' }}>
                  <QueryResults result={queryResult} disabled={queryLoading} />
                </Col>
              </Row>
            )}

            {mainContentTab === 'dashboard' && <DashboardDesigner />}

            {mainContentTab === 'monitor' && (
              <div style={{ height: '100%', padding: '16px' }}>
                <RealTimeMonitor
                  connectionId={activeConnectionId}
                  database={selectedDatabase}
                />
              </div>
            )}

            {mainContentTab === 'performance' && (
              <div style={{ height: '100%', padding: '16px' }}>
                <PerformanceMonitor connectionId={activeConnectionId} />
              </div>
            )}

            {mainContentTab === 'database' && (
              <DatabaseManager
                connectionId={activeConnectionId}
                database={selectedDatabase}
              />
            )}
          </div>
        </Col>
      </Row>

      {/* 数据导入向导 */}
      <DataImportWizard
        open={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        connectionId={activeConnectionId}
        database={selectedDatabase}
      />
    </Layout>
  );
};

export default DataGripLayout;
