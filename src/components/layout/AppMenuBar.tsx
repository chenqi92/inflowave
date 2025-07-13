import React from 'react';
import { Menu, Dropdown, Badge } from '@/components/ui';
import { Space } from '@/components/ui';

import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Search, BarChart, Edit, Settings, ChevronDown, Wifi, Webhook, Zap, Grid3X3, LayoutDashboard } from 'lucide-react';
import type { MenuProps } from '@/components/ui';
import { useConnectionStore } from '@/store/connection';

const AppMenuBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConnectionId, connectionStatuses } = useConnectionStore();

  // 获取当前连接状态
  const currentStatus = activeConnectionId 
    ? connectionStatuses[activeConnectionId]
    : null;

  // 数据管理子菜单
  const dataMenuItems: MenuProps['items'] = [
    {
      key: '/query',
      icon: <Search className="w-4 h-4"  />,
      label: '数据查询',
      disabled: !activeConnectionId},
    {
      key: '/database',
      icon: <Database className="w-4 h-4"  />,
      label: '数据库管理',
      disabled: !activeConnectionId},
    {
      key: '/data-write',
      icon: <Edit className="w-4 h-4"  />,
      label: '数据写入',
      disabled: !activeConnectionId},
  ];

  // 分析工具子菜单
  const analysisMenuItems: MenuProps['items'] = [
    {
      key: '/visualization',
      icon: <BarChart className="w-4 h-4"  />,
      label: '数据可视化',
      disabled: !activeConnectionId},
    {
      key: '/performance',
      icon: <Zap className="w-4 h-4"  />,
      label: '性能监控',
      disabled: !activeConnectionId},
  ];

  // 工具子菜单
  const toolsMenuItems: MenuProps['items'] = [
    {
      key: '/extensions',
      icon: <Grid3X3 className="w-4 h-4"  />,
      label: '扩展管理'},
    {
      key: '/settings',
      icon: <Settings className="w-4 h-4"  />,
      label: '应用设置'},
  ];

  // 处理菜单点击
  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  // 主菜单项
  const mainMenuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <LayoutDashboard />,
      label: '仪表板'},
    {
      key: '/connections',
      icon: <Webhook className="w-4 h-4"  />,
      label: '连接管理'},
    {
      key: 'data',
      label: (
        <Dropdown
          menu={{
            items: dataMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex gap-2">
            数据管理
            <ChevronDown className="w-4 h-4" style={{ fontSize: '10px' }}  />
          </div>
        </Dropdown>
      )},
    {
      key: 'analysis',
      label: (
        <Dropdown
          menu={{
            items: analysisMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex gap-2">
            分析工具
            <ChevronDown className="w-4 h-4" style={{ fontSize: '10px' }}  />
          </div>
        </Dropdown>
      )},
    {
      key: 'tools',
      label: (
        <Dropdown
          menu={{
            items: toolsMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex gap-2">
            工具
            <ChevronDown className="w-4 h-4" style={{ fontSize: '10px' }}  />
          </div>
        </Dropdown>
      )},
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return '/dashboard';
    if (['/query', '/database', '/write', '/data-write'].includes(path)) return 'data';
    if (['/visualization', '/performance'].includes(path)) return 'analysis';
    if (['/extensions', '/settings'].includes(path)) return 'tools';
    return path;
  };

  return (
    <div className="desktop-menu-bar">
      <div className="flex items-center justify-between h-full px-4">
        {/* 左侧 - 应用标题和主菜单 */}
        <div className="flex items-center space-x-6">
          {/* 应用标题 */}
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-xl text-primary-600"   />
            <span className="text-lg font-semibold">
              InfloWave
            </span>
          </div>

          {/* 主菜单 */}
          <Menu
            mode="horizontal"
            selectedKeys={[getSelectedKey()]}
            items={mainMenuItems}
            onClick={({ key }) => {
              if (!key.includes('data') && !key.includes('analysis') && !key.includes('tools')) {
                handleMenuClick(key);
              }
            }}
            style={{ 
              border: 'none',
              background: 'transparent',
              minWidth: '400px'
            }}
          />
        </div>

        {/* 右侧 - 连接状态 */}
        <div className="flex items-center space-x-4">
          {activeConnectionId && currentStatus ? (
            <div className="flex gap-2">
              <Badge 
                status={currentStatus.status === 'connected' ? 'success' : 'error'} 
                text={
                  <span className="text-sm">
                    {currentStatus.status === 'connected' ? '已连接' : '未连接'}
                  </span>
                }
              />
              {currentStatus.latency && (
                <span className="text-sm text-gray-500">
                  {currentStatus.latency}ms
                </span>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Wifi className="w-4 h-4" style={{ color: '#d9d9d9' }}  />
              <span className="text-sm text-gray-500">
                无活跃连接
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppMenuBar;
