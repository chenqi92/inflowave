import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { ScrollArea } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  X,
  Trash2,
  CheckCheck,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Copy,
  FileText
} from 'lucide-react';
import { useNotificationStore, type NotificationItem } from '@/store/notifications';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { notify } from '@/hooks/useAppNotifications';
import LogViewer from '@/components/settings/LogViewer';
import BackendLogViewer from './BackendLogViewer';

interface NotificationPanelProps {
  onClose: () => void;
  className?: string;
}

// 通知类型图标映射
const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'info':
      return <Info className="w-4 h-4 text-blue-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
  }
};

// 通知类型背景色映射（支持暗色模式）
const getNotificationBgColor = (type: NotificationItem['type'], read: boolean) => {
  const readOpacity = read ? 'opacity-70' : 'opacity-100';
  const baseClasses = `border transition-all duration-200 ${readOpacity}`;

  switch (type) {
    case 'info':
      return `${baseClasses} bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50`;
    case 'success':
      return `${baseClasses} bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800/50 hover:bg-green-100 dark:hover:bg-green-900/50`;
    case 'warning':
      return `${baseClasses} bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800/50 hover:bg-yellow-100 dark:hover:bg-yellow-900/50`;
    case 'error':
      return `${baseClasses} bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/50`;
    default:
      return `${baseClasses} bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800/50`;
  }
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  onClose,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('notifications');
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotificationStore();

  // 监听切换到日志标签页的事件
  useEffect(() => {
    const handleSwitchToLogsTab = () => {
      setActiveTab('frontend-logs');
    };

    document.addEventListener('switch-to-logs-tab', handleSwitchToLogsTab);

    return () => {
      document.removeEventListener('switch-to-logs-tab', handleSwitchToLogsTab);
    };
  }, []);

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleRemoveNotification = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeNotification(id);
  };

  const handleCopyNotification = async (notification: NotificationItem, event: React.MouseEvent) => {
    event.stopPropagation();

    const content = `${notification.title}\n${notification.message}`;

    try {
      await navigator.clipboard.writeText(content);
      notify.general.success('复制成功', '消息内容已复制到剪贴板');
    } catch (error) {
      console.error('复制失败:', error);
      notify.general.error('复制失败', '无法访问剪贴板');
    }
  };

  return (
    <div className={`bg-background border-l border-border flex flex-col h-full ${className}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 dark:bg-muted/20">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">消息中心</h3>
          {unreadCount > 0 && activeTab === 'notifications' && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 全部标记为已读 - 仅在通知标签页显示 */}
          {activeTab === 'notifications' && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={markAllAsRead}
              title="全部标记为已读"
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
          )}

          {/* 清空所有通知 - 仅在通知标签页显示 */}
          {activeTab === 'notifications' && notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={clearAllNotifications}
              title="清空所有通知"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {/* 关闭按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent"
            onClick={onClose}
            title="关闭面板"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs 切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-auto grid grid-cols-3">
          <TabsTrigger
            value="notifications"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <Bell className="w-4 h-4 mr-2" />
            通知消息
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="frontend-logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FileText className="w-4 h-4 mr-2" />
            前端日志
          </TabsTrigger>
          <TabsTrigger
            value="backend-logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FileText className="w-4 h-4 mr-2" />
            后端日志
          </TabsTrigger>
        </TabsList>

        {/* 通知消息标签页 */}
        <TabsContent value="notifications" className="flex-1 m-0 overflow-hidden">
          <div className="flex-1 overflow-hidden h-full">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground dark:text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-50 dark:opacity-40" />
            <p className="text-lg font-medium mb-2 dark:text-muted-foreground">暂无通知</p>
            <p className="text-sm text-center dark:text-muted-foreground">
              软件启动后的所有消息通知将显示在这里
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    p-3 rounded-lg cursor-pointer group
                    shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
                    hover:shadow-[inset_0_3px_6px_rgba(0,0,0,0.15)] dark:hover:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)]
                    transition-all duration-200
                    ${getNotificationBgColor(notification.type, notification.read)}
                    ${!notification.read ? 'ring-1 ring-primary/30 dark:ring-primary/50' : ''}
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {/* 通知图标 */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* 通知内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium truncate ${
                          !notification.read
                            ? 'text-foreground dark:text-foreground'
                            : 'text-muted-foreground dark:text-muted-foreground'
                        }`}>
                          {notification.title}
                        </h4>

                        {/* 操作按钮组 */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          {/* 复制按钮 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-accent flex-shrink-0"
                            onClick={(e) => handleCopyNotification(notification, e)}
                            title="复制消息内容"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>

                          {/* 删除按钮 */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-accent flex-shrink-0"
                            onClick={(e) => handleRemoveNotification(notification.id, e)}
                            title="删除通知"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className={`text-xs mt-1 ${
                        !notification.read
                          ? 'text-foreground/80 dark:text-foreground/90'
                          : 'text-muted-foreground dark:text-muted-foreground'
                      }`}>
                        {notification.message}
                      </p>
                      
                      {/* 时间和来源 */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.timestamp), {
                            addSuffix: true,
                            locale: zhCN,
                          })}
                        </span>
                        {notification.source && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{notification.source}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* 未读标识 */}
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary dark:bg-primary rounded-full flex-shrink-0 mt-2 shadow-sm"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
          </div>
        </TabsContent>

        {/* 前端日志标签页 */}
        <TabsContent value="frontend-logs" className="flex-1 m-0 overflow-hidden">
          <LogViewer />
        </TabsContent>

        {/* 后端日志标签页 */}
        <TabsContent value="backend-logs" className="flex-1 m-0 overflow-hidden">
          <BackendLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationPanel;
