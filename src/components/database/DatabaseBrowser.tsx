import React, { useState, useEffect, useMemo } from 'react';
import {
  Tree,
  Input,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Empty,
  Spin,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import {
  Database,
  Table,
  Tag,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  Eye,
  Copy,
  BarChart,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { useDatabase } from '@/hooks/useDatabase';
import { useConnection } from '@/hooks/useConnection';
import type { DatabaseInfo } from '@/types';
import type { TreeNode } from '@/components/ui';
import { cn } from '@/lib/utils';

// 扩展 TreeNode 类型以包含数据库相关属性
interface DatabaseTreeNode extends TreeNode {
  database?: string;
  measurement?: string;
  field?: string;
  tag?: string;
  fieldType?: string;
  type?: 'database' | 'measurement' | 'fields-group' | 'tags-group' | 'field' | 'tag';
}

interface DatabaseBrowserProps {
  connectionId?: string;
  selectedKeys?: string[];
  onSelect?: (
    keys: string[],
    info: { node: DatabaseTreeNode; selected: boolean }
  ) => void;
  onDoubleClick?: (node: DatabaseTreeNode) => void;
  className?: string;
}

export const DatabaseBrowser: React.FC<DatabaseBrowserProps> = ({
  connectionId,
  selectedKeys,
  onSelect,
  onDoubleClick,
  className,
}) => {
  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedNodeKeys, setSelectedNodeKeys] = useState<string[]>(
    selectedKeys || []
  );
  const [contextMenuNode, setContextMenuNode] = useState<DatabaseTreeNode | null>(
    null
  );

  const { getActiveConnection } = useConnection();
  const {
    databases,
    isLoading,
    error,
    fetchDatabases,
    fetchMeasurements,
    fetchFields,
    fetchTags,
    addDatabase,
    deleteDatabase,
    refreshDatabaseStructure,
  } = useDatabase(connectionId);

  const activeConnection = getActiveConnection();
  const currentConnectionId = connectionId || activeConnection?.id;

  // 构建树形数据
  const treeData: DatabaseTreeNode[] = useMemo(() => {
    if (!databases || databases.length === 0) return [];

    return databases
      .filter(
        db =>
          !searchText ||
          db.name.toLowerCase().includes(searchText.toLowerCase())
      )
      .map(database => ({
        key: `db:${database.name}`,
        title: (
          <div className='flex items-center justify-between group'>
            <div className='flex items-center gap-2'>
              <Database className='w-4 h-4 text-primary' />
              <span className='text-sm font-medium'>{database.name}</span>
              {database.measurementCount !== undefined && (
                <Badge variant="secondary" className='text-xs'>
                  {database.measurementCount}
                </Badge>
              )}
            </div>
            <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
              <DatabaseContextMenu database={database} />
            </div>
          </div>
        ),
        icon: <Database className='w-4 h-4' />,
        children: [],
        isLeaf: false,
        database: database.name,
        type: 'database',
      }));
  }, [databases, searchText]);

  // 加载子节点
  const loadData = async (node: DatabaseTreeNode): Promise<void> => {
    if (!currentConnectionId) return;

    const { key, type, database, measurement } = node;

    try {
      if (type === 'database' && database) {
        // 加载测量列表
        const measurements = await fetchMeasurements(database);
        node.children = measurements.map(m => ({
          key: `measurement:${database}:${m.name}`,
          title: (
            <div className='flex items-center justify-between group'>
              <div className='flex items-center gap-2'>
                <Table className='w-4 h-4 text-green-600' />
                <span className='text-sm'>{m.name}</span>
                {m.seriesCount !== undefined && (
                  <Badge variant="outline" className='text-xs text-blue-600 border-blue-200'>
                    {m.seriesCount}
                  </Badge>
                )}
              </div>
              <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                <MeasurementContextMenu
                  database={database}
                  measurement={m.name}
                />
              </div>
            </div>
          ),
          icon: <Table className='w-4 h-4' />,
          children: [
            {
              key: `fields:${database}:${m.name}`,
              title: (
                <div className='flex items-center gap-2'>
                  <Clock className='w-4 h-4 text-purple-500' />
                  <span className='text-sm'>字段</span>
                </div>
              ),
              icon: <Clock className='w-4 h-4' />,
              children: [],
              isLeaf: false,
              database,
              measurement: m.name,
              type: 'fields-group',
            },
            {
              key: `tags:${database}:${m.name}`,
              title: (
                <div className='flex items-center gap-2'>
                  <Tag className='w-4 h-4 text-orange-500' />
                  <span className='text-sm'>标签</span>
                </div>
              ),
              icon: <Tag className='w-4 h-4' />,
              children: [],
              isLeaf: false,
              database,
              measurement: m.name,
              type: 'tags-group',
            },
          ],
          isLeaf: false,
          database,
          measurement: m.name,
          type: 'measurement',
        }));
      } else if (type === 'fields-group' && database && measurement) {
        // 加载字段列表
        const fields = await fetchFields(database, measurement);
        node.children = fields.map(f => ({
          key: `field:${database}:${measurement}:${f.name}`,
          title: (
            <div className='flex items-center justify-between group'>
              <div className='flex items-center gap-2'>
                <span
                  className={`w-2 h-2 rounded-full ${getFieldTypeColor(f.type)}`}
                />
                <span>{f.name}</span>
                <span className='text-xs text-muted-foreground'>
                  ({f.type})
                </span>
              </div>
              <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                <FieldContextMenu
                  database={database}
                  measurement={measurement}
                  field={f.name}
                  fieldType='field'
                />
              </div>
            </div>
          ),
          isLeaf: true,
          database,
          measurement,
          field: f.name,
          fieldType: f.type,
          type: 'field',
        }));
      } else if (type === 'tags-group' && database && measurement) {
        // 加载标签列表
        const tags = await fetchTags(database, measurement);
        node.children = tags.map(t => ({
          key: `tag:${database}:${measurement}:${t.name}`,
          title: (
            <div className='flex items-center justify-between group'>
              <div className='flex items-center gap-2'>
                <Tag className='w-4 h-4 text-orange-500' />
                <span className='text-sm'>{t.name}</span>
                {t.valueCount !== undefined && (
                  <Badge
                    variant='secondary'
                    className='text-xs bg-orange-50 text-orange-600 border-orange-200'
                  >
                    {t.valueCount}
                  </Badge>
                )}
              </div>
              <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
                <FieldContextMenu
                  database={database}
                  measurement={measurement}
                  field={t.name}
                  fieldType='tag'
                />
              </div>
            </div>
          ),
          isLeaf: true,
          database,
          measurement,
          tag: t.name,
          type: 'tag',
        }));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  };

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case 'integer':
      case 'float':
        return 'bg-blue-500';
      case 'string':
        return 'bg-green-500';
      case 'boolean':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  const handleRefresh = async () => {
    if (!currentConnectionId) return;
    await refreshDatabaseStructure(undefined, currentConnectionId);
  };

  const handleAddDatabase = () => {
    // TODO: 显示创建数据库对话框
    console.log('创建数据库');
  };

  const handleNodeSelect = (
    selectedKeys: string[],
    info: { node: DatabaseTreeNode; selected: boolean }
  ) => {
    setSelectedNodeKeys(selectedKeys);
    onSelect?.(selectedKeys, info);
  };

  const handleNodeDoubleClick = (info: { node: DatabaseTreeNode }) => {
    onDoubleClick?.(info.node);
  };

  // 初始加载
  useEffect(() => {
    if (currentConnectionId && databases.length === 0) {
      fetchDatabases(currentConnectionId);
    }
  }, [currentConnectionId, databases.length, fetchDatabases]);

  if (!currentConnectionId) {
    return (
      <Card className='h-full'>
        <CardContent className='flex items-center justify-center h-64'>
          <div className='text-center space-y-4'>
            <Database className='w-12 h-12 mx-auto text-muted-foreground' />
            <p className='text-muted-foreground'>请先选择一个连接</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className='p-4'>
        <div className='text-destructive text-center'>
          <div className='mb-2'>加载数据库结构失败</div>
          <div className='text-sm text-muted-foreground mb-4'>{error}</div>
          <Button
            onClick={handleRefresh}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      {/* 工具栏 */}
      <CardHeader className='pb-4'>
        <div className='flex gap-2 w-full'>
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <Input
              placeholder='搜索数据库...'
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className='pl-10'
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>刷新</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleAddDatabase}
                >
                  <Plus className='w-4 h-4 mr-2' />
                  新建数据库
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>新建数据库</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      {/* 树形结构 */}
      <CardContent className='flex-1 overflow-auto p-0'>
        {isLoading && databases.length === 0 ? (
          <div className='flex justify-center items-center h-32'>
            <Spin className='w-8 h-8' />
          </div>
        ) : treeData.length === 0 ? (
          <Empty
            title={searchText ? '未找到匹配的数据库' : '暂无数据库'}
            description={searchText ? '请尝试其他搜索关键词' : '点击上方按钮创建新的数据库'}
          />
        ) : (
          <div className='p-4'>
            <Tree
              treeData={treeData}
              selectedKeys={selectedNodeKeys}
              expandedKeys={expandedKeys}
              onSelect={handleNodeSelect}
              onExpand={keys => setExpandedKeys(keys)}
              loadData={loadData}
              showLine
              showIcon
              blockNode
              onDoubleClick={handleNodeDoubleClick}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 数据库上下文菜单
const DatabaseContextMenu: React.FC<{ database: DatabaseInfo }> = ({
  database,
}) => {
  const handleBrowse = () => {
    console.log('浏览数据库:', database.name);
  };

  const handleStats = () => {
    console.log('查看统计:', database.name);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(database.name);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleDelete = () => {
    console.log('删除数据库:', database.name);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className='h-6 w-6'
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className='w-4 h-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className='w-48'>
        <DropdownMenuItem onClick={handleBrowse}>
          <Eye className='w-4 h-4 mr-2' />
          浏览数据
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStats}>
          <Info className='w-4 h-4 mr-2' />
          统计信息
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className='w-4 h-4 mr-2' />
          复制名称
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className='text-destructive focus:text-destructive'>
          <Trash2 className='w-4 h-4 mr-2' />
          删除数据库
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// 测量上下文菜单
const MeasurementContextMenu: React.FC<{
  database: string;
  measurement: string;
}> = ({ database, measurement }) => {
  const handlePreview = () => {
    console.log('预览数据:', database, measurement);
  };

  const handleChart = () => {
    console.log('创建图表:', database, measurement);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(measurement);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleStats = () => {
    console.log('查看统计:', database, measurement);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className='h-6 w-6'
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className='w-4 h-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className='w-48'>
        <DropdownMenuItem onClick={handlePreview}>
          <Eye className='w-4 h-4 mr-2' />
          预览数据
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleChart}>
          <BarChart className='w-4 h-4 mr-2' />
          创建图表
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className='w-4 h-4 mr-2' />
          复制名称
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleStats}>
          <Info className='w-4 h-4 mr-2' />
          统计信息
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// 字段/标签上下文菜单
const FieldContextMenu: React.FC<{
  database: string;
  measurement: string;
  field: string;
  fieldType: 'field' | 'tag';
}> = ({ database, measurement, field, fieldType }) => {
  const handleSelect = () => {
    console.log('查询:', database, measurement, field);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(field);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleInfo = () => {
    console.log('字段信息:', database, measurement, field);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className='h-6 w-6'
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className='w-4 h-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className='w-48'>
        <DropdownMenuItem onClick={handleSelect}>
          <Eye className='w-4 h-4 mr-2' />
          查询{fieldType === 'field' ? '字段' : '标签'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className='w-4 h-4 mr-2' />
          复制名称
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleInfo}>
          <Info className='w-4 h-4 mr-2' />
          字段信息
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
