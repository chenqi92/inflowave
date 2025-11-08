import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Server,
  Database,
  Loader2,
  RefreshCw,
  Copy,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  Info,
  Shield,
  Link,
  User,
  Key,
  Globe,
  Share2
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import logger from '@/utils/logger';
import { useConnectionsTranslation } from '@/hooks/useTranslation';

interface ConnectionDetailDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
}

interface ConnectionInfo {
  id: string;
  name: string;
  dbType: string;
  host: string;
  port: number;
  username: string;
  status: {
    status: string;
    message?: string;
    lastChecked?: string;
  } | null;
  serverInfo: {
    type: string;
    version?: string;
    diagnostics?: any;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

const ConnectionDetailDialog: React.FC<ConnectionDetailDialogProps> = ({
  open,
  onClose,
  connectionId,
}) => {
  const { t: tConn } = useConnectionsTranslation();
  const [info, setInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConnectionInfo = async () => {
    if (!connectionId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await safeTauriInvoke<ConnectionInfo>('get_connection_info', {
        connectionId,
      });

      setInfo(result);
    } catch (err: any) {
      logger.error('加载连接信息失败:', err);
      setError(err.message || tConn('connectionDetail.loadFailed'));
      showMessage.error(tConn('connectionDetail.loadFailedWithError', { error: err.message || tConn('connectionDetail.unknownError') }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadConnectionInfo();
    } else {
      setInfo(null);
      setError(null);
    }
  }, [open, connectionId]);

  const copyInfoToClipboard = async () => {
    if (!info) return;

    const infoText = `
${tConn('connectionDetail.copyTemplate.title')}
======
${tConn('connectionDetail.copyTemplate.name')}: ${info.name}
${tConn('connectionDetail.copyTemplate.type')}: ${info.dbType}
${tConn('connectionDetail.copyTemplate.host')}: ${info.host}
${tConn('connectionDetail.copyTemplate.port')}: ${info.port}
${tConn('connectionDetail.copyTemplate.username')}: ${info.username}
${tConn('connectionDetail.copyTemplate.status')}: ${info.status?.status || tConn('connectionDetail.unknown')}

${tConn('connectionDetail.copyTemplate.serverInfoTitle')}:
- ${tConn('connectionDetail.copyTemplate.serverType')}: ${info.serverInfo?.type || tConn('connectionDetail.unknown')}
- ${tConn('connectionDetail.copyTemplate.serverVersion')}: ${info.serverInfo?.version || tConn('connectionDetail.unknown')}

${tConn('connectionDetail.copyTemplate.createdAt')}: ${info.createdAt || tConn('connectionDetail.unknown')}
${tConn('connectionDetail.copyTemplate.updatedAt')}: ${info.updatedAt || tConn('connectionDetail.unknown')}
    `.trim();

    try {
      await writeToClipboard(infoText);
      showMessage.success(tConn('connectionDetail.copySuccess'));
    } catch (_err) {
      showMessage.error(tConn('connectionDetail.copyFailed'));
    }
  };

  const shareConnectionConfig = async () => {
    if (!info) return;

    // 创建可分享的连接配置（不包含敏感信息）
    const shareableConfig = {
      name: info.name,
      dbType: info.dbType,
      host: info.host,
      port: info.port,
      username: info.username,
      // 不包含密码、token等敏感信息
      serverInfo: {
        type: info.serverInfo?.type || tConn('connectionDetail.unknown'),
        version: info.serverInfo?.version || tConn('connectionDetail.unknown'),
      },
      note: tConn('connectionDetail.shareNote'),
    };

    const configText = JSON.stringify(shareableConfig, null, 2);

    try {
      await writeToClipboard(configText);
      showMessage.success(tConn('connectionDetail.shareSuccess'));
    } catch (_err) {
      showMessage.error(tConn('connectionDetail.copyFailed'));
    }
  };

  const getStatusIcon = () => {
    if (!info?.status) return <WifiOff className="w-4 h-4 text-gray-500" />;
    
    switch (info.status.status) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-gray-500" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    if (!info?.status) return <Badge variant="secondary">{tConn('connectionDetail.statusUnknown')}</Badge>;

    switch (info.status.status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">{tConn('connectionDetail.statusConnected')}</Badge>;
      case 'connecting':
        return <Badge variant="default" className="bg-yellow-600">{tConn('connectionDetail.statusConnecting')}</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">{tConn('connectionDetail.statusDisconnected')}</Badge>;
      case 'error':
        return <Badge variant="destructive">{tConn('connectionDetail.statusError')}</Badge>;
      default:
        return <Badge variant="secondary">{tConn('connectionDetail.statusUnknown')}</Badge>;
    }
  };

  const getDatabaseTypeLabel = (dbType: string) => {
    const typeMap: Record<string, string> = {
      'influxdb1': 'InfluxDB 1.x',
      'influxdb2': 'InfluxDB 2.x',
      'influxdb3': 'InfluxDB 3.x',
      'iotdb': 'IoTDB',
    };
    return typeMap[dbType] || dbType;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" size="2xl" className="flex flex-col p-0 overflow-hidden">
        {/* 固定头部 */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              {tConn('connectionDetail.title')}
            </SheetTitle>
            <SheetDescription>
              {tConn('connectionDetail.description')}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* 可滚动内容区域 */}
        <div className="flex-1 overflow-y-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Info className="w-12 h-12 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={loadConnectionInfo} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                {tConn('connectionDetail.retry')}
              </Button>
            </div>
          ) : info ? (
            <div className="space-y-4 pb-4">
            {/* 基本信息 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  {tConn('connectionDetail.basicInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{tConn('connectionDetail.connectionName')}</span>
                  <Badge variant="outline" className="font-mono">{info.name}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{tConn('connectionDetail.databaseType')}</span>
                  <Badge variant="secondary">{getDatabaseTypeLabel(info.dbType)}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{tConn('connectionDetail.connectionId')}</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{info.id}</code>
                </div>
              </CardContent>
            </Card>

            {/* 连接配置 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link className="w-4 h-4 text-purple-500" />
                  {tConn('connectionDetail.connectionConfig')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    {tConn('connectionDetail.hostAddress')}
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{info.host}</code>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Server className="w-3 h-3" />
                    {tConn('connectionDetail.port')}
                  </span>
                  <Badge variant="outline">{info.port}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {tConn('connectionDetail.username')}
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{info.username}</code>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Key className="w-3 h-3" />
                    {tConn('connectionDetail.fullUrl')}
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded max-w-md truncate">
                    {`${info.host}:${info.port}`}
                  </code>
                </div>
              </CardContent>
            </Card>

            {/* 连接状态 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  {tConn('connectionDetail.connectionStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    {getStatusIcon()}
                    {tConn('connectionDetail.currentStatus')}
                  </span>
                  {getStatusBadge()}
                </div>
                {info.status?.message && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">{tConn('connectionDetail.statusMessage')}</span>
                      <span className="text-xs text-right max-w-md">{info.status.message}</span>
                    </div>
                  </>
                )}
                {info.status?.lastChecked && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {tConn('connectionDetail.lastChecked')}
                      </span>
                      <span className="text-xs">{new Date(info.status.lastChecked).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 服务器信息 */}
            {info.serverInfo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-500" />
                    {tConn('connectionDetail.serverInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{tConn('connectionDetail.serverType')}</span>
                    <Badge variant="secondary">{info.serverInfo.type}</Badge>
                  </div>
                  {info.serverInfo.version && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{tConn('connectionDetail.version')}</span>
                        <Badge variant="outline">{info.serverInfo.version}</Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 时间信息 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  {tConn('connectionDetail.timeInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {info.createdAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{tConn('connectionDetail.createdAt')}</span>
                    <span className="text-xs">{new Date(info.createdAt).toLocaleString()}</span>
                  </div>
                )}
                {info.updatedAt && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{tConn('connectionDetail.updatedAt')}</span>
                      <span className="text-xs">{new Date(info.updatedAt).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            </div>
          ) : null}
        </div>

        {/* 固定底部按钮区域 */}
        {info && !loading && !error && (
          <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
            <div className="flex justify-between items-center gap-2">
              <Button onClick={shareConnectionConfig} variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                {tConn('connectionDetail.shareConfig')}
              </Button>
              <div className="flex gap-2">
                <Button onClick={loadConnectionInfo} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {tConn('connectionDetail.refresh')}
                </Button>
                <Button onClick={onClose} variant="default" size="sm">
                  {tConn('connectionDetail.close')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ConnectionDetailDialog;

