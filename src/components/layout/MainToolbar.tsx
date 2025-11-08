import React, { useState, useMemo, useCallback } from 'react';
import {
  Button,
} from '@/components/ui';
import {
  Database,
  Settings,
  FilePlus,
  Plus,
} from 'lucide-react';
import { useConnectionStore, connectionUtils } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import SettingsModal from '@/components/common/SettingsModal';
import QuickSettings from '@/components/toolbar/QuickSettings';
import {
  TimeRange,
} from '@/components/common/TimeRangeSelector';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { useMenuTranslation } from '@/hooks/useTranslation';

interface MainToolbarProps {
  onViewChange?: (view: string) => void;
  onCreateQueryTab?: () => void;
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
  onCreateQueryTab,
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
  const { t } = useMenuTranslation();
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



  const handleQueryHistoryClick = useCallback(() => {
    onViewChange?.('query-history');
  }, [onViewChange]);

  return (
    <div className='datagrip-toolbar flex items-center justify-between w-full h-full px-1 border-0 shadow-none bg-transparent'>
      {/* 左侧功能区域 - 使用flex-shrink-0防止被挤压 */}
      <div className='flex items-center gap-1 flex-1 min-w-0'>
        {/* 区域1: 软件名称显示 - 极致紧凑 */}
        <div className='flex items-center gap-1 px-1.5 flex-shrink-0'>
          <Database className='w-3.5 h-3.5 text-primary' />
          <span className='text-xs font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent'>
            InfloWave
          </span>
        </div>

        {/* 区域2: 新建连接按钮 */}
        <Button
          variant='ghost'
          size='sm'
          className='h-8 min-w-12 px-1.5 py-0.5 flex flex-col items-center justify-center gap-0.5'
          onClick={() => {
            // 触发打开连接对话框事件
            document.dispatchEvent(new CustomEvent('open-connection-dialog'));
          }}
          title={t('toolbar.new_connection')}
        >
          <Plus className='w-3.5 h-3.5' />
          <span className='text-[10px] whitespace-nowrap'>{t('toolbar.new_connection')}</span>
        </Button>

        {/* 区域3: 新建查询按钮 */}
        <Button
          variant='ghost'
          size='sm'
          className='h-8 min-w-12 px-1.5 py-0.5 flex flex-col items-center justify-center gap-0.5'
          onClick={() => {
            onViewChange?.('query');
            onCreateQueryTab?.();
          }}
          title={t('toolbar.new_query')}
        >
          <FilePlus className='w-3.5 h-3.5' />
          <span className='text-[10px] whitespace-nowrap'>{t('toolbar.new_query')}</span>
        </Button>

        <div className='w-px h-4 bg-border mx-1.5' />


      </div>

      {/* 右侧：工具和设置 - 统一按钮尺寸，防止被挤压 */}
      <div className='flex items-center gap-0.5 flex-shrink-0'>
        <div className='w-px h-4 bg-border mx-1.5' />


        {/* 注意：扩展、历史、工具等功能已移至右侧功能面板 */}

        {/* 主题切换按钮 */}
        <ThemeToggle
          variant='ghost'
          size='sm'
          showLabel={true}
          className='h-8 min-w-12 px-1.5 py-0.5 flex flex-col items-center justify-center gap-0.5'
        />

        {/* 快速设置 - 安全和查询设置 */}
        <QuickSettings />

        {/* 设置按钮 */}
        <Button
          variant='ghost'
          size='sm'
          className='h-8 min-w-12 px-1.5 py-0.5 flex flex-col items-center justify-center gap-0.5'
          onClick={() => setSettingsVisible(true)}
          title={t('toolbar.app_settings')}

        >
          <Settings className='w-3.5 h-3.5' />
          <span className='text-[10px] whitespace-nowrap'>{t('toolbar.settings')}</span>
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
