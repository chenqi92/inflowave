/**
 * UnifiedContextMenu - 统一的数据库浏览器右键菜单组件
 * 
 * 基于 shadcn/ui ContextMenu 实现，支持所有节点类型的右键菜单
 * 完全替代 DatabaseExplorerContextMenu、TreeContextMenu、DatabaseContextMenu、TableContextMenu
 */

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuShortcut,
} from '@/components/ui/ContextMenu';
import {
  Copy,
  RefreshCw,
  Settings,
  Trash2,
  Plus,
  X,
  Info,
  Clock,
  Star,
  StarOff,
  Edit,
  BarChart,
  Tags,
  FileText,
  Database,
  Table,
  FileDown,
  Eye,
  Zap,
  Activity,
  FolderOpen,
  FolderX,
  Search,
  Code,
  Filter,
  TrendingUp,
  Download,
  Upload,
  Link,
  Unlink,
  CheckCircle,
  XCircle,
  FileStack,
} from 'lucide-react';
import { TreeNodeData } from './TreeNodeRenderer';
import { TreeNodeType } from '@/types/tree';
import { isIoTDBConnection } from '@/utils/databaseExplorer/nodeUtils';

export interface UnifiedContextMenuProps {
  children: React.ReactNode;
  node: TreeNodeData;
  onAction: (action: string, node: TreeNodeData) => void;
  isDatabaseOpened?: (connectionId: string, database: string) => boolean;
  isFavorite?: (path: string) => boolean;
  disabled?: boolean;
}

/**
 * 统一的上下文菜单组件
 * 🔧 使用 React.memo 优化，避免不必要的重新渲染
 */
