import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Typography } from '@/components/ui';
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui';
import { Search, Trash2, Database, PlayCircle, Star, Clock, FileText, X } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { QueryHistoryItem, SavedQuery, Connection } from '@/types';

// Removed Typography and Input destructuring - using direct components

interface QueryHistoryPanelProps {
  connections: Connection[];
  onExecuteQuery: (query: string, database: string, connectionId: string) => void;
}

const QueryHistoryPanel: React.FC<QueryHistoryPanelProps> = ({
  connections,
  onExecuteQuery}) => {
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterConnection, setFilterConnection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const form = useForm();

  // 加载查询历史
  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_query_history', {
        connectionId: filterConnection || null,
        limit: 50,
        offset: 0}) as QueryHistoryItem[];
      setHistoryList(result);
    } catch (error) {
      console.error('加载查询历史失败:', error);
      toast({ title: "错误", description: "加载查询历史失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 加载保存的查询
  const loadSavedQueries = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_saved_queries', {
        tags: null,
        search: searchKeyword || null}) as SavedQuery[];
      setSavedQueries(result);
    } catch (error) {
      console.error('加载保存的查询失败:', error);
      toast({ title: "错误", description: "加载保存的查询失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 添加查询历史记录
  const addHistoryItem = async (
    query: string,
    database: string,
    connectionId: string,
    duration: number,
    rowCount: number,
    success: boolean,
    error?: string
  ) => {
    try {
      await safeTauriInvoke('add_query_history', {
        query,
        database,
        connectionId,
        duration,
        rowCount,
        success,
        error: error || null});
      loadHistory();
    } catch (err) {
      console.error('添加查询历史失败:', err);
    }
  };

  // 保存查询
  const saveQuery = (query: string, database?: string) => {
    setSelectedQuery(query);
    setSelectedDatabase(database || '');
    setSaveDialogVisible(true);
  };

  // 确认保存查询
  const handleSaveQuery = async (values: any) => {
    try {
      await safeTauriInvoke('save_query', {
        name: values.name,
        description: values.description || null,
        query: selectedQuery,
        database: selectedDatabase || null,
        tags: values.tags || []});
      toast({ title: "成功", description: "查询保存成功" });
      setSaveDialogVisible(false);
      form.resetFields();
      loadSavedQueries();
    } catch (error) {
      console.error('保存查询失败:', error);
      toast({ title: "错误", description: "保存查询失败", variant: "destructive" });
    }
  };

  // 删除历史记录
  const deleteHistoryItem = async (historyId: string) => {
    try {
      await safeTauriInvoke('delete_query_history', { historyId });
      toast({ title: "成功", description: "历史记录已删除" });
      loadHistory();
    } catch (error) {
      console.error('删除历史记录失败:', error);
      toast({ title: "错误", description: "删除历史记录失败", variant: "destructive" });
    }
  };

  // 删除保存的查询
  const deleteSavedQuery = async (queryId: string) => {
    try {
      await safeTauriInvoke('delete_saved_query', { queryId });
      toast({ title: "成功", description: "查询已删除" });
      loadSavedQueries();
    } catch (error) {
      console.error('删除查询失败:', error);
      toast({ title: "错误", description: "删除查询失败", variant: "destructive" });
    }
  };

  // 清空历史记录
  const clearHistory = async () => {
    try {
      const deletedCount = await safeTauriInvoke('clear_query_history', {
        connectionId: filterConnection || null}) as number;
      toast({ title: "成功", description: "已清空 ${deletedCount} 条历史记录" });
      loadHistory();
    } catch (error) {
      console.error('清空历史失败:', error);
      toast({ title: "错误", description: "清空历史失败", variant: "destructive" });
    }
  };

  // 获取连接名称
  const getConnectionName = (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId);
    return connection?.name || '未知连接';
  };

  // 格式化时间
  const formatTime = (dateTime: string | Date) => {
    const date = new Date(dateTime);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return `${date.toLocaleDateString()  } ${  date.toLocaleTimeString()}`;
  };

  // 过滤数据
  const filteredHistory = historyList.filter(item => {
    const matchesSearch = !searchKeyword || 
      item.query.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.database.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesConnection = !filterConnection || item.connectionId === filterConnection;
    return matchesSearch && matchesConnection;
  });

  const filteredSavedQueries = savedQueries.filter(item => {
    return !searchKeyword || 
      item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.query.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchKeyword.toLowerCase()));
  });

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else {
      loadSavedQueries();
    }
  }, [activeTab, filterConnection]);

  return (
    <div
      title={
        <div className="flex gap-2">
          <Button
            type={activeTab === 'history' ? 'primary' : 'default'}
            onClick={() => setActiveTab('history')}
            icon={<Clock className="w-4 h-4"  />}>
            查询历史
          </Button>
          <Button
            type={activeTab === 'saved' ? 'primary' : 'default'}
            onClick={() => setActiveTab('saved')}
            icon={<Star className="w-4 h-4"  />}>
            保存的查询
          </Button>
        </div>
      }
      extra={
        <div className="flex gap-2">
          {activeTab === 'history' && (
            <Popconfirm
              title="确定要清空查询历史吗？"
              onConfirm={clearHistory}>
              <Button size="small" icon={<ClearOutlined />}>
                清空
              </Button>
            </Popconfirm>
          )}
          <Button size="small" onClick={activeTab === 'history' ? loadHistory : loadSavedQueries}>
            刷新
          </Button>
        </div>
      }
      size="small">
      {/* 搜索和筛选 */}
      <div className="flex gap-2" style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="搜索查询..."
          prefix={<Search className="w-4 h-4"  />}
          value={searchKeyword}
          onValueChange={(e) => setSearchKeyword(e.target.value)}
          style={{ flex: 1 }}
          allowClear
        />
        {activeTab === 'history' && (
          <Select
            placeholder="筛选连接"
            value={filterConnection}
            onValueChange={setFilterConnection}
            style={{ width: 150 }}
            allowClear>
            {connections.map(conn => (
              <Option key={conn.id} value={conn.id}>{conn.name}</Option>
            ))}
          </Select>
        )}
      </div>

      {/* 历史记录列表 */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mb-2" />
              <Typography.Text className="text-sm">暂无查询历史</Typography.Text>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="secondary">{getConnectionName(item.connectionId)}</Badge>
                      <Badge variant="outline">{item.database}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(item.executedAt)}
                      </span>
                    </div>
                    <div className="mb-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {item.query.length > 100 ? `${item.query.substring(0, 100)}...` : item.query}
                      </code>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{item.duration}ms</span>
                      <span>{item.rowCount} 行</span>
                      {!item.success && (
                        <Badge variant="destructive" className="text-xs">
                          执行失败
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExecuteQuery(item.query, item.database, item.connectionId)}
                          >
                            <PlayCircle className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>重新执行</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveQuery(item.query, item.database)}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>保存查询</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>删除历史记录</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除这条历史记录吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteHistoryItem(item.id)}>
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 保存的查询列表 */}
      {activeTab === 'saved' && (
        <div className="space-y-2">
          {filteredSavedQueries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mb-2" />
              <Typography.Text className="text-sm">暂无保存的查询</Typography.Text>
            </div>
          ) : (
            filteredSavedQueries.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-2 items-center">
                      <Typography variant="h4" className="font-medium">{item.name}</Typography>
                      {item.favorite && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                      {item.database && <Badge variant="outline">{item.database}</Badge>}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.description}
                      </p>
                    )}
                    <div className="mb-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {item.query.length > 80 ? `${item.query.substring(0, 80)}...` : item.query}
                      </code>
                    </div>
                    <div className="flex gap-2 items-center text-xs text-muted-foreground">
                      {item.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      <span>{formatTime(item.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (connections.length > 0) {
                                const defaultConnection = connections[0];
                                onExecuteQuery(item.query, item.database || '', defaultConnection.id);
                              } else {
                                toast({ title: "警告", description: "请先添加连接" });
                              }
                            }}
                          >
                            <PlayCircle className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>执行查询</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>删除保存的查询</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除这个保存的查询吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteSavedQuery(item.id)}>
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 保存查询对话框 */}
      <Modal
        title="保存查询"
        open={saveDialogVisible}
        onOpenChange={(open) => !open && (() => setSaveDialogVisible(false))()}>
        <Form form={form} layout="vertical" onFinish={handleSaveQuery}>
          <FormItem name="name"
            label="查询名称"
            rules={[{ required: true, message: '请输入查询名称' }]}>
            <Input placeholder="输入查询名称" />
          </FormItem>
          
          <FormItem name="description" label="描述">
            <Textarea rows={3} placeholder="输入查询描述（可选）" />
          </FormItem>
          
          <FormItem name="tags" label="标签">
            <Select
              mode="tags"
              placeholder="输入标签"
              style={{ width: '100%' }}
            />
          </FormItem>
          
          <FormItem label="查询内容">
            <Textarea
              value={selectedQuery}
              rows={6}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
};

export default QueryHistoryPanel;
