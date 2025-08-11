import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { useConnectionRecovery } from '@/hooks/useConnectionRecovery';
import { useConnectionStore } from '@/store/connection';
import { RefreshCw, Wifi, WifiOff, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionRecoveryProps {
  className?: string;
}

export function ConnectionRecovery({ className }: ConnectionRecoveryProps) {
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(true);
  const [isManualChecking, setIsManualChecking] = useState(false);

  const {
    triggerRecoveryCheck,
    resetAllRetryCounts,
    getRetryCount,
    failedConnectionsCount,
    totalRetriesCount,
    maxAutoRetries,
  } = useConnectionRecovery({
    autoReconnect: autoRecoveryEnabled,
    checkInterval: 60000, // 1分钟
    maxAutoRetries: 3,
  });

  const { connections, connectionStatuses, attemptReconnectAll } = useConnectionStore();

  // 获取失败的连接
  const failedConnections = connections.filter(conn => {
    if (!conn.id) return false;
    const status = connectionStatuses[conn.id];
    return status && status.status === 'error';
  });

  // 获取已连接的连接
  const connectedConnections = connections.filter(conn => {
    if (!conn.id) return false;
    const status = connectionStatuses[conn.id];
    return status && status.status === 'connected';
  });

  const handleManualCheck = async () => {
    setIsManualChecking(true);
    try {
      await triggerRecoveryCheck();
    } finally {
      setIsManualChecking(false);
    }
  };

  const handleReconnectAll = async () => {
    setIsManualChecking(true);
    try {
      await attemptReconnectAll();
    } finally {
      setIsManualChecking(false);
    }
  };

  const handleResetRetries = () => {
    resetAllRetryCounts();
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          连接恢复管理
        </CardTitle>
        <CardDescription>
          自动检测和恢复失败的数据库连接
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 连接状态概览 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <Wifi className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-900 dark:text-green-100">
                已连接
              </div>
              <div className="text-lg font-bold text-green-600">
                {connectedConnections.length}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <WifiOff className="h-4 w-4 text-red-600" />
            <div>
              <div className="text-sm font-medium text-red-900 dark:text-red-100">
                连接失败
              </div>
              <div className="text-lg font-bold text-red-600">
                {failedConnectionsCount}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* 自动恢复设置 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-recovery">自动连接恢复</Label>
              <p className="text-sm text-muted-foreground">
                自动检测并尝试恢复失败的连接
              </p>
            </div>
            <Switch
              id="auto-recovery"
              checked={autoRecoveryEnabled}
              onCheckedChange={setAutoRecoveryEnabled}
            />
          </div>

          {autoRecoveryEnabled && (
            <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800">
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• 每分钟自动检查一次失败的连接</div>
                <div>• 窗口获得焦点时检查连接状态</div>
                <div>• 网络恢复时自动检查连接</div>
                <div>• 每个连接最多自动重试 {maxAutoRetries} 次</div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* 手动操作 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">手动操作</h4>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleManualCheck}
              disabled={isManualChecking}
              variant="outline"
              size="sm"
            >
              {isManualChecking ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              检查连接状态
            </Button>

            <Button
              onClick={handleReconnectAll}
              disabled={isManualChecking || failedConnectionsCount === 0}
              variant="outline"
              size="sm"
            >
              {isManualChecking ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              重连所有失败连接
            </Button>

            <Button
              onClick={handleResetRetries}
              disabled={totalRetriesCount === 0}
              variant="outline"
              size="sm"
            >
              <Clock className="h-4 w-4 mr-2" />
              重置重试计数
            </Button>
          </div>
        </div>

        {/* 失败连接详情 */}
        {failedConnections.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                失败的连接 ({failedConnections.length})
              </h4>
              
              <div className="space-y-2">
                {failedConnections.map((connection) => {
                  if (!connection.id) return null;
                  
                  const status = connectionStatuses[connection.id];
                  const retryCount = getRetryCount(connection.id);
                  
                  return (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-red-900 dark:text-red-100">
                          {connection.name}
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-300 truncate">
                          {connection.host}:{connection.port}
                        </div>
                        {status?.error && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
                            {status.error}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {retryCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            重试 {retryCount}/{maxAutoRetries}
                          </Badge>
                        )}
                        
                        {retryCount >= maxAutoRetries && (
                          <Badge variant="destructive" className="text-xs">
                            已达上限
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 统计信息 */}
        {totalRetriesCount > 0 && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground">
              总重试次数: {totalRetriesCount}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
