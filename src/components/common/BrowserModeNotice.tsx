import React from 'react';
import { Alert, Card, Typography, Button, Space, Divider } from 'antd';
import { 
  InfoCircleOutlined, 
  RocketOutlined, 
  CodeOutlined,
  GlobalOutlined,
  DesktopOutlined 
} from '@ant-design/icons';
import { isBrowserEnvironment } from '@/utils/tauri';

const { Title, Text, Paragraph } = Typography;

const BrowserModeNotice: React.FC = () => {
  if (!isBrowserEnvironment()) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <GlobalOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2}>🌐 浏览器开发模式</Title>
          <Text type="secondary" style={{ fontSize: '16px' }}>
            当前在浏览器中运行 InfloWave，正在使用模拟数据进行演示
          </Text>
        </div>

        <Alert
          message="开发模式说明"
          description="在浏览器中，Tauri API 不可用，应用将使用模拟数据来展示界面和功能。这是正常的开发行为。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <div style={{ marginBottom: '24px' }}>
          <Title level={4}>🚀 体验完整功能</Title>
          <Paragraph>
            要体验 InfloWave 的完整功能，请使用以下命令启动 Tauri 应用：
          </Paragraph>
          
          <Card size="small" style={{ backgroundColor: '#f6f8fa', marginBottom: '16px' }}>
            <Text code style={{ fontSize: '14px' }}>npm run tauri:dev</Text>
          </Card>
          
          <Text type="secondary">
            或者构建生产版本：
          </Text>
          <Card size="small" style={{ backgroundColor: '#f6f8fa', marginTop: '8px' }}>
            <Text code style={{ fontSize: '14px' }}>npm run tauri:build</Text>
          </Card>
        </div>

        <Divider />

        <div style={{ marginBottom: '24px' }}>
          <Title level={4}>📋 当前可用功能</Title>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>✅ 界面展示</Text>
              <br />
              <Text type="secondary">所有页面和组件的界面展示</Text>
            </div>
            <div>
              <Text strong>✅ 模拟数据</Text>
              <br />
              <Text type="secondary">使用预设的模拟数据展示功能</Text>
            </div>
            <div>
              <Text strong>✅ 交互体验</Text>
              <br />
              <Text type="secondary">按钮点击、表单填写等交互功能</Text>
            </div>
            <div>
              <Text strong>❌ 真实数据库连接</Text>
              <br />
              <Text type="secondary">无法连接到真实的 InfluxDB 实例</Text>
            </div>
            <div>
              <Text strong>❌ 文件系统操作</Text>
              <br />
              <Text type="secondary">无法进行文件导入导出等操作</Text>
            </div>
            <div>
              <Text strong>❌ 系统通知</Text>
              <br />
              <Text type="secondary">无法发送系统级通知</Text>
            </div>
          </Space>
        </div>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button 
              type="primary" 
              icon={<DesktopOutlined />}
              size="large"
              onClick={() => {
                window.open('https://tauri.app/v1/guides/getting-started/setup/', '_blank');
              }}
            >
              了解 Tauri
            </Button>
            <Button 
              icon={<CodeOutlined />}
              size="large"
              onClick={() => {
                window.open('https://github.com/your-username/inflowave', '_blank');
              }}
            >
              查看源码
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default BrowserModeNotice;
