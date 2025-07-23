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
import { useConnectionStore } from '@/store/connection';
import type { QueryResult } from '@/types';
import type { InfluxDBVersion } from '@/types/database';

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

  // 获取连接信息以确定数据源类型
  const { getConnection } = useConnectionStore();
  const connection = getConnection(connectionId);

  // 根据数据源类型生成查询语句
  const generateQueries = (tableName: string, dbType: InfluxDBVersion | undefined) => {
    console.log('🔍 检测到数据源类型:', dbType, '连接信息:', connection);

    // 根据不同的数据源类型使用不同的查询语法
    switch (dbType) {
      case '1.x':
        // InfluxDB 1.x 使用 InfluxQL
        return {
          countQueries: [
            `SELECT COUNT(*) FROM "${tableName}"`,
            `SELECT COUNT("value") FROM "${tableName}"`,
            `SHOW SERIES FROM "${tableName}"`, // 备用方法
          ],
          firstTimeQuery: `SELECT * FROM "${tableName}" ORDER BY time ASC LIMIT 1`,
          lastTimeQuery: `SELECT * FROM "${tableName}" ORDER BY time DESC LIMIT 1`,
        };

      case '2.x':
      case '3.x':
        // InfluxDB 2.x/3.x 使用 Flux
        return {
          countQueries: [
            `from(bucket: "${database}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${tableName}") |> count()`,
          ],
          firstTimeQuery: `from(bucket: "${database}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${tableName}") |> first()`,
          lastTimeQuery: `from(bucket: "${database}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${tableName}") |> last()`,
        };

      default:
        // 未知类型，尝试多种语法
        console.warn('⚠️ 未知数据源类型，尝试多种查询语法');
        return {
          countQueries: [
            `SELECT COUNT(*) FROM "${tableName}"`, // 标准SQL
            `SELECT COUNT("value") FROM "${tableName}"`, // InfluxQL
            `SHOW SERIES FROM "${tableName}"`, // InfluxDB元数据查询
          ],
          firstTimeQuery: `SELECT * FROM "${tableName}" ORDER BY time ASC LIMIT 1`,
          lastTimeQuery: `SELECT * FROM "${tableName}" ORDER BY time DESC LIMIT 1`,
        };
    }
  };

  const loadTableStats = async () => {
    if (!open || !connectionId || !database || !tableName) return;

    setLoading(true);
    setError(null);
    setStats(null); // 清除之前的数据

    try {
      // 获取数据源类型 - 修复检测逻辑
      let dbVersion: InfluxDBVersion | undefined;

      const versionStr = connection?.version as string;
      if (versionStr && typeof versionStr === 'string') {
        // 检查版本字符串
        if (versionStr === '1.x' || versionStr.includes('1.')) {
          dbVersion = '1.x';
        } else if (versionStr === '2.x' || versionStr.includes('2.')) {
          dbVersion = '2.x';
        } else if (versionStr === '3.x' || versionStr.includes('3.')) {
          dbVersion = '3.x';
        }
      }

      // 如果版本检测失败，根据dbType推断
      if (!dbVersion && connection?.dbType === 'influxdb') {
        console.warn('⚠️ 版本检测失败，使用默认InfluxDB 1.x');
        dbVersion = '1.x';
      }

      // 根据数据源类型生成查询
      const queries = generateQueries(tableName, dbVersion);

      console.log('🔍 获取表统计信息:', {
        connectionId,
        database,
        tableName,
        detectedVersion: dbVersion,
        connectionVersion: connection?.version,
        queries
      });

      // 尝试多种查询方法来获取准确的记录数
      console.log('🚀 开始执行查询...');

      let countResult: QueryResult | null = null;
      let totalRecords = 0;

      // 依次尝试不同的COUNT查询方法
      for (let i = 0; i < queries.countQueries.length; i++) {
        const query = queries.countQueries[i];
        try {
          console.log(`📊 尝试方法${i + 1} - 查询:`, query);
          const result = await safeTauriInvoke<QueryResult>('execute_query', {
            request: { connectionId, database, query },
          });
          console.log(`📊 方法${i + 1}结果:`, result);

          if (result.data && result.data.length > 0) {
            // 根据查询类型解析结果
            if (query.includes('SHOW SERIES')) {
              // SHOW SERIES 返回的是序列列表，记录数就是行数
              totalRecords = result.data.length;
              console.log(`📊 方法${i + 1}解析的序列数:`, totalRecords);
            } else {
              // COUNT查询返回的数据格式：[时间戳, count值, ...]
              // 我们需要获取第二列（索引1）的数据，而不是第一列（时间戳）
              const row = result.data[0];
              if (row.length > 1) {
                totalRecords = parseInt(row[1] as string) || 0;
                console.log(`📊 方法${i + 1}解析的记录数 (从索引1):`, totalRecords);
                console.log(`📊 方法${i + 1}完整行数据:`, row);
              } else {
                // 如果只有一列，可能是纯COUNT查询
                totalRecords = parseInt(row[0] as string) || 0;
                console.log(`📊 方法${i + 1}解析的记录数 (从索引0):`, totalRecords);
              }
            }

            if (totalRecords > 0) {
              countResult = result;
              break; // 成功获取到数据，跳出循环
            }
          }
        } catch (error) {
          console.warn(`⚠️ 方法${i + 1}失败:`, error);
          continue; // 继续尝试下一个方法
        }
      }

      // 并行执行时间范围查询
      const [firstTimeResult, lastTimeResult] = await Promise.all([
        safeTauriInvoke<QueryResult>('execute_query', {
          request: { connectionId, database, query: queries.firstTimeQuery },
        }).catch(err => {
          console.warn('⚠️ 第一条记录查询失败:', err);
          return null;
        }),
        safeTauriInvoke<QueryResult>('execute_query', {
          request: { connectionId, database, query: queries.lastTimeQuery },
        }).catch(err => {
          console.warn('⚠️ 最后一条记录查询失败:', err);
          return null;
        }),
      ]);

      let firstRecord: string | undefined;
      let lastRecord: string | undefined;

      // totalRecords已经在上面解析了
      console.log('📊 最终记录总数:', totalRecords);

      // 解析时间范围
      console.log('⏰ 第一条记录查询结果:', firstTimeResult);
      console.log('⏰ 最后一条记录查询结果:', lastTimeResult);

      // 从第一条记录获取最早时间
      if (firstTimeResult?.data && firstTimeResult.data.length > 0) {
        // 时间通常在第一列（索引0）
        firstRecord = firstTimeResult.data[0][0] as string;
        console.log('⏰ 最早记录时间:', firstRecord);
      }

      // 从最后一条记录获取最晚时间
      if (lastTimeResult?.data && lastTimeResult.data.length > 0) {
        // 时间通常在第一列（索引0）
        lastRecord = lastTimeResult.data[0][0] as string;
        console.log('⏰ 最晚记录时间:', lastRecord);
      }

      if (!firstRecord || !lastRecord) {
        console.warn('⚠️ 无法获取时间范围信息');
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

      console.log('✅ 表统计信息获取成功:', {
        tableName,
        tableStats,
      });

    } catch (err) {
      console.error('❌ 获取表统计信息失败:', err);
      setError(`获取统计信息失败: ${err}`);
      showMessage.error(`获取表统计信息失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('📊 TableStatsDialog useEffect 触发:', { open, connectionId, database, tableName });
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
