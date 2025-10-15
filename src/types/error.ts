/**
 * 错误类型定义
 * 统一的错误分类、错误信息和恢复建议
 */

/**
 * 错误类别
 */
export enum ErrorCategory {
  /** 网络错误 */
  NETWORK = 'network',
  /** 数据库连接错误 */
  DATABASE_CONNECTION = 'database_connection',
  /** 数据库查询错误 */
  DATABASE_QUERY = 'database_query',
  /** 认证错误 */
  AUTHENTICATION = 'authentication',
  /** 权限错误 */
  PERMISSION = 'permission',
  /** 数据验证错误 */
  VALIDATION = 'validation',
  /** 文件操作错误 */
  FILE_OPERATION = 'file_operation',
  /** 配置错误 */
  CONFIGURATION = 'configuration',
  /** 系统错误 */
  SYSTEM = 'system',
  /** 未知错误 */
  UNKNOWN = 'unknown',
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  /** 信息 */
  INFO = 'info',
  /** 警告 */
  WARNING = 'warning',
  /** 错误 */
  ERROR = 'error',
  /** 严重错误 */
  CRITICAL = 'critical',
}

/**
 * 恢复建议
 */
export interface RecoverySuggestion {
  /** 建议标题 */
  title: string;
  /** 建议描述 */
  description: string;
  /** 操作按钮文本 */
  actionLabel?: string;
  /** 操作回调 */
  action?: () => void | Promise<void>;
  /** 图标 */
  icon?: string;
}

/**
 * 错误详情
 */
export interface ErrorDetails {
  /** 错误类别 */
  category: ErrorCategory;
  /** 错误严重程度 */
  severity: ErrorSeverity;
  /** 原始错误 */
  originalError?: Error | unknown;
  /** 错误代码 */
  code?: string;
  /** 错误消息 */
  message: string;
  /** 友好的错误消息 */
  friendlyMessage?: string;
  /** 技术详情 */
  technicalDetails?: string;
  /** 恢复建议列表 */
  suggestions?: RecoverySuggestion[];
  /** 相关上下文 */
  context?: Record<string, any>;
  /** 时间戳 */
  timestamp?: number;
  /** 堆栈跟踪 */
  stack?: string;
}

/**
 * 错误处理结果
 */
export interface ErrorHandlingResult {
  /** 是否已处理 */
  handled: boolean;
  /** 是否应该显示给用户 */
  shouldDisplay: boolean;
  /** 错误详情 */
  details: ErrorDetails;
  /** 是否应该记录日志 */
  shouldLog: boolean;
}

/**
 * 错误模式匹配规则
 */
export interface ErrorPattern {
  /** 匹配模式（正则表达式字符串） */
  pattern: string | RegExp;
  /** 错误类别 */
  category: ErrorCategory;
  /** 友好消息 */
  friendlyMessage: string;
  /** 恢复建议 */
  suggestions: RecoverySuggestion[];
  /** 严重程度 */
  severity?: ErrorSeverity;
}

/**
 * 常见错误模式
 */
