import React, { useState } from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  Badge,
  useToast
} from '@/components/ui';

import { useNavigate, useLocation } from 'react-router-dom';
import {
  Database, Search, BarChart, Edit, Settings, ChevronDown, Wifi, Webhook, Zap, Grid3X3, LayoutDashboard,
  FileText, RotateCcw, Scissors, Copy, Clipboard, Eye, Monitor, HelpCircle,
  Plus, FolderOpen, Save, RefreshCw, Wrench, History, ExternalLink, Download, Upload, Palette
} from 'lucide-react';
import { useConnectionStore, connectionUtils } from '@/store/connection';
import { useSettingsStore } from '@/store/settings';
import { safeTauriInvoke } from '@/utils/tauri';
import { themeColors, applyThemeColors } from '@/lib/theme-colors';

// 导入功能组件
import AboutDialog from '@/components/common/AboutDialog';
import SettingsModal from '@/components/common/SettingsModal';
import QueryHistory from '@/components/query/QueryHistory';
import KeyboardShortcuts from '@/components/common/KeyboardShortcuts';

const AppMenuBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { activeConnectionId, connectionStatuses } = useConnectionStore();
  const hasAnyConnectedInfluxDB = connectionUtils.hasAnyConnectedInfluxDB();
  const { settings, updateTheme } = useSettingsStore();

  // 对话框状态管理
  const [aboutVisible, setAboutVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [queryHistoryVisible, setQueryHistoryVisible] = useState(false);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);

  // 获取当前连接状态
  const currentStatus = activeConnectionId
    ? connectionStatuses[activeConnectionId]
    : null;

  // 文件菜单
  const fileMenuItems = [
    {
      key: 'new-query',
      icon: <Plus className="w-4 h-4" />,
      label: '新建查询',
      shortcut: 'Ctrl+N'
    },
    {
      key: 'open',
      icon: <FolderOpen className="w-4 h-4" />,
      label: '打开文件',
      shortcut: 'Ctrl+O'
    },
    {
      key: 'save',
      icon: <Save className="w-4 h-4" />,
      label: '保存',
      shortcut: 'Ctrl+S'
    },
    {
      key: 'save-as',
      icon: <Save className="w-4 h-4" />,
      label: '另存为',
      shortcut: 'Ctrl+Shift+S'
    },
    { key: 'divider-1', type: 'divider' },
    {
      key: 'import',
      icon: <Database className="w-4 h-4" />,
      label: '导入数据'
    },
    {
      key: 'export',
      icon: <Database className="w-4 h-4" />,
      label: '导出数据'
    },
  ];

  // 编辑菜单
  const editMenuItems = [
    {
      key: 'undo',
      icon: <RotateCcw className="w-4 h-4" />,
      label: '撤销',
      shortcut: 'Ctrl+Z'
    },
    {
      key: 'redo',
      icon: <RotateCcw className="w-4 h-4" />,
      label: '重做',
      shortcut: 'Ctrl+Y'
    },
    { key: 'divider-2', type: 'divider' },
    {
      key: 'cut',
      icon: <Scissors className="w-4 h-4" />,
      label: '剪切',
      shortcut: 'Ctrl+X'
    },
    {
      key: 'copy',
      icon: <Copy className="w-4 h-4" />,
      label: '复制',
      shortcut: 'Ctrl+C'
    },
    {
      key: 'paste',
      icon: <Clipboard className="w-4 h-4" />,
      label: '粘贴',
      shortcut: 'Ctrl+V'
    },
    { key: 'divider-3', type: 'divider' },
    {
      key: 'find',
      icon: <Search className="w-4 h-4" />,
      label: '查找',
      shortcut: 'Ctrl+F'
    },
    {
      key: 'replace',
      icon: <Search className="w-4 h-4" />,
      label: '替换',
      shortcut: 'Ctrl+H'
    },
  ];

  // 查看菜单
  const viewMenuItems = [
    {
      key: '/datasource',
      icon: <Database className="w-4 h-4" />,
      label: '数据源管理',
      shortcut: 'Ctrl+1'
    },
    {
      key: '/query',
      icon: <Edit className="w-4 h-4" />,
      label: '查询编辑器',
      shortcut: 'Ctrl+2',
      disabled: !hasAnyConnectedInfluxDB
    },
    {
      key: '/visualization',
      icon: <BarChart className="w-4 h-4" />,
      label: '数据可视化',
      shortcut: 'Ctrl+3',
      disabled: !hasAnyConnectedInfluxDB
    },
    {
      key: '/performance',
      icon: <Zap className="w-4 h-4" />,
      label: '性能监控',
      shortcut: 'Ctrl+4',
      disabled: !hasAnyConnectedInfluxDB
    },
    { key: 'divider-4', type: 'divider' },
    {
      key: 'toggle-sidebar',
      icon: <Eye className="w-4 h-4" />,
      label: '切换侧边栏',
      shortcut: 'Ctrl+B'
    },
    {
      key: 'fullscreen',
      icon: <Monitor className="w-4 h-4" />,
      label: '全屏模式',
      shortcut: 'F11'
    },
  ];

  // 数据库菜单
  const databaseMenuItems = [
    {
      key: 'new-connection',
      icon: <Plus className="w-4 h-4" />,
      label: '新建连接',
      shortcut: 'Ctrl+Shift+N'
    },
    {
      key: 'test-connection',
      icon: <Webhook className="w-4 h-4" />,
      label: '测试连接',
      shortcut: 'Ctrl+T',
      disabled: !hasAnyConnectedInfluxDB
    },
    { key: 'divider-5', type: 'divider' },
    {
      key: 'refresh-structure',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '刷新数据库结构',
      shortcut: 'F5',
      disabled: !hasAnyConnectedInfluxDB
    },
    {
      key: 'database-info',
      icon: <Database className="w-4 h-4" />,
      label: '查看数据库信息',
      disabled: !hasAnyConnectedInfluxDB
    },
  ];

  // 查询菜单
  const queryMenuItems = [
    {
      key: 'execute-query',
      icon: <BarChart className="w-4 h-4" />,
      label: '执行查询',
      shortcut: 'F5',
      disabled: !hasAnyConnectedInfluxDB
    },
    {
      key: 'stop-query',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '停止查询',
      shortcut: 'Ctrl+F2',
      disabled: !hasAnyConnectedInfluxDB
    },
    { key: 'divider-6', type: 'divider' },
    {
      key: 'query-history',
      icon: <History className="w-4 h-4" />,
      label: '查询历史',
      shortcut: 'Ctrl+H'
    },
    {
      key: 'save-query',
      icon: <Save className="w-4 h-4" />,
      label: '保存查询'
    },
  ];

  // 软件风格菜单
  const styleMenuItems = [
    {
      key: 'theme-colors',
      icon: <Palette className="w-4 h-4" />,
      label: '颜色主题',
      type: 'submenu',
      children: Object.values(themeColors).map(color => ({
        key: `theme-${color.name}`,
        label: color.label,
        icon: (
          <div
            className="w-3 h-3 rounded-full border border-gray-300"
            style={{ backgroundColor: `hsl(${color.primary})` }}
          />
        ),
        onClick: () => handleThemeChange(color.name)
      }))
    },
  ];

  // 工具菜单
  const toolsMenuItems = [
    {
      key: 'console',
      icon: <Monitor className="w-4 h-4" />,
      label: '控制台',
      shortcut: 'Ctrl+`'
    },
    {
      key: 'dev-tools',
      icon: <Wrench className="w-4 h-4" />,
      label: '开发者工具',
      shortcut: 'F12'
    },
    { key: 'divider-7', type: 'divider' },
    {
      key: '/extensions',
      icon: <Grid3X3 className="w-4 h-4" />,
      label: '扩展管理'
    },
    {
      key: '/settings',
      icon: <Settings className="w-4 h-4" />,
      label: '首选项',
      shortcut: 'Ctrl+,'
    },
  ];

  // 帮助菜单
  const helpMenuItems = [
    {
      key: 'user-manual',
      icon: <FileText className="w-4 h-4" />,
      label: '用户手册',
      shortcut: 'F1'
    },
    {
      key: 'shortcuts',
      icon: <Search className="w-4 h-4" />,
      label: '键盘快捷键',
      shortcut: 'Ctrl+/'
    },
    { key: 'divider-8', type: 'divider' },
    {
      key: 'check-updates',
      icon: <RefreshCw className="w-4 h-4" />,
      label: '检查更新'
    },
    {
      key: 'about',
      icon: <HelpCircle className="w-4 h-4" />,
      label: '关于InfloWave'
    },
  ];

  // 处理主题切换
  const handleThemeChange = (themeName: string) => {
    const isDark = settings.theme.mode === 'dark' ||
      (settings.theme.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // 应用主题颜色
    applyThemeColors(themeName, isDark);

    // 更新设置
    updateTheme({ primaryColor: themeName });

    toast({
      title: "主题已切换",
      description: `已切换到${themeColors[themeName]?.label || themeName}主题`
    });
  };

  // 处理菜单点击
  const handleMenuClick = async (key: string) => {
    // 路由导航
    if (key.startsWith('/')) {
      navigate(key);
      return;
    }

    // 处理各种菜单动作
    switch (key) {
      // 文件菜单
      case 'new-query':
        if (activeConnectionId) {
          navigate('/query');
          toast({ title: "成功", description: "打开查询编辑器" });
        } else {
          toast({ title: "提示", description: "请先建立数据库连接", variant: "destructive" });
        }
        break;

      case 'open':
        try {
          // 使用 Tauri 的文件对话框
          const selected = await safeTauriInvoke('show_open_dialog', {
            filters: [
              { name: 'SQL Files', extensions: ['sql'] },
              { name: 'Text Files', extensions: ['txt'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          });
          if (selected) {
            toast({ title: "成功", description: `打开文件: ${selected}` });
          }
        } catch (error) {
          toast({ title: "错误", description: "打开文件失败", variant: "destructive" });
        }
        break;

      case 'save':
        // 触发保存事件
        document.dispatchEvent(new CustomEvent('save-current-query'));
        toast({ title: "提示", description: "保存当前查询" });
        break;

      case 'save-as':
        // 触发另存为事件
        document.dispatchEvent(new CustomEvent('save-query-as'));
        toast({ title: "提示", description: "另存为查询" });
        break;

      case 'import':
        // 触发导入数据事件
        document.dispatchEvent(new CustomEvent('show-import-dialog'));
        toast({ title: "提示", description: "打开数据导入" });
        break;

      case 'export':
        // 触发导出数据事件
        document.dispatchEvent(new CustomEvent('show-export-dialog'));
        toast({ title: "提示", description: "打开数据导出" });
        break;

      // 编辑菜单
      case 'undo':
        document.execCommand('undo');
        break;

      case 'redo':
        document.execCommand('redo');
        break;

      case 'cut':
        document.execCommand('cut');
        break;

      case 'copy':
        document.execCommand('copy');
        break;

      case 'paste':
        document.execCommand('paste');
        break;

      case 'find':
        // 触发查找功能
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'f',
          ctrlKey: true,
          bubbles: true
        }));
        break;

      case 'replace':
        // 触发替换功能
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'h',
          ctrlKey: true,
          bubbles: true
        }));
        break;

      case 'global-search':
        // 触发全局搜索
        document.dispatchEvent(new CustomEvent('show-global-search'));
        break;

      // 查看菜单
      case 'toggle-sidebar':
        document.dispatchEvent(new CustomEvent('toggle-sidebar'));
        break;

      case 'fullscreen':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;

      // 数据库菜单
      case 'new-connection':
        navigate('/connections');
        toast({ title: "成功", description: "打开连接管理" });
        break;

      case 'test-connection':
        if (activeConnectionId) {
          document.dispatchEvent(new CustomEvent('test-current-connection'));
          toast({ title: "提示", description: "测试当前连接" });
        } else {
          toast({ title: "提示", description: "请先选择一个连接", variant: "destructive" });
        }
        break;

      case 'refresh-structure':
        if (activeConnectionId) {
          document.dispatchEvent(new CustomEvent('refresh-database-tree'));
          toast({ title: "提示", description: "刷新数据库结构" });
        } else {
          toast({ title: "提示", description: "请先建立数据库连接", variant: "destructive" });
        }
        break;

      case 'database-info':
        if (activeConnectionId) {
          document.dispatchEvent(new CustomEvent('show-database-info'));
          toast({ title: "提示", description: "显示数据库信息" });
        } else {
          toast({ title: "提示", description: "请先建立数据库连接", variant: "destructive" });
        }
        break;

      // 查询菜单
      case 'execute-query':
        if (activeConnectionId) {
          document.dispatchEvent(new CustomEvent('execute-query', { detail: { source: 'menu' } }));
          toast({ title: "提示", description: "执行查询" });
        } else {
          toast({ title: "提示", description: "请先建立数据库连接", variant: "destructive" });
        }
        break;

      case 'stop-query':
        document.dispatchEvent(new CustomEvent('stop-query'));
        toast({ title: "提示", description: "停止查询" });
        break;

      case 'query-history':
        setQueryHistoryVisible(true);
        break;

      case 'save-query':
        document.dispatchEvent(new CustomEvent('save-current-query'));
        toast({ title: "提示", description: "保存查询" });
        break;

      // 工具菜单
      case 'console':
        // 打开开发者控制台
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('开发者控制台已打开');
          toast({ title: "提示", description: "请查看浏览器控制台" });
        }
        break;

      case 'dev-tools':
        try {
          await safeTauriInvoke('toggle_devtools');
        } catch (error) {
          toast({ title: "错误", description: "无法打开开发者工具", variant: "destructive" });
        }
        break;

      case 'query-performance':
        navigate('/performance');
        toast({ title: "成功", description: "打开查询性能分析" });
        break;

      case 'extensions':
        toast({ title: "提示", description: "扩展管理功能开发中..." });
        break;

      case 'theme-settings':
        setSettingsVisible(true);
        break;

      case 'language-settings':
        setSettingsVisible(true);
        break;

      case 'preferences':
        setSettingsVisible(true);
        break;

      // 帮助菜单
      case 'user-manual':
        // 打开用户手册
        window.open('https://github.com/chenqi92/inflowave/wiki', '_blank');
        break;

      case 'shortcuts':
        setShortcutsVisible(true);
        break;

      case 'check-updates':
        try {
          const updateInfo = await safeTauriInvoke('check_for_updates');
          toast({ title: "更新检查", description: "已检查更新" });
        } catch (error) {
          toast({ title: "错误", description: "检查更新失败", variant: "destructive" });
        }
        break;

      case 'about':
        setAboutVisible(true);
        break;

      default:
        console.log('未处理的菜单动作:', key);
        toast({ title: "提示", description: `功能 "${key}" 开发中...` });
        break;
    }
  };

  // 渲染下拉菜单项
  const renderDropdownItems = (items: any[]) => {
    return items.map((item) => {
      if (item.type === 'divider') {
        return <DropdownMenuSeparator key={item.key} />;
      }

      if (item.type === 'submenu') {
        return (
          <DropdownMenuSub key={item.key}>
            <DropdownMenuSubTrigger className="flex items-center space-x-2">
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {item.children?.map((child: any) => (
                <DropdownMenuItem
                  key={child.key}
                  onClick={child.onClick}
                  className="flex items-center space-x-2"
                >
                  {child.icon && <span className="flex-shrink-0">{child.icon}</span>}
                  <span>{child.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        );
      }

      return (
        <DropdownMenuItem
          key={item.key}
          disabled={item.disabled}
          onClick={() => handleMenuClick(item.key)}
          className="flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </div>
          {item.shortcut && (
            <span className="text-xs text-muted-foreground ml-auto">
              {item.shortcut}
            </span>
          )}
        </DropdownMenuItem>
      );
    });
  };

  // 主菜单配置
  const mainMenus = [
    { key: 'file', label: '文件', items: fileMenuItems },
    { key: 'edit', label: '编辑', items: editMenuItems },
    { key: 'view', label: '查看', items: viewMenuItems },
    { key: 'database', label: '数据库', items: databaseMenuItems },
    { key: 'query', label: '查询', items: queryMenuItems },
    { key: 'style', label: '软件风格', items: styleMenuItems },
    { key: 'tools', label: '工具', items: toolsMenuItems },
    { key: 'help', label: '帮助', items: helpMenuItems },
  ];

  return (
    <>
      <div className="desktop-menu-bar">
        <div className="flex items-center justify-between h-full px-4">
          {/* 左侧 - 应用标题和主菜单 */}
          <div className="flex items-center space-x-6">
            {/* 应用标题 */}
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-xl text-primary-600" />
              <span className="text-lg font-semibold">
                InfloWave
              </span>
            </div>

            {/* 主菜单 */}
            <NavigationMenu>
              <NavigationMenuList className="space-x-1">
                {mainMenus.map((menu) => (
                  <NavigationMenuItem key={menu.key}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <NavigationMenuTrigger className="h-9 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                          {menu.label}
                        </NavigationMenuTrigger>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {renderDropdownItems(menu.items)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* 右侧 - 连接状态 */}
          <div className="flex items-center space-x-4">
            {activeConnectionId && currentStatus ? (
              <div className="flex items-center gap-2">
                <Badge
                  variant={currentStatus.status === 'connected' ? 'default' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  <Wifi className="w-3 h-3" />
                  <span className="text-xs">
                    {currentStatus.status === 'connected' ? '已连接' : '未连接'}
                  </span>
                </Badge>
                {currentStatus.latency && (
                  <span className="text-xs text-muted-foreground">
                    {currentStatus.latency}ms
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  无活跃连接
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 对话框组件 */}
      <AboutDialog
        visible={aboutVisible}
        onClose={() => setAboutVisible(false)}
      />

      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      <QueryHistory
        visible={queryHistoryVisible}
        onClose={() => setQueryHistoryVisible(false)}
      />

      <KeyboardShortcuts
        visible={shortcutsVisible}
        onClose={() => setShortcutsVisible(false)}
      />
    </>
  );
};

export default AppMenuBar;
