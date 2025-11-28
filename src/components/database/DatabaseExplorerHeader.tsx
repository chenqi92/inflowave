/**
 * 数据库浏览器头部 - JetBrains New UI 风格
 * 紧凑布局, 13px 字体, h-7 按钮
 */
import React from 'react';
import { Button, CardContent, Tooltip, TooltipContent, TooltipTrigger, Typography, ExpandableSearchInput } from '@/components/ui';
import { Filter, RefreshCw, Plus } from 'lucide-react';
import type { ConnectionConfig } from '@/types';
import logger from '@/utils/logger';

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
    // JetBrains New UI 风格: 紧凑的侧边栏头部
    return (
        <CardContent className='px-2 py-1.5 border-b'>
            <div ref={headerRef} className='flex items-center justify-between w-[280px]'>
                <div className='flex items-center gap-1.5 flex-shrink-0'>
                    <Typography.Text className='text-[13px] font-medium whitespace-nowrap'>数据源</Typography.Text>
                </div>
                <div className='flex items-center gap-0.5 flex-shrink-0'>
                    {/* 可展开搜索框 */}
                    <ExpandableSearchInput
                        placeholder='搜索连接、数据库、表...'
                        value={searchValue}
                        onChange={(value: string) => setSearchValue(value)}
                        onClear={() => setSearchValue('')}
                    />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={hideSystemNodes ? 'default' : 'ghost'}
                                size='sm'
                                className='h-7 w-7 p-0'
                                onClick={() => {
                                    const newHideSystemNodes = !hideSystemNodes;
                                    logger.info(`🔄 按钮点击：过滤状态从 ${hideSystemNodes} 变为 ${newHideSystemNodes}`);
                                    setHideSystemNodes(newHideSystemNodes);
                                }}
                                title={hideSystemNodes ? '显示系统节点' : '隐藏系统节点'}
                            >
                                <Filter className='w-3.5 h-3.5'/>
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
                                className='h-7 w-7 p-0'
                                onClick={refreshTree}
                                disabled={loading}
                                title='刷新数据源树并测试连接'
                            >
                                <RefreshCw className='w-3.5 h-3.5'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>刷新数据源树并测试连接</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 w-7 p-0'
                                onClick={() => handleOpenConnectionDialog()}
                                title='添加数据源'
                            >
                                <Plus className='w-3.5 h-3.5'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>添加数据源</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </CardContent>
    );
};

