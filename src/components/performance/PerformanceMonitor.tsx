import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Alert, Button, Select, Space, Typography, Tag } from '@/components/ui';
// TODO: Replace these Ant Design components: Progress, Tooltip, List, Divider, 
import { DashboardOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ReloadOutlined, SettingOutlined } from '@/components/ui';
// TODO: Replace these icons: ThunderboltOutlined, ClockCircleOutlined, WarningOutlined, // Using SettingOutlined instead of OptimizationOutlined
  DatabaseOutlined
// You may need to find alternatives or create custom icons
import { safeTauriInvoke } from '@/utils/tauri';
import type { PerformanceMetrics, SlowQueryInfo, ConnectionHealthMetrics } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

interface PerformanceMonitorProps {
  connectionId?: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  connectionId,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [slowQueries, setSlowQueries] = useState<SlowQueryInfo[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 加载性能指标
  const loadMetrics = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke<PerformanceMetrics>('get_performance_metrics', {
        connectionId,
        timeRange,
      });
      setMetrics(result || {
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        network_io: { bytes_in: 0, bytes_out: 0 },
        query_performance: { avg_response_time: 0, queries_per_second: 0 },
        connection_count: 0,
        uptime: 0
      });
    } catch (error) {
      console.error('加载性能指标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载慢查询分析
  const loadSlowQueries = async () => {
    try {
      const result = await safeTauriInvoke<SlowQueryInfo[]>('get_slow_query_analysis', {
        limit: 20,
      });
      setSlowQueries(result || []);
    } catch (error) {
      console.error('加载慢查询失败:', error);
    }
  };

  // 执行健康检查
  const performHealthCheck = async (connId: string) => {
    try {
      await safeTauriInvoke('perform_health_check', { connectionId: connId });
      loadMetrics();
    } catch (error) {
      console.error('健康检查失败:', error);
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  // 格式化时间
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // 慢查询表格列
  const slowQueryColumns = [
    {
      title: '查询',
      dataIndex: 'query',
      key: 'query',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text code style={{ fontSize: 12 }}>
            {text.length > 50 ? `${text.substring(0, 50)  }...` : text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '数据库',
      dataIndex: 'database',
      key: 'database',
      width: 120,
    },
    {
      title: '执行时间',
      dataIndex: 'executionTime',
      key: 'executionTime',
      width: 100,
      render: (time: number) => (
        <Tag color={time > 10000 ? 'red' : time > 5000 ? 'orange' : 'blue'}>
          {formatDuration(time)}
        </Tag>
      ),
    },
    {
      title: '返回行数',
      dataIndex: 'rowsReturned',
      key: 'rowsReturned',
      width: 100,
      render: (rows: number) => rows.toLocaleString(),
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '优化',
      key: 'optimization',
      width: 80,
      render: (record: SlowQueryInfo) => (
        record.optimization ? (
          <Tooltip title={record.optimization.suggestions.join(', ')}>
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              style={{ color: 'orange' }}
            />
          </Tooltip>
        ) : null
      ),
    },
  ];

  useEffect(() => {
    loadMetrics();
    loadSlowQueries();
  }, [connectionId, timeRange]);

  useEffect(() => {
    let interval: number;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadMetrics();
        loadSlowQueries();
      }, 30000); // 30秒刷新
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, connectionId, timeRange]);

  if (!metrics) {
    return <div>加载中...</div>;
  }

  return (
    <div className="performance-monitor">
      {/* 控制栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                style={{ width: 120 }}
              >
                <Option value="1h">最近1小时</Option>
                <Option value="6h">最近6小时</Option>
                <Option value="24h">最近24小时</Option>
                <Option value="7d">最近7天</Option>
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadMetrics}
                loading={loading}
              >
                刷新
              </Button>
              <Button
                type={autoRefresh ? 'primary' : 'default'}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                自动刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 概览指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总查询数"
              value={metrics.queryPerformance.totalQueries}
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均执行时间"
              value={metrics.queryPerformance.averageExecutionTime}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="QPS"
              value={metrics.queryPerformance.queriesPerSecond}
              precision={1}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="错误率"
              value={metrics.queryPerformance.errorRate}
              suffix="%"
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: metrics.queryPerformance.errorRate > 5 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 系统资源 */}
        <Col span={12}>
          <Card title="系统资源" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>内存使用率</Text>
                <Progress
                  percent={metrics.systemResources.memory.percentage}
                  status={metrics.systemResources.memory.percentage > 80 ? 'exception' : 'normal'}
                  format={() => `${formatBytes(metrics.systemResources.memory.used)} / ${formatBytes(metrics.systemResources.memory.total)}`}
                />
              </div>
              <div>
                <Text>CPU 使用率</Text>
                <Progress
                  percent={metrics.systemResources.cpu.usage}
                  status={metrics.systemResources.cpu.usage > 80 ? 'exception' : 'normal'}
                />
              </div>
              <div>
                <Text>磁盘使用率</Text>
                <Progress
                  percent={metrics.systemResources.disk.percentage}
                  status={metrics.systemResources.disk.percentage > 90 ? 'exception' : 'normal'}
                  format={() => `${formatBytes(metrics.systemResources.disk.used)} / ${formatBytes(metrics.systemResources.disk.total)}`}
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* 连接健康状态 */}
        <Col span={12}>
          <Card title="连接健康状态" size="small">
            <List
              dataSource={metrics.connectionHealth}
              renderItem={(item: ConnectionHealthMetrics) => (
                <List.Item
                  actions={[
                    <Button
                      size="small"
                      onClick={() => performHealthCheck(item.connectionId)}
                    >
                      检查
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Tag color={getStatusColor(item.status)}>
                        {item.status === 'healthy' ? <CheckCircleOutlined /> : <WarningOutlined />}
                      </Tag>
                    }
                    title={item.connectionId}
                    description={
                      <Space size="small">
                        <Text type="secondary">响应时间: {item.responseTime}ms</Text>
                        <Text type="secondary">错误: {item.errorCount}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 慢查询分析 */}
      <Card title="慢查询分析" style={{ marginTop: 16 }} size="small">
        {slowQueries.length > 0 ? (
          <Table
            dataSource={slowQueries}
            columns={slowQueryColumns}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Alert
            message="暂无慢查询"
            description="当前时间范围内没有检测到慢查询"
            type="success"
            showIcon
          />
        )}
      </Card>

      {/* 存储分析 */}
      <Card title="存储分析" style={{ marginTop: 16 }} size="small">
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Statistic
              title="总存储大小"
              value={formatBytes(metrics.storageAnalysis.totalSize)}
              prefix={<DatabaseOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="压缩比"
              value={metrics.storageAnalysis.compressionRatio}
              precision={2}
              suffix="x"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="保留策略效果"
              value={metrics.storageAnalysis.retentionPolicyEffectiveness * 100}
              precision={1}
              suffix="%"
            />
          </Col>
        </Row>

        {metrics.storageAnalysis.recommendations.length > 0 && (
          <>
            <Divider />
            <Title level={5}>优化建议</Title>
            <List
              dataSource={metrics.storageAnalysis.recommendations}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Tag color={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'blue'}>
                        {item.priority}
                      </Tag>
                    }
                    title={item.description}
                    description={`预计节省: ${formatBytes(item.estimatedSavings)}`}
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default PerformanceMonitor;
