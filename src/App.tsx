import React, { useEffect } from 'react';
import { Layout, Spin } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from '@store/app';
import { useConnectionStore } from '@store/connection';

// 组件导入
import AppHeader from '@components/layout/AppHeader';
import AppSidebar from '@components/layout/AppSidebar';
import AppFooter from '@components/layout/AppFooter';

// 页面导入 (懒加载)
const Dashboard = React.lazy(() => import('@pages/Dashboard'));
const Connections = React.lazy(() => import('@pages/Connections'));
const Query = React.lazy(() => import('@pages/Query'));
const Database = React.lazy(() => import('@pages/Database'));
const Visualization = React.lazy(() => import('@pages/Visualization'));
const DataWrite = React.lazy(() => import('@pages/DataWrite'));
const Settings = React.lazy(() => import('@pages/Settings'));

const { Content } = Layout;

const App: React.FC = () => {
  const { loading, sidebarCollapsed } = useAppStore();
  const { activeConnectionId } = useConnectionStore();

  // 初始化应用
  useEffect(() => {
    // 这里可以添加应用初始化逻辑
    // 比如检查 Tauri 环境、加载配置等
    console.log('InfluxDB GUI Manager 启动');
  }, []);

  return (
    <Layout className="app-layout">
      {/* 头部 */}
      <AppHeader />
      
      <Layout>
        {/* 侧边栏 */}
        <AppSidebar collapsed={sidebarCollapsed} />
        
        {/* 主内容区 */}
        <Layout>
          <Content className="app-content">
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Spin size="large" tip="加载中..." />
                </div>
              }
            >
              <Routes>
                {/* 默认路由 */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* 仪表板 */}
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* 连接管理 */}
                <Route path="/connections" element={<Connections />} />
                
                {/* 查询页面 - 需要活跃连接 */}
                <Route 
                  path="/query" 
                  element={
                    activeConnectionId ? (
                      <Query />
                    ) : (
                      <Navigate to="/connections" replace />
                    )
                  } 
                />
                
                {/* 数据库管理 - 需要活跃连接 */}
                <Route 
                  path="/database" 
                  element={
                    activeConnectionId ? (
                      <Database />
                    ) : (
                      <Navigate to="/connections" replace />
                    )
                  } 
                />
                
                {/* 数据可视化 - 需要活跃连接 */}
                <Route 
                  path="/visualization" 
                  element={
                    activeConnectionId ? (
                      <Visualization />
                    ) : (
                      <Navigate to="/connections" replace />
                    )
                  } 
                />
                
                {/* 数据写入 - 需要活跃连接 */}
                <Route 
                  path="/write" 
                  element={
                    activeConnectionId ? (
                      <DataWrite />
                    ) : (
                      <Navigate to="/connections" replace />
                    )
                  } 
                />
                
                {/* 设置页面 */}
                <Route path="/settings" element={<Settings />} />
                
                {/* 404 页面 */}
                <Route 
                  path="*" 
                  element={
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-600 mb-4">
                          页面未找到
                        </h2>
                        <p className="text-gray-500">
                          请检查 URL 是否正确，或返回首页。
                        </p>
                      </div>
                    </div>
                  } 
                />
              </Routes>
            </React.Suspense>
          </Content>
          
          {/* 底部状态栏 */}
          <AppFooter />
        </Layout>
      </Layout>
      
      {/* 全局加载遮罩 */}
      {loading && (
        <div className="loading-overlay">
          <Spin size="large" tip="处理中..." />
        </div>
      )}
    </Layout>
  );
};

export default App;
