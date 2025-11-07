import React from 'react';
import { AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { usePortDiscovery } from '@/hooks/usePortDiscovery';
import { Alert, AlertDescription } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Separator } from '@/components/ui';
import { toast } from 'sonner';
import { usePortTranslation } from '@/hooks/useTranslation';

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
  const { t } = usePortTranslation();
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
      toast.success(t('portChanged', { oldPort, newPort }));
      onPortChange?.(newPort, oldPort);
    },
    onPortConflict: (port, service) => {
      toast.error(t('portConflict', { port, service }));
      onPortConflict?.(port, service);
    },
    onHealthCheckFailed: (port, error) => {
      toast.error(t('healthCheckFailedPort', { port, error }));
    },
  });

  const handleRetry = async () => {
    try {
      await initializeService();
      toast.success(t('serviceReinitialized'));
    } catch (err) {
      toast.error(t('reinitializationFailed'));
    }
  };

  const handleConflictResolution = async () => {
    try {
      await handlePortConflict();
      toast.success(t('conflictResolved'));
    } catch (err) {
      toast.error(t('conflictResolutionFailed'));
    }
  };

  const handleHealthCheck = async () => {
    try {
      const healthy = await performHealthCheck();
      toast.success(healthy ? t('healthCheckPassed') : t('healthCheckFailed'));
    } catch (err) {
      toast.error(t('healthCheckFailed'));
    }
  };

  const handleRefreshStats = async () => {
    try {
      await refreshPortStats();
      toast.success(t('statsRefreshed'));
    } catch (err) {
      toast.error(t('statsRefreshFailed'));
    }
  };

  const handleCheckConflicts = async () => {
    try {
      const conflicts = await checkPortConflicts();
      if (conflicts.length > 0) {
        toast.warning(t('conflictsFound', { count: conflicts.length }));
      } else {
        toast.success(t('noConflicts'));
      }
    } catch (err) {
      toast.error(t('conflictCheckFailed'));
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
        return t('healthy');
      case 'unhealthy':
        return t('unhealthy');
      default:
        return t('checking');
    }
  };

  if (!showDetails) {
    // 简化版本，只显示端口和状态
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isInitialized ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span>{t('label')}: {currentPort}</span>
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
              {t('status')}
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>
              {t('currentPort')}: {currentPort} | {t('statusLabel')}: {getStatusText()}
            </CardDescription>
          </div>
          <Badge variant={healthStatus === 'healthy' ? 'default' : 'destructive'}>
            {isInitialized ? t('connected') : t('disconnected')}
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
                {t('retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleHealthCheck}>
            {t('healthCheck')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleConflictResolution}>
            {t('resolveConflict')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleRefreshStats}>
            {t('refreshStats')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCheckConflicts}>
            {t('checkConflicts')}
          </Button>
        </div>

        {Object.keys(portStats).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">{t('statistics')}</h4>
              <div className="space-y-2">
                {Object.entries(portStats).map(([serviceName, info]) => (
                  <div key={serviceName} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${info.is_available ? 'bg-success' : 'bg-destructive'}`} />
                      <span className="text-sm font-medium">{serviceName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('label')}: {info.port}</span>
                      <span>|</span>
                      <span>{t('statusLabel')}: {info.is_available ? t('available') : t('unavailable')}</span>
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