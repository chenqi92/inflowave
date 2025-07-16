/**
 * 数据验证工具类
 */
export class ValidationUtils {
  /**
   * 验证必填字段
   */
  static required(value: any, fieldName?: string): string | null {
    if (value === null || value === undefined || value === '') {
      return `${fieldName || '字段'}不能为空`;
    }
    return null;
  }

  /**
   * 验证字符串长度
   */
  static stringLength(
    value: string,
    min?: number,
    max?: number,
    fieldName?: string
  ): string | null {
    if (typeof value !== 'string') {
      return `${fieldName || '字段'}必须是字符串`;
    }

    if (min !== undefined && value.length < min) {
      return `${fieldName || '字段'}长度不能少于${min}个字符`;
    }

    if (max !== undefined && value.length > max) {
      return `${fieldName || '字段'}长度不能超过${max}个字符`;
    }

    return null;
  }

  /**
   * 验证数字范围
   */
  static numberRange(
    value: number,
    min?: number,
    max?: number,
    fieldName?: string
  ): string | null {
    if (typeof value !== 'number' || isNaN(value)) {
      return `${fieldName || '字段'}必须是有效数字`;
    }

    if (min !== undefined && value < min) {
      return `${fieldName || '字段'}不能小于${min}`;
    }

    if (max !== undefined && value > max) {
      return `${fieldName || '字段'}不能大于${max}`;
    }

    return null;
  }

  /**
   * 验证整数
   */
  static integer(value: number, fieldName?: string): string | null {
    if (!Number.isInteger(value)) {
      return `${fieldName || '字段'}必须是整数`;
    }
    return null;
  }

  /**
   * 验证正数
   */
  static positive(value: number, fieldName?: string): string | null {
    if (value <= 0) {
      return `${fieldName || '字段'}必须是正数`;
    }
    return null;
  }

