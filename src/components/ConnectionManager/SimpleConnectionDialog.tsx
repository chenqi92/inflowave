import React, { useState, useEffect } from 'react';
import {
  Button,
  Alert,
  AlertDescription,
  Steps,
  Input,
  InputNumber,
  Switch,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Typography,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useConnection } from '@/hooks/useConnection';
import { ValidationUtils } from '@/utils/validation';
import type { ConnectionConfig, ConnectionTestResult } from '@/types';
import { createDefaultConnectionConfig, getFilledConnectionConfig } from '@/config/defaults';
import { generateUniqueId } from '@/utils/idGenerator';

interface SimpleConnectionDialogProps {
  visible: boolean;
  connection?: ConnectionConfig;
  onCancel: () => void;
  onSuccess: (connection: ConnectionConfig) => void;
}

interface FormData {
  name: string;
  description: string;
  dbType: 'influxdb';
  version: '1.x' | '2.x' | '3.x';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  timeout: number;
  connectionTimeout: number;
  queryTimeout: number;
  defaultQueryLanguage: string;
  // InfluxDB 1.x 特有
  retentionPolicy: string;
  // InfluxDB 2.x/3.x 特有
  apiToken: string;
  organization: string;
  bucket: string;
  v1CompatibilityApi: boolean;
  // 代理配置
  proxyEnabled: boolean;
  proxyHost: string;
  proxyPort: number;
  proxyUsername: string;
  proxyPassword: string;
  proxyType: 'http' | 'https' | 'socks5';
}

