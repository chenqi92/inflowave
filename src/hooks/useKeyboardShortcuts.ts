import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  callback: (event: KeyboardEvent) => void;
  description?: string;
  category?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  element?: HTMLElement | null;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const {
    enabled = true,
    element = null,
    preventDefault = true,
    stopPropagation = true,
  } = options;

  const shortcutsRef = useRef<KeyboardShortcut[]>([]);
  const navigate = useNavigate();
  const { activeConnectionId } = useConnectionStore();

  // 更新快捷键引用
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const currentShortcuts = shortcutsRef.current;

      for (const shortcut of currentShortcuts) {
        if (shortcut.disabled) continue;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === !!event.ctrlKey;
        const shiftMatch = !!shortcut.shiftKey === !!event.shiftKey;
        const altMatch = !!shortcut.altKey === !!event.altKey;
        const metaMatch = !!shortcut.metaKey === !!event.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (shortcut.preventDefault ?? preventDefault) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation ?? stopPropagation) {
            event.stopPropagation();
          }

          shortcut.callback(event);
          break;
        }
      }
    },
    [enabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    const target = element || document;
    target.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [element, handleKeyDown]);

  return {
    addShortcut: (shortcut: KeyboardShortcut) => {
      shortcutsRef.current = [...shortcutsRef.current, shortcut];
    },
    removeShortcut: (key: string) => {
      shortcutsRef.current = shortcutsRef.current.filter(s => s.key !== key);
    },
    clearShortcuts: () => {
      shortcutsRef.current = [];
    },
  };
};

// 全局快捷键hook
export const useGlobalShortcuts = () => {
  const navigate = useNavigate();
  const { activeConnectionId } = useConnectionStore();

  const globalShortcuts: KeyboardShortcut[] = [
    // 导航快捷键
    {
      key: '1',
      ctrlKey: true,
      callback: () => navigate('/dashboard'),
      description: '打开仪表板',
      category: 'navigation',
    },
    {
      key: '2',
      ctrlKey: true,
      callback: () => navigate('/connections'),
      description: '打开连接管理',
      category: 'navigation',
    },
    {
      key: '3',
      ctrlKey: true,
      callback: () => navigate('/query'),
      description: '打开数据查询',
      category: 'navigation',
    },
    {
      key: '4',
      ctrlKey: true,
      callback: () => navigate('/database'),
      description: '打开数据库管理',
      category: 'navigation',
    },
    {
      key: '5',
      ctrlKey: true,
      callback: () => navigate('/visualization'),
      description: '打开数据可视化',
      category: 'navigation',
    },
    {
      key: '6',
      ctrlKey: true,
      callback: () => navigate('/performance'),
      description: '打开性能监控',
      category: 'navigation',
    },
    {
      key: '7',
      ctrlKey: true,
      callback: () => navigate('/settings'),
      description: '打开应用设置',
      category: 'navigation',
    },

    // 文件操作快捷键
    {
      key: 'n',
      ctrlKey: true,
      callback: () => {
        if (activeConnectionId) {
          navigate('/query');
        } else {
          showMessage.warning('请先建立数据库连接');
        }
      },
      description: '新建查询',
      category: 'file',
    },
    {
      key: 'n',
      ctrlKey: true,
      shiftKey: true,
      callback: () => navigate('/connections'),
      description: '新建连接',
      category: 'file',
    },

    // 查询执行快捷键
    {
      key: 'Enter',
      ctrlKey: true,
      callback: event => {
        // 触发查询执行事件
        const executeEvent = new CustomEvent('execute-query', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(executeEvent);
      },
      description: '执行查询',
      category: 'query',
    },
    {
      key: 'c',
      ctrlKey: true,
      shiftKey: true,
      callback: () => {
        // 触发停止查询事件
        const stopEvent = new CustomEvent('stop-query', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(stopEvent);
      },
      description: '停止查询',
      category: 'query',
    },

    // 全局搜索快捷键
    {
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      callback: () => {
        const searchEvent = new CustomEvent('open-global-search', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(searchEvent);
      },
      description: '全局搜索',
      category: 'search',
    },

    // 工具快捷键
    {
      key: 'k',
      ctrlKey: true,
      callback: () => {
        const shortcutsEvent = new CustomEvent('show-shortcuts', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(shortcutsEvent);
      },
      description: '显示快捷键帮助',
      category: 'tools',
    },

    // 开发者工具快捷键
    {
      key: 'F12',
      callback: () => {
        const devToolsEvent = new CustomEvent('toggle-dev-tools', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(devToolsEvent);
      },
      description: '切换开发者工具',
      category: 'developer',
    },

    // 刷新快捷键
    {
      key: 'F5',
      callback: () => {
        const refreshEvent = new CustomEvent('refresh-page', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(refreshEvent);
      },
      description: '刷新页面',
      category: 'general',
    },

    // 窗口管理快捷键
    {
      key: 'b',
      ctrlKey: true,
      callback: () => {
        const toggleSidebarEvent = new CustomEvent('toggle-sidebar', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(toggleSidebarEvent);
      },
      description: '切换侧边栏',
      category: 'layout',
    },

    // 缩放快捷键
    {
      key: 'Equal', // Plus key
      ctrlKey: true,
      callback: () => {
        const zoomInEvent = new CustomEvent('zoom-in', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(zoomInEvent);
      },
      description: '放大',
      category: 'view',
    },
    {
      key: 'Minus',
      ctrlKey: true,
      callback: () => {
        const zoomOutEvent = new CustomEvent('zoom-out', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(zoomOutEvent);
      },
      description: '缩小',
      category: 'view',
    },
    {
      key: '0',
      ctrlKey: true,
      callback: () => {
        const resetZoomEvent = new CustomEvent('reset-zoom', {
          detail: { source: 'keyboard' },
        });
        document.dispatchEvent(resetZoomEvent);
      },
      description: '重置缩放',
      category: 'view',
    },
  ];

  const { addShortcut, removeShortcut, clearShortcuts } =
    useKeyboardShortcuts(globalShortcuts);

  return {
    shortcuts: globalShortcuts,
    addShortcut,
    removeShortcut,
    clearShortcuts,
  };
};

// 查询编辑器专用快捷键
export const useQueryEditorShortcuts = (editorRef: React.RefObject<any>) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      ctrlKey: true,
      callback: event => {
        const executeEvent = new CustomEvent('execute-query', {
          detail: { source: 'editor' },
        });
        document.dispatchEvent(executeEvent);
      },
      description: '执行查询',
      category: 'query',
    },
    {
      key: 'l',
      ctrlKey: true,
      callback: () => {
        const formatEvent = new CustomEvent('format-query', {
          detail: { source: 'editor' },
        });
        document.dispatchEvent(formatEvent);
      },
      description: '格式化查询',
      category: 'query',
    },
    {
      key: 'd',
      ctrlKey: true,
      callback: () => {
        if (editorRef.current) {
          // 复制当前行
          const selection = editorRef.current.getSelection();
          const lineContent = editorRef.current.getLineContent(
            selection.startLineNumber
          );
          writeToClipboard(lineContent, { successMessage: '已复制当前行' });
        }
      },
      description: '复制当前行',
      category: 'edit',
    },
    {
      key: 'Slash',
      ctrlKey: true,
      callback: () => {
        const commentEvent = new CustomEvent('toggle-comment', {
          detail: { source: 'editor' },
        });
        document.dispatchEvent(commentEvent);
      },
      description: '切换注释',
      category: 'edit',
    },
    {
      key: 's',
      ctrlKey: true,
      callback: () => {
        const saveEvent = new CustomEvent('save-query', {
          detail: { source: 'editor' },
        });
        document.dispatchEvent(saveEvent);
      },
      description: '保存查询',
      category: 'file',
    },
    {
      key: 'o',
      ctrlKey: true,
      callback: () => {
        const openEvent = new CustomEvent('open-query', {
          detail: { source: 'editor' },
        });
        document.dispatchEvent(openEvent);
      },
      description: '打开查询',
      category: 'file',
    },
  ];

  return useKeyboardShortcuts(shortcuts, {
    element: editorRef.current,
  });
};

// 数据库浏览器专用快捷键
export const useDatabaseBrowserShortcuts = () => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'F5',
      callback: () => {
        const refreshEvent = new CustomEvent('refresh-database-tree', {
          detail: { source: 'browser' },
        });
        document.dispatchEvent(refreshEvent);
      },
      description: '刷新数据库结构',
      category: 'database',
    },
    {
      key: 'Delete',
      callback: () => {
        const deleteEvent = new CustomEvent('delete-selected-item', {
          detail: { source: 'browser' },
        });
        document.dispatchEvent(deleteEvent);
      },
      description: '删除选中项',
      category: 'database',
    },
    {
      key: 'F2',
      callback: () => {
        const renameEvent = new CustomEvent('rename-selected-item', {
          detail: { source: 'browser' },
        });
        document.dispatchEvent(renameEvent);
      },
      description: '重命名选中项',
      category: 'database',
    },
    {
      key: 't',
      ctrlKey: true,
      callback: () => {
        const newTableEvent = new CustomEvent('create-new-table', {
          detail: { source: 'browser' },
        });
        document.dispatchEvent(newTableEvent);
      },
      description: '创建新表',
      category: 'database',
    },
  ];

  return useKeyboardShortcuts(shortcuts);
};

export default useKeyboardShortcuts;
