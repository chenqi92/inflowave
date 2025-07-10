import React from 'react';
import { Modal, Typography, Space, Row, Col, Card, Tag } from '@/components/ui';
// TODO: Replace these Ant Design components: Divider
import { DatabaseOutlined, InfoCircleOutlined } from '@/components/ui';
// TODO: Replace these icons: GithubOutlined, BugOutlined, HeartOutlined, RocketOutlined, TeamOutlined, ToolOutlined
// You may need to find alternatives or create custom icons

const { Title, Text, Paragraph, Link } = Typography;

interface AboutDialogProps {
  visible: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ visible, onClose }) => {
  const appInfo = {
    name: 'InfloWave',
    version: '1.0.4',
    description: '现代化的 InfluxDB 数据库管理工具',
    author: 'InfloWave Team',
    license: 'MIT',
    repository: 'https://github.com/your-org/inflowave',
    website: 'https://inflowave.com',
  };

  const features = [
    '直观的数据库连接管理',
    '强大的查询编辑器',
    '实时数据可视化',
    '性能监控和分析',
    '数据导入导出',
    '多主题支持',
    '跨平台兼容',
  ];

  const techStack = [
    { name: 'Tauri', color: 'blue' },
    { name: 'React', color: 'cyan' },
    { name: 'TypeScript', color: 'geekblue' },
    { name: 'Ant Design', color: 'purple' },
    { name: 'Rust', color: 'orange' },
    { name: 'InfluxDB', color: 'green' },
  ];

  return (
    <Modal
      title={
        <Space>
          <DatabaseOutlined style={{ color: '#1890ff' }} />
          <span>关于 {appInfo.name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      style={{ top: 20 }}
    >
      <div style={{ padding: '16px 0' }}>
        {/* 应用信息 */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <DatabaseOutlined 
                  style={{ 
                    fontSize: 64, 
                    color: '#1890ff',
                    marginBottom: 16 
                  }} 
                />
                <Title level={2} style={{ margin: 0 }}>
                  {appInfo.name}
                </Title>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  版本 {appInfo.version}
                </Text>
              </div>
              
              <Paragraph style={{ textAlign: 'center', fontSize: 16 }}>
                {appInfo.description}
              </Paragraph>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* 主要功能 */}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <RocketOutlined />
                  <span>主要功能</span>
                </Space>
              }
              size="small"
            >
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {features.map((feature, index) => (
                  <li key={index} style={{ marginBottom: 8 }}>
                    <Text>{feature}</Text>
                  </li>
                ))}
              </ul>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card 
              title={
                <Space>
                  <ToolOutlined />
                  <span>技术栈</span>
                </Space>
              }
              size="small"
            >
              <Space wrap>
                {techStack.map((tech) => (
                  <Tag key={tech.name} color={tech.color}>
                    {tech.name}
                  </Tag>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* 项目信息 */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <InfoCircleOutlined />
                  <span>项目信息</span>
                </Space>
              }
              size="small"
            >
              <Row gutter={[16, 8]}>
                <Col span={6}>
                  <Text strong>开发团队:</Text>
                </Col>
                <Col span={18}>
                  <Space>
                    <TeamOutlined />
                    <Text>{appInfo.author}</Text>
                  </Space>
                </Col>
                
                <Col span={6}>
                  <Text strong>开源许可:</Text>
                </Col>
                <Col span={18}>
                  <Tag color="green">{appInfo.license}</Tag>
                </Col>
                
                <Col span={6}>
                  <Text strong>项目地址:</Text>
                </Col>
                <Col span={18}>
                  <Link href={appInfo.repository} target="_blank">
                    <Space>
                      <GithubOutlined />
                      <span>GitHub 仓库</span>
                    </Space>
                  </Link>
                </Col>
                
                <Col span={6}>
                  <Text strong>官方网站:</Text>
                </Col>
                <Col span={18}>
                  <Link href={appInfo.website} target="_blank">
                    {appInfo.website}
                  </Link>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* 支持信息 */}
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size="small">
                  <Space>
                    <HeartOutlined style={{ color: '#ff4d4f' }} />
                    <Text>感谢您使用 {appInfo.name}！</Text>
                  </Space>
                  
                  <Text type="secondary">
                    如果您遇到问题或有建议，请通过以下方式联系我们：
                  </Text>
                  
                  <Space>
                    <Link href={`${appInfo.repository}/issues`} target="_blank">
                      <Space>
                        <BugOutlined />
                        <span>报告问题</span>
                      </Space>
                    </Link>
                    
                    <Divider type="vertical" />
                    
                    <Link href={`${appInfo.repository}/discussions`} target="_blank">
                      <Space>
                        <TeamOutlined />
                        <span>社区讨论</span>
                      </Space>
                    </Link>
                  </Space>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 版权信息 */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            © 2024 {appInfo.author}. All rights reserved.
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default AboutDialog;
