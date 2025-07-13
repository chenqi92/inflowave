import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Search, BarChart, Edit, Settings, Webhook, LayoutDashboard } from 'lucide-react';
import { Button, Separator } from '@/components/ui';
import { useConnectionStore } from '@/store/connection';

interface AppSidebarProps {
  collapsed: boolean;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConnectionId } = useConnectionStore();

  // 菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      label: '仪表板'},
    {
      key: '/connections',
      icon: <Webhook className="w-4 h-4" />,
      label: '连接管理'},
    {
      type: 'divider'},
    {
      key: '/query',
      icon: <Search className="w-4 h-4" />,
      label: '数据查询',
      disabled: !activeConnectionId},
    {
      key: '/database',
      icon: <Database className="w-4 h-4" />,
      label: '数据库管理',
      disabled: !activeConnectionId},
    {
      key: '/visualization',
      icon: <BarChart className="w-4 h-4" />,
      label: '数据可视化',
      disabled: !activeConnectionId},
    {
      key: '/write',
      icon: <Edit className="w-4 h-4" />,
      label: '数据写入',
      disabled: !activeConnectionId},
    {
      type: 'divider'},
    {
      key: '/settings',
      icon: <Settings className="w-4 h-4" />,
      label: '应用设置'},
  ];

  // 处理菜单点击
  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  // 获取当前选中的菜单项
  const selectedKeys = [location.pathname];

  return (
    <div
      className={`app-sider bg-white border-r border h-full transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <nav className="h-full py-2">
        {menuItems.map((item) => {
          if (item.type === 'divider') {
            return <Separator key={item.key} className="my-2 mx-4" />;
          }

          const isSelected = selectedKeys.includes(item.key);

          return (
            <Button
              key={item.key}
              variant={isSelected ? 'secondary' : 'ghost'}
              className={`w-full justify-start px-4 py-2 h-10 mb-1 mx-2 ${
                collapsed ? 'px-2' : 'px-4'
              }`}
              onClick={() => handleMenuClick(item.key)}
              disabled={item.disabled}
            >
              {item.icon}
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </Button>
          );
        })}
      </nav>
    </div>
  );
};

export default AppSidebar;
