import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  Database, 
  FileText, 
  Hash, 
  Clock,
  TrendingUp,
  HardDrive,
} from 'lucide-react';

interface TableStatisticsDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  table: string;
  stats: any;
}

/**
 * 表统计分析对话框
 */
export const TableStatisticsDialog: React.FC<TableStatisticsDialogProps> = ({
  open,
  onClose,
  database,
  table,
  stats,
}) => {
  if (!stats) {
    return null;
  }

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toString();
  };

  // 根据数据库类型显示不同的统计信息
  const renderStatistics = () => {
    if (stats.type === 'InfluxDB') {
      return (
        <>
          {/* InfluxDB 统计信息 */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  总记录数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(stats.totalRecords || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  数据点总数
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  序列数量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(stats.seriesCount || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  唯一时间序列
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  字段数量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.fieldCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  数据字段
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-orange-500" />
                  标签数量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.tagCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  索引标签
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 时间范围信息 */}
          {(stats.firstRecord || stats.lastRecord) && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  时间范围
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.firstRecord && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">首条记录:</span>
                    <Badge variant="outline">{stats.firstRecord}</Badge>
                  </div>
                )}
                {stats.lastRecord && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">末条记录:</span>
                    <Badge variant="outline">{stats.lastRecord}</Badge>
                  </div>
                )}
                {stats.dataSpan && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">数据跨度:</span>
                    <Badge variant="secondary">{stats.dataSpan}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 存储信息 */}
          {stats.estimatedSize && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  存储信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">估算大小:</span>
                  <Badge variant="outline">{stats.estimatedSize}</Badge>
                </div>
                {stats.retentionPolicy && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">保留策略:</span>
                    <Badge variant="secondary">{stats.retentionPolicy}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      );
    } else if (stats.type === 'IoTDB') {
      return (
        <>
          {/* IoTDB 统计信息 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-500" />
                总记录数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(stats.totalRecords || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                时间序列数据点
              </p>
            </CardContent>
          </Card>
        </>
      );
    } else {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>暂无统计信息</p>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            表统计分析
          </DialogTitle>
          <DialogDescription>
            {database} / {table} - 统计信息
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-4">
          {renderStatistics()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TableStatisticsDialog;

