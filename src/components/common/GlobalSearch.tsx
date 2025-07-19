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
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';

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
  const { connections, activeConnectionId } = useConnectionStore();
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

  // 真实搜索函数
  const searchRealData = async (query: string): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    
    try {
      // 搜索连接
      const matchingConnections = connections.filter(conn =>
        conn.name.toLowerCase().includes(query.toLowerCase()) ||
        conn.host.toLowerCase().includes(query.toLowerCase())
      );
      
      matchingConnections.forEach(conn => {
        results.push({
          id: `conn-${conn.id}`,
          type: 'connection',
          title: conn.name,
          description: `${conn.host}:${conn.port}`,
          category: '连接',
          action: () => onNavigate?.('/connections', { select: conn.id }),
        });
      });
      
      // 如果有活跃连接，搜索数据库和测量
      if (activeConnectionId) {
        try {
          // 搜索数据库
          const databases = await safeTauriInvoke<string[]>('get_databases', {
            connectionId: activeConnectionId,
          });
          
          const matchingDatabases = databases.filter(db =>
            db.toLowerCase().includes(query.toLowerCase())
          );
          
          matchingDatabases.forEach(db => {
            results.push({
              id: `db-${db}`,
              type: 'database',
              title: db,
              description: `数据库`,
              category: '数据库',
              action: () => onNavigate?.('/database', { database: db }),
            });
          });
          
          // 搜索测量（从已选数据库）
          for (const db of matchingDatabases.slice(0, 3)) { // 限制搜索前3个数据库
            try {
              const measurements = await safeTauriInvoke<string[]>('get_measurements', {
                connectionId: activeConnectionId,
                database: db,
              });
              
              const matchingMeasurements = measurements.filter(m =>
                m.toLowerCase().includes(query.toLowerCase())
              );
              
              matchingMeasurements.slice(0, 5).forEach(measurement => {
                results.push({
                  id: `measure-${db}-${measurement}`,
                  type: 'measurement',
                  title: measurement,
                  description: `测量 (${db})`,
                  category: '测量',
                  metadata: { database: db },
                  action: () => onNavigate?.('/query', { database: db, measurement }),
                });
              });
            } catch (error) {
              console.debug('搜索测量失败:', error);
            }
          }
        } catch (error) {
          console.debug('搜索数据库失败:', error);
        }
      }
      
      // 添加通用命令和功能
      const commands: SearchResult[] = [
        {
          id: 'cmd-new-connection',
          type: 'command' as const,
          title: '新建连接',
          description: '创建新的数据库连接',
          category: '命令',
          action: () => onNavigate?.('/connections', { action: 'create' }),
        },
        {
          id: 'cmd-settings',
          type: 'setting' as const,
          title: '应用设置',
          description: '配置应用程序选项',
          category: '设置',
          action: () => onNavigate?.('/settings'),
        },
      ];
      
      const matchingCommands = commands.filter(cmd =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        (cmd.description && cmd.description.toLowerCase().includes(query.toLowerCase()))
      );
      
      results.push(...matchingCommands);
      
    } catch (error) {
      console.error('搜索失败:', error);
    }
    
    return results.slice(0, 20); // 限制结果数量
  };

  // 执行搜索
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // 尝试从真实数据源搜索
      const realResults = await searchRealData(query);
      
      if (realResults.length > 0) {
        setResults(realResults);
        setSelectedIndex(0);
        setLoading(false);
        return;
      }
      
      // 如果没有找到真实数据，显示提示信息  
      const noResultsInfo: SearchResult[] = [
        {
          id: 'no-connection',
          type: 'command',
          title: activeConnectionId ? '未找到匹配项' : '未连接到数据库',
          description: activeConnectionId 
            ? `没有找到与 "${query}" 匹配的数据库、测量或连接`
            : '请先连接到 InfluxDB 数据库以搜索数据',
          category: '提示',
          action: () => {
            if (!activeConnectionId) {
              onNavigate?.('/connections');
            }
          },
        },
      ];

      setResults(noResultsInfo);
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
