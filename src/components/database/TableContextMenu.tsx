import React from 'react';
import { Dropdown, Menu, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  TableOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';

interface TableContextMenuProps {
  children: React.ReactNode;
  tableName: string;
  databaseName: string;
  onAction?: (action: string, tableName: string) => void;
}

const TableContextMenu: React.FC<TableContextMenuProps> = ({
  children,
  tableName,
  databaseName,
  onAction,
}) => {
  const { activeConnectionId } = useConnectionStore();

  // 处理菜单点击
  const handleMenuClick = async (action: string) => {
    if (!activeConnectionId) {
      message.error('请先建立数据库连接');
      return;
    }

    try {
      switch (action) {
        case 'view_data':
          // 查看表数据 - 生成并执行 SELECT 查询
          await safeTauriInvoke('execute_table_query', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
            queryType: 'SELECT',
            limit: 1000,
          });
          message.success(`正在查看表 ${tableName} 的数据`);
          break;

        case 'view_structure':
          // 查看表结构
          await safeTauriInvoke('get_table_structure', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`正在查看表 ${tableName} 的结构`);
          break;

        case 'insert_data':
          // 插入数据 - 生成 INSERT 模板
          await safeTauriInvoke('generate_insert_template', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`已生成表 ${tableName} 的插入模板`);
          break;

        case 'update_data':
          // 更新数据 - 生成 UPDATE 模板
          await safeTauriInvoke('generate_update_template', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`已生成表 ${tableName} 的更新模板`);
          break;

        case 'delete_data':
          // 删除数据 - 生成 DELETE 模板
          await safeTauriInvoke('generate_delete_template', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`已生成表 ${tableName} 的删除模板`);
          break;

        case 'copy_name':
          // 复制表名
          await navigator.clipboard.writeText(tableName);
          message.success(`已复制表名: ${tableName}`);
          break;

        case 'copy_select':
          // 复制 SELECT 语句
          const selectQuery = `SELECT * FROM "${tableName}" LIMIT 100;`;
          await navigator.clipboard.writeText(selectQuery);
          message.success('已复制 SELECT 语句到剪贴板');
          break;

        case 'export_data':
          // 导出表数据
          await safeTauriInvoke('export_table_data', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`正在导出表 ${tableName} 的数据`);
          break;

        case 'import_data':
          // 导入数据到表
          await safeTauriInvoke('import_table_data', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`正在导入数据到表 ${tableName}`);
          break;

        case 'refresh_table':
          // 刷新表信息
          await safeTauriInvoke('refresh_table_info', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`已刷新表 ${tableName} 的信息`);
          break;

        case 'table_info':
          // 显示表详细信息
          await safeTauriInvoke('get_table_info', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`正在获取表 ${tableName} 的详细信息`);
          break;

        case 'visualize_data':
          // 数据可视化
          await safeTauriInvoke('create_table_visualization', {
            connectionId: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          message.success(`正在为表 ${tableName} 创建数据可视化`);
          break;

        case 'drop_table':
          // 删除表 - 需要确认
          const confirmed = window.confirm(`确定要删除表 "${tableName}" 吗？此操作不可撤销！`);
          if (confirmed) {
            await safeTauriInvoke('drop_table', {
              connectionId: activeConnectionId,
              database: databaseName,
              table: tableName,
            });
            message.success(`表 ${tableName} 已删除`);
          }
          break;

        default:
          console.log('未处理的菜单动作:', action);
          break;
      }

      // 通知父组件
      if (onAction) {
        onAction(action, tableName);
      }
    } catch (error) {
      console.error('执行菜单动作失败:', error);
      message.error(`操作失败: ${error}`);
    }
  };

  // 菜单项配置
  const menuItems: MenuProps['items'] = [
    {
      key: 'query_group',
      label: '查询操作',
      type: 'group',
    },
    {
      key: 'view_data',
      icon: <EyeOutlined />,
      label: '查看数据',
      onClick: () => handleMenuClick('view_data'),
    },
    {
      key: 'view_structure',
      icon: <TableOutlined />,
      label: '查看结构',
      onClick: () => handleMenuClick('view_structure'),
    },
    {
      key: 'table_info',
      icon: <InfoCircleOutlined />,
      label: '表信息',
      onClick: () => handleMenuClick('table_info'),
    },
    {
      type: 'divider',
    },
    {
      key: 'data_group',
      label: '数据操作',
      type: 'group',
    },
    {
      key: 'insert_data',
      icon: <EditOutlined />,
      label: '插入数据',
      onClick: () => handleMenuClick('insert_data'),
    },
    {
      key: 'update_data',
      icon: <EditOutlined />,
      label: '更新数据',
      onClick: () => handleMenuClick('update_data'),
    },
    {
      key: 'delete_data',
      icon: <DeleteOutlined />,
      label: '删除数据',
      onClick: () => handleMenuClick('delete_data'),
    },
    {
      type: 'divider',
    },
    {
      key: 'copy_group',
      label: '复制操作',
      type: 'group',
    },
    {
      key: 'copy_name',
      icon: <CopyOutlined />,
      label: '复制表名',
      onClick: () => handleMenuClick('copy_name'),
    },
    {
      key: 'copy_select',
      icon: <FileTextOutlined />,
      label: '复制 SELECT 语句',
      onClick: () => handleMenuClick('copy_select'),
    },
    {
      type: 'divider',
    },
    {
      key: 'import_export_group',
      label: '导入导出',
      type: 'group',
    },
    {
      key: 'export_data',
      icon: <ExportOutlined />,
      label: '导出数据',
      onClick: () => handleMenuClick('export_data'),
    },
    {
      key: 'import_data',
      icon: <ImportOutlined />,
      label: '导入数据',
      onClick: () => handleMenuClick('import_data'),
    },
    {
      type: 'divider',
    },
    {
      key: 'other_group',
      label: '其他操作',
      type: 'group',
    },
    {
      key: 'visualize_data',
      icon: <BarChartOutlined />,
      label: '数据可视化',
      onClick: () => handleMenuClick('visualize_data'),
    },
    {
      key: 'refresh_table',
      icon: <ReloadOutlined />,
      label: '刷新表',
      onClick: () => handleMenuClick('refresh_table'),
    },
    {
      type: 'divider',
    },
    {
      key: 'danger_group',
      label: '危险操作',
      type: 'group',
    },
    {
      key: 'drop_table',
      icon: <DeleteOutlined />,
      label: '删除表',
      onClick: () => handleMenuClick('drop_table'),
      danger: true,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['contextMenu']}
      placement="bottomLeft"
    >
      {children}
    </Dropdown>
  );
};

export default TableContextMenu;
