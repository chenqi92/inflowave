/**
 * SQL语句类型检测工具
 * 用于检测多种数据库 SQL 语句的类型并提供相应的UI展示逻辑
 * 支持：InfluxDB (InfluxQL, Flux), MySQL, PostgreSQL, IoTDB 等
 */

export type SQLStatementType =
  // 查询类
  | 'SELECT'           // 普通查询
  | 'SELECT_AGGREGATE' // 聚合查询 (COUNT, SUM, AVG, MAX, MIN)
  | 'SELECT_GROUP'     // 分组查询 (GROUP BY)
  | 'SELECT_JOIN'      // 联表查询 (JOIN)
  | 'SELECT_SUBQUERY'  // 子查询
  | 'SHOW'             // 显示元数据
  | 'DESCRIBE'         // 描述表结构
  | 'DESC'             // 描述表结构（简写）
  | 'EXPLAIN'          // 执行计划
  | 'ANALYZE'          // 分析查询
  // 写入类
  | 'INSERT'           // 插入数据
  | 'INSERT_SELECT'    // 插入查询结果
  // 更新类
  | 'UPDATE'           // 更新数据
  // 删除类
  | 'DELETE'           // 删除数据
  | 'TRUNCATE'         // 清空表
  // DDL 类
  | 'CREATE'           // 创建对象
  | 'CREATE_DATABASE'  // 创建数据库
  | 'CREATE_TABLE'     // 创建表
  | 'CREATE_INDEX'     // 创建索引
  | 'DROP'             // 删除对象
  | 'DROP_DATABASE'    // 删除数据库
  | 'DROP_TABLE'       // 删除表
  | 'DROP_INDEX'       // 删除索引
  | 'ALTER'            // 修改对象
  | 'ALTER_TABLE'      // 修改表
  | 'ALTER_DATABASE'   // 修改数据库
  // 权限类
  | 'GRANT'            // 授权
  | 'REVOKE'           // 撤销权限
  // 事务类
  | 'BEGIN'            // 开始事务
  | 'START'            // 开始事务
  | 'COMMIT'           // 提交事务
  | 'ROLLBACK'         // 回滚事务
  | 'SAVEPOINT'        // 保存点
  // 其他类
  | 'USE'              // 切换数据库
  | 'SET'              // 设置变量
  | 'CALL'             // 调用存储过程
  // 时序数据库特定
  | 'FLUX'             // InfluxDB Flux 查询
  | 'INFLUXQL'         // InfluxDB InfluxQL 查询
  | 'IOTDB'            // IoTDB 特定查询
  | 'UNKNOWN';         // 未知类型

export type SQLStatementCategory =
  | 'query'       // 查询类：SELECT, SHOW, EXPLAIN, DESCRIBE, ANALYZE
  | 'write'       // 写入类：INSERT
  | 'update'      // 更新类：UPDATE
  | 'delete'      // 删除类：DELETE, TRUNCATE
  | 'ddl'         // 数据定义类：CREATE, DROP, ALTER
  | 'permission'  // 权限类：GRANT, REVOKE
  | 'transaction' // 事务类：BEGIN, COMMIT, ROLLBACK
  | 'other'       // 其他类：USE, SET, CALL
  | 'unknown';    // 未知类型

/**
 * 检测是否为聚合查询
 */
const isAggregateQuery = (query: string): boolean => {
  const upperQuery = query.toUpperCase();
  const aggregateFunctions = ['COUNT(', 'SUM(', 'AVG(', 'MAX(', 'MIN(', 'STDDEV(', 'VARIANCE('];
  return aggregateFunctions.some(func => upperQuery.includes(func));
};

/**
 * 检测是否为分组查询
 */
const isGroupByQuery = (query: string): boolean => {
  return /\bGROUP\s+BY\b/i.test(query);
};

/**
 * 检测是否为联表查询
 */
const isJoinQuery = (query: string): boolean => {
  return /\b(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|JOIN)\b/i.test(query);
};

/**
 * 检测是否为子查询
 */
const isSubQuery = (query: string): boolean => {
  // 简单检测：查找 SELECT 语句中的嵌套 SELECT
  const selectCount = (query.match(/\bSELECT\b/gi) || []).length;
  return selectCount > 1;
};

/**
 * 检测是否为 Flux 查询
 */
const isFluxQuery = (query: string): boolean => {
  const fluxKeywords = ['from(', 'range(', '|>', 'filter(', 'aggregateWindow('];
  return fluxKeywords.some(keyword => query.includes(keyword));
};

