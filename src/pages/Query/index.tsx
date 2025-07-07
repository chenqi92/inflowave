import React, { useState } from 'react';
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
} from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  HistoryOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useConnectionStore } from '@store/connection';

const { Title, Text } = Typography;
const { Option } = Select;

const Query: React.FC = () => {
  const { activeConnectionId, getConnection } = useConnectionStore();
  const [query, setQuery] = useState('SELECT * FROM measurement_name LIMIT 10');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [databases] = useState<string[]>(['mydb', 'testdb', '_internal']); // 模拟数据

  const currentConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

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
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2}>数据查询</Title>
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
  );
};

export default Query;
