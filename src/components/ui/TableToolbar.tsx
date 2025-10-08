/**
 * 统一的表格工具栏组件
 * 提供表格标题、行数统计、导出功能等通用功能
 */

import React from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    Button,
    Badge,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui';
import {
    Download,
    ChevronDown,
    FileText,
    Settings,
    Table as TableIcon,
    RefreshCw,
    Copy,
    Code,
    FileSpreadsheet,
    Database,
} from 'lucide-react';

export type CopyFormat = 'text' | 'insert' | 'markdown' | 'json' | 'csv';

export interface TableToolbarProps {
    title: string;
    icon?: React.ReactNode;
    rowCount: number;
    loading?: boolean;
    showRefresh?: boolean;
    onRefresh?: () => void;
    onQuickExportCSV?: () => void;
    onAdvancedExport?: () => void;
    // 复制功能相关
    showCopy?: boolean;
    onCopy?: (format: CopyFormat) => void;
    className?: string;
    children?: React.ReactNode; // 用于添加额外的工具栏内容
    // 列选择相关属性
    showColumnSelector?: boolean;
    selectedColumnsCount?: number;
    totalColumnsCount?: number;
    onColumnSelectorClick?: () => void;
    columnSelectorContent?: React.ReactNode;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
    title,
    icon,
    rowCount,
    loading = false,
    showRefresh = false,
    onRefresh,
    onQuickExportCSV,
    onAdvancedExport,
    showCopy = false,
    onCopy,
    className,
    children,
    showColumnSelector = false,
    selectedColumnsCount = 0,
    totalColumnsCount = 0,
    onColumnSelectorClick,
    columnSelectorContent
}) => {
    return (
        <Card className={`flex-shrink-0 border-0 border-b rounded-none bg-background ${className || ''}`}>
            <CardHeader className="py-2 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {icon || <TableIcon className="w-5 h-5 text-blue-600" />}
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                            {rowCount.toLocaleString()} 行
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* 刷新按钮 */}
                        {showRefresh && onRefresh && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onRefresh}
                                        disabled={loading}
                                        className="h-8 px-2"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>刷新数据</TooltipContent>
                            </Tooltip>
                        )}

                        {/* 复制按钮 */}
                        {showCopy && onCopy && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={rowCount === 0}
                                        className="h-8 px-2"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        <ChevronDown className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onCopy('text')}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        复制为文本
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCopy('insert')}>
                                        <Database className="w-4 h-4 mr-2" />
                                        复制为 INSERT 语句
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCopy('markdown')}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        复制为 Markdown
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onCopy('json')}>
                                        <Code className="w-4 h-4 mr-2" />
                                        复制为 JSON
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onCopy('csv')}>
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        复制为 CSV
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* 导出按钮 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={rowCount === 0}
                                    className="h-8 px-2"
                                >
                                    <Download className="w-3 h-3 mr-1" />
                                    <ChevronDown className="w-3 h-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onQuickExportCSV && (
                                    <DropdownMenuItem onClick={onQuickExportCSV}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        快速导出 CSV
                                    </DropdownMenuItem>
                                )}
                                {onQuickExportCSV && onAdvancedExport && <DropdownMenuSeparator />}
                                {onAdvancedExport && (
                                    <DropdownMenuItem onClick={onAdvancedExport}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        高级导出选项
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* 列选择器 */}
                        {showColumnSelector && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-3"
                                        onClick={onColumnSelectorClick}
                                    >
                                        <span className="text-xs">
                                            列 ({selectedColumnsCount}/{totalColumnsCount})
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-72 max-h-80 overflow-y-auto">
                                    {columnSelectorContent}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* 额外的工具栏内容 */}
                        {children}
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
};

export default TableToolbar;
