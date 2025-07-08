import React, { useEffect, useState } from 'react';
import { Layout, Menu, Typography, message } from 'antd';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  DatabaseOutlined,
  SearchOutlined,
  ApiOutlined,
  SettingOutlined,
  DashboardOutlined,
  EditOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';

// 页面组件
import ConnectionsPage from './pages/Connections';
import DatabasePage from './pages/Database';
import QueryPage from './pages/Query';
import DashboardPage from './pages/Dashboard';
import DataWritePage from './pages/DataWrite';
import VisualizationPage from './pages/Visualization';
import SettingsPage from './pages/Settings';

const { Content, Header, Sider } = Layout;
const { Title, Text } = Typography;

// 菜单项配置
const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: <Link to="/">仪表板</Link>,
  },
  {
    key: '/connections',
    icon: <ApiOutlined />,
    label: <Link to="/connections">连接管理</Link>,
  },
  {
    key: '/database',
    icon: <DatabaseOutlined />,
    label: <Link to="/database">数据库管理</Link>,
  },
  {
    key: '/query',
    icon: <SearchOutlined />,
    label: <Link to="/query">数据查询</Link>,
  },
  {
    key: '/visualization',
    icon: <BarChartOutlined />,
    label: <Link to="/visualization">数据可视化</Link>,
  },
  {
    key: '/data-write',
    icon: <EditOutlined />,
    label: <Link to="/data-write">数据写入</Link>,
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: <Link to="/settings">设置</Link>,
  },
];

// 主布局组件
const MainLayout: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 头部 */}
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <div className="flex items-center justify-between h-full">
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            InfloWave
          </Title>
          <Text type="secondary">
            现代化的时序数据库管理工具
          </Text>
        </div>
      </Header>

      <Layout>
        {/* 侧边栏 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{ background: '#fff' }}
          width={200}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>

        {/* 主内容区 */}
        <Layout style={{ padding: '0' }}>
          <Content style={{ background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/query" element={<QueryPage />} />
              <Route path="/visualization" element={<VisualizationPage />} />
              <Route path="/data-write" element={<DataWritePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('InfluxDB GUI Manager 启动');

        // 获取应用配置信息
        await invoke('get_app_config');

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
    <Router>
      <MainLayout />
    </Router>
  );
};

export default App;