export const COMMON_ERROR_PATTERNS: ErrorPattern[] = [
  // 网络错误
  {
    pattern: /network|fetch|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i,
    category: ErrorCategory.NETWORK,
    friendlyMessage: '网络连接失败，请检查您的网络连接',
    severity: ErrorSeverity.ERROR,
    suggestions: [
      {
        title: '检查网络连接',
        description: '确保您的设备已连接到互联网',
        icon: 'wifi',
      },
      {
        title: '检查防火墙设置',
        description: '确保应用程序未被防火墙阻止',
        icon: 'shield',
      },
      {
        title: '稍后重试',
        description: '网络可能暂时不可用，请稍后再试',
        icon: 'refresh',
      },
    ],
  },

  // 数据库连接错误
  {
    pattern: /connection refused|connection timeout|unable to connect|ECONNREFUSED/i,
    category: ErrorCategory.DATABASE_CONNECTION,
    friendlyMessage: '无法连接到数据库服务器',
    severity: ErrorSeverity.ERROR,
    suggestions: [
      {
        title: '检查服务器地址',
        description: '确认数据库服务器地址和端口是否正确',
        icon: 'server',
      },
      {
        title: '检查服务器状态',
        description: '确保数据库服务器正在运行',
        icon: 'activity',
      },
      {
        title: '检查网络连接',
        description: '确保可以访问数据库服务器所在的网络',
        icon: 'wifi',
      },
    ],
  },

  // 认证错误
  {
    pattern: /unauthorized|authentication failed|invalid credentials|401/i,
    category: ErrorCategory.AUTHENTICATION,
    friendlyMessage: '身份验证失败，请检查用户名和密码',
    severity: ErrorSeverity.ERROR,
    suggestions: [
      {
        title: '检查凭据',
        description: '确认用户名和密码是否正确',
        icon: 'key',
      },
      {
        title: '重置密码',
        description: '如果忘记密码，请联系管理员重置',
        icon: 'lock',
      },
    ],
  },

  // 权限错误
  {
    pattern: /permission denied|access denied|forbidden|403/i,
    category: ErrorCategory.PERMISSION,
    friendlyMessage: '您没有执行此操作的权限',
    severity: ErrorSeverity.WARNING,
    suggestions: [
      {
        title: '联系管理员',
        description: '请联系系统管理员获取必要的权限',
        icon: 'user-check',
      },
      {
        title: '检查用户角色',
        description: '确认您的用户角色是否有权执行此操作',
        icon: 'shield',
      },
    ],
  },

  // 数据验证错误
  {
    pattern: /validation|invalid|required|must be/i,
    category: ErrorCategory.VALIDATION,
    friendlyMessage: '输入的数据不符合要求',
    severity: ErrorSeverity.WARNING,
    suggestions: [
      {
        title: '检查输入',
        description: '确保所有必填字段都已填写且格式正确',
        icon: 'check-circle',
      },
      {
        title: '查看帮助文档',
        description: '了解每个字段的具体要求',
        icon: 'help-circle',
      },
    ],
  },

  // 文件操作错误
  {
    pattern: /file not found|ENOENT|cannot read|cannot write/i,
    category: ErrorCategory.FILE_OPERATION,
    friendlyMessage: '文件操作失败',
    severity: ErrorSeverity.ERROR,
    suggestions: [
      {
        title: '检查文件路径',
        description: '确认文件路径是否正确',
        icon: 'folder',
      },
      {
        title: '检查文件权限',
        description: '确保应用程序有权访问该文件',
        icon: 'lock',
      },
      {
        title: '检查磁盘空间',
        description: '确保有足够的磁盘空间',
        icon: 'hard-drive',
      },
    ],
  },

  // 查询错误
  {
    pattern: /syntax error|query failed|invalid query/i,
    category: ErrorCategory.DATABASE_QUERY,
    friendlyMessage: '查询语句有误',
    severity: ErrorSeverity.ERROR,
    suggestions: [
      {
        title: '检查语法',
        description: '确认查询语句的语法是否正确',
        icon: 'code',
      },
      {
        title: '查看文档',
        description: '参考数据库查询语言文档',
        icon: 'book',
      },
      {
        title: '使用查询构建器',
        description: '尝试使用可视化查询构建器',
        icon: 'layout',
      },
    ],
  },
];

/**
 * 错误消息模板
 */
export const ERROR_MESSAGES = {
  [ErrorCategory.NETWORK]: {
    title: '网络错误',
    defaultMessage: '网络连接失败，请检查您的网络设置',
  },
  [ErrorCategory.DATABASE_CONNECTION]: {
    title: '连接错误',
    defaultMessage: '无法连接到数据库服务器',
  },
  [ErrorCategory.DATABASE_QUERY]: {
    title: '查询错误',
    defaultMessage: '数据库查询执行失败',
  },
  [ErrorCategory.AUTHENTICATION]: {
    title: '认证错误',
    defaultMessage: '身份验证失败',
  },
  [ErrorCategory.PERMISSION]: {
    title: '权限错误',
    defaultMessage: '您没有执行此操作的权限',
  },
  [ErrorCategory.VALIDATION]: {
    title: '验证错误',
    defaultMessage: '输入的数据不符合要求',
  },
  [ErrorCategory.FILE_OPERATION]: {
    title: '文件错误',
    defaultMessage: '文件操作失败',
  },
  [ErrorCategory.CONFIGURATION]: {
    title: '配置错误',
    defaultMessage: '应用程序配置有误',
  },
  [ErrorCategory.SYSTEM]: {
    title: '系统错误',
    defaultMessage: '系统发生错误',
  },
  [ErrorCategory.UNKNOWN]: {
    title: '未知错误',
    defaultMessage: '发生了未知错误',
  },
};

