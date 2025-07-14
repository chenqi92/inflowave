import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Input,
  Switch,
  Slider,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  toast
} from '@/components/ui';
import { 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Bell, 
  Layout, 
  Volume2, 
  Monitor,
  Keyboard,
  Palette
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { UserPreferences, KeyboardShortcut, NotificationSettings, AccessibilitySettings, WorkspaceSettings } from '@/types';

interface UserPreferencesComponentProps {
  onSave?: (preferences: UserPreferences) => void;
}

const UserPreferencesComponent: React.FC<UserPreferencesComponentProps> = ({ onSave }) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);

  const form = useForm<UserPreferences>({
    defaultValues: {
      shortcuts: [],
      notifications: {
        enabled: true,
        queryCompletion: true,
        connectionStatus: true,
        systemAlerts: true,
        sound: false,
        desktop: true,
        position: 'topRight'
      },
      accessibility: {
        highContrast: false,
        fontSize: 'medium',
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: true
      },
      workspace: {
        layout: 'default',
        openTabs: true,
        pinnedQueries: true,
        recentFiles: true
      }
    }
  });

  const shortcutForm = useForm<KeyboardShortcut>();

  // 加载用户偏好
  const loadPreferences = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_user_preferences');
      if (result) {
        setPreferences(result);
        form.reset(result);
      }
    } catch (error) {
      console.error('加载用户偏好失败:', error);
      toast({ 
        title: "错误", 
        description: "加载用户偏好失败", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // 保存用户偏好
  const savePreferences = async (values: UserPreferences) => {
    setLoading(true);
    try {
      await safeTauriInvoke('update_user_preferences', { preferences: values });
      setPreferences(values);
      toast({ 
        title: "成功", 
        description: "偏好设置已保存" 
      });
      onSave?.(values);
    } catch (error) {
      console.error('保存用户偏好失败:', error);
      toast({ 
        title: "错误", 
        description: "保存用户偏好失败", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // 加载默认快捷键
  const loadDefaultShortcuts = async () => {
    try {
      const shortcuts = await safeTauriInvoke('get_default_shortcuts');
      form.setValue('shortcuts', shortcuts);
      toast({ 
        title: "成功", 
        description: "已重置为默认快捷键" 
      });
    } catch (error) {
      console.error('加载默认快捷键失败:', error);
      toast({ 
        title: "错误", 
        description: "加载默认快捷键失败", 
        variant: "destructive" 
      });
    }
  };

  // 编辑快捷键
  const editShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcut(shortcut);
    shortcutForm.reset(shortcut);
    setShortcutModalOpen(true);
  };

  // 删除快捷键
  const deleteShortcut = (shortcutId: string) => {
    const currentShortcuts = form.getValues('shortcuts');
    const updatedShortcuts = currentShortcuts.filter(s => s.id !== shortcutId);
    form.setValue('shortcuts', updatedShortcuts);
  };

  // 保存快捷键
  const saveShortcut = (shortcutData: KeyboardShortcut) => {
    const currentShortcuts = form.getValues('shortcuts');
    let updatedShortcuts;
    
    if (editingShortcut) {
      updatedShortcuts = currentShortcuts.map(s => 
        s.id === editingShortcut.id ? shortcutData : s
      );
    } else {
      updatedShortcuts = [...currentShortcuts, { ...shortcutData, id: Date.now().toString() }];
    }
    
    form.setValue('shortcuts', updatedShortcuts);
    setShortcutModalOpen(false);
    setEditingShortcut(null);
    shortcutForm.reset();
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  if (!preferences) {
    return <div className="flex items-center justify-center p-8">加载中...</div>;
  }

  const shortcutColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '快捷键',
      dataIndex: 'keys',
      key: 'keys',
      render: (keys: string[]) => (
        <div className="flex gap-1">
          {keys.map((key, index) => (
            <Badge key={index} variant="secondary">{key}</Badge>
          ))}
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Badge variant="outline">{category}</Badge>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Badge variant={enabled ? 'default' : 'secondary'}>
          {enabled ? '启用' : '禁用'}
        </Badge>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (shortcut: KeyboardShortcut) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => editShortcut(shortcut)}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => deleteShortcut(shortcut.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(savePreferences)} className="space-y-4">
          {/* 通知设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                通知设置
              </CardTitle>
              <CardDescription>管理各类提醒和通知</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="notifications.enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>启用通知</FormLabel>
                        <FormDescription>开启或关闭所有通知</FormDescription>
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
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>桌面通知</FormLabel>
                        <FormDescription>显示系统桌面通知</FormDescription>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="notifications.sound"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>声音提醒</FormLabel>
                        <FormDescription>播放通知声音</FormDescription>
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
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="notifications.queryCompletion"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>查询完成通知</FormLabel>
                        <FormDescription>查询执行完成时通知</FormDescription>
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
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>连接状态通知</FormLabel>
                        <FormDescription>连接状态变化时通知</FormDescription>
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
            </CardContent>
          </Card>

          {/* 无障碍设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                无障碍设置
              </CardTitle>
              <CardDescription>优化界面可访问性</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accessibility.highContrast"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>高对比度</FormLabel>
                        <FormDescription>启用高对比度模式</FormDescription>
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
                  name="accessibility.reducedMotion"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>减少动画</FormLabel>
                        <FormDescription>减少界面动画效果</FormDescription>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accessibility.fontSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>字体大小</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择字体大小" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="small">小</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="large">大</SelectItem>
                          <SelectItem value="extraLarge">特大</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessibility.keyboardNavigation"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>键盘导航</FormLabel>
                        <FormDescription>启用键盘导航支持</FormDescription>
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
            </CardContent>
          </Card>

          {/* 工作区设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                工作区设置
              </CardTitle>
              <CardDescription>自定义工作区布局</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workspace.openTabs"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>启动时恢复标签页</FormLabel>
                        <FormDescription>重新打开上次的标签页</FormDescription>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workspace.pinnedQueries"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>固定常用查询</FormLabel>
                        <FormDescription>在侧边栏显示常用查询</FormDescription>
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
                    <FormItem className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>显示最近文件</FormLabel>
                        <FormDescription>在菜单中显示最近文件</FormDescription>
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
            </CardContent>
          </Card>

          {/* 键盘快捷键 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                键盘快捷键
              </CardTitle>
              <CardDescription>
                自定义快捷键
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadDefaultShortcuts}
                  className="ml-4"
                >
                  重置为默认
                </Button>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingShortcut(null);
                      shortcutForm.reset({
                        id: '',
                        name: '',
                        description: '',
                        keys: [],
                        category: '连接',
                        enabled: true
                      });
                      setShortcutModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加快捷键
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>快捷键</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.watch('shortcuts')?.map((shortcut) => (
                      <TableRow key={shortcut.id}>
                        <TableCell>{shortcut.name}</TableCell>
                        <TableCell>{shortcut.description}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {shortcut.keys.map((key, index) => (
                              <Badge key={index} variant="secondary">{key}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{shortcut.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={shortcut.enabled ? 'default' : 'secondary'}>
                            {shortcut.enabled ? '启用' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => editShortcut(shortcut)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => deleteShortcut(shortcut.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 保存按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              重置
            </Button>
            <Button type="submit" disabled={loading}>
              <Settings className="w-4 h-4 mr-2" />
              保存设置
            </Button>
          </div>
        </form>
      </Form>

      {/* 编辑快捷键对话框 */}
      <Dialog open={shortcutModalOpen} onOpenChange={setShortcutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShortcut ? '编辑快捷键' : '添加快捷键'}
            </DialogTitle>
          </DialogHeader>

          <Form {...shortcutForm}>
            <form
              onSubmit={shortcutForm.handleSubmit(saveShortcut)}
              className="space-y-4"
            >
              <FormField
                control={shortcutForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入快捷键名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={shortcutForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Input placeholder="输入快捷键描述" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={shortcutForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>分类</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择分类" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="连接">连接</SelectItem>
                        <SelectItem value="查询">查询</SelectItem>
                        <SelectItem value="界面">界面</SelectItem>
                        <SelectItem value="搜索">搜索</SelectItem>
                        <SelectItem value="数据">数据</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={shortcutForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>启用</FormLabel>
                      <FormDescription>是否启用此快捷键</FormDescription>
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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShortcutModalOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit">
                  {editingShortcut ? '更新' : '添加'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserPreferencesComponent;
