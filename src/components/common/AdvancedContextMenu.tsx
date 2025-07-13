import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, Divider, Typography, Input } from 'antd';
import { Space, Modal, message } from '@/components/ui';
import {
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  FileOutlined,
  FolderOutlined,
  DatabaseOutlined,
  TableOutlined,
  ColumnOutlined,
  PlayCircleOutlined,
  ExportOutlined,
  ImportOutlined,
  SettingOutlined,
  ReloadOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  StarOutlined,
  TagOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  UploadOutlined,
  CloseOutlined,
  EyeOutlined,
  CodeOutlined,
  ToolOutlined,
  BugOutlined,
  HistoryOutlined,
  BookOutlined,
  ClusterOutlined,
  LineChartOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  CompressOutlined,
  UnorderedListOutlined,
} from '@/components/ui';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';

const { Text } = Typography;
const { SubMenu, ItemGroup } = Menu;

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  children?: ContextMenuItem[];
  onClick?: () => void;
  shortcut?: string;
  description?: string;
  category?: string;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  target?: any;
  contextType?: 'database' | 'table' | 'column' | 'connection' | 'query' | 'file' | 'general';
}

export const AdvancedContextMenu: React.FC<ContextMenuProps> = ({
  items,
  visible,
  x,
  y,
  onClose,
  target,
  contextType = 'general',
}) => {
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // 计算菜单位置，确保不会超出屏幕
  useEffect(() => {
    if (visible) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 280; // 预估菜单宽度
      const menuHeight = Math.min(items.length * 32 + 20, 400); // 预估菜单高度

      let left = x;
      let top = y;

      // 检查右侧是否有足够空间
      if (x + menuWidth > viewportWidth) {
        left = x - menuWidth;
      }

      // 检查底部是否有足够空间
      if (y + menuHeight > viewportHeight) {
        top = y - menuHeight;
      }

      // 确保菜单不会超出屏幕边界
      left = Math.max(0, Math.min(left, viewportWidth - menuWidth));
      top = Math.max(0, Math.min(top, viewportHeight - menuHeight));

      setMenuStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        boxShadow: '0 3px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '200px',
        maxWidth: '280px',
        maxHeight: '400px',
        overflow: 'auto',
      });
    }
  }, [visible, x, y, items.length]);

  const handleMenuClick = useCallback((item: ContextMenuItem) => {
    if (item.onClick) {
      item.onClick();
    }
    onClose();
  }, [onClose]);

  const renderMenuItem = useCallback((item: ContextMenuItem) => {
    if (item.divider) {
      return <Divider key={`divider-${item.key}`} style={{ margin: '4px 0' }} />;
    }

    if (item.children && item.children.length > 0) {
      return (
        <SubMenu
          key={item.key}
          icon={item.icon}
          title={
            <Space>
              <span>{item.label}</span>
              {item.shortcut && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {item.shortcut}
                </Text>
              )}
            </Space>
          }
          disabled={item.disabled}
        >
          {item.children.map(renderMenuItem)}
        </SubMenu>
      );
    }

    return (
      <Menu.Item
        key={item.key}
        icon={item.icon}
        disabled={item.disabled}
        danger={item.danger}
        onClick={() => handleMenuClick(item)}
        style={{ 
          fontSize: '13px',
          lineHeight: '32px',
          paddingLeft: '12px',
          paddingRight: '12px',
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>{item.label}</span>
          {item.shortcut && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {item.shortcut}
            </Text>
          )}
        </Space>
      </Menu.Item>
    );
  }, [handleMenuClick]);

  if (!visible) return null;

  return (
    <div style={menuStyle}>
      <Menu
        mode="inline"
        style={{ border: 'none', background: 'transparent' }}
        onClick={(e) => e.domEvent.stopPropagation()}
      >
        {items.map(renderMenuItem)}
      </Menu>
    </div>
  );
};

