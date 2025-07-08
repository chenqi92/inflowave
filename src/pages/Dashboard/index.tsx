import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Button, Empty, Alert, Tabs } from 'antd';
import {
  DatabaseOutlined,
  ApiOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  RocketOutlined,
  DashboardOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import DashboardManager from '@/components/dashboard/DashboardManager';
import DataExportDialog from '@/components/common/DataExportDialog';

const { Title, Paragraph } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { connections = [], activeConnectionId, connectionStatuses = {} } = useConnectionStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [exportDialogVisible, setExportDialogVisible] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState<string | null>(null);

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
      action: () => setActiveTab('dashboards'),
      disabled: !activeConnectionId,
    },
    {
      title: '数据导出',
      description: '导出查询结果到文件',
      icon: <DownloadOutlined />,
      action: () => setExportDialogVisible(true),
      disabled: !activeConnectionId,
    },
    {
      title: '仪表板管理',
      description: '管理和创建仪表板',
      icon: <DashboardOutlined />,
      action: () => setActiveTab('dashboards'),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 欢迎信息 */}
      <Alert
        message={
          <Space>
            <RocketOutlined />
            <span>欢迎使用 InfloWave</span>
          </Space>
        }
        description="现代化的时序数据库管理工具，类似 DataGrip 的界面设计，提供连接管理、数据查询、可视化等功能。"
        type="info"
        showIcon={false}
        style={{ marginBottom: 24 }}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="概览" key="overview">
          {/* 页面标题 */}
          <div>
            <Title level={2}>仪表板</Title>
            <Paragraph type="secondary">
              这里是您的数据管理中心，可以快速访问各种功能。
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

      {/* 功能介绍 */}
      <Card title="主要功能" className="w-full">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" hoverable>
              <div className="text-center">
                <ApiOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} />
                <Title level={4}>连接管理</Title>
                <Paragraph type="secondary">
                  管理多个 InfluxDB 连接，支持连接测试、状态监控等功能。
                </Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" hoverable>
              <div className="text-center">
                <SearchOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4}>数据查询</Title>
                <Paragraph type="secondary">
                  强大的 InfluxQL 查询编辑器，支持语法高亮、自动补全等功能。
                </Paragraph>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small" hoverable>
              <div className="text-center">
                <BarChartOutlined style={{ fontSize: 32, color: '#fa8c16', marginBottom: 16 }} />
                <Title level={4}>数据可视化</Title>
                <Paragraph type="secondary">
                  创建各种图表和仪表板，直观展示时序数据。
                </Paragraph>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
        </Tabs.TabPane>

        <Tabs.TabPane tab="仪表板管理" key="dashboards">
          <DashboardManager
            onOpenDashboard={(dashboardId) => {
              setCurrentDashboard(dashboardId);
              // 这里可以导航到仪表板详情页面
              console.log('打开仪表板:', dashboardId);
            }}
          />
        </Tabs.TabPane>
      </Tabs>

      {/* 数据导出对话框 */}
      <DataExportDialog
        visible={exportDialogVisible}
        onClose={() => setExportDialogVisible(false)}
        connections={connections}
        currentConnection={activeConnectionId}
        onSuccess={(result) => {
          console.log('导出成功:', result);
        }}
      />
    </div>
  );
};

export default Dashboard;
