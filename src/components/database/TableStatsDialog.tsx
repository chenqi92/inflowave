import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  Clock, 
  Database, 
  Hash, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryResult } from '@/types';

interface TableStatsDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  tableName: string;
}

interface TableStats {
  totalRecords: number;
  firstRecord?: string;
  lastRecord?: string;
  timeRange?: {
    start: string;
    end: string;
    duration: string;
  };
  dataSize?: string;
  avgRecordsPerDay?: number;
}

const TableStatsDialog: React.FC<TableStatsDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  tableName,
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TableStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTableStats = async () => {
    if (!open || !connectionId || !database || !tableName) return;

    setLoading(true);
    setError(null);

    try {
      // 执行统计查询
      const countQuery = `SELECT COUNT(*) as total_records FROM "${tableName}"`;
      const timeRangeQuery = `SELECT MIN(time) as first_time, MAX(time) as last_time FROM "${tableName}"`;

      console.log('🔍 获取表统计信息:', { connectionId, database, tableName });

      // 获取记录总数
      const countResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId,
          database,
          query: countQuery,
        },
      });

      // 获取时间范围
      const timeResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId,
          database,
          query: timeRangeQuery,
        },
      });

      let totalRecords = 0;
      let firstRecord: string | undefined;
      let lastRecord: string | undefined;

      // 解析记录总数
      if (countResult.data && countResult.data.length > 0) {
        totalRecords = parseInt(countResult.data[0][0] as string) || 0;
      }

      // 解析时间范围
      if (timeResult.data && timeResult.data.length > 0) {
        const timeData = timeResult.data[0];
        firstRecord = timeData[0] as string;
        lastRecord = timeData[1] as string;
      }

      // 计算时间范围和平均记录数
      let timeRange: TableStats['timeRange'];
      let avgRecordsPerDay: number | undefined;

      if (firstRecord && lastRecord && firstRecord !== lastRecord) {
        const startTime = new Date(firstRecord);
        const endTime = new Date(lastRecord);
        const durationMs = endTime.getTime() - startTime.getTime();
        const durationDays = durationMs / (1000 * 60 * 60 * 24);

        timeRange = {
          start: startTime.toLocaleString(),
          end: endTime.toLocaleString(),
          duration: durationDays > 1 
            ? `${Math.round(durationDays)} 天` 
            : `${Math.round(durationMs / (1000 * 60 * 60))} 小时`,
        };

        if (durationDays > 0) {
          avgRecordsPerDay = Math.round(totalRecords / durationDays);
        }
      }

      const tableStats: TableStats = {
        totalRecords,
        firstRecord,
        lastRecord,
        timeRange,
        avgRecordsPerDay,
        dataSize: totalRecords > 0 ? `约 ${(totalRecords * 0.1).toFixed(1)} KB` : '0 KB', // 估算
      };

      setStats(tableStats);
      console.log('✅ 表统计信息获取成功:', tableStats);

    } catch (err) {
      console.error('❌ 获取表统计信息失败:', err);
      setError(`获取统计信息失败: ${err}`);
      showMessage.error(`获取表统计信息失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTableStats();
    } else {
      setStats(null);
      setError(null);
    }
  }, [open, connectionId, database, tableName]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            表统计信息
          </DialogTitle>
          <DialogDescription>
            {database} / {tableName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>正在获取统计信息...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadTableStats} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </div>
          )}

          {stats && !loading && (
            <div className="space-y-4">
              {/* 基本统计 */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Hash className="w-4 h-4 text-green-500" />
                      记录总数
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(stats.totalRecords)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      估算大小
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.dataSize}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 时间范围信息 */}
              {stats.timeRange && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      时间范围
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">开始时间:</span>
                      <Badge variant="outline">{stats.timeRange.start}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">结束时间:</span>
                      <Badge variant="outline">{stats.timeRange.end}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">时间跨度:</span>
                      <Badge variant="secondary">{stats.timeRange.duration}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 平均统计 */}
              {stats.avgRecordsPerDay && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      平均统计
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">平均每日记录数:</span>
                      <span className="font-semibold text-orange-600">
                        {formatNumber(stats.avgRecordsPerDay)} 条/天
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              <div className="flex justify-between">
                <Button onClick={loadTableStats} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新统计
                </Button>
                <Button onClick={onClose}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TableStatsDialog;
