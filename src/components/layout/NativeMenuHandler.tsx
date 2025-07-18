import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeTauriListen, safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';
import { useSettingsStore } from '@/store/settings';
import { useTheme } from '@/components/providers/ThemeProvider';
// import KeyboardShortcuts from '@/components/common/KeyboardShortcuts';
import AboutDialog from '@/components/common/AboutDialog';

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
  const { activeConnectionId } = useConnectionStore();
  const { settings, updateTheme } = useSettingsStore();
  const { setColorScheme } = useTheme();
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  useEffect(() => {
    let unlistenMenuFn: (() => void) | null = null;
    let unlistenThemeFn: (() => void) | null = null;

    const setupListeners = async () => {
      console.log('🎛️ 设置原生菜单监听器...');

      // 监听菜单动作事件
      unlistenMenuFn = await safeTauriListen<string>('menu-action', event => {
        console.log('📋 收到菜单动作事件:', event);
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

    return () => {
      if (unlistenMenuFn) {
        unlistenMenuFn();
      }
      if (unlistenThemeFn) {
        unlistenThemeFn();
      }
    };
  }, [navigate, activeConnectionId]);

  // 处理主题切换
  const handleThemeChange = (themeName: string) => {
    console.log('处理主题切换:', themeName);

    // 处理新的主题名称格式，将其转换为系统使用的格式
    let actualThemeName = themeName;

    // 映射从菜单发来的主题名称到系统内部使用的格式
    const themeMapping: Record<string, string> = {
      'default-blue': 'default',
      'natural-green': 'green',
      'vibrant-red': 'red',
      'warm-orange': 'orange',
      'elegant-purple': 'purple',
      'romantic-rose': 'rose',
      'bright-yellow': 'yellow',
      'mysterious-violet': 'violet',
    };

    if (themeMapping[themeName]) {
      actualThemeName = themeMapping[themeName];
    }

    // 使用主题提供者的颜色方案切换功能
    setColorScheme(actualThemeName);

    // 同时更新设置存储以保持兼容性
    updateTheme({ primaryColor: actualThemeName });

    // 显示成功消息
    const themeLabels: Record<string, string> = {
      default: '默认蓝色',
      green: '自然绿色',
      red: '活力红色',
      orange: '温暖橙色',
      purple: '优雅紫色',
      rose: '浪漫玫瑰',
      yellow: '明亮黄色',
      violet: '神秘紫罗兰',
    };

    const themeLabel = themeLabels[actualThemeName] || actualThemeName;
    showMessage.success(`已切换到${themeLabel}主题`);
  };

  // 文件操作处理函数
  const handleOpenFile = async () => {
    try {
      const result = await safeTauriInvoke('open_file_dialog', {
        title: '打开查询文件',
        filters: [
          { name: 'SQL 文件', extensions: ['sql'] },
          { name: 'Text 文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        multiple: false
      });
      
      if (result && result.path) {
        const content = await safeTauriInvoke('read_file', { path: result.path });
        // 通过自定义事件传递文件内容到查询编辑器
        document.dispatchEvent(new CustomEvent('open-file-content', { 
          detail: { content, filename: result.path } 
        }));
        showMessage.success('文件已打开');
      }
    } catch (error) {
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
      const result = await safeTauriInvoke('open_file_dialog', {
        title: '导入数据文件',
        filters: [
          { name: 'CSV 文件', extensions: ['csv'] },
          { name: 'JSON 文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ],
        multiple: false
      });
      
      if (result && result.path) {
        // 导航到数据导入页面或显示导入对话框
        document.dispatchEvent(new CustomEvent('import-data-file', { 
          detail: { path: result.path } 
        }));
        showMessage.success('准备导入数据...');
      }
    } catch (error) {
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
    document.dispatchEvent(new CustomEvent('explain-query'));
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
      const result = await safeTauriInvoke('check_for_updates');
      if (result.hasUpdate) {
        showMessage.info(`发现新版本: ${result.version}`);
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
    
    // 添加动作处理状态跟踪
    let handled = false;

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
        if (activeConnectionId) {
          navigate('/query');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
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
        handleImportData();
        handled = true;
        break;

      case 'export_data':
        handleExportData();
        handled = true;
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
        // 触发浏览器的查找功能
        if (document.activeElement && 'focus' in document.activeElement) {
          const event = new KeyboardEvent('keydown', {
            key: 'f',
            ctrlKey: true,
            bubbles: true,
          });
          document.activeElement.dispatchEvent(event);
        }
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
        break;

      case 'global_search':
        if (onGlobalSearch) {
          onGlobalSearch();
        }
        break;

      // 查看菜单
      case 'toggle_sidebar':
      case 'toggle-sidebar':
        if (onToggleSidebar) {
          onToggleSidebar();
        } else {
          document.dispatchEvent(new CustomEvent('toggle-sidebar'));
        }
        break;

      case 'toggle_statusbar':
      case 'toggle-statusbar':
        if (onToggleStatusbar) {
          onToggleStatusbar();
        }
        break;

      case 'fullscreen':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;

      case 'zoom_in':
        handleZoomIn();
        break;

      case 'zoom_out':
        handleZoomOut();
        break;

      case 'zoom_reset':
        handleZoomReset();
        break;

      // 数据库菜单
      case 'new_connection':
      case 'new-connection':
        navigate('/connections');
        showMessage.success('打开连接管理');
        break;

      case 'test_connection':
      case 'test-connection':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('test-connection', { detail: { connectionId: activeConnectionId } })
          );
        } else {
          showMessage.warning('请先选择一个连接');
        }
        break;

      case 'edit_connection':
      case 'edit-connection':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('edit-connection', { detail: { connectionId: activeConnectionId } })
          );
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
        } else {
          showMessage.warning('请先选择一个连接');
        }
        break;

      case 'refresh_structure':
      case 'refresh-structure':
        if (activeConnectionId) {
          showMessage.info('刷新结构功能开发中...');
          // 触发刷新事件
          document.dispatchEvent(new CustomEvent('refresh-database-tree'));
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'database-info':
      case 'database_info':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('show-database-info', { detail: { connectionId: activeConnectionId } })
          );
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'database_stats':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('show-database-stats', { detail: { connectionId: activeConnectionId } })
          );
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'import_structure':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('import-database-structure', { detail: { connectionId: activeConnectionId } })
          );
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'export_structure':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('export-database-structure', { detail: { connectionId: activeConnectionId } })
          );
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      // 查询菜单
      case 'execute_query':
      case 'execute-query':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('execute-query', { detail: { source: 'menu' } })
          );
          showMessage.info('执行查询...');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'execute_selection':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('execute-selection', { detail: { source: 'menu' } })
          );
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
        break;

      case 'query_plan':
        if (activeConnectionId) {
          document.dispatchEvent(
            new CustomEvent('show-query-plan', { detail: { source: 'menu' } })
          );
        } else {
          showMessage.warning('请先建立数据库连接');
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
        navigate('/settings');
        showMessage.success('切换到主题设置');
        break;

      case 'language_settings':
        navigate('/settings');
        showMessage.success('切换到语言设置');
        break;

      case 'preferences':
        navigate('/settings');
        showMessage.success('切换到首选项');
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

      // 主题切换菜单
      case 'theme-default':
        handleThemeChange('default');
        break;
      case 'theme-green':
        handleThemeChange('green');
        break;
      case 'theme-red':
        handleThemeChange('red');
        break;
      case 'theme-orange':
        handleThemeChange('orange');
        break;
      case 'theme-purple':
        handleThemeChange('purple');
        break;
      case 'theme-rose':
        handleThemeChange('rose');
        break;
      case 'theme-yellow':
        handleThemeChange('yellow');
        break;
      case 'theme-violet':
        handleThemeChange('violet');
        break;

      default:
        // 检查是否是主题切换动作
        if (action.startsWith('theme-')) {
          const themeName = action.replace('theme-', '');
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
    </>
  );
};

export default NativeMenuHandler;
