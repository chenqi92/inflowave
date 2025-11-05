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
 * InfluxDB查询错误转换
 */
export const getInfluxDBQueryError = (error: string): UserFriendlyError => {
  const errorLower = error.toLowerCase();

  // 检测不支持的函数错误
  if (errorLower.includes('undefined function')) {
    // 提取函数名
    const funcMatch = error.match(/undefined function (\w+)\(\)/i);
    const funcName = funcMatch ? funcMatch[1].toUpperCase() : '';

    // 常见的 SQL 函数到 InfluxQL 函数的映射
    const functionMapping: Record<string, string> = {
      'AVG': 'MEAN',
      'AVERAGE': 'MEAN',
      'STDEV': 'STDDEV',
      'VAR': 'VARIANCE',
    };

    const replacement = functionMapping[funcName];

    if (replacement) {
      return {
        title: 'InfluxQL 函数错误',
        message: `${funcName}() 函数在 InfluxQL 中不支持`,
        suggestion: `请使用 ${replacement}() 函数代替。InfluxQL 使用不同的聚合函数名称。`
      };
    }

    return {
      title: 'InfluxQL 函数错误',
      message: `${funcName}() 函数在 InfluxQL 中不支持`,
      suggestion: '请查阅 InfluxQL 文档，使用支持的聚合函数：COUNT, SUM, MEAN, MAX, MIN, MEDIAN, MODE, STDDEV 等'
    };
  }

  if (errorLower.includes('measurement') && errorLower.includes('not found')) {
    return {
      title: '测量不存在',
      message: '指定的测量（measurement）不存在',
      suggestion: '请检查测量名称是否正确，或查看可用的测量列表'
    };
  }

  if (errorLower.includes('field') && (errorLower.includes('not found') || errorLower.includes('does not exist'))) {
    return {
      title: '字段不存在',
      message: '指定的字段不存在',
      suggestion: '请检查字段名称是否正确，或使用SHOW FIELD KEYS查看可用字段'
    };
  }

  if (errorLower.includes('tag') && (errorLower.includes('not found') || errorLower.includes('does not exist'))) {
    return {
      title: '标签不存在',
      message: '指定的标签不存在',
      suggestion: '请检查标签名称是否正确，或使用SHOW TAG KEYS查看可用标签'
    };
  }
  
  if (errorLower.includes('syntax error') || errorLower.includes('parse error')) {
    return {
      title: 'SQL语法错误',
      message: '查询语句存在语法错误',
      suggestion: '请检查SQL语法，特别注意字段名、引号和关键字的使用'
    };
  }
  
  if (errorLower.includes('timeout') || errorLower.includes('query timeout')) {
    return {
      title: '查询超时',
      message: '查询执行时间过长',
      suggestion: '请尝试缩小查询时间范围或添加更多筛选条件'
    };
  }
  
  if (errorLower.includes('memory') || errorLower.includes('out of memory')) {
    return {
      title: '内存不足',
      message: '查询数据量过大，内存不足',
      suggestion: '请减少查询时间范围或使用LIMIT限制结果数量'
    };
  }
  
  if (errorLower.includes('permission') || errorLower.includes('unauthorized')) {
    return {
      title: '权限不足',
      message: '没有执行此查询的权限',
      suggestion: '请联系管理员授予相应的数据库访问权限'
    };
  }
  
  if (errorLower.includes('database') && errorLower.includes('not found')) {
    return {
      title: '数据库不存在',
      message: '指定的数据库不存在',
      suggestion: '请检查数据库名称是否正确，或创建相应的数据库'
    };
  }

  // 检查是否是类型不兼容错误
  if (errorLower.includes('not compatible') || errorLower.includes('type mismatch')) {
    return {
      title: '数据类型不兼容',
      message: '查询中的数据类型不匹配',
      suggestion: '请检查时间条件的格式，确保时间函数（如now()）没有被引号包裹'
    };
  }

  // 如果错误信息中包含具体的InfluxDB错误，提取并显示
  if (error.includes('influxdb error:')) {
    try {
      const match = error.match(/influxdb error: "({.*})"/);
      if (match && match[1]) {
        const errorObj = JSON.parse(match[1]);
        if (errorObj.results && errorObj.results[0] && errorObj.results[0].error) {
          const influxError = errorObj.results[0].error;
          return {
            title: '查询执行失败',
            message: influxError,
            suggestion: '请检查查询语句的语法和数据类型'
          };
        }
      }
    } catch (e) {
      // JSON解析失败，继续使用默认错误
    }
  }

  return {
    title: '查询执行失败',
    message: '查询执行过程中发生错误',
    suggestion: '请检查查询语句或联系技术支持'
  };
};

