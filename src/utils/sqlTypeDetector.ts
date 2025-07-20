/**
 * SQL语句类型检测工具
 * 用于检测InfluxDB SQL语句的类型并提供相应的UI展示逻辑
 */

export type SQLStatementType = 
  | 'SELECT' 
  | 'INSERT' 
  | 'DELETE' 
  | 'UPDATE' 
  | 'CREATE' 
  | 'DROP' 
  | 'ALTER' 
  | 'SHOW' 
  | 'EXPLAIN' 
  | 'GRANT' 
  | 'REVOKE' 
  | 'UNKNOWN';

export type SQLStatementCategory = 
  | 'query'      // 查询类：SELECT, SHOW, EXPLAIN
  | 'write'      // 写入类：INSERT
  | 'delete'     // 删除类：DELETE
  | 'ddl'        // 数据定义类：CREATE, DROP, ALTER
  | 'permission' // 权限类：GRANT, REVOKE
  | 'unknown';   // 未知类型

/**
 * 检测SQL语句类型
 */
export const detectSQLStatementType = (query?: string): SQLStatementType => {
  if (!query) return 'UNKNOWN';
  
  const trimmed = query.trim().toUpperCase();
  
  if (trimmed.startsWith('SELECT')) return 'SELECT';
  if (trimmed.startsWith('INSERT')) return 'INSERT';
  if (trimmed.startsWith('DELETE')) return 'DELETE';
  if (trimmed.startsWith('UPDATE')) return 'UPDATE';
  if (trimmed.startsWith('CREATE')) return 'CREATE';
  if (trimmed.startsWith('DROP')) return 'DROP';
  if (trimmed.startsWith('ALTER')) return 'ALTER';
  if (trimmed.startsWith('SHOW')) return 'SHOW';
  if (trimmed.startsWith('EXPLAIN')) return 'EXPLAIN';
  if (trimmed.startsWith('GRANT')) return 'GRANT';
  if (trimmed.startsWith('REVOKE')) return 'REVOKE';
  
  return 'UNKNOWN';
};

/**
 * 获取SQL语句的分类
 */
export const getSQLStatementCategory = (statementType: SQLStatementType): SQLStatementCategory => {
  switch (statementType) {
    case 'SELECT':
    case 'SHOW':
    case 'EXPLAIN':
      return 'query';
    case 'INSERT':
      return 'write';
    case 'DELETE':
      return 'delete';
    case 'CREATE':
    case 'DROP':
    case 'ALTER':
      return 'ddl';
    case 'GRANT':
    case 'REVOKE':
      return 'permission';
    default:
      return 'unknown';
  }
};

/**
 * 获取语句类型的显示信息
 */
export const getSQLStatementDisplayInfo = (statementType: SQLStatementType) => {
  const category = getSQLStatementCategory(statementType);
  
  const displayMap = {
    query: {
      title: '查询结果',
      icon: 'Table',
      description: '数据查询操作',
      color: 'blue'
    },
    write: {
      title: '写入结果',
      icon: 'CheckCircle',
      description: '数据写入操作',
      color: 'green'
    },
    delete: {
      title: '删除结果',
      icon: 'Trash2',
      description: '数据删除操作',
      color: 'orange'
    },
    ddl: {
      title: '操作结果',
      icon: 'Database',
      description: '数据结构操作',
      color: 'blue'
    },
    permission: {
      title: '权限结果',
      icon: 'Shield',
      description: '权限管理操作',
      color: 'purple'
    },
    unknown: {
      title: '执行结果',
      icon: 'FileText',
      description: '未知操作类型',
      color: 'gray'
    }
  };
  
  return displayMap[category];
};

/**
 * 获取语句类型应该显示的tabs
 */
export const getSQLStatementTabs = (statementType: SQLStatementType) => {
  const category = getSQLStatementCategory(statementType);
  
  const tabsMap = {
    query: [
      { key: 'table', label: '表格视图', icon: 'Table' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      { key: 'chart', label: '图表视图', icon: 'BarChart' }
    ],
    write: [
      { key: 'status', label: '执行状态', icon: 'CheckCircle' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' }
    ],
    delete: [
      { key: 'status', label: '删除状态', icon: 'Trash2' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' }
    ],
    ddl: [
      { key: 'status', label: '操作状态', icon: 'Database' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' }
    ],
    permission: [
      { key: 'status', label: '权限状态', icon: 'Shield' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' }
    ],
    unknown: [
      { key: 'json', label: 'JSON 视图', icon: 'FileText' }
    ]
  };
  
  return tabsMap[category];
};

/**
 * 获取默认选中的tab
 */
export const getDefaultTab = (statementType: SQLStatementType): string => {
  const category = getSQLStatementCategory(statementType);
  
  switch (category) {
    case 'query':
      return 'table';
    case 'write':
    case 'delete':
    case 'ddl':
    case 'permission':
      return 'status';
    default:
      return 'json';
  }
};

/**
 * 检查是否为查询类语句（返回数据的语句）
 */
export const isQueryStatement = (statementType: SQLStatementType): boolean => {
  return getSQLStatementCategory(statementType) === 'query';
};

/**
 * 检查是否为修改类语句（修改数据或结构的语句）
 */
export const isModificationStatement = (statementType: SQLStatementType): boolean => {
  const category = getSQLStatementCategory(statementType);
  return ['write', 'delete', 'ddl', 'permission'].includes(category);
};

/**
 * 获取语句执行结果的统计信息标签
 */
export const getResultStatsLabels = (statementType: SQLStatementType) => {
  const category = getSQLStatementCategory(statementType);
  
  const labelsMap = {
    query: {
      rowCount: '查询行数',
      executionTime: '查询时间',
      columns: '列数'
    },
    write: {
      rowCount: '写入行数',
      executionTime: '写入时间',
      columns: '字段数'
    },
    delete: {
      rowCount: '删除行数',
      executionTime: '删除时间',
      columns: '影响字段'
    },
    ddl: {
      rowCount: '影响对象',
      executionTime: '执行时间',
      columns: '操作项'
    },
    permission: {
      rowCount: '影响用户',
      executionTime: '执行时间',
      columns: '权限项'
    },
    unknown: {
      rowCount: '影响行数',
      executionTime: '执行时间',
      columns: '列数'
    }
  };
  
  return labelsMap[category];
};
