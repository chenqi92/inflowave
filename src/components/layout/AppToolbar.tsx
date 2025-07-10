import React from 'react';
import { Button, Space, Tooltip, Badge, Typography, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DatabaseOutlined,
  SearchOutlined,
  PlusOutlined,
  BarChartOutlined,
  SettingOutlined,
  WifiOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  ApiOutlined,
  UserOutlined,
  BulbOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useConnectionStore } from '@/store/connection';
import { useAppStore } from '@/store/app';

const { Text } = Typography;

const AppToolbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConnectionId, connectionStatuses } = useConnectionStore();
  const { config, setTheme, setLanguage } = useAppStore();

  // 获取当前连接状态
  const currentStatus = activeConnectionId 
    ? connectionStatuses[activeConnectionId]
    : null;

  // 主题切换菜单
  const themeMenuItems: MenuProps['items'] = [
    {
      key: 'light',
      label: '浅色主题',
      onClick: () => setTheme('light'),
    },
    {
      key: 'dark',
      label: '深色主题',
      onClick: () => setTheme('dark'),
    },
    {
      key: 'auto',
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
      onClick: () => navigate('/settings'),
    },
  ];

  // 处理导航
  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // 处理刷新操作
  const handleRefresh = async () => {
    try {
      if (!activeConnectionId) {
        console.warn('没有活跃连接，无法刷新');
        return;
      }
      // TODO: 实现刷新数据库结构功能
      console.log('刷新数据库结构');
      // 可以触发重新加载数据库列表、表结构等
    } catch (error) {
      console.error('刷新操作失败:', error);
    }
  };

  // 工具栏按钮配置
  const toolbarButtons = [
    // 查询操作组
    {
      key: 'new-query',
      icon: <PlusOutlined style={{ color: '#52c41a', fontSize: '18px' }} />,
      tooltip: '新建SQL查询 (Ctrl+N)',
      onClick: () => handleNavigate('/query'),
      disabled: !activeConnectionId,
      text: '新建查询',
    },
    {
      key: 'divider-1',
      type: 'divider',
    },

    // 导航组
    {
      key: 'dashboard',
      icon: <DashboardOutlined style={{ color: '#1890ff', fontSize: '18px' }} />,
      tooltip: '仪表板 (Ctrl+1)',
      onClick: () => handleNavigate('/dashboard'),
      active: location.pathname === '/dashboard' || location.pathname === '/',
      text: '仪表板',
    },
    {
      key: 'connections',
      icon: <ApiOutlined style={{ color: '#722ed1', fontSize: '18px' }} />,
      tooltip: '连接管理 (Ctrl+2)',
      onClick: () => handleNavigate('/connections'),
      active: location.pathname === '/connections',
      text: '连接',
    },
    {
      key: 'query',
      icon: <SearchOutlined style={{ color: '#13c2c2', fontSize: '18px' }} />,
      tooltip: '数据查询 (Ctrl+3)',
      onClick: () => handleNavigate('/query'),
      disabled: !activeConnectionId,
      active: location.pathname === '/query',
      text: '查询',
    },
    {
      key: 'database',
      icon: <DatabaseOutlined style={{ color: '#fa8c16', fontSize: '18px' }} />,
      tooltip: '数据库管理 (Ctrl+4)',
      onClick: () => handleNavigate('/database'),
      disabled: !activeConnectionId,
      active: location.pathname === '/database',
      text: '数据库',
    },
    {
      key: 'divider-2',
      type: 'divider',
    },

    // 功能组
    {
      key: 'visualization',
      icon: <BarChartOutlined style={{ color: '#eb2f96', fontSize: '18px' }} />,
      tooltip: '数据可视化',
      onClick: () => handleNavigate('/visualization'),
      disabled: !activeConnectionId,
      active: location.pathname === '/visualization',
      text: '可视化',
    },
    {
      key: 'performance',
      icon: <ThunderboltOutlined style={{ color: '#f5222d', fontSize: '18px' }} />,
      tooltip: '性能监控',
      onClick: () => handleNavigate('/performance'),
      disabled: !activeConnectionId,
      active: location.pathname === '/performance',
      text: '性能',
    },
  ];

  // 渲染工具栏按钮 - 垂直布局：图标在上，文字在下
  const renderToolbarButton = (button: any) => {
    if (button.type === 'divider') {
      return <div key={button.key} className="toolbar-divider" />;
    }

    return (
      <Tooltip key={button.key} title={button.tooltip}>
        <Button
          type={button.active ? 'primary' : 'text'}
          onClick={button.onClick}
          disabled={button.disabled}
          className={`toolbar-button-vertical ${button.active ? 'toolbar-button-active' : ''}`}
        >
          <div className="toolbar-button-content">
            <div className="toolbar-button-icon">
              {button.icon}
            </div>
            <div className="toolbar-button-text">
              {button.text}
            </div>
          </div>
        </Button>
      </Tooltip>
    );
  };

  // 渲染连接状态
  const renderConnectionStatus = () => {
    if (activeConnectionId && currentStatus) {
      return (
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
      );
    }

    return (
      <Space>
        <WifiOutlined style={{ color: '#d9d9d9' }} />
        <Text className="text-sm" type="secondary">
          无活跃连接
        </Text>
      </Space>
    );
  };

  return (
    <div className="app-toolbar">
      <div className="toolbar-left">
        {/* 应用标题 */}
        <div className="app-title">
          <DatabaseOutlined className="text-xl text-primary-600" />
          <Text strong className="text-lg">
            InfloWave
          </Text>
        </div>

        {/* 工具栏按钮 */}
        <div className="toolbar-buttons">
          {toolbarButtons.map(renderToolbarButton)}
        </div>
      </div>

      <div className="toolbar-center">
        {/* 连接状态 */}
        {renderConnectionStatus()}
      </div>

      <div className="toolbar-right">
        {/* 用户菜单 */}
        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<UserOutlined />}
            className="toolbar-button"
            size="small"
          />
        </Dropdown>
      </div>
    </div>
  );
};

export default AppToolbar;
