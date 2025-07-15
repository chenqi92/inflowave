import React from 'react';
import { Button, Text, Avatar, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Space, Header } from '@/components/ui';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Database, Settings, Lightbulb, Globe, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAppStore } from '@store/app';
import { useConnectionStore } from '@store/connection';

const AppHeader: React.FC = () => {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    setTheme,
    setLanguage} = useAppStore();

  const { activeConnectionId, connectionStatuses } = useConnectionStore();

  // 获取当前连接信息
  const currentConnection = activeConnectionId
    ? useConnectionStore.getState().getConnection(activeConnectionId)
    : null;

  const currentStatus = activeConnectionId
    ? connectionStatuses[activeConnectionId]
    : null;


  // 连接状态显示
  const renderConnectionStatus = () => {
    if (!currentConnection || !currentStatus) {
      return (
        <div className="flex gap-2">
          <Database className="w-4 h-4 text-gray-400" />
          <Text type='secondary'>未连接</Text>
        </div>
      );
    }

    const statusColor = {
      connected: '#52c41a',
      connecting: '#faad14',
      disconnected: '#ff4d4f',
      error: '#ff4d4f'}[currentStatus.status];

    const statusText = {
      connected: '已连接',
      connecting: '连接中',
      disconnected: '已断开',
      error: '连接错误'}[currentStatus.status];

    return (
      <div className="flex gap-2">
        <Badge variant="secondary" style={{ backgroundColor: statusColor }} />
        <Database className="w-4 h-4" style={{ color: statusColor }} />
        <div className='flex flex-col'>
          <Text strong className='text-sm'>
            {currentConnection.name}
          </Text>
          <Text type='secondary' className='text-xs'>
            {statusText}
            {currentStatus.latency && ` (${currentStatus.latency}ms)`}
          </Text>
        </div>
      </div>
    );
  };

  return (
    <Header className='app-header flex items-center justify-between px-4 py-2 border-b bg-background'>
      {/* 左侧 */}
      <div className='flex items-center space-x-4'>
        {/* 菜单折叠按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className='h-12 w-16 p-1 flex flex-col items-center justify-center gap-1'
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          <span className="text-xs">{sidebarCollapsed ? '展开' : '折叠'}</span>
        </Button>

        {/* 应用标题 */}
        <div className='flex items-center space-x-2'>
          <Database className="h-5 w-5 text-primary" />
          <Text className='text-lg font-semibold'>
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
        {/* 主题切换按钮 */}
        <ThemeToggle />
        
        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className='flex items-center space-x-1'>
              <Avatar className="h-6 w-6">
                <User className="h-4 w-4" />
              </Avatar>
              <Text>用户</Text>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('zh-CN')}>
              <Globe className="mr-2 h-4 w-4" />
              简体中文
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en-US')}>
              <Globe className="mr-2 h-4 w-4" />
              English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.hash = '/settings'}>
              <Settings className="mr-2 h-4 w-4" />
              应用设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Header>
  );
};

export default AppHeader;
