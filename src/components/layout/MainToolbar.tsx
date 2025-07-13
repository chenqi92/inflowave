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
  FolderOpen
} from 'lucide-react';
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
  Wrench
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '@/utils/message';
import SettingsModal from '@/components/common/SettingsModal';

interface MainToolbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
}

const MainToolbar: React.FC<MainToolbarProps> = ({ onViewChange, currentView = 'query' }) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const navigate = useNavigate();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;

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
          <span className="text-xs text-gray-500">
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

  return (
    <TooltipProvider>
      <div className="datagrip-toolbar flex items-center justify-between w-full">
        {/* 左侧：主要操作按钮 */}
        <div className="flex gap-2">
          {/* 连接管理 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={activeConnection ? 'default' : 'outline'}
                className="h-8"
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

          <Separator orientation="vertical" className="h-6" />

          {/* 执行相关 */}
          <Button
            variant="default"
            className="h-8"
            disabled={!activeConnection}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            执行
          </Button>

          <Button
            variant="outline"
            className="h-8"
            disabled={!activeConnection}
          >
            <Square className="w-4 h-4 mr-2" />
            停止
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* 文件操作 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                文件
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {fileMenuItems.map((item) => (
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

          <Button
            variant="outline"
            className="h-8"
          >
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>

          {/* 工具菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8"
              >
                <Wrench className="w-4 h-4 mr-2" />
                工具
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
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

          <Separator orientation="vertical" className="h-6" />

          {/* 视图切换 */}
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === 'datasource' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => onViewChange?.('datasource')}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>数据源管理</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === 'database' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => onViewChange?.('database')}
                  disabled={!activeConnection}
                >
                  <Database className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>数据库浏览</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === 'query' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => onViewChange?.('query')}
                  disabled={!activeConnection}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>查询编辑器</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === 'visualization' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => onViewChange?.('visualization')}
                  disabled={!activeConnection}
                >
                  <BarChart className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>数据可视化</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={currentView === 'performance' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => onViewChange?.('performance')}
                  disabled={!activeConnection}
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>性能监控</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* 刷新 */}
          <Button
            variant="outline"
            className="h-8"
            disabled={!activeConnection}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
      </div>

        {/* 右侧：导航和帮助 */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8"
                onClick={() => setSettingsVisible(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                设置
              </Button>
            </TooltipTrigger>
            <TooltipContent>偏好设置</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="h-8"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>帮助</TooltipContent>
          </Tooltip>
        </div>

        {/* 设置模态框 */}
        <SettingsModal
          open={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />
      </div>
    </TooltipProvider>
  );
};

export default MainToolbar;