/**
 * 检测SQL语句类型
 */
export const detectSQLStatementType = (query?: string): SQLStatementType => {
  if (!query) return 'UNKNOWN';

  const trimmed = query.trim();
  const upperTrimmed = trimmed.toUpperCase();

  // Flux 查询检测（优先级最高）
  if (isFluxQuery(trimmed)) return 'FLUX';

  // SELECT 查询细分
  if (upperTrimmed.startsWith('SELECT')) {
    // 检测聚合查询
    if (isAggregateQuery(trimmed)) return 'SELECT_AGGREGATE';
    // 检测分组查询
    if (isGroupByQuery(trimmed)) return 'SELECT_GROUP';
    // 检测联表查询
    if (isJoinQuery(trimmed)) return 'SELECT_JOIN';
    // 检测子查询
    if (isSubQuery(trimmed)) return 'SELECT_SUBQUERY';
    // 普通查询
    return 'SELECT';
  }

  // INSERT 语句细分
  if (upperTrimmed.startsWith('INSERT')) {
    // INSERT ... SELECT
    if (upperTrimmed.includes('SELECT')) return 'INSERT_SELECT';
    return 'INSERT';
  }

  // CREATE 语句细分
  if (upperTrimmed.startsWith('CREATE')) {
    if (/CREATE\s+DATABASE/i.test(trimmed)) return 'CREATE_DATABASE';
    if (/CREATE\s+TABLE/i.test(trimmed)) return 'CREATE_TABLE';
    if (/CREATE\s+(UNIQUE\s+)?INDEX/i.test(trimmed)) return 'CREATE_INDEX';
    return 'CREATE';
  }

  // DROP 语句细分
  if (upperTrimmed.startsWith('DROP')) {
    if (/DROP\s+DATABASE/i.test(trimmed)) return 'DROP_DATABASE';
    if (/DROP\s+TABLE/i.test(trimmed)) return 'DROP_TABLE';
    if (/DROP\s+INDEX/i.test(trimmed)) return 'DROP_INDEX';
    return 'DROP';
  }

  // ALTER 语句细分
  if (upperTrimmed.startsWith('ALTER')) {
    if (/ALTER\s+TABLE/i.test(trimmed)) return 'ALTER_TABLE';
    if (/ALTER\s+DATABASE/i.test(trimmed)) return 'ALTER_DATABASE';
    return 'ALTER';
  }

  // 事务类语句
  if (upperTrimmed.startsWith('BEGIN') || upperTrimmed.startsWith('START TRANSACTION')) return 'BEGIN';
  if (upperTrimmed.startsWith('COMMIT')) return 'COMMIT';
  if (upperTrimmed.startsWith('ROLLBACK')) return 'ROLLBACK';
  if (upperTrimmed.startsWith('SAVEPOINT')) return 'SAVEPOINT';

  // 其他语句
  if (upperTrimmed.startsWith('DELETE')) return 'DELETE';
  if (upperTrimmed.startsWith('UPDATE')) return 'UPDATE';
  if (upperTrimmed.startsWith('TRUNCATE')) return 'TRUNCATE';
  if (upperTrimmed.startsWith('SHOW')) return 'SHOW';
  if (upperTrimmed.startsWith('DESCRIBE') || upperTrimmed.startsWith('DESC ')) return 'DESCRIBE';
  if (upperTrimmed.startsWith('EXPLAIN')) return 'EXPLAIN';
  if (upperTrimmed.startsWith('ANALYZE')) return 'ANALYZE';
  if (upperTrimmed.startsWith('GRANT')) return 'GRANT';
  if (upperTrimmed.startsWith('REVOKE')) return 'REVOKE';
  if (upperTrimmed.startsWith('USE')) return 'USE';
  if (upperTrimmed.startsWith('SET')) return 'SET';
  if (upperTrimmed.startsWith('CALL')) return 'CALL';

  return 'UNKNOWN';
};

/**
 * 获取SQL语句的分类
 */
