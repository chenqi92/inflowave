import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  InputNumber,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useConnection } from '@/hooks/useConnection';
import { ValidationUtils } from '@/utils/validation';
import type {
  ConnectionConfig,
  ConnectionTestResult,
  DatabaseType,
  DatabaseVersion,
} from '@/types';
import {
  createDefaultConnectionConfig,
  getFilledConnectionConfig,
} from '@/config/defaults';
import { generateUniqueId } from '@/utils/idGenerator';
import {
  DatabaseVersionDetectionService,
  type DatabaseVersionInfo,
  type VersionDetectionResult,
} from '@/services/databaseVersionDetection';
import { showMessage } from '@/utils/message';
import { VersionDetectionDialog } from './VersionDetectionDialog';
import { getDatabaseBrandIcon } from '@/utils/iconLoader';

interface SimpleConnectionDialogProps {
  visible: boolean;
  connection?: ConnectionConfig;
  onCancel: () => void;
  onSuccess: (connection: ConnectionConfig) => void;
}

interface FormData {
  name: string;
  description: string;
  dbType: DatabaseType;
  version: DatabaseVersion;
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
  // IoTDB 特有配置
  sessionPoolSize: number;
  enableCompression: boolean;
  timeZone: string;
  fetchSize: number;
  enableRedirection: boolean;
  maxRetryCount: number;
  retryIntervalMs: number;
  // 代理配置
  proxyEnabled: boolean;
  proxyHost: string;
  proxyPort: number;
  proxyUsername: string;
  proxyPassword: string;
  proxyType: 'http' | 'https' | 'socks5';
}

// 渲染数据库类型选项（使用品牌图标）
const renderDatabaseTypeOption = (dbType: string) => {
  const dbTypeMap: Record<string, string> = {
    'influxdb': 'InfluxDB',
    'iotdb': 'IoTDB'
  };

  return (
    <div className='flex items-center gap-2'>
      <img
        src={getDatabaseBrandIcon(dbTypeMap[dbType] || 'Generic')}
        alt={`${dbType} icon`}
        className="w-4 h-4"
      />
      <span>
        {dbType === 'influxdb' ? 'InfluxDB' : 'Apache IoTDB'}
      </span>
    </div>
  );
};

