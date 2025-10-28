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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

const ControllerSettings: React.FC = () => {
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
      showMessage.success('设置已保存');
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
            <h2 className='text-2xl font-bold'>查询设置</h2>
            <p className='text-muted-foreground'>管理查询执行和安全控制</p>
          </div>
        </div>

        <Form {...form}>
          <div className='space-y-6'>
            {/* 安全警告 */}
            <Alert className='border-amber-200 bg-amber-50'>
              <AlertTriangle className='h-4 w-4 text-amber-600' />
              <AlertDescription className='text-amber-800'>
                <strong>安全提醒：</strong>
                启用DELETE和DROP语句可能会导致数据丢失。请谨慎操作，建议在生产环境中保持禁用状态。
              </AlertDescription>
            </Alert>
            {/* 语句权限控制 */}
            <div className='rounded-lg border bg-card text-card-foreground shadow-sm'>
              <div className='p-6 pb-4'>
                <Title level={3} className='flex items-center gap-2 mb-2'>
                  <Database className='w-5 h-5' />
                  语句权限控制
                </Title>
                <Text type='secondary' className='text-sm'>
                  控制哪些类型的SQL语句可以被执行
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
                          允许DELETE语句
                          {field.value ? (
                            <Badge variant='destructive' className='ml-2'>
                              <Unlock className='w-3 h-3 mr-1' />
                              已启用
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              <Lock className='w-3 h-3 mr-1' />
                              已禁用
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          允许执行DELETE FROM语句删除数据
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
                          允许DROP语句
                          {field.value ? (
                            <Badge variant='destructive' className='ml-2'>
                              <Unlock className='w-3 h-3 mr-1' />
                              已启用
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              <Lock className='w-3 h-3 mr-1' />
                              已禁用
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          允许执行DROP DATABASE、DROP MEASUREMENT等语句
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
                          允许危险操作
                          {field.value ? (
                            <Badge variant='destructive' className='ml-2'>
                              <Unlock className='w-3 h-3 mr-1' />
                              已启用
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              <Lock className='w-3 h-3 mr-1' />
                              已禁用
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          允许执行可能导致数据丢失的危险操作
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
                  安全确认设置
                </Title>
                <Text type='secondary' className='text-sm'>
                  为危险操作添加额外的确认步骤
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
                          DELETE操作需要确认
                        </FormLabel>
                        <FormDescription>
                          执行DELETE语句前显示确认对话框
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
                          DROP操作需要确认
                        </FormLabel>
                        <FormDescription>
                          执行DROP语句前显示确认对话框
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
                  查询性能优化
                </Title>
                <Text type='secondary' className='text-sm'>
                  配置查询执行的性能优化选项
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
                          启用懒加载模式
                          {field.value ? (
                            <Badge variant='default' className='ml-2'>
                              已启用
                            </Badge>
                          ) : (
                            <Badge variant='secondary' className='ml-2'>
                              已禁用
                            </Badge>
                          )}
                        </FormLabel>
                        <FormDescription>
                          点击"全部"时使用懒加载模式，分批加载数据以减轻数据库压力。禁用后将一次性加载所有数据（可能导致性能问题）
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
                          懒加载批次大小
                        </FormLabel>
                        <FormDescription>
                          每次加载的数据行数（推荐：500-1000）
                        </FormDescription>
                        <div className='flex items-center gap-4'>
                          <FormControl>
                            <Select
                              value={String(field.value)}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              disabled={!watchedValues.query?.enable_lazy_loading}
                            >
                              <SelectTrigger className='w-[200px]'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value='200'>200 行</SelectItem>
                                <SelectItem value='500'>500 行（推荐）</SelectItem>
                                <SelectItem value='1000'>1000 行</SelectItem>
                                <SelectItem value='2000'>2000 行</SelectItem>
                                <SelectItem value='5000'>5000 行</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <Text type='secondary' className='text-sm'>
                            当前：{field.value} 行/批次
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
          重置为默认
        </Button>

        <Button
          size='sm'
          onClick={form.handleSubmit(saveSettings)}
          disabled={loading}
        >
          <Save className='w-4 h-4 mr-2' />
          保存设置
        </Button>
      </div>
    </>
  );
};

export default ControllerSettings;
