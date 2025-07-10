import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Switch, Button, Space, Alert, Steps, Tooltip } from '@/components/ui';
import { InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@/components/ui';
import { useConnection } from '@/hooks/useConnection';
import { ValidationUtils } from '@/utils/validation';
import type { ConnectionConfig, ConnectionTestResult } from '@/types';

interface ConnectionDialogProps {
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
  database?: string;
  ssl: boolean;
  timeout: number;
}

export const ConnectionDialog: React.FC<ConnectionDialogProps> = ({
  visible,
  connection,
  onCancel,
  onSuccess,
}) => {
  const { createConnection, editConnection, testConnection } = useConnection();
  const [form] = Form.useForm<FormData>();
  const [currentStep, setCurrentStep] = useState(0);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const isEditing = !!connection?.id;

  useEffect(() => {
    if (visible) {
      if (connection) {
        form.setFieldsValue({
          name: connection.name,
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.password,
          database: connection.database,
          ssl: connection.ssl,
          timeout: connection.timeout,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          port: 8086,
          ssl: false,
          timeout: 30,
        });
      }
      setCurrentStep(0);
      setTestResult(null);
    }
  }, [visible, connection, form]);

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      setIsTesting(true);
      setTestResult(null);

      // 创建临时连接配置用于测试
      const tempConfig: ConnectionConfig = {
        id: 'temp-test',
        ...values,
      };

      const result = await testConnection(tempConfig.id!);
      setTestResult(result);
      
      if (result.success) {
        setCurrentStep(1);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const configData: ConnectionConfig = {
        ...values,
        id: connection?.id,
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

  const validateForm = (_: any, value: any) => {
    return Promise.resolve();
  };

  const renderConnectionForm = () => (
    <div className="space-y-4">
      <Form.Item
        name="name"
        label="连接名称"
        rules={[
          { required: true, message: '请输入连接名称' },
          { min: 1, max: 100, message: '连接名称长度为1-100个字符' },
        ]}
      >
        <Input placeholder="输入连接名称" />
      </Form.Item>

      <div className="grid grid-cols-3 gap-4">
        <Form.Item
          name="host"
          label="主机地址"
          className="col-span-2"
          rules={[
            { required: true, message: '请输入主机地址' },
            {
              validator: (_, value) => {
                const error = ValidationUtils.ipAddress(value) && ValidationUtils.hostname(value);
                return error ? Promise.reject(error) : Promise.resolve();
              }
            }
          ]}
        >
          <Input placeholder="localhost 或 192.168.1.100" />
        </Form.Item>

        <Form.Item
          name="port"
          label="端口"
          rules={[
            { required: true, message: '请输入端口' },
            { type: 'number', min: 1, max: 65535, message: '端口范围: 1-65535' },
          ]}
        >
          <InputNumber placeholder="8086" className="w-full" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { max: 50, message: '用户名长度不能超过50个字符' },
          ]}
        >
          <Input placeholder="可选" />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[
            { max: 128, message: '密码长度不能超过128个字符' },
          ]}
        >
          <Input.Password placeholder="可选" />
        </Form.Item>
      </div>

      <Form.Item
        name="database"
        label="默认数据库"
        rules={[
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              const error = ValidationUtils.databaseName(value);
              return error ? Promise.reject(error) : Promise.resolve();
            }
          }
        ]}
      >
        <Input placeholder="可选，连接后默认选择的数据库" />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="ssl"
          label="启用SSL"
          valuePropName="checked"
          extra="使用SSL加密连接"
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="timeout"
          label="超时时间(秒)"
          rules={[
            { type: 'number', min: 5, max: 300, message: '超时时间范围: 5-300秒' },
          ]}
        >
          <InputNumber placeholder="30" className="w-full" />
        </Form.Item>
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
              <CheckCircleOutlined />
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
      icon: currentStep === 0 ? <LoadingOutlined /> : 
            currentStep > 0 ? <CheckCircleOutlined /> : undefined,
    },
    {
      title: '测试连接',
      description: '验证连接可用性',
      icon: currentStep === 1 ? (testResult?.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />) : undefined,
    },
  ];

  return (
    <Modal
      title={isEditing ? '编辑连接' : '新建连接'}
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={null}
      destroyOnClose
    >
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <Steps current={currentStep} items={steps} size="small" />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          validateMessages={{
            required: '${label}是必填项',
            types: {
              number: '${label}必须是数字',
            },
            number: {
              min: '${label}最小值为${min}',
              max: '${label}最大值为${max}',
            },
          }}
        >
          {currentStep === 0 && renderConnectionForm()}
          {currentStep === 1 && renderTestResult()}

          {/* 操作按钮 */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {currentStep === 1 && (
                <Button onClick={() => setCurrentStep(0)}>
                  返回修改
                </Button>
              )}
            </div>

            <Space>
              <Button onClick={onCancel}>
                取消
              </Button>
              
              {currentStep === 0 ? (
                <Space>
                  {isEditing && (
                    <Button
                      type="primary"
                      onClick={handleSubmit}
                      loading={isSubmitting}
                    >
                      保存连接
                    </Button>
                  )}
                  <Button
                    type={isEditing ? 'default' : 'primary'}
                    onClick={handleTestConnection}
                    loading={isTesting}
                    icon={<InfoCircleOutlined />}
                  >
                    测试连接
                  </Button>
                </Space>
              ) : (
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={!testResult?.success}
                >
                  保存连接
                </Button>
              )}
            </Space>
          </div>
        </Form>
      </div>
    </Modal>
  );
};