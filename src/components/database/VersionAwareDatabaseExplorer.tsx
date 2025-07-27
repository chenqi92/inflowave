import React, { useState, useEffect, useCallback } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import {
  Search,
  RefreshCw,
  Settings,
  Database as DatabaseIcon,
} from 'lucide-react';
import { Button, Separator, Input, Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import DatabaseTree from './DatabaseTree';
import { TreeNode } from '@/types/tree';

interface VersionAwareDatabaseExplorerProps {
  connectionId: string;
  onTableSelect?: (database: string, table: string) => void;
  onQueryGenerate?: (query: string) => void;
  className?: string;
}

export const VersionAwareDatabaseExplorer: React.FC<
  VersionAwareDatabaseExplorerProps
> = ({ connectionId, onTableSelect, onQueryGenerate, className = '' }) => {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [databaseVersion, setDatabaseVersion] = useState<string>('');
  const [databaseType, setDatabaseType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 检测数据库版本
  const detectDatabaseVersion = useCallback(async () => {
    if (!connectionId) return;

    try {
      setLoading(true);
      const version = await safeTauriInvoke<string>('detect_database_version', {
        connectionId,
      });
      setDatabaseVersion(version);

      // 根据版本推断数据库类型
      if (version.includes('InfluxDB')) {
        setDatabaseType('InfluxDB');
      } else if (version.includes('IoTDB')) {
        setDatabaseType('IoTDB');
      } else {
        setDatabaseType('Unknown');
      }
    } catch (error) {
      console.error('检测数据库版本失败:', error);
      setDatabaseVersion('unknown');
      setDatabaseType('Unknown');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  // 处理节点选择
  const handleNodeSelect = useCallback((node: TreeNode) => {
    setSelectedNode(node);

    // 根据节点类型生成相应的操作
    switch (node.nodeType) {
      case 'measurement':
      case 'timeseries':
        // 生成查询语句
        generateQueryForNode(node);
        break;
      case 'field':
      case 'tag':
        // 可以生成特定字段的查询
        generateFieldQuery(node);
        break;
    }
  }, []);

  // 处理节点双击
  const handleNodeDoubleClick = useCallback(
    (node: TreeNode) => {
      if (node.nodeType === 'measurement' || node.nodeType === 'timeseries') {
        // 双击测量或时间序列时，生成并执行查询
        const query = generateQueryForNode(node);
        if (query && onQueryGenerate) {
          onQueryGenerate(query);
        }
      }
    },
    [onQueryGenerate]
  );

  // 为节点生成查询语句
  const generateQueryForNode = (node: TreeNode): string => {
    let query = '';

    switch (databaseType) {
      case 'InfluxDB':
        if (node.nodeType === 'measurement') {
          // 从节点路径中提取数据库和保留策略信息
          query = `SELECT *
                   FROM "${node.name}" LIMIT 100`;
        }
        break;
      case 'IoTDB':
        if (node.nodeType === 'timeseries') {
          query = `SELECT ${node.name}
                   FROM root.** LIMIT 100`;
        } else if (node.nodeType === 'device') {
          query = `SELECT *
                   FROM ${node.name}.** LIMIT 100`;
        }
        break;
    }

    return query;
  };

  // 为字段生成查询语句
  const generateFieldQuery = (node: TreeNode): string => {
    // 这里可以根据字段类型生成更具体的查询
    return '';
  };

  // 初始化
  useEffect(() => {
    if (connectionId) {
      detectDatabaseVersion();
    }
  }, [connectionId, detectDatabaseVersion]);

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}
    >
      {/* 头部信息 */}
      <Card className='m-2 mb-0'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg flex items-center'>
              <DatabaseIcon className='w-5 h-5 mr-2' />
              数据库浏览器
            </CardTitle>
            <div className='flex items-center space-x-2'>
              {databaseType && (
                <Badge variant='secondary' className='text-xs'>
                  {databaseType}
                </Badge>
              )}
              {databaseVersion && (
                <Badge variant='outline' className='text-xs'>
                  {databaseVersion}
                </Badge>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={detectDatabaseVersion}
                      size='sm'
                      variant='ghost'
                      className='h-6 w-6 p-0'
                      disabled={loading}
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>刷新版本信息</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 搜索栏 */}
      <div className='p-2'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
          <Input
            placeholder='搜索数据库、表、字段...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='pl-10'
          />
        </div>
      </div>

      <Separator />

      {/* 数据源树 */}
      <div className='flex-1 overflow-hidden'>
        <DatabaseTree
          connectionId={connectionId}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeDoubleClick}
          className='h-full'
        />
      </div>

      {/* 选中节点信息 */}
      {selectedNode && (
        <>
          <Separator />
          <Card className='m-2 mt-0'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>节点信息</CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <div className='space-y-2 text-xs'>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>名称:</span>
                  <span className='font-mono'>{selectedNode.name}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-500'>类型:</span>
                  <Badge variant='outline' className='text-xs'>
                    {selectedNode.nodeType}
                  </Badge>
                </div>
                {selectedNode.metadata &&
                  Object.keys(selectedNode.metadata).length > 0 && (
                    <div className='mt-2'>
                      <span className='text-gray-500 text-xs'>元数据:</span>
                      <div className='mt-1 space-y-1'>
                        {Object.entries(selectedNode.metadata).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className='flex justify-between text-xs'
                            >
                              <span className='text-gray-500'>{key}:</span>
                              <span className='font-mono'>{String(value)}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* 操作按钮 */}
                <div className='flex space-x-2 mt-3'>
                  {(selectedNode.nodeType === 'measurement' ||
                    selectedNode.nodeType === 'timeseries') && (
                    <Button
                      size='sm'
                      variant='outline'
                      className='text-xs h-6'
                      onClick={() => {
                        const query = generateQueryForNode(selectedNode);
                        if (query && onQueryGenerate) {
                          onQueryGenerate(query);
                        }
                      }}
                    >
                      生成查询
                    </Button>
                  )}

                  {selectedNode.nodeType === 'field' && (
                    <Button
                      size='sm'
                      variant='outline'
                      className='text-xs h-6'
                      onClick={() => {
                        // 复制字段名到剪贴板
                        navigator.clipboard.writeText(selectedNode.name);
                      }}
                    >
                      复制名称
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default VersionAwareDatabaseExplorer;
