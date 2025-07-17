import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { 
  Terminal, 
  Info, 
  AlertTriangle, 
  X, 
  Copy, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';

interface ConsoleLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source?: string;
}

const DebugConsole: React.FC = () => {
  const { activeConnectionId, connections } = useConnectionStore();
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'app' | 'browser'>('system');

  const activeConnection = activeConnectionId 
    ? connections.find(c => c.id === activeConnectionId) 
    : null;

  // 添加系统信息日志
  const addSystemLog = (level: ConsoleLogEntry['level'], message: string, source?: string) => {
    const newLog: ConsoleLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level,
      message,
      source
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // 保留最新100条
  };

  // 初始化系统日志
  useEffect(() => {
    addSystemLog('info', '=== InfloWave 调试控制台已启动 ===', '系统');
    addSystemLog('info', `当前时间: ${new Date().toLocaleString()}`, '系统');
    addSystemLog('info', '应用版本: v0.1.0', '系统');
    addSystemLog('info', `活跃连接: ${activeConnectionId || '无'}`, '连接');
    
    if (activeConnection) {
      addSystemLog('info', `连接详情: ${activeConnection.name} (${activeConnection.host}:${activeConnection.port})`, '连接');
    }
  }, [activeConnectionId, activeConnection]);

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
    addSystemLog('info', '控制台日志已清空', '系统');
  };

  // 复制日志到剪贴板
  const copyLogsToClipboard = () => {
    const logText = logs.map(log => 
      `[${log.timestamp.toLocaleString()}] ${log.level.toUpperCase()} ${log.source ? `[${log.source}]` : ''} ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      showMessage.success('日志已复制到剪贴板');
    }).catch(() => {
      showMessage.error('复制失败');
    });
  };

  // 触发浏览器控制台
  const openBrowserConsole = () => {
    if (typeof window !== 'undefined' && window.console) {
      console.log(
        '%c=== InfloWave Debug Console ===%c',
        'color: #2196F3; font-size: 16px; font-weight: bold;',
        'color: normal;'
      );
      console.log('当前时间:', new Date().toLocaleString());
      console.log('应用版本: v0.1.0');
      console.log('活跃连接:', activeConnectionId || '无');
      console.log('连接详情:', activeConnection);
      showMessage.info('请查看浏览器控制台（F12）获取详细信息');
    } else {
      showMessage.warning('浏览器控制台不可用');
    }
  };

  // 刷新系统信息
  const refreshSystemInfo = () => {
    addSystemLog('info', '=== 系统信息刷新 ===', '系统');
    addSystemLog('info', `当前时间: ${new Date().toLocaleString()}`, '系统');
    addSystemLog('info', `内存使用: ${(performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB' : '未知'}`, '系统');
    addSystemLog('info', `活跃连接: ${activeConnectionId || '无'}`, '连接');
    
    if (activeConnection) {
      addSystemLog('info', `连接状态: 已连接到 ${activeConnection.name}`, '连接');
    }
  };

  const getLevelIcon = (level: ConsoleLogEntry['level']) => {
    switch (level) {
      case 'info': return <Info className='w-4 h-4 text-blue-500' />;
      case 'warning': return <AlertTriangle className='w-4 h-4 text-yellow-500' />;
      case 'error': return <X className='w-4 h-4 text-red-500' />;
      case 'debug': return <Terminal className='w-4 h-4 text-gray-500' />;
      default: return <Info className='w-4 h-4' />;
    }
  };

  const getLevelBadge = (level: ConsoleLogEntry['level']) => {
    const variants = {
      info: 'default',
      warning: 'secondary',
      error: 'destructive',
      debug: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[level]} className='text-xs'>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const renderSystemInfo = () => (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Activity className='w-4 h-4' />
              系统状态
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>应用版本</span>
              <Badge variant='outline'>v0.1.0</Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>运行时间</span>
              <Badge variant='outline'>
                {Math.floor(performance.now() / 1000 / 60)}分钟
              </Badge>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>内存使用</span>
              <Badge variant='outline'>
                {(performance as any).memory ? 
                  Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 
                  '未知'
                }
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <CheckCircle className='w-4 h-4' />
              连接状态
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>活跃连接</span>
              <Badge variant={activeConnectionId ? 'default' : 'secondary'}>
                {activeConnectionId ? '已连接' : '未连接'}
              </Badge>
            </div>
            {activeConnection && (
              <>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>连接名称</span>
                  <span className='text-sm'>{activeConnection.name}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm text-muted-foreground'>服务器地址</span>
                  <span className='text-sm font-mono'>{activeConnection.host}:{activeConnection.port}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <Terminal className='w-4 h-4' />
            控制台日志
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className='h-[300px]'>
            <div className='space-y-2'>
              {logs.map(log => (
                <div key={log.id} className='flex items-start gap-2 p-2 rounded-lg bg-muted/50'>
                  <div className='flex-shrink-0 mt-0.5'>
                    {getLevelIcon(log.level)}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      {getLevelBadge(log.level)}
                      {log.source && (
                        <Badge variant='outline' className='text-xs'>
                          {log.source}
                        </Badge>
                      )}
                      <span className='text-xs text-muted-foreground flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className='text-sm break-words font-mono'>{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className='h-full flex flex-col'>
      <div className='flex items-center justify-between p-4 border-b'>
        <div className='flex items-center gap-2'>
          <Terminal className='w-5 h-5' />
          <h2 className='text-lg font-semibold'>调试控制台</h2>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={refreshSystemInfo}
          >
            <RefreshCw className='w-4 h-4 mr-2' />
            刷新
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={copyLogsToClipboard}
          >
            <Copy className='w-4 h-4 mr-2' />
            复制日志
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={clearLogs}
          >
            <Trash2 className='w-4 h-4 mr-2' />
            清空
          </Button>
        </div>
      </div>

      <div className='flex-1 overflow-hidden'>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className='h-full flex flex-col'>
          <TabsList className='grid w-full grid-cols-3 mx-4 mt-4'>
            <TabsTrigger value='system' className='flex items-center gap-2'>
              <Activity className='w-4 h-4' />
              系统信息
            </TabsTrigger>
            <TabsTrigger value='app' className='flex items-center gap-2'>
              <Terminal className='w-4 h-4' />
              应用日志
            </TabsTrigger>
            <TabsTrigger value='browser' className='flex items-center gap-2'>
              <Info className='w-4 h-4' />
              浏览器控制台
            </TabsTrigger>
          </TabsList>

          <TabsContent value='system' className='flex-1 mt-4 overflow-hidden'>
            <div className='h-full overflow-y-auto px-4'>
              {renderSystemInfo()}
            </div>
          </TabsContent>

          <TabsContent value='app' className='flex-1 mt-4 overflow-hidden'>
            <div className='h-full overflow-y-auto px-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-sm'>应用日志</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-center py-8 text-muted-foreground'>
                    <Terminal className='w-12 h-12 mx-auto mb-4' />
                    <p>应用日志功能开发中...</p>
                    <p className='text-sm mt-2'>将显示应用运行时的详细日志信息</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='browser' className='flex-1 mt-4 overflow-hidden'>
            <div className='h-full overflow-y-auto px-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-sm'>浏览器控制台</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='text-center py-8'>
                    <Terminal className='w-12 h-12 mx-auto mb-4 text-muted-foreground' />
                    <p className='text-lg font-medium mb-2'>浏览器开发者控制台</p>
                    <p className='text-muted-foreground mb-4'>
                      获取详细的浏览器调试信息和JavaScript错误
                    </p>
                    <Button onClick={openBrowserConsole}>
                      <Terminal className='w-4 h-4 mr-2' />
                      打开浏览器控制台
                    </Button>
                  </div>
                  <Separator />
                  <div className='space-y-2'>
                    <h4 className='font-medium'>使用说明：</h4>
                    <ul className='text-sm text-muted-foreground space-y-1'>
                      <li>• 按 F12 键打开浏览器开发者工具</li>
                      <li>• 切换到 Console 标签页查看JavaScript日志</li>
                      <li>• 点击上方按钮会在浏览器控制台输出当前系统信息</li>
                      <li>• 可以在控制台中执行JavaScript代码进行调试</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DebugConsole;