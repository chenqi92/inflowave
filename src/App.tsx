import React, { useEffect, useState } from 'react';
import { Layout, Card, Typography, Button, message } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import ConnectionTest from './components/ConnectionTest';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

const App: React.FC = () => {
  const [appInfo, setAppInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('InfluxDB GUI Manager 启动');

        // 获取应用配置信息
        const config = await invoke('get_app_config');
        setAppInfo(config);

        message.success('应用初始化成功');
      } catch (error) {
        console.error('应用初始化失败:', error);
        message.error(`应用初始化失败: ${error}`);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            </div>
            <Text>正在初始化应用...</Text>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 头部 */}
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <div className="flex items-center justify-between h-full">
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            InfluxDB GUI Manager
          </Title>
          {appInfo && (
            <Text type="secondary">
              v{appInfo.version}
            </Text>
          )}
        </div>
      </Header>

      {/* 主内容区 */}
      <Content style={{ padding: '24px' }}>
        <div className="max-w-6xl mx-auto">
          {/* 欢迎信息 */}
          <Card className="mb-6">
            <div className="text-center py-8">
              <Title level={2}>欢迎使用 InfluxDB GUI Manager</Title>
              <Text className="text-lg text-gray-600">
                一个现代化的 InfluxDB 数据库管理工具
              </Text>
              {appInfo && (
                <div className="mt-4 space-y-2">
                  <div>
                    <Text strong>版本: </Text>
                    <Text>{appInfo.version}</Text>
                  </div>
                  <div>
                    <Text strong>功能特性: </Text>
                    <Text>
                      {Object.entries(appInfo.features || {})
                        .filter(([_, enabled]) => enabled)
                        .map(([feature, _]) => feature)
                        .join(', ')}
                    </Text>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 连接测试组件 */}
          <ConnectionTest />
        </div>
      </Content>
    </Layout>
  );
};

export default App;
