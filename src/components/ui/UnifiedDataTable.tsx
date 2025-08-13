/**
 * 统一数据表格组件
 * 重构版本 - 专注于虚拟化滚动和核心功能
 * 支持虚拟化滚动、列管理、排序、筛选、导出等功能
 */

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TableVirtuoso } from 'react-virtuoso';
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
    onLoadMore?: () => void; // 加载更多数据的回调函数
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
                // 重新设计列宽计算策略
                const columnCount = visibleColumns.length;
                let width: string;
                let minWidth: string;
                let maxWidth: string;

                if (column === 'time') {
                    // 时间列固定宽度
                    width = '180px';
                    minWidth = '180px';
                    maxWidth = '180px';
                } else if (columnCount <= 5) {
                    // 少列时：平均分配剩余空间，确保不重叠
                    const baseWidth = Math.max(150, column.length * 8 + 60);
                    width = `${baseWidth}px`;
                    minWidth = `${baseWidth}px`;
                    maxWidth = 'none';
                } else if (columnCount <= 10) {
                    // 中等列数：固定合理宽度
                    const baseWidth = Math.max(120, column.length * 8 + 40);
                    width = `${baseWidth}px`;
                    minWidth = `${baseWidth}px`;
                    maxWidth = 'none';
                } else {
                    // 多列时：使用最小宽度，允许水平滚动
                    const baseWidth = Math.max(100, column.length * 6 + 40);
                    width = 'auto';
                    minWidth = `${baseWidth}px`;
                    maxWidth = '250px';
                }

                return (
                    <th
                        key={`header-${column}-${colIndex}`}
                        className="px-4 py-3 text-left text-sm font-medium text-muted-foreground bg-muted border-r hover:bg-muted/80 group"
                        style={{ width, minWidth, maxWidth }}
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

    // 根据virtualMode决定返回结构
    if (virtualMode) {
        return headerRowContent;
    } else {
        return (
            <thead className="sticky top-0 bg-background z-10 border-b">
                {headerRowContent}
            </thead>
        );
    }
});

TableHeader.displayName = 'TableHeader';

