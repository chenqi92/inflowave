import React, { useState, useEffect } from 'react';
import {
  Button,
  DataTable,
  Alert,
  AlertTitle,
  AlertDescription,
  Text,
  CodeBlock,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
  Badge,
  ScrollArea,
} from '@/components/ui';
import { Bug, RefreshCw, Info, AlertTriangle, XCircle } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';

interface DebugInfo {
  frontendConnections: any[];
  backendConnections: any[];
  connectionStatuses: any;
  activeconnection_id: string | null;
  backendDebugInfo?: any;
}

const ConnectionDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  const { connections, connectionStatuses, activeconnection_id } =
    useConnectionStore();

  // 自动刷新调试信息
  useEffect(() => {
    if (autoRefreshEnabled && debugInfo) {
      const interval = setInterval(() => {
        collectDebugInfo();
      }, 10000); // 每10秒刷新一次
      return () => clearInterval(interval);
    }
  }, [autoRefreshEnabled, debugInfo]);

  // 初始化时自动收集一次调试信息
  useEffect(() => {
    collectDebugInfo();
  }, []);

  const collectDebugInfo = async () => {
    setLoading(true);
    try {
      // 获取后端连接信息
      const backendConnections =
        await safeTauriInvoke<any[]>('get_connections');
      const backendDebugInfo = await safeTauriInvoke<any>(
        'debug_connection_manager'
      );

      const info: DebugInfo = {
        frontendConnections: (connections || []).filter(conn => conn != null),
        backendConnections: (backendConnections || []).filter(
          conn => conn != null
        ),
        connectionStatuses: connectionStatuses || {},
        activeconnection_id,
        backendDebugInfo,
      };

      setDebugInfo(info);
    } catch (error) {
      console.error('收集调试信息失败:', error);
      // Set empty debug info on error to prevent undefined access
      setDebugInfo({
        frontendConnections: [],
        backendConnections: [],
        connectionStatuses: {},
        activeconnection_id: null,
        backendDebugInfo: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const findMismatchedConnections = () => {
    if (!debugInfo) return [];

    const mismatched = [];
    const frontendIds = new Set(debugInfo.frontendConnections.map(c => c.id));
    const backendIds = new Set(debugInfo.backendConnections.map(c => c.id));

    // 前端有但后端没有的连接
    for (const id of frontendIds) {
      if (!backendIds.has(id)) {
        mismatched.push({
          id,
          type: 'frontend_only',
          description: '前端存在但后端缺失',
        });
      }
    }

    // 后端有但前端没有的连接
    for (const id of backendIds) {
      if (!frontendIds.has(id)) {
        mismatched.push({
          id,
          type: 'backend_only',
          description: '后端存在但前端缺失',
        });
      }
    }

    return mismatched;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: '25%',
      ellipsis: true,
      render: (id: string) => (
        <Text code className='text-xs'>
          {id || '-'}
        </Text>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: '20%',
      ellipsis: true,
    },
    {
      title: '主机:端口',
      key: 'hostPort',
      width: '20%',
      render: (value: any, record: any) =>
        record ? `${record.host}:${record.port}` : '-',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: '15%',
      ellipsis: true,
    },
    {
      title: '状态',
      key: 'status',
      width: '20%',
      render: (value: any, record: any) => {
        if (!record) return <span className='text-muted-foreground'>未知</span>;
        const status = debugInfo?.connectionStatuses[record.id];
        return status ? (
          <span
            className={
              status.status === 'connected'
                ? 'text-success'
                : 'text-muted-foreground'
            }
          >
            {status.status}
          </span>
        ) : (
          <span className='text-muted-foreground'>未知</span>
        );
      },
    },
  ];

  const mismatchedConnections = findMismatchedConnections();

  return (
    <div className='h-full flex flex-col'>
      {/* 调试面板头部 */}
      <div className='flex items-center justify-between p-4 border-b'>
        <div className='flex items-center gap-2'>
          <Bug className='w-5 h-5' />
          <h2 className='text-lg font-semibold'>连接调试面板</h2>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={
              autoRefreshEnabled
                ? 'bg-green-50 border-green-200 text-green-700'
                : ''
            }
          >
            {autoRefreshEnabled ? '停止自动刷新' : '启用自动刷新'}
          </Button>
          <Button size='sm' onClick={collectDebugInfo} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`}
            />
            收集调试信息
          </Button>
        </div>
      </div>

      {/* 调试信息内容 */}
      <div className='flex-1 overflow-hidden'>
        {!debugInfo ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-center space-y-4'>
              <Info className='w-8 h-8 text-muted-foreground mx-auto' />
              <Text className='text-muted-foreground'>正在加载调试信息...</Text>
              {loading && (
                <div className='flex items-center justify-center gap-2'>
                  <RefreshCw className='w-4 h-4 animate-spin' />
                  <span className='text-sm'>正在收集数据...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Tabs
            defaultValue={
              mismatchedConnections.length > 0 ? 'mismatch' : 'summary'
            }
            className='h-full flex flex-col'
          >
            <TabsList className='mx-4 mt-4'>
              <TabsTrigger value='summary'>问题摘要</TabsTrigger>
              {mismatchedConnections.length > 0 && (
                <TabsTrigger value='mismatch'>
                  连接不匹配
                  <Badge variant='destructive' className='ml-2'>
                    {mismatchedConnections.length}
                  </Badge>
                </TabsTrigger>
              )}
              <TabsTrigger value='frontend'>前端连接</TabsTrigger>
              <TabsTrigger value='backend'>后端连接</TabsTrigger>
              {debugInfo.backendDebugInfo && (
                <TabsTrigger value='debug'>调试信息</TabsTrigger>
              )}
            </TabsList>

            <TabsContent
              value='summary'
              className='flex-1 overflow-hidden mx-4'
            >
              <ScrollArea className='h-full'>
                <div className='space-y-4 p-4'>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    <Card>
                      <CardContent className='p-4'>
                        <div className='text-2xl font-bold text-primary'>
                          {debugInfo.frontendConnections.length}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          前端连接数
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className='p-4'>
                        <div className='text-2xl font-bold text-green-600'>
                          {debugInfo.backendConnections.length}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          后端连接数
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className='p-4'>
                        <div className='text-2xl font-bold text-purple-600'>
                          {Object.keys(debugInfo.connectionStatuses).length}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          状态记录数
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className='p-4'>
                        <div className='text-2xl font-bold text-orange-600'>
                          {mismatchedConnections.length}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          不匹配连接
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {debugInfo.activeconnection_id && (
                    <Alert>
                      <Info className='h-4 w-4' />
                      <AlertTitle>活跃连接</AlertTitle>
                      <AlertDescription>
                        <Text code>{debugInfo.activeconnection_id}</Text>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {mismatchedConnections.length > 0 && (
              <TabsContent
                value='mismatch'
                className='flex-1 overflow-hidden mx-4'
              >
                <ScrollArea className='h-full'>
                  <div className='space-y-4 p-4'>
                    <Alert className='mb-4'>
                      <AlertTriangle className='h-4 w-4' />
                      <AlertTitle>发现连接不同步问题</AlertTitle>
                      <AlertDescription>
                        前端和后端的连接配置不一致，这可能导致连接错误
                      </AlertDescription>
                    </Alert>
                    <div className='space-y-2'>
                      {mismatchedConnections.map((item, index) => (
                        <Alert key={index} variant='destructive'>
                          <XCircle className='h-4 w-4' />
                          <AlertTitle>连接 ID: {item.id}</AlertTitle>
                          <AlertDescription>
                            {item.description}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}

            <TabsContent
              value='frontend'
              className='flex-1 overflow-hidden mx-4'
            >
              <ScrollArea className='h-full'>
                <div className='p-4'>
                  <DataTable
                    columns={columns}
                    dataSource={debugInfo.frontendConnections || []}
                    rowKey={record => record?.id || Math.random().toString()}
                    size='small'
                    scroll={{ x: '100%' }}
                    className='w-full'
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value='backend'
              className='flex-1 overflow-hidden mx-4'
            >
              <ScrollArea className='h-full'>
                <div className='p-4'>
                  <DataTable
                    columns={columns}
                    dataSource={debugInfo.backendConnections || []}
                    rowKey={record => record?.id || Math.random().toString()}
                    size='small'
                    scroll={{ x: '100%' }}
                    className='w-full'
                  />
                </div>
              </ScrollArea>
            </TabsContent>

            {debugInfo.backendDebugInfo && (
              <TabsContent
                value='debug'
                className='flex-1 overflow-hidden mx-4'
              >
                <ScrollArea className='h-full'>
                  <div className='p-4'>
                    <CodeBlock className='text-xs'>
                      {JSON.stringify(debugInfo.backendDebugInfo, null, 2)}
                    </CodeBlock>
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default ConnectionDebugPanel;
