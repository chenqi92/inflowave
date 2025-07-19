import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Typography,
  Alert,
  AlertTitle,
  AlertDescription,
  Progress,
  Tag,
  Statistic,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Descriptions,
  DescriptionsItem,
  Timeline,
  TimelineItem,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Space,
  Separator,
} from '@/components/ui';

import {
  Zap,
  Rocket,
  Settings,
  Info,
  Eye,
  Download,
  RefreshCw,
  Clock,
  Database,
  TrendingUp,
  Trophy,
  History,
  Webhook,
  Cpu,
  HardDrive,
  Network,
  Share,
  FlaskConical,
  MemoryStick,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import {
  intelligentQueryEngine,
  type QueryOptimizationResult,
  type QueryContext,
} from '@/services/intelligentQuery';
import { showMessage } from '@/utils/message';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { dialog } from '@/utils/dialog';
import * as monaco from 'monaco-editor';
import { readFromClipboard } from '@/utils/clipboard';

const { Text, Paragraph } = Typography;

interface IntelligentQueryEngineProps {
  className?: string;
}

export const IntelligentQueryEngine: React.FC<IntelligentQueryEngineProps> = ({
  className,
}) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const { resolvedTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [database, setDatabase] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] =
    useState<QueryOptimizationResult | null>(null);
  const [activeTab, setActiveTab] = useState('optimizer');
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState<
    QueryOptimizationResult[]
  >([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [queryStats, setQueryStats] = useState<any>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [optimizationConfig, setOptimizationConfig] = useState({
    enableCaching: true,
    enableRouting: true,
    enablePrediction: true,
    optimizationLevel: 'balanced' as 'conservative' | 'balanced' | 'aggressive',
    maxOptimizationTime: 5000,
  });





  // 自定义粘贴处理函数
  const handleCustomPaste = async (editor: monaco.editor.IStandaloneCodeEditor) => {
    try {
      // 桌面应用：使用Tauri剪贴板服务
      const clipboardText = await readFromClipboard({ showError: false });
      if (clipboardText) {
        const selection = editor.getSelection();
        if (selection) {
          editor.executeEdits('paste', [{
            range: selection,
            text: clipboardText,
            forceMoveMarkers: true
          }]);
          editor.focus();
          return;
        }
      }

      // 如果Tauri剪贴板失败，使用Monaco的原生粘贴功能作为备选
      editor.trigger('keyboard', 'editor.action.clipboardPasteAction', null);
    } catch (error) {
      console.error('粘贴操作失败:', error);
      // 降级到Monaco原生粘贴
      editor.trigger('keyboard', 'editor.action.clipboardPasteAction', null);
    }
  };

  // 获取查询统计
  const getQueryStats = useCallback(async () => {
    if (!activeConnectionId) return;

    try {
      const stats =
        await intelligentQueryEngine.getQueryStats(activeConnectionId);
      setQueryStats(stats);
    } catch (error) {
      console.error('获取查询统计失败:', error);
    }
  }, [activeConnectionId]);

  // 优化查询
  const optimizeQuery = useCallback(async () => {
    if (!activeConnectionId || !query.trim()) {
      showMessage.warning('请选择连接并输入查询语句');
      return;
    }

    setLoading(true);
    try {
      const request = {
        query: query.trim(),
        connectionId: activeConnectionId,
        database: database || 'default',
        context: {
          historicalQueries: optimizationHistory.map(h => h.originalQuery),
          userPreferences: {
            preferredPerformance: optimizationConfig.optimizationLevel,
            maxQueryTime: optimizationConfig.maxOptimizationTime,
            cachePreference: optimizationConfig.enableCaching
              ? 'aggressive'
              : 'disabled',
          },
          systemLoad: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskIo: 30,
            networkLatency: 20,
          },
          dataSize: {
            totalRows: 1000000,
            totalSize: 1024 * 1024 * 1024,
            averageRowSize: 1024,
            compressionRatio: 0.3,
          },
          indexInfo: [],
        } as QueryContext,
      };

      const result = await intelligentQueryEngine.optimizeQuery(request);
      setOptimizationResult(result);

      // 添加到历史记录
      setOptimizationHistory(prev => [result, ...prev.slice(0, 9)]);

      showMessage.success('查询优化完成');
    } catch (error) {
      console.error('查询优化失败:', error);
      showMessage.error('查询优化失败');
    } finally {
      setLoading(false);
    }
  }, [
    activeConnectionId,
    query,
    database,
    optimizationConfig,
    optimizationHistory,
  ]);

  // 获取优化建议
  const getOptimizationRecommendations = useCallback(async () => {
    if (!activeConnectionId) return;

    try {
      const recommendations =
        await intelligentQueryEngine.getOptimizationRecommendations(
          activeConnectionId
        );
      return recommendations;
    } catch (error) {
      console.error('获取优化建议失败:', error);
      return [];
    }
  }, [activeConnectionId]);

  // 清空缓存
  const clearCache = useCallback(async () => {
    try {
      await intelligentQueryEngine.clearCache();
      showMessage.success('缓存已清空');
    } catch (error) {
      console.error('清空缓存失败:', error);
      showMessage.error('清空缓存失败');
    }
  }, []);

  useEffect(() => {
    getQueryStats();
  }, [getQueryStats]);

  // 自动优化
  useEffect(() => {
    if (autoOptimize && query.trim()) {
      const timer = setTimeout(() => {
        optimizeQuery();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [query, autoOptimize, optimizeQuery]);

  // 渲染优化器界面
  const renderOptimizer = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              智能查询优化器
            </CardTitle>
            <Space size="small">
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoOptimize}
                  onCheckedChange={setAutoOptimize}
                />
                <Text className="text-sm">
                  {autoOptimize ? '自动优化' : '手动优化'}
                </Text>
              </div>
              <Sheet open={settingsVisible} onOpenChange={setSettingsVisible}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    设置
                  </Button>
                </SheetTrigger>
              </Sheet>
            </Space>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <Select value={database} onValueChange={setDatabase}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择数据库" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">默认数据库</SelectItem>
                  <SelectItem value="analytics">分析数据库</SelectItem>
                  <SelectItem value="cache">缓存数据库</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-3">
              <Space size="small">
                <Button
                  onClick={optimizeQuery}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  优化查询
                </Button>
                <Button
                  variant="outline"
                  onClick={clearCache}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  清空缓存
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (optimizationResult) {
                      const blob = new Blob(
                        [JSON.stringify(optimizationResult, null, 2)],
                        {
                          type: 'application/json',
                        }
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `optimization-result-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  disabled={!optimizationResult}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出结果
                </Button>
              </Space>
            </div>
          </div>

          <div className="space-y-2">
            <Text className="font-medium">原始查询</Text>
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="200px"
                language="sql"
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
                value={query}
                onChange={(value) => setQuery(value || '')}
                onMount={(editor, monaco) => {
                  // 添加快捷键支持
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                    // 将当前查询内容设置到主编辑器并执行
                    const currentQuery = editor.getValue();
                    if (currentQuery.trim()) {
                      // 触发执行查询事件，让主编辑器处理
                      const executeEvent = new CustomEvent('execute-query', {
                        detail: {
                          source: 'intelligent-query-engine',
                          query: currentQuery
                        }
                      });
                      document.dispatchEvent(executeEvent);
                    }
                  });

                  // 分隔符
                  editor.addAction({
                    id: 'separator-1-iqe',
                    label: '',
                    contextMenuGroupId: 'separator1',
                    contextMenuOrder: 1,
                    run: () => {}
                  });

                  editor.addAction({
                    id: 'copy-chinese-iqe',
                    label: '复制',
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 1,
                    run: (editor) => {
                      editor.trigger('keyboard', 'editor.action.clipboardCopyAction', null);
                    }
                  });

                  editor.addAction({
                    id: 'cut-chinese-iqe',
                    label: '剪切',
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 2,
                    run: (editor) => {
                      editor.trigger('keyboard', 'editor.action.clipboardCutAction', null);
                    }
                  });

                  editor.addAction({
                    id: 'paste-chinese-iqe',
                    label: '粘贴',
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 3,
                    run: (editor) => {
                      handleCustomPaste(editor as monaco.editor.IStandaloneCodeEditor);
                    }
                  });

                  editor.addAction({
                    id: 'select-all-chinese-iqe',
                    label: '全选',
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
                    contextMenuGroupId: 'navigation',
                    contextMenuOrder: 4,
                    run: (editor) => {
                      editor.trigger('keyboard', 'editor.action.selectAll', null);
                    }
                  });

                  console.log('✅ IntelligentQueryEngine 中文右键菜单已添加（包含执行查询）');
                }}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  automaticLayout: true,
                  // 桌面应用：禁用默认右键菜单，使用自定义中文菜单
                  contextmenu: false,
                  copyWithSyntaxHighlighting: true,
                }}
                key={resolvedTheme} // 强制重新渲染以应用主题
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {optimizationResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>优化结果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">优化后查询</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-48 whitespace-pre-wrap">
                    {optimizationResult.optimizedQuery}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">性能指标</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Statistic
                      title="预期性能提升"
                      value={optimizationResult.estimatedPerformanceGain}
                      suffix="%"
                      className="text-green-600"
                    />
                    <Statistic
                      title="优化技术数"
                      value={optimizationResult.optimizationTechniques.length}
                      suffix="项"
                      className="text-blue-600"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">优化技术</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {optimizationResult.optimizationTechniques.map((technique, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Badge
                          variant={
                            technique.impact === 'high' ? 'default' :
                            technique.impact === 'medium' ? 'secondary' : 'outline'
                          }
                          className="shrink-0"
                        >
                          {technique.estimatedGain}%
                        </Badge>
                        <div className="space-y-1">
                          <Text className="font-medium text-sm">{technique.name}</Text>
                          <Text className="text-xs text-muted-foreground">
                            {technique.description}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">路由策略</CardTitle>
                </CardHeader>
                <CardContent>
                  <Descriptions>
                    <DescriptionsItem label="目标连接">
                      {optimizationResult.routingStrategy.targetConnection}
                    </DescriptionsItem>
                    <DescriptionsItem label="负载均衡">
                      {optimizationResult.routingStrategy.loadBalancing}
                    </DescriptionsItem>
                    <DescriptionsItem label="优先级">
                      {optimizationResult.routingStrategy.priority}
                    </DescriptionsItem>
                    <DescriptionsItem label="原因">
                      {optimizationResult.routingStrategy.reason}
                    </DescriptionsItem>
                  </Descriptions>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">执行计划</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-auto">
                    <Timeline>
                      {optimizationResult.executionPlan.steps.map((step, index) => (
                        <TimelineItem
                          key={step.id}
                          dot={
                            step.canParallelize ? (
                              <Webhook className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )
                          }
                          color={step.canParallelize ? 'green' : 'blue'}
                        >
                          <div className="space-y-1">
                            <Text className="font-medium text-sm">{step.operation}</Text>
                            <Text className="text-xs text-muted-foreground">
                              {step.description}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              成本: {step.estimatedCost}
                            </Text>
                          </div>
                        </TimelineItem>
                      ))}
                    </Timeline>
                  </div>
                </CardContent>
              </Card>
            </div>

            {optimizationResult.warnings.length > 0 && (
              <Alert className="mt-6" variant="default">
                <Info className="w-4 h-4" />
                <AlertTitle>优化警告</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1">
                    {optimizationResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {optimizationResult.recommendations.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-base">优化建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimizationResult.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                        <Tag
                          variant={
                            recommendation.priority === 'high' ? 'destructive' :
                            recommendation.priority === 'medium' ? 'default' : 'secondary'
                          }
                          className="shrink-0"
                        >
                          {recommendation.priority.toUpperCase()}
                        </Tag>
                        <div className="space-y-2">
                          <Text className="font-medium">{recommendation.title}</Text>
                          <Paragraph className="text-sm text-muted-foreground">
                            {recommendation.description}
                          </Paragraph>
                          <Text className="text-xs text-muted-foreground">
                            预期收益: {recommendation.estimatedBenefit}%
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // 渲染性能监控界面
  const renderPerformanceMonitor = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <Statistic
                title="总查询数"
                value={queryStats?.totalQueries || 0}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-600" />
              <Statistic
                title="平均执行时间"
                value={queryStats?.avgExecutionTime || 0}
                suffix="ms"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <MemoryStick className="w-8 h-8 text-purple-600" />
              <Statistic
                title="缓存命中率"
                value={queryStats?.cacheHitRate || 0}
                suffix="%"
                className="text-green-600"
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600" />
              <Statistic
                title="优化成功率"
                value={queryStats?.optimizationSuccessRate || 0}
                suffix="%"
                className="text-blue-600"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">慢查询统计</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>查询</TableHead>
                  <TableHead>执行时间</TableHead>
                  <TableHead>频次</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(queryStats?.slowQueries || []).slice(0, 5).map((query: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="max-w-48 truncate">{query.query}</TableCell>
                    <TableCell>{query.executionTime}ms</TableCell>
                    <TableCell>{query.frequency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">热门查询</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>查询</TableHead>
                  <TableHead>平均时间</TableHead>
                  <TableHead>频次</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(queryStats?.frequentQueries || []).slice(0, 5).map((query: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="max-w-48 truncate">{query.query}</TableCell>
                    <TableCell>{query.avgExecutionTime}ms</TableCell>
                    <TableCell>{query.frequency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">资源使用情况</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-3">
              <Cpu className="w-6 h-6 mx-auto text-blue-600" />
              <div className="space-y-2">
                <Text className="text-sm font-medium">CPU使用率</Text>
                <Progress
                  value={queryStats?.resourceUtilization?.avgCpuUsage || 0}
                  className="h-2"
                />
                <Text className="text-xs text-muted-foreground">
                  {queryStats?.resourceUtilization?.avgCpuUsage || 0}%
                </Text>
              </div>
            </div>

            <div className="text-center space-y-3">
              <MemoryStick className="w-6 h-6 mx-auto text-green-600" />
              <div className="space-y-2">
                <Text className="text-sm font-medium">内存使用率</Text>
                <Progress
                  value={queryStats?.resourceUtilization?.avgMemoryUsage || 0}
                  className="h-2"
                />
                <Text className="text-xs text-muted-foreground">
                  {queryStats?.resourceUtilization?.avgMemoryUsage || 0}%
                </Text>
              </div>
            </div>

            <div className="text-center space-y-3">
              <HardDrive className="w-6 h-6 mx-auto text-yellow-600" />
              <div className="space-y-2">
                <Text className="text-sm font-medium">I/O使用率</Text>
                <Progress
                  value={queryStats?.resourceUtilization?.avgIoUsage || 0}
                  className="h-2"
                />
                <Text className="text-xs text-muted-foreground">
                  {queryStats?.resourceUtilization?.avgIoUsage || 0}%
                </Text>
              </div>
            </div>

            <div className="text-center space-y-3">
              <Network className="w-6 h-6 mx-auto text-purple-600" />
              <div className="space-y-2">
                <Text className="text-sm font-medium">网络使用率</Text>
                <Progress
                  value={queryStats?.resourceUtilization?.avgNetworkUsage || 0}
                  className="h-2"
                />
                <Text className="text-xs text-muted-foreground">
                  {queryStats?.resourceUtilization?.avgNetworkUsage || 0}%
                </Text>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // 渲染优化历史界面
  const renderOptimizationHistory = () => (
    <div className="space-y-4">
      {optimizationHistory.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <Text className="text-muted-foreground">暂无优化历史记录</Text>
          </CardContent>
        </Card>
      ) : (
        optimizationHistory.map((item, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Badge variant="secondary" className="shrink-0">
                    {item.estimatedPerformanceGain}%
                  </Badge>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Text className="font-medium">优化 #{index + 1}</Text>
                      <Tag variant="outline">
                        {item.optimizationTechniques.length} 项技术
                      </Tag>
                    </div>
                    <Text className="text-sm text-muted-foreground line-clamp-2">
                      {item.originalQuery}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      目标: {item.routingStrategy.targetConnection}
                    </Text>
                  </div>
                </div>
                <Space size="small">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOptimizationResult(item)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    查看
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQuery(item.optimizedQuery)}
                    className="flex items-center gap-2"
                  >
                    <Share className="w-4 h-4" />
                    使用
                  </Button>
                </Space>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              智能查询优化引擎
            </CardTitle>
            <Space size="small">
              <Button
                variant="outline"
                size="sm"
                onClick={getQueryStats}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  dialog.info({
                    title: '智能查询优化引擎',
                    content: (
                      <div className='space-y-3'>
                        <p className='text-sm text-muted-foreground'>
                          智能查询优化引擎提供以下功能：
                        </p>
                        <ul className='space-y-1 text-sm'>
                          <li className='flex items-center gap-2'>
                            <span>🚀</span> 智能查询优化
                          </li>
                          <li className='flex items-center gap-2'>
                            <span>📊</span> 性能预测分析
                          </li>
                          <li className='flex items-center gap-2'>
                            <span>🔄</span> 智能路由分配
                          </li>
                          <li className='flex items-center gap-2'>
                            <span>💾</span> 自适应缓存
                          </li>
                          <li className='flex items-center gap-2'>
                            <span>📈</span> 实时性能监控
                          </li>
                          <li className='flex items-center gap-2'>
                            <span>🎯</span> 个性化建议
                          </li>
                        </ul>
                      </div>
                    ),
                  });
                }}
                className="flex items-center gap-2"
              >
                <Info className="w-4 h-4" />
                帮助
              </Button>
            </Space>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="optimizer">
                <span className="flex items-center gap-2">
                  <Rocket className="w-4 h-4" />
                  查询优化器
                </span>
              </TabsTrigger>
              <TabsTrigger value="performance">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  性能监控
                </span>
              </TabsTrigger>
              <TabsTrigger value="history">
                <span className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  优化历史
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="optimizer" className="mt-6">
              {renderOptimizer()}
            </TabsContent>

            <TabsContent value="performance" className="mt-6">
              {renderPerformanceMonitor()}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              {renderOptimizationHistory()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 设置面板 */}
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>优化引擎设置</SheetTitle>
          <SheetDescription>
            配置智能查询优化引擎的各项参数
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          <div className="space-y-3">
            <Text className="font-medium">缓存设置</Text>
            <div className="flex items-center gap-3">
              <Switch
                checked={optimizationConfig.enableCaching}
                onCheckedChange={checked =>
                  setOptimizationConfig(prev => ({
                    ...prev,
                    enableCaching: checked,
                  }))
                }
              />
              <Text className="text-sm">启用智能缓存</Text>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Text className="font-medium">路由设置</Text>
            <div className="flex items-center gap-3">
              <Switch
                checked={optimizationConfig.enableRouting}
                onCheckedChange={checked =>
                  setOptimizationConfig(prev => ({
                    ...prev,
                    enableRouting: checked,
                  }))
                }
              />
              <Text className="text-sm">启用智能路由</Text>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Text className="font-medium">性能预测</Text>
            <div className="flex items-center gap-3">
              <Switch
                checked={optimizationConfig.enablePrediction}
                onCheckedChange={checked =>
                  setOptimizationConfig(prev => ({
                    ...prev,
                    enablePrediction: checked,
                  }))
                }
              />
              <Text className="text-sm">启用性能预测</Text>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Text className="font-medium">优化级别</Text>
            <Select
              value={optimizationConfig.optimizationLevel}
              onValueChange={(value: 'balanced' | 'aggressive' | 'conservative') =>
                setOptimizationConfig(prev => ({
                  ...prev,
                  optimizationLevel: value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择优化级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">保守</SelectItem>
                <SelectItem value="balanced">平衡</SelectItem>
                <SelectItem value="aggressive">激进</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <Text className="font-medium">最大优化时间</Text>
            <Select
              value={optimizationConfig.maxOptimizationTime.toString()}
              onValueChange={value =>
                setOptimizationConfig(prev => ({
                  ...prev,
                  maxOptimizationTime: parseInt(value),
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择最大优化时间" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1秒</SelectItem>
                <SelectItem value="3000">3秒</SelectItem>
                <SelectItem value="5000">5秒</SelectItem>
                <SelectItem value="10000">10秒</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SheetContent>
    </div>
  );
};

export default IntelligentQueryEngine;
