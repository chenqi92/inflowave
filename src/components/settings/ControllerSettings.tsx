import React, { useState, useEffect } from 'react';
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
  toast,
  Title,
  Text,
  InputNumber,
  Label
} from '@/components/ui';
import {
  Shield,
  AlertTriangle,
  Database,
  Trash2,
  Save,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';

interface ControllerSettings {
  allow_delete_statements: boolean;
  allow_drop_statements: boolean;
  allow_dangerous_operations: boolean;
  require_confirmation_for_delete: boolean;
  require_confirmation_for_drop: boolean;
  query_timeout: number;
  max_query_results: number;
}

const ControllerSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ControllerSettings>({
    allow_delete_statements: false,
    allow_drop_statements: false,
    allow_dangerous_operations: false,
    require_confirmation_for_delete: true,
    require_confirmation_for_drop: true,
    query_timeout: 30000,
    max_query_results: 10000,
  });

  const form = useForm<ControllerSettings>({
    defaultValues: settings,
  });

  // 加载控制器设置
  const loadSettings = async () => {
    try {
      const controllerSettings = await safeTauriInvoke<ControllerSettings>('get_controller_settings');
      setSettings(controllerSettings);
      form.reset(controllerSettings);
    } catch (error) {
      console.error('加载控制器设置失败:', error);
      toast({
        title: "错误",
        description: "加载控制器设置失败",
        variant: "destructive"
      });
    }
  };

  // 保存控制器设置
  const saveSettings = async (values: ControllerSettings) => {
    setLoading(true);
    try {
      await safeTauriInvoke('update_controller_settings', values);
      
      setSettings(values);
      toast({
        title: "成功",
        description: "控制器设置已保存"
      });
    } catch (error) {
      console.error('保存控制器设置失败:', error);
      toast({
        title: "错误",
        description: "保存控制器设置失败",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const resetSettings = () => {
    const defaultSettings: ControllerSettings = {
      allow_delete_statements: false,
      allow_drop_statements: false,
      allow_dangerous_operations: false,
      require_confirmation_for_delete: true,
      require_confirmation_for_drop: true,
      query_timeout: 30000,
      max_query_results: 10000,
    };
    
    form.reset(defaultSettings);
    toast({
      title: "成功",
      description: "设置已重置为默认值"
    });
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const watchedValues = form.watch();

  return (
    <>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">查询设置</h2>
            <p className="text-muted-foreground">管理查询执行和安全控制</p>
          </div>
        </div>

        <Form {...form}>
          <div className="space-y-6">

          {/* 安全警告 */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>安全提醒：</strong>
              启用DELETE和DROP语句可能会导致数据丢失。请谨慎操作，建议在生产环境中保持禁用状态。
            </AlertDescription>
          </Alert>
          {/* 语句权限控制 */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4">
              <Title level={3} className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5" />
                语句权限控制
              </Title>
              <Text type="secondary" className="text-sm">
                控制哪些类型的SQL语句可以被执行
              </Text>
            </div>
            <div className="p-6 pt-0 space-y-6">
              {/* DELETE语句权限 */}
              <FormField
                control={form.control}
                name="allow_delete_statements"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        允许DELETE语句
                        {field.value ? (
                          <Badge variant="destructive" className="ml-2">
                            <Unlock className="w-3 h-3 mr-1" />
                            已启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            <Lock className="w-3 h-3 mr-1" />
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
                name="allow_drop_statements"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        允许DROP语句
                        {field.value ? (
                          <Badge variant="destructive" className="ml-2">
                            <Unlock className="w-3 h-3 mr-1" />
                            已启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            <Lock className="w-3 h-3 mr-1" />
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
                name="allow_dangerous_operations"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        允许危险操作
                        {field.value ? (
                          <Badge variant="destructive" className="ml-2">
                            <Unlock className="w-3 h-3 mr-1" />
                            已启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            <Lock className="w-3 h-3 mr-1" />
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
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4">
              <Title level={3} className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5" />
                安全确认设置
              </Title>
              <Text type="secondary" className="text-sm">
                为危险操作添加额外的确认步骤
              </Text>
            </div>
            <div className="p-6 pt-0 space-y-6">
              {/* DELETE确认 */}
              <FormField
                control={form.control}
                name="require_confirmation_for_delete"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
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
                        disabled={!watchedValues.allow_delete_statements}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* DROP确认 */}
              <FormField
                control={form.control}
                name="require_confirmation_for_drop"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
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
                        disabled={!watchedValues.allow_drop_statements}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* 查询控制设置 */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-4">
              <Title level={3} className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5" />
                查询控制设置
              </Title>
              <Text type="secondary" className="text-sm">
                控制查询执行的限制和超时设置
              </Text>
            </div>
            <div className="p-6 pt-0 space-y-6">
              {/* 查询超时设置 */}
              <FormField
                control={form.control}
                name="query_timeout"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        查询超时时间 (毫秒)
                      </FormLabel>
                      <FormDescription>
                        设置查询的最大执行时间，超过此时间将自动终止查询
                      </FormDescription>
                    </div>
                    <FormControl>
                      <InputNumber
                        min={1000}
                        max={300000}
                        step={1000}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="输入超时时间"
                        className="w-32"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* 最大查询结果数设置 */}
              <FormField
                control={form.control}
                name="max_query_results"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        最大查询结果数
                      </FormLabel>
                      <FormDescription>
                        限制单次查询返回的最大记录数，防止内存溢出
                      </FormDescription>
                    </div>
                    <FormControl>
                      <InputNumber
                        min={100}
                        max={100000}
                        step={100}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="输入结果数量"
                        className="w-32"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          </div>
        </Form>
      </div>

      {/* 操作按钮 - 固定在底部 */}
      <div className="flex justify-end gap-2 pt-4 border-t bg-background sticky bottom-0">
        <Button
          type="button"
          variant="outline"
          onClick={resetSettings}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          重置为默认
        </Button>

        <Button
          onClick={() => form.handleSubmit(saveSettings)()}
          disabled={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          保存设置
        </Button>
      </div>
    </>
  );
};

export default ControllerSettings;
