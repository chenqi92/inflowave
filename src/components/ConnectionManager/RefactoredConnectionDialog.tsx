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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  Loader2,
  XCircle,
  AlertCircle,
  Database,
  Settings,
  Key,
  Globe
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
 * 重构后的连接对话框组件
 * 使用策略模式动态处理不同类型的数据库连接
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
        ...defaults
      });
    }
  }, [connection, currentConnector]);

  // 处理数据库类型变更
  const handleTypeChange = useCallback((newType: string) => {
    setSelectedType(newType);
    setErrors({});
    setTestResult(null);

    const connector = getConnector(newType);
    if (connector) {
      const defaults = connector.getDefaultConfig();
      setFormData({
        id: formData.id || generateUniqueId(),
        name: formData.name || '',
        description: formData.description || '',
        ...defaults
      });
    }
  }, [formData.id, formData.name, formData.description]);

  // 处理表单字段变更
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldName]: value
    }));

    // 清除该字段的错误
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  }, [errors]);

  // 验证表单
  const validateForm = useCallback((): boolean => {
    if (!currentConnector) return false;

    const validationErrors = currentConnector.validate(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [currentConnector, formData]);

  // 测试连接
  const handleTestConnection = useCallback(async () => {
    if (!validateForm() || !currentConnector) return;

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
      logger.error('Connection test failed:', error);
      setTestResult({
        success: false,
        error: error.message || tConn('test_failed'),
        latency: 0
      });
      showMessage.error(error.message || tConn('test_failed'));
    } finally {
      setIsTesting(false);
    }
  }, [validateForm, currentConnector, formData, tConn]);

  // 保存连接
  const handleSave = useCallback(async () => {
    if (!validateForm() || !currentConnector) return;

    setIsSaving(true);

    try {
      const config = currentConnector.toConnectionConfig(formData);
      onSuccess(config);
      showMessage.success(isEditMode ? tConn('update_success') : tConn('create_success'));
    } catch (error: any) {
      logger.error('Failed to save connection:', error);
      showMessage.error(error.message || tConn('save_failed'));
    } finally {
      setIsSaving(false);
    }
  }, [validateForm, currentConnector, formData, onSuccess, isEditMode, tConn]);

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
        { let options = field.options || [];
        if (field.name === 'defaultQueryLanguage' && currentConnector) {
          // 特殊处理查询语言选项
          const version = formData.version;
          if (version) {
            const connector = currentConnector as any;
            if (connector.getQueryLanguageOptions) {
              options = connector.getQueryLanguageOptions(version);
            }
          }
        } else if (field.name === 's3Region' && currentConnector) {
          // 特殊处理区域选项
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
        ); }

      case 'switch':
        return (
          <div key={field.name} className="flex items-center justify-between space-y-2">
            <div className="space-y-0.5">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.description && (
                <p className="text-sm text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Switch
              id={field.name}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              disabled={disabled}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
              className={error ? 'border-destructive' : ''}
              rows={3}
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

  // 渲染表单区域
  const renderFormSection = (section: FormSection) => {
    // 检查区域是否可见
    if (section.visible && !section.visible(formData)) {
      return null;
    }

    const visibleFields = section.fields.filter(field =>
      !field.visible || field.visible(formData)
    );

    if (visibleFields.length === 0) {
      return null;
    }

    return (
      <AccordionItem key={section.id} value={section.id}>
        <AccordionTrigger className="text-sm font-medium">
          <div className="flex items-center gap-2">
            {section.icon}
            {section.title}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 px-1">
            {visibleFields.map(field => renderFormField(field))}
          </div>
        </AccordionContent>
      </AccordionItem>
    );
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

  const formSections = currentConnector.getFormSections();

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? tConn('edit_connection') : tConn('new_connection')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {/* 数据库类型选择（仅新建时显示） */}
          {!isEditMode && (
            <div className="mb-6">
              <Label>{tConn('database_type')}</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {connectors.map(connector => (
                  <Button
                    key={connector.type}
                    variant={selectedType === connector.type ? 'default' : 'outline'}
                    className="justify-start"
                    onClick={() => handleTypeChange(connector.type)}
                  >
                    <img
                      src={connector.icon}
                      alt={connector.displayName}
                      className="w-4 h-4 mr-2"
                    />
                    {connector.displayName}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 表单内容 */}
          <Accordion type="multiple" defaultValue={['basic', 'connection']} className="w-full">
            {formSections.map(section => renderFormSection(section))}
          </Accordion>

          {/* 测试结果 */}
          {testResult && (
            <div className="mt-4">
              {renderTestResult()}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isTesting || isSaving}>
            {tConn('cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || isSaving}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tConn('testing')}
              </>
            ) : (
              tConn('test_connection')
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isTesting || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tConn('saving')}
              </>
            ) : (
              isEditMode ? tConn('update') : tConn('create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefactoredConnectionDialog;