import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  Badge,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  InputNumber,
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
  TooltipProvider,
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import {
  Settings,
  TrendingUp,
  Bell,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Database,
  Clock,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import AdvancedChart from '../visualization/AdvancedChart';
import type { QueryResult } from '@/types';

interface AlertRule {
  id: string;
  name: string;
  query: string;
  condition: 'greater' | 'less' | 'equal' | 'not_equal';
  threshold: number;
  enabled: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

interface RealTimeMonitorProps {
  connectionId?: string;
  database?: string;
}

const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({
  connectionId,
  database,
}) => {
  const { connections, activeConnectionId } = useConnectionStore();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // 秒
  const [selectedConnection, setSelectedConnection] = useState(
    connectionId || activeConnectionId || ''
  );
  const [selectedDatabase, setSelectedDatabase] = useState(database || '');
  const [databases, setDatabases] = useState<string[]>([]);
  const [monitoringQueries, setMonitoringQueries] = useState<string[]>([
    'SELECT mean(value) FROM cpu_usage WHERE time>= now() - 1m',
    'SELECT mean(value) FROM memory_usage WHERE time>= now() - 1m',
    'SELECT count(*) FROM errors WHERE time>= now() - 1m',
  ]);
  const [realTimeData, setRealTimeData] = useState<Record<string, QueryResult>>(
    {}
  );
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const form = useForm();
  const intervalRef = useRef<number | null>(null);

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!selectedConnection) return;

    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: selectedConnection,
      });
      setDatabases(dbList || []);
      if (dbList && dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      showNotification.error({
        message: '加载数据库列表失败',
        description: String(error),
      });
    }
  };

  // 执行监控查询
  const executeMonitoringQueries = async () => {
    if (!selectedConnection || !selectedDatabase) return;

    const results: Record<string, QueryResult> = {};

    for (const query of monitoringQueries) {
      try {
        const result = await safeTauriInvoke<QueryResult>('execute_query', {
          request: {
            connectionId: selectedConnection,
            database: selectedDatabase,
            query,
          },
        });
        results[query] = result;
      } catch (error) {
        console.error(`查询执行失败: ${query}`, error);
      }
    }

    setRealTimeData(results);
    checkAlertRules(results);
  };

  // 检查告警规则
  const checkAlertRules = (data: Record<string, QueryResult>) => {
    const newAlerts: AlertEvent[] = [];

    alertRules.forEach(rule => {
      if (!rule.enabled) return;

      const result = data[rule.query];
      if (!result || !result.results || result.results.length === 0) return;

      const series = result.results[0]?.series?.[0];
      if (!series || !series.values || series.values.length === 0) return;

      const value = Number(series.values[0][1]) || 0; // 假设第二列是值
      let triggered = false;

      switch (rule.condition) {
        case 'greater':
          triggered = value > rule.threshold;
          break;
        case 'less':
          triggered = value < rule.threshold;
          break;
        case 'equal':
          triggered = value === rule.threshold;
          break;
        case 'not_equal':
          triggered = value !== rule.threshold;
          break;
      }

      if (triggered) {
        const alertEvent: AlertEvent = {
          id: `alert_${Date.now()}_${rule.id}`,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `${rule.name}: 当前值 ${value} ${rule.condition} 阈值 ${rule.threshold}`,
          severity: rule.severity,
          value,
          threshold: rule.threshold,
          timestamp: new Date(),
          acknowledged: false,
        };
        newAlerts.push(alertEvent);
      }
    });

    if (newAlerts.length > 0) {
      setAlertEvents(prev => [...newAlerts, ...prev].slice(0, 100)); // 保留最近100条
      // 发送通知
      newAlerts.forEach(alert => {
        safeTauriInvoke('send_notification', {
          title: `告警: ${alert.ruleName}`,
          message: alert.message,
          severity: alert.severity,
        }).catch(console.error);
      });
    }
  };

  // 开始/停止监控
  const toggleMonitoring = () => {
    if (isMonitoring) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsMonitoring(false);
    } else {
      executeMonitoringQueries(); // 立即执行一次
      intervalRef.current = setInterval(
        executeMonitoringQueries,
        refreshInterval * 1000
      );
      setIsMonitoring(true);
    }
  };

  // 创建/更新告警规则
  const saveAlertRule = async (values: any) => {
    try {
      const rule: AlertRule = {
        id: editingAlert?.id || `rule_${Date.now()}`,
        name: values.name,
        query: values.query,
        condition: values.condition,
        threshold: values.threshold,
        enabled: values.enabled ?? true,
        severity: values.severity,
      };

      if (editingAlert) {
        setAlertRules(prev => prev.map(r => (r.id === rule.id ? rule : r)));
        showMessage.success('告警规则已更新');
      } else {
        setAlertRules(prev => [...prev, rule]);
        showMessage.success('告警规则已创建');
      }

      setShowAlertModal(false);
      setEditingAlert(null);
      form.resetFields();
    } catch (error) {
      showNotification.error({
        message: '保存告警规则失败',
        description: String(error),
      });
    }
  };

  // 确认告警
  const acknowledgeAlert = (alertId: string) => {
    setAlertEvents(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  // 获取告警统计
  const getAlertStats = () => {
    const unacknowledged = alertEvents.filter(a => !a.acknowledged);
    const critical = unacknowledged.filter(
      a => a.severity === 'critical'
    ).length;
    const error = unacknowledged.filter(a => a.severity === 'error').length;
    const warning = unacknowledged.filter(a => a.severity === 'warning').length;
    const info = unacknowledged.filter(a => a.severity === 'info').length;

    return { critical, error, warning, info, total: unacknowledged.length };
  };

  // 获取最新指标值
  const getLatestMetric = (query: string) => {
    const result = realTimeData[query];
    if (!result || !result.results || result.results.length === 0) return null;

    const series = result.results[0]?.series?.[0];
    if (!series || !series.values || series.values.length === 0) return null;

    return Number(series.values[0][1]) || 0;
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-orange-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle />;
      case 'error':
        return <AlertCircle />;
      case 'warning':
        return <AlertTriangle />;
      case 'info':
        return <CheckCircle />;
      default:
        return <CheckCircle />;
    }
  };

  useEffect(() => {
    if (selectedConnection) {
      loadDatabases();
    }
  }, [selectedConnection]);

  useEffect(() => {
    if (isMonitoring && refreshInterval > 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(
        executeMonitoringQueries,
        refreshInterval * 1000
      );
    }
  }, [refreshInterval]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const alertStats = getAlertStats();

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* 控制面板 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    实时监控
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedConnection}
                      onValueChange={setSelectedConnection}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="选择连接" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.map(conn => (
                          <SelectItem key={conn.id} value={conn.id}>
                            {conn.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedDatabase}
                      onValueChange={setSelectedDatabase}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="选择数据库" />
                      </SelectTrigger>
                      <SelectContent>
                        {databases.map(db => (
                          <SelectItem key={db} value={db}>
                            {db}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">刷新间隔:</span>
                    <InputNumber
                      min={1}
                      max={300}
                      value={refreshInterval}
                      onValueChange={value => setRefreshInterval(value || 5)}
                      className="w-20"
                    />
                    <span className="text-sm">秒</span>
                  </div>
                  <Button
                    variant={isMonitoring ? 'destructive' : 'default'}
                    onClick={toggleMonitoring}
                    disabled={!selectedConnection || !selectedDatabase}
                    className="flex items-center gap-2"
                  >
                    {isMonitoring ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                    {isMonitoring ? '停止监控' : '开始监控'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingAlert(null);
                      form.reset();
                      setShowAlertModal(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    告警设置
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 告警统计 */}
          {alertStats.total > 0 && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <div className="font-medium">
                  当前有 {alertStats.total} 个未确认告警
                </div>
                <div className="flex gap-2 mt-2">
                  {alertStats.critical > 0 && (
                    <Badge variant="destructive">严重: {alertStats.critical}</Badge>
                  )}
                  {alertStats.error > 0 && (
                    <Badge variant="destructive">错误: {alertStats.error}</Badge>
                  )}
                  {alertStats.warning > 0 && (
                    <Badge variant="secondary">警告: {alertStats.warning}</Badge>
                  )}
                  {alertStats.info > 0 && (
                    <Badge variant="outline">信息: {alertStats.info}</Badge>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* 实时指标 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {monitoringQueries.map((query, index) => {
              const value = getLatestMetric(query);
              const queryName = query.includes('cpu')
                ? 'CPU使用率'
                : query.includes('memory')
                  ? '内存使用率'
                  : query.includes('errors')
                    ? '错误数量'
                    : `指标${index + 1}`;

              const getValueColor = (val: number | null) => {
                if (!val) return 'text-muted-foreground';
                if (val > 80) return 'text-red-600';
                if (val > 60) return 'text-orange-600';
                return 'text-green-600';
              };

              return (
                <Card key={query}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {queryName}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${getValueColor(value)}`}>
                            {value || 0}
                            {query.includes('usage') ? '%' : ''}
                          </span>
                          <div className="flex items-center">
                            <Activity className={`w-4 h-4 ${isMonitoring ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
                          </div>
                        </div>
                      </div>
                      <Database className="w-8 h-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 实时图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {Object.entries(realTimeData).map(([query, data]) => (
              <Card key={query}>
                <AdvancedChart
                  data={data}
                  height={300}
                  initialConfig={{
                    type: 'line',
                    title: query.includes('cpu')
                      ? 'CPU使用率趋势'
                      : query.includes('memory')
                        ? '内存使用率趋势'
                        : query.includes('errors')
                          ? '错误数量趋势'
                          : '实时数据',
                    showDataZoom: false,
                    animation: false,
                  }}
                />
              </Card>
            ))}
          </div>

          {/* 告警事件列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                告警事件
                {alertStats.total > 0 && (
                  <Badge variant="destructive">{alertStats.total}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无告警事件
                </div>
              ) : (
                <div className="space-y-4">
                  {alertEvents.slice(0, 20).map(alert => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${getSeverityColor(alert.severity)}`}>
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{alert.ruleName}</span>
                            <Badge
                              variant={alert.severity === 'critical' || alert.severity === 'error' ? 'destructive' : 'secondary'}
                            >
                              {alert.severity.toUpperCase()}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="outline">已确认</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          确认
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 告警规则设置模态框 */}
          <Dialog open={showAlertModal} onOpenChange={setShowAlertModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAlert ? '编辑告警规则' : '新建告警规则'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(saveAlertRule)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: '请输入规则名称' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>规则名称</FormLabel>
                        <FormControl>
                          <Input placeholder="输入告警规则名称" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="query"
                    rules={{ required: '请输入查询语句' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>监控查询</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="输入 InfluxQL 查询语句"
                            className="font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="condition"
                      rules={{ required: '请选择条件' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>条件</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择条件" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="greater">大于</SelectItem>
                              <SelectItem value="less">小于</SelectItem>
                              <SelectItem value="equal">等于</SelectItem>
                              <SelectItem value="not_equal">不等于</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="threshold"
                      rules={{ required: '请输入阈值' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>阈值</FormLabel>
                          <FormControl>
                            <InputNumber
                              placeholder="输入阈值"
                              className="w-full"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity"
                      rules={{ required: '请选择严重程度' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>严重程度</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择严重程度" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="info">信息</SelectItem>
                              <SelectItem value="warning">警告</SelectItem>
                              <SelectItem value="error">错误</SelectItem>
                              <SelectItem value="critical">严重</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">启用规则</FormLabel>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAlertModal(false)}
                    >
                      取消
                    </Button>
                    <Button type="submit">
                      {editingAlert ? '更新' : '创建'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default RealTimeMonitor;
