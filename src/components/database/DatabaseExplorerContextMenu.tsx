/**
 * 数据库浏览器右键菜单组件
 * 
 * 提供数据源节点的右键菜单功能
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
import {
  RefreshCw,
  Star,
  StarOff,
  Copy,
  Edit,
  Trash2,
  Database,
  Table,
  Plus,
  Settings,
  Info,
  Play,
  Eye,
  Download,
  Upload,
} from 'lucide-react';
import type { ConnectionConfig, DatabaseType } from '@/types';

// 右键菜单项接口
interface ContextMenuItem {
  key: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'item' | 'separator' | 'label';
  danger?: boolean;
}

// 右键菜单属性接口
interface DatabaseExplorerContextMenuProps {
  nodeType: 'connection' | 'database' | 'table' | 'field' | 'storage_group' | 'device' | 'timeseries';
  nodeData: {
    connectionId?: string;
    database?: string;
    table?: string;
    field?: string;
    dbType?: DatabaseType;
    connection?: ConnectionConfig;
    isConnected?: boolean;
    isFavorite?: boolean;
  };
  onAction: (action: string, data?: any) => void;
  children: React.ReactNode;
}

export const DatabaseExplorerContextMenu: React.FC<DatabaseExplorerContextMenuProps> = ({
  nodeType,
  nodeData,
  onAction,
  children,
}) => {
  // 生成连接节点的菜单项
  const getConnectionMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];
    
    if (nodeData.isConnected) {
      items.push(
        { key: 'disconnect', label: '断开连接', icon: <RefreshCw className="w-4 h-4" />, onClick: () => onAction('disconnect') },
        { key: 'refresh', label: '刷新', icon: <RefreshCw className="w-4 h-4" />, onClick: () => onAction('refresh') }
      );
    } else {
      items.push(
        { key: 'connect', label: '连接', icon: <RefreshCw className="w-4 h-4" />, onClick: () => onAction('connect') }
      );
    }
    
    items.push(
      { key: 'separator1', type: 'separator' },
      { key: 'edit', label: '编辑连接', icon: <Edit className="w-4 h-4" />, onClick: () => onAction('edit') },
      { key: 'duplicate', label: '复制连接', icon: <Copy className="w-4 h-4" />, onClick: () => onAction('duplicate') },
      { key: 'separator2', type: 'separator' }
    );
    
    if (nodeData.isFavorite) {
      items.push({ key: 'unfavorite', label: '取消收藏', icon: <StarOff className="w-4 h-4" />, onClick: () => onAction('unfavorite') });
    } else {
      items.push({ key: 'favorite', label: '添加收藏', icon: <Star className="w-4 h-4" />, onClick: () => onAction('favorite') });
    }
    
    items.push(
      { key: 'separator3', type: 'separator' },
      { key: 'info', label: '连接信息', icon: <Info className="w-4 h-4" />, onClick: () => onAction('info') },
      { key: 'separator4', type: 'separator' },
      { key: 'delete', label: '删除连接', icon: <Trash2 className="w-4 h-4" />, onClick: () => onAction('delete'), danger: true }
    );
    
    return items;
  };

  // 生成数据库节点的菜单项
  const getDatabaseMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      { key: 'refresh', label: '刷新', icon: <RefreshCw className="w-4 h-4" />, onClick: () => onAction('refresh') },
      { key: 'separator1', type: 'separator' },
      { key: 'browse', label: '浏览数据', icon: <Eye className="w-4 h-4" />, onClick: () => onAction('browse') },
      { key: 'query', label: '新建查询', icon: <Play className="w-4 h-4" />, onClick: () => onAction('query') },
      { key: 'separator2', type: 'separator' }
    ];
    
    if (nodeData.isFavorite) {
      items.push({ key: 'unfavorite', label: '取消收藏', icon: <StarOff className="w-4 h-4" />, onClick: () => onAction('unfavorite') });
    } else {
      items.push({ key: 'favorite', label: '添加收藏', icon: <Star className="w-4 h-4" />, onClick: () => onAction('favorite') });
    }
    
    // InfluxDB 特定菜单
    if (nodeData.dbType === 'influxdb') {
      items.push(
        { key: 'separator3', type: 'separator' },
        { key: 'create_retention', label: '创建保留策略', icon: <Plus className="w-4 h-4" />, onClick: () => onAction('create_retention') },
        { key: 'manage_retention', label: '管理保留策略', icon: <Settings className="w-4 h-4" />, onClick: () => onAction('manage_retention') }
      );
    }
    
    items.push(
      { key: 'separator4', type: 'separator' },
      { key: 'copy_name', label: '复制名称', icon: <Copy className="w-4 h-4" />, onClick: () => onAction('copy_name') },
      { key: 'info', label: '数据库信息', icon: <Info className="w-4 h-4" />, onClick: () => onAction('info') }
    );
    
    return items;
  };

  // 生成表节点的菜单项
  const getTableMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      { key: 'browse', label: '浏览数据', icon: <Eye className="w-4 h-4" />, onClick: () => onAction('browse') },
      { key: 'query', label: '查询表', icon: <Play className="w-4 h-4" />, onClick: () => onAction('query') },
      { key: 'separator1', type: 'separator' },
      { key: 'refresh', label: '刷新', icon: <RefreshCw className="w-4 h-4" />, onClick: () => onAction('refresh') },
      { key: 'separator2', type: 'separator' }
    ];
    
    if (nodeData.isFavorite) {
      items.push({ key: 'unfavorite', label: '取消收藏', icon: <StarOff className="w-4 h-4" />, onClick: () => onAction('unfavorite') });
    } else {
      items.push({ key: 'favorite', label: '添加收藏', icon: <Star className="w-4 h-4" />, onClick: () => onAction('favorite') });
    }
    
    items.push(
      { key: 'separator3', type: 'separator' },
      { key: 'copy_name', label: '复制表名', icon: <Copy className="w-4 h-4" />, onClick: () => onAction('copy_name') },
      { key: 'copy_query', label: '复制查询语句', icon: <Copy className="w-4 h-4" />, onClick: () => onAction('copy_query') },
      { key: 'separator4', type: 'separator' },
      { key: 'export', label: '导出数据', icon: <Download className="w-4 h-4" />, onClick: () => onAction('export') },
      { key: 'import', label: '导入数据', icon: <Upload className="w-4 h-4" />, onClick: () => onAction('import') },
      { key: 'separator5', type: 'separator' },
      { key: 'info', label: '表信息', icon: <Info className="w-4 h-4" />, onClick: () => onAction('info') }
    );
    
    return items;
  };

  // 生成字段节点的菜单项
  const getFieldMenuItems = (): ContextMenuItem[] => {
    return [
      { key: 'query', label: '查询字段', icon: <Play className="w-4 h-4" />, onClick: () => onAction('query') },
      { key: 'separator1', type: 'separator' },
      { key: 'copy_name', label: '复制字段名', icon: <Copy className="w-4 h-4" />, onClick: () => onAction('copy_name') },
      { key: 'copy_query', label: '复制查询语句', icon: <Copy className="w-4 h-4" />, onClick: () => onAction('copy_query') },
      { key: 'separator2', type: 'separator' },
      { key: 'info', label: '字段信息', icon: <Info className="w-4 h-4" />, onClick: () => onAction('info') }
    ];
  };

  // 根据节点类型获取菜单项
  const getMenuItems = (): ContextMenuItem[] => {
    switch (nodeType) {
      case 'connection':
        return getConnectionMenuItems();
      case 'database':
      case 'storage_group':
        return getDatabaseMenuItems();
      case 'table':
      case 'device':
        return getTableMenuItems();
      case 'field':
      case 'timeseries':
        return getFieldMenuItems();
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {menuItems.map((item) => {
          if (item.type === 'separator') {
            return <DropdownMenuSeparator key={item.key} />;
          }
          
          if (item.type === 'label') {
            return <DropdownMenuLabel key={item.key}>{item.label}</DropdownMenuLabel>;
          }
          
          return (
            <DropdownMenuItem
              key={item.key}
              onClick={item.onClick}
              disabled={item.disabled}
              className={item.danger ? 'text-red-600 focus:text-red-600' : ''}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DatabaseExplorerContextMenu;
