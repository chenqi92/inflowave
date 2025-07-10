import React from 'react';
import { Alert, Card, Typography, Button, Space } from '@/components/ui';
// TODO: Replace these Ant Design components: Divider
import { InfoCircleOutlined } from '@/components/ui';
// TODO: Replace these icons: CodeOutlined, GlobalOutlined, DesktopOutlined
// You may need to find alternatives or create custom icons
import { isBrowserEnvironment } from '@/utils/tauri';

const { Title, Text, Paragraph } = Typography;

const BrowserModeNotice: React.FC = () => {
  if (!isBrowserEnvironment()) {
    return null;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <GlobalOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <Title level={2}>🌐 InfloWave 功能预览</Title>
          <Text type="secondary" style={{ fontSize: '16px', lineHeight: '1.6' }}>
            欢迎体验 InfloWave 的界面和功能演示！<br />
            当前运行在浏览器预览模式，使用模拟数据展示应用特性
          </Text>
        </div>

        <Alert
          message="预览模式说明"
          description="您正在体验 InfloWave 的功能预览版本。完整的数据库连接、文件操作等功能需要在桌面应用中使用。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: '32px' }}
        />

        <div style={{ marginBottom: '32px' }}>
          <Title level={4}>🚀 获取完整版本</Title>
          <Paragraph style={{ marginBottom: '16px' }}>
            要体验 InfloWave 的完整功能，包括真实数据库连接和文件操作，请下载桌面应用版本：
          </Paragraph>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>开发者模式：</Text>
            <Card size="small" style={{ backgroundColor: '#ffffff', marginBottom: '8px' }}>
              <Text code style={{ fontSize: '14px' }}>npm run tauri:dev</Text>
            </Card>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              适用于开发和测试，支持热更新
            </Text>
          </div>

          <div style={{
            background: '#f6f8fa',
            border: '1px solid #d1d9e0',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>生产版本：</Text>
            <Card size="small" style={{ backgroundColor: '#ffffff', marginBottom: '8px' }}>
              <Text code style={{ fontSize: '14px' }}>npm run tauri:build</Text>
            </Card>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              构建优化的安装包，适用于日常使用
            </Text>
          </div>
        </div>

        <Divider />

        {/* 可用功能 */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={4}>✨ 当前可用功能</Title>
          <div style={{
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px' }}>完整界面展示</Text>
                  <br />
                  <Text type="secondary">所有页面、组件和交互元素的完整展示</Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px' }}>模拟数据演示</Text>
                  <br />
                  <Text type="secondary">使用预设的示例数据展示各项功能特性</Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#52c41a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px' }}>交互体验测试</Text>
                  <br />
                  <Text type="secondary">按钮点击、表单填写、菜单导航等交互功能</Text>
                </div>
              </div>
            </Space>
          </div>
        </div>

        {/* 已知限制 */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={4}>⚠️ 已知限制</Title>
          <Paragraph style={{ marginBottom: '16px', color: '#666' }}>
            以下功能需要在桌面应用环境中才能正常使用，这些是计划中的核心特性：
          </Paragraph>
          <div style={{
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>!</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px', color: '#d46b08' }}>真实数据库连接</Text>
                  <br />
                  <Text type="secondary">
                    无法连接到真实的 InfluxDB 实例进行数据查询和管理操作
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>!</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px', color: '#d46b08' }}>文件系统操作</Text>
                  <br />
                  <Text type="secondary">
                    无法进行文件导入导出、配置保存等本地文件系统操作
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#fa8c16',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>!</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px', color: '#d46b08' }}>系统通知</Text>
                  <br />
                  <Text type="secondary">
                    无法发送桌面通知和系统级提醒消息
                  </Text>
                </div>
              </div>
            </Space>
          </div>
        </div>

        {/* 即将推出 */}
        <div style={{ marginBottom: '32px' }}>
          <Title level={4}>🚀 即将推出</Title>
          <Paragraph style={{ marginBottom: '16px', color: '#666' }}>
            这些核心功能将在桌面应用版本中完全实现，为您提供专业级的数据库管理体验：
          </Paragraph>
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #91d5ff',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#1890ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>🔗</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px', color: '#0958d9' }}>多实例连接管理</Text>
                  <br />
                  <Text type="secondary">
                    支持同时连接多个 InfluxDB 实例，实时状态监控和连接池管理
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#1890ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>📁</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px', color: '#0958d9' }}>高效数据导入导出</Text>
                  <br />
                  <Text type="secondary">
                    支持 CSV、JSON、Parquet 等多种格式的批量数据导入导出功能
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  background: '#1890ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>🔔</span>
                </div>
                <div>
                  <Text strong style={{ fontSize: '15px', color: '#0958d9' }}>智能通知系统</Text>
                  <br />
                  <Text type="secondary">
                    查询完成、连接状态变化、系统告警等事件的桌面通知提醒
                  </Text>
                </div>
              </div>
            </Space>
          </div>
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
                window.open('https://github.com/chenqi92/inflowave', '_blank');
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
