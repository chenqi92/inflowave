/**
 * 用户友好的错误信息处理工具
 * 将技术性错误转换为用户可理解的友好提示
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion?: string;
}

/**
 * 数据库连接错误转换
 */
export const getDatabaseConnectionError = (error: string): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('timeout') || errorLower.includes('超时')) {
    return {
      title: '连接超时',
      message: '服务器响应超时，请稍后重试',
      suggestion: '请检查网络连接或联系管理员'
    };
  }
  
  if (errorLower.includes('authentication') || errorLower.includes('unauthorized') || errorLower.includes('认证') || errorLower.includes('授权')) {
    return {
      title: '认证失败',
      message: '用户名或密码错误',
      suggestion: '请检查用户名和密码是否正确'
    };
  }
  
  if (errorLower.includes('connection refused') || errorLower.includes('连接被拒绝') || errorLower.includes('无法连接')) {
    return {
      title: '连接失败',
      message: '无法连接到数据库服务器',
      suggestion: '请检查服务器地址、端口是否正确，确认服务器是否正常运行'
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('网络')) {
    return {
      title: '网络错误',
      message: '网络连接异常',
      suggestion: '请检查网络连接是否正常'
    };
  }
  
  if (errorLower.includes('ssl') || errorLower.includes('tls') || errorLower.includes('certificate')) {
    return {
      title: '安全连接失败',
      message: 'SSL/TLS 连接验证失败',
      suggestion: '请检查证书配置或联系管理员'
    };
  }
  
  return {
    title: '连接失败',
    message: '无法建立数据库连接',
    suggestion: '请检查连接配置信息'
  };
};

/**
 * 文件操作错误转换
 */
export const getFileOperationError = (error: string, operation: 'read' | 'write' | 'select' | 'save'): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('permission') || errorLower.includes('权限') || errorLower.includes('access denied')) {
    return {
      title: '权限不足',
      message: '没有访问该文件的权限',
      suggestion: '请检查文件权限或选择其他文件'
    };
  }
  
  if (errorLower.includes('not found') || errorLower.includes('不存在') || errorLower.includes('找不到')) {
    return {
      title: '文件不存在',
      message: '指定的文件不存在或已被删除',
      suggestion: '请确认文件路径是否正确'
    };
  }
  
  if (errorLower.includes('space') || errorLower.includes('disk full') || errorLower.includes('磁盘空间')) {
    return {
      title: '磁盘空间不足',
      message: '没有足够的磁盘空间完成操作',
      suggestion: '请清理磁盘空间后重试'
    };
  }
  
  if (errorLower.includes('locked') || errorLower.includes('被占用') || errorLower.includes('in use')) {
    return {
      title: '文件被占用',
      message: '文件正在被其他程序使用',
      suggestion: '请关闭相关程序后重试'
    };
  }
  
  const operationText = {
    read: '读取',
    write: '写入',
    select: '选择',
    save: '保存'
  }[operation];
  
  return {
    title: `文件${operationText}失败`,
    message: `无法${operationText}文件`,
    suggestion: '请重试或选择其他文件'
  };
};

/**
 * 网络请求错误转换
 */
export const getNetworkError = (error: string): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('timeout') || errorLower.includes('超时')) {
    return {
      title: '请求超时',
      message: '服务器响应超时',
      suggestion: '请检查网络连接并重试'
    };
  }
  
  if (errorLower.includes('404') || errorLower.includes('not found')) {
    return {
      title: '服务不可用',
      message: '请求的服务不存在',
      suggestion: '请检查服务地址是否正确'
    };
  }
  
  if (errorLower.includes('500') || errorLower.includes('server error')) {
    return {
      title: '服务器错误',
      message: '服务器内部错误',
      suggestion: '请稍后重试或联系管理员'
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('网络') || errorLower.includes('offline')) {
    return {
      title: '网络连接失败',
      message: '无法连接到网络',
      suggestion: '请检查网络连接'
    };
  }
  
  return {
    title: '请求失败',
    message: '网络请求失败',
    suggestion: '请检查网络连接并重试'
  };
};

/**
 * 端口发现服务错误转换
 */
export const getPortDiscoveryError = (error: string): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('permission') || errorLower.includes('权限')) {
    return {
      title: '权限不足',
      message: '无法访问网络端口',
      suggestion: '可能需要管理员权限'
    };
  }
  
  if (errorLower.includes('occupied') || errorLower.includes('被占用') || errorLower.includes('in use')) {
    return {
      title: '端口被占用',
      message: '指定的端口已被其他程序使用',
      suggestion: '程序将自动寻找可用端口'
    };
  }
  
  return {
    title: '端口检测失败',
    message: '无法检测端口状态',
    suggestion: '将使用默认端口配置'
  };
};

/**
 * 用户偏好设置错误转换
 */
export const getUserPreferencesError = (error: string, operation: 'load' | 'save'): UserFriendlyError => {
  const operationText = operation === 'load' ? '加载' : '保存';
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('permission') || errorLower.includes('权限')) {
    return {
      title: '权限不足',
      message: `无法${operationText}用户设置`,
      suggestion: '请检查应用权限'
    };
  }
  
  if (errorLower.includes('corrupted') || errorLower.includes('损坏') || errorLower.includes('invalid')) {
    return {
      title: '设置文件损坏',
      message: '用户设置文件已损坏',
      suggestion: '将使用默认设置'
    };
  }
  
  return {
    title: `设置${operationText}失败`,
    message: `无法${operationText}用户设置`,
    suggestion: '请重试或重启应用'
  };
};

/**
 * 处理用户取消操作
 */
export const handleUserCancellation = (operation: string, showNotification = false): UserFriendlyError | null => {
  if (!showNotification) {
    return null; // 静默处理
  }
  
  return {
    title: '操作已取消',
    message: `已取消${operation}`,
    suggestion: ''
  };
};

/**
 * 通用错误处理
 */
export const getGenericError = (error: string, context?: string): UserFriendlyError => {
  const contextText = context ? `${context}时` : '';
  
  return {
    title: '操作失败',
    message: `${contextText}发生了未知错误`,
    suggestion: '请重试或联系技术支持'
  };
};

/**
 * 统一的错误信息格式化
 */
export const formatErrorMessage = (error: UserFriendlyError): string => {
  let message = error.message;
  if (error.suggestion) {
    message += `\n建议：${error.suggestion}`;
  }
  return message;
};