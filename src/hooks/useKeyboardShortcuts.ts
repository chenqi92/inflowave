import {useEffect, useRef, useCallback} from 'react';
import {useNavigate} from 'react-router-dom';
import {useConnectionStore} from '@/store/connection';
import {showMessage} from '@/utils/message';
import {writeToClipboard} from '@/utils/clipboard';
import logger from '@/utils/logger';
import { useShortcutsTranslation } from './useTranslation';

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
    const {activeConnectionId} = useConnectionStore();

    // 更新快捷键引用
    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    const handleKeyDown = useCallback(
        (event: Event) => {
            const keyboardEvent = event as KeyboardEvent;
            if (!enabled) return;

            // 提前检查：如果是编辑器内的系统快捷键，完全不处理
            const target = keyboardEvent.target as HTMLElement;
            const isInputElement = target.tagName === 'INPUT' ||
                                 target.tagName === 'TEXTAREA' ||
                                 target.isContentEditable ||
                                 target.closest('.cm-editor') ||  // CodeMirror 6
                                 target.closest('.cm-content') ||  // CodeMirror 6 content area
                                 target.closest('.cm6-editor-container') ||  // CodeMirror 6 container
                                 target.closest('.CodeMirror') ||  // Legacy CodeMirror
                                 target.closest('[contenteditable="true"]');

            const isSystemClipboard = (
                (keyboardEvent.ctrlKey || keyboardEvent.metaKey) &&
                ['c', 'v', 'x', 'a', 'z', 'y'].includes(keyboardEvent.key.toLowerCase())
            );

            // 如果是输入元素中的系统快捷键，完全不处理
            if (isInputElement && isSystemClipboard) {
                logger.debug('🔍 [useKeyboardShortcuts] 跳过编辑器内的系统快捷键', {
                    key: keyboardEvent.key,
                    ctrl: keyboardEvent.ctrlKey,
                    meta: keyboardEvent.metaKey,
                });
                return;  // 直接返回，不处理任何快捷键
            }

            const currentShortcuts = shortcutsRef.current;

            for (const shortcut of currentShortcuts) {
                if (shortcut.disabled) continue;

                const keyMatch = keyboardEvent.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = !!shortcut.ctrlKey === !!keyboardEvent.ctrlKey;
                const shiftMatch = !!shortcut.shiftKey === !!keyboardEvent.shiftKey;
                const altMatch = !!shortcut.altKey === !!keyboardEvent.altKey;
                const metaMatch = !!shortcut.metaKey === !!keyboardEvent.metaKey;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
                    if (!isSystemClipboard) {
                        if (shortcut.preventDefault ?? preventDefault) {
                            keyboardEvent.preventDefault();
                        }
                        if (shortcut.stopPropagation ?? stopPropagation) {
                            keyboardEvent.stopPropagation();
                        }
                    }

                    shortcut.callback(keyboardEvent);
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
    const {activeConnectionId} = useConnectionStore();
    const { t: tShortcuts } = useShortcutsTranslation();

    const globalShortcuts: KeyboardShortcut[] = [
        // 导航快捷键
        {
            key: '1',
            ctrlKey: true,
            callback: () => navigate('/dashboard'),
            description: tShortcuts('openDashboard'),
            category: 'navigation',
        },
        {
            key: '2',
            ctrlKey: true,
            callback: () => navigate('/connections'),
            description: tShortcuts('openConnections'),
            category: 'navigation',
        },
        {
            key: '3',
            ctrlKey: true,
            callback: () => navigate('/query'),
            description: tShortcuts('openQuery'),
            category: 'navigation',
        },
        {
            key: '4',
            ctrlKey: true,
            callback: () => navigate('/database'),
            description: tShortcuts('openDatabase'),
            category: 'navigation',
        },
        {
            key: '5',
            ctrlKey: true,
            callback: () => navigate('/visualization'),
            description: tShortcuts('openVisualization'),
            category: 'navigation',
        },
        {
            key: '6',
            ctrlKey: true,
            callback: () => navigate('/performance'),
            description: tShortcuts('openPerformance'),
            category: 'navigation',
        },
        {
            key: '7',
            ctrlKey: true,
            callback: () => {
                // 触发设置弹框打开事件
                const settingsEvent = new CustomEvent('open-settings-modal');
                document.dispatchEvent(settingsEvent);
            },
            description: tShortcuts('openSettings'),
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
                    showMessage.warning(tShortcuts('pleaseConnectFirst'));
                }
            },
            description: tShortcuts('newQuery'),
            category: 'file',
        },
        {
            key: 'n',
            ctrlKey: true,
            shiftKey: true,
            callback: () => navigate('/connections'),
            description: tShortcuts('newConnection'),
            category: 'file',
        },

        // 查询执行快捷键
        {
            key: 'Enter',
            ctrlKey: true,
            callback: event => {
                // 触发查询执行事件
                const executeEvent = new CustomEvent('execute-query', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(executeEvent);
            },
            description: tShortcuts('executeQuery'),
            category: 'query',
        },
        {
            key: 'c',
            ctrlKey: true,
            shiftKey: true,
            callback: () => {
                // 触发停止查询事件
                const stopEvent = new CustomEvent('stop-query', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(stopEvent);
            },
            description: tShortcuts('stopQuery'),
            category: 'query',
        },

        // 全局搜索快捷键
        {
            key: 'p',
            ctrlKey: true,
            shiftKey: true,
            callback: () => {
                const searchEvent = new CustomEvent('open-global-search', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(searchEvent);
            },
            description: tShortcuts('globalSearch'),
            category: 'search',
        },

        // 工具快捷键
        {
            key: 'k',
            ctrlKey: true,
            callback: () => {
                const shortcutsEvent = new CustomEvent('show-shortcuts', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(shortcutsEvent);
            },
            description: tShortcuts('showShortcutsHelp'),
            category: 'tools',
        },

        // 开发者工具快捷键
        {
            key: 'F12',
            callback: () => {
                const devToolsEvent = new CustomEvent('toggle-dev-tools', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(devToolsEvent);
            },
            description: tShortcuts('toggleDevTools'),
            category: 'developer',
        },

        // 刷新快捷键
        {
            key: 'F5',
            callback: () => {
                const refreshEvent = new CustomEvent('refresh-page', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(refreshEvent);
            },
            description: tShortcuts('refreshPage'),
            category: 'general',
        },

        // 窗口管理快捷键
        {
            key: 'b',
            ctrlKey: true,
            callback: () => {
                const toggleSidebarEvent = new CustomEvent('toggle-sidebar', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(toggleSidebarEvent);
            },
            description: tShortcuts('toggleSidebar'),
            category: 'layout',
        },

        // 缩放快捷键
        {
            key: 'Equal', // Plus key
            ctrlKey: true,
            callback: () => {
                const zoomInEvent = new CustomEvent('zoom-in', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(zoomInEvent);
            },
            description: tShortcuts('zoomIn'),
            category: 'view',
        },
        {
            key: 'Minus',
            ctrlKey: true,
            callback: () => {
                const zoomOutEvent = new CustomEvent('zoom-out', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(zoomOutEvent);
            },
            description: tShortcuts('zoomOut'),
            category: 'view',
        },
        {
            key: '0',
            ctrlKey: true,
            callback: () => {
                const resetZoomEvent = new CustomEvent('reset-zoom', {
                    detail: {source: 'keyboard'},
                });
                document.dispatchEvent(resetZoomEvent);
            },
            description: tShortcuts('resetZoom'),
            category: 'view',
        },
    ];

    const {addShortcut, removeShortcut, clearShortcuts} =
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
    const { t: tShortcuts } = useShortcutsTranslation();

    const shortcuts: KeyboardShortcut[] = [
        {
            key: 'Enter',
            ctrlKey: true,
            callback: event => {
                const executeEvent = new CustomEvent('execute-query', {
                    detail: {source: 'editor'},
                });
                document.dispatchEvent(executeEvent);
            },
            description: tShortcuts('executeQuery'),
            category: 'query',
        },
        {
            key: 'l',
            ctrlKey: true,
            callback: () => {
                const formatEvent = new CustomEvent('format-query', {
                    detail: {source: 'editor'},
                });
                document.dispatchEvent(formatEvent);
            },
            description: tShortcuts('formatQuery'),
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
                    writeToClipboard(lineContent, {successMessage: tShortcuts('copiedCurrentLine')});
                }
            },
            description: tShortcuts('copyCurrentLine'),
            category: 'edit',
        },
        {
            key: 'Slash',
            ctrlKey: true,
            callback: () => {
                const commentEvent = new CustomEvent('toggle-comment', {
                    detail: {source: 'editor'},
                });
                document.dispatchEvent(commentEvent);
            },
            description: tShortcuts('toggleComment'),
            category: 'edit',
        },
        {
            key: 's',
            ctrlKey: true,
            callback: () => {
                const saveEvent = new CustomEvent('save-query', {
                    detail: {source: 'editor'},
                });
                document.dispatchEvent(saveEvent);
            },
            description: tShortcuts('saveQuery'),
            category: 'file',
        },
        {
            key: 'o',
            ctrlKey: true,
            callback: () => {
                const openEvent = new CustomEvent('open-query', {
                    detail: {source: 'editor'},
                });
                document.dispatchEvent(openEvent);
            },
            description: tShortcuts('openQuery'),
            category: 'file',
        },
    ];

    return useKeyboardShortcuts(shortcuts, {
        element: editorRef.current,
    });
};

// 数据库浏览器专用快捷键
export const useDatabaseBrowserShortcuts = () => {
    const { t: tShortcuts } = useShortcutsTranslation();

    const shortcuts: KeyboardShortcut[] = [
        {
            key: 'F5',
            callback: () => {
                const refreshEvent = new CustomEvent('refresh-database-tree', {
                    detail: {source: 'browser'},
                });
                document.dispatchEvent(refreshEvent);
            },
            description: tShortcuts('refreshDatabaseStructure'),
            category: 'database',
        },
        {
            key: 'Delete',
            callback: () => {
                const deleteEvent = new CustomEvent('delete-selected-item', {
                    detail: {source: 'browser'},
                });
                document.dispatchEvent(deleteEvent);
            },
            description: tShortcuts('deleteSelectedItem'),
            category: 'database',
        },
        {
            key: 'F2',
            callback: () => {
                const renameEvent = new CustomEvent('rename-selected-item', {
                    detail: {source: 'browser'},
                });
                document.dispatchEvent(renameEvent);
            },
            description: tShortcuts('renameSelectedItem'),
            category: 'database',
        },
        {
            key: 't',
            ctrlKey: true,
            callback: () => {
                const newTableEvent = new CustomEvent('create-new-table', {
                    detail: {source: 'browser'},
                });
                document.dispatchEvent(newTableEvent);
            },
            description: tShortcuts('createNewTable'),
            category: 'database',
        },
    ];

    return useKeyboardShortcuts(shortcuts);
};

export default useKeyboardShortcuts;
