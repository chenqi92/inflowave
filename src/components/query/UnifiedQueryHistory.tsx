import React, {useState, useEffect} from 'react';
import {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Badge,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    Textarea,
    ScrollArea,
    Text,
    Popconfirm,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipProvider,
    Avatar,
    AvatarFallback,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui';
import {
    Trash2,
    Edit,
    History,
    Clock,
    Book,
    PlayCircle,
    Search,
    X,
    Save,
    CheckCircle,
    XCircle,
    Star,
    Calendar,
    Database,
    Filter,
    ArrowUpDown,
    MoreVertical,
    Download,
    Upload,
    BookmarkPlus,
    Copy,
    RefreshCw
} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {useQueryHistoryData} from '@/hooks/useQueryHistory';
import {writeToClipboard} from '@/utils/clipboard';
import {showMessage} from '@/utils/message';
import type {QueryHistoryItem, SavedQuery} from '@/types';

interface SavedQueryFormData {
    name: string;
    description?: string;
    query: string;
    database?: string;
    tags?: string[];
}

interface QueryHistoryFeatures {
    advancedFilters: boolean;
    exportImport: boolean;
    detailedStats: boolean;
    editSavedQueries: boolean;
    favoriteQueries: boolean;
}

interface UnifiedQueryHistoryProps {
    mode: 'modal' | 'page';
    visible?: boolean;
    onClose?: () => void;
    onQuerySelect?: (query: string, database?: string) => void;
    features?: Partial<QueryHistoryFeatures>;
    title?: string;
    description?: string;
    className?: string;
}

const defaultFeatures: QueryHistoryFeatures = {
    advancedFilters: false,
    exportImport: false,
    detailedStats: false,
    editSavedQueries: true,
    favoriteQueries: false
};

export const UnifiedQueryHistory: React.FC<UnifiedQueryHistoryProps> = ({
                                                                            mode = 'modal',
                                                                            visible = true,
                                                                            onClose,
                                                                            onQuerySelect,
                                                                            features: userFeatures = {},
                                                                            title = '查询历史',
                                                                            description = '查看和管理查询历史记录与保存的查询',
                                                                            className = ''
                                                                        }) => {
    const features = {...defaultFeatures, ...userFeatures};

    const {
        historyItems,
        savedQueries,
        loading,
        uniqueDatabases,
        getFilteredHistory,
        getFilteredSavedQueries,
        deleteHistoryItem,
        clearHistory,
        deleteSavedQuery,
        updateSavedQuery,
        toggleFavorite,
        refreshAll
    } = useQueryHistoryData({autoLoad: visible});

    // 状态管理
    const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
    const [searchText, setSearchText] = useState('');
    const [filterDatabase, setFilterDatabase] = useState<string>('__all__');
    const [filterDateRange, setFilterDateRange] = useState<string>('__all__');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'time' | 'duration' | 'rows'>('time');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // 编辑相关状态
    const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Form for editing saved queries
    const form = useForm<SavedQueryFormData>({
        defaultValues: {
            name: '',
            description: '',
            query: '',
            database: '__none__',
            tags: [],
        },
    });

    // 过滤器配置
    const currentFilters = {
        searchText,
        database: filterDatabase,
        timeFilter: filterDateRange,
        statusFilter,
        sortBy,
        sortOrder
    };

    // 获取过滤后的数据
    const filteredHistoryItems = getFilteredHistory(currentFilters);
    const filteredSavedQueries = getFilteredSavedQueries({
        searchText,
        database: filterDatabase
    });

    // 编辑保存的查询
    const handleEditSavedQuery = (query: SavedQuery) => {
        if (!features.editSavedQueries) return;

        setEditingQuery(query);
        form.reset({
            name: query.name,
            description: query.description || '',
            query: query.query,
            database: query.database || '__none__',
            tags: query.tags || [],
        });
        setShowEditModal(true);
    };

    // 保存编辑的查询
    const handleSaveEditedQuery = async (data: SavedQueryFormData) => {
        if (!editingQuery) return;

        const updatedQuery: SavedQuery = {
            ...editingQuery,
            name: data.name,
            description: data.description,
            query: data.query,
            database: data.database === '__none__' || data.database === '__empty__' ? '' : data.database,
            tags: data.tags || [],
            updatedAt: new Date(),
        };

        const success = await updateSavedQuery(updatedQuery);
        if (success) {
            setEditingQuery(null);
            setShowEditModal(false);
            form.reset();
            showMessage.success('查询已更新');
        }
    };

    // 取消编辑
    const handleCancelEdit = () => {
        setEditingQuery(null);
        setShowEditModal(false);
        form.reset();
    };

    // 复制查询到剪贴板
    const copyQueryToClipboard = async (query: string) => {
        await writeToClipboard(query, {
            successMessage: '已复制查询到剪贴板'
        });
    };

    // 格式化时间
    const formatDate = (date: Date | string) => {
        return new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(new Date(date));
    };

    // 格式化持续时间
    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    // 重置过滤器
    const resetFilters = () => {
        setSearchText('');
        setFilterDatabase('__all__');
        setFilterDateRange('__all__');
        setStatusFilter('all');
    };

    // 渲染历史记录项
    const renderHistoryItem = (item: QueryHistoryItem) => (
        <Card key={item.id}
              className="mb-3 hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-primary/30">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5">
                                    <AvatarFallback className="text-xs bg-background">
                                        {item.success ?
                                            <CheckCircle className="w-3 h-3 text-green-600"/> :
                                            <XCircle className="w-3 h-3 text-red-600"/>
                                        }
                                    </AvatarFallback>
                                </Avatar>
                                <Text className="font-medium text-sm">{item.database || '未知数据库'}</Text>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={item.success ? 'default' : 'destructive'} className="text-xs">
                                    {item.success ? '成功' : '失败'}
                                </Badge>
                                {item.duration && (
                                    <Badge variant="secondary"
                                           className="text-xs">{formatDuration(item.duration)}</Badge>
                                )}
                                {features.detailedStats && item.rowCount !== undefined && (
                                    <Badge variant="outline" className="text-xs">{item.rowCount} 行</Badge>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div
                                className="text-sm text-muted-foreground line-clamp-2 font-mono bg-muted/30 p-2 rounded-md">
                                {item.query}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3"/>
                                {formatDate(item.executedAt)}
                            </div>
                        </div>

                        {item.error && (
                            <div
                                className="mt-2 p-3 bg-destructive/5 border border-destructive/20 rounded-md text-sm text-destructive">
                                <div className="flex items-start gap-2">
                                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                                    <div className="flex-1">
                                        {item.error}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={() => onQuerySelect?.(item.query, item.database)}
                                >
                                    <PlayCircle className="w-4 h-4"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>执行查询</TooltipContent>
                        </Tooltip>

                        {mode === 'page' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 hover:bg-muted">
                                        <MoreVertical className="w-4 h-4"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => copyQueryToClipboard(item.query)}>
                                        <Copy className="w-4 h-4 mr-2"/>
                                        复制查询
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem
                                        onClick={() => deleteHistoryItem(item.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2"/>
                                        删除
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {mode === 'modal' && (
                            <Popconfirm
                                title="确定删除这条历史记录吗？"
                                onConfirm={() => {
                                    deleteHistoryItem(item.id);
                                }}
                                okText="删除"
                                cancelText="取消"
                                okType="danger"
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm"
                                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors">
                                            <Trash2 className="w-4 h-4"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>删除记录</TooltipContent>
                                </Tooltip>
                            </Popconfirm>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // 渲染保存的查询项
    const renderSavedQuery = (query: SavedQuery) => (
        <Card key={query.id}
              className={`${mode === 'page' ? '' : 'mb-3'} hover:shadow-md transition-shadow border-l-4 ${query.favorite ? 'border-l-yellow-400' : 'border-l-transparent hover:border-l-primary/30'}`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Text className="font-medium text-sm">{query.name}</Text>
                                {features.favoriteQueries && query.favorite && (
                                    <Star className="w-4 h-4 text-yellow-500 fill-current"/>
                                )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                    <Database className="w-3 h-3 mr-1"/>
                                    {query.database || '未指定数据库'}
                                </Badge>
                                {query.tags?.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            {query.description && (
                                <Text className="text-sm text-muted-foreground">
                                    {query.description}
                                </Text>
                            )}
                            <div
                                className="text-sm text-muted-foreground line-clamp-2 font-mono bg-muted/30 p-2 rounded-md">
                                {query.query}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3"/>
                                创建于 {formatDate(query.createdAt)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={() => onQuerySelect?.(query.query, query.database)}
                                >
                                    <PlayCircle className="w-4 h-4"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>执行查询</TooltipContent>
                        </Tooltip>

                        {features.editSavedQueries && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        onClick={() => handleEditSavedQuery(query)}
                                    >
                                        <Edit className="w-4 h-4"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>编辑查询</TooltipContent>
                            </Tooltip>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 hover:bg-muted">
                                    <MoreVertical className="w-4 h-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => copyQueryToClipboard(query.query)}>
                                    <Copy className="w-4 h-4 mr-2"/>
                                    复制查询
                                </DropdownMenuItem>
                                {features.favoriteQueries && (
                                    <DropdownMenuItem onClick={() => toggleFavorite(query.id)}>
                                        <Star
                                            className={`w-4 h-4 mr-2 ${query.favorite ? 'text-yellow-500 fill-current' : ''}`}/>
                                        {query.favorite ? '取消收藏' : '添加收藏'}
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem
                                    onClick={() => deleteSavedQuery(query.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4 mr-2"/>
                                    删除
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // 编辑模态框
    const editModal = features.editSavedQueries && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit className="w-5 h-5"/>
                        编辑保存的查询
                    </DialogTitle>
                    <DialogDescription>
                        修改查询的名称、描述、语句和标签
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveEditedQuery)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            rules={{required: '请输入查询名称'}}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>查询名称</FormLabel>
                                    <FormControl>
                                        <Input placeholder="输入查询名称" className="h-8 text-sm" {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>描述</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="输入查询描述（可选）"
                                            rows={2}
                                            className="text-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="query"
                            rules={{required: '请输入查询语句'}}
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>查询语句</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="输入 InfluxQL 查询语句"
                                            rows={6}
                                            className="font-mono text-sm"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="database"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>数据库</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue placeholder="选择数据库（可选）"/>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="__none__">未指定</SelectItem>
                                                {uniqueDatabases.map(db => (
                                                    <SelectItem key={db} value={db || '__empty__'}>
                                                        {db || '(空)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tags"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>标签</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="输入标签，用逗号分隔"
                                                className="h-8 text-sm"
                                                value={field.value?.join(', ') || ''}
                                                onChange={(e) => {
                                                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                                                    field.onChange(tags);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" className="h-8 text-sm" onClick={handleCancelEdit}>
                                取消
                            </Button>
                            <Button type="submit" className="h-8 text-sm">
                                <Save className="w-4 h-4 mr-2"/>
                                保存更改
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );

    // 主要内容区域
    const mainContent = (
        <div className={mode === 'page' ? 'h-full flex flex-col' : 'h-[600px] flex flex-col'}>
            {/* 工具栏 - 仅在页面模式或启用了相关功能时显示 */}
            {(mode === 'page' || features.exportImport) && (
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-sm"
                                onClick={refreshAll}
                            >
                                <RefreshCw className="w-4 h-4 mr-2"/>
                                刷新
                            </Button>
                        </div>

                        {features.exportImport && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-sm">
                                    <Download className="w-4 h-4 mr-2"/>
                                    导出
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 text-sm">
                                    <Upload className="w-4 h-4 mr-2"/>
                                    导入
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 过滤器 */}
            <div className="p-4 border-b bg-muted/20">
                {/* 主要过滤器 - 使用Flex布局 */}
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="relative flex items-center">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-muted-foreground pointer-events-none"/>
                                <Input
                                    placeholder="搜索查询..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="pl-10 h-9 py-1.5 text-sm w-full focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                            <div className="min-w-[140px]">
                                <Select value={filterDatabase} onValueChange={setFilterDatabase}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue placeholder="筛选数据库"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">所有数据库</SelectItem>
                                        {uniqueDatabases.map(db => (
                                            <SelectItem key={db} value={db || '__empty__'}>
                                                {db || '(空)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                variant="outline"
                                onClick={resetFilters}
                                className="h-9 text-sm px-3"
                                size="sm"
                            >
                                <X className="w-4 h-4 mr-1"/>
                                清空筛选
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 高级过滤器 - 优化响应式 */}
                {activeTab === 'history' && features.advancedFilters && (
                    <div className="border-t pt-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                                <div>
                                    <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="时间范围"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__all__">所有时间</SelectItem>
                                            <SelectItem value="today">今天</SelectItem>
                                            <SelectItem value="week">最近一周</SelectItem>
                                            <SelectItem value="month">最近一月</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="执行状态"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">全部状态</SelectItem>
                                            <SelectItem value="success">成功</SelectItem>
                                            <SelectItem value="error">失败</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Select value={sortBy}
                                            onValueChange={(value) => setSortBy(value as 'time' | 'duration' | 'rows')}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="排序方式"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="time">执行时间</SelectItem>
                                            <SelectItem value="duration">耗时</SelectItem>
                                            <SelectItem value="rows">行数</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 text-sm w-full justify-center"
                                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    >
                                        <ArrowUpDown className="w-4 h-4 mr-2"/>
                                        {sortOrder === 'asc' ? '升序' : '降序'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 标签页 */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'saved')}
                  className="flex-1 flex flex-col">
                <div className="px-4 border-b">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="w-4 h-4"/>
                            查询历史 ({filteredHistoryItems.length})
                        </TabsTrigger>
                        <TabsTrigger value="saved" className="flex items-center gap-2">
                            <Book className="w-4 h-4"/>
                            保存的查询 ({filteredSavedQueries.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="history" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-3">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : filteredHistoryItems.length > 0 ? (
                                mode === 'page' ? (
                                    filteredHistoryItems.map(renderHistoryItem)
                                ) : (
                                    filteredHistoryItems.map(renderHistoryItem)
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <History className="w-12 h-12 text-muted-foreground mb-4"/>
                                    <Text className="text-lg font-medium mb-2">暂无查询历史</Text>
                                    <Text className="text-muted-foreground">
                                        执行查询后，历史记录将显示在这里
                                    </Text>
                                </div>
                            )}

                            {/* 清空历史按钮 - 仅在模态框模式下显示 */}
                            {mode === 'modal' && filteredHistoryItems.length > 0 && (
                                <div className="pt-4 border-t">
                                    <Popconfirm
                                        title="确定清空所有历史记录吗？"
                                        description="此操作不可撤销，将删除所有查询历史记录。"
                                        onConfirm={() => {
                                            clearHistory();
                                        }}
                                        okText="确认清空"
                                        cancelText="取消"
                                        okType="danger"
                                    >
                                        <Button variant="destructive" className="h-8 text-sm w-full">
                                            <Trash2 className="w-4 h-4 mr-2"/>
                                            清空历史
                                        </Button>
                                    </Popconfirm>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="saved" className="flex-1 mt-0">
                    <ScrollArea className="h-full">
                        <div
                            className={mode === 'page' ? 'p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'p-4 space-y-3'}>
                            {loading ? (
                                <div className="flex items-center justify-center py-8 col-span-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : filteredSavedQueries.length > 0 ? (
                                filteredSavedQueries.map(renderSavedQuery)
                            ) : (
                                <div
                                    className="flex flex-col items-center justify-center py-12 text-center col-span-full">
                                    <Book className="w-12 h-12 text-muted-foreground mb-4"/>
                                    <Text className="text-lg font-medium mb-2">暂无保存的查询</Text>
                                    <Text className="text-muted-foreground">
                                        保存查询后，它们将显示在这里
                                    </Text>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );

    // 根据模式返回不同的容器
    if (mode === 'modal' && onClose) {
        return (
            <TooltipProvider>
                <Dialog
                    open={visible}
                    onOpenChange={(open) => {
                        if (!open && onClose) {
                            onClose();
                        }
                    }}
                >
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <History className="w-5 h-5"/>
                                {title}
                            </DialogTitle>
                            <DialogDescription>
                                {description}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden">
                            {mainContent}
                        </div>
                    </DialogContent>
                </Dialog>
                {editModal}
            </TooltipProvider>
        );
    }

    // 页面模式
    return (
        <TooltipProvider>
            <div className={`h-full flex flex-col ${className}`}>
                <div className="flex-1 overflow-hidden bg-background">
                    {mainContent}
                </div>
                {editModal}
            </div>
        </TooltipProvider>
    );
};

export default UnifiedQueryHistory;