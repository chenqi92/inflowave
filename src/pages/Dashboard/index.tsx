import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Button, Empty } from 'antd';
import {
  DatabaseOutlined,
  ApiOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import PerformanceMonitor from '@/components/dashboard/PerformanceMonitor';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { connections, activeConnectionId, connectionStatuses } = useConnectionStore();

  // 统计数据
  const stats = {
    totalConnections: connections.length,
    activeConnections: Object.values(connectionStatuses).filter(
      status => status.status === 'connected'
    ).length,
    lastQueryTime: '暂无数据',
    totalQueries: 0,
  };

  // 快速操作
  const quickActions = [
    {
      title: '新建连接',
      description: '添加新的 InfluxDB 连接',
      icon: <PlusOutlined />,
      action: () => navigate('/connections'),
      type: 'primary' as const,
    },
    {
      title: '执行查询',
      description: '查询和分析数据',
      icon: <SearchOutlined />,
      action: () => navigate('/query'),
      disabled: !activeConnectionId,
    },
    {
      title: '数据可视化',
      description: '创建图表和仪表板',
      icon: <BarChartOutlined />,
      action: () => navigate('/visualization'),
      disabled: !activeConnectionId,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div>
        <Title level={2}>仪表板</Title>
        <Paragraph type="secondary">
          欢迎使用 InfluxDB GUI Manager，这里是您的数据管理中心。
        </Paragraph>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总连接数"
              value={stats.totalConnections}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃连接"
              value={stats.activeConnections}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总查询数"
              value={stats.totalQueries}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="最后查询"
              value={stats.lastQueryTime}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Card title="快速操作" className="w-full">
        {quickActions.length > 0 ? (
          <Row gutter={[16, 16]}>
            {quickActions.map((action, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card
                  hoverable
                  className="h-full cursor-pointer"
                  onClick={action.disabled ? undefined : action.action}
                  style={{ 
                    opacity: action.disabled ? 0.6 : 1,
                    cursor: action.disabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div className="text-center space-y-3">
                    <div className="text-3xl text-primary-600">
                      {action.icon}
                    </div>
                    <Title level={4} className="mb-2">
                      {action.title}
                    </Title>
                    <Paragraph type="secondary" className="mb-4">
                      {action.description}
                    </Paragraph>
                    <Button
                      type={action.type || 'default'}
                      disabled={action.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!action.disabled) {
                          action.action();
                        }
                      }}
                    >
                      {action.disabled ? '需要连接' : '开始使用'}
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="暂无快速操作" />
        )}
      </Card>

      {/* 连接状态概览 */}
      <Card title="连接状态" className="w-full">
        {connections.length > 0 ? (
          <div className="space-y-4">
            {connections.map((connection) => {
              const status = connectionStatuses[connection.id!];
              const statusColor = {
                connected: '#52c41a',
                connecting: '#faad14',
                disconnected: '#ff4d4f',
                error: '#ff4d4f',
              }[status?.status || 'disconnected'];

              const statusText = {
                connected: '已连接',
                connecting: '连接中',
                disconnected: '已断开',
                error: '连接错误',
              }[status?.status || 'disconnected'];

              return (
                <div
                  key={connection.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <Space>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    <div>
                      <div className="font-medium">{connection.name}</div>
                      <div className="text-sm text-gray-500">
                        {connection.host}:{connection.port}
                      </div>
                    </div>
                  </Space>
                  
                  <Space>
                    <span
                      className="text-sm"
                      style={{ color: statusColor }}
                    >
                      {statusText}
                    </span>
                    {status?.latency && (
                      <span className="text-sm text-gray-500">
                        {status.latency}ms
                      </span>
                    )}
                  </Space>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            description="暂无连接配置"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/connections')}
            >
              创建连接
            </Button>
          </Empty>
        )}
      </Card>

      {/* 性能监控 */}
      <PerformanceMonitor />
    </div>
  );
};

export default Dashboard;
