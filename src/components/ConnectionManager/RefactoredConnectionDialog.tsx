import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Button,
  Input,
  InputNumber,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  Loader2,
  XCircle,
  Database,
  Settings,
  Key,
  Globe,
  Network
} from 'lucide-react';
import type { ConnectionConfig, ConnectionTestResult } from '@/types';
import { useConnectionsTranslation } from '@/hooks/useTranslation';
import { showMessage } from '@/utils/message';
import { generateUniqueId } from '@/utils/idGenerator';
import logger from '@/utils/logger';
import {
  getConnector,
  getAllConnectors,
  type IConnectionConnector,
  type FormField,
  type FormSection,
  type ValidationErrors
} from './connectors';

interface RefactoredConnectionDialogProps {
  visible: boolean;
  connection?: ConnectionConfig;
  onCancel: () => void;
  onSuccess: (connection: ConnectionConfig) => void;
}

/**
 * 重构后的连接对话框组件 - 使用紧凑的 Tab 布局
 * 左侧: 数据库类型选择
 * 右侧: 表单配置（基本信息、连接配置、认证信息、高级选项）
 */
const RefactoredConnectionDialog: React.FC<RefactoredConnectionDialogProps> = ({
  visible,
  connection,
  onCancel,
  onSuccess,
}) => {
  const { t: tConn } = useConnectionsTranslation();
  const isEditMode = !!connection;

  // 获取所有可用的连接器
  const connectors = useMemo(() => getAllConnectors(), []);

  // 状态管理
  const [selectedType, setSelectedType] = useState<string>('influxdb');
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // 获取当前选中的连接器
  const currentConnector = useMemo(() => {
    return getConnector(selectedType);
  }, [selectedType]);

  // 初始化表单数据
  useEffect(() => {
    if (connection && currentConnector) {
      // 编辑模式：从现有连接加载数据
      const data = currentConnector.fromConnectionConfig(connection);
      setFormData(data);
      setSelectedType(connection.dbType);
    } else if (currentConnector) {
      // 新建模式：加载默认值
      const defaults = currentConnector.getDefaultConfig();
      setFormData({
        id: generateUniqueId(),
        name: '',
        dbType: selectedType,
        ...defaults,
      });
    }
    // 重置测试结果和错误
    setTestResult(null);
    setErrors({});
  }, [connection, currentConnector]);

  // 处理数据库类型变更
  const handleTypeChange = (newType: string) => {
    if (isEditMode) return; // 编辑模式不允许更改类型

    setSelectedType(newType);
    const newConnector = getConnector(newType);
    if (newConnector) {
      const defaults = newConnector.getDefaultConfig();
      setFormData({
        id: generateUniqueId(),
        name: formData.name || '', // 保留已输入的名称
        dbType: newType,
        ...defaults,
      });
    }
    setTestResult(null);
    setErrors({});
    setActiveTab('basic'); // 切换类型时回到基本信息
  };

  // 处理字段变更
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value,
    }));

    // 清除该字段的错误
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // 测试连接
  const handleTestConnection = useCallback(async () => {
    if (!currentConnector) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await currentConnector.testConnection(formData);
      setTestResult(result);

      if (result.success) {
        showMessage.success(tConn('test_success'));
      } else {
        showMessage.error(result.error || tConn('test_failed'));
      }
    } catch (error: any) {
      const errorResult: ConnectionTestResult = {
        success: false,
        error: error.message || tConn('test_failed'),
      };
      setTestResult(errorResult);
      showMessage.error(errorResult.error || tConn('test_failed'));
    } finally {
      setIsTesting(false);
    }
  }, [currentConnector, formData, tConn]);

  // 保存连接
  const handleSave = useCallback(async () => {
    if (!currentConnector) return;

    // 验证表单
    const validationErrors = currentConnector.validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showMessage.error(tConn('save_failed'));
      return;
    }

    setIsSaving(true);

    try {
      const connectionConfig = currentConnector.toConnectionConfig(formData);
      await onSuccess(connectionConfig);
    } catch (error: any) {
      logger.error('保存连接失败:', error);
      showMessage.error(`${tConn('save_failed')}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [currentConnector, formData, onSuccess, tConn]);

  // 渲染表单字段
  const renderFormField = (field: FormField) => {
    // 检查字段是否可见
    if (field.visible && !field.visible(formData)) {
      return null;
    }

    const value = formData[field.name];
    const error = errors[field.name];
    const disabled = field.disabled ? field.disabled(formData) : false;

    // 检查连接器是否提供了自定义渲染
    if (currentConnector?.renderCustomField) {
      const customRender = currentConnector.renderCustomField(
        field,
        value,
        (newValue) => handleFieldChange(field.name, newValue)
      );
      if (customRender) {
        return (
          <div key={field.name} className="space-y-2">
            {customRender}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );
      }
    }

    // 默认渲染逻辑
    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'password':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="password"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <InputNumber
              id={field.name}
              value={value}
              onChange={(val) => handleFieldChange(field.name, val)}
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={field.placeholder}
              disabled={disabled}
              className={error ? 'border-destructive' : ''}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'select':
        // 动态获取选项
        let options = field.options || [];
        if (field.name === 'defaultQueryLanguage' && currentConnector) {
          const version = formData.version;
          if (version) {
            const connector = currentConnector as any;
            if (connector.getQueryLanguageOptions) {
              options = connector.getQueryLanguageOptions(version);
            }
          }
        } else if (field.name === 's3Region' && currentConnector) {
          const provider = formData.objectStorageProvider;
          if (provider) {
            const connector = currentConnector as any;
            if (connector.getRegionOptions) {
              options = connector.getRegionOptions(provider);
            }
          }
        }

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(val) => handleFieldChange(field.name, val)}
              disabled={disabled}
            >
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || tConn('select_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'switch':
        return (
          <div key={field.name} className="flex items-center justify-between space-x-4 py-2">
            <div className="flex-1">
              <Label htmlFor={field.name} className="text-base">
                {field.label}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
              )}
            </div>
            <Switch
              id={field.name}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              disabled={disabled}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              rows={field.rows || 3}
              className={error ? 'border-destructive' : ''}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // 渲染表单区域（用于分组）
  const renderFormSection = (section: FormSection) => {
    const visibleFields = section.fields.filter(field =>
      !field.visible || field.visible(formData)
    );

    if (visibleFields.length === 0) {
      return null;
    }

    return (
      <div key={section.id} className="space-y-4">
        <div className="space-y-4">
          {visibleFields.map(field => renderFormField(field))}
        </div>
      </div>
    );
  };

  // 按tab分组表单区域
  const groupSectionsByTab = () => {
    if (!currentConnector) return {};

    const formSections = currentConnector.getFormSections();
    const groups: Record<string, FormSection[]> = {
      general: [],
      advanced: [],
      proxy: []
    };

    formSections.forEach(section => {
      // 根据section.id将表单分组到不同的tab
      // General tab: 基本信息、连接配置、认证、数据库特定配置
      if (section.id === 'basic' || section.id === 'connection' || section.id === 'auth' || section.id === 'authentication' ||
          section.id === 'influxdb' || section.id === 'iotdb' || section.id === 'object_storage' || section.id === 's3Config') {
        groups.general.push(section);
      }
      // Advanced tab: 高级设置、性能、重试等
      else if (section.id === 'advanced' || section.id === 'performance' || section.id === 'retry' || section.id === 's3Advanced') {
        groups.advanced.push(section);
      }
      // Proxy tab: 代理配置
      else if (section.id === 'proxy' || section.id === 'proxyConfig') {
        groups.proxy.push(section);
      }
      // 默认归类到常规配置
      else {
        groups.general.push(section);
      }
    });

    return groups;
  };

  // 渲染测试结果
  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <Alert variant={testResult.success ? 'default' : 'destructive'}>
        <div className="flex items-center gap-2">
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {testResult.success ? (
              <>
                {tConn('test_success')}
                {testResult.latency && ` (${testResult.latency}ms)`}
                {testResult.serverVersion && ` - ${tConn('version')}: ${testResult.serverVersion}`}
              </>
            ) : (
              testResult.error || tConn('test_failed')
            )}
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  if (!currentConnector) {
    return null;
  }

  const sectionGroups = groupSectionsByTab();

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {isEditMode ? tConn('dialog.edit_connection') : tConn('dialog.new_connection')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：数据库类型选择 */}
          {!isEditMode && (
            <div className="w-48 border-r bg-muted/30 p-4 space-y-2 overflow-y-auto">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {tConn('dialog.select_database_type')}
              </h3>
              {connectors.map(connector => (
                <button
                  key={connector.type}
                  onClick={() => handleTypeChange(connector.type)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-md transition-colors
                    ${selectedType === connector.type
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={connector.icon}
                      alt={connector.displayName}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-sm">{connector.displayName}</span>
                  </div>
                  <p className={`text-xs ${selectedType === connector.type ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {connector.type === 'influxdb' && tConn('dialog.influxdb_desc')}
                    {connector.type === 'iotdb' && tConn('dialog.iotdb_desc')}
                    {connector.type === 'object_storage' && tConn('dialog.object_storage_desc')}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* 右侧：表单配置 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="general" className="text-xs">
                  <Database className="w-3.5 h-3.5 mr-1.5" />
                  {tConn('dialog.general_tab')}
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  {tConn('dialog.advanced_tab')}
                </TabsTrigger>
                <TabsTrigger value="proxy" className="text-xs">
                  <Network className="w-3.5 h-3.5 mr-1.5" />
                  {tConn('dialog.proxy_tab')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-0">
                {sectionGroups.general?.map(section => renderFormSection(section))}
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-0">
                {sectionGroups.advanced?.map(section => renderFormSection(section))}
              </TabsContent>

              <TabsContent value="proxy" className="space-y-4 mt-0">
                {sectionGroups.proxy?.map(section => renderFormSection(section))}
              </TabsContent>
            </Tabs>

            {/* 测试结果 */}
            {testResult && (
              <div className="mt-6">
                {renderTestResult()}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={onCancel} disabled={isTesting || isSaving}>
            {tConn('dialog.cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tConn('dialog.testing')}
              </>
            ) : (
              tConn('dialog.test_connection')
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isTesting || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tConn('dialog.saving')}
              </>
            ) : (
              isEditMode ? tConn('dialog.update') : tConn('dialog.create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefactoredConnectionDialog;
