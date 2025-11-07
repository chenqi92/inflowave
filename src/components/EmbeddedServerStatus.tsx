import React, { useEffect, useState } from 'react';
import { Server, ServerOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { embeddedServerService, type ServerConfig } from '@/services/embeddedServer';
import { Alert, AlertDescription } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Separator } from '@/components/ui';
import { toast } from 'sonner';
import { useEmbeddedServerTranslation } from '@/hooks/useTranslation';
import logger from '@/utils/logger';

export interface EmbeddedServerStatusProps {
  showDetails?: boolean;
  autoInit?: boolean;
}

export const EmbeddedServerStatus: React.FC<EmbeddedServerStatusProps> = ({
  showDetails = false,
  autoInit = true,
}) => {
  const { t } = useEmbeddedServerTranslation();
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // 初始化服务
  useEffect(() => {
    if (autoInit) {
      initializeService();
    }
  }, [autoInit]);

  // 定期检查状态
  useEffect(() => {
    if (isInitialized) {
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  const initializeService = async () => {
    try {
      setLoading(true);
      await embeddedServerService.initialize();
      setIsInitialized(true);
      await checkStatus();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('initFailed');
      setError(errorMessage);
      logger.error(t('initFailed'), err);
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      await embeddedServerService.checkStatus();
      setServerPort(embeddedServerService.getServerPort());
      setIsRunning(embeddedServerService.getIsRunning());
    } catch (err) {
      logger.error(t('checkStatusFailed'), err);
    }
  };

  const handleStartServer = async () => {
    try {
      setLoading(true);
      
      // 如果未初始化，先初始化默认配置
      if (!isInitialized) {
        const config: ServerConfig = {
          enabled: true,
          preferred_port: 14222,
          port_range: [14222, 15000],
          auto_start: true,
          features: ['debug', 'proxy'],
        };
        await embeddedServerService.initServer(config);
        setIsInitialized(true);
      }
      
      const port = await embeddedServerService.startServer();
      setServerPort(port);
      setIsRunning(true);
      setError(null);
      toast.success(t('started', { port }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('startFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStopServer = async () => {
    try {
      setLoading(true);
      await embeddedServerService.stopServer();
      setServerPort(null);
      setIsRunning(false);
      setError(null);
      toast.success(t('stopped'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('stopFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRestartServer = async () => {
    try {
      setLoading(true);
      const port = await embeddedServerService.restartServer();
      setServerPort(port);
      setIsRunning(true);
      setError(null);
      toast.success(t('restarted', { port }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('restartFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (loading) {
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (isRunning) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusColor = () => {
    if (loading) return 'bg-blue-500';
    if (isRunning) return 'bg-green-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (loading) return t('processing');
    if (isRunning) return t('running');
    return t('stopped');
  };

  if (!showDetails) {
    // 简化版本，只显示端口和状态
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isRunning ? <Server className="h-4 w-4" /> : <ServerOff className="h-4 w-4" />}
        <span>{t('server')}: {serverPort || t('notStarted')}</span>
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
              {t('title')}
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>
              {isRunning ? t('runningOnPort', { port: serverPort }) : t('serverNotRunning')}
            </CardDescription>
          </div>
          <Badge variant={isRunning ? 'default' : 'destructive'}>
            {isRunning ? t('running') : t('stopped')}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={initializeService}>
                {t('retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {!isRunning ? (
            <Button size="sm" onClick={handleStartServer} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Server className="h-4 w-4 mr-2" />}
              {t('startServer')}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleStopServer} disabled={loading}>
                <ServerOff className="h-4 w-4 mr-2" />
                {t('stopServer')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleRestartServer} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('restartServer')}
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={checkStatus} disabled={loading}>
            {t('refreshStatus')}
          </Button>
        </div>

        {isRunning && serverPort && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('serverInfo')}</h4>
              <div className="bg-muted p-3 rounded text-sm">
                <div className="flex justify-between">
                  <span>{t('port')}:</span>
                  <span className="font-mono">{serverPort}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('url')}:</span>
                  <span className="font-mono">http://localhost:{serverPort}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('status')}:</span>
                  <span className="text-green-600">{t('running')}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EmbeddedServerStatus;