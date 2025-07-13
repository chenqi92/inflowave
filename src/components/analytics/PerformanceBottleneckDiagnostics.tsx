import React, { useState, useEffect, useCallback } from 'react';
import { Card, Space, Dialog, DialogContent, DialogHeader, DialogTitle, Progress, Tag, Button, Alert, Tabs, TabsContent, TabsList, TabsTrigger, Select, Input, Switch, Form, Spin } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { DatePickerWithRange } from '@/components/ui';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui';

import { MonitorOutlined, RiseOutlined, ClearOutlined } from '@/components/ui';
import { RefreshCw, Download, Settings, Clock, Flame, Bug, Trophy, Rocket, Lock, Lightbulb, Webhook, Info, Minus, MinusCircle, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { PerformanceBottleneckService, type PerformanceBottleneck } from '@/services/analyticsService';
import { showMessage } from '@/utils/message';
import dayjs from 'dayjs';

import { Text } from '@/components/ui';

interface PerformanceBottleneckDiagnosticsProps {
  className?: string;
}

export const PerformanceBottleneckDiagnostics: React.FC<PerformanceBottleneckDiagnosticsProps> = ({
  className}) => {
  const { activeConnectionId } = useConnectionStore();
  const [bottlenecks, setBottlenecks] = useState<PerformanceBottleneck[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBottleneck, setSelectedBottleneck] = useState<PerformanceBottleneck | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<{from: Date, to: Date} | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'query' | 'connection' | 'memory' | 'disk' | 'network' | 'cpu' | 'lock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'ignored'>('all');
  const [searchText, setSearchText] = useState('');
  const [systemMetrics, setSystemMetrics] = useState<{
    cpuUsage: number;
    memoryUsage: number;
    diskIo: number;
    networkIo: number;
  } | null>(null);
  const [slowQueries, setSlowQueries] = useState<{
    queries: Array<{
      query: string;
      executionTime: number;
      timestamp: Date;
    }>;
  } | null>(null);
  const [lockWaits, setLockWaits] = useState<{
    locks: Array<{
      type: string;
      duration: number;
      blockedBy: string;
    }>;
  } | null>(null);
  const [performanceReport, setPerformanceReport] = useState<{
    summary: string;
    recommendations: string[];
    score: number;
  } | null>(null);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [diagnosticsModalVisible, setDiagnosticsModalVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({
    cpuUsage: 80,
    memoryUsage: 85,
    diskIo: 90,
    networkIo: 95,
    queryExecutionTime: 5000,
    connectionCount: 100});

  // 获取性能瓶颈数据
  const getBottlenecks = useCallback(async () => {
    if (!activeConnectionId) return;

    setLoading(true);
    try {
      const range = timeRange ? {
        start: timeRange.from,
        end: timeRange.to} : undefined;

      const [
        bottlenecksData,
        systemMetricsData,
        slowQueriesData,
        lockWaitsData,
        connectionPoolData,
        performanceReportData,
      ] = await Promise.all([
        PerformanceBottleneckService.detectPerformanceBottlenecks(activeConnectionId, range),
        PerformanceBottleneckService.getSystemPerformanceMetrics(activeConnectionId, range),
        PerformanceBottleneckService.getSlowQueryLog(activeConnectionId, { limit: 50 }),
        PerformanceBottleneckService.analyzeLockWaits(activeConnectionId, range),
        PerformanceBottleneckService.getConnectionPoolStats(activeConnectionId, range),
        PerformanceBottleneckService.generatePerformanceReport(activeConnectionId, range),
      ]);

      setBottlenecks(bottlenecksData);
      setSystemMetrics(systemMetricsData);
      setSlowQueries(slowQueriesData);
      setLockWaits(lockWaitsData);
      // setConnectionPoolStats(connectionPoolData);
      setPerformanceReport(performanceReportData);
    } catch (error) {
      console.error('获取性能瓶颈数据失败:', error);
      showMessage.error('获取性能瓶颈数据失败');
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, timeRange]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(getBottlenecks, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, getBottlenecks]);

  useEffect(() => {
    getBottlenecks();
  }, [getBottlenecks]);

  // 获取严重程度颜色
  const getSeverityColor = (severity: string): string => {
    const colorMap: Record<string, string> = {
      'low': 'green',
      'medium': 'orange',
      'high': 'red',
      'critical': 'red'};
    return colorMap[severity] || 'default';
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'low': <Info className="w-4 h-4" style={{ color: '#52c41a' }}  />,
      'medium': <AlertTriangle style={{ color: '#faad14' }} />,
      'high': <AlertCircle style={{ color: '#ff4d4f' }} />,
      'critical': <AlertCircle style={{ color: '#ff4d4f' }} />};
    return iconMap[severity] || <Info className="w-4 h-4"  />;
  };

  // 获取类型图标
  const getTypeIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'query': <Bug className="w-4 h-4"  />,
      'connection': <Webhook className="w-4 h-4"  />,
      'memory': <Database className="w-4 h-4" />,
      'disk': <Database className="w-4 h-4" />,
      'network': <Webhook className="w-4 h-4" />,
      'cpu': <Bug className="w-4 h-4" />,
      'lock': <Lock className="w-4 h-4"  />};
    return iconMap[type] || <Info className="w-4 h-4"  />;
  };

  // 获取状态图标
  const getStatusIcon = (status: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'active': <Flame className="w-4 h-4" style={{ color: '#ff4d4f' }}  />,
      'resolved': <CheckCircle style={{ color: '#52c41a' }} />,
      'ignored': <MinusCircle style={{ color: '#d9d9d9' }} />};
    return iconMap[status] || <Info className="w-4 h-4"  />;
  };


  // 格式化时间
  const formatTime = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms.toFixed(2)}ms`;
  };

  // 格式化百分比
  // const formatPercentage = (ratio: number): string => {
  //   return `${(ratio * 100).toFixed(1)}%`;
  // };

  // 过滤瓶颈数据
  const filteredBottlenecks = bottlenecks.filter(bottleneck => {
    if (severityFilter !== 'all' && bottleneck.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && bottleneck.type !== typeFilter) return false;
    if (statusFilter !== 'all' && bottleneck.status !== statusFilter) return false;
    if (searchText && !bottleneck.title.toLowerCase().includes(searchText.toLowerCase()) &&
        !bottleneck.description.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // 标记瓶颈已解决
  const markAsResolved = async (bottleneckId: string) => {
    try {
      await PerformanceBottleneckService.markBottleneckResolved(bottleneckId);
      showMessage.success('瓶颈已标记为已解决');
      getBottlenecks();
    } catch (error) {
      console.error('标记瓶颈失败:', error);
      showMessage.error('标记瓶颈失败');
    }
  };

  // 忽略瓶颈
  const ignoreBottleneck = async (bottleneckId: string) => {
    try {
      await PerformanceBottleneckService.ignoreBottleneck(bottleneckId);
      showMessage.success('瓶颈已忽略');
      getBottlenecks();
    } catch (error) {
      console.error('忽略瓶颈失败:', error);
      showMessage.error('忽略瓶颈失败');
    }
  };

  // 瓶颈表格列定义
  const bottleneckColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => (
        <div className="flex gap-2">
          {getTypeIcon(type)}
          <Text>{type}</Text>
        </div>
      )},
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <div className="flex gap-2">
          {getSeverityIcon(severity)}
          <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
        </div>
      )},
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (title: string) => <Text strong>{title}</Text>},
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      render: (description: string) => (
        <Text className="block" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {description}
        </Text>
      )},
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (duration: number) => formatTime(duration)},
    {
      title: '频率',
      dataIndex: 'frequency',
      key: 'frequency',
      width: 80,
      render: (frequency: number) => `${frequency}次`},
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <div className="flex gap-2">
          {getStatusIcon(status)}
          <Text>{status === 'active' ? '活跃' : status === 'resolved' ? '已解决' : '已忽略'}</Text>
        </div>
      )},
    {
      title: '检测时间',
      dataIndex: 'detectedAt',
      key: 'detectedAt',
      width: 120,
      render: (date: Date) => moment(date).format('MM-DD HH:mm')},
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (text: string, record: PerformanceBottleneck) => (
        <div className="flex gap-2">
          <Button
            size="small"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => {
              setSelectedBottleneck(record);
              setDetailsDrawerVisible(true);
            }}
          >
            详情
          </Button>
          {record.status === 'active' && (
            <>
              <Button
                size="small"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => markAsResolved(record.id)}
              >
                解决
              </Button>
              <Button
                size="small"
                icon={<Minus />}
                onClick={() => ignoreBottleneck(record.id)}
              >
                忽略
              </Button>
            </>
          )}
        </div>
      )},
  ];

  // 渲染概览
  const renderOverview = () => {
    if (!bottlenecks.length) {
      return <Empty description="没有检测到性能瓶颈" />;
    }

    const activeBottlenecks = bottlenecks.filter(b => b.status === 'active');
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical');
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high');
    const totalImpact = bottlenecks.reduce((sum, b) => sum + parseFloat(b.impact), 0);

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃瓶颈"
                value={activeBottlenecks.length}
                suffix={`/ ${bottlenecks.length}`}
                valueStyle={{ color: activeBottlenecks.length > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<Flame className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="严重瓶颈"
                value={criticalBottlenecks.length}
                valueStyle={{ color: criticalBottlenecks.length > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<AlertCircle className="w-4 h-4" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="高危瓶颈"
                value={highBottlenecks.length}
                valueStyle={{ color: highBottlenecks.length > 0 ? '#faad14' : '#52c41a' }}
                prefix={<AlertTriangle className="w-4 h-4" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="总体影响"
                value={totalImpact.toFixed(1)}
                suffix="%"
                valueStyle={{ color: totalImpact > 20 ? '#ff4d4f' : totalImpact > 10 ? '#faad14' : '#52c41a' }}
                prefix={<RiseOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 过滤器 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={6}>
              <Search
                placeholder="搜索瓶颈..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onSearch={setSearchText}
                allowClear
              />
            </Col>
            <Col span={3}>
              <Select
                value={severityFilter}
                onChange={setSeverityFilter}
                style={{ width: '100%' }}
                placeholder="严重程度"
              >
                <Option value="all">所有严重程度</Option>
                <Option value="critical">严重</Option>
                <Option value="high">高</Option>
                <Option value="medium">中</Option>
                <Option value="low">低</Option>
              </Select>
            </Col>
            <Col span={3}>
              <Select
                value={typeFilter}
                onChange={setTypeFilter}
                style={{ width: '100%' }}
                placeholder="类型"
              >
                <Option value="all">所有类型</Option>
                <Option value="query">查询</Option>
                <Option value="connection">连接</Option>
                <Option value="memory">内存</Option>
                <Option value="disk">磁盘</Option>
                <Option value="network">网络</Option>
                <Option value="cpu">CPU</Option>
                <Option value="lock">锁</Option>
              </Select>
            </Col>
            <Col span={3}>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                placeholder="状态"
              >
                <Option value="all">所有状态</Option>
                <Option value="active">活跃</Option>
                <Option value="resolved">已解决</Option>
                <Option value="ignored">已忽略</Option>
              </Select>
            </Col>
            <Col span={4}>
              <RangePicker
                value={timeRange}
                onChange={setTimeRange}
                style={{ width: '100%' }}
                placeholder={['开始时间', '结束时间']}
              />
            </Col>
            <Col span={3}>
              <div className="flex gap-2">
                <Switch
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                  size="small"
                />
                <Text type="secondary">自动刷新</Text>
              </div>
            </Col>
            <Col span={2}>
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  setSearchText('');
                  setSeverityFilter('all');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setTimeRange(null);
                }}
              >
                清空
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 瓶颈表格 */}
        <Table
          columns={bottleneckColumns}
          dataSource={filteredBottlenecks}
          rowKey="id"
          pagination={{
            total: filteredBottlenecks.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`}}
          scroll={{ x: 1400 }}
          size="small"
          rowClassName={(record) => {
            if (record.severity === 'critical') return 'critical-row';
            if (record.severity === 'high') return 'high-row';
            return '';
          }}
        />
      </div>
    );
  };

  // 渲染系统指标
  const renderSystemMetrics = () => {
    if (!systemMetrics) {
      return <Empty description="没有系统性能指标数据" />;
    }

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="CPU使用率"
                value={systemMetrics.cpu[systemMetrics.cpu.length - 1]?.usage || 0}
                suffix="%"
                precision={1}
                valueStyle={{ 
                  color: systemMetrics.cpu[systemMetrics.cpu.length - 1]?.usage > 80 ? '#ff4d4f' : '#52c41a' 
                }}
                prefix={<Bug className="w-4 h-4" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="内存使用率"
                value={systemMetrics.memory[systemMetrics.memory.length - 1]?.usage || 0}
                suffix="%"
                precision={1}
                valueStyle={{ 
                  color: systemMetrics.memory[systemMetrics.memory.length - 1]?.usage > 85 ? '#ff4d4f' : '#52c41a' 
                }}
                prefix={<Database className="w-4 h-4" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="磁盘I/O"
                value={systemMetrics.disk[systemMetrics.disk.length - 1]?.readIops || 0}
                suffix="IOPS"
                precision={0}
                valueStyle={{ color: '#1890ff' }}
                prefix={<Database className="w-4 h-4" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="网络I/O"
                value={systemMetrics.network[systemMetrics.network.length - 1]?.bytesIn || 0}
                suffix="KB/s"
                precision={1}
                valueStyle={{ color: '#722ed1' }}
                prefix={<Webhook className="w-4 h-4" />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="CPU和内存使用率趋势" size="small">
              {/* 这里应该是图表组件，显示CPU和内存的时间序列数据 */}
              <div style={{ height: '200px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="secondary">CPU和内存使用率趋势图</Text>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="磁盘和网络I/O趋势" size="small">
              {/* 这里应该是图表组件，显示磁盘和网络I/O的时间序列数据 */}
              <div style={{ height: '200px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text type="secondary">磁盘和网络I/O趋势图</Text>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // 渲染慢查询
  const renderSlowQueries = () => {
    if (!slowQueries || !slowQueries.queries.length) {
      return <Empty description="没有慢查询数据" />;
    }

    const slowQueryColumns = [
      {
        title: '查询',
        dataIndex: 'query',
        key: 'query',
        width: 300,
        render: (query: string) => (
          <Text code className="block" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {query}
          </Text>
        )},
      {
        title: '平均执行时间',
        dataIndex: 'avgDuration',
        key: 'avgDuration',
        width: 120,
        render: (duration: number) => formatTime(duration),
        sorter: (a: any, b: any) => a.avgDuration - b.avgDuration},
      {
        title: '最大执行时间',
        dataIndex: 'maxDuration',
        key: 'maxDuration',
        width: 120,
        render: (duration: number) => formatTime(duration),
        sorter: (a: any, b: any) => a.maxDuration - b.maxDuration},
      {
        title: '执行频率',
        dataIndex: 'frequency',
        key: 'frequency',
        width: 100,
        render: (frequency: number) => `${frequency}次`,
        sorter: (a: any, b: any) => a.frequency - b.frequency},
      {
        title: '数据库',
        dataIndex: 'database',
        key: 'database',
        width: 100},
      {
        title: '最近执行',
        dataIndex: 'lastExecuted',
        key: 'lastExecuted',
        width: 120,
        render: (date: Date) => new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })},
    ];

    return (
      <div>
        <Alert
          message={`共检测到 ${slowQueries.total} 个慢查询，显示前 ${slowQueries.queries.length} 个`}
          type="info"
          style={{ marginBottom: '16px' }}
        />
        <Table
          columns={slowQueryColumns}
          dataSource={slowQueries.queries}
          rowKey="query"
          pagination={{
            total: slowQueries.total,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true}}
          scroll={{ x: 1000 }}
          size="small"
        />
      </div>
    );
  };

  // 渲染锁等待分析
  const renderLockWaits = () => {
    if (!lockWaits || !lockWaits.locks.length) {
      return <Empty description="没有锁等待数据" />;
    }

    const lockColumns = [
      {
        title: '锁类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (type: string) => <Tag color="orange">{type}</Tag>},
      {
        title: '表名',
        dataIndex: 'table',
        key: 'table',
        width: 150},
      {
        title: '等待时长',
        dataIndex: 'duration',
        key: 'duration',
        width: 100,
        render: (duration: number) => formatTime(duration),
        sorter: (a: any, b: any) => a.duration - b.duration},
      {
        title: '等待查询数',
        dataIndex: 'waitingQueries',
        key: 'waitingQueries',
        width: 100,
        render: (queries: string[]) => queries.length},
      {
        title: '阻塞查询',
        dataIndex: 'blockingQuery',
        key: 'blockingQuery',
        width: 200,
        render: (query: string) => (
          <Text code className="block" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {query}
          </Text>
        )},
      {
        title: '发生时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 120,
        render: (date: Date) => new Date(date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })},
    ];

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="总锁等待数"
                value={lockWaits.summary.totalLocks}
                prefix={<Lock className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="平均等待时间"
                value={lockWaits.summary.avgWaitTime}
                suffix="ms"
                precision={2}
                prefix={<Clock className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="最大等待时间"
                value={lockWaits.summary.maxWaitTime}
                suffix="ms"
                precision={2}
                prefix={<AlertCircle className="w-4 h-4" />}
              />
            </Card>
          </Col>
        </Row>

        <Table
          columns={lockColumns}
          dataSource={lockWaits.locks}
          rowKey={(record, index) => `${record.table}-${record.type}-${index}`}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true}}
          scroll={{ x: 1000 }}
          size="small"
        />

        {lockWaits.summary.recommendations.length > 0 && (
          <Card title="优化建议" style={{ marginTop: '16px' }}>
            <List
              dataSource={lockWaits.summary.recommendations}
              renderItem={(recommendation: string) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Lightbulb className="w-4 h-4" style={{ color: '#1890ff' }}  />}
                    description={recommendation}
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    );
  };

  // 渲染性能报告
  const renderPerformanceReport = () => {
    if (!performanceReport) {
      return <Empty description="没有性能报告数据" />;
    }

    const { summary, recommendations, metrics } = performanceReport;

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="整体性能分数"
                value={summary.overallScore}
                suffix="/ 100"
                precision={1}
                valueStyle={{ color: summary.overallScore >= 80 ? '#52c41a' : summary.overallScore >= 60 ? '#faad14' : '#ff4d4f' }}
                prefix={<Trophy className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均查询时间"
                value={summary.avgQueryTime}
                suffix="ms"
                precision={2}
                prefix={<Clock className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="错误率"
                value={summary.errorRate}
                suffix="%"
                precision={2}
                valueStyle={{ color: summary.errorRate > 5 ? '#ff4d4f' : '#52c41a' }}
                prefix={<Bug className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="吞吐量"
                value={summary.throughput}
                suffix="QPS"
                precision={1}
                prefix={<Rocket className="w-4 h-4"  />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="系统性能指标" size="small">
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Text strong>CPU使用率</Text>
                  <Progress
                    percent={metrics.cpu}
                    strokeColor={metrics.cpu > 80 ? '#ff4d4f' : '#52c41a'}
                    style={{ marginTop: '4px' }}
                  />
                </Col>
                <Col span={12}>
                  <Text strong>内存使用率</Text>
                  <Progress
                    percent={metrics.memory}
                    strokeColor={metrics.memory > 85 ? '#ff4d4f' : '#52c41a'}
                    style={{ marginTop: '4px' }}
                  />
                </Col>
                <Col span={12}>
                  <Text strong>磁盘I/O</Text>
                  <Progress
                    percent={metrics.disk}
                    strokeColor={metrics.disk > 90 ? '#ff4d4f' : '#52c41a'}
                    style={{ marginTop: '4px' }}
                  />
                </Col>
                <Col span={12}>
                  <Text strong>网络I/O</Text>
                  <Progress
                    percent={metrics.network}
                    strokeColor={metrics.network > 95 ? '#ff4d4f' : '#52c41a'}
                    style={{ marginTop: '4px' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="性能优化建议" size="small">
              <List
                dataSource={recommendations.slice(0, 5)}
                renderItem={(recommendation: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Tag color={recommendation.priority === 'critical' ? 'red' : 
                                   recommendation.priority === 'high' ? 'orange' : 
                                   recommendation.priority === 'medium' ? 'blue' : 'green'}>
                          {recommendation.priority}
                        </Tag>
                      }
                      title={recommendation.title}
                      description={recommendation.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className={className}>
      <Card
        title={
          <div className="flex gap-2">
            <MonitorOutlined />
            <span>性能瓶颈诊断</span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Button
              size="small"
              icon={<RefreshCw className="w-4 h-4"  />}
              onClick={getBottlenecks}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<Settings className="w-4 h-4"  />}
              onClick={() => setDiagnosticsModalVisible(true)}
            >
              诊断设置
            </Button>
            <Button
              size="small"
              icon={<Download className="w-4 h-4"  />}
              onClick={() => {
                if (performanceReport) {
                  const blob = new Blob([JSON.stringify(performanceReport, null, 2)], {
                    type: 'application/json'});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `performance-report-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              disabled={!performanceReport}
            >
              导出报告
            </Button>
          </div>
        }
      >
        <Spin spinning={loading}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="瓶颈概览" key="overview">
              {renderOverview()}
            </TabPane>
            <TabPane tab="系统指标" key="metrics">
              {renderSystemMetrics()}
            </TabPane>
            <TabPane tab="慢查询" key="slow-queries">
              {renderSlowQueries()}
            </TabPane>
            <TabPane tab="锁等待" key="lock-waits">
              {renderLockWaits()}
            </TabPane>
            <TabPane tab="性能报告" key="report">
              {renderPerformanceReport()}
            </TabPane>
          </Tabs>
        </Spin>
      </Card>

      {/* 瓶颈详情抽屉 */}
      <Drawer
        title="性能瓶颈详情"
        placement="right"
        width={600}
        onClose={() => setDetailsDrawerVisible(false)}
        visible={detailsDrawerVisible}
      >
        {selectedBottleneck && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="类型">
                <div className="flex gap-2">
                  {getTypeIcon(selectedBottleneck.type)}
                  <span>{selectedBottleneck.type}</span>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <div className="flex gap-2">
                  {getSeverityIcon(selectedBottleneck.severity)}
                  <Tag color={getSeverityColor(selectedBottleneck.severity)}>
                    {selectedBottleneck.severity.toUpperCase()}
                  </Tag>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="标题">
                {selectedBottleneck.title}
              </Descriptions.Item>
              <Descriptions.Item label="描述">
                {selectedBottleneck.description}
              </Descriptions.Item>
              <Descriptions.Item label="影响">
                {selectedBottleneck.impact}
              </Descriptions.Item>
              <Descriptions.Item label="持续时间">
                {formatTime(selectedBottleneck.duration)}
              </Descriptions.Item>
              <Descriptions.Item label="发生频率">
                {selectedBottleneck.frequency}次
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <div className="flex gap-2">
                  {getStatusIcon(selectedBottleneck.status)}
                  <span>
                    {selectedBottleneck.status === 'active' ? '活跃' : 
                     selectedBottleneck.status === 'resolved' ? '已解决' : '已忽略'}
                  </span>
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="检测时间">
                {new Date(selectedBottleneck.detectedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            {selectedBottleneck.recommendations.length > 0 && (
              <Card title="解决建议" style={{ marginTop: '16px' }}>
                <List
                  dataSource={selectedBottleneck.recommendations}
                  renderItem={(recommendation: string) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Lightbulb className="w-4 h-4" style={{ color: '#1890ff' }}  />}
                        description={recommendation}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            <div style={{ marginTop: '16px' }}>
              <div className="flex gap-2">
                {selectedBottleneck.status === 'active' && (
                  <>
                    <Button
                      type="primary"
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={() => {
                        markAsResolved(selectedBottleneck.id);
                        setDetailsDrawerVisible(false);
                      }}
                    >
                      标记为已解决
                    </Button>
                    <Button
                      icon={<Minus />}
                      onClick={() => {
                        ignoreBottleneck(selectedBottleneck.id);
                        setDetailsDrawerVisible(false);
                      }}
                    >
                      忽略此瓶颈
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* 诊断设置模态框 */}
      <Dialog open={diagnosticsModalVisible} onOpenChange={setDiagnosticsModalVisible}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>诊断设置</DialogTitle>
          </DialogHeader>
        <Form layout="vertical">
          <Form.Item label="自动刷新">
            <Row gutter={16}>
              <Col span={12}>
                <Switch
                  checked={autoRefresh}
                  onChange={setAutoRefresh}
                  checkedChildren="开启"
                  unCheckedChildren="关闭"
                />
              </Col>
              <Col span={12}>
                <InputNumber
                  value={refreshInterval}
                  onChange={(value) => setRefreshInterval(value || 30)}
                  min={10}
                  max={300}
                  suffix="秒"
                  style={{ width: '100%' }}
                  disabled={!autoRefresh}
                />
              </Col>
            </Row>
          </Form.Item>
          
          <Form.Item label="告警阈值">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text>CPU使用率</Text>
                <InputNumber
                  value={alertThresholds.cpuUsage}
                  onChange={(value) => setAlertThresholds({...alertThresholds, cpuUsage: value || 80})}
                  min={0}
                  max={100}
                  suffix="%"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={12}>
                <Text>内存使用率</Text>
                <InputNumber
                  value={alertThresholds.memoryUsage}
                  onChange={(value) => setAlertThresholds({...alertThresholds, memoryUsage: value || 85})}
                  min={0}
                  max={100}
                  suffix="%"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={12}>
                <Text>磁盘I/O</Text>
                <InputNumber
                  value={alertThresholds.diskIo}
                  onChange={(value) => setAlertThresholds({...alertThresholds, diskIo: value || 90})}
                  min={0}
                  max={100}
                  suffix="%"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={12}>
                <Text>网络I/O</Text>
                <InputNumber
                  value={alertThresholds.networkIo}
                  onChange={(value) => setAlertThresholds({...alertThresholds, networkIo: value || 95})}
                  min={0}
                  max={100}
                  suffix="%"
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>
          </Form.Item>
          
          <Form.Item label="实时监控">
            <Switch
              checked={realTimeMode}
              onChange={setRealTimeMode}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </Form.Item>
        </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformanceBottleneckDiagnostics;