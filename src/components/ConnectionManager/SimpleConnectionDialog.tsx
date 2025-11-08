import React, { useEffect, useState, useRef, useCallback } from 'react';
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
// import { VersionDetectionDialog } from './VersionDetectionDialog'; // 不再使用
import { getDatabaseBrandIcon } from '@/utils/iconLoader';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionsTranslation } from '@/hooks/useTranslation';
import logger from '@/utils/logger';
import { t } from '@/i18n';

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
  // 对象存储特有配置
  objectStorageProvider: 's3' | 'minio' | 'aliyun-oss' | 'tencent-cos';
  s3Endpoint: string;
  s3InternalEndpoint: string;
  s3ExternalEndpoint: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3UseSSL: boolean;
  s3PathStyle: boolean;
  s3SessionToken: string;
  // 代理配置
  proxyEnabled: boolean;
  proxyHost: string;
  proxyPort: number;
  proxyUsername: string;
  proxyPassword: string;
  proxyType: 'http' | 'https' | 'socks5';
}

// 渲染数据库类型选项（使用品牌图标）
const renderDatabaseTypeOption = (dbType: string, t: (key: string) => string) => {
  const dbTypeMap: Record<string, string> = {
    'influxdb': 'InfluxDB',
    'iotdb': 'IoTDB',
    'object-storage': 'S3'
  };

  const getDisplayName = (type: string) => {
    switch(type) {
      case 'influxdb': return 'InfluxDB';
      case 'iotdb': return 'Apache IoTDB';
      case 'object-storage': return t('objectStorage');
      default: return type;
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <img
        src={getDatabaseBrandIcon(dbTypeMap[dbType] || 'Generic')}
        alt={`${dbType} icon`}
        className="w-4 h-4"
      />
      <span>{getDisplayName(dbType)}</span>
    </div>
  );
};

// 渲染对象存储服务商选项
const renderObjectStorageProviderOption = (provider: string, t: (key: string) => string) => {
  const providerMap: Record<string, string> = {
    's3': 'S3',
    'minio': 'MinIO',
    'aliyun-oss': 'AliyunOSS',
    'tencent-cos': 'TencentCOS'
  };

  const getDisplayName = (type: string) => {
    switch(type) {
      case 's3': return 'Amazon S3';
      case 'minio': return 'MinIO';
      case 'aliyun-oss': return t('aliyunOSS');
      case 'tencent-cos': return t('tencentCOS');
      default: return type;
    }
  };

  return (
    <div className='flex items-center gap-2'>
      <img
        src={getDatabaseBrandIcon(providerMap[provider] || 'Generic')}
        alt={`${provider} icon`}
        className="w-4 h-4"
      />
      <span>{getDisplayName(provider)}</span>
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
    } else if (dbType === 's3' || dbType === 'minio') {
      return getDatabaseBrandIcon(dbType === 's3' ? 'S3' : 'MinIO');
    }
    return getDatabaseBrandIcon('IoTDB');
  };

  const getVersionDisplay = () => {
    if (dbType === 'influxdb') return `InfluxDB ${version}`;
    if (dbType === 'iotdb') return 'Apache IoTDB';
    if (dbType === 's3') return 'Amazon S3';
    if (dbType === 'minio') return 'MinIO';
    return version;
  };

  return (
    <div className='flex items-center gap-2'>
      <img
        src={getVersionIcon(version, dbType)}
        alt={`${version} icon`}
        className="w-4 h-4"
      />
      <span className='font-medium'>
        {getVersionDisplay()}
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
  const { t: tConn } = useConnectionsTranslation();
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
  const [activeTab, setActiveTab] = useState<string>('server');

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

  // 版本检测相关状态（已废弃，保留用于兼容性）
  // 版本检测现在在测试连接时进行，不再需要单独的对话框
  // const [showVersionDialog, setShowVersionDialog] = useState(false);
  // const [versionDetectionResult, setVersionDetectionResult] = useState<VersionDetectionResult | null>(null);
  // const [isDetectingVersion, setIsDetectingVersion] = useState(false);

  // 添加保留策略相关状态
  const [availableRetentionPolicies, setAvailableRetentionPolicies] = useState<string[]>([]);
  const [loadingRetentionPolicies, setLoadingRetentionPolicies] = useState(false);

  // 跟踪对话框是否真正打开（用于防止测试连接时重置表单）
  const prevVisibleRef = useRef(visible);

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
      // 对象存储默认配置
      objectStorageProvider: 's3' as const,
      s3Endpoint: '',
      s3InternalEndpoint: '',
      s3ExternalEndpoint: '',
      s3Region: 'us-east-1',
      s3AccessKey: '',
      s3SecretKey: '',
      s3UseSSL: true,
      s3PathStyle: true,
      s3SessionToken: '',
      proxyEnabled: false,
      proxyHost: '127.0.0.1',
      proxyPort: 8080,
      proxyUsername: '',
      proxyPassword: '',
      proxyType: 'http' as const,
    };
  });

  const isEditing = !!connection?.id;

  // 修复：只在对话框真正打开时重置表单，避免测试连接失败时重置
  useEffect(() => {
    const isDialogOpening = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (isDialogOpening) {
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
          // 对象存储配置
          objectStorageProvider: connection.driverConfig?.s3?.provider || 's3',
          s3Endpoint: connection.driverConfig?.s3?.endpoint || '',
          s3InternalEndpoint: connection.driverConfig?.s3?.internalEndpoint || '',
          s3ExternalEndpoint: connection.driverConfig?.s3?.externalEndpoint || '',
          s3Region: connection.driverConfig?.s3?.region || 'us-east-1',
          s3AccessKey: connection.driverConfig?.s3?.accessKey || '',
          s3SecretKey: connection.driverConfig?.s3?.secretKey || '',
          s3UseSSL: connection.driverConfig?.s3?.useSSL ?? true,
          s3PathStyle: connection.driverConfig?.s3?.pathStyle ?? true,
          s3SessionToken: connection.driverConfig?.s3?.sessionToken || '',
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
          // 对象存储默认配置
          objectStorageProvider: 's3',
          s3Endpoint: '',
          s3InternalEndpoint: '',
          s3ExternalEndpoint: '',
          s3Region: 'us-east-1',
          s3AccessKey: '',
          s3SecretKey: '',
          s3UseSSL: true,
          s3PathStyle: true,
          s3SessionToken: '',
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
      setAvailableRetentionPolicies([]);
    }
  }, [visible, connection]);

  // 获取保留策略列表
  const fetchRetentionPolicies = useCallback(async (connectionId: string, database: string) => {
    if (!database || formData.dbType !== 'influxdb' || formData.version !== '1.x') {
      return;
    }

    try {
      setLoadingRetentionPolicies(true);
      const policies = await safeTauriInvoke<Array<{ name: string }>>('get_retention_policies', {
        connectionId,
        database,
      });

      if (policies && Array.isArray(policies)) {
        const policyNames = policies.map(p => p.name);
        setAvailableRetentionPolicies(policyNames);
      }
    } catch (error) {
      logger.warn('获取保留策略失败:', error);
      // 失败时不显示错误，只是不提供建议
      setAvailableRetentionPolicies([]);
    } finally {
      setLoadingRetentionPolicies(false);
    }
  }, [formData.dbType, formData.version]);

  // 当数据库字段变化时，尝试获取保留策略
  useEffect(() => {
    if (isEditing && connection?.id && formData.database) {
      fetchRetentionPolicies(connection.id, formData.database);
    }
  }, [isEditing, connection?.id, formData.database, fetchRetentionPolicies]);

  // 当数据库类型变化时，确保切换到服务器配置Tab
  useEffect(() => {
    // 所有数据库类型默认都显示服务器配置Tab
    setActiveTab('server');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.dbType]);

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
      newErrors.name = tConn('validation.name_required');
    }

    if (!formData.host.trim()) {
      newErrors.host = tConn('validation.host_required');
    } else {
      const ipError = ValidationUtils.ipAddress(formData.host);
      const hostnameError = ValidationUtils.hostname(formData.host);
      if (ipError && hostnameError) {
        newErrors.host = tConn('validation.host_format_invalid');
      }
    }

    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = tConn('validation.port_range');
    }

    if (formData.timeout < 5 || formData.timeout > 300) {
      newErrors.timeout = tConn('validation.timeout_range');
    }

    if (formData.connectionTimeout < 5 || formData.connectionTimeout > 300) {
      newErrors.connectionTimeout = tConn('validation.connection_timeout_range');
    }

    if (formData.queryTimeout < 10 || formData.queryTimeout > 3600) {
      newErrors.queryTimeout = tConn('validation.query_timeout_range');
    }

    // InfluxDB 2.x/3.x 特有验证
    if (
      formData.dbType === 'influxdb' &&
      (formData.version === '2.x' || formData.version === '3.x')
    ) {
      if (!formData.apiToken.trim()) {
        newErrors.apiToken = tConn('validation.api_token_required');
      }
      // InfluxDB 2.x 必须有组织，3.x 可选
      if (formData.version === '2.x' && !formData.organization.trim()) {
        newErrors.organization = tConn('validation.organization_required');
      }
    }

    // IoTDB 特有验证
    if (formData.dbType === 'iotdb') {
      if (formData.sessionPoolSize < 1 || formData.sessionPoolSize > 50) {
        newErrors.sessionPoolSize = tConn('validation.session_pool_size_range');
      }
      if (formData.fetchSize < 100 || formData.fetchSize > 100000) {
        newErrors.fetchSize = tConn('validation.fetch_size_range');
      }
      if (formData.maxRetryCount < 0 || formData.maxRetryCount > 10) {
        newErrors.maxRetryCount = tConn('validation.max_retry_count_range');
      }
      if (formData.retryIntervalMs < 100 || formData.retryIntervalMs > 10000) {
        newErrors.retryIntervalMs = tConn('validation.retry_interval_range');
      }
    }

    // 对象存储特有验证
    if (formData.dbType === 'object-storage') {
      if (!formData.s3Endpoint.trim()) {
        newErrors.s3Endpoint = tConn('validation.s3_endpoint_required');
      }
      if (!formData.s3Region.trim()) {
        newErrors.s3Region = tConn('validation.s3_region_required');
      }
      if (!formData.s3AccessKey.trim()) {
        newErrors.s3AccessKey = tConn('validation.s3_access_key_required');
      }
      if (!formData.s3SecretKey.trim()) {
        newErrors.s3SecretKey = tConn('validation.s3_secret_key_required');
      }
    }

    // 代理配置验证
    if (formData.proxyEnabled) {
      if (!formData.proxyHost.trim()) {
        newErrors.proxyHost = tConn('validation.proxy_host_required');
      }
      if (
        !formData.proxyPort ||
        formData.proxyPort < 1 ||
        formData.proxyPort > 65535
      ) {
        newErrors.proxyPort = tConn('validation.proxy_port_range');
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
          error: t('connections.test_cancelled'),
          latency: 0,
        });
        return;
      }

      // 处理连接测试结果和版本检测结果
      let finalTestResult: ConnectionTestResult;

      if (connectionResult.status === 'fulfilled') {
        finalTestResult = connectionResult.value;

        // 如果版本检测成功，将版本信息添加到测试结果中
        if (versionResult.status === 'fulfilled' && versionResult.value.success && versionResult.value.version_info) {
          finalTestResult.versionInfo = versionResult.value.version_info;
          finalTestResult.serverVersion = versionResult.value.version_info.version;
        }

        setTestResult(finalTestResult);
      } else {
        let errorMessage = connectionResult.reason?.message || t('connections.test_failed');

        // 为IoTDB提供更友好的错误信息
        if (
          formData.dbType === 'iotdb' &&
          errorMessage.includes('ping request')
        ) {
          errorMessage = `IoTDB 连接失败: ${errorMessage}`;
        }

        finalTestResult = {
          success: false,
          error: errorMessage,
          latency: 0,
        };

        setTestResult(finalTestResult);
      }

      // 处理版本检测结果（用于编辑连接时的版本变化检测）
      if (versionResult.status === 'fulfilled' && versionResult.value.success) {
        await handleVersionChangeDetection(versionResult.value);
      }
    } catch (error) {
      logger.error('测试连接失败:', error);
      const errorMessage = String(error).replace('Error: ', '');

      if (abortController.signal.aborted) {
        setTestResult({
          success: false,
          error: t('connections.test_timeout_or_cancelled'),
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
          tConn('versionChangeDetected', { oldType, oldVersion, newType, newVersion }),
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
            showMessage.success(tConn('versionInfoUpdated'));
          } catch (error) {
            logger.error('更新版本信息失败:', error);
            showMessage.error(tConn('versionUpdateFailed'));
          }
        }
      }
    }
  };

  // 版本检测和保存逻辑
  const handleSubmit = async () => {
    if (!validateForm()) return;

    // 使用测试连接时检测的版本信息（如果有）
    const versionInfo = testResult?.versionInfo;

    // 直接保存连接，不再弹出版本检测对话框
    await saveConnection(versionInfo);
  };

  // 检测版本并保存（已废弃，保留用于兼容性）
  const detectVersionAndSave = async () => {
    // 不再使用，直接在测试连接时检测版本
    logger.warn('detectVersionAndSave is deprecated, version detection is now done during connection test');
  };

  // 确认版本信息并保存连接（已废弃，保留用于兼容性）
  const handleVersionConfirm = async (versionInfo: DatabaseVersionInfo) => {
    // 不再使用
    logger.warn('handleVersionConfirm is deprecated');
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
            : formData.dbType === 'object-storage'
            ? {
                s3: {
                  provider: formData.objectStorageProvider,
                  endpoint: formData.s3Endpoint,
                  internalEndpoint: formData.s3InternalEndpoint || undefined,
                  externalEndpoint: formData.s3ExternalEndpoint || undefined,
                  region: formData.s3Region,
                  accessKey: formData.s3AccessKey,
                  secretKey: formData.s3SecretKey,
                  useSSL: formData.s3UseSSL,
                  pathStyle: formData.s3PathStyle,
                  sessionToken: formData.s3SessionToken || undefined,
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

        created_at: connection?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: connection?.createdAt || new Date(),
        updatedAt: new Date(),
      });

      if (isEditing) {
        // 编辑现有连接
        logger.info('📝 编辑现有连接:', connection?.id);
        const configData = buildConfigData();
        await editConnection(configData);
        onSuccess(configData);
      } else {
        // 创建新连接
        logger.info('➕ 创建新连接:', formData.name);
        const configData = buildConfigData();
        const id = await createConnection(configData);
        const finalConfigData = { ...configData, id };
        onSuccess(finalConfigData);
      }
    } catch (error) {
      logger.error('保存连接失败:', error);
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
        {/* 连接名称 */}
        <div className='flex items-start gap-4'>
          <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
            {tConn('connection_name')}<span className='text-destructive'>*</span>:
          </Label>
          <div className='flex-1'>
            <Input
              placeholder={tConn('nameExample')}
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
        </div>

        {/* 描述 */}
        <div className='flex items-start gap-4'>
          <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
            {tConn('description')}:
          </Label>
          <div className='flex-1'>
            <Input
              placeholder={tConn('descriptionPlaceholder')}
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              autoCapitalize='off'
              autoCorrect='off'
              className='h-9'
            />
          </div>
        </div>

        {/* 数据库类型 */}
        <div className='flex items-start gap-4'>
          <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
            {tConn('database_type')}<span className='text-destructive'>*</span>:
          </Label>
          <div className='flex-1'>
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
                } else if (value === 'object-storage') {
                  // 默认选择 S3
                  handleInputChange('objectStorageProvider', 's3');
                  handleInputChange('port', 443);
                  handleInputChange('s3Endpoint', 's3.amazonaws.com');
                  handleInputChange('s3Region', 'us-east-1');
                  handleInputChange('s3UseSSL', true);
                  handleInputChange('s3PathStyle', false);
                }
              }}
            >
              <SelectTrigger className='h-9'>
                <SelectValue placeholder={tConn('selectDatabaseType')}>
                  {formData.dbType && renderDatabaseTypeOption(formData.dbType, tConn)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='influxdb'>
                  {renderDatabaseTypeOption('influxdb', tConn)}
                </SelectItem>
                <SelectItem value='iotdb'>
                  {renderDatabaseTypeOption('iotdb', tConn)}
                </SelectItem>
                <SelectItem value='object-storage'>
                  {renderDatabaseTypeOption('object-storage', tConn)}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* InfluxDB 版本选择器 */}
        {formData.dbType === 'influxdb' && (
          <div className='flex items-start gap-4'>
            <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
              {tConn('server_version')}<span className='text-destructive'>*</span>:
            </Label>
            <div className='flex-1'>
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
                  <SelectValue placeholder={tConn('selectVersion')}>
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
              <p className='text-xs text-muted-foreground mt-1'>
                不同版本使用不同的认证方式和查询语言
              </p>
            </div>
          </div>
        )}

        {/* 对象存储服务商选择器 */}
        {formData.dbType === 'object-storage' && (
          <div className='flex items-start gap-4'>
            <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
              {tConn('selectProvider')}<span className='text-destructive'>*</span>:
            </Label>
            <div className='flex-1'>
              <Select
                value={formData.objectStorageProvider}
                onValueChange={value => {
                  handleInputChange('objectStorageProvider', value);
                  // 根据服务商设置默认配置
                  if (value === 's3') {
                    handleInputChange('port', 443);
                    handleInputChange('s3Endpoint', 's3.amazonaws.com');
                    handleInputChange('s3Region', 'us-east-1');
                    handleInputChange('s3UseSSL', true);
                    handleInputChange('s3PathStyle', false);
                  } else if (value === 'minio') {
                    handleInputChange('port', 9000);
                    handleInputChange('s3Endpoint', 'localhost');
                    handleInputChange('s3Region', 'us-east-1');
                    handleInputChange('s3UseSSL', false);
                    handleInputChange('s3PathStyle', true);
                  } else if (value === 'aliyun-oss') {
                    handleInputChange('port', 443);
                    handleInputChange('s3Endpoint', 'oss-cn-hangzhou.aliyuncs.com');
                    handleInputChange('s3Region', 'oss-cn-hangzhou');
                    handleInputChange('s3UseSSL', true);
                    handleInputChange('s3PathStyle', false);
                  } else if (value === 'tencent-cos') {
                    handleInputChange('port', 443);
                    handleInputChange('s3Endpoint', 'cos.ap-beijing.myqcloud.com');
                    handleInputChange('s3Region', 'ap-beijing');
                    handleInputChange('s3UseSSL', true);
                    handleInputChange('s3PathStyle', false);
                  }
                }}
              >
                <SelectTrigger className='h-9'>
                  <SelectValue placeholder={tConn('selectProvider')}>
                    {formData.objectStorageProvider && renderObjectStorageProviderOption(formData.objectStorageProvider, tConn)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='s3'>
                    {renderObjectStorageProviderOption('s3', tConn)}
                  </SelectItem>
                  <SelectItem value='minio'>
                    {renderObjectStorageProviderOption('minio', tConn)}
                  </SelectItem>
                  <SelectItem value='aliyun-oss'>
                    {renderObjectStorageProviderOption('aliyun-oss', tConn)}
                  </SelectItem>
                  <SelectItem value='tencent-cos'>
                    {renderObjectStorageProviderOption('tencent-cos', tConn)}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground mt-1'>
                选择对象存储服务提供商
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab 配置区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='server'>{tConn('serverConfig')}</TabsTrigger>
          <TabsTrigger value='advanced'>{tConn('advanced_settings')}</TabsTrigger>
          <TabsTrigger value='proxy'>{tConn('proxyConfig')}</TabsTrigger>
        </TabsList>

        {/* 服务器配置 Tab */}
        <TabsContent value='server' className='space-y-6 mt-6'>
          {/* InfluxDB/IoTDB 配置（对象存储不显示） */}
          {formData.dbType !== 'object-storage' && (
            <>
              {/* 主机地址和端口 - 同一行 */}
              <div className='flex items-start gap-4'>
                <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                  {tConn('host')}<span className='text-destructive'>*</span>:
                </Label>
                <div className='flex-1 flex gap-4'>
                  <div className='flex-1'>
                    <Input
                      placeholder={tConn('hostExample')}
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
                  <div className='w-32'>
                    <div className='flex items-center gap-2'>
                      <Label className='text-sm font-medium text-foreground whitespace-nowrap'>
                        {tConn('port')}<span className='text-destructive'>*</span>:
                      </Label>
                      <InputNumber
                        placeholder={tConn('portExample')}
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
                    </div>
                    {errors.port && (
                      <div className='text-xs text-destructive mt-1'>
                        {errors.port}
                      </div>
                    )}
                  </div>
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
                  {tConn('auth_method')}
                </h4>
              </div>

              {/* 用户名和密码 - 同一行 */}
              <div className='flex items-start gap-4'>
                <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                  {tConn('username')}:
                </Label>
                <div className='flex-1 flex gap-4 items-start'>
                  <div className='flex-1'>
                    <Input
                      placeholder={tConn('usernameOptional')}
                      value={formData.username}
                      onChange={e =>
                        handleInputChange('username', e.target.value)
                      }
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      {tConn('no_auth')}
                    </p>
                  </div>
                  <div className='flex-1 flex items-start gap-2'>
                    <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                      {tConn('password')}:
                    </Label>
                    <div className='flex-1'>
                      <Input
                        type='password'
                        placeholder={tConn('usernameOptional')}
                        value={formData.password}
                        onChange={e =>
                          handleInputChange('password', e.target.value)
                        }
                        className='h-9'
                      />
                    </div>
                  </div>
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
                  {tConn('token_auth')}
                </h4>
              </div>

              {/* API 令牌 */}
              <div className='flex items-start gap-4'>
                <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                  {tConn('api_token')}<span className='text-destructive'>*</span>:
                </Label>
                <div className='flex-1'>
                  <Input
                    type='password'
                    placeholder={tConn('enterApiToken')}
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
                  <p className='text-xs text-muted-foreground mt-1'>
                    在 InfluxDB UI 中生成的 API Token，具有读写权限
                  </p>
                </div>
              </div>

              {/* 组织 ID/名称 */}
              <div className='flex items-start gap-4'>
                <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                  {tConn('organization')}{' '}
                  {formData.version === '3.x' ? (
                    <span className='text-muted-foreground text-xs'>
                      ({tConn('not_configured')})
                    </span>
                  ) : (
                    <span className='text-destructive'>*</span>
                  )}:
                </Label>
                <div className='flex-1'>
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
                  <p className='text-xs text-muted-foreground mt-1'>
                    {formData.version === '3.x'
                      ? '可选，某些 InfluxDB 3.x 部署不需要组织'
                      : '组织名称或 ID'}
                  </p>
                </div>
              </div>

              {/* 默认存储桶 */}
              <div className='flex items-start gap-4'>
                <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                  {tConn('bucket')}:
                </Label>
                <div className='flex-1'>
                  <Input
                    placeholder={tConn('bucketExample')}
                    value={formData.bucket}
                    onChange={e => handleInputChange('bucket', e.target.value)}
                    autoCapitalize='off'
                    autoCorrect='off'
                    className='h-9'
                  />
                  <p className='text-xs text-muted-foreground mt-1'>
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
                  {tConn('database_info')}
                </h4>
              </div>

              {/* 默认数据库和保留策略 - 同一行 */}
              <div className='flex items-start gap-4'>
                <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                  {tConn('default_database')}:
                </Label>
                <div className='flex-1 flex gap-4 items-start'>
                  <div className='flex-1'>
                    <Input
                      placeholder={tConn('databaseExample')}
                      value={formData.database}
                      onChange={e =>
                        handleInputChange('database', e.target.value)
                      }
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      可选，连接后默认选择的数据库
                    </p>
                  </div>
                  <div className='flex-1 flex items-start gap-2'>
                    <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                      {tConn('retention_policy')}:
                    </Label>
                    <div className='flex-1'>
                      <div className='relative'>
                        <Input
                          placeholder={tConn('retentionPolicyExample')}
                          value={formData.retentionPolicy}
                          onChange={e =>
                            handleInputChange('retentionPolicy', e.target.value)
                          }
                          autoCapitalize='off'
                          autoCorrect='off'
                          className='h-9'
                          list='retention-policy-suggestions'
                        />
                        <datalist id='retention-policy-suggestions'>
                          {/* 常用预设选项 */}
                          <option value='autogen'>autogen (默认)</option>
                          <option value='default'>default</option>
                          <option value='1h'>1h (1小时)</option>
                          <option value='24h'>24h (1天)</option>
                          <option value='7d'>7d (7天)</option>
                          <option value='30d'>30d (30天)</option>
                          <option value='90d'>90d (90天)</option>
                          <option value='365d'>365d (1年)</option>
                          <option value='INF'>INF (永久)</option>
                          {/* 从数据库获取的保留策略 */}
                          {availableRetentionPolicies.map(policy => (
                            <option key={policy} value={policy}>
                              {policy}
                            </option>
                          ))}
                        </datalist>
                        {loadingRetentionPolicies && (
                          <div className='absolute right-2 top-2'>
                            <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />
                          </div>
                        )}
                      </div>
                      <p className='text-xs text-muted-foreground mt-1'>
                        可选，默认保留策略名称。支持自定义输入或从下拉列表选择
                      </p>
                    </div>
                  </div>
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
            </>
          )}

          {/* 对象存储特定配置 */}
          {formData.dbType === 'object-storage' && (
            <div className='space-y-6'>
              {/* 基本连接配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  连接配置
                </h4>

                {/* Endpoint */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    Endpoint<span className='text-destructive'>*</span>:
                  </Label>
                  <div className='flex-1'>
                    <Input
                      placeholder={
                        formData.objectStorageProvider === 's3' ? 's3.amazonaws.com' :
                        formData.objectStorageProvider === 'minio' ? 'localhost:9000' :
                        formData.objectStorageProvider === 'aliyun-oss' ? 'oss-cn-hangzhou.aliyuncs.com' :
                        formData.objectStorageProvider === 'tencent-cos' ? 'cos.ap-beijing.myqcloud.com' :
                        '服务端点地址'
                      }
                      value={formData.s3Endpoint}
                      onChange={e => handleInputChange('s3Endpoint', e.target.value)}
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <div className='text-xs text-muted-foreground mt-1'>
                      {formData.objectStorageProvider === 's3' && 'S3 服务端点，例如: s3.amazonaws.com 或 s3.us-west-2.amazonaws.com'}
                      {formData.objectStorageProvider === 'minio' && 'MinIO 服务端点，例如: localhost:9000'}
                      {formData.objectStorageProvider === 'aliyun-oss' && '阿里云 OSS Endpoint，例如: oss-cn-hangzhou.aliyuncs.com'}
                      {formData.objectStorageProvider === 'tencent-cos' && '腾讯云 COS Endpoint，例如: cos.ap-beijing.myqcloud.com'}
                      {!formData.objectStorageProvider && '对象存储服务端点地址'}
                    </div>
                  </div>
                </div>

                {/* 内网 Endpoint (可选) */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    内网 Endpoint:
                  </Label>
                  <div className='flex-1'>
                    <Input
                      placeholder='内网访问地址（可选）'
                      value={formData.s3InternalEndpoint}
                      onChange={e => handleInputChange('s3InternalEndpoint', e.target.value)}
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <div className='text-xs text-muted-foreground mt-1'>
                      内网环境访问的端点，用于提高内网访问速度（可选）
                    </div>
                  </div>
                </div>

                {/* 外网 Endpoint (可选) */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    外网 Endpoint:
                  </Label>
                  <div className='flex-1'>
                    <Input
                      placeholder='外网访问地址（可选）'
                      value={formData.s3ExternalEndpoint}
                      onChange={e => handleInputChange('s3ExternalEndpoint', e.target.value)}
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <div className='text-xs text-muted-foreground mt-1'>
                      外网环境访问的端点，用于外部访问（可选）
                    </div>
                  </div>
                </div>

                {/* Region */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    Region<span className='text-destructive'>*</span>:
                  </Label>
                  <div className='flex-1'>
                    <Input
                      placeholder={
                        formData.objectStorageProvider === 's3' ? 'us-east-1' :
                        formData.objectStorageProvider === 'minio' ? 'us-east-1' :
                        formData.objectStorageProvider === 'aliyun-oss' ? 'oss-cn-hangzhou' :
                        formData.objectStorageProvider === 'tencent-cos' ? 'ap-beijing' :
                        '区域代码'
                      }
                      value={formData.s3Region}
                      onChange={e => handleInputChange('s3Region', e.target.value)}
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <div className='text-xs text-muted-foreground mt-1'>
                      {formData.objectStorageProvider === 's3' && 'AWS 区域，例如: us-east-1, us-west-2, ap-southeast-1'}
                      {formData.objectStorageProvider === 'minio' && 'MinIO 区域设置，通常使用 us-east-1'}
                      {formData.objectStorageProvider === 'aliyun-oss' && '阿里云区域，例如: oss-cn-hangzhou, oss-cn-beijing'}
                      {formData.objectStorageProvider === 'tencent-cos' && '腾讯云区域，例如: ap-beijing, ap-shanghai, ap-guangzhou'}
                      {!formData.objectStorageProvider && '对象存储服务区域'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 认证配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  认证配置
                </h4>

                {/* Access Key */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    Access Key<span className='text-destructive'>*</span>:
                  </Label>
                  <div className='flex-1'>
                    <Input
                      placeholder={
                        formData.objectStorageProvider === 'aliyun-oss' ? 'AccessKey ID' :
                        formData.objectStorageProvider === 'tencent-cos' ? 'SecretId' :
                        'Access Key ID'
                      }
                      value={formData.s3AccessKey}
                      onChange={e => handleInputChange('s3AccessKey', e.target.value)}
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <div className='text-xs text-muted-foreground mt-1'>
                      {formData.objectStorageProvider === 'aliyun-oss' && '阿里云 AccessKey ID'}
                      {formData.objectStorageProvider === 'tencent-cos' && '腾讯云 SecretId'}
                      {(formData.objectStorageProvider === 's3' || formData.objectStorageProvider === 'minio') && 'AWS Access Key ID 或 MinIO Access Key'}
                      {!formData.objectStorageProvider && '访问密钥 ID'}
                    </div>
                  </div>
                </div>

                {/* Secret Key */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    Secret Key<span className='text-destructive'>*</span>:
                  </Label>
                  <div className='flex-1'>
                    <Input
                      type='password'
                      placeholder={
                        formData.objectStorageProvider === 'aliyun-oss' ? 'AccessKey Secret' :
                        formData.objectStorageProvider === 'tencent-cos' ? 'SecretKey' :
                        'Secret Access Key'
                      }
                      value={formData.s3SecretKey}
                      onChange={e => handleInputChange('s3SecretKey', e.target.value)}
                      autoCapitalize='off'
                      autoCorrect='off'
                      className='h-9'
                    />
                    <div className='text-xs text-muted-foreground mt-1'>
                      {formData.objectStorageProvider === 'aliyun-oss' && '阿里云 AccessKey Secret'}
                      {formData.objectStorageProvider === 'tencent-cos' && '腾讯云 SecretKey'}
                      {(formData.objectStorageProvider === 's3' || formData.objectStorageProvider === 'minio') && 'AWS Secret Access Key 或 MinIO Secret Key'}
                      {!formData.objectStorageProvider && '访问密钥'}
                    </div>
                  </div>
                </div>

                {/* Session Token (可选,仅S3) */}
                {formData.objectStorageProvider === 's3' && (
                  <div className='flex items-start gap-4'>
                    <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                      Session Token:
                    </Label>
                    <div className='flex-1'>
                      <Input
                        type='password'
                        placeholder='临时凭证的 Session Token (可选)'
                        value={formData.s3SessionToken}
                        onChange={e => handleInputChange('s3SessionToken', e.target.value)}
                        autoCapitalize='off'
                        autoCorrect='off'
                        className='h-9'
                      />
                      <div className='text-xs text-muted-foreground mt-1'>
                        使用临时安全凭证(STS)时需要提供
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SSL和路径样式配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  连接选项
                </h4>

                {/* 使用SSL和路径样式 - 同一行 */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    SSL/路径样式:
                  </Label>
                  <div className='flex-1 flex gap-4 items-start'>
                    <div className='flex-1'>
                      <Label className='text-sm font-medium text-foreground mb-2 block'>
                        使用 SSL:
                      </Label>
                      <div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/50'>
                        <Switch
                          id='s3-ssl-switch'
                          checked={formData.s3UseSSL}
                          onCheckedChange={checked =>
                            handleInputChange('s3UseSSL', checked)
                          }
                        />
                        <Label
                          htmlFor='s3-ssl-switch'
                          className='text-sm font-medium cursor-pointer'
                        >
                          {formData.s3UseSSL ? 'HTTPS' : 'HTTP'}
                        </Label>
                      </div>
                      <div className='text-xs text-muted-foreground mt-1'>
                        生产环境建议启用 SSL (HTTPS)
                      </div>
                    </div>
                    <div className='flex-1'>
                      <Label className='text-sm font-medium text-foreground mb-2 block'>
                        路径样式:
                      </Label>
                      <div className='flex items-center space-x-3 p-3 rounded-lg border bg-muted/50'>
                        <Switch
                          id='s3-path-style-switch'
                          checked={formData.s3PathStyle}
                          onCheckedChange={checked =>
                            handleInputChange('s3PathStyle', checked)
                          }
                        />
                        <Label
                          htmlFor='s3-path-style-switch'
                          className='text-sm font-medium cursor-pointer'
                        >
                          {formData.s3PathStyle ? 'Path Style' : 'Virtual Hosted'}
                        </Label>
                      </div>
                      <div className='text-xs text-muted-foreground mt-1'>
                        {formData.objectStorageProvider === 'minio' ? 'MinIO 通常使用 Path Style' : 'S3/OSS/COS 通常使用 Virtual Hosted'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 高级配置 Tab */}
        <TabsContent value='advanced' className='space-y-6 mt-6'>
          {/* 超时配置 - 三个字段一行 */}
          <div className='flex items-start gap-4'>
            <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
              连接超时(秒):
            </Label>
            <div className='flex-1 flex gap-4'>
              <div className='flex-1'>
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
              <div className='flex-1 flex items-start gap-2'>
                <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                  查询超时(秒):
                </Label>
                <div className='flex-1'>
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
              </div>
              <div className='flex-1 flex items-start gap-2'>
                <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                  超时时间(秒):
                </Label>
                <div className='flex-1'>
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
                {/* 会话池大小和时区设置 - 同一行 */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    会话池大小:
                  </Label>
                  <div className='flex-1 flex gap-4 items-start'>
                    <div className='flex-1'>
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
                      <div className='text-xs text-muted-foreground mt-1'>
                        同时维护的会话连接数量，建议1-20
                      </div>
                    </div>
                    <div className='flex-1 flex items-start gap-2'>
                      <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                        时区设置:
                      </Label>
                      <div className='flex-1'>
                        <Select
                          value={formData.timeZone}
                          onValueChange={value =>
                            handleInputChange('timeZone', value)
                          }
                        >
                          <SelectTrigger className='h-9'>
                            <SelectValue placeholder={tConn('selectTimezone')} />
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
                        <div className='text-xs text-muted-foreground mt-1'>
                          时间序列数据的时区设置
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 性能配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  性能配置
                </h4>
                {/* 数据获取大小和启用数据压缩 - 同一行 */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    数据获取大小:
                  </Label>
                  <div className='flex-1 flex gap-4 items-start'>
                    <div className='flex-1'>
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
                      <div className='text-xs text-muted-foreground mt-1'>
                        单次查询返回的最大记录数，建议1000-50000
                      </div>
                    </div>
                    <div className='flex-1'>
                      <Label className='text-sm font-medium text-foreground mb-2 block'>
                        启用数据压缩:
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
                      <div className='text-xs text-muted-foreground mt-1'>
                        启用后可减少网络传输数据量，提高查询性能
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 重试和重定向配置 */}
              <div className='space-y-4'>
                <h4 className='text-sm font-medium text-foreground text-muted-foreground'>
                  重试和重定向配置
                </h4>
                {/* 最大重试次数和重试间隔 - 同一行 */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    最大重试次数:
                  </Label>
                  <div className='flex-1 flex gap-4 items-start'>
                    <div className='flex-1'>
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
                      <div className='text-xs text-muted-foreground mt-1'>
                        连接失败时的重试次数，0表示不重试
                      </div>
                    </div>
                    <div className='flex-1 flex items-start gap-2'>
                      <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                        重试间隔(毫秒):
                      </Label>
                      <div className='flex-1'>
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
                        <div className='text-xs text-muted-foreground mt-1'>
                          两次重试之间的等待时间
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 启用自动重定向 */}
                <div className='flex items-start gap-4'>
                  <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                    自动重定向:
                  </Label>
                  <div className='flex-1'>
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
                    <div className='text-xs text-muted-foreground mt-1'>
                      在集群环境中自动重定向到正确的节点
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 查询语言和SSL配置 - 同一行（对象存储不显示） */}
          {formData.dbType !== 'object-storage' && (
            <div className='flex items-start gap-4'>
              <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
                默认查询语言:
              </Label>
              <div className='flex-1 flex gap-4 items-start'>
                <div className='flex-1'>
                  <Select
                    value={formData.defaultQueryLanguage}
                    onValueChange={value =>
                      handleInputChange('defaultQueryLanguage', value)
                    }
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue placeholder={tConn('selectQueryLanguage')} />
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
                <div className='flex-1 flex items-start gap-2'>
                  <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                    启用SSL:
                  </Label>
                  <div className='flex-1'>
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
              </div>
            </div>
          )}
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
                {formData.dbType === 'object-storage'
                  ? '启用后将通过代理服务器访问对象存储服务'
                  : formData.dbType === 'iotdb'
                  ? '启用后将通过代理服务器连接到 IoTDB'
                  : '启用后将通过代理服务器连接到 InfluxDB'
                }
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

          {/* 代理服务器地址和端口 - 同一行 */}
          <div className='flex items-start gap-4'>
            <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
              {tConn('host')}<span className='text-destructive'>*</span>:
            </Label>
            <div className='flex-1 flex gap-4'>
              <div className='flex-1'>
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
              <div className='w-32'>
                <div className='flex items-center gap-2'>
                  <Label className='text-sm font-medium text-foreground whitespace-nowrap'>
                    {tConn('port')}<span className='text-destructive'>*</span>:
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
                </div>
                {errors.proxyPort && (
                  <div className='text-xs text-destructive mt-1'>
                    {errors.proxyPort}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 代理类型 */}
          <div className='flex items-start gap-4'>
            <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
              代理类型:
            </Label>
            <div className='flex-1'>
              <Select
                value={formData.proxyType}
                onValueChange={value => handleInputChange('proxyType', value)}
              >
                <SelectTrigger className='w-full max-w-xs h-9'>
                  <SelectValue placeholder={tConn('selectProxyType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='http'>HTTP</SelectItem>
                  <SelectItem value='https'>HTTPS</SelectItem>
                  <SelectItem value='socks5'>SOCKS5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 代理用户名和密码 - 同一行 */}
          <div className='flex items-start gap-4'>
            <Label className='text-sm font-medium text-foreground w-32 flex-shrink-0 pt-2'>
              代理用户名:
            </Label>
            <div className='flex-1 flex gap-4 items-start'>
              <div className='flex-1'>
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
              <div className='flex-1 flex items-start gap-2'>
                <Label className='text-sm font-medium text-foreground whitespace-nowrap pt-2'>
                  代理密码:
                </Label>
                <div className='flex-1'>
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
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <>
      <Dialog open={visible} onOpenChange={open => !open && onCancel()}>
        <DialogContent className='max-w-4xl max-h-[90vh] flex flex-col p-0'>
          {/* 固定头部 */}
          <DialogHeader className='px-6 py-4 border-b flex-shrink-0'>
            <DialogTitle className='text-xl font-semibold'>
              {isEditing ? '编辑连接' : '新建连接'}
            </DialogTitle>
          </DialogHeader>

          {/* 可滚动内容区域 - 减小顶部间距 */}
          <div className='flex-1 overflow-y-auto px-6 pt-4 pb-4' style={{ scrollbarGutter: 'stable' }}>
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
                        {testResult.success ? t('connections.test_success') : t('connections.test_failed')}
                      </h4>
                      {testResult.success ? (
                        <div className='mt-2 text-sm text-green-700 space-y-2'>
                          <p>✅ {t('connections.database_connection_normal')}</p>
                          {testResult.latency && (
                            <p>⚡ {t('connections.response_time')}: {testResult.latency}ms</p>
                          )}

                          {/* 版本信息展示 */}
                          {testResult.versionInfo && (
                            <div className='mt-3 p-3 bg-white border border-green-200 rounded-md space-y-2'>
                              <div className='flex items-center gap-2'>
                                <img
                                  src={getDatabaseBrandIcon(testResult.versionInfo.database_type)}
                                  alt={testResult.versionInfo.database_type}
                                  className="w-5 h-5"
                                />
                                <span className='font-semibold text-green-800'>
                                  {testResult.versionInfo.database_type}
                                </span>
                                <span className='text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded'>
                                  {testResult.versionInfo.detected_type === 'influxdb1' ? '1.x' :
                                   testResult.versionInfo.detected_type === 'influxdb2' ? '2.x' :
                                   testResult.versionInfo.detected_type === 'influxdb3' ? '3.x' : 'IoTDB'}
                                </span>
                              </div>

                              <div className='text-xs text-gray-600'>
                                <span className='font-medium'>{tConn('testResult.version')}</span> {testResult.versionInfo.version}
                              </div>

                              {testResult.versionInfo.supported_features.length > 0 && (
                                <div className='text-xs'>
                                  <span className='font-medium text-gray-600'>{tConn('testResult.supportedFeatures')}</span>
                                  <div className='flex flex-wrap gap-1 mt-1'>
                                    {testResult.versionInfo.supported_features.map((feature, idx) => (
                                      <span key={idx} className='px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs'>
                                        {feature}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <p className='mt-2 text-green-600'>
                            {tConn('testResult.connectionValid')}
                          </p>
                        </div>
                      ) : (
                        <div className='mt-2 text-sm text-red-700'>
                          <p className='font-medium'>{tConn('testResult.errorDetails')}</p>
                          <p className='mt-1 bg-red-100 p-2 rounded text-xs font-mono'>
                            {testResult.error}
                          </p>
                          {formData.dbType === 'iotdb' &&
                            testResult.error?.includes('ping request') && (
                              <div className='mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs'>
                                <p className='font-medium'>
                                  {tConn('testResult.iotdbConnectionTips')}
                                </p>
                                <ul className='mt-1 list-disc list-inside space-y-1'>
                                  <li>{tConn('testResult.ensureIotdbRunning')}</li>
                                  <li>{tConn('testResult.checkPortNumber')}</li>
                                  <li>{tConn('testResult.checkNetworkFirewall')}</li>
                                  <li>{tConn('testResult.iotdbUsesTcp')}</li>
                                </ul>
                              </div>
                            )}
                          <p className='mt-2 text-red-600'>
                            {tConn('testResult.checkParamsAndRetry')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* 固定底部按钮 */}
          <div className='px-6 py-4 border-t flex-shrink-0 bg-background'>
            <div className='flex justify-end gap-3'>
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

      {/* 版本检测确认对话框 - 已移除，版本检测现在在测试连接时进行 */}
    </>
  );
};
