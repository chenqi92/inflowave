import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Statistic, Progress, Alert, Table, Tag, Button, Select, DatePicker, Typography, Modal } from '@/components/ui';
// TODO: Replace these Ant Design components: Tooltip, List
import { Card, Space, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { RefreshCw, Info, BarChart, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { safeTauriInvoke } from '@/utils/tauri';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { Option } = Select;

// 性能指标接口
interface PerformanceMetrics {
  // 系统指标
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    memoryTotal: number;
    diskUsage: number;
    diskTotal: number;
    networkIn: number;
    networkOut: number;
    uptime: number;
  };
  
  // 数据库指标
  databaseMetrics: {
    connectionCount: number;
    maxConnections: number;
    queryCount: number;
    queryLatency: number;
    writeLatency: number;
    queryRate: number;
    writeRate: number;
    seriesCount: number;
    shardCount: number;
  };
  
  // 应用指标
  appMetrics: {
    requestCount: number;
    responseTime: number;
    errorRate: number;
    activeUsers: number;
    memoryHeap: number;
    gcTime: number;
  };
  
  timestamp: Date;
}

// 慢查询记录接口
interface SlowQuery {
  id: string;
  query: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  database: string;
  user: string;
  rowsReturned: number;
  bytesReturned: number;
  status: 'completed' | 'error' | 'timeout';
  error?: string;
}

// 告警规则接口
interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
}

// 告警记录接口
interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  description: string;
}

