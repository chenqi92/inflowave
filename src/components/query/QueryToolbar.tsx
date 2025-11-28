import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, Save, Wand2 } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation('query');

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
          // 🔧 过滤掉 InfluxDB 2.x 的 organization 节点
          // organization 节点格式: org:orgName
          // bucket 节点格式: bucket:orgName/bucketName
          // 普通数据库: databaseName
          //
          // InfluxDB 2.x 中，查询必须在 bucket 级别执行，不能在 organization 级别执行
          // 因此，只显示 bucket 节点和普通数据库节点
          if (database.startsWith('org:') && !database.startsWith('bucket:')) {
            continue; // 跳过 organization 节点
          }

          connectionDatabases.push(database);
        }
      }
    }

    return connectionDatabases;
  }, [selectedConnectionId, openedDatabasesList]);

  // 获取连接的显示信息
  const getConnectionDisplayInfo = (conn: any) => {
    const status = conn.id ? connectionStatuses[conn.id] : null;
    const statusIcon = status?.status === 'connected' ? '●' : '○';
    const statusColor = status?.status === 'connected' ? 'text-green-500' : 'text-red-500';

    // 🔧 只对 InfluxDB 显示版本号，其他数据库不显示
    // InfluxDB 有多个版本 (1.x, 2.x, 3.x)，版本号对用户很重要
    // 其他数据库（IoTDB、对象存储等）不需要显示版本号
    const isInfluxDB = conn.dbType === 'influxdb';
    const version = conn.version || 'Unknown';
    const label = isInfluxDB ? `${conn.name} (${version})` : conn.name;

    return {
      label,
      value: conn.id,
      version: conn.version,
      statusIcon,
      statusColor,
    };
  };

  // 处理数据源变化
  const handleConnectionChange = (connectionId: string) => {
    onConnectionChange(connectionId);
    // 清空数据库选择，因为数据源变了
    onDatabaseChange('');
    showMessage.info('已切换数据源，请重新选择数据库');
  };

  // JetBrains New UI 风格: 36-40px 工具栏高度, 28px 按钮高度, 13px 字体
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b bg-background/50">
      {/* 保存按钮 - 放在最前方 */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSaveQuery}
        disabled={disabled}
        className="h-7 px-2 flex items-center gap-1"
        title={t('save_to_workspace')}
      >
        <Save className="w-3.5 h-3.5" />
        <span className="text-[12px]">{t('save_button')}</span>
      </Button>

      {/* 分隔线 */}
      <div className="h-4 w-px bg-border/50" />

      {/* 数据源下拉框 */}
      <Select
        value={selectedConnectionId || ''}
        onValueChange={handleConnectionChange}
        disabled={disabled || connectedConnections.length === 0}
      >
        <SelectTrigger className="min-w-[140px] w-auto h-7 text-[12px] whitespace-nowrap">
          <SelectValue
            placeholder={
              connectedConnections.length === 0
                ? t('please_connect_first')
                : t('select_datasource')
            }
          />
        </SelectTrigger>
        <SelectContent className="min-w-[200px] max-w-[400px]">
          {connectedConnections.map(conn => {
            const displayInfo = getConnectionDisplayInfo(conn);
            return (
              <SelectItem key={conn.id} value={conn.id!}>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className={`${displayInfo.statusColor} flex-shrink-0`}>{displayInfo.statusIcon}</span>
                  <span className="truncate" title={displayInfo.label}>{displayInfo.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* 数据库下拉框 */}
      <Select
        value={selectedDatabase}
        onValueChange={onDatabaseChange}
        disabled={disabled || !selectedConnectionId || currentConnectionDatabases.length === 0}
      >
        <SelectTrigger className="min-w-[140px] w-auto h-7 text-[12px] whitespace-nowrap">
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
        <SelectContent className="min-w-[120px] max-w-[300px]">
          {currentConnectionDatabases.map(db => (
            <SelectItem key={db} value={db}>
              <span className="truncate block" title={db}>{db}</span>
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

      {/* 操作按钮组 */}
      <div className="flex items-center gap-1">
        {/* 执行按钮 */}
        <Button
          size="sm"
          onClick={onExecuteQuery}
          disabled={loading || disabled || !selectedConnectionId || !selectedDatabase}
          className="h-7 px-2 flex items-center gap-1"
          title={
            !selectedConnectionId
              ? t('execute_need_datasource')
              : !selectedDatabase
              ? t('execute_need_database')
              : t('execute_query_tooltip')
          }
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span className="text-[12px]">{loading ? t('executing') : t('execute_button')}</span>
        </Button>

        {/* 美化SQL按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onFormatSQL}
          disabled={disabled}
          className="h-7 px-2 flex items-center gap-1"
          title={t('beautify_sql')}
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span className="text-[12px]">{t('beautify_button')}</span>
        </Button>
      </div>

      {/* 右侧状态信息 */}
      <div className="flex-1" />

      {selectedConnectionId && selectedDatabase && (
        <div className="text-[12px] text-muted-foreground px-2 py-0.5 bg-muted/30 rounded">
          {connections.find(c => c.id === selectedConnectionId)?.name} / {selectedDatabase}
        </div>
      )}
    </div>
  );
};
