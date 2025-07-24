/**
 * 控制台日志拦截器
 * 拦截并记录所有控制台日志，包括 console.log, console.error, console.warn 等
 */

export interface ConsoleLogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
  stack?: string;
  source?: string;
}

class ConsoleLogger {
  private logs: ConsoleLogEntry[] = [];
  private listeners: Array<(log: ConsoleLogEntry) => void> = [];
  private maxLogs = 1000; // 最大日志数量
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor() {
    // 保存原始的 console 方法
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    this.setupInterceptors();
  }

  // 判断是否应该过滤特定的日志
  private shouldFilterLog(message: string, level: ConsoleLogEntry['level']): boolean {
    // 检查是否强制禁用所有控制台日志
    const disableConsoleLogs = process.env.DISABLE_CONSOLE_LOGS === 'true';
    if (disableConsoleLogs && (level === 'log' || level === 'info')) {
      return true;
    }
    
    // 在生产环境下过滤console.log和console.info
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && (level === 'log' || level === 'info')) {
      return true; // 过滤掉log和info级别的日志
    }
    
    // 在Tauri桌面环境下过滤console.log和console.info（除非在调试模式）
    const isTauriBuild = typeof window !== 'undefined' && !!window.__TAURI__;
    const isTauriDebug = process.env.TAURI_DEBUG === 'true';
    if (isTauriBuild && !isTauriDebug && (level === 'log' || level === 'info')) {
      return true; // 过滤掉log和info级别的日志
    }
    
    // 保留warn、error、debug级别的日志用于调试
    return false;
  }

  private setupInterceptors() {
    // 拦截 console.log
    console.log = (...args: any[]) => {
      const shouldCapture = this.captureLog('log', args);
      if (shouldCapture !== false) {
        this.originalConsole.log(...args);
      }
    };

    // 拦截 console.info
    console.info = (...args: any[]) => {
      const shouldCapture = this.captureLog('info', args);
      if (shouldCapture !== false) {
        this.originalConsole.info(...args);
      }
    };

    // 拦截 console.warn
    console.warn = (...args: any[]) => {
      const shouldCapture = this.captureLog('warn', args);
      if (shouldCapture !== false) {
        this.originalConsole.warn(...args);
      }
    };

    // 拦截 console.error
    console.error = (...args: any[]) => {
      const shouldCapture = this.captureLog('error', args);
      if (shouldCapture !== false) {
        this.originalConsole.error(...args);
      }
    };

    // 拦截 console.debug
    console.debug = (...args: any[]) => {
      const shouldCapture = this.captureLog('debug', args);
      if (shouldCapture !== false) {
        this.originalConsole.debug(...args);
      }
    };
  }

  private captureLog(level: ConsoleLogEntry['level'], args: any[]): boolean {
    const timestamp = new Date();
    const message = args.map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }).join(' ');

    // 过滤Monaco编辑器相关的错误日志
    if (this.shouldFilterLog(message, level)) {
      return false; // 不记录这些日志，也不在控制台显示
    }

    // 获取调用栈信息
    const stack = new Error().stack;
    let source = '';
    if (stack) {
      const lines = stack.split('\n');
      // 跳过前几行，找到实际的调用位置
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line && !line.includes('consoleLogger.ts') && !line.includes('node_modules')) {
          source = line.trim();
          break;
        }
      }
    }

    const logEntry: ConsoleLogEntry = {
      id: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      level,
      message,
      args,
      stack,
      source,
    };

    // 添加到日志数组
    this.logs.unshift(logEntry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(logEntry);
      } catch (error) {
        this.originalConsole.error('Console logger listener error:', error);
      }
    });

    return true; // 返回true表示应该继续处理日志
  }

  // 获取所有日志
  getLogs(): ConsoleLogEntry[] {
    return [...this.logs];
  }

  // 获取特定级别的日志
  getLogsByLevel(level: ConsoleLogEntry['level']): ConsoleLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  // 获取错误日志
  getErrorLogs(): ConsoleLogEntry[] {
    return this.logs.filter(log => log.level === 'error' || log.level === 'warn');
  }

  // 清空日志
  clearLogs() {
    this.logs = [];
  }

  // 添加监听器
  addListener(listener: (log: ConsoleLogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 搜索日志
  searchLogs(query: string): ConsoleLogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.source?.toLowerCase().includes(lowerQuery)
    );
  }

  // 过滤日志
  filterLogs(filters: {
    level?: ConsoleLogEntry['level'];
    startTime?: Date;
    endTime?: Date;
    source?: string;
  }): ConsoleLogEntry[] {
    return this.logs.filter(log => {
      if (filters.level && log.level !== filters.level) {
        return false;
      }
      if (filters.startTime && log.timestamp < filters.startTime) {
        return false;
      }
      if (filters.endTime && log.timestamp > filters.endTime) {
        return false;
      }
      if (filters.source && !log.source?.includes(filters.source)) {
        return false;
      }
      return true;
    });
  }

  // 恢复原始的 console 方法
  restore() {
    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;
  }
}

// 创建全局实例
export const consoleLogger = new ConsoleLogger();

// ConsoleLogEntry interface is already exported above