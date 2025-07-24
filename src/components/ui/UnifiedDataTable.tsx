/**
 * 统一数据表格组件
 * 基于TableDataBrowser的核心功能，提供统一的表格实现
 * 支持固定序号列、横向滚动、列管理、排序、筛选、导出等功能
 */

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
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
    Input,
} from '@/components/ui';
import { Spin } from '@/components/ui/Spin';
import {
    Search,
    Filter,
    Download,
    Settings,
    ChevronUp,
    ChevronDown,
    Database,
    FileText,
    Code,
    FileSpreadsheet,
    CheckSquare,
    Square,
    MoreVertical,
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
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith';
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
    showRowNumbers?: boolean; // 是否显示序号列
    className?: string;
    title?: string;
    onSearch?: (searchText: string) => void;
    onFilter?: (filters: FilterConfig[]) => void;
    onSort?: (sort: SortConfig | null) => void;
    onPageChange?: (page: number, pageSize: number) => void;
    onExport?: (format: 'text' | 'json' | 'csv') => void;
    onColumnChange?: (visibleColumns: string[], columnOrder: string[]) => void;
    onRowSelect?: (selectedRows: Set<number>) => void;
}

// 表头组件
interface TableHeaderProps {
    columnOrder: string[];
    selectedColumns: string[];
    sortColumn: string;
    sortDirection: 'asc' | 'desc';
    selectedRowsCount: number;
    totalRowsCount: number;
    showRowNumbers: boolean;
    onSort: (column: string) => void;
    onAddFilter: (column: string) => void;
    onSelectAll: () => void;
    onCopySelectedRows: (format: 'text' | 'json' | 'csv') => void;
}

