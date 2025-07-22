/**
 * 高级数据表格组件
 * 基于TableDataBrowser的功能，提供通用的高级表格功能
 * 支持筛选、排序、分页、列管理、搜索、导出等功能
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
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
import { Spin } from '@/components/ui/Spin';
import {
  Search,
  Filter,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  Database,
} from 'lucide-react';

// 数据行类型
export interface DataRow {
  [key: string]: any;
  _id?: string | number;
}

// 列配置
export interface ColumnConfig {
  key: string;
  title: string;
  dataType?: 'string' | 'number' | 'date' | 'boolean';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
}

// 筛选器类型
export interface TableFilter {
  column: string;
  operator: string;
  value: string;
  dataType: string;
}

// 排序配置
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

// 分页配置
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: string[];
}

// 组件属性
export interface AdvancedDataTableProps {
  data: DataRow[];
  columns: ColumnConfig[];
  loading?: boolean;
  pagination?: PaginationConfig | false;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  exportable?: boolean;
  columnManagement?: boolean;
  showToolbar?: boolean; // 是否显示工具栏
  className?: string;
  onSearch?: (searchText: string) => void;
  onFilter?: (filters: TableFilter[]) => void;
  onSort?: (sort: SortConfig | null) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onExport?: (format: string) => void;
  onColumnChange?: (visibleColumns: string[], columnOrder: string[]) => void;
}

// 筛选器编辑组件
const FilterEditor: React.FC<{
  filter: TableFilter;
  availableOperators: { value: string; label: string }[];
  onUpdate: (filter: TableFilter) => void;
  onRemove: () => void;
}> = ({ filter, availableOperators, onUpdate, onRemove }) => {
  const handleOperatorChange = (operator: string) => {
    onUpdate({ ...filter, operator });
  };

  const handleValueChange = (value: string) => {
    onUpdate({ ...filter, value });
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
      <Badge variant="outline" className="text-xs px-2 py-1">
        {filter.column}
      </Badge>

      <Select value={filter.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-20 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map(op => (
            <SelectItem key={op.value} value={op.value} className="text-xs">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={filter.value}
        onChange={(e) => handleValueChange(e.target.value)}
        placeholder="筛选值"
        className="h-7 text-xs flex-1"
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
      >
        ×
      </Button>
    </div>
  );
};

// 列管理组件
const ColumnManager: React.FC<{
  columns: ColumnConfig[];
  visibleColumns: string[];
  columnOrder: string[];
  onColumnToggle: (columnKey: string) => void;
  onColumnOrderChange: (newOrder: string[]) => void;
}> = ({ columns, visibleColumns, onColumnToggle }) => {
  return (
    <div className="space-y-2 max-h-64 overflow-auto">
      {columns.map(column => (
        <div key={column.key} className="flex items-center gap-2 p-2 hover:bg-accent rounded">
          <Checkbox
            checked={visibleColumns.includes(column.key)}
            onCheckedChange={() => onColumnToggle(column.key)}
          />
          <span className="flex-1 text-sm">{column.title}</span>
          {column.key === 'time' && (
            <Badge variant="secondary" className="text-xs">时间</Badge>
          )}
        </div>
      ))}
    </div>
  );
};

// 获取可用的操作符
const getAvailableOperators = (dataType: string) => {
  const operators = {
    string: [
      { value: 'equals', label: '等于' },
      { value: 'not_equals', label: '不等于' },
      { value: 'contains', label: '包含' },
      { value: 'not_contains', label: '不包含' },
      { value: 'starts_with', label: '开始于' },
      { value: 'ends_with', label: '结束于' },
    ],
    number: [
      { value: 'equals', label: '等于' },
      { value: 'not_equals', label: '不等于' },
      { value: 'greater_than', label: '大于' },
      { value: 'less_than', label: '小于' },
      { value: 'greater_equal', label: '大于等于' },
      { value: 'less_equal', label: '小于等于' },
    ],
    date: [
      { value: 'equals', label: '等于' },
      { value: 'not_equals', label: '不等于' },
      { value: 'after', label: '晚于' },
      { value: 'before', label: '早于' },
      { value: 'between', label: '介于' },
    ],
    boolean: [
      { value: 'equals', label: '等于' },
      { value: 'not_equals', label: '不等于' },
    ],
  };

  return operators[dataType as keyof typeof operators] || operators.string;
};

// 检测列数据类型
const detectColumnDataType = (columnKey: string, data: DataRow[]): string => {
  if (columnKey === 'time') return 'date';
  if (columnKey === '#') return 'number';

  // 检查前几行数据来推断类型
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const value = data[i][columnKey];
    if (value !== null && value !== undefined) {
      if (typeof value === 'number') return 'number';
      if (typeof value === 'boolean') return 'boolean';
      if (typeof value === 'string' && !isNaN(Date.parse(value))) return 'date';
    }
  }

  return 'string';
};

export const AdvancedDataTable: React.FC<AdvancedDataTableProps> = ({
  data,
  columns,
  loading = false,
  pagination = { current: 1, pageSize: 50, total: 0 },
  searchable = true,
  filterable = true,
  sortable = true,
  exportable = true,
  columnManagement = true,
  showToolbar = true, // 默认显示工具栏
  className,
  onSearch,
  onFilter,
  onSort,
  onPageChange,
  onExport,
  onColumnChange,
}) => {
  // 状态管理
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<TableFilter[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  
  // 分页状态管理 - 内部状态用于处理分页逻辑
  const [internalPagination, setInternalPagination] = useState<PaginationConfig>(() => {
    const dataLength = data?.length || 0;
    if (pagination === false) {
      return { current: 1, pageSize: dataLength || 50, total: dataLength };
    }
    if (!pagination || typeof pagination !== 'object') {
      return { current: 1, pageSize: 50, total: dataLength };
    }
    return {
      current: pagination.current || 1,
      pageSize: pagination.pageSize || 50,
      total: pagination.total || dataLength,
      showSizeChanger: pagination.showSizeChanger !== false,
      pageSizeOptions: pagination.pageSizeOptions || ['20', '50', '100', '200', '500']
    };
  });

  // 数据处理：搜索、筛选、排序
  const processedData = useMemo(() => {
    let result = [...(data || [])];

    // 搜索过滤
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value || '').toLowerCase().includes(searchLower)
        )
      );
    }

    // 筛选器过滤
    if (filters.length > 0) {
      result = result.filter(row => {
        return filters.every(filter => {
          const value = row[filter.column];
          const filterValue = filter.value.toLowerCase();
          const rowValue = String(value || '').toLowerCase();

          switch (filter.operator) {
            case 'equals':
              return rowValue === filterValue;
            case 'not_equals':
              return rowValue !== filterValue;
            case 'contains':
              return rowValue.includes(filterValue);
            case 'not_contains':
              return !rowValue.includes(filterValue);
            case 'starts_with':
              return rowValue.startsWith(filterValue);
            case 'ends_with':
              return rowValue.endsWith(filterValue);
            case 'greater_than':
              return parseFloat(String(value)) > parseFloat(filter.value);
            case 'less_than':
              return parseFloat(String(value)) < parseFloat(filter.value);
            case 'greater_equal':
              return parseFloat(String(value)) >= parseFloat(filter.value);
            case 'less_equal':
              return parseFloat(String(value)) <= parseFloat(filter.value);
            default:
              return true;
          }
        });
      });
    }

    // 排序
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.column];
        const bValue = b[sortConfig.column];

        // 处理null/undefined值
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // 时间列特殊排序
        if (sortConfig.column === 'time' || (typeof aValue === 'string' && aValue.includes('T') && aValue.includes('Z'))) {
          const aTime = new Date(aValue).getTime();
          const bTime = new Date(bValue).getTime();
          if (!isNaN(aTime) && !isNaN(bTime)) {
            const result = aTime - bTime;
            return sortConfig.direction === 'asc' ? result : -result;
          }
        }

        // 数字排序
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          const result = aValue - bValue;
          return sortConfig.direction === 'asc' ? result : -result;
        }

        // 字符串排序
        const result = String(aValue).localeCompare(String(bValue));
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }

    return result;
  }, [data, searchText, filters, sortConfig]);

  // 初始化可见列
  useEffect(() => {
    const defaultVisible = columns.filter(col => col.visible !== false).map(col => col.key);
    setVisibleColumns(defaultVisible);
    setColumnOrder(columns.map(col => col.key));
  }, [columns]);

  // 同步外部分页状态变化
  useEffect(() => {
    if (pagination !== false && pagination && typeof pagination === 'object') {
      setInternalPagination(prev => ({
        ...prev,
        current: pagination.current || 1,
        pageSize: pagination.pageSize || 50,
        total: pagination.total || processedData.length,
        showSizeChanger: pagination.showSizeChanger !== false,
        pageSizeOptions: pagination.pageSizeOptions || ['20', '50', '100', '200', '500']
      }));
    }
  }, [pagination, processedData.length]);

  // 分页数据
  const paginatedData = useMemo(() => {
    if (pagination === false) {
      return processedData;
    }

    // 如果页面大小大于等于总数据量，返回所有数据（"全部"选项）
    if (internalPagination.pageSize >= processedData.length) {
      return processedData;
    }

    const startIndex = (internalPagination.current - 1) * internalPagination.pageSize;
    const endIndex = startIndex + internalPagination.pageSize;
    return processedData.slice(startIndex, endIndex);
  }, [processedData, internalPagination.current, internalPagination.pageSize, pagination]);

  // 处理搜索
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    
    // 搜索时重置到第一页
    setInternalPagination(prev => ({
      ...prev,
      current: 1
    }));
    
    if (onSearch) {
      onSearch(value);
    }
  }, [onSearch]);

  // 处理排序
  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable && !sortable) return;

    let newSort: SortConfig | null = null;
    
    if (sortConfig?.column === columnKey) {
      // 切换排序方向：asc -> desc -> null
      if (sortConfig.direction === 'asc') {
        newSort = { column: columnKey, direction: 'desc' };
      } else {
        newSort = null; // 取消排序
      }
    } else {
      // 新列排序，默认降序
      newSort = { column: columnKey, direction: 'desc' };
    }

    setSortConfig(newSort);
    if (onSort) {
      onSort(newSort);
    }
  }, [sortConfig, columns, sortable, onSort]);

  // 添加筛选器
  const addFilter = useCallback((columnKey: string) => {
    const dataType = detectColumnDataType(columnKey, data);
    const availableOperators = getAvailableOperators(dataType);
    const defaultOperator = availableOperators[0]?.value || 'equals';

    const newFilter: TableFilter = {
      column: columnKey,
      operator: defaultOperator,
      value: '',
      dataType,
    };

    const newFilters = [...filters, newFilter];
    setFilters(newFilters);
    
    // 添加筛选器时重置到第一页
    setInternalPagination(prev => ({
      ...prev,
      current: 1
    }));
    
    if (onFilter) {
      onFilter(newFilters);
    }
  }, [filters, data, onFilter]);

  // 更新筛选器
  const updateFilter = useCallback((index: number, updatedFilter: TableFilter) => {
    const newFilters = [...filters];
    newFilters[index] = updatedFilter;
    setFilters(newFilters);
    
    // 更新筛选器时重置到第一页
    setInternalPagination(prev => ({
      ...prev,
      current: 1
    }));
    
    if (onFilter) {
      onFilter(newFilters);
    }
  }, [filters, onFilter]);

  // 移除筛选器
  const removeFilter = useCallback((index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    
    // 移除筛选器时重置到第一页
    setInternalPagination(prev => ({
      ...prev,
      current: 1
    }));
    
    if (onFilter) {
      onFilter(newFilters);
    }
  }, [filters, onFilter]);

  // 切换列可见性
  const toggleColumn = useCallback((columnKey: string) => {
    const newVisible = visibleColumns.includes(columnKey)
      ? visibleColumns.filter(key => key !== columnKey)
      : [...visibleColumns, columnKey];
    
    setVisibleColumns(newVisible);
    
    if (onColumnChange) {
      onColumnChange(newVisible, columnOrder);
    }
  }, [visibleColumns, columnOrder, onColumnChange]);

  // 处理分页变化
  const handlePageChange = useCallback((page: number, pageSize?: number) => {
    const newPageSize = pageSize || internalPagination.pageSize;
    let newPage = page;
    
    // 当页面大小改变时，重置到第一页
    if (pageSize && pageSize !== internalPagination.pageSize) {
      newPage = 1;
    }
    
    const newPagination = {
      ...internalPagination,
      current: newPage,
      pageSize: newPageSize,
      total: processedData.length
    };
    
    setInternalPagination(newPagination);
    
    // 调用外部回调
    if (onPageChange) {
      onPageChange(newPagination.current, newPagination.pageSize);
    }
  }, [internalPagination, processedData.length, onPageChange]);

  // 处理页面大小变化
  const handlePageSizeChange = useCallback((newPageSize: number) => {
    handlePageChange(1, newPageSize);
  }, [handlePageChange]);

  // 渲染排序图标
  const renderSortIcon = (columnKey: string) => {
    if (!sortable && !columns.find(col => col.key === columnKey)?.sortable) return null;

    if (sortConfig?.column === columnKey) {
      return sortConfig.direction === 'asc' 
        ? <ChevronUp className="w-4 h-4 ml-1 text-primary" />
        : <ChevronDown className="w-4 h-4 ml-1 text-primary" />;
    }

    return <ChevronUp className="w-4 h-4 ml-1 text-muted-foreground opacity-0 group-hover:opacity-100" />;
  };

  // 计算分页信息
  const paginationInfo = useMemo(() => {
    if (pagination === false) {
      return {
        current: 1,
        pageSize: processedData.length,
        total: processedData.length,
        totalPages: 1,
        startIndex: 1,
        endIndex: processedData.length,
        showSizeChanger: false,
        pageSizeOptions: []
      };
    }

    const total = processedData.length; // 使用处理后的数据长度
    const totalPages = Math.ceil(total / internalPagination.pageSize);
    const startIndex = (internalPagination.current - 1) * internalPagination.pageSize + 1;
    const endIndex = Math.min(internalPagination.current * internalPagination.pageSize, total);

    return {
      ...internalPagination,
      total, // 更新总数
      totalPages,
      startIndex,
      endIndex,
    };
  }, [internalPagination, processedData.length, pagination]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 工具栏 - 根据showToolbar控制显示 */}
      {showToolbar && (
        <Card className="flex-shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* 搜索框 */}
                {searchable && (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索数据..."
                      value={searchText}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                )}

                {/* 筛选按钮 */}
                {filterable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        筛选
                        {filters.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {filters.length}
                          </Badge>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {visibleColumns.map(columnKey => {
                        const column = columns.find(col => col.key === columnKey);
                        if (!column || column.filterable === false) return null;

                        return (
                          <DropdownMenuItem
                            key={columnKey}
                            onClick={() => addFilter(columnKey)}
                          >
                            添加 {column.title} 筛选
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* 列管理 */}
                {columnManagement && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        列设置
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <ColumnManager
                        columns={columns}
                        visibleColumns={visibleColumns}
                        columnOrder={columnOrder}
                        onColumnToggle={toggleColumn}
                        onColumnOrderChange={setColumnOrder}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* 导出按钮 */}
                {exportable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        导出
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onExport?.('csv')}>
                        导出为 CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport?.('excel')}>
                        导出为 Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport?.('json')}>
                        导出为 JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>

          {/* 筛选器显示区域 */}
          {filters.length > 0 && (
            <CardContent className="pt-0 pb-3">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  筛选条件 ({filters.length})
                </div>
                <div className="space-y-2">
                  {filters.map((filter, index) => (
                    <FilterEditor
                      key={index}
                      filter={filter}
                      availableOperators={getAvailableOperators(filter.dataType)}
                      onUpdate={(updatedFilter) => updateFilter(index, updatedFilter)}
                      onRemove={() => removeFilter(index)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 表格区域 */}
      <div className="flex-1 min-h-0 p-4">
        <div className="h-full border rounded-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Spin />
              <span className="ml-2">加载中...</span>
            </div>
          ) : processedData.length > 0 ? (
            <div className="h-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="sticky top-0 bg-background z-10 border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    {columnOrder
                      .filter(columnKey => visibleColumns.includes(columnKey))
                      .map((columnKey) => {
                        const column = columns.find(col => col.key === columnKey);
                        if (!column) return null;

                        const canSort = sortable && (column.sortable !== false);

                        return (
                          <th
                            key={columnKey}
                            className={cn(
                              'h-12 px-4 text-left align-middle font-medium text-muted-foreground group',
                              canSort && 'cursor-pointer hover:bg-muted/50',
                              column.width && `w-${column.width}`
                            )}
                            onClick={() => canSort && handleSort(columnKey)}
                          >
                            <div className="flex items-center">
                              <span>{column.title}</span>
                              {renderSortIcon(columnKey)}
                            </div>
                          </th>
                        );
                      })}
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {paginatedData.map((row, index) => (
                    <tr
                      key={row._id ? `${row._id}-${index}` : `row-${index}`}
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      {columnOrder
                        .filter(columnKey => visibleColumns.includes(columnKey))
                        .map((columnKey) => {
                          const column = columns.find(col => col.key === columnKey);
                          if (!column) return null;

                          const value = row[columnKey];
                          
                          return (
                            <td
                              key={columnKey}
                              className={cn(
                                'p-4 align-middle text-xs',
                                columnKey === '#' 
                                  ? 'font-medium text-muted-foreground bg-muted/20 text-center'
                                  : 'font-mono'
                              )}
                            >
                              {columnKey === '#' 
                                ? value
                                : columnKey === 'time' && value
                                ? new Date(value).toLocaleString()
                                : String(value || '-')
                              }
                            </td>
                          );
                        })}
                    </tr>
                  ))}
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

      {/* 分页区域 */}
      {pagination !== false && paginationInfo.total > 0 && (
        <div className="flex-shrink-0 border-t bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {paginationInfo.pageSize >= paginationInfo.total 
                  ? `显示全部 ${paginationInfo.total} 条数据` 
                  : `显示 ${paginationInfo.startIndex}-${paginationInfo.endIndex} 条，共 ${paginationInfo.total} 条`
                }
              </span>
              
              {paginationInfo.showSizeChanger && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">每页显示</span>
                  <Select 
                    value={paginationInfo.pageSize === processedData.length && processedData.length > 500 ? 'all' : paginationInfo.pageSize.toString()} 
                    onValueChange={(value) => {
                      if (value === 'all') {
                        handlePageSizeChange(processedData.length);
                      } else {
                        handlePageSizeChange(parseInt(value));
                      }
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(paginationInfo.pageSizeOptions || ['20', '50', '100', '200', '500']).map(option => {
                        if (option === '全部' || option === 'all') {
                          return (
                            <SelectItem key="all" value="all">
                              全部
                            </SelectItem>
                          );
                        }
                        return (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">条</span>
                </div>
              )}
            </div>

            {paginationInfo.pageSize < paginationInfo.total && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.current - 1)}
                  disabled={paginationInfo.current <= 1 || loading}
                  className="h-8 px-3"
                >
                  <ChevronLeft className="w-3 h-3" />
                  上一页
                </Button>

                <span className="text-sm text-muted-foreground px-2">
                  第 {paginationInfo.current} 页，共 {paginationInfo.totalPages} 页
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(paginationInfo.current + 1)}
                  disabled={paginationInfo.current >= paginationInfo.totalPages || loading}
                  className="h-8 px-3"
                >
                  下一页
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedDataTable;
