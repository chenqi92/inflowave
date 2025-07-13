import React, { useState, useEffect } from 'react';
import { Button, Alert, AlertDescription, Steps, Input, InputNumber, Switch, Space, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useConnection } from '@/hooks/useConnection';
import { ValidationUtils } from '@/utils/validation';
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
        id: 'temp-test',
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()};

      const result = await testConnection(tempConfig.id!);
      setTestResult(result);
      
      if (result.success) {
        setCurrentStep(1);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      setTestResult({
        success: false,
        error: String(error),
        latency: 0});
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
        createdAt: connection?.createdAt || new Date(),
        updatedAt: new Date()};

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
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          连接名称 <span className="text-red-500">*</span>
        </label>
        <Input
          placeholder="例如: 生产环境 InfluxDB"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          size="small"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <div className="text-xs text-red-600">{errors.name}</div>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            主机地址 <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="localhost 或 192.168.1.100"
            value={formData.host}
            onChange={(e) => handleInputChange('host', e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            size="small"
            className={errors.host ? 'border-red-500' : ''}
          />
          {errors.host && <div className="text-xs text-red-600">{errors.host}</div>}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            端口 <span className="text-red-500">*</span>
          </label>
          <InputNumber
            placeholder="8086"
            value={formData.port}
            onChange={(value) => handleInputChange('port', value || 8086)}
            className={`w-full ${errors.port ? 'border-red-500' : ''}`}
            size="small"
            min={1}
            max={65535}
          />
          {errors.port && <div className="text-xs text-red-600">{errors.port}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">用户名</label>
          <Input
            placeholder="可选"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            size="small"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">密码</label>
          <Input.Password
            placeholder="可选"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            size="small"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">默认数据库</label>
        <Input
          placeholder="可选，连接后默认选择的数据库"
          value={formData.database}
          onChange={(e) => handleInputChange('database', e.target.value)}
          autoCapitalize="off"
          autoCorrect="off"
          size="small"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">启用SSL</label>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.ssl}
              onChange={(checked) => handleInputChange('ssl', checked)}
              size="small"
            />
            <span className="text-sm text-gray-500">使用SSL加密连接</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">超时时间(秒)</label>
          <InputNumber
            placeholder="30"
            value={formData.timeout}
            onChange={(value) => handleInputChange('timeout', value || 30)}
            className={`w-full ${errors.timeout ? 'border-red-500' : ''}`}
            size="small"
            min={5}
            max={300}
          />
          {errors.timeout && <div className="text-xs text-red-600">{errors.timeout}</div>}
        </div>
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
              <span className="font-medium">连接配置正确</span>
            </div>
            <div className="text-sm text-green-600 mt-1">
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
            currentStep > 0 ? <CheckCircle /> : undefined},
    {
      title: '测试连接',
      description: '验证连接可用性',
      icon: currentStep === 1 ? (testResult?.success ? <CheckCircle /> : <XCircle />) : undefined},
  ];

  return (
    <Modal
      title={isEditing ? '编辑连接' : '新建连接'}
      open={visible}
      onClose={onCancel}
      width={800}
      maskClosable={true}
      className="connection-dialog"
    >
      <div className="space-y-4">
        {/* 步骤指示器 */}
        <Steps current={currentStep} items={steps} size="small" />

        {currentStep === 0 && renderConnectionForm()}
        {currentStep === 1 && renderTestResult()}

        {/* 操作按钮 */}
        <div className="flex justify-between pt-3 border-t border-gray-200">
          <div>
            {currentStep === 1 && (
              <Button
                onClick={() => setCurrentStep(0)}
                size="small"
              >
                返回修改
              </Button>
            )}
          </div>

          <div className="flex gap-2" size="small">
            <Button
              onClick={onCancel}
              size="small"
            >
              取消
            </Button>

            {currentStep === 0 ? (
              <div className="flex gap-2" size="small">
                {isEditing && (
                  <Button
                    type="primary"
                    onClick={handleSubmit}
                    loading={isSubmitting}
                    size="small"
                  >
                    保存连接
                  </Button>
                )}
                <Button
                  type={isEditing ? 'default' : 'primary'}
                  onClick={handleTestConnection}
                  loading={isTesting}
                  icon={<Info className="w-4 h-4"  />}
                  size="small"
                >
                  测试连接
                </Button>
              </div>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={!testResult?.success}
                size="small"
              >
                保存连接
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};