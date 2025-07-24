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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Activity,
  Search,
  Filter,
  Bug,
  FileText,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import { consoleLogger, type ConsoleLogEntry } from '@/utils/consoleLogger';
import { generateUniqueId } from '@/utils/idGenerator';

interface SystemLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  source?: string;
}

const DebugConsole: React.FC = () => {
  const { activeConnectionId, connections } = useConnectionStore();
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const [appLogs, setAppLogs] = useState<SystemLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'app' | 'browser'>('system');
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const activeConnection = activeConnectionId 
    ? connections.find(c => c.id === activeConnectionId) 
    : null;

  // 添加系统信息日志
  const addSystemLog = (level: SystemLogEntry['level'], message: string, source?: string) => {
    const newLog: SystemLogEntry = {
      id: generateUniqueId('system'),
      timestamp: new Date(),
      level,
      message,
      source
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 100)); // 保留最新100条
  };

  // 添加应用日志
  const addAppLog = (level: SystemLogEntry['level'], message: string, source?: string) => {
    const newLog: SystemLogEntry = {
      id: generateUniqueId('app'),
      timestamp: new Date(),
      level,
      message,
      source
    };
    setAppLogs(prev => [newLog, ...prev].slice(0, 1000)); // 保留最新1000条
  };

  // 初始化系统日志和应用日志
  useEffect(() => {
    addSystemLog('info', '=== InfloWave 调试控制台已启动 ===', '系统');
    addSystemLog('info', `当前时间: ${new Date().toLocaleString()}`, '系统');
    addSystemLog('info', '应用版本: v0.1.3', '系统');
    addSystemLog('info', `活跃连接: ${activeConnectionId || '无'}`, '连接');
    
    if (activeConnection) {
      addSystemLog('info', `连接详情: ${activeConnection.name} (${activeConnection.host}:${activeConnection.port})`, '连接');
    }

    // 初始化应用日志
    addAppLog('info', '=== 应用日志系统已启动 ===', '应用');
    addAppLog('info', '监听应用运行时事件...', '事件');
    addAppLog('debug', `用户代理: ${navigator.userAgent}`, '浏览器');
    addAppLog('debug', `屏幕分辨率: ${screen.width}x${screen.height}`, '系统');
    addAppLog('info', `当前页面: ${window.location.pathname}`, '导航');
  }, [activeConnectionId, activeConnection]);

  // 初始化控制台日志监听
  useEffect(() => {
    // 获取现有的控制台日志
    setConsoleLogs(consoleLogger.getLogs());

    // 监听新的控制台日志
    const removeListener = consoleLogger.addListener((newLog) => {
      setConsoleLogs(prev => [newLog, ...prev].slice(0, 1000)); // 保留最新1000条
    });

    return removeListener;
  }, []);

  // 初始化应用事件监听
  useEffect(() => {
    // 页面可见性变化监听
    const handleVisibilityChange = () => {
      addAppLog('info', `页面可见性变化: ${document.visibilityState}`, '页面事件');
    };

    // 网络状态变化监听
    const handleOnline = () => {
      addAppLog('info', '网络连接已恢复', '网络事件');
    };

    const handleOffline = () => {
      addAppLog('warning', '网络连接已断开', '网络事件');
    };

    // 窗口焦点变化监听
    const handleFocus = () => {
      addAppLog('debug', '窗口获得焦点', '窗口事件');
    };

    const handleBlur = () => {
      addAppLog('debug', '窗口失去焦点', '窗口事件');
    };

    // 性能监控
    const performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          addAppLog('debug', `页面加载时间: ${entry.duration.toFixed(2)}ms`, '性能监控');
        }
      });
    });

    try {
      performanceObserver.observe({ entryTypes: ['navigation', 'resource'] });
    } catch (error) {
      // 某些浏览器可能不支持
    }

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      performanceObserver.disconnect();
    };
  }, []);

  // 清空日志
  const clearLogs = () => {
    if (activeTab === 'system') {
      setSystemLogs([]);
      addSystemLog('info', '系统日志已清空', '系统');
    } else if (activeTab === 'app') {
      setAppLogs([]);
      addAppLog('info', '应用日志已清空', '应用');
    } else if (activeTab === 'browser') {
      consoleLogger.clearLogs();
      setConsoleLogs([]);
      addSystemLog('info', '控制台日志已清空', '系统');
    }
  };

  // 复制单个日志条目到剪贴板
  const copyLogToClipboard = async (log: SystemLogEntry | ConsoleLogEntry) => {
    const logText = `[${log.timestamp.toLocaleString()}] ${log.level.toUpperCase()} ${log.source ? `[${log.source}]` : ''} ${log.message}`;
    
    const success = await writeToClipboard(logText, {
      successMessage: '日志已复制到剪贴板',
      errorMessage: '复制失败'
    });
  };


  // 获取过滤后的应用日志
  const getFilteredAppLogs = () => {
    let filtered = appLogs;

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchText.toLowerCase()) ||
        log.source?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 级别过滤
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    return filtered;
  };

  // 获取过滤后的控制台日志
  const getFilteredConsoleLogs = () => {
    let filtered = consoleLogs;

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchText.toLowerCase()) ||
        log.source?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 级别过滤
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    return filtered;
  };

  // 获取当前页面的应用日志
  const getCurrentPageLogs = () => {
    const filtered = getFilteredAppLogs();
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  };

  // 获取当前页面的控制台日志
  const getCurrentPageConsoleLogs = () => {
    const filtered = getFilteredConsoleLogs();
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  };

  // 计算总页数
  const getTotalPages = () => {
    if (activeTab === 'app') {
      return Math.ceil(getFilteredAppLogs().length / pageSize);
    } else if (activeTab === 'browser') {
      return Math.ceil(getFilteredConsoleLogs().length / pageSize);
    }
    return 1;
  };

  // 分页控制
  const goToPage = (page: number) => {
    const totalPages = getTotalPages();
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 重置分页当切换tab或过滤条件变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchText, levelFilter]);

  // 刷新系统信息
  const refreshSystemInfo = () => {
    // 刷新系统信息日志
    addSystemLog('info', '=== 系统信息刷新 ===', '系统');
    addSystemLog('info', `当前时间: ${new Date().toLocaleString()}`, '系统');
    addSystemLog('info', `内存使用: ${(performance as any).memory ? `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)  }MB` : '未知'}`, '系统');
    addSystemLog('info', `活跃连接: ${activeConnectionId || '无'}`, '连接');
    
    if (activeConnection) {
      addSystemLog('info', `连接状态: 已连接到 ${activeConnection.name}`, '连接');
    }

    // 刷新应用日志
    if (activeTab === 'app') {
      addAppLog('info', '手动刷新系统信息', '用户操作');
      addAppLog('debug', `页面可见性: ${document.visibilityState}`, '页面');
      addAppLog('debug', `在线状态: ${navigator.onLine ? '在线' : '离线'}`, '网络');
    }

    // 刷新浏览器控制台日志
    if (activeTab === 'browser') {
      // 重新获取最新的控制台日志并强制更新状态
      const latestLogs = consoleLogger.getLogs();
      setConsoleLogs([...latestLogs]); // 使用展开操作符强制重新渲染
      
      // 添加测试日志来验证刷新功能
      console.info(`视图日志已刷新 - ${new Date().toLocaleTimeString()}`);
      console.debug(`当前日志总数: ${latestLogs.length}`);
      
      addSystemLog('info', '视图日志已刷新', '系统');
      addSystemLog('debug', `当前控制台日志总数: ${latestLogs.length}`, '系统');
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'info': 
      case 'log': return <Info className='w-4 h-4 text-blue-500' />;
      case 'warning': 
      case 'warn': return <AlertTriangle className='w-4 h-4 text-yellow-500' />;
      case 'error': return <X className='w-4 h-4 text-red-500' />;
      case 'debug': return <Terminal className='w-4 h-4 text-gray-500' />;
      default: return <Info className='w-4 h-4' />;
    }
  };

  const getLevelBadge = (level: string) => {
    const variants = {
      info: 'default',
      log: 'default',
      warning: 'secondary',
      warn: 'secondary',
      error: 'destructive',
      debug: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[level as keyof typeof variants] || 'outline'} className='text-xs'>
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
              <Badge variant='outline'>v0.1.3</Badge>
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
                  `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)  }MB` : 
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
              {systemLogs.map(log => (
                <div key={log.id} className='group relative flex items-start gap-2 p-2 rounded-lg bg-muted/50'>
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
                  <Button
                    variant='ghost'
                    size='sm'
                    className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'
                    onClick={() => copyLogToClipboard(log)}
                  >
                    <Copy className='w-3 h-3' />
                  </Button>
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
            className='h-8 text-sm'
            onClick={refreshSystemInfo}
          >
            <RefreshCw className='w-4 h-4 mr-2' />
            刷新
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-sm'
            onClick={clearLogs}
          >
            <Trash2 className='w-4 h-4 mr-2' />
            清空
          </Button>
        </div>
      </div>

      <div className='flex-1 flex flex-col overflow-hidden'>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className='h-full flex flex-col'>
          <div className='flex-shrink-0 px-4 pt-4'>
            <TabsList className='grid w-full grid-cols-3'>
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
              视图日志
            </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='system' className='flex-1 overflow-hidden'>
            <div className='h-full px-4'>
              {renderSystemInfo()}
            </div>
          </TabsContent>

          <TabsContent value='app' className='flex-1 overflow-hidden'>
            <div className='h-full flex flex-col px-4 gap-4'>
              {/* 固定的筛选器框 */}
              <div className='flex-shrink-0'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-sm flex items-center justify-between'>
                      <span className='flex items-center gap-2'>
                        <Database className='w-4 h-4' />
                        应用日志
                      </span>
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline' className='text-xs'>
                          {getFilteredAppLogs().length} 条日志
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 过滤器 */}
                    <div className='flex items-center gap-4'>
                      <div className='flex items-center gap-2'>
                        <Search className='w-4 h-4 text-muted-foreground' />
                        <Input
                          placeholder='搜索应用日志...'
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className='w-48 h-8 text-sm'
                        />
                      </div>
                      <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger className='w-32 h-8 text-sm'>
                          <SelectValue placeholder='级别' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>全部</SelectItem>
                          <SelectItem value='info'>INFO</SelectItem>
                          <SelectItem value='warning'>WARN</SelectItem>
                          <SelectItem value='error'>ERROR</SelectItem>
                          <SelectItem value='debug'>DEBUG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 可滚动的日志内容区域 */}
              <div className='flex-1 min-h-0'>
                <Card className='h-full flex flex-col'>
                  <CardContent className='flex-1 flex flex-col p-4 min-h-0'>
                    {/* 日志显示 */}
                    <div className='flex-1 overflow-y-auto border rounded-lg p-2'>
                    <div className='space-y-2'>
                      {getCurrentPageLogs().map(log => (
                        <div key={log.id} className='group relative flex items-start gap-2 p-3 rounded-lg bg-muted/50 border'>
                          <div className='flex-shrink-0 mt-0.5'>
                            {getLevelIcon(log.level)}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 mb-1'>
                              {getLevelBadge(log.level)}
                              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                                <Clock className='w-3 h-3' />
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                              {log.source && (
                                <Badge variant='outline' className='text-xs'>
                                  {log.source}
                                </Badge>
                              )}
                            </div>
                            <pre className='text-sm break-words font-mono whitespace-pre-wrap'>{log.message}</pre>
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'
                            onClick={() => copyLogToClipboard(log)}
                          >
                            <Copy className='w-3 h-3' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                    {/* 分页控件 */}
                    {getFilteredAppLogs().length > pageSize && (
                      <div className='flex items-center justify-between pt-4 border-t mt-4'>
                        <div className='flex items-center gap-4'>
                          <span className='text-sm text-muted-foreground'>
                            显示 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, getFilteredAppLogs().length)} 条，共 {getFilteredAppLogs().length} 条
                          </span>
                          <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => setPageSize(Number(value))}
                          >
                            <SelectTrigger className='w-20 h-8 text-sm'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='25'>25</SelectItem>
                              <SelectItem value='50'>50</SelectItem>
                              <SelectItem value='100'>100</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className='text-sm text-muted-foreground'>条/页</span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 px-2'
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className='w-4 h-4' />
                          </Button>
                          <span className='text-sm px-2'>
                            第 {currentPage} 页，共 {getTotalPages()} 页
                          </span>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 px-2'
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === getTotalPages()}
                          >
                            <ChevronRight className='w-4 h-4' />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {getFilteredAppLogs().length === 0 && (
                      <div className='text-center py-8 text-muted-foreground'>
                        <Database className='w-12 h-12 mx-auto mb-4' />
                        <p>暂无应用日志</p>
                        <p className='text-sm mt-2'>应用运行时的详细事件将在这里显示</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='browser' className='flex-1 overflow-hidden'>
            <div className='h-full flex flex-col px-4 gap-4'>
              {/* 固定的头部和筛选器 */}
              <div className='flex-shrink-0'>
                <Card>
                  <CardHeader>
                    <CardTitle className='text-sm flex items-center justify-between'>
                      <span>视图日志</span>
                      <div className='flex items-center gap-2'>
                        <Badge variant='outline' className='text-xs'>
                          {getFilteredConsoleLogs().length} 条日志
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* 过滤器 */}
                    <div className='flex items-center gap-4'>
                      <div className='flex items-center gap-2'>
                        <Search className='w-4 h-4 text-muted-foreground' />
                        <Input
                          placeholder='搜索日志...'
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className='w-48 h-8 text-sm'
                        />
                      </div>
                      <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger className='w-32 h-8 text-sm'>
                          <SelectValue placeholder='级别' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>全部</SelectItem>
                          <SelectItem value='log'>LOG</SelectItem>
                          <SelectItem value='info'>INFO</SelectItem>
                          <SelectItem value='warn'>WARN</SelectItem>
                          <SelectItem value='error'>ERROR</SelectItem>
                          <SelectItem value='debug'>DEBUG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 可滚动的日志内容区域 */}
              <div className='flex-1 min-h-0'>
                <Card className='h-full flex flex-col'>
                  <CardContent className='flex-1 flex flex-col p-4 min-h-0'>
                    {/* 日志显示 */}
                    <div className='flex-1 overflow-y-auto border rounded-lg p-2'>
                    <div className='space-y-2'>
                      {getCurrentPageConsoleLogs().map(log => (
                        <div key={log.id} className='group relative flex items-start gap-2 p-3 rounded-lg bg-muted/50 border'>
                          <div className='flex-shrink-0 mt-0.5'>
                            {getLevelIcon(log.level)}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 mb-1'>
                              {getLevelBadge(log.level)}
                              <span className='text-xs text-muted-foreground flex items-center gap-1'>
                                <Clock className='w-3 h-3' />
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                              {log.source && (
                                <Badge variant='outline' className='text-xs'>
                                  {log.source}
                                </Badge>
                              )}
                            </div>
                            <pre className='text-sm break-words font-mono whitespace-pre-wrap'>{log.message}</pre>
                            {log.args && log.args.length > 1 && (
                              <details className='mt-2'>
                                <summary className='text-xs text-muted-foreground cursor-pointer'>
                                  显示详细参数
                                </summary>
                                <pre className='text-xs bg-muted/30 p-2 rounded mt-1 overflow-x-auto'>
                                  {(() => {
                                    try {
                                      return JSON.stringify(log.args, (key, value) => {
                                        // 处理循环引用和不可序列化的对象
                                        if (typeof value === 'object' && value !== null) {
                                          if (value instanceof HTMLElement) {
                                            return `[HTMLElement: ${value.tagName}]`;
                                          }
                                          if (value instanceof Error) {
                                            return `[Error: ${value.message}]`;
                                          }
                                          if (value instanceof Function) {
                                            return `[Function: ${value.name || 'anonymous'}]`;
                                          }
                                        }
                                        return value;
                                      }, 2);
                                    } catch (error) {
                                      return `[无法序列化参数: ${error instanceof Error ? error.message : '未知错误'}]`;
                                    }
                                  })()}
                                </pre>
                              </details>
                            )}
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'
                            onClick={() => copyLogToClipboard(log)}
                          >
                            <Copy className='w-3 h-3' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                    {/* 分页控件 */}
                    {getFilteredConsoleLogs().length > pageSize && (
                      <div className='flex items-center justify-between pt-4 border-t mt-4'>
                        <div className='flex items-center gap-4'>
                          <span className='text-sm text-muted-foreground'>
                            显示 {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, getFilteredConsoleLogs().length)} 条，共 {getFilteredConsoleLogs().length} 条
                          </span>
                          <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => setPageSize(Number(value))}
                          >
                            <SelectTrigger className='w-20 h-8 text-sm'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='25'>25</SelectItem>
                              <SelectItem value='50'>50</SelectItem>
                              <SelectItem value='100'>100</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className='text-sm text-muted-foreground'>条/页</span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 px-2'
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className='w-4 h-4' />
                          </Button>
                          <span className='text-sm px-2'>
                            第 {currentPage} 页，共 {getTotalPages()} 页
                          </span>
                          <Button
                            variant='outline'
                            size='sm'
                            className='h-8 px-2'
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === getTotalPages()}
                          >
                            <ChevronRight className='w-4 h-4' />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {getFilteredConsoleLogs().length === 0 && (
                      <div className='text-center py-8 text-muted-foreground'>
                        <Terminal className='w-12 h-12 mx-auto mb-4' />
                        <p>暂无控制台日志</p>
                        <p className='text-sm mt-2'>应用启动后的所有控制台日志将在这里显示</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DebugConsole;