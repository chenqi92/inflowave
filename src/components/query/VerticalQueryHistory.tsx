import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Button,
  SearchInput,
  ExpandableSearchInput,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui';
import {
  History,
  Book,
  RefreshCw,
  Play,
  Copy,
  Trash2,
  MoreVertical,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  Star,
  Filter,
} from 'lucide-react';
import { useQueryHistoryData } from '@/hooks/useQueryHistory';
import { useTabOperations } from '@/stores/tabStore';
import { writeToClipboard } from '@/utils/clipboard';
import { showMessage } from '@/utils/message';
import { useTranslation } from '@/hooks/useTranslation';
import type { QueryHistoryItem, SavedQuery } from '@/types';
import logger from '@/utils/logger';

interface VerticalQueryHistoryProps {
  className?: string;
}

export const VerticalQueryHistory: React.FC<VerticalQueryHistoryProps> = ({
  className = '',
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [searchText, setSearchText] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState('');

  const {
    historyItems,
    savedQueries,
    loading,
    uniqueDatabases,
    deleteHistoryItem,
    deleteSavedQuery,
    toggleFavorite,
    refreshAll,
  } = useQueryHistoryData({ autoLoad: true });

  const { createQueryTab } = useTabOperations();

  // 过滤历史记录
  const filteredHistoryItems = useMemo(() => {
    return historyItems.filter(item => {
      const matchesSearch = !searchText || 
        item.query.toLowerCase().includes(searchText.toLowerCase()) ||
        item.database.toLowerCase().includes(searchText.toLowerCase());
      const matchesDatabase = !selectedDatabase || item.database === selectedDatabase;
      return matchesSearch && matchesDatabase;
    });
  }, [historyItems, searchText, selectedDatabase]);

  // 过滤保存的查询
  const filteredSavedQueries = useMemo(() => {
    return savedQueries.filter(query => {
      const matchesSearch = !searchText || 
        query.name.toLowerCase().includes(searchText.toLowerCase()) ||
        query.query.toLowerCase().includes(searchText.toLowerCase()) ||
        (query.database && query.database.toLowerCase().includes(searchText.toLowerCase()));
      const matchesDatabase = !selectedDatabase || query.database === selectedDatabase;
      return matchesSearch && matchesDatabase;
    });
  }, [savedQueries, searchText, selectedDatabase]);

  // 处理查询执行
  const handleExecuteQuery = (query: string, database?: string, connectionId?: string) => {
    createQueryTab(database, query, connectionId);
    showMessage.success('查询已加载到新标签页');
  };

  // 处理复制查询
  const handleCopyQuery = async (query: string) => {
    try {
      await writeToClipboard(query);
      showMessage.success('查询已复制到剪贴板');
    } catch (error) {
      showMessage.error(t('copy_failed'));
    }
  };

  // 处理删除历史记录
  const handleDeleteHistory = async (id: string) => {
    await deleteHistoryItem(id);
  };

  // 处理删除保存的查询
  const handleDeleteSaved = async (id: string) => {
    await deleteSavedQuery(id);
  };

  // 处理收藏切换
  const handleToggleFavorite = async (id: string) => {
    await toggleFavorite(id);
  };

  // 截断查询文本
  const truncateQuery = (query: string, maxLength: number = 100) => {
    if (query.length <= maxLength) return query;
    return `${query.substring(0, maxLength)  }...`;
  };

  // 格式化时间
  const formatTime = (date: Date | string | undefined | null) => {
    if (!date) {
      return 'N/A';
    }

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;

      // 检查日期是否有效
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }

      return new Intl.DateTimeFormat('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {
      logger.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  // 格式化持续时间
  const formatDuration = (duration: number) => {
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  // 渲染历史记录项
  const renderHistoryItem = (item: QueryHistoryItem) => (
    <Card key={item.id} className="mb-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] transition-all duration-200">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* 查询预览和状态 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                    {truncateQuery(item.query)}
                  </code>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-md">
                  <pre className="text-xs whitespace-pre-wrap">{item.query}</pre>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1">
              {item.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>

          {/* 元数据 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Database className="w-3 h-3 mr-1" />
                {item.database}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(item.executedAt)}
              </span>
            </div>
            <span>{formatDuration(item.duration)}</span>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExecuteQuery(item.query, item.database, item.connectionId)}
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
                <DropdownMenuItem onClick={() => handleCopyQuery(item.query)}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制查询
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteHistory(item.id)}
                  className="text-red-600"
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

  // 渲染保存的查询项
  const renderSavedQuery = (query: SavedQuery) => (
    <Card key={query.id} className="mb-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] transition-all duration-200">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* 查询名称和收藏状态 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium truncate">{query.name}</h4>
                {query.favorite && (
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                )}
              </div>
              {query.description && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {query.description}
                </p>
              )}
            </div>
          </div>

          {/* 查询预览 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                {truncateQuery(query.query)}
              </code>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-md">
              <pre className="text-xs whitespace-pre-wrap">{query.query}</pre>
            </TooltipContent>
          </Tooltip>

          {/* 元数据 */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {query.database && (
                <Badge variant="outline" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  {query.database}
                </Badge>
              )}
              <span>{formatTime(query.updatedAt)}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
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
                  {query.favorite ? '取消收藏' : '添加收藏'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyQuery(query.query)}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制查询
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteSaved(query.id)}
                  className="text-red-600"
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
    <TooltipProvider>
      <div className={`h-full flex flex-col bg-background ${className}`}>
        {/* 头部 */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-start gap-1">
            <ExpandableSearchInput
              placeholder="搜索查询..."
              value={searchText}
              onChange={(value: string) => setSearchText(value)}
              onClear={() => setSearchText('')}
            />

            {uniqueDatabases.length > 0 && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={selectedDatabase ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Filter className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>数据库过滤</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedDatabase('')}>
                    所有数据库
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {uniqueDatabases.map(db => (
                    <DropdownMenuItem key={db} onClick={() => setSelectedDatabase(db)}>
                      {db}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshAll}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'saved')} className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-auto grid grid-cols-2">
            <TabsTrigger
              value="history"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <History className="w-4 h-4 mr-2" />
              {t('history_tab')} ({filteredHistoryItems.length})
            </TabsTrigger>
            <TabsTrigger
              value="saved"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Book className="w-4 h-4 mr-2" />
              {t('saved_tab')} ({filteredSavedQueries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filteredHistoryItems.length > 0 ? (
                  filteredHistoryItems.map(renderHistoryItem)
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <History className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchText || selectedDatabase ? t('no_matching_history') : t('no_history')}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="saved" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filteredSavedQueries.length > 0 ? (
                  filteredSavedQueries.map(renderSavedQuery)
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Book className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchText || selectedDatabase ? t('no_matching_saved') : t('no_saved_queries')}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default VerticalQueryHistory;
