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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Settings, 
  Hash, 
  Tag, 
  Loader2, 
  RefreshCw,
  Copy,
  Database,
  Clock,
  Shield,
  Zap,
  Info
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import type { QueryResult } from '@/types';

interface TableDesignerDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  tableName: string;
}

interface RetentionPolicy {
  name: string;
  duration: string;
  shardGroupDuration: string;
  replicaN: number;
  default: boolean;
}

interface TableDesign {
  measurement: string;
  database: string;
  fields: Array<{
    name: string;
    type: string;
    lastValue?: any;
  }>;
  tags: Array<{
    name: string;
    cardinality?: number;
    sampleValues?: string[];
  }>;
  retentionPolicies: RetentionPolicy[];
  series: {
    count: number;
    estimatedCardinality: number;
  };
  timeRange: {
    first: string;
    last: string;
    span: string;
  };
}

const TableDesignerDialog: React.FC<TableDesignerDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  tableName,
}) => {
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<TableDesign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTableDesign = async () => {
    if (!open || !connectionId || !database || !tableName) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 获取表设计信息:', { connectionId, database, tableName });

      // 获取字段信息
      const fieldsQuery = `SHOW FIELD KEYS FROM "${tableName}"`;
      const fieldsResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: { connectionId, database, query: fieldsQuery },
      });

      // 获取标签信息
      const tagsQuery = `SHOW TAG KEYS FROM "${tableName}"`;
      const tagsResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: { connectionId, database, query: tagsQuery },
      });

      // 获取保留策略
      const retentionQuery = `SHOW RETENTION POLICIES ON "${database}"`;
      const retentionResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: { connectionId, database, query: retentionQuery },
      });

      // 获取序列数量
      const seriesQuery = `SHOW SERIES FROM "${tableName}" LIMIT 1`;
      const seriesResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: { connectionId, database, query: seriesQuery },
      });

      // 获取时间范围
      const timeRangeQuery = `SELECT MIN(time) as first_time, MAX(time) as last_time FROM "${tableName}"`;
      const timeRangeResult = await safeTauriInvoke<QueryResult>('execute_query', {
        request: { connectionId, database, query: timeRangeQuery },
      });

      // 解析数据
      const fields = fieldsResult.data?.map(row => ({
        name: row[0] as string,
        type: row[1] as string,
      })) || [];

      const tags = tagsResult.data?.map(row => ({
        name: row[0] as string,
      })) || [];

      const retentionPolicies: RetentionPolicy[] = retentionResult.data?.map(row => ({
        name: row[0] as string,
        duration: row[1] as string,
        shardGroupDuration: row[2] as string,
        replicaN: parseInt(row[3] as string) || 1,
        default: (row[4] as string) === 'true',
      })) || [];

      let timeRange = {
        first: '未知',
        last: '未知',
        span: '未知',
      };

      if (timeRangeResult.data && timeRangeResult.data.length > 0) {
        const timeData = timeRangeResult.data[0];
        const firstTime = timeData[0] as string;
        const lastTime = timeData[1] as string;
        
        if (firstTime && lastTime) {
          const start = new Date(firstTime);
          const end = new Date(lastTime);
          const spanMs = end.getTime() - start.getTime();
          const spanDays = Math.round(spanMs / (1000 * 60 * 60 * 24));
          
          timeRange = {
            first: start.toLocaleString(),
            last: end.toLocaleString(),
            span: spanDays > 0 ? `${spanDays} 天` : '少于1天',
          };
        }
      }

      const tableDesign: TableDesign = {
        measurement: tableName,
        database,
        fields,
        tags,
        retentionPolicies,
        series: {
          count: seriesResult.rowCount || 0,
          estimatedCardinality: tags.length * 10, // 估算
        },
        timeRange,
      };

      setDesign(tableDesign);
      console.log('✅ 表设计信息获取成功:', tableDesign);

    } catch (err) {
      console.error('❌ 获取表设计信息失败:', err);
      setError(`获取表设计信息失败: ${err}`);
      showMessage.error(`获取表设计信息失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTableDesign();
    } else {
      setDesign(null);
      setError(null);
    }
  }, [open, connectionId, database, tableName]);

  const copyDesignToClipboard = async () => {
    if (!design) return;

    const designText = `
表设计信息
==========
表名: ${design.measurement}
数据库: ${design.database}

字段设计:
${design.fields.map(field => `  ${field.name} (${field.type})`).join('\n')}

标签设计:
${design.tags.map(tag => `  ${tag.name}`).join('\n')}

保留策略:
${design.retentionPolicies.map(rp => `  ${rp.name}: ${rp.duration} (${rp.default ? '默认' : ''})`).join('\n')}

时间范围: ${design.timeRange.first} ~ ${design.timeRange.last}
数据跨度: ${design.timeRange.span}
    `.trim();

    await writeToClipboard(designText, {
      successMessage: '表设计信息已复制到剪贴板',
      errorMessage: '复制失败',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            表设计器
          </DialogTitle>
          <DialogDescription>
            {database} / {tableName} - 查看和分析表的设计结构
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>正在分析表设计...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadTableDesign} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                重试
              </Button>
            </div>
          )}

          {design && !loading && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="schema">模式</TabsTrigger>
                <TabsTrigger value="retention">保留策略</TabsTrigger>
                <TabsTrigger value="performance">性能</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        基本信息
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">表名:</span>
                        <Badge variant="outline">{design.measurement}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">数据库:</span>
                        <Badge variant="outline">{design.database}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        时间范围
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        {design.timeRange.first}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {design.timeRange.last}
                      </div>
                      <div className="text-sm font-medium">
                        跨度: {design.timeRange.span}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {design.fields.length}
                      </div>
                      <p className="text-xs text-muted-foreground">字段数量</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {design.tags.length}
                      </div>
                      <p className="text-xs text-muted-foreground">标签数量</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-orange-600">
                        {design.retentionPolicies.length}
                      </div>
                      <p className="text-xs text-muted-foreground">保留策略</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="schema" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Hash className="w-4 h-4 text-green-500" />
                        字段 (Fields)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {design.fields.map((field, index) => (
                          <div key={index} className="flex justify-between items-center p-2 rounded border">
                            <span className="font-medium">{field.name}</span>
                            <Badge variant="outline">{field.type}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Tag className="w-4 h-4 text-orange-500" />
                        标签 (Tags)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {design.tags.map((tag, index) => (
                          <div key={index} className="flex justify-between items-center p-2 rounded border">
                            <span className="font-medium">{tag.name}</span>
                            <Badge variant="secondary">标签</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="retention" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      数据保留策略
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {design.retentionPolicies.map((rp, index) => (
                        <div key={index} className="p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{rp.name}</span>
                            {rp.default && <Badge variant="default">默认</Badge>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">保留时间:</span>
                              <span className="ml-2">{rp.duration}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">分片时间:</span>
                              <span className="ml-2">{rp.shardGroupDuration}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      性能分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded border">
                        <div className="text-lg font-bold">{design.series.count}</div>
                        <div className="text-sm text-muted-foreground">序列数量</div>
                      </div>
                      <div className="p-3 rounded border">
                        <div className="text-lg font-bold">{design.series.estimatedCardinality}</div>
                        <div className="text-sm text-muted-foreground">估算基数</div>
                      </div>
                    </div>
                    
                    <div className="p-3 rounded border bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">性能建议</span>
                      </div>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• 标签基数过高可能影响查询性能</li>
                        <li>• 建议定期清理过期数据</li>
                        <li>• 考虑优化时间范围查询</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {design && (
            <>
              <Separator />
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button onClick={loadTableDesign} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新
                  </Button>
                  <Button onClick={copyDesignToClipboard} variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    复制设计
                  </Button>
                </div>
                <Button onClick={onClose}>
                  关闭
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TableDesignerDialog;
