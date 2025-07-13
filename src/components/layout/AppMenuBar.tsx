import React from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Badge
} from '@/components/ui';

import { useNavigate, useLocation } from 'react-router-dom';
import {
  Database, Search, BarChart, Edit, Settings, ChevronDown, Wifi, Webhook, Zap, Grid3X3, LayoutDashboard,
  FileText, RotateCcw, Scissors, Copy, Clipboard, Eye, Monitor, HelpCircle,
  Plus, FolderOpen, Save, RefreshCw, Wrench, History
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';

const AppMenuBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConnectionId, connectionStatuses } = useConnectionStore();

  // 获取当前连接状态
  const currentStatus = activeConnectionId 
    ? connectionStatuses[activeConnectionId]
    : null;

  // 文件菜单
  const fileMenuItems = [
    {
      key: 'new-query',
      icon: <Plus className="w-4 h-4" />,
      label: '新建查询',
      shortcut: 'Ctrl+N'
    },
    {
      key: 'open',
      icon: <FolderOpen className="w-4 h-4" />,
      label: '打开文件',
      shortcut: 'Ctrl+O'
    },
    {
      key: 'save',
      icon: <Save className="w-4 h-4" />,
      label: '保存',
      shortcut: 'Ctrl+S'
    },
    {
      key: 'save-as',
      icon: <Save className="w-4 h-4" />,
      label: '另存为',
      shortcut: 'Ctrl+Shift+S'
    },
    { key: 'divider-1', type: 'divider' },
    {
      key: 'import',
      icon: <Database className="w-4 h-4" />,
      label: '导入数据'
    },
    {
      key: 'export',
      icon: <Database className="w-4 h-4" />,
      label: '导出数据'
    },
  ];

  // 编辑菜单
  const editMenuItems = [
    {
      key: 'undo',
      icon: <RotateCcw className="w-4 h-4" />,
      label: '撤销',
      shortcut: 'Ctrl+Z'
    },
    {
      key: 'redo',
      icon: <RotateCcw className="w-4 h-4" />,
      label: '重做',
      shortcut: 'Ctrl+Y'
    },
    { key: 'divider-2', type: 'divider' },
    {
      key: 'cut',
      icon: <Scissors className="w-4 h-4" />,
      label: '剪切',
      shortcut: 'Ctrl+X'
    },
    {
      key: 'copy',
      icon: <Copy className="w-4 h-4" />,
      label: '复制',
      shortcut: 'Ctrl+C'
    },
    {
      key: 'paste',
      icon: <Clipboard className="w-4 h-4" />,
      label: '粘贴',
      shortcut: 'Ctrl+V'
    },
    { key: 'divider-3', type: 'divider' },
    {
      key: 'find',
      icon: <Search className="w-4 h-4" />,
      label: '查找',
      shortcut: 'Ctrl+F'
    },
    {
      key: 'replace',
      icon: <Search className="w-4 h-4" />,
      label: '替换',
      shortcut: 'Ctrl+H'
    },
  ];

  // 查看菜单
  const viewMenuItems = [
    {
      key: '/datasource',
      icon: <Database className="w-4 h-4" />,
      label: '数据源管理',
      shortcut: 'Ctrl+1'
    },
    {
      key: '/query',
      icon: <Edit className="w-4 h-4" />,
      label: '查询编辑器',
      shortcut: 'Ctrl+2',
      disabled: !activeConnectionId
    },
    {
      key: '/visualization',
      icon: <BarChart className="w-4 h-4" />,
      label: '数据可视化',
      shortcut: 'Ctrl+3',
      disabled: !activeConnectionId
    },
    {
      key: '/performance',
      icon: <Zap className="w-4 h-4" />,
      label: '性能监控',
      shortcut: 'Ctrl+4',
      disabled: !activeConnectionId
    },
    { key: 'divider-4', type: 'divider' },
    {
      key: 'toggle-sidebar',
      icon: <Eye className="w-4 h-4" />,
      label: '切换侧边栏',
      shortcut: 'Ctrl+B'
    },
    {
      key: 'fullscreen',
      icon: <Monitor className="w-4 h-4" />,
      label: '全屏模式',
      shortcut: 'F11'
    },
  ];

  // 数据库菜单
  const databaseMenuItems = [
    {
      key: 'new-connection',
      icon: <Plus className="w-4 h-4" />,
      label: '新建连接',
      shortcut: 'Ctrl+Shift+N'
    },
    {
      key: 'test-connection',
      icon: <Webhook className="w-4 h-4" />,
      label: '测试连接',
      shortcut: 'Ctrl+T',
      disabled: !activeConnectionId
    },
    { key: 'divider-5', type: 'divider' },
    {
      key: 'refresh-structure',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '刷新数据库结构',
      shortcut: 'F5',
      disabled: !activeConnectionId
    },
    {
      key: 'database-info',
      icon: <Database className="w-4 h-4" />,
      label: '查看数据库信息',
      disabled: !activeConnectionId
    },
  ];

  // 查询菜单
  const queryMenuItems = [
    {
      key: 'execute-query',
      icon: <BarChart className="w-4 h-4" />,
      label: '执行查询',
      shortcut: 'F5',
      disabled: !activeConnectionId
    },
    {
      key: 'stop-query',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '停止查询',
      shortcut: 'Ctrl+F2',
      disabled: !activeConnectionId
    },
    { key: 'divider-6', type: 'divider' },
    {
      key: 'query-history',
      icon: <History className="w-4 h-4" />,
      label: '查询历史',
      shortcut: 'Ctrl+H'
    },
    {
      key: 'save-query',
      icon: <Save className="w-4 h-4" />,
      label: '保存查询'
    },
  ];

  // 工具菜单
  const toolsMenuItems = [
    {
      key: 'console',
      icon: <Monitor className="w-4 h-4" />,
      label: '控制台',
      shortcut: 'Ctrl+`'
    },
    {
      key: 'dev-tools',
      icon: <Wrench className="w-4 h-4" />,
      label: '开发者工具',
      shortcut: 'F12'
    },
    { key: 'divider-7', type: 'divider' },
    {
      key: '/extensions',
      icon: <Grid3X3 className="w-4 h-4" />,
      label: '扩展管理'
    },
    {
      key: '/settings',
      icon: <Settings className="w-4 h-4" />,
      label: '首选项',
      shortcut: 'Ctrl+,'
    },
  ];

  // 帮助菜单
  const helpMenuItems = [
    {
      key: 'user-manual',
      icon: <FileText className="w-4 h-4" />,
      label: '用户手册',
      shortcut: 'F1'
    },
    {
      key: 'shortcuts',
      icon: <Search className="w-4 h-4" />,
      label: '键盘快捷键',
      shortcut: 'Ctrl+/'
    },
    { key: 'divider-8', type: 'divider' },
    {
      key: 'check-updates',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '检查更新'
    },
    {
      key: 'about',
      icon: <HelpCircle className="w-4 h-4" />,
      label: '关于InfloWave'
    },
  ];

  // 处理菜单点击
  const handleMenuClick = (key: string) => {
    if (key.startsWith('/')) {
      navigate(key);
    } else {
      // 处理其他菜单动作
      console.log('菜单动作:', key);
    }
  };

  // 渲染下拉菜单项
  const renderDropdownItems = (items: any[]) => {
    return items.map((item) => {
      if (item.type === 'divider') {
        return <DropdownMenuSeparator key={item.key} />;
      }

      return (
        <DropdownMenuItem
          key={item.key}
          disabled={item.disabled}
          onClick={() => handleMenuClick(item.key)}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </div>
          {item.shortcut && (
            <span className="text-xs text-muted-foreground ml-auto">
              {item.shortcut}
            </span>
          )}
        </DropdownMenuItem>
      );
    });
  };

  // 主菜单配置
  const mainMenus = [
    { key: 'file', label: '文件', items: fileMenuItems },
    { key: 'edit', label: '编辑', items: editMenuItems },
    { key: 'view', label: '查看', items: viewMenuItems },
    { key: 'database', label: '数据库', items: databaseMenuItems },
    { key: 'query', label: '查询', items: queryMenuItems },
    { key: 'tools', label: '工具', items: toolsMenuItems },
    { key: 'help', label: '帮助', items: helpMenuItems },
  ];

  return (
    <div className="desktop-menu-bar">
      <div className="flex items-center justify-between h-full px-4">
        {/* 左侧 - 应用标题和主菜单 */}
        <div className="flex items-center space-x-6">
          {/* 应用标题 */}
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-xl text-primary-600" />
            <span className="text-lg font-semibold">
              InfloWave
            </span>
          </div>

          {/* 主菜单 */}
          <NavigationMenu>
            <NavigationMenuList className="space-x-1">
              {mainMenus.map((menu) => (
                <NavigationMenuItem key={menu.key}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <NavigationMenuTrigger className="h-9 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                        {menu.label}
                      </NavigationMenuTrigger>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {renderDropdownItems(menu.items)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* 右侧 - 连接状态 */}
        <div className="flex items-center space-x-4">
          {activeConnectionId && currentStatus ? (
            <div className="flex items-center gap-2">
              <Badge
                variant={currentStatus.status === 'connected' ? 'default' : 'destructive'}
                className="flex items-center gap-1"
              >
                <Wifi className="w-3 h-3" />
                <span className="text-xs">
                  {currentStatus.status === 'connected' ? '已连接' : '未连接'}
                </span>
              </Badge>
              {currentStatus.latency && (
                <span className="text-xs text-muted-foreground">
                  {currentStatus.latency}ms
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
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
