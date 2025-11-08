/**
 * 用户友好的错误信息处理工具
 * 将技术性错误转换为用户可理解的友好提示
 */

import { tError } from '@/i18n/translate';

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
      title: tError('connectionTimeout'),
      message: tError('security.authentication.timeout.message'),
      suggestion: tError('security.authentication.timeout.suggestion')
    };
  }

  if (errorLower.includes('authentication') || errorLower.includes('unauthorized') || errorLower.includes('认证') || errorLower.includes('授权')) {
    return {
      title: tError('authenticationFailed'),
      message: tError('security.authentication.failed.message'),
      suggestion: tError('security.authentication.failed.suggestion')
    };
  }

  if (errorLower.includes('connection refused') || errorLower.includes('连接被拒绝') || errorLower.includes('无法连接')) {
    return {
      title: tError('connectionFailed'),
      message: tError('serviceUnavailable'),
      suggestion: tError('security.authentication.timeout.suggestion')
    };
  }

  if (errorLower.includes('network') || errorLower.includes('网络')) {
    return {
      title: tError('networkError'),
      message: tError('networkError'),
      suggestion: tError('security.authentication.timeout.suggestion')
    };
  }

  if (errorLower.includes('ssl') || errorLower.includes('tls') || errorLower.includes('certificate')) {
    return {
      title: tError('security.certificate.invalid.title'),
      message: tError('security.certificate.invalid.message'),
      suggestion: tError('security.certificate.invalid.suggestion')
    };
  }

  return {
    title: tError('connectionFailed'),
    message: tError('connectionFailed'),
    suggestion: tError('configurationError')
  };
};

/**
 * 文件操作错误转换
 */
export const getFileOperationError = (error: string, operation: 'read' | 'write' | 'select' | 'save'): UserFriendlyError => {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('permission') || errorLower.includes('权限') || errorLower.includes('access denied')) {
    return {
      title: tError('permissionDenied'),
      message: tError('permissionDenied'),
      suggestion: tError('application.backup.permission.suggestion')
    };
  }

  if (errorLower.includes('not found') || errorLower.includes('不存在') || errorLower.includes('找不到')) {
    return {
      title: tError('fileNotFound'),
      message: tError('fileNotFound'),
      suggestion: tError('application.config.corrupt.suggestion')
    };
  }

  if (errorLower.includes('space') || errorLower.includes('disk full') || errorLower.includes('磁盘空间')) {
    return {
      title: tError('diskSpaceError'),
      message: tError('diskSpaceError'),
      suggestion: tError('application.backup.space.suggestion')
    };
  }

  if (errorLower.includes('locked') || errorLower.includes('被占用') || errorLower.includes('in use')) {
    return {
      title: tError('fileReadError'),
      message: tError('fileReadError'),
      suggestion: tError('uiInteraction.drag.invalid.suggestion')
    };
  }

  const operationText = {
    read: tError('fileReadError'),
    write: tError('fileWriteError'),
    select: tError('fileNotFound'),
    save: tError('fileWriteError')
  }[operation];

  return {
    title: operationText,
    message: operationText,
    suggestion: tError('application.backup.permission.suggestion')
  };
};

/**
 * 网络请求错误转换
 */
export const getNetworkError = (error: string): UserFriendlyError => {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('timeout') || errorLower.includes('超时')) {
    return {
      title: tError('queryTimeout'),
      message: tError('security.authentication.timeout.message'),
      suggestion: tError('security.authentication.timeout.suggestion')
    };
  }

  if (errorLower.includes('404') || errorLower.includes('not found')) {
    return {
      title: tError('serviceUnavailable'),
      message: tError('resourceNotAvailable'),
      suggestion: tError('application.config.parse.suggestion')
    };
  }

  if (errorLower.includes('500') || errorLower.includes('server error')) {
    return {
      title: tError('serverError'),
      message: tError('serverError'),
      suggestion: tError('security.authentication.timeout.suggestion')
    };
  }

  if (errorLower.includes('network') || errorLower.includes('网络') || errorLower.includes('offline')) {
    return {
      title: tError('networkError'),
      message: tError('networkError'),
      suggestion: tError('systemResource.network.unstable.suggestion')
    };
  }

  return {
    title: tError('networkError'),
    message: tError('networkError'),
    suggestion: tError('security.authentication.timeout.suggestion')
  };
};

