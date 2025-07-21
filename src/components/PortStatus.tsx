import React from 'react';
import { AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { usePortDiscovery } from '@/hooks/usePortDiscovery';
import { Alert, AlertDescription } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Separator } from '@/components/ui';
import { toast } from 'sonner';

export interface PortStatusProps {
  showDetails?: boolean;
  onPortChange?: (newPort: number, oldPort: number) => void;
  onPortConflict?: (port: number, service: string) => void;
}

export const PortStatus: React.FC<PortStatusProps> = ({
  showDetails = false,
  onPortChange,
  onPortConflict,
}) => {
  const {
    currentPort,
    isInitialized,
    portStats,
    healthStatus,
    error,
    initializeService,
    handlePortConflict,
    performHealthCheck,
    refreshPortStats,
    checkPortConflicts,
  } = usePortDiscovery({
    autoStart: true,
    onPortChange: (newPort, oldPort) => {
      toast.success(`端口已更改: ${oldPort} → ${newPort}`);
      onPortChange?.(newPort, oldPort);
    },
    onPortConflict: (port, service) => {
      toast.error(`端口冲突: ${port} (服务: ${service})`);
      onPortConflict?.(port, service);
    },
    onHealthCheckFailed: (port, error) => {
      toast.error(`健康检查失败: 端口 ${port} - ${error}`);
    },
  });

  const handleRetry = async () => {
    try {
      await initializeService();
      toast.success('端口发现服务已重新初始化');
    } catch (err) {
      toast.error('重新初始化失败');
    }
  };

  const handleConflictResolution = async () => {
    try {
      await handlePortConflict();
      toast.success('端口冲突已解决');
    } catch (err) {
      toast.error('端口冲突解决失败');
    }
  };

  const handleHealthCheck = async () => {
    try {
      const healthy = await performHealthCheck();
      toast.success(healthy ? '健康检查通过' : '健康检查失败');
    } catch (err) {
      toast.error('健康检查失败');
    }
  };

  const handleRefreshStats = async () => {
    try {
      await refreshPortStats();
      toast.success('端口统计信息已刷新');
    } catch (err) {
      toast.error('刷新统计信息失败');
    }
  };

  const handleCheckConflicts = async () => {
    try {
      const conflicts = await checkPortConflicts();
      if (conflicts.length > 0) {
        toast.warning(`发现 ${conflicts.length} 个端口冲突`);
      } else {
        toast.success('没有发现端口冲突');
      }
    } catch (err) {
      toast.error('检查端口冲突失败');
    }
  };

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusText = () => {
    switch (healthStatus) {
      case 'healthy':
        return '健康';
      case 'unhealthy':
        return '异常';
      default:
        return '检查中';
    }
  };

  if (!showDetails) {
    // 简化版本，只显示端口和状态
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isInitialized ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span>端口: {currentPort}</span>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span>{getStatusText()}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              端口状态
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>
              当前端口: {currentPort} | 状态: {getStatusText()}
            </CardDescription>
          </div>
          <Badge variant={healthStatus === 'healthy' ? 'default' : 'destructive'}>
            {isInitialized ? '已连接' : '未连接'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={handleRetry}>
                重试
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleHealthCheck}>
            健康检查
          </Button>
          <Button size="sm" variant="outline" onClick={handleConflictResolution}>
            解决冲突
          </Button>
          <Button size="sm" variant="outline" onClick={handleRefreshStats}>
            刷新统计
          </Button>
          <Button size="sm" variant="outline" onClick={handleCheckConflicts}>
            检查冲突
          </Button>
        </div>

        {Object.keys(portStats).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">端口统计</h4>
              <div className="space-y-2">
                {Object.entries(portStats).map(([serviceName, info]) => (
                  <div key={serviceName} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${info.is_available ? 'bg-success' : 'bg-destructive'}`} />
                      <span className="text-sm font-medium">{serviceName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>端口: {info.port}</span>
                      <span>|</span>
                      <span>状态: {info.is_available ? '可用' : '不可用'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PortStatus;