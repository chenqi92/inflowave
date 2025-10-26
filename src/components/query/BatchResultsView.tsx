import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  XCircle, 
  ChevronDown,
  ChevronRight,
  Clock,
  Hash,
  FileText,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import QueryResults from './QueryResults';
import type { QueryResult } from '@/types';

interface BatchResultsViewProps {
  results: QueryResult[];
  queries: string[];
  totalExecutionTime: number;
  mode?: 'tabs' | 'accordion';
  className?: string;
}

/**
 * 格式化执行时间
 */
const formatExecutionTime = (ms?: number): string => {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

/**
 * 截断 SQL 语句
 */
const truncateSQL = (sql: string, maxLength: number = 60): string => {
  const cleaned = sql.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength) + '...';
};

/**
 * 获取结果状态
 */
const getResultStatus = (result: QueryResult) => {
  const hasError = !!result.error;
  const rowCount = result.rowCount || 0;
  
  return {
    hasError,
    rowCount,
    executionTime: result.executionTime || 0,
  };
};

/**
 * Tab 模式展示
 */
const TabsMode: React.FC<BatchResultsViewProps> = ({ 
  results, 
  queries,
  totalExecutionTime 
}) => {
  const [activeTab, setActiveTab] = useState('0');
  
  return (
    <div className="h-full flex flex-col">
      {/* 批量执行概览 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4" />
              批量执行结果
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>共 {results.length} 条语句</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span>{results.filter(r => !r.error).length} 成功</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-600" />
                <span>{results.filter(r => r.error).length} 失败</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>总耗时 {formatExecutionTime(totalExecutionTime)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* 结果 Tabs */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <ScrollArea className="border-b">
            <TabsList className="mx-4 my-2 inline-flex">
              {results.map((result, index) => {
                const status = getResultStatus(result);
                return (
                  <TabsTrigger 
                    key={index} 
                    value={String(index)}
                    className="flex items-center gap-2"
                  >
                    {status.hasError ? (
                      <XCircle className="w-3 h-3 text-red-600" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    )}
                    <span>语句 {index + 1}</span>
                    {!status.hasError && (
                      <Badge variant="secondary" className="text-xs">
                        {status.rowCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>
          
          <div className="flex-1 overflow-hidden">
            {results.map((result, index) => (
              <TabsContent 
                key={index} 
                value={String(index)}
                className="h-full m-0"
              >
                <QueryResults
                  result={result}
                  executedQuery={queries[index]}
                  loading={false}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </Card>
    </div>
  );
};

/**
 * 折叠面板模式展示
 */
const AccordionMode: React.FC<BatchResultsViewProps> = ({ 
  results, 
  queries,
  totalExecutionTime 
}) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));
  
  const toggleItem = (index: number) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  return (
    <div className="h-full">
      {/* 批量执行概览 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4" />
              批量执行结果
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>共 {results.length} 条语句</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span>{results.filter(r => !r.error).length} 成功</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-600" />
                <span>{results.filter(r => r.error).length} 失败</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>总耗时 {formatExecutionTime(totalExecutionTime)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* 折叠面板列表 */}
      <ScrollArea className="h-[calc(100%-5rem)]">
        <div className="space-y-2">
          {results.map((result, index) => {
            const status = getResultStatus(result);
            const isOpen = openItems.has(index);
            
            return (
              <Card key={index}>
                <Collapsible open={isOpen} onOpenChange={() => toggleItem(index)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                          {status.hasError ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              语句 {index + 1}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              {truncateSQL(queries[index])}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {!status.hasError && (
                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              <span>{status.rowCount} 行</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatExecutionTime(status.executionTime)}</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="h-[500px]">
                        <QueryResults
                          result={result}
                          executedQuery={queries[index]}
                          loading={false}
                        />
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

/**
 * 批量结果展示组件
 */
export const BatchResultsView: React.FC<BatchResultsViewProps> = ({ 
  results,
  queries,
  totalExecutionTime,
  mode = 'tabs',
  className 
}) => {
  if (results.length === 0) {
    return (
      <div className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无批量执行结果</p>
        </div>
      </div>
    );
  }
  
  // 单个结果直接使用 QueryResults
  if (results.length === 1) {
    return (
      <QueryResults
        result={results[0]}
        executedQuery={queries[0]}
        loading={false}
      />
    );
  }
  
  return (
    <div className={cn('h-full', className)}>
      {mode === 'tabs' ? (
        <TabsMode 
          results={results} 
          queries={queries} 
          totalExecutionTime={totalExecutionTime}
        />
      ) : (
        <AccordionMode 
          results={results} 
          queries={queries} 
          totalExecutionTime={totalExecutionTime}
        />
      )}
    </div>
  );
};

export default BatchResultsView;

