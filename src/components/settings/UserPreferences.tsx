import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Switch,
  Badge,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  Settings,
  Edit,
  Bell,
  Layout,
  Keyboard,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { UserPreferences, KeyboardShortcut } from '@/types';

// 获取所有系统快捷键的函数
const getAllSystemShortcuts = (): KeyboardShortcut[] => {
  return [
    // 导航快捷键
    {
      id: 'nav_dashboard',
      name: '打开仪表板',
      description: '切换到仪表板页面',
      keys: ['Ctrl', '1'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_connections',
      name: '打开连接管理',
      description: '切换到连接管理页面',
      keys: ['Ctrl', '2'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_query',
      name: '打开数据查询',
      description: '切换到数据查询页面',
      keys: ['Ctrl', '3'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_database',
      name: '打开数据库管理',
      description: '切换到数据库管理页面',
      keys: ['Ctrl', '4'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_visualization',
      name: '打开数据可视化',
      description: '切换到数据可视化页面',
      keys: ['Ctrl', '5'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_performance',
      name: '打开性能监控',
      description: '切换到性能监控页面',
      keys: ['Ctrl', '6'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_settings',
      name: '打开应用设置',
      description: '切换到应用设置页面',
      keys: ['Ctrl', '7'],
      category: '导航',
      enabled: true,
    },

    // 文件操作快捷键
    {
      id: 'file_new_query',
      name: '新建查询',
      description: '创建新的SQL查询',
      keys: ['Ctrl', 'N'],
      category: '文件',
      enabled: true,
    },
    {
      id: 'file_new_connection',
      name: '新建连接',
      description: '创建新的数据库连接',
      keys: ['Ctrl', 'Shift', 'N'],
      category: '文件',
      enabled: true,
    },
    {
      id: 'file_save_query',
      name: '保存查询',
      description: '保存当前查询',
      keys: ['Ctrl', 'S'],
      category: '文件',
      enabled: true,
    },
    {
      id: 'file_open_query',
      name: '打开查询',
      description: '打开已保存的查询',
      keys: ['Ctrl', 'O'],
      category: '文件',
      enabled: true,
    },

    // 查询操作快捷键
    {
      id: 'query_execute',
      name: '执行查询',
      description: '执行当前查询',
      keys: ['Ctrl', 'Enter'],
      category: '查询',
      enabled: true,
    },
    {
      id: 'query_stop',
      name: '停止查询',
      description: '停止正在执行的查询',
      keys: ['Ctrl', 'Shift', 'C'],
      category: '查询',
      enabled: true,
    },
    {
      id: 'query_format',
      name: '格式化查询',
      description: '格式化SQL查询代码',
      keys: ['Ctrl', 'L'],
      category: '查询',
      enabled: true,
    },

    // 编辑操作快捷键
    {
      id: 'edit_copy_line',
      name: '复制当前行',
      description: '复制光标所在行',
      keys: ['Ctrl', 'D'],
      category: '编辑',
      enabled: true,
    },
    {
      id: 'edit_toggle_comment',
      name: '切换注释',
      description: '注释/取消注释选中行',
      keys: ['Ctrl', '/'],
      category: '编辑',
      enabled: true,
    },

    // 搜索快捷键
    {
      id: 'search_global',
      name: '全局搜索',
      description: '打开全局搜索',
      keys: ['Ctrl', 'Shift', 'P'],
      category: '搜索',
      enabled: true,
    },

    // 工具快捷键
    {
      id: 'tools_shortcuts',
      name: '显示快捷键帮助',
      description: '显示所有快捷键',
      keys: ['Ctrl', 'K'],
      category: '工具',
      enabled: true,
    },
    {
      id: 'tools_dev_tools',
      name: '切换开发者工具',
      description: '打开/关闭开发者工具',
      keys: ['F12'],
      category: '工具',
      enabled: true,
    },

    // 界面操作快捷键
    {
      id: 'layout_toggle_sidebar',
      name: '切换侧边栏',
      description: '显示/隐藏侧边栏',
      keys: ['Ctrl', 'B'],
      category: '界面',
      enabled: true,
    },
    {
      id: 'layout_refresh',
      name: '刷新页面',
      description: '刷新当前页面',
      keys: ['F5'],
      category: '界面',
      enabled: true,
    },

    // 视图操作快捷键
    {
      id: 'view_zoom_in',
      name: '放大',
      description: '放大界面',
      keys: ['Ctrl', '+'],
      category: '视图',
      enabled: true,
    },
    {
      id: 'view_zoom_out',
      name: '缩小',
      description: '缩小界面',
      keys: ['Ctrl', '-'],
      category: '视图',
      enabled: true,
    },
    {
      id: 'view_reset_zoom',
      name: '重置缩放',
      description: '重置界面缩放',
      keys: ['Ctrl', '0'],
      category: '视图',
      enabled: true,
    },

    // 数据库操作快捷键
    {
      id: 'db_refresh',
      name: '刷新数据库结构',
      description: '刷新数据库树结构',
      keys: ['F5'],
      category: '数据库',
      enabled: true,
    },
    {
      id: 'db_delete',
      name: '删除选中项',
      description: '删除选中的数据库项',
      keys: ['Delete'],
      category: '数据库',
      enabled: true,
    },
    {
      id: 'db_rename',
      name: '重命名选中项',
      description: '重命名选中的数据库项',
      keys: ['F2'],
      category: '数据库',
      enabled: true,
    },
    {
      id: 'db_new_table',
      name: '创建新表',
      description: '创建新的数据表',
      keys: ['Ctrl', 'T'],
      category: '数据库',
      enabled: true,
    },
  ];
};

interface UserPreferencesComponentProps {
  onSave?: (preferences: UserPreferences) => void;
}

const UserPreferencesComponent: React.FC<UserPreferencesComponentProps> = ({
  onSave,
}) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(
    null
  );
  const [editingKeys, setEditingKeys] = useState<string[]>([]);

  const form = useForm<UserPreferences>({
    defaultValues: {
      shortcuts: getAllSystemShortcuts(),
      notifications: {
        enabled: true,
        queryCompletion: true,
        connectionStatus: true,
        systemAlerts: true,
        sound: false,
        desktop: true,
        position: 'topRight',
      },
      accessibility: {
        highContrast: false,
        fontSize: 'medium',
        reducedMotion: false,
        screenReader: false,
        keyboardNavigation: true,
      },
      workspace: {
        layout: 'default',
        openTabs: true,
        pinnedQueries: true,
        recentFiles: true,
      },
    },
  });

  // 加载用户偏好
  const loadPreferences = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_user_preferences');
      if (result) {
        // 确保快捷键数据完整，如果没有快捷键数据，使用系统默认的
        const preferences = {
          ...result,
          shortcuts:
            result.shortcuts && result.shortcuts.length > 0
              ? result.shortcuts
              : getAllSystemShortcuts(),
        };
        setPreferences(preferences);
        form.reset(preferences);
      } else {
        // 如果没有用户偏好，使用默认值
        const defaultPreferences = {
          shortcuts: getAllSystemShortcuts(),
          notifications: form.getValues('notifications'),
          accessibility: form.getValues('accessibility'),
          workspace: form.getValues('workspace'),
        };
        setPreferences(defaultPreferences);
        form.reset(defaultPreferences);
      }
    } catch (error) {
      console.error('加载用户偏好失败:', error);
      showMessage.error('加载用户偏好失败');
      // 即使加载失败，也使用默认快捷键
      const defaultPreferences = {
        shortcuts: getAllSystemShortcuts(),
        notifications: form.getValues('notifications'),
        accessibility: form.getValues('accessibility'),
        workspace: form.getValues('workspace'),
      };
      setPreferences(defaultPreferences);
      form.reset(defaultPreferences);
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
      showMessage.success('偏好设置已保存');
      onSave?.(values);
    } catch (error) {
      console.error('保存用户偏好失败:', error);
      showMessage.error('保存用户偏好失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载默认快捷键
  const loadDefaultShortcuts = async () => {
    try {
      const shortcuts = getAllSystemShortcuts();
      form.setValue('shortcuts', shortcuts);
      showMessage.success('已重置为默认快捷键');
    } catch (error) {
      console.error('加载默认快捷键失败:', error);
      showMessage.error('加载默认快捷键失败');
    }
  };

  // 开始编辑快捷键
  const startEditingShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcutId(shortcut.id);
    setEditingKeys([...shortcut.keys]);
  };

  // 取消编辑快捷键
  const cancelEditingShortcut = () => {
    setEditingShortcutId(null);
    setEditingKeys([]);
  };

  // 保存编辑的快捷键
  const saveEditingShortcut = (shortcutId: string) => {
    const currentShortcuts = form.getValues('shortcuts');
    const updatedShortcuts = currentShortcuts.map(s =>
      s.id === shortcutId ? { ...s, keys: editingKeys } : s
    );

    form.setValue('shortcuts', updatedShortcuts);
    setEditingShortcutId(null);
    setEditingKeys([]);

    showMessage.success('快捷键已更新');
  };

  // 切换快捷键启用状态
  const toggleShortcutEnabled = (shortcutId: string) => {
    const currentShortcuts = form.getValues('shortcuts');
    const updatedShortcuts = currentShortcuts.map(s =>
      s.id === shortcutId ? { ...s, enabled: !s.enabled } : s
    );

    form.setValue('shortcuts', updatedShortcuts);
  };

  // 处理键盘输入
  const handleKeyDown = (event: React.KeyboardEvent, shortcutId: string) => {
    if (editingShortcutId !== shortcutId) return;

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];

    if (event.ctrlKey) keys.push('Ctrl');
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');
    if (event.metaKey) keys.push('Meta');

    // 处理特殊键
    let key = event.key;
    if (key === ' ') key = 'Space';
    else if (
      key === 'Control' ||
      key === 'Shift' ||
      key === 'Alt' ||
      key === 'Meta'
    ) {
      // 如果只按了修饰键，不做处理
      return;
    }

    keys.push(key);
    setEditingKeys(keys);
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  if (!preferences) {
    return (
      <div className='flex items-center justify-center p-8'>加载中...</div>
    );
  }

  return (
    <>
      <div className='space-y-6'>
        <Form {...form}>
          <div className='space-y-6'>
            {/* 通知设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Bell className='w-6 h-6 text-blue-600' />
                <div>
                  <h2 className='text-2xl font-bold'>通知设置</h2>
                  <p className='text-muted-foreground'>管理各类提醒和通知</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='notifications.enabled'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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
                    name='notifications.desktop'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='notifications.sound'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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
                    name='notifications.position'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>通知位置</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='选择通知位置' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='topLeft'>左上角</SelectItem>
                            <SelectItem value='topCenter'>顶部居中</SelectItem>
                            <SelectItem value='topRight'>右上角</SelectItem>
                            <SelectItem value='bottomLeft'>左下角</SelectItem>
                            <SelectItem value='bottomCenter'>
                              底部居中
                            </SelectItem>
                            <SelectItem value='bottomRight'>右下角</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='notifications.queryCompletion'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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
                    name='notifications.connectionStatus'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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
              </div>
            </div>

            {/* 无障碍设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Eye className='w-6 h-6 text-blue-600' />
                <div>
                  <h2 className='text-2xl font-bold'>无障碍设置</h2>
                  <p className='text-muted-foreground'>优化界面可访问性</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='accessibility.highContrast'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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
                    name='accessibility.reducedMotion'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='accessibility.fontSize'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>字体大小</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='选择字体大小' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='small'>小</SelectItem>
                            <SelectItem value='medium'>中</SelectItem>
                            <SelectItem value='large'>大</SelectItem>
                            <SelectItem value='extraLarge'>特大</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='accessibility.keyboardNavigation'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
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
              </div>
            </div>

            {/* 工作区设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Layout className='w-6 h-6 text-blue-600' />
                <div>
                  <h2 className='text-2xl font-bold'>工作区设置</h2>
                  <p className='text-muted-foreground'>自定义工作区布局</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='workspace.layout'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>布局模式</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='选择布局模式' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='default'>默认</SelectItem>
                            <SelectItem value='compact'>紧凑</SelectItem>
                            <SelectItem value='wide'>宽屏</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='workspace.openTabs'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>启动时恢复标签页</FormLabel>
                          <FormDescription>
                            重新打开上次的标签页
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

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='workspace.pinnedQueries'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>固定常用查询</FormLabel>
                          <FormDescription>
                            在侧边栏显示常用查询
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

                  <FormField
                    control={form.control}
                    name='workspace.recentFiles'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>显示最近文件</FormLabel>
                          <FormDescription>
                            在菜单中显示最近文件
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
            </div>

            {/* 键盘快捷键 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Keyboard className='w-6 h-6 text-blue-600' />
                <div>
                  <h2 className='text-2xl font-bold'>键盘快捷键</h2>
                  <p className='text-muted-foreground'>自定义快捷键设置</p>
                </div>
              </div>
              <div>
                <p className='text-sm text-muted-foreground'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={loadDefaultShortcuts}
                    className='ml-4'
                  >
                    重置为默认
                  </Button>
                </p>
              </div>
              <div>
                <div className='space-y-6'>
                  {/* 按分类分组显示快捷键 */}
                  {Object.entries(
                    form.watch('shortcuts')?.reduce(
                      (groups, shortcut) => {
                        const category = shortcut.category;
                        if (!groups[category]) {
                          groups[category] = [];
                        }
                        groups[category].push(shortcut);
                        return groups;
                      },
                      {} as Record<string, KeyboardShortcut[]>
                    ) || {}
                  ).map(([category, shortcuts]) => (
                    <div key={category} className='space-y-3'>
                      <h4 className='text-sm font-medium text-muted-foreground border-b pb-1'>
                        {category}
                      </h4>
                      <div className='grid gap-2'>
                        {shortcuts.map(shortcut => (
                          <div
                            key={shortcut.id}
                            className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50'
                          >
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-3'>
                                <div className='flex-1'>
                                  <p className='text-sm font-medium'>
                                    {shortcut.name}
                                  </p>
                                  <p className='text-xs text-muted-foreground'>
                                    {shortcut.description}
                                  </p>
                                </div>
                                <div className='flex items-center gap-2'>
                                  {editingShortcutId === shortcut.id ? (
                                    <div className='flex items-center gap-2'>
                                      <div
                                        className='flex gap-1 p-2 border rounded-md bg-background min-w-[120px] focus-within:ring-2 focus-within:ring-ring'
                                        tabIndex={0}
                                        onKeyDown={e =>
                                          handleKeyDown(e, shortcut.id)
                                        }
                                      >
                                        {editingKeys.length > 0 ? (
                                          editingKeys.map((key, index) => (
                                            <Badge
                                              key={index}
                                              variant='secondary'
                                            >
                                              {key}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className='text-xs text-muted-foreground'>
                                            按下快捷键...
                                          </span>
                                        )}
                                      </div>
                                      <Button
                                        size='sm'
                                        onClick={() =>
                                          saveEditingShortcut(shortcut.id)
                                        }
                                        disabled={editingKeys.length === 0}
                                      >
                                        保存
                                      </Button>
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={cancelEditingShortcut}
                                      >
                                        取消
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className='flex gap-1'>
                                      {shortcut.keys.map((key, index) => (
                                        <Badge key={index} variant='secondary'>
                                          {key}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className='flex items-center gap-2 ml-4'>
                              <Switch
                                checked={shortcut.enabled}
                                onCheckedChange={() =>
                                  toggleShortcutEnabled(shortcut.id)
                                }
                                size='sm'
                              />
                              {editingShortcutId !== shortcut.id && (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => startEditingShortcut(shortcut)}
                                >
                                  <Edit className='w-3 h-3 mr-1' />
                                  编辑
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>

      {/* 保存按钮 - 固定在底部 */}
      <div className='flex justify-end gap-2 pt-4 pb-4 border-t bg-background sticky'>
        <Button type='button' variant='outline' onClick={() => form.reset()}>
          <RefreshCw className='w-4 h-4 mr-2' />
          重置为默认
        </Button>
        <Button
          onClick={() => form.handleSubmit(savePreferences)()}
          disabled={loading}
        >
          <Settings className='w-4 h-4 mr-2' />
          保存设置
        </Button>
      </div>
    </>
  );
};

export default UserPreferencesComponent;