  /**
   * 验证邮箱格式
   */
  static email(value: string, fieldName?: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${fieldName || '邮箱'}格式不正确`;
    }
    return null;
  }

  /**
   * 验证URL格式
   */
  static url(value: string, fieldName?: string): string | null {
    try {
      new URL(value);
      return null;
    } catch {
      return `${fieldName || 'URL'}格式不正确`;
    }
  }

  /**
   * 验证IP地址
   */
  static ipAddress(value: string, fieldName?: string): string | null {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    if (!ipv4Regex.test(value) && !ipv6Regex.test(value)) {
      return `${fieldName || 'IP地址'}格式不正确`;
    }

    // 验证IPv4地址的每个段
    if (ipv4Regex.test(value)) {
      const parts = value.split('.');
      for (const part of parts) {
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) {
          return `${fieldName || 'IP地址'}格式不正确`;
        }
      }
    }

    return null;
  }

  /**
   * 验证端口号
   */
  static port(value: number, fieldName?: string): string | null {
    const error = this.numberRange(value, 1, 65535, fieldName);
    if (error) return error;

    return this.integer(value, fieldName);
  }

  /**
   * 验证主机名
   */
  static hostname(value: string, fieldName?: string): string | null {
    const hostnameRegex =
      /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(\.[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])*$/;

    if (!hostnameRegex.test(value)) {
      return `${fieldName || '主机名'}格式不正确`;
    }

    if (value.length > 253) {
      return `${fieldName || '主机名'}长度不能超过253个字符`;
    }

    return null;
  }

  /**
   * 验证数据库名称
   */
  static databaseName(value: string, fieldName?: string): string | null {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      return `${fieldName || '数据库名称'}只能包含字母、数字和下划线，且必须以字母开头`;
    }

    if (value.length > 64) {
      return `${fieldName || '数据库名称'}长度不能超过64个字符`;
    }

    return null;
  }

  /**
   * 验证测量名称
   */
  static measurementName(value: string, fieldName?: string): string | null {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      return `${fieldName || '测量名称'}只能包含字母、数字和下划线，且必须以字母开头`;
    }

    if (value.length > 128) {
      return `${fieldName || '测量名称'}长度不能超过128个字符`;
    }

    return null;
  }

  /**
   * 验证字段名称
   */
  static fieldName(value: string, fieldName?: string): string | null {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      return `${fieldName || '字段名称'}只能包含字母、数字和下划线，且必须以字母开头`;
    }

    if (value.length > 64) {
      return `${fieldName || '字段名称'}长度不能超过64个字符`;
    }

    return null;
  }

  /**
   * 验证InfluxQL查询语句
   */
  static influxqlQuery(query: string): string | null {
    if (!query.trim()) {
      return '查询语句不能为空';
    }

    // 基本的SQL注入防护
    const dangerousPatterns = [
      /;\s*drop\s+/i,
      /;\s*delete\s+/i,
      /;\s*insert\s+/i,
      /;\s*update\s+/i,
      /;\s*create\s+/i,
      /;\s*alter\s+/i,
      /--/,
      /\/\*/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return '查询语句包含危险操作';
      }
    }

    // 检查查询语句长度
    if (query.length > 10000) {
      return '查询语句过长';
    }

    return null;
  }

  /**
   * 验证JSON格式
   */
  static json(value: string, fieldName?: string): string | null {
    try {
      JSON.parse(value);
      return null;
    } catch {
      return `${fieldName || 'JSON'}格式不正确`;
    }
  }

  /**
   * 验证时间格式
   */
  static timeFormat(
    value: string,
    format?: string,
    fieldName?: string
  ): string | null {
    // 这里可以使用dayjs等库进行更精确的时间格式验证
    const timeRegex = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/;

    if (!timeRegex.test(value)) {
      return `${fieldName || '时间'}格式不正确，应为 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss`;
    }

    return null;
  }

  /**
   * 验证文件路径
   */
  static filePath(value: string, fieldName?: string): string | null {
    // 检查路径中的危险字符
    const dangerousChars = ['<', '>', '|', '\0'];

    for (const char of dangerousChars) {
      if (value.includes(char)) {
        return `${fieldName || '文件路径'}包含非法字符`;
      }
    }

    if (value.length > 260) {
      return `${fieldName || '文件路径'}长度不能超过260个字符`;
    }

    return null;
  }

  /**
   * 验证密码强度
   */
  static passwordStrength(value: string, fieldName?: string): string | null {
    if (value.length < 8) {
      return `${fieldName || '密码'}长度不能少于8个字符`;
    }

    if (value.length > 128) {
      return `${fieldName || '密码'}长度不能超过128个字符`;
    }

    const hasLowerCase = /[a-z]/.test(value);
    const hasUpperCase = /[A-Z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);

    const strength = [
      hasLowerCase,
      hasUpperCase,
      hasNumbers,
      hasSpecialChar,
    ].filter(Boolean).length;

    if (strength < 3) {
      return `${fieldName || '密码'}强度不够，应包含大小写字母、数字和特殊字符中的至少3种`;
    }

    return null;
  }

  /**
   * 复合验证器
   */
  static validate(
    value: any,
    validators: Array<(value: any) => string | null>
  ): string[] {
    const errors: string[] = [];

    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * 验证连接配置
   */
  static connectionConfig(config: {
    name: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    database?: string;
  }): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    // 验证连接名称
    const nameErrors = this.validate(config.name, [
      v => this.required(v, '连接名称'),
      v => this.stringLength(v, 1, 100, '连接名称'),
    ]);
    if (nameErrors.length > 0) errors.name = nameErrors;

    // 验证主机
    const hostErrors = this.validate(config.host, [
      v => this.required(v, '主机地址'),
      v => {
        // 可以是IP地址或主机名
        const ipError = this.ipAddress(v);
        const hostnameError = this.hostname(v);
        return ipError && hostnameError ? '主机地址格式不正确' : null;
      },
    ]);
    if (hostErrors.length > 0) errors.host = hostErrors;

    // 验证端口
    const portErrors = this.validate(config.port, [
      v => this.required(v, '端口'),
      v => this.port(v, '端口'),
    ]);
    if (portErrors.length > 0) errors.port = portErrors;

    // 验证用户名（可选）
    if (config.username) {
      const usernameErrors = this.validate(config.username, [
        v => this.stringLength(v, 1, 50, '用户名'),
      ]);
      if (usernameErrors.length > 0) errors.username = usernameErrors;
    }

    // 验证密码（可选）
    if (config.password) {
      const passwordErrors = this.validate(config.password, [
        v => this.stringLength(v, 1, 128, '密码'),
      ]);
      if (passwordErrors.length > 0) errors.password = passwordErrors;
    }

    // 验证数据库名称（可选）
    if (config.database) {
      const databaseErrors = this.validate(config.database, [
        v => this.databaseName(v, '数据库名称'),
      ]);
      if (databaseErrors.length > 0) errors.database = databaseErrors;
    }

    return errors;
  }
}
