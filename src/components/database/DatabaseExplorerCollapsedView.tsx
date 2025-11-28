/**
 * 数据库浏览器折叠视图 - JetBrains New UI 风格
 * 紧凑布局, h-7 按钮, 14px 图标
 */
import React from 'react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { Database, RefreshCw } from 'lucide-react';

interface DatabaseExplorerCollapsedViewProps {
    refreshTree: () => Promise<void>;
    loading: boolean;
}

export const DatabaseExplorerCollapsedView: React.FC<DatabaseExplorerCollapsedViewProps> = ({
    refreshTree,
    loading,
}) => {
    // JetBrains New UI 风格: 紧凑的折叠侧边栏
    return (
        <div className='h-full flex flex-col items-center py-2 space-y-1'>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant='ghost' size='icon' className='w-7 h-7'>
                        <Database className='w-3.5 h-3.5'/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>数据库浏览器</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='w-7 h-7'
                        onClick={refreshTree}
                        disabled={loading}
                    >
                        <RefreshCw className='w-3.5 h-3.5'/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>刷新</TooltipContent>
            </Tooltip>
        </div>
    );
};