const TableHeader: React.FC<TableHeaderProps> = memo(({
    columnOrder,
    selectedColumns,
    sortColumn,
    sortDirection,
    selectedRowsCount,
    totalRowsCount,
    showRowNumbers,
    onSort,
    onAddFilter,
    onSelectAll,
    onCopySelectedRows
}) => {
    const visibleColumns = useMemo(() =>
        columnOrder.filter(column => selectedColumns.includes(column)),
        [columnOrder, selectedColumns]
    );

    const isAllSelected = selectedRowsCount > 0 && selectedRowsCount === totalRowsCount;

    return (
        <thead className="sticky top-0 bg-background z-10 border-b">
            <tr className="border-b transition-colors hover:bg-muted/50">
                {/* 固定的序号列表头 */}
                {showRowNumbers && (
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-16 sticky">
                        <div className="flex items-center gap-1">
                            <span className="text-xs">#</span>
                            <Badge variant="outline" className="text-xs">
                                序号
                            </Badge>
                        </div>
                    </th>
                )}
                
                {/* 数据列表头 */}
                {visibleColumns.map((column) => {
                    // 计算列的最小宽度
                    const getColumnMinWidth = (col: string) => {
                        if (col === 'time') return '180px';
                        const colLength = col.length;
                        return `${Math.max(120, colLength * 12)}px`;
                    };

                    const minWidth = getColumnMinWidth(column);

                    return (
                        <th
                            key={column}
                            className={cn(
                                'h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap',
                                'cursor-pointer hover:bg-muted/50'
                            )}
                            style={{ minWidth }}
                            onClick={() => onSort(column)}
                        >
                            <div className="flex items-center gap-1 whitespace-nowrap">
                                <span className="truncate" title={column}>
                                    {column}
                                </span>
                                {column === 'time' && (
                                    <Badge variant="secondary" className="text-xs">
                                        时间
                                    </Badge>
                                )}
                                {sortColumn === column && (
                                    <span className="text-xs">
                                        {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 ml-auto opacity-0 group-hover:opacity-100"
                                        >
                                            <Filter className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => onAddFilter(column)}>
                                            <Filter className="w-4 h-4 mr-2" />
                                            添加过滤器
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </th>
                    );
                })}
            </tr>
        </thead>
    );
});

TableHeader.displayName = 'TableHeader';

// 分页控制组件
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
    const isShowingAll = pageSize >= totalCount;
    const totalPages = isShowingAll ? 1 : Math.ceil(totalCount / pageSize);
    const startIndex = isShowingAll ? 1 : (currentPage - 1) * pageSize + 1;
    const endIndex = isShowingAll ? totalCount : Math.min(currentPage * pageSize, totalCount);

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>显示 {startIndex}-{endIndex} 条，共 {totalCount} 条</span>
            </div>
            <div className="flex items-center gap-2">
                <Select value={pageSize >= totalCount ? 'all' : pageSize.toString()} onValueChange={onPageSizeChange}>
                    <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="1000">1000</SelectItem>
                        <SelectItem value="2000">2000</SelectItem>
                        <SelectItem value="5000">5000</SelectItem>
                        <SelectItem value="all">全部</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">条/页</span>
                
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
    onSearch,
    onFilter,
    onSort,
    onPageChange,
    onExport,
    onColumnChange,
    onRowSelect
}) => {
    // 状态管理
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [columnOrder, setColumnOrder] = useState<string[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(pagination ? pagination.current : 1);
    const [pageSize, setPageSize] = useState(pagination ? pagination.pageSize : 500);

    // refs
    const tableScrollRef = useRef<HTMLDivElement>(null);

    // 初始化列
    useEffect(() => {
        if (columns.length > 0) {
            const columnKeys = columns.map(col => col.key);
            setSelectedColumns(columnKeys);
            setColumnOrder(columnKeys);
        }
    }, [columns]);

    // 同步外部分页配置
    useEffect(() => {
        if (pagination) {
            if (currentPage !== pagination.current) {
                setCurrentPage(pagination.current);
            }
            if (pageSize !== pagination.pageSize) {
                setPageSize(pagination.pageSize);
            }
        }
    }, [pagination && pagination.current, pagination && pagination.pageSize, currentPage, pageSize]);

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

    // 处理全选
    const handleSelectAll = useCallback(() => {
        if (selectedRows.size === data.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(data.map((_, index) => index)));
        }
    }, [selectedRows.size, data.length]);

    // 处理行选择
    const handleRowClick = useCallback((index: number, event: React.MouseEvent) => {
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            const newSelectedRows = new Set(selectedRows);
            if (newSelectedRows.has(index)) {
                newSelectedRows.delete(index);
            } else {
                newSelectedRows.add(index);
            }
            setSelectedRows(newSelectedRows);
            onRowSelect?.(newSelectedRows);
        }
    }, [selectedRows, onRowSelect]);

    // 处理复制选中行
    const handleCopySelectedRows = useCallback((format: 'text' | 'json' | 'csv') => {
        onExport?.(format);
    }, [onExport]);

    // 处理添加过滤器
    const handleAddFilter = useCallback((column: string) => {
        // 这里可以添加过滤器逻辑
        console.log('Add filter for column:', column);
    }, []);

    // 计算分页数据
    const paginatedData = useMemo(() => {
        if (!pagination) {
            return data; // 如果没有分页配置，返回所有数据
        }

        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        // 如果pageSize大于等于总数据量，返回所有数据
        if (pageSize >= data.length) {
            return data;
        }

        return data.slice(startIndex, endIndex);
    }, [data, currentPage, pageSize, pagination]);

    // 处理分页
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
        onPageChange?.(page, pageSize);
    }, [pageSize, onPageChange]);

    const handlePageSizeChange = useCallback((size: string) => {
        if (size === 'all') {
            const totalSize = pagination ? pagination.total : data.length;
            setPageSize(totalSize);
            setCurrentPage(1);
            onPageChange?.(1, totalSize);
        } else {
            const newSize = parseInt(size);
            setPageSize(newSize);
            setCurrentPage(1);
            onPageChange?.(1, newSize);
        }
    }, [onPageChange, pagination, data.length]);

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
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="搜索..."
                                            value={searchText}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="pl-8 w-64"
                                        />
                                    </div>
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
                            </div>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* 数据表格 */}
            <div className="flex-1 min-h-0 p-4">
                <div className="h-full border rounded-md overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Spin />
                            <span className="ml-2">加载中...</span>
                        </div>
                    ) : data.length > 0 ? (
                        <div className="table-unified-scroll" ref={tableScrollRef}>
                            <table className="w-full border-collapse">
                                {/* 表头 */}
                                <TableHeader
                                    columnOrder={columnOrder}
                                    selectedColumns={selectedColumns}
                                    sortColumn={sortConfig?.column || ''}
                                    sortDirection={sortConfig?.direction || 'asc'}
                                    selectedRowsCount={selectedRows.size}
                                    totalRowsCount={data.length}
                                    showRowNumbers={showRowNumbers}
                                    onSort={handleSort}
                                    onAddFilter={handleAddFilter}
                                    onSelectAll={handleSelectAll}
                                    onCopySelectedRows={handleCopySelectedRows}
                                />
                                {/* 表格内容 */}
                                <tbody>
                                    {paginatedData.map((row, dataIndex) => {
                                        // 计算实际的行索引（考虑分页）
                                        const actualIndex = pagination ? (currentPage - 1) * pageSize + dataIndex : dataIndex;
                                        return (
                                        <tr
                                            key={row._id !== undefined ? `row_${row._id}_${actualIndex}` : `row_index_${actualIndex}`}
                                            className={cn(
                                                "border-b transition-colors hover:bg-muted/50 cursor-pointer",
                                                selectedRows.has(actualIndex) && "bg-primary/10 border-primary"
                                            )}
                                            onClick={(e) => handleRowClick(actualIndex, e)}
                                        >
                                            {/* 固定的序号列 */}
                                            {showRowNumbers && (
                                                <td className="px-4 py-2 text-sm font-mono w-16 sticky">
                                                    <div className="truncate w-full text-center text-muted-foreground">
                                                        {actualIndex + 1}
                                                    </div>
                                                </td>
                                            )}
                                            {/* 数据列 */}
                                            {columnOrder.filter(column => selectedColumns.includes(column)).map(column => {
                                                const columnConfig = columns.find(col => col.key === column);
                                                const value = row[column];
                                                const width = columnConfig?.width || 120;

                                                return (
                                                    <td
                                                        key={column}
                                                        className="px-4 py-2 text-sm font-mono border-r"
                                                        style={{
                                                            width: `${width}px`,
                                                            minWidth: `${width}px`,
                                                            maxWidth: `${width}px`
                                                        }}
                                                        title={`${String(value || '-')}`}
                                                    >
                                                        <div className="truncate w-full">
                                                            {columnConfig?.render
                                                                ? columnConfig.render(value, row, actualIndex)
                                                                : column === 'time' && value
                                                                    ? new Date(value).toLocaleString()
                                                                    : String(value || '-')
                                                            }
                                                        </div>
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
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <Database className="w-8 h-8 mr-2" />
                            <span>没有找到数据</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 底部分页 */}
            {pagination && (
                <PaginationControls
                    currentPage={pagination.current}
                    pageSize={pagination.pageSize}
                    totalCount={pagination.total}
                    loading={loading}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}
        </div>
    );
};

export { TableHeader, PaginationControls };
