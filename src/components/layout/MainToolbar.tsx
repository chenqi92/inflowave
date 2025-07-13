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
  Clock
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '@/utils/message';
import SettingsModal from '@/components/common/SettingsModal';
import TimeRangeSelector, { TimeRange } from '@/components/common/TimeRangeSelector';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';

interface MainToolbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
}

const MainToolbar: React.FC<MainToolbarProps> = ({ onViewChange, currentView = 'query' }) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const navigate = useNavigate();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(null);
  const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;
  
  // 启用全局快捷键
  useGlobalShortcuts();

  const handleConnectionMenuClick = async ({ key }: { key: string }) => {
    // 选择并连接到数据库
    const { setActiveConnection, connectToDatabase, connections } = useConnectionStore.getState();
    const connection = connections.find(c => c.id === key);
    
    if (!connection) {
      showMessage.error('连接配置不存在');
      return;
    }
    
    setConnecting(true);
    try {
      setActiveConnection(key);
      await connectToDatabase(key);
      showMessage.success(`已连接到 ${connection.name}`);
      console.log(`成功连接到: ${key}`);
    } catch (error) {
      console.error('连接失败:', error);
      showMessage.error(`连接 ${connection.name} 失败: ${error}`);
      // 如果连接失败，清除活跃连接
      setActiveConnection(null);
    } finally {
      setConnecting(false);
    }
  };

  const connectionMenuItems = [
    ...connections.map(conn => ({
      key: conn.id,
      label: (
        <div className="flex items-center justify-between min-w-48">
          <span className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              conn.id === activeConnectionId ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span>{conn.name}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {conn.host}:{conn.port}
          </span>
        </div>
      )})),
  ];

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
        // 查询历史
        console.log('打开查询历史');
        break;
      case 'console':
        // 控制台
        console.log('打开控制台');
        break;
      case 'dev-tools':
        // 开发者工具
        onViewChange?.('dev-tools');
        break;
      case 'preferences':
        // 首选项
        setSettingsVisible(true);
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
      <div className="datagrip-toolbar flex items-center justify-between w-full">
        {/* 五大功能区域布局 */}
        <div className="flex items-center gap-1">
          {/* 区域1: 连接管理 */}
          <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={activeConnection ? 'default' : 'outline'}
                  className="h-8 min-w-32"
                  disabled={connecting}
                >
                  {activeConnection ? <Link className="w-4 h-4 mr-2" /> : <Unlink className="w-4 h-4 mr-2" />}
                  {connecting ? '连接中...' : activeConnection ? activeConnection.name : '选择连接'}
                  {activeConnection && !connecting && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-green-500 text-white"
                    >
                      ●
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {connectionMenuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    onClick={() => handleConnectionMenuClick({ key: item.key })}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* InfluxDB特色: 时间范围选择器 */}
            {activeConnection && (
              <TimeRangeSelector
                value={selectedTimeRange || undefined}
                onChange={handleTimeRangeChange}
                className="ml-2"
              />
            )}
          </div>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* 区域2: 文件操作 */}
          <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-16 p-1 flex flex-col items-center justify-center gap-1"
              onClick={() => handleFileMenuClick({ key: 'new-query' })}
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs">新建</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-16 p-1 flex flex-col items-center justify-center gap-1"
              onClick={() => handleFileMenuClick({ key: 'open' })}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs">打开</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-16 p-1 flex flex-col items-center justify-center gap-1"
              onClick={() => handleFileMenuClick({ key: 'save' })}
            >
              <Save className="w-4 h-4" />
              <span className="text-xs">保存</span>
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* 区域3: 执行控制 */}
          <div className="flex items-center gap-1 px-3 py-1 bg-green-50 rounded-lg">
            <Button
              variant="default"
              size="sm"
              className="h-12 px-3 flex flex-col items-center justify-center gap-1"
              disabled={!activeConnection}
            >
              <PlayCircle className="w-4 h-4" />
              <span className="text-xs">执行</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-12 w-16 p-1 flex flex-col items-center justify-center gap-1"
              disabled={!activeConnection}
            >
              <Square className="w-4 h-4" />
              <span className="text-xs">停止</span>
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* 区域4: 核心视图切换 (突出显示) */}
          <div className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-purple-200">
            <Button
              variant={currentView === 'datasource' ? 'default' : 'ghost'}
              size="sm"
              className={`h-14 w-20 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'datasource'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                  : 'hover:bg-purple-200'
              }`}
              onClick={() => onViewChange?.('datasource')}
            >
              <Database className="w-4 h-4" />
              <span className="text-xs">数据源</span>
            </Button>

            <Button
              variant={currentView === 'query' ? 'default' : 'ghost'}
              size="sm"
              className={`h-14 w-20 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'query'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                  : 'hover:bg-purple-200'
              }`}
              onClick={() => onViewChange?.('query')}
              disabled={!activeConnection}
            >
              <Edit className="w-4 h-4" />
              <span className="text-xs">查询</span>
            </Button>

            <Button
              variant={currentView === 'visualization' ? 'default' : 'ghost'}
              size="sm"
              className={`h-14 w-20 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'visualization'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                  : 'hover:bg-purple-200'
              }`}
              onClick={() => onViewChange?.('visualization')}
              disabled={!activeConnection}
            >
              <BarChart className="w-4 h-4" />
              <span className="text-xs">可视化</span>
            </Button>

            <Button
              variant={currentView === 'performance' ? 'default' : 'ghost'}
              size="sm"
              className={`h-14 w-20 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'performance'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                  : 'hover:bg-purple-200'
              }`}
              onClick={() => onViewChange?.('performance')}
              disabled={!activeConnection}
            >
              <Zap className="w-4 h-4" />
              <span className="text-xs">监控</span>
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* 区域5: 工具功能 */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-16 p-1 flex flex-col items-center justify-center gap-1"
              disabled={!activeConnection}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">刷新</span>
            </Button>
          </div>
        </div>

        {/* 右侧：设置和帮助 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-16 p-1 flex flex-col items-center justify-center gap-1"
            onClick={() => setSettingsVisible(true)}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">设置</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-12 w-16 p-1 flex flex-col items-center justify-center gap-1"
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