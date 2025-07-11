import React, { useEffect, useState } from 'react';
import { ConfigProvider } from 'antd';
import { Layout, Typography, Spin } from '@/components/ui';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { antdTheme } from '@/styles/antd-theme';

import { safeTauriInvoke, initializeEnvironment, isBrowserEnvironment } from './utils/tauri';
import { showMessage } from './utils/message';
import GlobalSearch from './components/common/GlobalSearch';
import BrowserModeNotice from './components/common/BrowserModeNotice';
import AppToolbar from './components/layout/AppToolbar';
import AppStatusBar from './components/layout/AppStatusBar';
import NativeMenuHandler from './components/layout/NativeMenuHandler';

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
import ConnectionDebug from './components/debug/ConnectionDebug';
import TypographyTest from './components/test/TypographyTest';
import UITest from './pages/UITest';
import TestButton from './components/test/TestButton';

// Layout 组件直接导入
import { Content } from '@/components/ui';
const { Text } = Typography;

// 主布局组件
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [statusbarVisible, setStatusbarVisible] = useState(true);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P 打开全局搜索
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setGlobalSearchVisible(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Layout className="desktop-layout">
      {/* 原生菜单处理器 */}
      <NativeMenuHandler
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        onToggleStatusbar={() => setStatusbarVisible(!statusbarVisible)}
        onGlobalSearch={() => setGlobalSearchVisible(true)}
      />

      {/* 应用工具栏 */}
      <AppToolbar />

      {/* 主内容区 */}
      <Content className="desktop-content">
        <Routes>
          <Route path="/" element={
            isBrowserEnvironment() ? <BrowserModeNotice /> : <DashboardPage />
          } />
          <Route path="/dashboard" element={
            isBrowserEnvironment() ? <BrowserModeNotice /> : <DashboardPage />
          } />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/query" element={<QueryPage />} />
          <Route path="/datagrip" element={<DataGripLayout />} />
          <Route path="/visualization" element={<VisualizationPage />} />
          <Route path="/data-write" element={<DataWritePage />} />
          <Route path="/write" element={<DataWritePage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/extensions" element={<ExtensionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/debug" element={<ConnectionDebug />} />
          <Route path="/typography-test" element={<TypographyTest />} />
          <Route path="/ui-test" element={<UITest />} />
        </Routes>
      </Content>

      {/* 底部状态栏 */}
      {statusbarVisible && <AppStatusBar />}

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
      
      {/* 测试按钮 - 仅在开发环境显示 */}
      {(import.meta as any).env?.DEV && <TestButton />}
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
        
        // 在开发模式下加载测试工具
        if ((import.meta as any).env?.DEV) {
          try {
            import('./utils/masterTestRunner').then(({ masterTestRunner: _testRunner }) => {
              console.log('🧪 测试工具已加载');
              console.log('使用以下命令运行测试:');
              console.log('- runCompleteTests() // 运行完整测试套件');
              console.log('- quickHealthCheck() // 快速健康检查');
              console.log('- runUITests() // 运行UI测试');
              console.log('- runFeatureTests() // 运行功能测试');
            });
          } catch (error) {
            console.warn('测试工具加载失败:', error);
          }
        }
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
            <Spin size="lg" />
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

  return (
    <ConfigProvider theme={antdTheme}>
      <MainLayout />
    </ConfigProvider>
  );
};

export default App;
