import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Typography,
  Space,
  Tag,
  Button,
  Tooltip,
  Alert,
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ApiOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '@/store/connection';

const { Title, Text } = Typography;

interface PerformanceMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  connectionCount: number;
  queryCount: number;
  averageQueryTime: number;
  errorRate: number;
  uptime: number;
  lastUpdate: Date;
}

interface ConnectionHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error';
  latency: number;
  lastCheck: Date;
  errorCount: number;
}

const PerformanceMonitor: React.FC = () => {
  const { connections, activeConnectionId } = useConnectionStore();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取性能指标
  const fetchPerformanceMetrics = async () => {
    setLoading(true);
    try {
      // 模拟性能数据（实际应用中应该从后端获取）
      const mockMetrics: PerformanceMetrics = {
        memoryUsage: {
          used: Math.floor(Math.random() * 500) + 200, // 200-700 MB
          total: 1024,
          percentage: 0,
        },
        cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
        connectionCount: connections.length,
        queryCount: Math.floor(Math.random() * 1000) + 500,
        averageQueryTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
        errorRate: Math.random() * 5, // 0-5%
        uptime: Date.now() - (Math.random() * 86400000), // 随机运行时间
        lastUpdate: new Date(),
      };

      mockMetrics.memoryUsage.percentage = Math.round(
        (mockMetrics.memoryUsage.used / mockMetrics.memoryUsage.total) * 100
      );

      setMetrics(mockMetrics);

      // 获取连接健康状态
      const healthData: ConnectionHealth[] = connections.map(conn => ({
        id: conn.id!,
        name: conn.name,
        status: Math.random() > 0.8 ? 'warning' : 'healthy',
        latency: Math.floor(Math.random() * 100) + 10,
        lastCheck: new Date(),
        errorCount: Math.floor(Math.random() * 5),
      }));

      setConnectionHealth(healthData);
    } catch (error) {
      console.error('获取性能指标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化运行时间
  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'green';
      case 'warning':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'default';
    }
  };

  // 获取性能等级
  const getPerformanceLevel = (value: number, thresholds: number[]) => {
    if (value <= thresholds[0]) return { level: 'excellent', color: 'green' };
    if (value <= thresholds[1]) return { level: 'good', color: 'blue' };
    if (value <= thresholds[2]) return { level: 'fair', color: 'orange' };
    return { level: 'poor', color: 'red' };
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchPerformanceMetrics();
    
    // 设置定时刷新
    const interval = setInterval(fetchPerformanceMetrics, 30000); // 30秒刷新一次
    
    return () => clearInterval(interval);
  }, [connections]);

  if (!metrics) {
    return (
      <Card title="性能监控" loading={loading}>
        <div className="text-center py-8">
          <Text type="secondary">正在加载性能数据...</Text>
        </div>
      </Card>
    );
  }

  const cpuLevel = getPerformanceLevel(metrics.cpuUsage, [20, 50, 80]);
  const memoryLevel = getPerformanceLevel(metrics.memoryUsage.percentage, [30, 60, 85]);
  const queryTimeLevel = getPerformanceLevel(metrics.averageQueryTime, [100, 300, 1000]);

  return (
    <div className="space-y-6">
      {/* 系统性能概览 */}
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            系统性能监控
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchPerformanceMetrics}
            loading={loading}
            size="small"
          >
            刷新
          </Button>
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="CPU 使用率"
              value={metrics.cpuUsage}
              suffix="%"
              valueStyle={{ color: cpuLevel.color }}
            />
            <Progress
              percent={metrics.cpuUsage}
              strokeColor={cpuLevel.color}
              size="small"
              showInfo={false}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="内存使用"
              value={metrics.memoryUsage.used}
              suffix={`/ ${metrics.memoryUsage.total} MB`}
              valueStyle={{ color: memoryLevel.color }}
            />
            <Progress
              percent={metrics.memoryUsage.percentage}
              strokeColor={memoryLevel.color}
              size="small"
              showInfo={false}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均查询时间"
              value={metrics.averageQueryTime}
              suffix="ms"
              valueStyle={{ color: queryTimeLevel.color }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="运行时间"
              value={formatUptime(metrics.uptime)}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 连接和查询统计 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="连接统计" size="small">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="活跃连接"
                  value={metrics.connectionCount}
                  prefix={<DatabaseOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="查询总数"
                  value={metrics.queryCount}
                  prefix={<ApiOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="错误率" size="small">
            <Statistic
              title="错误率"
              value={metrics.errorRate}
              suffix="%"
              precision={2}
              valueStyle={{
                color: metrics.errorRate > 2 ? '#cf1322' : '#3f8600',
              }}
              prefix={
                metrics.errorRate > 2 ? (
                  <WarningOutlined />
                ) : (
                  <ThunderboltOutlined />
                )
              }
            />
            {metrics.errorRate > 2 && (
              <Alert
                message="错误率偏高"
                description="建议检查连接配置和查询语句"
                type="warning"
                size="small"
                className="mt-2"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 连接健康状态 */}
      <Card title="连接健康状态" size="small">
        {connectionHealth.length > 0 ? (
          <div className="space-y-2">
            {connectionHealth.map(conn => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center space-x-3">
                  <Tag color={getStatusColor(conn.status)}>
                    {conn.status === 'healthy' ? '健康' : 
                     conn.status === 'warning' ? '警告' : '错误'}
                  </Tag>
                  <Text strong>{conn.name}</Text>
                </div>
                <div className="flex items-center space-x-4">
                  <Tooltip title="延迟">
                    <Text type="secondary">{conn.latency}ms</Text>
                  </Tooltip>
                  {conn.errorCount > 0 && (
                    <Tooltip title="错误次数">
                      <Tag color="red">{conn.errorCount} 错误</Tag>
                    </Tooltip>
                  )}
                  <Text type="secondary" className="text-xs">
                    {conn.lastCheck.toLocaleTimeString()}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <Text type="secondary">暂无连接</Text>
          </div>
        )}
      </Card>

      {/* 最后更新时间 */}
      <div className="text-center">
        <Text type="secondary" className="text-xs">
          最后更新: {metrics.lastUpdate.toLocaleString()}
        </Text>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
