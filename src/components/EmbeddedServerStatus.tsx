import React, { useEffect, useState } from 'react';
import { Server, ServerOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { embeddedServerService, type ServerConfig } from '@/services/embeddedServer';
import { Alert, AlertDescription } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Separator } from '@/components/ui';
import { toast } from 'sonner';
import logger from '@/utils/logger';

export interface EmbeddedServerStatusProps {
  showDetails?: boolean;
  autoInit?: boolean;
}

export const EmbeddedServerStatus: React.FC<EmbeddedServerStatusProps> = ({
  showDetails = false,
  autoInit = true,
}) => {
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
      const errorMessage = err instanceof Error ? err.message : '初始化嵌入式服务器服务失败';
      setError(errorMessage);
      logger.error('初始化嵌入式服务器服务失败:', err);
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
      logger.error('检查嵌入式服务器状态失败:', err);
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
      toast.success(`嵌入式服务器已启动，端口: ${port}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '启动嵌入式服务器失败';
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
      toast.success('嵌入式服务器已停止');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '停止嵌入式服务器失败';
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
      toast.success(`嵌入式服务器已重启，端口: ${port}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '重启嵌入式服务器失败';
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
    if (loading) return '处理中';
    if (isRunning) return '运行中';
    return '已停止';
  };

  if (!showDetails) {
    // 简化版本，只显示端口和状态
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isRunning ? <Server className="h-4 w-4" /> : <ServerOff className="h-4 w-4" />}
        <span>服务器: {serverPort || '未启动'}</span>
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
              嵌入式服务器
              {getStatusIcon()}
            </CardTitle>
            <CardDescription>
              {isRunning ? `运行在端口: ${serverPort}` : '服务器未运行'}
            </CardDescription>
          </div>
          <Badge variant={isRunning ? 'default' : 'destructive'}>
            {isRunning ? '运行中' : '已停止'}
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
                重试
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          {!isRunning ? (
            <Button size="sm" onClick={handleStartServer} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Server className="h-4 w-4 mr-2" />}
              启动服务器
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleStopServer} disabled={loading}>
                <ServerOff className="h-4 w-4 mr-2" />
                停止服务器
              </Button>
              <Button size="sm" variant="outline" onClick={handleRestartServer} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重启服务器
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" onClick={checkStatus} disabled={loading}>
            刷新状态
          </Button>
        </div>

        {isRunning && serverPort && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">服务器信息</h4>
              <div className="bg-muted p-3 rounded text-sm">
                <div className="flex justify-between">
                  <span>端口:</span>
                  <span className="font-mono">{serverPort}</span>
                </div>
                <div className="flex justify-between">
                  <span>URL:</span>
                  <span className="font-mono">http://localhost:{serverPort}</span>
                </div>
                <div className="flex justify-between">
                  <span>状态:</span>
                  <span className="text-green-600">运行中</span>
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