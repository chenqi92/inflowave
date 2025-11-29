import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spin,
} from '@/components/ui';
import {
  Database,
  BarChart3,
  Clock,
  HardDrive,
  RefreshCw,
  Table,
  Tag,
  Copy,
  Eye,
  Code,
  Loader2,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import { useConnectionStore } from '@/store/connection';
import type { QueryResult } from '@/types';

interface DatabaseInfoDialogProps {
  open: boolean;
  onClose: () => void;
  databaseName: string;
}

interface DatabaseStats {
  measurementCount: number;
  seriesCount: number;
  pointCount: number;
  diskSize: number;
}

interface RetentionPolicy {
  name: string;
  duration: string;
  shardGroupDuration: string;
  replicaN: number;
  default: boolean;
}

const DatabaseInfoDialog: React.FC<DatabaseInfoDialogProps> = ({
  open,
  onClose,
  databaseName,
}) => {
  const { activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<QueryResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const loadDatabaseInfo = async () => {
    if (!activeConnectionId || !databaseName) return;

    try {
      setLoading(true);

      // 只调用 get_database_info，它会返回保留策略和测量列表
      // 避免重复调用 get_retention_policies 和 get_measurements
      const [infoResult, statsResult] = await Promise.allSettled([
        safeTauriInvoke('get_database_info', {
          connectionId: activeConnectionId,
          database: databaseName,
        }),
        safeTauriInvoke('get_database_stats', {
          connectionId: activeConnectionId,
          database: databaseName,
        }),
      ]);

      if (infoResult.status === 'fulfilled') {
        const info = infoResult.value as any;
        setRetentionPolicies(info.retention_policies || []);
        setMeasurements(info.measurements || []);
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      }
    } catch (error) {
      showMessage.error(`加载数据库信息失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && databaseName) {
      loadDatabaseInfo();
    }
  }, [open, databaseName, activeConnectionId]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  };

  const loadPreviewData = async () => {
    if (!activeConnectionId || !databaseName || measurements.length === 0) return;

    setLoadingPreview(true);
    try {
      // 获取第一个测量值的预览数据
      const firstMeasurement = measurements[0];
      const query = `SELECT * FROM "${firstMeasurement}" LIMIT 10`;

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId: activeConnectionId,
          database: databaseName,
          query,
        },
      });

      setPreviewData(result);
      setShowPreview(true);
    } catch (error: any) {
      showMessage.error(`加载预览数据失败: ${error.message || error}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  const generateQuery = async (type: 'select' | 'count' | 'show') => {
    if (!databaseName) return;

    let query = '';
    switch (type) {
      case 'select':
        if (measurements.length > 0) {
          query = `SELECT * FROM "${measurements[0]}" LIMIT 100`;
        } else {
          query = `SHOW MEASUREMENTS ON "${databaseName}"`;
        }
        break;
      case 'count':
        if (measurements.length > 0) {
          query = `SELECT COUNT(*) FROM "${measurements[0]}"`;
        } else {
          query = `SHOW MEASUREMENTS ON "${databaseName}"`;
        }
        break;
      case 'show':
        query = `SHOW MEASUREMENTS ON "${databaseName}"`;
        break;
    }

    try {
      await writeToClipboard(query);
      showMessage.success('查询已复制到剪贴板');
    } catch (error) {
      showMessage.error('复制失败');
    }
  };

  const copyDatabaseInfo = async () => {
    const info = `
数据库信息
========
数据库名: ${databaseName}

统计信息:
- 测量数量: ${stats?.measurementCount || 0}
- 序列数量: ${stats?.seriesCount || 0}
- 数据点数量: ${stats?.pointCount.toLocaleString() || 0}
- 磁盘使用: ${stats ? formatBytes(stats.diskSize * 1024 * 1024) : '0 B'}

保留策略:
${retentionPolicies.map(p => `- ${p.name} (${p.duration}) ${p.default ? '[默认]' : ''}`).join('\n')}

测量列表 (前20个):
${measurements.slice(0, 20).join(', ')}
${measurements.length > 20 ? `\n... 还有 ${measurements.length - 20} 个` : ''}
    `.trim();

    try {
      await writeToClipboard(info);
      showMessage.success('数据库信息已复制到剪贴板');
    } catch (error) {
      showMessage.error('复制失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            数据库信息 - {databaseName}
          </DialogTitle>
          <DialogDescription>
            查看数据库的详细统计信息和配置
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spin tip="加载中..." />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 基本统计信息 */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    统计信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-muted-foreground">测量数量:</span>
                      <Badge variant="secondary">{stats.measurementCount}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">序列数量:</span>
                      <Badge variant="secondary">{stats.seriesCount}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">数据点数量:</span>
                      <Badge variant="secondary">{stats.pointCount?.toLocaleString() || '0'}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-muted-foreground">磁盘使用:</span>
                      <Badge variant="secondary">{formatBytes(stats.diskSize * 1024 * 1024)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 保留策略 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  保留策略
                </CardTitle>
              </CardHeader>
              <CardContent>
                {retentionPolicies.length > 0 ? (
                  <div className="space-y-2">
                    {retentionPolicies.map((policy, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{policy.name}</span>
                          {policy.default && (
                            <Badge variant="default" className="text-xs">默认</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          持续时间: {policy.duration} | 分片: {policy.shardGroupDuration}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无保留策略</p>
                )}
              </CardContent>
            </Card>

            {/* 测量列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Table className="w-4 h-4" />
                  测量 ({measurements.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {measurements.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {measurements.slice(0, 20).map((measurement, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {measurement}
                      </Badge>
                    ))}
                    {measurements.length > 20 && (
                      <Badge variant="secondary" className="text-xs">
                        +{measurements.length - 20} 更多...
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无测量</p>
                )}
              </CardContent>
            </Card>

            {/* 快速查询 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-500" />
                  快速查询
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => generateQuery('select')}
                    variant="outline"
                    size="sm"
                    disabled={measurements.length === 0}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    SELECT 查询
                  </Button>
                  <Button
                    onClick={() => generateQuery('count')}
                    variant="outline"
                    size="sm"
                    disabled={measurements.length === 0}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    COUNT 查询
                  </Button>
                  <Button
                    onClick={() => generateQuery('show')}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    SHOW 查询
                  </Button>
                  <Button
                    onClick={loadPreviewData}
                    variant="outline"
                    size="sm"
                    disabled={measurements.length === 0 || loadingPreview}
                  >
                    {loadingPreview ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Eye className="w-3 h-3 mr-1" />
                    )}
                    数据预览
                  </Button>
                </div>
              </CardContent>
            </Card>

              {/* 数据预览 */}
              {showPreview && previewData && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4 text-green-500" />
                      数据预览 ({measurements[0]})
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
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copyDatabaseInfo}
              disabled={loading}
              size="sm"
            >
              <Copy className="w-4 h-4 mr-2" />
              复制信息
            </Button>
            <Button
              variant="outline"
              onClick={loadDatabaseInfo}
              disabled={loading}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
          <Button onClick={onClose} size="sm">
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseInfoDialog;