export const getSQLStatementCategory = (statementType: SQLStatementType): SQLStatementCategory => {
  switch (statementType) {
    // 查询类
    case 'SELECT':
    case 'SELECT_AGGREGATE':
    case 'SELECT_GROUP':
    case 'SELECT_JOIN':
    case 'SELECT_SUBQUERY':
    case 'SHOW':
    case 'DESCRIBE':
    case 'DESC':
    case 'EXPLAIN':
    case 'ANALYZE':
    case 'FLUX':
    case 'INFLUXQL':
    case 'IOTDB':
      return 'query';

    // 写入类
    case 'INSERT':
    case 'INSERT_SELECT':
      return 'write';

    // 更新类
    case 'UPDATE':
      return 'update';

    // 删除类
    case 'DELETE':
    case 'TRUNCATE':
      return 'delete';

    // DDL 类
    case 'CREATE':
    case 'CREATE_DATABASE':
    case 'CREATE_TABLE':
    case 'CREATE_INDEX':
    case 'DROP':
    case 'DROP_DATABASE':
    case 'DROP_TABLE':
    case 'DROP_INDEX':
    case 'ALTER':
    case 'ALTER_TABLE':
    case 'ALTER_DATABASE':
      return 'ddl';

    // 权限类
    case 'GRANT':
    case 'REVOKE':
      return 'permission';

    // 事务类
    case 'BEGIN':
    case 'START':
    case 'COMMIT':
    case 'ROLLBACK':
    case 'SAVEPOINT':
      return 'transaction';

    // 其他类
    case 'USE':
    case 'SET':
    case 'CALL':
      return 'other';

    default:
      return 'unknown';
  }
};

/**
 * 获取语句类型的显示信息
 */
