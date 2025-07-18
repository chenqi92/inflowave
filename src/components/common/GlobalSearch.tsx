import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Text,
  Badge,
  Separator,
  ScrollArea,
} from '@/components/ui';
import {
  Search,
  Database,
  Table,
  Settings,
  FileText,
  Zap,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type:
    | 'database'
    | 'measurement'
    | 'field'
    | 'query'
    | 'connection'
    | 'setting'
    | 'command';
  title: string;
  description?: string;
  category: string;
  metadata?: Record<string, any>;
  action?: () => void;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string, params?: any) => void;
  onExecuteQuery?: (query: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onExecuteQuery,
}) => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<any>(null);

  // 搜索结果图标映射
  const getIcon = (type: string) => {
    switch (type) {
      case 'database':
        return <Database className='w-4 h-4' />;
      case 'measurement':
        return <Table className='w-4 h-4' />;
      case 'field':
        return <Zap className='w-4 h-4' />;
      case 'query':
        return <FileText className='w-4 h-4' />;
      case 'connection':
        return <Database className='w-4 h-4' />;
      case 'setting':
        return <Settings className='w-4 h-4' />;
      case 'command':
        return <Search className='w-4 h-4' />;
      default:
        return <Search className='w-4 h-4' />;
    }
  };

  // 搜索结果徽章变体映射
  const getBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'database':
        return 'default';
      case 'measurement':
        return 'secondary';
      case 'field':
        return 'outline';
      case 'query':
        return 'default';
      case 'connection':
        return 'secondary';
      case 'setting':
        return 'outline';
      case 'command':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // 执行搜索
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // 模拟搜索结果，实际应该调用后端API
      const mockResults: SearchResult[] = [
        // 数据库搜索结果
        {
          id: 'db1',
          type: 'database',
          title: 'myapp_production',
          description: '生产环境数据库',
          category: '数据库',
          action: () =>
            onNavigate?.('/database', { database: 'myapp_production' }),
        },
        // 测量搜索结果
        {
          id: 'measurement1',
          type: 'measurement',
          title: 'cpu_usage',
          description: 'CPU 使用率监控数据',
          category: '测量',
          metadata: { database: 'monitoring' },
          action: () => onNavigate?.('/query', { measurement: 'cpu_usage' }),
        },
        // 字段搜索结果
        {
          id: 'field1',
          type: 'field',
          title: 'usage_percent',
          description: 'CPU 使用百分比字段',
          category: '字段',
          metadata: { measurement: 'cpu_usage', type: 'field' },
        },
        // 保存的查询
        {
          id: 'query1',
          type: 'query',
          title: '系统性能监控',
          description: 'SELECT mean(usage_percent) FROM cpu_usage...',
          category: '保存的查询',
          action: () =>
            onExecuteQuery?.(
              'SELECT mean(usage_percent) FROM cpu_usage WHERE time > now() - 1h GROUP BY time(5m)'
            ),
        },
        // 连接
        {
          id: 'conn1',
          type: 'connection',
          title: 'Production InfluxDB',
          description: 'influxdb.prod.example.com:8086',
          category: '连接',
          action: () => onNavigate?.('/connections'),
        },
        // 设置
        {
          id: 'setting1',
          type: 'setting',
          title: '编辑器设置',
          description: '配置查询编辑器选项',
          category: '设置',
          action: () => onNavigate?.('/settings', { tab: 'editor' }),
        },
        // 命令
        {
          id: 'cmd1',
          type: 'command',
          title: '新建连接',
          description: '创建新的数据库连接',
          category: '命令',
          action: () => onNavigate?.('/connections', { action: 'create' }),
        },
      ];

      // 过滤搜索结果
      const filtered = mockResults.filter(
        result =>
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.description?.toLowerCase().includes(query.toLowerCase())
      );

      setResults(filtered);
      setSelectedIndex(0);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // 处理选择结果
  const handleSelectResult = (result: SearchResult) => {
    if (result.action) {
      result.action();
    }
    onClose();
    setSearchText('');
    setResults([]);
  };

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // 对话框打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setSearchText('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className='max-w-2xl p-0'>
        <DialogHeader className='hidden'>
          <DialogTitle>全局搜索</DialogTitle>
        </DialogHeader>
        <div className='global-search'>
          {/* 搜索输入框 */}
          <div className="p-4 pb-0">
            <div className="relative">
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                ref={inputRef}
                placeholder='搜索数据库、测量、查询、设置...'
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 border-none shadow-none text-lg"
              />
            </div>
          </div>

          <Separator className="my-3" />

          {/* 搜索结果 */}
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 mx-2 rounded-md cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => handleSelectResult(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className='flex items-center gap-2 mb-1'>
                        <span className="font-medium truncate">{item.title}</span>
                        <Badge variant={getBadgeVariant(item.type)} className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                      {item.description && (
                        <Text className='text-sm text-muted-foreground mb-1'>
                          {item.description}
                        </Text>
                      )}
                      {item.metadata && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.metadata).map(
                            ([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {value}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchText ? (
              <div className="text-center py-10">
                <div className="text-muted-foreground">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-sm">未找到相关结果</div>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <Text className='text-muted-foreground mb-4 block'>
                  输入关键词搜索数据库、测量、查询、设置等内容
                </Text>
                <div className="space-y-2">
                  <Text className='text-xs text-muted-foreground font-medium'>
                    快捷键提示:
                  </Text>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>↑↓ 选择结果</div>
                    <div>Enter 确认</div>
                    <div>Esc 关闭</div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* 底部提示 */}
          {results.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="px-4 py-2 text-center">
                <Text className='text-xs text-muted-foreground'>
                  找到 {results.length} 个结果
                </Text>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
