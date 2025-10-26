import React, { useMemo } from 'react';
import { GlideDataTable, type ColumnConfig, type DataRow } from '@/components/ui/glide-data-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExecutionHistoryRecord {
  id: string;
  timestamp: Date;
  sql: string;
  status: 'success' | 'error';
  rows?: number;
  duration?: number;
  error?: string;
  sqlType?: string;
}

interface ExecutionHistoryTabProps {
  history: ExecutionHistoryRecord[];
  className?: string;
}

/**
 * 格式化时间戳
 */
const formatTimestamp = (timestamp: Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * 格式化执行时间
 */
const formatDuration = (ms?: number): string => {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * 格式化行数
 */
const formatRows = (rows?: number): string => {
  if (rows === undefined || rows === null) return '-';
  return rows.toLocaleString('zh-CN');
};

/**
 * 截断 SQL 语句
 */
const truncateSQL = (sql: string, maxLength: number = 100): string => {
  if (sql.length <= maxLength) return sql;
  return `${sql.substring(0, maxLength)  }...`;
};

/**
 * 执行历史 Tab 组件
 * 使用 GlideDataTable 展示当前会话的 SQL 执行历史
 */
export const ExecutionHistoryTab: React.FC<ExecutionHistoryTabProps> = ({ 
  history,
  className 
}) => {
  // 转换历史记录为表格数据
  const tableData = useMemo(() => {
    return history.map((record, index) => ({
      _id: index,
      timestamp: formatTimestamp(record.timestamp),
      sql: record.sql,
      sqlTruncated: truncateSQL(record.sql),
      status: record.status,
      rows: record.rows,
      duration: record.duration,
      error: record.error,
      sqlType: record.sqlType,
    }));
  }, [history]);

  // 定义表格列
  const columns: ColumnConfig[] = useMemo(() => [
    {
      key: 'timestamp',
      title: '执行时间',
      width: 140,
      sortable: true,
      render: (value: any) => (
        <div className="flex items-center gap-1 text-xs">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: 'sqlTruncated',
      title: 'SQL 语句',
      width: 400,
      sortable: false,
      render: (value: any, row: any) => (
        <div className="font-mono text-xs" title={row.sql}>
          {value}
        </div>
      ),
    },
    {
      key: 'sqlType',
      title: '类型',
      width: 100,
      sortable: true,
      render: (value: any) => (
        value ? (
          <Badge variant="outline" className="text-xs">
            {value}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex items-center gap-1">
          {value === 'success' ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-400">成功</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-red-700 dark:text-red-400" title={row.error}>
                失败
              </span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'rows',
      title: '影响行数',
      width: 120,
      sortable: true,
      render: (value: any) => (
        <div className="flex items-center gap-1 text-xs">
          <Hash className="w-3 h-3 text-muted-foreground" />
          <span>{formatRows(value)}</span>
        </div>
      ),
    },
    {
      key: 'duration',
      title: '耗时',
      width: 100,
      sortable: true,
      render: (value: any) => (
        <div className={cn(
          'text-xs font-medium',
          value !== undefined && value > 1000 && 'text-orange-600 dark:text-orange-400',
          value !== undefined && value > 5000 && 'text-red-600 dark:text-red-400'
        )}>
          {formatDuration(value)}
        </div>
      ),
    },
  ], []);

  // 如果没有历史记录
  if (history.length === 0) {
    return (
      <div className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无执行历史</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full p-4', className)}>
      <GlideDataTable
        data={tableData}
        columns={columns}
        pagination={{
          current: 1,
          pageSize: 50,
          total: tableData.length,
        }}
        showToolbar={false}
        height={600}
      />
    </div>
  );
};

export default ExecutionHistoryTab;

