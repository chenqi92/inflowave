import React from 'react';
import { Dropdown } from '@/components/ui';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import type { MenuProps } from '@/components/ui';
import {
  Plus,
  RefreshCw,
  Info,
  Trash2,
  Copy,
  Table,
  FileDown,
  FileText,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { Modal } from '@/utils/modalAdapter';

interface DatabaseContextMenuProps {
  children: React.ReactNode;
  databaseName: string;
  onAction?: (action: string, databaseName: string) => void;
}

const DatabaseContextMenu: React.FC<DatabaseContextMenuProps> = ({
  children,
  databaseName,
  onAction,
}) => {
  const { activeConnectionId } = useConnectionStore();

  // 处理菜单点击
  const handleMenuClick = async (action: string) => {
    if (!activeConnectionId) {
      showMessage.error('请先建立数据库连接');
      return;
    }

    try {
      switch (action) {
        case 'create_measurement':
          // 创建新的 measurement (InfluxDB 中的表)
          try {
            const template = await safeTauriInvoke(
              'create_measurement_template',
              {
                connectionId: activeConnectionId,
                database: databaseName,
              }
            );

            // 显示创建模板
            Modal.info({
              title: `创建 Measurement - ${databaseName}`,
              width: 800,
              closable: true,
              keyboard: true,
              maskClosable: true,
              content: (
                <div>
                  <pre className='bg-muted p-4 rounded max-h-96 overflow-auto whitespace-pre-wrap'>
                    {template}
                  </pre>
                </div>
              ),
              onOk: () => {
                // 确保能正常关闭
              },
            });
            showMessage.success(
              `已生成数据库 ${databaseName} 的 measurement 创建模板`
            );
          } catch (error) {
            showMessage.error(`生成创建模板失败: ${error}`);
          }
          break;

        case 'refresh_database':
          // 刷新数据库结构
          try {
            await safeTauriInvoke('refresh_database_structure', {
              connectionId: activeConnectionId,
              database: databaseName,
            });
            showMessage.success(`已刷新数据库 ${databaseName} 的结构`);
            onAction?.('refresh_database', databaseName);
          } catch (error) {
            showMessage.error(`刷新数据库结构失败: ${error}`);
          }
          break;

        case 'database_info':
          // 显示数据库信息
          try {
            const info = await safeTauriInvoke('get_database_info', {
              connectionId: activeConnectionId,
              database: databaseName,
            });

            // 显示数据库信息
            Modal.info({
              title: `数据库信息 - ${databaseName}`,
              width: 800,
              closable: true,
              keyboard: true,
              maskClosable: true,
              content: (
                <div>
                  <pre className='bg-muted p-4 rounded max-h-96 overflow-auto'>
                    {JSON.stringify(info, null, 2)}
                  </pre>
                </div>
              ),
              onOk: () => {
                // 确保能正常关闭
              },
            });
            showMessage.success(`已获取数据库 ${databaseName} 的详细信息`);
          } catch (error) {
            showMessage.error(`获取数据库信息失败: ${error}`);
          }
          break;

        case 'show_measurements':
          // 显示所有 measurements
          await safeTauriInvoke('show_measurements', {
            connectionId: activeConnectionId,
            database: databaseName,
          });
          showMessage.success(
            `正在显示数据库 ${databaseName} 的所有 measurements`
          );
          break;

        case 'copy_name':
          // 复制数据库名
          await writeToClipboard(databaseName, {
            successMessage: `已复制数据库名: ${databaseName}`,
          });
          break;

        case 'copy_use_statement': {
          // 复制 USE 语句
          const useStatement = `USE "${databaseName}";`;
          await writeToClipboard(useStatement, {
            successMessage: '已复制 USE 语句到剪贴板',
          });
          break;
        }

        case 'export_database':
          // 导出整个数据库
          await safeTauriInvoke('export_database', {
            connectionId: activeConnectionId,
            database: databaseName,
          });
          showMessage.success(`正在导出数据库 ${databaseName}`);
          break;

        case 'drop_database': {
          // 删除数据库 - 需要确认
          const confirmed = window.confirm(
            `确定要删除数据库 "${databaseName}" 吗？此操作将删除所有数据且不可撤销！`
          );
          if (confirmed) {
            await safeTauriInvoke('drop_database', {
              connectionId: activeConnectionId,
              database: databaseName,
            });
            showMessage.success(`数据库 ${databaseName} 已删除`);
          }
          break;
        }

        default:
          console.warn('未处理的菜单动作:', action);
          break;
      }

      // 通知父组件
      if (onAction) {
        onAction(action, databaseName);
      }
    } catch (error) {
      console.error('执行菜单动作失败:', error);
      showMessage.error(`操作失败: ${error}`);
    }
  };

  // 菜单项配置
  const menuItems: MenuProps['items'] = [
    {
      key: 'structure_group',
      label: '结构操作',
      type: 'group',
    },
    {
      key: 'create_measurement',
      icon: <Plus className='w-4 h-4' />,
      label: '创建 Measurement',
      onClick: () => handleMenuClick('create_measurement'),
    },
    {
      key: 'refresh_database',
      icon: <RefreshCw className='w-4 h-4' />,
      label: '刷新数据库',
      onClick: () => handleMenuClick('refresh_database'),
    },
    {
      key: 'database_info',
      icon: <Info className='w-4 h-4' />,
      label: '数据库信息',
      onClick: () => handleMenuClick('database_info'),
    },
    {
      type: 'divider',
      key: '',
      label: undefined
    },
    {
      key: 'query_group',
      label: '查询操作',
      type: 'group',
    },
    {
      key: 'show_measurements',
      icon: <Table className='w-4 h-4' />,
      label: '显示 Measurements',
      onClick: () => handleMenuClick('show_measurements'),
    },
    {
      type: 'divider',
      key: '',
      label: undefined
    },
    {
      key: 'copy_group',
      label: '复制操作',
      type: 'group',
    },
    {
      key: 'copy_name',
      icon: <Copy className='w-4 h-4' />,
      label: '复制数据库名',
      onClick: () => handleMenuClick('copy_name'),
    },
    {
      key: 'copy_use_statement',
      icon: <FileText className='w-4 h-4' />,
      label: '复制 USE 语句',
      onClick: () => handleMenuClick('copy_use_statement'),
    },
    {
      type: 'divider',
      key: '',
      label: undefined
    },
    {
      key: 'import_export_group',
      label: '导入导出',
      type: 'group',
    },
    {
      key: 'export_database',
      icon: <FileDown className='w-4 h-4' />,
      label: '导出数据库',
      onClick: () => handleMenuClick('export_database'),
    },
    {
      type: 'divider',
      key: '',
      label: undefined
    },
    {
      key: 'danger_group',
      label: '危险操作',
      type: 'group',
    },
    {
      key: 'drop_database',
      icon: <Trash2 className='w-4 h-4' />,
      label: '删除数据库',
      onClick: () => handleMenuClick('drop_database'),
      danger: true,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['contextMenu']}
      placement='bottomLeft'
    >
      {children}
    </Dropdown>
  );
};

export default DatabaseContextMenu;
