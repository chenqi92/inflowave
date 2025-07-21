import dayjs from 'dayjs';

/**
 * 格式化工具类
 */
export class FormatUtils {
  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  /**
   * 格式化数字
   */
  static formatNumber(
    value: number,
    options: {
      decimals?: number;
      thousandsSeparator?: string;
      decimalSeparator?: string;
      prefix?: string;
      suffix?: string;
    } = {}
  ): string {
    const {
      decimals = 2,
      thousandsSeparator = ',',
      decimalSeparator = '.',
      prefix = '',
      suffix = '',
    } = options;

    if (isNaN(value)) return 'NaN';
    if (!isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';

    const isNegative = value < 0;
    const absValue = Math.abs(value);

    const formatted = absValue.toFixed(decimals);

    // 分离整数和小数部分
    const parts = formatted.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // 添加千位分隔符
    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      thousandsSeparator
    );

    // 组装最终结果
    let result = formattedInteger;
    if (decimals > 0 && decimalPart) {
      result += decimalSeparator + decimalPart;
    }

    return `${prefix}${isNegative ? '-' : ''}${result}${suffix}`;
  }

  /**
   * 格式化百分比
   */
  static formatPercentage(value: number, decimals = 2): string {
    return this.formatNumber(value * 100, { decimals, suffix: '%' });
  }

  /**
   * 格式化时间
   */
  static formatTime(
    value: string | number | Date,
    format = 'YYYY-MM-DD HH:mm:ss'
  ): string {
    try {
      return dayjs(value).format(format);
    } catch {
      return String(value);
    }
  }

  /**
   * 格式化相对时间
   */
  static formatRelativeTime(value: string | number | Date): string {
    try {
      const now = dayjs();
      const target = dayjs(value);
      const diffInMinutes = now.diff(target, 'minute');
      const diffInHours = now.diff(target, 'hour');
      const diffInDays = now.diff(target, 'day');

      if (diffInMinutes < 1) {
        return '刚刚';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
      } else if (diffInHours < 24) {
        return `${diffInHours}小时前`;
      } else if (diffInDays < 7) {
        return `${diffInDays}天前`;
      } else {
        return target.format('YYYY-MM-DD');
      }
    } catch {
      return String(value);
    }
  }

  /**
   * 格式化持续时间（毫秒）
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 格式化查询结果大小
   */
  static formatQueryResultSize(rowCount: number, dataSize?: number): string {
    let result = `${this.formatNumber(rowCount, { decimals: 0 })} 行`;

    if (dataSize !== undefined) {
      result += ` (${this.formatFileSize(dataSize)})`;
    }

    return result;
  }

  /**
   * 格式化SQL
   */
  static formatSQL(sql: string): string {
    // 简单的SQL格式化
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      .replace(/\bSELECT\b/gi, '\nSELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bHAVING\b/gi, '\nHAVING')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bLIMIT\b/gi, '\nLIMIT')
      .replace(/\bAND\b/gi, '\n  AND')
      .replace(/\bOR\b/gi, '\n  OR')
      .trim();
  }

  /**
   * 格式化错误消息
   */
  static formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error);
    }

    return String(error);
  }

  /**
   * 截断文本
   */
  static truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 高亮搜索关键字
   */
  static highlightText(text: string, keyword: string): string {
    if (!keyword) return text;

    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * 格式化连接字符串
   */
  static formatConnectionString(config: {
    host: string;
    port: number;
    database?: string;
    username?: string;
  }): string {
    let result = `${config.host}:${config.port}`;

    if (config.database) {
      result += `/${config.database}`;
    }

    if (config.username) {
      result = `${config.username}@${result}`;
    }

    return result;
  }

  /**
   * 格式化键值对
   */
  static formatKeyValue(
    obj: Record<string, any>,
    options: {
      separator?: string;
      keyValueSeparator?: string;
      quote?: boolean;
    } = {}
  ): string {
    const {
      separator = ', ',
      keyValueSeparator = ': ',
      quote = false,
    } = options;

    return Object.entries(obj)
      .map(([key, value]) => {
        const formattedValue =
          quote && typeof value === 'string' ? `"${value}"` : String(value);
        return `${key}${keyValueSeparator}${formattedValue}`;
      })
      .join(separator);
  }

  /**
   * 格式化网络流量速率
   */
  static formatNetworkSpeed(bytesPerSecond: number, decimals = 1): { value: number; unit: string; formatted: string } {
    if (bytesPerSecond === 0) {
      return { value: 0, unit: 'B/s', formatted: '0 B/s' };
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s'];

    const i = Math.floor(Math.log(Math.abs(bytesPerSecond)) / Math.log(k));
    const clampedIndex = Math.min(i, sizes.length - 1);
    
    const value = parseFloat((bytesPerSecond / Math.pow(k, clampedIndex)).toFixed(dm));
    const unit = sizes[clampedIndex];
    const formatted = `${value} ${unit}`;

    return { value, unit, formatted };
  }

  /**
   * 格式化网络数据传输量
   */
  static formatNetworkData(bytes: number, decimals = 1): { value: number; unit: string; formatted: string } {
    if (bytes === 0) {
      return { value: 0, unit: 'B', formatted: '0 B' };
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const clampedIndex = Math.min(i, sizes.length - 1);
    
    const value = parseFloat((bytes / Math.pow(k, clampedIndex)).toFixed(dm));
    const unit = sizes[clampedIndex];
    const formatted = `${value} ${unit}`;

    return { value, unit, formatted };
  }

  /**
   * 格式化列表
   */
  static formatList(
    items: string[],
    options: {
      separator?: string;
      lastSeparator?: string;
      quote?: boolean;
    } = {}
  ): string {
    const { separator = ', ', lastSeparator = ' 和 ', quote = false } = options;

    if (items.length === 0) return '';
    if (items.length === 1) return quote ? `"${items[0]}"` : items[0];

    const formattedItems = quote ? items.map(item => `"${item}"`) : items;

    if (items.length === 2) {
      return formattedItems.join(lastSeparator);
    }

    const allButLast = formattedItems.slice(0, -1).join(separator);
    const last = formattedItems[formattedItems.length - 1];

    return `${allButLast}${lastSeparator}${last}`;
  }
}
