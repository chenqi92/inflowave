// 桌面应用专用错误日志系统
import { FileOperations } from './fileOperations';

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  type: 'javascript' | 'promise' | 'react' | 'network' | 'tauri' | 'console';
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  componentStack?: string;
  userAgent: string;
  pathname: string;
  additional?: Record<string, any>;
}

class ErrorLogger {
  private logFilePath: string;
  private _maxLogSize: number;
  private sessionId: string;
  private logBuffer: ErrorLogEntry[] = [];
  private flushTimer: number | null = null;

  constructor() {
    this.logFilePath = 'logs/error.log';
    this._maxLogSize = 10 * 1024 * 1024; // 10MB
    this.sessionId = this.generateSessionId();
    this.initializeLogging();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeLogging(): Promise<void> {
    try {
      // 桌面应用专用：初始化文件日志
      // 清除旧的错误日志
      await this.clearOldLogs();

      // 写入会话开始标记
      await this.writeSessionStart();

      // 设置全局错误处理器
      this.setupErrorHandlers();

      console.log(`🐛 错误日志系统已启动 - Session: ${this.sessionId}`);
    } catch (error) {
      console.error('错误日志系统初始化失败:', error);
    }
  }

  private async clearOldLogs(): Promise<void> {
    try {
      // 确保日志目录存在
      await FileOperations.createDir('logs');

      // 检查并删除旧的日志文件
      const exists = await FileOperations.fileExists(this.logFilePath);
      if (exists) {
        await FileOperations.deleteFile(this.logFilePath);
        console.log('已清除旧的错误日志');
      } else {
        console.log('无旧日志文件需要清除');
      }
    } catch (error) {
      console.warn('清除旧日志时出错:', error);
    }
  }

  private async writeSessionStart(): Promise<void> {
    const sessionInfo: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'javascript',
      level: 'info',
      message: `=== 新会话开始 ===`,
      userAgent: navigator.userAgent,
      pathname: window.location.pathname,
      additional: {
        sessionId: this.sessionId,
        appVersion: '1.0.5',
        timestamp: Date.now(),
        url: window.location.href,
      },
    };

    await this.writeLogEntry(sessionInfo);
  }

