import React, { useState, useMemo, useCallback } from 'react';
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
import TimeRangeSelector, {
  TimeRange,
} from '@/components/common/TimeRangeSelector';

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

const MainToolbar: React.FC<MainToolbarProps> = ({
  onViewChange,
  currentView = 'datasource', // 软件启动时默认选中数据源按钮
  currentTimeRange,
  onTimeRangeChange,
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

  // 使用 useCallback 优化按钮点击处理器，防止不必要的重渲染
  const handleDatasourceClick = useCallback(() => {
    onViewChange?.('datasource');
  }, [onViewChange]);

  const handleQueryClick = useCallback(() => {
    onViewChange?.('query');
  }, [onViewChange]);

  const handleVisualizationClick = useCallback(() => {
    onViewChange?.('visualization');
  }, [onViewChange]);

  const handlePerformanceClick = useCallback(() => {
    onViewChange?.('performance');
  }, [onViewChange]);

  const handleQueryHistoryClick = useCallback(() => {
    onViewChange?.('query-history');
  }, [onViewChange]);

  const handleDevToolsClick = useCallback(() => {
    onViewChange?.('dev-tools');
  }, [onViewChange]);

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

        {/* 区域2: 预留空间 - 时间范围选择器已移至查询工具栏 */}
        <div className='flex items-center gap-2 px-3 w-48'>
          {/* 时间范围选择器已移动到查询tab的工具栏中 */}
        </div>

        <div className='w-px h-6 bg-border mx-3' />

        {/* 注意：数据源、查询、可视化、监控按钮已移除，中间栏始终显示查询面板 */}
      </div>

      {/* 右侧：工具和设置 - 统一按钮尺寸，防止被挤压 */}
      <div className='flex items-center gap-1 flex-shrink-0'>
        <div className='w-px h-6 bg-border mx-3' />


        {/* 注意：扩展、历史、工具等功能已移至右侧功能面板 */}

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
