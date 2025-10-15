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
  Hash,
  Loader2,
  RefreshCw,
  Copy,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Info,
  Database
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import DistributionBarChart from '@/components/charts/DistributionBarChart';

interface FieldDetailDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  table: string;
  field: string;
}

interface FieldDetails {
  field: string;
  table: string;
  database: string;
  type: string;
  samples: any[];
}

interface FieldStatistics {
  field: string;
  table: string;
  database: string;
  max: any;
  min: any;
  mean: any;
  count: number;
}

interface FieldDistribution {
  field: string;
  table: string;
  database: string;
  buckets: Array<{
    min: number;
    max: number;
    count: number;
  }>;
}

const FieldDetailDialog: React.FC<FieldDetailDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  table,
  field,
}) => {
  const [details, setDetails] = useState<FieldDetails | null>(null);
  const [statistics, setStatistics] = useState<FieldStatistics | null>(null);
  const [distribution, setDistribution] = useState<FieldDistribution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFieldInfo = async () => {
    if (!connectionId || !database || !table || !field) return;

    setLoading(true);
    setError(null);

    try {
      // 并行加载详情、统计信息和分布信息
      const [detailsResult, statsResult, distributionResult] = await Promise.all([
        safeTauriInvoke<FieldDetails>('get_field_details', {
          connectionId,
          database,
          table,
          field,
        }),
        safeTauriInvoke<FieldStatistics>('get_field_statistics', {
          connectionId,
          database,
          table,
          field,
        }),
        safeTauriInvoke<FieldDistribution>('get_field_distribution', {
          connectionId,
          database,
          table,
          field,
          buckets: 15, // 使用15个桶来显示分布
        }).catch(() => null), // 分布信息可能失败（如字符串类型字段），不影响主要信息
      ]);

      setDetails(detailsResult);
      setStatistics(statsResult);
      setDistribution(distributionResult);
    } catch (err: any) {
      console.error('加载字段信息失败:', err);
      setError(err.message || '加载字段信息失败');
      showMessage.error('加载字段信息失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFieldInfo();
    } else {
      setDetails(null);
      setStatistics(null);
      setDistribution(null);
      setError(null);
    }
  }, [open, connectionId, database, table, field]);

  const copyInfoToClipboard = async () => {
    if (!details || !statistics) return;

    const infoText = `
字段信息
======
字段名: ${details.field}
表名: ${details.table}
数据库: ${details.database}
类型: ${details.type}

统计信息:
- 记录数: ${statistics.count.toLocaleString()}
- 最大值: ${formatValue(statistics.max)}
- 最小值: ${formatValue(statistics.min)}
- 平均值: ${formatValue(statistics.mean)}

示例数据:
${details.samples.map((v, i) => `${i + 1}. ${formatValue(v)}`).join('\n')}
    `.trim();

    try {
      await writeToClipboard(infoText);
      showMessage.success('字段信息已复制到剪贴板');
    } catch (err) {
      showMessage.error('复制失败');
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(value);
  };

  const getTypeColor = (type: string): string => {
    const typeMap: Record<string, string> = {
      'float': 'bg-blue-500',
      'integer': 'bg-green-500',
      'string': 'bg-purple-500',
      'boolean': 'bg-yellow-500',
    };
    return typeMap[type.toLowerCase()] || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            字段详细信息 - {field}
          </DialogTitle>
          <DialogDescription>
            查看字段的类型、统计信息和示例数据
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Info className="w-12 h-12 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={loadFieldInfo} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        ) : details && statistics ? (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">字段名:</span>
                  <Badge variant="outline" className="font-mono">{details.field}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">表名:</span>
                  <Badge variant="secondary">{details.table}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">数据库:</span>
                  <Badge variant="secondary">{details.database}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">数据类型:</span>
                  <Badge className={getTypeColor(details.type)}>{details.type}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* 统计信息 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-green-500" />
                  统计信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    记录数:
                  </span>
                  <Badge variant="outline">{statistics.count.toLocaleString()}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    最大值:
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{formatValue(statistics.max)}</code>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    最小值:
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{formatValue(statistics.min)}</code>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-3 h-3 text-blue-500" />
                    平均值:
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{formatValue(statistics.mean)}</code>
                </div>
              </CardContent>
            </Card>

            {/* 数值分布图表 */}
            {distribution && distribution.buckets && distribution.buckets.length > 0 && (
              <DistributionBarChart
                data={distribution.buckets.map((bucket, index) => ({
                  name: `${bucket.min.toFixed(1)}-${bucket.max.toFixed(1)}`,
                  value: bucket.count,
                }))}
                title="字段值分布"
                height={250}
                maxBars={15}
              />
            )}

            {/* 示例数据 */}
            {details.samples && details.samples.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-500" />
                    示例数据 (前 {details.samples.length} 条)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {details.samples.map((sample, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="w-8 text-center">{index + 1}</Badge>
                        <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                          {formatValue(sample)}
                        </code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={copyInfoToClipboard} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                复制信息
              </Button>
              <Button onClick={loadFieldInfo} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Button onClick={onClose} variant="default" size="sm">
                关闭
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default FieldDetailDialog;

