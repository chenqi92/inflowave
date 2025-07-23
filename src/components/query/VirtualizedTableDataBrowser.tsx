import React, { useState, useEffect, useCallback, useMemo, memo, startTransition } from 'react';
import { Virtuoso } from 'react-virtuoso';
import {
    Card,
    CardContent,
    CardHeader,
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Badge,
    Checkbox,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Spin } from '@/components/ui/Spin';
import {
    RefreshCw,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Database,
    Table as TableIcon,
    FileText,
    FileSpreadsheet,
    Code,
    Hash,
    ChevronDown,
    Copy,
    Check,
    Square,
    CheckSquare,
    MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';

// 数据行接口
interface DataRow {
    [key: string]: any;
    _id?: string | number;
}

// 虚拟化表格行组件
interface VirtualTableRowProps {
    row: DataRow;
    index: number;
    columnOrder: string[];
    selectedColumns: string[];
    isSelected: boolean;
    onRowSelect: (index: number) => void;
    onCopyRow: (index: number, format?: 'text' | 'json' | 'csv') => void;
    onCopyCell: (index: number, column: string) => void;
}

const VirtualTableRow: React.FC<VirtualTableRowProps> = memo(({
    row,
    index,
    columnOrder,
    selectedColumns,
    isSelected,
    onRowSelect,
    onCopyRow,
    onCopyCell,
}) => {
    const visibleColumns = useMemo(() =>
        ['_actions', '_select', ...columnOrder.filter(column => selectedColumns.includes(column))],
        [columnOrder, selectedColumns]
    );

    const handleRowClick = useCallback((event: React.MouseEvent) => {
        if ((event.target as HTMLElement).closest('.copy-button, .dropdown-trigger')) {
            return;
        }
        onRowSelect(index);
    }, [index, onRowSelect]);

    return (
        <div
            className={cn(
                "flex border-b transition-colors hover:bg-muted/50 cursor-pointer group relative min-h-[40px]",
                isSelected && "bg-blue-50 hover:bg-blue-100"
            )}
            onClick={handleRowClick}
            style={{ display: 'flex', alignItems: 'center' }}
        >
            {visibleColumns.map((column) => {
                if (column === '_actions') {
                    return (
                        <div key="_actions" className="px-2 py-2 w-12 flex-shrink-0 flex items-center justify-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 dropdown-trigger"
                                        onClick={(e) => e.stopPropagation()}
                                        title="行操作"
                                    >
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem onClick={() => onCopyRow(index, 'text')}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        复制为文本
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCopyRow(index, 'json')}>
                                        <Code className="w-4 h-4 mr-2" />
                                        复制为JSON
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCopyRow(index, 'csv')}>
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        复制为CSV
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                }

                if (column === '_select') {
                    return (
                        <div key="_select" className="px-3 py-2 w-12 flex-shrink-0 flex items-center justify-center">
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onRowSelect(index)}
                                className="h-4 w-4"
                            />
                        </div>
                    );
                }

                // 计算列的最小宽度
                const getColumnMinWidth = (col: string) => {
                    if (col === '#') return '60px';
                    if (col === 'time') return '180px';
                    const colLength = col.length;
                    return `${Math.max(120, colLength * 12)}px`;
                };

                const minWidth = getColumnMinWidth(column);

                return (
                    <div
                        key={column}
                        className={cn(
                            'px-3 py-2 text-xs flex items-center',
                            column === '#'
                                ? 'font-medium text-muted-foreground bg-muted/20 justify-center'
                                : 'font-mono'
                        )}
                        style={{ minWidth, flexShrink: 0 }}
                        onDoubleClick={() => onCopyCell(index, column)}
                        title={`双击复制: ${String(row[column] || '-')}`}
                    >
                        <div className="truncate w-full">
                            {column === '#'
                                ? row[column]
                                : column === 'time'
                                    ? new Date(row[column]).toLocaleString()
                                    : String(row[column] || '-')
                            }
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

// 虚拟化表格头部组件
interface VirtualTableHeaderProps {
    columnOrder: string[];
    selectedColumns: string[];
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    selectedRowsCount: number;
    totalRowsCount: number;
    onSort: (column: string) => void;
    onAddFilter: (column: string) => void;
    onSelectAll: () => void;
    onCopySelectedRows: (format: 'text' | 'json' | 'csv') => void;
}

const VirtualTableHeader: React.FC<VirtualTableHeaderProps> = memo(({
    columnOrder,
    selectedColumns,
    sortColumn,
    sortDirection,
    selectedRowsCount,
    totalRowsCount,
    onSort,
    onAddFilter,
    onSelectAll,
    onCopySelectedRows
}) => {
    const visibleColumns = useMemo(() =>
        ['_actions', '_select', ...columnOrder.filter(column => selectedColumns.includes(column))],
        [columnOrder, selectedColumns]
    );

    const isAllSelected = selectedRowsCount > 0 && selectedRowsCount === totalRowsCount;

    return (
        <div className="flex border-b bg-muted/30 z-10 min-h-[40px] flex-shrink-0">
            {visibleColumns.map((column) => {
                if (column === '_actions') {
                    return (
                        <div key="_actions" className="px-2 py-2 w-12 flex-shrink-0 flex items-center justify-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        title="批量操作"
                                    >
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {selectedRowsCount > 0 && (
                                        <>
                                            <DropdownMenuItem onClick={() => onCopySelectedRows('text')}>
                                                <FileText className="w-4 h-4 mr-2" />
                                                复制为文本 ({selectedRowsCount})
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onCopySelectedRows('json')}>
                                                <Code className="w-4 h-4 mr-2" />
                                                复制为JSON ({selectedRowsCount})
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onCopySelectedRows('csv')}>
                                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                                复制为CSV ({selectedRowsCount})
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuItem onClick={onSelectAll}>
                                        {selectedRowsCount === totalRowsCount ? (
                                            <>
                                                <Square className="w-4 h-4 mr-2" />
                                                取消全选
                                            </>
                                        ) : (
                                            <>
                                                <CheckSquare className="w-4 h-4 mr-2" />
                                                全选
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                }

                if (column === '_select') {
                    return (
                        <div key="_select" className="px-3 py-2 w-12 flex-shrink-0 flex items-center justify-center">
                            <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={onSelectAll}
                                className="h-4 w-4"
                                title={isAllSelected ? '取消全选' : '全选'}
                            />
                        </div>
                    );
                }

                // 计算列的最小宽度
                const getColumnMinWidth = (col: string) => {
                    if (col === '#') return '60px';
                    if (col === 'time') return '180px';
                    const colLength = col.length;
                    return `${Math.max(120, colLength * 12)}px`;
                };

                const minWidth = getColumnMinWidth(column);

                return (
                    <div
                        key={column}
                        className={cn(
                            'px-3 py-2 text-left text-xs font-medium text-muted-foreground flex items-center',
                            column === '#' ? 'justify-center' : 'cursor-pointer hover:bg-muted/50'
                        )}
                        style={{ minWidth, flexShrink: 0 }}
                        onClick={() => column !== '#' && onSort(column)}
                    >
                        <div className="flex items-center gap-1 w-full">
                            <span className="truncate text-xs" title={column === '#' ? '序号' : column}>
                                {column === '#' ? '序号' : column}
                            </span>
                            {column === 'time' && (
                                <Badge variant="secondary" className="text-xs">
                                    时间
                                </Badge>
                            )}
                            {column === '#' && (
                                <Badge variant="outline" className="text-xs">
                                    #
                                </Badge>
                            )}
                            {sortColumn === column && column !== '#' && (
                                <span className="text-xs text-primary">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                            )}
                            {column !== '#' && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 ml-1 opacity-60 hover:opacity-100"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Filter className="w-3 h-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => onAddFilter(column)}>
                                            添加过滤器
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

export { VirtualTableRow, VirtualTableHeader };
export type { DataRow, VirtualTableRowProps, VirtualTableHeaderProps };