// 简化的分页控制组件
interface PaginationControlsProps {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: string) => void;
    isVirtualized?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = memo(({
    currentPage,
    pageSize,
    totalCount,
    loading,
    onPageChange,
    onPageSizeChange,
    isVirtualized = false
}) => {
    // 动态生成分页选项，包含"全部"选项
    const pageSizeOptions = useMemo(() => {
        const options = ['500', '1000', '2000', '5000'];
        if (totalCount > 0) {
            options.push('all');
        }
        return options;
    }, [totalCount]);

    // 修复pageSize = -1时的计算问题
    const totalPages = pageSize === -1 ? 1 : Math.ceil(totalCount / pageSize);
    const startIndex = pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1;
    const endIndex = pageSize === -1 ? totalCount : Math.min(currentPage * pageSize, totalCount);

    const displayText = isVirtualized
        ? `显示全部 ${totalCount} 条（虚拟化滚动）`
        : pageSize === -1
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

                {!isVirtualized && (
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
    onLoadMore // 加载更多数据的回调函数
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
    const virtuosoRef = useRef<any>(null);
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

    // 处理搜索
    const handleSearch = useCallback((value: string) => {
        setSearchText(value);
        onSearch?.(value);
    }, [onSearch]);

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

    // 数据筛选处理
    const filteredData = useMemo(() => {
        if (filters.length === 0) {
            return data;
        }

        return data.filter(row => {
            return filters.every(filter => {
                const cellValue = row[filter.column];
                const displayValue = filter.column === 'time' && cellValue
                    ? new Date(cellValue).toLocaleString()
                    : String(cellValue || '');

                return displayValue.toLowerCase().includes(filter.value.toLowerCase());
            });
        });
    }, [data, filters]);

    // 判断是否启用服务器端虚拟化滚动
    const shouldUseVirtualization = useMemo(() => {
        if (virtualized !== undefined) {
            return virtualized;
        }

        // 处理"全部"选项（pageSize = -1）- 这是服务器端虚拟化的关键场景
        if (pageSize === -1) {
            return true; // 全部数据时必须启用服务器端虚拟化
        }

        // 检测是否为服务器端分页模式
        const isServerSidePagination = pagination && filteredData.length <= pageSize && filteredData.length > 0 && pageSize > 0;

        if (isServerSidePagination) {
            // 服务器端分页：当用户设置的页面大小超过1000时启用服务器端虚拟化
            return pageSize > 1000;
        } else {
            // 客户端分页或无分页：当总数据量超过500时启用前端虚拟化
            return filteredData.length > 500;
        }
    }, [virtualized, filteredData.length, pagination, pageSize]);

    // 服务器端虚拟化状态
    const [virtualizedItems, setVirtualizedItems] = useState<any[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [virtualizedTotalCount, setVirtualizedTotalCount] = useState(0);

    // 服务器端虚拟化：检测是否需要启用
    const isServerSideVirtualization = useMemo(() => {
        return shouldUseVirtualization && (pageSize === -1 || pageSize > 1000);
    }, [shouldUseVirtualization, pageSize]);

    // 计算分页数据
    const paginatedData = useMemo(() => {
        if (isServerSideVirtualization) {
            // 服务器端虚拟化：使用实际数据，不使用虚拟化数组
            // virtualizedItems是为了未来的动态加载功能预留的
            return filteredData;
        }

        if (!pagination || pageSize === -1) {
            return filteredData; // 全部数据模式下返回全部数据
        }

        if (shouldUseVirtualization) {
            // 前端虚拟化模式：直接返回实际数据，让TableVirtuoso处理虚拟化
            return filteredData;
        }

        // 检测是否为服务器端分页：如果数据量小于等于pageSize且大于0，认为是服务器端分页
        const isServerSidePagination = filteredData.length <= pageSize && filteredData.length > 0 && pageSize > 0;

        if (isServerSidePagination) {
            // 服务器端分页，直接返回数据，不进行客户端分页
            return filteredData;
        }

        // 客户端分页
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredData.slice(startIndex, endIndex);
    }, [isServerSideVirtualization, virtualizedItems, filteredData, pagination, currentPage, pageSize, shouldUseVirtualization]);

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





    // 计算容器高度
    const containerHeight = useMemo(() => {
        if (shouldUseVirtualization) {
            // 虚拟化模式：使用更大的高度来显示大数据量
            const availableHeight = pagination ? maxHeight - 80 : maxHeight; // 为分页控件预留80px

            // 对于大数据量，使用更大的容器高度
            if (paginatedData.length > 10000) {
                return Math.max(800, availableHeight); // 大数据量时最小800px
            } else if (paginatedData.length > 5000) {
                return Math.max(700, availableHeight); // 中等数据量时最小700px
            } else {
                return Math.max(500, availableHeight); // 小数据量时最小500px
            }
        } else {
            // 非虚拟化模式：根据数据量动态计算，为分页控件预留空间
            const availableHeight = pagination ? maxHeight - 80 : maxHeight;
            return Math.min(availableHeight, paginatedData.length * rowHeight + 100);
        }
    }, [shouldUseVirtualization, maxHeight, paginatedData.length, rowHeight, pagination]);

    // 计算可见列
    const visibleColumns = useMemo(() =>
        columnOrder.filter(column => selectedColumns.includes(column)),
        [columnOrder, selectedColumns]
    );

    // 调试日志
    useEffect(() => {
        console.log('🔧 [UnifiedDataTable] 虚拟化状态:', {
            shouldUseVirtualization,
            pageSize,
            filteredDataLength: filteredData.length,
            containerHeight,
            paginatedDataLength: paginatedData.length,
            visibleColumnsLength: visibleColumns.length,
            isServerSideVirtualization,
            rowHeight,
            expectedVisibleRows: Math.floor(containerHeight / rowHeight)
        });
    }, [shouldUseVirtualization, pageSize, filteredData.length, containerHeight, paginatedData.length, visibleColumns.length, isServerSideVirtualization, rowHeight]);

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
                                                列 ({selectedColumns.length}/{columns.length})
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
                                                            if (selectedColumns.length === allColumns.length) {
                                                                handleColumnChange([allColumns[0]], columnOrder);
                                                            } else {
                                                                handleColumnChange(allColumns, columnOrder);
                                                            }
                                                        }}
                                                        className="h-7 px-2 text-xs"
                                                    >
                                                        {selectedColumns.length === columns.length ? '取消全选' : '全选'}
                                                    </Button>
                                                </div>
                                                <div className="space-y-1">
                                                    {columnOrder.map((columnKey) => {
                                                        const column = columns.find(col => col.key === columnKey);
                                                        if (!column) return null;

                                                        return (
                                                            <div key={columnKey} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                                                                <Checkbox
                                                                    checked={selectedColumns.includes(columnKey)}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            handleColumnChange([...selectedColumns, columnKey], columnOrder);
                                                                        } else if (selectedColumns.length > 1) {
                                                                            handleColumnChange(selectedColumns.filter(col => col !== columnKey), columnOrder);
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
                                // 普通表格 - 暂时禁用TableVirtuoso，使用普通表格+CSS虚拟化
                                <div
                                    className="flex-1 overflow-auto"
                                    style={{
                                        height: `${containerHeight}px`,
                                        maxHeight: `${containerHeight}px`
                                    }}
                                    onScroll={(e) => {
                                        const target = e.target as HTMLDivElement;
                                        const { scrollTop, scrollHeight, clientHeight } = target;

                                        // 计算滚动进度
                                        const scrollProgress = scrollTop / (scrollHeight - clientHeight);

                                        // 当滚动到90%时才触发加载，减少频繁触发
                                        if (scrollProgress > 0.9 && onLoadMore) {
                                            console.log('🔧 [UnifiedDataTable] 滚动进度90%，预加载更多数据');
                                            onLoadMore();
                                        }
                                    }}
                                >
                                    <table
                                        className="border-collapse"
                                        style={{
                                            width: visibleColumns.length > 10 ? 'max-content' : '100%',
                                            minWidth: visibleColumns.length > 10 ? `${visibleColumns.length * 120}px` : '100%',
                                            tableLayout: 'auto'
                                        }}
                                    >
                                        <TableHeader
                                            columnOrder={columnOrder}
                                            selectedColumns={selectedColumns}
                                            sortColumn={sortConfig?.column || ''}
                                            sortDirection={sortConfig?.direction || 'asc'}
                                            showRowNumbers={showRowNumbers}
                                            rowHeight={rowHeight}
                                            onSort={handleSort}
                                            onFilter={handleFilter}
                                            virtualMode={false}
                                        />
                                        <tbody>
                                            {paginatedData.map((row, index) => {
                                                const rowId = generateRowId(row, index, 'simple-');
                                                return (
                                                    <tr
                                                        key={rowId}
                                                        className={`border-b hover:bg-muted/50 ${
                                                            selectedRows.has(index) ? 'bg-muted' : ''
                                                        }`}
                                                        style={{ height: `${rowHeight}px` }}
                                                    >
                                                        {/* 序号列 */}
                                                        {showRowNumbers && (
                                                            <td className="px-4 py-2 text-sm text-center text-muted-foreground border-r w-16">
                                                                {index + 1}
                                                            </td>
                                                        )}

                                                        {/* 数据列 */}
                                                        {visibleColumns.map((column, colIndex) => {
                                                            const value = row[column];
                                                            const displayValue = column === 'time' && value
                                                                ? new Date(value).toLocaleString()
                                                                : String(value || '-');
                                                            const columnCount = visibleColumns.length;

                                                            // 计算列宽
                                                            let width: string;
                                                            let minWidth: string;
                                                            let maxWidth: string;

                                                            if (column === 'time') {
                                                                width = '180px';
                                                                minWidth = '180px';
                                                                maxWidth = '180px';
                                                            } else if (columnCount <= 5) {
                                                                const baseWidth = Math.max(150, column.length * 8 + 60);
                                                                width = `${baseWidth}px`;
                                                                minWidth = `${baseWidth}px`;
                                                                maxWidth = 'none';
                                                            } else if (columnCount <= 10) {
                                                                const baseWidth = Math.max(120, column.length * 8 + 40);
                                                                width = `${baseWidth}px`;
                                                                minWidth = `${baseWidth}px`;
                                                                maxWidth = 'none';
                                                            } else {
                                                                const baseWidth = Math.max(100, column.length * 6 + 40);
                                                                width = 'auto';
                                                                minWidth = `${baseWidth}px`;
                                                                maxWidth = '250px';
                                                            }

                                                            return (
                                                                <td
                                                                    key={`${rowId}-${column}-${colIndex}`}
                                                                    className="px-4 py-2 text-sm border-r"
                                                                    style={{
                                                                        width,
                                                                        minWidth,
                                                                        maxWidth,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                    title={String(displayValue)}
                                                                >
                                                                    {displayValue}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                // 普通表格 - 用于小数据量
                                <div className="flex-1 overflow-auto" style={{ height: `${containerHeight}px` }}>
                                    <table
                                        className="border-collapse"
                                        style={{
                                            width: visibleColumns.length > 10 ? 'max-content' : '100%',
                                            minWidth: visibleColumns.length > 10 ? `${visibleColumns.length * 120}px` : '100%',
                                            tableLayout: 'auto' // 始终使用auto布局，让浏览器自动计算列宽
                                        }}
                                    >
                                        <TableHeader
                                            columnOrder={columnOrder}
                                            selectedColumns={selectedColumns}
                                            sortColumn={sortConfig?.column || ''}
                                            sortDirection={sortConfig?.direction || 'asc'}
                                            showRowNumbers={showRowNumbers}
                                            rowHeight={rowHeight}
                                            onSort={handleSort}
                                            onFilter={handleFilter}
                                            virtualMode={false}
                                        />
                                        <tbody>
                                            {paginatedData.map((row, index) => {
                                                // 生成唯一的行标识符
                                                const rowId = generateRowId(row, index, 'table-');

                                                return (
                                                    <tr key={`table-row-${rowId}`} className="hover:bg-muted/50 transition-colors">
                                                        {/* 序号列 */}
                                                        {showRowNumbers && (
                                                            <td
                                                                key={`table-${rowId}-number`}
                                                                className="px-4 py-2 text-sm text-center text-muted-foreground border-r w-16"
                                                            >
                                                                {index + 1}
                                                            </td>
                                                        )}

                                                        {/* 数据列 */}
                                                        {columnOrder.filter(column => selectedColumns.includes(column)).map((column, colIndex) => {
                                                            const columnConfig = columns.find(col => col.key === column);
                                                            const value = row[column];

                                                            const displayValue = columnConfig?.render
                                                                ? columnConfig.render(value, row, index)
                                                                : column === 'time' && value
                                                                    ? new Date(value).toLocaleString()
                                                                    : String(value || '-');

                                                            // 计算列宽，与表头保持一致
                                                            const columnCount = visibleColumns.length;
                                                            let width: string;
                                                            let minWidth: string;
                                                            let maxWidth: string;

                                                            if (column === 'time') {
                                                                // 时间列固定宽度
                                                                width = '180px';
                                                                minWidth = '180px';
                                                                maxWidth = '180px';
                                                            } else if (columnCount <= 5) {
                                                                // 少列时：平均分配剩余空间，确保不重叠
                                                                const baseWidth = Math.max(150, column.length * 8 + 60);
                                                                width = `${baseWidth}px`;
                                                                minWidth = `${baseWidth}px`;
                                                                maxWidth = 'none';
                                                            } else if (columnCount <= 10) {
                                                                // 中等列数：固定合理宽度
                                                                const baseWidth = Math.max(120, column.length * 8 + 40);
                                                                width = `${baseWidth}px`;
                                                                minWidth = `${baseWidth}px`;
                                                                maxWidth = 'none';
                                                            } else {
                                                                // 多列时：使用最小宽度，允许水平滚动
                                                                const baseWidth = Math.max(100, column.length * 6 + 40);
                                                                width = 'auto';
                                                                minWidth = `${baseWidth}px`;
                                                                maxWidth = '250px';
                                                            }

                                                            return (
                                                                <td
                                                                    key={`table-${rowId}-col-${column}-${colIndex}`}
                                                                    className="px-4 py-2 text-sm border-r"
                                                                    style={{
                                                                        width,
                                                                        minWidth,
                                                                        maxWidth,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}
                                                                    title={String(displayValue)}
                                                                >
                                                                    {displayValue}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
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

                {/* 底部分页 - 虚拟化模式下也显示分页控件 */}
                {pagination && (
                    <div className="flex-shrink-0">
                        <PaginationControls
                            currentPage={pagination.current}
                            pageSize={pagination.pageSize}
                            totalCount={pagination.total}
                            loading={loading}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                            isVirtualized={shouldUseVirtualization}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export { TableHeader, PaginationControls };
