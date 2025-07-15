import React from 'react';
import { Button, Dropdown } from '@/components/ui';
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import type { MenuProps } from '@/components/ui';
import { Table, Eye, Edit, Trash2, Copy, RefreshCw, Info, BarChart, FileDown, FileUp, FileText } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { Modal } from '@/utils/modalAdapter';

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
  onAction}) => {
  const { activeConnectionId } = useConnectionStore();

  // 处理菜单点击
  const handleMenuClick = async (action: string) => {
    if (!activeConnectionId) {
      toast({ title: "错误", description: "请先建立数据库连接", variant: "destructive" });
      return;
    }

    try {
      switch (action) {
        case 'view_data':
          // 查看表数据 - 生成并执行 SELECT 查询
          await safeTauriInvoke('execute_table_query', { connection_id: activeConnectionId,
            database: databaseName,
            table: tableName,
            queryType: 'SELECT',
            limit: 1000});
          toast({ title: "成功", description: "正在查看表 ${tableName} 的数据" });
          break;

        case 'view_structure':
          // 查看表结构
          try {
            const structure = await safeTauriInvoke('get_table_structure', { connection_id: activeConnectionId,
              database: databaseName,
              table: tableName});

            // 显示结构信息
            Modal.info({
              title: `表结构 - ${tableName}`,
              width: 800,
              closable: true,
              keyboard: true,
              maskClosable: true,
              content: (
                <div>
                  <pre className="bg-muted p-4 rounded max-h-96 overflow-auto">
                    {JSON.stringify(structure, null, 2)}
                  </pre>
                </div>
              ),
              onOk: () => {
                // 确保能正常关闭
              }});
            toast({ title: "成功", description: "已获取表 ${tableName} 的结构信息" });
          } catch (error) {
            toast({ title: "错误", description: "获取表结构失败: ${error}", variant: "destructive" });
          }
          break;

        case 'insert_data':
          // 插入数据 - 生成 INSERT 模板
          try {
            const template = await safeTauriInvoke('generate_insert_template', { connection_id: activeConnectionId,
              database: databaseName,
              table: tableName});

            // 显示插入模板
            Modal.info({
              title: `插入数据模板 - ${tableName}`,
              width: 800,
              closable: true,
              keyboard: true,
              maskClosable: true,
              content: (
                <div>
                  <pre className="bg-muted p-4 rounded max-h-96 overflow-auto whitespace-pre-wrap">
                    {template}
                  </pre>
                </div>
              ),
              onOk: () => {
                // 确保能正常关闭
              }});
            toast({ title: "成功", description: "已生成表 ${tableName} 的插入模板" });
          } catch (error) {
            toast({ title: "错误", description: "生成插入模板失败: ${error}", variant: "destructive" });
          }
          break;

        case 'update_data':
          // 更新数据 - 生成 UPDATE 模板
          await safeTauriInvoke('generate_update_template', { connection_id: activeConnectionId,
            database: databaseName,
            table: tableName});
          toast({ title: "成功", description: "已生成表 ${tableName} 的更新模板" });
          break;

        case 'delete_data':
          // 删除数据 - 生成 DELETE 模板
          await safeTauriInvoke('generate_delete_template', { connection_id: activeConnectionId,
            database: databaseName,
            table: tableName});
          toast({ title: "成功", description: "已生成表 ${tableName} 的删除模板" });
          break;

        case 'copy_name':
          // 复制表名
          await navigator.clipboard.writeText(tableName);
          toast({ title: "成功", description: "已复制表名: ${tableName}" });
          break;

        case 'copy_select': {
          // 复制 SELECT 语句
          const selectQuery = `SELECT * FROM "${tableName}" LIMIT 100;`;
          await navigator.clipboard.writeText(selectQuery);
          toast({ title: "成功", description: "已复制 SELECT 语句到剪贴板" });
          break;
        }

        case 'export_data':
          // 导出表数据
          try {
            // 显示导出选项对话框
            Modal.confirm({
              title: `导出表数据 - ${tableName}`,
              okText: '确认',
              cancelText: '取消',
              closable: true,
              keyboard: true,
              maskClosable: true,
              content: (
                <div>
                  <p>选择导出格式和选项：</p>
                  <div className="mt-4">
                    <Button
                      onClick={async () => {
                        try {
                          // 使用默认文件路径，避免动态导入问题
                          const filePath = `${tableName}_${Date.now()}.csv`;
                          const result = await safeTauriInvoke('export_table_data', { connection_id: activeConnectionId,
                            database: databaseName,
                            table: tableName,
                            format: 'csv',
                            limit: 10000,
                            filePath});
                          toast.success(result);
                        } catch (error) {
                          toast({ title: "错误", description: "导出CSV失败: ${error}", variant: "destructive" });
                        }
                      }}
                      className="mr-2"
                    >
                      导出为 CSV
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          // 使用默认文件路径，避免动态导入问题
                          const filePath = `${tableName}_${Date.now()}.json`;
                          const result = await safeTauriInvoke('export_table_data', { connection_id: activeConnectionId,
                            database: databaseName,
                            table: tableName,
                            format: 'json',
                            limit: 10000,
                            filePath});
                          toast.success(result);
                        } catch (error) {
                          toast({ title: "错误", description: "导出JSON失败: ${error}", variant: "destructive" });
                        }
                      }}
                    >
                      导出为 JSON
                    </Button>
                  </div>
                </div>
              ),
              onOk() {
                // 对话框确认后的操作
              },
              onCancel() {
                // 明确处理取消操作
              }});
          } catch (error) {
            toast({ title: "错误", description: "导出数据失败: ${error}", variant: "destructive" });
          }
          break;

        case 'import_data':
          // 导入数据到表
          await safeTauriInvoke('import_table_data', { connection_id: activeConnectionId,
            database: databaseName,
            table: tableName});
          toast({ title: "成功", description: "正在导入数据到表 ${tableName}" });
          break;

        case 'refresh_table':
          // 刷新表信息
          await safeTauriInvoke('refresh_table_info', { connection_id: activeConnectionId,
            database: databaseName,
            table: tableName});
          toast({ title: "成功", description: "已刷新表 ${tableName} 的信息" });
          break;

        case 'table_info':
          // 显示表详细信息
          await safeTauriInvoke('get_table_info', { connection_id: activeConnectionId,
            database: databaseName,
            table: tableName});
          toast({ title: "成功", description: "正在获取表 ${tableName} 的详细信息" });
          break;

        case 'visualize_data':
          // 数据可视化
          await safeTauriInvoke('create_table_visualization', { connection_id: activeConnectionId,
            database: databaseName,
            table: tableName});
          toast({ title: "成功", description: "正在为表 ${tableName} 创建数据可视化" });
          break;

        case 'drop_table': {
          // 删除表 - 需要确认
          const confirmed = window.confirm(`确定要删除表 "${tableName}" 吗？此操作不可撤销！`);
          if (confirmed) {
            await safeTauriInvoke('drop_table', { connection_id: activeConnectionId,
              database: databaseName,
              table: tableName});
            toast({ title: "成功", description: "表 ${tableName} 已删除" });
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
      toast({ title: "错误", description: "操作失败: ${error}", variant: "destructive" });
    }
  };

  // 菜单项配置
  const menuItems: MenuProps['items'] = [
    {
      key: 'query_group',
      label: '查询操作',
      type: 'group'},
    {
      key: 'view_data',
      icon: <Eye className="w-4 h-4"  />,
      label: '查看数据',
      onClick: () => handleMenuClick('view_data')},
    {
      key: 'view_structure',
      icon: <Table className="w-4 h-4"  />,
      label: '查看结构',
      onClick: () => handleMenuClick('view_structure')},
    {
      key: 'table_info',
      icon: <Info className="w-4 h-4"  />,
      label: '表信息',
      onClick: () => handleMenuClick('table_info')},
    {
      type: 'divider'},
    {
      key: 'data_group',
      label: '数据操作',
      type: 'group'},
    {
      key: 'insert_data',
      icon: <Edit className="w-4 h-4"  />,
      label: '插入数据',
      onClick: () => handleMenuClick('insert_data')},
    {
      key: 'update_data',
      icon: <Edit className="w-4 h-4"  />,
      label: '更新数据',
      onClick: () => handleMenuClick('update_data')},
    {
      key: 'delete_data',
      icon: <Trash2 className="w-4 h-4"  />,
      label: '删除数据',
      onClick: () => handleMenuClick('delete_data')},
    {
      type: 'divider'},
    {
      key: 'copy_group',
      label: '复制操作',
      type: 'group'},
    {
      key: 'copy_name',
      icon: <Copy className="w-4 h-4"  />,
      label: '复制表名',
      onClick: () => handleMenuClick('copy_name')},
    {
      key: 'copy_select',
      icon: <FileText className="w-4 h-4"  />,
      label: '复制 SELECT 语句',
      onClick: () => handleMenuClick('copy_select')},
    {
      type: 'divider'},
    {
      key: 'import_export_group',
      label: '导入导出',
      type: 'group'},
    {
      key: 'export_data',
      icon: <FileDown className="w-4 h-4"  />,
      label: '导出数据',
      onClick: () => handleMenuClick('export_data')},
    {
      key: 'import_data',
      icon: <FileUp className="w-4 h-4"  />,
      label: '导入数据',
      onClick: () => handleMenuClick('import_data')},
    {
      type: 'divider'},
    {
      key: 'other_group',
      label: '其他操作',
      type: 'group'},
    {
      key: 'visualize_data',
      icon: <BarChart className="w-4 h-4"  />,
      label: '数据可视化',
      onClick: () => handleMenuClick('visualize_data')},
    {
      key: 'refresh_table',
      icon: <RefreshCw className="w-4 h-4"  />,
      label: '刷新表',
      onClick: () => handleMenuClick('refresh_table')},
    {
      type: 'divider'},
    {
      key: 'danger_group',
      label: '危险操作',
      type: 'group'},
    {
      key: 'drop_table',
      icon: <Trash2 className="w-4 h-4"  />,
      label: '删除表',
      onClick: () => handleMenuClick('drop_table'),
      danger: true},
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
