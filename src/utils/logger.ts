/**
 * 日志工具类
 * 提供分级日志功能，支持文件持久化
 */

import { FileOperations } from './fileOperations';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LoggerConfig {
  level: LogLevel;
  enableEmoji: boolean;
  enableTimestamp: boolean;
  enableStackTrace: boolean;
  enableFileLogging: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  args: any[];
  stack?: string;
  source?: string;
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private logBuffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushInterval = 2000; // 2秒批量写入
  private maxLogs = 1000;
  private logFilePath = 'logs/frontend.log';
  private sessionId: string;
  private maxFileSizeMB = 10; // 默认10MB
  private maxFiles = 5; // 默认保留5个文件
  private currentFileSize = 0; // 当前文件大小（字节）
  private isWritingLog = false; // 防止日志写入递归
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  constructor() {
    // 保存原始 console 方法
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // 生成会话ID
    this.sessionId = this.generateSessionId();

    // 🔧 初始化默认配置
    const isDev = import.meta.env.DEV;

    this.config = {
      level: isDev ? LogLevel.INFO : LogLevel.ERROR,
      enableEmoji: isDev,
      enableTimestamp: false,
      enableStackTrace: false,
      enableFileLogging: false, // 默认关闭，等待用户设置
    };

    // 🔧 从 localStorage 同步加载用户设置
    this.loadConfigFromStorage();

    // 初始化文件日志
    if (this.config.enableFileLogging) {
      this.initializeFileLogging();
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 从 localStorage 同步加载日志配置
   */
  private loadConfigFromStorage(): void {
    try {
      const prefsStr = localStorage.getItem('user-preferences');
      if (prefsStr) {
        const prefs = JSON.parse(prefsStr);
        if (prefs?.state?.preferences?.logging) {
          const logging = prefs.state.preferences.logging;
          this.setLevel(this.stringToLogLevel(logging.level));
          this.config.enableFileLogging = logging.enable_file_logging ?? false;
          this.maxFileSizeMB = logging.max_file_size_mb ?? 10;
          this.maxFiles = logging.max_files ?? 5;
        }
      }
    } catch (error) {
      // 静默失败，使用默认配置
    }
  }

  /**
   * 初始化文件日志
   */
  private async initializeFileLogging(): Promise<void> {
    try {
      await this.clearOldLogs();
      await this.writeSessionStart();
      this.originalConsole.log(`📝 前端日志系统已启动 - Session: ${this.sessionId}`);
    } catch (error) {
      this.originalConsole.error('前端日志系统初始化失败:', error);
    }
  }

  /**
   * 清除旧日志
   */
  private async clearOldLogs(): Promise<void> {
    try {
      await FileOperations.createDir('logs');
      const exists = await FileOperations.fileExists(this.logFilePath);
      if (exists) {
        await FileOperations.deleteFile(this.logFilePath);
      }
    } catch (error) {
      this.originalConsole.warn('清除旧日志失败:', error);
    }
  }

  /**
   * 写入会话开始标记
   */
  private async writeSessionStart(): Promise<void> {
    const now = new Date();
    const localTime = this.formatLocalTimestamp(now);
    const sessionInfo = `
${'='.repeat(80)}
=== 前端日志会话开始 ===
Session ID: ${this.sessionId}
时间: ${localTime}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
${'='.repeat(80)}
`;

    try {
      await FileOperations.writeFile(this.logFilePath, sessionInfo);
    } catch (error) {
      this.originalConsole.error('写入会话开始标记失败:', error);
    }
  }

  /**
   * 字符串转 LogLevel
   */
  private stringToLogLevel(level: string): LogLevel {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return LogLevel.ERROR;
      case 'WARN':
        return LogLevel.WARN;
      case 'INFO':
        return LogLevel.INFO;
      case 'DEBUG':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel) {
    this.config.level = level;
  }

  /**
   * 获取当前日志级别
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 格式化日志消息
   */
  private format(level: string, emoji: string, message: string, ...args: any[]): any[] {
    const parts: any[] = [];

    if (this.config.enableEmoji) {
      parts.push(`${emoji} [${level}]`);
    } else {
      parts.push(`[${level}]`);
    }

    parts.push(message);
    parts.push(...args);

    return parts;
  }

  /**
   * 记录日志到文件
   */
  private recordLog(level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG', message: string, args: any[]): void {
    if (!this.config.enableFileLogging) {
      return;
    }

    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      args,
    };

    // 添加到日志数组
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 添加到缓冲区
    this.logBuffer.push(logEntry);
    this.scheduleFlush();
  }

  /**
   * 调度日志刷新
   */
  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushLogs();
      this.flushTimer = null;
    }, this.flushInterval);
  }

  /**
   * 刷新日志到文件
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    // 防止递归调用
    if (this.isWritingLog) {
      return;
    }

    this.isWritingLog = true;
    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.writeLogEntries(logsToWrite);
    } catch (error) {
      this.originalConsole.error('写入日志失败:', error);
    } finally {
      this.isWritingLog = false;
    }
  }

  /**
   * 写入日志条目
   */
  private async writeLogEntries(entries: LogEntry[]): Promise<void> {
    const logContent = `${entries.map(entry => this.formatLogEntry(entry)).join('\n')  }\n`;
    const contentSize = new Blob([logContent]).size;

    // 检查是否需要轮转
    await this.checkAndRotateLog(contentSize);

    try {
      await FileOperations.appendToFile(this.logFilePath, logContent);
      this.currentFileSize += contentSize;
    } catch (error) {
      try {
        await FileOperations.writeFile(this.logFilePath, logContent);
        this.currentFileSize = contentSize;
      } catch (writeError) {
        this.originalConsole.error('无法写入日志文件:', writeError);
      }
    }
  }

  /**
   * 检查并轮转日志文件
   * 注意：此方法中的所有日志都使用 originalConsole 而不是 logger 方法，避免循环依赖
   */
  private async checkAndRotateLog(newContentSize: number): Promise<void> {
    try {
      // 获取当前文件大小
      const exists = await FileOperations.fileExists(this.logFilePath);
      if (!exists) {
        this.currentFileSize = 0;
        return;
      }

      // 尝试获取文件信息，如果失败则跳过大小检查
      try {
        const fileInfo = await FileOperations.getFileInfo(this.logFilePath);
        this.currentFileSize = fileInfo.size;
      } catch {
        // 获取文件信息失败，使用缓存的大小或跳过检查
        // 不记录错误，避免循环
        return;
      }

      // 检查是否超过大小限制
      const maxSizeBytes = this.maxFileSizeMB * 1024 * 1024;
      if (this.currentFileSize + newContentSize > maxSizeBytes) {
        await this.rotateLogFile();
      }
    } catch {
      // 静默失败，不使用 logger 避免循环
    }
  }

  /**
   * 轮转日志文件
   */
  private async rotateLogFile(): Promise<void> {
    try {
      // 使用本地时间生成文件名（不含时区后缀，格式：YYYY-MM-DDTHH-MM-SS）
      const now = new Date();
      const timestamp = this.formatLocalTimestamp(now)
        .replace(/[:.]/g, '-')
        .replace(/[+-]\d{2}:\d{2}$/, ''); // 移除时区后缀
      const rotatedPath = `logs/frontend-${timestamp}.log`;

      // 读取当前日志内容
      const content = await FileOperations.readFile(this.logFilePath);

      // 写入到新的归档文件
      await FileOperations.writeFile(rotatedPath, content);

      // 清空当前日志文件
      await FileOperations.deleteFile(this.logFilePath);
      this.currentFileSize = 0;

      this.originalConsole.log(`📝 日志文件已轮转: ${rotatedPath}`);

      // 清理旧日志文件
      await this.cleanupOldLogs();
    } catch (error) {
      this.originalConsole.error('轮转日志文件失败:', error);
    }
  }

  /**
   * 清理旧日志文件
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      // 注意：这里需要后端支持列出目录文件的功能
      // 由于当前 FileOperations 没有 listFiles 方法，我们暂时跳过
      // TODO: 实现文件列表功能后完善此方法
      this.originalConsole.log('📝 日志清理功能待实现（需要后端支持）');
    } catch (error) {
      this.originalConsole.warn('清理旧日志失败:', error);
    }
  }

  /**
   * 格式化时间戳为本地时间（ISO格式但使用本地时区）
   */
  private formatLocalTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');

    // 获取时区偏移（分钟）
    const tzOffset = -date.getTimezoneOffset();
    const tzHours = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
    const tzMinutes = String(Math.abs(tzOffset) % 60).padStart(2, '0');
    const tzSign = tzOffset >= 0 ? '+' : '-';

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${tzSign}${tzHours}:${tzMinutes}`;
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = this.formatLocalTimestamp(entry.timestamp);
    const levelStr = entry.level.padEnd(5);

    let formatted = `[${timestamp}] [${levelStr}] ${entry.message}`;

    if (entry.args.length > 0) {
      const argsStr = entry.args.map(arg => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');
      formatted += ` ${argsStr}`;
    }

    return formatted;
  }

  /**
   * 错误日志（总是显示）
   */
  error(message: string, ...args: any[]) {
    this.recordLog('ERROR', message, args);
    if (this.config.level >= LogLevel.ERROR) {
      this.originalConsole.error(...this.format('ERROR', '❌', message, ...args));
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]) {
    this.recordLog('WARN', message, args);
    if (this.config.level >= LogLevel.WARN) {
      this.originalConsole.warn(...this.format('WARN', '⚠️', message, ...args));
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]) {
    this.recordLog('INFO', message, args);
    if (this.config.level >= LogLevel.INFO) {
      this.originalConsole.log(...this.format('INFO', 'ℹ️', message, ...args));
    }
  }

  /**
   * 调试日志（仅开发环境）
   */
  debug(message: string, ...args: any[]) {
    this.recordLog('DEBUG', message, args);
    if (this.config.level >= LogLevel.DEBUG) {
      this.originalConsole.log(...this.format('DEBUG', '🔍', message, ...args));
    }
  }

  /**
   * 性能日志（渲染、操作等）
   */
  perf(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.log(...this.format('PERF', '⚡', message, ...args));
    }
  }

  /**
   * 渲染日志（组件渲染）
   */
  render(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.log(...this.format('RENDER', '🎨', message, ...args));
    }
  }

  /**
   * 数据日志（数据加载、更新等）
   */
  data(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.log(...this.format('DATA', '📊', message, ...args));
    }
  }

  /**
   * 网络日志（API 调用等）
   */
  network(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.log(...this.format('NETWORK', '🌐', message, ...args));
    }
  }

  /**
   * 存储日志（Store 更新等）
   */
  store(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.log(...this.format('STORE', '📁', message, ...args));
    }
  }

  /**
   * 分组日志开始
   */
  group(label: string) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.group(label);
    }
  }

  /**
   * 分组日志结束
   */
  groupEnd() {
    if (this.config.level >= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }

  /**
   * 计时开始
   */
  time(label: string) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.time(label);
    }
  }

  /**
   * 计时结束
   */
  timeEnd(label: string) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.timeEnd(label);
    }
  }

  /**
   * 表格日志
   */
  table(data: any) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.table(data);
    }
  }

  /**
   * 启用文件日志
   */
  async enableFileLogging(): Promise<void> {
    if (this.config.enableFileLogging) {
      return;
    }
    this.config.enableFileLogging = true;
    await this.initializeFileLogging();
  }

  /**
   * 禁用文件日志
   */
  disableFileLogging(): void {
    this.config.enableFileLogging = false;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 获取特定级别的日志
   */
  getLogsByLevel(level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 立即刷新日志到文件
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushLogs();
  }

  /**
   * 获取过滤后的日志
   */
  getFilteredLogs(level?: LogLevel, search?: string): LogEntry[] {
    let filtered = [...this.logs];

    // 按级别过滤
    if (level !== undefined) {
      const levelMap: Record<LogLevel, string[]> = {
        [LogLevel.ERROR]: ['ERROR'],
        [LogLevel.WARN]: ['ERROR', 'WARN'],
        [LogLevel.INFO]: ['ERROR', 'WARN', 'INFO'],
        [LogLevel.DEBUG]: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
      };
      const allowedLevels = levelMap[level];
      filtered = filtered.filter(log => allowedLevels.includes(log.level));
    }

    // 按关键词搜索
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.args).toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }
}

// 导出单例
export const logger = new Logger();

// 导出便捷方法
export const log = {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  debug: logger.debug.bind(logger),
  perf: logger.perf.bind(logger),
  render: logger.render.bind(logger),
  data: logger.data.bind(logger),
  network: logger.network.bind(logger),
  store: logger.store.bind(logger),
  group: logger.group.bind(logger),
  groupEnd: logger.groupEnd.bind(logger),
  time: logger.time.bind(logger),
  timeEnd: logger.timeEnd.bind(logger),
  table: logger.table.bind(logger),
};

export default logger;

