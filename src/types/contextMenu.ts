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
  | 'open_organization'
  | 'close_organization'
  | 'refresh_organization'
  | 'organization_info'
  | 'copy_organization_name'

  // Bucket 操作
  | 'create_bucket'
  | 'open_bucket'
  | 'close_bucket'
  | 'refresh_bucket'
  | 'bucket_info'
  | 'update_bucket_retention'
  | 'copy_bucket_name'
  | 'delete_bucket'

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
 *
 * 注意：标签、消息等文本内容现在通过 i18n 翻译系统管理
 * 参见: /public/locales/{locale}/contextMenu.json
 */
export interface ContextMenuActionMetadata {
  action: ContextMenuAction;
  requiresConfirmation?: boolean;
}

/**
 * 菜单动作注册表
 *
 * 文本内容 (标签、成功/错误消息、确认消息) 现已迁移至 i18n 翻译系统
 * 参见: /public/locales/{locale}/contextMenu.json
 */

// 辅助函数：创建动作元数据
const createAction = (
  action: ContextMenuAction,
  requiresConfirmation?: boolean
): ContextMenuActionMetadata => ({
  action,
  ...(requiresConfirmation && { requiresConfirmation }),
});

export const CONTEXT_MENU_ACTIONS: Record<ContextMenuAction, ContextMenuActionMetadata> = {
  // 连接操作
  test_connection: createAction('test_connection'),
  refresh_connection: createAction('refresh_connection'),
  create_database: createAction('create_database'),
  connection_info: createAction('connection_info'),
  connection_properties: createAction('connection_properties'),
  copy_connection_name: createAction('copy_connection_name'),
  disconnect: createAction('disconnect', true),
  delete_connection: createAction('delete_connection', true),

  // 数据库操作
  open_database: createAction('open_database'),
  close_database: createAction('close_database'),
  refresh_database: createAction('refresh_database'),
  show_tables: createAction('show_tables'),
  database_info: createAction('database_info'),
  manage_retention_policies: createAction('manage_retention_policies'),
  export_metadata: createAction('export_metadata'),
  copy_database_name: createAction('copy_database_name'),
  copy_use_statement: createAction('copy_use_statement'),
  delete_database: createAction('delete_database', true),

  // 表/测量操作
  view_table_data: createAction('view_table_data'),
  query_table: createAction('query_table'),
  query_builder: createAction('query_builder'),
  refresh_table: createAction('refresh_table'),
  generate_select_query: createAction('generate_select_query'),
  generate_count_query: createAction('generate_count_query'),
  generate_recent_query: createAction('generate_recent_query'),
  generate_aggregate_query: createAction('generate_aggregate_query'),
  table_statistics: createAction('table_statistics'),
  data_preview: createAction('data_preview'),
  table_info: createAction('table_info'),
  edit_table: createAction('edit_table'),
  table_designer: createAction('table_designer'),
  export_table_data: createAction('export_table_data'),
  import_table_data: createAction('import_table_data'),
  add_favorite: createAction('add_favorite'),
  remove_favorite: createAction('remove_favorite'),
  copy_table_name: createAction('copy_table_name'),
  copy_select_statement: createAction('copy_select_statement'),
  delete_table: createAction('delete_table', true),

  // 字段操作
  query_field: createAction('query_field'),
  field_details: createAction('field_details'),
  field_max: createAction('field_max'),
  field_min: createAction('field_min'),
  field_avg: createAction('field_avg'),
  field_sum: createAction('field_sum'),
  field_count: createAction('field_count'),
  field_stats: createAction('field_stats'),
  field_distribution: createAction('field_distribution'),
  copy_field_name: createAction('copy_field_name'),

  // 标签操作
  query_tag: createAction('query_tag'),
  tag_details: createAction('tag_details'),
  tag_values: createAction('tag_values'),
  tag_cardinality: createAction('tag_cardinality'),
  tag_distribution: createAction('tag_distribution'),
  generate_filter_query: createAction('generate_filter_query'),
  copy_tag_name: createAction('copy_tag_name'),

  // 字段组/标签组操作
  refresh_fields: createAction('refresh_fields'),
  show_all_fields: createAction('show_all_fields'),
  refresh_tags: createAction('refresh_tags'),
  show_all_tags: createAction('show_all_tags'),

  // IoTDB 设备操作
  view_device_data: createAction('view_device_data'),
  refresh_device: createAction('refresh_device'),
  create_timeseries: createAction('create_timeseries'),
  show_timeseries: createAction('show_timeseries'),
  device_info: createAction('device_info'),
  copy_device_name: createAction('copy_device_name'),
  delete_device: createAction('delete_device', true),

  // IoTDB 时间序列操作
  query_timeseries: createAction('query_timeseries'),
  timeseries_info: createAction('timeseries_info'),
  timeseries_stats: createAction('timeseries_stats'),
  copy_timeseries_name: createAction('copy_timeseries_name'),
  delete_timeseries: createAction('delete_timeseries', true),

  // IoTDB 模板操作
  view_template: createAction('view_template'),
  edit_template: createAction('edit_template'),
  refresh_template: createAction('refresh_template'),
  mount_template: createAction('mount_template'),
  mount_template_to_device: createAction('mount_template_to_device'),
  unmount_template: createAction('unmount_template'),
  copy_template_name: createAction('copy_template_name'),
  delete_template: createAction('delete_template', true),
  manage_templates: createAction('manage_templates'),

  // 保留策略操作
  view_retention_policy: createAction('view_retention_policy'),
  edit_retention_policy: createAction('edit_retention_policy'),
  copy_policy_name: createAction('copy_policy_name'),
  delete_retention_policy: createAction('delete_retention_policy', true),

  // 组织操作
  open_organization: createAction('open_organization'),
  close_organization: createAction('close_organization'),
  refresh_organization: createAction('refresh_organization'),
  organization_info: createAction('organization_info'),
  copy_organization_name: createAction('copy_organization_name'),

  // Bucket 操作
  create_bucket: createAction('create_bucket'),
  open_bucket: createAction('open_bucket'),
  close_bucket: createAction('close_bucket'),
  refresh_bucket: createAction('refresh_bucket'),
  bucket_info: createAction('bucket_info'),
  update_bucket_retention: createAction('update_bucket_retention'),
  copy_bucket_name: createAction('copy_bucket_name'),
  delete_bucket: createAction('delete_bucket', true),

  // 通用操作
  refresh: createAction('refresh'),
  copy_name: createAction('copy_name'),
};