  private setupErrorHandlers(): void {
    // JavaScript 运行时错误
    window.addEventListener('error', event => {
      this.logError({
        type: 'javascript',
        level: 'error',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        additional: {
          error: event.error?.toString(),
        },
      });
    });

    // Promise 未处理拒绝
    window.addEventListener('unhandledrejection', event => {
      this.logError({
        type: 'promise',
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        additional: {
          reason: event.reason?.toString(),
          promise: event.promise,
        },
      });
    });

    // 网络错误
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.logError({
            type: 'network',
            level: 'error',
            message: `HTTP Error: ${response.status} ${response.statusText}`,
            additional: {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
            },
          });
        }
        return response;
      } catch (error) {
        this.logError({
          type: 'network',
          level: 'error',
          message: `Network Error: ${error}`,
          stack: (error as Error)?.stack,
          additional: {
            url: args[0],
            error: error?.toString(),
          },
        });
        throw error;
      }
    };

    // 拦截 console.error 和 console.warn
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      originalError.apply(console, args);
      this.logError({
        type: 'console',
        level: 'error',
        message: args
          .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
          .join(' '),
        additional: {
          args: args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
          ),
        },
      });
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.logError({
        type: 'console',
        level: 'warn',
        message: args
          .map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
          .join(' '),
        additional: {
          args: args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
          ),
        },
      });
    };
  }

  public logError(errorInfo: Partial<ErrorLogEntry>): void {
    const logEntry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: errorInfo.type || 'javascript',
      level: errorInfo.level || 'error',
      message: errorInfo.message || 'Unknown error',
      stack: errorInfo.stack,
      url: errorInfo.url,
      lineNumber: errorInfo.lineNumber,
      columnNumber: errorInfo.columnNumber,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      pathname: window.location.pathname,
      additional: errorInfo.additional,
    };

    // 添加到缓冲区
    this.logBuffer.push(logEntry);

    // 延迟写入，避免频繁 I/O
    this.scheduleFlush();

    // 同时输出到控制台（开发环境）
    try {
      if ((import.meta as any)?.env?.DEV) {
        console.group(`🐛 Error Logged [${logEntry.type}:${logEntry.level}]`);
        console.log('Message:', logEntry.message);
        if (logEntry.stack) console.log('Stack:', logEntry.stack);
        if (logEntry.additional)
          console.log('Additional:', logEntry.additional);
        console.groupEnd();
      }
    } catch {
      // Ignore errors when accessing import.meta
    }
  }

  public logReactError(
    error: Error,
    errorInfo: { componentStack: string }
  ): void {
    this.logError({
      type: 'react',
      level: 'error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      additional: {
        errorName: error.name,
        componentStack: errorInfo.componentStack,
      },
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = window.setTimeout(() => {
      this.flushLogs();
    }, 1000) as unknown as number; // 1秒后写入
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    // 桌面应用专用：写入日志文件

    try {
      const logsToWrite = [...this.logBuffer];
      this.logBuffer = [];

      await this.writeLogEntries(logsToWrite);
    } catch (error) {
      console.error('写入错误日志失败:', error);
      // 将日志重新放回缓冲区
      this.logBuffer.unshift(...this.logBuffer);
    }
  }

  private async writeLogEntries(entries: ErrorLogEntry[]): Promise<void> {
    const logContent = `${entries.map(entry => this.formatLogEntry(entry)).join('\n')}\n`;

    try {
      // 尝试追加到文件
      await FileOperations.appendToFile(this.logFilePath, logContent);
    } catch (error) {
      // 如果追加失败，尝试创建新文件
      try {
        await FileOperations.writeFile(this.logFilePath, logContent);
      } catch (writeError) {
        console.error('无法写入错误日志文件:', writeError);
        // 如果文件操作失败，至少输出到控制台
        console.log('错误日志内容:', logContent);
      }
    }
  }

  private async writeLogEntry(entry: ErrorLogEntry): Promise<void> {
    await this.writeLogEntries([entry]);
  }

  private formatLogEntry(entry: ErrorLogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${this.sessionId}]`,
      `[${entry.type.toUpperCase()}:${entry.level.toUpperCase()}]`,
      `${entry.message}`,
    ];

    let formatted = parts.join(' ');

    if (entry.url) {
      formatted += `\n  URL: ${entry.url}`;
      if (entry.lineNumber) {
        formatted += `:${entry.lineNumber}`;
        if (entry.columnNumber) {
          formatted += `:${entry.columnNumber}`;
        }
      }
    }

    if (entry.pathname) {
      formatted += `\n  Page: ${entry.pathname}`;
    }

    if (entry.stack) {
      formatted += `\n  Stack: ${entry.stack
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n')}`;
    }

    if (entry.componentStack) {
      formatted += `\n  Component Stack: ${entry.componentStack
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n')}`;
    }

    if (entry.additional) {
      formatted += `\n  Additional: ${JSON.stringify(entry.additional, null, 2)
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n')}`;
    }

    formatted += `\n${'='.repeat(80)}`;

    return formatted;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 公共方法：手动记录错误
  public async logCustomError(
    message: string,
    additional?: Record<string, any>
  ): Promise<void> {
    this.logError({
      type: 'javascript',
      level: 'error',
      message,
      additional,
    });
  }

  public async logCustomWarning(
    message: string,
    additional?: Record<string, any>
  ): Promise<void> {
    this.logError({
      type: 'javascript',
      level: 'warn',
      message,
      additional,
    });
  }

  // 获取当前会话ID
  public getSessionId(): string {
    return this.sessionId;
  }

  // 立即刷新日志缓冲区
  public async forceFlush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushLogs();
  }

  // 清理资源
  public async cleanup(): Promise<void> {
    await this.forceFlush();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
  }
}

// 创建全局实例
export const errorLogger = new ErrorLogger();

// 导出类型和实例
export default ErrorLogger;
