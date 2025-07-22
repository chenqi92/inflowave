import React from 'react';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { PlayCircle, Save, Wand2 } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import TimeRangeSelector, { TimeRange } from '@/components/common/TimeRangeSelector';

interface QueryToolbarProps {
  selectedConnectionId: string | null;
  selectedDatabase: string;
  selectedTimeRange?: TimeRange;
  onConnectionChange: (connectionId: string) => void;
  onDatabaseChange: (database: string) => void;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  onExecuteQuery: () => void;
  onSaveQuery: () => void;
  onFormatSQL: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const QueryToolbar: React.FC<QueryToolbarProps> = ({
  selectedConnectionId,
  selectedDatabase,
  selectedTimeRange,
  onConnectionChange,
  onDatabaseChange,
  onTimeRangeChange,
  onExecuteQuery,
  onSaveQuery,
  onFormatSQL,
  loading = false,
  disabled = false,
}) => {
  const { connections, connectionStatuses, connectedConnectionIds } = useConnectionStore();
  const { openedDatabasesList } = useOpenedDatabasesStore();

  // 获取已连接的数据源列表
  const connectedConnections = connections.filter(conn => 
    conn.id && connectedConnectionIds.includes(conn.id)
  );

  // 获取当前选择数据源的已打开数据库列表
  const currentConnectionDatabases = React.useMemo(() => {
    if (!selectedConnectionId) return [];

    // 从openedDatabases Set中过滤出属于当前连接的数据库
    const { openedDatabases } = useOpenedDatabasesStore.getState();
    const connectionDatabases: string[] = [];

    for (const key of openedDatabases) {
      if (key.startsWith(`${selectedConnectionId}/`)) {
        const database = key.substring(selectedConnectionId.length + 1);
        if (database) {
          connectionDatabases.push(database);
        }
      }
    }

    return connectionDatabases;
  }, [selectedConnectionId, openedDatabasesList]);

  // 获取连接的显示信息
  const getConnectionDisplayInfo = (conn: any) => {
    const status = conn.id ? connectionStatuses[conn.id] : null;
    const version = conn.version || 'Unknown';
    const statusIcon = status?.status === 'connected' ? '🟢' : '🔴';
    
    return {
      label: `${statusIcon} ${conn.name} (${version})`,
      value: conn.id,
      version: conn.version,
    };
  };

  // 处理数据源变化
  const handleConnectionChange = (connectionId: string) => {
    onConnectionChange(connectionId);
    // 清空数据库选择，因为数据源变了
    onDatabaseChange('');
    showMessage.info('已切换数据源，请重新选择数据库');
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-background/50">
      {/* 保存按钮 - 放在最前方，更紧凑 */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSaveQuery}
        disabled={disabled}
        className="h-6 px-1.5 flex items-center gap-1"
        title="保存到工作区 (Ctrl+S)"
      >
        <Save className="w-3 h-3" />
        <span className="text-xs">保存</span>
      </Button>

      {/* 分隔线 */}
      <div className="h-4 w-px bg-border/50" />

      {/* 数据源下拉框 - 更紧凑 */}
      <Select
        value={selectedConnectionId || ''}
        onValueChange={handleConnectionChange}
        disabled={disabled || connectedConnections.length === 0}
      >
        <SelectTrigger className="w-[140px] h-6 text-xs">
          <SelectValue
            placeholder={
              connectedConnections.length === 0
                ? '请先连接数据源'
                : '选择数据源'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {connectedConnections.map(conn => {
            const displayInfo = getConnectionDisplayInfo(conn);
            return (
              <SelectItem key={conn.id} value={conn.id!}>
                {displayInfo.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* 数据库下拉框 - 更紧凑 */}
      <Select
        value={selectedDatabase}
        onValueChange={onDatabaseChange}
        disabled={disabled || !selectedConnectionId || currentConnectionDatabases.length === 0}
      >
        <SelectTrigger className="w-[100px] h-6 text-xs">
          <SelectValue
            placeholder={
              !selectedConnectionId
                ? '请先选择数据源'
                : currentConnectionDatabases.length === 0
                ? '请先打开数据库'
                : '选择数据库'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {currentConnectionDatabases.map(db => (
            <SelectItem key={db} value={db}>
              {db}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 分隔线 */}
      <div className="h-4 w-px bg-border/50" />

      {/* 时间范围选择器 */}
      {selectedConnectionId && (
        <>
          <div className="flex-shrink-0">
            <TimeRangeSelector
              value={selectedTimeRange}
              onChange={onTimeRangeChange}
              className="scale-90 origin-left"
            />
          </div>

          {/* 分隔线 */}
          <div className="h-4 w-px bg-border/50" />
        </>
      )}

      {/* 操作按钮组 - 更紧凑 */}
      <div className="flex items-center gap-1">
        {/* 执行按钮 */}
        <Button
          size="sm"
          onClick={onExecuteQuery}
          disabled={loading || disabled || !selectedConnectionId || !selectedDatabase}
          className="h-6 px-1.5 flex items-center gap-1"
          title={
            !selectedConnectionId
              ? '执行查询 (需要选择数据源)'
              : !selectedDatabase
              ? '执行查询 (需要选择数据库)'
              : '执行查询 (Ctrl+Enter)'
          }
        >
          <PlayCircle className="w-3 h-3" />
          <span className="text-xs">{loading ? '执行中...' : '执行'}</span>
        </Button>

        {/* 美化SQL按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFormatSQL}
          disabled={disabled}
          className="h-6 px-1.5 flex items-center gap-1"
          title="格式化SQL代码"
        >
          <Wand2 className="w-3 h-3" />
          <span className="text-xs">美化</span>
        </Button>
      </div>

      {/* 右侧状态信息 - 更紧凑 */}
      <div className="flex-1" />

      {selectedConnectionId && selectedDatabase && (
        <div className="text-xs text-muted-foreground px-2 py-1 bg-muted/30 rounded">
          {connections.find(c => c.id === selectedConnectionId)?.name} / {selectedDatabase}
        </div>
      )}
    </div>
  );
};
