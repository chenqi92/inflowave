/**
 * 多数据库查询引擎组件
 * 
 * 支持多种数据库类型的统一查询界面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Separator,
  Alert,
  AlertDescription,
  Progress,
  Typography,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import {
  Play,
  Square,
  Save,
  Download,
  RefreshCw,
  Settings,
  History,
  Database,
  TreePine,
  BarChart,
  Search,
  Zap,
  Clock,
  FileText,
  Code,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { DatabaseType, QueryResult } from '@/types';

// 数据库查询语言配置
const DATABASE_QUERY_LANGUAGES = {
  influxdb: {
    name: 'InfluxQL/Flux',
    languages: ['influxql', 'flux'],
    defaultLanguage: 'influxql',
    examples: {
      influxql: 'SELECT * FROM "measurement" WHERE time >= now() - 1h',
      flux: 'from(bucket: "my-bucket")\n  |> range(start: -1h)\n  |> filter(fn: (r) => r._measurement == "measurement")',
    },
  },
  iotdb: {
    name: 'SQL',
    languages: ['sql'],
    defaultLanguage: 'sql',
    examples: {
      sql: 'SELECT * FROM root.sg1.d1 WHERE time >= now() - 1h',
    },
  },
  prometheus: {
    name: 'PromQL',
    languages: ['promql'],
    defaultLanguage: 'promql',
    examples: {
      promql: 'up{job="prometheus"}[5m]',
    },
  },
  elasticsearch: {
    name: 'Query DSL',
    languages: ['json'],
    defaultLanguage: 'json',
    examples: {
      json: '{\n  "query": {\n    "match_all": {}\n  },\n  "size": 10\n}',
    },
  },
} as const;

// 数据库图标映射
const DATABASE_ICONS = {
  influxdb: <Database className="w-4 h-4 text-blue-500" />,
  iotdb: <TreePine className="w-4 h-4 text-green-500" />,
  prometheus: <BarChart className="w-4 h-4 text-orange-500" />,
  elasticsearch: <Search className="w-4 h-4 text-purple-500" />,
} as const;

interface MultiDatabaseQueryEngineProps {
  className?: string;
  onQueryExecute?: (query: string, database: string, language: string) => void;
  onQueryResult?: (result: QueryResult) => void;
}

export const MultiDatabaseQueryEngine: React.FC<MultiDatabaseQueryEngineProps> = ({
  className,
  onQueryExecute,
  onQueryResult,
}) => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();
  const { resolvedTheme } = useTheme();

  // State
  const [query, setQuery] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [executing, setExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('editor');

  // 获取当前连接
  const currentConnection = connections.find(conn => conn.id === activeConnectionId);
  const dbType = currentConnection?.dbType || 'influxdb';

  // 获取查询语言配置
  const queryLanguageConfig = DATABASE_QUERY_LANGUAGES[dbType];

  // 获取可用数据库列表
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);

  // 加载数据库列表
  const loadDatabases = useCallback(async () => {
    if (!activeConnectionId) return;

    try {
      const databases = await safeTauriInvoke('get_databases', {
        connectionId: activeConnectionId,
      });
      setAvailableDatabases(databases);
      
      // 自动选择第一个数据库
      if (databases.length > 0 && !selectedDatabase) {
        setSelectedDatabase(databases[0]);
      }
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      showMessage.error(`加载数据库列表失败: ${error}`);
    }
  }, [activeConnectionId, selectedDatabase]);

  // 初始化查询语言
  useEffect(() => {
    if (queryLanguageConfig && !selectedLanguage) {
      setSelectedLanguage(queryLanguageConfig.defaultLanguage);
    }
  }, [queryLanguageConfig, selectedLanguage]);

  // 加载数据库列表
  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  // 设置示例查询
  const setExampleQuery = useCallback(() => {
    if (queryLanguageConfig && selectedLanguage) {
      const example = queryLanguageConfig.examples[selectedLanguage as keyof typeof queryLanguageConfig.examples];
      if (example) {
        setQuery(example);
      }
    }
  }, [queryLanguageConfig, selectedLanguage]);

  // 执行查询
  const executeQuery = useCallback(async () => {
    if (!query.trim() || !activeConnectionId || !selectedDatabase) {
      showMessage.warning('请输入查询语句并选择数据库');
      return;
    }

    setExecuting(true);
    const startTime = Date.now();

    try {
      const result = await safeTauriInvoke('execute_query', {
        connectionId: activeConnectionId,
        query: query.trim(),
        database: selectedDatabase,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setQueryResult(result);
      setExecutionTime(duration);
      setActiveTab('results');
      
      // 通知父组件
      onQueryExecute?.(query, selectedDatabase, selectedLanguage);
      onQueryResult?.(result);
      
      showMessage.success(`查询执行成功，耗时 ${duration}ms`);
    } catch (error) {
      console.error('查询执行失败:', error);
      showMessage.error(`查询执行失败: ${error}`);
    } finally {
      setExecuting(false);
    }
  }, [query, activeConnectionId, selectedDatabase, selectedLanguage, onQueryExecute, onQueryResult]);

  // 停止查询
  const stopQuery = useCallback(async () => {
    if (!activeConnectionId) return;

    try {
      await safeTauriInvoke('cancel_query', {
        connectionId: activeConnectionId,
      });
      setExecuting(false);
      showMessage.info('查询已取消');
    } catch (error) {
      console.error('取消查询失败:', error);
      showMessage.error(`取消查询失败: ${error}`);
    }
  }, [activeConnectionId]);

  // 保存查询
  const saveQuery = useCallback(async () => {
    if (!query.trim()) {
      showMessage.warning('请输入查询语句');
      return;
    }

    try {
      await safeTauriInvoke('save_query', {
        connectionId: activeConnectionId,
        query: query.trim(),
        database: selectedDatabase,
        language: selectedLanguage,
        name: `Query_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`,
      });
      
      showMessage.success('查询已保存');
    } catch (error) {
      console.error('保存查询失败:', error);
      showMessage.error(`保存查询失败: ${error}`);
    }
  }, [query, activeConnectionId, selectedDatabase, selectedLanguage]);

  // 导出结果
  const exportResult = useCallback(async () => {
    if (!queryResult) {
      showMessage.warning('没有可导出的查询结果');
      return;
    }

    try {
      await safeTauriInvoke('export_query_result', {
        result: queryResult,
        format: 'csv',
      });
      
      showMessage.success('查询结果已导出');
    } catch (error) {
      console.error('导出结果失败:', error);
      showMessage.error(`导出结果失败: ${error}`);
    }
  }, [queryResult]);

  // 获取 Monaco 编辑器语言
  const getMonacoLanguage = (language: string): string => {
    switch (language) {
      case 'influxql':
      case 'sql':
        return 'sql';
      case 'flux':
        return 'javascript'; // Flux 语法类似 JavaScript
      case 'promql':
        return 'yaml'; // PromQL 使用 YAML 高亮
      case 'json':
        return 'json';
      default:
        return 'sql';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {DATABASE_ICONS[dbType]}
            <span>多数据库查询引擎</span>
            {currentConnection && (
              <Badge variant="outline">
                {currentConnection.dbType?.toUpperCase() || 'INFLUXDB'}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* 数据库选择 */}
            <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="选择数据库" />
              </SelectTrigger>
              <SelectContent>
                {availableDatabases.map((db) => (
                  <SelectItem key={db} value={db}>
                    {db}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 查询语言选择 */}
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="查询语言" />
              </SelectTrigger>
              <SelectContent>
                {queryLanguageConfig?.languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={setExampleQuery}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>插入示例查询</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveQuery}
                    disabled={!query.trim()}
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>保存查询</TooltipContent>
              </Tooltip>

              {executing ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopQuery}
                >
                  <Square className="w-4 h-4" />
                  停止
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={executeQuery}
                  disabled={!query.trim() || !selectedDatabase}
                >
                  <Play className="w-4 h-4" />
                  执行
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">查询编辑器</TabsTrigger>
            <TabsTrigger value="results">查询结果</TabsTrigger>
            <TabsTrigger value="history">查询历史</TabsTrigger>
          </TabsList>

          {/* 查询编辑器 */}
          <TabsContent value="editor" className="space-y-4">
            <div className="h-64 border rounded-md overflow-hidden">
              <Editor
                height="100%"
                language={getMonacoLanguage(selectedLanguage)}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
                value={query}
                onChange={(value) => setQuery(value || '')}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>

            {/* 查询信息 */}
            {queryLanguageConfig && (
              <Alert>
                <Code className="w-4 h-4" />
                <AlertDescription>
                  当前使用 <strong>{queryLanguageConfig.name}</strong> 查询语言。
                  支持的语言: {queryLanguageConfig.languages.map(lang => lang.toUpperCase()).join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* 查询结果 */}
          <TabsContent value="results" className="space-y-4">
            {executing && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在执行查询...</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}

            {queryResult && (
              <div className="space-y-4">
                {/* 结果统计 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {executionTime}ms
                    </Badge>
                    <Badge variant="outline">
                      {queryResult.rowCount || 0} 行
                    </Badge>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportResult}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    导出
                  </Button>
                </div>

                {/* 结果展示 */}
                <div className="border rounded-md p-4 bg-muted/50">
                  <pre className="text-sm overflow-auto max-h-96">
                    {JSON.stringify(queryResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {!executing && !queryResult && (
              <div className="text-center text-muted-foreground py-8">
                执行查询以查看结果
              </div>
            )}
          </TabsContent>

          {/* 查询历史 */}
          <TabsContent value="history" className="space-y-4">
            <div className="text-center text-muted-foreground py-8">
              查询历史功能开发中...
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MultiDatabaseQueryEngine;