/**
 * 端口发现服务错误转换
 */
export const getPortDiscoveryError = (error: string): UserFriendlyError => {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('permission') || errorLower.includes('权限')) {
    return {
      title: tError('permissionDenied'),
      message: tError('permissionDenied'),
      suggestion: tError('extension.install.permission.suggestion')
    };
  }

  if (errorLower.includes('occupied') || errorLower.includes('被占用') || errorLower.includes('in use')) {
    return {
      title: tError('application.startup.port.title'),
      message: tError('application.startup.port.message'),
      suggestion: tError('application.startup.port.suggestion')
    };
  }

  return {
    title: tError('networkError'),
    message: tError('networkError'),
    suggestion: tError('application.startup.port.suggestion')
  };
};

/**
 * 用户偏好设置错误转换
 */
export const getUserPreferencesError = (error: string, operation: 'load' | 'save'): UserFriendlyError => {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('permission') || errorLower.includes('权限')) {
    return {
      title: tError('permissionDenied'),
      message: tError('permissionDenied'),
      suggestion: tError('application.backup.permission.suggestion')
    };
  }

  if (errorLower.includes('corrupted') || errorLower.includes('损坏') || errorLower.includes('invalid')) {
    return {
      title: tError('application.config.corrupt.title'),
      message: tError('application.config.corrupt.message'),
      suggestion: tError('application.config.corrupt.suggestion')
    };
  }

  return {
    title: operation === 'load' ? tError('configurationError') : tError('application.config.save.title'),
    message: operation === 'load' ? tError('configurationError') : tError('application.config.save.message'),
    suggestion: operation === 'load' ? tError('application.config.save.suggestion') : tError('application.config.save.suggestion')
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
    title: tError('operationCancelled'),
    message: tError('operationCancelled'),
    suggestion: ''
  };
};

/**
 * 通用错误处理
 */
export const getGenericError = (error: string, context?: string): UserFriendlyError => {
  return {
    title: tError('operationFailed'),
    message: tError('unknownError'),
    suggestion: tError('application.config.save.suggestion')
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
        title: tError('invalidQuery'),
        message: `${funcName}() ${tError('notImplemented')}`,
        suggestion: `${tError('application.config.save.suggestion')}`
      };
    }

    return {
      title: tError('invalidQuery'),
      message: `${funcName}() ${tError('notImplemented')}`,
      suggestion: tError('application.config.save.suggestion')
    };
  }

  if (errorLower.includes('measurement') && errorLower.includes('not found')) {
    return {
      title: tError('tableNotFound'),
      message: tError('tableNotFound'),
      suggestion: tError('application.config.parse.suggestion')
    };
  }

  if (errorLower.includes('field') && (errorLower.includes('not found') || errorLower.includes('does not exist'))) {
    return {
      title: tError('columnNotFound'),
      message: tError('columnNotFound'),
      suggestion: tError('application.config.parse.suggestion')
    };
  }

  if (errorLower.includes('tag') && (errorLower.includes('not found') || errorLower.includes('does not exist'))) {
    return {
      title: tError('columnNotFound'),
      message: tError('columnNotFound'),
      suggestion: tError('application.config.parse.suggestion')
    };
  }

  if (errorLower.includes('syntax error') || errorLower.includes('parse error')) {
    return {
      title: tError('invalidSyntax'),
      message: tError('parseError'),
      suggestion: tError('application.config.parse.suggestion')
    };
  }

  if (errorLower.includes('timeout') || errorLower.includes('query timeout')) {
    return {
      title: tError('queryTimeout'),
      message: tError('queryTimeout'),
      suggestion: tError('security.authentication.timeout.suggestion')
    };
  }

  if (errorLower.includes('memory') || errorLower.includes('out of memory')) {
    return {
      title: tError('memoryError'),
      message: tError('systemResource.memory.critical.message', { usage: 90 }),
      suggestion: tError('systemResource.memory.critical.suggestion')
    };
  }

  if (errorLower.includes('permission') || errorLower.includes('unauthorized')) {
    return {
      title: tError('permissionDenied'),
      message: tError('permissionDenied'),
      suggestion: tError('security.permission.insufficient.suggestion')
    };
  }

  if (errorLower.includes('database') && errorLower.includes('not found')) {
    return {
      title: tError('databaseNotFound'),
      message: tError('databaseNotFound'),
      suggestion: tError('application.config.parse.suggestion')
    };
  }

  // 检查是否是类型不兼容错误
  if (errorLower.includes('not compatible') || errorLower.includes('type mismatch')) {
    return {
      title: tError('dataTypeError'),
      message: tError('dataTypeError'),
      suggestion: tError('application.config.parse.suggestion')
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
            title: tError('invalidQuery'),
            message: influxError,
            suggestion: tError('application.config.parse.suggestion')
          };
        }
      }
    } catch (e) {
      // JSON解析失败，继续使用默认错误
    }
  }

  return {
    title: tError('invalidQuery'),
    message: tError('operationFailed'),
    suggestion: tError('application.config.save.suggestion')
  };
};

