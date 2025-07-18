import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Textarea,
  Empty,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Popconfirm,
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import {
  Trash2,
  Edit,
  Plus,
  Database,
  Save,
  PlayCircle,
  Tag,
  Book,
  Search,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { SavedQuery } from '@/types';

interface SavedQueriesProps {
  onQuerySelect?: (query: string, database?: string) => void;
  visible?: boolean;
  onClose?: () => void;
  databases?: string[];
}

interface SavedQueryFormData {
  name: string;
  description?: string;
  query: string;
  database?: string;
  tags: string[];
}

const SavedQueries: React.FC<SavedQueriesProps> = ({
  onQuerySelect,
  visible = true,
  onClose,
  databases = [],
}) => {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterDatabase, setFilterDatabase] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const form = useForm<SavedQueryFormData>({
    defaultValues: {
      name: '',
      description: '',
      query: '',
      database: '',
      tags: [],
    },
  });

  // 加载保存的查询
  const loadSavedQueries = async () => {
    setLoading(true);
    try {
      const queries = await safeTauriInvoke<SavedQuery[]>('get_saved_queries');
      setSavedQueries(queries || []);
    } catch (error) {
      showNotification.error({
        message: '加载保存的查询失败',
        description: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建新查询
  const handleCreateQuery = async (values: SavedQueryFormData) => {
    try {
      const newQuery: SavedQuery = {
        id: `query_${Date.now()}`,
        name: values.name,
        description: values.description,
        query: values.query,
        database: values.database,
        tags: values.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await safeTauriInvoke('save_query', { query: newQuery });
      await loadSavedQueries();
      setShowCreateModal(false);
      form.reset();
      showMessage.success('查询已保存');
    } catch (error) {
      showNotification.error({
        message: '保存查询失败',
        description: String(error),
      });
    }
  };

  // 更新查询
  const handleUpdateQuery = async (values: SavedQueryFormData) => {
    if (!editingQuery) return;

    try {
      const updatedQuery: SavedQuery = {
        ...editingQuery,
        name: values.name,
        description: values.description,
        query: values.query,
        database: values.database,
        tags: values.tags || [],
        updatedAt: new Date(),
      };

      await safeTauriInvoke('update_saved_query', { query: updatedQuery });
      await loadSavedQueries();
      setEditingQuery(null);
      form.reset();
      showMessage.success('查询已更新');
    } catch (error) {
      showNotification.error({
        message: '更新查询失败',
        description: String(error),
      });
    }
  };

  // 删除查询
  const handleDeleteQuery = async (id: string) => {
    try {
      await safeTauriInvoke('delete_saved_query', { id });
      await loadSavedQueries();
      showMessage.success('查询已删除');
    } catch (error) {
      showNotification.error({
        message: '删除查询失败',
        description: String(error),
      });
    }
  };

  // 编辑查询
  const handleEditQuery = (query: SavedQuery) => {
    setEditingQuery(query);
    form.reset({
      name: query.name,
      description: query.description,
      query: query.query,
      database: query.database,
      tags: query.tags || [],
    });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingQuery(null);
    setShowCreateModal(false);
    form.reset();
  };

  // 过滤查询
  const filteredQueries = savedQueries.filter(query => {
    const matchesSearch =
      !searchText ||
      query.query.toLowerCase().includes(searchText.toLowerCase()) ||
      query.name.toLowerCase().includes(searchText.toLowerCase()) ||
      query.description?.toLowerCase().includes(searchText.toLowerCase());

    const matchesDatabase =
      !filterDatabase || query.database === filterDatabase;

    const matchesTag = !filterTag || query.tags?.includes(filterTag);

    return matchesSearch && matchesDatabase && matchesTag;
  });

  // 获取所有标签
  const allTags = Array.from(
    new Set(savedQueries.flatMap(query => query.tags || []))
  );

  // 获取所有数据库
  const allDatabases = Array.from(
    new Set([
      ...databases,
      ...savedQueries.map(query => query.database).filter(Boolean),
    ])
  );

  useEffect(() => {
    if (visible) {
      loadSavedQueries();
    }
  }, [visible]);

  const renderQueryItem = (query: SavedQuery) => (
    <Card key={query.id} className='mb-4'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center gap-2 mb-2'>
              <Text className='font-semibold text-lg'>{query.name}</Text>
              {query.database && (
                <Badge variant='secondary' className='gap-1'>
                  <Database className='w-3 h-3' />
                  {query.database}
                </Badge>
              )}
              {query.tags?.map(tag => (
                <Badge key={tag} variant='outline' className='gap-1'>
                  <Tag className='w-3 h-3' />
                  {tag}
                </Badge>
              ))}
            </div>
            {query.description && (
              <Text className='text-sm text-muted-foreground block mb-2'>
                {query.description}
              </Text>
            )}
          </div>
          <div className='flex gap-2'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => onQuerySelect?.(query.query, query.database)}
                  >
                    <PlayCircle className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>执行查询</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleEditQuery(query)}
                  >
                    <Edit className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Popconfirm
              title='确定删除这个查询吗？'
              onConfirm={() => handleDeleteQuery(query.id)}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                    >
                      <Trash2 className='w-4 h-4 text-destructive' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Popconfirm>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='space-y-2'>
          <div className='bg-muted p-3 rounded-md'>
            <Text className='text-xs font-mono whitespace-pre-wrap break-all'>
              {query.query}
            </Text>
          </div>
          <Text className='text-xs text-muted-foreground'>
            创建于 {new Date(query.createdAt).toLocaleString()}
            {query.updatedAt && query.updatedAt !== query.createdAt && (
              <span>
                {' '}
                • 更新于 {new Date(query.updatedAt).toLocaleString()}
              </span>
            )}
          </Text>
        </div>
      </CardContent>
    </Card>
  );

  const queryForm = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(editingQuery ? handleUpdateQuery : handleCreateQuery)}
        className='space-y-4'
      >
        <FormField
          control={form.control}
          name='name'
          rules={{ required: '请输入查询名称' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>查询名称</FormLabel>
              <FormControl>
                <Input placeholder='输入查询名称' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>描述</FormLabel>
              <FormControl>
                <Textarea placeholder='输入查询描述（可选）' rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='query'
          rules={{ required: '请输入查询语句' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>查询语句</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='输入 InfluxQL 查询语句'
                  rows={6}
                  className='font-mono'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='database'
            render={({ field }) => (
              <FormItem>
                <FormLabel>数据库</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='选择数据库（可选）' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allDatabases.map(db => (
                      <SelectItem key={db} value={db || ''}>
                        {db}
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
            name='tags'
            render={({ field }) => (
              <FormItem>
                <FormLabel>标签</FormLabel>
                <Select
                  onValueChange={(value) => {
                    const currentTags = field.value || [];
                    if (!currentTags.includes(value)) {
                      field.onChange([...currentTags, value]);
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='添加标签（可选）' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.value && field.value.length > 0 && (
                  <div className='flex flex-wrap gap-1 mt-2'>
                    {field.value.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant='secondary'
                        className='cursor-pointer'
                        onClick={() => {
                          field.onChange(field.value.filter((t: string) => t !== tag));
                        }}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={handleCancelEdit}>
            取消
          </Button>
          <Button type='submit' className='gap-2'>
            <Save className='w-4 h-4' />
            {editingQuery ? '更新' : '保存'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const content = (
    <div className='h-[600px] flex flex-col'>
      {/* 工具栏 */}
      <div className='p-4 border-b bg-background'>
        <div className='grid grid-cols-12 gap-2'>
          <div className='col-span-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='搜索查询...'
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className='pl-10'
              />
            </div>
          </div>
          <div className='col-span-3'>
            <Select value={filterDatabase} onValueChange={setFilterDatabase}>
              <SelectTrigger>
                <SelectValue placeholder='筛选数据库' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>全部数据库</SelectItem>
                {allDatabases.map(db => (
                  <SelectItem key={db} value={db || ''}>
                    {db}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='col-span-3'>
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger>
                <SelectValue placeholder='筛选标签' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>全部标签</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='col-span-2 flex justify-end'>
            <Button
              onClick={() => setShowCreateModal(true)}
              className='gap-2'
            >
              <Plus className='w-4 h-4' />
              新建查询
            </Button>
          </div>
        </div>
      </div>

      {/* 查询列表 */}
      <div className='flex-1 overflow-auto p-4'>
        {loading ? (
          <div className='flex justify-center py-8'>
            <Text>加载中...</Text>
          </div>
        ) : filteredQueries.length === 0 ? (
          <Empty
            description='暂无保存的查询'
            className='py-8'
          />
        ) : (
          <div className='space-y-4'>
            {filteredQueries.map(renderQueryItem)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 主内容 */}
      {visible && onClose ? (
        <Dialog open={visible} onOpenChange={onClose}>
          <DialogContent className='max-w-6xl max-h-[90vh]'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2'>
                <Book className='w-5 h-5' />
                保存的查询
              </DialogTitle>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>
      ) : (
        <Card className='h-full'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Book className='w-5 h-5' />
              保存的查询
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0 h-[calc(100%-80px)]'>
            {content}
          </CardContent>
        </Card>
      )}

      {/* 创建/编辑查询模态框 */}
      <Dialog open={showCreateModal || !!editingQuery} onOpenChange={(open) => {
        if (!open) handleCancelEdit();
      }}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              {editingQuery ? (
                <Edit className='w-5 h-5' />
              ) : (
                <Plus className='w-5 h-5' />
              )}
              {editingQuery ? '编辑查询' : '新建查询'}
            </DialogTitle>
          </DialogHeader>
          {queryForm}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedQueries;
