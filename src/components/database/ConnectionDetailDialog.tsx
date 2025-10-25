import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
      console.error('加载连接信息失败:', err);
      setError(err.message || '加载连接信息失败');
      showMessage.error(`加载连接信息失败: ${err.message || '未知错误'}`);
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
连接信息
======
名称: ${info.name}
类型: ${info.dbType}
主机: ${info.host}
端口: ${info.port}
用户名: ${info.username}
状态: ${info.status?.status || '未知'}

服务器信息:
- 类型: ${info.serverInfo?.type || '未知'}
- 版本: ${info.serverInfo?.version || '未知'}

创建时间: ${info.createdAt || '未知'}
更新时间: ${info.updatedAt || '未知'}
    `.trim();

    try {
      await writeToClipboard(infoText);
      showMessage.success('连接信息已复制到剪贴板');
    } catch (err) {
      showMessage.error('复制失败');
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
        type: info.serverInfo?.type || '未知',
        version: info.serverInfo?.version || '未知',
      },
      note: '此配置不包含密码等敏感信息，请在导入后手动配置认证信息',
    };

    const configText = JSON.stringify(shareableConfig, null, 2);

    try {
      await writeToClipboard(configText);
      showMessage.success('连接配置已复制到剪贴板（JSON格式）');
    } catch (err) {
      showMessage.error('复制失败');
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
    if (!info?.status) return <Badge variant="secondary">未知</Badge>;
    
    switch (info.status.status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">已连接</Badge>;
      case 'connecting':
        return <Badge variant="default" className="bg-yellow-600">连接中</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">未连接</Badge>;
      case 'error':
        return <Badge variant="destructive">错误</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            连接详细信息
          </DialogTitle>
          <DialogDescription>
            查看连接的详细配置和状态信息
          </DialogDescription>
        </DialogHeader>

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
              重试
            </Button>
          </div>
        ) : info ? (
          <div className="space-y-4">
            {/* 基本信息 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">连接名称:</span>
                  <Badge variant="outline" className="font-mono">{info.name}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">数据库类型:</span>
                  <Badge variant="secondary">{getDatabaseTypeLabel(info.dbType)}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">连接ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{info.id}</code>
                </div>
              </CardContent>
            </Card>

            {/* 连接配置 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Link className="w-4 h-4 text-purple-500" />
                  连接配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    主机地址:
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{info.host}</code>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Server className="w-3 h-3" />
                    端口:
                  </span>
                  <Badge variant="outline">{info.port}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-3 h-3" />
                    用户名:
                  </span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{info.username}</code>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Key className="w-3 h-3" />
                    完整URL:
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
                  连接状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    {getStatusIcon()}
                    当前状态:
                  </span>
                  {getStatusBadge()}
                </div>
                {info.status?.message && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">状态消息:</span>
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
                        最后检查:
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
                    服务器信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">服务器类型:</span>
                    <Badge variant="secondary">{info.serverInfo.type}</Badge>
                  </div>
                  {info.serverInfo.version && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">版本:</span>
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
                  时间信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {info.createdAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">创建时间:</span>
                    <span className="text-xs">{new Date(info.createdAt).toLocaleString()}</span>
                  </div>
                )}
                {info.updatedAt && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">更新时间:</span>
                      <span className="text-xs">{new Date(info.updatedAt).toLocaleString()}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <div className="flex justify-between items-center gap-2 pt-2">
              <Button onClick={shareConnectionConfig} variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                分享配置
              </Button>
              <div className="flex gap-2">
                <Button onClick={copyInfoToClipboard} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  复制信息
                </Button>
                <Button onClick={loadConnectionInfo} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
                <Button onClick={onClose} variant="default" size="sm">
                  关闭
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionDetailDialog;

