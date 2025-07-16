import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Form,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Typography,
  Table,
  Row,
  Col,
  Tag,
  Switch,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  RadioGroup,
  RadioGroupItem,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';

import { Settings, Eye, Save, RefreshCw, Edit, Plus, Key, Bell, LayoutGrid } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { 
  UserPreferences, 
  KeyboardShortcut
} from '@/types';

const { Text } = Typography;

interface UserExperienceSettingsProps {
  onSettingsChange?: (settings: UserPreferences) => void;
}

const UserExperienceSettings: React.FC<UserExperienceSettingsProps> = ({
  onSettingsChange}) => {
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const form = useForm();
  const shortcutForm = useForm();

  // 加载用户偏好设置
  const loadPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await safeTauriInvoke<UserPreferences>('get_user_preferences');
      setPreferences(prefs);
      if (prefs) {
        form.reset({
          notifications: prefs.notifications,
          accessibility: prefs.accessibility,
          workspace: prefs.workspace});
      }
    } catch (error) {
      showNotification.error({
        message: "加载用户偏好失败",
        description: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  // 保存用户偏好设置
  const savePreferences = async (values: any) => {
    try {
      const updatedPreferences: UserPreferences = {
        ...preferences!,
        notifications: values.notifications,
        accessibility: values.accessibility,
        workspace: values.workspace};

      await safeTauriInvoke('update_user_preferences', { preferences: updatedPreferences });
      setPreferences(updatedPreferences);
      onSettingsChange?.(updatedPreferences);
      showMessage.success("设置已保存" );
    } catch (error) {
      showNotification.error({
        message: "保存设置失败",
        description: String(error)
      });
    }
  };

  // 重置为默认设置
  const resetToDefaults = async () => {
    try {
      const defaultPrefs = await safeTauriInvoke<UserPreferences>('get_default_user_preferences');
      await safeTauriInvoke('update_user_preferences', { preferences: defaultPrefs });
      setPreferences(defaultPrefs);
      form.reset({
        notifications: defaultPrefs.notifications,
        accessibility: defaultPrefs.accessibility,
        workspace: defaultPrefs.workspace});
      showMessage.success("已重置为默认设置" );
    } catch (error) {
      showNotification.error({
        message: "重置设置失败",
        description: String(error)
      });
    }
  };

  // 更新快捷键
  const updateShortcut = async (shortcut: KeyboardShortcut) => {
    try {
      const updatedShortcuts = preferences!.shortcuts.map(s => 
        s.id === shortcut.id ? shortcut : s
      );
      
      const updatedPreferences = {
        ...preferences!,
        shortcuts: updatedShortcuts};

      await safeTauriInvoke('update_user_preferences', { preferences: updatedPreferences });
      setPreferences(updatedPreferences);
      showMessage.success("快捷键已更新" );
    } catch (error) {
      showNotification.error({
        message: "更新快捷键失败",
        description: String(error)
      });
    }
  };

  // 快捷键表格列
  const shortcutColumns = [
    {
      title: '功能',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: KeyboardShortcut) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      )},
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => <Tag color="blue">{category}</Tag>},
    {
      title: '快捷键',
      dataIndex: 'keys',
      key: 'keys',
      width: 200,
      render: (keys: string[]) => (
        <div className="flex gap-2">
          {keys.map((key, index) => (
            <Tag key={index} color="orange">{key}</Tag>
          ))}
        </div>
      )},
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      )},
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, record: KeyboardShortcut) => (
        <Button
          type="text"
          icon={<Edit className="w-4 h-4"  />}
          onClick={() => {
            setEditingShortcut(record);
            shortcutForm.setValue('keys', record.keys.join('+'));
            shortcutForm.setValue('enabled', record.enabled);
            setShowShortcutModal(true);
          }}
          size="small">
          编辑
        </Button>
      )},
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  if (!preferences) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '16px' }}>
      <div
        title={
          <div className="flex gap-2">
            <Settings className="w-4 h-4"  />
            <span>用户体验设置</span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Button onClick={resetToDefaults}>
              重置默认
            </Button>
            <Button
              onClick={form.handleSubmit(savePreferences)}
              disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
          </div>
        }>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(savePreferences)} className="space-y-8">
          <Tabs
            items={[
              {
                key: 'shortcuts',
                label: (
                  <div className="flex gap-2">
                    <Key className="w-4 h-4"  />
                    快捷键
                  </div>
                ),
                children: (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Text type="secondary">
                        自定义键盘快捷键以提高工作效率。点击编辑按钮修改快捷键组合。
                      </Text>
                    </div>
                    <Table
                      columns={shortcutColumns}
                      dataSource={preferences.shortcuts}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )},
              {
                key: 'notifications',
                label: (
                  <div className="flex gap-2">
                    <Bell className="w-4 h-4"  />
                    通知设置
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col span={12}>
                      <FormField
                        control={form.control}
                        name="notifications.enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">启用通知</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="notifications.queryCompletion"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">查询完成通知</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="notifications.connectionStatus"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">连接状态通知</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="notifications.systemAlerts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">系统警报通知</FormLabel>
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
                    </Col>
                    <Col span={12}>
                      <FormField
                        control={form.control}
                        name="notifications.sound"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">声音提醒</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="notifications.desktop"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">桌面通知</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="notifications.position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>通知位置</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="选择通知位置" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="topRight">右上角</SelectItem>
                                <SelectItem value="topLeft">左上角</SelectItem>
                                <SelectItem value="bottomRight">右下角</SelectItem>
                                <SelectItem value="bottomLeft">左下角</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Col>
                  </Row>
                )},
              {
                key: 'accessibility',
                label: (
                  <div className="flex gap-2">
                    <Eye className="w-4 h-4"  />
                    无障碍
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col span={12}>
                      <FormField
                        control={form.control}
                        name="accessibility.highContrast"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">高对比度模式</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="accessibility.fontSize"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>字体大小</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="small" id="small" />
                                  <Label htmlFor="small">小</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="medium" id="medium" />
                                  <Label htmlFor="medium">中</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="large" id="large" />
                                  <Label htmlFor="large">大</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="extraLarge" id="extraLarge" />
                                  <Label htmlFor="extraLarge">特大</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accessibility.reducedMotion"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">减少动画效果</FormLabel>
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
                    </Col>
                    <Col span={12}>
                      <FormField
                        control={form.control}
                        name="accessibility.screenReader"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">屏幕阅读器支持</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="accessibility.keyboardNavigation"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">键盘导航增强</FormLabel>
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
                    </Col>
                  </Row>
                )},
              {
                key: 'workspace',
                label: (
                  <div className="flex gap-2">
                    <LayoutGrid className="w-4 h-4" />
                    工作区
                  </div>
                ),
                children: (
                  <Row gutter={[24, 16]}>
                    <Col span={12}>
                      <FormField
                        control={form.control}
                        name="workspace.layout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>布局模式</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="选择布局模式" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="default">默认</SelectItem>
                                <SelectItem value="compact">紧凑</SelectItem>
                                <SelectItem value="wide">宽屏</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="workspace.openTabs"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">启动时恢复标签页</FormLabel>
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
                    </Col>
                    <Col span={12}>
                      <FormField
                        control={form.control}
                        name="workspace.pinnedQueries"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">固定常用查询</FormLabel>
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

                      <FormField
                        control={form.control}
                        name="workspace.recentFiles"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">显示最近文件</FormLabel>
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
                    </Col>
                  </Row>
                )},
            ]}
          />
          </form>
        </Form>
      </div>

      {/* 快捷键编辑模态框 */}
      <Dialog open={showShortcutModal} onOpenChange={(open) => {
        if (!open) {
          setShowShortcutModal(false);
          setEditingShortcut(null);
          shortcutForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑快捷键</DialogTitle>
          </DialogHeader>
        {editingShortcut && (
          <Form {...shortcutForm}>
            <form onSubmit={shortcutForm.handleSubmit((values) => {
              const updatedShortcut: KeyboardShortcut = {
                ...editingShortcut,
                keys: values.keys.split('+').map((k: string) => k.trim()),
                enabled: values.enabled};
              updateShortcut(updatedShortcut);
              setShowShortcutModal(false);
              setEditingShortcut(null);
              shortcutForm.reset();
            })} className="space-y-8">
            <div style={{ marginBottom: 16 }}>
              <Text strong>{editingShortcut.name}</Text>
              <br />
              <Text type="secondary">{editingShortcut.description}</Text>
            </div>
            
            <FormField
              control={shortcutForm.control}
              name="keys"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>快捷键组合</FormLabel>
                  <FormControl>
                    <Input placeholder="例如: Ctrl+Enter" {...field} />
                  </FormControl>
                  <FormDescription>
                    使用 + 号分隔多个按键，例如: Ctrl+Shift+P
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={shortcutForm.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">启用此快捷键</FormLabel>
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
            </form>
          </Form>
        )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserExperienceSettings;