/**
 * 数据导入导出错误转换
 */
export const getDataImportExportError = (error: string, context: 'import' | 'export', subType?: 'format' | 'size' | 'encoding' | 'validation'): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  const operationText = context === 'import' ? '导入' : '导出';
  
  // 文件大小相关错误
  if ((subType === 'size' || errorLower.includes('too large') || errorLower.includes('file size') || errorLower.includes('exceed')) && errorLower.includes('size')) {
    return {
      title: '文件过大',
      message: `文件大小超过限制，无法${operationText}`,
      suggestion: context === 'import' 
        ? '请将文件分割为小于10MB的多个文件，或使用流式导入功能'
        : '请减少导出数据量或使用分批导出功能'
    };
  }
  
  // 编码相关错误
  if (subType === 'encoding' || errorLower.includes('encoding') || errorLower.includes('charset') || errorLower.includes('decode')) {
    return {
      title: '文件编码错误',
      message: `无法正确解析文件编码`,
      suggestion: '请确保文件使用UTF-8编码，或在导入时指定正确的编码格式'
    };
  }
  
  // 格式相关错误
  if (subType === 'format' || errorLower.includes('format') || errorLower.includes('invalid') || errorLower.includes('malformed')) {
    return {
      title: '文件格式错误',
      message: `文件格式不正确或已损坏`,
      suggestion: context === 'import'
        ? '请检查文件格式是否为支持的CSV、JSON等格式，确保文件结构完整'
        : '请选择支持的导出格式，如CSV、Excel、JSON等'
    };
  }
  
  // 数据验证相关错误
  if (subType === 'validation' || errorLower.includes('validation') || errorLower.includes('constraint') || errorLower.includes('invalid data')) {
    return {
      title: '数据验证失败',
      message: `数据不符合预期格式或约束条件`,
      suggestion: '请检查数据类型、字段长度和必填项是否符合要求'
    };
  }
  
  // 权限相关错误
  if (errorLower.includes('permission') || errorLower.includes('access denied') || errorLower.includes('forbidden')) {
    return {
      title: '权限不足',
      message: `没有${operationText}数据的权限`,
      suggestion: '请联系管理员授予相应的数据操作权限'
    };
  }
  
  // 空间不足错误
  if (errorLower.includes('space') || errorLower.includes('disk full') || errorLower.includes('no space')) {
    return {
      title: '存储空间不足',
      message: `磁盘空间不足，无法完成${operationText}`,
      suggestion: '请清理磁盘空间或选择其他存储位置'
    };
  }
  
  return {
    title: `数据${operationText}失败`,
    message: `数据${operationText}过程中发生错误`,
    suggestion: `请检查文件和网络连接，或联系技术支持`
  };
};

/**
 * 系统资源错误转换
 */
