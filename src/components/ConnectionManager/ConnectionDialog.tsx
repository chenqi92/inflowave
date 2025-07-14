import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Button, Alert, AlertDescription, Dialog, DialogContent, DialogHeader, DialogTitle, Typography } from '@/components/ui';
import { Switch } from '@/components/ui';
import { Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useConnection } from '@/hooks/useConnection';
import { ValidationUtils } from '@/utils/validation';
import { safeTauriInvoke } from '@/utils/tauri';
import type { ConnectionConfig, ConnectionTestResult } from '@/types';
import './ConnectionDialog.css';

interface ConnectionDialogProps {
  open: boolean;
  connection?: ConnectionConfig;
  onCancel: () => void;
  onSuccess: (connection: ConnectionConfig) => void;
}

interface FormData {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  ssl: boolean;
  timeout: number;
}

export const ConnectionDialog: React.FC<ConnectionDialogProps> = ({
  open,
  connection,
  onCancel,
  onSuccess}) => {
  const { createConnection, editConnection, testConnection, createTempConnectionForTest, deleteTempConnection } = useConnection();
  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      host: '',
      port: 8086,
      username: '',
      password: '',
      database: '',
      ssl: false,
      timeout: 30
    }
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const isEditing = !!connection?.id;

  useEffect(() => {
    if (open) {
      if (connection) {
        form.setValue('name', connection.name);
        form.setValue('host', connection.host);
        form.setValue('port', connection.port);
        form.setValue('username', connection.username);
        form.setValue('password', connection.password);
        form.setValue('database', connection.database || '');
        form.setValue('ssl', connection.ssl);
        form.setValue('timeout', connection.timeout);
      } else {
        form.reset();
      }
      setCurrentStep(0);
      setTestResult(null);
    }
  }, [open, connection, form]);

  const handleTestConnection = async () => {
    try {
      const values = form.getValues();
      setIsTesting(true);
      setTestResult(null);

      // 创建临时连接配置用于测试
      const tempConfig: ConnectionConfig = {
        id: `temp-test-${Date.now()}`,
        ...values,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 使用专门的临时连接创建函数（不添加到前端状态）
      const tempId = await createTempConnectionForTest(tempConfig);

      try {
        // 测试连接
        const result = await testConnection(tempId);
        setTestResult(result);

        if (result.success) {
          setCurrentStep(1);
        }
      } finally {
        // 删除临时连接
        await deleteTempConnection(tempId);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      setTestResult({
        success: false,
        error: String(error),
        latency: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (values: FormData) => {
    try {
      setIsSubmitting(true);

      const configData: ConnectionConfig = {
        ...values,
        id: connection?.id,
        created_at: connection?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // 保持向后兼容性
        createdAt: connection?.createdAt || new Date(),
        updatedAt: new Date()
      };

      if (isEditing) {
        await editConnection(configData);
      } else {
        const id = await createConnection(configData);
        configData.id = id;
      }

      onSuccess(configData);
    } catch (error) {
      console.error('保存连接失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderConnectionForm = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        rules={{ 
          required: '请输入连接名称',
          minLength: { value: 1, message: '连接名称长度为1-100个字符' },
          maxLength: { value: 100, message: '连接名称长度为1-100个字符' }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>连接名称</FormLabel>
            <FormControl>
              <Input placeholder="输入连接名称" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="host"
          rules={{ required: '请输入主机地址' }}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>主机地址</FormLabel>
              <FormControl>
                <Input placeholder="localhost 或 192.168.1.100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="port"
          rules={{ 
            required: '请输入端口',
            min: { value: 1, message: '端口范围: 1-65535' },
            max: { value: 65535, message: '端口范围: 1-65535' }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>端口</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="8086" 
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="username"
          rules={{ maxLength: { value: 50, message: '用户名长度不能超过50个字符' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="可选" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          rules={{ maxLength: { value: 128, message: '密码长度不能超过128个字符' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input type="password" placeholder="可选" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="database"
        render={({ field }) => (
          <FormItem>
            <FormLabel>默认数据库</FormLabel>
            <FormControl>
              <Input placeholder="可选" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="ssl"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>启用SSL</FormLabel>
                <div className="text-sm text-muted-foreground">使用SSL加密连接</div>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timeout"
          rules={{ 
            min: { value: 5, message: '超时时间范围: 5-300秒' },
            max: { value: 300, message: '超时时间范围: 5-300秒' }
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>超时时间(秒)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="30" 
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <div className="space-y-4">
        <Alert
          message={testResult.success ? '连接测试成功' : '连接测试失败'}
          description={
            testResult.success ? (
              <div className="space-y-2">
                <div>服务器版本: {testResult.serverVersion || '未知'}</div>
                <div>延迟: {testResult.latency}ms</div>
                {testResult.databases && testResult.databases.length > 0 && (
                  <div>
                    可用数据库: {testResult.databases.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              testResult.error
            )
          }
          type={testResult.success ? 'success' : 'error'}
          showIcon
        />

        {testResult.success && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle />
              <Typography.Text className="font-medium">连接配置正确</Typography.Text>
            </div>
            <div className="text-sm text-success mt-1">
              您可以点击"保存连接"来保存此配置
            </div>
          </div>
        )}
      </div>
    );
  };

  const steps = [
    {
      title: '配置连接',
      description: '填写连接参数',
      icon: currentStep === 0 ? <Loader2 className="w-4 h-4"  /> :
            currentStep > 0 ? <CheckCircle /> : "1"},
    {
      title: '测试连接',
      description: '验证连接可用性',
      icon: currentStep === 1 ? (testResult?.success ? <CheckCircle /> : <XCircle />) : undefined},
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑连接' : '新建连接'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 步骤指示器 */}
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index <= currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'
                }`}>
                  {step.icon || (index + 1)}
                </div>
                <div className="ml-2 flex-1">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </div>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {currentStep === 0 && renderConnectionForm()}
              {currentStep === 1 && renderTestResult()}

              {/* 操作按钮 */}
              <div className="flex justify-between pt-3 border-t">
                <div>
                  {currentStep === 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(0)}
                      size="default"
                    >
                      返回修改
                    </Button>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    size="default"
                  >
                    取消
                  </Button>

                  {currentStep === 0 ? (
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        size="default"
                      >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        保存连接
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        size="default"
                      >
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        测试连接
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting || !testResult?.success}
                      size="default"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      保存连接
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};