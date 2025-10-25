import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { RefreshCw, Download, Trash2, Pause, Play, Copy } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';

interface BackendLogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  rawLine: string;
}

interface BackendLogViewerProps {
  className?: string;
}

const BackendLogViewer: React.FC<BackendLogViewerProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<BackendLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // 解析日志行
  const parseLogLine = (line: string, index: number): BackendLogEntry | null => {
    if (!line.trim()) return null;

    // 尝试匹配日志格式: [时间戳] [级别] 消息
    // 例如: 2024-01-20T10:30:45.123Z INFO 这是一条日志
    const regex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s+(\w+)\s+(.+)$/;
    const match = line.match(regex);

    if (match) {
      return {
        id: `log-${index}`,
        timestamp: match[1],
        level: match[2].toUpperCase(),
        message: match[3],
        rawLine: line,
      };
    }

    // 如果不匹配标准格式，尝试其他格式
    // 格式2: [级别] 消息
    const regex2 = /^\[(\w+)\]\s+(.+)$/;
    const match2 = line.match(regex2);
    if (match2) {
      return {
        id: `log-${index}`,
        timestamp: new Date().toISOString(),
        level: match2[1].toUpperCase(),
        message: match2[2],
        rawLine: line,
      };
    }

    // 默认作为普通消息
    return {
      id: `log-${index}`,
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: line,
      rawLine: line,
    };
  };

  // 加载后端日志
  const loadLogs = async () => {
    try {
      const logContent = await safeTauriInvoke<string>('read_backend_logs');
      if (!logContent || logContent.trim() === '') {
        setLogs([]);
        return;
      }

      // 按行分割并解析
      const lines = logContent.split('\n');
      const parsedLogs: BackendLogEntry[] = [];

      lines.forEach((line: string, index: number) => {
        const parsed = parseLogLine(line, index);
        if (parsed) {
          parsedLogs.push(parsed);
        }
      });

      // 反转数组，使最新的日志在顶部
      setLogs(parsedLogs.reverse());
    } catch (error) {
      console.error('加载后端日志失败:', error);
      setLogs([]);
    }
  };

  // 初始加载和定时刷新
  useEffect(() => {
    loadLogs();

    if (!isPaused) {
      const interval = setInterval(loadLogs, 2000); // 每2秒刷新
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  // 自动滚动到顶部（最新日志在顶部）
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  // 清空后端日志
  const handleClear = async () => {
    try {
      await safeTauriInvoke('clear_backend_logs');
      setLogs([]);
      setSelectedLogs(new Set());
      showMessage.success('后端日志已清空');
    } catch (error) {
      console.error('清空后端日志失败:', error);
      showMessage.error('清空后端日志失败');
    }
  };

  // 复制日志
  const handleCopy = async () => {
    try {
      const logsToExport = selectedLogs.size > 0
        ? logs.filter(log => selectedLogs.has(log.id))
        : logs;

      const text = logsToExport.map(log => log.rawLine).join('\n');
      await writeToClipboard(text);
      showMessage.success(`已复制 ${logsToExport.length} 条日志到剪贴板`);
    } catch (error) {
      console.error('复制日志失败:', error);
      showMessage.error('复制日志失败');
    }
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

  // 导出日志
  const handleExport = async () => {
    try {
      const logsToExport = selectedLogs.size > 0
        ? logs.filter(log => selectedLogs.has(log.id))
        : logs;

      const text = logsToExport.map(log => log.rawLine).join('\n');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_');
      const filename = `backend-logs-${timestamp}.txt`;

      // 使用 Tauri 的文件保存对话框
      const { save } = await import('@tauri-apps/plugin-dialog');
      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }]
      });

      if (filePath) {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(filePath, text);
        showMessage.success(`已导出 ${logsToExport.length} 条日志`);
      }
    } catch (error) {
      console.error('导出日志失败:', error);
      showMessage.error('导出日志失败');
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? '继续刷新' : '暂停刷新'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadLogs}
            title="刷新日志"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded cursor-pointer"
            />
            自动滚动
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title="复制日志"
          >
            <Copy className="w-4 h-4" />
            复制
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            title="导出日志"
          >
            <Download className="w-4 h-4" />
            导出
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            title="清空日志"
          >
            <Trash2 className="w-4 h-4" />
            清空
          </Button>
        </div>
      </div>

      {/* 日志列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm bg-background"
      >
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无后端日志
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-accent/50 transition-colors"
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
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>

              {/* 级别 */}
              <Badge variant={getLevelColor(log.level) as any} className="shrink-0">
                {getLevelIcon(log.level)} {log.level}
              </Badge>

              {/* 消息 */}
              <div className="flex-1 break-all">
                {log.message}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BackendLogViewer;

