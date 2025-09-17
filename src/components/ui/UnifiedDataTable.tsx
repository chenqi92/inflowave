/**
 * 统一数据表格组件
 * 高性能版本 - 使用真正的虚拟化滚动优化大数据集性能
 * 支持虚拟化滚动、懒加载、列管理、排序、筛选、导出等功能
 */

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TableVirtuoso, TableVirtuosoHandle } from 'react-virtuoso';
import {
    Card,
    CardHeader,
    CardTitle,
    Button,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Checkbox,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Input,
    SearchInput,
} from '@/components/ui';
import { Spin } from '@/components/ui/Spin';
import {
    Filter,
    Download,
    Settings,
    ChevronUp,
    ChevronDown,
    Database,
    FileText,
    Code,
    FileSpreadsheet,
} from 'lucide-react';

// 虚拟化表格组件
interface CustomVirtualizedTableProps {
    data: any[];
    columns: string[];
    columnConfigMap: Map<string, any>;
    columnWidths: Map<string, number>;
    calculateColumnWidth: (column: string) => number;
    containerHeight: number;
    rowHeight: number;
    showRowNumbers: boolean;
    selectedRows: Set<number>;
    onRowClick: (index: number, e: React.MouseEvent) => void;
    sortConfig?: { column: string; direction: 'asc' | 'desc' } | null;
    onSort: (column: string) => void;
    sortable: boolean;
    hasNextPage?: boolean;
    onEndReached?: () => void;
    generateRowKey: (row: any, index: number) => string;
    virtuosoRef?: React.RefObject<TableVirtuosoHandle>;
}

interface VirtualizedTableContext {
    onRowClick: (index: number, event: React.MouseEvent) => void;
    selectedRows: Set<number>;
    rowHeight: number;
}

const VirtuosoTableRow = React.forwardRef<HTMLTableRowElement, any>(({ context, children, ...rowProps }, ref) => {
    const typedContext = context as VirtualizedTableContext;
    const index = (rowProps['data-item-index'] ?? rowProps['data-index'] ?? 0) as number;
    const isSelected = typedContext.selectedRows.has(index);
    const baseStyle = rowProps.style || {};

    return (
        <tr
            {...rowProps}
            ref={ref}
            className={cn(
                'border-b hover:bg-muted/50 transition-colors',
                isSelected && 'bg-blue-50'
            )}
            style={{
                ...baseStyle,
                height: `${typedContext.rowHeight}px`,
                minHeight: `${typedContext.rowHeight}px`,
                maxHeight: `${typedContext.rowHeight}px`,
                boxSizing: 'border-box'
            }}
            onClick={(event: React.MouseEvent<HTMLTableRowElement>) => {
                typedContext.onRowClick(index, event);
            }}
        >
            {children}
        </tr>
    );
});
VirtuosoTableRow.displayName = 'VirtuosoTableRow';

const VirtuosoScroller = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, style, ...props }, ref) => (
        <div
            {...props}
            ref={ref}
            className={cn('unified-table-scroll-container unified-table-horizontal-wrapper overflow-auto', className)}
            style={{
                ...style,
                height: '100%',
                maxHeight: '100%'
            }}
        />
    )
);
VirtuosoScroller.displayName = 'VirtuosoScroller';

