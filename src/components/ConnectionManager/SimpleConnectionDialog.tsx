import React, { useState, useEffect } from 'react';
import { Button, Alert, AlertDescription, Steps, Input, InputNumber, Switch, Space, Dialog, DialogContent, DialogHeader, DialogTitle, Label, Typography } from '@/components/ui';
import { Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useConnection } from '@/hooks/useConnection';
import { ValidationUtils } from '@/utils/validation';
import { safeTauriInvoke } from '@/utils/tauri';
import type { ConnectionConfig, ConnectionTestResult } from '@/types';
import './ConnectionDialog.css';

interface SimpleConnectionDialogProps {
  visible: boolean;
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
  database: string;
  ssl: boolean;
  timeout: number;
}

export const SimpleConnectionDialog: React.FC<SimpleConnectionDialogProps> = ({
  visible,
  connection,
  onCancel,
  onSuccess}) => {
  const { createConnection, editConnection, testConnection } = useConnection();
  const [currentStep, setCurrentStep] = useState(0);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    name: '',
    host: 'localhost',
    port: 8086,
    username: '',
    password: '',
    database: '',
    ssl: false,
    timeout: 30});

  const isEditing = !!connection?.id;

  useEffect(() => {
    if (visible) {
      if (connection) {
        setFormData({
          name: connection.name || '',
          host: connection.host || 'localhost',
          port: connection.port || 8086,
          username: connection.username || '',
          password: connection.password || '',
          database: connection.database || '',
          ssl: connection.ssl || false,
          timeout: connection.timeout || 30});
      } else {
        setFormData({
          name: '',
          host: 'localhost',
          port: 8086,
          username: '',
          password: '',
          database: '',
          ssl: false,
          timeout: 30});
      }
      setCurrentStep(0);
      setTestResult(null);
      setErrors({});
    }
  }, [visible, connection]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入连接名称';
    }

    if (!formData.host.trim()) {
      newErrors.host = '请输入主机地址';
    } else {
      const ipError = ValidationUtils.ipAddress(formData.host);
      const hostnameError = ValidationUtils.hostname(formData.host);
      if (ipError && hostnameError) {
        newErrors.host = '主机地址格式不正确';
      }
    }

    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口范围: 1-65535';
    }

    if (formData.timeout < 5 || formData.timeout > 300) {
      newErrors.timeout = '超时时间范围: 5-300秒';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const tempConfig: ConnectionConfig = {
        id: `temp-test-${Date.now()}`,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 先创建临时连接到后端
      const tempId = await createConnection(tempConfig);

      try {
        // 测试连接
        const result = await testConnection(tempId);
        setTestResult(result);

        if (result.success) {
          setCurrentStep(1);
        }
      } finally {
        // 删除临时连接
        try {
          await safeTauriInvoke('delete_connection', { connectionId: tempId });
        } catch (deleteError) {
          console.warn('删除临时连接失败:', deleteError);
        }
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const configData: ConnectionConfig = {
        ...formData,
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
      <div className="space-y-1">
        <Label className="block text-sm font-medium text-foreground">
          连接名称 <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="例如: 生产环境 InfluxDB"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          className={errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {errors.name && <div className="text-xs text-destructive mt-1">{errors.name}</div>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-1">
          <Label className="block text-sm font-medium text-foreground">
            主机地址 <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="localhost 或 192.168.1.100"
            value={formData.host}
            onChange={(e) => handleInputChange('host', e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            className={errors.host ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          {errors.host && <div className="text-xs text-destructive mt-1">{errors.host}</div>}
        </div>

        <div className="space-y-1">
          <Label className="block text-sm font-medium text-foreground">
            端口 <span className="text-destructive">*</span>
          </Label>
          <InputNumber
            placeholder="8086"
            value={formData.port}
            onChange={(value) => handleInputChange('port', value || 8086)}
            className={`w-full ${errors.port ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            min={1}
            max={65535}
            controls={false}
          />
          {errors.port && <div className="text-xs text-destructive mt-1">{errors.port}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="block text-sm font-medium text-foreground">用户名</Label>
          <Input
            placeholder="可选"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        <div className="space-y-1">
          <Label className="block text-sm font-medium text-foreground">密码</Label>
          <Input
            type="password"
            placeholder="可选"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="block text-sm font-medium text-foreground">默认数据库</Label>
        <Input
          placeholder="可选，连接后默认选择的数据库"
          value={formData.database}
          onChange={(e) => handleInputChange('database', e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="block text-sm font-medium text-foreground">启用SSL</Label>
          <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/50">
            <Switch
              id="ssl-switch"
              checked={formData.ssl}
              onCheckedChange={(checked) => handleInputChange('ssl', checked)}
            />
            <Label htmlFor="ssl-switch" className="text-sm font-medium cursor-pointer">
              {formData.ssl ? '已启用 SSL 加密连接' : '使用 SSL 加密连接'}
            </Label>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="block text-sm font-medium text-foreground">超时时间(秒)</Label>
          <InputNumber
            placeholder="30"
            value={formData.timeout}
            onChange={(value) => handleInputChange('timeout', value || 30)}
            className={`w-full ${errors.timeout ? 'border-destructive focus-visible:ring-destructive' : ''}`}
            min={5}
            max={300}
            controls={false}
          />
          {errors.timeout && <div className="text-xs text-destructive mt-1">{errors.timeout}</div>}
        </div>
      </div>
    </div>
  );

  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <div className="space-y-4">
        <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            <div className="space-y-2">
              <div className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? '连接测试成功' : '连接测试失败'}
              </div>
              <div className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {testResult.success ? (
                  <div className="space-y-1">
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
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>

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
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">{isEditing ? '编辑连接' : '新建连接'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
        {/* 步骤指示器 */}
        <Steps current={currentStep} items={steps} />

        {currentStep === 0 && renderConnectionForm()}
        {currentStep === 1 && renderTestResult()}

        {/* 操作按钮 */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {currentStep === 1 && (
              <Button
                onClick={() => setCurrentStep(0)}
                variant="outline"
                size="default"
              >
                返回修改
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              size="default"
            >
              取消
            </Button>

            {currentStep === 0 ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="default"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存连接'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  size="default"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    '测试连接'
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !testResult?.success}
                size="default"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存连接'
                )}
              </Button>
            )}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};