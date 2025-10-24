/**
 * 查询历史管理对话框
 * 提供完整的查询历史和收藏管理功能
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  ScrollArea,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Popconfirm,
  EmptyLoading,
} from '@/components/ui';
import {
  History,
  Star,
  Play,
  Copy,
  Trash2,
  MoreVertical,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  RefreshCw,
  SortAsc,
  SortDesc,
  Bookmark,
} from 'lucide-react';
import { useQueryHistoryData } from '@/hooks/useQueryHistory';
import { writeToClipboard } from '@/utils/clipboard';
import { showMessage } from '@/utils/message';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { QueryHistoryItem, SavedQuery } from '@/types';

/**
 * 对话框属性
 */
export interface QueryHistoryDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 执行查询回调 */
  onExecuteQuery?: (query: string, database?: string) => void;
  /** 默认激活的标签页 */
  defaultTab?: 'history' | 'favorites';
}

/**
 * 查询历史管理对话框
 */
export const QueryHistoryDialog: React.FC<QueryHistoryDialogProps> = ({
  open,
  onClose,
  onExecuteQuery,
  defaultTab = 'history',
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>(defaultTab);
  const [searchText, setSearchText] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'duration' | 'rows'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    historyItems,
    savedQueries,
    loading,
    uniqueDatabases,
    deleteHistoryItem,
    deleteSavedQuery,
    toggleFavorite,
    clearHistory,
    refreshAll,
    getFilteredHistory,
  } = useQueryHistoryData({ autoLoad: true });

  // 过滤历史记录
  const filteredHistory = useMemo(() => {
    return getFilteredHistory({
      searchText,
      database: selectedDatabase,
      timeFilter,
      statusFilter,
      sortBy,
      sortOrder,
    });
  }, [historyItems, searchText, selectedDatabase, timeFilter, statusFilter, sortBy, sortOrder]);

  // 过滤收藏查询（仅显示收藏的）
  const favoriteQueries = useMemo(() => {
    let filtered = savedQueries.filter((q) => q.favorite);

    if (searchText) {
      filtered = filtered.filter(
        (q) =>
          q.name.toLowerCase().includes(searchText.toLowerCase()) ||
          q.query.toLowerCase().includes(searchText.toLowerCase()) ||
          q.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedDatabase !== 'all') {
      filtered = filtered.filter((q) => q.database === selectedDatabase);
    }

    return filtered;
  }, [savedQueries, searchText, selectedDatabase]);

  // 执行查询
  const handleExecuteQuery = (query: string, database?: string) => {
    if (onExecuteQuery) {
      onExecuteQuery(query, database);
      onClose();
    }
  };

  // 复制查询
  const handleCopyQuery = async (query: string) => {
    const success = await writeToClipboard(query);
    if (success) {
      showMessage.success('查询已复制到剪贴板');
    }
  };

  // 删除历史记录
  const handleDeleteHistory = async (id: string) => {
    await deleteHistoryItem(id);
  };

  // 删除收藏
  const handleDeleteFavorite = async (id: string) => {
    await deleteSavedQuery(id);
  };

  // 切换收藏状态
  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
  };

  // 清空历史记录
  const handleClearHistory = async () => {
    await clearHistory();
  };

  // 切换排序顺序
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: zhCN,
    });
  };

  // 格式化持续时间
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 渲染历史记录项
  const renderHistoryItem = (item: QueryHistoryItem) => (
    <Card key={item.id} className="mb-2 hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* 查询语句 */}
          <div className="flex items-start justify-between gap-2">
            <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono overflow-hidden text-ellipsis whitespace-nowrap">
              {item.query}
            </code>
            <Badge variant={item.success ? 'default' : 'destructive'} className="flex-shrink-0">
              {item.success ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {item.success ? '成功' : '失败'}
            </Badge>
          </div>

          {/* 元数据 */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.database && (
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{item.database}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(item.executedAt)}</span>
            </div>
            <span>耗时: {formatDuration(item.duration)}</span>
            <span>行数: {item.rowCount}</span>
          </div>

          {/* 错误信息 */}
          {!item.success && item.error && (
            <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
              {item.error}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExecuteQuery(item.query, item.database)}
              className="h-7 text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              重新执行
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCopyQuery(item.query)}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制查询
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteHistory(item.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染收藏查询项
  const renderFavoriteItem = (query: SavedQuery) => (
    <Card key={query.id} className="mb-2 hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* 查询名称 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                <h4 className="text-sm font-medium truncate">{query.name}</h4>
              </div>
              {query.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {query.description}
                </p>
              )}
            </div>
          </div>

          {/* 查询语句 */}
          <code className="block text-xs bg-muted px-2 py-1 rounded font-mono overflow-hidden text-ellipsis whitespace-nowrap">
            {query.query}
          </code>

          {/* 元数据 */}
          <div className="flex items-center gap-2 flex-wrap">
            {query.database && (
              <Badge variant="secondary" className="text-xs">
                <Database className="w-3 h-3 mr-1" />
                {query.database}
              </Badge>
            )}
            {query.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExecuteQuery(query.query, query.database)}
              className="h-7 text-xs"
            >
              <Play className="w-3 h-3 mr-1" />
              执行
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleToggleFavorite(query.id)}>
                  <Star className="w-4 h-4 mr-2" />
                  取消收藏
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyQuery(query.query)}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制查询
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteFavorite(query.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            查询历史管理
          </DialogTitle>
          <DialogDescription>
            查看和管理您的查询历史记录和收藏查询
          </DialogDescription>
        </DialogHeader>

        {/* 工具栏 */}
        <div className="space-y-3 pb-3 border-b">
          {/* 搜索和刷新 */}
          <div className="flex items-center gap-2">
            <SearchInput
              placeholder="搜索查询..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onClear={() => setSearchText('')}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* 过滤器 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="所有数据库" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有数据库</SelectItem>
                {uniqueDatabases.map((db) => (
                  <SelectItem key={db} value={db}>
                    {db}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === 'history' && (
              <>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有时间</SelectItem>
                    <SelectItem value="today">今天</SelectItem>
                    <SelectItem value="week">最近一周</SelectItem>
                    <SelectItem value="month">最近一月</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                    <SelectItem value="error">失败</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">时间</SelectItem>
                    <SelectItem value="duration">耗时</SelectItem>
                    <SelectItem value="rows">行数</SelectItem>
                  </SelectContent>
                </Select>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSortOrder}
                      >
                        {sortOrder === 'asc' ? (
                          <SortAsc className="w-4 h-4" />
                        ) : (
                          <SortDesc className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {sortOrder === 'asc' ? '升序' : '降序'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Popconfirm
                  title="确认清空"
                  description="确定要清空所有历史记录吗？此操作不可恢复。"
                  onConfirm={handleClearHistory}
                >
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    清空历史
                  </Button>
                </Popconfirm>
              </>
            )}
          </div>
        </div>

        {/* 标签页内容 */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              历史记录 ({filteredHistory.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Bookmark className="w-4 h-4" />
              收藏查询 ({favoriteQueries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="flex-1 mt-3 min-h-0">
            <ScrollArea className="h-full pr-4">
              <EmptyLoading
                loading={loading}
                loadingTip="加载中..."
                isEmpty={filteredHistory.length === 0}
                emptyTip={searchText || selectedDatabase !== 'all' ? '没有匹配的历史记录' : '暂无历史记录'}
              >
                <div className="space-y-2">
                  {filteredHistory.map(renderHistoryItem)}
                </div>
              </EmptyLoading>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="favorites" className="flex-1 mt-3 min-h-0">
            <ScrollArea className="h-full pr-4">
              <EmptyLoading
                loading={loading}
                loadingTip="加载中..."
                isEmpty={favoriteQueries.length === 0}
                emptyTip={searchText || selectedDatabase !== 'all' ? '没有匹配的收藏查询' : '暂无收藏查询'}
              >
                <div className="space-y-2">
                  {favoriteQueries.map(renderFavoriteItem)}
                </div>
              </EmptyLoading>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default QueryHistoryDialog;