export const SimpleConnectionDialog: React.FC<SimpleConnectionDialogProps> = ({
  visible,
  connection,
  onCancel,
  onSuccess,
}) => {
  const {
    createConnection,
    editConnection,
    testConnection,
    createTempConnectionForTest,
    deleteTempConnection,
  } = useConnection();
  const [currentStep, setCurrentStep] = useState(0);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>(() => {
    const defaults = createDefaultConnectionConfig();
    return {
      name: '',
      description: '',
      dbType: 'influxdb' as const,
      version: '1.x' as const,
      host: defaults.host!,
      port: defaults.port!,
      username: defaults.username!,
      password: defaults.password!,
      database: '',
      ssl: defaults.ssl!,
      timeout: defaults.timeout!,
      connectionTimeout: defaults.connectionTimeout!,
      queryTimeout: defaults.queryTimeout!,
      defaultQueryLanguage: defaults.defaultQueryLanguage!,
      retentionPolicy: '',
      apiToken: '',
      organization: '',
      bucket: '',
      v1CompatibilityApi: false,
      proxyEnabled: false,
      proxyHost: '127.0.0.1',
      proxyPort: 8080,
      proxyUsername: '',
      proxyPassword: '',
      proxyType: 'http' as const,
    };
  });

  const isEditing = !!connection?.id;

  useEffect(() => {
    if (visible) {
      if (connection) {
        const filled = getFilledConnectionConfig(connection);
        setFormData({
          name: connection.name || '',
          description: connection.description || '',
          dbType: connection.dbType || 'influxdb',
          version: connection.version || '1.x',
          host: filled.host!,
          port: filled.port!,
          username: filled.username || '',
          password: filled.password || '',
          database: connection.database || '',
          ssl: filled.ssl!,
          timeout: filled.timeout!,
          connectionTimeout: filled.connectionTimeout!,
          queryTimeout: filled.queryTimeout!,
          defaultQueryLanguage: filled.defaultQueryLanguage!,
          retentionPolicy: connection.retentionPolicy || '',
          apiToken: connection.v2Config?.apiToken || '',
          organization: connection.v2Config?.organization || '',
          bucket: connection.v2Config?.bucket || '',
          v1CompatibilityApi: connection.v2Config?.v1CompatibilityApi || false,
          proxyEnabled: connection.proxyConfig?.enabled || false,
          proxyHost: connection.proxyConfig?.host || '127.0.0.1',
          proxyPort: connection.proxyConfig?.port || 8080,
          proxyUsername: connection.proxyConfig?.username || '',
          proxyPassword: connection.proxyConfig?.password || '',
          proxyType: connection.proxyConfig?.proxyType || 'http',
        });
      } else {
        const defaults = createDefaultConnectionConfig();
        setFormData({
          name: '',
          description: '',
          dbType: 'influxdb',
          version: '1.x',
          host: defaults.host!,
          port: defaults.port!,
          username: defaults.username!,
          password: defaults.password!,
          database: '',
          ssl: defaults.ssl!,
          timeout: defaults.timeout!,
          connectionTimeout: defaults.connectionTimeout!,
          queryTimeout: defaults.queryTimeout!,
          defaultQueryLanguage: defaults.defaultQueryLanguage!,
          retentionPolicy: '',
          apiToken: '',
          organization: '',
          bucket: '',
          v1CompatibilityApi: false,
          proxyEnabled: false,
          proxyHost: '127.0.0.1',
          proxyPort: 8080,
          proxyUsername: '',
          proxyPassword: '',
          proxyType: 'http',
        });
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

    if (formData.connectionTimeout < 5 || formData.connectionTimeout > 300) {
      newErrors.connectionTimeout = '连接超时时间范围: 5-300秒';
    }

    if (formData.queryTimeout < 10 || formData.queryTimeout > 3600) {
      newErrors.queryTimeout = '查询超时时间范围: 10-3600秒';
    }

    // InfluxDB 2.x/3.x 特有验证
    if (formData.version === '2.x' || formData.version === '3.x') {
      if (!formData.apiToken.trim()) {
        newErrors.apiToken = '请输入API令牌';
      }
      if (!formData.organization.trim()) {
        newErrors.organization = '请输入组织ID或名称';
      }
    }

    // 代理配置验证
    if (formData.proxyEnabled) {
      if (!formData.proxyHost.trim()) {
        newErrors.proxyHost = '请输入代理服务器地址';
      }
      if (!formData.proxyPort || formData.proxyPort < 1 || formData.proxyPort > 65535) {
        newErrors.proxyPort = '代理端口范围: 1-65535';
      }
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
        id: generateUniqueId('temp-test'),
        name: formData.name,
        description: formData.description,
        dbType: formData.dbType,
        version: formData.version,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        database: formData.database,
        ssl: formData.ssl,
        timeout: formData.timeout,
        connectionTimeout: formData.connectionTimeout,
        queryTimeout: formData.queryTimeout,
        defaultQueryLanguage: formData.defaultQueryLanguage,
        retentionPolicy: formData.retentionPolicy || undefined,
        v2Config: (formData.version === '2.x' || formData.version === '3.x') ? {
          apiToken: formData.apiToken,
          organization: formData.organization,
          bucket: formData.bucket || undefined,
          v1CompatibilityApi: formData.v1CompatibilityApi,
        } : undefined,
        proxyConfig: formData.proxyEnabled ? {
          enabled: formData.proxyEnabled,
          host: formData.proxyHost,
          port: formData.proxyPort,
          username: formData.proxyUsername || undefined,
          password: formData.proxyPassword || undefined,
          proxyType: formData.proxyType,
        } : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date(),
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
      const errorMessage = String(error).replace('Error: ', '');
      setTestResult({
        success: false,
        error: errorMessage,
        latency: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const buildConfigData = (id?: string): ConnectionConfig => ({
        id: id || connection?.id,
        name: formData.name,
        description: formData.description,
        dbType: formData.dbType,
        version: formData.version,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password,
        database: formData.database,
        ssl: formData.ssl,
        timeout: formData.timeout,
        connectionTimeout: formData.connectionTimeout,
        queryTimeout: formData.queryTimeout,
        defaultQueryLanguage: formData.defaultQueryLanguage,
        retentionPolicy: formData.retentionPolicy || undefined,
        v2Config: (formData.version === '2.x' || formData.version === '3.x') ? {
          apiToken: formData.apiToken,
          organization: formData.organization,
          bucket: formData.bucket || undefined,
          v1CompatibilityApi: formData.v1CompatibilityApi,
        } : undefined,
        proxyConfig: formData.proxyEnabled ? {
          enabled: formData.proxyEnabled,
          host: formData.proxyHost,
          port: formData.proxyPort,
          username: formData.proxyUsername || undefined,
          password: formData.proxyPassword || undefined,
          proxyType: formData.proxyType,
        } : undefined,
        created_at: connection?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: connection?.createdAt || new Date(),
        updatedAt: new Date(),
      });

      if (isEditing) {
        // 编辑现有连接
        const configData = buildConfigData();
        await editConnection(configData);
        onSuccess(configData);
      } else {
        // 创建新连接
        const id = await createConnection(buildConfigData());
        const configData = buildConfigData(id);
        onSuccess(configData);
      }
    } catch (error) {
      console.error('保存连接失败:', error);
      const errorMessage = String(error).replace('Error: ', '');
      setTestResult({
        success: false,
        error: `保存失败: ${errorMessage}`,
        latency: 0,
      });
      setCurrentStep(1); // 显示错误结果
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderConnectionForm = () => (
    <div className='space-y-6'>
      {/* 基本信息 - 始终显示 */}
      <div className='space-y-4'>
        <h3 className='text-lg font-medium text-foreground border-b pb-2'>基本信息</h3>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <Label className='block text-sm font-medium text-foreground'>
              连接名称 <span className='text-destructive'>*</span>
            </Label>
            <Input
              placeholder='例如: 生产环境 InfluxDB'
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              autoCapitalize='off'
              autoCorrect='off'
              className={
                errors.name
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }
            />
            {errors.name && (
              <div className='text-xs text-destructive mt-1'>{errors.name}</div>
            )}
          </div>

          <div className='space-y-1'>
            <Label className='block text-sm font-medium text-foreground'>
              描述
            </Label>
            <Input
              placeholder='连接描述（可选）'
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              autoCapitalize='off'
              autoCorrect='off'
            />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <Label className='block text-sm font-medium text-foreground'>
              数据库类型
            </Label>
            <Select
              value={formData.dbType}
              onValueChange={value => handleInputChange('dbType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder='选择数据库类型' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='influxdb'>InfluxDB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1'>
            <Label className='block text-sm font-medium text-foreground'>
              版本 <span className='text-destructive'>*</span>
            </Label>
            <Select
              value={formData.version}
              onValueChange={value => {
                handleInputChange('version', value);
                // 根据版本设置默认查询语言
                if (value === '1.x' || value === '3.x') {
                  handleInputChange('defaultQueryLanguage', 'InfluxQL');
                } else if (value === '2.x') {
                  handleInputChange('defaultQueryLanguage', 'Flux');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='选择版本' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='1.x'>1.x</SelectItem>
                <SelectItem value='2.x'>2.x</SelectItem>
                <SelectItem value='3.x'>3.x</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tab 配置区域 */}
      <Tabs defaultValue="server" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="server">服务器配置</TabsTrigger>
          <TabsTrigger value="advanced">高级配置</TabsTrigger>
          <TabsTrigger value="proxy">代理配置</TabsTrigger>
        </TabsList>

        {/* 服务器配置 Tab */}
        <TabsContent value="server" className="space-y-6 mt-6">
          <div className='grid grid-cols-3 gap-4'>
            <div className='col-span-2 space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                主机地址 <span className='text-destructive'>*</span>
              </Label>
              <Input
                placeholder='localhost 或 192.168.1.100'
                value={formData.host}
                onChange={e => handleInputChange('host', e.target.value)}
                autoCapitalize='off'
                autoCorrect='off'
                className={
                  errors.host
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }
              />
              {errors.host && (
                <div className='text-xs text-destructive mt-1'>{errors.host}</div>
              )}
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                端口 <span className='text-destructive'>*</span>
              </Label>
              <InputNumber
                placeholder='8086'
                value={formData.port}
                onChange={value => handleInputChange('port', value || createDefaultConnectionConfig().port)}
                className={`w-full ${errors.port ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                min={1}
                max={65535}
                controls={false}
              />
              {errors.port && (
                <div className='text-xs text-destructive mt-1'>{errors.port}</div>
              )}
            </div>
          </div>

          {formData.version === '1.x' && (
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <Label className='block text-sm font-medium text-foreground'>
                  用户名
                </Label>
                <Input
                  placeholder='可选'
                  value={formData.username}
                  onChange={e => handleInputChange('username', e.target.value)}
                  autoCapitalize='off'
                  autoCorrect='off'
                />
              </div>

              <div className='space-y-1'>
                <Label className='block text-sm font-medium text-foreground'>
                  密码
                </Label>
                <Input
                  type='password'
                  placeholder='可选'
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                />
              </div>
            </div>
          )}

          {(formData.version === '2.x' || formData.version === '3.x') && (
            <div className='space-y-4'>
              <div className='space-y-1'>
                <Label className='block text-sm font-medium text-foreground'>
                  API 令牌 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  type='password'
                  placeholder='请输入 API Token'
                  value={formData.apiToken}
                  onChange={e => handleInputChange('apiToken', e.target.value)}
                  className={
                    errors.apiToken
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }
                />
                {errors.apiToken && (
                  <div className='text-xs text-destructive mt-1'>{errors.apiToken}</div>
                )}
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    组织 ID/名称 <span className='text-destructive'>*</span>
                  </Label>
                  <Input
                    placeholder='组织 ID 或名称'
                    value={formData.organization}
                    onChange={e => handleInputChange('organization', e.target.value)}
                    autoCapitalize='off'
                    autoCorrect='off'
                    className={
                      errors.organization
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }
                  />
                  {errors.organization && (
                    <div className='text-xs text-destructive mt-1'>{errors.organization}</div>
                  )}
                </div>

                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    桶名称
                  </Label>
                  <Input
                    placeholder='可选，默认桶'
                    value={formData.bucket}
                    onChange={e => handleInputChange('bucket', e.target.value)}
                    autoCapitalize='off'
                    autoCorrect='off'
                  />
                </div>
              </div>
            </div>
          )}

          {/* 数据库配置和V1兼容API合并为一行 */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                {formData.version === '1.x' ? '默认数据库' : '默认数据库'}
              </Label>
              <Input
                placeholder={formData.version === '1.x' ? '可选，连接后默认选择的数据库' : '可选'}
                value={formData.database}
                onChange={e => handleInputChange('database', e.target.value)}
                autoCapitalize='off'
                autoCorrect='off'
              />
            </div>

            {formData.version === '1.x' ? (
              <div className='space-y-1'>
                <Label className='block text-sm font-medium text-foreground'>
                  默认保留策略
                </Label>
                <Input
                  placeholder='可选，如 autogen'
                  value={formData.retentionPolicy}
                  onChange={e => handleInputChange('retentionPolicy', e.target.value)}
                  autoCapitalize='off'
                  autoCorrect='off'
                />
              </div>
            ) : (
              <div className='space-y-1'>
                <Label className='block text-sm font-medium text-foreground'>
                  V1 兼容 API
                </Label>
                <div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/50'>
                  <Switch
                    id='v1-compat-switch'
                    checked={formData.v1CompatibilityApi}
                    onCheckedChange={checked => handleInputChange('v1CompatibilityApi', checked)}
                  />
                  <Label
                    htmlFor='v1-compat-switch'
                    className='text-sm font-medium cursor-pointer'
                  >
                    {formData.v1CompatibilityApi ? '已启用 V1 兼容 API' : '启用 V1 兼容 API'}
                  </Label>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 高级配置 Tab */}
        <TabsContent value="advanced" className="space-y-6 mt-6">
          <div className='grid grid-cols-3 gap-4'>
            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                连接超时(秒)
              </Label>
              <InputNumber
                placeholder='30'
                value={formData.connectionTimeout}
                onChange={value => handleInputChange('connectionTimeout', value || 30)}
                className={`w-full ${errors.connectionTimeout ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                min={5}
                max={300}
                controls={false}
              />
              {errors.connectionTimeout && (
                <div className='text-xs text-destructive mt-1'>
                  {errors.connectionTimeout}
                </div>
              )}
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                查询超时(秒)
              </Label>
              <InputNumber
                placeholder='60'
                value={formData.queryTimeout}
                onChange={value => handleInputChange('queryTimeout', value || 60)}
                className={`w-full ${errors.queryTimeout ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                min={10}
                max={3600}
                controls={false}
              />
              {errors.queryTimeout && (
                <div className='text-xs text-destructive mt-1'>
                  {errors.queryTimeout}
                </div>
              )}
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                超时时间(秒)
              </Label>
              <InputNumber
                placeholder='30'
                value={formData.timeout}
                onChange={value => handleInputChange('timeout', value || 30)}
                className={`w-full ${errors.timeout ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                min={5}
                max={300}
                controls={false}
              />
              {errors.timeout && (
                <div className='text-xs text-destructive mt-1'>
                  {errors.timeout}
                </div>
              )}
            </div>
          </div>

          {/* 查询语言和SSL配置合并为一行 */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                默认查询语言
              </Label>
              <Select
                value={formData.defaultQueryLanguage}
                onValueChange={value => handleInputChange('defaultQueryLanguage', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择查询语言' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='InfluxQL'>InfluxQL</SelectItem>
                  <SelectItem value='Flux'>Flux</SelectItem>
                  {formData.version === '3.x' && <SelectItem value='SQL'>SQL</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                启用SSL
              </Label>
              <div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/50'>
                <Switch
                  id='ssl-switch'
                  checked={formData.ssl}
                  onCheckedChange={checked => handleInputChange('ssl', checked)}
                />
                <Label
                  htmlFor='ssl-switch'
                  className='text-sm font-medium cursor-pointer'
                >
                  {formData.ssl ? '已启用 SSL 加密连接' : '使用 SSL 加密连接'}
                </Label>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 代理配置 Tab */}
        <TabsContent value="proxy" className="space-y-6 mt-6">
          {/* 启用代理开关 */}
          <div className='flex items-center justify-between p-4 rounded-lg border bg-muted/20'>
            <div>
              <Label htmlFor='proxy-switch' className='text-sm font-medium cursor-pointer'>
                启用代理
              </Label>
              <p className='text-xs text-muted-foreground mt-1'>
                启用后将通过代理服务器连接到InfluxDB
              </p>
            </div>
            <Switch
              id='proxy-switch'
              checked={formData.proxyEnabled}
              onCheckedChange={checked => handleInputChange('proxyEnabled', checked)}
            />
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <div className='col-span-2 space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                代理服务器地址 <span className='text-destructive'>*</span>
              </Label>
              <Input
                placeholder='127.0.0.1'
                value={formData.proxyHost}
                onChange={e => handleInputChange('proxyHost', e.target.value)}
                autoCapitalize='off'
                autoCorrect='off'
                className={
                  errors.proxyHost
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }
              />
              {errors.proxyHost && (
                <div className='text-xs text-destructive mt-1'>{errors.proxyHost}</div>
              )}
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                代理端口 <span className='text-destructive'>*</span>
              </Label>
              <InputNumber
                placeholder='8080'
                value={formData.proxyPort}
                onChange={value => handleInputChange('proxyPort', value || 8080)}
                className={`w-full ${errors.proxyPort ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                min={1}
                max={65535}
                controls={false}
              />
              {errors.proxyPort && (
                <div className='text-xs text-destructive mt-1'>{errors.proxyPort}</div>
              )}
            </div>
          </div>

          <div className='space-y-1'>
            <Label className='block text-sm font-medium text-foreground'>
              代理类型
            </Label>
            <Select
              value={formData.proxyType}
              onValueChange={value => handleInputChange('proxyType', value)}
            >
              <SelectTrigger className='w-full max-w-xs'>
                <SelectValue placeholder='选择代理类型' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='http'>HTTP</SelectItem>
                <SelectItem value='https'>HTTPS</SelectItem>
                <SelectItem value='socks5'>SOCKS5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                代理用户名
              </Label>
              <Input
                placeholder='可选'
                value={formData.proxyUsername}
                onChange={e => handleInputChange('proxyUsername', e.target.value)}
                autoCapitalize='off'
                autoCorrect='off'
              />
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                代理密码
              </Label>
              <Input
                type='password'
                placeholder='可选'
                value={formData.proxyPassword}
                onChange={e => handleInputChange('proxyPassword', e.target.value)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <div className='space-y-4'>
        <Alert
          className={
            testResult.success
              ? 'border-success/20 bg-success/10'
              : 'border-destructive/20 bg-destructive/10'
          }
        >
          {testResult.success ? (
            <CheckCircle className='h-4 w-4 text-success' />
          ) : (
            <XCircle className='h-4 w-4 text-destructive' />
          )}
          <AlertDescription>
            <div className='space-y-2'>
              <div
                className={`font-medium ${testResult.success ? 'text-success' : 'text-destructive'}`}
              >
                {testResult.success ? '连接测试成功' : '连接测试失败'}
              </div>
              <div
                className={`text-sm ${testResult.success ? 'text-success' : 'text-destructive'}`}
              >
                {testResult.success ? (
                  <div className='space-y-1'>
                    <div>服务器版本: {testResult.serverVersion || '未知'}</div>
                    <div>延迟: {testResult.latency}ms</div>
                    {testResult.databases &&
                      testResult.databases.length > 0 && (
                        <div>可用数据库: {testResult.databases.join(', ')}</div>
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
          <div className='bg-success/10 border border-success/20 rounded p-3'>
            <div className='flex items-center gap-2 text-success'>
              <CheckCircle />
              <Typography.Text className='font-medium'>
                连接配置正确
              </Typography.Text>
            </div>
            <div className='text-sm text-success mt-1'>
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
      icon:
        currentStep === 0 ? (
          <Loader2 className='w-4 h-4' />
        ) : currentStep > 0 ? (
          <CheckCircle />
        ) : (
          '1'
        ),
    },
    {
      title: '测试连接',
      description: '验证连接可用性',
      icon:
        currentStep === 1 ? (
          testResult?.success ? (
            <CheckCircle />
          ) : (
            <XCircle />
          )
        ) : undefined,
    },
  ];

  return (
    <Dialog open={visible} onOpenChange={open => !open && onCancel()}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader className='pb-4'>
          <DialogTitle className='text-xl font-semibold'>
            {isEditing ? '编辑连接' : '新建连接'}
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-6'>
          {/* 步骤指示器 */}
          <Steps current={currentStep} items={steps} />

          {currentStep === 0 && renderConnectionForm()}
          {currentStep === 1 && renderTestResult()}

          {/* 操作按钮 */}
          <div className='flex justify-between pt-4 border-t'>
            <div>
              {currentStep === 1 && (
                <Button
                  onClick={() => setCurrentStep(0)}
                  variant='outline'
                  size='default'
                >
                  返回修改
                </Button>
              )}
            </div>

            <div className='flex gap-3'>
              <Button onClick={onCancel} variant='outline' size='default'>
                取消
              </Button>

              {currentStep === 0 ? (
                <div className='flex gap-3'>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    size='default'
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        保存中...
                      </>
                    ) : (
                      '保存连接'
                    )}
                  </Button>
                  <Button
                    variant='outline'
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    size='default'
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
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
                  size='default'
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
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
