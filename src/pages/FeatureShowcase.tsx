import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Alert, Statistic } from '@/components/ui';
// TODO: Replace these Ant Design components: Timeline, Collapse, Progress, List, Avatar, Badge, 
import { CheckCircleOutlined, DatabaseOutlined, LineChartOutlined, SettingOutlined } from '@/components/ui';
// TODO: Replace these icons: RocketOutlined, StarOutlined, ThunderboltOutlined, ImportOutlined, MonitorOutlined, AppstoreOutlined
// You may need to find alternatives or create custom icons
import { featureTester } from '../utils/featureTest';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const FeatureShowcase: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  // 运行功能测试
  const runTests = async () => {
    setTesting(true);
    try {
      const results = await featureTester.runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('测试运行失败:', error);
    } finally {
      setTesting(false);
    }
  };

  // 功能特性数据
  const features = [
    {
      category: '核心查询功能',
      icon: <DatabaseOutlined />,
      color: '#1890ff',
      items: [
        {
          name: '高级查询编辑器',
          description: 'InfluxQL 语法高亮、自动补全、查询模板',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '查询历史管理',
          description: '搜索、过滤、分类管理历史查询',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '保存的查询',
          description: '查询收藏、标签分类、快速执行',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '多标签查询',
          description: '同时打开多个查询标签页',
          status: 'completed',
          version: '2.0.0',
        },
      ],
    },
    {
      category: '数据可视化',
      icon: <LineChartOutlined />,
      color: '#52c41a',
      items: [
        {
          name: '高级图表组件',
          description: '多种图表类型、交互式配置、实时更新',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '仪表板设计器',
          description: '拖拽式布局、响应式设计、小部件管理',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '数据导出',
          description: '多格式导出（CSV、JSON、Excel）',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '图表主题',
          description: '多种颜色方案、自定义样式',
          status: 'completed',
          version: '2.0.0',
        },
      ],
    },
    {
      category: '实时监控',
      icon: <MonitorOutlined />,
      color: '#fa8c16',
      items: [
        {
          name: '实时数据监控',
          description: '自动刷新、告警规则、通知系统',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '性能分析',
          description: '慢查询分析、系统资源监控',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '连接健康检查',
          description: '连接状态监控、自动重连',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '告警管理',
          description: '自定义告警规则、多级别通知',
          status: 'completed',
          version: '2.0.0',
        },
      ],
    },
    {
      category: '数据管理',
      icon: <ImportOutlined />,
      color: '#722ed1',
      items: [
        {
          name: '数据导入向导',
          description: '多格式支持、字段映射、批量处理',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '保留策略管理',
          description: '策略创建、编辑、删除',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '存储分析',
          description: '存储使用情况、压缩比分析',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '数据库管理',
          description: '数据库创建、删除、配置',
          status: 'completed',
          version: '2.0.0',
        },
      ],
    },
    {
      category: '用户体验',
      icon: <SettingOutlined />,
      color: '#eb2f96',
      items: [
        {
          name: '快捷键系统',
          description: '自定义快捷键、键盘导航',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '个性化设置',
          description: '主题、布局、通知偏好',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '无障碍支持',
          description: '高对比度、屏幕阅读器支持',
          status: 'completed',
          version: '2.0.0',
        },
        {
          name: '全局搜索',
          description: '跨功能搜索、快速导航',
          status: 'completed',
          version: '2.0.0',
        },
      ],
    },
    {
      category: '扩展功能',
      icon: <AppstoreOutlined />,
      color: '#13c2c2',
      items: [
        {
          name: '插件系统',
          description: '插件管理、自定义扩展',
          status: 'planned',
          version: '2.1.0',
        },
        {
          name: 'API 集成',
          description: 'REST API、GraphQL 支持',
          status: 'planned',
          version: '2.1.0',
        },
        {
          name: 'Webhook 支持',
          description: '事件触发、自动化集成',
          status: 'planned',
          version: '2.1.0',
        },
        {
          name: '自动化规则',
          description: '定时任务、条件触发',
          status: 'planned',
          version: '2.1.0',
        },
      ],
    },
  ];

  // 获取状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag color="green" icon={<CheckCircleOutlined />}>已完成</Tag>;
      case 'in-progress':
        return <Tag color="blue" icon={<ThunderboltOutlined />}>开发中</Tag>;
      case 'planned':
        return <Tag color="orange" icon={<StarOutlined />}>计划中</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  // 计算完成度
  const totalFeatures = features.reduce((sum, category) => sum + category.items.length, 0);
  const completedFeatures = features.reduce(
    (sum, category) => sum + category.items.filter(item => item.status === 'completed').length,
    0
  );
  const completionRate = Math.round((completedFeatures / totalFeatures) * 100);

  return (
    <div style={{ padding: '24px' }}>
      {/* 标题和概览 */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Title level={1}>
          <RocketOutlined style={{ marginRight: '12px', color: '#1890ff' }} />
          InfloWave 功能展示
        </Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          全新的 InfluxDB 管理体验，专业级数据库工具的完整功能集
        </Paragraph>
      </div>

      {/* 统计概览 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总功能数"
              value={totalFeatures}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completedFeatures}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="完成度"
              value={completionRate}
              suffix="%"
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={completionRate}
                size={80}
                status={completionRate === 100 ? 'success' : 'active'}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong>项目进度</Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 功能测试 */}
      <Card style={{ marginBottom: '32px' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={3}>功能完整性测试</Title>
          <Paragraph>
            运行自动化测试以验证所有功能的可用性和集成状态
          </Paragraph>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={runTests}
            loading={testing}
            style={{ marginBottom: '16px' }}
          >
            {testing ? '测试运行中...' : '运行功能测试'}
          </Button>
          
          {testResults.length > 0 && (
            <Alert
              message={`测试完成: ${testResults.reduce((sum, suite) => sum + suite.passedTests, 0)} 通过, ${testResults.reduce((sum, suite) => sum + suite.failedTests, 0)} 失败`}
              type={testResults.every(suite => suite.failedTests === 0) ? 'success' : 'warning'}
              style={{ marginTop: '16px' }}
            />
          )}
        </div>
      </Card>

      {/* 功能分类展示 */}
      <Collapse defaultActiveKey={['0']} size="large">
        {features.map((category, categoryIndex) => (
          <Panel
            header={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  icon={category.icon}
                  style={{ backgroundColor: category.color, marginRight: '12px' }}
                />
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {category.category}
                </span>
                <Badge
                  count={category.items.filter(item => item.status === 'completed').length}
                  style={{ marginLeft: '12px' }}
                />
              </div>
            }
            key={categoryIndex.toString()}
          >
            <List
              dataSource={category.items}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    getStatusTag(item.status),
                    <Tag color="blue">{item.version}</Tag>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Text strong>{item.name}</Text>}
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </Panel>
        ))}
      </Collapse>

      {/* 版本路线图 */}
      <Card style={{ marginTop: '32px' }}>
        <Title level={3}>版本路线图</Title>
        <Timeline mode="left">
          <Timeline.Item
            color="green"
            dot={<CheckCircleOutlined style={{ fontSize: '16px' }} />}
          >
            <div>
              <Text strong>v2.0.0 - 核心功能完善</Text>
              <div style={{ marginTop: '8px' }}>
                <Tag color="green">已发布</Tag>
                <Paragraph style={{ marginTop: '8px' }}>
                  完成了查询管理、数据可视化、实时监控、数据管理和用户体验的全面升级
                </Paragraph>
              </div>
            </div>
          </Timeline.Item>
          <Timeline.Item
            color="blue"
            dot={<StarOutlined style={{ fontSize: '16px' }} />}
          >
            <div>
              <Text strong>v2.1.0 - 扩展生态</Text>
              <div style={{ marginTop: '8px' }}>
                <Tag color="blue">计划中</Tag>
                <Paragraph style={{ marginTop: '8px' }}>
                  插件系统、API集成、Webhook支持、自动化规则等扩展功能
                </Paragraph>
              </div>
            </div>
          </Timeline.Item>
          <Timeline.Item
            color="orange"
            dot={<RocketOutlined style={{ fontSize: '16px' }} />}
          >
            <div>
              <Text strong>v2.2.0 - 企业级功能</Text>
              <div style={{ marginTop: '8px' }}>
                <Tag color="orange">规划中</Tag>
                <Paragraph style={{ marginTop: '8px' }}>
                  用户权限管理、审计日志、集群管理、高可用部署等企业级功能
                </Paragraph>
              </div>
            </div>
          </Timeline.Item>
        </Timeline>
      </Card>

      {/* 技术栈 */}
      <Card style={{ marginTop: '32px' }}>
        <Title level={3}>技术栈</Title>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" title="前端技术">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color="blue">React 18</Tag>
                <Tag color="blue">TypeScript</Tag>
                <Tag color="blue">Ant Design</Tag>
                <Tag color="blue">ECharts</Tag>
                <Tag color="blue">React Grid Layout</Tag>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="后端技术">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color="green">Tauri</Tag>
                <Tag color="green">Rust</Tag>
                <Tag color="green">InfluxDB Client</Tag>
                <Tag color="green">Tokio</Tag>
                <Tag color="green">Serde</Tag>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="工具链">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color="orange">Vite</Tag>
                <Tag color="orange">ESLint</Tag>
                <Tag color="orange">Prettier</Tag>
                <Tag color="orange">Cargo</Tag>
                <Tag color="orange">GitHub Actions</Tag>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default FeatureShowcase;
