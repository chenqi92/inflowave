/**
 * 多数据库上下文菜单组件
 * 
 * 根据不同的数据库类型和节点类型显示相应的菜单选项
 */

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import {
  Plus,
  RefreshCw,
  Info,
  Trash2,
  Copy,
  Table,
  FileDown,
  FileText,
  Edit,
  Star,
  StarOff,
  Database,
  Settings,
  Play,
  BarChart,
  TreePine,
  Hash,
  Clock,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useFavoritesStore } from '@/store/favorites';
import { safeTauriInvoke } from '@/utils/tauri';
import { dialog } from '@/utils/dialog';
import type { DatabaseType } from '@/types';

interface DataSourceNode {
  key: string;
  nodeType: 'connection' | 'database' | 'table' | 'field' | 'storage_group' | 'device' | 'timeseries';
  dbType?: DatabaseType;
  connectionId?: string;
  database?: string;
  table?: string;
  metadata?: any;
}

interface MultiDatabaseContextMenuProps {
  children: React.ReactNode;
  node: DataSourceNode;
  onAction?: (action: string, node: DataSourceNode) => void;
}

export const MultiDatabaseContextMenu: React.FC<MultiDatabaseContextMenuProps> = ({
  children,
  node,
  onAction,
}) => {
  const { activeConnectionId } = useConnectionStore();
  const { addFavorite, removeFavorite, isFavorite, getFavorite } = useFavoritesStore();

  // 获取收藏路径
  const getFavoritePath = (node: DataSourceNode): string => {
    switch (node.nodeType) {
      case 'connection':
        return `connection:${node.connectionId}`;
      case 'database':
      case 'storage_group':
        return `database:${node.connectionId}:${node.database}`;
      case 'table':
      case 'device':
        return `table:${node.connectionId}:${node.database}:${node.table}`;
      default:
        return '';
    }
  };

  const favoritePath = getFavoritePath(node);
  const isNodeFavorite = isFavorite(favoritePath);

  // 处理菜单点击
  const handleMenuClick = async (action: string) => {
    try {
      switch (action) {
        case 'refresh':
          await handleRefresh();
          break;
        case 'info':
          await handleShowInfo();
          break;
        case 'copy_name':
          await handleCopyName();
          break;
        case 'favorite':
          await handleToggleFavorite();
          break;
        case 'create_query':
          await handleCreateQuery();
          break;
        case 'browse_data':
          await handleBrowseData();
          break;
        case 'export_data':
          await handleExportData();
          break;
        case 'create_database':
          await handleCreateDatabase();
          break;
        case 'create_table':
          await handleCreateTable();
          break;
        case 'drop_database':
          await handleDropDatabase();
          break;
        case 'drop_table':
          await handleDropTable();
          break;
        case 'edit_connection':
          await handleEditConnection();
          break;
        default:
          console.log('未知操作:', action);
      }
      
      // 通知父组件
      onAction?.(action, node);
    } catch (error) {
      console.error('菜单操作失败:', error);
      showMessage.error(`操作失败: ${error}`);
    }
  };

  // 刷新节点
  const handleRefresh = async () => {
    if (!node.connectionId) return;
    
    try {
      switch (node.nodeType) {
        case 'connection':
          await safeTauriInvoke('refresh_connection', { connectionId: node.connectionId });
          showMessage.success('已刷新连接');
          break;
        case 'database':
        case 'storage_group':
          await safeTauriInvoke('refresh_database_structure', {
            connectionId: node.connectionId,
            database: node.database,
          });
          showMessage.success(`已刷新${node.dbType === 'iotdb' ? '存储组' : '数据库'}结构`);
          break;
        case 'table':
        case 'device':
          await safeTauriInvoke('refresh_table_structure', {
            connectionId: node.connectionId,
            database: node.database,
            table: node.table,
          });
          showMessage.success(`已刷新${node.dbType === 'iotdb' ? '设备' : '表'}结构`);
          break;
      }
    } catch (error) {
      showMessage.error(`刷新失败: ${error}`);
    }
  };

  // 显示信息
  const handleShowInfo = async () => {
    if (!node.connectionId) return;
    
    try {
      let info: any;
      let title: string;
      
      switch (node.nodeType) {
        case 'connection':
          info = await safeTauriInvoke('get_connection_info', { connectionId: node.connectionId });
          title = '连接信息';
          break;
        case 'database':
        case 'storage_group':
          info = await safeTauriInvoke('get_database_info', {
            connectionId: node.connectionId,
            database: node.database,
          });
          title = `${node.dbType === 'iotdb' ? '存储组' : '数据库'}信息`;
          break;
        case 'table':
        case 'device':
          info = await safeTauriInvoke('get_table_info', {
            connectionId: node.connectionId,
            database: node.database,
            table: node.table,
          });
          title = `${node.dbType === 'iotdb' ? '设备' : '表'}信息`;
          break;
        default:
          return;
      }
      
      await dialog.info({
        title,
        content: (
          <div className="space-y-2">
            <pre className="bg-muted/50 p-4 rounded-md max-h-96 overflow-auto whitespace-pre-wrap text-xs font-mono border">
              {JSON.stringify(info, null, 2)}
            </pre>
          </div>
        ),
      });
    } catch (error) {
      showMessage.error(`获取信息失败: ${error}`);
    }
  };

  // 复制名称
  const handleCopyName = async () => {
    let name = '';
    
    switch (node.nodeType) {
      case 'connection':
        name = node.metadata?.connection?.name || '';
        break;
      case 'database':
      case 'storage_group':
        name = node.database || '';
        break;
      case 'table':
      case 'device':
        name = node.table || '';
        break;
      case 'field':
      case 'timeseries':
        name = node.metadata?.fieldName || '';
        break;
    }
    
    if (name) {
      await writeToClipboard(name);
      showMessage.success('已复制到剪贴板');
    }
  };

  // 切换收藏状态
  const handleToggleFavorite = async () => {
    if (isNodeFavorite) {
      // 需要找到收藏项的 ID 来删除
      const favorite = getFavorite(favoritePath);
      if (favorite) {
        removeFavorite(favorite.id);
        showMessage.success('已取消收藏');
      }
    } else {
      addFavorite({
        type: node.nodeType as any,
        path: favoritePath,
        name: node.metadata?.connection?.name || node.database || node.table || '',
        connectionId: node.connectionId || '',
        database: node.database,
        table: node.table,
        description: `${node.dbType?.toUpperCase()} ${node.nodeType}`,
      });
      showMessage.success('已添加到收藏');
    }
  };

  // 创建查询
  const handleCreateQuery = async () => {
    // 根据数据库类型生成默认查询
    let query = '';
    
    switch (node.dbType) {
      case 'influxdb':
        if (node.table) {
          query = `SELECT * FROM "${node.table}" WHERE time >= now() - 1h LIMIT 100`;
        } else if (node.database) {
          query = `SHOW MEASUREMENTS ON "${node.database}"`;
        }
        break;
      case 'iotdb':
        if (node.table) {
          query = `SELECT * FROM ${node.database}.${node.table} WHERE time >= now() - 1h LIMIT 100`;
        } else if (node.database) {
          query = `SHOW DEVICES ${node.database}`;
        }
        break;
      case 'prometheus':
        if (node.table) {
          query = `${node.table}[1h]`;
        }
        break;
      case 'elasticsearch':
        if (node.table) {
          query = `GET /${node.table}/_search\n{\n  "size": 100\n}`;
        }
        break;
    }
    
    // 触发创建查询标签页
    onAction?.('create_query', { ...node, metadata: { ...node.metadata, query } });
  };

  // 浏览数据
  const handleBrowseData = async () => {
    if (node.nodeType === 'table' || node.nodeType === 'device') {
      onAction?.('browse_data', node);
    }
  };

  // 导出数据
  const handleExportData = async () => {
    if (node.nodeType === 'table' || node.nodeType === 'device') {
      onAction?.('export_data', node);
    }
  };

  // 创建数据库
  const handleCreateDatabase = async () => {
    onAction?.('create_database', node);
  };

  // 创建表
  const handleCreateTable = async () => {
    onAction?.('create_table', node);
  };

  // 删除数据库
  const handleDropDatabase = async () => {
    const confirmed = await dialog.confirm({
      title: '确认删除',
      content: `确定要删除${node.dbType === 'iotdb' ? '存储组' : '数据库'} "${node.database}" 吗？此操作不可撤销。`,
    });
    
    if (confirmed) {
      await safeTauriInvoke('drop_database', {
        connectionId: node.connectionId,
        database: node.database,
      });
      showMessage.success(`已删除${node.dbType === 'iotdb' ? '存储组' : '数据库'}`);
    }
  };

  // 删除表
  const handleDropTable = async () => {
    const confirmed = await dialog.confirm({
      title: '确认删除',
      content: `确定要删除${node.dbType === 'iotdb' ? '设备' : '表'} "${node.table}" 吗？此操作不可撤销。`,
    });
    
    if (confirmed) {
      await safeTauriInvoke('drop_table', {
        connectionId: node.connectionId,
        database: node.database,
        table: node.table,
      });
      showMessage.success(`已删除${node.dbType === 'iotdb' ? '设备' : '表'}`);
    }
  };

  // 编辑连接
  const handleEditConnection = async () => {
    onAction?.('edit_connection', node);
  };

  // 根据节点类型生成菜单项
  const getMenuItems = () => {
    const items = [];
    
    // 通用操作
    items.push({
      key: 'refresh',
      label: '刷新',
      icon: <RefreshCw className="w-4 h-4" />,
    });
    
    items.push({
      key: 'info',
      label: '查看信息',
      icon: <Info className="w-4 h-4" />,
    });
    
    items.push({
      key: 'copy_name',
      label: '复制名称',
      icon: <Copy className="w-4 h-4" />,
    });
    
    items.push({
      key: 'favorite',
      label: isNodeFavorite ? '取消收藏' : '添加收藏',
      icon: isNodeFavorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />,
    });
    
    // 分隔符
    items.push({ key: 'divider1', type: 'divider' });
    
    // 根据节点类型添加特定操作
    switch (node.nodeType) {
      case 'connection':
        items.push({
          key: 'edit_connection',
          label: '编辑连接',
          icon: <Edit className="w-4 h-4" />,
        });
        items.push({
          key: 'create_database',
          label: `创建${node.dbType === 'iotdb' ? '存储组' : '数据库'}`,
          icon: <Plus className="w-4 h-4" />,
        });
        break;
        
      case 'database':
      case 'storage_group':
        items.push({
          key: 'create_query',
          label: '新建查询',
          icon: <FileText className="w-4 h-4" />,
        });
        items.push({
          key: 'create_table',
          label: `创建${node.dbType === 'iotdb' ? '设备' : '表'}`,
          icon: <Plus className="w-4 h-4" />,
        });
        items.push({ key: 'divider2', type: 'divider' });
        items.push({
          key: 'drop_database',
          label: `删除${node.dbType === 'iotdb' ? '存储组' : '数据库'}`,
          icon: <Trash2 className="w-4 h-4" />,
          className: 'text-red-600',
        });
        break;
        
      case 'table':
      case 'device':
        items.push({
          key: 'create_query',
          label: '新建查询',
          icon: <FileText className="w-4 h-4" />,
        });
        items.push({
          key: 'browse_data',
          label: '浏览数据',
          icon: <Table className="w-4 h-4" />,
        });
        items.push({
          key: 'export_data',
          label: '导出数据',
          icon: <FileDown className="w-4 h-4" />,
        });
        items.push({ key: 'divider2', type: 'divider' });
        items.push({
          key: 'drop_table',
          label: `删除${node.dbType === 'iotdb' ? '设备' : '表'}`,
          icon: <Trash2 className="w-4 h-4" />,
          className: 'text-red-600',
        });
        break;
        
      case 'field':
      case 'timeseries':
        items.push({
          key: 'create_query',
          label: '查询此字段',
          icon: <Play className="w-4 h-4" />,
        });
        break;
    }
    
    return items;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {getMenuItems().map((item) => {
          if (item.type === 'divider') {
            return <DropdownMenuSeparator key={item.key} />;
          }
          
          return (
            <DropdownMenuItem
              key={item.key}
              onClick={() => handleMenuClick(item.key)}
              className={item.className}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiDatabaseContextMenu;
