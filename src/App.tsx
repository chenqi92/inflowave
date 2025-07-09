import React, { useEffect, useState } from 'react';
import { Layout, Menu, Typography, message, Spin, Button } from 'antd';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DatabaseOutlined,
  SearchOutlined,
  ApiOutlined,
  SettingOutlined,
  DashboardOutlined,
  EditOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { safeTauriInvoke, initializeEnvironment, isBrowserEnvironment } from './utils/tauri';
import { showMessage } from './utils/message';
import GlobalSearch from './components/common/GlobalSearch';
import BrowserModeNotice from './components/common/BrowserModeNotice';

// 页面组件
import ConnectionsPage from './pages/Connections';
import DatabasePage from './pages/Database';
import QueryPage from './pages/Query';
import DashboardPage from './pages/Dashboard';
import DataWritePage from './pages/DataWrite';
import VisualizationPage from './pages/Visualization';
import PerformancePage from './pages/Performance';
import ExtensionsPage from './pages/Extensions';
import SettingsPage from './pages/Settings';
import DataGripLayout from './components/layout/DataGripLayout';

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
    key: '/performance',
    icon: <ThunderboltOutlined />,
    label: <Link to="/performance">性能监控</Link>,
  },
  {
    key: '/extensions',
    icon: <AppstoreOutlined />,
    label: <Link to="/extensions">扩展管理</Link>,
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
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P 打开全局搜索
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setGlobalSearchVisible(true);
      }
      // Ctrl+B 切换侧边栏
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setCollapsed(!collapsed);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 头部 */}
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <div className="flex items-center justify-between h-full">
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            InfloWave
          </Title>
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={<SearchOutlined />}
              onClick={() => setGlobalSearchVisible(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              搜索 (Ctrl+Shift+P)
            </Button>
            <Text type="secondary">
              现代化的时序数据库管理工具
            </Text>
          </div>
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
              <Route path="/" element={
                isBrowserEnvironment() ? <BrowserModeNotice /> : <DashboardPage />
              } />
              <Route path="/connections" element={<ConnectionsPage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/query" element={<DataGripLayout />} />
              <Route path="/visualization" element={<VisualizationPage />} />
              <Route path="/data-write" element={<DataWritePage />} />
              <Route path="/performance" element={<PerformancePage />} />
              <Route path="/extensions" element={<ExtensionsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>

      {/* 全局搜索 */}
      <GlobalSearch
        visible={globalSearchVisible}
        onClose={() => setGlobalSearchVisible(false)}
        onNavigate={(path, params) => {
          navigate(path, { state: params });
        }}
        onExecuteQuery={(query) => {
          navigate('/query', { state: { query } });
        }}
      />
    </Layout>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('InfloWave 启动中...');

        // 初始化环境检测
        initializeEnvironment();

        // 尝试获取应用配置信息
        try {
          await safeTauriInvoke('get_app_config');
          console.log('应用配置加载成功');
        } catch (configError) {
          console.warn('应用配置加载失败，使用默认配置:', configError);
        }

        // 尝试初始化连接服务
        try {
          await safeTauriInvoke('initialize_connections');
          console.log('连接服务初始化成功');
        } catch (connError) {
          console.warn('连接服务初始化失败:', connError);
        }

        showMessage.success('应用启动成功');
      } catch (error) {
        console.error('应用初始化失败:', error);
        // 不显示错误消息，允许应用继续运行
        console.warn('应用将以降级模式运行');
      } finally {
        setLoading(false);
      }
    };

    // 延迟初始化，确保UI先渲染
    const timer = setTimeout(initApp, 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Spin size="large" />
            <div className="mt-4">
              <Text style={{ fontSize: '16px', color: '#666' }}>
                正在启动 InfloWave...
              </Text>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return <MainLayout />;
};

export default App;