export const getSQLStatementDisplayInfo = (statementType: SQLStatementType) => {
  const category = getSQLStatementCategory(statementType);

  const displayMap: Record<SQLStatementCategory, {
    title: string;
    icon: string;
    description: string;
    color: string;
  }> = {
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
    update: {
      title: '更新结果',
      icon: 'Edit',
      description: '数据更新操作',
      color: 'blue'
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
    transaction: {
      title: '事务结果',
      icon: 'GitBranch',
      description: '事务控制操作',
      color: 'indigo'
    },
    other: {
      title: '执行结果',
      icon: 'Terminal',
      description: '其他操作',
      color: 'gray'
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

  // 通用 tabs（所有类型都有）
  const commonTabs = [
    { key: 'messages', label: '消息', icon: 'MessageSquare' },
    { key: 'history', label: '历史', icon: 'History' }
  ];

  const tabsMap: Record<SQLStatementCategory, Array<{ key: string; label: string; icon: string }>> = {
    query: [
      { key: 'table', label: '表格视图', icon: 'Table' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      { key: 'chart', label: '图表视图', icon: 'BarChart' },
      { key: 'stats', label: '统计信息', icon: 'TrendingUp' },
      ...commonTabs
    ],
    write: [
      { key: 'status', label: '执行状态', icon: 'CheckCircle' },
      { key: 'details', label: '详细信息', icon: 'Info' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ],
    update: [
      { key: 'status', label: '执行状态', icon: 'Edit' },
      { key: 'affected', label: '影响行数', icon: 'Database' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ],
    delete: [
      { key: 'status', label: '删除状态', icon: 'Trash2' },
      { key: 'details', label: '详细信息', icon: 'Info' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ],
    ddl: [
      { key: 'status', label: '操作状态', icon: 'Database' },
      { key: 'changes', label: '结构变更', icon: 'FileEdit' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ],
    permission: [
      { key: 'status', label: '权限状态', icon: 'Shield' },
      { key: 'permissions', label: '权限详情', icon: 'Key' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ],
    transaction: [
      { key: 'status', label: '事务状态', icon: 'GitBranch' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ],
    other: [
      { key: 'status', label: '执行状态', icon: 'Terminal' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ],
    unknown: [
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ]
  };

  // 特殊处理：EXPLAIN 查询显示执行计划 tab
  if (statementType === 'EXPLAIN' || statementType === 'ANALYZE') {
    return [
      { key: 'plan', label: '执行计划', icon: 'GitBranch' },
      { key: 'cost', label: '成本分析', icon: 'TrendingUp' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ];
  }

  // 特殊处理：聚合查询显示统计卡片
  if (statementType === 'SELECT_AGGREGATE') {
    return [
      { key: 'cards', label: '统计卡片', icon: 'LayoutGrid' },
      { key: 'table', label: '表格视图', icon: 'Table' },
      { key: 'chart', label: '图表视图', icon: 'BarChart' },
      { key: 'json', label: 'JSON 视图', icon: 'FileText' },
      ...commonTabs
    ];
  }

  return tabsMap[category];
};

/**
 * 获取默认选中的tab
 */
export const getDefaultTab = (statementType: SQLStatementType): string => {
  // 特殊处理：EXPLAIN 查询默认显示执行计划
  if (statementType === 'EXPLAIN' || statementType === 'ANALYZE') {
    return 'plan';
  }

  // 特殊处理：聚合查询默认显示聚合统计
  if (shouldShowAggregateCards(statementType)) {
    return 'aggregate';
  }

  const category = getSQLStatementCategory(statementType);

  switch (category) {
    case 'query':
      return 'table';
    case 'write':
    case 'update':
    case 'delete':
    case 'ddl':
    case 'permission':
    case 'transaction':
    case 'other':
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
  return ['write', 'update', 'delete', 'ddl', 'permission'].includes(category);
};

/**
 * 获取语句执行结果的统计信息标签
 */
export const getResultStatsLabels = (statementType: SQLStatementType) => {
  const category = getSQLStatementCategory(statementType);

  const labelsMap: Record<SQLStatementCategory, {
    rowCount: string;
    executionTime: string;
    columns: string;
  }> = {
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
    update: {
      rowCount: '更新行数',
      executionTime: '更新时间',
      columns: '影响字段'
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
    transaction: {
      rowCount: '事务操作',
      executionTime: '执行时间',
      columns: '操作项'
    },
    other: {
      rowCount: '影响项',
      executionTime: '执行时间',
      columns: '操作项'
    },
    unknown: {
      rowCount: '影响行数',
      executionTime: '执行时间',
      columns: '列数'
    }
  };

  return labelsMap[category];
};

/**
 * 检测是否需要显示聚合统计卡片
 */
export const shouldShowAggregateCards = (statementType: SQLStatementType): boolean => {
  return statementType === 'SELECT_AGGREGATE';
};

/**
 * 检测是否需要显示执行计划
 */
export const shouldShowExecutionPlan = (statementType: SQLStatementType): boolean => {
  return statementType === 'EXPLAIN' || statementType === 'ANALYZE';
};

/**
 * 检测是否需要显示图表视图
 */
export const shouldShowChartView = (statementType: SQLStatementType): boolean => {
  const category = getSQLStatementCategory(statementType);
  return category === 'query';
};

/**
 * 检测是否需要显示字段统计 Tab
 * 只有普通 SELECT 查询才显示字段统计
 */
export const shouldShowFieldStatistics = (statementType: SQLStatementType): boolean => {
  return statementType === 'SELECT';
};

/**
 * 检测是否需要显示可视化 Tab
 * 只有普通 SELECT 查询才显示可视化
 */
export const shouldShowVisualization = (statementType: SQLStatementType): boolean => {
  return statementType === 'SELECT';
};

/**
 * 检测是否需要显示洞察 Tab
 * 只有普通 SELECT 查询才显示洞察
 */
export const shouldShowInsights = (statementType: SQLStatementType): boolean => {
  return statementType === 'SELECT';
};

/**
 * 获取 SQL 语句的简短描述
 */
export const getSQLStatementDescription = (statementType: SQLStatementType): string => {
  const descriptionMap: Record<SQLStatementType, string> = {
    SELECT: '普通查询',
    SELECT_AGGREGATE: '聚合查询',
    SELECT_GROUP: '分组查询',
    SELECT_JOIN: '联表查询',
    SELECT_SUBQUERY: '子查询',
    SHOW: '显示元数据',
    DESCRIBE: '描述表结构',
    DESC: '描述表结构',
    EXPLAIN: '执行计划',
    ANALYZE: '分析查询',
    INSERT: '插入数据',
    INSERT_SELECT: '插入查询结果',
    UPDATE: '更新数据',
    DELETE: '删除数据',
    TRUNCATE: '清空表',
    CREATE: '创建对象',
    CREATE_DATABASE: '创建数据库',
    CREATE_TABLE: '创建表',
    CREATE_INDEX: '创建索引',
    DROP: '删除对象',
    DROP_DATABASE: '删除数据库',
    DROP_TABLE: '删除表',
    DROP_INDEX: '删除索引',
    ALTER: '修改对象',
    ALTER_TABLE: '修改表',
    ALTER_DATABASE: '修改数据库',
    GRANT: '授权',
    REVOKE: '撤销权限',
    BEGIN: '开始事务',
    START: '开始事务',
    COMMIT: '提交事务',
    ROLLBACK: '回滚事务',
    SAVEPOINT: '保存点',
    USE: '切换数据库',
    SET: '设置变量',
    CALL: '调用存储过程',
    FLUX: 'Flux 查询',
    INFLUXQL: 'InfluxQL 查询',
    IOTDB: 'IoTDB 查询',
    UNKNOWN: '未知类型'
  };

  return descriptionMap[statementType] || '未知操作';
};
