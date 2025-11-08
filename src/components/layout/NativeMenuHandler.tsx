import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { safeTauriListen, safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { getFileOperationError, formatErrorMessage } from '@/utils/userFriendlyErrors';
import { useConnectionStore } from '@/store/connection';
import { useSettingsStore } from '@/store/settings';
import { useTheme } from '@/components/providers/ThemeProvider';
import { openExternalLink, openIssueReport, openDocumentation } from '@/utils/externalLinks';
// import KeyboardShortcuts from '@/components/common/KeyboardShortcuts';
import AboutDialog from '@/components/common/AboutDialog';
import SettingsModal from '@/components/common/SettingsModal';
import SampleQueriesModal from '@/components/common/SampleQueriesModal';
import { useSettingsTranslation, useMenuTranslation } from '@/hooks/useTranslation';

import { logger } from '@/utils/logger';
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
  const { t } = useSettingsTranslation();
  const { t: tMenu } = useMenuTranslation();
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
  const [settingsInitialTab, setSettingsInitialTab] = useState('general');
  const [sampleQueriesVisible, setSampleQueriesVisible] = useState(false);
  const setupRef = useRef(false);

  useEffect(() => {
    let unlistenMenuFn: (() => void) | null = null;
    let unlistenThemeFn: (() => void) | null = null;

    const setupListeners = async () => {
      if (setupRef.current) {
        logger.debug('⚠️ 菜单监听器已设置，跳过重复设置 (React StrictMode)');
        return;
      }
      setupRef.current = true;
      
      logger.debug('🎛️ 设置原生菜单监听器...');

      try {
        // 监听菜单动作事件
        unlistenMenuFn = await safeTauriListen<string>('menu-action', event => {
          logger.debug('📋 收到菜单动作事件:', event);
          logger.debug('📋 菜单动作详情:', {
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
          logger.render('收到主题切换事件:', event);
          const themeName = event.payload;
          handleThemeChange(themeName);
        });

        logger.info('原生菜单监听器设置完成');
      } catch (error) {
        logger.error('设置菜单监听器失败:', error);
        setupRef.current = false; // 设置失败时重置，允许重试
      }
    };

    setupListeners();

    // 监听自定义设置弹框事件
    const handleOpenSettings = () => {
      setSettingsInitialTab('general');
      setSettingsVisible(true);
      showMessage.success(tMenu('native.openAppSettings'));
    };

    document.addEventListener('open-settings-modal', handleOpenSettings);

    return () => {
      logger.debug('清理菜单监听器...');
      if (unlistenMenuFn) {
        unlistenMenuFn();
      }
      if (unlistenThemeFn) {
        unlistenThemeFn();
      }
      document.removeEventListener('open-settings-modal', handleOpenSettings);
      setupRef.current = false; // 组件卸载时重置标志
    };
  }, []); // 移除依赖，只在组件挂载时设置一次监听器

  // 风格切换处理函数
  const handleThemeChange = async (themeName: string) => {
    logger.render('切换风格:', themeName);

    // 设置颜色方案
    setColorScheme(themeName);

    // 重建菜单以更新勾选状态
    try {
      await safeTauriInvoke('rebuild_native_menu');
      logger.debug('✅ 菜单已重建，勾选状态已更新');
    } catch (error) {
      logger.error('❌ 重建菜单失败:', error);
    }

    // 显示成功消息 - 使用 i18n
    const themeLabel = t(`theme_style_${themeName}`) || themeName;
    showMessage.success(t('common:success') + ': ' + themeLabel);
  };

  // 模式切换处理函数
  const handleModeChange = async (mode: 'system' | 'light' | 'dark') => {
    logger.debug('🌓 切换模式:', mode);

    // 设置模式
    setTheme(mode);

    // 重建菜单以更新勾选状态
    try {
      await safeTauriInvoke('rebuild_native_menu');
      logger.debug('✅ 菜单已重建，勾选状态已更新');
    } catch (error) {
      logger.error('❌ 重建菜单失败:', error);
    }

    // 显示成功消息
    const modeLabel = tMenu(`native.modeSwitch.${mode}`);
    showMessage.success(tMenu('native.modeSwitch.success', { mode: modeLabel }));
  };

  // 语言切换处理函数
  const handleLanguageChange = async (locale: string, label: string) => {
    logger.debug('🌐 切换语言:', locale, label);

    try {
      // 使用 i18n store 的语言切换功能
      const { useI18nStore } = await import('@/i18n/store');
      const { setLanguage } = useI18nStore.getState();

      await setLanguage(locale);

      // 重建菜单以更新勾选状态和语言
      try {
        await safeTauriInvoke('rebuild_native_menu');
        logger.debug('✅ 菜单已重建，语言和勾选状态已更新');
      } catch (error) {
        logger.error('❌ 重建菜单失败:', error);
      }

      // 显示成功消息
      showMessage.success(tMenu('native.languageSwitch.success', { label }));
    } catch (error) {
      logger.error('语言切换失败:', error);
      showMessage.error(tMenu('native.languageSwitch.failed'));
    }
  };



  // 文件操作处理函数
  const handleOpenFile = async () => {
    try {
      logger.debug('尝试打开文件对话框...');
      const result = await safeTauriInvoke('open_file_dialog', {
        title: tMenu('native.fileOperations.openFileTitle'),
        filters: [
          { name: tMenu('native.fileOperations.sqlFiles'), extensions: ['sql'] },
          { name: tMenu('native.fileOperations.textFiles'), extensions: ['txt'] },
          { name: tMenu('native.fileOperations.allFiles'), extensions: ['*'] }
        ],
        multiple: false
      });

      logger.debug('📁 文件对话框结果:', result);

      if (result && result.path) {
        logger.debug('📖 读取文件内容:', result.path);
        const content = await safeTauriInvoke('read_file', { path: result.path });
        // 通过自定义事件传递文件内容到查询编辑器
        document.dispatchEvent(new CustomEvent('open-file-content', {
          detail: { content, filename: result.path }
        }));
        showMessage.success(tMenu('native.fileOperations.fileOpened'));
      } else {
        // 用户取消选择，静默处理，不显示错误信息
        logger.debug('用户取消了文件选择');
      }
    } catch (error) {
      logger.error('打开文件失败:', error);
      const friendlyError = getFileOperationError(String(error), 'read');
      showMessage.error(formatErrorMessage(friendlyError));
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
      logger.debug('📥 尝试打开数据导入对话框...');
      const result = await safeTauriInvoke('open_file_dialog', {
        title: tMenu('native.dataOperations.importDataTitle'),
        filters: [
          { name: tMenu('native.fileOperations.csvFiles'), extensions: ['csv'] },
          { name: tMenu('native.fileOperations.jsonFiles'), extensions: ['json'] },
          { name: tMenu('native.fileOperations.allFiles'), extensions: ['*'] }
        ],
        multiple: false
      });

      logger.debug('📥 数据导入对话框结果:', result);

      if (result && result.path) {
        // 导航到数据导入页面或显示导入对话框
        document.dispatchEvent(new CustomEvent('import-data-file', {
          detail: { path: result.path }
        }));
        showMessage.success(tMenu('native.dataOperations.prepareImport'));
      } else {
        // 用户取消导入，静默处理
        logger.debug('用户取消了数据导入');
      }
    } catch (error) {
      logger.error('导入数据失败:', error);
      const friendlyError = getFileOperationError(String(error), 'select');
      showMessage.error(formatErrorMessage(friendlyError));
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
      showMessage.warning(tMenu('native.queryOperations.dbDisconnectedWarning'));
    } else {
      showMessage.warning(tMenu('native.queryOperations.needConnectionWarning'));
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
    showMessage.success(tMenu('native.zoomOperations.zoomIn', { zoom: Math.round(newZoom * 100) }));
  };

  const handleZoomOut = () => {
    const currentZoom = parseFloat(document.body.style.zoom || '1');
    const newZoom = Math.max(currentZoom - 0.1, 0.5);
    document.body.style.zoom = newZoom.toString();
    showMessage.success(tMenu('native.zoomOperations.zoomOut', { zoom: Math.round(newZoom * 100) }));
  };

  const handleZoomReset = () => {
    document.body.style.zoom = '1';
    showMessage.success(tMenu('native.zoomOperations.resetZoom'));
  };

  // 帮助系统处理函数
  const handleUserManual = () => {
    // 触发用户引导弹框
    document.dispatchEvent(new CustomEvent('show-user-guide'));
    showMessage.success(tMenu('native.helpSystem.openUserGuide'));
  };

  const handleQuickStart = () => {
    document.dispatchEvent(new CustomEvent('show-quick-start'));
    showMessage.success(tMenu('native.helpSystem.openQuickStart'));
  };

  const handleCheckUpdates = async () => {
    try {
      const result = await safeTauriInvoke('check_for_app_updates');
      if (result.available && !result.is_skipped) {
        showMessage.info(tMenu('native.helpSystem.newVersionFound', { version: result.latest_version }));
      } else if (result.is_skipped) {
        showMessage.info(tMenu('native.helpSystem.versionSkipped', { version: result.latest_version }));
      } else {
        showMessage.success(tMenu('native.helpSystem.latestVersion'));
      }
    } catch (error) {
      showMessage.error(tMenu('native.helpSystem.checkUpdateFailed', { error }));
    }
  };

  const handleReportIssue = async () => {
    await openIssueReport('https://github.com/chenqi92/inflowave/issues');
  };

  const handleMenuAction = async (action: string) => {
    logger.debug('🎯 处理菜单动作:', action);
    
    // 获取详细的连接状态信息
    const activeConnectionStatus = activeConnectionId ? getConnectionStatus(activeConnectionId) : null;
    const isConnected = activeConnectionId ? isConnectionConnected(activeConnectionId) : false;
    
    logger.debug('当前连接状态:', { 
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
        showMessage.warning(tMenu('native.connectionRequirements.needSelection'));
        return;
      }
      if (!hasActiveConnection) {
        showMessage.warning(tMenu('native.connectionRequirements.needActiveConnection'));
        return;
      }
    }

    if (selectedConnectionRequiredActions.includes(action) && !hasSelectedConnection) {
      showMessage.warning(tMenu('native.connectionRequirements.needSelection'));
      return;
    }

    // 导航动作
    if (action.startsWith('navigate:')) {
      const path = action.replace('navigate:', '');
      logger.debug('🧭 导航到:', path);
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
        const viewLabelMap: Record<string, string> = {
          datasource: 'datasource',
          query: 'query',
          visualization: 'visualization',
          performance: 'monitoring',
        };
        const viewLabel = tMenu(`native.viewSwitch.${viewLabelMap[view]}`);
        showMessage.success(tMenu('native.viewSwitch.switchTo', { view: viewLabel }));
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
        // 安全的撤销操作 - 避免使用execCommand
        logger.debug('🎯 原生菜单触发撤销操作');
        try {
          // 检查当前焦点元素是否是Monaco编辑器
          const activeElement = document.activeElement;
          if (activeElement && activeElement.closest('.monaco-editor')) {
            // 如果是Monaco编辑器，触发Ctrl+Z快捷键
            const undoEvent = new KeyboardEvent('keydown', {
              key: 'z',
              ctrlKey: true,
              bubbles: true
            });
            activeElement.dispatchEvent(undoEvent);
          } else {
            // 对于其他元素，尝试触发撤销快捷键
            document.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'z',
              ctrlKey: true,
              bubbles: true
            }));
          }
        } catch (error) {
          logger.warn('撤销操作失败:', error);
        }
        handled = true;
        break;

      case 'redo':
        // 安全的重做操作 - 避免使用execCommand
        logger.debug('🎯 原生菜单触发重做操作');
        try {
          // 检查当前焦点元素是否是Monaco编辑器
          const activeElement = document.activeElement;
          if (activeElement && activeElement.closest('.monaco-editor')) {
            // 如果是Monaco编辑器，触发Ctrl+Y快捷键
            const redoEvent = new KeyboardEvent('keydown', {
              key: 'y',
              ctrlKey: true,
              bubbles: true
            });
            activeElement.dispatchEvent(redoEvent);
          } else {
            // 对于其他元素，尝试触发重做快捷键
            document.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'y',
              ctrlKey: true,
              bubbles: true
            }));
          }
        } catch (error) {
          logger.warn('重做操作失败:', error);
        }
        handled = true;
        break;

      case 'cut':
        // 安全的剪切操作 - 只处理菜单触发的剪切，不干扰键盘快捷键
        logger.debug('🎯 原生菜单触发剪切操作');
        try {
          // 检查当前焦点元素
          const activeElement = document.activeElement;

          // 如果是输入元素，使用选择文本剪切
          if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            (activeElement as HTMLElement).isContentEditable
          )) {
            // 对于输入元素，获取选中的文本并剪切
            const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
            const start = inputElement.selectionStart || 0;
            const end = inputElement.selectionEnd || 0;
            const selectedText = inputElement.value.substring(start, end);
            if (selectedText) {
              // 复制到剪贴板
              import('@/utils/clipboard').then(({ writeToClipboard }) => {
                writeToClipboard(selectedText, { showSuccess: false });
              });
              // 删除选中的文本
              const newValue = inputElement.value.substring(0, start) + inputElement.value.substring(end);
              inputElement.value = newValue;
              inputElement.selectionStart = inputElement.selectionEnd = start;
              // 触发input事件
              inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } else if (activeElement && (
            activeElement.closest('.cm-editor') ||
            activeElement.closest('.cm-content') ||
            activeElement.closest('.cm6-editor-container')
          )) {
            // 如果是CodeMirror编辑器，使用浏览器原生剪切
            try {
              document.execCommand('cut');
            } catch (err) {
              logger.warn('execCommand cut 失败，尝试使用Clipboard API');
              // 如果execCommand失败，尝试使用Clipboard API
              const selection = window.getSelection();
              if (selection && selection.toString()) {
                import('@/utils/clipboard').then(({ writeToClipboard }) => {
                  writeToClipboard(selection.toString(), { showSuccess: false });
                });
              }
            }
          } else {
            // 对于其他元素，尝试安全的剪切操作
            const selection = window.getSelection();
            if (selection && selection.toString()) {
              import('@/utils/clipboard').then(({ writeToClipboard }) => {
                writeToClipboard(selection.toString(), { showSuccess: false });
                // 删除选中的文本（如果可能）
                selection.deleteFromDocument();
              });
            }
          }
        } catch (error) {
          logger.warn('剪切操作失败:', error);
        }
        handled = true;
        break;

      case 'copy':
        // 安全的复制操作 - 只处理菜单触发的复制，不干扰键盘快捷键
        logger.debug('🎯 原生菜单触发复制操作');
        try {
          // 检查当前焦点元素
          const activeElement = document.activeElement;

          // 如果是输入元素，使用选择文本复制
          if (activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            (activeElement as HTMLElement).isContentEditable
          )) {
            // 对于输入元素，获取选中的文本并复制
            const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
            const selectedText = inputElement.value.substring(
              inputElement.selectionStart || 0,
              inputElement.selectionEnd || 0
            );
            if (selectedText) {
              import('@/utils/clipboard').then(({ writeToClipboard }) => {
                writeToClipboard(selectedText, { showSuccess: false });
              });
            }
          } else if (activeElement && (
            activeElement.closest('.cm-editor') ||
            activeElement.closest('.cm-content') ||
            activeElement.closest('.cm6-editor-container')
          )) {
            // 如果是CodeMirror编辑器，使用浏览器原生复制
            try {
              document.execCommand('copy');
            } catch (err) {
              logger.warn('execCommand copy 失败，尝试使用Clipboard API');
              // 如果execCommand失败，尝试使用Clipboard API
              const selection = window.getSelection();
              if (selection && selection.toString()) {
                import('@/utils/clipboard').then(({ writeToClipboard }) => {
                  writeToClipboard(selection.toString(), { showSuccess: false });
                });
              }
            }
          } else {
            // 对于其他元素，复制选中的文本
            const selection = window.getSelection();
            if (selection && selection.toString()) {
              import('@/utils/clipboard').then(({ writeToClipboard }) => {
                writeToClipboard(selection.toString(), { showSuccess: false });
              });
            }
          }
        } catch (error) {
          logger.warn('复制操作失败:', error);
        }
        handled = true;
        break;

      case 'paste':
        // 安全的粘贴操作 - 只处理菜单触发的粘贴，不干扰键盘快捷键
        logger.debug('🎯 原生菜单触发粘贴操作');
        try {
          // 检查当前焦点元素
          const activeElement = document.activeElement;

          // 处理CodeMirror编辑器的粘贴
          if (activeElement && (
            activeElement.closest('.cm-editor') ||
            activeElement.closest('.cm-content') ||
            activeElement.closest('.cm6-editor-container')
          )) {
            // 如果是CodeMirror编辑器，使用浏览器原生粘贴
            try {
              document.execCommand('paste');
              logger.debug('CodeMirror编辑器粘贴事件已触发');
            } catch (err) {
              logger.warn('execCommand paste 失败，尝试使用Clipboard API');
              // 如果execCommand失败，尝试使用Clipboard API
              import('@/utils/clipboard').then(({ readFromClipboard }) => {
                readFromClipboard().then(text => {
                  if (text) {
                    // 触发input事件，让CodeMirror处理
                    const inputEvent = new InputEvent('input', {
                      data: text,
                      bubbles: true,
                      cancelable: true
                    });
                    activeElement.dispatchEvent(inputEvent);
                  }
                });
              });
            }
          } else {
            // 对于其他输入元素，使用浏览器默认行为
            logger.debug('非CodeMirror编辑器元素，使用浏览器默认粘贴');
            // 触发键盘事件
            if (activeElement && (
              activeElement.tagName === 'INPUT' ||
              activeElement.tagName === 'TEXTAREA' ||
              (activeElement as HTMLElement).isContentEditable
            )) {
              const keyEvent = new KeyboardEvent('keydown', {
                key: 'v',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
              });
              activeElement.dispatchEvent(keyEvent);
            }
          }
        } catch (error) {
          logger.warn('粘贴操作失败:', error);
        }
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
        showMessage.success(tMenu('native.connectionOperations.openConnectionManagement'));
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
          showMessage.warning(tMenu('native.connectionOperations.selectConnectionFirst'));
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
          showMessage.warning(tMenu('native.connectionOperations.selectConnectionFirst'));
        }
        break;

      case 'refresh_structure':
      case 'refresh-structure':
        if (activeConnectionId && isConnected) {
          showMessage.info(tMenu('native.databaseOperations.refreshingStructure'));
          // 触发刷新事件
          document.dispatchEvent(new CustomEvent('refresh-database-tree'));
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.databaseOperations.establishConnectionFirst'));
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
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.databaseOperations.establishConnectionFirst'));
        }
        break;

      case 'database_stats':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('show-database-stats', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.databaseOperations.establishConnectionFirst'));
        }
        break;

      case 'import_structure':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('import-database-structure', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.databaseOperations.establishConnectionFirst'));
        }
        break;

      case 'export_structure':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('export-database-structure', { detail: { connectionId: activeConnectionId } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.databaseOperations.establishConnectionFirst'));
        }
        break;

      // 查询菜单
      case 'execute_query':
      case 'execute-query':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('execute-query', { detail: { source: 'menu' } })
          );
          showMessage.info(tMenu('native.queryActions.executingQuery'));
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.databaseOperations.establishConnectionFirst'));
        }
        break;

      case 'execute_selection':
        if (activeConnectionId && isConnected) {
          document.dispatchEvent(
            new CustomEvent('execute-selection', { detail: { source: 'menu' } })
          );
          handled = true;
        } else if (activeConnectionId && !isConnected) {
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.databaseOperations.establishConnectionFirst'));
        }
        break;

      case 'stop_query':
      case 'stop-query':
        document.dispatchEvent(
          new CustomEvent('stop-query', { detail: { source: 'menu' } })
        );
        showMessage.info(tMenu('native.queryActions.queryStopped'));
        handled = true;
        break;

      case 'query_history':
      case 'query-history':
        document.dispatchEvent(
          new CustomEvent('show-query-history', { detail: { source: 'menu' } })
        );
        handled = true;
        break;

      case 'save_query':
      case 'save-query':
        document.dispatchEvent(
          new CustomEvent('save-query', { detail: { source: 'menu' } })
        );
        handled = true;
        break;

      case 'query_favorites':
        handleQueryFavorites();
        handled = true;
        break;

      case 'format_query':
        handleFormatQuery();
        handled = true;
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
          showMessage.warning(tMenu('native.databaseOperations.dbDisconnected'));
        } else {
          showMessage.warning(tMenu('native.queryActions.queryPlanNeedsConnection'));
        }
        break;

      // 工具菜单
      case 'keyboard_shortcuts':
      case 'shortcuts':
        setShortcutsVisible(true);
        handled = true;
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
        handled = true;
        break;

      case 'query_performance':
        navigate('/performance');
        showMessage.success(tMenu('native.navigationMessages.switchToPerformance'));
        handled = true;
        break;

      case 'extensions':
        navigate('/extensions');
        showMessage.success(tMenu('native.navigationMessages.switchToExtensions'));
        handled = true;
        break;

      case 'theme_settings':
        // 打开设置弹框
        setSettingsInitialTab('general');
        setSettingsVisible(true);
        showMessage.success(tMenu('native.navigationMessages.openThemeSettings'));
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
        setSettingsInitialTab('general');
        setSettingsVisible(true);
        showMessage.success(tMenu('native.navigationMessages.openPreferences'));
        handled = true;
        break;

      // 帮助菜单
      case 'user_manual':
      case 'user-manual':
        handleUserManual();
        handled = true;
        break;

      case 'shortcuts_help':
      case 'shortcuts-help':
        // 打开设置弹框并导航到键盘快捷键部分
        setSettingsInitialTab('preferences');
        setSettingsVisible(true);
        showMessage.success(tMenu('native.navigationMessages.openKeyboardShortcuts'));
        handled = true;
        break;

      case 'check_updates':
      case 'check-updates':
        handleCheckUpdates();
        handled = true;
        break;

      case 'report_issue':
      case 'report-issue':
        handleReportIssue();
        handled = true;
        break;

      case 'about':
        setAboutVisible(true);
        handled = true;
        break;

      case 'sample_queries':
        setSampleQueriesVisible(true);
        showMessage.success(tMenu('native.navigationMessages.openQueryExamples'));
        handled = true;
        break;

      case 'api_docs':
        await openDocumentation('https://docs.influxdata.com/influxdb/v1.8/tools/api/');
        handled = true;
        break;

      case 'influxdb_docs':
        await openDocumentation('https://docs.influxdata.com/');
        handled = true;
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
      logger.warn('未处理的菜单动作:', action);
      showMessage.warning(tMenu('native.unimplemented.functionNotImplemented', { action }));
    } else {
      logger.info('菜单动作处理完成:', action);
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
      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => {
          setSettingsVisible(false);
          setSettingsInitialTab('general'); // 重置为默认tab
        }} 
        initialTab={settingsInitialTab}
      />
      <SampleQueriesModal 
        visible={sampleQueriesVisible} 
        onClose={() => setSampleQueriesVisible(false)} 
      />
    </>
  );
};

export default NativeMenuHandler;
