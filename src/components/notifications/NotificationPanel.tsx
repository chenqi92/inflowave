import React from 'react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { ScrollArea } from '@/components/ui';
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
  Copy
} from 'lucide-react';
import { useNotificationStore, type NotificationItem } from '@/store/notifications';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { notify } from '@/hooks/useAppNotifications';

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

// 通知类型背景色映射
const getNotificationBgColor = (type: NotificationItem['type'], read: boolean) => {
  const opacity = read ? 'bg-opacity-30' : 'bg-opacity-50';
  switch (type) {
    case 'info':
      return `bg-blue-50 border-blue-200 ${opacity}`;
    case 'success':
      return `bg-green-50 border-green-200 ${opacity}`;
    case 'warning':
      return `bg-yellow-50 border-yellow-200 ${opacity}`;
    case 'error':
      return `bg-red-50 border-red-200 ${opacity}`;
    default:
      return `bg-gray-50 border-gray-200 ${opacity}`;
  }
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  onClose,
  className = '',
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useNotificationStore();

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
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            消息通知
          </h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 全部标记为已读 */}
          {unreadCount > 0 && (
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
          
          {/* 清空所有通知 */}
          {notifications.length > 0 && (
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

      {/* 通知列表 */}
      <div className="flex-1 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bell className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">暂无通知</p>
            <p className="text-sm text-center">
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
                    p-3 rounded-lg border cursor-pointer transition-all duration-200
                    hover:shadow-sm hover:scale-[1.02]
                    ${getNotificationBgColor(notification.type, notification.read)}
                    ${!notification.read ? 'ring-1 ring-primary/20' : ''}
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
                          !notification.read ? 'text-foreground' : 'text-muted-foreground'
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
                        !notification.read ? 'text-foreground/80' : 'text-muted-foreground'
                      }`}>
                        {notification.message}
                      </p>
                      
                      {/* 时间和来源 */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
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
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
