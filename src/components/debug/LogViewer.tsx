import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/Badge';
import { FileText, Trash2, Download, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { consoleLogger } from '@/utils/consoleLogger';
import { showMessage } from '@/utils/message';

/**
 * 日志查看器组件
 * 支持查看前端和后端日志
 */
export const LogViewer: React.FC = () => {
  const [frontendLogs, setFrontendLogs] = useState<string>('');
  const [backendLogs, setBackendLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend'>('frontend');

  // 加载前端日志
  const loadFrontendLogs = async () => {
    try {
      const logs = consoleLogger.getLogs();
      const logText = logs
        .map(log => {
          const timestamp = log.timestamp.toISOString();
          const level = log.level.toUpperCase().padEnd(5);
          let text = `[${timestamp}] [${level}] ${log.message}`;
          
          if (log.source) {
            text += `\n  Source: ${log.source}`;
          }
          
          return text;
        })
        .join('\n\n');
      
      setFrontendLogs(logText || '暂无前端日志');
    } catch (error) {
      console.error('加载前端日志失败:', error);
      showMessage.error('加载前端日志失败');
    }
  };

  // 加载后端日志
  const loadBackendLogs = async () => {
    setLoading(true);
    try {
      const logs = await invoke<string>('read_backend_logs');
      setBackendLogs(logs || '暂无后端日志');
    } catch (error) {
      console.error('加载后端日志失败:', error);
      showMessage.error('加载后端日志失败');
      setBackendLogs('加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 清空前端日志
  const clearFrontendLogs = () => {
    consoleLogger.clearLogs();
    setFrontendLogs('');
    showMessage.success('前端日志已清空');
  };

  // 清空后端日志
  const clearBackendLogs = async () => {
    try {
      await invoke('clear_backend_logs');
      setBackendLogs('');
      showMessage.success('后端日志已清空');
    } catch (error) {
      console.error('清空后端日志失败:', error);
      showMessage.error('清空后端日志失败');
    }
  };

  // 下载日志
  const downloadLogs = (type: 'frontend' | 'backend') => {
    const content = type === 'frontend' ? frontendLogs : backendLogs;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessage.success('日志已下载');
  };

  // 刷新日志
  const refreshLogs = () => {
    if (activeTab === 'frontend') {
      loadFrontendLogs();
    } else {
      loadBackendLogs();
    }
  };

  // 初始加载
  useEffect(() => {
    loadFrontendLogs();
    loadBackendLogs();
  }, []);

  // 自动刷新前端日志
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'frontend') {
        loadFrontendLogs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              日志查看器
            </CardTitle>
            <CardDescription>
              查看和管理前后端日志，应用重启时自动清空
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadLogs(activeTab)}
            >
              <Download className="h-4 w-4 mr-2" />
              下载
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeTab === 'frontend' ? clearFrontendLogs() : clearBackendLogs()}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'frontend' | 'backend')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="frontend" className="flex items-center gap-2">
              <Badge variant="secondary">前端</Badge>
              前端日志
            </TabsTrigger>
            <TabsTrigger value="backend" className="flex items-center gap-2">
              <Badge variant="secondary">后端</Badge>
              后端日志
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="frontend" className="mt-4">
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {frontendLogs || '暂无前端日志'}
              </pre>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="backend" className="mt-4">
            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">
                {backendLogs || '暂无后端日志'}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

