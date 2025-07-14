import React, { useState } from 'react';
import { Button, Separator, Badge } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Database,
  PlayCircle,
  Square,
  Save,
  History,
  Settings,
  RefreshCw,
  FileUp,
  FileDown,
  Bug,
  HelpCircle,
  Link,
  Unlink,
  BarChart,
  Edit,
  Zap,
  Wrench,
  FolderOpen,
  Plus,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '@/utils/message';
import SettingsModal from '@/components/common/SettingsModal';
import TimeRangeSelector, { TimeRange } from '@/components/common/TimeRangeSelector';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface MainToolbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
}

const MainToolbar: React.FC<MainToolbarProps> = ({ onViewChange, currentView = 'query' }) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const navigate = useNavigate();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(null);
  const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;
  
  // 启用全局快捷键 - 暂时注释掉以修复键盘快捷键对话框意外显示的问题
  // useGlobalShortcuts();


  const handleFileMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'new-query':
        // 创建新查询
        navigate('/query');
        break;
      case 'open':
        // 打开文件
        console.log('打开文件');
        break;
      case 'save':
        // 保存当前查询
        console.log('保存文件');
        break;
      case 'save-as':
        // 另存为
        console.log('另存为');
        break;
      case 'import':
        // 导入数据
        navigate('/data-write');
        break;
      case 'export':
        // 导出数据  
        console.log('导出数据功能尚未实现');
        break;
      default:
        console.log('未处理的文件菜单项:', key);
    }
  };

  const fileMenuItems = [
    {
      key: 'new-query',
      label: '新建查询',
      icon: <FolderOpen className="w-4 h-4" />},
    {
      key: 'open',
      label: '打开文件',
      icon: <FolderOpen className="w-4 h-4" />},
    {
      key: 'save',
      label: '保存',
      icon: <Save className="w-4 h-4" />},
    {
      key: 'save-as',
      label: '另存为',
      icon: <Save className="w-4 h-4" />},
    { key: 'divider-1', type: 'divider' },
    {
      key: 'import',
      label: '导入数据',
      icon: <FileUp className="w-4 h-4" />},
    {
      key: 'export',
      label: '导出数据',
      icon: <FileDown className="w-4 h-4" />},
  ];

  const handleToolsMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'query-history':
        // 查询历史 - 导航到查询页面并打开历史面板
        navigate('/query?showHistory=true');
        showMessage.info('正在打开查询历史...');
        break;
      case 'console':
        // 控制台 - 打开浏览器控制台
        if (typeof window !== 'undefined' && window.console) {
          showMessage.info('请查看浏览器控制台（F12）');
          // 可以执行一些日志输出来引导用户
          console.log('%c=== InfloWave Debug Console ===%c', 'color: #2196F3; font-size: 16px; font-weight: bold;', 'color: normal;');
          console.log('当前时间:', new Date().toLocaleString());
          console.log('应用版本: v0.1.0');
          console.log('活跃连接:', activeConnectionId || '无');
        } else {
          showMessage.warning('控制台不可用');
        }
        break;
      case 'dev-tools':
        // 开发者工具
        navigate('/dev-tools');
        break;
      case 'preferences':
        // 首选项 - 与设置不同，可以打开不同的对话框或页面
        navigate('/settings?tab=preferences');
        break;
      default:
        console.log('未处理的工具菜单项:', key);
    }
  };

  const toolsMenuItems = [
    {
      key: 'query-history',
      label: '查询历史',
      icon: <History className="w-4 h-4" />},
    {
      key: 'console',
      label: '控制台',
      icon: <Bug className="w-4 h-4" />},
    {
      key: 'dev-tools',
      label: '开发者工具',
      icon: <Wrench className="w-4 h-4" />},
    { key: 'divider-2', type: 'divider' },
    {
      key: 'preferences',
      label: '首选项',
      icon: <Settings className="w-4 h-4" />},
  ];

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    console.log('时间范围已更改:', range);
    // TODO: 通知其他组件时间范围变化
  };

  return (
    <TooltipProvider>
      <div className="datagrip-toolbar flex items-center justify-between w-full min-h-[56px] px-2 border-0 shadow-none bg-transparent">
        {/* 左侧功能区域 - 使用flex-shrink-0防止被挤压 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* 区域1: 连接状态显示 - 固定宽度防止挤压 */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg flex-shrink-0 border-0 shadow-sm">
            <div className="p-0 flex items-center gap-2">
            {activeConnection ? (
              <>
                {/* 连接状态指示器 */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link className="w-4 h-4 text-success" />
                    <Badge variant="success" className="px-1.5 py-0.5">
                      ●
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate max-w-[140px]">
                      {activeConnection.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                      {activeConnection.host}:{activeConnection.port}
                    </div>
                  </div>
                </div>

                {/* InfluxDB特色: 时间范围选择器 */}
                <TimeRangeSelector
                  value={selectedTimeRange || undefined}
                  onChange={handleTimeRangeChange}
                  className="ml-1"
                />
              </>
            ) : (
              /* 未连接状态 */
              <div className="flex items-center gap-2 text-muted-foreground">
                <Unlink className="w-4 h-4" />
                <span className="text-sm">未连接数据源</span>
              </div>
            )}
            </div>
          </div>

          <div className="w-px h-6 bg-border mx-3" />

          {/* 区域2: 文件操作 - 统一按钮尺寸 */}
          <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg flex-shrink-0 border-0 shadow-sm">
            <div className="p-0 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
              onClick={() => handleFileMenuClick({ key: 'new-query' })}
              title="新建查询 (Ctrl+N)"
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs">新建</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
              onClick={() => handleFileMenuClick({ key: 'open' })}
              title="打开文件 (Ctrl+O)"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs">打开</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
              onClick={() => handleFileMenuClick({ key: 'save' })}
              title="保存 (Ctrl+S)"
            >
              <Save className="w-4 h-4" />
              <span className="text-xs">保存</span>
            </Button>

            {/* 更多文件操作 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-8 p-1 flex items-center justify-center"
                  title="更多文件操作"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {fileMenuItems.slice(3).map((item) => (
                  item.type === 'divider' ? (
                    <div key={item.key} className="border-t my-1" />
                  ) : (
                    <DropdownMenuItem
                      key={item.key}
                      onClick={() => handleFileMenuClick({ key: item.key })}
                    >
                      {item.icon}
                      <span className="ml-2">{item.label}</span>
                    </DropdownMenuItem>
                  )
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>

          <div className="w-px h-6 bg-border mx-3" />

          {/* 区域3: 核心视图切换 - 统一按钮尺寸并优化响应式 */}
          <div className="flex items-center gap-1 px-3 py-1 bg-muted rounded-lg flex-shrink-0 border-0 shadow-sm">
            <div className="p-0 flex items-center gap-1">
            <Button
              variant={currentView === 'datasource' ? 'default' : 'ghost'}
              size="sm"
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'datasource'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-gray-200'
              }`}
              onClick={() => onViewChange?.('datasource')}
              title="数据源管理"
            >
              <Database className="w-4 h-4" />
              <span className="text-xs">数据源</span>
            </Button>

            <Button
              variant={currentView === 'query' ? 'default' : 'ghost'}
              size="sm"
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'query'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-gray-200'
              }`}
              onClick={() => onViewChange?.('query')}
              disabled={!activeConnection}
              title="查询编辑器"
            >
              <Edit className="w-4 h-4" />
              <span className="text-xs">查询</span>
            </Button>

            <Button
              variant={currentView === 'visualization' ? 'default' : 'ghost'}
              size="sm"
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'visualization'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-gray-200'
              }`}
              onClick={() => onViewChange?.('visualization')}
              disabled={!activeConnection}
              title="数据可视化"
            >
              <BarChart className="w-4 h-4" />
              <span className="text-xs">可视化</span>
            </Button>

            <Button
              variant={currentView === 'performance' ? 'default' : 'ghost'}
              size="sm"
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'performance'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-gray-200'
              }`}
              onClick={() => onViewChange?.('performance')}
              disabled={!activeConnection}
              title="性能监控"
            >
              <Zap className="w-4 h-4" />
              <span className="text-xs">监控</span>
            </Button>
            </div>
          </div>

        </div>

        {/* 右侧：工具和设置 - 统一按钮尺寸，防止被挤压 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-px h-6 bg-border mx-3" />

          {/* 刷新按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
            disabled={!activeConnection}
            title="刷新数据"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs">刷新</span>
          </Button>

          {/* 主题切换按钮 */}
          <ThemeToggle 
            variant="ghost"
            size="sm"
            showLabel={true}
            className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
          />

          {/* 设置按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
            onClick={() => setSettingsVisible(true)}
            title="应用设置"
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">设置</span>
          </Button>

          {/* 工具菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
                title="更多工具"
              >
                <Wrench className="w-4 h-4" />
                <span className="text-xs">工具</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {toolsMenuItems.map((item) => (
                item.type === 'divider' ? (
                  <div key={item.key} className="border-t my-1" />
                ) : (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => handleToolsMenuClick({ key: item.key })}
                  >
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </DropdownMenuItem>
                )
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 设置模态框 */}
        <SettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
      </div>
    </TooltipProvider>
  );
};

export default MainToolbar;