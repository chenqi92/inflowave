import { useForm } from 'react-hook-form';
import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Statistic, Button, Typography, Select, Alert, Tag, Form, Input, InputNumber, Switch, Progress, Modal } from '@/components/ui';
// TODO: Replace these Ant Design components: Badge, List, Tooltip
import { Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { RefreshCw, Settings, TrendingUp, Bell, PlayCircle, PauseCircle, AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import AdvancedChart from '../visualization/AdvancedChart';
import type { QueryResult } from '@/types';

const { Title, Text } = Typography;

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
  database}) => {
  const { connections, activeConnectionId } = useConnectionStore();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5); // 秒
  const [selectedConnection, setSelectedConnection] = useState(connectionId || activeConnectionId || '');
  const [selectedDatabase, setSelectedDatabase] = useState(database || '');
  const [databases, setDatabases] = useState<string[]>([]);
  const [monitoringQueries, setMonitoringQueries] = useState<string[]>([
    'SELECT mean(value) FROM cpu_usage WHERE time>= now() - 1m',
    'SELECT mean(value) FROM memory_usage WHERE time>= now() - 1m',
    'SELECT count(*) FROM errors WHERE time>= now() - 1m',
  ]);
  const [realTimeData, setRealTimeData] = useState<Record<string, QueryResult>>({});
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
        connectionId: selectedConnection});
      setDatabases(dbList || []);
      if (dbList && dbList.length> 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      toast({ title: "错误", description: "加载数据库列表失败: ${error}", variant: "destructive" });
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
            query}});
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
      if (!result || !result.series || result.series.length === 0) return;

      const series = result.series[0];
      if (!series.values || series.values.length === 0) return;

      const value = Number(series.values[0][1]) || 0; // 假设第二列是值
      let triggered = false;

      switch (rule.condition) {
        case 'greater':
          triggered = value> rule.threshold;
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
          acknowledged: false};
        newAlerts.push(alertEvent);
      }
    });

    if (newAlerts.length> 0) {
      setAlertEvents(prev => [...newAlerts, ...prev].slice(0, 100)); // 保留最近100条
      // 发送通知
      newAlerts.forEach(alert => {
        safeTauriInvoke('send_notification', {
          title: `告警: ${alert.ruleName}`,
          message: alert.message,
          severity: alert.severity}).catch(console.error);
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
      intervalRef.current = setInterval(executeMonitoringQueries, refreshInterval * 1000);
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
        severity: values.severity};

      if (editingAlert) {
        setAlertRules(prev => prev.map(r => r.id === rule.id ? rule : r));
        toast({ title: "成功", description: "告警规则已更新" });
      } else {
        setAlertRules(prev => [...prev, rule]);
        toast({ title: "成功", description: "告警规则已创建" });
      }

      setShowAlertModal(false);
      setEditingAlert(null);
      form.resetFields();
    } catch (error) {
      toast({ title: "错误", description: "保存告警规则失败: ${error}", variant: "destructive" });
    }
  };

  // 确认告警
  const acknowledgeAlert = (alertId: string) => {
    setAlertEvents(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  // 获取告警统计
  const getAlertStats = () => {
    const unacknowledged = alertEvents.filter(a => !a.acknowledged);
    const critical = unacknowledged.filter(a => a.severity === 'critical').length;
    const error = unacknowledged.filter(a => a.severity === 'error').length;
    const warning = unacknowledged.filter(a => a.severity === 'warning').length;
    const info = unacknowledged.filter(a => a.severity === 'info').length;

    return { critical, error, warning, info, total: unacknowledged.length };
  };

  // 获取最新指标值
  const getLatestMetric = (query: string) => {
    const result = realTimeData[query];
    if (!result || !result.series || result.series.length === 0) return null;
    
    const series = result.series[0];
    if (!series.values || series.values.length === 0) return null;
    
    return Number(series.values[0][1]) || 0;
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'error': return 'volcano';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'default';
    }
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle />;
      case 'error': return <AlertCircle />;
      case 'warning': return <AlertTriangle />;
      case 'info': return <CheckCircle />;
      default: return <CheckCircle />;
    }
  };

  useEffect(() => {
    if (selectedConnection) {
      loadDatabases();
    }
  }, [selectedConnection]);

  useEffect(() => {
    if (isMonitoring && refreshInterval> 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(executeMonitoringQueries, refreshInterval * 1000);
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
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      {/* 控制面板 */}
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div className="flex gap-2">
              <Title level={4} style={{ margin: 0 }}>
                <TrendingUp className="w-4 h-4"  /> 实时监控
              </Title>
              <Select
                placeholder="选择连接"
                value={selectedConnection}
                onValueChange={setSelectedConnection}
                style={{ width: 200 }}>
                {connections.map(conn => (
                  <Select.Option key={conn.id} value={conn.id}>
                    {conn.name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                placeholder="选择数据库"
                value={selectedDatabase}
                onValueChange={setSelectedDatabase}
                style={{ width: 200 }}>
                {databases.map(db => (
                  <Select.Option key={db} value={db}>
                    {db}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Col>
          <Col>
            <div className="flex gap-2">
              <Text>刷新间隔:</Text>
              <InputNumber
                min={1}
                max={300}
                value={refreshInterval}
                onValueChange={(value) => setRefreshInterval(value || 5)}
                addonAfter="秒"
                style={{ width: 100 }}
              />
              <Button
                type={isMonitoring ? 'danger' : 'primary'}
                icon={isMonitoring ? <PauseCircle /> : <PlayCircle />}
                onClick={toggleMonitoring}
                disabled={!selectedConnection || !selectedDatabase}>
                {isMonitoring ? '停止监控' : '开始监控'}
              </Button>
              <Button
                icon={<Settings className="w-4 h-4"  />}
                onClick={() => {
                  setEditingAlert(null);
                  form.resetFields();
                  setShowAlertModal(true);
                }}>
                告警设置
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      {/* 告警统计 */}
      {alertStats.total> 0 && (
        <Alert
          message={`当前有 ${alertStats.total} 个未确认告警`}
          description={
            <div className="flex gap-2">
              {alertStats.critical> 0 && <Tag color="red">严重: {alertStats.critical}</Tag>}
              {alertStats.error> 0 && <Tag color="volcano">错误: {alertStats.error}</Tag>}
              {alertStats.warning> 0 && <Tag color="orange">警告: {alertStats.warning}</Tag>}
              {alertStats.info> 0 && <Tag color="blue">信息: {alertStats.info}</Tag>}
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 实时指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {monitoringQueries.map((query, index) => {
          const value = getLatestMetric(query);
          const queryName = query.includes('cpu') ? 'CPU使用率' : 
                           query.includes('memory') ? '内存使用率' : 
                           query.includes('errors') ? '错误数量' : `指标${index + 1}`;
          
          return (
            <Col span={8} key={query}>
              <div>
                <Statistic
                  title={queryName}
                  value={value || 0}
                  suffix={query.includes('usage') ? '%' : ''}
                  prefix={
                    <Badge 
                      status={isMonitoring ? 'processing' : 'default'} 
                    />
                  }
                  valueStyle={{
                    color: value && value> 80 ? '#cf1322' : 
                           value && value> 60 ? '#fa8c16' : '#3f8600'
                  }}
                />
              </div>
            </Col>
          );
        })}
      </Row>

      {/* 实时图表 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {Object.entries(realTimeData).map(([query, data]) => (
          <Col span={12} key={query}>
            <AdvancedChart
              data={data}
              height={300}
              initialConfig={{
                type: 'line',
                title: query.includes('cpu') ? 'CPU使用率趋势' : 
                       query.includes('memory') ? '内存使用率趋势' : 
                       query.includes('errors') ? '错误数量趋势' : '实时数据',
                showDataZoom: false,
                animation: false}}
            />
          </Col>
        ))}
      </Row>

      {/* 告警事件列表 */}
      <div title={
        <div className="flex gap-2">
          <Bell className="w-4 h-4"  />
          <span>告警事件</span>
          <Badge count={alertStats.total} />
        </div>
      }>
        <List
          dataSource={alertEvents.slice(0, 20)}
          renderItem={(alert) => (
            <List.Item
              actions={[
                !alert.acknowledged && (
                  <Button
                    type="link"
                    onClick={() => acknowledgeAlert(alert.id)}
                    size="small">
                    确认
                  </Button>
                ),
              ].filter(Boolean)}>
              <List.Item.Meta
                avatar={
                  <div style={{ color: getSeverityColor(alert.severity) }}>
                    {getSeverityIcon(alert.severity)}
                  </div>
                }
                title={
                  <div className="flex gap-2">
                    <span>{alert.ruleName}</span>
                    <Tag color={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Tag>
                    {alert.acknowledged && <Tag color="green">已确认</Tag>}
                  </div>
                }
                description={
                  <div>
                    <Text>{alert.message}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {alert.timestamp.toLocaleString()}
                    </Text>
                  </div>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: '暂无告警事件' }}
        />
      </div>

      {/* 告警规则设置模态框 */}
      <Modal
        title={editingAlert ? '编辑告警规则' : '新建告警规则'}
        open={showAlertModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAlertModal(false);
            setEditingAlert(null);
            form.resetFields();
          }
        }}
        width={600}>
        <Form
          form={form}
          layout="vertical"
          onFinish={saveAlertRule}>
          <FormItem name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input placeholder="输入告警规则名称" />
          </FormItem>

          <FormItem name="query"
            label="监控查询"
            rules={[{ required: true, message: '请输入查询语句' }]}>
            <Textarea
              rows={3}
              placeholder="输入 InfluxQL 查询语句"
              style={{ fontFamily: 'monospace' }}
            />
          </FormItem>

          <Row gutter={16}>
            <Col span={8}>
              <FormItem name="condition"
                label="条件"
                rules={[{ required: true, message: '请选择条件' }]}>
                <Select placeholder="选择条件">
                  <Select.Option value="greater">大于</Select.Option>
                  <Select.Option value="less">小于</Select.Option>
                  <Select.Option value="equal">等于</Select.Option>
                  <Select.Option value="not_equal">不等于</Select.Option>
                </Select>
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="threshold"
                label="阈值"
                rules={[{ required: true, message: '请输入阈值' }]}>
                <InputNumber
                  placeholder="输入阈值"
                  style={{ width: '100%' }}
                />
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="severity"
                label="严重程度"
                rules={[{ required: true, message: '请选择严重程度' }]}>
                <Select placeholder="选择严重程度">
                  <Select.Option value="info">信息</Select.Option>
                  <Select.Option value="warning">警告</Select.Option>
                  <Select.Option value="error">错误</Select.Option>
                  <Select.Option value="critical">严重</Select.Option>
                </Select>
              </FormItem>
            </Col>
          </Row>

          <FormItem name="enabled"
            valuePropName="checked"
            label="启用规则">
            <Switch />
          </FormItem>
        </Form>
      </Modal>
      </div>
    </div>
  );
};

export default RealTimeMonitor;
