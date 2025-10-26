import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutionMessage, MessageType } from '@/types';

interface MessagesTabProps {
  messages?: ExecutionMessage[];
  className?: string;
}

/**
 * 消息图标组件
 */
const MessageIcon: React.FC<{ type: MessageType }> = ({ type }) => {
  const iconProps = { className: 'w-5 h-5' };
  
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} className="w-5 h-5 text-green-600 dark:text-green-400" />;
    case 'warning':
      return <AlertTriangle {...iconProps} className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    case 'error':
      return <XCircle {...iconProps} className="w-5 h-5 text-red-600 dark:text-red-400" />;
    case 'info':
    default:
      return <Info {...iconProps} className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  }
};

/**
 * 消息类型徽章
 */
const MessageTypeBadge: React.FC<{ type: MessageType }> = ({ type }) => {
  const badgeConfig = {
    success: { label: '成功', variant: 'default' as const, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    warning: { label: '警告', variant: 'default' as const, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    error: { label: '错误', variant: 'default' as const, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    info: { label: '信息', variant: 'default' as const, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  };
  
  const config = badgeConfig[type];
  
  return (
    <Badge variant={config.variant} className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
};

/**
 * 格式化时间戳
 */
const formatTimestamp = (timestamp: Date): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

/**
 * 消息 Tab 组件
 * 展示 SQL 执行过程中的消息、警告、错误信息
 */
export const MessagesTab: React.FC<MessagesTabProps> = ({ 
  messages = [], 
  className 
}) => {
  // 如果没有消息，显示空状态
  if (!messages || messages.length === 0) {
    return (
      <div className={cn('h-full flex items-center justify-center', className)}>
        <div className="text-center text-muted-foreground">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">暂无执行消息</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-4 space-y-2">
        {messages.map((msg, index) => (
          <Card 
            key={index} 
            className={cn(
              'border-l-4 transition-all hover:shadow-md',
              msg.type === 'success' && 'border-l-green-500',
              msg.type === 'warning' && 'border-l-yellow-500',
              msg.type === 'error' && 'border-l-red-500',
              msg.type === 'info' && 'border-l-blue-500'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* 消息图标 */}
                <div className="flex-shrink-0 mt-0.5">
                  <MessageIcon type={msg.type} />
                </div>
                
                {/* 消息内容 */}
                <div className="flex-1 min-w-0">
                  {/* 消息头部 */}
                  <div className="flex items-center gap-2 mb-1">
                    <MessageTypeBadge type={msg.type} />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimestamp(msg.timestamp)}</span>
                    </div>
                  </div>
                  
                  {/* 消息文本 */}
                  <div className={cn(
                    'text-sm font-medium mb-1',
                    msg.type === 'success' && 'text-green-700 dark:text-green-400',
                    msg.type === 'warning' && 'text-yellow-700 dark:text-yellow-400',
                    msg.type === 'error' && 'text-red-700 dark:text-red-400',
                    msg.type === 'info' && 'text-blue-700 dark:text-blue-400'
                  )}>
                    {msg.message}
                  </div>
                  
                  {/* 详细信息 */}
                  {msg.details && (
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                      {msg.details}
                    </div>
                  )}
                  
                  {/* SQL 语句 */}
                  {msg.sqlStatement && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        SQL 语句:
                      </div>
                      <div className="text-xs font-mono p-2 bg-muted/50 rounded overflow-x-auto">
                        {msg.sqlStatement}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

/**
 * 消息统计组件
 * 显示消息类型的统计信息
 */
export const MessageStats: React.FC<{ messages?: ExecutionMessage[] }> = ({ messages = [] }) => {
  const stats = {
    success: messages.filter(m => m.type === 'success').length,
    warning: messages.filter(m => m.type === 'warning').length,
    error: messages.filter(m => m.type === 'error').length,
    info: messages.filter(m => m.type === 'info').length,
  };
  
  const total = messages.length;
  
  if (total === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">消息统计:</span>
      {stats.success > 0 && (
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          成功 {stats.success}
        </Badge>
      )}
      {stats.warning > 0 && (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          警告 {stats.warning}
        </Badge>
      )}
      {stats.error > 0 && (
        <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          错误 {stats.error}
        </Badge>
      )}
      {stats.info > 0 && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          信息 {stats.info}
        </Badge>
      )}
    </div>
  );
};

export default MessagesTab;

