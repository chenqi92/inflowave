import React, { useState, useRef } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Select,
  Table,
  Tabs,
  message,
  Spin,
  Tree,
  Row,
  Col,
} from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  FolderOutlined,
  TableOutlined,
  FieldTimeOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useConnectionStore } from '@store/connection';
import ContextMenu from '@components/common/ContextMenu';
import QueryOperationsService from '@services/queryOperations';

const { Title, Text } = Typography;
const { Option } = Select;

const Query: React.FC = () => {
  const { activeConnectionId, getConnection } = useConnectionStore();
  const [query, setQuery] = useState('SELECT * FROM measurement_name LIMIT 10');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [databases] = useState<string[]>(['mydb', 'testdb', '_internal']); // 模拟数据

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    target: null as any,
  });

  const currentConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

  // 模拟数据库结构数据
  const [databaseStructure] = useState([
    {
      title: 'mydb',
      key: 'mydb',
      icon: <DatabaseOutlined />,
      children: [
        {
          title: 'temperature',
          key: 'mydb.temperature',
          icon: <TableOutlined />,
          children: [
            {
              title: 'Fields',
              key: 'mydb.temperature.fields',
              icon: <FieldTimeOutlined />,
              children: [
                { title: 'value (float)', key: 'mydb.temperature.fields.value', icon: <FieldTimeOutlined /> },
                { title: 'status (string)', key: 'mydb.temperature.fields.status', icon: <FieldTimeOutlined /> },
              ],
            },
            {
              title: 'Tags',
              key: 'mydb.temperature.tags',
              icon: <TagsOutlined />,
              children: [
                { title: 'host', key: 'mydb.temperature.tags.host', icon: <TagsOutlined /> },
                { title: 'region', key: 'mydb.temperature.tags.region', icon: <TagsOutlined /> },
              ],
            },
          ],
        },
        {
          title: 'cpu_usage',
          key: 'mydb.cpu_usage',
          icon: <TableOutlined />,
          children: [
            {
              title: 'Fields',
              key: 'mydb.cpu_usage.fields',
              icon: <FieldTimeOutlined />,
              children: [
                { title: 'usage_percent (float)', key: 'mydb.cpu_usage.fields.usage_percent', icon: <FieldTimeOutlined /> },
              ],
            },
            {
              title: 'Tags',
              key: 'mydb.cpu_usage.tags',
              icon: <TagsOutlined />,
              children: [
                { title: 'host', key: 'mydb.cpu_usage.tags.host', icon: <TagsOutlined /> },
                { title: 'cpu', key: 'mydb.cpu_usage.tags.cpu', icon: <TagsOutlined /> },
              ],
            },
          ],
        },
      ],
    },
  ]);

  // 处理右键菜单
  const handleRightClick = (event: React.MouseEvent, nodeData: any) => {
    event.preventDefault();

    const key = nodeData.key;
    const parts = key.split('.');

    let target: any = { name: '', type: 'database' };

    if (parts.length === 1) {
      // 数据库级别
      target = {
        type: 'database',
        name: parts[0],
      };
    } else if (parts.length === 2) {
      // 测量级别
      target = {
        type: 'measurement',
        name: parts[1],
        database: parts[0],
      };
    } else if (parts.length === 4) {
      // 字段或标签级别
      const isField = parts[2] === 'fields';
      target = {
        type: isField ? 'field' : 'tag',
        name: parts[3].split(' ')[0], // 移除类型信息
        database: parts[0],
        measurement: parts[1],
        fieldType: isField ? parts[3].split(' ')[1]?.replace(/[()]/g, '') : undefined,
      };
    }

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      target,
    });
  };

  // 处理右键菜单操作
  const handleContextMenuAction = async (action: string, params?: any) => {
    setContextMenu({ ...contextMenu, visible: false });

    try {
      switch (action) {
        case 'previewData':
          const result = await QueryOperationsService.previewData(params);
          setQueryResult(result);
          setSelectedDatabase(params.database);
          break;

        case 'showFields':
          const fieldsResult = await QueryOperationsService.showFields(params);
          setQueryResult(fieldsResult);
          setQuery(`SHOW FIELD KEYS FROM "${params.measurement}"`);
          break;

        case 'showTagKeys':
          const tagKeysResult = await QueryOperationsService.showTagKeys(params);
          setQueryResult(tagKeysResult);
          setQuery(`SHOW TAG KEYS FROM "${params.measurement}"`);
          break;

        case 'showTagValues':
          const tagValuesResult = await QueryOperationsService.showTagValues(params);
          setQueryResult(tagValuesResult);
          setQuery(`SHOW TAG VALUES FROM "${params.measurement}"${params.tagKey ? ` WITH KEY = "${params.tagKey}"` : ''}`);
          break;

        case 'getRecordCount':
          await QueryOperationsService.getRecordCount(params);
          setQuery(`SELECT COUNT(*) FROM "${params.measurement}"`);
          break;

        case 'getFieldBasicStats':
          const statsResult = await QueryOperationsService.getFieldBasicStats(params);
          setQueryResult(statsResult);
          setQuery(`SELECT MIN("${params.field}"), MAX("${params.field}"), MEAN("${params.field}"), COUNT("${params.field}") FROM "${params.measurement}"`);
          break;

        case 'exportData':
          await QueryOperationsService.exportData(params);
          break;

        case 'deleteMeasurement':
          await QueryOperationsService.deleteMeasurement(params);
          // 刷新数据库结构
          break;

        case 'deleteDatabase':
          await QueryOperationsService.deleteDatabase(params);
          // 刷新数据库列表
          break;

        default:
          message.info(`执行操作: ${action}`);
      }
    } catch (error) {
      console.error('Context menu action error:', error);
    }
  };

  // 执行查询
  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    if (!selectedDatabase) {
      message.warning('请选择数据库');
      return;
    }

    setLoading(true);

    try {
      // 这里应该调用 Tauri 后端的查询接口
      // 暂时模拟查询结果
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockResult = {
        series: [
          {
            name: 'temperature',
            columns: ['time', 'host', 'region', 'value'],
            values: [
              ['2023-01-01T00:00:00Z', 'server01', 'us-west', 23.5],
              ['2023-01-01T00:01:00Z', 'server01', 'us-west', 24.1],
              ['2023-01-01T00:02:00Z', 'server01', 'us-west', 23.8],
              ['2023-01-01T00:03:00Z', 'server02', 'us-east', 22.3],
              ['2023-01-01T00:04:00Z', 'server02', 'us-east', 21.9],
            ],
          },
        ],
        executionTime: 156,
        rowCount: 5,
      };

      setQueryResult(mockResult);
      message.success(`查询完成，返回 ${mockResult.rowCount} 行数据`);
    } catch (error) {
      message.error('查询执行失败');
      console.error('Query error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存查询
  const handleSaveQuery = () => {
    // 这里应该实现保存查询的逻辑
    message.success('查询已保存');
  };

  // 格式化查询结果为表格数据
  const formatResultForTable = (result: any) => {
    if (!result || !result.series || result.series.length === 0) {
      return { columns: [], dataSource: [] };
    }

    const series = result.series[0];
    const columns = series.columns.map((col: string, index: number) => ({
      title: col,
      dataIndex: col,
      key: col,
      width: index === 0 ? 200 : 120, // 时间列宽一些
    }));

    const dataSource = series.values.map((row: any[], index: number) => {
      const record: any = { key: index };
      series.columns.forEach((col: string, colIndex: number) => {
        record[col] = row[colIndex];
      });
      return record;
    });

    return { columns, dataSource };
  };

  const { columns, dataSource } = queryResult ? formatResultForTable(queryResult) : { columns: [], dataSource: [] };

  return (
    <div className="p-6 h-full">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title level={2} className="mb-2">数据查询</Title>
          {currentConnection && (
            <Text type="secondary">
              当前连接: {currentConnection.name} ({currentConnection.host}:{currentConnection.port})
            </Text>
          )}
        </div>

        <Space>
          <Select
            placeholder="选择数据库"
            value={selectedDatabase}
            onChange={setSelectedDatabase}
            style={{ width: 200 }}
          >
            {databases.map(db => (
              <Option key={db} value={db}>
                <DatabaseOutlined /> {db}
              </Option>
            ))}
          </Select>
        </Space>
      </div>

      {/* 主要内容区域 */}
      <Row gutter={16} className="h-full">
        {/* 左侧数据库结构树 */}
        <Col span={6}>
          <Card
            title="数据库结构"
            className="h-full"
            bodyStyle={{ padding: '12px', height: 'calc(100% - 57px)', overflow: 'auto' }}
          >
            <Tree
              showIcon
              defaultExpandAll
              treeData={databaseStructure}
              onRightClick={({ event, node }) => handleRightClick(event as React.MouseEvent, node)}
              titleRender={(nodeData) => (
                <span
                  onContextMenu={(e) => handleRightClick(e, nodeData)}
                  className="cursor-pointer hover:bg-blue-50 px-1 rounded"
                >
                  {nodeData.title}
                </span>
              )}
            />
          </Card>
        </Col>

        {/* 右侧查询区域 */}
        <Col span={18}>
          <div className="space-y-4 h-full flex flex-col">

      {/* 查询编辑器 */}
      <Card title="查询编辑器" className="w-full">
        <div className="space-y-4">
          {/* 工具栏 */}
          <div className="flex items-center justify-between">
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleExecuteQuery}
                loading={loading}
                disabled={!selectedDatabase}
              >
                执行查询
              </Button>
              
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveQuery}
              >
                保存查询
              </Button>
              
              <Button
                icon={<HistoryOutlined />}
              >
                查询历史
              </Button>
            </Space>
            
            {queryResult && (
              <Text type="secondary">
                执行时间: {queryResult.executionTime}ms | 返回行数: {queryResult.rowCount}
              </Text>
            )}
          </div>

          {/* 编辑器 */}
          <div className="query-editor">
            <Editor
              height="200px"
              language="sql"
              theme="vs-light"
              value={query}
              onChange={(value) => setQuery(value || '')}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                },
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </Card>

      {/* 查询结果 */}
      <Card title="查询结果" className="w-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spin size="large" tip="执行查询中..." />
          </div>
        ) : queryResult ? (
          <Tabs
            items={[
              {
                key: 'table',
                label: '表格视图',
                children: (
                  <Table
                    columns={columns}
                    dataSource={dataSource}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    pagination={{
                      pageSize: 50,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 行`,
                    }}
                  />
                ),
              },
              {
                key: 'json',
                label: 'JSON 视图',
                children: (
                  <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(queryResult, null, 2)}
                  </pre>
                ),
              },
            ]}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            请执行查询以查看结果
          </div>
        )}
          </Card>
          </div>
        </Col>
      </Row>

      {/* 右键菜单 */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        target={contextMenu.target}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        onAction={handleContextMenuAction}
      />
    </div>
  );
};

export default Query;