const CustomVirtualizedTable: React.FC<CustomVirtualizedTableProps> = ({
    data,
    columns,
    columnConfigMap,
    columnWidths,
    calculateColumnWidth,
    containerHeight,
    rowHeight,
    showRowNumbers,
    selectedRows,
    onRowClick,
    sortConfig,
    onSort,
    sortable,
    hasNextPage,
    onEndReached,
    generateRowKey,
    virtuosoRef
}) => {
    const internalVirtuosoRef = useRef<TableVirtuosoHandle>(null);
    const tableRef = virtuosoRef ?? internalVirtuosoRef;
    const loadMoreTriggeredRef = useRef(false);

    useEffect(() => {
        loadMoreTriggeredRef.current = false;
    }, [data.length]);

    const headerHeight = 48;

    const tableWidth = useMemo(() => {
        const columnsWidth = columns.reduce((width, column) => {
            return width + (columnWidths.get(column) || calculateColumnWidth(column));
        }, 0);

        return columnsWidth + (showRowNumbers ? 60 : 0);
    }, [columns, columnWidths, calculateColumnWidth, showRowNumbers]);

    const handleEndReached = useCallback(
        () => {
            if (!hasNextPage || !onEndReached) {
                return;
            }

            if (loadMoreTriggeredRef.current) {
                return;
            }

            loadMoreTriggeredRef.current = true;
            onEndReached();
        },
        [hasNextPage, onEndReached]
    );

    const headerContent = useMemo(() => (
        <tr className="border-b" style={{ borderBottomWidth: '1px' }}>
            {showRowNumbers && (
                <th
                    key="row-number-header"
                    className="sticky left-0 z-20 bg-muted border-r px-4 text-left text-sm font-medium text-muted-foreground"
                    style={{
                        width: '60px',
                        minWidth: '60px',
                        height: `${headerHeight}px`,
                        boxSizing: 'border-box'
                    }}
                >
                    #
                </th>
            )}
            {columns.map((column, index) => {
                const columnConfig = columnConfigMap.get(column);
                const width = columnWidths.get(column) || calculateColumnWidth(column);

                return (
                    <th
                        key={`header-${column}-${index}`}
                        className="px-6 py-3 text-left text-sm font-medium text-muted-foreground bg-muted border-r last:border-r-0 hover:bg-muted/80 group"
                        style={{
                            width: `${width}px`,
                            minWidth: `${width}px`,
                            height: `${headerHeight}px`,
                            boxSizing: 'border-box'
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="flex-1 text-left truncate" title={columnConfig?.title || column}>
                                {columnConfig?.title || column}
                            </span>
                            {sortable && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        'h-5 w-5 p-0 opacity-0 group-hover:opacity-100',
                                        sortConfig?.column === column && 'opacity-100 bg-blue-100 text-blue-600'
                                    )}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onSort(column);
                                    }}
                                >
                                    {sortConfig?.column === column ? (
                                        sortConfig.direction === 'asc' ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )
                                    ) : (
                                        <ChevronUp className="h-4 w-4 opacity-50" />
                                    )}
                                </Button>
                            )}
                        </div>
                    </th>
                );
            })}
        </tr>
    ), [showRowNumbers, columns, columnConfigMap, columnWidths, calculateColumnWidth, headerHeight, sortable, sortConfig, onSort]);

    const renderRowContent = useCallback((index: number, row: any) => {
        const rowKey = generateRowKey(row, index);
        const isSelected = selectedRows.has(index);

        const cells: React.ReactNode[] = [];

        if (showRowNumbers) {
            cells.push(
                <td
                    key={`${rowKey}-row-number`}
                    className={cn(
                        'sticky left-0 z-10 border-r px-4 text-sm text-muted-foreground bg-background select-none',
                        isSelected && 'bg-blue-50 text-blue-700 font-medium'
                    )}
                    style={{
                        width: '60px',
                        minWidth: '60px',
                        boxSizing: 'border-box'
                    }}
                >
                    {index + 1}
                </td>
            );
        }

        columns.forEach((column) => {
            const columnConfig = columnConfigMap.get(column);
            const cellValue = row[column];
            const displayValue = columnConfig?.render
                ? columnConfig.render(cellValue, row, index)
                : column === 'time' && cellValue
                    ? new Date(cellValue).toLocaleString()
                    : String(cellValue ?? '-');
            const width = columnWidths.get(column) || calculateColumnWidth(column);

            cells.push(
                <td
                    key={`${rowKey}-${column}`}
                    className="px-6 py-2 text-sm border-r last:border-r-0"
                    style={{
                        width: `${width}px`,
                        minWidth: `${width}px`,
                        boxSizing: 'border-box'
                    }}
                >
                    <div className="truncate" title={String(displayValue)}>
                        {displayValue}
                    </div>
                </td>
            );
        });

        return cells;
    }, [columns, columnConfigMap, columnWidths, calculateColumnWidth, showRowNumbers, generateRowKey, selectedRows]);

    return (
        <div className="relative h-full w-full">
            <TableVirtuoso
                ref={tableRef}
                style={{ height: containerHeight, width: '100%' }}
                data={data}
                computeItemKey={(index, row) => generateRowKey(row, index)}
                fixedHeaderContent={() => headerContent}
                itemContent={(index, row) => renderRowContent(index, row)}
                context={{
                    onRowClick,
                    selectedRows,
                    rowHeight
                }}
                components={{
                    Scroller: VirtuosoScroller,
                    Table: React.forwardRef<HTMLTableElement, any>(({ className, style, ...props }, ref) => (
                        <table
                            {...props}
                            ref={ref}
                            className={cn('w-full text-left', className)}
                            style={{
                                ...style,
                                width: `${tableWidth}px`,
                                minWidth: '100%',
                                tableLayout: 'fixed',
                                borderCollapse: 'separate',
                                borderSpacing: 0
                            }}
                        />
                    )),
                    TableHead: React.forwardRef<HTMLTableSectionElement, any>(({ style, className, ...props }, ref) => (
                        <thead
                            {...props}
                            ref={ref}
                            style={{
                                ...style,
                                position: 'sticky',
                                top: 0,
                                zIndex: 30
                            }}
                            className={cn('bg-background header-scroll-container', className)}
                        />
                    )),
                    TableRow: VirtuosoTableRow
                }}
                increaseViewportBy={{ top: rowHeight * 4, bottom: rowHeight * 6 }}
                endReached={hasNextPage ? handleEndReached : undefined}
            />
        </div>
    );
};
// 简化的表头组件
interface TableHeaderProps {
    columnOrder: string[];
    selectedColumns: string[];
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    showRowNumbers: boolean;
    rowHeight: number;
    onSort: (column: string) => void;
    onFilter: (column: string, value: string) => void;
    virtualMode?: boolean; // 虚拟化模式
}

