import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeTauriListen } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useConnectionStore } from '@/store/connection';
import KeyboardShortcuts from '@/components/common/KeyboardShortcuts';
import AboutDialog from '@/components/common/AboutDialog';

interface NativeMenuHandlerProps {
  onToggleSidebar?: () => void;
  onToggleStatusbar?: () => void;
  onGlobalSearch?: () => void;
}

const NativeMenuHandler: React.FC<NativeMenuHandlerProps> = ({
  onToggleSidebar,
  onToggleStatusbar,
  onGlobalSearch}) => {
  const navigate = useNavigate();
  const { activeConnectionId } = useConnectionStore();
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      unlistenFn = await safeTauriListen<string>('menu-action', (event) => {
        const action = event.payload;
        handleMenuAction(action);
      });
    };

    setupListener();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [navigate, activeConnectionId]);

  const handleMenuAction = (action: string) => {
    console.log('处理菜单动作:', action);

    // 导航动作
    if (action.startsWith('navigate:')) {
      const path = action.replace('navigate:', '');
      navigate(path);
      return;
    }

    // 视图切换动作
    if (action.startsWith('view:')) {
      const view = action.replace('view:', '');
      const viewMap: Record<string, string> = {
        'datasource': '/connections',
        'query': '/query',
        'visualization': '/visualization',
        'performance': '/performance'
      };
      if (viewMap[view]) {
        navigate(viewMap[view]);
        showMessage.success(`切换到${view === 'datasource' ? '数据源管理' : view === 'query' ? '查询编辑器' : view === 'visualization' ? '数据可视化' : '性能监控'}`);
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
        break;

      case 'open_file':
        // TODO: 实现打开文件功能
        showMessage.info('打开文件功能开发中...');
        break;

      case 'save':
        // TODO: 实现保存功能
        showMessage.info('保存功能开发中...');
        break;

      case 'save_as':
        // TODO: 实现另存为功能
        showMessage.info('另存为功能开发中...');
        break;

      case 'import_data':
        // TODO: 实现导入数据功能
        showMessage.info('导入数据功能开发中...');
        break;

      case 'export_data':
        // TODO: 实现导出数据功能
        showMessage.info('导出数据功能开发中...');
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
            bubbles: true
          });
          document.activeElement.dispatchEvent(event);
        }
        break;

      case 'replace':
        // TODO: 实现替换功能
        showMessage.info('替换功能开发中...');
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
        // TODO: 实现放大功能
        showMessage.info('放大功能开发中...');
        break;

      case 'zoom_out':
        // TODO: 实现缩小功能
        showMessage.info('缩小功能开发中...');
        break;

      case 'zoom_reset':
        // TODO: 实现重置缩放功能
        showMessage.info('重置缩放功能开发中...');
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
          showMessage.info('测试连接功能开发中...');
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
        if (activeConnectionId) {
          showMessage.info('数据库信息功能开发中...');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      // 查询菜单
      case 'execute_query':
      case 'execute-query':
        if (activeConnectionId) {
          document.dispatchEvent(new CustomEvent('execute-query', { detail: { source: 'menu' } }));
          showMessage.info('执行查询...');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'stop_query':
      case 'stop-query':
        document.dispatchEvent(new CustomEvent('stop-query', { detail: { source: 'menu' } }));
        showMessage.info('已停止查询');
        break;

      case 'query-history':
        showMessage.info('查询历史功能开发中...');
        break;

      case 'save-query':
        document.dispatchEvent(new CustomEvent('save-query', { detail: { source: 'menu' } }));
        break;

      // 工具菜单
      case 'keyboard_shortcuts':
      case 'shortcuts':
        setShortcutsVisible(true);
        break;

      case 'console':
        showMessage.info('控制台功能开发中...');
        break;

      case 'dev-tools':
        document.dispatchEvent(new CustomEvent('toggle-dev-tools'));
        break;

      // 帮助菜单
      case 'user_manual':
      case 'user-manual':
        showMessage.info('用户手册开发中...');
        break;

      case 'quick_start':
      case 'quick-start':
        showMessage.info('快速入门开发中...');
        break;

      case 'shortcuts_help':
      case 'shortcuts-help':
        setShortcutsVisible(true);
        break;

      case 'check_updates':
      case 'check-updates':
        showMessage.info('检查更新功能开发中...');
        break;

      case 'report_issue':
      case 'report-issue':
        showMessage.info('反馈问题功能开发中...');
        break;

      case 'about':
        setAboutVisible(true);
        break;

      default:
        console.log('未处理的菜单动作:', action);
        break;
    }
  };

  return (
    <>
      <KeyboardShortcuts
        open={shortcutsVisible}
        onClose={() => setShortcutsVisible(false)}
      />
      <AboutDialog
        open={aboutVisible}
        onClose={() => setAboutVisible(false)}
      />
    </>
  );
};

export default NativeMenuHandler;
