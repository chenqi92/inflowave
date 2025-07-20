import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { ScrollArea } from '@/components/ui';
import { Separator } from '@/components/ui';
import { Avatar, AvatarFallback } from '@/components/ui';
import { 
  History, 
  BookmarkPlus, 
  Play, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Clock,
  Database,
  CheckCircle,
  XCircle,
  Star,
  Calendar,
  BarChart3,
  ArrowUpDown,
  MoreVertical,
  Download,
  Upload
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';

interface QueryHistoryItem {
  id: string;
  query: string;
  database: string;
  connectionId: string;
  executedAt: Date;
  duration: number;
  rowCount: number;
  success: boolean;
  error?: string;
}

interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  database?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  favorite?: boolean;
}

const QueryHistoryPage: React.FC = () => {
  const { connections } = useConnectionStore();
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 过滤和搜索状态
  const [searchText, setSearchText] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'time' | 'duration' | 'rows'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 加载查询历史
  const loadQueryHistory = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke<QueryHistoryItem[]>('get_query_history', {
        limit: 1000,
        offset: 0
      });
      if (result) {
        setHistoryItems(result);
      }
    } catch (error) {
      showMessage.error('加载查询历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载保存的查询
  const loadSavedQueries = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke<SavedQuery[]>('get_saved_queries');
      if (result) {
        setSavedQueries(result);
      }
    } catch (error) {
      showMessage.error('加载保存的查询失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueryHistory();
    loadSavedQueries();
  }, []);

  // 获取唯一的数据库列表
  const getUniqueDatabases = () => {
    const databases = new Set<string>();
    historyItems.forEach(item => databases.add(item.database));
    savedQueries.forEach(item => item.database && databases.add(item.database));
    return Array.from(databases);
  };

  // 过滤查询历史
  const getFilteredHistory = () => {
    let filtered = [...historyItems];

    // 文本搜索
    if (searchText) {
      filtered = filtered.filter(item =>
        item.query.toLowerCase().includes(searchText.toLowerCase()) ||
        item.database.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 数据库过滤
    if (selectedDatabase !== 'all') {
      filtered = filtered.filter(item => item.database === selectedDatabase);
    }

    // 时间过滤
    if (timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (timeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(item => new Date(item.executedAt) >= filterDate);
    }

    // 状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => 
        statusFilter === 'success' ? item.success : !item.success
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'time':
          aValue = new Date(a.executedAt).getTime();
          bValue = new Date(b.executedAt).getTime();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'rows':
          aValue = a.rowCount;
          bValue = b.rowCount;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  };

  // 过滤保存的查询
  const getFilteredSavedQueries = () => {
    let filtered = [...savedQueries];

    if (searchText) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.query.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedDatabase !== 'all') {
      filtered = filtered.filter(item => item.database === selectedDatabase);
    }

    return filtered;
  };

  // 执行查询
  const executeQuery = async (query: string, database: string) => {
    try {
      // 这里应该调用实际的查询执行逻辑
      showMessage.success('查询已执行');
    } catch (error) {
      showMessage.error('查询执行失败');
    }
  };

  // 删除历史记录
  const deleteHistoryItem = async (id: string) => {
    try {
      await safeTauriInvoke('delete_query_history', { id });
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      showMessage.success('历史记录已删除');
    } catch (error) {
      showMessage.error('删除失败');
    }
  };

  // 切换收藏状态
  const toggleFavorite = async (id: string) => {
    try {
      const query = savedQueries.find(q => q.id === id);
      if (query) {
        await safeTauriInvoke('update_saved_query', {
          id,
          query: { ...query, favorite: !query.favorite }
        });
        setSavedQueries(prev => prev.map(q => 
          q.id === id ? { ...q, favorite: !q.favorite } : q
        ));
      }
    } catch (error) {
      showMessage.error('操作失败');
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date));
  };

  return (
    <DesktopPageWrapper
      title="查询历史"
      description="查看和管理您的查询历史记录与保存的查询"
      toolbar={
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          <span className="text-sm text-muted-foreground">历史记录管理</span>
        </div>
      }
    >
      <div className="h-full flex flex-col">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'saved')} className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                查询历史
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <BookmarkPlus className="w-4 h-4" />
                保存的查询
              </TabsTrigger>
            </TabsList>

            {/* 工具栏 */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                导出
              </Button>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                导入
              </Button>
              <Button variant="outline" size="sm" onClick={() => activeTab === 'history' ? loadQueryHistory() : loadSavedQueries()}>
                <History className="w-4 h-4 mr-2" />
                刷新
              </Button>
            </div>
          </div>

          {/* 过滤器 */}
          <Card className="mx-4 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                过滤选项
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索查询内容..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="数据库" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有数据库</SelectItem>
                    {getUniqueDatabases().map(db => (
                      <SelectItem key={db} value={db}>{db}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {activeTab === 'history' && (
                  <>
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="时间范围" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部时间</SelectItem>
                        <SelectItem value="today">今天</SelectItem>
                        <SelectItem value="week">最近一周</SelectItem>
                        <SelectItem value="month">最近一月</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="执行状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="success">成功</SelectItem>
                        <SelectItem value="error">失败</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'time' | 'duration' | 'rows')}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="排序方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="time">执行时间</SelectItem>
                        <SelectItem value="duration">耗时</SelectItem>
                        <SelectItem value="rows">行数</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      {sortOrder === 'asc' ? '升序' : '降序'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <TabsContent value="history" className="flex-1 mt-4 mx-4 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    查询历史 ({getFilteredHistory().length} 条记录)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      成功: {historyItems.filter(item => item.success).length}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <XCircle className="w-3 h-3 mr-1" />
                      失败: {historyItems.filter(item => !item.success).length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-3">
                    {getFilteredHistory().map((item) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {item.success ? <CheckCircle className="w-3 h-3 text-green-600" /> : <XCircle className="w-3 h-3 text-red-600" />}
                                </AvatarFallback>
                              </Avatar>
                              <Badge variant="outline" className="text-xs">
                                <Database className="w-3 h-3 mr-1" />
                                {item.database}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {formatDuration(item.duration)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.rowCount} 行
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(item.executedAt)}
                              </span>
                            </div>
                            
                            <pre className="text-sm bg-muted p-3 rounded font-mono whitespace-pre-wrap overflow-hidden text-ellipsis max-h-24">
                              {item.query}
                            </pre>
                            
                            {item.error && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                                {item.error}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => executeQuery(item.query, item.database)}
                              disabled={!item.success}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={async () => {
                                  const { writeToClipboard } = await import('@/utils/clipboard');
                                  await writeToClipboard(item.query, {
                                    successMessage: '已复制查询到剪贴板'
                                  });
                                }}>
                                  复制查询
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteHistoryItem(item.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved" className="flex-1 mt-4 mx-4 overflow-hidden">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    保存的查询 ({getFilteredSavedQueries().length} 个)
                  </CardTitle>
                  <Button size="sm">
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    新建查询
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getFilteredSavedQueries().map((query) => (
                      <Card key={query.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm">{query.name}</h3>
                            {query.favorite && (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => executeQuery(query.query, query.database || '')}>
                                <Play className="w-4 h-4 mr-2" />
                                执行查询
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleFavorite(query.id)}>
                                <Star className="w-4 h-4 mr-2" />
                                {query.favorite ? '取消收藏' : '添加收藏'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {query.description && (
                          <p className="text-xs text-muted-foreground mb-2">{query.description}</p>
                        )}
                        
                        <div className="flex items-center gap-2 mb-2">
                          {query.database && (
                            <Badge variant="outline" className="text-xs">
                              <Database className="w-3 h-3 mr-1" />
                              {query.database}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(query.createdAt)}
                          </Badge>
                        </div>
                        
                        {query.tags && query.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {query.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <pre className="text-xs bg-muted p-2 rounded font-mono whitespace-pre-wrap overflow-hidden text-ellipsis max-h-20">
                          {query.query}
                        </pre>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DesktopPageWrapper>
  );
};

export default QueryHistoryPage;