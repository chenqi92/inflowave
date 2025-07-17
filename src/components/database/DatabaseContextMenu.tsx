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
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { dialog } from '@/utils/dialog';

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
            await dialog.info({
              title: `创建 Measurement - ${databaseName}`,
              content: (
                <div className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>
                    创建 Measurement 模板：
                  </p>
                  <pre className='bg-muted/50 p-4 rounded-md max-h-96 overflow-auto whitespace-pre-wrap text-xs font-mono border'>
                    {template}
                  </pre>
                </div>
              ),
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
            await dialog.info({
              title: `数据库信息 - ${databaseName}`,
              content: (
                <div className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>
                    数据库详细信息：
                  </p>
                  <pre className='bg-muted/50 p-4 rounded-md max-h-96 overflow-auto text-xs font-mono border'>
                    {JSON.stringify(info, null, 2)}
                  </pre>
                </div>
              ),
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onContextMenu={(e) => e.preventDefault()}>
        <div onContextMenu={(e) => e.preventDefault()}>
          {children}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuLabel>结构操作</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('create_measurement')}>
          <Plus className='w-4 h-4 mr-2' />
          创建 Measurement
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('refresh_database')}>
          <RefreshCw className='w-4 h-4 mr-2' />
          刷新数据库
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('database_info')}>
          <Info className='w-4 h-4 mr-2' />
          数据库信息
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>查询操作</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('show_measurements')}>
          <Table className='w-4 h-4 mr-2' />
          显示 Measurements
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>复制操作</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('copy_name')}>
          <Copy className='w-4 h-4 mr-2' />
          复制数据库名
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('copy_use_statement')}>
          <FileText className='w-4 h-4 mr-2' />
          复制 USE 语句
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>导入导出</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('export_database')}>
          <FileDown className='w-4 h-4 mr-2' />
          导出数据库
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>危险操作</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleMenuClick('drop_database')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className='w-4 h-4 mr-2' />
          删除数据库
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DatabaseContextMenu;
