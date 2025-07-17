import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Database, Bug, Wrench, Terminal } from 'lucide-react';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import DataGenerator from '@/components/tools/DataGenerator';
import ErrorLogViewer from '@/components/debug/ErrorLogViewer';
import DebugConsole from '@/components/debug/DebugConsole';

const DevTools: React.FC = () => {
  return (
    <DesktopPageWrapper
      title='开发者工具'
      description='数据生成、调试和开发辅助工具'
      toolbar={
        <div className='flex items-center gap-2'>
          <Wrench className='w-4 h-4' />
          <span className='text-sm text-muted-foreground'>开发测试工具集</span>
        </div>
      }
    >
      <div className='h-full'>
        <Tabs defaultValue='data-generator' className='h-full flex flex-col'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger
              value='data-generator'
              className='flex items-center gap-2'
            >
              <Database className='w-4 h-4' />
              数据生成器
            </TabsTrigger>
            <TabsTrigger value='error-logs' className='flex items-center gap-2'>
              <Bug className='w-4 h-4' />
              错误日志
            </TabsTrigger>
            <TabsTrigger value='debug-console' className='flex items-center gap-2'>
              <Terminal className='w-4 h-4' />
              调试控制台
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='data-generator'
            className='flex-1 mt-4 overflow-hidden'
          >
            <div className='h-full overflow-y-auto'>
              <DataGenerator />
            </div>
          </TabsContent>

          <TabsContent
            value='error-logs'
            className='flex-1 mt-4 overflow-hidden'
          >
            <div className='h-full overflow-y-auto'>
              <ErrorLogViewer />
            </div>
          </TabsContent>

          <TabsContent
            value='debug-console'
            className='flex-1 mt-4 overflow-hidden'
          >
            <div className='h-full overflow-y-auto'>
              <DebugConsole />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DesktopPageWrapper>
  );
};

export default DevTools;
