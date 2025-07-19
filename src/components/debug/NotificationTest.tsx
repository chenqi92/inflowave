import React from 'react';
import { Button } from '@/components/ui';
import { specialMessage, showMessage } from '@/utils/message';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * 通知测试组件 - 用于测试各种通知功能
 */
const NotificationTest: React.FC = () => {
  const testToastNotifications = () => {
    console.log('测试Toast通知');
    showMessage.success('这是一个成功通知');
    setTimeout(() => showMessage.error('这是一个错误通知'), 1000);
    setTimeout(() => showMessage.warning('这是一个警告通知'), 2000);
    setTimeout(() => showMessage.info('这是一个信息通知'), 3000);
  };

  const testConnectionNotifications = async () => {
    console.log('测试连接通知');
    await specialMessage.connectionSuccess('测试数据库');
    setTimeout(async () => {
      await specialMessage.connectionError('测试数据库', '连接超时');
    }, 2000);
    setTimeout(async () => {
      await specialMessage.connectionLost('测试数据库');
    }, 4000);
  };

  const testQueryNotifications = async () => {
    await specialMessage.querySuccess(150, 234);
    setTimeout(async () => {
      await specialMessage.queryError('语法错误：无效的字段名');
    }, 2000);
    setTimeout(async () => {
      await specialMessage.queryTimeout(30);
    }, 4000);
  };

  const testSystemNotifications = async () => {
    await specialMessage.updateAvailable('v2.1.0');
    setTimeout(async () => {
      await specialMessage.systemError('数据库连接池已满');
    }, 2000);
  };

  const testDesktopNotification = async () => {
    // 直接测试浏览器桌面通知API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('InfloWave 测试通知', {
          body: '这是一个测试桌面通知，用于验证通知功能是否正常工作。',
          icon: '/icon.png',
          tag: 'test-notification',
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification('InfloWave 测试通知', {
            body: '通知权限已授予，桌面通知功能正常！',
            icon: '/icon.png',
            tag: 'test-notification',
          });
        } else {
          showMessage.warning('桌面通知权限被拒绝');
        }
      } else {
        showMessage.error('桌面通知权限被永久拒绝');
      }
    } else {
      showMessage.error('浏览器不支持桌面通知');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Toast 通知测试 */}
        <div className="p-3 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Toast 通知
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            测试应用内Toast通知
          </p>
          <Button size="sm" onClick={testToastNotifications} className="w-full">
            测试 Toast
          </Button>
        </div>

        {/* 连接相关通知测试 */}
        <div className="p-3 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            连接通知
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            测试连接相关通知
          </p>
          <Button size="sm" onClick={testConnectionNotifications} className="w-full">
            测试连接
          </Button>
        </div>

        {/* 查询相关通知测试 */}
        <div className="p-3 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            查询通知
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            测试查询相关通知
          </p>
          <Button size="sm" onClick={testQueryNotifications} className="w-full">
            测试查询
          </Button>
        </div>

        {/* 系统通知测试 */}
        <div className="p-3 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            系统通知
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            测试系统通知
          </p>
          <Button size="sm" onClick={testSystemNotifications} className="w-full">
            测试系统
          </Button>
        </div>
      </div>

      {/* 桌面通知测试 */}
      <div className="p-3 border rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          桌面通知测试
        </h4>
        <p className="text-xs text-muted-foreground mb-2">
          测试系统桌面通知（需要权限）
        </p>
        <Button size="sm" onClick={testDesktopNotification} className="w-full">
          测试桌面通知
        </Button>
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm">
          使用说明
        </h5>
        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <li>• 请确保在用户偏好设置中启用了相应的通知类型</li>
          <li>• 桌面通知需要浏览器权限，首次使用时会提示授权</li>
          <li>• 通知设置的更改会立即生效，无需重启应用</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationTest;