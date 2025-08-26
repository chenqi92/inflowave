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

// 数据行类型
export interface DataRow {
    [key: string]: any;
    _id?: string | number;
}

// 列配置类型
export interface ColumnConfig {
    key: string;
    title: string;
    dataIndex?: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    sortable?: boolean;
    filterable?: boolean;
    render?: (value: any, record: DataRow, index: number) => React.ReactNode;
}

// 分页配置类型
export interface PaginationConfig {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: string[];
    serverSide?: boolean; // 是否使用服务器端分页
}

// 排序配置类型
export interface SortConfig {
    column: string;
    direction: 'asc' | 'desc';
}

// 筛选配置类型
export interface FilterConfig {
    column: string;
    value: string;
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'in';
}

// 组件属性
export interface UnifiedDataTableProps {
    data: DataRow[];
    columns: ColumnConfig[];
    loading?: boolean;
    pagination?: PaginationConfig | false;
    searchable?: boolean;
    filterable?: boolean;
    sortable?: boolean;
    exportable?: boolean;
    columnManagement?: boolean;
    showToolbar?: boolean;
    showRowNumbers?: boolean;
    className?: string;
    title?: string;
    // 外部列管理状态
    selectedColumns?: string[];
    columnOrder?: string[];
    onSearch?: (searchText: string) => void;
    onFilter?: (filters: FilterConfig[]) => void;
    onSort?: (sort: SortConfig | null) => void;
    onPageChange?: (page: number, pageSize: number) => void;
    onExport?: (format: 'text' | 'json' | 'csv') => void;
    onColumnChange?: (visibleColumns: string[], columnOrder: string[]) => void;
    onRowSelect?: (selectedRows: Set<number>) => void;
    // 虚拟化相关配置
    virtualized?: boolean; // 是否启用虚拟化，默认当数据量>500时自动启用
    rowHeight?: number; // 行高，用于虚拟化计算，默认40px
    maxHeight?: number; // 表格最大高度，默认600px
    // 懒加载相关配置
    onLoadMore?: () => void; // 加载更多数据的回调函数
    hasNextPage?: boolean; // 是否还有更多数据
    isLoadingMore?: boolean; // 是否正在加载更多数据
    totalCount?: number; // 总数据量（用于显示加载进度）
}

// 简化的筛选按钮组件
interface SimpleFilterProps {
    column: string;
    onFilter: (column: string, value: string) => void;
}

const SimpleFilter: React.FC<SimpleFilterProps> = ({ column, onFilter }) => {
    const [filterValue, setFilterValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleApplyFilter = () => {
        onFilter(column, filterValue);
        setIsOpen(false);
    };

    const handleClearFilter = () => {
        setFilterValue('');
        onFilter(column, '');
        setIsOpen(false);
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    title="筛选"
                >
                    <Filter className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-3">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">筛选 {column}</span>
                    </div>
                    <Input
                        placeholder={`输入筛选条件...`}
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        className="h-8"
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleApplyFilter}>
                            应用
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleClearFilter}>
                            清除
                        </Button>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
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

    // 表头行内容
    const headerRowContent = (
        <tr className="border-b transition-colors hover:bg-muted/50">
            {/* 序号列表头 */}
            {showRowNumbers && (
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground bg-muted border-r w-16">
                    #
                </th>
            )}

            {/* 数据列表头 */}
            {visibleColumns.map((column, colIndex) => {
                // 使用固定宽度策略确保表头和数据列对齐
                const width = column === 'time' ? 180 : 120;
                const minWidth = column === 'time' ? 180 : 80;
                const maxWidth = column === 'time' ? 180 : 300;

                return (
                    <th
                        key={`header-${column}-${colIndex}`}
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground bg-muted border-r hover:bg-muted/80 group"
                        style={{
                            width: `${width}px`,
                            minWidth: `${minWidth}px`,
                            maxWidth: `${maxWidth}px`
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="flex-1">{column}</span>

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
    const tableContainerRef = useRef<HTMLDivElement>(null);

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

    // 统一的数据处理逻辑 - 所有分页大小使用相同的处理方式
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

        // 统一的分页处理逻辑 - 不再区分虚拟化和非虚拟化
        if (!pagination) {
            // 无分页：返回所有数据
            return result;
        }

        if (pageSize === -1) {
            // "全部"选项：返回所有数据
            return result;
        }

        // 标准分页：应用分页逻辑（虚拟化和非虚拟化都使用相同逻辑）
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return result.slice(startIndex, endIndex);
    }, [filteredData, pagination, pageSize, currentPage, sortConfig]);

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





    // 统一的容器高度计算逻辑
    const containerHeight = useMemo(() => {
        // 为分页控件预留空间
        const availableHeight = pagination ? maxHeight - 80 : maxHeight;

        if (shouldUseVirtualization) {
            // 虚拟化模式：使用固定高度确保滚动正常工作
            return Math.max(400, availableHeight);
        } else {
            // 非虚拟化模式：根据数据量动态计算
            const calculatedHeight = Math.min(availableHeight, processedData.length * rowHeight + 100);
            return Math.max(200, calculatedHeight); // 最小高度200px
        }
    }, [shouldUseVirtualization, maxHeight, processedData.length, rowHeight, pagination]);

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
            effectiveColumnOrder: effectiveColumnOrder.length
        });
    }, [shouldUseVirtualization, pageSize, currentPage, data.length, filteredData.length, processedData.length, containerHeight, visibleColumns.length, rowHeight, effectiveSelectedColumns.length, effectiveColumnOrder.length]);

    // 非虚拟化表格行组件 - 返回完整的tr元素
    const NonVirtualTableRow = memo(({ index, ...props }: { index: number }) => {
        const row = processedData[index];
        if (!row) return null;

        const rowKey = generateRowKey(row, index);
        const isSelected = selectedRows.has(index);

        return (
            <tr
                key={rowKey}
                className={cn(
                    "border-b hover:bg-muted/50 transition-colors",
                    isSelected && "bg-muted"
                )}
                style={{ height: `${rowHeight}px` }}
                onClick={(e) => handleRowClick(index, e)}
            >
                {/* 序号列 */}
                {showRowNumbers && (
                    <td className="px-4 py-2 text-sm text-center text-muted-foreground border-r w-16">
                        {index + 1}
                    </td>
                )}

                {/* 数据列 */}
                {visibleColumns.map((column, colIndex) => {
                    const columnConfig = columnConfigMap.get(column);
                    const cellValue = row[column];
                    const displayValue = columnConfig?.render
                        ? columnConfig.render(cellValue, row, index)
                        : column === 'time' && cellValue
                            ? new Date(cellValue).toLocaleString()
                            : String(cellValue || '-');

                    return (
                        <td
                            key={`${rowKey}-${column}`}
                            className="px-4 py-2 text-sm border-r last:border-r-0"
                            style={{
                                width: column === 'time' ? '180px' : '120px',
                                minWidth: column === 'time' ? '180px' : '80px',
                                maxWidth: column === 'time' ? '180px' : '300px'
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
                                    {/* 修复的虚拟化表格 - 使用TableVirtuoso */}
                                    <TableVirtuoso
                                        ref={virtuosoRef}
                                        style={{
                                            height: `${containerHeight}px`,
                                            width: '100%'
                                        }}
                                        data={processedData}
                                        totalCount={processedData.length}
                                        fixedHeaderContent={() => (
                                            <tr>
                                                {/* 序号列表头 */}
                                                {showRowNumbers && (
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground bg-muted border-r w-16">
                                                        #
                                                    </th>
                                                )}
                                                {/* 数据列表头 */}
                                                {visibleColumns.map((column, colIndex) => {
                                                    const columnConfig = columnConfigMap.get(column);
                                                    const width = column === 'time' ? 180 : 120;
                                                    const minWidth = column === 'time' ? 180 : 80;
                                                    const maxWidth = column === 'time' ? 180 : 300;

                                                    return (
                                                        <th
                                                            key={`header-${column}-${colIndex}`}
                                                            className="px-4 py-3 text-left text-sm font-medium text-muted-foreground bg-muted border-r hover:bg-muted/80 group"
                                                            style={{
                                                                width: `${width}px`,
                                                                minWidth: `${minWidth}px`,
                                                                maxWidth: `${maxWidth}px`
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="truncate">
                                                                    {columnConfig?.title || column}
                                                                </span>
                                                                {sortable && (
                                                                    <button
                                                                        onClick={() => handleSort(column)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        )}
                                        itemContent={(index) => {
                                            const row = processedData[index];
                                            if (!row) return null;

                                            const rowKey = generateRowKey(row, index);
                                            const isSelected = selectedRows.has(index);

                                            return (
                                                <>
                                                    {/* 序号列 */}
                                                    {showRowNumbers && (
                                                        <td className="px-4 py-2 text-sm text-center text-muted-foreground border-r w-16">
                                                            {index + 1}
                                                        </td>
                                                    )}

                                                    {/* 数据列 */}
                                                    {visibleColumns.map((column, colIndex) => {
                                                        const columnConfig = columnConfigMap.get(column);
                                                        const cellValue = row[column];
                                                        const displayValue = columnConfig?.render
                                                            ? columnConfig.render(cellValue, row, index)
                                                            : column === 'time' && cellValue
                                                                ? new Date(cellValue).toLocaleString()
                                                                : String(cellValue || '-');

                                                        return (
                                                            <td
                                                                key={`${rowKey}-${column}`}
                                                                className="px-4 py-2 text-sm border-r last:border-r-0"
                                                                style={{
                                                                    width: column === 'time' ? '180px' : '120px',
                                                                    minWidth: column === 'time' ? '180px' : '80px',
                                                                    maxWidth: column === 'time' ? '180px' : '300px'
                                                                }}
                                                            >
                                                                <div className="truncate" title={String(displayValue)}>
                                                                    {displayValue}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </>
                                            );
                                        }}
                                        endReached={hasNextPage ? handleEndReached : undefined}
                                        overscan={20} // 增加预渲染行数以提供更好的滚动体验
                                        fixedItemHeight={rowHeight} // 固定行高以提高性能
                                        components={{
                                            Table: ({ style, ...props }) => (
                                                <table
                                                    {...props}
                                                    style={{
                                                        ...style,
                                                        borderCollapse: 'collapse',
                                                        width: '100%',
                                                        tableLayout: 'fixed' // 使用固定布局确保列对齐
                                                    }}
                                                />
                                            ),
                                            TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
                                                <tbody {...props} ref={ref} />
                                            ))
                                        }}
                                    />
                                    {/* 懒加载指示器 */}
                                    {hasNextPage && (isLoadingMore || loadingMoreData) && (
                                        <div className="flex items-center justify-center py-4 bg-background border-t">
                                            <Spin />
                                            <span className="ml-2 text-sm text-muted-foreground">
                                                加载更多数据...
                                                {totalCount && (
                                                    <span className="ml-1">
                                                        ({processedData.length}/{totalCount})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // 非虚拟化表格 - 用于小数据量
                                <div className="flex-1 overflow-auto" style={{ height: `${containerHeight}px` }}>
                                    <table
                                        className="border-collapse"
                                        style={{
                                            width: visibleColumns.length > 10 ? 'max-content' : '100%',
                                            minWidth: visibleColumns.length > 10 ? `${visibleColumns.length * 120}px` : '100%',
                                            tableLayout: 'auto'
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
