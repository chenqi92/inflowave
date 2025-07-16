import React, { useState } from 'react';
import { 
  Button, 
  Separator, 
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
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
  MoreHorizontal,
  Sun,
  Moon,
  Monitor,
  Globe,
  User
} from 'lucide-react';
import { useConnectionStore, connectionUtils } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '@/utils/message';
import SettingsModal from '@/components/common/SettingsModal';
import TimeRangeSelector, { TimeRange } from '@/components/common/TimeRangeSelector';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useAppStore } from '@/store/app';

interface MainToolbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
  currentTimeRange?: {
    label: string;
    value: string;
    start: string;
    end: string;
  };
  onTimeRangeChange?: (range: {
    label: string;
    value: string;
    start: string;
    end: string;
  }) => void;
}

const MainToolbar: React.FC<MainToolbarProps> = ({ onViewChange, currentView = 'query', currentTimeRange, onTimeRangeChange }) => {
  const { activeConnectionId, connections, connectionStatuses, connectedConnectionIds } = useConnectionStore();
  const { theme, setTheme } = useTheme();
  const { setTheme: setAppTheme } = useAppStore();
  const navigate = useNavigate();
  const [settingsVisible, setSettingsVisible] = useState(false);

  // 同步主题设置函数
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setAppTheme(newTheme as 'light' | 'dark' | 'auto'); // 转换system为auto
  };
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(
    currentTimeRange ? {
      label: currentTimeRange.label,
      value: currentTimeRange.value,
      start: currentTimeRange.start,
      end: currentTimeRange.end
    } : null
  );
  const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;
  
  // 检查是否有任何已连接的InfluxDB连接
  const hasAnyConnectedInfluxDB = connectionUtils.hasAnyConnectedInfluxDB();
  const connectedInfluxDBCount = connectionUtils.getConnectedInfluxDBCount();
  
  // 调试信息
  console.log('MainToolbar - 连接状态调试:', {
    hasAnyConnectedInfluxDB,
    connectedInfluxDBCount,
    activeConnectionId,
    connectionStatuses: Object.keys(connectionStatuses).length,
    connections: connections.length,
    connectedConnectionIds: connectedConnectionIds.length
  });
  
  // 启用全局快捷键 - 暂时注释掉以修复键盘快捷键对话框意外显示的问题
  // useGlobalShortcuts();


  const handleFileMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'new-query':
        // 创建新查询
        navigate('/query');
        break;
      case 'open':
        // 打开文件 - 使用浏览器文件选择器
        try {
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = '.sql,.txt,.json';
          fileInput.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const text = await file.text();
              // 触发自定义事件，让TabEditor接收文件内容
              document.dispatchEvent(new CustomEvent('load-file-content', {
                detail: { content: text, filename: file.name }
              }));
              showMessage.success(`已打开文件: ${file.name}`);
            }
          };
          fileInput.click();
        } catch (error) {
          showMessage.error('打开文件失败');
        }
        break;
      case 'save':
        // 保存当前查询 - 触发保存事件
        document.dispatchEvent(new CustomEvent('save-current-query'));
        showMessage.info('正在保存当前查询...');
        break;
      case 'save-as':
        // 另存为 - 触发另存为事件
        document.dispatchEvent(new CustomEvent('save-query-as'));
        showMessage.info('正在另存为查询...');
        break;
      case 'import':
        // 导入数据
        navigate('/data-write');
        break;
      case 'export':
        // 导出数据 - 触发导出数据事件
        document.dispatchEvent(new CustomEvent('show-export-dialog'));
        showMessage.info('正在打开数据导出...');
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
  ];

  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    onTimeRangeChange?.({
      label: range.label,
      value: range.value,
      start: range.start,
      end: range.end
    });
  };

  return (
    <TooltipProvider>
      <div className="datagrip-toolbar flex items-center justify-between w-full min-h-[56px] px-2 border-0 shadow-none bg-transparent">
        {/* 左侧功能区域 - 使用flex-shrink-0防止被挤压 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* 区域1: 软件名称显示 - 艺术体风格 */}
          <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  InfloWave
                </span>
                <span className="text-xs text-muted-foreground -mt-1">
                  时序数据库管理工具
                </span>
              </div>
            </div>
          </div>

          {/* 区域2: 时间范围选择器 - 仅在有连接时显示 */}
          {activeConnection && (
            <div className="flex items-center gap-2 px-2">
              <TimeRangeSelector
                value={selectedTimeRange || currentTimeRange}
                onChange={handleTimeRangeChange}
                className="ml-1"
              />
            </div>
          )}

          <div className="w-px h-6 bg-border mx-3" />

          {/* 区域2: 文件操作 - 统一按钮尺寸 */}
          <div className="flex items-center gap-1 px-2 py-1 flex-shrink-0">
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
          <div className="flex items-center gap-1 px-3 py-1 flex-shrink-0">
            <div className="p-0 flex items-center gap-1">
            <Button
              variant={currentView === 'datasource' ? 'default' : 'ghost'}
              size="sm"
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'datasource'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-accent hover:text-accent-foreground'
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
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => onViewChange?.('query')}
              disabled={!hasAnyConnectedInfluxDB}
              title={hasAnyConnectedInfluxDB ? "查询编辑器" : `查询编辑器 (需要连接InfluxDB，当前已连接: ${connectedInfluxDBCount})`}
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
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => onViewChange?.('visualization')}
              disabled={!hasAnyConnectedInfluxDB}
              title={hasAnyConnectedInfluxDB ? "数据可视化" : `数据可视化 (需要连接InfluxDB，当前已连接: ${connectedInfluxDBCount})`}
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
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => onViewChange?.('performance')}
              disabled={!hasAnyConnectedInfluxDB}
              title={hasAnyConnectedInfluxDB ? "性能监控" : `性能监控 (需要连接InfluxDB，当前已连接: ${connectedInfluxDBCount})`}
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
            disabled={!hasAnyConnectedInfluxDB}
            title={hasAnyConnectedInfluxDB ? "刷新数据" : `刷新数据 (需要连接InfluxDB，当前已连接: ${connectedInfluxDBCount})`}
            onClick={() => {
              // 触发刷新数据库结构事件
              document.dispatchEvent(new CustomEvent('refresh-database-tree'));
              showMessage.info('正在刷新数据库结构...');
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-xs">刷新</span>
          </Button>

          {/* 样式和设置菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
                title="样式设置"
              >
                <Settings className="w-4 h-4" />
                <span className="text-xs">样式</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* 主题设置子菜单 */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun className="w-4 h-4" />
                  <span>主题设置</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                    <Sun className="w-4 h-4" />
                    <span>浅色模式</span>
                    {theme === 'light' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                    <Moon className="w-4 h-4" />
                    <span>深色模式</span>
                    {theme === 'dark' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                    <Monitor className="w-4 h-4" />
                    <span>跟随系统</span>
                    {theme === 'system' && <span className="ml-auto">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              <DropdownMenuSeparator />
              
              {/* 应用设置 */}
              <DropdownMenuItem onClick={() => setSettingsVisible(true)}>
                <Settings className="w-4 h-4" />
                <span>应用设置</span>
              </DropdownMenuItem>
              
              {/* 语言设置 */}
              <DropdownMenuItem onClick={() => showMessage.info('语言设置将在后续版本提供')}>
                <Globe className="w-4 h-4" />
                <span>语言设置</span>
              </DropdownMenuItem>
              
              {/* 偏好设置 */}
              <DropdownMenuItem onClick={() => navigate('/settings?tab=preferences')}>
                <User className="w-4 h-4" />
                <span>偏好设置</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
                <DropdownMenuItem
                  key={item.key}
                  onClick={() => handleToolsMenuClick({ key: item.key })}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </DropdownMenuItem>
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