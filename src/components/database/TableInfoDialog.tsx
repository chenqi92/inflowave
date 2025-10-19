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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Info,
  Database,
  Loader2,
  RefreshCw,
  Copy,
  Clock,
  BarChart3,
  HardDrive,
  TrendingUp,
  Code,
  Eye,
  FileText,
  Tag
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import { useConnectionStore } from '@/store/connection';
import type { QueryResult } from '@/types';
import type { InfluxDBVersion } from '@/types/database';
import TimeSeriesLineChart from '@/components/charts/TimeSeriesLineChart';

import { logger } from '@/utils/logger';
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
  const [fields, setFields] = useState<Array<{ name: string; type: string }>>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<QueryResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [timeSeriesData, setTimeSeriesData] = useState<QueryResult | null>(null);
  const [loadingTimeSeries, setLoadingTimeSeries] = useState(false);

  // 获取连接信息以确定数据源类型
  const { getConnection } = useConnectionStore();
  const connection = getConnection(connectionId);

  const loadTableInfo = async () => {
    if (!open || !connectionId || !database || !tableName) return;

    setLoading(true);
    setError(null);

    try {
      logger.debug('获取表信息:', { connectionId, database, tableName });

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
        logger.warn('版本检测失败，使用默认InfluxDB 1.x');
        dbVersion = '1.x';
      }

      logger.debug('检测到数据源类型:', dbVersion, '连接信息:', connection);

      // 根据数据源类型生成查询
      let queries: string[];

      switch (dbVersion) {
        case '1.x':
          // InfluxDB 1.x 使用 InfluxQL
          queries = [
            `SELECT COUNT(*) FROM "${tableName}"`,
            `SHOW FIELD KEYS FROM "${tableName}"`,
            `SHOW TAG KEYS FROM "${tableName}"`,
            `SELECT * FROM "${tableName}" ORDER BY time ASC LIMIT 1`,
            `SELECT * FROM "${tableName}" ORDER BY time DESC LIMIT 1`,
            `SHOW RETENTION POLICIES ON "${database}"`,
            `SHOW SERIES FROM "${tableName}" LIMIT 1`,
          ];
          break;

        case '2.x':
        case '3.x':
          // InfluxDB 2.x/3.x 使用 Flux
          queries = [
            `from(bucket: "${database}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${tableName}") |> count()`,
            `from(bucket: "${database}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${tableName}") |> keys()`,
            `from(bucket: "${database}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${tableName}") |> first()`,
            `from(bucket: "${database}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "${tableName}") |> last()`,
          ];
          break;

        default:
          // 未知类型，使用InfluxQL作为默认
          logger.warn('未知数据源类型，使用InfluxQL作为默认');
          queries = [
            `SELECT COUNT(*) FROM "${tableName}"`,
            `SHOW FIELD KEYS FROM "${tableName}"`,
            `SHOW TAG KEYS FROM "${tableName}"`,
            `SELECT * FROM "${tableName}" ORDER BY time ASC LIMIT 1`,
            `SELECT * FROM "${tableName}" ORDER BY time DESC LIMIT 1`,
            `SHOW RETENTION POLICIES ON "${database}"`,
            `SHOW SERIES FROM "${tableName}" LIMIT 1`,
          ];
      }

      logger.debug('执行查询:', { dbVersion, queries });

      const results = await Promise.all(
        queries.map((query, index) =>
          safeTauriInvoke<QueryResult>('execute_query', {
            request: { connectionId, database, query },
          }).catch(err => {
            logger.warn(`查询失败 [${index}]: ${query}`, err);
            return null;
          })
        )
      );

      const [countResult, fieldsResult, tagsResult, firstTimeResult, lastTimeResult, retentionResult, seriesResult] = results;

      // 解析数据
      let recordCount = 0;
      logger.debug('TableInfo COUNT查询结果:', countResult);
      if (countResult?.data && countResult.data.length > 0) {
        const row = countResult.data[0];
        if (row.length > 1) {
          // COUNT查询返回的数据格式：[时间戳, count值, ...]
          recordCount = parseInt(row[1] as string) || 0;
          logger.debug('TableInfo 解析的记录数 (从索引1):', recordCount);
          logger.debug('TableInfo 完整行数据:', row);
        } else {
          // 如果只有一列，可能是纯COUNT查询
          recordCount = parseInt(row[0] as string) || 0;
          logger.debug('TableInfo 解析的记录数 (从索引0):', recordCount);
        }
      }

      const fieldCount = fieldsResult?.data?.length || 0;
      const tagCount = tagsResult?.data?.length || 0;

      // 解析字段信息
      const parsedFields: Array<{ name: string; type: string }> = [];
      if (fieldsResult?.data) {
        fieldsResult.data.forEach((row) => {
          if (row.length >= 2) {
            parsedFields.push({
              name: row[0] as string,
              type: row[1] as string,
            });
          }
        });
      }
      setFields(parsedFields);

      // 解析标签信息
      const parsedTags: string[] = [];
      if (tagsResult?.data) {
        tagsResult.data.forEach((row) => {
          if (row.length >= 1) {
            parsedTags.push(row[0] as string);
          }
        });
      }
      setTags(parsedTags);

      let firstRecord = '未知';
      let lastRecord = '未知';
      let dataSpan = '未知';
      let avgRecordsPerDay = 0;

      logger.debug('时间查询结果:', { firstTimeResult, lastTimeResult });

      // 从第一条记录获取最早时间
      let firstTime: string | undefined;
      if (firstTimeResult?.data && firstTimeResult.data.length > 0) {
        firstTime = firstTimeResult.data[0][0] as string;
        logger.debug('最早时间:', firstTime);
      }

      // 从最后一条记录获取最晚时间
      let lastTime: string | undefined;
      if (lastTimeResult?.data && lastTimeResult.data.length > 0) {
        lastTime = lastTimeResult.data[0][0] as string;
        logger.debug('最晚时间:', lastTime);
      }

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
      } else {
        logger.warn('无法获取时间范围信息');
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
      logger.info('表信息获取成功:', tableInfo);

    } catch (err) {
      logger.error('获取表信息失败:', err);
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

  const loadPreviewData = async () => {
    if (!connectionId || !database || !tableName) return;

    setLoadingPreview(true);
    try {
      const query = `SELECT * FROM "${tableName}" LIMIT 10`;
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId,
          database,
          query,
        },
      });
      setPreviewData(result);
    } catch (error: any) {
      showMessage.error(`加载预览数据失败: ${error.message || error}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const loadTimeSeriesData = async () => {
    if (!connectionId || !database || !tableName) return;

    setLoadingTimeSeries(true);
    try {
      // 查询最近1小时的数据，限制50个点
      const query = `SELECT * FROM "${tableName}" WHERE time > now() - 1h ORDER BY time DESC LIMIT 50`;
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId,
          database,
          query,
        },
      });
      setTimeSeriesData(result);
    } catch (error: any) {
      logger.error('加载时间序列数据失败:', error);
      showMessage.error(`加载时间序列数据失败: ${error.message || error}`);
    } finally {
      setLoadingTimeSeries(false);
    }
  };

  const generateQueryTemplate = async (type: 'select' | 'count' | 'aggregate' | 'groupby') => {
    let query = '';
    switch (type) {
      case 'select':
        query = `SELECT * FROM "${tableName}" WHERE time > now() - 1h LIMIT 100`;
        break;
      case 'count':
        query = `SELECT COUNT(*) FROM "${tableName}" WHERE time > now() - 1h`;
        break;
      case 'aggregate':
        if (fields.length > 0) {
          const firstField = fields[0].name;
          query = `SELECT MEAN("${firstField}"), MAX("${firstField}"), MIN("${firstField}") FROM "${tableName}" WHERE time > now() - 1h`;
        } else {
          query = `SELECT * FROM "${tableName}" WHERE time > now() - 1h`;
        }
        break;
      case 'groupby':
        if (tags.length > 0 && fields.length > 0) {
          const firstTag = tags[0];
          const firstField = fields[0].name;
          query = `SELECT MEAN("${firstField}") FROM "${tableName}" WHERE time > now() - 1h GROUP BY "${firstTag}"`;
        } else {
          query = `SELECT * FROM "${tableName}" WHERE time > now() - 1h`;
        }
        break;
    }

    try {
      await writeToClipboard(query);
      showMessage.success('查询模板已复制到剪贴板');
    } catch (error) {
      showMessage.error('复制失败');
    }
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

              {/* 平均统计 */}
              {info.avgRecordsPerDay > 0 && (
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
                        {formatNumber(info.avgRecordsPerDay)} 条/天
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 字段结构 */}
              {fields.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-500" />
                      字段结构 ({fields.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {fields.map((field, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <code className="text-xs font-mono">{field.name}</code>
                          <Badge variant="outline" className="text-xs">{field.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 标签列表 */}
              {tags.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-500" />
                      标签列表 ({tags.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 查询模板 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Code className="w-4 h-4 text-indigo-500" />
                    查询模板
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => generateQueryTemplate('select')}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      SELECT 查询
                    </Button>
                    <Button
                      onClick={() => generateQueryTemplate('count')}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      COUNT 查询
                    </Button>
                    <Button
                      onClick={() => generateQueryTemplate('aggregate')}
                      variant="outline"
                      size="sm"
                      disabled={fields.length === 0}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      聚合查询
                    </Button>
                    <Button
                      onClick={() => generateQueryTemplate('groupby')}
                      variant="outline"
                      size="sm"
                      disabled={tags.length === 0 || fields.length === 0}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      分组查询
                    </Button>
                    <Button
                      onClick={loadPreviewData}
                      variant="outline"
                      size="sm"
                      disabled={loadingPreview}
                    >
                      {loadingPreview ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3 mr-1" />
                      )}
                      数据预览
                    </Button>
                    <Button
                      onClick={loadTimeSeriesData}
                      variant="outline"
                      size="sm"
                      disabled={loadingTimeSeries}
                    >
                      {loadingTimeSeries ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      )}
                      时间序列图
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 数据预览 */}
              {previewData && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4 text-green-500" />
                      数据预览
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            {previewData.columns?.map((col, index) => (
                              <th key={index} className="text-left p-2 font-medium">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.data?.slice(0, 10).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b hover:bg-muted/50">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-2">
                                  {cell !== null && cell !== undefined ? String(cell) : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      显示前 {Math.min(10, previewData.data?.length || 0)} 条记录
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 时间序列图表 */}
              {timeSeriesData && timeSeriesData.data && timeSeriesData.data.length > 0 && (
                <TimeSeriesLineChart
                  data={timeSeriesData.data.map((row) => {
                    const dataPoint: any = {
                      time: row[0], // 第一列是时间
                    };
                    // 添加所有字段值
                    timeSeriesData.columns?.slice(1).forEach((col, index) => {
                      const value = row[index + 1];
                      // 只添加数值类型的字段
                      if (typeof value === 'number') {
                        dataPoint[col] = value;
                      }
                    });
                    return dataPoint;
                  }).reverse()} // 反转数据使时间从早到晚
                  title="时间序列数据趋势 (最近1小时)"
                  height={300}
                  showLegend={true}
                  showGrid={true}
                />
              )}

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
