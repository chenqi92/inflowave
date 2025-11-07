import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  connectionResilienceService,
  type ConnectionState,
} from '@/services/connectionResilience';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { Separator } from '@/components/ui';
import { toast } from 'sonner';
import { useConnectionsTranslation } from '@/hooks/useTranslation';
import logger from '@/utils/logger';

export interface ConnectionStatusProps {
  showDetails?: boolean;
  autoStart?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  autoStart = true,
}) => {
  const { t } = useConnectionsTranslation();
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isReconnecting: false,
    attempts: [],
    lastSuccessful: null,
    lastError: null,
    consecutiveFailures: 0,
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    successRate: 0,
    averageLatency: 0,
    lastSuccessful: null as number | null,
    consecutiveFailures: 0,
  });

  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      connectionResilienceService.cleanup();
    };
  }, [autoStart]);

  const startMonitoring = async () => {
    try {
      setIsMonitoring(true);
      connectionResilienceService.addListener(handleConnectionStateChange);
      await connectionResilienceService.startMonitoring();
      updateStats();
    } catch (error) {
      logger.error('Failed to start connection monitoring:', error);
      toast.error(t('monitoringStartFailed'));
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    connectionResilienceService.stopMonitoring();
    connectionResilienceService.removeListener(handleConnectionStateChange);
  };

  const handleConnectionStateChange = (state: ConnectionState) => {
    setConnectionState(state);
    updateStats();

    // 显示连接状态变化的通知
    if (state.isConnected && state.lastSuccessful) {
      toast.success(t('recovered'));
    } else if (!state.isConnected && state.lastError) {
      toast.error(t('connection_failed_error', { error: state.lastError }));
    }
  };

  const updateStats = () => {
    const newStats = connectionResilienceService.getConnectionStats();
    setStats(newStats);
  };

  const handleForceReconnect = async () => {
    try {
      toast.info(t('forceReconnecting'));
      await connectionResilienceService.forceReconnect();
    } catch (error) {
      toast.error(t('forceReconnectFailed'));
    }
  };

  const handleCheckConnection = async () => {
    try {
      const isConnected = await connectionResilienceService.checkConnection();
      toast.success(isConnected ? t('connection_normal') : t('connectionAbnormal'));
    } catch (error) {
      toast.error(t('checkFailed'));
    }
  };

  const getStatusIcon = () => {
    if (connectionState.isReconnecting) {
      return <RefreshCw className='h-4 w-4 animate-spin text-warning' />;
    } else if (connectionState.isConnected) {
      return <Wifi className='h-4 w-4 text-success' />;
    } else {
      return <WifiOff className='h-4 w-4 text-destructive' />;
    }
  };

  const getStatusText = () => {
    if (connectionState.isReconnecting) {
      return t('reconnecting');
    } else if (connectionState.isConnected) {
      return t('connected');
    } else {
      return t('disconnected');
    }
  };

  const getStatusColor = () => {
    if (connectionState.isReconnecting) {
      return 'text-warning';
    } else if (connectionState.isConnected) {
      return 'text-success';
    } else {
      return 'text-destructive';
    }
  };

  const getBadgeVariant = () => {
    if (connectionState.isReconnecting) {
      return 'secondary';
    } else if (connectionState.isConnected) {
      return 'default';
    } else {
      return 'destructive';
    }
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return t('never');
    return new Date(timestamp).toLocaleString();
  };

  const formatLatency = (latency: number) => {
    return latency < 1000
      ? `${Math.round(latency)}ms`
      : `${(latency / 1000).toFixed(1)}s`;
  };

  if (!showDetails) {
    return (
      <div className='flex items-center gap-2 text-sm'>
        {getStatusIcon()}
        <span className={getStatusColor()}>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <Card className='w-full'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              {t('connectionStatus')}
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>
              {getStatusText()} | {t('consecutiveFailures')}:{' '}
              {connectionState.consecutiveFailures} {t('times')}
            </CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant={getBadgeVariant()}>{getStatusText()}</Badge>
            {isMonitoring && <Badge variant='outline'>{t('monitoring')}</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {connectionState.lastError && !connectionState.isConnected && (
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>{connectionState.lastError}</AlertDescription>
          </Alert>
        )}

        {connectionState.isReconnecting && (
          <Alert>
            <RefreshCw className='h-4 w-4 animate-spin' />
            <AlertDescription>
              {t('reconnectAttempting')}
              {connectionState.consecutiveFailures > 0 &&
                `(${connectionState.consecutiveFailures} ${t('retryAttempt')})`}
            </AlertDescription>
          </Alert>
        )}

        <div className='flex flex-wrap gap-2'>
          <Button
            size='sm'
            variant={isMonitoring ? 'destructive' : 'default'}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? t('stopMonitoring') : t('startMonitoring')}
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={handleCheckConnection}
            disabled={connectionState.isReconnecting}
          >
            <CheckCircle className='h-4 w-4 mr-1' />
            {t('checkConnection')}
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={handleForceReconnect}
            disabled={connectionState.isReconnecting}
          >
            <RefreshCw className='h-4 w-4 mr-1' />
            {t('forceReconnect')}
          </Button>
        </div>

        <Separator />

        <div className='grid grid-cols-2 gap-4'>
          <div>
            <h4 className='text-sm font-medium mb-2'>{t('statistics')}</h4>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>{t('totalAttempts')}:</span>
                <span>{stats.totalAttempts}</span>
              </div>
              <div className='flex justify-between'>
                <span>{t('successRate')}:</span>
                <span>{stats.successRate.toFixed(1)}%</span>
              </div>
              <div className='flex justify-between'>
                <span>{t('averageLatency')}:</span>
                <span>{formatLatency(stats.averageLatency)}</span>
              </div>
              <div className='flex justify-between'>
                <span>{t('lastSuccessful')}:</span>
                <span>{formatTimestamp(stats.lastSuccessful)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className='text-sm font-medium mb-2'>{t('successRateTrend')}</h4>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4' />
                <span className='text-sm'>
                  {stats.successRate > 80
                    ? t('good')
                    : stats.successRate > 50
                      ? t('fair')
                      : t('poor')}
                </span>
              </div>
              <Progress value={stats.successRate} className='h-2' />
            </div>
          </div>
        </div>

        {connectionState.attempts.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className='text-sm font-medium mb-3'>{t('recentRecords')}</h4>
              <div className='space-y-1 max-h-32 overflow-y-auto'>
                {connectionState.attempts
                  .slice(-10)
                  .reverse()
                  .map((attempt, index) => (
                    <div
                      key={index}
                      className='flex items-center justify-between text-xs p-2 bg-muted rounded'
                    >
                      <div className='flex items-center gap-2'>
                        {attempt.success ? (
                          <CheckCircle className='h-3 w-3 text-green-500' />
                        ) : (
                          <AlertTriangle className='h-3 w-3 text-red-500' />
                        )}
                        <span>{attempt.success ? t('success') : t('failed')}</span>
                      </div>
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        {attempt.latency && (
                          <span>{formatLatency(attempt.latency)}</span>
                        )}
                        <Clock className='h-3 w-3' />
                        <span>
                          {new Date(attempt.timestamp).toLocaleTimeString()}
                        </span>
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

export default ConnectionStatus;
