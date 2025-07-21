import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeTauriListen, safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';
import { useSettingsStore } from '@/store/settings';
import { useTheme } from '@/components/providers/ThemeProvider';
// import KeyboardShortcuts from '@/components/common/KeyboardShortcuts';
import AboutDialog from '@/components/common/AboutDialog';
import SettingsModal from '@/components/common/SettingsModal';

interface NativeMenuHandlerProps {
  onToggleSidebar?: () => void;
  onToggleStatusbar?: () => void;
  onGlobalSearch?: () => void;
}

const NativeMenuHandler: React.FC<NativeMenuHandlerProps> = ({
  onToggleSidebar,
  onToggleStatusbar,
  onGlobalSearch,
}) => {
  const navigate = useNavigate();
  const { 
    activeConnectionId, 
    connections, 
    connectionStatuses, 
    getConnectionStatus,
    isConnectionConnected 
  } = useConnectionStore();
  const { settings, updateTheme } = useSettingsStore();
  const { setColorScheme, setTheme } = useTheme();
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    let unlistenMenuFn: (() => void) | null = null;
    let unlistenThemeFn: (() => void) | null = null;

    const setupListeners = async () => {
      console.log('🎛️ 设置原生菜单监听器...');

      // 监听菜单动作事件
      unlistenMenuFn = await safeTauriListen<string>('menu-action', event => {
        console.log('📋 收到菜单动作事件:', event);
        console.log('📋 菜单动作详情:', {
          payload: event.payload,
          // windowLabel 和 id 可能不存在于简化的事件类型中
          ...(event as any).windowLabel && { windowLabel: (event as any).windowLabel },
          ...(event as any).id && { id: (event as any).id }
        });
        const action = event.payload;
        handleMenuAction(action);
      });

      // 监听主题切换事件
      unlistenThemeFn = await safeTauriListen<string>('theme-change', event => {
        console.log('🎨 收到主题切换事件:', event);
        const themeName = event.payload;
        handleThemeChange(themeName);
      });

      console.log('✅ 原生菜单监听器设置完成');
    };

    setupListeners();

    // 监听自定义设置弹框事件
    const handleOpenSettings = () => {
      setSettingsVisible(true);
      showMessage.success('打开应用设置');
    };

    document.addEventListener('open-settings-modal', handleOpenSettings);

    return () => {
      if (unlistenMenuFn) {
        unlistenMenuFn();
      }
      if (unlistenThemeFn) {
        unlistenThemeFn();
      }
      document.removeEventListener('open-settings-modal', handleOpenSettings);
    };
  }, []); // 移除依赖，只在组件挂载时设置一次监听器

  // 风格切换处理函数
  const handleThemeChange = (themeName: string) => {
    console.log('🎨 切换风格:', themeName);

    // 风格名称映射
    const themeLabels: Record<string, string> = {
      'default': '默认蓝色',
      'shadcn': '极简黑',
      'zinc': '锌灰色',
      'slate': '石板灰',
      'indigo': '靛蓝色',
      'emerald': '翡翠绿',
      'blue': '经典蓝',
      'green': '自然绿色',
      'red': '活力红色',
      'orange': '温暖橙色',
      'purple': '优雅紫色',
      'rose': '浪漫玫瑰',
      'yellow': '明亮黄色',
      'violet': '神秘紫罗兰'
    };

    // 设置颜色方案
    setColorScheme(themeName);

    // 显示成功消息
    const themeLabel = themeLabels[themeName] || themeName;
    showMessage.success(`已切换到${themeLabel}风格`);
  };

  // 模式切换处理函数
  const handleModeChange = (mode: 'system' | 'light' | 'dark') => {
    console.log('🌓 切换模式:', mode);

    // 模式名称映射
    const modeLabels: Record<string, string> = {
      'system': '跟随系统',
      'light': '浅色模式',
      'dark': '深色模式'
    };

    // 设置模式
    setTheme(mode);

    // 显示成功消息
    const modeLabel = modeLabels[mode] || mode;
    showMessage.success(`已切换到${modeLabel}`);
  };

  // 语言切换处理函数
  const handleLanguageChange = (locale: string, label: string) => {
    console.log('🌐 切换语言:', locale, label);

    // 保存语言设置到localStorage
    localStorage.setItem('app-language', locale);

    // 触发语言切换事件，让应用其他部分知道语言已切换
    document.dispatchEvent(new CustomEvent('language-change', {
      detail: { locale, label }
    }));

    // 显示成功消息
    showMessage.success(`语言已切换到 ${label}`);

    // 可以在这里添加国际化库的切换逻辑
    // 例如: i18n.changeLanguage(locale);
  };



  // 文件操作处理函数
  const handleOpenFile = async () => {
    try {
      console.log('🔍 尝试打开文件对话框...');
      const result = await safeTauriInvoke('open_file_dialog', {
        title: '打开查询文件',
        filters: [
          { name: 'SQL 文件', extensions: ['sql'] },
          { name: 'Text 文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        multiple: false
      });

      console.log('📁 文件对话框结果:', result);

      if (result && result.path) {
        console.log('📖 读取文件内容:', result.path);
        const content = await safeTauriInvoke('read_file', { path: result.path });
        // 通过自定义事件传递文件内容到查询编辑器
        document.dispatchEvent(new CustomEvent('open-file-content', {
          detail: { content, filename: result.path }
        }));
        showMessage.success('文件已打开');
      } else {
        console.log('❌ 用户取消了文件选择或没有选择文件');
      }
    } catch (error) {
      console.error('❌ 打开文件失败:', error);
      showMessage.error(`打开文件失败: ${error}`);
    }
  };

  const handleSaveFile = async () => {
    // 通过自定义事件触发保存当前查询
    document.dispatchEvent(new CustomEvent('save-current-query'));
  };

  const handleSaveAsFile = async () => {
    // 通过自定义事件触发另存为
    document.dispatchEvent(new CustomEvent('save-query-as'));
  };

  // 数据导入导出处理函数
  const handleImportData = async () => {
    try {
      console.log('📥 尝试打开数据导入对话框...');
      const result = await safeTauriInvoke('open_file_dialog', {
        title: '导入数据文件',
        filters: [
          { name: 'CSV 文件', extensions: ['csv'] },
          { name: 'JSON 文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        multiple: false
      });

      console.log('📥 数据导入对话框结果:', result);

      if (result && result.path) {
        // 导航到数据导入页面或显示导入对话框
        document.dispatchEvent(new CustomEvent('import-data-file', {
          detail: { path: result.path }
        }));
        showMessage.success('准备导入数据...');
      } else {
        console.log('❌ 用户取消了数据导入或没有选择文件');
      }
    } catch (error) {
      console.error('❌ 导入数据失败:', error);
      showMessage.error(`导入数据失败: ${error}`);
    }
  };

  const handleExportData = async () => {
    // 通过自定义事件触发数据导出
    document.dispatchEvent(new CustomEvent('export-data'));
  };

  // 查询操作处理函数
  const handleFormatQuery = () => {
    document.dispatchEvent(new CustomEvent('format-query'));
  };

  const handleExplainQuery = () => {
    if (activeConnectionId && isConnectionConnected(activeConnectionId)) {
      document.dispatchEvent(new CustomEvent('explain-query'));
    } else if (activeConnectionId && !isConnectionConnected(activeConnectionId)) {
      showMessage.warning('数据库连接已断开，请重新连接后再试');
    } else {
      showMessage.warning('解释查询需要数据库连接，请先建立连接');
    }
  };

  const handleQueryFavorites = () => {
    document.dispatchEvent(new CustomEvent('show-query-favorites'));
  };

  // 缩放功能处理
  const handleZoomIn = () => {
    const currentZoom = parseFloat(document.body.style.zoom || '1');
    const newZoom = Math.min(currentZoom + 0.1, 2.0);
    document.body.style.zoom = newZoom.toString();
    showMessage.success(`已放大至 ${Math.round(newZoom * 100)}%`);
  };

  const handleZoomOut = () => {
    const currentZoom = parseFloat(document.body.style.zoom || '1');
    const newZoom = Math.max(currentZoom - 0.1, 0.5);
    document.body.style.zoom = newZoom.toString();
    showMessage.success(`已缩小至 ${Math.round(newZoom * 100)}%`);
  };

  const handleZoomReset = () => {
    document.body.style.zoom = '1';
    showMessage.success('已重置缩放至 100%');
  };

  // 帮助系统处理函数
  const handleUserManual = () => {
    window.open('https://docs.influxdata.com/', '_blank');
  };

  const handleQuickStart = () => {
    document.dispatchEvent(new CustomEvent('show-quick-start'));
  };

  const handleCheckUpdates = async () => {
    try {
      const result = await safeTauriInvoke('check_for_app_updates');
      if (result.available && !result.is_skipped) {
        showMessage.info(`发现新版本: ${result.latest_version}`);
      } else if (result.is_skipped) {
        showMessage.info(`版本 ${result.latest_version} 已被跳过`);
      } else {
        showMessage.success('您使用的是最新版本');
      }
    } catch (error) {
      showMessage.error(`检查更新失败: ${error}`);
    }
  };

  const handleReportIssue = () => {
    window.open('https://github.com/your-repo/issues', '_blank');
  };

  const handleMenuAction = (action: string) => {
    console.log('🎯 处理菜单动作:', action);
    
    // 获取详细的连接状态信息
    const activeConnectionStatus = activeConnectionId ? getConnectionStatus(activeConnectionId) : null;
    const isConnected = activeConnectionId ? isConnectionConnected(activeConnectionId) : false;
    
    console.log('🔗 当前连接状态:', { 
      activeConnectionId, 
      isConnected,
      connectionStatus: activeConnectionStatus?.status,
      totalConnections: connections.length,
      availableConnections: connections.map(c => ({ id: c.id, name: c.name }))
    });
    
    // 添加动作处理状态跟踪
    let handled = false;

    // 检查需要活跃数据库连接的操作
    const activeConnectionRequiredActions = [
      'execute_query', 'execute_selection', 'stop_query',
      'refresh_structure', 'database_info', 'database_stats',
      'import_structure', 'export_structure', 'import_data', 'export_data',
      'query_plan', 'explain_query'
    ];

    // 检查需要已选择连接（但不一定要活跃）的操作
    const selectedConnectionRequiredActions = [
      'test_connection', 'edit_connection', 'delete_connection'
    ];

    // 检查连接要求
    const hasActiveConnection = activeConnectionId && isConnectionConnected(activeConnectionId);
    const hasSelectedConnection = activeConnectionId && connections.some(c => c.id === activeConnectionId);
    
    if (activeConnectionRequiredActions.includes(action)) {
      if (!activeConnectionId) {
        showMessage.warning('此操作需要先选择一个数据库连接');
        return;
      }
      if (!hasActiveConnection) {
        showMessage.warning('此操作需要活跃的数据库连接，请先连接到数据库');
        return;
      }
    }

    if (selectedConnectionRequiredActions.includes(action) && !hasSelectedConnection) {
      showMessage.warning('此操作需要先选择一个数据库连接');
      return;
    }

    // 导航动作
    if (action.startsWith('navigate:')) {
      const path = action.replace('navigate:', '');
      console.log('🧭 导航到:', path);
      navigate(path);
      handled = true;
      return;
    }

    // 视图切换动作 - 处理 view: 前缀的动作
    if (action.startsWith('view:')) {
      const view = action.replace('view:', '');
      const viewMap: Record<string, string> = {
        datasource: '/connections',
        query: '/query',
        visualization: '/visualization',
        performance: '/performance',
      };
      if (viewMap[view]) {
        navigate(viewMap[view]);
        showMessage.success(
          `切换到${view === 'datasource' ? '数据源管理' : view === 'query' ? '查询编辑器' : view === 'visualization' ? '数据可视化' : '性能监控'}`
        );
      }
      return;
    }

    switch (action) {
      // 文件菜单
      case 'new_query':
        navigate('/query');
        handled = true;
        break;

      case 'open_file':
        handleOpenFile();
        handled = true;
        break;

      case 'save':
        handleSaveFile();
        handled = true;
        break;

      case 'save_as':
        handleSaveAsFile();
        handled = true;
        break;

      case 'import_data':
        // 触发导入数据对话框
        document.dispatchEvent(new CustomEvent('show-import-dialog'));
        handled = true;
        break;

      case 'export_data':
        // 触发导出数据对话框
        document.dispatchEvent(new CustomEvent('show-export-dialog'));
        handled = true;
        break;

      // 编辑菜单
      case 'undo':
        document.execCommand('undo');
        handled = true;
        break;

      case 'redo':
        document.execCommand('redo');
        handled = true;
        break;

      case 'cut':
        document.execCommand('cut');
        handled = true;
        break;

      case 'copy':
        // 触发系统复制快捷键
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true
        }));
        handled = true;
        break;

      case 'paste':
        // 触发系统粘贴快捷键
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'v',
          ctrlKey: true,
          bubbles: true
        }));
        handled = true;
        break;

      case 'find':
        // 触发浏览器的查找功能
        if (document.activeElement && 'focus' in document.activeElement) {
          const event = new KeyboardEvent('keydown', {
            key: 'f',
            ctrlKey: true,
            bubbles: true,
          });
          document.activeElement.dispatchEvent(event);
        }
        handled = true;
        break;

      case 'replace':
        // 触发浏览器的替换功能
        if (document.activeElement && 'focus' in document.activeElement) {
          const event = new KeyboardEvent('keydown', {
            key: 'h',
            ctrlKey: true,
            bubbles: true,
          });
          document.activeElement.dispatchEvent(event);
        }
        handled = true;
        break;

      case 'global_search':
        if (onGlobalSearch) {
          onGlobalSearch();
        }
        handled = true;
        break;

      // 查看菜单
      case 'toggle_sidebar':
      case 'toggle-sidebar':
        if (onToggleSidebar) {
          onToggleSidebar();
        } else {
          document.dispatchEvent(new CustomEvent('toggle-sidebar'));
        }
        handled = true;
        break;

      case 'toggle_statusbar':
      case 'toggle-statusbar':
        if (onToggleStatusbar) {
          onToggleStatusbar();
        }
        handled = true;
        break;

      case 'fullscreen':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        handled = true;
        break;

      case 'zoom_in':
        handleZoomIn();
        handled = true;
        break;

      case 'zoom_out':
        handleZoomOut();
        handled = true;
        break;

      case 'zoom_reset':
        handleZoomReset();
        handled = true;
        break;

      // 数据库菜单
      case 'new_connection':
      case 'new-connection':
        navigate('/connections');
        showMessage.success('打开连接管理');
        handled = true;
        break;

      case 'test_connection':
      case 'test-connection':
        document.dispatchEvent(
          new CustomEvent('test-connection', { detail: { connectionId: activeConnectionId } })
        );
        handled = true;
        break;

      case 'edit_connection':
      case 'edit-connection':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('edit-connection', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else {
          showMessage.warning('请先选择一个连接');
        }
        break;

      case 'delete_connection':
      case 'delete-connection':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('delete-connection', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else {
          showMessage.warning('请先选择一个连接');
        }
        break;

      case 'refresh_structure':
      case 'refresh-structure':
        if (activeConnectionId && isConnected) {
          showMessage.info('正在刷新数据库结构...');
          // 触发刷新事件
          document.dispatchEvent(new CustomEvent('refresh-database-tree'));
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'database-info':
      case 'database_info':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('show-database-info', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'database_stats':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('show-database-stats', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'import_structure':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('import-database-structure', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'export_structure':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('export-database-structure', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      // 查询菜单
      case 'execute_query':
      case 'execute-query':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('execute-query', { detail: { source: 'menu' } })
          );
          showMessage.info('执行查询...');
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'execute_selection':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('execute-selection', { detail: { source: 'menu' } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'stop_query':
      case 'stop-query':
        document.dispatchEvent(
          new CustomEvent('stop-query', { detail: { source: 'menu' } })
        );
        showMessage.info('已停止查询');
        break;

      case 'query_history':
      case 'query-history':
        document.dispatchEvent(
          new CustomEvent('show-query-history', { detail: { source: 'menu' } })
        );
        break;

      case 'save_query':
      case 'save-query':
        document.dispatchEvent(
          new CustomEvent('save-query', { detail: { source: 'menu' } })
        );
        break;

      case 'query_favorites':
        handleQueryFavorites();
        break;

      case 'format_query':
        handleFormatQuery();
        break;

      case 'explain_query':
        handleExplainQuery();
        handled = true;
        break;

      case 'query_plan':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('show-query-plan', { detail: { source: 'menu' } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning('数据库连接已断开，请重新连接后再试');
        } else {
          showMessage.warning('查询计划需要数据库连接，请先建立连接');
        }
        break;

      // 工具菜单
      case 'keyboard_shortcuts':
      case 'shortcuts':
        setShortcutsVisible(true);
        break;

      case 'console':
        // 打开浏览器开发者工具
        if ((window as any).chrome && (window as any).chrome.runtime) {
          // Chrome
          (window as any).chrome.runtime.sendMessage({action: 'openDevTools'});
        } else {
          // 通用方法
          document.dispatchEvent(new CustomEvent('open-console'));
        }
        break;

      case 'dev_tools':
      case 'dev-tools':
        navigate('/dev-tools');
        showMessage.success('切换到开发者工具');
        break;

      case 'query_performance':
        navigate('/performance');
        showMessage.success('切换到性能分析');
        break;

      case 'extensions':
        navigate('/extensions');
        showMessage.success('切换到扩展管理');
        break;

      case 'theme_settings':
        // 打开设置弹框
        setSettingsVisible(true);
        showMessage.success('打开主题设置');
        handled = true;
        break;

      // 语言切换菜单
      case 'lang_chinese':
        handleLanguageChange('zh-CN', '中文');
        handled = true;
        break;

      case 'lang_english':
        handleLanguageChange('en-US', 'English');
        handled = true;
        break;

      case 'preferences':
        // 打开设置弹框
        setSettingsVisible(true);
        showMessage.success('打开偏好设置');
        handled = true;
        break;

      // 帮助菜单
      case 'user_manual':
      case 'user-manual':
        handleUserManual();
        break;

      case 'quick_start':
      case 'quick-start':
        handleQuickStart();
        break;

      case 'shortcuts_help':
      case 'shortcuts-help':
        setShortcutsVisible(true);
        break;

      case 'check_updates':
      case 'check-updates':
        handleCheckUpdates();
        break;

      case 'report_issue':
      case 'report-issue':
        handleReportIssue();
        break;

      case 'about':
        setAboutVisible(true);
        break;

      case 'sample_queries':
        document.dispatchEvent(
          new CustomEvent('show-sample-queries', { detail: { source: 'menu' } })
        );
        break;

      case 'api_docs':
        window.open('https://docs.influxdata.com/influxdb/v1.8/tools/api/', '_blank');
        break;

      case 'influxdb_docs':
        window.open('https://docs.influxdata.com/', '_blank');
        break;

      // 风格切换菜单 - 恢复风格切换功能
      case 'theme_default':
        handleThemeChange('default');
        handled = true;
        break;
      case 'theme_shadcn':
        handleThemeChange('shadcn');
        handled = true;
        break;
      case 'theme_zinc':
        handleThemeChange('zinc');
        handled = true;
        break;
      case 'theme_slate':
        handleThemeChange('slate');
        handled = true;
        break;
      case 'theme_indigo':
        handleThemeChange('indigo');
        handled = true;
        break;
      case 'theme_emerald':
        handleThemeChange('emerald');
        handled = true;
        break;
      case 'theme_blue':
        handleThemeChange('blue');
        handled = true;
        break;
      case 'theme_green':
        handleThemeChange('green');
        handled = true;
        break;
      case 'theme_red':
        handleThemeChange('red');
        handled = true;
        break;
      case 'theme_orange':
        handleThemeChange('orange');
        handled = true;
        break;
      case 'theme_purple':
        handleThemeChange('purple');
        handled = true;
        break;
      case 'theme_rose':
        handleThemeChange('rose');
        handled = true;
        break;
      case 'theme_yellow':
        handleThemeChange('yellow');
        handled = true;
        break;
      case 'theme_violet':
        handleThemeChange('violet');
        handled = true;
        break;

      // 模式切换菜单
      case 'mode_system':
        handleModeChange('system');
        handled = true;
        break;
      case 'mode_light':
        handleModeChange('light');
        handled = true;
        break;
      case 'mode_dark':
        handleModeChange('dark');
        handled = true;
        break;

      default:
        // 检查是否是主题切换动作（支持两种格式）
        if (action.startsWith('theme_') || action.startsWith('theme-')) {
          const themeName = action.replace(/^theme[_-]/, '');
          handleThemeChange(themeName);
          handled = true;
          return;
        }
        break;
    }
    
    // 记录未处理的动作
    if (!handled) {
      console.warn('⚠️ 未处理的菜单动作:', action);
      showMessage.warning(`菜单功能 "${action}" 暂未实现`);
    } else {
      console.log('✅ 菜单动作处理完成:', action);
    }
  };

  return (
    <>


      {/* 临时注释掉 KeyboardShortcuts 组件以修复显示问题 */}
      {/* <KeyboardShortcuts
        visible={shortcutsVisible}
        onClose={() => setShortcutsVisible(false)}
      /> */}
      <AboutDialog visible={aboutVisible} onClose={() => setAboutVisible(false)} />
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </>
  );
};

export default NativeMenuHandler;
