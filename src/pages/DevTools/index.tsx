import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Alert } from '@/components/ui';
import { Database, Wrench, Terminal, Bell, Info } from 'lucide-react';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import DataGenerator from '@/components/tools/DataGenerator';
import DebugConsole from '@/components/debug/DebugConsole';
import NotificationTest from '@/components/debug/NotificationTest';

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
            <TabsTrigger value='notification-test' className='flex items-center gap-2'>
              <Bell className='w-4 h-4' />
              通知测试
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
              <div className='max-w-6xl mx-auto space-y-6'>
                {/* 数据生成器内容 */}
                <div className='bg-card border rounded-lg p-6'>
                  <DataGenerator />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value='notification-test'
            className='flex-1 mt-4 overflow-hidden'
          >
            <div className='h-full overflow-y-auto'>
              <div className='max-w-4xl mx-auto space-y-6'>
                {/* 开发环境提示 */}
                {(import.meta as any).env?.DEV && (
                  <Alert>
                    <Info className='h-4 w-4' />
                    <div>
                      <h5 className='font-medium'>开发模式</h5>
                      <p className='text-sm text-muted-foreground'>
                        当前运行在开发模式下，所有通知功能均可测试。生产环境中某些通知可能会有不同的行为。
                      </p>
                    </div>
                  </Alert>
                )}

                {/* 通知测试组件 */}
                <div className='bg-card border rounded-lg p-6'>
                  <NotificationTest />
                </div>
              </div>
            </div>
          </TabsContent>


          <TabsContent
            value='debug-console'
            className='flex-1 mt-4 overflow-hidden'
          >
            <div className='h-full overflow-y-auto'>
              <div className='max-w-6xl mx-auto space-y-6'>
                {/* 调试控制台内容 */}
                <div className='bg-card border rounded-lg p-6 min-h-[500px]'>
                  <DebugConsole />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DesktopPageWrapper>
  );
};

export default DevTools;
