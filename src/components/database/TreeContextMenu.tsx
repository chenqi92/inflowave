import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from '@/components/ui/context-menu';
import {
  Copy,
  RefreshCw,
  Info,
  Plus,
  Trash2,
  Edit,
  FileDown,
  FileText,
  Table,
  Database,
} from 'lucide-react';
import { TreeNodeData } from './TreeNodeRenderer';
import { TreeNodeType } from '@/types/tree';

interface TreeContextMenuProps {
  children: React.ReactNode;
  node: TreeNodeData;
  onAction?: (action: string, node: TreeNodeData) => void;
}

export const TreeContextMenu: React.FC<TreeContextMenuProps> = ({
  children,
  node,
  onAction,
}) => {
  const handleAction = (action: string) => {
    onAction?.(action, node);
  };

  // 根据节点类型返回不同的菜单项
  const getMenuItems = () => {
    const nodeType = node.nodeType;

    // 连接节点菜单
    if (nodeType === 'connection') {
      return (
        <>
          <ContextMenuLabel>连接操作</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('copy_connection_name')}>
            <Copy className="w-4 h-4 mr-2" />
            复制连接名
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('create_database')}>
            <Plus className="w-4 h-4 mr-2" />
            创建数据库
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('refresh_connection')}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新连接
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => handleAction('disconnect')}>
            <Trash2 className="w-4 h-4 mr-2" />
            断开连接
          </ContextMenuItem>
        </>
      );
    }

    // 数据库节点菜单
    if (nodeType === 'database' || nodeType === 'storage_group' || nodeType === 'bucket') {
      return (
        <>
          <ContextMenuLabel>数据库操作</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('create_table')}>
            <Plus className="w-4 h-4 mr-2" />
            创建表
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('refresh_database')}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新数据库
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('database_info')}>
            <Info className="w-4 h-4 mr-2" />
            数据库信息
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel>查询操作</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('show_tables')}>
            <Table className="w-4 h-4 mr-2" />
            显示所有表
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel>复制操作</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('copy_name')}>
            <Copy className="w-4 h-4 mr-2" />
            复制数据库名
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('copy_use_statement')}>
            <FileText className="w-4 h-4 mr-2" />
            复制 USE 语句
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel>导入导出</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('export_database')}>
            <FileDown className="w-4 h-4 mr-2" />
            导出数据库
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => handleAction('drop_database')}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除数据库
          </ContextMenuItem>
        </>
      );
    }

    // 表/测量节点菜单
    if (nodeType === 'table' || nodeType === 'measurement') {
      return (
        <>
          <ContextMenuLabel>表操作</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('query_table')}>
            <Database className="w-4 h-4 mr-2" />
            查询数据
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('table_info')}>
            <Info className="w-4 h-4 mr-2" />
            表信息
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('refresh_table')}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新表
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel>复制操作</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('copy_name')}>
            <Copy className="w-4 h-4 mr-2" />
            复制表名
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleAction('copy_select_statement')}>
            <FileText className="w-4 h-4 mr-2" />
            复制 SELECT 语句
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuLabel>导入导出</ContextMenuLabel>
          <ContextMenuItem onClick={() => handleAction('export_table')}>
            <FileDown className="w-4 h-4 mr-2" />
            导出表数据
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem 
            onClick={() => handleAction('drop_table')}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除表
          </ContextMenuItem>
        </>
      );
    }

    // 默认菜单
    return (
      <>
        <ContextMenuItem onClick={() => handleAction('copy_name')}>
          <Copy className="w-4 h-4 mr-2" />
          复制名称
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleAction('refresh')}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新
        </ContextMenuItem>
      </>
    );
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {getMenuItems()}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default TreeContextMenu;