export const getSystemResourceError = (
  resourceType: 'memory' | 'cpu' | 'disk' | 'network',
  usage?: number,
  threshold?: number,
  context?: string
): UserFriendlyError => {
  const usageText = usage ? `${usage}%` : '较高水平';
  
  switch (resourceType) {
    case 'memory':
      if (usage && usage > 90) {
        return {
          title: '内存不足',
          message: `系统内存使用率已达到${usageText}`,
          suggestion: '建议关闭其他应用程序、减少查询数据量或重启应用'
        };
      }
      return {
        title: '内存占用过高',
        message: '系统内存使用率过高',
        suggestion: '建议优化查询条件或分批处理数据'
      };
      
    case 'cpu':
      return {
        title: 'CPU占用过高',
        message: `处理器使用率达到${usageText}`,
        suggestion: '请等待当前操作完成，或考虑优化查询复杂度'
      };
      
    case 'disk':
      if (usage && usage > 95) {
        return {
          title: '磁盘空间严重不足',
          message: `磁盘使用率已达到${usageText}`,
          suggestion: '请立即清理磁盘空间、删除不必要的文件或扩展存储容量'
        };
      }
      return {
        title: '磁盘空间不足',
        message: '可用磁盘空间不足',
        suggestion: '请清理磁盘空间、移动文件到其他位置或扩展存储容量'
      };
      
    case 'network':
      return {
        title: '网络连接异常',
        message: '网络连接不稳定或中断',
        suggestion: '请检查网络连接状态，确认服务器地址和端口配置正确'
      };
      
    default:
      return {
        title: '系统资源不足',
        message: `系统资源${context || ''}出现问题`,
        suggestion: '请检查系统状态或联系系统管理员'
      };
  }
};

/**
 * 用户界面交互错误转换
 */
export const getUIInteractionError = (
  interactionType: 'form' | 'drag' | 'chart' | 'theme' | 'layout' | 'component',
  error: string,
  context?: string
): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  switch (interactionType) {
    case 'form':
      if (errorLower.includes('validation') || errorLower.includes('required') || errorLower.includes('invalid')) {
        return {
          title: '表单验证失败',
          message: '输入的信息不符合要求',
          suggestion: '请检查必填项和数据格式，确保所有信息正确填写'
        };
      }
      return {
        title: '表单提交失败',
        message: '表单提交过程中发生错误',
        suggestion: '请检查网络连接并重试'
      };
      
    case 'drag':
      return {
        title: '拖拽操作失败',
        message: '无法完成拖拽操作',
        suggestion: '请确保目标位置支持拖拽，或尝试使用右键菜单进行操作'
      };
      
    case 'chart':
      if (errorLower.includes('render') || errorLower.includes('draw')) {
        return {
          title: '图表渲染失败',
          message: `${context || '图表'}无法正常显示`,
          suggestion: '请检查数据格式是否正确，或尝试刷新页面'
        };
      }
      if (errorLower.includes('data') || errorLower.includes('empty')) {
        return {
          title: '图表数据异常',
          message: '图表数据为空或格式不正确',
          suggestion: '请确认查询返回了有效数据，检查时间范围和筛选条件'
        };
      }
      return {
        title: '图表显示错误',
        message: '图表组件发生错误',
        suggestion: '请尝试切换图表类型或刷新数据'
      };
      
    case 'theme':
      return {
        title: '主题切换失败',
        message: '无法切换到指定主题',
        suggestion: '请尝试刷新页面或重启应用'
      };
      
    case 'layout':
      return {
        title: '布局调整失败',
        message: '无法调整界面布局',
        suggestion: '请尝试重置布局或刷新页面'
      };
      
    case 'component':
      return {
        title: '组件加载失败',
        message: `${context || '界面组件'}无法正常加载`,
        suggestion: '请刷新页面或重启应用，如问题持续请联系技术支持'
      };
      
    default:
      return {
        title: '界面操作失败',
        message: '用户界面操作过程中发生错误',
        suggestion: '请重试操作或刷新页面'
      };
  }
};

/**
 * 扩展和插件错误转换
 */
