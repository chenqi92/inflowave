/**
 * 数据库浏览器头部 - JetBrains New UI 风格
 * 紧凑布局, 13px 字体, h-7 按钮
 */
import React from 'react';
import { Button, CardContent, Tooltip, TooltipContent, TooltipTrigger, Typography, ExpandableSearchInput } from '@/components/ui';
import { Filter, RefreshCw, Plus } from 'lucide-react';
import type { ConnectionConfig } from '@/types';
import logger from '@/utils/logger';
import {useDatabaseExplorerTranslation} from '@/hooks/useTranslation';

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
    const {t} = useDatabaseExplorerTranslation();
    // JetBrains New UI 风格: 紧凑的侧边栏头部
    return (
        <CardContent className='px-2 py-1.5 border-b'>
            <div ref={headerRef} className='flex items-center justify-between w-[280px]'>
                <div className='flex items-center gap-1.5 flex-shrink-0'>
                    <Typography.Text className='text-sm font-medium whitespace-nowrap'>{t('header.title')}</Typography.Text>
                </div>
                <div className='flex items-center gap-0.5 flex-shrink-0'>
                    {/* 可展开搜索框 */}
                    <ExpandableSearchInput
                        placeholder={t('header.search')}
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
                                title={t(hideSystemNodes ? 'header.showSystemNodes' : 'header.hideSystemNodes')}
                            >
                                <Filter className='w-3.5 h-3.5'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {t(hideSystemNodes ? 'header.showSystemNodes' : 'header.hideSystemNodes')}
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
                                title={t('header.refresh')}
                            >
                                <RefreshCw className='w-3.5 h-3.5'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('header.refresh')}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant='ghost'
                                size='sm'
                                className='h-7 w-7 p-0'
                                onClick={() => handleOpenConnectionDialog()}
                                title={t('header.add')}
                            >
                                <Plus className='w-3.5 h-3.5'/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('header.add')}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </CardContent>
    );
};

