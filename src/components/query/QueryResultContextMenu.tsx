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
import {useMenuTranslation} from '@/hooks/useTranslation';
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
    const {t} = useMenuTranslation();

    // 处理菜单点击
    const handleMenuClick = async (action: string) => {
        try {
            switch (action) {
                case 'copy_cell':
                    // 复制单元格内容
                    if (selectedData !== undefined) {
                        await writeToClipboard(String(selectedData), {
                            successMessage: t('query_result_menu.copied_cell_content'),
                        });
                    }
                    break;

                case 'copy_row':
                    // 复制整行数据
                    if (rowData) {
                        const rowText = Object.values(rowData).join('\t');
                        await writeToClipboard(rowText, {
                            successMessage: t('query_result_menu.copied_row_data')
                        });
                    }
                    break;

                case 'copy_column':
                    // 复制列名
                    if (columnName) {
                        await writeToClipboard(columnName, {
                            successMessage: t('query_result_menu.copied_column_name', {name: columnName}),
                        });
                    }
                    break;

                case 'copy_as_json':
                    // 复制为 JSON 格式
                    if (rowData) {
                        await writeToClipboard(JSON.stringify(rowData, null, 2), {
                            successMessage: t('query_result_menu.copied_as_json'),
                        });
                    }
                    break;

                case 'copy_as_csv':
                    // 复制为 CSV 格式
                    if (rowData) {
                        const csvText = Object.values(rowData).join(',');
                        await writeToClipboard(csvText, {
                            successMessage: t('query_result_menu.copied_as_csv'),
                        });
                    }
                    break;

                case 'filter_by_value':
                    // 按值过滤
                    if (selectedData !== undefined && columnName) {
                        showMessage.success(t('query_result_menu.filtering_by_value', {
                            column: columnName,
                            value: selectedData
                        }));
                    }
                    break;

                case 'filter_not_equal':
                    // 按值排除
                    if (selectedData !== undefined && columnName) {
                        showMessage.success(t('query_result_menu.filtering_not_equal', {
                            column: columnName,
                            value: selectedData
                        }));
                    }
                    break;

                case 'sort_asc':
                    // 升序排序
                    if (columnName) {
                        showMessage.success(t('query_result_menu.sorting_asc', {column: columnName}));
                    }
                    break;

                case 'sort_desc':
                    // 降序排序
                    if (columnName) {
                        showMessage.success(t('query_result_menu.sorting_desc', {column: columnName}));
                    }
                    break;

                case 'export_results':
                    // 导出查询结果
                    showMessage.success(t('query_result_menu.exporting_results'));
                    break;

                case 'visualize_data':
                    // 数据可视化
                    showMessage.success(t('query_result_menu.creating_visualization'));
                    break;

                case 'edit_query':
                    // 编辑查询
                    showMessage.success(t('query_result_menu.editing_query'));
                    break;

                case 'view_details':
                    // 查看详细信息
                    if (rowData) {
                        showMessage.success(t('query_result_menu.viewing_details'));
                    }
                    break;

                default:
                    console.warn(t('query_result_menu.unhandled_action'), action);
                    break;
            }

            // 通知父组件
            if (onAction) {
                onAction(action, {selectedData, columnName, rowData});
            }
        } catch (error) {
            console.error(t('query_result_menu.action_failed'), error);
            showMessage.error(t('query_result_menu.operation_failed', {error: String(error)}));
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
                <DropdownMenuLabel>{t('query_result_menu.copy_actions')}</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_cell')}
                    disabled={selectedData === undefined}
                >
                    <Copy className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.copy_cell')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_row')}
                    disabled={!rowData}
                >
                    <Copy className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.copy_row')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_column')}
                    disabled={!columnName}
                >
                    <Copy className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.copy_column_name')}
                </DropdownMenuItem>

                <DropdownMenuSeparator/>

                <DropdownMenuLabel>{t('query_result_menu.format_copy')}</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_as_json')}
                    disabled={!rowData}
                >
                    <FileText className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.copy_as_json')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('copy_as_csv')}
                    disabled={!rowData}
                >
                    <Table className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.copy_as_csv')}
                </DropdownMenuItem>

                <DropdownMenuSeparator/>

                <DropdownMenuLabel>{t('query_result_menu.filter_actions')}</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('filter_by_value')}
                    disabled={selectedData === undefined || !columnName}
                >
                    <Filter className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.filter_by_this_value')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('filter_not_equal')}
                    disabled={selectedData === undefined || !columnName}
                >
                    <Filter className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.exclude_this_value')}
                </DropdownMenuItem>

                <DropdownMenuSeparator/>

                <DropdownMenuLabel>{t('query_result_menu.sort_actions')}</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('sort_asc')}
                    disabled={!columnName}
                >
                    <ArrowUp className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.sort_ascending')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('sort_desc')}
                    disabled={!columnName}
                >
                    <ArrowDown className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.sort_descending')}
                </DropdownMenuItem>

                <DropdownMenuSeparator/>

                <DropdownMenuLabel>{t('query_result_menu.other_actions')}</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => handleMenuClick('view_details')}
                    disabled={!rowData}
                >
                    <Eye className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.view_details')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('visualize_data')}>
                    <BarChart className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.visualize_data')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('export_results')}>
                    <FileDown className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.export_results')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('edit_query')}>
                    <Edit className='w-4 h-4 mr-2'/>
                    {t('query_result_menu.edit_query')}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default QueryResultContextMenu;
