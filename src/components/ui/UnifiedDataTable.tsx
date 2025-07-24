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
                        <div className="flex items-center gap-1">
                            <span className="text-xs">#</span>
                            <Badge variant="outline" className="text-xs">
                                序号
                            </Badge>
                        </div>
                    </th>
                )}
                
                {/* 数据列表头 */}
                {(() => {
                    const visibleColumns = columnOrder.filter(column => selectedColumns.includes(column));
                    return visibleColumns;
                })().map((column) => {
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
                                'px-3 py-2 text-left align-middle font-medium whitespace-nowrap border-r border-b-2',
                                'text-xs text-muted-foreground bg-muted cursor-pointer hover:bg-muted/80'
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
                <Select value={isShowingAll ? 'all' : pageSize.toString()} onValueChange={onPageSizeChange}>
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
    const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // refs
    const tableScrollRef = useRef<HTMLDivElement>(null);

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
        const container = tableContainerRef.current || tableScrollRef.current;
        if (!container) return;

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
            container.scrollBy(scrollX, scrollY);

            // 继续自动滚动
            autoScrollTimerRef.current = setTimeout(() => {
                startAutoScroll(mouseX, mouseY);
            }, 16); // 约60fps

            console.log('🔧 [UnifiedDataTable] 自动滚动:', { scrollX, scrollY, mouseX, mouseY });
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

    // 判断是否启用虚拟化
    const shouldUseVirtualization = useMemo(() => {
        if (virtualized !== undefined) {
            return virtualized; // 如果明确指定，使用指定值
        }

        // 自动判断：数据量大于1000条时始终启用虚拟化
        // 无论分页选择什么选项，都保持虚拟化以确保最佳用户体验
        return data.length > 1000;
    }, [virtualized, data.length]);

    // 计算分页数据
    const paginatedData = useMemo(() => {
        if (!pagination) {
            return data; // 如果没有分页配置，返回所有数据
        }

        // 如果启用虚拟化，根据分页选项决定显示的数据
        if (shouldUseVirtualization) {
            // 如果选择了"全部"或pageSize大于等于数据总量，显示所有数据
            if (pageSize === -1 || pageSize >= data.length) {
                return data;
            }

            // 否则进行客户端分页，虚拟化会处理可见区域的渲染
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            return data.slice(startIndex, endIndex);
        }

        // 传统模式的分页处理
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;

        // 如果pageSize大于等于总数据量，返回所有数据
        if (pageSize >= data.length) {
            return data;
        }

        return data.slice(startIndex, endIndex);
    }, [data, currentPage, pageSize, pagination, shouldUseVirtualization]);



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
                        shouldUseVirtualization ? (
                            // 虚拟化表格 - 使用flex-1自适应高度
                            <div
                                className="flex-1 min-h-0 virtualized-table"
                                ref={tableContainerRef}
                            >
                                <TableVirtuoso
                                    data={paginatedData}
                                    fixedHeaderContent={() => (
                                        <tr>
                                            {/* 序号列表头 */}
                                            {showRowNumbers && (() => {
                                                return (
                                                <th className="px-4 py-2 text-left align-middle font-medium text-sm text-muted-foreground bg-muted border-b-2 border-r w-16 virtualized-sticky-header">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs">#</span>
                                                        <Badge variant="outline" className="text-xs">序号</Badge>
                                                    </div>
                                                </th>
                                                );
                                            })()}

                                            {/* 数据列表头 */}
                                            {(() => {
                                                const visibleColumns = columnOrder.filter(column => selectedColumns.includes(column));
                                                return visibleColumns;
                                            })().map((column) => {
                                                const getColumnMinWidth = (col: string) => {
                                                    if (col === 'time') return '180px';
                                                    const colLength = col.length;
                                                    return `${Math.max(120, colLength * 12)}px`;
                                                };
                                                const minWidth = getColumnMinWidth(column);

                                                return (
                                                    <th
                                                        key={column}
                                                        className="px-4 py-2 text-left align-middle font-medium text-sm text-muted-foreground bg-muted border-b-2 border-r cursor-pointer hover:bg-muted/80"
                                                        style={{ minWidth }}
                                                        onClick={() => handleSort(column)}
                                                    >
                                                        <div className="flex items-center gap-1 whitespace-nowrap">
                                                            <span className="truncate" title={column}>{column}</span>
                                                            {column === 'time' && (
                                                                <Badge variant="secondary" className="text-xs">时间</Badge>
                                                            )}
                                                            {sortConfig?.column === column && (
                                                                <span className="text-xs">
                                                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
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
                                                        key={column}
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
                            // 传统表格
                            <div
                                className="table-unified-scroll"
                                ref={(el) => {
                                    if (tableScrollRef.current !== el) {
                                        (tableScrollRef as any).current = el;
                                    }
                                    if (tableContainerRef.current !== el) {
                                        (tableContainerRef as any).current = el;
                                    }
                                }}
                            >
                                <table
                                    className={cn(
                                        "w-full border-collapse",
                                        isSelecting && "table-selecting"
                                    )}
                                    onMouseDown={handleTableMouseDown}
                                    onMouseMove={handleTableMouseMove}
                                    onMouseUp={handleTableMouseUp}
                                    onClick={handleTableClick}
                                    onDoubleClick={handleTableDoubleClick}
                                >
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
                                                data-row-index={actualIndex}
                                                className={cn(
                                                    "border-b transition-colors hover:bg-muted/50",
                                                    selectedRows.has(actualIndex) && "table-row-selected"
                                                )}
                                            >
                                                {/* 固定的序号列 */}
                                                {showRowNumbers && (
                                                    <td
                                                        data-column="#"
                                                        data-column-index="0"
                                                        className={cn(
                                                            "px-4 py-2 text-sm font-mono w-16 sticky text-center text-muted-foreground table-cell-selectable",
                                                            selectedCell === `${actualIndex}-#` && "table-cell-selected"
                                                        )}
                                                    >
                                                        <div className="truncate w-full">
                                                            {actualIndex + 1}
                                                        </div>
                                                    </td>
                                                )}
                                                {/* 数据列 */}
                                                {columnOrder.filter(column => selectedColumns.includes(column)).map((column, colIndex) => {
                                                    const columnConfig = columns.find(col => col.key === column);
                                                    const value = row[column];
                                                    const width = columnConfig?.width || 120;
                                                    const cellId = `${actualIndex}-${column}`;
                                                    const isEditing = editingCell === cellId;

                                                    // 格式化显示值
                                                    const displayValue = columnConfig?.render
                                                        ? columnConfig.render(value, row, actualIndex)
                                                        : column === 'time' && value
                                                            ? new Date(value).toLocaleString()
                                                            : String(value || '-');

                                                    return (
                                                        <td
                                                            key={column}
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
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
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
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            )}
        </div>
    );
};

export { TableHeader, PaginationControls };
