import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Activity, Zap } from 'lucide-react';
import { healthCheckService, type SystemHealthStatus, type HealthCheckResult } from '@/services/healthCheck';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export interface HealthCheckProps {
  showDetails?: boolean;
  autoStart?: boolean;
  interval?: number;
}

export const HealthCheck: React.FC<HealthCheckProps> = ({
  showDetails = true,
  autoStart = true,
  interval = 30000,
}) => {
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus>({
    overall: 'unknown',
    checks: [],
    timestamp: Date.now(),
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isManualCheck, setIsManualCheck] = useState(false);

  useEffect(() => {
    if (autoStart) {
      startHealthCheck();
    }

    return () => {
      healthCheckService.cleanup();
    };
  }, [autoStart, interval]);

  const startHealthCheck = () => {
    setIsRunning(true);
    healthCheckService.startHealthCheck(interval);
    healthCheckService.addListener(handleHealthStatusUpdate);
  };

  const stopHealthCheck = () => {
    setIsRunning(false);
    healthCheckService.stopHealthCheck();
    healthCheckService.removeListener(handleHealthStatusUpdate);
  };

  const handleHealthStatusUpdate = (status: SystemHealthStatus) => {
    setHealthStatus(status);
    
    // 如果整体状态变为不健康，显示通知
    if (status.overall === 'unhealthy') {
      const unhealthyComponents = status.checks
        .filter(c => c.status === 'unhealthy')
        .map(c => c.component)
        .join(', ');
      
      toast.error(`系统健康检查异常: ${unhealthyComponents}`);
    }
  };

  const handleManualCheck = async () => {
    setIsManualCheck(true);
    try {
      const status = await healthCheckService.performHealthCheck();
      setHealthStatus(status);
      toast.success('健康检查完成');
    } catch (error) {
      toast.error('健康检查失败');
    } finally {
      setIsManualCheck(false);
    }
  };

  const getStatusIcon = (status: 'healthy' | 'unhealthy' | 'unknown') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'unhealthy' | 'unknown') => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusText = (status: 'healthy' | 'unhealthy' | 'unknown' | 'degraded') => {
    switch (status) {
      case 'healthy':
        return '健康';
      case 'unhealthy':
        return '异常';
      case 'degraded':
        return '降级';
      default:
        return '未知';
    }
  };

  const getStatusBadgeVariant = (status: 'healthy' | 'unhealthy' | 'unknown' | 'degraded') => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'unhealthy':
        return 'destructive';
      case 'degraded':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatLatency = (latency?: number) => {
    if (!latency) return '-';
    return latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {getStatusIcon(healthStatus.overall === 'degraded' ? 'unhealthy' : healthStatus.overall)}
        <span className={getStatusColor(healthStatus.overall === 'degraded' ? 'unhealthy' : healthStatus.overall)}>
          {getStatusText(healthStatus.overall)}
        </span>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              系统健康检查
              {getStatusIcon(healthStatus.overall === 'degraded' ? 'unhealthy' : healthStatus.overall)}
            </CardTitle>
            <CardDescription>
              整体状态: {getStatusText(healthStatus.overall)} | 
              最后更新: {formatTimestamp(healthStatus.timestamp)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(healthStatus.overall)}>
              {getStatusText(healthStatus.overall)}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleManualCheck}
              disabled={isManualCheck}
            >
              {isManualCheck ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {healthStatus.overall === 'unhealthy' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              系统检测到异常状态，请检查以下组件并采取相应措施。
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isRunning ? 'destructive' : 'default'}
            onClick={isRunning ? stopHealthCheck : startHealthCheck}
          >
            {isRunning ? '停止监控' : '开始监控'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {isRunning ? '自动监控已开启' : '自动监控已关闭'}
          </span>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">组件状态详情</h4>
          
          {healthStatus.checks.map((check, index) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  <span className="font-medium">{check.component}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {check.latency && (
                    <>
                      <Zap className="h-3 w-3" />
                      <span>{formatLatency(check.latency)}</span>
                    </>
                  )}
                  <Badge variant={getStatusBadgeVariant(check.status)} size="sm">
                    {getStatusText(check.status)}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
              
              {check.details && (
                <div className="text-xs text-muted-foreground">
                  <details className="cursor-pointer">
                    <summary className="hover:text-foreground">详细信息</summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                      {JSON.stringify(check.details, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))}
        </div>

        {healthStatus.checks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无健康检查数据</p>
            <p className="text-sm">点击"刷新"按钮开始检查</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthCheck;