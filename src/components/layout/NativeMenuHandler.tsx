import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
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
  onGlobalSearch,
}) => {
  const navigate = useNavigate();
  const { activeConnectionId } = useConnectionStore();
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  useEffect(() => {
    const unlisten = listen('menu-action', (event) => {
      const action = event.payload as string;
      handleMenuAction(action);
    });

    return () => {
      unlisten.then(fn => fn());
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
        if (onToggleSidebar) {
          onToggleSidebar();
        }
        break;

      case 'toggle_statusbar':
        if (onToggleStatusbar) {
          onToggleStatusbar();
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
        navigate('/connections');
        break;

      case 'test_connection':
        if (activeConnectionId) {
          // TODO: 实现测试连接功能
          showMessage.info('测试连接功能开发中...');
        } else {
          showMessage.warning('请先选择一个连接');
        }
        break;

      case 'refresh_structure':
        if (activeConnectionId) {
          // TODO: 实现刷新结构功能
          showMessage.info('刷新结构功能开发中...');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'execute_query':
        if (activeConnectionId) {
          // TODO: 实现执行查询功能
          showMessage.info('执行查询功能开发中...');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'stop_query':
        // TODO: 实现停止查询功能
        showMessage.info('停止查询功能开发中...');
        break;

      case 'view_table_structure':
        if (activeConnectionId) {
          navigate('/database');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      case 'view_table_data':
        if (activeConnectionId) {
          navigate('/query');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
        break;

      // 工具菜单
      case 'keyboard_shortcuts':
        setShortcutsVisible(true);
        break;

      // 帮助菜单
      case 'user_manual':
        // TODO: 打开用户手册
        showMessage.info('用户手册开发中...');
        break;

      case 'quick_start':
        // TODO: 打开快速入门
        showMessage.info('快速入门开发中...');
        break;

      case 'shortcuts_help':
        setShortcutsVisible(true);
        break;

      case 'check_updates':
        // TODO: 检查更新
        showMessage.info('检查更新功能开发中...');
        break;

      case 'report_issue':
        // TODO: 反馈问题
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
        visible={shortcutsVisible}
        onClose={() => setShortcutsVisible(false)}
      />
      <AboutDialog
        visible={aboutVisible}
        onClose={() => setAboutVisible(false)}
      />
    </>
  );
};

export default NativeMenuHandler;
