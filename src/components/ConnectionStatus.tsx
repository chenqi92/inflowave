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

export interface ConnectionStatusProps {
  showDetails?: boolean;
  autoStart?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  autoStart = true,
}) => {
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
      console.error('Failed to start connection monitoring:', error);
      toast.error('连接监控启动失败');
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
      toast.success('连接已恢复');
    } else if (!state.isConnected && state.lastError) {
      toast.error(`连接失败: ${state.lastError}`);
    }
  };

  const updateStats = () => {
    const newStats = connectionResilienceService.getConnectionStats();
    setStats(newStats);
  };

  const handleForceReconnect = async () => {
    try {
      toast.info('正在强制重连...');
      await connectionResilienceService.forceReconnect();
    } catch (error) {
      toast.error('强制重连失败');
    }
  };

  const handleCheckConnection = async () => {
    try {
      const isConnected = await connectionResilienceService.checkConnection();
      toast.success(isConnected ? '连接正常' : '连接异常');
    } catch (error) {
      toast.error('连接检查失败');
    }
  };

  const getStatusIcon = () => {
    if (connectionState.isReconnecting) {
      return <RefreshCw className='h-4 w-4 animate-spin text-yellow-500' />;
    } else if (connectionState.isConnected) {
      return <Wifi className='h-4 w-4 text-green-500' />;
    } else {
      return <WifiOff className='h-4 w-4 text-red-500' />;
    }
  };

  const getStatusText = () => {
    if (connectionState.isReconnecting) {
      return '重连中';
    } else if (connectionState.isConnected) {
      return '已连接';
    } else {
      return '连接断开';
    }
  };

  const getStatusColor = () => {
    if (connectionState.isReconnecting) {
      return 'text-yellow-600';
    } else if (connectionState.isConnected) {
      return 'text-green-600';
    } else {
      return 'text-red-600';
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
    if (!timestamp) return '从未';
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
              连接状态
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>
              {getStatusText()} | 连续失败:{' '}
              {connectionState.consecutiveFailures} 次
            </CardDescription>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant={getBadgeVariant()}>{getStatusText()}</Badge>
            {isMonitoring && <Badge variant='outline'>监控中</Badge>}
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
              正在尝试重新连接...
              {connectionState.consecutiveFailures > 0 &&
                `(第 ${connectionState.consecutiveFailures} 次重试)`}
            </AlertDescription>
          </Alert>
        )}

        <div className='flex flex-wrap gap-2'>
          <Button
            size='sm'
            variant={isMonitoring ? 'destructive' : 'default'}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? '停止监控' : '开始监控'}
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={handleCheckConnection}
            disabled={connectionState.isReconnecting}
          >
            <CheckCircle className='h-4 w-4 mr-1' />
            检查连接
          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={handleForceReconnect}
            disabled={connectionState.isReconnecting}
          >
            <RefreshCw className='h-4 w-4 mr-1' />
            强制重连
          </Button>
        </div>

        <Separator />

        <div className='grid grid-cols-2 gap-4'>
          <div>
            <h4 className='text-sm font-medium mb-2'>连接统计</h4>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span>总尝试次数:</span>
                <span>{stats.totalAttempts}</span>
              </div>
              <div className='flex justify-between'>
                <span>成功率:</span>
                <span>{stats.successRate.toFixed(1)}%</span>
              </div>
              <div className='flex justify-between'>
                <span>平均延迟:</span>
                <span>{formatLatency(stats.averageLatency)}</span>
              </div>
              <div className='flex justify-between'>
                <span>最后成功:</span>
                <span>{formatTimestamp(stats.lastSuccessful)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className='text-sm font-medium mb-2'>成功率趋势</h4>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <TrendingUp className='h-4 w-4' />
                <span className='text-sm'>
                  {stats.successRate > 80
                    ? '良好'
                    : stats.successRate > 50
                      ? '一般'
                      : '较差'}
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
              <h4 className='text-sm font-medium mb-3'>最近连接记录</h4>
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
                        <span>{attempt.success ? '成功' : '失败'}</span>
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
