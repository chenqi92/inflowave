import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  DatabaseOutlined,
  SearchOutlined,
  BarChartOutlined,
  EditOutlined,
  SettingOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useConnectionStore } from '@/store/connection';

const { Sider } = Layout;

interface AppSidebarProps {
  collapsed: boolean;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConnectionId } = useConnectionStore();

  // 菜单项配置
  const menuItems: MenuProps['items'] = [
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
      type: 'divider',
    },
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
      key: '/visualization',
      icon: <BarChartOutlined />,
      label: '数据可视化',
      disabled: !activeConnectionId,
    },
    {
      key: '/write',
      icon: <EditOutlined />,
      label: '数据写入',
      disabled: !activeConnectionId,
    },
    {
      type: 'divider',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '应用设置',
    },
  ];

  // 处理菜单点击
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  // 获取当前选中的菜单项
  const selectedKeys = [location.pathname];

  return (
    <Sider
      className="app-sider"
      collapsed={collapsed}
      width={240}
      collapsedWidth={64}
      theme="light"
    >
      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems}
        onClick={handleMenuClick}
        className="h-full border-r-0"
      />
    </Sider>
  );
};

export default AppSidebar;
