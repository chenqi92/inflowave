import React from 'react';
import { Button, CardContent, Tooltip, TooltipContent, TooltipTrigger, Typography, SearchInput } from '@/components/ui';
import { Filter, RefreshCw, Plus } from 'lucide-react';
import type { ConnectionConfig } from '@/types';

interface DatabaseExplorerHeaderProps {
    headerRef: React.RefObject<HTMLDivElement>;
    hideSystemNodes: boolean;
    setHideSystemNodes: (value: boolean) => void;
    refreshTree: () => Promise<void>;
    loading: boolean;
    handleOpenConnectionDialog: (connection?: ConnectionConfig) => void;
    searchValue: string;
    setSearchValue: (value: string) => void;
}

export const DatabaseExplorerHeader: React.FC<DatabaseExplorerHeaderProps> = ({
    headerRef,
    hideSystemNodes,
    setHideSystemNodes,
    refreshTree,
    loading,
    handleOpenConnectionDialog,
    searchValue,
    setSearchValue,
}) => {
    return (
        <CardContent className='p-3 border-b'>
            <div ref={headerRef} className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                    <Typography.Text className='text-sm font-medium'>数据源</Typography.Text>
                </div>
                <div className='flex items-center gap-1'>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={hideSystemNodes ? 'ghost' : 'default'}
                                size='sm'
                                onClick={() => {
                                    const newHideSystemNodes = !hideSystemNodes;
                                    console.log(`🔄 按钮点击：过滤状态从 ${hideSystemNodes} 变为 ${newHideSystemNodes}`);
                                    setHideSystemNodes(newHideSystemNodes);
                                }}
                                title={hideSystemNodes ? '显示系统节点' : '隐藏系统节点'}
                            >
                                <Filter className='w-4 h-4'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {hideSystemNodes ? '显示系统节点' : '隐藏系统节点'}
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={refreshTree}
                                disabled={loading}
                                title='刷新数据源树并测试连接'
                            >
                                <RefreshCw className='w-4 h-4'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>刷新数据源树并测试连接</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleOpenConnectionDialog()}
                                title='添加数据源'
                            >
                                <Plus className='w-4 h-4'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>添加数据源</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* 搜索框 */}
            <SearchInput
                placeholder='搜索连接、数据库、表...'
                value={searchValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
                onClear={() => setSearchValue('')}
                className='text-sm'
            />
        </CardContent>
    );
};