/**
 * 数据导入导出错误转换
 */
export const getDataImportExportError = (error: string, context: 'import' | 'export', subType?: 'format' | 'size' | 'encoding' | 'validation'): UserFriendlyError => {
  const errorLower = error.toLowerCase();
  const operation = tError(`dataImportExport.operations.${context}`);

  // 文件大小相关错误
  if ((subType === 'size' || errorLower.includes('too large') || errorLower.includes('file size') || errorLower.includes('exceed')) && errorLower.includes('size')) {
    return {
      title: tError('dataImportExport.size.title'),
      message: context === 'import'
        ? tError('dataImportExport.size.messageImport')
        : tError('dataImportExport.size.messageExport'),
      suggestion: context === 'import'
        ? tError('dataImportExport.size.suggestionImport')
        : tError('dataImportExport.size.suggestionExport')
    };
  }

  // 编码相关错误
  if (subType === 'encoding' || errorLower.includes('encoding') || errorLower.includes('charset') || errorLower.includes('decode')) {
    return {
      title: tError('dataImportExport.encoding.title'),
      message: tError('dataImportExport.encoding.message'),
      suggestion: tError('dataImportExport.encoding.suggestion')
    };
  }

  // 格式相关错误
  if (subType === 'format' || errorLower.includes('format') || errorLower.includes('invalid') || errorLower.includes('malformed')) {
    return {
      title: tError('dataImportExport.format.invalid.title'),
      message: tError('dataImportExport.format.invalid.message'),
      suggestion: tError('dataImportExport.format.invalid.suggestion')
    };
  }

  // 数据验证相关错误
  if (subType === 'validation' || errorLower.includes('validation') || errorLower.includes('constraint') || errorLower.includes('invalid data')) {
    return {
      title: tError('dataImportExport.validation.schema.title'),
      message: tError('dataImportExport.validation.schema.message'),
      suggestion: tError('dataImportExport.validation.schema.suggestion')
    };
  }

  // 权限相关错误
  if (errorLower.includes('permission') || errorLower.includes('access denied') || errorLower.includes('forbidden')) {
    return {
      title: tError('dataImportExport.permission.title', { operation }),
      message: tError('dataImportExport.permission.message', { operation }),
      suggestion: tError('dataImportExport.permission.suggestion')
    };
  }

  // 空间不足错误
  if (errorLower.includes('space') || errorLower.includes('disk full') || errorLower.includes('no space')) {
    return {
      title: tError('dataImportExport.space.title'),
      message: tError('dataImportExport.space.message', { operation }),
      suggestion: tError('dataImportExport.space.suggestion')
    };
  }

  return {
    title: tError('operationFailed'),
    message: tError('operationFailed'),
    suggestion: tError('application.config.save.suggestion')
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
  switch (resourceType) {
    case 'memory':
      if (usage && usage > 90) {
        return {
          title: tError('systemResource.memory.critical.title'),
          message: tError('systemResource.memory.critical.message', { usage }),
          suggestion: tError('systemResource.memory.critical.suggestion')
        };
      }
      return {
        title: tError('systemResource.memory.high.title'),
        message: tError('systemResource.memory.high.message'),
        suggestion: tError('systemResource.memory.high.suggestion')
      };

    case 'cpu':
      return {
        title: tError('systemResource.cpu.title'),
        message: tError('systemResource.cpu.message', { usage: usage || 80 }),
        suggestion: tError('systemResource.cpu.suggestion')
      };

    case 'disk':
      if (usage && usage > 95) {
        return {
          title: tError('systemResource.disk.critical.title'),
          message: tError('systemResource.disk.critical.message', { threshold: threshold || 100 }),
          suggestion: tError('systemResource.disk.critical.suggestion')
        };
      }
      return {
        title: tError('systemResource.disk.high.title'),
        message: tError('systemResource.disk.high.message', { threshold: threshold || 1 }),
        suggestion: tError('systemResource.disk.high.suggestion')
      };

    case 'network':
      return {
        title: tError('systemResource.network.unstable.title'),
        message: tError('systemResource.network.unstable.message'),
        suggestion: tError('systemResource.network.unstable.suggestion')
      };

    default:
      return {
        title: tError('resourceNotAvailable'),
        message: tError('resourceNotAvailable'),
        suggestion: tError('application.config.save.suggestion')
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
          title: tError('uiInteraction.form.validation.title'),
          message: tError('uiInteraction.form.validation.message'),
          suggestion: tError('uiInteraction.form.validation.suggestion')
        };
      }
      return {
        title: tError('uiInteraction.form.submit.title'),
        message: tError('uiInteraction.form.submit.message'),
        suggestion: tError('uiInteraction.form.submit.suggestion')
      };

    case 'drag':
      if (errorLower.includes('invalid') || errorLower.includes('not allowed')) {
        return {
          title: tError('uiInteraction.drag.invalid.title'),
          message: tError('uiInteraction.drag.invalid.message'),
          suggestion: tError('uiInteraction.drag.invalid.suggestion')
        };
      }
      return {
        title: tError('uiInteraction.drag.failed.title'),
        message: tError('uiInteraction.drag.failed.message'),
        suggestion: tError('uiInteraction.drag.failed.suggestion')
      };

    case 'chart':
      if (errorLower.includes('render') || errorLower.includes('draw')) {
        return {
          title: tError('uiInteraction.chart.render.title'),
          message: tError('uiInteraction.chart.render.message', { context: context || 'chart' }),
          suggestion: tError('uiInteraction.chart.render.suggestion')
        };
      }
      if (errorLower.includes('data') || errorLower.includes('empty')) {
        return {
          title: tError('uiInteraction.chart.data.title'),
          message: tError('uiInteraction.chart.data.message'),
          suggestion: tError('uiInteraction.chart.data.suggestion')
        };
      }
      return {
        title: tError('uiInteraction.chart.render.title'),
        message: tError('uiInteraction.chart.render.message', { context: context || 'chart' }),
        suggestion: tError('uiInteraction.chart.render.suggestion')
      };

    case 'theme':
      return {
        title: tError('uiInteraction.theme.apply.title'),
        message: tError('uiInteraction.theme.apply.message'),
        suggestion: tError('uiInteraction.theme.apply.suggestion')
      };

    case 'layout':
      return {
        title: tError('uiInteraction.layout.save.title'),
        message: tError('uiInteraction.layout.save.message'),
        suggestion: tError('uiInteraction.layout.save.suggestion')
      };

    case 'component':
      return {
        title: tError('uiInteraction.component.load.title'),
        message: tError('uiInteraction.component.load.message', { context: context || 'component' }),
        suggestion: tError('uiInteraction.component.load.suggestion')
      };

    default:
      return {
        title: tError('operationFailed'),
        message: tError('operationFailed'),
        suggestion: tError('uiInteraction.drag.failed.suggestion')
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
          title: tError('extension.load.notFound.title'),
          message: tError('extension.load.notFound.message'),
          suggestion: tError('extension.load.notFound.suggestion')
        };
      }
      if (errorLower.includes('incompatible')) {
        return {
          title: tError('extension.load.incompatible.title'),
          message: tError('extension.load.incompatible.message'),
          suggestion: tError('extension.load.incompatible.suggestion')
        };
      }
      return {
        title: tError('extension.load.corrupt.title'),
        message: tError('extension.load.corrupt.message'),
        suggestion: tError('extension.load.corrupt.suggestion')
      };

    case 'install':
      if (errorLower.includes('permission') || errorLower.includes('access denied')) {
        return {
          title: tError('extension.install.permission.title'),
          message: tError('extension.install.permission.message'),
          suggestion: tError('extension.install.permission.suggestion')
        };
      }
      if (errorLower.includes('space') || errorLower.includes('disk full')) {
        return {
          title: tError('extension.install.space.title'),
          message: tError('extension.install.space.message'),
          suggestion: tError('extension.install.space.suggestion')
        };
      }
      if (errorLower.includes('conflict')) {
        return {
          title: tError('extension.install.conflict.title'),
          message: tError('extension.install.conflict.message'),
          suggestion: tError('extension.install.conflict.suggestion')
        };
      }
      return {
        title: tError('extension.install.permission.title'),
        message: tError('extension.install.permission.message'),
        suggestion: tError('extension.install.permission.suggestion')
      };

    case 'uninstall':
      if (errorLower.includes('in use')) {
        return {
          title: tError('extension.uninstall.inUse.title'),
          message: tError('extension.uninstall.inUse.message'),
          suggestion: tError('extension.uninstall.inUse.suggestion')
        };
      }
      return {
        title: tError('extension.uninstall.permission.title'),
        message: tError('extension.uninstall.permission.message'),
        suggestion: tError('extension.uninstall.permission.suggestion')
      };

    case 'dependency':
      if (errorLower.includes('version')) {
        return {
          title: tError('extension.dependency.version.title'),
          message: tError('extension.dependency.version.message'),
          suggestion: tError('extension.dependency.version.suggestion')
        };
      }
      return {
        title: tError('extension.dependency.missing.title'),
        message: tError('extension.dependency.missing.message'),
        suggestion: tError('extension.dependency.missing.suggestion')
      };

    case 'version':
      if (errorLower.includes('too old')) {
        return {
          title: tError('extension.version.tooOld.title'),
          message: tError('extension.version.tooOld.message'),
          suggestion: tError('extension.version.tooOld.suggestion')
        };
      }
      if (errorLower.includes('too new')) {
        return {
          title: tError('extension.version.tooNew.title'),
          message: tError('extension.version.tooNew.message'),
          suggestion: tError('extension.version.tooNew.suggestion')
        };
      }
      return {
        title: tError('versionMismatch'),
        message: tError('extension.load.incompatible.message'),
        suggestion: tError('extension.load.incompatible.suggestion')
      };

    case 'permission':
      if (errorLower.includes('excessive')) {
        return {
          title: tError('extension.permission.excessive.title'),
          message: tError('extension.permission.excessive.message'),
          suggestion: tError('extension.permission.excessive.suggestion')
        };
      }
      return {
        title: tError('extension.permission.denied.title'),
        message: tError('extension.permission.denied.message'),
        suggestion: tError('extension.permission.denied.suggestion')
      };

    case 'api':
      if (errorLower.includes('deprecated')) {
        return {
          title: tError('extension.api.deprecated.title'),
          message: tError('extension.api.deprecated.message'),
          suggestion: tError('extension.api.deprecated.suggestion')
        };
      }
      return {
        title: tError('extension.api.unavailable.title'),
        message: tError('extension.api.unavailable.message'),
        suggestion: tError('extension.api.unavailable.suggestion')
      };

    default:
      return {
        title: tError('operationFailed'),
        message: tError('unknownError'),
        suggestion: tError('application.config.save.suggestion')
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
          title: tError('security.session.expired.title'),
          message: tError('security.session.expired.message'),
          suggestion: tError('security.session.expired.suggestion')
        };
      }
      if (errorLower.includes('concurrent')) {
        return {
          title: tError('security.session.concurrent.title'),
          message: tError('security.session.concurrent.message'),
          suggestion: tError('security.session.concurrent.suggestion')
        };
      }
      return {
        title: tError('security.session.invalid.title'),
        message: tError('security.session.invalid.message'),
        suggestion: tError('security.session.invalid.suggestion')
      };

    case 'permission':
      if (errorLower.includes('expired')) {
        return {
          title: tError('security.permission.expired.title'),
          message: tError('security.permission.expired.message'),
          suggestion: tError('security.permission.expired.suggestion')
        };
      }
      return {
        title: tError('security.permission.insufficient.title'),
        message: tError('security.permission.insufficient.message'),
        suggestion: tError('security.permission.insufficient.suggestion')
      };

    case 'certificate':
      if (errorLower.includes('expired')) {
        return {
          title: tError('security.certificate.expired.title'),
          message: tError('security.certificate.expired.message'),
          suggestion: tError('security.certificate.expired.suggestion')
        };
      }
      if (errorLower.includes('revoked')) {
        return {
          title: tError('security.certificate.revoked.title'),
          message: tError('security.certificate.revoked.message'),
          suggestion: tError('security.certificate.revoked.suggestion')
        };
      }
      return {
        title: tError('security.certificate.invalid.title'),
        message: tError('security.certificate.invalid.message'),
        suggestion: tError('security.certificate.invalid.suggestion')
      };

    case 'token':
      if (errorLower.includes('expired')) {
        return {
          title: tError('security.token.expired.title'),
          message: tError('security.token.expired.message'),
          suggestion: tError('security.token.expired.suggestion')
        };
      }
      if (errorLower.includes('revoked')) {
        return {
          title: tError('security.token.revoked.title'),
          message: tError('security.token.revoked.message'),
          suggestion: tError('security.token.revoked.suggestion')
        };
      }
      return {
        title: tError('security.token.invalid.title'),
        message: tError('security.token.invalid.message'),
        suggestion: tError('security.token.invalid.suggestion')
      };

    case 'authentication':
      if (errorLower.includes('failed') || errorLower.includes('invalid credentials')) {
        return {
          title: tError('security.authentication.failed.title'),
          message: tError('security.authentication.failed.message'),
          suggestion: tError('security.authentication.failed.suggestion')
        };
      }
      if (errorLower.includes('locked')) {
        return {
          title: tError('security.authentication.locked.title'),
          message: tError('security.authentication.locked.message', { duration: 30 }),
          suggestion: tError('security.authentication.locked.suggestion', { duration: 30 })
        };
      }
      return {
        title: tError('security.authentication.timeout.title'),
        message: tError('security.authentication.timeout.message'),
        suggestion: tError('security.authentication.timeout.suggestion')
      };

    case 'authorization':
      if (errorLower.includes('scope')) {
        return {
          title: tError('security.authorization.scopeInsufficient.title'),
          message: tError('security.authorization.scopeInsufficient.message'),
          suggestion: tError('security.authorization.scopeInsufficient.suggestion')
        };
      }
      return {
        title: tError('security.authorization.denied.title'),
        message: tError('security.authorization.denied.message'),
        suggestion: tError('security.authorization.denied.suggestion')
      };

    default:
      return {
        title: tError('authenticationFailed'),
        message: tError('authenticationFailed'),
        suggestion: tError('application.config.save.suggestion')
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
          title: tError('application.startup.port.title'),
          message: tError('application.startup.port.message'),
          suggestion: tError('application.startup.port.suggestion')
        };
      }
      if (errorLower.includes('config') || errorLower.includes('configuration')) {
        return {
          title: tError('application.startup.config.title'),
          message: tError('application.startup.config.message'),
          suggestion: tError('application.startup.config.suggestion')
        };
      }
      if (errorLower.includes('dependency')) {
        return {
          title: tError('application.startup.dependency.title'),
          message: tError('application.startup.dependency.message'),
          suggestion: tError('application.startup.dependency.suggestion')
        };
      }
      return {
        title: tError('application.startup.port.title'),
        message: tError('application.startup.port.message'),
        suggestion: tError('application.startup.port.suggestion')
      };

    case 'shutdown':
      if (errorLower.includes('unsaved')) {
        return {
          title: tError('application.shutdown.unsaved.title'),
          message: tError('application.shutdown.unsaved.message'),
          suggestion: tError('application.shutdown.unsaved.suggestion')
        };
      }
      return {
        title: tError('application.shutdown.timeout.title'),
        message: tError('application.shutdown.timeout.message'),
        suggestion: tError('application.shutdown.timeout.suggestion')
      };

    case 'update':
      if (errorLower.includes('permission')) {
        return {
          title: tError('application.update.permission.title'),
          message: tError('application.update.permission.message'),
          suggestion: tError('application.update.permission.suggestion')
        };
      }
      if (errorLower.includes('network') || errorLower.includes('download')) {
        return {
          title: tError('application.update.network.title'),
          message: tError('application.update.network.message'),
          suggestion: tError('application.update.network.suggestion')
        };
      }
      if (errorLower.includes('verify')) {
        return {
          title: tError('application.update.verify.title'),
          message: tError('application.update.verify.message'),
          suggestion: tError('application.update.verify.suggestion')
        };
      }
      return {
        title: tError('application.update.permission.title'),
        message: tError('application.update.permission.message'),
        suggestion: tError('application.update.permission.suggestion')
      };

    case 'config':
      if (errorLower.includes('corrupt') || errorLower.includes('invalid')) {
        return {
          title: tError('application.config.corrupt.title'),
          message: tError('application.config.corrupt.message'),
          suggestion: tError('application.config.corrupt.suggestion')
        };
      }
      if (errorLower.includes('parse')) {
        return {
          title: tError('application.config.parse.title'),
          message: tError('application.config.parse.message'),
          suggestion: tError('application.config.parse.suggestion')
        };
      }
      return {
        title: tError('application.config.save.title'),
        message: tError('application.config.save.message'),
        suggestion: tError('application.config.save.suggestion')
      };

    case 'migration':
      if (errorLower.includes('version')) {
        return {
          title: tError('application.migration.version.title'),
          message: tError('application.migration.version.message'),
          suggestion: tError('application.migration.version.suggestion')
        };
      }
      return {
        title: tError('application.migration.integrity.title'),
        message: tError('application.migration.integrity.message'),
        suggestion: tError('application.migration.integrity.suggestion')
      };

    case 'backup':
      if (errorLower.includes('space')) {
        return {
          title: tError('application.backup.space.title'),
          message: tError('application.backup.space.message'),
          suggestion: tError('application.backup.space.suggestion')
        };
      }
      if (errorLower.includes('permission')) {
        return {
          title: tError('application.backup.permission.title'),
          message: tError('application.backup.permission.message'),
          suggestion: tError('application.backup.permission.suggestion')
        };
      }
      return {
        title: tError('application.backup.corrupt.title'),
        message: tError('application.backup.corrupt.message'),
        suggestion: tError('application.backup.corrupt.suggestion')
      };

    default:
      return {
        title: tError('operationFailed'),
        message: tError('unknownError'),
        suggestion: tError('application.config.save.suggestion')
      };
  }
};

/**
 * 统一的错误信息格式化
 */
export const formatErrorMessage = (error: UserFriendlyError): string => {
  let message = error.message;
  if (error.suggestion) {
    message += `\n${tError('formatError.suggestion', { suggestion: error.suggestion })}`;
  }
  return message;
};