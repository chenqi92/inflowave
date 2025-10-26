/**
 * 上下文菜单相关类型定义
 */

import { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import { TreeNodeType } from './tree';

/**
 * 菜单动作类型
 */
export type ContextMenuAction =
  // 连接操作
  | 'test_connection'
  | 'refresh_connection'
  | 'create_database'
  | 'connection_info'
  | 'connection_properties'
  | 'copy_connection_name'
  | 'disconnect'
  | 'delete_connection'
  
  // 数据库操作
  | 'open_database'
  | 'close_database'
  | 'refresh_database'
  | 'show_tables'
  | 'database_info'
  | 'manage_retention_policies'
  | 'export_metadata'
  | 'copy_database_name'
  | 'copy_use_statement'
  | 'delete_database'
  
  // 表/测量操作
  | 'view_table_data'
  | 'query_table'
  | 'query_builder'
  | 'refresh_table'
  | 'generate_select_query'
  | 'generate_count_query'
  | 'generate_recent_query'
  | 'generate_aggregate_query'
  | 'table_statistics'
  | 'data_preview'
  | 'table_info'
  | 'edit_table'
  | 'table_designer'
  | 'export_table_data'
  | 'import_table_data'
  | 'add_favorite'
  | 'remove_favorite'
  | 'copy_table_name'
  | 'copy_select_statement'
  | 'delete_table'
  
  // 字段操作
  | 'query_field'
  | 'field_details'
  | 'field_max'
  | 'field_min'
  | 'field_avg'
  | 'field_sum'
  | 'field_count'
  | 'field_stats'
  | 'field_distribution'
  | 'copy_field_name'
  
  // 标签操作
  | 'query_tag'
  | 'tag_details'
  | 'tag_values'
  | 'tag_cardinality'
  | 'tag_distribution'
  | 'generate_filter_query'
  | 'copy_tag_name'
  
  // 字段组/标签组操作
  | 'refresh_fields'
  | 'show_all_fields'
  | 'refresh_tags'
  | 'show_all_tags'
  
  // IoTDB 设备操作
  | 'view_device_data'
  | 'refresh_device'
  | 'create_timeseries'
  | 'show_timeseries'
  | 'device_info'
  | 'copy_device_name'
  | 'delete_device'
  
  // IoTDB 时间序列操作
  | 'query_timeseries'
  | 'timeseries_info'
  | 'timeseries_stats'
  | 'copy_timeseries_name'
  | 'delete_timeseries'
  
  // IoTDB 模板操作
  | 'view_template'
  | 'edit_template'
  | 'refresh_template'
  | 'mount_template'
  | 'mount_template_to_device'
  | 'unmount_template'
  | 'copy_template_name'
  | 'delete_template'
  | 'manage_templates'
  
  // 保留策略操作
  | 'view_retention_policy'
  | 'edit_retention_policy'
  | 'copy_policy_name'
  | 'delete_retention_policy'
  
  // 组织操作
  | 'refresh_organization'
  | 'organization_info'
  | 'copy_organization_name'
  
  // 通用操作
  | 'refresh'
  | 'copy_name';

/**
 * 菜单动作处理器类型
 */
export type ContextMenuActionHandler = (
  action: ContextMenuAction,
  node: TreeNodeData
) => void | Promise<void>;

/**
 * 菜单项配置
 */
export interface ContextMenuItemConfig {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: ContextMenuAction;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItemConfig[];
}

/**
 * 节点类型到菜单项的映射
 */
export type NodeTypeMenuMap = {
  [K in TreeNodeType]?: ContextMenuItemConfig[];
};

/**
 * 菜单上下文
 */
export interface ContextMenuContext {
  node: TreeNodeData;
  isDatabaseOpened?: (connectionId: string, database: string) => boolean;
  isFavorite?: (path: string) => boolean;
}

/**
 * 菜单动作元数据
 */
export interface ContextMenuActionMetadata {
  action: ContextMenuAction;
  label: string;
  description: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * 菜单动作注册表
 */
export const CONTEXT_MENU_ACTIONS: Record<ContextMenuAction, ContextMenuActionMetadata> = {
  // 连接操作
  test_connection: {
    action: 'test_connection',
    label: '测试连接',
    description: '测试数据库连接是否正常',
    successMessage: '连接测试成功',
    errorMessage: '连接测试失败',
  },
  refresh_connection: {
    action: 'refresh_connection',
    label: '刷新连接',
    description: '刷新连接的数据库列表',
    successMessage: '连接已刷新',
  },
  create_database: {
    action: 'create_database',
    label: '创建数据库',
    description: '创建新的数据库',
  },
  connection_info: {
    action: 'connection_info',
    label: '连接信息',
    description: '查看连接的详细信息',
  },
  connection_properties: {
    action: 'connection_properties',
    label: '连接属性',
    description: '编辑连接属性',
  },
  copy_connection_name: {
    action: 'copy_connection_name',
    label: '复制连接名',
    description: '复制连接名称到剪贴板',
    successMessage: '已复制连接名',
  },
  disconnect: {
    action: 'disconnect',
    label: '断开连接',
    description: '断开数据库连接',
    requiresConfirmation: true,
    confirmationMessage: '确定要断开连接吗？',
    successMessage: '已断开连接',
  },
  delete_connection: {
    action: 'delete_connection',
    label: '删除连接',
    description: '删除此连接配置',
    requiresConfirmation: true,
    confirmationMessage: '确定要删除此连接吗？此操作不可撤销！',
    successMessage: '连接已删除',
  },
  
  // 数据库操作
  open_database: {
    action: 'open_database',
    label: '打开数据库',
    description: '打开数据库并加载其结构',
    successMessage: '数据库已打开',
  },
  close_database: {
    action: 'close_database',
    label: '关闭数据库',
    description: '关闭数据库',
    successMessage: '数据库已关闭',
  },
  refresh_database: {
    action: 'refresh_database',
    label: '刷新数据库',
    description: '刷新数据库的表列表',
    successMessage: '数据库已刷新',
  },
  show_tables: {
    action: 'show_tables',
    label: '显示所有表',
    description: '显示数据库中的所有表',
  },
  database_info: {
    action: 'database_info',
    label: '数据库信息',
    description: '查看数据库详细信息',
  },
  manage_retention_policies: {
    action: 'manage_retention_policies',
    label: '保留策略',
    description: '管理数据保留策略',
  },
  export_metadata: {
    action: 'export_metadata',
    label: '导出元数据',
    description: '导出数据库元数据',
    successMessage: '元数据导出成功',
  },
  copy_database_name: {
    action: 'copy_database_name',
    label: '复制数据库名',
    description: '复制数据库名称到剪贴板',
    successMessage: '已复制数据库名',
  },
  copy_use_statement: {
    action: 'copy_use_statement',
    label: '复制 USE 语句',
    description: '复制 USE 语句到剪贴板',
    successMessage: '已复制 USE 语句',
  },
  delete_database: {
    action: 'delete_database',
    label: '删除数据库',
    description: '删除整个数据库',
    requiresConfirmation: true,
    confirmationMessage: '确定要删除此数据库吗？此操作将删除所有数据且不可撤销！',
    successMessage: '数据库已删除',
  },
  
  // 表/测量操作 - 继续在下一部分
  view_table_data: {
    action: 'view_table_data',
    label: '查看数据',
    description: '查看表中的数据',
  },
  query_table: {
    action: 'query_table',
    label: '查询数据',
    description: '查询表数据',
  },
  query_builder: {
    action: 'query_builder',
    label: '查询构建器',
    description: '查询表数据',
  },
  refresh_table: {
    action: 'refresh_table',
    label: '刷新表',
    description: '刷新表结构和数据',
    successMessage: '表已刷新',
  },
  generate_select_query: {
    action: 'generate_select_query',
    label: '查询所有数据',
    description: '生成 SELECT 查询',
  },
  generate_count_query: {
    action: 'generate_count_query',
    label: '统计记录数',
    description: '生成 COUNT 查询',
  },
  generate_recent_query: {
    action: 'generate_recent_query',
    label: '查询最近数据',
    description: '生成最近数据查询',
  },
  generate_aggregate_query: {
    action: 'generate_aggregate_query',
    label: '聚合查询',
    description: '生成聚合查询',
  },
  table_statistics: {
    action: 'table_statistics',
    label: '统计分析',
    description: '查看表统计信息',
  },
  data_preview: {
    action: 'data_preview',
    label: '数据预览',
    description: '预览表数据',
  },
  table_info: {
    action: 'table_info',
    label: '表信息',
    description: '查看表详细信息',
  },
  edit_table: {
    action: 'edit_table',
    label: '编辑表结构',
    description: '编辑表结构',
  },
  table_designer: {
    action: 'table_designer',
    label: '表设计器',
    description: '打开表设计器',
  },
  export_table_data: {
    action: 'export_table_data',
    label: '导出数据',
    description: '导出表数据',
    successMessage: '数据导出成功',
  },
  import_table_data: {
    action: 'import_table_data',
    label: '导入数据',
    description: '导入数据到表',
  },
  add_favorite: {
    action: 'add_favorite',
    label: '添加收藏',
    description: '添加到收藏夹',
    successMessage: '已添加到收藏',
  },
  remove_favorite: {
    action: 'remove_favorite',
    label: '取消收藏',
    description: '从收藏夹移除',
    successMessage: '已取消收藏',
  },
  copy_table_name: {
    action: 'copy_table_name',
    label: '复制表名',
    description: '复制表名到剪贴板',
    successMessage: '已复制表名',
  },
  copy_select_statement: {
    action: 'copy_select_statement',
    label: '复制 SELECT 语句',
    description: '复制 SELECT 语句到剪贴板',
    successMessage: '已复制 SELECT 语句',
  },
  delete_table: {
    action: 'delete_table',
    label: '删除表',
    description: '删除此表',
    requiresConfirmation: true,
    confirmationMessage: '确定要删除此表吗？此操作不可撤销！',
    successMessage: '表已删除',
  },
  
  // 字段操作 - 将在下一个文件中继续
  query_field: { action: 'query_field', label: '查询此字段', description: '查询此字段的数据' },
  field_details: { action: 'field_details', label: '字段详情', description: '查看字段详细信息' },
  field_max: { action: 'field_max', label: '最大值', description: '查询字段最大值' },
  field_min: { action: 'field_min', label: '最小值', description: '查询字段最小值' },
  field_avg: { action: 'field_avg', label: '平均值', description: '查询字段平均值' },
  field_sum: { action: 'field_sum', label: '求和', description: '查询字段总和' },
  field_count: { action: 'field_count', label: '计数', description: '查询字段计数' },
  field_stats: { action: 'field_stats', label: '字段统计', description: '查看字段统计信息' },
  field_distribution: { action: 'field_distribution', label: '数值分布', description: '查看字段数值分布' },
  copy_field_name: { action: 'copy_field_name', label: '复制字段名', description: '复制字段名到剪贴板', successMessage: '已复制字段名' },
  
  // 标签操作
  query_tag: { action: 'query_tag', label: '查询此标签', description: '查询此标签的数据' },
  tag_details: { action: 'tag_details', label: '标签详情', description: '查看标签详细信息' },
  tag_values: { action: 'tag_values', label: '查看所有值', description: '查看标签所有可能的值' },
  tag_cardinality: { action: 'tag_cardinality', label: '基数统计', description: '查看标签基数' },
  tag_distribution: { action: 'tag_distribution', label: '值分布', description: '查看标签值分布' },
  generate_filter_query: { action: 'generate_filter_query', label: '生成筛选查询', description: '生成基于此标签的筛选查询' },
  copy_tag_name: { action: 'copy_tag_name', label: '复制标签名', description: '复制标签名到剪贴板', successMessage: '已复制标签名' },
  
  // 其他操作 - 简化定义
  refresh_fields: { action: 'refresh_fields', label: '刷新字段列表', description: '刷新字段列表' },
  show_all_fields: { action: 'show_all_fields', label: '显示所有字段', description: '显示所有字段' },
  refresh_tags: { action: 'refresh_tags', label: '刷新标签列表', description: '刷新标签列表' },
  show_all_tags: { action: 'show_all_tags', label: '显示所有标签', description: '显示所有标签' },
  view_device_data: { action: 'view_device_data', label: '查看设备数据', description: '查看设备数据' },
  refresh_device: { action: 'refresh_device', label: '刷新设备', description: '刷新设备' },
  create_timeseries: { action: 'create_timeseries', label: '创建时间序列', description: '创建时间序列' },
  show_timeseries: { action: 'show_timeseries', label: '显示所有时间序列', description: '显示所有时间序列' },
  device_info: { action: 'device_info', label: '设备信息', description: '查看设备信息' },
  copy_device_name: { action: 'copy_device_name', label: '复制设备名', description: '复制设备名', successMessage: '已复制设备名' },
  delete_device: { action: 'delete_device', label: '删除设备', description: '删除设备', requiresConfirmation: true, confirmationMessage: '确定要删除此设备吗？', successMessage: '设备已删除' },
  query_timeseries: { action: 'query_timeseries', label: '查询数据', description: '查询时间序列数据' },
  timeseries_info: { action: 'timeseries_info', label: '序列信息', description: '查看时间序列信息' },
  timeseries_stats: { action: 'timeseries_stats', label: '统计分析', description: '查看时间序列统计' },
  copy_timeseries_name: { action: 'copy_timeseries_name', label: '复制序列名', description: '复制时间序列名', successMessage: '已复制序列名' },
  delete_timeseries: { action: 'delete_timeseries', label: '删除时间序列', description: '删除时间序列', requiresConfirmation: true, confirmationMessage: '确定要删除此时间序列吗？', successMessage: '时间序列已删除' },
  view_template: { action: 'view_template', label: '查看模板', description: '查看模板' },
  edit_template: { action: 'edit_template', label: '编辑模板', description: '编辑模板' },
  refresh_template: { action: 'refresh_template', label: '刷新模板', description: '刷新模板' },
  mount_template: { action: 'mount_template', label: '挂载模板', description: '挂载模板到节点' },
  mount_template_to_device: { action: 'mount_template_to_device', label: '挂载模板到设备', description: '挂载模板到设备' },
  unmount_template: { action: 'unmount_template', label: '卸载模板', description: '从节点卸载模板' },
  copy_template_name: { action: 'copy_template_name', label: '复制模板名', description: '复制模板名', successMessage: '已复制模板名' },
  delete_template: { action: 'delete_template', label: '删除模板', description: '删除模板', requiresConfirmation: true, confirmationMessage: '确定要删除此模板吗？', successMessage: '模板已删除' },
  manage_templates: { action: 'manage_templates', label: '管理模板', description: '管理 IoTDB 模板' },
  view_retention_policy: { action: 'view_retention_policy', label: '查看策略', description: '查看保留策略' },
  edit_retention_policy: { action: 'edit_retention_policy', label: '编辑策略', description: '编辑保留策略' },
  copy_policy_name: { action: 'copy_policy_name', label: '复制策略名', description: '复制策略名', successMessage: '已复制策略名' },
  delete_retention_policy: { action: 'delete_retention_policy', label: '删除策略', description: '删除保留策略', requiresConfirmation: true, confirmationMessage: '确定要删除此策略吗？', successMessage: '策略已删除' },
  refresh_organization: { action: 'refresh_organization', label: '刷新组织', description: '刷新组织' },
  organization_info: { action: 'organization_info', label: '组织信息', description: '查看组织信息' },
  copy_organization_name: { action: 'copy_organization_name', label: '复制组织名', description: '复制组织名', successMessage: '已复制组织名' },
  refresh: { action: 'refresh', label: '刷新', description: '刷新节点' },
  copy_name: { action: 'copy_name', label: '复制名称', description: '复制名称', successMessage: '已复制名称' },
};

