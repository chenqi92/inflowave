import React from 'react';
import { Menu, Dropdown, Badge } from '@/components/ui';
import { Space } from '@/components/ui';

import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Database, Search, BarChart, Edit, Settings, ChevronDown, Wifi, Webhook, Zap, Grid3X3, LayoutDashboard,
  FileText, RotateCcw, Scissors, Copy, Clipboard, Eye, Monitor, HelpCircle,
  Plus, FolderOpen, Save, RefreshCw, Wrench, History
} from 'lucide-react';
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

  // 文件菜单
  const fileMenuItems: MenuProps['items'] = [
    {
      key: 'new-query',
      icon: <Plus className="w-4 h-4" />,
      label: '新建查询 (Ctrl+N)'},
    {
      key: 'open',
      icon: <FolderOpen className="w-4 h-4" />,
      label: '打开文件 (Ctrl+O)'},
    {
      key: 'save',
      icon: <Save className="w-4 h-4" />,
      label: '保存 (Ctrl+S)'},
    {
      key: 'save-as',
      icon: <Save className="w-4 h-4" />,
      label: '另存为 (Ctrl+Shift+S)'},
    { key: 'divider-1', type: 'divider' },
    {
      key: 'import',
      icon: <Database className="w-4 h-4" />,
      label: '导入数据'},
    {
      key: 'export',
      icon: <Database className="w-4 h-4" />,
      label: '导出数据'},
  ];

  // 编辑菜单
  const editMenuItems: MenuProps['items'] = [
    {
      key: 'undo',
      icon: <RotateCcw className="w-4 h-4" />,
      label: '撤销 (Ctrl+Z)'},
    {
      key: 'redo',
      icon: <RotateCcw className="w-4 h-4" />,
      label: '重做 (Ctrl+Y)'},
    { key: 'divider-2', type: 'divider' },
    {
      key: 'cut',
      icon: <Scissors className="w-4 h-4" />,
      label: '剪切 (Ctrl+X)'},
    {
      key: 'copy',
      icon: <Copy className="w-4 h-4" />,
      label: '复制 (Ctrl+C)'},
    {
      key: 'paste',
      icon: <Clipboard className="w-4 h-4" />,
      label: '粘贴 (Ctrl+V)'},
    { key: 'divider-3', type: 'divider' },
    {
      key: 'find',
      icon: <Search className="w-4 h-4" />,
      label: '查找 (Ctrl+F)'},
    {
      key: 'replace',
      icon: <Search className="w-4 h-4" />,
      label: '替换 (Ctrl+H)'},
  ];

  // 查看菜单
  const viewMenuItems: MenuProps['items'] = [
    {
      key: '/datasource',
      icon: <Database className="w-4 h-4" />,
      label: '数据源管理 (Ctrl+1)'},
    {
      key: '/query',
      icon: <Edit className="w-4 h-4" />,
      label: '查询编辑器 (Ctrl+2)',
      disabled: !activeConnectionId},
    {
      key: '/visualization',
      icon: <BarChart className="w-4 h-4" />,
      label: '数据可视化 (Ctrl+3)',
      disabled: !activeConnectionId},
    {
      key: '/performance',
      icon: <Zap className="w-4 h-4" />,
      label: '性能监控 (Ctrl+4)',
      disabled: !activeConnectionId},
    { key: 'divider-4', type: 'divider' },
    {
      key: 'toggle-sidebar',
      icon: <Eye className="w-4 h-4" />,
      label: '切换侧边栏 (Ctrl+B)'},
    {
      key: 'fullscreen',
      icon: <Monitor className="w-4 h-4" />,
      label: '全屏模式 (F11)'},
  ];

  // 数据库菜单
  const databaseMenuItems: MenuProps['items'] = [
    {
      key: 'new-connection',
      icon: <Plus className="w-4 h-4" />,
      label: '新建连接 (Ctrl+Shift+N)'},
    {
      key: 'test-connection',
      icon: <Webhook className="w-4 h-4" />,
      label: '测试连接 (Ctrl+T)',
      disabled: !activeConnectionId},
    { key: 'divider-5', type: 'divider' },
    {
      key: 'refresh-structure',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '刷新数据库结构 (F5)',
      disabled: !activeConnectionId},
    {
      key: 'database-info',
      icon: <Database className="w-4 h-4" />,
      label: '查看数据库信息',
      disabled: !activeConnectionId},
  ];

  // 查询菜单
  const queryMenuItems: MenuProps['items'] = [
    {
      key: 'execute-query',
      icon: <BarChart className="w-4 h-4" />,
      label: '执行查询 (F5)',
      disabled: !activeConnectionId},
    {
      key: 'stop-query',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '停止查询 (Ctrl+F2)',
      disabled: !activeConnectionId},
    { key: 'divider-6', type: 'divider' },
    {
      key: 'query-history',
      icon: <History className="w-4 h-4" />,
      label: '查询历史 (Ctrl+H)'},
    {
      key: 'save-query',
      icon: <Save className="w-4 h-4" />,
      label: '保存查询'},
  ];

  // 工具菜单
  const toolsMenuItems: MenuProps['items'] = [
    {
      key: 'console',
      icon: <Monitor className="w-4 h-4" />,
      label: '控制台 (Ctrl+`)'},
    {
      key: 'dev-tools',
      icon: <Wrench className="w-4 h-4" />,
      label: '开发者工具 (F12)'},
    { key: 'divider-7', type: 'divider' },
    {
      key: '/extensions',
      icon: <Grid3X3 className="w-4 h-4" />,
      label: '扩展管理'},
    {
      key: '/settings',
      icon: <Settings className="w-4 h-4" />,
      label: '首选项 (Ctrl+,)'},
  ];

  // 帮助菜单
  const helpMenuItems: MenuProps['items'] = [
    {
      key: 'user-manual',
      icon: <FileText className="w-4 h-4" />,
      label: '用户手册 (F1)'},
    {
      key: 'shortcuts',
      icon: <Search className="w-4 h-4" />,
      label: '键盘快捷键 (Ctrl+/)'},
    { key: 'divider-8', type: 'divider' },
    {
      key: 'check-updates',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '检查更新'},
    {
      key: 'about',
      icon: <HelpCircle className="w-4 h-4" />,
      label: '关于InfloWave'},
  ];

  // 处理菜单点击
  const handleMenuClick = (path: string) => {
    navigate(path);
  };

  // 7个专业化主菜单项
  const mainMenuItems: MenuProps['items'] = [
    {
      key: 'file',
      label: (
        <Dropdown
          menu={{
            items: fileMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex items-center gap-1">
            文件
          </div>
        </Dropdown>
      )},
    {
      key: 'edit',
      label: (
        <Dropdown
          menu={{
            items: editMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex items-center gap-1">
            编辑
          </div>
        </Dropdown>
      )},
    {
      key: 'view',
      label: (
        <Dropdown
          menu={{
            items: viewMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex items-center gap-1">
            查看
          </div>
        </Dropdown>
      )},
    {
      key: 'database',
      label: (
        <Dropdown
          menu={{
            items: databaseMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex items-center gap-1">
            数据库
          </div>
        </Dropdown>
      )},
    {
      key: 'query',
      label: (
        <Dropdown
          menu={{
            items: queryMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex items-center gap-1">
            查询
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
          <div className="flex items-center gap-1">
            工具
          </div>
        </Dropdown>
      )},
    {
      key: 'help',
      label: (
        <Dropdown
          menu={{
            items: helpMenuItems,
            onClick: ({ key }) => handleMenuClick(key)}}
          trigger={['hover']}
        >
          <div className="flex items-center gap-1">
            帮助
          </div>
        </Dropdown>
      )},
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    // 根据当前路径判断应该高亮哪个菜单
    if (['/query', '/datasource', '/database', '/data-write'].includes(path)) return 'view';
    if (['/visualization', '/performance'].includes(path)) return 'view';
    if (['/extensions', '/settings'].includes(path)) return 'tools';
    return '';
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
              // 所有主菜单项都是下拉菜单，不需要直接处理点击
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