export const getExtensionError = (
  error: string,
  context: 'load' | 'install' | 'uninstall' | 'dependency' | 'version' | 'permission' | 'api'
): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  switch (context) {
    case 'load':
      if (errorLower.includes('not found') || errorLower.includes('missing')) {
        return {
          title: '插件加载失败',
          message: '找不到指定的插件文件',
          suggestion: '请检查插件是否正确安装，或尝试重新安装插件'
        };
      }
      return {
        title: '插件加载失败',
        message: '无法加载插件',
        suggestion: '请检查插件完整性或联系插件开发者'
      };
      
    case 'install':
      if (errorLower.includes('permission') || errorLower.includes('access denied')) {
        return {
          title: '插件安装失败',
          message: '没有安装插件的权限',
          suggestion: '请使用管理员权限运行应用，或联系系统管理员'
        };
      }
      if (errorLower.includes('space') || errorLower.includes('disk full')) {
        return {
          title: '插件安装失败',
          message: '磁盘空间不足',
          suggestion: '请清理磁盘空间后重新安装'
        };
      }
      return {
        title: '插件安装失败',
        message: '插件安装过程中发生错误',
        suggestion: '请检查网络连接和插件文件完整性'
      };
      
    case 'uninstall':
      return {
        title: '插件卸载失败',
        message: '无法卸载插件',
        suggestion: '请确保插件未在使用中，或重启应用后重试'
      };
      
    case 'dependency':
      return {
        title: '依赖缺失',
        message: '插件所需的依赖不满足',
        suggestion: '请安装相关依赖包或升级到兼容版本'
      };
      
    case 'version':
      if (errorLower.includes('incompatible') || errorLower.includes('version')) {
        return {
          title: '版本不兼容',
          message: '插件版本与应用版本不兼容',
          suggestion: '请升级插件或应用到兼容版本，或查看插件文档了解支持的版本'
        };
      }
      return {
        title: '版本检查失败',
        message: '无法验证插件版本',
        suggestion: '请检查插件信息或联系插件开发者'
      };
      
    case 'permission':
      return {
        title: '插件权限错误',
        message: '插件没有执行所需操作的权限',
        suggestion: '请检查插件权限配置或联系管理员'
      };
      
    case 'api':
      return {
        title: '插件API错误',
        message: '插件调用系统API时发生错误',
        suggestion: '请检查插件兼容性或联系插件开发者更新'
      };
      
    default:
      return {
        title: '插件系统错误',
        message: '插件系统发生未知错误',
        suggestion: '请重启应用或联系技术支持'
      };
  }
};

/**
 * 安全和认证错误转换
 */
export const getSecurityError = (
  error: string,
  context: 'session' | 'permission' | 'certificate' | 'token' | 'authentication' | 'authorization'
): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  switch (context) {
    case 'session':
      if (errorLower.includes('expired') || errorLower.includes('timeout')) {
        return {
          title: '会话已过期',
          message: '您的登录会话已过期',
          suggestion: '请重新登录以继续使用'
        };
      }
      return {
        title: '会话错误',
        message: '登录会话出现问题',
        suggestion: '请尝试重新登录'
      };
      
    case 'permission':
      return {
        title: '权限不足',
        message: '您没有执行此操作的权限',
        suggestion: '请联系管理员授予相应权限，或使用有权限的账户'
      };
      
    case 'certificate':
      if (errorLower.includes('expired')) {
        return {
          title: '证书已过期',
          message: 'SSL证书已过期',
          suggestion: '请联系系统管理员更新证书'
        };
      }
      if (errorLower.includes('invalid') || errorLower.includes('verification failed')) {
        return {
          title: '证书验证失败',
          message: 'SSL证书验证失败',
          suggestion: '请检查证书配置或联系系统管理员'
        };
      }
      return {
        title: '证书错误',
        message: 'SSL证书存在问题',
        suggestion: '请联系系统管理员检查证书配置'
      };
      
    case 'token':
      if (errorLower.includes('expired')) {
        return {
          title: '访问令牌已过期',
          message: '身份验证令牌已过期',
          suggestion: '请重新登录获取新的访问令牌'
        };
      }
      if (errorLower.includes('invalid')) {
        return {
          title: '访问令牌无效',
          message: '身份验证令牌无效或已被撤销',
          suggestion: '请重新登录或联系管理员'
        };
      }
      return {
        title: '访问令牌错误',
        message: '身份验证令牌存在问题',
        suggestion: '请重新登录或联系技术支持'
      };
      
    case 'authentication':
      if (errorLower.includes('failed') || errorLower.includes('invalid credentials')) {
        return {
          title: '身份验证失败',
          message: '用户名或密码错误',
          suggestion: '请检查登录凭据是否正确，注意大小写'
        };
      }
      return {
        title: '身份验证错误',
        message: '身份验证过程中发生错误',
        suggestion: '请重试或联系系统管理员'
      };
      
    case 'authorization':
      return {
        title: '授权失败',
        message: '您没有访问此资源的授权',
        suggestion: '请联系管理员获取相应的访问权限'
      };
      
    default:
      return {
        title: '安全验证失败',
        message: '安全验证过程中发生错误',
        suggestion: '请重试或联系系统管理员'
      };
  }
};

