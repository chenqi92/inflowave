import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui';
import {showMessage} from '@/utils/message';
import {writeToClipboard} from '@/utils/clipboard';
import {
    Copy,
    BarChart,
    Edit,
    Eye,
    Table,
    FileText,
    Filter,
    ArrowUp,
    ArrowDown,
    FileDown,
    Download,
    SortAsc,
    SortDesc,
} from 'lucide-react';

interface QueryResultContextMenuProps {
    children: React.ReactNode;
    selectedData?: string | number | boolean | null;
    columnName?: string;
    rowData?: Record<string, unknown>;
    onAction?: (action: string, data?: Record<string, unknown>) => void;
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
                        await writeToClipboard(String(selectedData), {
                            successMessage: '已复制单元格内容',
                        });
                    }
                    break;

                case 'copy_row':
                    // 复制整行数据
                    if (rowData) {
                        const rowText = Object.values(rowData).join('\t');
                        await writeToClipboard(rowText, {successMessage: '已复制行数据'});
                    }
                    break;

                case 'copy_column':
                    // 复制列名
                    if (columnName) {
                        await writeToClipboard(columnName, {
                            successMessage: `已复制列名: ${columnName}`,
                        });
                    }
                    break;

                case 'copy_as_json':
                    // 复制为 JSON 格式
                    if (rowData) {
                        await writeToClipboard(JSON.stringify(rowData, null, 2), {
                            successMessage: '已复制为 JSON 格式',
                        });
                    }
                    break;

                case 'copy_as_csv':
                    // 复制为 CSV 格式
                    if (rowData) {
                        const csvText = Object.values(rowData).join(',');
                        await writeToClipboard(csvText, {
                            successMessage: '已复制为 CSV 格式',
                        });
                    }
                    break;

                case 'filter_by_value':
                    // 按值过滤
                    if (selectedData !== undefined && columnName) {
                        showMessage.success(`正在按 ${columnName} = ${selectedData} 过滤`);
                    }
                    break;

                case 'filter_not_equal':
                    // 按值排除
                    if (selectedData !== undefined && columnName) {
                        showMessage.success(`正在按 ${columnName} != ${selectedData} 过滤`);
                    }
                    break;

                case 'sort_asc':
                    // 升序排序
                    if (columnName) {
                        showMessage.success(`正在按 ${columnName} 升序排序`);
                    }
                    break;

                case 'sort_desc':
                    // 降序排序
                    if (columnName) {
                        showMessage.success(`正在按 ${columnName} 降序排序`);
                    }
                    break;

                case 'export_results':
                    // 导出查询结果
                    showMessage.success('正在导出查询结果');
                    break;

                case 'visualize_data':
                    // 数据可视化
                    showMessage.success('正在创建数据可视化');
                    break;

                case 'edit_query':
                    // 编辑查询
                    showMessage.success('正在编辑查询');
                    break;

                case 'view_details':
                    // 查看详细信息
                    if (rowData) {
                        showMessage.success('正在查看详细信息');
                    }
                    break;

                default:
                    console.warn('未处理的菜单动作:', action);
                    break;
            }

            // 通知父组件
            if (onAction) {
                onAction(action, {selectedData, columnName, rowData});
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
                <DropdownMenuLabel>复制操作</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_cell')}
                    disabled={selectedData === undefined}
                >
                    <Copy className='w-4 h-4 mr-2'/>
                    复制单元格
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_row')}
                    disabled={!rowData}
                >
                    <Copy className='w-4 h-4 mr-2'/>
                    复制整行
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_column')}
                    disabled={!columnName}
                >
                    <Copy className='w-4 h-4 mr-2'/>
                    复制列名
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>格式化复制</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_as_json')}
                    disabled={!rowData}
                >
                    <FileText className='w-4 h-4 mr-2'/>
                    复制为 JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_as_csv')}
                    disabled={!rowData}
                >
                    <Table className='w-4 h-4 mr-2'/>
                    复制为 CSV
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>过滤操作</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('filter_by_value')}
                    disabled={selectedData === undefined || !columnName}
                >
                    <Filter className='w-4 h-4 mr-2'/>
                    按此值过滤
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('filter_not_equal')}
                    disabled={selectedData === undefined || !columnName}
                >
                    <Filter className='w-4 h-4 mr-2'/>
                    排除此值
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>排序操作</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('sort_asc')}
                    disabled={!columnName}
                >
                    <ArrowUp className='w-4 h-4 mr-2'/>
                    升序排序
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('sort_desc')}
                    disabled={!columnName}
                >
                    <ArrowDown className='w-4 h-4 mr-2'/>
                    降序排序
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuLabel>其他操作</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('view_details')}
                    disabled={!rowData}
                >
                    <Eye className='w-4 h-4 mr-2'/>
                    查看详情
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('visualize_data')}>
                    <BarChart className='w-4 h-4 mr-2'/>
                    数据可视化
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('export_results')}>
                    <FileDown className='w-4 h-4 mr-2'/>
                    导出结果
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('edit_query')}>
                    <Edit className='w-4 h-4 mr-2'/>
                    编辑查询
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default QueryResultContextMenu;
