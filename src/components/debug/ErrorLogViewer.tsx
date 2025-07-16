import React, { useState, useEffect } from 'react';
import {
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ScrollArea,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  RefreshCw,
  Trash2,
  Download,
  Bug,
  AlertTriangle,
  Info,
  AlertCircle,
  Search as SearchIcon,
  Eye,
  ChevronDown,
  Copy,
} from 'lucide-react';
import { FileOperations } from '@/utils/fileOperations';
import { errorLogger, type ErrorLogEntry } from '@/utils/errorLogger';

const ErrorLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // 加载错误日志
  const loadErrorLogs = async () => {
    setLoading(true);
    try {
      const logContent = await FileOperations.readFile('logs/error.log');
      const parsedLogs = parseLogContent(logContent);
      setLogs(parsedLogs);
      setFilteredLogs(parsedLogs);
      showMessage.success(`已加载 ${parsedLogs.length} 条错误日志`);
    } catch (error) {
      console.error('加载错误日志失败:', error);
      showMessage.error('加载错误日志失败');
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // 解析日志内容
  const parseLogContent = (content: string): ErrorLogEntry[] => {
    const entries: ErrorLogEntry[] = [];
    const logEntries = content.split('='.repeat(80));

    for (const entry of logEntries) {
      if (!entry.trim()) continue;

      try {
        const lines = entry.trim().split('\n');
        if (lines.length === 0) continue;

        const headerLine = lines[0];
        const timestampMatch = headerLine.match(/\[([\d\-T:.Z]+)\]/);
        const typeMatch = headerLine.match(/\[([A-Z]+):([A-Z]+)\]/);

        if (!timestampMatch || !typeMatch) continue;

        const timestamp = timestampMatch[1];
        const [, type, level] = typeMatch;
        const messageStartIndex =
          headerLine.indexOf(']', headerLine.lastIndexOf('[')) + 1;
        const message = headerLine.substring(messageStartIndex).trim();

        let stack = '';
        let url = '';
        let lineNumber: number | undefined;
        let columnNumber: number | undefined;
        let componentStack = '';
        let additional: any = {};

        // 解析其他信息
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('URL: ')) {
            const urlInfo = line.substring(5);
            const colonIndex = urlInfo.lastIndexOf(':');
            if (colonIndex > urlInfo.indexOf('://')) {
              const parts = urlInfo.substring(colonIndex + 1).split(':');
              if (parts.length >= 1 && !isNaN(Number(parts[0]))) {
                url = urlInfo.substring(0, colonIndex);
                lineNumber = Number(parts[0]);
                if (parts.length >= 2 && !isNaN(Number(parts[1]))) {
                  columnNumber = Number(parts[1]);
                }
              } else {
                url = urlInfo;
              }
            } else {
              url = urlInfo;
            }
          } else if (line.startsWith('Stack: ')) {
            stack = line.substring(7);
          } else if (line.startsWith('Component Stack: ')) {
            componentStack = line.substring(17);
          } else if (line.startsWith('Additional: ')) {
            try {
              additional = JSON.parse(line.substring(12));
            } catch {
              additional = { raw: line.substring(12) };
            }
          }
        }

        const logEntry: ErrorLogEntry = {
          id: `log-${entries.length + 1}`,
          timestamp,
          type: type.toLowerCase() as any,
          level: level.toLowerCase() as any,
          message,
          stack,
          url,
          lineNumber,
          columnNumber,
          componentStack,
          userAgent: additional.userAgent || '',
          pathname: additional.pathname || '',
          additional,
        };

        entries.push(logEntry);
      } catch (error) {
        console.error('解析日志条目失败:', error);
      }
    }

    return entries.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  // 应用过滤器
  useEffect(() => {
    let filtered = logs;

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(
        log =>
          log.message.toLowerCase().includes(searchText.toLowerCase()) ||
          log.stack?.toLowerCase().includes(searchText.toLowerCase()) ||
          log.url?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 级别过滤
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    // 类型过滤
    if (typeFilter !== 'all') {
      filtered = filtered.filter(log => log.type === typeFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchText, levelFilter, typeFilter]);

  // 清除错误日志
  const clearLogs = async () => {
    if (window.confirm('确认清除所有错误日志？此操作不可恢复。')) {
      try {
        await FileOperations.deleteFile('logs/error.log');
        setLogs([]);
        setFilteredLogs([]);
        showMessage.success('错误日志已清除');
      } catch (error) {
        showMessage.error('清除日志失败');
      }
    }
  };

  // 导出日志
  const exportLogs = async () => {
    try {
      const logContent = await FileOperations.readFile('logs/error.log');
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `error-logs-${new Date().toISOString().split('T')[0]}.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showMessage.success('日志已导出');
    } catch (error) {
      showMessage.error('导出日志失败');
    }
  };

  // 获取级别显示信息
  const getLevelBadgeVariant = (
    level: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warn':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // 获取级别图标
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className='w-3 h-3' />;
      case 'warn':
        return <AlertTriangle className='w-3 h-3' />;
      case 'info':
        return <Info className='w-3 h-3' />;
      default:
        return <Bug className='w-3 h-3' />;
    }
  };

  // 获取类型显示颜色
  const getTypeBadgeVariant = (
    type: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'javascript':
      case 'react':
        return 'destructive';
      case 'promise':
      case 'network':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // 组件挂载时加载日志
  useEffect(() => {
    loadErrorLogs();
  }, []);

  return (
    <div className='space-y-6'>
      {/* 头部统计和操作 */}
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-6'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>总日志数:</span>
                <Badge variant='secondary'>{logs.length}</Badge>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>错误:</span>
                <Badge variant='destructive'>
                  {logs.filter(log => log.level === 'error').length}
                </Badge>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>警告:</span>
                <Badge variant='default'>
                  {logs.filter(log => log.level === 'warn').length}
                </Badge>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium'>当前会话:</span>
                <code className='text-xs bg-muted px-1 rounded'>
                  {errorLogger.getSessionId()}
                </code>
              </div>
            </div>

            <div className='flex gap-2'>
              <Button
                onClick={loadErrorLogs}
                disabled={loading}
                variant='outline'
                size='sm'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                刷新
              </Button>
              <Button onClick={exportLogs} variant='outline' size='sm'>
                <Download className='w-4 h-4 mr-2' />
                导出
              </Button>
              <Button onClick={clearLogs} variant='destructive' size='sm'>
                <Trash2 className='w-4 h-4 mr-2' />
                清除
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 过滤器 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>过滤选项</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap gap-4'>
            <div className='flex items-center gap-2'>
              <SearchIcon className='w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='搜索错误消息...'
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className='w-64'
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className='w-32'>
                <SelectValue placeholder='级别' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部级别</SelectItem>
                <SelectItem value='error'>错误</SelectItem>
                <SelectItem value='warn'>警告</SelectItem>
                <SelectItem value='info'>信息</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className='w-36'>
                <SelectValue placeholder='类型' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部类型</SelectItem>
                <SelectItem value='javascript'>JavaScript</SelectItem>
                <SelectItem value='react'>React</SelectItem>
                <SelectItem value='promise'>Promise</SelectItem>
                <SelectItem value='network'>网络</SelectItem>
                <SelectItem value='console'>控制台</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 错误日志表格 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>
            错误日志 ({filteredLogs.length} 条)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className='h-[600px]'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[160px]'>时间</TableHead>
                  <TableHead className='w-[80px]'>级别</TableHead>
                  <TableHead className='w-[100px]'>类型</TableHead>
                  <TableHead>消息</TableHead>
                  <TableHead className='w-[200px]'>来源</TableHead>
                  <TableHead className='w-[80px]'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className='text-xs'>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getLevelBadgeVariant(log.level)}
                        className='text-xs'
                      >
                        {getLevelIcon(log.level)}
                        <span className='ml-1'>{log.level.toUpperCase()}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getTypeBadgeVariant(log.type)}
                        className='text-xs'
                      >
                        {log.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className='max-w-[300px]'>
                      <div className='truncate text-xs' title={log.message}>
                        {log.message}
                      </div>
                    </TableCell>
                    <TableCell className='text-xs'>
                      {log.url ? (
                        <div
                          className='truncate font-mono'
                          title={`${log.url}${log.lineNumber ? `:${log.lineNumber}` : ''}`}
                        >
                          {log.url.length > 30
                            ? `...${log.url.slice(-27)}`
                            : log.url}
                          {log.lineNumber && `:${log.lineNumber}`}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => {
                          setSelectedLog(log);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className='w-4 h-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 错误详情对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-4xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>错误详情</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className='space-y-4'>
              {/* 基本信息 */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className='flex items-center gap-2 w-full p-2 bg-muted rounded hover:bg-muted/80'>
                  <ChevronDown className='w-4 h-4' />
                  <span className='font-medium'>基本信息</span>
                </CollapsibleTrigger>
                <CollapsibleContent className='p-4 border rounded-b'>
                  <div className='grid grid-cols-2 gap-4 text-sm'>
                    <div>
                      <span className='font-semibold'>时间:</span>{' '}
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold'>级别:</span>
                      <Badge variant={getLevelBadgeVariant(selectedLog.level)}>
                        {selectedLog.level}
                      </Badge>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='font-semibold'>类型:</span>
                      <Badge variant={getTypeBadgeVariant(selectedLog.type)}>
                        {selectedLog.type}
                      </Badge>
                    </div>
                    <div>
                      <span className='font-semibold'>ID:</span>{' '}
                      <code className='text-xs bg-muted px-1 rounded'>
                        {selectedLog.id}
                      </code>
                    </div>
                    {selectedLog.url && (
                      <div className='col-span-2'>
                        <span className='font-semibold'>来源:</span>
                        <code className='text-xs bg-muted px-1 rounded ml-2'>
                          {selectedLog.url}
                          {selectedLog.lineNumber &&
                            `:${selectedLog.lineNumber}`}
                          {selectedLog.columnNumber &&
                            `:${selectedLog.columnNumber}`}
                        </code>
                      </div>
                    )}
                    <div className='col-span-2'>
                      <span className='font-semibold'>页面:</span>
                      <code className='text-xs bg-muted px-1 rounded ml-2'>
                        {selectedLog.pathname || '-'}
                      </code>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 错误消息 */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className='flex items-center gap-2 w-full p-2 bg-muted rounded hover:bg-muted/80'>
                  <ChevronDown className='w-4 h-4' />
                  <span className='font-medium'>错误消息</span>
                </CollapsibleTrigger>
                <CollapsibleContent className='p-4 border rounded-b'>
                  <div className='relative'>
                    <pre className='text-xs bg-muted p-3 rounded overflow-x-auto'>
                      {selectedLog.message}
                    </pre>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='absolute top-2 right-2'
                      onClick={() =>
                        navigator.clipboard.writeText(selectedLog.message)
                      }
                    >
                      <Copy className='w-3 h-3' />
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 错误堆栈 */}
              {selectedLog.stack && (
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className='flex items-center gap-2 w-full p-2 bg-muted rounded hover:bg-muted/80'>
                    <ChevronDown className='w-4 h-4' />
                    <span className='font-medium'>错误堆栈</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='p-4 border rounded-b'>
                    <div className='relative'>
                      <pre className='text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap'>
                        {selectedLog.stack}
                      </pre>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='absolute top-2 right-2'
                        onClick={() =>
                          navigator.clipboard.writeText(selectedLog.stack || '')
                        }
                      >
                        <Copy className='w-3 h-3' />
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* 组件堆栈 */}
              {selectedLog.componentStack && (
                <Collapsible>
                  <CollapsibleTrigger className='flex items-center gap-2 w-full p-2 bg-muted rounded hover:bg-muted/80'>
                    <ChevronDown className='w-4 h-4' />
                    <span className='font-medium'>组件堆栈</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='p-4 border rounded-b'>
                    <div className='relative'>
                      <pre className='text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap'>
                        {selectedLog.componentStack}
                      </pre>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='absolute top-2 right-2'
                        onClick={() =>
                          navigator.clipboard.writeText(
                            selectedLog.componentStack || ''
                          )
                        }
                      >
                        <Copy className='w-3 h-3' />
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* 附加信息 */}
              {selectedLog.additional &&
                Object.keys(selectedLog.additional).length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className='flex items-center gap-2 w-full p-2 bg-muted rounded hover:bg-muted/80'>
                      <ChevronDown className='w-4 h-4' />
                      <span className='font-medium'>附加信息</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className='p-4 border rounded-b'>
                      <div className='relative'>
                        <pre className='text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap'>
                          {JSON.stringify(selectedLog.additional, null, 2)}
                        </pre>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='absolute top-2 right-2'
                          onClick={() =>
                            navigator.clipboard.writeText(
                              JSON.stringify(selectedLog.additional, null, 2)
                            )
                          }
                        >
                          <Copy className='w-3 h-3' />
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrorLogViewer;
