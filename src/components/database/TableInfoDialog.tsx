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
  Info, 
  Database, 
  Calendar, 
  Loader2, 
  RefreshCw,
  Copy,
  FileText,
  Clock,
  BarChart3,
  HardDrive,
  Activity
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import type { QueryResult } from '@/types';

interface TableInfoDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  tableName: string;
}

interface TableInfo {
  name: string;
  database: string;
  recordCount: number;
  fieldCount: number;
  tagCount: number;
  firstRecord: string;
  lastRecord: string;
  dataSpan: string;
  estimatedSize: string;
  avgRecordsPerDay: number;
  retentionPolicy: string;
  createdTime?: string;
  lastModified?: string;
  seriesCount: number;
  cardinality: number;
}

const TableInfoDialog: React.FC<TableInfoDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  tableName,
}) => {
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<TableInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTableInfo = async () => {
    if (!open || !connectionId || !database || !tableName) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 获取表信息:', { connectionId, database, tableName });

      // 并行执行多个查询以获取完整信息
      const queries = [
        // 记录总数
        `SELECT COUNT(*) as count FROM "${tableName}"`,
        // 字段信息
        `SHOW FIELD KEYS FROM "${tableName}"`,
        // 标签信息
        `SHOW TAG KEYS FROM "${tableName}"`,
        // 时间范围
        `SELECT MIN(time) as first_time, MAX(time) as last_time FROM "${tableName}"`,
        // 保留策略
        `SHOW RETENTION POLICIES ON "${database}"`,
        // 序列信息
        `SHOW SERIES FROM "${tableName}" LIMIT 1`,
      ];

      const results = await Promise.all(
        queries.map(query =>
          safeTauriInvoke<QueryResult>('execute_query', {
            request: { connectionId, database, query },
          }).catch(err => {
            console.warn(`查询失败: ${query}`, err);
            return null;
          })
        )
      );

      const [countResult, fieldsResult, tagsResult, timeResult, retentionResult, seriesResult] = results;

      // 解析数据
      let recordCount = 0;
      if (countResult?.data && countResult.data.length > 0) {
        recordCount = parseInt(countResult.data[0][0] as string) || 0;
      }

      const fieldCount = fieldsResult?.data?.length || 0;
      const tagCount = tagsResult?.data?.length || 0;

      let firstRecord = '未知';
      let lastRecord = '未知';
      let dataSpan = '未知';
      let avgRecordsPerDay = 0;

      if (timeResult?.data && timeResult.data.length > 0) {
        const timeData = timeResult.data[0];
        const firstTime = timeData[0] as string;
        const lastTime = timeData[1] as string;

        if (firstTime && lastTime) {
          const start = new Date(firstTime);
          const end = new Date(lastTime);
          const spanMs = end.getTime() - start.getTime();
          const spanDays = spanMs / (1000 * 60 * 60 * 24);

          firstRecord = start.toLocaleString();
          lastRecord = end.toLocaleString();
          dataSpan = spanDays > 1 
            ? `${Math.round(spanDays)} 天` 
            : `${Math.round(spanMs / (1000 * 60 * 60))} 小时`;

          if (spanDays > 0) {
            avgRecordsPerDay = Math.round(recordCount / spanDays);
          }
        }
      }

      // 获取默认保留策略
      let retentionPolicy = '默认';
      if (retentionResult?.data && retentionResult.data.length > 0) {
        const defaultPolicy = retentionResult.data.find(row => row[4] === 'true');
        if (defaultPolicy) {
          retentionPolicy = `${defaultPolicy[0]} (${defaultPolicy[1]})`;
        }
      }

      const seriesCount = seriesResult?.rowCount || 0;
      const estimatedSize = recordCount > 0 ? `约 ${(recordCount * 0.1).toFixed(1)} KB` : '0 KB';
      const cardinality = tagCount * 10; // 估算基数

      const tableInfo: TableInfo = {
        name: tableName,
        database,
        recordCount,
        fieldCount,
        tagCount,
        firstRecord,
        lastRecord,
        dataSpan,
        estimatedSize,
        avgRecordsPerDay,
        retentionPolicy,
        seriesCount,
        cardinality,
        lastModified: new Date().toLocaleString(), // 当前时间作为最后检查时间
      };

      setInfo(tableInfo);
      console.log('✅ 表信息获取成功:', tableInfo);

    } catch (err) {
      console.error('❌ 获取表信息失败:', err);
      setError(`获取表信息失败: ${err}`);
      showMessage.error(`获取表信息失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTableInfo();
    } else {
      setInfo(null);
      setError(null);
    }
  }, [open, connectionId, database, tableName]);

  const copyInfoToClipboard = async () => {
    if (!info) return;

    const infoText = `
表信息
======
表名: ${info.name}
数据库: ${info.database}

数据统计:
- 记录总数: ${info.recordCount.toLocaleString()} 条
- 字段数量: ${info.fieldCount} 个
- 标签数量: ${info.tagCount} 个
- 序列数量: ${info.seriesCount} 个

时间信息:
- 首条记录: ${info.firstRecord}
- 末条记录: ${info.lastRecord}
- 数据跨度: ${info.dataSpan}
- 平均每日: ${info.avgRecordsPerDay.toLocaleString()} 条

存储信息:
- 估算大小: ${info.estimatedSize}
- 保留策略: ${info.retentionPolicy}
- 基数估算: ${info.cardinality}

检查时间: ${info.lastModified}
    `.trim();

    await writeToClipboard(infoText, {
      successMessage: '表信息已复制到剪贴板',
      errorMessage: '复制失败',
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            表信息
          </DialogTitle>
          <DialogDescription>
            {database} / {tableName} - 详细信息和统计数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>正在获取表信息...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadTableInfo} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </div>
          )}

          {info && !loading && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    基本信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">表名:</span>
                    <Badge variant="outline">{info.name}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">数据库:</span>
                    <Badge variant="outline">{info.database}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">保留策略:</span>
                    <Badge variant="secondary">{info.retentionPolicy}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 数据统计 */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      记录统计
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(info.recordCount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      总记录数
                    </div>
                    {info.avgRecordsPerDay > 0 && (
                      <div className="text-sm text-muted-foreground">
                        平均 {formatNumber(info.avgRecordsPerDay)} 条/天
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-500" />
                      存储信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold text-purple-600">
                      {info.estimatedSize}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      估算大小
                    </div>
                    <div className="text-sm text-muted-foreground">
                      基数: {formatNumber(info.cardinality)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 结构信息 */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {info.fieldCount}
                    </div>
                    <p className="text-xs text-muted-foreground">字段数量</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">
                      {info.tagCount}
                    </div>
                    <p className="text-xs text-muted-foreground">标签数量</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {info.seriesCount}
                    </div>
                    <p className="text-xs text-muted-foreground">序列数量</p>
                  </CardContent>
                </Card>
              </div>

              {/* 时间信息 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    时间信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">首条记录:</span>
                    <Badge variant="outline" className="text-xs">{info.firstRecord}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">末条记录:</span>
                    <Badge variant="outline" className="text-xs">{info.lastRecord}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">数据跨度:</span>
                    <Badge variant="secondary">{info.dataSpan}</Badge>
                  </div>
                  {info.lastModified && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">检查时间:</span>
                      <span className="text-xs text-muted-foreground">{info.lastModified}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Separator />

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button onClick={loadTableInfo} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新
                  </Button>
                  <Button onClick={copyInfoToClipboard} variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    复制信息
                  </Button>
                </div>
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

export default TableInfoDialog;
