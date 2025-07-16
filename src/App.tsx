import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import '@/styles/datagrip.css';

// 错误处理
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { errorLogger } from '@/utils/errorLogger';

import { safeTauriInvoke, initializeEnvironment } from './utils/tauri';
import { showMessage } from './utils/message';
import GlobalSearch from './components/common/GlobalSearch';
import UserGuideModal from './components/common/UserGuideModal';
import { useNoticeStore } from './store/notice';

// 页面组件
import ConnectionDebug from './components/debug/ConnectionDebug';
import UserGuideTest from './components/test/UserGuideTest';
import DataGripStyleLayout from './components/layout/DataGripStyleLayout';
import NativeMenuHandler from './components/layout/NativeMenuHandler';

// UI 组件导入
import { Text, Spin, Layout, Content, Toaster } from '@/components/ui';
import { ModalAdapter } from '@/utils/modalAdapter';

// 主布局组件
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false);
  const [userGuideVisible, setUserGuideVisible] = useState(false);
  const { browserModeNoticeDismissed } = useNoticeStore();

  // 检查是否显示用户指引
  useEffect(() => {
    if (!browserModeNoticeDismissed) {
      // 延迟显示弹框，确保应用完全加载
      const timer = setTimeout(() => {
        setUserGuideVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [browserModeNoticeDismissed]);

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

  // 检查是否为需要特殊处理的页面（调试页面等）
  const isSpecialPage = [
    '/debug',
    '/typography-test',
    '/ui-test',
    '/user-guide-test',
  ].includes(location.pathname);

  if (isSpecialPage) {
    return (
      <Layout className='min-h-screen bg-background'>
        {/* 应用工具栏 */}

        {/* 主内容区 */}
        <Content className='flex-1 p-4'>
          <Routes>
            <Route path='/debug' element={<ConnectionDebug />} />
            <Route path='/user-guide-test' element={<UserGuideTest />} />
          </Routes>
        </Content>

        {/* 全局搜索 */}
        <GlobalSearch
          isOpen={globalSearchVisible}
          onClose={() => setGlobalSearchVisible(false)}
          onNavigate={(path, params) => {
            navigate(path, { state: params });
          }}
          onExecuteQuery={query => {
            navigate('/query', { state: { query } });
          }}
        />
      </Layout>
    );
  }

  // 对于主要的数据库工作区页面，使用DataGrip风格布局
  return (
    <>
      {/* 全局菜单处理器 - 确保在所有页面都能处理菜单事件 */}
      <NativeMenuHandler onGlobalSearch={() => setGlobalSearchVisible(true)} />

      <Routes>
        <Route path='/' element={<DataGripStyleLayout />} />
        <Route path='/dashboard' element={<DataGripStyleLayout />} />
        <Route path='/database' element={<DataGripStyleLayout />} />
        <Route path='/query' element={<DataGripStyleLayout />} />
        <Route path='/datagrip' element={<DataGripStyleLayout />} />
        <Route path='/visualization' element={<DataGripStyleLayout />} />
        <Route path='/data-write' element={<DataGripStyleLayout />} />
        <Route path='/write' element={<DataGripStyleLayout />} />
        <Route path='/performance' element={<DataGripStyleLayout />} />
        <Route path='/extensions' element={<DataGripStyleLayout />} />
        <Route path='/dev-tools' element={<DataGripStyleLayout />} />

        {/* 连接管理页面 */}
        <Route path='/connections' element={<DataGripStyleLayout />} />
      </Routes>

      {/* 用户指引弹框 */}
      <UserGuideModal
        isOpen={userGuideVisible}
        onClose={() => setUserGuideVisible(false)}
      />
    </>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // 初始化应用
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('InfloWave 启动中...');

        // 初始化错误日志系统
        console.log('初始化错误日志系统...');

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
        // 记录到错误日志系统
        await errorLogger.logCustomError('应用初始化失败', {
          error: error?.toString(),
          stack: (error as Error)?.stack,
        });
        // 不显示错误消息，允许应用继续运行
        console.warn('应用将以降级模式运行');
      } finally {
        setLoading(false);

        // 在开发模式下加载测试工具
        if ((import.meta as any).env?.DEV) {
          try {
            // 加载主测试工具
            import('./utils/masterTestRunner').then(
              ({ masterTestRunner: _testRunner }) => {
                console.log('🧪 测试工具已加载');
                console.log('使用以下命令运行测试:');
                console.log('- runCompleteTests() // 运行完整测试套件');
                console.log('- quickHealthCheck() // 快速健康检查');
                console.log('- runUITests() // 运行UI测试');
                console.log('- runFeatureTests() // 运行功能测试');
              }
            );
          } catch (error) {
            console.warn('测试工具加载失败:', error);
          }
        }
      }
    };

    // 延迟初始化，确保UI先渲染
    const timer = setTimeout(initApp, 100);
    return () => {
      clearTimeout(timer);
      // 应用卸载时清理错误日志器
      errorLogger.cleanup();
    };
  }, []);

  if (loading) {
    return (
      <div className='min-h-screen bg-muted/20 flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <Spin size='large' />
          <Text className='text-base text-muted-foreground'>
            正在启动 InfloWave...
          </Text>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <MainLayout />
      <ModalAdapter />
      <Toaster />
    </ErrorBoundary>
  );
};

export default App;