const TableHeader: React.FC<TableHeaderProps> = memo(({
    columnOrder,
    selectedColumns,
    sortColumn,
    sortDirection,
    showRowNumbers,
    rowHeight,
    onSort,
    onFilter,
    virtualMode = false
}) => {
    // 使用传入的参数直接计算，确保与主组件一致
    const visibleColumns = useMemo(() =>
        columnOrder.filter(column => selectedColumns.includes(column)),
        [columnOrder, selectedColumns]
    );

    // 表头行内容（移除序号列，因为已独立显示）
    const headerRowContent = (
        <tr className="border-b transition-colors hover:bg-muted/50">
            {/* 数据列表头 */}
            {visibleColumns.map((column, colIndex) => {
                // 使用固定宽度策略确保表头和数据列对齐
                const width = column === 'time' ? 200 : 150;

                return (
                    <th
                        key={`header-${column}-${colIndex}`}
                        className="px-6 py-3 text-left text-sm font-medium text-muted-foreground bg-muted border-r hover:bg-muted/80 group"
                        style={{
                            width: `${width}px`,
                            minWidth: `${width}px`
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex-1 truncate" title={column}>{column}</span>

                            {/* 排序按钮 */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-5 w-5 p-0 opacity-0 group-hover:opacity-100",
                                    sortColumn === column && "opacity-100 bg-blue-100 text-blue-600"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSort(column);
                                }}
                            >
                                {sortColumn === column ? (
                                    sortDirection === 'asc' ? (
                                        <ChevronUp className="h-3 w-3" />
                                    ) : (
                                        <ChevronDown className="h-3 w-3" />
                                    )
                                ) : (
                                    <ChevronUp className="h-3 w-3 opacity-50" />
                                )}
                            </Button>

                            {/* 筛选按钮 */}
                            <div className="opacity-0 group-hover:opacity-100">
                                <SimpleFilter column={column} onFilter={onFilter} />
                            </div>
                        </div>
                    </th>
                );
            })}
        </tr>
    );

    // 根据virtualMode决定返回结构 - 修复虚拟化表头问题
    if (virtualMode) {
        // 虚拟化模式下需要返回完整的thead结构
        return (
            <thead className="sticky top-0 bg-background z-10 border-b">
                {headerRowContent}
            </thead>
        );
    } else {
        return (
            <thead className="sticky top-0 bg-background z-10 border-b">
                {headerRowContent}
            </thead>
        );
    }
});

TableHeader.displayName = 'TableHeader';

// 统一的分页控制组件
interface PaginationControlsProps {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: string) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = memo(({
    currentPage,
    pageSize,
    totalCount,
    loading,
    onPageChange,
    onPageSizeChange
}) => {
    // 动态生成分页选项，包含"全部"选项
    const pageSizeOptions = useMemo(() => {
        const options = ['500', '1000', '2000', '5000'];
        if (totalCount > 0) {
            options.push('all');
        }
        return options;
    }, [totalCount]);

    // 统一的分页信息计算逻辑
    const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize);
    const startIndex = pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1;
    const endIndex = pageSize === -1 ? totalCount : Math.min(currentPage * pageSize, totalCount);

    // 统一的显示文本逻辑 - 不再区分虚拟化和非虚拟化
    const displayText = pageSize === -1
        ? `显示全部 ${totalCount} 条`
        : `显示 ${startIndex}-${endIndex} 条，共 ${totalCount} 条`;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="text-sm text-muted-foreground">
                {displayText}
            </div>
            <div className="flex items-center gap-2">
                <Select value={pageSize === -1 ? 'all' : pageSize.toString()} onValueChange={onPageSizeChange}>
                    <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {pageSizeOptions.map(option => (
                            <SelectItem key={option} value={option}>
                                {option === 'all' ? '全部' : option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">条/页</span>

                {pageSize !== -1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage <= 1 || loading}
                            className="h-8 w-8 p-0"
                        >
                            ‹
                        </Button>
                        <span className="text-sm px-2">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || loading}
                            className="h-8 w-8 p-0"
                        >
                            ›
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});

PaginationControls.displayName = 'PaginationControls';

// 主组件
export const UnifiedDataTable: React.FC<UnifiedDataTableProps> = ({
    data,
    columns,
    loading = false,
    pagination = { current: 1, pageSize: 500, total: 0 },
    searchable = true,
    filterable = true,
    sortable = true,
    exportable = true,
    columnManagement = true,
    showToolbar = true,
    showRowNumbers = true,
    className,
    title,
    selectedColumns: externalSelectedColumns,
    columnOrder: externalColumnOrder,
    onSearch,
    onFilter,
    onSort,
    onPageChange,
    onExport,
    onColumnChange,
    onRowSelect,
    virtualized,
    rowHeight = 36, // 默认行高度36px，与CSS保持一致
    maxHeight = 800, // 增加默认最大高度，支持大数据量显示
    // 懒加载相关参数
    onLoadMore,
    hasNextPage = false,
    isLoadingMore = false,
    totalCount
}) => {
    // 简化的状态管理
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(pagination ? pagination.current : 1);
    const [pageSize, setPageSize] = useState(pagination ? pagination.pageSize : 500);

    // refs
    const virtuosoRef = useRef<TableVirtuosoHandle>(null);
    const mainSyncingScrollRef = useRef(false);
    const floatingScrollbarRef = useRef<HTMLDivElement>(null);

    // 表头高度常量 - 单行显示
    const tableHeaderHeight = 49; // py-3 with text content typically results in ~49px height

    // 生成唯一行ID的辅助函数
    const generateRowId = useCallback((row: DataRow, index: number, prefix: string = '') => {
        // 优先使用数据中的唯一标识符
        if (row.id !== undefined && row.id !== null) return `${prefix}${row.id}`;
        if (row._id !== undefined && row._id !== null) return `${prefix}${row._id}`;

        // 如果没有唯一标识符，使用索引和部分数据内容生成
        const keys = Object.keys(row).slice(0, 3); // 取前3个字段
        const values = keys.map(key => String(row[key] || '').slice(0, 10)).join('-');
        return `${prefix}${index}-${values}`;
    }, []);

    // 初始化列配置

    // 初始化列 - 优先使用外部传入的状态
    useEffect(() => {
        if (columns.length > 0) {
            const columnKeys = columns.map(col => col.key);
            const finalSelectedColumns = externalSelectedColumns || columnKeys;
            const finalColumnOrder = externalColumnOrder || columnKeys;

            setSelectedColumns(finalSelectedColumns);
            setColumnOrder(finalColumnOrder);
        }
    }, [columns, externalSelectedColumns, externalColumnOrder]);

    // 确保所有列都被正确显示 - 修复列名消失问题
    const effectiveSelectedColumns = useMemo(() => {
        if (selectedColumns.length === 0) {
            return columns.map(col => col.key);
        }
        return selectedColumns;
    }, [selectedColumns, columns]);

    const effectiveColumnOrder = useMemo(() => {
        if (columnOrder.length === 0) {
            return columns.map(col => col.key);
        }
        return columnOrder;
    }, [columnOrder, columns]);

    // 同步外部分页状态到内部状态
    useEffect(() => {
        if (pagination && typeof pagination === 'object') {
            setCurrentPage(pagination.current);
            setPageSize(pagination.pageSize);
        }
    }, [pagination && typeof pagination === 'object' ? pagination.current : null,
        pagination && typeof pagination === 'object' ? pagination.pageSize : null]);

    // 列管理处理函数
    const handleColumnChange = useCallback((visibleColumns: string[], newColumnOrder: string[]) => {
        setSelectedColumns(visibleColumns);
        setColumnOrder(newColumnOrder);
        onColumnChange?.(visibleColumns, newColumnOrder);
    }, [onColumnChange]);

    // 优化的搜索处理 - 使用防抖和索引
    const handleSearch = useCallback((value: string) => {
        setSearchText(value);

        // 对于大数据集，建议使用服务器端搜索
        if (data.length > 1000 && onSearch) {
            onSearch(value);
        } else {
            // 小数据集使用客户端搜索
            onSearch?.(value);
        }
    }, [onSearch, data.length]);

    // 处理排序
    const handleSort = useCallback((column: string) => {
        const newSortConfig: SortConfig = {
            column,
            direction: sortConfig?.column === column && sortConfig.direction === 'asc' ? 'desc' : 'asc'
        };
        setSortConfig(newSortConfig);
        onSort?.(newSortConfig);
    }, [sortConfig, onSort]);

    // 处理筛选
    const handleFilter = useCallback((column: string, value: string) => {
        if (!value || value.trim() === '') {
            // 清除筛选
            setFilters(prev => prev.filter(f => f.column !== column));
        } else {
            // 添加或更新筛选
            setFilters(prev => {
                const newFilters = prev.filter(f => f.column !== column);
                newFilters.push({
                    column,
                    value: value.trim(),
                    operator: 'contains'
                });
                return newFilters;
            });
        }
    }, []);

    // 处理行选择
    const handleRowClick = useCallback((index: number, event: React.MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            const newSelectedRows = new Set(selectedRows);
            if (newSelectedRows.has(index)) {
                newSelectedRows.delete(index);
            } else {
                newSelectedRows.add(index);
            }
            setSelectedRows(newSelectedRows);
            onRowSelect?.(newSelectedRows);
        } else {
            setSelectedRows(new Set([index]));
            onRowSelect?.(new Set([index]));
        }
    }, [selectedRows, onRowSelect]);

    // 优化的数据筛选处理
    const filteredData = useMemo(() => {
        if (filters.length === 0) {
            return data;
        }

        // 预编译过滤条件以提高性能
        const compiledFilters = filters.map(filter => ({
            column: filter.column,
            value: filter.value.toLowerCase(),
            isTimeColumn: filter.column === 'time'
        }));

        return data.filter(row => {
            return compiledFilters.every(filter => {
                const cellValue = row[filter.column];

                // 优化时间列处理
                let displayValue: string;
                if (filter.isTimeColumn && cellValue) {
                    displayValue = new Date(cellValue).toLocaleString();
                } else {
                    displayValue = String(cellValue || '');
                }

                return displayValue.toLowerCase().includes(filter.value);
            });
        });
    }, [data, filters]);

    // 统一的虚拟化判断逻辑 - 所有分页大小使用相同的判断标准
    const shouldUseVirtualization = useMemo(() => {
        if (virtualized !== undefined) {
            return virtualized;
        }

        // 统一判断标准：当数据量超过50条时启用虚拟化
        // 不再区分服务器端分页、客户端分页或"全部"选项
        const dataLength = filteredData.length;
        return dataLength > 50;
    }, [virtualized, filteredData.length]);

    // 懒加载状态管理
    const [loadingMoreData, setLoadingMoreData] = useState(false);
    const [lastLoadTime, setLastLoadTime] = useState(0);

    // 优化的行键生成函数
    const generateRowKey = useCallback((row: DataRow, index: number) => {
        // 优先使用数据中的唯一标识符
        if (row._id !== undefined) {
            return `row-${row._id}`;
        }
        // 如果有时间字段，使用时间+索引作为键
        if (row.time) {
            return `row-${row.time}-${index}`;
        }
        // 最后使用索引作为键
        return `row-${index}`;
    }, []);

    // 统一的数据处理逻辑 - 虚拟化和非虚拟化使用不同的处理方式
    const processedData = useMemo(() => {
        let result = [...filteredData];

        // 统一的排序处理
        if (sortConfig) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.column];
                const bValue = b[sortConfig.column];

                if (aValue === bValue) return 0;
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                const comparison = aValue < bValue ? -1 : 1;
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }

        // 虚拟化表格：显示所有数据，不进行分页切片
        if (shouldUseVirtualization) {
            return result;
        }

        // 非虚拟化表格：应用分页逻辑
        if (!pagination) {
            // 无分页：返回所有数据
            return result;
        }

        if (pageSize === -1) {
            // "全部"选项：返回所有数据
            return result;
        }

        // 标准分页：应用分页逻辑
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return result.slice(startIndex, endIndex);
    }, [filteredData, pagination, pageSize, currentPage, sortConfig, shouldUseVirtualization]);

    // 处理分页变化
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
        setSelectedRows(new Set());
        onPageChange?.(page, pageSize);
    }, [pageSize, onPageChange]);

    const handlePageSizeChange = useCallback((size: string) => {
        const newSize = size === 'all' ? -1 : parseInt(size);
        setPageSize(newSize);
        setCurrentPage(1);
        setSelectedRows(new Set());
        onPageChange?.(1, newSize);
    }, [onPageChange]);





    // 动态计算可用高度 - 考虑实际视口和父容器约束
    const [availableHeight, setAvailableHeight] = useState(maxHeight);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    // 监听容器尺寸变化，动态调整高度
    useEffect(() => {
        const updateAvailableHeight = () => {
            if (tableContainerRef.current) {
                const container = tableContainerRef.current;
                const rect = container.getBoundingClientRect();
                const viewportHeight = window.innerHeight;

                // 计算容器到视口底部的可用空间
                const spaceToBottom = viewportHeight - rect.top;

                // 为分页控件和其他UI元素预留空间
                const reservedSpace = pagination ? 120 : 60; // 增加预留空间
                const calculatedHeight = Math.max(300, spaceToBottom - reservedSpace);

                // 限制最大高度，避免过高
                const finalHeight = Math.min(calculatedHeight, maxHeight);

                setAvailableHeight(finalHeight);
            }
        };

        // 初始计算
        updateAvailableHeight();

        // 监听窗口大小变化 - 确保响应式数据显示
        const handleResize = () => {
            requestAnimationFrame(() => {
                updateAvailableHeight();
                // 确保虚拟滚动在窗口大小变化后重新计算
                if (data.length >= 500) {
                    console.log('📐 [Window Resize] 窗口大小变化，重新计算虚拟滚动:', {
                        windowHeight: window.innerHeight,
                        dataLength: data.length,
                        timestamp: Date.now()
                    });
                }
            });
        };

        window.addEventListener('resize', handleResize);

        // 使用 ResizeObserver 监听容器大小变化
        let resizeObserver: ResizeObserver | null = null;
        if (tableContainerRef.current && window.ResizeObserver) {
            resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(tableContainerRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [maxHeight, pagination]);

    // 监控滚动条范围准确性 - 使用查询选择器而不是ref，因为ref在不同组件作用域
    useEffect(() => {
        if (data.length >= 500) {
            const checkScrollRange = () => {
                const container = document.querySelector('.unified-table-scroll-container') as HTMLDivElement;
                if (container) {
                    const expectedHeight = data.length * rowHeight;
                    const actualScrollHeight = container.scrollHeight;
                    const heightDifference = Math.abs(actualScrollHeight - expectedHeight);

                    if (heightDifference > rowHeight) {
                        console.warn('⚠️ [Scrollbar Range] 检测到滚动范围不准确:', {
                            expectedHeight,
                            actualScrollHeight,
                            heightDifference,
                            dataLength: data.length,
                            rowHeight
                        });
                    }
                }
            };

            // 延迟检查，确保DOM已更新
            const timeoutId = setTimeout(checkScrollRange, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [data.length, rowHeight]);



    // 统一的容器高度计算逻辑 - 响应窗口大小变化
    const containerHeight = useMemo(() => {
        if (shouldUseVirtualization) {
            // 虚拟化模式：确保有足够的高度显示数据，响应窗口大小变化
            const minHeight = 400;
            const maxHeight = Math.max(minHeight, availableHeight);
            return maxHeight;
        } else {
            // 非虚拟化模式：根据数据量和可用空间动态计算
            const dataHeight = processedData.length * rowHeight + tableHeaderHeight + 20; // 20px buffer
            const calculatedHeight = Math.min(availableHeight, dataHeight);
            return Math.max(300, calculatedHeight);
        }
    }, [shouldUseVirtualization, availableHeight, processedData.length, rowHeight, tableHeaderHeight]);

    // 计算可见列和列配置映射 - 修复列数据未展示问题
    const visibleColumns = useMemo(() =>
        effectiveColumnOrder.filter(column => effectiveSelectedColumns.includes(column)),
        [effectiveColumnOrder, effectiveSelectedColumns]
    );



    // 预计算列配置映射以提高渲染性能
    const columnConfigMap = useMemo(() => {
        const map = new Map<string, ColumnConfig>();
        columns.forEach(col => {
            map.set(col.key, col);
        });
        return map;
    }, [columns]);

    // 动态计算列宽度 - 基于列名长度和内容
    const calculateColumnWidth = useCallback((column: string): number => {
        const columnConfig = columnConfigMap.get(column);
        const displayName = columnConfig?.title || column;

        // 基础宽度计算：每个字符约8px，加上padding和边距
        const textWidth = displayName.length * 8;
        const paddingAndMargin = 48; // px-6 (24px) * 2 + 边框等
        const sortButtonWidth = sortable ? 24 : 0; // 排序按钮宽度

        // 最小宽度和计算宽度取较大值
        const minWidth = column === 'time' ? 180 : 120;
        const calculatedWidth = textWidth + paddingAndMargin + sortButtonWidth;

        return Math.max(minWidth, calculatedWidth);
    }, [columnConfigMap, sortable]);

    // 预计算所有可见列的宽度
    const columnWidths = useMemo(() => {
        const widths = new Map<string, number>();
        visibleColumns.forEach(column => {
            widths.set(column, calculateColumnWidth(column));
        });
        return widths;
    }, [visibleColumns, calculateColumnWidth]);

    // 计算是否需要显示水平滚动条
    const needsHorizontalScroll = useMemo(() => {
        // 计算表格内容的总宽度 - 使用动态列宽
        const totalWidth = visibleColumns.reduce((width: number, column: string) => {
            return width + (columnWidths.get(column) || calculateColumnWidth(column));
        }, 0);

        // 获取容器可用宽度（减去行号列宽度和垂直滚动条宽度）
        const availableWidth = (tableContainerRef.current?.clientWidth || 0) - (showRowNumbers ? 60 : 0) - 17;

        return totalWidth > availableWidth;
    }, [visibleColumns, columnWidths, calculateColumnWidth, showRowNumbers, availableHeight]);

    // 调试日志
    useEffect(() => {
        console.log('🔧 [UnifiedDataTable] 数据处理状态:', {
            shouldUseVirtualization,
            pageSize,
            currentPage,
            originalDataLength: data.length,
            filteredDataLength: filteredData.length,
            processedDataLength: processedData.length,
            containerHeight,
            visibleColumnsLength: visibleColumns.length,
            rowHeight,
            expectedVisibleRows: Math.floor(containerHeight / rowHeight),
            effectiveSelectedColumns: effectiveSelectedColumns.length,
            effectiveColumnOrder: effectiveColumnOrder.length,
            maxHeight,
            pagination: !!pagination
        });

        // 虚拟化专用调试
        if (shouldUseVirtualization) {
            console.log('🎯 [UnifiedDataTable] 虚拟化配置:', {
                processedDataSample: processedData.slice(0, 3),
                visibleColumnsSample: visibleColumns.slice(0, 5),
                virtuosoRefCurrent: !!virtuosoRef.current,
                containerHeight,
                maxHeight,
                rowHeight,
                expectedVisibleRows: Math.floor(containerHeight / rowHeight),
                totalCount: processedData.length
            });

            // 检查 TableVirtuoso 的实际状态 - 修复 DOM 引用问题
            if (virtuosoRef.current && tableContainerRef.current) {
                setTimeout(() => {
                    const virtuosoHandle = virtuosoRef.current;
                    const containerElement = tableContainerRef.current;

                    // 查找 TableVirtuoso 创建的实际 DOM 元素
                    const virtuosoElement = containerElement?.querySelector('[data-virtuoso-scroller]') ||
                                           containerElement?.querySelector('[style*="overflow"]') ||
                                           containerElement?.firstElementChild;

                    console.log('🔍 [TableVirtuoso] 实际状态检查:', {
                        hasVirtuosoHandle: !!virtuosoHandle,
                        hasContainer: !!containerElement,
                        hasVirtuosoElement: !!virtuosoElement,
                        containerHeight: (containerElement as HTMLElement)?.offsetHeight || 0,
                        virtuosoHeight: (virtuosoElement as HTMLElement)?.offsetHeight || 0,
                        scrollTop: virtuosoElement?.scrollTop || 0,
                        scrollHeight: virtuosoElement?.scrollHeight || 0,
                        clientHeight: virtuosoElement?.clientHeight || 0,
                        totalCount: processedData.length,
                        expectedHeight: containerHeight,
                        virtuosoMethods: virtuosoHandle ? Object.keys(virtuosoHandle) : []
                    });

                    // 尝试使用 TableVirtuoso 的 API 方法
                    if (virtuosoHandle && typeof virtuosoHandle.scrollToIndex === 'function') {
                        console.log('✅ [TableVirtuoso] API 方法可用，虚拟化应该正常工作');
                    } else {
                        console.warn('⚠️ [TableVirtuoso] API 方法不可用，可能存在初始化问题');
                    }
                }, 1500);
            }
        }
    }, [shouldUseVirtualization, pageSize, currentPage, data.length, filteredData.length, processedData.length, containerHeight, visibleColumns.length, rowHeight, effectiveSelectedColumns.length, effectiveColumnOrder.length, maxHeight, pagination, processedData, visibleColumns]);

    // 非虚拟化表格行组件 - 返回完整的tr元素
    const NonVirtualTableRow = memo(({ index }: { index: number }) => {
        const row = processedData[index];
        if (!row) return null;

        const rowKey = generateRowKey(row, index);
        const isSelected = selectedRows.has(index);

        return (
            <tr
                key={rowKey}
                className={cn(
                    "border-b hover:bg-muted/50 transition-colors",
                    isSelected && "bg-blue-50"
                )}
                style={{
                    height: `${rowHeight}px`,
                    // Multiple fallback approaches for visible row borders - matching column border color
                    borderBottom: '1px solid hsl(var(--border))',
                    borderBottomColor: 'hsl(var(--border))',
                    borderBottomStyle: 'solid',
                    borderBottomWidth: '1px',
                    // Add box shadow as additional visual separator
                    boxShadow: 'inset 0 -1px 0 0 hsl(var(--border))'
                }}
                onClick={(e) => handleRowClick(index, e)}
            >
                {/* 数据列（移除序号列，因为已独立显示） */}
                {visibleColumns.map((column, colIndex) => {
                    const columnConfig = columnConfigMap.get(column);
                    const cellValue = row[column];
                    const displayValue = columnConfig?.render
                        ? columnConfig.render(cellValue, row, index)
                        : column === 'time' && cellValue
                            ? new Date(cellValue).toLocaleString()
                            : String(cellValue || '-');

                    const width = column === 'time' ? 200 : 150;

                    return (
                        <td
                            key={`${rowKey}-${column}`}
                            className="px-6 py-2 text-sm border-r last:border-r-0"
                            style={{
                                width: `${width}px`,
                                minWidth: `${width}px`
                            }}
                        >
                            <div className="truncate" title={String(displayValue)}>
                                {displayValue}
                            </div>
                        </td>
                    );
                })}
            </tr>
        );
    });

    NonVirtualTableRow.displayName = 'NonVirtualTableRow';

    // 懒加载处理函数
    const handleEndReached = useCallback(() => {
        if (!onLoadMore || !hasNextPage || isLoadingMore || loadingMoreData) {
            return;
        }

        const now = Date.now();
        if (now - lastLoadTime < 1000) { // 1秒防抖
            return;
        }

        setLastLoadTime(now);
        setLoadingMoreData(true);

        onLoadMore();

        // 重置加载状态
        setTimeout(() => {
            setLoadingMoreData(false);
        }, 500);
    }, [onLoadMore, hasNextPage, isLoadingMore, loadingMoreData, lastLoadTime]);

    return (
        <div className={cn("h-full flex flex-col bg-background", className)}>
            {/* 工具栏 */}
            {showToolbar && (
                <Card className="flex-shrink-0 border-0 border-b rounded-none bg-background">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {title && <CardTitle className="text-lg">{title}</CardTitle>}
                            </div>
                            <div className="flex items-center gap-2">
                                {searchable && (
                                    <SearchInput
                                        placeholder="搜索..."
                                        value={searchText}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                                        onClear={() => handleSearch('')}
                                        className="w-64"
                                    />
                                )}
                                {exportable && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Download className="w-4 h-4 mr-2" />
                                                导出
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => onExport?.('text')}>
                                                <FileText className="w-4 h-4 mr-2" />
                                                文本格式
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onExport?.('json')}>
                                                <Code className="w-4 h-4 mr-2" />
                                                JSON格式
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onExport?.('csv')}>
                                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                                CSV格式
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                                {columnManagement && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Settings className="w-4 h-4 mr-2" />
                                                列 ({effectiveSelectedColumns.length}/{columns.length})
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto">
                                            <div className="p-3">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm font-medium">列显示设置</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const allColumns = columns.map(col => col.key);
                                                            if (effectiveSelectedColumns.length === allColumns.length) {
                                                                handleColumnChange([allColumns[0]], effectiveColumnOrder);
                                                            } else {
                                                                handleColumnChange(allColumns, effectiveColumnOrder);
                                                            }
                                                        }}
                                                        className="h-7 px-2 text-xs"
                                                    >
                                                        {effectiveSelectedColumns.length === columns.length ? '取消全选' : '全选'}
                                                    </Button>
                                                </div>
                                                <div className="space-y-1">
                                                    {effectiveColumnOrder.map((columnKey) => {
                                                        const column = columns.find(col => col.key === columnKey);
                                                        if (!column) return null;

                                                        return (
                                                            <div key={columnKey} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                                                <Checkbox
                                                                    checked={effectiveSelectedColumns.includes(columnKey)}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            handleColumnChange([...effectiveSelectedColumns, columnKey], effectiveColumnOrder);
                                                                        } else if (effectiveSelectedColumns.length > 1) {
                                                                            handleColumnChange(effectiveSelectedColumns.filter(col => col !== columnKey), effectiveColumnOrder);
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="text-sm flex-1">{column.title}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* 数据表格容器 - 使用flex布局，为分页区域预留空间 */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 p-4">
                    <div className="border rounded-md overflow-hidden h-full flex flex-col">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <Spin />
                                <span className="ml-2">加载中...</span>
                            </div>
                        ) : data.length > 0 ? (
                            shouldUseVirtualization ? (
                                <>
                                    {/* 自定义虚拟化表格 - 真正的虚拟滚动实现 */}
                                    <CustomVirtualizedTable
                                        data={processedData}
                                        columns={visibleColumns}
                                        columnConfigMap={columnConfigMap}
                                        columnWidths={columnWidths}
                                        calculateColumnWidth={calculateColumnWidth}
                                        containerHeight={containerHeight}
                                        rowHeight={rowHeight}
                                        showRowNumbers={showRowNumbers}
                                        selectedRows={selectedRows}
                                        onRowClick={handleRowClick}
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                        sortable={sortable}
                                        hasNextPage={hasNextPage}
                                        onEndReached={handleEndReached}
                                        generateRowKey={generateRowKey}
                                        virtuosoRef={virtuosoRef}
                                    />
                                </>
                            ) : (
                                // 非虚拟化表格 - 用于小数据量，也使用独立行号区域
                                <div className="relative flex" style={{ height: `${containerHeight}px`, width: '100%' }}>
                                    {/* 独立的行号区域 */}
                                    {showRowNumbers && (
                                        <div
                                            className="flex-shrink-0 bg-muted/30 border-r border-border"
                                            style={{ width: '60px' }}
                                        >
                                            {/* 行号表头 */}
                                            <div
                                                className="sticky top-0 z-20 bg-muted border-b border-border flex items-center justify-center text-sm font-medium text-muted-foreground px-6 py-3"
                                            >
                                                #
                                            </div>

                                            {/* 行号内容区域 */}
                                            <div
                                                className="relative"
                                                style={{
                                                    height: `${containerHeight - tableHeaderHeight}px`,
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {processedData.map((row, index) => {
                                                    const isSelected = selectedRows.has(index);

                                                    return (
                                                        <div
                                                            key={`row-number-${index}`}
                                                            className={cn(
                                                                "flex items-center justify-center text-sm text-muted-foreground border-b cursor-pointer hover:bg-muted/50 transition-colors select-none",
                                                                isSelected && "bg-blue-100 text-blue-700 font-medium"
                                                            )}
                                                            style={{
                                                                height: `${rowHeight}px`,
                                                                minHeight: `${rowHeight}px`,
                                                                maxHeight: `${rowHeight}px`,
                                                                boxSizing: 'border-box',
                                                                // Multiple fallback approaches for visible row borders - matching column border color
                                                                borderBottom: '1px solid hsl(var(--border))',
                                                                borderBottomColor: 'hsl(var(--border))',
                                                                borderBottomStyle: 'solid',
                                                                borderBottomWidth: '1px',
                                                                // Add box shadow as additional visual separator
                                                                boxShadow: 'inset 0 -1px 0 0 hsl(var(--border))'
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRowClick(index, e);
                                                            }}
                                                            title={`选择第 ${index + 1} 行`}
                                                        >
                                                            {index + 1}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* 数据表格区域 */}
                                    <div className="flex-1 overflow-auto" style={{ height: `${containerHeight}px` }}>
                                        <table
                                            style={{
                                                width: 'max-content',
                                                minWidth: '100%',
                                                tableLayout: 'fixed',
                                                // Use separate borders to ensure row borders are visible
                                                borderCollapse: 'separate',
                                                borderSpacing: '0'
                                            }}
                                        >
                                            <TableHeader
                                                columnOrder={effectiveColumnOrder}
                                                selectedColumns={effectiveSelectedColumns}
                                                sortColumn={sortConfig?.column || ''}
                                                sortDirection={sortConfig?.direction || 'asc'}
                                                showRowNumbers={showRowNumbers}
                                                rowHeight={rowHeight}
                                                onSort={handleSort}
                                                onFilter={handleFilter}
                                                virtualMode={false}
                                            />
                                            <tbody>
                                                {processedData.map((row, index) => (
                                                    <NonVirtualTableRow key={generateRowKey(row, index)} index={index} />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        ) : (
                            // 没有数据时也显示动态高度的容器
                            <div
                                className="flex items-center justify-center flex-1"
                                style={{
                                    minHeight: '200px',
                                    background: 'hsl(var(--background))',
                                    border: '1px solid hsl(var(--border))'
                                }}
                            >
                                <div className="text-muted-foreground flex items-center">
                                    <Database className="w-8 h-8 mr-2" />
                                    <span>没有找到数据</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 浮动水平滚动条 - 仅在需要时显示 */}
                {needsHorizontalScroll && shouldUseVirtualization && (
                    <div
                        ref={floatingScrollbarRef}
                        className="floating-h-scrollbar absolute bottom-0 h-4 overflow-x-auto overflow-y-hidden bg-background/90 backdrop-blur-sm border-t border-border shadow-sm transition-opacity duration-200"
                        style={{
                            zIndex: 10,
                            // 确保滚动条可见且不影响布局
                            pointerEvents: 'auto',
                            // 精确对齐数据表格内容区域
                            left: showRowNumbers ? '60px' : '0',
                            right: '17px', // 为垂直滚动条预留空间
                            // 为分页控件预留空间
                            bottom: pagination ? '60px' : '0'
                        }}
                        onScroll={(e) => {
                            // 同步水平滚动到主内容区域
                            const horizontalWrapper = document.querySelector('.unified-table-horizontal-wrapper') as HTMLDivElement;
                            if (horizontalWrapper && !mainSyncingScrollRef.current) {
                                mainSyncingScrollRef.current = true;
                                horizontalWrapper.scrollLeft = e.currentTarget.scrollLeft;

                                // 同步到表头
                                const headerScrollContainer = document.querySelector('.header-scroll-container') as HTMLDivElement;
                                if (headerScrollContainer) {
                                    headerScrollContainer.scrollLeft = e.currentTarget.scrollLeft;
                                }

                                setTimeout(() => {
                                    mainSyncingScrollRef.current = false;
                                }, 0);
                            }
                        }}
                    >
                        {/* 滚动条内容 - 与表格宽度精确匹配 */}
                        <div
                            style={{
                                height: '1px',
                                // 精确计算表格的实际宽度，确保滚动条范围完全匹配
                                width: `${Math.max(
                                    visibleColumns.reduce((w: number, col: string) =>
                                        w + (columnWidths.get(col) || calculateColumnWidth(col)), 0),
                                    100 // 最小宽度
                                )}px`,
                                backgroundColor: 'transparent'
                            }}
                        />
                    </div>
                )}

                {/* 底部分页 - 统一的分页控件 */}
                {pagination && (
                    <div className="flex-shrink-0">
                        <PaginationControls
                            currentPage={pagination.current}
                            pageSize={pagination.pageSize}
                            totalCount={pagination.total}
                            loading={loading}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export { TableHeader, PaginationControls };