interface PerformanceMonitorProps {
  connectionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  connectionId,
  autoRefresh = true,
  refreshInterval = 30000}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<PerformanceMetrics[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertRecords, setAlertRecords] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(1, 'hour'),
    dayjs(),
  ]);
  const [selectedMetric, setSelectedMetric] = useState('cpu');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showSlowQueryModal, setShowSlowQueryModal] = useState(false);

  // 获取性能指标
  const fetchMetrics = useCallback(async () => {
    if (!connectionId) return;
    
    setLoading(true);
    try {
      const result = await safeTauriInvoke<PerformanceMetrics>('get_performance_metrics', {
        connectionId,
        timeRange: timeRange.map(t => t.toISOString())});
      
      setMetrics(result);
      
      // 更新历史记录
      setMetricsHistory(prev => {
        const newHistory = [...prev, result];
        // 只保留最近100条记录
        return newHistory.slice(-100);
      });
    } catch (error) {
      console.error('获取性能指标失败:', error);
    } finally {
      setLoading(false);
    }
  }, [connectionId, timeRange]);

  // 获取慢查询
  const fetchSlowQueries = useCallback(async () => {
    if (!connectionId) return;
    
    try {
      const result = await safeTauriInvoke<SlowQuery[]>('get_slow_queries', {
        connectionId,
        timeRange: timeRange.map(t => t.toISOString()),
        limit: 100});
      
      setSlowQueries(result);
    } catch (error) {
      console.error('获取慢查询失败:', error);
    }
  }, [connectionId, timeRange]);

  // 获取告警记录
  const fetchAlertRecords = useCallback(async () => {
    if (!connectionId) return;
    
    try {
      const result = await safeTauriInvoke<AlertRecord[]>('get_alert_records', {
        connectionId,
        timeRange: timeRange.map(t => t.toISOString()),
        limit: 50});
      
      setAlertRecords(result);
    } catch (error) {
      console.error('获取告警记录失败:', error);
    }
  }, [connectionId, timeRange]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && connectionId) {
      const interval = setInterval(() => {
        fetchMetrics();
        fetchSlowQueries();
        fetchAlertRecords();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, connectionId, refreshInterval, fetchMetrics, fetchSlowQueries, fetchAlertRecords]);

  // 初始化数据
  useEffect(() => {
    if (connectionId) {
      fetchMetrics();
      fetchSlowQueries();
      fetchAlertRecords();
    }
  }, [connectionId, fetchMetrics, fetchSlowQueries, fetchAlertRecords]);

  // 生成图表数据
  const generateChartData = useMemo(() => {
    if (metricsHistory.length === 0) return { xData: [], yData: [] };
    
    const xData = metricsHistory.map(m => dayjs(m.timestamp).format('HH:mm:ss'));
    let yData: number[] = [];
    
    switch (selectedMetric) {
      case 'cpu':
        yData = metricsHistory.map(m => m.systemMetrics.cpuUsage);
        break;
      case 'memory':
        yData = metricsHistory.map(m => m.systemMetrics.memoryUsage);
        break;
      case 'disk':
        yData = metricsHistory.map(m => m.systemMetrics.diskUsage);
        break;
      case 'queryLatency':
        yData = metricsHistory.map(m => m.databaseMetrics.queryLatency);
        break;
      case 'writeLatency':
        yData = metricsHistory.map(m => m.databaseMetrics.writeLatency);
        break;
      case 'connections':
        yData = metricsHistory.map(m => m.databaseMetrics.connectionCount);
        break;
      default:
        yData = metricsHistory.map(m => m.systemMetrics.cpuUsage);
    }
    
    return { xData, yData };
  }, [metricsHistory, selectedMetric]);

  // 图表配置
  const chartOptions = useMemo(() => ({
    title: {
      text: '性能指标趋势',
      left: 'center'},
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999'
        }
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: generateChartData.xData},
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (selectedMetric.includes('Latency')) {
            return `${value}ms`;
          }
          if (selectedMetric === 'connections') {
            return `${value}`;
          }
          return `${value}%`;
        }
      }
    },
    series: [{
      name: selectedMetric,
      type: 'line',
      data: generateChartData.yData,
      smooth: true,
      itemStyle: {
        normal: {
          color: '#5470c6'
        }
      },
      areaStyle: {
        normal: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(84, 112, 198, 0.3)'
            }, {
              offset: 1, color: 'rgba(84, 112, 198, 0.1)'
            }]
          }
        }
      }
    }]
  }), [generateChartData, selectedMetric]);

  // 获取状态颜色
  const getStatusColor = (value: number, threshold: number) => {
    if (value >= threshold * 0.9) return '#f5222d';
    if (value >= threshold * 0.7) return '#fa8c16';
    if (value >= threshold * 0.5) return '#faad14';
    return '#52c41a';
  };

  // 获取严重程度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  // 慢查询表格列
  const slowQueryColumns = [
    {
      title: '查询',
      dataIndex: 'query',
      key: 'query',
      width: 300,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text code>{text.substring(0, 50)}...</Text>
        </Tooltip>
      )},
    {
      title: '执行时间',
      dataIndex: 'duration',
      key: 'duration',
      sorter: (a: SlowQuery, b: SlowQuery) => a.duration - b.duration,
      render: (duration: number) => (
        <Text style={{ color: duration > 5000 ? '#f5222d' : '#fa8c16' }}>
          {duration}ms
        </Text>
      )},
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: Date) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')},
    {
      title: '数据库',
      dataIndex: 'database',
      key: 'database'},
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'completed' ? 'green' : status === 'error' ? 'red' : 'orange'}>
          {status}
        </Tag>
      )},
    {
      title: '返回行数',
      dataIndex: 'rowsReturned',
      key: 'rowsReturned',
      sorter: (a: SlowQuery, b: SlowQuery) => a.rowsReturned - b.rowsReturned},
  ];

  // 告警记录表格列
  const alertColumns = [
    {
      title: '告警名称',
      dataIndex: 'ruleName',
      key: 'ruleName'},
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric'},
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => <Text strong>{value}</Text>},
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold'},
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity}
        </Tag>
      )},
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'red' : 'green'}>
          {status === 'active' ? '活跃' : '已解决'}
        </Tag>
      )},
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: Date) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')},
  ];

  if (!connectionId) {
    return (
      <Alert
        message="请先选择连接"
        description="性能监控需要选择一个有效的数据库连接"
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <Title level={4}>性能监控</Title>
            <Text type="secondary">实时监控系统和数据库性能指标</Text>
          </div>
          <div className="flex gap-2">
            <RangePicker
              value={timeRange}
              onChange={(dates) => dates && setTimeRange(dates)}
              showTime
              format="YYYY-MM-DD HH:mm:ss"
            />
            <Button
              icon={<RefreshCw className="w-4 h-4"  />}
              onClick={() => {
                fetchMetrics();
                fetchSlowQueries();
                fetchAlertRecords();
              }}
              loading={loading}
            >
              刷新
            </Button>
          </div>
        </div>
      </Card>

      {/* 系统指标概览 */}
      {metrics && (
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="CPU 使用率"
                value={metrics.systemMetrics.cpuUsage}
                precision={1}
                suffix="%"
                valueStyle={{ color: getStatusColor(metrics.systemMetrics.cpuUsage, 100) }}
              />
              <Progress
                percent={metrics.systemMetrics.cpuUsage}
                strokeColor={getStatusColor(metrics.systemMetrics.cpuUsage, 100)}
                showInfo={false}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="内存使用率"
                value={metrics.systemMetrics.memoryUsage}
                precision={1}
                suffix="%"
                valueStyle={{ color: getStatusColor(metrics.systemMetrics.memoryUsage, 100) }}
              />
              <Progress
                percent={metrics.systemMetrics.memoryUsage}
                strokeColor={getStatusColor(metrics.systemMetrics.memoryUsage, 100)}
                showInfo={false}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="磁盘使用率"
                value={metrics.systemMetrics.diskUsage}
                precision={1}
                suffix="%"
                valueStyle={{ color: getStatusColor(metrics.systemMetrics.diskUsage, 100) }}
              />
              <Progress
                percent={metrics.systemMetrics.diskUsage}
                strokeColor={getStatusColor(metrics.systemMetrics.diskUsage, 100)}
                showInfo={false}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="连接数"
                value={metrics.databaseMetrics.connectionCount}
                suffix={`/ ${metrics.databaseMetrics.maxConnections}`}
                valueStyle={{ 
                  color: getStatusColor(
                    metrics.databaseMetrics.connectionCount,
                    metrics.databaseMetrics.maxConnections
                  )
                }}
              />
              <Progress
                percent={(metrics.databaseMetrics.connectionCount / metrics.databaseMetrics.maxConnections) * 100}
                strokeColor={getStatusColor(
                  metrics.databaseMetrics.connectionCount,
                  metrics.databaseMetrics.maxConnections
                )}
                showInfo={false}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 数据库性能指标 */}
      {metrics && (
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="查询延迟"
                value={metrics.databaseMetrics.queryLatency}
                suffix="ms"
                valueStyle={{ color: metrics.databaseMetrics.queryLatency > 1000 ? '#f5222d' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="写入延迟"
                value={metrics.databaseMetrics.writeLatency}
                suffix="ms"
                valueStyle={{ color: metrics.databaseMetrics.writeLatency > 500 ? '#f5222d' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="查询速率"
                value={metrics.databaseMetrics.queryRate}
                suffix="次/秒"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="写入速率"
                value={metrics.databaseMetrics.writeRate}
                suffix="次/秒"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 性能趋势图 */}
      <Card
        title="性能趋势"
        extra={
          <Select
            value={selectedMetric}
            onChange={setSelectedMetric}
            style={{ width: 120 }}
          >
            <Option value="cpu">CPU 使用率</Option>
            <Option value="memory">内存使用率</Option>
            <Option value="disk">磁盘使用率</Option>
            <Option value="queryLatency">查询延迟</Option>
            <Option value="writeLatency">写入延迟</Option>
            <Option value="connections">连接数</Option>
          </Select>
        }
      >
        <ReactECharts
          option={chartOptions}
          style={{ height: '300px' }}
          showLoading={loading}
        />
      </Card>

      {/* 告警和慢查询概览 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card
            title="活跃告警"
            extra={
              <Button
                type="link"
                onClick={() => setShowAlertModal(true)}
              >
                查看全部
              </Button>
            }
          >
            <List
              size="small"
              dataSource={alertRecords.filter(alert => alert.status === 'active').slice(0, 5)}
              renderItem={(alert) => (
                <List.Item>
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <Text strong>{alert.ruleName}</Text>
                      <br />
                      <Text type="secondary">{alert.description}</Text>
                    </div>
                    <Tag color={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title="慢查询"
            extra={
              <Button
                type="link"
                onClick={() => setShowSlowQueryModal(true)}
              >
                查看全部
              </Button>
            }
          >
            <List
              size="small"
              dataSource={slowQueries.slice(0, 5)}
              renderItem={(query) => (
                <List.Item>
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <Text code>{query.query.substring(0, 40)}...</Text>
                      <br />
                      <Text type="secondary">{query.database}</Text>
                    </div>
                    <Text style={{ color: '#f5222d' }}>
                      {query.duration}ms
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 告警详情模态框 */}
      <Modal
        title="告警记录"
        open={showAlertModal}
        onCancel={() => setShowAlertModal(false)}
        footer={null}
        width={1200}
      >
        <Table
          columns={alertColumns}
          dataSource={alertRecords}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>

      {/* 慢查询详情模态框 */}
      <Modal
        title="慢查询记录"
        open={showSlowQueryModal}
        onCancel={() => setShowSlowQueryModal(false)}
        footer={null}
        width={1400}
      >
        <Table
          columns={slowQueryColumns}
          dataSource={slowQueries}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Modal>
    </div>
  );
};

export default PerformanceMonitor;