/**
 * 应用程序生命周期错误转换
 */
export const getApplicationError = (
  error: string,
  context: 'startup' | 'shutdown' | 'update' | 'config' | 'migration' | 'backup'
): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  
  switch (context) {
    case 'startup':
      if (errorLower.includes('port') || errorLower.includes('address in use')) {
        return {
          title: '应用启动失败',
          message: '端口被占用，无法启动应用',
          suggestion: '请关闭占用端口的程序，或修改应用端口配置'
        };
      }
      if (errorLower.includes('config') || errorLower.includes('configuration')) {
        return {
          title: '配置文件错误',
          message: '应用配置文件存在问题',
          suggestion: '请检查配置文件格式，或恢复默认配置'
        };
      }
      return {
        title: '应用启动失败',
        message: '应用程序无法正常启动',
        suggestion: '请重启应用或检查系统要求'
      };
      
    case 'shutdown':
      return {
        title: '应用关闭异常',
        message: '应用程序关闭过程中发生错误',
        suggestion: '数据可能未完全保存，建议重启后检查数据完整性'
      };
      
    case 'update':
      if (errorLower.includes('permission')) {
        return {
          title: '更新失败',
          message: '没有更新应用的权限',
          suggestion: '请使用管理员权限运行更新，或手动下载最新版本'
        };
      }
      if (errorLower.includes('network') || errorLower.includes('download')) {
        return {
          title: '更新下载失败',
          message: '无法下载更新文件',
          suggestion: '请检查网络连接，或前往官网手动下载更新'
        };
      }
      return {
        title: '应用更新失败',
        message: '应用程序更新过程中发生错误',
        suggestion: '请重试更新或手动下载安装最新版本'
      };
      
    case 'config':
      if (errorLower.includes('corrupt') || errorLower.includes('invalid')) {
        return {
          title: '配置文件损坏',
          message: '应用配置文件已损坏或格式错误',
          suggestion: '请删除配置文件以恢复默认设置，或从备份中恢复'
        };
      }
      return {
        title: '配置加载失败',
        message: '无法加载应用配置',
        suggestion: '请检查配置文件权限或恢复默认配置'
      };
      
    case 'migration':
      return {
        title: '数据迁移失败',
        message: '数据库迁移过程中发生错误',
        suggestion: '请备份现有数据，或联系技术支持协助迁移'
      };
      
    case 'backup':
      if (errorLower.includes('space')) {
        return {
          title: '备份失败',
          message: '磁盘空间不足，无法创建备份',
          suggestion: '请清理磁盘空间或选择其他备份位置'
        };
      }
      return {
        title: '数据备份失败',
        message: '无法创建数据备份',
        suggestion: '请检查备份路径权限和磁盘空间'
      };
      
    default:
      return {
        title: '应用程序错误',
        message: '应用程序发生未知错误',
        suggestion: '请重启应用或联系技术支持'
      };
  }
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