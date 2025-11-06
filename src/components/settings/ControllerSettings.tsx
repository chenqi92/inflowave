import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Button,
  Switch,
  Alert,
  AlertDescription,
  Badge,
  Title,
  Text,
  Input,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  Shield,
  AlertTriangle,
  Database,
  Trash2,
  Save,
  RefreshCw,
  Lock,
  Unlock,
  Zap,
  Layers,
} from 'lucide-react';
import {
  useQueryControllerSettings,
  type CombinedSettings,
} from '@/hooks/useQueryControllerSettings';
import { useSettingsTranslation } from '@/hooks/useTranslation';

const ControllerSettings: React.FC = () => {
  const { t } = useSettingsTranslation();
  
  // 使用共享的设置管理 hook
  const {
    settings,
    loading,
    updateSettings,
    resetSettings: resetToDefaults,
  } = useQueryControllerSettings();

  const form = useForm<CombinedSettings>({
    defaultValues: settings,
  });

  // 当设置从外部更新时（如从工具栏），同步到表单
  useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  // 保存设置
  const saveSettings = async (values: CombinedSettings) => {
    try {
      await updateSettings({
        controller: values.controller,
        query: values.query,
      });
      showMessage.success(t('controller_settings.settings_saved'));
    } catch (error) {
      console.error('保存设置失败:', error);
      // 错误消息已在 hook 中显示
    }
  };

  // 重置设置
  const handleResetSettings = async () => {
    try {
      await resetToDefaults();
      // 成功消息已在 hook 中显示
    } catch (error) {
      console.error('重置设置失败:', error);
      // 错误消息已在 hook 中显示
    }
  };

  const watchedValues = form.watch();

  return (
    <>
      <div className='space-y-6'>
        {/* 页面标题 */}
        <div className='flex items-center gap-3'>
          <Shield className='w-6 h-6 text-blue-600' />
          <div>
            <h2 className='text-2xl font-bold'>{t('controller_settings.title')}</h2>
            <p className='text-muted-foreground'>{t('controller_settings.description')}</p>
          </div>
        </div>

        <Form {...form}>
          <div className='space-y-6'>
            {/* 安全警告 */}
            <Alert className='border-amber-200 bg-amber-50'>
              <AlertTriangle className='h-4 w-4 text-amber-600' />
              <AlertDescription className='text-amber-800'>
                <strong>{t('controller_settings.security_warning')}</strong>
                {t('controller_settings.security_warning_message')}
              </AlertDescription>
            </Alert>
            {/* 语句权限控制 */}
            <div className='rounded-lg border bg-card text-card-foreground shadow-sm'>
              <div className='p-6 pb-4'>
                <Title level={3} className='flex items-center gap-2 mb-2'>
                  <Database className='w-5 h-5' />
                  {t('controller_settings.statement_permissions')}
                </Title>
                <Text type='secondary' className='text-sm'>
                  {t('controller_settings.statement_permissions_description')}
                </Text>
              </div>
              <div className='p-6 pt-0 space-y-6'>
                {/* DELETE语句权限 */}
                <FormField
                  control={form.control}
                  name='controller.allow_delete_statements'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base flex items-center gap-2'>
                          <Trash2 className='w-4 h-4' />
                          {t('controller_settings.allow_delete_statements')}
                          {field.value ? (
                            <Badge variant='destructive' className='ml-2'>
                              <Unlock className='w-3 h-3 mr-1' />
                              {t('controller_settings.enabled')}
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              <Lock className='w-3 h-3 mr-1' />
                              {t('controller_settings.disabled')}
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          {t('controller_settings.allow_delete_statements_description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* DROP语句权限 */}
                <FormField
                  control={form.control}
                  name='controller.allow_drop_statements'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base flex items-center gap-2'>
                          <Database className='w-4 h-4' />
                          {t('controller_settings.allow_drop_statements')}
                          {field.value ? (
                            <Badge variant='destructive' className='ml-2'>
                              <Unlock className='w-3 h-3 mr-1' />
                              {t('controller_settings.enabled')}
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              <Lock className='w-3 h-3 mr-1' />
                              {t('controller_settings.disabled')}
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          {t('controller_settings.allow_drop_statements_description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* 危险操作权限 */}
                <FormField
                  control={form.control}
                  name='controller.allow_dangerous_operations'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base flex items-center gap-2'>
                          <AlertTriangle className='w-4 h-4' />
                          {t('controller_settings.allow_dangerous_operations')}
                          {field.value ? (
                            <Badge variant='destructive' className='ml-2'>
                              <Unlock className='w-3 h-3 mr-1' />
                              {t('controller_settings.enabled')}
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              <Lock className='w-3 h-3 mr-1' />
                              {t('controller_settings.disabled')}
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          {t('controller_settings.allow_dangerous_operations_description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 确认设置 */}
            <div className='rounded-lg border bg-card text-card-foreground shadow-sm'>
              <div className='p-6 pb-4'>
                <Title level={3} className='flex items-center gap-2 mb-2'>
                  <Shield className='w-5 h-5' />
                  {t('controller_settings.security_confirmation')}
                </Title>
                <Text type='secondary' className='text-sm'>
                  {t('controller_settings.security_confirmation_description')}
                </Text>
              </div>
              <div className='p-6 pt-0 space-y-6'>
                {/* DELETE确认 */}
                <FormField
                  control={form.control}
                  name='controller.require_confirmation_for_delete'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>
                          {t('controller_settings.require_confirmation_for_delete')}
                        </FormLabel>
                        <FormDescription>
                          {t('controller_settings.require_confirmation_for_delete_description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!watchedValues.controller?.allow_delete_statements}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* DROP确认 */}
                <FormField
                  control={form.control}
                  name='controller.require_confirmation_for_drop'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base'>
                          {t('controller_settings.require_confirmation_for_drop')}
                        </FormLabel>
                        <FormDescription>
                          {t('controller_settings.require_confirmation_for_drop_description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!watchedValues.controller?.allow_drop_statements}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 查询性能优化 */}
            <div className='rounded-lg border bg-card text-card-foreground shadow-sm'>
              <div className='p-6 pb-4'>
                <Title level={3} className='flex items-center gap-2 mb-2'>
                  <Zap className='w-5 h-5' />
                  {t('controller_settings.query_performance')}
                </Title>
                <Text type='secondary' className='text-sm'>
                  {t('controller_settings.query_performance_description')}
                </Text>
              </div>
              <div className='p-6 pt-0 space-y-6'>
                {/* 启用懒加载 */}
                <FormField
                  control={form.control}
                  name='query.enable_lazy_loading'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                      <div className='space-y-0.5'>
                        <FormLabel className='text-base flex items-center gap-2'>
                          <Layers className='w-4 h-4' />
                          {t('controller_settings.enable_lazy_loading')}
                          {field.value ? (
                            <Badge variant='default' className='ml-2'>
                              {t('controller_settings.enabled')}
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              {t('controller_settings.disabled')}
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          {t('controller_settings.enable_lazy_loading_description')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* 懒加载批次大小 */}
                <FormField
                  control={form.control}
                  name='query.lazy_loading_batch_size'
                  render={({ field }) => (
                    <FormItem className='rounded-lg border p-4'>
                      <div className='space-y-2'>
                        <FormLabel className='text-base'>
                          {t('controller_settings.lazy_loading_batch_size')}
                        </FormLabel>
                        <FormDescription>
                          {t('controller_settings.lazy_loading_batch_size_description')}
                        </FormDescription>
                        <div className='flex items-center gap-4'>
                          <FormControl>
                            <Input
                              type='number'
                              min={100}
                              max={10000}
                              step={100}
                              value={field.value}
                              onChange={(e) => {
                                const value = e.target.value;
                                // 允许空值或正在输入的中间状态
                                if (value === '') {
                                  field.onChange(100); // 空值时设为最小值
                                  return;
                                }
                                const numValue = parseInt(value);
                                // 只要是有效数字就允许输入，不限制范围（让浏览器的 min/max 处理）
                                if (!isNaN(numValue)) {
                                  field.onChange(numValue);
                                }
                              }}
                              onBlur={(e) => {
                                // 失焦时确保值在有效范围内
                                const value = parseInt(e.target.value);
                                if (isNaN(value) || value < 100) {
                                  field.onChange(100);
                                } else if (value > 10000) {
                                  field.onChange(10000);
                                }
                              }}
                              disabled={!watchedValues.query?.enable_lazy_loading}
                              className='w-[200px]'
                            />
                          </FormControl>
                          <Text type='secondary' className='text-sm'>
                            {t('controller_settings.batch_size_unit')}
                          </Text>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </Form>
      </div>

      {/* 操作按钮 - 固定在底部 */}
      <div className='flex justify-end gap-2 pt-4 pb-4 border-t bg-background sticky'>
        <Button type='button' variant='outline' size='sm' onClick={handleResetSettings}>
          <RefreshCw className='w-4 h-4 mr-2' />
          {t('controller_settings.reset_to_default')}
        </Button>

        <Button
          size='sm'
          onClick={form.handleSubmit(saveSettings)}
          disabled={loading}
        >
          <Save className='w-4 h-4 mr-2' />
          {t('controller_settings.save_settings')}
        </Button>
      </div>
    </>
  );
};

export default ControllerSettings;
