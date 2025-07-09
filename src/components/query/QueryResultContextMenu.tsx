import React from 'react';
import { Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  CopyOutlined,
  ExportOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  BarChartOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  TableOutlined,
} from '@ant-design/icons';

interface QueryResultContextMenuProps {
  children: React.ReactNode;
  selectedData?: any;
  columnName?: string;
  rowData?: any;
  onAction?: (action: string, data?: any) => void;
}

const QueryResultContextMenu: React.FC<QueryResultContextMenuProps> = ({
  children,
  selectedData,
  columnName,
  rowData,
  onAction,
}) => {
  // 处理菜单点击
  const handleMenuClick = async (action: string) => {
    try {
      switch (action) {
        case 'copy_cell':
          // 复制单元格内容
          if (selectedData !== undefined) {
            await navigator.clipboard.writeText(String(selectedData));
            message.success('已复制单元格内容');
          }
          break;

        case 'copy_row':
          // 复制整行数据
          if (rowData) {
            const rowText = Object.values(rowData).join('\t');
            await navigator.clipboard.writeText(rowText);
            message.success('已复制行数据');
          }
          break;

        case 'copy_column':
          // 复制列名
          if (columnName) {
            await navigator.clipboard.writeText(columnName);
            message.success(`已复制列名: ${columnName}`);
          }
          break;

        case 'copy_as_json':
          // 复制为 JSON 格式
          if (rowData) {
            await navigator.clipboard.writeText(JSON.stringify(rowData, null, 2));
            message.success('已复制为 JSON 格式');
          }
          break;

        case 'copy_as_csv':
          // 复制为 CSV 格式
          if (rowData) {
            const csvText = Object.values(rowData).join(',');
            await navigator.clipboard.writeText(csvText);
            message.success('已复制为 CSV 格式');
          }
          break;

        case 'filter_by_value':
          // 按值过滤
          if (selectedData !== undefined && columnName) {
            message.success(`正在按 ${columnName} = ${selectedData} 过滤`);
          }
          break;

        case 'filter_not_equal':
          // 按值排除
          if (selectedData !== undefined && columnName) {
            message.success(`正在按 ${columnName} != ${selectedData} 过滤`);
          }
          break;

        case 'sort_asc':
          // 升序排序
          if (columnName) {
            message.success(`正在按 ${columnName} 升序排序`);
          }
          break;

        case 'sort_desc':
          // 降序排序
          if (columnName) {
            message.success(`正在按 ${columnName} 降序排序`);
          }
          break;

        case 'export_results':
          // 导出查询结果
          message.success('正在导出查询结果');
          break;

        case 'visualize_data':
          // 数据可视化
          message.success('正在创建数据可视化');
          break;

        case 'edit_query':
          // 编辑查询
          message.success('正在编辑查询');
          break;

        case 'view_details':
          // 查看详细信息
          if (rowData) {
            message.success('正在查看详细信息');
          }
          break;

        default:
          console.log('未处理的菜单动作:', action);
          break;
      }

      // 通知父组件
      if (onAction) {
        onAction(action, { selectedData, columnName, rowData });
      }
    } catch (error) {
      console.error('执行菜单动作失败:', error);
      message.error(`操作失败: ${error}`);
    }
  };

  // 菜单项配置
  const menuItems: MenuProps['items'] = [
    {
      key: 'copy_group',
      label: '复制操作',
      type: 'group',
    },
    {
      key: 'copy_cell',
      icon: <CopyOutlined />,
      label: '复制单元格',
      onClick: () => handleMenuClick('copy_cell'),
      disabled: selectedData === undefined,
    },
    {
      key: 'copy_row',
      icon: <CopyOutlined />,
      label: '复制整行',
      onClick: () => handleMenuClick('copy_row'),
      disabled: !rowData,
    },
    {
      key: 'copy_column',
      icon: <CopyOutlined />,
      label: '复制列名',
      onClick: () => handleMenuClick('copy_column'),
      disabled: !columnName,
    },
    {
      type: 'divider',
    },
    {
      key: 'format_group',
      label: '格式化复制',
      type: 'group',
    },
    {
      key: 'copy_as_json',
      icon: <FileTextOutlined />,
      label: '复制为 JSON',
      onClick: () => handleMenuClick('copy_as_json'),
      disabled: !rowData,
    },
    {
      key: 'copy_as_csv',
      icon: <TableOutlined />,
      label: '复制为 CSV',
      onClick: () => handleMenuClick('copy_as_csv'),
      disabled: !rowData,
    },
    {
      type: 'divider',
    },
    {
      key: 'filter_group',
      label: '过滤操作',
      type: 'group',
    },
    {
      key: 'filter_by_value',
      icon: <FilterOutlined />,
      label: '按此值过滤',
      onClick: () => handleMenuClick('filter_by_value'),
      disabled: selectedData === undefined || !columnName,
    },
    {
      key: 'filter_not_equal',
      icon: <FilterOutlined />,
      label: '排除此值',
      onClick: () => handleMenuClick('filter_not_equal'),
      disabled: selectedData === undefined || !columnName,
    },
    {
      type: 'divider',
    },
    {
      key: 'sort_group',
      label: '排序操作',
      type: 'group',
    },
    {
      key: 'sort_asc',
      icon: <SortAscendingOutlined />,
      label: '升序排序',
      onClick: () => handleMenuClick('sort_asc'),
      disabled: !columnName,
    },
    {
      key: 'sort_desc',
      icon: <SortDescendingOutlined />,
      label: '降序排序',
      onClick: () => handleMenuClick('sort_desc'),
      disabled: !columnName,
    },
    {
      type: 'divider',
    },
    {
      key: 'action_group',
      label: '其他操作',
      type: 'group',
    },
    {
      key: 'view_details',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => handleMenuClick('view_details'),
      disabled: !rowData,
    },
    {
      key: 'visualize_data',
      icon: <BarChartOutlined />,
      label: '数据可视化',
      onClick: () => handleMenuClick('visualize_data'),
    },
    {
      key: 'export_results',
      icon: <ExportOutlined />,
      label: '导出结果',
      onClick: () => handleMenuClick('export_results'),
    },
    {
      key: 'edit_query',
      icon: <EditOutlined />,
      label: '编辑查询',
      onClick: () => handleMenuClick('edit_query'),
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

export default QueryResultContextMenu;
