import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { safeTauriInvoke } from '@/utils/tauri';
import { Button, Form, Input, InputNumber, Switch, Typography } from '@/components/ui';
import { Card, toast } from '@/components/ui';

interface ConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  ssl: boolean;
  timeout: number;
  created_at: string;
  updated_at: string;
}

interface ConnectionTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  server_version?: string;
}

const ConnectionTest: React.FC = () => {
  const form = useForm();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const handleTest = async (values: Record<string, string | number>) => {
    setLoading(true);
    setTestResult(null);

    try {
      // 创建连接配置
      const config: Partial<ConnectionConfig> = {
        id: `test-${Date.now()}`,
        name: values.name || 'Test Connection',
        host: values.host,
        port: values.port,
        username: values.username,
        password: values.password,
        database: values.database,
        ssl: values.ssl || false,
        timeout: values.timeout || 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()};

      // 调用后端创建连接
      const connectionId = await safeTauriInvoke<string>('create_connection', { config });

      // 测试连接
      const result = await safeTauriInvoke<ConnectionTestResult>('test_connection', {
        connectionId
      });
      
      setTestResult(result);
      
      if (result.success) {
        toast({ title: "成功", description: "连接成功！延迟: ${result.latency}ms" });
      } else {
        toast({ title: "错误", description: "连接失败: ${result.error}", variant: "destructive" });
      }

      // 清理测试连接
      await safeTauriInvoke('delete_connection', { connectionId: connectionId });
      
    } catch (error) {
      console.error('连接测试失败:', error);
      toast({ title: "错误", description: "连接测试失败: ${error}", variant: "destructive" });
      setTestResult({
        success: false,
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card title="InfluxDB 连接测试" className="mb-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleTest}
          initialValues={{
            host: 'localhost',
            port: 8086,
            ssl: false,
            timeout: 30}}>
          <FormItem
            label="连接名称"
            name="name"
            rules={[{ required: true, message: '请输入连接名称' }]}>
            <Input placeholder="例如: 本地 InfluxDB" />
          </FormItem>

          <FormItem
            label="主机地址"
            name="host"
            rules={[{ required: true, message: '请输入主机地址' }]}>
            <Input placeholder="localhost 或 IP 地址" />
          </FormItem>

          <FormItem
            label="端口"
            name="port"
            rules={[{ required: true, message: '请输入端口号' }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </FormItem>

          <FormItem label="用户名" name="username">
            <Input placeholder="可选" />
          </FormItem>

          <FormItem label="密码" name="password">
            <Input.Password placeholder="可选" />
          </FormItem>

          <FormItem label="数据库" name="database">
            <Input placeholder="可选，默认连接后选择" />
          </FormItem>

          <FormItem label="使用 SSL" name="ssl" valuePropName="checked">
            <Switch />
          </FormItem>

          <FormItem
            label="超时时间 (秒)"
            name="timeout"
            rules={[{ required: true, message: '请输入超时时间' }]}>
            <InputNumber min={1} max={300} style={{ width: '100%' }} />
          </FormItem>

          <FormItem>
            <Button
              type="primary"
              htmlType="submit"
              disabled={loading}
              size="large"
              block>
              {loading ? '测试中...' : '测试连接'}
            </Button>
          </FormItem>
        </Form>
      </Card>

      {/* 测试结果 */}
      {testResult && (
        <Card 
          title="测试结果" 
          className={`mb-6 ${testResult.success ? 'border-green-500' : 'border-red-500'}`}>
          <div className="space-y-2">
            <div className="flex items-center">
              <Typography.Text className="font-medium mr-2">状态:</Typography.Text>
              <span className={testResult.success ? 'text-success' : 'text-red-600'}>
                {testResult.success ? '✅ 连接成功' : '❌ 连接失败'}
              </span>
            </div>
            
            {testResult.latency && (
              <div className="flex items-center">
                <Typography.Text className="font-medium mr-2">延迟:</Typography.Text>
                <span className="text-primary">{testResult.latency} ms</span>
              </div>
            )}
            
            {testResult.server_version && (
              <div className="flex items-center">
                <Typography.Text className="font-medium mr-2">服务器版本:</Typography.Text>
                <span className="text-muted-foreground">{testResult.server_version}</span>
              </div>
            )}
            
            {testResult.error && (
              <div className="flex items-start">
                <Typography.Text className="font-medium mr-2">错误:</Typography.Text>
                <span className="text-red-600 break-all">{testResult.error}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 使用说明 */}
      <Card title="使用说明" size="small">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>• 确保 InfluxDB 服务正在运行</p>
          <p>• 默认端口通常是 8086</p>
          <p>• 如果启用了认证，请提供用户名和密码</p>
          <p>• SSL 连接需要服务器支持 HTTPS</p>
        </div>
      </Card>
    </div>
  );
};

export default ConnectionTest;
