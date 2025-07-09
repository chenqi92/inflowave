import React from 'react';
import type { MenuProps } from 'antd';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Layout,
  Space,
  Typography,
} from 'antd';
import {
  BulbOutlined,
  DatabaseOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@store/app';
import { useConnectionStore } from '@store/connection';

const { Header } = Layout;
const { Text } = Typography;

const AppHeader: React.FC = () => {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    config,
    setTheme,
    setLanguage,
  } = useAppStore();

  const { activeConnectionId, connectionStatuses } = useConnectionStore();

  // 获取当前连接信息
  const currentConnection = activeConnectionId
    ? useConnectionStore.getState().getConnection(activeConnectionId)
    : null;

  const currentStatus = activeConnectionId
    ? connectionStatuses[activeConnectionId]
    : null;

  // 主题切换菜单
  const themeMenuItems: MenuProps['items'] = [
    {
      key: 'light',
      icon: <BulbOutlined />,
      label: '浅色主题',
      onClick: () => setTheme('light'),
    },
    {
      key: 'dark',
      icon: <BulbOutlined />,
      label: '深色主题',
      onClick: () => setTheme('dark'),
    },
    {
      key: 'auto',
      icon: <BulbOutlined />,
      label: '跟随系统',
      onClick: () => setTheme('auto'),
    },
  ];

  // 语言切换菜单
  const languageMenuItems: MenuProps['items'] = [
    {
      key: 'zh-CN',
      icon: <GlobalOutlined />,
      label: '简体中文',
      onClick: () => setLanguage('zh-CN'),
    },
    {
      key: 'en-US',
      icon: <GlobalOutlined />,
      label: 'English',
      onClick: () => setLanguage('en-US'),
    },
  ];

  // 用户菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'theme',
      icon: <BulbOutlined />,
      label: '主题设置',
      children: themeMenuItems,
    },
    {
      key: 'language',
      icon: <GlobalOutlined />,
      label: '语言设置',
      children: languageMenuItems,
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '应用设置',
      onClick: () => {
        // 导航到设置页面
        window.location.hash = '/settings';
      },
    },
  ];

  // 连接状态显示
  const renderConnectionStatus = () => {
    if (!currentConnection || !currentStatus) {
      return (
        <Space>
          <DatabaseOutlined className='text-gray-400' />
          <Text type='secondary'>未连接</Text>
        </Space>
      );
    }

    const statusColor = {
      connected: '#52c41a',
      connecting: '#faad14',
      disconnected: '#ff4d4f',
      error: '#ff4d4f',
    }[currentStatus.status];

    const statusText = {
      connected: '已连接',
      connecting: '连接中',
      disconnected: '已断开',
      error: '连接错误',
    }[currentStatus.status];

    return (
      <Space>
        <Badge color={statusColor} />
        <DatabaseOutlined style={{ color: statusColor }} />
        <div className='flex flex-col'>
          <Text strong className='text-sm'>
            {currentConnection.name}
          </Text>
          <Text type='secondary' className='text-xs'>
            {statusText}
            {currentStatus.latency && ` (${currentStatus.latency}ms)`}
          </Text>
        </div>
      </Space>
    );
  };

  return (
    <Header className='app-header'>
      {/* 左侧 */}
      <div className='flex items-center space-x-4'>
        {/* 菜单折叠按钮 */}
        <Button
          type='text'
          icon={
            sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
          }
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className='text-lg'
        />

        {/* 应用标题 */}
        <div className='flex items-center space-x-2'>
          <DatabaseOutlined className='text-xl text-primary-600' />
          <Text strong className='text-lg'>
            InfloWave
          </Text>
        </div>
      </div>

      {/* 中间 - 连接状态 */}
      <div className='flex-1 flex justify-center'>
        {renderConnectionStatus()}
      </div>

      {/* 右侧 */}
      <div className='flex items-center space-x-2'>
        {/* 用户菜单 */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement='bottomRight'
          trigger={['click']}
        >
          <Button type='text' className='flex items-center space-x-1'>
            <Avatar size='small' icon={<UserOutlined />} />
            <Text>用户</Text>
          </Button>
        </Dropdown>
      </div>
    </Header>
  );
};

export default AppHeader;
