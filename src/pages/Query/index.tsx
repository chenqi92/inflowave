import React, { useState, useEffect, useMemo } from 'react';
import { Button, Select, Tabs, TabsList, TabsTrigger, TabsContent, Spin, Row, Col, Alert, Tree, Card, Typography, Separator } from '@/components/ui';
import { Save, Database, Table as TableIcon, Download, History, Tags, PlayCircle, AlertCircle, Clock, Table, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { registerInfluxQLLanguage, createInfluxQLCompletionProvider } from '@/utils/influxql-language';
import ExportDialog from '@/components/common/ExportDialog';
import QueryResultContextMenu from '@/components/query/QueryResultContextMenu';
import type { QueryResult, QueryRequest } from '@/types';

const { Option } = Select;

const Query: React.FC = () => {
  const { toast } = useToast();
  const { activeConnectionId, connectedConnectionIds, connections, getConnection, isConnectionConnected } = useConnectionStore();
  const [query, setQuery] = useState('SELECT * FROM measurement_name LIMIT 10');
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
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
  const [activeResultTab, setActiveResultTab] = useState('results');

  const currentConnection = selectedConnectionId ? getConnection(selectedConnectionId) : null;
  const connectedConnections = connections.filter(conn => isConnectionConnected(conn.id));

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!selectedConnectionId) return;

    setLoadingDatabases(true);
    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: selectedConnectionId});
      setDatabases(dbList);

      // 如果有数据库且没有选中的，选择第一个
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      toast({ title: "错误", description: "加载数据库列表失败: ${error}", variant: "destructive" });
    } finally {
      setLoadingDatabases(false);
    }
  };

  // 加载测量列表
  const loadMeasurements = async (database: string) => {
    if (!selectedConnectionId || !database) return;

    try {
      const measurementList = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId: selectedConnectionId,
        database});
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
    if (!selectedConnectionId) return;

    try {
      const [fieldList, tagList] = await Promise.all([
        safeTauriInvoke<string[]>('get_field_keys', {
          connectionId: selectedConnectionId,
          database,
          measurement}).catch(() => []),
        safeTauriInvoke<string[]>('get_tag_keys', {
          connectionId: selectedConnectionId,
          database,
          measurement}).catch(() => []),
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
      automaticLayout: true});

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

  // 初始化时选择第一个已连接的连接
  useEffect(() => {
    if (connectedConnections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connectedConnections[0].id);
    }
  }, [connectedConnections, selectedConnectionId]);

  // 组件挂载时加载数据
  useEffect(() => {
    if (selectedConnectionId) {
      loadDatabases();
    }
  }, [selectedConnectionId]);

  // 选中数据库变化时加载测量
  useEffect(() => {
    if (selectedDatabase) {
      loadMeasurements(selectedDatabase);
    }
  }, [selectedDatabase]);

  // 构建数据库结构树数据
  const databaseStructure = useMemo(() => {
    if (!databases || databases.length === 0) {
      return [];
    }
    
    return databases.map((db, dbIndex) => ({
      title: db,
      key: `db-${db}-${dbIndex}`, // 确保 key 唯一
      icon: <Database className="w-4 h-4"  />,
      children: measurements && measurements.length > 0 ? measurements.map((measurement, measurementIndex) => ({
        title: measurement,
        key: `${db}-${measurement}-${measurementIndex}`, // 确保 key 唯一
        icon: <Table className="w-4 h-4"  />,
        children: [
          {
            title: 'Fields',
            key: `${db}-${measurement}-fields-${measurementIndex}`,
            icon: <Clock />,
            children: [], // 可以在这里加载字段信息
          },
          {
            title: 'Tags',
            key: `${db}-${measurement}-tags-${measurementIndex}`,
            icon: <Tags className="w-4 h-4"  />,
            children: [], // 可以在这里加载标签信息
          },
        ]})) : []}));
  }, [databases, measurements]);

  // 处理树节点点击
  const handleTreeNodeClick = (selectedKeys: React.Key[], _: any) => {
    const key = selectedKeys[0] as string;
    
    // 解析新的 key 格式: db-{dbName}-{dbIndex} 或 {dbName}-{measurementName}-{measurementIndex}
    if (key && !key.includes('-fields') && !key.includes('-tags')) {
      const parts = key.split('-');
      
      // 如果是数据库节点: db-{dbName}-{dbIndex}
      if (parts[0] === 'db' && parts.length >= 3) {
        const database = parts[1];
        setSelectedDatabase(database);
      }
      // 如果是测量节点: {dbName}-{measurementName}-{measurementIndex}
      else if (parts.length >= 3) {
        const database = parts[0];
        const measurement = parts.slice(1, -1).join('-'); // 排除最后的索引，处理测量名包含连字符的情况
        setSelectedDatabase(database);
        setQuery(`SELECT * FROM "${measurement}" LIMIT 10`);
      }
    }
  };

  // 执行查询
  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      toast({ title: "警告", description: "请输入查询语句" });
      return;
    }

    if (!selectedDatabase) {
      toast({ title: "警告", description: "请选择数据库" });
      return;
    }

    if (!selectedConnectionId) {
      toast({ title: "警告", description: "请先选择一个连接" });
      return;
    }

    setLoading(true);

    try {
      const request: QueryRequest = {
        connectionId: selectedConnectionId,
        database: selectedDatabase,
        query: query.trim()};

      const result = await safeTauriInvoke<QueryResult>('execute_query', { request });
      setQueryResult(result);
      toast({ title: "成功", description: "查询完成，返回 ${result.rowCount} 行数据，耗时 ${result.executionTime}ms" });
    } catch (error) {
      toast({ title: "错误", description: "查询执行失败: ${error}", variant: "destructive" });
      console.error('Query error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存查询
  const handleSaveQuery = async () => {
    if (!query.trim()) {
      toast({ title: "警告", description: "请输入查询语句" });
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
        updatedAt: new Date()};

      await safeTauriInvoke('save_query', { query: savedQuery });
      toast({ title: "成功", description: "查询已保存" });
    } catch (error) {
      toast({ title: "错误", description: "保存查询失败: ${error}", variant: "destructive" });
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
      )}));

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

  if (connectedConnections.length === 0) {
    return (
      <div className="p-6">
        <Alert
          message="请先连接到 InfluxDB"
          description="在数据源菜单中双击连接或在连接管理页面连接数据库后，才能执行查询。"
          type="warning"
          showIcon
          icon={<AlertCircle />}
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
          <Typography variant="h2" className="text-2xl font-bold mb-2">数据查询</Typography>
          {currentConnection && (
            <p className="text-muted-foreground">
              当前连接: {currentConnection.name} ({currentConnection.host}:{currentConnection.port})
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Select
            placeholder="选择数据源"
            value={selectedConnectionId}
            onValueChange={setSelectedConnectionId}
            style={{ width: 200 }}
          >
            {connectedConnections.map(conn => (
              <Option key={conn.id} value={conn.id}>
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2" />
                {conn.name}
              </Option>
            ))}
          </Select>
          <Button
            icon={<Database className="w-4 h-4"  />}
            onClick={loadDatabases}
            disabled={loadingDatabases || !selectedConnectionId}
          >
            刷新数据库
          </Button>
          <Select
            placeholder="选择数据库"
            value={selectedDatabase}
            onValueChange={setSelectedDatabase}
            style={{ width: 200 }}
            disabled={loadingDatabases || !selectedConnectionId}
          >
            {databases.map(db => (
              <Option key={db} value={db}>
                <Database className="w-4 h-4"  /> {db}
              </Option>
            ))}
          </Select>
        </div>
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
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <Button
                  type="primary"
                  icon={<PlayCircle className="w-4 h-4" />}
                  onClick={handleExecuteQuery}
                  disabled={loading || !selectedDatabase || !selectedConnectionId}
                  size="sm"
                >
                  执行
                </Button>
                
                <Button
                  variant="outline"
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleSaveQuery}
                  disabled={!query.trim()}
                  size="sm"
                >
                  保存
                </Button>
                
                <Button
                  variant="outline"
                  icon={<History className="w-4 h-4" />}
                  size="sm"
                >
                  历史
                </Button>
                
                <Button
                  variant="outline"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => setExportDialogVisible(true)}
                  disabled={!queryResult}
                  size="sm"
                >
                  导出
                </Button>
              </div>
              
              <div className="h-6 w-px bg-border" />
              
              <div className="text-sm text-muted-foreground">
                Ctrl+Enter 执行 | Ctrl+S 保存
              </div>
            </div>
            
            {queryResult && (
              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded">
                执行时间: {queryResult.executionTime}ms | 返回: {queryResult.rowCount} 行
              </div>
            )}
          </div>

          {/* 编辑器 */}
          <div className="query-editor">
            <Editor
              height="300px"
              language="influxql"
              theme="vs-light"
              value={query}
              onValueChange={(value) => setQuery(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto'},
                wordWrap: 'on',
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                formatOnPaste: true,
                formatOnType: true}}
            />
          </div>
        </div>
      </Card>

      {/* 查询结果区域 */}
      <Card
        title="查询结果"
        className="w-full flex-1"
      >
        <Tabs 
          value={activeResultTab} 
          onValueChange={setActiveResultTab}
          className="h-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              消息
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              摘要
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Table className="w-4 h-4" />
              结果
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages" className="h-full mt-4">
            <div className="h-full border rounded-lg p-4 bg-muted/20">
              {loading ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Spin size="small" />
                  <span>正在执行查询...</span>
                </div>
              ) : queryResult ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>查询执行成功</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    返回 {queryResult.rowCount} 行数据，耗时 {queryResult.executionTime}ms
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  暂无消息
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="h-full mt-4">
            <div className="h-full border rounded-lg p-4 bg-muted/20">
              {queryResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">数据源：</span>
                      <span className="ml-2">{currentConnection?.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">数据库：</span>
                      <span className="ml-2">{selectedDatabase}</span>
                    </div>
                    <div>
                      <span className="font-medium">执行时间：</span>
                      <span className="ml-2">{queryResult.executionTime}ms</span>
                    </div>
                    <div>
                      <span className="font-medium">返回行数：</span>
                      <span className="ml-2">{queryResult.rowCount} 行</span>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="font-medium text-sm mb-2">查询语句：</div>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-auto max-h-32">
                      {query}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  执行查询后将显示查询摘要
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="h-full mt-4">
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
                          showTotal: (total) => `共 ${total} 行`}}
                      />
                    )},
                  {
                    key: 'json',
                    label: 'JSON 视图',
                    children: (
                      <pre className="bg-muted/50 p-4 rounded overflow-auto max-h-96">
                        {JSON.stringify(queryResult, null, 2)}
                      </pre>
                    )},
                ]}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                请执行查询以查看结果
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
          </div>
        </Col>
      </Row>

      {/* 导出对话框 */}
      <ExportDialog
        open={exportDialogVisible}
        onClose={() => setExportDialogVisible(false)}
        queryResult={queryResult}
        defaultFilename={`query-${selectedDatabase}`}
      />
    </div>
  );
};

export default Query;
