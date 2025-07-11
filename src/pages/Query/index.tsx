import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Select, Table, Tabs, message, Spin, Row, Col, Alert, Tree } from '@/components/ui';
import { PlayCircleOutlined, SaveOutlined, DatabaseOutlined, TableOutlined, ExclamationCircleOutlined, DownloadOutlined, HistoryOutlined, FieldTimeOutlined, TagsOutlined } from '@/components/ui';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { registerInfluxQLLanguage, createInfluxQLCompletionProvider } from '@/utils/influxql-language';
import ExportDialog from '@/components/common/ExportDialog';
import QueryResultContextMenu from '@/components/query/QueryResultContextMenu';
import type { QueryResult, QueryRequest } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

const Query: React.FC = () => {
  const { activeConnectionId, getConnection } = useConnectionStore();
  const [query, setQuery] = useState('SELECT * FROM measurement_name LIMIT 10');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);

  const currentConnection = activeConnectionId ? getConnection(activeConnectionId) : null;

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) return;

    setLoadingDatabases(true);
    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(dbList);

      // 如果有数据库且没有选中的，选择第一个
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      message.error(`加载数据库列表失败: ${error}`);
    } finally {
      setLoadingDatabases(false);
    }
  };

  // 加载测量列表
  const loadMeasurements = async (database: string) => {
    if (!activeConnectionId || !database) return;

    try {
      const measurementList = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId: activeConnectionId,
        database,
      });
      setMeasurements(measurementList);

      // 加载第一个测量的字段和标签信息（用于自动补全）
      if (measurementList.length > 0) {
        loadFieldsAndTags(database, measurementList[0]);
      }
    } catch (error) {
      console.error('加载测量列表失败:', error);
      setMeasurements([]);
    }
  };

  // 加载字段和标签信息
  const loadFieldsAndTags = async (database: string, measurement: string) => {
    if (!activeConnectionId) return;

    try {
      const [fieldList, tagList] = await Promise.all([
        safeTauriInvoke<string[]>('get_field_keys', {
          connectionId: activeConnectionId,
          database,
          measurement,
        }).catch(() => []),
        safeTauriInvoke<string[]>('get_tag_keys', {
          connectionId: activeConnectionId,
          database,
          measurement,
        }).catch(() => []),
      ]);

      setFields(fieldList);
      setTags(tagList);
    } catch (error) {
      console.error('加载字段和标签失败:', error);
    }
  };

  // 初始化编辑器
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);

    // 注册 InfluxQL 语言
    registerInfluxQLLanguage();

    // 注册自动补全提供器
    const completionProvider = createInfluxQLCompletionProvider(
      databases,
      measurements,
      fields,
      tags
    );

    monaco.languages.registerCompletionItemProvider('influxql', completionProvider);

    // 设置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
    });

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteQuery();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveQuery();
    });
  };

  // 更新自动补全数据
  useEffect(() => {
    if (editorInstance) {
      // 重新注册自动补全提供器
      const completionProvider = createInfluxQLCompletionProvider(
        databases,
        measurements,
        fields,
        tags
      );

      monaco.languages.registerCompletionItemProvider('influxql', completionProvider);
    }
  }, [databases, measurements, fields, tags, editorInstance]);

  // 组件挂载时加载数据
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    }
  }, [activeConnectionId]);

  // 选中数据库变化时加载测量
  useEffect(() => {
    if (selectedDatabase) {
      loadMeasurements(selectedDatabase);
    }
  }, [selectedDatabase]);

  // 构建数据库结构树数据
  const buildDatabaseStructure = () => {
    return databases.map(db => ({
      title: db,
      key: db,
      icon: <DatabaseOutlined />,
      children: measurements.map(measurement => ({
        title: measurement,
        key: `${db}.${measurement}`,
        icon: <TableOutlined />,
        children: [
          {
            title: 'Fields',
            key: `${db}.${measurement}.fields`,
            icon: <FieldTimeOutlined />,
            children: [], // 可以在这里加载字段信息
          },
          {
            title: 'Tags',
            key: `${db}.${measurement}.tags`,
            icon: <TagsOutlined />,
            children: [], // 可以在这里加载标签信息
          },
        ],
      })),
    }));
  };

  const databaseStructure = buildDatabaseStructure();

  // 处理树节点点击
  const handleTreeNodeClick = (selectedKeys: React.Key[], _: any) => {
    const key = selectedKeys[0] as string;
    const parts = key.split('.');

    if (parts.length === 2) {
      // 点击测量，生成预览查询
      const database = parts[0];
      const measurement = parts[1];
      setSelectedDatabase(database);
      setQuery(`SELECT * FROM "${measurement}" LIMIT 10`);
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

    if (!activeConnectionId) {
      message.warning('请先选择一个连接');
      return;
    }

    setLoading(true);

    try {
      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        query: query.trim(),
      };

      const result = await safeTauriInvoke<QueryResult>('execute_query', { request });
      setQueryResult(result);
      message.success(`查询完成，返回 ${result.rowCount} 行数据，耗时 ${result.executionTime}ms`);
    } catch (error) {
      message.error(`查询执行失败: ${error}`);
      console.error('Query error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存查询
  const handleSaveQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    try {
      const savedQuery = {
        id: `query_${Date.now()}`,
        name: `查询_${new Date().toLocaleString()}`,
        query: query.trim(),
        database: selectedDatabase,
        tags: [],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await safeTauriInvoke('save_query', { query: savedQuery });
      message.success('查询已保存');
    } catch (error) {
      message.error(`保存查询失败: ${error}`);
    }
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
      render: (text: any, record: any) => (
        <QueryResultContextMenu
          selectedData={text}
          columnName={col}
          rowData={record}
          onAction={(action, data) => {
            console.log('查询结果操作:', action, data);
            // 处理上下文菜单操作
            if (action === 'filter_by_value') {
              const newQuery = `${query} WHERE "${col}" = '${text}'`;
              setQuery(newQuery);
            } else if (action === 'sort_asc') {
              const newQuery = `${query} ORDER BY "${col}" ASC`;
              setQuery(newQuery);
            } else if (action === 'sort_desc') {
              const newQuery = `${query} ORDER BY "${col}" DESC`;
              setQuery(newQuery);
            }
          }}
        >
          <span style={{ cursor: 'pointer' }}>{text}</span>
        </QueryResultContextMenu>
      ),
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

  if (!activeConnectionId) {
    return (
      <div className="p-6">
        <Alert
          message="请先连接到 InfluxDB"
          description="在连接管理页面选择一个连接并激活后，才能执行查询。"
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          action={
            <Button size="small" type="primary">
              去连接
            </Button>
          }
        />
      </div>
    );
  }

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
          <Button
            icon={<DatabaseOutlined />}
            onClick={loadDatabases}
            loading={loadingDatabases}
          >
            刷新数据库
          </Button>
          <Select
            placeholder="选择数据库"
            value={selectedDatabase}
            onChange={setSelectedDatabase}
            style={{ width: 200 }}
            loading={loadingDatabases}
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
            styles={{ body: { padding: '12px', height: 'calc(100% - 57px)', overflow: 'auto' } }}
          >
            <Tree
              showIcon
              defaultExpandAll
              treeData={databaseStructure}
              onSelect={handleTreeNodeClick}
              titleRender={(nodeData) => (
                <span className="cursor-pointer hover:bg-blue-50 px-1 rounded">
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
              height="300px"
              language="influxql"
              theme="vs-light"
              value={query}
              onChange={(value) => setQuery(value || '')}
              onMount={handleEditorDidMount}
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
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
        </div>
      </Card>

      {/* 查询结果 */}
      <Card
        title="查询结果"
        className="w-full"
        extra={
          queryResult && (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => setExportDialogVisible(true)}
            >
              导出
            </Button>
          )
        }
      >
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

      {/* 导出对话框 */}
      <ExportDialog
        visible={exportDialogVisible}
        onClose={() => setExportDialogVisible(false)}
        queryResult={queryResult}
        defaultFilename={`query-${selectedDatabase}`}
      />
    </div>
  );
};

export default Query;
