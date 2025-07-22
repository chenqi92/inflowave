import React, { useState, useEffect } from 'react';
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
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import {
  Trash2,
  Edit,
  History,
  Clock,
  Book,
  PlayCircle,
  Search,
  X,
  Save
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useForm } from 'react-hook-form';
import type { QueryHistoryItem, SavedQuery } from '@/types';

interface QueryHistoryProps {
  onQuerySelect?: (query: string, database?: string) => void;
  visible?: boolean;
  onClose?: () => void;
}

interface SavedQueryFormData {
  name: string;
  description?: string;
  query: string;
  database?: string;
  tags?: string[];
}

const QueryHistory: React.FC<QueryHistoryProps> = ({
  onQuerySelect,
  visible = true,
  onClose,
}) => {
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterDatabase, setFilterDatabase] = useState<string>('__all__');
  const [filterDateRange, setFilterDateRange] = useState<string>('__all__');
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
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

  // 加载查询历史
  const loadQueryHistory = async () => {
    setLoading(true);
    try {
      console.log('开始加载查询历史...');
      const history =
        await safeTauriInvoke<QueryHistoryItem[]>('get_query_history');
      console.log('查询历史加载成功:', history?.length || 0, '条记录');
      setHistoryItems(history || []);
    } catch (error) {
      console.error('加载查询历史失败:', error);
      // 不显示错误通知，避免干扰用户体验
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载保存的查询
  const loadSavedQueries = async () => {
    setLoading(true);
    try {
      console.log('开始加载保存的查询...');
      const queries = await safeTauriInvoke<SavedQuery[]>('get_saved_queries');
      console.log('保存的查询加载成功:', queries?.length || 0, '条记录');
      setSavedQueries(queries || []);
    } catch (error) {
      console.error('加载保存的查询失败:', error);
      // 不显示错误通知，避免干扰用户体验
      setSavedQueries([]);
    } finally {
      setLoading(false);
    }
  };

  // 删除历史记录项
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await safeTauriInvoke('delete_query_history', { id });
      await loadQueryHistory();
      showMessage.success('删除成功');
    } catch (error) {
      showMessage.error(`删除失败: ${error}`);
    }
  };

  // 清空历史记录
  const handleClearHistory = async () => {
    try {
      await safeTauriInvoke('clear_query_history');
      setHistoryItems([]);
      showMessage.success('历史记录已清空');
    } catch (error) {
      showMessage.error(`清空失败: ${error}`);
    }
  };

  // 删除保存的查询
  const handleDeleteSavedQuery = async (id: string) => {
    try {
      await safeTauriInvoke('delete_saved_query', { id });
      await loadSavedQueries();
      showMessage.success('删除成功');
    } catch (error) {
      showMessage.error(`删除失败: ${error}`);
    }
  };

  // 编辑保存的查询
  const handleEditSavedQuery = (query: SavedQuery) => {
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

    try {
      const updatedQuery: SavedQuery = {
        ...editingQuery,
        name: data.name,
        description: data.description,
        query: data.query,
        database: data.database === '__none__' || data.database === '__empty__' ? '' : data.database,
        tags: data.tags || [],
        updatedAt: new Date(),
      };

      await safeTauriInvoke('update_saved_query', { query: updatedQuery });
      await loadSavedQueries();
      setEditingQuery(null);
      setShowEditModal(false);
      form.reset();
      showMessage.success('查询已更新');
    } catch (error) {
      showMessage.error(`更新失败: ${error}`);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingQuery(null);
    setShowEditModal(false);
    form.reset();
  };

  // 过滤历史记录
  const filteredHistoryItems = historyItems.filter(item => {
    const matchesSearch =
      !searchText ||
      item.query.toLowerCase().includes(searchText.toLowerCase()) ||
      item.database?.toLowerCase().includes(searchText.toLowerCase());

    const matchesDatabase = filterDatabase === '__all__' || item.database === filterDatabase || (filterDatabase === '__empty__' && !item.database);

    const matchesDateRange = filterDateRange === '__all__' || (() => {
      const itemDate = new Date(item.executedAt);
      const now = new Date();

      switch (filterDateRange) {
        case 'today':
          return itemDate.toDateString() === now.toDateString();
        case 'week':
          { const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= weekAgo; }
        case 'month':
          { const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return itemDate >= monthAgo; }
        default:
          return true;
      }
    })();

    return matchesSearch && matchesDatabase && matchesDateRange;
  });

  // 过滤保存的查询
  const filteredSavedQueries = savedQueries.filter(query => {
    const matchesSearch =
      !searchText ||
      query.query.toLowerCase().includes(searchText.toLowerCase()) ||
      query.name.toLowerCase().includes(searchText.toLowerCase()) ||
      query.description?.toLowerCase().includes(searchText.toLowerCase());

    const matchesDatabase =
      filterDatabase === '__all__' || query.database === filterDatabase || (filterDatabase === '__empty__' && !query.database);

    return matchesSearch && matchesDatabase;
  });

  // 获取所有数据库列表（用于过滤）
  const allDatabases = Array.from(
    new Set([
      ...historyItems.map(item => item.database).filter(Boolean),
      ...savedQueries.map(query => query.database).filter(Boolean),
    ])
  );

  useEffect(() => {
    if (visible) {
      console.log('QueryHistory visible, loading data...');
      // 添加延迟确保Dialog完全渲染后再加载数据
      const timer = setTimeout(() => {
        loadQueryHistory();
        loadSavedQueries();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  // 预加载数据，避免第一次打开时的延迟
  useEffect(() => {
    // 组件挂载时预加载数据，但要确保在组件完全挂载后
    const timer = setTimeout(() => {
      loadQueryHistory();
      loadSavedQueries();
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const renderHistoryItem = (item: QueryHistoryItem) => (
    <Card key={item.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Text className="font-medium">{item.database || '未知数据库'}</Text>
              <Badge variant={item.success ? 'default' : 'destructive'}>
                {item.success ? '成功' : '失败'}
              </Badge>
              {item.duration && (
                <Badge variant="secondary">{item.duration}ms</Badge>
              )}
            </div>
            <div className="space-y-1">
              <Text className="text-sm text-muted-foreground line-clamp-2 font-mono">
                {item.query}
              </Text>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(item.executedAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => onQuerySelect?.(item.query, item.database)}
                >
                  <PlayCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>执行查询</TooltipContent>
            </Tooltip>
            <Popconfirm
              title="确定删除这条历史记录吗？"
              onConfirm={() => handleDeleteHistoryItem(item.id)}
              okText="删除"
              cancelText="取消"
              okType="danger"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除记录</TooltipContent>
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSavedQuery = (query: SavedQuery) => (
    <Card key={query.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Text className="font-medium">{query.name}</Text>
              <Badge variant="outline">{query.database || '未指定数据库'}</Badge>
              {query.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="space-y-1">
              {query.description && (
                <Text className="text-sm text-muted-foreground">
                  {query.description}
                </Text>
              )}
              <Text className="text-sm text-muted-foreground line-clamp-2 font-mono">
                {query.query}
              </Text>
              <Text className="text-xs text-muted-foreground">
                创建于 {new Date(query.createdAt).toLocaleString()}
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => onQuerySelect?.(query.query, query.database)}
                >
                  <PlayCircle className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>执行查询</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => handleEditSavedQuery(query)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>编辑查询</TooltipContent>
            </Tooltip>
            <Popconfirm
              title="确定删除这个保存的查询吗？"
              onConfirm={() => handleDeleteSavedQuery(query.id)}
              okText="删除"
              cancelText="取消"
              okType="danger"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除查询</TooltipContent>
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const content = (
    <div className="h-[600px] flex flex-col">
      {/* 工具栏 */}
      <div className="p-4 border-b">
        <div className="grid grid-cols-12 gap-2 mb-4">
          <div className="col-span-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索查询..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 h-8 text-sm"
              />
            </div>
          </div>
          <div className="col-span-3">
            <Select value={filterDatabase} onValueChange={setFilterDatabase}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="筛选数据库" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">所有数据库</SelectItem>
                {allDatabases.map(db => (
                  <SelectItem key={db} value={db || '__empty__'}>
                    {db || '(空)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-3">
            <Button
              variant="outline"
              onClick={() => {
                setSearchText('');
                setFilterDatabase('__all__');
                setFilterDateRange('__all__');
              }}
              className="w-full h-8 text-sm"
            >
              <X className="w-4 h-4 mr-2" />
              清空筛选
            </Button>
          </div>
        </div>

        {activeTab === 'history' && (
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="时间范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">所有时间</SelectItem>
                  <SelectItem value="today">今天</SelectItem>
                  <SelectItem value="week">最近一周</SelectItem>
                  <SelectItem value="month">最近一月</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-6 flex justify-end">
              <Popconfirm
                title="确定清空所有历史记录吗？"
                description="此操作不可撤销，将删除所有查询历史记录。"
                onConfirm={handleClearHistory}
                okText="确认清空"
                cancelText="取消"
                okType="danger"
              >
                <Button variant="destructive" className="h-8 text-sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  清空历史
                </Button>
              </Popconfirm>
            </div>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'saved')} className="flex-1 flex flex-col">
        <div className="px-4 border-b">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              查询历史 ({filteredHistoryItems.length})
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Book className="w-4 h-4" />
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
                filteredHistoryItems.map(renderHistoryItem)
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-12 h-12 text-muted-foreground mb-4" />
                  <Text className="text-lg font-medium mb-2">暂无查询历史</Text>
                  <Text className="text-muted-foreground">
                    执行查询后，历史记录将显示在这里
                  </Text>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="saved" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredSavedQueries.length > 0 ? (
                filteredSavedQueries.map(renderSavedQuery)
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Book className="w-12 h-12 text-muted-foreground mb-4" />
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

  // 编辑模态框
  const editModal = (
    <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
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
              rules={{ required: '请输入查询名称' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>查询名称</FormLabel>
                  <FormControl>
                    <Input placeholder="输入查询名称" className="h-8 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="query"
              rules={{ required: '请输入查询语句' }}
              render={({ field }) => (
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="database"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数据库</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="选择数据库（可选）" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">未指定</SelectItem>
                        {allDatabases.map(db => (
                          <SelectItem key={db} value={db || '__empty__'}>
                            {db || '(空)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" className="h-8 text-sm" onClick={handleCancelEdit}>
                取消
              </Button>
              <Button type="submit" className="h-8 text-sm">
                <Save className="w-4 h-4 mr-2" />
                保存更改
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  if (onClose) {
    return (
      <TooltipProvider>
        <Dialog
          open={visible}
          onOpenChange={(open) => {
            console.log('Dialog onOpenChange:', open);
            if (!open && onClose) {
              onClose();
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                查询历史
              </DialogTitle>
              <DialogDescription>
                查看和管理查询历史记录与保存的查询
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              {content}
            </div>
          </DialogContent>
        </Dialog>
        {editModal}
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b">
          <History className="w-5 h-5" />
          <Text className="text-lg font-semibold">查询历史</Text>
        </div>
        <div className="flex-1">
          {content}
        </div>
        {editModal}
      </div>
    </TooltipProvider>
  );
};

export default QueryHistory;
