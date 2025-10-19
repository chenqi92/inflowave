/**
 * 日志工具类
 * 提供分级日志功能，支持环境变量控制
 */

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
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    // 🔧 根据环境变量设置日志级别
    const isDev = import.meta.env.DEV;
    const logLevelEnv = import.meta.env.VITE_LOG_LEVEL;

    let level = LogLevel.ERROR; // 生产环境默认只显示错误

    if (isDev) {
      // 开发环境默认显示 INFO 级别
      level = LogLevel.INFO;
    }

    // 允许通过环境变量覆盖
    if (logLevelEnv) {
      switch (logLevelEnv.toUpperCase()) {
        case 'ERROR':
          level = LogLevel.ERROR;
          break;
        case 'WARN':
          level = LogLevel.WARN;
          break;
        case 'INFO':
          level = LogLevel.INFO;
          break;
        case 'DEBUG':
          level = LogLevel.DEBUG;
          break;
      }
    }

    this.config = {
      level,
      enableEmoji: isDev,
      enableTimestamp: false, // 浏览器控制台已有时间戳
      enableStackTrace: false,
    };
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
   * 错误日志（总是显示）
   */
  error(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.ERROR) {
      console.error(...this.format('ERROR', '❌', message, ...args));
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.WARN) {
      console.warn(...this.format('WARN', '⚠️', message, ...args));
    }
  }

  /**
   * 信息日志
   */
  info(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.INFO) {
      console.log(...this.format('INFO', 'ℹ️', message, ...args));
    }
  }

  /**
   * 调试日志（仅开发环境）
   */
  debug(message: string, ...args: any[]) {
    if (this.config.level >= LogLevel.DEBUG) {
      console.log(...this.format('DEBUG', '🔍', message, ...args));
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

