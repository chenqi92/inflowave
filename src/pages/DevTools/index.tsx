import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { Database, Bug, Wrench } from 'lucide-react';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import DataGenerator from '@/components/tools/DataGenerator';
import ErrorLogViewer from '@/components/debug/ErrorLogViewer';

const DevTools: React.FC = () => {
  const tabItems = [
    {
      key: 'data-generator',
      label: (
        <span>
          <Database className="w-4 h-4" />
          数据生成器
        </span>
      ),
      children: <DataGenerator />},
    {
      key: 'error-logs',
      label: (
        <span>
          <Bug className="w-4 h-4" />
          错误日志
        </span>
      ),
      children: <ErrorLogViewer />},
  ];

  return (
    <DesktopPageWrapper
      title="开发者工具"
      description="数据生成、调试和开发辅助工具"
      toolbar={
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4" />
          <span className="text-sm text-gray-600">
            开发测试工具集
          </span>
        </div>
      }
    >
      <div className="h-full">
        <Tabs
          defaultValue="data-generator"
          className="h-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            {tabItems.map((item) => (
              <TabsTrigger key={item.key} value={item.key}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabItems.map((item) => (
            <TabsContent key={item.key} value={item.key} className="mt-4">
              {item.children}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DesktopPageWrapper>
  );
};

export default DevTools;