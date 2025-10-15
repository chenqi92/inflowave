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
  Tag,
  Loader2,
  RefreshCw,
  Copy,
  BarChart3,
  Hash,
  Info,
  Database,
  Filter
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import DistributionBarChart from '@/components/charts/DistributionBarChart';

interface TagDetailDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  table: string;
  tag: string;
}

interface TagDetails {
  tag: string;
  table: string;
  database: string;
  values: string[];
  cardinality: number;
}

interface TagDistribution {
  tag: string;
  table: string;
  database: string;
  distribution: Array<{
    value: string;
    count: number;
  }>;
}

const TagDetailDialog: React.FC<TagDetailDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  table,
  tag,
}) => {
  const [details, setDetails] = useState<TagDetails | null>(null);
  const [distribution, setDistribution] = useState<TagDistribution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllValues, setShowAllValues] = useState(false);

  const loadTagInfo = async () => {
    if (!connectionId || !database || !table || !tag) return;

    setLoading(true);
    setError(null);

    try {
      // 并行加载详情和分布信息
      const [detailsResult, distributionResult] = await Promise.all([
        safeTauriInvoke<TagDetails>('get_tag_details', {
          connectionId,
          database,
          table,
          tag,
        }),
        safeTauriInvoke<TagDistribution>('get_tag_distribution', {
          connectionId,
          database,
          table,
          tag,
        }).catch(() => null), // 分布信息可能失败，不影响主要信息
      ]);

      setDetails(detailsResult);
      setDistribution(distributionResult);
    } catch (err: any) {
      console.error('加载标签信息失败:', err);
      setError(err.message || '加载标签信息失败');
      showMessage.error('加载标签信息失败: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTagInfo();
    } else {
      setDetails(null);
      setDistribution(null);
      setError(null);
      setShowAllValues(false);
    }
  }, [open, connectionId, database, table, tag]);

  const copyInfoToClipboard = async () => {
    if (!details) return;

    const infoText = `
标签信息
======
标签名: ${details.tag}
表名: ${details.table}
数据库: ${details.database}
基数: ${details.cardinality}

所有值:
${details.values.map((v, i) => `${i + 1}. ${v}`).join('\n')}

${distribution ? `
值分布:
${distribution.distribution.map(d => `${d.value}: ${d.count.toLocaleString()} 条记录`).join('\n')}
` : ''}
    `.trim();

    try {
      await writeToClipboard(infoText);
      showMessage.success('标签信息已复制到剪贴板');
    } catch (err) {
      showMessage.error('复制失败');
    }
  };

  const generateFilterQuery = async () => {
    if (!details || details.values.length === 0) return;

    const firstValue = details.values[0];
    const query = `SELECT * FROM "${table}" WHERE "${tag}" = '${firstValue}'`;

    try {
      await writeToClipboard(query);
      showMessage.success('筛选查询已复制到剪贴板');
    } catch (err) {
      showMessage.error('复制失败');
    }
  };

  const displayedValues = showAllValues ? details?.values : details?.values.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            标签详细信息 - {tag}
          </DialogTitle>
          <DialogDescription>
            查看标签的所有可能值、基数统计和分布信息
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
            <Button onClick={loadTagInfo} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        ) : details ? (
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
                  <span className="text-sm text-muted-foreground">标签名:</span>
                  <Badge variant="outline" className="font-mono">{details.tag}</Badge>
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
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Hash className="w-3 h-3" />
                    基数 (唯一值数量):
                  </span>
                  <Badge variant="default">{details.cardinality}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* 标签值列表 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4 text-green-500" />
                  所有可能的值 ({details.values.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {displayedValues?.map((value, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 text-center">{index + 1}</Badge>
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                        {value}
                      </code>
                    </div>
                  ))}
                  {details.values.length > 10 && !showAllValues && (
                    <Button
                      onClick={() => setShowAllValues(true)}
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                    >
                      显示全部 {details.values.length} 个值
                    </Button>
                  )}
                  {showAllValues && details.values.length > 10 && (
                    <Button
                      onClick={() => setShowAllValues(false)}
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                    >
                      收起
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 值分布 */}
            {distribution && distribution.distribution.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    值分布统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {distribution.distribution.map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                          {item.value}
                        </code>
                        <Badge variant="secondary">{item.count.toLocaleString()} 条</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 值分布图表 */}
            {distribution && distribution.distribution.length > 0 && (
              <DistributionBarChart
                data={distribution.distribution.map(item => ({
                  name: item.value,
                  value: item.count,
                }))}
                title="标签值分布图"
                height={250}
                maxBars={20}
              />
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={generateFilterQuery} variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                生成筛选查询
              </Button>
              <Button onClick={copyInfoToClipboard} variant="outline" size="sm">
                <Copy className="w-4 h-4 mr-2" />
                复制信息
              </Button>
              <Button onClick={loadTagInfo} variant="outline" size="sm">
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

export default TagDetailDialog;

