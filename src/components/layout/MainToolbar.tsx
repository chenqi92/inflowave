import React, { useState, useMemo } from 'react';
import {
  Button,
} from '@/components/ui';
import {
  Database,
  History,
  Settings,
  BarChart,
  Edit,
  Zap,
  Wrench,
} from 'lucide-react';
import { useConnectionStore, connectionUtils } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import { showMessage } from '@/utils/message';
import SettingsModal from '@/components/common/SettingsModal';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import TimeRangeSelector, {
  TimeRange,
} from '@/components/common/TimeRangeSelector';

interface MainToolbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
  onOpenQueryHistory?: () => void;
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

const MainToolbar: React.FC<MainToolbarProps> = ({
  onViewChange,
  currentView = 'datasource', // 软件启动时默认选中数据源按钮
  currentTimeRange,
  onTimeRangeChange,
  onOpenQueryHistory,
}) => {
  const {
    activeConnectionId,
    connections,
    connectionStatuses,
    connectedConnectionIds,
  } = useConnectionStore();
  const navigate = useNavigate();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(
    currentTimeRange
      ? {
          label: currentTimeRange.label,
          value: currentTimeRange.value,
          start: currentTimeRange.start,
          end: currentTimeRange.end,
        }
      : null
  );
  const activeConnection = activeConnectionId
    ? connections.find(c => c.id === activeConnectionId)
    : null;

  // 缓存连接状态检查，避免每次渲染都重新计算
  const connectionStatus = useMemo(() => {
    const hasConnected = connectionUtils.hasAnyConnectedInfluxDB();
    const count = connectionUtils.getConnectedInfluxDBCount();
    return { hasConnected, count };
  }, [connectionStatuses, connectedConnectionIds, connections]);

  const hasAnyConnectedInfluxDB = connectionStatus.hasConnected;
  const connectedInfluxDBCount = connectionStatus.count;

  // 启用全局快捷键 - 暂时注释掉以修复键盘快捷键对话框意外显示的问题
  // useGlobalShortcuts();



  const handleTimeRangeChange = (range: TimeRange) => {
    setSelectedTimeRange(range);
    onTimeRangeChange?.({
      label: range.label,
      value: range.value,
      start: range.start,
      end: range.end,
    });
  };

  return (
    <div className='datagrip-toolbar flex items-center justify-between w-full min-h-[56px] px-2 border-0 shadow-none bg-transparent'>
      {/* 左侧功能区域 - 使用flex-shrink-0防止被挤压 */}
      <div className='flex items-center gap-2 flex-1 min-w-0'>
        {/* 区域1: 软件名称显示 - 艺术体风格 */}
        <div className='flex items-center gap-2 px-3 py-2 flex-shrink-0'>
          <div className='flex items-center gap-2'>
            <Database className='w-6 h-6 text-primary' />
            <div className='flex flex-col'>
              <span className='text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
                InfloWave
              </span>
              <span className='text-xs text-muted-foreground -mt-1'>
                时序数据库管理工具
              </span>
            </div>
          </div>
        </div>

        {/* 区域2: 时间范围选择器 - 固定位置，没有连接时保持空白 */}
        <div className='flex items-center gap-2 px-3 w-48'>
          {activeConnection && (
            <TimeRangeSelector
              value={selectedTimeRange || currentTimeRange}
              onChange={handleTimeRangeChange}
              className='ml-1'
            />
          )}
        </div>

        <div className='w-px h-6 bg-border mx-3' />

        {/* 区域3: 核心视图切换 - 统一按钮尺寸并优化响应式 */}
        <div className='flex items-center gap-1 px-4 py-1 flex-shrink-0'>
          <div className='p-0 flex items-center gap-1'>
            <Button
              variant={currentView === 'datasource' ? 'default' : 'ghost'}
              size='sm'
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'datasource'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => onViewChange?.('datasource')}
              title='数据源管理'
            >
              <Database className='w-4 h-4' />
              <span className='text-xs'>数据源</span>
            </Button>

            <Button
              variant={currentView === 'query' ? 'default' : 'ghost'}
              size='sm'
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'query'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => onViewChange?.('query')}
              disabled={!hasAnyConnectedInfluxDB}
              title={
                hasAnyConnectedInfluxDB
                  ? '查询编辑器'
                  : `查询编辑器 (需要连接InfluxDB，当前已连接: ${connectedInfluxDBCount})`
              }
            >
              <Edit className='w-4 h-4' />
              <span className='text-xs'>查询</span>
            </Button>

            <Button
              variant={currentView === 'visualization' ? 'default' : 'ghost'}
              size='sm'
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'visualization'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => onViewChange?.('visualization')}
              disabled={!hasAnyConnectedInfluxDB}
              title={
                hasAnyConnectedInfluxDB
                  ? '数据可视化'
                  : `数据可视化 (需要连接InfluxDB，当前已连接: ${connectedInfluxDBCount})`
              }
            >
              <BarChart className='w-4 h-4' />
              <span className='text-xs'>可视化</span>
            </Button>

            <Button
              variant={currentView === 'performance' ? 'default' : 'ghost'}
              size='sm'
              className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
                currentView === 'performance'
                  ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
                  : 'hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={() => onViewChange?.('performance')}
              disabled={!hasAnyConnectedInfluxDB}
              title={
                hasAnyConnectedInfluxDB
                  ? '性能监控'
                  : `性能监控 (需要连接InfluxDB，当前已连接: ${connectedInfluxDBCount})`
              }
            >
              <Zap className='w-4 h-4' />
              <span className='text-xs'>监控</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧：工具和设置 - 统一按钮尺寸，防止被挤压 */}
      <div className='flex items-center gap-1 flex-shrink-0'>
        <div className='w-px h-6 bg-border mx-3' />


        {/* 主题切换按钮 */}
        <ThemeToggle
          variant='ghost'
          size='sm'
          showLabel={true}
          className='h-10 w-14 p-1 flex flex-col items-center justify-center gap-1'
        />

        {/* 查询历史按钮 */}
        <Button
          variant={currentView === 'query-history' ? 'default' : 'ghost'}
          size='sm'
          className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
            currentView === 'query-history'
              ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
              : 'hover:bg-accent hover:text-accent-foreground'
          }`}
          onClick={() => {
            // 直接切换到查询历史视图
            onViewChange?.('query-history');
          }}
          title='查询历史'
        >
          <History className='w-4 h-4' />
          <span className='text-xs'>历史</span>
        </Button>

        {/* 开发者工具按钮 */}
        <Button
          variant={currentView === 'dev-tools' ? 'default' : 'ghost'}
          size='sm'
          className={`h-10 w-16 p-1 flex flex-col items-center justify-center gap-1 transition-all ${
            currentView === 'dev-tools'
              ? 'bg-primary hover:bg-primary/80 text-primary-foreground shadow-md'
              : 'hover:bg-accent hover:text-accent-foreground'
          }`}
          onClick={() => {
            // 开发者工具 - 特殊处理：先导航再更新视图状态
            navigate('/dev-tools');
            setTimeout(() => onViewChange?.('dev-tools'), 100);
          }}
          title='开发者工具'
        >
          <Wrench className='w-4 h-4' />
          <span className='text-xs'>工具</span>
        </Button>

        {/* 设置按钮 */}
        <Button
          variant='ghost'
          size='sm'
          className='h-10 w-14 p-1 flex flex-col items-center justify-center gap-1'
          onClick={() => setSettingsVisible(true)}
          title='应用设置'
        >
          <Settings className='w-4 h-4' />
          <span className='text-xs'>设置</span>
        </Button>
      </div>

      {/* 设置模态框 */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </div>
  );
};

export default MainToolbar;