// 预定义的上下文菜单
export const useDatabaseContextMenu = (database: any) => {
  const { activeConnectionId } = useConnectionStore();

  const items: ContextMenuItem[] = [
    {
      key: 'query',
      label: '查询数据库',
      icon: <PlayCircleOutlined />,
      shortcut: 'Ctrl+Q',
      onClick: () => {
        // 触发查询数据库事件
        const event = new CustomEvent('query-database', {
          detail: { database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'refresh',
      label: '刷新结构',
      icon: <ReloadOutlined />,
      shortcut: 'F5',
      onClick: () => {
        const event = new CustomEvent('refresh-database', {
          detail: { database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    { key: 'divider1', label: '', divider: true },
    {
      key: 'export',
      label: '导出数据',
      icon: <ExportOutlined />,
      children: [
        {
          key: 'export-csv',
          label: '导出为 CSV',
          icon: <FileTextOutlined />,
          onClick: () => {
            const event = new CustomEvent('export-database', {
              detail: { database, format: 'csv', connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'export-json',
          label: '导出为 JSON',
          icon: <CodeOutlined />,
          onClick: () => {
            const event = new CustomEvent('export-database', {
              detail: { database, format: 'json', connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'export-sql',
          label: '导出为 SQL',
          icon: <DatabaseOutlined />,
          onClick: () => {
            const event = new CustomEvent('export-database', {
              detail: { database, format: 'sql', connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
      ],
    },
    {
      key: 'import',
      label: '导入数据',
      icon: <ImportOutlined />,
      onClick: () => {
        const event = new CustomEvent('import-to-database', {
          detail: { database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    { key: 'divider2', label: '', divider: true },
    {
      key: 'create-table',
      label: '创建表',
      icon: <TableOutlined />,
      shortcut: 'Ctrl+T',
      onClick: () => {
        const event = new CustomEvent('create-table', {
          detail: { database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'backup',
      label: '备份数据库',
      icon: <DownloadOutlined />,
      onClick: () => {
        const event = new CustomEvent('backup-database', {
          detail: { database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    { key: 'divider3', label: '', divider: true },
    {
      key: 'properties',
      label: '属性',
      icon: <InfoCircleOutlined />,
      onClick: () => {
        const event = new CustomEvent('show-database-properties', {
          detail: { database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'drop',
      label: '删除数据库',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除数据库 "${database.name}" 吗？此操作不可恢复。`,
          okText: '删除',
          cancelText: '取消',
          okType: 'danger',
          onOk: () => {
            const event = new CustomEvent('drop-database', {
              detail: { database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        });
      },
    },
  ];

  return items;
};

export const useTableContextMenu = (table: any, database: any) => {
  const { activeConnectionId } = useConnectionStore();

  const items: ContextMenuItem[] = [
    {
      key: 'select',
      label: '查看数据',
      icon: <EyeOutlined />,
      shortcut: 'Ctrl+D',
      onClick: () => {
        const event = new CustomEvent('view-table-data', {
          detail: { table, database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'edit',
      label: '编辑数据',
      icon: <EditOutlined />,
      onClick: () => {
        const event = new CustomEvent('edit-table-data', {
          detail: { table, database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    { key: 'divider1', label: '', divider: true },
    {
      key: 'structure',
      label: '表结构',
      icon: <TableOutlined />,
      children: [
        {
          key: 'view-structure',
          label: '查看结构',
          icon: <InfoCircleOutlined />,
          onClick: () => {
            const event = new CustomEvent('view-table-structure', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'modify-structure',
          label: '修改结构',
          icon: <SettingOutlined />,
          onClick: () => {
            const event = new CustomEvent('modify-table-structure', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'add-column',
          label: '添加列',
          icon: <ColumnOutlined />,
          onClick: () => {
            const event = new CustomEvent('add-table-column', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
      ],
    },
    {
      key: 'data-operations',
      label: '数据操作',
      icon: <AppstoreOutlined />,
      children: [
        {
          key: 'insert',
          label: '插入数据',
          icon: <UploadOutlined />,
          onClick: () => {
            const event = new CustomEvent('insert-table-data', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'truncate',
          label: '清空数据',
          icon: <CloseOutlined />,
          danger: true,
          onClick: () => {
            Modal.confirm({
              title: '确认清空',
              content: `确定要清空表 "${table.name}" 的所有数据吗？此操作不可恢复。`,
              okText: '清空',
              cancelText: '取消',
              okType: 'danger',
              onOk: () => {
                const event = new CustomEvent('truncate-table', {
                  detail: { table, database, connectionId: activeConnectionId }
                });
                document.dispatchEvent(event);
              },
            });
          },
        },
      ],
    },
    { key: 'divider2', label: '', divider: true },
    {
      key: 'export',
      label: '导出',
      icon: <ExportOutlined />,
      children: [
        {
          key: 'export-csv',
          label: '导出为 CSV',
          icon: <FileTextOutlined />,
          onClick: () => {
            const event = new CustomEvent('export-table', {
              detail: { table, database, format: 'csv', connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'export-json',
          label: '导出为 JSON',
          icon: <CodeOutlined />,
          onClick: () => {
            const event = new CustomEvent('export-table', {
              detail: { table, database, format: 'json', connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'export-sql',
          label: '导出为 SQL',
          icon: <DatabaseOutlined />,
          onClick: () => {
            const event = new CustomEvent('export-table', {
              detail: { table, database, format: 'sql', connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
      ],
    },
    {
      key: 'import',
      label: '导入',
      icon: <ImportOutlined />,
      onClick: () => {
        const event = new CustomEvent('import-to-table', {
          detail: { table, database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    { key: 'divider3', label: '', divider: true },
    {
      key: 'analyze',
      label: '分析',
      icon: <LineChartOutlined />,
      children: [
        {
          key: 'table-stats',
          label: '表统计',
          icon: <UnorderedListOutlined />,
          onClick: () => {
            const event = new CustomEvent('analyze-table-stats', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
        {
          key: 'data-profile',
          label: '数据概览',
          icon: <BugOutlined />,
          onClick: () => {
            const event = new CustomEvent('profile-table-data', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
      ],
    },
    {
      key: 'copy',
      label: '复制',
      icon: <CopyOutlined />,
      children: [
        {
          key: 'copy-name',
          label: '复制表名',
          onClick: () => {
            navigator.clipboard.writeText(table.name);
            showMessage.success('表名已复制到剪贴板');
          },
        },
        {
          key: 'copy-select',
          label: '复制 SELECT 语句',
          onClick: () => {
            const sql = `SELECT * FROM ${table.name};`;
            navigator.clipboard.writeText(sql);
            showMessage.success('SELECT 语句已复制到剪贴板');
          },
        },
        {
          key: 'copy-create',
          label: '复制 CREATE 语句',
          onClick: () => {
            const event = new CustomEvent('copy-table-create-statement', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        },
      ],
    },
    { key: 'divider4', label: '', divider: true },
    {
      key: 'rename',
      label: '重命名',
      icon: <EditOutlined />,
      shortcut: 'F2',
      onClick: () => {
        const event = new CustomEvent('rename-table', {
          detail: { table, database, connectionId: activeConnectionId }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'drop',
      label: '删除表',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除表 "${table.name}" 吗？此操作不可恢复。`,
          okText: '删除',
          cancelText: '取消',
          okType: 'danger',
          onOk: () => {
            const event = new CustomEvent('drop-table', {
              detail: { table, database, connectionId: activeConnectionId }
            });
            document.dispatchEvent(event);
          },
        });
      },
    },
  ];

  return items;
};

export const useConnectionContextMenu = (connection: any) => {
  const items: ContextMenuItem[] = [
    {
      key: 'connect',
      label: '连接',
      icon: <PlayCircleOutlined />,
      onClick: () => {
        const event = new CustomEvent('connect-to-connection', {
          detail: { connection }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'disconnect',
      label: '断开连接',
      icon: <CloseOutlined />,
      onClick: () => {
        const event = new CustomEvent('disconnect-from-connection', {
          detail: { connection }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'test',
      label: '测试连接',
      icon: <BugOutlined />,
      shortcut: 'Ctrl+T',
      onClick: () => {
        const event = new CustomEvent('test-connection', {
          detail: { connection }
        });
        document.dispatchEvent(event);
      },
    },
    { key: 'divider1', label: '', divider: true },
    {
      key: 'edit',
      label: '编辑连接',
      icon: <EditOutlined />,
      onClick: () => {
        const event = new CustomEvent('edit-connection', {
          detail: { connection }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'duplicate',
      label: '复制连接',
      icon: <CopyOutlined />,
      onClick: () => {
        const event = new CustomEvent('duplicate-connection', {
          detail: { connection }
        });
        document.dispatchEvent(event);
      },
    },
    { key: 'divider2', label: '', divider: true },
    {
      key: 'properties',
      label: '连接属性',
      icon: <InfoCircleOutlined />,
      onClick: () => {
        const event = new CustomEvent('show-connection-properties', {
          detail: { connection }
        });
        document.dispatchEvent(event);
      },
    },
    {
      key: 'delete',
      label: '删除连接',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除连接 "${connection.name}" 吗？`,
          okText: '删除',
          cancelText: '取消',
          okType: 'danger',
          onOk: () => {
            const event = new CustomEvent('delete-connection', {
              detail: { connection }
            });
            document.dispatchEvent(event);
          },
        });
      },
    },
  ];

  return items;
};

export default AdvancedContextMenu;