import React, { useState, useEffect } from 'react';
import {
  Button,
  Space,
  Tag,
  Typography,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DatePicker,
  Alert,
  AlertDescription,
  Collapse,
  Panel,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast
} from '@/components/ui';
import { RefreshCw, Trash2, Download, Bug, AlertTriangle, Info, AlertCircle, Search as SearchIcon, Eye, Table } from 'lucide-react';
import { FileOperations } from '@/utils/fileOperations';
import { errorLogger, type ErrorLogEntry } from '@/utils/errorLogger';
import { Modal } from '@/utils/modalAdapter';

const ErrorLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ErrorLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // 加载错误日志
  const loadErrorLogs = async () => {
    setLoading(true);
    try {
      const logContent = await FileOperations.readFile('logs/error.log');
      const parsedLogs = parseLogContent(logContent);
      setLogs(parsedLogs);
      setFilteredLogs(parsedLogs);
      toast({ title: "成功", description: `已加载 ${parsedLogs.length} 条错误日志` });
    } catch (error) {
      console.error('加载错误日志失败:', error);
      toast({ title: "错误", description: "加载错误日志失败", variant: "destructive" });
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
        const sessionMatch = headerLine.match(/\[session-[^\]]+\]/);
        const typeMatch = headerLine.match(/\[([A-Z]+):([A-Z]+)\]/);

        if (!timestampMatch || !typeMatch) continue;

        const timestamp = timestampMatch[1];
        const [, type, level] = typeMatch;
        const messageStartIndex = headerLine.indexOf(']', headerLine.lastIndexOf('[')) + 1;
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
          additional};

        entries.push(logEntry);
      } catch (error) {
        console.error('解析日志条目失败:', error);
      }
    }

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // 应用过滤器
  useEffect(() => {
    let filtered = logs;

    // 搜索过滤
    if (searchText) {
      filtered = filtered.filter(log =>
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

    // 日期范围过滤
    if (dateRange && dateRange[0] && dateRange[1]) {
      const [start, end] = dateRange;
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start.toDate() && logDate <= end.toDate();
      });
    }

    setFilteredLogs(filtered);
  }, [logs, searchText, levelFilter, typeFilter, dateRange]);

  // 清除错误日志
  const clearLogs = async () => {
    Modal.confirm({
      title: '确认清除日志',
      content: '这将删除所有错误日志，此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      closable: true,
      keyboard: true,
      maskClosable: true,
      onOk: async () => {
        try {
          await FileOperations.deleteFile('logs/error.log');
          setLogs([]);
          setFilteredLogs([]);
          toast({ title: "成功", description: "错误日志已清除" });
        } catch (error) {
          toast({ title: "错误", description: "清除日志失败", variant: "destructive" });
        }
      },
      onCancel: () => {
        // 明确处理取消操作
      }});
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
      toast({ title: "成功", description: "日志已导出" });
    } catch (error) {
      toast({ title: "错误", description: "导出日志失败", variant: "destructive" });
    }
  };

  // 获取级别图标和颜色
  const getLevelDisplay = (level: string) => {
    switch (level) {
      case 'error':
        return { icon: <AlertCircle />, color: 'red' };
      case 'warn':
        return { icon: <AlertTriangle />, color: 'orange' };
      case 'info':
        return { icon: <Info className="w-4 h-4"  />, color: 'blue' };
      default:
        return { icon: <Bug className="w-4 h-4"  />, color: 'default' };
    }
  };

  // 获取类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'javascript':
        return 'red';
      case 'react':
        return 'cyan';
      case 'promise':
        return 'orange';
      case 'network':
        return 'purple';
      case 'console':
        return 'blue';
      default:
        return 'default';
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (timestamp: string) => (
        <Text className="text-xs">
          {new Date(timestamp).toLocaleString()}
        </Text>
      )},
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const { icon, color } = getLevelDisplay(level);
        return (
          <Tag icon={icon} color={color} className="text-xs">
            {level.toUpperCase()}
          </Tag>
        );
      }},
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={getTypeColor(type)} className="text-xs">
          {type.toUpperCase()}
        </Tag>
      )},
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => (
        <Tooltip title={message}>
          <Text className="text-xs">{message}</Text>
        </Tooltip>
      )},
    {
      title: '来源',
      dataIndex: 'url',
      key: 'url',
      width: 200,
      ellipsis: true,
      render: (url: string, record: ErrorLogEntry) => {
        if (!url) return '-';
        const displayUrl = url.length > 50 ? `...${url.slice(-47)}` : url;
        const lineInfo = record.lineNumber ? `:${record.lineNumber}` : '';
        return (
          <Tooltip title={`${url}${lineInfo}`}>
            <Text className="text-xs font-mono">{displayUrl}{lineInfo}</Text>
          </Tooltip>
        );
      }},
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: ErrorLogEntry) => (
        <Button
          type="link"
          size="small"
          icon={<Eye className="w-4 h-4"  />}
          onClick={() => {
            setSelectedLog(record);
            setModalVisible(true);
          }}
        >
          详情
        </Button>
      )},
  ];

  // 组件挂载时加载日志
  useEffect(() => {
    loadErrorLogs();
  }, []);

  return (
    <div className="space-y-4">
      {/* 头部统计和操作 */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2" size="large">
            <div>
              <Badge count={logs.length} overflowCount={9999} color="blue">
                <Text strong>总日志数</Text>
              </Badge>
            </div>
            <div>
              <Badge count={logs.filter(log => log.level === 'error').length} overflowCount={9999} color="red">
                <Text strong>错误</Text>
              </Badge>
            </div>
            <div>
              <Badge count={logs.filter(log => log.level === 'warn').length} overflowCount={9999} color="orange">
                <Text strong>警告</Text>
              </Badge>
            </div>
            <div>
              <Text strong>当前会话: </Text>
              <Text code className="text-xs">{errorLogger.getSessionId()}</Text>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              icon={<RefreshCw className="w-4 h-4"  />}
              onClick={loadErrorLogs}
              disabled={loading}
            >
              刷新
            </Button>
            <Button
              icon={<Download className="w-4 h-4"  />}
              onClick={exportLogs}
            >
              导出
            </Button>
            <Button
              icon={<Trash2 className="w-4 h-4"  />}
              danger
              onClick={clearLogs}
            >
              清除
            </Button>
          </div>
        </div>
      </div>

      {/* 过滤器 */}
      <div>
        <div className="flex gap-2" wrap>
          <Search
            placeholder="搜索错误消息..."
            value={searchText}
            onValueChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="级别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部级别</SelectItem>
              <SelectItem value="error">错误</SelectItem>
              <SelectItem value="warn">警告</SelectItem>
              <SelectItem value="info">信息</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="promise">Promise</SelectItem>
              <SelectItem value="network">网络</SelectItem>
              <SelectItem value="console">控制台</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker
            value={dateRange?.[0]}
            onValueChange={(date) => setDateRange(date ? [date, dateRange?.[1]] : null)}
            showTime
            placeholder="开始时间"
            className="w-44"
          />
          <DatePicker
            value={dateRange?.[1]}
            onValueChange={(date) => setDateRange(dateRange?.[0] ? [dateRange[0], date] : null)}
            showTime
            placeholder="结束时间"
            className="w-44"
          />
        </div>
      </div>

      {/* 错误日志表格 */}
      <div>
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="id"
          size="small"
          disabled={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`}}
          scroll={{ x: 'max-content' }}
        />
      </div>

      {/* 错误详情弹窗 */}
      <Dialog
        title="错误详情"
        open={modalVisible}
        onOpenChange={(open) => !open && (() => setModalVisible(false))()}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedLog && (
          <div className="space-y-4">
            <Collapse defaultActiveKey={['basic', 'stack']} ghost>
              <Panel header="基本信息" key="basic">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Typography.Text className="font-semibold">时间:</Typography.Text> {new Date(selectedLog.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <Typography.Text className="font-semibold">级别:</Typography.Text> <Tag variant={getLevelDisplay(selectedLog.level).color}>{selectedLog.level}</Tag>
                  </div>
                  <div>
                    <Typography.Text className="font-semibold">类型:</Typography.Text> <Tag variant={getTypeColor(selectedLog.type)}>{selectedLog.type}</Tag>
                  </div>
                  <div>
                    <Typography.Text className="font-semibold">ID:</Typography.Text> <Typography.Text className="font-mono">{selectedLog.id}</Typography.Text>
                  </div>
                  {selectedLog.url && (
                    <div className="col-span-2">
                      <Text strong>来源:</Text> <Text code>{selectedLog.url}</Text>
                      {selectedLog.lineNumber && <Text>:{selectedLog.lineNumber}</Text>}
                      {selectedLog.columnNumber && <Text>:{selectedLog.columnNumber}</Text>}
                    </div>
                  )}
                  <div className="col-span-2">
                    <Text strong>页面:</Text> <Text code>{selectedLog.pathname || '-'}</Text>
                  </div>
                </div>
              </Panel>

              <Panel header="错误消息" key="message">
                <Paragraph code copyable>
                  {selectedLog.message}
                </Paragraph>
              </Panel>

              {selectedLog.stack && (
                <Panel header="错误堆栈" key="stack">
                  <Paragraph code copyable style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {selectedLog.stack}
                  </Paragraph>
                </Panel>
              )}

              {selectedLog.componentStack && (
                <Panel header="组件堆栈" key="component">
                  <Paragraph code copyable style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {selectedLog.componentStack}
                  </Paragraph>
                </Panel>
              )}

              {selectedLog.additional && Object.keys(selectedLog.additional).length > 0 && (
                <Panel header="附加信息" key="additional">
                  <Paragraph code copyable style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                    {JSON.stringify(selectedLog.additional, null, 2)}
                  </Paragraph>
                </Panel>
              )}
            </Collapse>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default ErrorLogViewer;