// 渲染版本选项（使用对应的版本图标）
const renderVersionOption = (version: string, dbType: string) => {
  const getVersionIcon = (version: string, dbType: string) => {
    if (dbType === 'influxdb') {
      switch (version) {
        case '1.x':
          return getDatabaseBrandIcon('InfluxDB');
        case '2.x':
          return getDatabaseBrandIcon('InfluxDB2');
        case '3.x':
          return getDatabaseBrandIcon('InfluxDB3');
        default:
          return getDatabaseBrandIcon('InfluxDB');
      }
    }
    return getDatabaseBrandIcon('IoTDB');
  };

  return (
    <div className='flex items-center gap-2'>
      <img
        src={getVersionIcon(version, dbType)}
        alt={`${version} icon`}
        className="w-4 h-4"
      />
      <span className='font-medium'>
        {dbType === 'influxdb' ? `InfluxDB ${version}` : 'Apache IoTDB'}
      </span>
    </div>
  );
};

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
  // 移除步骤状态，直接在单页面显示所有内容
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 添加取消控制器
  const [testAbortController, setTestAbortController] =
    useState<AbortController | null>(null);

  // 处理取消操作
  const handleCancel = () => {
    // 如果正在测试连接，先取消测试
    if (testAbortController) {
      testAbortController.abort();
      setTestAbortController(null);
    }

    // 重置所有状态
    setIsTesting(false);
    setTestResult(null);
    setIsSubmitting(false);

    // 调用原始的取消回调
    onCancel();
  };

  // 清理效果：当弹框关闭时重置状态
  useEffect(() => {
    if (!visible) {
      // 弹框关闭时取消正在进行的测试
      if (testAbortController) {
        testAbortController.abort();
        setTestAbortController(null);
      }

      // 重置所有状态
      setIsTesting(false);
      setTestResult(null);
      setIsSubmitting(false);
      setErrors({});
    }
  }, [visible, testAbortController]);

  // 版本检测相关状态
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionDetectionResult, setVersionDetectionResult] =
    useState<VersionDetectionResult | null>(null);
  const [isDetectingVersion, setIsDetectingVersion] = useState(false);

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
      // IoTDB 默认配置
      sessionPoolSize: 5,
      enableCompression: true,
      timeZone: 'Asia/Shanghai',
      fetchSize: 10000,
      enableRedirection: true,
      maxRetryCount: 3,
      retryIntervalMs: 1000,
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
          // IoTDB 配置
          sessionPoolSize: connection.driverConfig?.iotdb?.sessionPoolSize || 5,
          enableCompression:
            connection.driverConfig?.iotdb?.enableCompression ?? true,
          timeZone: connection.driverConfig?.iotdb?.timeZone || 'Asia/Shanghai',
          fetchSize: connection.driverConfig?.iotdb?.fetchSize || 10000,
          enableRedirection:
            connection.driverConfig?.iotdb?.enableRedirection ?? true,
          maxRetryCount: connection.driverConfig?.iotdb?.maxRetryCount || 3,
          retryIntervalMs:
            connection.driverConfig?.iotdb?.retryIntervalMs || 1000,
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
          // IoTDB 默认配置
          sessionPoolSize: 5,
          enableCompression: true,
          timeZone: 'Asia/Shanghai',
          fetchSize: 10000,
          enableRedirection: true,
          maxRetryCount: 3,
          retryIntervalMs: 1000,
          proxyEnabled: false,
          proxyHost: '127.0.0.1',
          proxyPort: 8080,
          proxyUsername: '',
          proxyPassword: '',
          proxyType: 'http',
        });
      }
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
    if (
      formData.dbType === 'influxdb' &&
      (formData.version === '2.x' || formData.version === '3.x')
    ) {
      if (!formData.apiToken.trim()) {
        newErrors.apiToken = '请输入API令牌';
      }
      // InfluxDB 2.x 必须有组织，3.x 可选
      if (formData.version === '2.x' && !formData.organization.trim()) {
        newErrors.organization = '请输入组织ID或名称';
      }
    }

    // IoTDB 特有验证
    if (formData.dbType === 'iotdb') {
      if (formData.sessionPoolSize < 1 || formData.sessionPoolSize > 50) {
        newErrors.sessionPoolSize = '会话池大小范围: 1-50';
      }
      if (formData.fetchSize < 100 || formData.fetchSize > 100000) {
        newErrors.fetchSize = '获取大小范围: 100-100000';
      }
      if (formData.maxRetryCount < 0 || formData.maxRetryCount > 10) {
        newErrors.maxRetryCount = '最大重试次数范围: 0-10';
      }
      if (formData.retryIntervalMs < 100 || formData.retryIntervalMs > 10000) {
        newErrors.retryIntervalMs = '重试间隔范围: 100-10000毫秒';
      }
    }

    // 代理配置验证
    if (formData.proxyEnabled) {
      if (!formData.proxyHost.trim()) {
        newErrors.proxyHost = '请输入代理服务器地址';
      }
      if (
        !formData.proxyPort ||
        formData.proxyPort < 1 ||
        formData.proxyPort > 65535
      ) {
        newErrors.proxyPort = '代理端口范围: 1-65535';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    // 创建新的取消控制器
    const abortController = new AbortController();
    setTestAbortController(abortController);
    setIsTesting(true);
    setTestResult(null);

    try {
      // 添加超时控制
      const timeoutMs = (formData.connectionTimeout || 30) * 1000;
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, timeoutMs);

      // 同时进行连接测试和版本检测
      const [connectionResult, versionResult] = await Promise.allSettled([
        testConnectionOnly(),
        detectVersionForTest(),
      ]);

      clearTimeout(timeoutId);

      // 检查是否被取消
      if (abortController.signal.aborted) {
        setTestResult({
          success: false,
          error: '连接测试已取消',
          latency: 0,
        });
        return;
      }

      // 处理连接测试结果
      if (connectionResult.status === 'fulfilled') {
        setTestResult(connectionResult.value);
      } else {
        let errorMessage = connectionResult.reason?.message || '连接测试失败';

        // 为IoTDB提供更友好的错误信息
        if (
          formData.dbType === 'iotdb' &&
          errorMessage.includes('ping request')
        ) {
          errorMessage = `IoTDB 连接失败: ${errorMessage}`;
        }

        setTestResult({
          success: false,
          error: errorMessage,
          latency: 0,
        });
      }

      // 处理版本检测结果
      if (versionResult.status === 'fulfilled' && versionResult.value.success) {
        await handleVersionChangeDetection(versionResult.value);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      const errorMessage = String(error).replace('Error: ', '');

      if (abortController.signal.aborted) {
        setTestResult({
          success: false,
          error: '连接测试超时或已取消',
          latency: 0,
        });
      } else {
        setTestResult({
          success: false,
          error: errorMessage,
          latency: 0,
        });
      }
    } finally {
      setIsTesting(false);
      setTestAbortController(null);
    }
  };

  // 仅测试连接（不检测版本）
  const testConnectionOnly = async () => {
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
      v2Config:
        formData.dbType === 'influxdb' &&
        (formData.version === '2.x' || formData.version === '3.x')
          ? {
              apiToken: formData.apiToken,
              organization: formData.organization,
              bucket: formData.bucket || undefined,
              v1CompatibilityApi: formData.v1CompatibilityApi,
            }
          : undefined,
      driverConfig:
        formData.dbType === 'iotdb'
          ? {
              iotdb: {
                sessionPoolSize: formData.sessionPoolSize,
                enableCompression: formData.enableCompression,
                timeZone: formData.timeZone,
                fetchSize: formData.fetchSize,
                enableRedirection: formData.enableRedirection,
                maxRetryCount: formData.maxRetryCount,
                retryIntervalMs: formData.retryIntervalMs,
              },
            }
          : undefined,
      proxyConfig: formData.proxyEnabled
        ? {
            enabled: formData.proxyEnabled,
            host: formData.proxyHost,
            port: formData.proxyPort,
            username: formData.proxyUsername || undefined,
            password: formData.proxyPassword || undefined,
            proxyType: formData.proxyType,
          }
        : undefined,
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
      return result;
    } finally {
      // 删除临时连接
      await deleteTempConnection(tempId);
    }
  };

  // 为测试检测版本
  const detectVersionForTest = async () => {
    return await DatabaseVersionDetectionService.detectDatabaseVersion({
      host: formData.host,
      port: formData.port,
      username: formData.username || undefined,
      password: formData.password || undefined,
      token: formData.apiToken || undefined,
    });
  };

  // 处理版本变化检测
  const handleVersionChangeDetection = async (
    newVersionResult: VersionDetectionResult
  ) => {
    if (!newVersionResult.success || !newVersionResult.version_info) return;

    const newVersionInfo = newVersionResult.version_info;

    // 如果是编辑现有连接，检查版本是否发生变化
    if (isEditing && connection?.versionInfo) {
      const oldVersion = connection.versionInfo.version;
      const newVersion = newVersionInfo.version;
      const oldType = connection.versionInfo.detected_type;
      const newType = newVersionInfo.detected_type;

      if (oldVersion !== newVersion || oldType !== newType) {
        // 版本发生变化，显示提醒
        showMessage.warning(
          `检测到数据库版本变化：${oldType} v${oldVersion} → ${newType} v${newVersion}`,
          5000
        );

        // 自动更新连接配置中的版本信息
        if (connection?.id) {
          try {
            const updatedConfig: ConnectionConfig = {
              ...connection,
              detectedVersion: newVersion,
              detectedType: newType,
              versionInfo: newVersionInfo,
              lastVersionCheck: new Date().toISOString(),
              versionCheckResult: newVersionResult,
              updated_at: new Date().toISOString(),
              updatedAt: new Date(),
            };

            await editConnection(updatedConfig);
            showMessage.success('连接版本信息已自动更新');
          } catch (error) {
            console.error('更新版本信息失败:', error);
            showMessage.error('更新版本信息失败');
          }
        }
      }
    }
  };

  // 版本检测和保存逻辑
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // 如果是编辑现有连接，直接保存
    if (isEditing) {
      await saveConnection();
      return;
    }

    // 新建连接时，先进行版本检测
    await detectVersionAndSave();
  };

  // 检测版本并保存
  const detectVersionAndSave = async () => {
    setIsDetectingVersion(true);
    setShowVersionDialog(true);

    try {
      const result =
        await DatabaseVersionDetectionService.detectDatabaseVersion({
          host: formData.host,
          port: formData.port,
          username: formData.username || undefined,
          password: formData.password || undefined,
          token: formData.apiToken || undefined,
        });

      setVersionDetectionResult(result);
    } catch (error) {
      console.error('版本检测失败:', error);
      setVersionDetectionResult({
        success: false,
        error_message: error instanceof Error ? error.message : '版本检测失败',
        detection_time_ms: 0,
        tried_methods: [],
      });
    } finally {
      setIsDetectingVersion(false);
    }
  };

  // 确认版本信息并保存连接
  const handleVersionConfirm = async (versionInfo: DatabaseVersionInfo) => {
    setShowVersionDialog(false);
    await saveConnection(versionInfo);
  };

  // 保存连接
  const saveConnection = async (versionInfo?: DatabaseVersionInfo) => {
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
        v2Config:
          formData.dbType === 'influxdb' &&
          (formData.version === '2.x' || formData.version === '3.x')
            ? {
                apiToken: formData.apiToken,
                organization:
                  formData.version === '3.x' && !formData.organization.trim()
                    ? '' // InfluxDB 3.x 允许空组织
                    : formData.organization,
                bucket: formData.bucket || undefined,
                v1CompatibilityApi: formData.v1CompatibilityApi,
              }
            : undefined,
        driverConfig:
          formData.dbType === 'iotdb'
            ? {
                iotdb: {
                  sessionPoolSize: formData.sessionPoolSize,
                  enableCompression: formData.enableCompression,
                  timeZone: formData.timeZone,
                  fetchSize: formData.fetchSize,
                  enableRedirection: formData.enableRedirection,
                  maxRetryCount: formData.maxRetryCount,
                  retryIntervalMs: formData.retryIntervalMs,
                },
              }
            : undefined,
        proxyConfig: formData.proxyEnabled
          ? {
              enabled: formData.proxyEnabled,
              host: formData.proxyHost,
              port: formData.proxyPort,
              username: formData.proxyUsername || undefined,
              password: formData.proxyPassword || undefined,
              proxyType: formData.proxyType,
            }
          : undefined,

        // 版本检测相关字段
        detectedVersion: versionInfo?.version,
        detectedType: versionInfo?.detected_type,
        versionInfo,
        lastVersionCheck: versionInfo ? new Date().toISOString() : undefined,
        versionCheckResult: versionDetectionResult || undefined,

        created_at: connection?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: connection?.createdAt || new Date(),
        updatedAt: new Date(),
      });

      if (isEditing) {
        // 编辑现有连接
        console.log('📝 编辑现有连接:', connection?.id);
        const configData = buildConfigData();
        await editConnection(configData);
        onSuccess(configData);
      } else {
        // 创建新连接
        console.log('➕ 创建新连接:', formData.name);
        const configData = buildConfigData();
        const id = await createConnection(configData);
        const finalConfigData = { ...configData, id };
        onSuccess(finalConfigData);
      }
    } catch (error) {
      console.error('保存连接失败:', error);
      const errorMessage = String(error).replace('Error: ', '');
      setTestResult({
        success: false,
        error: `保存失败: ${errorMessage}`,
        latency: 0,
      });
      // 错误结果会显示在底部测试结果区域
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderConnectionForm = () => (
    <div className='space-y-6'>
      {/* 基本信息 - 始终显示 */}
      <div className='space-y-4'>
        <h3 className='text-lg font-medium text-foreground border-b pb-2'>
          基本信息
        </h3>

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
              className={`h-9 ${
                errors.name
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
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
              className='h-9'
            />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <Label className='block text-sm font-medium text-foreground'>
              数据库类型 <span className='text-destructive'>*</span>
            </Label>
            <Select
              value={formData.dbType}
              onValueChange={value => {
                handleInputChange('dbType', value);
                // 根据数据库类型设置默认值
                if (value === 'influxdb') {
                  handleInputChange('port', 8086);
                  handleInputChange('version', '1.x'); // 默认选择 1.x
                } else if (value === 'iotdb') {
                  handleInputChange('port', 6667);
                  handleInputChange('version', '1.x'); // IoTDB 只有一个版本
                }
              }}
            >
              <SelectTrigger className='h-9'>
                <SelectValue placeholder='选择数据库类型'>
                  {formData.dbType && renderDatabaseTypeOption(formData.dbType)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='influxdb'>
                  {renderDatabaseTypeOption('influxdb')}
                </SelectItem>
                <SelectItem value='iotdb'>
                  {renderDatabaseTypeOption('iotdb')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* InfluxDB 版本选择器 */}
          {formData.dbType === 'influxdb' && (
            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                版本 <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={formData.version}
                onValueChange={value => {
                  handleInputChange('version', value);
                  // 根据版本清空相关字段
                  if (value === '1.x') {
                    handleInputChange('apiToken', '');
                    handleInputChange('organization', '');
                    handleInputChange('bucket', '');
                    handleInputChange('v1CompatibilityApi', false);
                  } else {
                    handleInputChange('username', '');
                    handleInputChange('password', '');
                    handleInputChange('retentionPolicy', '');
                  }
                }}
              >
                <SelectTrigger className='h-9'>
                  <SelectValue placeholder='选择版本'>
                    {formData.version && renderVersionOption(formData.version, formData.dbType)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1.x'>
                    {renderVersionOption('1.x', 'influxdb')}
                  </SelectItem>
                  <SelectItem value='2.x'>
                    {renderVersionOption('2.x', 'influxdb')}
                  </SelectItem>
                  <SelectItem value='3.x'>
                    {renderVersionOption('3.x', 'influxdb')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                不同版本使用不同的认证方式和查询语言
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tab 配置区域 */}
      <Tabs defaultValue='server' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='server'>服务器配置</TabsTrigger>
          <TabsTrigger value='advanced'>高级配置</TabsTrigger>
          <TabsTrigger value='proxy'>代理配置</TabsTrigger>
        </TabsList>

        {/* 服务器配置 Tab */}
        <TabsContent value='server' className='space-y-6 mt-6'>
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
                className={`h-9 ${
                  errors.host
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }`}
              />
              {errors.host && (
                <div className='text-xs text-destructive mt-1'>
                  {errors.host}
                </div>
              )}
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                端口 <span className='text-destructive'>*</span>
              </Label>
              <InputNumber
                placeholder='8086'
                value={formData.port}
                onChange={value =>
                  handleInputChange(
                    'port',
                    value || createDefaultConnectionConfig().port
                  )
                }
                className={`w-full h-9 ${errors.port ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                min={1}
                max={65535}
                controls={false}
              />
              {errors.port && (
                <div className='text-xs text-destructive mt-1'>
                  {errors.port}
                </div>
              )}
            </div>
          </div>

          {/* InfluxDB 1.x 认证配置 */}
          {formData.version === '1.x' && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 pb-2 border-b'>
                <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium'>
                  1.x
                </span>
                <h4 className='text-sm font-medium text-foreground'>
                  用户名/密码认证
                </h4>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    用户名
                  </Label>
                  <Input
                    placeholder='可选，如 admin'
                    value={formData.username}
                    onChange={e =>
                      handleInputChange('username', e.target.value)
                    }
                    autoCapitalize='off'
                    autoCorrect='off'
                    className='h-9'
                  />
                  <p className='text-xs text-muted-foreground'>
                    留空表示匿名访问
                  </p>
                </div>

                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    密码
                  </Label>
                  <Input
                    type='password'
                    placeholder='可选'
                    value={formData.password}
                    onChange={e =>
                      handleInputChange('password', e.target.value)
                    }
                    className='h-9'
                  />
                </div>
              </div>
            </div>
          )}

          {/* InfluxDB 2.x/3.x 认证配置 */}
          {(formData.version === '2.x' || formData.version === '3.x') && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 pb-2 border-b'>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    formData.version === '2.x'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {formData.version}
                </span>
                <h4 className='text-sm font-medium text-foreground'>
                  API Token 认证
                </h4>
              </div>

              <div className='space-y-1'>
                <Label className='block text-sm font-medium text-foreground'>
                  API 令牌 <span className='text-destructive'>*</span>
                </Label>
                <Input
                  type='password'
                  placeholder='请输入 API Token'
                  value={formData.apiToken}
                  onChange={e => handleInputChange('apiToken', e.target.value)}
                  className={`h-9 ${
                    errors.apiToken
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }`}
                />
                {errors.apiToken && (
                  <div className='text-xs text-destructive mt-1'>
                    {errors.apiToken}
                  </div>
                )}
                <p className='text-xs text-muted-foreground'>
                  在 InfluxDB UI 中生成的 API Token，具有读写权限
                </p>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    组织 ID/名称{' '}
                    {formData.version === '3.x' ? (
                      <span className='text-muted-foreground text-xs'>
                        (可选)
                      </span>
                    ) : (
                      <span className='text-destructive'>*</span>
                    )}
                  </Label>
                  <Input
                    placeholder={
                      formData.version === '3.x'
                        ? '可选，如: myorg'
                        : '如: myorg 或 org-id'
                    }
                    value={formData.organization}
                    onChange={e =>
                      handleInputChange('organization', e.target.value)
                    }
                    autoCapitalize='off'
                    autoCorrect='off'
                    className={`h-9 ${
                      errors.organization
                        ? 'border-destructive focus-visible:ring-destructive'
                        : ''
                    }`}
                  />
                  {errors.organization && (
                    <div className='text-xs text-destructive mt-1'>
                      {errors.organization}
                    </div>
                  )}
                  <p className='text-xs text-muted-foreground'>
                    {formData.version === '3.x'
                      ? '可选，某些 InfluxDB 3.x 部署不需要组织'
                      : '组织名称或 ID'}
                  </p>
                </div>

                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    默认存储桶
                  </Label>
                  <Input
                    placeholder='如: mybucket'
                    value={formData.bucket}
                    onChange={e => handleInputChange('bucket', e.target.value)}
                    autoCapitalize='off'
                    autoCorrect='off'
                    className='h-9'
                  />
                  <p className='text-xs text-muted-foreground'>
                    可选，连接后默认选择的存储桶
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 版本特定配置 */}
          {formData.version === '1.x' && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 pb-2 border-b'>
                <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium'>
                  1.x
                </span>
                <h4 className='text-sm font-medium text-foreground'>
                  数据库配置
                </h4>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    默认数据库
                  </Label>
                  <Input
                    placeholder='如: mydb'
                    value={formData.database}
                    onChange={e =>
                      handleInputChange('database', e.target.value)
                    }
                    autoCapitalize='off'
                    autoCorrect='off'
                    className='h-9'
                  />
                  <p className='text-xs text-muted-foreground'>
                    可选，连接后默认选择的数据库
                  </p>
                </div>

                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    默认保留策略
                  </Label>
                  <Input
                    placeholder='如: autogen'
                    value={formData.retentionPolicy}
                    onChange={e =>
                      handleInputChange('retentionPolicy', e.target.value)
                    }
                    autoCapitalize='off'
                    autoCorrect='off'
                    className='h-9'
                  />
                  <p className='text-xs text-muted-foreground'>
                    可选，默认保留策略名称
                  </p>
                </div>
              </div>
            </div>
          )}

          {(formData.version === '2.x' || formData.version === '3.x') && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 pb-2 border-b'>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    formData.version === '2.x'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {formData.version}
                </span>
                <h4 className='text-sm font-medium text-foreground'>
                  兼容性配置
                </h4>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    V1 兼容 API
                  </Label>
                  <div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/50'>
                    <Switch
                      id='v1-compat-switch'
                      checked={formData.v1CompatibilityApi}
                      onCheckedChange={checked =>
                        handleInputChange('v1CompatibilityApi', checked)
                      }
                    />
                    <Label
                      htmlFor='v1-compat-switch'
                      className='text-sm font-medium cursor-pointer'
                    >
                      {formData.v1CompatibilityApi
                        ? '已启用 V1 兼容 API'
                        : '启用 V1 兼容 API'}
                    </Label>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    启用后可使用 InfluxQL 查询语言
                  </p>
                </div>

                <div className='space-y-1'>
                  <Label className='block text-sm font-medium text-foreground'>
                    默认数据库
                  </Label>
                  <Input
                    placeholder='可选，用于 V1 兼容 API'
                    value={formData.database}
                    onChange={e =>
                      handleInputChange('database', e.target.value)
                    }
                    autoCapitalize='off'
                    autoCorrect='off'
                    className='h-9'
                    disabled={!formData.v1CompatibilityApi}
                  />
                  <p className='text-xs text-muted-foreground'>
                    仅在启用 V1 兼容 API 时有效
                  </p>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 高级配置 Tab */}
        <TabsContent value='advanced' className='space-y-6 mt-6'>
          <div className='grid grid-cols-3 gap-4'>
            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                连接超时(秒)
              </Label>
              <InputNumber
                placeholder='30'
                value={formData.connectionTimeout}
                onChange={value =>
                  handleInputChange('connectionTimeout', value || 30)
                }
                className={`w-full h-9 ${errors.connectionTimeout ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
                onChange={value =>
                  handleInputChange('queryTimeout', value || 60)
                }
                className={`w-full h-9 ${errors.queryTimeout ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
                className={`w-full h-9 ${errors.timeout ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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

          {/* IoTDB 特定配置 */}
          {formData.dbType === 'iotdb' && (
            <div className='space-y-6'>
              <div className='text-lg font-medium text-foreground border-b pb-2'>
                IoTDB 特定配置
              </div>

              {/* 连接配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  连接配置
                </h4>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <Label className='block text-sm font-medium text-foreground'>
                      会话池大小
                    </Label>
                    <InputNumber
                      placeholder='5'
                      value={formData.sessionPoolSize}
                      onChange={value =>
                        handleInputChange('sessionPoolSize', value || 5)
                      }
                      className='w-full h-9'
                      min={1}
                      max={100}
                      controls={false}
                    />
                    <div className='text-xs text-muted-foreground'>
                      同时维护的会话连接数量，建议1-20
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <Label className='block text-sm font-medium text-foreground'>
                      时区设置
                    </Label>
                    <Select
                      value={formData.timeZone}
                      onValueChange={value =>
                        handleInputChange('timeZone', value)
                      }
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue placeholder='选择时区' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='Asia/Shanghai'>
                          Asia/Shanghai (北京时间)
                        </SelectItem>
                        <SelectItem value='UTC'>UTC (协调世界时)</SelectItem>
                        <SelectItem value='America/New_York'>
                          America/New_York (美东时间)
                        </SelectItem>
                        <SelectItem value='Europe/London'>
                          Europe/London (伦敦时间)
                        </SelectItem>
                        <SelectItem value='Asia/Tokyo'>
                          Asia/Tokyo (东京时间)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className='text-xs text-muted-foreground'>
                      时间序列数据的时区设置
                    </div>
                  </div>
                </div>
              </div>

              {/* 性能配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  性能配置
                </h4>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <Label className='block text-sm font-medium text-foreground'>
                      数据获取大小
                    </Label>
                    <InputNumber
                      placeholder='10000'
                      value={formData.fetchSize}
                      onChange={value =>
                        handleInputChange('fetchSize', value || 10000)
                      }
                      className='w-full h-9'
                      min={100}
                      max={1000000}
                      controls={false}
                    />
                    <div className='text-xs text-muted-foreground'>
                      单次查询返回的最大记录数，建议1000-50000
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <Label className='block text-sm font-medium text-foreground'>
                      启用数据压缩
                    </Label>
                    <div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/50'>
                      <Switch
                        id='compression-switch'
                        checked={formData.enableCompression}
                        onCheckedChange={checked =>
                          handleInputChange('enableCompression', checked)
                        }
                      />
                      <Label
                        htmlFor='compression-switch'
                        className='text-sm font-medium cursor-pointer'
                      >
                        {formData.enableCompression ? '已启用' : '已禁用'}
                      </Label>
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      启用后可减少网络传输数据量，提高查询性能
                    </div>
                  </div>
                </div>
              </div>

              {/* 重试和重定向配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  重试和重定向配置
                </h4>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <Label className='block text-sm font-medium text-foreground'>
                      最大重试次数
                    </Label>
                    <InputNumber
                      placeholder='3'
                      value={formData.maxRetryCount}
                      onChange={value =>
                        handleInputChange('maxRetryCount', value || 3)
                      }
                      className='w-full h-9'
                      min={0}
                      max={20}
                      controls={false}
                    />
                    <div className='text-xs text-muted-foreground'>
                      连接失败时的重试次数，0表示不重试
                    </div>
                  </div>

                  <div className='space-y-1'>
                    <Label className='block text-sm font-medium text-foreground'>
                      重试间隔(毫秒)
                    </Label>
                    <InputNumber
                      placeholder='1000'
                      value={formData.retryIntervalMs}
                      onChange={value =>
                        handleInputChange('retryIntervalMs', value || 1000)
                      }
                      className='w-full h-9'
                      min={100}
                      max={30000}
                      controls={false}
                    />
                    <div className='text-xs text-muted-foreground'>
                      两次重试之间的等待时间
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-4'>
                  <div className='space-y-1'>
                    <Label className='block text-sm font-medium text-foreground'>
                      启用自动重定向
                    </Label>
                    <div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/50'>
                      <Switch
                        id='redirection-switch'
                        checked={formData.enableRedirection}
                        onCheckedChange={checked =>
                          handleInputChange('enableRedirection', checked)
                        }
                      />
                      <Label
                        htmlFor='redirection-switch'
                        className='text-sm font-medium cursor-pointer'
                      >
                        {formData.enableRedirection ? '已启用' : '已禁用'}
                      </Label>
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      在集群环境中自动重定向到正确的节点
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 查询语言和SSL配置合并为一行 */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                默认查询语言
              </Label>
              <Select
                value={formData.defaultQueryLanguage}
                onValueChange={value =>
                  handleInputChange('defaultQueryLanguage', value)
                }
              >
                <SelectTrigger className='h-9'>
                  <SelectValue placeholder='选择查询语言' />
                </SelectTrigger>
                <SelectContent>
                  {formData.dbType === 'influxdb' && (
                    <>
                      <SelectItem value='InfluxQL'>InfluxQL</SelectItem>
                      <SelectItem value='Flux'>Flux</SelectItem>
                      {formData.version === '3.x' && (
                        <SelectItem value='SQL'>SQL</SelectItem>
                      )}
                    </>
                  )}
                  {formData.dbType === 'iotdb' && (
                    <SelectItem value='SQL'>SQL</SelectItem>
                  )}
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
        <TabsContent value='proxy' className='space-y-6 mt-6'>
          {/* 启用代理开关 */}
          <div className='flex items-center justify-between p-4 rounded-lg border bg-muted/20'>
            <div>
              <Label
                htmlFor='proxy-switch'
                className='text-sm font-medium cursor-pointer'
              >
                启用代理
              </Label>
              <p className='text-xs text-muted-foreground mt-1'>
                启用后将通过代理服务器连接到InfluxDB
              </p>
            </div>
            <Switch
              id='proxy-switch'
              checked={formData.proxyEnabled}
              onCheckedChange={checked =>
                handleInputChange('proxyEnabled', checked)
              }
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
                className={`h-9 ${
                  errors.proxyHost
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }`}
              />
              {errors.proxyHost && (
                <div className='text-xs text-destructive mt-1'>
                  {errors.proxyHost}
                </div>
              )}
            </div>

            <div className='space-y-1'>
              <Label className='block text-sm font-medium text-foreground'>
                代理端口 <span className='text-destructive'>*</span>
              </Label>
              <InputNumber
                placeholder='8080'
                value={formData.proxyPort}
                onChange={value =>
                  handleInputChange('proxyPort', value || 8080)
                }
                className={`w-full h-9 ${errors.proxyPort ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                min={1}
                max={65535}
                controls={false}
              />
              {errors.proxyPort && (
                <div className='text-xs text-destructive mt-1'>
                  {errors.proxyPort}
                </div>
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
              <SelectTrigger className='w-full max-w-xs h-9'>
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
                onChange={e =>
                  handleInputChange('proxyUsername', e.target.value)
                }
                autoCapitalize='off'
                autoCorrect='off'
                className='h-9'
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
                onChange={e =>
                  handleInputChange('proxyPassword', e.target.value)
                }
                className='h-9'
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <>
      <Dialog open={visible} onOpenChange={open => !open && onCancel()}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='pb-4'>
            <DialogTitle className='text-xl font-semibold'>
              {isEditing ? '编辑连接' : '新建连接'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-6'>
            {/* 连接配置表单 */}
            {renderConnectionForm()}

            {/* 测试结果显示区域 */}
            {testResult && (
              <div className='border-t pt-4'>
                <div
                  className={`p-4 rounded-lg border ${
                    testResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className='flex items-start gap-3'>
                    {testResult.success ? (
                      <CheckCircle className='w-5 h-5 text-green-600 flex-shrink-0 mt-0.5' />
                    ) : (
                      <XCircle className='w-5 h-5 text-red-600 flex-shrink-0 mt-0.5' />
                    )}
                    <div className='flex-1'>
                      <h4
                        className={`font-medium ${
                          testResult.success ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {testResult.success ? '连接测试成功' : '连接测试失败'}
                      </h4>
                      {testResult.success ? (
                        <div className='mt-2 text-sm text-green-700'>
                          <p>✅ 数据库连接正常</p>
                          {testResult.latency && (
                            <p>⚡ 响应时间: {testResult.latency}ms</p>
                          )}
                          <p className='mt-1 text-green-600'>
                            连接配置有效，可以保存使用
                          </p>
                        </div>
                      ) : (
                        <div className='mt-2 text-sm text-red-700'>
                          <p className='font-medium'>错误详情:</p>
                          <p className='mt-1 bg-red-100 p-2 rounded text-xs font-mono'>
                            {testResult.error}
                          </p>
                          {formData.dbType === 'iotdb' &&
                            testResult.error?.includes('ping request') && (
                              <div className='mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs'>
                                <p className='font-medium'>
                                  💡 IoTDB 连接提示:
                                </p>
                                <ul className='mt-1 list-disc list-inside space-y-1'>
                                  <li>确保 IoTDB 服务正在运行</li>
                                  <li>检查端口号是否正确（默认: 6667）</li>
                                  <li>确认网络连接和防火墙设置</li>
                                  <li>IoTDB 使用 TCP 连接，不是 HTTP</li>
                                </ul>
                              </div>
                            )}
                          <p className='mt-2 text-red-600'>
                            请检查连接参数后重试
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className='flex justify-end gap-3 pt-4 border-t'>
              <Button onClick={handleCancel} variant='outline' size='sm'>
                取消
              </Button>

              <Button
                onClick={handleTestConnection}
                disabled={isTesting}
                variant='outline'
                size='sm'
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

              <Button onClick={handleSubmit} disabled={isSubmitting} size='sm'>
                {isSubmitting ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    保存中...
                  </>
                ) : (
                  '保存连接'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 版本检测确认对话框 */}
      <VersionDetectionDialog
        visible={showVersionDialog}
        detectionResult={versionDetectionResult}
        connectionName={formData.name}
        onConfirm={handleVersionConfirm}
        onCancel={() => setShowVersionDialog(false)}
        loading={isDetectingVersion}
      />
    </>
  );
};
