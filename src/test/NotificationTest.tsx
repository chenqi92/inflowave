import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';

const NotificationTest: React.FC = () => {
  const [title, setTitle] = useState('测试通知');
  const [message, setMessage] = useState('这是一个测试通知消息');
  const [notificationType, setNotificationType] = useState('info');
  const [duration, setDuration] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testNotification = async () => {
    setLoading(true);
    setResult('');
    
    try {
      console.log('发送通知测试，参数:', {
        title,
        message,
        notification_type: notificationType,
        duration,
      });

      await safeTauriInvoke('send_notification', {
        title,
        message,
        notification_type: notificationType,
        duration,
      });

      setResult('✅ 通知发送成功！');
      showMessage.success('通知测试成功');
    } catch (error) {
      console.error('通知发送失败:', error);
      setResult(`❌ 通知发送失败: ${error}`);
      showMessage.error(`通知测试失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testUserPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await safeTauriInvoke('get_user_preferences');
      console.log('用户偏好设置:', prefs);
      setResult(`✅ 用户偏好设置获取成功: ${JSON.stringify(prefs, null, 2)}`);
    } catch (error) {
      console.error('获取用户偏好设置失败:', error);
      setResult(`❌ 获取用户偏好设置失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>通知系统测试</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">标题</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="通知标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">类型</label>
              <Select value={notificationType} onValueChange={setNotificationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">信息</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="warning">警告</SelectItem>
                  <SelectItem value="error">错误</SelectItem>
                  <SelectItem value="query_completion">查询完成</SelectItem>
                  <SelectItem value="connection_status">连接状态</SelectItem>
                  <SelectItem value="system_alert">系统警告</SelectItem>
                  <SelectItem value="export_completion">导出完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">消息内容</label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="通知消息内容"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">持续时间 (毫秒)</label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              placeholder="5000"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testNotification} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? '发送中...' : '测试通知'}
            </Button>
            <Button 
              onClick={testUserPreferences} 
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? '获取中...' : '测试用户偏好'}
            </Button>
          </div>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">测试结果:</h4>
              <pre className="text-sm whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修复说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>问题:</strong> send_notification 命令返回 null 或 undefined</p>
            <p><strong>原因:</strong> 前端调用参数结构与后端期望不匹配</p>
            <p><strong>修复:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>移除了多余的 notification 包装层</li>
              <li>修正了参数字段名 (severity → notification_type)</li>
              <li>确保参数结构与 NotificationRequest 匹配</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationTest;
