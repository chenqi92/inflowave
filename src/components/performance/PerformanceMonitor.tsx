import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Alert, Button, Select, Space, Typography, Tag, Progress, Tooltip, List, Divider } from '@/components/ui';
import { DashboardOutlined, ExclamationCircleOutlined, CheckCircleOutlined, ReloadOutlined, SettingOutlined, DatabaseOutlined, ThunderboltOutlined, ClockCircleOutlined, WarningOutlined } from '@/components/ui';
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
        queryExecutionTime: [],
        writeLatency: [],
        memoryUsage: [],
        cpuUsage: [],
        diskIO: { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 },
        networkIO: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 },
        storageAnalysis: {
          totalSize: 0,
          compressionRatio: 1,
          retentionPolicyEffectiveness: 0,
          recommendations: []
        }
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
              title="查询执行次数"
              value={metrics?.queryExecutionTime?.length || 0}
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均执行时间"
              value={metrics?.queryExecutionTime?.length > 0 
                ? Math.round(metrics.queryExecutionTime.reduce((a, b) => a + b, 0) / metrics.queryExecutionTime.length)
                : 0
              }
              suffix="ms"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="写入延迟"
              value={metrics?.writeLatency?.length > 0 
                ? Math.round(metrics.writeLatency.reduce((a, b) => a + b, 0) / metrics.writeLatency.length)
                : 0
              }
              suffix="ms"
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="网络 I/O"
              value={formatBytes((metrics?.networkIO?.bytesIn || 0) + (metrics?.networkIO?.bytesOut || 0))}
              prefix={<ExclamationCircleOutlined />}
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
                <Text>内存使用情况</Text>
                <Progress
                  percent={metrics?.memoryUsage?.length > 0 
                    ? Math.round(metrics.memoryUsage[metrics.memoryUsage.length - 1])
                    : 0
                  }
                  status={metrics?.memoryUsage?.length > 0 && metrics.memoryUsage[metrics.memoryUsage.length - 1] > 80 ? 'exception' : 'normal'}
                />
              </div>
              <div>
                <Text>CPU 使用率</Text>
                <Progress
                  percent={metrics?.cpuUsage?.length > 0 
                    ? Math.round(metrics.cpuUsage[metrics.cpuUsage.length - 1])
                    : 0
                  }
                  status={metrics?.cpuUsage?.length > 0 && metrics.cpuUsage[metrics.cpuUsage.length - 1] > 80 ? 'exception' : 'normal'}
                />
              </div>
              <div>
                <Text>磁盘 I/O</Text>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  读取: {formatBytes(metrics?.diskIO?.readBytes || 0)} | 写入: {formatBytes(metrics?.diskIO?.writeBytes || 0)}
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 网络状态 */}
        <Col span={12}>
          <Card title="网络 I/O 状态" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text>输入流量</Text>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {formatBytes(metrics?.networkIO?.bytesIn || 0)}
                </div>
                <Text type="secondary">{(metrics?.networkIO?.packetsIn || 0).toLocaleString()} 包</Text>
              </div>
              <Divider />
              <div>
                <Text>输出流量</Text>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {formatBytes(metrics?.networkIO?.bytesOut || 0)}
                </div>
                <Text type="secondary">{(metrics?.networkIO?.packetsOut || 0).toLocaleString()} 包</Text>
              </div>
            </Space>
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
              value={formatBytes(metrics?.storageAnalysis?.totalSize || 0)}
              prefix={<DatabaseOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="压缩比"
              value={metrics?.storageAnalysis?.compressionRatio || 0}
              precision={2}
              suffix="x"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="保留策略效果"
              value={(metrics?.storageAnalysis?.retentionPolicyEffectiveness || 0) * 100}
              precision={1}
              suffix="%"
            />
          </Col>
        </Row>

        {(metrics?.storageAnalysis?.recommendations?.length || 0) > 0 && (
          <>
            <Divider />
            <Title level={5}>优化建议</Title>
            <List
              dataSource={metrics?.storageAnalysis?.recommendations || []}
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
