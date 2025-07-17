import React from 'react';
import {
  Button,
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
  Table,
  Eye,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Info,
  BarChart,
  FileDown,
  FileUp,
  FileText,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { dialog } from '@/utils/dialog';

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
      showMessage.error('请先建立数据库连接');
      return;
    }

    try {
      switch (action) {
        case 'view_data':
          // 查看表数据 - 生成并执行 SELECT 查询
          await safeTauriInvoke('execute_table_query', {
            connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
            queryType: 'SELECT',
            limit: 1000,
          });
          showMessage.success(`正在查看表 ${tableName} 的数据`);
          break;

        case 'view_structure':
          // 查看表结构
          try {
            const structure = await safeTauriInvoke('get_table_structure', {
              connection_id: activeConnectionId,
              database: databaseName,
              table: tableName,
            });

            // 显示结构信息
            await dialog.info({
              title: `表结构 - ${tableName}`,
              content: (
                <div className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>
                    表结构详细信息：
                  </p>
                  <pre className='bg-muted/50 p-4 rounded-md max-h-96 overflow-auto text-xs font-mono border'>
                    {JSON.stringify(structure, null, 2)}
                  </pre>
                </div>
              ),
            });
            showMessage.success(`已获取表 ${tableName} 的结构信息`);
          } catch (error) {
            showMessage.error(`获取表结构失败: ${error}`);
          }
          break;

        case 'insert_data':
          // 插入数据 - 生成 INSERT 模板
          try {
            const template = await safeTauriInvoke('generate_insert_template', {
              connection_id: activeConnectionId,
              database: databaseName,
              table: tableName,
            });

            // 显示插入模板
            await dialog.info({
              title: `插入数据模板 - ${tableName}`,
              content: (
                <div className='space-y-2'>
                  <p className='text-sm text-muted-foreground'>
                    插入数据模板：
                  </p>
                  <pre className='bg-muted/50 p-4 rounded-md max-h-96 overflow-auto whitespace-pre-wrap text-xs font-mono border'>
                    {template}
                  </pre>
                </div>
              ),
            });
            showMessage.success(`已生成表 ${tableName} 的插入模板`);
          } catch (error) {
            showMessage.error(`生成插入模板失败: ${error}`);
          }
          break;

        case 'update_data':
          // 更新数据 - 生成 UPDATE 模板
          await safeTauriInvoke('generate_update_template', {
            connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          showMessage.success(`已生成表 ${tableName} 的更新模板`);
          break;

        case 'delete_data':
          // 删除数据 - 生成 DELETE 模板
          await safeTauriInvoke('generate_delete_template', {
            connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          showMessage.success(`已生成表 ${tableName} 的删除模板`);
          break;

        case 'copy_name':
          // 复制表名
          await writeToClipboard(tableName, {
            successMessage: `已复制表名: ${tableName}`,
          });
          break;

        case 'copy_select': {
          // 复制 SELECT 语句
          const selectQuery = `SELECT *
                                         FROM "${tableName}" LIMIT 100;`;
          await writeToClipboard(selectQuery, {
            successMessage: '已复制 SELECT 语句到剪贴板',
          });
          break;
        }

        case 'export_data':
          // 导出表数据
          try {
            // 显示导出选项对话框
            const confirmed = await dialog.confirm({
              title: `导出表数据 - ${tableName}`,
              confirmText: '确认',
              cancelText: '取消',
              content: (
                <div className='space-y-4'>
                  <p className='text-sm text-muted-foreground'>
                    选择导出格式和选项：
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      onClick={async () => {
                        try {
                          // 使用默认文件路径，避免动态导入问题
                          const filePath = `${tableName}_${Date.now()}.csv`;
                          const result = await safeTauriInvoke(
                            'export_table_data',
                            {
                              connection_id: activeConnectionId,
                              database: databaseName,
                              table: tableName,
                              format: 'csv',
                              limit: 10000,
                              filePath,
                            }
                          );
                          showMessage.success(result);
                        } catch (error) {
                          showMessage.error(`导出CSV失败: ${error}`);
                        }
                      }}
                    >
                      导出为 CSV
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={async () => {
                        try {
                          // 使用默认文件路径，避免动态导入问题
                          const filePath = `${tableName}_${Date.now()}.json`;
                          const result = await safeTauriInvoke(
                            'export_table_data',
                            {
                              connection_id: activeConnectionId,
                              database: databaseName,
                              table: tableName,
                              format: 'json',
                              limit: 10000,
                              filePath,
                            }
                          );
                          showMessage.success(result);
                        } catch (error) {
                          showMessage.error(`导出JSON失败: ${error}`);
                        }
                      }}
                    >
                      导出为 JSON
                    </Button>
                  </div>
                </div>
              ),
            });

            if (confirmed) {
              showMessage.info('请选择上方的导出格式按钮');
            }
          } catch (error) {
            showMessage.error(`导出数据失败: ${error}`);
          }
          break;

        case 'import_data':
          // 导入数据到表
          await safeTauriInvoke('import_table_data', {
            connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          showMessage.success(`正在导入数据到表 ${tableName}`);
          break;

        case 'refresh_table':
          // 刷新表信息
          await safeTauriInvoke('refresh_table_info', {
            connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          showMessage.success(`已刷新表 ${tableName} 的信息`);
          break;

        case 'table_info':
          // 显示表详细信息
          await safeTauriInvoke('get_table_info', {
            connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          showMessage.success(`正在获取表 ${tableName} 的详细信息`);
          break;

        case 'visualize_data':
          // 数据可视化
          await safeTauriInvoke('create_table_visualization', {
            connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
          });
          showMessage.success(`正在为表 ${tableName} 创建数据可视化`);
          break;

        case 'drop_table': {
          // 删除表 - 需要确认
          const confirmed = window.confirm(
            `确定要删除表 "${tableName}" 吗？此操作不可撤销！`
          );
          if (confirmed) {
            await safeTauriInvoke('drop_table', {
              connection_id: activeConnectionId,
              database: databaseName,
              table: tableName,
            });
            showMessage.success(`表 ${tableName} 已删除`);
          }
          break;
        }

        default:
          console.warn('未处理的菜单动作:', action);
          break;
      }

      // 通知父组件
      if (onAction) {
        onAction(action, tableName);
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
        <DropdownMenuLabel>查询操作</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('view_data')}>
          <Eye className='w-4 h-4 mr-2' />
          查看数据
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('view_structure')}>
          <Table className='w-4 h-4 mr-2' />
          查看结构
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('table_info')}>
          <Info className='w-4 h-4 mr-2' />
          表信息
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>数据操作</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('insert_data')}>
          <Edit className='w-4 h-4 mr-2' />
          插入数据
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('update_data')}>
          <Edit className='w-4 h-4 mr-2' />
          更新数据
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('delete_data')}>
          <Trash2 className='w-4 h-4 mr-2' />
          删除数据
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>复制操作</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('copy_name')}>
          <Copy className='w-4 h-4 mr-2' />
          复制表名
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('copy_select')}>
          <FileText className='w-4 h-4 mr-2' />
          复制 SELECT 语句
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>导入导出</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('export_data')}>
          <FileDown className='w-4 h-4 mr-2' />
          导出数据
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('import_data')}>
          <FileUp className='w-4 h-4 mr-2' />
          导入数据
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>其他操作</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleMenuClick('visualize_data')}>
          <BarChart className='w-4 h-4 mr-2' />
          数据可视化
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMenuClick('refresh_table')}>
          <RefreshCw className='w-4 h-4 mr-2' />
          刷新表
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>危险操作</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => handleMenuClick('drop_table')}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className='w-4 h-4 mr-2' />
          删除表
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TableContextMenu;
