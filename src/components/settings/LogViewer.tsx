/**
 * 日志查看器组件
 * 显示实时日志流，支持过滤和搜索
 */

import React, { useState, useEffect, useRef } from 'react';
import { logger, LogLevel, LogEntry } from '@/utils/logger';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, Download, Trash2, RefreshCw, ChevronUp, ChevronDown, Filter, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel>(LogLevel.DEBUG);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [highlightSearch, setHighlightSearch] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | '1h' | '30m' | '5m'>('all');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());

  // 加载日志
  const loadLogs = () => {
    let allLogs = logger.getFilteredLogs(filterLevel);

    // 时间过滤
    if (timeFilter !== 'all') {
      const now = Date.now();
      const timeMap = {
        '5m': 5 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
      };
      const timeLimit = timeMap[timeFilter];
      allLogs = allLogs.filter(log => now - log.timestamp.getTime() < timeLimit);
    }

    // 搜索过滤
    if (searchQuery && searchQuery.trim()) {
      if (useRegex) {
        try {
          const regex = new RegExp(searchQuery, 'i');
          allLogs = allLogs.filter(log =>
            regex.test(log.message) || regex.test(JSON.stringify(log.args))
          );
        } catch (e) {
          // 正则表达式无效，使用普通搜索
          const searchLower = searchQuery.toLowerCase();
          allLogs = allLogs.filter(log =>
            log.message.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.args).toLowerCase().includes(searchLower)
          );
        }
      } else {
        const searchLower = searchQuery.toLowerCase();
        allLogs = allLogs.filter(log =>
          log.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.args).toLowerCase().includes(searchLower)
        );
      }
    }

    setLogs(allLogs);
    setCurrentMatchIndex(0);
  };

  // 初始加载和定时刷新
  useEffect(() => {
    loadLogs();

    if (!isPaused) {
      const interval = setInterval(loadLogs, 1000); // 每秒刷新
      return () => clearInterval(interval);
    }
  }, [filterLevel, searchQuery, isPaused, useRegex, timeFilter]);

  // 自动滚动到顶部（最新日志在顶部）
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // 复制所有日志
  const handleCopyAll = () => {
    const text = logs.map(log => 
      `[${log.timestamp.toLocaleString()}] [${log.level}] ${log.message}${log.args.length > 0 ? ` ${  JSON.stringify(log.args)}` : ''}`
    ).join('\n');
    
    navigator.clipboard.writeText(text);
    toast.success('日志已复制到剪贴板');
  };

  // 导出为文本格式
  const exportAsText = async () => {
    const logsToExport = selectedLogs.size > 0
      ? logs.filter(log => selectedLogs.has(log.id))
      : logs;

    const text = logsToExport.map(log =>
      `[${log.timestamp.toLocaleString()}] [${log.level}] ${log.message}${log.args.length > 0 ? ` ${  JSON.stringify(log.args)}` : ''}`
    ).join('\n');

    try {
      const filePath = await save({
        defaultPath: `logs-${new Date().toISOString().replace(/:/g, '-')}.txt`,
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, text);
        toast.success(`已导出 ${logsToExport.length} 条日志到文本文件`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  // 导出为JSON格式
  const exportAsJSON = async () => {
    const logsToExport = selectedLogs.size > 0
      ? logs.filter(log => selectedLogs.has(log.id))
      : logs;

    const jsonData = logsToExport.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      message: log.message,
      args: log.args,
      stack: log.stack,
      source: log.source,
    }));

    try {
      const filePath = await save({
        defaultPath: `logs-${new Date().toISOString().replace(/:/g, '-')}.json`,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(jsonData, null, 2));
        toast.success(`已导出 ${logsToExport.length} 条日志到JSON文件`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  // 导出为CSV格式
  const exportAsCSV = async () => {
    const logsToExport = selectedLogs.size > 0
      ? logs.filter(log => selectedLogs.has(log.id))
      : logs;

    const headers = ['Timestamp', 'Level', 'Message', 'Args', 'Source'];
    const csvRows = [
      headers.join(','),
      ...logsToExport.map(log => [
        `"${log.timestamp.toISOString()}"`,
        `"${log.level}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.args).replace(/"/g, '""')}"`,
        `"${log.source || ''}"`,
      ].join(','))
    ];

    try {
      const filePath = await save({
        defaultPath: `logs-${new Date().toISOString().replace(/:/g, '-')}.csv`,
        filters: [{
          name: 'CSV Files',
          extensions: ['csv']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, csvRows.join('\n'));
        toast.success(`已导出 ${logsToExport.length} 条日志到CSV文件`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    }
  };

  // 清空日志
  const handleClear = () => {
    logger.clearLogs();
    setLogs([]);
    setSelectedLogs(new Set());
    toast.success('日志已清空');
  };

  // 切换日志选择
  const toggleLogSelection = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(logs.map(log => log.id)));
    }
  };

  // 获取日志级别颜色
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'destructive';
      case 'WARN': return 'warning';
      case 'INFO': return 'default';
      case 'DEBUG': return 'secondary';
      default: return 'default';
    }
  };

  // 获取日志级别图标
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'ERROR': return '❌';
      case 'WARN': return '⚠️';
      case 'INFO': return 'ℹ️';
      case 'DEBUG': return '🔍';
      default: return '📝';
    }
  };

  // 高亮搜索关键词
  const highlightText = (text: string) => {
    if (!highlightSearch || !searchQuery || !searchQuery.trim()) {
      return text;
    }

    if (useRegex) {
      try {
        const regex = new RegExp(`(${searchQuery})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-300 dark:bg-yellow-600">{part}</mark>
          ) : part
        );
      } catch (e) {
        return text;
      }
    } else {
      const searchLower = searchQuery.toLowerCase();
      const index = text.toLowerCase().indexOf(searchLower);
      if (index === -1) return text;

      return (
        <>
          {text.substring(0, index)}
          <mark className="bg-yellow-300 dark:bg-yellow-600">
            {text.substring(index, index + searchQuery.length)}
          </mark>
          {text.substring(index + searchQuery.length)}
        </>
      );
    }
  };

  // 导航到上一个匹配
  const navigateToPrevMatch = () => {
    if (logs.length === 0) return;
    setCurrentMatchIndex((prev) => (prev > 0 ? prev - 1 : logs.length - 1));
  };

  // 导航到下一个匹配
  const navigateToNextMatch = () => {
    if (logs.length === 0) return;
    setCurrentMatchIndex((prev) => (prev < logs.length - 1 ? prev + 1 : 0));
  };

  // 快速过滤预设
  const applyQuickFilter = (preset: 'errors' | 'recent' | 'all') => {
    switch (preset) {
      case 'errors':
        setFilterLevel(LogLevel.ERROR);
        setTimeFilter('all');
        break;
      case 'recent':
        setFilterLevel(LogLevel.DEBUG);
        setTimeFilter('5m');
        break;
      case 'all':
        setFilterLevel(LogLevel.DEBUG);
        setTimeFilter('all');
        break;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 快速过滤预设 */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyQuickFilter('errors')}
          >
            仅错误
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyQuickFilter('recent')}
          >
            最近5分钟
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyQuickFilter('all')}
          >
            全部
          </Button>
        </div>

        {/* 高级过滤开关 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter className="w-4 h-4 mr-1" />
          {showAdvancedFilters ? '隐藏' : '显示'}过滤器
        </Button>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '继续' : '暂停'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
          >
            <Copy className="w-4 h-4 mr-1" />
            复制
          </Button>

          {/* 导出菜单 */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="w-4 h-4 mr-1" />
              导出 {selectedLogs.size > 0 && `(${selectedLogs.size})`}
            </Button>

            {showExportMenu && (
              <Card className="absolute right-0 top-full mt-2 z-50 p-2 min-w-[150px]">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      exportAsText();
                      setShowExportMenu(false);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    文本格式 (.txt)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      exportAsJSON();
                      setShowExportMenu(false);
                    }}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON格式 (.json)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      exportAsCSV();
                      setShowExportMenu(false);
                    }}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV格式 (.csv)
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            清空
          </Button>
        </div>
      </div>

      {/* 高级过滤器 */}
      {showAdvancedFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 日志级别 */}
            <div className="space-y-2">
              <Label>日志级别</Label>
              <Select
                value={filterLevel.toString()}
                onValueChange={(value) => setFilterLevel(parseInt(value) as LogLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LogLevel.ERROR.toString()}>ERROR</SelectItem>
                  <SelectItem value={LogLevel.WARN.toString()}>WARN+</SelectItem>
                  <SelectItem value={LogLevel.INFO.toString()}>INFO+</SelectItem>
                  <SelectItem value={LogLevel.DEBUG.toString()}>ALL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 时间范围 */}
            <div className="space-y-2">
              <Label>时间范围</Label>
              <Select
                value={timeFilter}
                onValueChange={(value: any) => setTimeFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="5m">最近5分钟</SelectItem>
                  <SelectItem value="30m">最近30分钟</SelectItem>
                  <SelectItem value="1h">最近1小时</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 搜索选项 */}
            <div className="space-y-2">
              <Label>搜索选项</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="regex-mode"
                    checked={useRegex}
                    onCheckedChange={setUseRegex}
                  />
                  <Label htmlFor="regex-mode" className="text-sm cursor-pointer">
                    正则表达式
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="highlight-mode"
                    checked={highlightSearch}
                    onCheckedChange={setHighlightSearch}
                  />
                  <Label htmlFor="highlight-mode" className="text-sm cursor-pointer">
                    高亮
                  </Label>
                </div>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="space-y-2">
              <Label>搜索</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={useRegex ? "正则表达式..." : "搜索关键词..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                {searchQuery && logs.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={navigateToPrevMatch}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={navigateToNextMatch}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>总计: {logs.length} 条</span>
        {selectedLogs.size > 0 && (
          <span>已选: {selectedLogs.size} 条</span>
        )}
        {searchQuery && logs.length > 0 && (
          <span>匹配: {currentMatchIndex + 1} / {logs.length}</span>
        )}
        {logs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
          >
            {selectedLogs.size === logs.length ? '取消全选' : '全选'}
          </Button>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          自动滚动
        </label>
      </div>

      {/* 日志列表 */}
      <Card className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-2 font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无日志
            </div>
          ) : (
            logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-2 rounded hover:bg-accent/50 transition-colors ${
                    searchQuery && index === currentMatchIndex ? 'bg-accent border-2 border-primary' : ''
                  }`}
                >
                  {/* 选择框 */}
                  <input
                    type="checkbox"
                    checked={selectedLogs.has(log.id)}
                    onChange={() => toggleLogSelection(log.id)}
                    className="mt-1 rounded cursor-pointer"
                  />

                  {/* 时间戳 */}
                  <span className="text-muted-foreground whitespace-nowrap text-xs">
                    {log.timestamp.toLocaleTimeString()}
                  </span>

                  {/* 级别 */}
                  <Badge variant={getLevelColor(log.level) as any} className="shrink-0">
                    {getLevelIcon(log.level)} {log.level}
                  </Badge>

                  {/* 消息 */}
                  <div className="flex-1 break-all">
                    <div>{highlightText(log.message)}</div>
                    {log.args.length > 0 && (
                      <div className="text-muted-foreground mt-1">
                        {highlightText(JSON.stringify(log.args, null, 2))}
                      </div>
                    )}
                    {log.stack && (
                      <details className="mt-1 text-xs text-muted-foreground">
                        <summary className="cursor-pointer">堆栈跟踪</summary>
                        <pre className="mt-1 whitespace-pre-wrap">{log.stack}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
        </div>
      </Card>
    </div>
  );
};

export default LogViewer;