export const UnifiedContextMenu = React.memo<UnifiedContextMenuProps>(({
  children,
  node,
  onAction,
  isDatabaseOpened,
  isFavorite,
  disabled = false,
}) => {
  const handleAction = (action: string) => {
    onAction(action, node);
  };

  // 根据节点类型渲染菜单项
  const renderMenuItems = () => {
    const nodeType = node.nodeType;
    const metadata = node.metadata || {};

    switch (nodeType) {
      case 'connection':
        return renderConnectionMenu();
      
      case 'database':
      case 'system_database':
        return renderDatabaseMenu(metadata);
      
      case 'bucket':
      case 'system_bucket':
        return renderBucketMenu(metadata);
      
      case 'storage_group':
        return renderStorageGroupMenu(metadata);
      
      case 'measurement':
      case 'table':
        return renderTableMenu(metadata);
      
      case 'field':
        return renderFieldMenu();
      
      case 'tag':
        return renderTagMenu();
      
      case 'field_group':
        return renderFieldGroupMenu();
      
      case 'tag_group':
        return renderTagGroupMenu();
      
      case 'device':
        return renderDeviceMenu(metadata);
      
      case 'timeseries':
      case 'aligned_timeseries':
        return renderTimeseriesMenu(metadata);
      
      case 'template':
      case 'schema_template':
        return renderTemplateMenu(metadata);
      
      case 'retention_policy':
        return renderRetentionPolicyMenu(metadata);
      
      case 'organization':
        return renderOrganizationMenu(metadata);
      
      default:
        return renderDefaultMenu();
    }
  };

  // ============================================================================
  // 连接节点菜单
  // ============================================================================
  const renderConnectionMenu = () => {
    const metadata = node.metadata || {};
    const dbType = metadata.dbType?.toLowerCase();
    const isIoTDB = dbType === 'iotdb';

    return (
      <>
        <ContextMenuLabel>连接操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('test_connection')}>
          <Activity className="w-4 h-4 mr-2" />
          测试连接
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('refresh_connection')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新连接
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuLabel>数据库管理</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('create_database')}>
          <Plus className="w-4 h-4 mr-2" />
          创建数据库
        </ContextMenuItem>
        {isIoTDB && (
          <ContextMenuItem onClick={() => handleAction('manage_templates')}>
            <FileStack className="w-4 h-4 mr-2" />
            模板管理
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />

        <ContextMenuLabel>连接管理</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('connection_info')}>
          <Info className="w-4 h-4 mr-2" />
          连接信息
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('connection_properties')}>
          <Settings className="w-4 h-4 mr-2" />
          连接属性
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('copy_connection_name')}>
          <Copy className="w-4 h-4 mr-2" />
          复制连接名
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuItem onClick={() => handleAction('disconnect')}>
          <Unlink className="w-4 h-4 mr-2" />
          断开连接
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => handleAction('delete_connection')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除连接
        </ContextMenuItem>
      </>
    );
  };

  // ============================================================================
  // 数据库节点菜单
  // ============================================================================
  const renderDatabaseMenu = (metadata: Record<string, any>) => {
    const connectionId = metadata.connectionId || '';
    const database = node.name;
    const isOpened = isDatabaseOpened?.(connectionId, database) || false;

    return (
      <>
        <ContextMenuLabel>数据库操作</ContextMenuLabel>
        {!isOpened && (
          <ContextMenuItem onClick={() => handleAction('open_database')}>
            <FolderOpen className="w-4 h-4 mr-2" />
            打开数据库
          </ContextMenuItem>
        )}
        {isOpened && (
          <ContextMenuItem onClick={() => handleAction('close_database')}>
            <FolderX className="w-4 h-4 mr-2" />
            关闭数据库
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => handleAction('refresh_database')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新数据库
          <ContextMenuShortcut>⌘R</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        <ContextMenuLabel>结构操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('create_table')}>
          <Plus className="w-4 h-4 mr-2" />
          创建表
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('create_measurement')}>
          <Plus className="w-4 h-4 mr-2" />
          创建测量值
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        <ContextMenuLabel>查询操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('show_tables')}>
          <Table className="w-4 h-4 mr-2" />
          显示所有表
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('query_management')}>
          <Search className="w-4 h-4 mr-2" />
          查询管理
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        <ContextMenuLabel>数据管理</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('database_info')}>
          <Info className="w-4 h-4 mr-2" />
          数据库信息
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('manage_retention_policies')}>
          <Clock className="w-4 h-4 mr-2" />
          保留策略
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('export_metadata')}>
          <Download className="w-4 h-4 mr-2" />
          导出元数据
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        <ContextMenuLabel>复制操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('copy_database_name')}>
          <Copy className="w-4 h-4 mr-2" />
          复制数据库名
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('copy_use_statement')}>
          <FileText className="w-4 h-4 mr-2" />
          复制 USE 语句
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={() => handleAction('delete_database')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除数据库
        </ContextMenuItem>
      </>
    );
  };

  // ============================================================================
  // Bucket 节点菜单 (InfluxDB 2.x)
  // ============================================================================
  const renderBucketMenu = (metadata: Record<string, any>) => {
    const connectionId = metadata.connectionId || '';
    const bucket = node.name;
    const isOpened = isDatabaseOpened?.(connectionId, bucket) || false;

    return (
      <>
        <ContextMenuLabel>Bucket 操作</ContextMenuLabel>
        {!isOpened && (
          <ContextMenuItem onClick={() => handleAction('open_database')}>
            <FolderOpen className="w-4 h-4 mr-2" />
            打开 Bucket
          </ContextMenuItem>
        )}
        {isOpened && (
          <ContextMenuItem onClick={() => handleAction('close_database')}>
            <FolderX className="w-4 h-4 mr-2" />
            关闭 Bucket
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => handleAction('refresh_database')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新 Bucket
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        <ContextMenuLabel>数据管理</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('database_info')}>
          <Info className="w-4 h-4 mr-2" />
          Bucket 信息
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('export_metadata')}>
          <Download className="w-4 h-4 mr-2" />
          导出元数据
        </ContextMenuItem>
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={() => handleAction('copy_database_name')}>
          <Copy className="w-4 h-4 mr-2" />
          复制 Bucket 名
        </ContextMenuItem>
      </>
    );
  };

  // ============================================================================
  // 存储组节点菜单 (IoTDB)
  // ============================================================================
  const renderStorageGroupMenu = (metadata: Record<string, any>) => (
    <>
      <ContextMenuLabel>存储组操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('refresh_database')}>
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新存储组
      </ContextMenuItem>
      <ContextMenuSeparator />
      
      <ContextMenuLabel>设备管理</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('create_device')}>
        <Plus className="w-4 h-4 mr-2" />
        创建设备
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('show_devices')}>
        <Table className="w-4 h-4 mr-2" />
        显示所有设备
      </ContextMenuItem>
      <ContextMenuSeparator />
      
      <ContextMenuLabel>数据管理</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('database_info')}>
        <Info className="w-4 h-4 mr-2" />
        存储组信息
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('export_metadata')}>
        <Download className="w-4 h-4 mr-2" />
        导出元数据
      </ContextMenuItem>
      <ContextMenuSeparator />
      
      <ContextMenuItem onClick={() => handleAction('copy_database_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制存储组名
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 表/测量节点菜单
  // ============================================================================
  const renderTableMenu = (metadata: Record<string, any>) => {
    const tablePath = `${metadata.connectionId}/${metadata.database || metadata.databaseName}/${node.name}`;
    const isFav = isFavorite?.(tablePath) || false;

    return (
      <>
        <ContextMenuLabel>表操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('view_table_data')}>
          <Eye className="w-4 h-4 mr-2" />
          查看数据
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('query_table')}>
          <Search className="w-4 h-4 mr-2" />
          查询数据
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('query_builder')}>
          <Code className="w-4 h-4 mr-2" />
          查询构建器
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('refresh_table')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新表
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuLabel>查询生成</ContextMenuLabel>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Code className="w-4 h-4 mr-2" />
            示例查询
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => handleAction('generate_select_query')}>
              查询所有数据
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('generate_count_query')}>
              统计记录数
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('generate_recent_query')}>
              查询最近数据
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleAction('generate_aggregate_query')}>
              聚合查询
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />

        <ContextMenuLabel>数据分析</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('table_statistics')}>
          <BarChart className="w-4 h-4 mr-2" />
          统计分析
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('data_preview')}>
          <FileText className="w-4 h-4 mr-2" />
          数据预览
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuLabel>表管理</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('table_info')}>
          <Info className="w-4 h-4 mr-2" />
          表信息
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('edit_table')}>
          <Edit className="w-4 h-4 mr-2" />
          编辑表结构
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('table_designer')}>
          <Settings className="w-4 h-4 mr-2" />
          表设计器
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuLabel>数据操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('export_table_data')}>
          <Download className="w-4 h-4 mr-2" />
          导出数据
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('import_table_data')}>
          <Upload className="w-4 h-4 mr-2" />
          导入数据
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuLabel>收藏操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction(isFav ? 'remove_favorite' : 'add_favorite')}>
          {isFav ? <StarOff className="w-4 h-4 mr-2" /> : <Star className="w-4 h-4 mr-2" />}
          {isFav ? '取消收藏' : '添加收藏'}
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuLabel>复制操作</ContextMenuLabel>
        <ContextMenuItem onClick={() => handleAction('copy_table_name')}>
          <Copy className="w-4 h-4 mr-2" />
          复制表名
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('copy_select_statement')}>
          <FileText className="w-4 h-4 mr-2" />
          复制 SELECT 语句
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={() => handleAction('delete_table')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除表
        </ContextMenuItem>
      </>
    );
  };

  // ============================================================================
  // 字段节点菜单
  // ============================================================================
  const renderFieldMenu = () => (
    <>
      <ContextMenuLabel>字段操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('query_field')}>
        <Search className="w-4 h-4 mr-2" />
        查询此字段
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('field_details')}>
        <Info className="w-4 h-4 mr-2" />
        字段详情
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>统计分析</ContextMenuLabel>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <BarChart className="w-4 h-4 mr-2" />
          聚合函数
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={() => handleAction('field_max')}>
            最大值 (MAX)
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('field_min')}>
            最小值 (MIN)
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('field_avg')}>
            平均值 (MEAN)
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('field_sum')}>
            求和 (SUM)
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('field_count')}>
            计数 (COUNT)
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuItem onClick={() => handleAction('field_stats')}>
        <TrendingUp className="w-4 h-4 mr-2" />
        字段统计
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('field_distribution')}>
        <BarChart className="w-4 h-4 mr-2" />
        数值分布
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>复制操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('copy_field_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制字段名
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 标签节点菜单
  // ============================================================================
  const renderTagMenu = () => (
    <>
      <ContextMenuLabel>标签操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('query_tag')}>
        <Search className="w-4 h-4 mr-2" />
        查询此标签
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('tag_details')}>
        <Info className="w-4 h-4 mr-2" />
        标签详情
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>标签分析</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('tag_values')}>
        <Tags className="w-4 h-4 mr-2" />
        查看所有值
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('tag_cardinality')}>
        <BarChart className="w-4 h-4 mr-2" />
        基数统计
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('tag_distribution')}>
        <TrendingUp className="w-4 h-4 mr-2" />
        值分布
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>查询生成</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('generate_filter_query')}>
        <Filter className="w-4 h-4 mr-2" />
        生成筛选查询
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>复制操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('copy_tag_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制标签名
        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 字段组节点菜单
  // ============================================================================
  const renderFieldGroupMenu = () => (
    <>
      <ContextMenuLabel>字段组操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('refresh_fields')}>
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新字段列表
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('show_all_fields')}>
        <Table className="w-4 h-4 mr-2" />
        显示所有字段
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 标签组节点菜单
  // ============================================================================
  const renderTagGroupMenu = () => (
    <>
      <ContextMenuLabel>标签组操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('refresh_tags')}>
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新标签列表
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('show_all_tags')}>
        <Tags className="w-4 h-4 mr-2" />
        显示所有标签
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 设备节点菜单 (IoTDB)
  // ============================================================================
  const renderDeviceMenu = (metadata: Record<string, any>) => (
    <>
      <ContextMenuLabel>设备操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('view_device_data')}>
        <Eye className="w-4 h-4 mr-2" />
        查看设备数据
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('refresh_device')}>
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新设备
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>时间序列管理</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('create_timeseries')}>
        <Plus className="w-4 h-4 mr-2" />
        创建时间序列
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('show_timeseries')}>
        <Table className="w-4 h-4 mr-2" />
        显示所有时间序列
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>设备管理</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('device_info')}>
        <Info className="w-4 h-4 mr-2" />
        设备信息
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('mount_template_to_device')}>
        <Upload className="w-4 h-4 mr-2" />
        挂载模板
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('copy_device_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制设备名
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem
        onClick={() => handleAction('delete_device')}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        删除设备
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 时间序列节点菜单 (IoTDB)
  // ============================================================================
  const renderTimeseriesMenu = (metadata: Record<string, any>) => (
    <>
      <ContextMenuLabel>时间序列操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('query_timeseries')}>
        <Search className="w-4 h-4 mr-2" />
        查询数据
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('timeseries_info')}>
        <Info className="w-4 h-4 mr-2" />
        序列信息
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>数据分析</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('timeseries_stats')}>
        <BarChart className="w-4 h-4 mr-2" />
        统计分析
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem onClick={() => handleAction('copy_timeseries_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制序列名
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem
        onClick={() => handleAction('delete_timeseries')}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        删除时间序列
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 模板节点菜单 (IoTDB)
  // ============================================================================
  const renderTemplateMenu = (metadata: Record<string, any>) => (
    <>
      <ContextMenuLabel>模板操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('view_template')}>
        <Eye className="w-4 h-4 mr-2" />
        查看模板
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('edit_template')}>
        <Edit className="w-4 h-4 mr-2" />
        编辑模板
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('refresh_template')}>
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新模板
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuLabel>模板管理</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('mount_template')}>
        <Link className="w-4 h-4 mr-2" />
        挂载模板
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('unmount_template')}>
        <Unlink className="w-4 h-4 mr-2" />
        卸载模板
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem onClick={() => handleAction('copy_template_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制模板名
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem
        onClick={() => handleAction('delete_template')}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        删除模板
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 保留策略节点菜单
  // ============================================================================
  const renderRetentionPolicyMenu = (metadata: Record<string, any>) => (
    <>
      <ContextMenuLabel>保留策略操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('view_retention_policy')}>
        <Eye className="w-4 h-4 mr-2" />
        查看策略
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('edit_retention_policy')}>
        <Edit className="w-4 h-4 mr-2" />
        编辑策略
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem onClick={() => handleAction('copy_policy_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制策略名
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem
        onClick={() => handleAction('delete_retention_policy')}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        删除策略
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 组织节点菜单 (InfluxDB 2.x)
  // ============================================================================
  const renderOrganizationMenu = (metadata: Record<string, any>) => (
    <>
      <ContextMenuLabel>组织操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('refresh_organization')}>
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新组织
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('organization_info')}>
        <Info className="w-4 h-4 mr-2" />
        组织信息
      </ContextMenuItem>
      <ContextMenuSeparator />

      <ContextMenuItem onClick={() => handleAction('copy_organization_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制组织名
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 默认菜单（未知节点类型）
  // ============================================================================
  const renderDefaultMenu = () => (
    <>
      <ContextMenuLabel>通用操作</ContextMenuLabel>
      <ContextMenuItem onClick={() => handleAction('refresh')}>
        <RefreshCw className="w-4 h-4 mr-2" />
        刷新
      </ContextMenuItem>
      <ContextMenuItem onClick={() => handleAction('copy_name')}>
        <Copy className="w-4 h-4 mr-2" />
        复制名称
      </ContextMenuItem>
    </>
  );

  // ============================================================================
  // 主渲染
  // ============================================================================
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {renderMenuItems()}
      </ContextMenuContent>
    </ContextMenu>
  );
}, (prevProps, nextProps) => {
  // 🔧 自定义比较函数：只有当关键属性变化时才重新渲染
  // 这样可以避免父组件重新渲染时，所有菜单都重新渲染

  // 检查节点数据是否变化
  if (prevProps.node.id !== nextProps.node.id) {
    return false; // 需要重新渲染
  }
  if (prevProps.node.name !== nextProps.node.name) {
    return false;
  }
  if (prevProps.node.nodeType !== nextProps.node.nodeType) {
    return false;
  }

  // 检查函数引用是否变化
  if (prevProps.onAction !== nextProps.onAction) {
    return false;
  }
  if (prevProps.isDatabaseOpened !== nextProps.isDatabaseOpened) {
    return false;
  }
  if (prevProps.isFavorite !== nextProps.isFavorite) {
    return false;
  }

  // 检查disabled状态
  if (prevProps.disabled !== nextProps.disabled) {
    return false;
  }

  // 没有变化，跳过重新渲染
  return true; // 返回true表示props相等，跳过渲染
});

UnifiedContextMenu.displayName = 'UnifiedContextMenu';

export default UnifiedContextMenu;
