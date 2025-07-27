import React, { useState } from 'react';
import {
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { Bell, Database, Terminal } from 'lucide-react';
import DataGenerator from '@/components/tools/DataGenerator';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';

interface VerticalDevToolsProps {
  className?: string;
}

export const VerticalDevTools: React.FC<VerticalDevToolsProps> = ({
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'data-generator' | 'notification-test' | 'debug-console'
  >('data-generator');

  // 切换开发者工具
  const toggleDevTools = async () => {
    try {
      await safeTauriInvoke('toggle_devtools');
      showMessage.success('开发者工具已切换');
    } catch (error) {
      showMessage.error('切换开发者工具失败');
    }
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* 头部 */}
      <div className='p-3 border-b'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='text-sm font-semibold'>开发工具</h2>
        </div>
      </div>

      {/* 标签页 */}
      <Tabs
        value={activeTab}
        onValueChange={value =>
          setActiveTab(
            value as 'data-generator' | 'notification-test' | 'debug-console'
          )
        }
        className='flex-1 flex flex-col'
      >
        <div className='px-3 border-b'>
          <TabsList className='grid w-full grid-cols-3 h-8'>
            <TabsTrigger value='data-generator' className='text-xs'>
              <Database className='w-3 h-3 mr-1' />
              数据生成
            </TabsTrigger>
            <TabsTrigger value='notification-test' className='text-xs'>
              <Bell className='w-3 h-3 mr-1' />
              通知测试
            </TabsTrigger>
            <TabsTrigger value='debug-console' className='text-xs'>
              <Terminal className='w-3 h-3 mr-1' />
              调试控制台
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='data-generator' className='flex-1 mt-0'>
          <ScrollArea className='h-full'>
            <div className='p-3'>
              <DataGenerator />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VerticalDevTools;
