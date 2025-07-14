import React, { useState } from 'react';
import { Row, Col, Statistic, Button, Empty, Alert, AlertTitle, AlertDescription, Tabs } from '@/components/ui';
import { Sheet, SheetContent, SheetHeader, SheetTitle, Separator, Space } from '@/components/ui';
import { Database, BarChart, Plus, Search, Download, RefreshCw, LayoutDashboard, Webhook, Clock, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import DashboardManager from '@/components/dashboard/DashboardManager';
import DataExportDialog from '@/components/common/DataExportDialog';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import TypographyDemo from '@/components/common/TypographyDemo';

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
    totalQueries: 0};

  // 快速操作
  const quickActions = [
    {
      title: '新建连接',
      description: '添加新的 InfluxDB 连接',
      icon: <Plus className="w-4 h-4"  />,
      action: () => navigate('/connections'),
      type: 'primary' as const},
    {
      title: '执行查询',
      description: '查询和分析数据',
      icon: <Search className="w-4 h-4"  />,
      action: () => navigate('/query'),
      disabled: !activeConnectionId},
    {
      title: '数据可视化',
      description: '创建图表和仪表板',
      icon: <BarChart className="w-4 h-4"  />,
      action: () => setActiveTab('dashboards'),
      disabled: !activeConnectionId},
    {
      title: '数据导出',
      description: '导出查询结果到文件',
      icon: <Download className="w-4 h-4"  />,
      action: () => setExportDialogVisible(true),
      disabled: !activeConnectionId},
    {
      title: '仪表板管理',
      description: '管理和创建仪表板',
      icon: <LayoutDashboard />,
      action: () => setActiveTab('dashboards')},
  ];

  // 工具栏
  const toolbar = (
    <Card className="flex gap-2 p-2 border-0 shadow-none bg-transparent">
      <Button
        variant="outline"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新
      </Button>
      <Button
        variant="default"
        onClick={() => navigate('/connections')}
      >
        <Plus className="w-4 h-4 mr-2" />
        新建连接
      </Button>
    </Card>
  );

  return (
    <DesktopPageWrapper
      title="仪表板"
      description="数据管理中心，快速访问各种功能和查看系统状态"
      toolbar={toolbar}
    >
      {/* 欢迎信息 */}
      <Alert className="mb-6">
        <Rocket className="w-4 h-4" />
        <AlertTitle>欢迎使用 InfloWave</AlertTitle>
        <AlertDescription>
          现代化的时序数据库管理工具，提供连接管理、数据查询、可视化等功能。
        </AlertDescription>
      </Alert>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: '概览',
            children: (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="border rounded-lg bg-background">
              <div className="p-6 pb-0">
                <h3 className="text-lg font-semibold">系统概览</h3>
              </div>
              <Separator />
              <div className="p-6">
                <Row gutter={[24, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <div className="text-center p-4 border rounded-lg bg-card">
                      <Statistic
                        title="总连接数"
                        value={stats.totalConnections}
                        prefix={<Database className="w-4 h-4"  />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <div className="text-center p-4 border rounded-lg bg-card">
                      <Statistic
                        title="活跃连接"
                        value={stats.activeConnections}
                        prefix={<Webhook className="w-4 h-4"  />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <div className="text-center p-4 border rounded-lg bg-card">
                      <Statistic
                        title="总查询数"
                        value={stats.totalQueries}
                        prefix={<BarChart className="w-4 h-4"  />}
                        valueStyle={{ color: '#722ed1' }}
                      />
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={6}>
                    <div className="text-center p-4 border rounded-lg bg-card">
                      <Statistic
                        title="最后查询"
                        value={stats.lastQueryTime}
                        prefix={<Clock className="w-4 h-4"  />}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="desktop-panel">
              <div className="desktop-panel-header">
                快速操作
              </div>
              <div className="desktop-panel-content">
                {quickActions.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {quickActions.map((action, index) => (
                      <Col xs={24} sm={12} lg={8} key={index}>
                        <div
                          className="h-full cursor-pointer hover:shadow-md transition-all p-4 text-center space-y-3 border rounded-lg bg-card"
                          onClick={action.disabled ? undefined : action.action}
                          style={{
                            opacity: action.disabled ? 0.6 : 1,
                            cursor: action.disabled ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <div className="text-2xl text-primary-600">
                            {action.icon}
                          </div>
                          <div className="font-medium">
                            {action.title}
                          </div>
                          <div className="text-sm text-muted-foreground mb-4">
                            {action.description}
                          </div>
                          <Button
                            size="sm"
                            variant={action.type === 'primary' ? 'default' : 'outline'}
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
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="暂无快速操作" />
                )}
              </div>
            </div>

            {/* 连接状态概览 */}
            <div className="desktop-panel">
              <div className="desktop-panel-header">
                连接状态
              </div>
              <div className="desktop-panel-content">
                {connections.length > 0 ? (
                  <div className="space-y-3">
                    {connections.map((connection) => {
                      const status = connectionStatuses[connection.id!];
                      const statusColor = {
                        connected: '#52c41a',
                        connecting: '#faad14',
                        disconnected: '#ff4d4f',
                        error: '#ff4d4f'}[status?.status || 'disconnected'];

                      const statusText = {
                        connected: '已连接',
                        connecting: '连接中',
                        disconnected: '已断开',
                        error: '连接错误'}[status?.status || 'disconnected'];

                      return (
                        <div
                          key={connection.id}
                          className="flex items-center justify-between p-3 border rounded hover:bg-muted/50"
                        >
                          <div className="flex gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: statusColor }}
                            />
                            <div>
                              <div className="font-medium text-sm">{connection.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {connection.host}:{connection.port}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <span
                              className="text-xs"
                              style={{ color: statusColor }}
                            >
                              {statusText}
                            </span>
                            {status?.latency && (
                              <span className="text-xs text-muted-foreground">
                                {status.latency}ms
                              </span>
                            )}
                          </div>
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
                      size="small"
                      type="primary"
                      icon={<Plus className="w-4 h-4"  />}
                      onClick={() => navigate('/connections')}
                    >
                      创建连接
                    </Button>
                  </Empty>
                )}
              </div>
            </div>

            {/* 功能介绍 */}
            <div className="desktop-panel">
              <div className="desktop-panel-header">
                主要功能
              </div>
              <div className="desktop-panel-content">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={8}>
                    <div className="text-center hover:shadow-md transition-shadow cursor-pointer p-4 border rounded-lg bg-card">
                      <Webhook className="w-4 h-4" style={{ fontSize: 28, color: '#1890ff', marginBottom: 12 }}  />
                      <div className="font-medium mb-2">连接管理</div>
                      <div className="text-sm text-muted-foreground">
                        管理多个 InfluxDB 连接，支持连接测试、状态监控等功能。
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <div className="text-center hover:shadow-md transition-shadow cursor-pointer p-4 border rounded-lg bg-card">
                      <Search className="w-4 h-4" style={{ fontSize: 28, color: '#52c41a', marginBottom: 12 }}  />
                      <div className="font-medium mb-2">数据查询</div>
                      <div className="text-sm text-muted-foreground">
                        强大的 InfluxQL 查询编辑器，支持语法高亮、自动补全等功能。
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <div className="text-center hover:shadow-md transition-shadow cursor-pointer p-4 border rounded-lg bg-card">
                      <BarChart className="w-4 h-4" style={{ fontSize: 28, color: '#fa8c16', marginBottom: 12 }}  />
                      <div className="font-medium mb-2">数据可视化</div>
                      <div className="text-sm text-muted-foreground">
                        创建各种图表和仪表板，直观展示时序数据。
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Typography 样式测试 */}
            <div className="desktop-panel">
              <div className="desktop-panel-header">
                样式测试
              </div>
              <div className="desktop-panel-content">
                <TypographyDemo />
              </div>
            </div>
          </div>
            )
          },
          {
            key: 'dashboards',
            label: '仪表板管理',
            children: (
          <div className="desktop-panel">
            <div className="desktop-panel-content">
              <DashboardManager
                onOpenDashboard={(dashboardId) => {
                  setCurrentDashboard(dashboardId);
                  // 这里可以导航到仪表板详情页面
                  console.log('打开仪表板:', dashboardId);
                }}
              />
            </div>
          </div>
            )
          }
        ]}
      />

      {/* 数据导出对话框 */}
      <DataExportDialog
        open={exportDialogVisible}
        onClose={() => setExportDialogVisible(false)}
        connections={connections}
        currentConnection={activeConnectionId}
        onSuccess={(result) => {
          console.log('导出成功:', result);
        }}
      />
    </DesktopPageWrapper>
  );
};

export default Dashboard;
