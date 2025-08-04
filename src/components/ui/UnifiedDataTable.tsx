/**
 * 统一数据表格组件
 * 基于TableDataBrowser的核心功能，提供统一的表格实现
 * 支持固定序号列、横向滚动、列管理、排序、筛选、导出等功能
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
    showRowNumbers?: boolean; // 是否显示序号列
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
    virtualized?: boolean; // 是否启用虚拟化，默认当数据量>1000时自动启用
    rowHeight?: number; // 行高，用于虚拟化计算，默认48px
    maxHeight?: number; // 表格最大高度，默认600px
}

// Excel风格筛选组件
interface ExcelStyleFilterProps {
    column: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchText: string;
    onSearchChange: (text: string) => void;
    onApplyFilter: (selectedValues: string[]) => void;
    loadColumnUniqueValues: (column: string) => Promise<{ value: string; count: number }[]>;
    getFilteredUniqueValues: (uniqueValues: { value: string; count: number }[], searchText: string) => { value: string; count: number }[];
    isLoading: boolean;
}

const ExcelStyleFilter: React.FC<ExcelStyleFilterProps> = ({
    column,
    isOpen,
    onOpenChange,
    searchText,
    onSearchChange,
    onApplyFilter,
    loadColumnUniqueValues,
    getFilteredUniqueValues,
    isLoading
}) => {
    const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());
    const [uniqueValues, setUniqueValues] = useState<{ value: string; count: number }[]>([]);
    const [filteredValues, setFilteredValues] = useState<{ value: string; count: number }[]>([]);

    // 当菜单打开时，懒加载唯一值
    useEffect(() => {
        if (isOpen) {
            setSelectedValues(new Set()); // 默认不选中任何值

            // 懒加载唯一值
            loadColumnUniqueValues(column).then(values => {
                setUniqueValues(values);
                setFilteredValues(getFilteredUniqueValues(values, searchText));
            });
        }
    }, [isOpen, column, loadColumnUniqueValues, getFilteredUniqueValues, searchText]);

    // 当搜索文本变化时，更新过滤结果
    useEffect(() => {
        if (uniqueValues.length > 0) {
            setFilteredValues(getFilteredUniqueValues(uniqueValues, searchText));
        }
    }, [searchText, uniqueValues, getFilteredUniqueValues]);

    // 处理全选/取消全选
    const handleSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            const allValues = new Set(filteredValues.map(item => item.value));
            setSelectedValues(allValues);
            // 立即应用筛选
            onApplyFilter(Array.from(allValues));
        } else {
            setSelectedValues(new Set());
            // 立即清除筛选
            onApplyFilter([]);
        }
    }, [filteredValues, onApplyFilter]);

    // 处理单个值的选择 - 立即筛选
    const handleValueToggle = useCallback((value: string) => {
        const newSelected = new Set(selectedValues);
        if (newSelected.has(value)) {
            newSelected.delete(value);
        } else {
            newSelected.add(value);
        }
        setSelectedValues(newSelected);

        // 立即应用筛选
        onApplyFilter(Array.from(newSelected));
        console.log('🔧 [ExcelStyleFilter] 值切换:', { column, value, selected: !selectedValues.has(value), totalSelected: newSelected.size });
    }, [selectedValues, onApplyFilter, column]);

    // 处理DropdownMenu状态变化
    const handleOpen = (open: boolean) => {
        console.log('🔧 [ExcelStyleFilter] DropdownMenu状态变化:', { column, open, currentOpen: isOpen });

        if (!open) {
            // 关闭时清空搜索
            onSearchChange('');
        }
        // 直接传递boolean值给onOpenChange
        onOpenChange(open);
    };

    return (
        <DropdownMenu
            open={isOpen}
            onOpenChange={handleOpen}
        >
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    title="筛选"
                    onClick={(e) => {
                        e.stopPropagation();
                        console.log('🔧 [ExcelStyleFilter] 筛选按钮点击:', { column, currentOpen: isOpen });
                    }}
                >
                    <Filter className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-96 p-0"
                onCloseAutoFocus={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => {
                    console.log('🔧 [ExcelStyleFilter] ESC键关闭:', { column });
                    onSearchChange('');
                }}
                onPointerDownOutside={(e) => {
                    console.log('🔧 [ExcelStyleFilter] 外部点击关闭:', { column });
                }}
            >
                <div className="p-3 border-b">
                    {/* 搜索框 */}
                    <Input
                        placeholder={`搜索 ${column}...`}
                        value={searchText}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                </div>

                {/* 表格样式的筛选界面 */}
                <div className="max-h-80 overflow-hidden">
                    {isLoading ? (
                        /* 加载状态 */
                        <div className="flex items-center justify-center py-8">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                正在加载数据...
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 表头 */}
                            <div className="grid grid-cols-12 gap-2 p-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                                <div className="col-span-2 flex items-center">
                                    <Checkbox
                                        checked={selectedValues.size === filteredValues.length && filteredValues.length > 0}
                                        onCheckedChange={handleSelectAll}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="ml-1">全选</span>
                                </div>
                                <div className="col-span-8">值</div>
                                <div className="col-span-2 text-right">计数</div>
                            </div>

                            {/* 数据行 */}
                            <div className="max-h-64 overflow-y-auto">
                                {filteredValues.length === 0 ? (
                                    <div className="text-sm text-muted-foreground text-center py-8">
                                        {searchText ? '没有找到匹配的值' : '没有数据'}
                                    </div>
                                ) : (
                                    filteredValues.map(({ value, count }) => (
                                        <div
                                            key={value}
                                            className="grid grid-cols-12 gap-2 p-2 hover:bg-muted/50 cursor-pointer border-b border-muted/30"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleValueToggle(value);
                                            }}
                                        >
                                            <div className="col-span-2 flex items-center">
                                                <Checkbox
                                                    checked={selectedValues.has(value)}
                                                    onCheckedChange={() => {}} // 由父级div的onClick处理
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className="col-span-8 flex items-center">
                                                <span className="text-sm truncate" title={value}>
                                                    {value || '(空值)'}
                                                </span>
                                            </div>
                                            <div className="col-span-2 flex items-center justify-end">
                                                <span className="text-xs text-muted-foreground">
                                                    {count}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

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
    onAddFilter: (column: string, value: string) => void;
    onSelectAll: () => void;
    onCopySelectedRows: (format: 'text' | 'json' | 'csv') => void;
    onColumnSelect: (column: string) => void; // 新增：点击表头选中整列
    // Excel风格筛选相关
    filterMenuOpen: string | null;
    filterSearchText: string;
    onFilterMenuOpenChange: (column: string | null) => void;
    onFilterSearchChange: (text: string) => void;
    loadColumnUniqueValues: (column: string) => Promise<{ value: string; count: number }[]>;
    getFilteredUniqueValues: (uniqueValues: { value: string; count: number }[], searchText: string) => { value: string; count: number }[];
    isLoadingColumn: string | null;
    virtualMode?: boolean; // 虚拟化模式，为true时只返回tr内容
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
    onCopySelectedRows,
    onColumnSelect,
    // Excel风格筛选相关
    filterMenuOpen,
    filterSearchText,
    onFilterMenuOpenChange,
    onFilterSearchChange,
    loadColumnUniqueValues,
    getFilteredUniqueValues,
    isLoadingColumn,
    virtualMode = false
}) => {
    const visibleColumns = useMemo(() =>
        columnOrder.filter(column => selectedColumns.includes(column)),
        [columnOrder, selectedColumns]
    );

    const isAllSelected = selectedRowsCount > 0 && selectedRowsCount === totalRowsCount;

    // 表头行内容
    const headerRowContent = (
        <tr className="border-b transition-colors hover:bg-muted/50">
                {/* 固定的序号列表头 */}
                {showRowNumbers && (
                    <th className={cn(
                        "px-3 py-2 text-left align-middle font-medium w-16 border-r",
                        "text-xs text-muted-foreground bg-muted border-b-2",
                        virtualMode ? "virtualized-sticky-header" : "sticky left-0 top-0 z-50 bg-muted"
                    )}>
                        <div className="text-center items-center gap-1">
                            <span className="text-xs">#</span>
                        </div>
                    </th>
                )}
                
                {/* 数据列表头 */}
                {(() => {
                    const visibleColumns = columnOrder.filter(column => selectedColumns.includes(column));
                    return visibleColumns;
                })().map((column, colIndex) => {
                    // 计算列的最小宽度
                    const getColumnMinWidth = (col: string) => {
                        // 安全检查：确保col不为null或undefined
                        if (!col || typeof col !== 'string') {
                            return '120px'; // 默认宽度
                        }
                        if (col === 'time') return '180px';
                        const colLength = col.length;
                        return `${Math.max(120, colLength * 12)}px`;
                    };

                    const minWidth = getColumnMinWidth(column);

                    return (
                        <th
                            key={`header-${column}-${colIndex}`}
                            className={cn(
                                'px-3 py-2 text-left align-middle font-medium whitespace-nowrap border-r border-b-2',
                                'text-xs text-muted-foreground bg-muted hover:bg-muted/80 group'
                            )}
                            style={{ minWidth }}
                        >
                            <div className="flex items-center gap-1 whitespace-nowrap">
                                {/* 列名 - 点击选中整列 */}
                                <span
                                    className="truncate cursor-pointer flex-1"
                                    title={`点击选中整列: ${column}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onColumnSelect(column);
                                    }}
                                >
                                    {column}
                                </span>

                                {/* 排序按钮 */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* 排序切换按钮 */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-5 w-5 p-0",
                                            sortColumn === column && "bg-blue-100 text-blue-600"
                                        )}
                                        title={
                                            sortColumn === column
                                                ? `当前${sortDirection === 'asc' ? '升序' : '降序'}，点击切换`
                                                : '点击排序'
                                        }
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

                                    {/* Excel风格筛选按钮 */}
                                    <ExcelStyleFilter
                                        column={column}
                                        isOpen={filterMenuOpen === column}
                                        onOpenChange={(open) => {
                                            onFilterMenuOpenChange(open ? column : null);
                                            if (!open) {
                                                onFilterSearchChange('');
                                            }
                                        }}
                                        searchText={filterSearchText}
                                        onSearchChange={onFilterSearchChange}
                                        loadColumnUniqueValues={loadColumnUniqueValues}
                                        getFilteredUniqueValues={getFilteredUniqueValues}
                                        isLoading={isLoadingColumn === column}
                                        onApplyFilter={(selectedValues) => {
                                            console.log('🔧 [UnifiedDataTable] 应用Excel筛选:', { column, selectedValues });
                                            // 立即应用筛选，不关闭弹框
                                            if (selectedValues.length === 0) {
                                                onAddFilter(column, ''); // 清除筛选
                                            } else {
                                                // 将选中的值转换为筛选条件
                                                const filterValue = selectedValues.join('|'); // 使用|分隔多个值
                                                onAddFilter(column, filterValue);
                                            }
                                            // 不关闭弹框，允许继续筛选
                                        }}
                                    />
                                </div>
                            </div>
                        </th>
                    );
                })}
        </tr>
    );

    // 根据virtualMode决定返回结构
    if (virtualMode) {
        // 虚拟化模式：返回tr内容，因为fixedHeaderContent会自动包装在thead>tr中
        return headerRowContent;
    } else {
        // 传统模式：返回完整的thead结构
        return (
            <thead className="sticky top-0 bg-background z-10 border-b">
                {headerRowContent}
            </thead>
        );
    }
});

TableHeader.displayName = 'TableHeader';

// 轻量级单元格选择和编辑功能 - 使用原生DOM事件

// 分页控制组件
interface PaginationControlsProps {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    loading: boolean;
    pageSizeOptions?: string[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: string) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = memo(({
    currentPage,
    pageSize,
    totalCount,
    loading,
    pageSizeOptions = ['500', '1000', '2000', '5000', 'all'],
    onPageChange,
    onPageSizeChange
}) => {
    // 调试日志：检查分页选项
    console.log('🔧 [PaginationControls] 分页选项:', { totalCount, pageSizeOptions });

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
                <Select value={isShowingAll ? 'all' : pageSize.toString()} onValueChange={onPageSizeChange}>
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
    // 外部列管理状态
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
    rowHeight = 48,
    maxHeight = 600
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
    const [isShowingAll, setIsShowingAll] = useState(false); // 跟踪是否用户主动选择了"全部"

    // 轻量级单元格状态 - 只存储必要信息
    const [selectedCell, setSelectedCell] = useState<string | null>(null); // 格式: "row-column"
    const [editingCell, setEditingCell] = useState<string | null>(null);
    const [lastSelectedRow, setLastSelectedRow] = useState<number | null>(null); // 用于Shift多选
    const editingInputRef = useRef<HTMLInputElement>(null);

    // 单元格范围选择状态
    const [selectedCellRange, setSelectedCellRange] = useState<Set<string>>(new Set()); // 选中的单元格范围
    const [isSelecting, setIsSelecting] = useState(false); // 是否正在拖拽选择
    const [selectionStart, setSelectionStart] = useState<{row: number, column: string} | null>(null); // 选择起点

    // 自动滚动相关
    const autoScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Excel风格筛选相关状态
    const [filterMenuOpen, setFilterMenuOpen] = useState<string | null>(null); // 当前打开筛选菜单的列
    const [filterSearchText, setFilterSearchText] = useState<string>(''); // 筛选搜索文本
    const [columnUniqueValues, setColumnUniqueValues] = useState<Map<string, { value: string; count: number }[]>>(new Map()); // 缓存列的唯一值
    const [loadingColumn, setLoadingColumn] = useState<string | null>(null); // 正在加载唯一值的列

    // refs
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const virtuosoRef = useRef<any>(null);

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

    // 列管理处理函数
    const handleColumnChange = useCallback((visibleColumns: string[], newColumnOrder: string[]) => {
        setSelectedColumns(visibleColumns);
        setColumnOrder(newColumnOrder);
        onColumnChange?.(visibleColumns, newColumnOrder);
    }, [onColumnChange, selectedColumns, columnOrder]);

    // 获取列索引
    const getColumnIndex = useCallback((column: string) => {
        if (column === '#') return -1;
        const visibleColumns = columnOrder.filter(col => selectedColumns.includes(col));
        return visibleColumns.indexOf(column);
    }, [columnOrder, selectedColumns]);

    // 获取指定索引的列名
    const getColumnByIndex = useCallback((index: number) => {
        if (index === -1) return '#';
        const visibleColumns = columnOrder.filter(col => selectedColumns.includes(col));
        return visibleColumns[index] || '';
    }, [columnOrder, selectedColumns]);

    // 计算单元格范围选择
    const calculateCellRange = useCallback((start: {row: number, column: string}, end: {row: number, column: string}) => {
        const startRowIndex = start.row;
        const endRowIndex = end.row;
        const startColIndex = getColumnIndex(start.column);
        const endColIndex = getColumnIndex(end.column);

        const minRow = Math.min(startRowIndex, endRowIndex);
        const maxRow = Math.max(startRowIndex, endRowIndex);
        const minCol = Math.min(startColIndex, endColIndex);
        const maxCol = Math.max(startColIndex, endColIndex);

        const range = new Set<string>();
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const columnName = getColumnByIndex(col);
                if (columnName) {
                    range.add(`${row}-${columnName}`);
                }
            }
        }
        return range;
    }, [getColumnIndex, getColumnByIndex]);

    // 自动滚动功能
    const startAutoScroll = useCallback((mouseX: number, mouseY: number) => {
        // 优先查找 TableVirtuoso 内部的滚动容器
        let container: HTMLElement | null = null;
        let containerType = 'unknown';

        // 尝试从 TableVirtuoso 内部找到实际的滚动容器
        if (tableContainerRef.current) {
            // 方法1: 查找 TableVirtuoso 的标准滚动容器
            const virtuosoScroller = tableContainerRef.current.querySelector('[data-virtuoso-scroller]') as HTMLElement;
            if (virtuosoScroller) {
                container = virtuosoScroller;
                containerType = 'virtuoso-scroller';
            } else {
                // 方法2: 查找带有 data-test-id 的滚动容器（TableVirtuoso 的另一种标识）
                const testIdScroller = tableContainerRef.current.querySelector('[data-test-id*="virtuoso"]') as HTMLElement;
                if (testIdScroller) {
                    container = testIdScroller;
                    containerType = 'virtuoso-test-id';
                } else {
                    // 方法3: 查找具有滚动样式的第一个 div 元素
                    const scrollableElements = tableContainerRef.current.querySelectorAll('div');
                    for (const element of scrollableElements) {
                        const style = window.getComputedStyle(element);
                        if ((style.overflow === 'auto' || style.overflow === 'scroll' ||
                            style.overflowY === 'auto' || style.overflowY === 'scroll') &&
                            element.scrollHeight > element.clientHeight) {
                            container = element;
                            containerType = 'scrollable-div';
                            break;
                        }
                    }
                }
            }
        }

        // 如果没有找到内部滚动容器，回退到外层容器
        if (!container) {
            container = tableContainerRef.current || tableScrollRef.current;
            containerType = 'fallback-container';
        }

        if (!container) {
            console.warn('🔧 [UnifiedDataTable] 未找到滚动容器，自动滚动失败');
            return;
        }

        const rect = container.getBoundingClientRect();
        const scrollThreshold = 50; // 距离边缘50px开始滚动
        const scrollSpeed = 10; // 滚动速度

        let scrollX = 0;
        let scrollY = 0;

        // 检查是否需要水平滚动
        if (mouseX < rect.left + scrollThreshold) {
            scrollX = -scrollSpeed; // 向左滚动
        } else if (mouseX > rect.right - scrollThreshold) {
            scrollX = scrollSpeed; // 向右滚动
        }

        // 检查是否需要垂直滚动
        if (mouseY < rect.top + scrollThreshold) {
            scrollY = -scrollSpeed; // 向上滚动
        } else if (mouseY > rect.bottom - scrollThreshold) {
            scrollY = scrollSpeed; // 向下滚动
        }

        // 如果需要滚动
        if (scrollX !== 0 || scrollY !== 0) {
            // 检查容器是否真的可以滚动
            const canScrollX = container.scrollWidth > container.clientWidth;
            const canScrollY = container.scrollHeight > container.clientHeight;

            if ((scrollX !== 0 && canScrollX) || (scrollY !== 0 && canScrollY)) {
                container.scrollBy(scrollX, scrollY);

                // 继续自动滚动
                autoScrollTimerRef.current = setTimeout(() => {
                    startAutoScroll(mouseX, mouseY);
                }, 16); // 约60fps

                console.log('🔧 [UnifiedDataTable] 自动滚动:', {
                    scrollX,
                    scrollY,
                    mouseX,
                    mouseY,
                    containerType,
                    canScrollX,
                    canScrollY,
                    scrollWidth: container.scrollWidth,
                    clientWidth: container.clientWidth,
                    scrollHeight: container.scrollHeight,
                    clientHeight: container.clientHeight
                });
            }
        }
    }, []);

    // 停止自动滚动
    const stopAutoScroll = useCallback(() => {
        if (autoScrollTimerRef.current) {
            clearTimeout(autoScrollTimerRef.current);
            autoScrollTimerRef.current = null;
            console.log('🔧 [UnifiedDataTable] 停止自动滚动');
        }
    }, []);

    // 高性能事件委托处理
    const handleTableMouseDown = useCallback((event: React.MouseEvent<HTMLTableElement>) => {
        const target = event.target as HTMLElement;
        const cell = target.closest('td');
        if (!cell) return;

        const row = cell.closest('tr');
        if (!row) return;

        const rowIndex = parseInt(row.dataset.rowIndex || '0');
        const column = cell.dataset.column || '';
        const cellId = `${rowIndex}-${column}`;

        console.log('🔧 [UnifiedDataTable] 鼠标按下:', { rowIndex, column, cellId, ctrlKey: event.ctrlKey, shiftKey: event.shiftKey });

        // 序号列点击 - 高级行选择
        if (column === '#') {
            const newSelectedRows = new Set(selectedRows);

            if (event.shiftKey && lastSelectedRow !== null) {
                // Shift多选：选择范围
                const start = Math.min(lastSelectedRow, rowIndex);
                const end = Math.max(lastSelectedRow, rowIndex);
                for (let i = start; i <= end; i++) {
                    newSelectedRows.add(i);
                }
                console.log('🔧 [UnifiedDataTable] Shift范围选择:', { start, end, count: newSelectedRows.size });
            } else if (event.ctrlKey || event.metaKey) {
                // Ctrl多选：切换选择状态
                if (newSelectedRows.has(rowIndex)) {
                    newSelectedRows.delete(rowIndex);
                    console.log('🔧 [UnifiedDataTable] Ctrl取消选择行:', { rowIndex });
                } else {
                    newSelectedRows.add(rowIndex);
                    console.log('🔧 [UnifiedDataTable] Ctrl添加选择行:', { rowIndex });
                }
            } else {
                // 普通点击：单选
                newSelectedRows.clear();
                newSelectedRows.add(rowIndex);
                console.log('🔧 [UnifiedDataTable] 单选行:', { rowIndex });
            }

            setSelectedRows(newSelectedRows);
            setLastSelectedRow(rowIndex);
            setSelectedCell(null); // 清除单元格选择
            setSelectedCellRange(new Set()); // 清除单元格范围选择
            setEditingCell(null);
            onRowSelect?.(newSelectedRows);
            return;
        }

        // 数据列点击 - 单元格选择
        // 清除行选择（除非按住Ctrl）
        if (!event.ctrlKey && !event.metaKey) {
            setSelectedRows(new Set());
            setLastSelectedRow(null);
        }

        // 开始单元格选择
        setSelectedCell(cellId);
        setSelectedCellRange(new Set([cellId])); // 初始化范围选择
        setSelectionStart({ row: rowIndex, column });
        setIsSelecting(true);
        setEditingCell(null);

        console.log('🔧 [UnifiedDataTable] 开始单元格选择:', { cellId });

        // 阻止默认行为，避免文本选择
        event.preventDefault();
    }, [selectedCell, selectedRows, lastSelectedRow, onRowSelect]);

    // 处理鼠标移动 - 拖拽选择
    const handleTableMouseMove = useCallback((event: React.MouseEvent<HTMLTableElement>) => {
        if (!isSelecting || !selectionStart) return;

        // 获取鼠标位置用于自动滚动
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        // 启动自动滚动
        stopAutoScroll(); // 先停止之前的滚动
        startAutoScroll(mouseX, mouseY);

        const target = event.target as HTMLElement;
        const cell = target.closest('td');
        if (!cell) {
            // 如果鼠标不在单元格上，仍然需要处理自动滚动
            return;
        }

        const row = cell.closest('tr');
        if (!row) return;

        const rowIndex = parseInt(row.dataset.rowIndex || '0');
        const column = cell.dataset.column || '';

        // 跳过序号列
        if (column === '#') return;

        // 计算选择范围
        const range = calculateCellRange(selectionStart, { row: rowIndex, column });
        setSelectedCellRange(range);

        console.log('🔧 [UnifiedDataTable] 拖拽选择:', {
            start: selectionStart,
            end: { row: rowIndex, column },
            rangeSize: range.size,
            mousePos: { mouseX, mouseY }
        });
    }, [isSelecting, selectionStart, calculateCellRange, startAutoScroll, stopAutoScroll]);

    // 处理鼠标释放 - 结束选择
    const handleTableMouseUp = useCallback(() => {
        if (isSelecting) {
            setIsSelecting(false);
            stopAutoScroll(); // 停止自动滚动
            console.log('🔧 [UnifiedDataTable] 结束单元格选择:', { rangeSize: selectedCellRange.size });
        }
    }, [isSelecting, selectedCellRange.size, stopAutoScroll]);

    // 处理单击 - 编辑模式 (暂时注释掉以提升性能)
    const handleTableClick = useCallback((event: React.MouseEvent<HTMLTableElement>) => {
        // if (isSelecting) return; // 如果刚刚结束拖拽选择，不处理点击

        // const target = event.target as HTMLElement;
        // const cell = target.closest('td');
        // if (!cell) return;

        // const row = cell.closest('tr');
        // if (!row) return;

        // const rowIndex = parseInt(row.dataset.rowIndex || '0');
        // const column = cell.dataset.column || '';
        // const cellId = `${rowIndex}-${column}`;

        // // 序号列不进入编辑模式
        // if (column === '#') return;

        // // 如果是单个单元格选择且再次点击，进入编辑模式
        // if (selectedCell === cellId && selectedCellRange.size === 1) {
        //     setEditingCell(cellId);
        //     // 延迟聚焦，确保DOM更新完成
        //     setTimeout(() => {
        //         if (editingInputRef.current) {
        //             editingInputRef.current.focus();
        //             editingInputRef.current.select();
        //         }
        //     }, 0);
        //     console.log('🔧 [UnifiedDataTable] 进入编辑模式:', { cellId });
        // }

        console.log('🔧 [UnifiedDataTable] 编辑功能已暂时禁用以提升性能');
    }, []);

    // 双击处理
    const handleTableDoubleClick = useCallback((event: React.MouseEvent<HTMLTableElement>) => {
        const target = event.target as HTMLElement;
        const cell = target.closest('td');
        if (!cell) return;

        const row = cell.closest('tr');
        if (!row) return;

        const rowIndex = parseInt(row.dataset.rowIndex || '0');
        const column = cell.dataset.column || '';
        const cellId = `${rowIndex}-${column}`;

        // 序号列双击不进入编辑模式
        if (column === '#') return;

        console.log('🔧 [UnifiedDataTable] 表格双击:', { cellId });
        setSelectedCell(cellId);
        setEditingCell(cellId);

        // 延迟聚焦
        setTimeout(() => {
            if (editingInputRef.current) {
                editingInputRef.current.focus();
                editingInputRef.current.select();
            }
        }, 0);
    }, []);

    // 编辑完成处理
    const handleEditComplete = useCallback(() => {
        console.log('🔧 [UnifiedDataTable] 编辑完成:', { editingCell });
        setEditingCell(null);
    }, [editingCell]);

    // 键盘事件处理
    const handleEditKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleEditComplete();
        } else if (event.key === 'Escape') {
            setEditingCell(null);
        }
    }, [handleEditComplete]);

    // 复制选中行数据
    const copySelectedRowsData = useCallback(() => {
        if (selectedRows.size === 0) return;

        const selectedRowsArray = Array.from(selectedRows).sort((a, b) => a - b);
        const visibleColumns = columnOrder.filter(column => selectedColumns.includes(column));

        // 构建CSV格式数据
        const headers = showRowNumbers ? ['#', ...visibleColumns] : visibleColumns;
        const csvData = [
            headers.join('\t'), // 表头
            ...selectedRowsArray.map(rowIndex => {
                const row = data[rowIndex];
                if (!row) return '';

                const rowData = visibleColumns.map(column => {
                    const value = row[column];
                    // 格式化值
                    if (column === 'time' && value) {
                        return new Date(value).toLocaleString();
                    }
                    return String(value || '');
                });

                return showRowNumbers
                    ? [rowIndex + 1, ...rowData].join('\t')
                    : rowData.join('\t');
            })
        ].join('\n');

        // 复制到剪贴板
        navigator.clipboard.writeText(csvData).then(() => {
            console.log('🔧 [UnifiedDataTable] 复制行数据成功:', {
                rowCount: selectedRows.size,
                columnCount: headers.length,
                dataLength: csvData.length
            });
        }).catch(err => {
            console.error('🔧 [UnifiedDataTable] 复制失败:', err);
        });
    }, [selectedRows, data, columnOrder, selectedColumns, showRowNumbers]);

    // 复制选中单元格数据
    const copySelectedCellsData = useCallback(() => {
        if (selectedCellRange.size === 0) return;

        // 解析单元格范围，按行列排序
        const cellsData: { row: number; column: string; value: any }[] = [];
        selectedCellRange.forEach(cellId => {
            const [rowStr, column] = cellId.split('-');
            const row = parseInt(rowStr);
            const value = data[row]?.[column];
            cellsData.push({ row, column, value });
        });

        // 按行和列排序
        const visibleColumns = columnOrder.filter(col => selectedColumns.includes(col));
        cellsData.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return visibleColumns.indexOf(a.column) - visibleColumns.indexOf(b.column);
        });

        // 构建表格数据
        const rowGroups = new Map<number, { column: string; value: any }[]>();
        cellsData.forEach(({ row, column, value }) => {
            if (!rowGroups.has(row)) {
                rowGroups.set(row, []);
            }
            rowGroups.get(row)!.push({ column, value });
        });

        // 生成CSV格式
        const csvData: string[] = [];
        const sortedRows = Array.from(rowGroups.keys()).sort((a, b) => a - b);

        sortedRows.forEach(rowIndex => {
            const rowCells = rowGroups.get(rowIndex)!;
            const rowData = rowCells.map(({ column, value }) => {
                // 格式化值
                if (column === 'time' && value) {
                    return new Date(value).toLocaleString();
                }
                return String(value || '');
            });
            csvData.push(rowData.join('\t'));
        });

        const finalData = csvData.join('\n');

        // 复制到剪贴板
        navigator.clipboard.writeText(finalData).then(() => {
            console.log('🔧 [UnifiedDataTable] 复制单元格数据成功:', {
                cellCount: selectedCellRange.size,
                rowCount: rowGroups.size,
                dataLength: finalData.length
            });
        }).catch(err => {
            console.error('🔧 [UnifiedDataTable] 复制失败:', err);
        });
    }, [selectedCellRange, data, columnOrder, selectedColumns]);

    // 全局键盘事件监听
    useEffect(() => {
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
            // 如果在编辑模式，不处理复制
            if (editingCell) return;

            // Ctrl+C 复制
            if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                event.preventDefault();

                if (selectedCellRange.size > 0) {
                    // 优先复制选中的单元格范围
                    copySelectedCellsData();
                } else if (selectedRows.size > 0) {
                    // 其次复制选中的行
                    copySelectedRowsData();
                } else if (selectedCell) {
                    // 最后复制单个选中的单元格
                    const [rowStr, column] = selectedCell.split('-');
                    const row = parseInt(rowStr);
                    const value = data[row]?.[column];
                    const formattedValue = column === 'time' && value
                        ? new Date(value).toLocaleString()
                        : String(value || '');

                    navigator.clipboard.writeText(formattedValue).then(() => {
                        console.log('🔧 [UnifiedDataTable] 复制单个单元格成功:', {
                            cellId: selectedCell,
                            value: formattedValue
                        });
                    }).catch(err => {
                        console.error('🔧 [UnifiedDataTable] 复制失败:', err);
                    });
                }
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [selectedRows, selectedCell, selectedCellRange, editingCell, copySelectedRowsData, copySelectedCellsData, data]);

    // 列选择处理函数
    const handleColumnSelect = useCallback((column: string) => {
        console.log('🔧 [UnifiedDataTable] 选中整列:', { column });

        // 清除其他选择状态
        setSelectedRows(new Set());
        setSelectedCell(null);
        setLastSelectedRow(null);

        // 选中该列的所有单元格
        const columnCells = new Set<string>();
        for (let i = 0; i < data.length; i++) {
            columnCells.add(`${i}-${column}`);
        }
        setSelectedCellRange(columnCells);

        console.log('🔧 [UnifiedDataTable] 整列选择完成:', { column, cellCount: columnCells.size });
    }, [data]);

    // 高性能懒加载：只在需要时计算列的唯一值
    const loadColumnUniqueValues = useCallback(async (column: string) => {
        // 如果已经缓存了，直接返回
        if (columnUniqueValues.has(column)) {
            return columnUniqueValues.get(column)!;
        }

        // 如果正在加载，等待完成
        if (loadingColumn === column) {
            return [];
        }

        console.log('🔧 [UnifiedDataTable] 开始计算列唯一值:', { column, dataLength: data.length });
        const startTime = performance.now();

        setLoadingColumn(column);

        // 使用Promise.resolve()让出主线程，避免阻塞UI
        await new Promise(resolve => setTimeout(resolve, 0));

        try {
            const valueMap = new Map<string, number>();

            // 批量处理数据，避免长时间阻塞
            const batchSize = 1000;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);

                batch.forEach(row => {
                    const value = row[column];
                    // 格式化显示值
                    const displayValue = column === 'time' && value
                        ? new Date(value).toLocaleString()
                        : String(value || '');

                    valueMap.set(displayValue, (valueMap.get(displayValue) || 0) + 1);
                });

                // 每处理一批数据后让出主线程
                if (i + batchSize < data.length) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            // 转换为数组并排序
            const uniqueValues = Array.from(valueMap.entries())
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => {
                    // 空值排在最后
                    if (a.value === '' && b.value !== '') return 1;
                    if (a.value !== '' && b.value === '') return -1;
                    // 其他按字母顺序排序
                    return a.value.localeCompare(b.value);
                });

            // 缓存结果
            setColumnUniqueValues(prev => new Map(prev).set(column, uniqueValues));

            const endTime = performance.now();
            console.log('🔧 [UnifiedDataTable] 列唯一值计算完成:', {
                column,
                uniqueCount: uniqueValues.length,
                dataLength: data.length,
                duration: `${(endTime - startTime).toFixed(2)}ms`
            });

            return uniqueValues;
        } finally {
            setLoadingColumn(null);
        }
    }, [data, columnUniqueValues, loadingColumn]);

    // 清除缓存：当数据变化时清除缓存
    useEffect(() => {
        setColumnUniqueValues(new Map());
        console.log('🔧 [UnifiedDataTable] 数据变化，清除唯一值缓存');
    }, [data]);

    // 筛选搜索：根据搜索文本过滤唯一值
    const getFilteredUniqueValues = useCallback((uniqueValues: { value: string; count: number }[], searchText: string) => {
        if (!searchText.trim()) {
            return uniqueValues;
        }

        const filtered = uniqueValues.filter(({ value }) =>
            value.toLowerCase().includes(searchText.toLowerCase())
        );

        console.log('🔧 [UnifiedDataTable] 筛选搜索结果:', {
            searchText,
            totalCount: uniqueValues.length,
            filteredCount: filtered.length
        });

        return filtered;
    }, []);

    // 筛选菜单状态处理 - 确保同时只有一个菜单打开
    const handleFilterMenuOpenChange = useCallback((column: string | null) => {
        console.log('🔧 [UnifiedDataTable] 筛选菜单状态变化请求:', { from: filterMenuOpen, to: column });

        // 直接设置状态，React会自动处理状态更新
        setFilterMenuOpen(column);
        console.log('🔧 [UnifiedDataTable] 筛选菜单状态已更新:', { from: filterMenuOpen, to: column });
    }, [filterMenuOpen]);

    const handleFilterSearchChange = useCallback((text: string) => {
        // 避免重复设置相同的搜索文本
        if (filterSearchText !== text) {
            setFilterSearchText(text);
            console.log('🔧 [UnifiedDataTable] 筛选搜索文本变化:', { from: filterSearchText, to: text });
        }
    }, [filterSearchText]);

    // 全局鼠标事件监听 - 处理表格外的鼠标释放
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isSelecting) {
                setIsSelecting(false);
                stopAutoScroll(); // 停止自动滚动
                console.log('🔧 [UnifiedDataTable] 全局鼠标释放，结束选择');
            }
        };

        const handleGlobalMouseMove = (event: MouseEvent) => {
            if (isSelecting && selectionStart) {
                // 全局鼠标移动时也处理自动滚动
                const mouseX = event.clientX;
                const mouseY = event.clientY;

                stopAutoScroll();
                startAutoScroll(mouseX, mouseY);
            }
        };

        document.addEventListener('mouseup', handleGlobalMouseUp);
        document.addEventListener('mousemove', handleGlobalMouseMove);

        return () => {
            document.removeEventListener('mouseup', handleGlobalMouseUp);
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            stopAutoScroll(); // 组件卸载时停止滚动
        };
    }, [isSelecting, selectionStart, stopAutoScroll, startAutoScroll]);

    // 同步外部分页配置
    useEffect(() => {
        if (pagination) {
            if (currentPage !== pagination.current) {
                setCurrentPage(pagination.current);
            }
            if (pageSize !== pagination.pageSize) {
                setPageSize(pagination.pageSize);
                // 检查是否为"全部"模式
                setIsShowingAll(pagination.pageSize >= pagination.total);
            }
        }
    }, [
        pagination && pagination.current,
        pagination && pagination.pageSize,
        pagination && pagination.total,
        pagination && pagination.pageSizeOptions
    ]);

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
    const handleAddFilter = useCallback((column: string, value: string) => {
        console.log('🔧 [UnifiedDataTable] 添加筛选:', { column, value });

        if (!value || value.trim() === '') {
            // 清除筛选
            setFilters(prev => prev.filter(f => f.column !== column));
            console.log('🔧 [UnifiedDataTable] 清除筛选:', { column });
        } else {
            // 添加或更新筛选
            const filterValues = value.split('|').filter(v => v.trim() !== '');
            setFilters(prev => {
                const newFilters = prev.filter(f => f.column !== column);
                newFilters.push({
                    column,
                    value: filterValues.join('|'),
                    operator: 'in' // 使用in操作符支持多值筛选
                });
                return newFilters;
            });
            console.log('🔧 [UnifiedDataTable] 应用筛选:', { column, filterValues });
        }
    }, []);

    // 数据筛选处理
    const filteredData = useMemo(() => {
        if (filters.length === 0) {
            return data;
        }

        console.log('🔧 [UnifiedDataTable] 开始数据筛选:', {
            totalRows: data.length,
            filterCount: filters.length,
            filters: filters.map(f => ({ column: f.column, operator: f.operator, valueCount: f.value.split('|').length }))
        });

        const startTime = performance.now();

        const filtered = data.filter(row => {
            return filters.every(filter => {
                const cellValue = row[filter.column];
                const displayValue = filter.column === 'time' && cellValue
                    ? new Date(cellValue).toLocaleString()
                    : String(cellValue || '');

                if (filter.operator === 'in') {
                    // 多值筛选：检查单元格值是否在筛选值列表中
                    const filterValues = filter.value.split('|');
                    const matches = filterValues.includes(displayValue);
                    return matches;
                } else {
                    // 默认包含筛选
                    return displayValue.toLowerCase().includes(filter.value.toLowerCase());
                }
            });
        });

        const endTime = performance.now();
        console.log('🔧 [UnifiedDataTable] 数据筛选完成:', {
            originalRows: data.length,
            filteredRows: filtered.length,
            duration: `${(endTime - startTime).toFixed(2)}ms`
        });

        return filtered;
    }, [data, filters]);

    // 判断是否启用虚拟化 - 使用筛选后的数据量
    const shouldUseVirtualization = useMemo(() => {
        if (virtualized !== undefined) {
            return virtualized; // 如果明确指定，使用指定值
        }

        // 自动判断：数据量大于1000条时始终启用虚拟化
        // 无论分页选择什么选项，都保持虚拟化以确保最佳用户体验
        return filteredData.length > 1000;
    }, [virtualized, filteredData.length]);

    // 计算分页数据 - 使用筛选后的数据
    const paginatedData = useMemo(() => {
        if (!pagination) {
            return filteredData; // 如果没有分页配置，返回所有筛选后的数据
        }

        // 如果启用虚拟化，根据分页选项决定显示的数据
        if (shouldUseVirtualization) {
            // 如果选择了"全部"或pageSize大于等于数据总量，显示所有数据
            if (pageSize === -1 || pageSize >= filteredData.length) {
                return filteredData;
            }

            // 否则进行客户端分页，虚拟化会处理可见区域的渲染
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            return filteredData.slice(startIndex, endIndex);
        }

        // 传统模式的分页处理
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        // 如果pageSize大于等于总数据量，返回所有数据
        if (pageSize >= filteredData.length) {
            return filteredData;
        }

        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, currentPage, pageSize, pagination, shouldUseVirtualization]);



    // 处理分页
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
        onPageChange?.(page, pageSize);
    }, [pageSize, onPageChange]);

    const handlePageSizeChange = useCallback((size: string) => {
        console.log('handlePageSizeChange called with:', size);
        if (size === 'all') {
            const totalSize = pagination ? pagination.total : data.length;
            console.log('Setting page size to total:', totalSize);
            setPageSize(totalSize);
            setCurrentPage(1);
            setIsShowingAll(true); // 标记为用户主动选择"全部"
            onPageChange?.(1, totalSize);
        } else {
            const newSize = parseInt(size);
            console.log('Setting page size to:', newSize);
            setPageSize(newSize);
            setCurrentPage(1);
            setIsShowingAll(false); // 标记为非"全部"模式
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
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    console.log('🔧 [UnifiedDataTable] 列管理按钮被点击:', {
                                                        selectedColumns,
                                                        columnOrder,
                                                        columns: columns.map(col => ({ key: col.key, title: col.title }))
                                                    });
                                                }}
                                            >
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
                                                                // 取消全选，但至少保留一列
                                                                handleColumnChange([allColumns[0]], columnOrder);
                                                            } else {
                                                                // 全选
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
                                                                        console.log('🔧 [UnifiedDataTable] Checkbox点击:', {
                                                                            columnKey,
                                                                            checked,
                                                                            currentSelectedColumns: selectedColumns
                                                                        });
                                                                        if (checked) {
                                                                            handleColumnChange([...selectedColumns, columnKey], columnOrder);
                                                                        } else {
                                                                            // 至少保留一列
                                                                            if (selectedColumns.length > 1) {
                                                                                handleColumnChange(selectedColumns.filter(col => col !== columnKey), columnOrder);
                                                                            } else {
                                                                                console.log('🔧 [UnifiedDataTable] 阻止取消最后一列');
                                                                            }
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

            {/* 数据表格 */}
            <div className="flex-1 min-h-0 p-4">
                <div className="h-full border rounded-md overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Spin />
                            <span className="ml-2">加载中...</span>
                        </div>
                    ) : data.length > 0 ? (
                        // 统一使用虚拟化表格 - 使用flex-1自适应高度
                        <div
                            className="flex-1 min-h-0 virtualized-table"
                            ref={tableContainerRef}
                        >
                                <TableVirtuoso
                                    ref={virtuosoRef}
                                    data={paginatedData}
                                    fixedHeaderContent={() => (
                                        <TableHeader
                                            columnOrder={columnOrder}
                                            selectedColumns={selectedColumns}
                                            sortColumn={sortConfig?.column || ''}
                                            sortDirection={sortConfig?.direction || 'asc'}
                                            selectedRowsCount={selectedRows.size}
                                            totalRowsCount={filteredData.length}
                                            showRowNumbers={showRowNumbers}
                                            onSort={handleSort}
                                            onAddFilter={handleAddFilter}
                                            onSelectAll={handleSelectAll}
                                            onCopySelectedRows={handleCopySelectedRows}
                                            onColumnSelect={handleColumnSelect}
                                            // Excel风格筛选相关
                                            filterMenuOpen={filterMenuOpen}
                                            filterSearchText={filterSearchText}
                                            onFilterMenuOpenChange={handleFilterMenuOpenChange}
                                            onFilterSearchChange={handleFilterSearchChange}
                                            loadColumnUniqueValues={loadColumnUniqueValues}
                                            getFilteredUniqueValues={getFilteredUniqueValues}
                                            isLoadingColumn={loadingColumn}
                                            virtualMode={true}
                                        />
                                    )}
                                    itemContent={(index, row) => (
                                        <>
                                            {/* 固定的序号列 */}
                                            {showRowNumbers && (() => {
                                                const cellId = `${index}-#`;
                                                return (
                                                <td
                                                    data-column="#"
                                                    data-column-index="0"
                                                    className={cn(
                                                        "px-4 py-2 text-sm font-mono w-16 virtualized-sticky-cell text-center text-muted-foreground table-cell-selectable",
                                                        selectedCell === cellId && "table-cell-selected"
                                                    )}
                                                >
                                                    <div className="truncate w-full">
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                );
                                            })()}
                                            {/* 数据列 */}
                                            {columnOrder.filter(column => selectedColumns.includes(column)).map((column, colIndex) => {
                                                const columnConfig = columns.find(col => col.key === column);
                                                const value = row[column];
                                                const width = columnConfig?.width || 120;
                                                const cellId = `${index}-${column}`;
                                                const isEditing = editingCell === cellId;

                                                // 格式化显示值
                                                const displayValue = columnConfig?.render
                                                    ? columnConfig.render(value, row, index)
                                                    : column === 'time' && value
                                                        ? new Date(value).toLocaleString()
                                                        : String(value || '-');

                                                return (
                                                    <td
                                                        key={`${index}-${column}-${colIndex}`}
                                                        data-column={column}
                                                        data-column-index={colIndex + 1}
                                                        className={cn(
                                                            "px-4 py-2 text-sm font-mono border-r table-cell-selectable",
                                                            selectedCell === cellId && !isEditing && selectedCellRange.size <= 1 && "table-cell-selected",
                                                            selectedCellRange.has(cellId) && selectedCellRange.size > 1 && "table-cell-range-selected",
                                                            isEditing && "table-cell-editing"
                                                        )}
                                                        style={{
                                                            width: `${width}px`,
                                                            minWidth: `${width}px`,
                                                            maxWidth: `${width}px`
                                                        }}
                                                        title={String(displayValue || '')}
                                                    >
                                                        {/* 暂时注释掉编辑功能以提升性能 */}
                                                        {/* {isEditing ? (
                                                            <input
                                                                ref={editingInputRef}
                                                                type="text"
                                                                defaultValue={String(value || '')}
                                                                onBlur={handleEditComplete}
                                                                onKeyDown={handleEditKeyDown}
                                                            />
                                                        ) : ( */}
                                                            <div className="truncate w-full">
                                                                {displayValue}
                                                            </div>
                                                        {/* )} */}
                                                    </td>
                                                );
                                            })}
                                        </>
                                    )}
                                    style={{
                                        height: '100%',
                                        width: '100%'
                                    }}
                                    className="table-unified-scroll"
                                    components={{
                                        Table: ({ style, ...props }) => (
                                            <table
                                                {...props}
                                                style={{
                                                    ...style,
                                                    width: '100%',
                                                    borderCollapse: 'collapse'
                                                }}
                                                className={cn(
                                                    "w-full border-collapse table-unified-scroll",
                                                    isSelecting && "table-selecting"
                                                )}
                                                onMouseDown={handleTableMouseDown}
                                                onMouseMove={handleTableMouseMove}
                                                onMouseUp={handleTableMouseUp}
                                                onClick={handleTableClick}
                                                onDoubleClick={handleTableDoubleClick}
                                            />
                                        ),

                                        TableRow: ({ style, ...props }) => {
                                            // 从props中提取行索引
                                            const rowIndex = props['data-index'] || 0;
                                            return (
                                                <tr
                                                    {...props}
                                                    data-row-index={rowIndex}
                                                    style={{
                                                        ...style
                                                    }}
                                                    className={cn(
                                                        "border-b transition-colors hover:bg-muted/50",
                                                        selectedRows.has(rowIndex) && "table-row-selected"
                                                    )}
                                                />
                                            );
                                        }
                                    }}
                                />
                            </div>

                    ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <Database className="w-8 h-8 mr-2" />
                            <span>没有找到数据</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 底部分页 - 始终显示分页控件 */}
            {pagination && (
                <PaginationControls
                    currentPage={pagination.current}
                    pageSize={pagination.pageSize}
                    totalCount={pagination.total}
                    loading={loading}
                    pageSizeOptions={pagination.pageSizeOptions}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}
        </div>
    );
};

export { TableHeader, PaginationControls };
