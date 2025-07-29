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
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';

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

  const loadDatabaseInfo = async () => {
    if (!activeConnectionId || !databaseName) return;

    try {
      setLoading(true);
      
      // 并行加载数据库信息
      const [statsResult, policiesResult, measurementsResult] = await Promise.allSettled([
        safeTauriInvoke('get_database_stats', {
          connection_id: activeConnectionId,
          database: databaseName,
        }),
        safeTauriInvoke('get_retention_policies', {
          connection_id: activeConnectionId,
          database: databaseName,
        }),
        safeTauriInvoke('get_measurements', {
          connection_id: activeConnectionId,
          database: databaseName,
        }),
      ]);

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      }
      
      if (policiesResult.status === 'fulfilled') {
        setRetentionPolicies(policiesResult.value || []);
      }
      
      if (measurementsResult.status === 'fulfilled') {
        setMeasurements(measurementsResult.value || []);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            数据库信息 - {databaseName}
          </DialogTitle>
          <DialogDescription>
            查看数据库的详细统计信息和配置
          </DialogDescription>
        </DialogHeader>

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
                      <Badge variant="secondary">{stats.pointCount.toLocaleString()}</Badge>
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
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={loadDatabaseInfo}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
          <Button onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DatabaseInfoDialog;
