/**
 * DatabaseExplorerContextMenu - 数据库浏览器右键菜单组件
 * 
 * 为不同类型的节点提供相应的右键菜单选项
 */

import React from 'react';
import {
  Copy,
  RefreshCw,
  Settings,
  Trash2,
  Plus,
  X,
  FolderX,
  Info,
  Clock,
  Star,
  StarOff,
  Edit,
  BarChart,
  Tags,
  FileText,
} from 'lucide-react';
import { TreeNodeData } from './TreeNodeRenderer';

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface DatabaseExplorerContextMenuProps {
  node: TreeNodeData | null;
  position: ContextMenuPosition;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, node: TreeNodeData) => void;
  isDatabaseOpened?: (connectionId: string, database: string) => boolean;
  isFavorite?: (path: string) => boolean;
}

export const DatabaseExplorerContextMenu: React.FC<DatabaseExplorerContextMenuProps> = ({
  node,
  position,
  isOpen,
  onClose,
  onAction,
  isDatabaseOpened,
  isFavorite,
}) => {
  if (!isOpen || !node) return null;

  const nodeType = node.nodeType;
  const metadata = node.metadata || {};

  // 根据节点类型渲染不同的菜单项
  const renderMenuItems = () => {
    switch (nodeType) {
      case 'connection':
        return (
          <>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              连接操作
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('copy_connection_name', node)}
            >
              <Copy className="w-4 h-4" />
              复制连接名
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('create_database', node)}
            >
              <Plus className="w-4 h-4" />
              创建数据库
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('refresh_connection', node)}
            >
              <RefreshCw className="w-4 h-4" />
              刷新连接
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('disconnect', node)}
            >
              <X className="w-4 h-4" />
              断开连接
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('connection_properties', node)}
            >
              <Settings className="w-4 h-4" />
              连接属性
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
              onClick={() => onAction('delete_connection', node)}
            >
              <Trash2 className="w-4 h-4" />
              删除连接
            </button>
          </>
        );

      case 'database':
        { const connectionId = metadata.connectionId || '';
        const database = node.name;
        const isOpened = isDatabaseOpened?.(connectionId, database) || false;

        return (
          <>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              数据库操作
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('copy_database_name', node)}
            >
              <Copy className="w-4 h-4" />
              复制数据库名
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('refresh_database', node)}
            >
              <RefreshCw className="w-4 h-4" />
              刷新数据库
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('create_measurement', node)}
            >
              <Plus className="w-4 h-4" />
              创建测量值
            </button>
            <div className="my-1 h-px bg-border" />
            {isOpened ? (
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => onAction('close_database', node)}
              >
                <FolderX className="w-4 h-4" />
                断开连接
              </button>
            ) : (
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => onAction('open_database', node)}
              >
                <Plus className="w-4 h-4" />
                打开连接
              </button>
            )}
            <div className="my-1 h-px bg-border" />
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              数据库管理
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('database_info', node)}
            >
              <Info className="w-4 h-4" />
              数据库信息
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('manage_retention_policies', node)}
            >
              <Clock className="w-4 h-4" />
              保留策略
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
              onClick={() => onAction('delete_database', node)}
            >
              <Trash2 className="w-4 h-4" />
              删除数据库
            </button>
          </>
        ); }

      case 'measurement':
      case 'table':
        { const tablePath = `${metadata.connectionId}/${metadata.database || metadata.databaseName}/${node.name}`;
        const isFav = isFavorite?.(tablePath) || false;

        return (
          <>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              表操作
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('view_table_data', node)}
            >
              <FileText className="w-4 h-4" />
              查看数据
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('copy_table_name', node)}
            >
              <Copy className="w-4 h-4" />
              复制表名
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction(isFav ? 'remove_favorite' : 'add_favorite', node)}
            >
              {isFav ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
              {isFav ? '取消收藏' : '添加收藏'}
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('table_info', node)}
            >
              <Info className="w-4 h-4" />
              表信息
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('edit_table', node)}
            >
              <Edit className="w-4 h-4" />
              编辑表结构
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
              onClick={() => onAction('delete_table', node)}
            >
              <Trash2 className="w-4 h-4" />
              删除表
            </button>
          </>
        ); }

      case 'field':
        return (
          <>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              字段操作
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('copy_field_name', node)}
            >
              <Copy className="w-4 h-4" />
              复制字段名
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('field_stats', node)}
            >
              <BarChart className="w-4 h-4" />
              字段统计
            </button>
          </>
        );

      case 'tag':
        return (
          <>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              标签操作
            </div>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('copy_tag_name', node)}
            >
              <Copy className="w-4 h-4" />
              复制标签名
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => onAction('tag_values', node)}
            >
              <Tags className="w-4 h-4" />
              查看标签值
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      <div
        className="absolute z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        style={{
          left: Math.min(position.x, window.innerWidth - 200),
          top: Math.min(position.y, window.innerHeight - 300),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {renderMenuItems()}
      </div>
    </div>
  );
};

export default DatabaseExplorerContextMenu;

