import React, { useState } from 'react';
import {
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui';
import { Activity, Database, RefreshCw } from 'lucide-react';
import DataGenerator from '@/components/tools/DataGenerator';
import { editorTelemetry } from '@/editor/cm6';

interface VerticalDevToolsProps {
  className?: string;
}

export const VerticalDevTools: React.FC<VerticalDevToolsProps> = ({
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'telemetry'>('generator');
  const [telemetryData, setTelemetryData] = useState<any>(null);

  const refreshTelemetry = () => {
    const summary = editorTelemetry.getSummary();
    setTelemetryData(summary);
    editorTelemetry.logSummary();
  };

  const clearTelemetry = () => {
    editorTelemetry.clear();
    setTelemetryData(null);
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* 头部 */}
      <div className='p-3 border-b'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-semibold'>开发工具</h2>
        </div>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <div className="px-3 border-b">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="generator" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              数据生成
            </TabsTrigger>
            <TabsTrigger value="telemetry" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              性能监控
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="generator" className="flex-1 m-0">
          <ScrollArea className='h-full'>
            <div className='p-3'>
              <DataGenerator />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="telemetry" className="flex-1 m-0">
          <ScrollArea className='h-full'>
            <div className='p-3 space-y-3'>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTelemetry}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新数据
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearTelemetry}
                >
                  清空数据
                </Button>
              </div>

              {telemetryData ? (
                <div className="space-y-3">
                  {Object.entries(telemetryData).map(([type, stats]: [string, any]) => {
                    if (stats.count === 0) return null;

                    return (
                      <Card key={type}>
                        <CardHeader className="p-3">
                          <CardTitle className="text-sm">{type}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">次数:</span>
                              <span className="ml-2 font-mono">{stats.count}</span>
                            </div>
                            {stats.avg !== null && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">平均:</span>
                                  <span className="ml-2 font-mono">{stats.avg.toFixed(2)}ms</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">最小:</span>
                                  <span className="ml-2 font-mono">{stats.min.toFixed(2)}ms</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">最大:</span>
                                  <span className="ml-2 font-mono">{stats.max.toFixed(2)}ms</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">P50:</span>
                                  <span className="ml-2 font-mono">{stats.p50.toFixed(2)}ms</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">P95:</span>
                                  <span className="ml-2 font-mono">{stats.p95.toFixed(2)}ms</span>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    点击"刷新数据"查看编辑器性能指标
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VerticalDevTools;
