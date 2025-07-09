import React from 'react';
import { Menu, Space, Typography, Dropdown, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  SearchOutlined,
  BarChartOutlined,
  EditOutlined,
  SettingOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  DownOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useConnectionStore } from '@/store/connection';

const { Text } = Typography;

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
      icon: <SearchOutlined />,
      label: '数据查询',
      disabled: !activeConnectionId,
    },
    {
      key: '/database',
      icon: <DatabaseOutlined />,
      label: '数据库管理',
      disabled: !activeConnectionId,
    },
    {
      key: '/data-write',
      icon: <EditOutlined />,
      label: '数据写入',
      disabled: !activeConnectionId,
    },
  ];

  // 分析工具子菜单
  const analysisMenuItems: MenuProps['items'] = [
    {
      key: '/visualization',
      icon: <BarChartOutlined />,
      label: '数据可视化',
      disabled: !activeConnectionId,
    },
    {
      key: '/performance',
      icon: <ThunderboltOutlined />,
      label: '性能监控',
      disabled: !activeConnectionId,
    },
  ];

  // 工具子菜单
  const toolsMenuItems: MenuProps['items'] = [
    {
      key: '/extensions',
      icon: <AppstoreOutlined />,
      label: '扩展管理',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '应用设置',
    },
  ];

  // 处理菜单点击
  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  // 主菜单项
  const mainMenuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/connections',
      icon: <ApiOutlined />,
      label: '连接管理',
    },
    {
      key: 'data',
      label: (
        <Dropdown
          menu={{
            items: dataMenuItems,
            onClick: ({ key }) => handleMenuClick(key),
          }}
          trigger={['hover']}
        >
          <Space>
            数据管理
            <DownOutlined style={{ fontSize: '10px' }} />
          </Space>
        </Dropdown>
      ),
    },
    {
      key: 'analysis',
      label: (
        <Dropdown
          menu={{
            items: analysisMenuItems,
            onClick: ({ key }) => handleMenuClick(key),
          }}
          trigger={['hover']}
        >
          <Space>
            分析工具
            <DownOutlined style={{ fontSize: '10px' }} />
          </Space>
        </Dropdown>
      ),
    },
    {
      key: 'tools',
      label: (
        <Dropdown
          menu={{
            items: toolsMenuItems,
            onClick: ({ key }) => handleMenuClick(key),
          }}
          trigger={['hover']}
        >
          <Space>
            工具
            <DownOutlined style={{ fontSize: '10px' }} />
          </Space>
        </Dropdown>
      ),
    },
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
            <DatabaseOutlined className="text-xl text-primary-600" />
            <Text strong className="text-lg">
              InfloWave
            </Text>
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
            <Space>
              <Badge 
                status={currentStatus.status === 'connected' ? 'success' : 'error'} 
                text={
                  <Text className="text-sm">
                    {currentStatus.status === 'connected' ? '已连接' : '未连接'}
                  </Text>
                }
              />
              {currentStatus.latency && (
                <Text className="text-sm text-gray-500">
                  {currentStatus.latency}ms
                </Text>
              )}
            </Space>
          ) : (
            <Space>
              <WifiOutlined style={{ color: '#d9d9d9' }} />
              <Text className="text-sm" type="secondary">
                无活跃连接
              </Text>
            </Space>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppMenuBar;
