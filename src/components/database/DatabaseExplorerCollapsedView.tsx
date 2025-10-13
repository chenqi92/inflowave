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
    return (
        <div className='h-full flex flex-col items-center py-4 space-y-4'>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant='ghost' size='icon' className='w-8 h-8'>
                        <Database className='w-4 h-4'/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>数据库浏览器</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='w-8 h-8'
                        onClick={refreshTree}
                        disabled={loading}
                    >
                        <RefreshCw className='w-4 h-4'/>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>刷新</TooltipContent>
            </Tooltip>
        </div>
    );
};

