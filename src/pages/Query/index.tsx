import React, { useState, useEffect, useMemo } from 'react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger, TabsContent, Alert, Tree, Card, CardHeader, CardTitle, CardContent, Typography, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import { Save, Database, Download, History, Tags, PlayCircle, AlertCircle, Clock, FileText, Plus, X, MoreHorizontal, FolderOpen, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { registerInfluxQLLanguage, createInfluxQLCompletionProvider } from '@/utils/influxql-language';
import ExportDialog from '@/components/common/ExportDialog';
import QueryResultContextMenu from '@/components/query/QueryResultContextMenu';
import type { QueryResult, QueryRequest } from '@/types';

// 移除Ant Design的Option组件

interface QueryTab {
  id: string;
  title: string;
  query: string;
  selectedConnectionId: string;
  selectedDatabase: string;
  queryResult: QueryResult | null;
  loading: boolean;
}

const Query: React.FC = () => {
  const { toast } = useToast();
  const { activeConnectionId, connectedConnectionIds, connections, getConnection, isConnectionConnected } = useConnectionStore();
  
  // 多标签支持
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
    {
      id: 'tab-1',
      title: '查询1',
      query: 'SELECT * FROM measurement_name LIMIT 10',
      selectedConnectionId: '',
      selectedDatabase: '',
      queryResult: null,
      loading: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  
  const [databases, setDatabases] = useState<string[]>([]);
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [fieldTagMap, setFieldTagMap] = useState<Record<string, { fields: string[]; tags: string[] }>>({});
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('results');
  
  // 获取当前活跃标签
  const activeTab = queryTabs.find(tab => tab.id === activeTabId) || queryTabs[0];
  
  // 兼容性属性（使用当前活跃标签的值）
  const query = activeTab?.query || '';
  const selectedConnectionId = activeTab?.selectedConnectionId || '';
  const selectedDatabase = activeTab?.selectedDatabase || '';
  const queryResult = activeTab?.queryResult || null;
  const loading = activeTab?.loading || false;
  
  // 更新活跃标签的属性
  const updateActiveTab = (updates: Partial<QueryTab>) => {
    setQueryTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };
  
  // 设置查询内容
  const setQuery = (newQuery: string) => {
    updateActiveTab({ query: newQuery });
  };
  
  // 设置选中的连接
  const setSelectedConnectionId = (connectionId: string) => {
    updateActiveTab({ selectedConnectionId: connectionId });
  };
  
  // 设置选中的数据库
  const setSelectedDatabase = (database: string) => {
    updateActiveTab({ selectedDatabase: database });
  };
  
  // 设置查询结果
  const setQueryResult = (result: QueryResult | null) => {
    updateActiveTab({ queryResult: result });
  };
  
  // 设置加载状态
  const setLoading = (isLoading: boolean) => {
    updateActiveTab({ loading: isLoading });
  };

  const currentConnection = selectedConnectionId ? getConnection(selectedConnectionId) : null;
  const connectedConnections = connections.filter(conn => isConnectionConnected(conn.id));
  
  // 添加新标签
  const addNewTab = () => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: QueryTab = {
      id: newTabId,
      title: `查询${queryTabs.length + 1}`,
      query: 'SELECT * FROM measurement_name LIMIT 10',
      selectedConnectionId: connectedConnections[0]?.id || '',
      selectedDatabase: '',
      queryResult: null,
      loading: false
    };
    setQueryTabs(tabs => [...tabs, newTab]);
    setActiveTabId(newTabId);
  };
  
  // 关闭标签
  const closeTab = (tabId: string) => {
    if (queryTabs.length === 1) return; // 保持至少一个标签
    
    const tabIndex = queryTabs.findIndex(tab => tab.id === tabId);
    const newTabs = queryTabs.filter(tab => tab.id !== tabId);
    setQueryTabs(newTabs);
    
    // 如果关闭的是当前活跃标签，切换到相邻标签
    if (tabId === activeTabId) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  };

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
      
      // 更新字段标签映射
      setFieldTagMap(prev => ({
        ...prev,
        [measurement]: {
          fields: fieldList,
          tags: tagList
        }
      }));
    } catch (error) {
      console.error('加载字段和标签失败:', error);
    }
  };

  // 动态获取指定测量的字段信息
  const getFieldsForMeasurement = async (measurement: string): Promise<string[]> => {
    if (!selectedConnectionId || !selectedDatabase) return [];
    
    // 如果已经缓存了，直接返回
    if (fieldTagMap[measurement]) {
      return fieldTagMap[measurement].fields;
    }
    
    try {
      const fieldList = await safeTauriInvoke<string[]>('get_field_keys', {
        connectionId: selectedConnectionId,
        database: selectedDatabase,
        measurement
      });
      
      // 更新缓存
      setFieldTagMap(prev => ({
        ...prev,
        [measurement]: {
          ...prev[measurement],
          fields: fieldList
        }
      }));
      
      return fieldList;
    } catch (error) {
      console.error(`获取测量 ${measurement} 的字段失败:`, error);
      return [];
    }
  };

  // 动态获取指定测量的标签信息
  const getTagsForMeasurement = async (measurement: string): Promise<string[]> => {
    if (!selectedConnectionId || !selectedDatabase) return [];
    
    // 如果已经缓存了，直接返回
    if (fieldTagMap[measurement]) {
      return fieldTagMap[measurement].tags;
    }
    
    try {
      const tagList = await safeTauriInvoke<string[]>('get_tag_keys', {
        connectionId: selectedConnectionId,
        database: selectedDatabase,
        measurement
      });
      
      // 更新缓存
      setFieldTagMap(prev => ({
        ...prev,
        [measurement]: {
          ...prev[measurement],
          tags: tagList
        }
      }));
      
      return tagList;
    } catch (error) {
      console.error(`获取测量 ${measurement} 的标签失败:`, error);
      return [];
    }
  };

  // 初始化编辑器
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);

    // 注册 InfluxQL 语言
    registerInfluxQLLanguage();

    // 获取当前连接的InfluxDB版本
    const connectionId = selectedConnectionId || activeConnectionId;
    const connection = connectionId ? getConnection(connectionId) : null;
    const influxVersion = connection?.version || '1.8'; // 默认使用1.8版本
    
    // 注册增强的智能自动补全提供器，支持版本兼容和上下文感知
    const completionProvider = createInfluxQLCompletionProvider(
      databases,
      measurements,
      fields,
      tags,
      influxVersion,
      selectedDatabase, // 传递当前选中的数据库
      fieldTagMap, // 传递字段标签映射
      getFieldsForMeasurement, // 传递动态字段获取函数
      getTagsForMeasurement // 传递动态标签获取函数
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
      // 获取当前连接的InfluxDB版本
      const connectionId = selectedConnectionId || activeConnectionId;
      const connection = connectionId ? getConnection(connectionId) : null;
      const influxVersion = connection?.version || '1.8'; // 默认使用1.8版本
      
      // 重新注册增强的智能自动补全提供器，支持版本兼容和上下文感知
      const completionProvider = createInfluxQLCompletionProvider(
        databases,
        measurements,
        fields,
        tags,
        influxVersion,
        selectedDatabase, // 传递当前选中的数据库
        fieldTagMap, // 传递字段标签映射
        getFieldsForMeasurement, // 传递动态字段获取函数
        getTagsForMeasurement // 传递动态标签获取函数
      );

      monaco.languages.registerCompletionItemProvider('influxql', completionProvider);
    }
  }, [databases, measurements, fields, tags, editorInstance, selectedConnectionId, activeConnectionId, getConnection, selectedDatabase, fieldTagMap]);

  // 初始化时选择活跃连接或第一个已连接的连接
  useEffect(() => {
    const targetConnectionId = activeConnectionId || (connectedConnections.length > 0 ? connectedConnections[0].id : null);
    
    if (targetConnectionId && !selectedConnectionId) {
      setSelectedConnectionId(targetConnectionId);
    }
  }, [activeConnectionId, connectedConnections, selectedConnectionId]);

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
        icon: <TableIcon className="w-4 h-4"  />,
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

    // 使用当前活跃连接如果没有选择特定连接
    const connectionId = selectedConnectionId || activeConnectionId;
    if (!connectionId) {
      toast({ title: "警告", description: "请先连接到数据源" });
      return;
    }

    if (!selectedDatabase) {
      toast({ title: "警告", description: "请选择数据库" });
      return;
    }

    setLoading(true);

    try {
      const request: QueryRequest = {
        connectionId: connectionId,
        database: selectedDatabase,
        query: query.trim()};

      const result = await safeTauriInvoke<QueryResult>('execute_query', { request });
      setQueryResult(result);
      setActiveResultTab('results'); // 自动切换到结果标签页
      toast({ title: "成功", description: `查询完成，返回 ${result.rowCount} 行数据，耗时 ${result.executionTime}ms` });
    } catch (error) {
      toast({ title: "错误", description: `查询执行失败: ${error}`, variant: "destructive" });
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
      toast({ title: "错误", description: `保存查询失败: ${error}`, variant: "destructive" });
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

  // 移除不必要的连接检查 - 查询面板应该始终可用，只在执行时检查连接

  return (
    <div className="p-6 h-full flex flex-col">
      {/* 优化后的标签栏和工具栏 */}
      <div className="flex flex-col gap-3 mb-4">
        {/* 标签栏 - 固定高度，防止被挤压 */}
        <div className="flex items-center gap-2 border-b h-12 flex-shrink-0">
          <div className="flex-1 min-w-0 overflow-hidden">
            <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
              <TabsList className="h-10 p-0 bg-transparent justify-start overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {queryTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="relative px-3 py-2 h-10 data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent hover:border-muted-foreground/50 min-w-[100px] max-w-[180px] flex-shrink-0 group"
                  >
                    <span className="truncate flex-1 text-sm">{tab.title}</span>
                    {queryTabs.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* 标签栏右侧操作区 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={addNewTab}
              className="h-8 w-8 p-0"
              title="新建查询标签 (Ctrl+T)"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* 标签管理下拉菜单 */}
            {queryTabs.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="标签管理"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    queryTabs.forEach(tab => {
                      if (tab.id !== activeTabId) {
                        closeTab(tab.id);
                      }
                    });
                  }}>
                    关闭其他标签
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const currentIndex = queryTabs.findIndex(tab => tab.id === activeTabId);
                    queryTabs.forEach((tab, index) => {
                      if (index > currentIndex) {
                        closeTab(tab.id);
                      }
                    });
                  }}>
                    关闭右侧标签
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    queryTabs.forEach(tab => {
                      if (tab.id !== activeTabId) {
                        closeTab(tab.id);
                      }
                    });
                  }}>
                    关闭所有标签
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* 工具栏 - 优化布局和响应式 */}
        <div className="flex items-center justify-between gap-4 min-h-[40px]">
          <div className="flex-shrink-0 min-w-0">
            <Typography variant="h3" className="text-lg font-semibold truncate">数据查询</Typography>
            {currentConnection && (
              <p className="text-muted-foreground text-sm truncate">
                当前连接: {currentConnection.name} ({currentConnection.host}:{currentConnection.port})
              </p>
            )}
          </div>

          {/* 右侧控制区域 - 使用flex-shrink-0确保不被挤压 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 数据源选择 */}
            <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="选择数据源" />
              </SelectTrigger>
              <SelectContent>
                {connectedConnections.map(conn => (
                  <SelectItem key={conn.id} value={conn.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="truncate">{conn.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 数据库选择 */}
            <Select value={selectedDatabase} onValueChange={setSelectedDatabase} disabled={loadingDatabases || !selectedConnectionId}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="选择数据库" />
              </SelectTrigger>
              <SelectContent>
                {databases.map(db => (
                  <SelectItem key={db} value={db}>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{db}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 刷新按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadDatabases}
              disabled={loadingDatabases || !selectedConnectionId}
              className="h-9 px-3 flex-shrink-0"
              title="刷新数据库列表"
            >
              <Database className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* 左侧数据库结构树 */}
        <div className="col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">数据库结构</CardTitle>
            </CardHeader>
            <CardContent className="p-3 h-[calc(100%-4rem)] overflow-auto">
              <Tree
                showIcon
                defaultExpandAll
                treeData={databaseStructure}
                onSelect={handleTreeNodeClick}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右侧查询区域 */}
        <div className="col-span-9">
          <div className="space-y-4 h-full flex flex-col">
          {/* 查询编辑器 */}
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">查询编辑器</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-4">
          {/* 优化后的工具栏 - 统一使用shadcn组件 */}
          <div className="flex items-center justify-between flex-wrap gap-3 min-h-[40px]">
            <div className="flex items-center gap-3 flex-wrap">
              {/* 主要操作按钮组 */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExecuteQuery}
                  disabled={loading || !selectedDatabase || !selectedConnectionId}
                  size="sm"
                  className="h-9 px-4"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  执行
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveQuery}
                  disabled={!query.trim()}
                  size="sm"
                  className="h-9 px-4"
                >
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>

                {/* 更多操作下拉菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>
                      <FolderOpen className="w-4 h-4 mr-2" />
                      打开查询
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <History className="w-4 h-4 mr-2" />
                      查询历史
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setExportDialogVisible(true)}
                      disabled={!queryResult}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      导出结果
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="w-4 h-4 mr-2" />
                      编辑器设置
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* 快捷键提示 */}
              <div className="text-sm text-muted-foreground hidden sm:block">
                Ctrl+Enter 执行 | Ctrl+S 保存
              </div>
            </div>

            {/* 查询结果信息 */}
            {queryResult && (
              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md flex-shrink-0">
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
        </CardContent>
      </Card>

      {/* 查询结果区域 */}
      <Card className="w-full flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">查询结果</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-4rem)]">
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
              <TableIcon className="w-4 h-4" />
              结果
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages" className="h-full mt-4">
            <div className="h-full border rounded-lg p-4 bg-muted/20 overflow-auto">
              {loading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">正在执行查询...</span>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    <div className="font-medium mb-1">执行中的 SQL:</div>
                    <pre className="text-xs">{query}</pre>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    数据源: {currentConnection?.name} | 数据库: {selectedDatabase}
                  </div>
                </div>
              ) : queryResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="font-medium">查询执行成功</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-green-50 border border-green-200 p-3 rounded">
                      <div className="font-medium text-green-800 mb-1">执行统计</div>
                      <div className="text-green-700">
                        <div>返回行数: {queryResult.rowCount}</div>
                        <div>执行时间: {queryResult.executionTime}ms</div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                      <div className="font-medium text-blue-800 mb-1">连接信息</div>
                      <div className="text-blue-700">
                        <div>数据源: {currentConnection?.name}</div>
                        <div>数据库: {selectedDatabase}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded">
                    <div className="font-medium text-sm mb-2">执行的 SQL 语句:</div>
                    <pre className="text-xs overflow-auto">{query}</pre>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    执行时间: {new Date().toLocaleString()}
                  </div>
                </div>
              ) : !activeConnectionId && !selectedConnectionId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>请先连接到数据源</div>
                  <div className="text-xs mt-1">在左侧数据源树中连接数据库后即可执行查询</div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>暂无消息</div>
                  <div className="text-xs mt-1">执行查询后将显示执行信息</div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="h-full mt-4">
            <div className="h-full border rounded-lg p-4 bg-muted/20 overflow-auto">
              {queryResult ? (
                <div className="space-y-6">
                  {/* 查询概述 */}
                  <div className="bg-background border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      查询概述
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">数据源:</span>
                          <span className="font-medium">{currentConnection?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">主机:</span>
                          <span className="font-medium">{currentConnection?.host}:{currentConnection?.port}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">数据库:</span>
                          <span className="font-medium">{selectedDatabase}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">执行时间:</span>
                          <span className="font-medium text-green-600">{queryResult.executionTime}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">返回行数:</span>
                          <span className="font-medium text-blue-600">{queryResult.rowCount} 行</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">查询类型:</span>
                          <span className="font-medium">{query.trim().split(' ')[0].toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 数据结构 */}
                  {queryResult.series && queryResult.series.length > 0 && (
                    <div className="bg-background border rounded-lg p-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <TableIcon className="w-4 h-4" />
                        数据结构
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">列数:</span>
                          <span className="font-medium">{queryResult.series[0].columns?.length || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground mb-2 block">列名:</span>
                          <div className="flex flex-wrap gap-1">
                            {queryResult.series[0].columns?.map((col: string, index: number) => (
                              <span key={index} className="bg-muted px-2 py-1 rounded text-xs">{col}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SQL 语句 */}
                  <div className="bg-background border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">查询语句</h4>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-auto max-h-32 border">
                      {query}
                    </pre>
                  </div>
                </div>
              ) : !activeConnectionId && !selectedConnectionId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>请先连接到数据源</div>
                  <div className="text-xs mt-1">在左侧数据源树中连接数据库后即可执行查询</div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>暂无摘要信息</div>
                  <div className="text-xs mt-1">执行查询后将显示详细摘要</div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="h-full mt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-muted-foreground">执行查询中...</span>
              </div>
            ) : queryResult ? (
              <Tabs defaultValue="table" className="h-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table">表格视图</TabsTrigger>
                  <TabsTrigger value="json">JSON 视图</TabsTrigger>
                </TabsList>
                <TabsContent value="table" className="h-full mt-4">
                  <div className="border rounded-lg overflow-auto h-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {columns.map((col: any) => (
                            <TableHead key={col.key} className="whitespace-nowrap">
                              {col.title}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dataSource.slice(0, 50).map((row: any, index: number) => (
                          <TableRow key={row.key || index}>
                            {columns.map((col: any) => (
                              <TableCell key={col.key} className="whitespace-nowrap">
                                <QueryResultContextMenu
                                  selectedData={row[col.dataIndex]}
                                  columnName={col.dataIndex}
                                  rowData={row}
                                  onAction={(action, data) => {
                                    console.log('查询结果操作:', action, data);
                                    if (action === 'filter_by_value') {
                                      const newQuery = `${query} WHERE "${col.dataIndex}" = '${row[col.dataIndex]}'`;
                                      setQuery(newQuery);
                                    } else if (action === 'sort_asc') {
                                      const newQuery = `${query} ORDER BY "${col.dataIndex}" ASC`;
                                      setQuery(newQuery);
                                    } else if (action === 'sort_desc') {
                                      const newQuery = `${query} ORDER BY "${col.dataIndex}" DESC`;
                                      setQuery(newQuery);
                                    }
                                  }}
                                >
                                  <span className="cursor-pointer">{row[col.dataIndex]}</span>
                                </QueryResultContextMenu>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {dataSource.length > 50 && (
                      <div className="p-4 text-center text-muted-foreground border-t">
                        显示前 50 行，共 {dataSource.length} 行数据
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="json" className="h-full mt-4">
                  <pre className="bg-muted/50 p-4 rounded overflow-auto h-full text-xs">
                    {JSON.stringify(queryResult, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
            ) : !activeConnectionId && !selectedConnectionId ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>请先连接到数据源</div>
                <div className="text-xs mt-1">在左侧数据源树中连接数据库后即可执行查询</div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>请执行查询以查看结果</div>
                <div className="text-xs mt-1">输入 SQL 查询语句并点击执行按钮</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
          </div>
        </div>
      </div>

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
