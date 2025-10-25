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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Download, Trash2, RefreshCw, ChevronUp, ChevronDown, Filter, FileText, FileJson, FileSpreadsheet, Play, Pause, ChevronsDown } from 'lucide-react';
import { showMessage } from '@/utils/message';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { writeToClipboard } from '@/utils/clipboard';

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
  const handleCopyAll = async () => {
    const text = logs.map(log =>
      `[${log.timestamp.toLocaleString()}] [${log.level}] ${log.message}${log.args.length > 0 ? ` ${  JSON.stringify(log.args)}` : ''}`
    ).join('\n');

    try {
      await writeToClipboard(text);
      showMessage.success('日志已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      showMessage.error('复制日志失败');
    }
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
      // 生成安全的文件名（移除所有特殊字符）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
      const filePath = await save({
        defaultPath: `frontend-logs-${timestamp}.txt`,
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, text);
        showMessage.success(`已导出 ${logsToExport.length} 条日志到文本文件`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      showMessage.error(`导出失败: ${error}`);
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
      // 生成安全的文件名（移除所有特殊字符）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
      const filePath = await save({
        defaultPath: `frontend-logs-${timestamp}.json`,
        filters: [{
          name: 'JSON Files',
          extensions: ['json']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(jsonData, null, 2));
        showMessage.success(`已导出 ${logsToExport.length} 条日志到JSON文件`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      showMessage.error(`导出失败: ${error}`);
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
      // 生成安全的文件名（移除所有特殊字符）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
      const filePath = await save({
        defaultPath: `frontend-logs-${timestamp}.csv`,
        filters: [{
          name: 'CSV Files',
          extensions: ['csv']
        }]
      });

      if (filePath) {
        await writeTextFile(filePath, csvRows.join('\n'));
        showMessage.success(`已导出 ${logsToExport.length} 条日志到CSV文件`);
      }
    } catch (error) {
      console.error('导出失败:', error);
      showMessage.error(`导出失败: ${error}`);
    }
  };

  // 清空日志
  const handleClear = () => {
    logger.clearLogs();
    setLogs([]);
    setSelectedLogs(new Set());
    showMessage.success('日志已清空');
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
    <div className="flex flex-col h-full">
      {/* 工具栏 - 紧凑图标按钮 */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPaused ? '继续刷新' : '暂停刷新'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={loadLogs}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>刷新日志</TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoScroll ? 'default' : 'ghost'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setAutoScroll(!autoScroll)}
              >
                <ChevronsDown className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{autoScroll ? '关闭自动滚动' : '开启自动滚动'}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCopyAll}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制日志</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={exportAsText}
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>导出日志</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleClear}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>清空日志</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-2 font-mono text-sm bg-background">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无日志
            </div>
          ) : (
            logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-2 rounded shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] hover:bg-accent/30 transition-all duration-200"
                >
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
                    <div>{log.message}</div>
                    {log.args.length > 0 && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        {JSON.stringify(log.args, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;

