/**
 * 工作区内容组件
 * 用于在右侧功能面板中显示工作区内容
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Checkbox,
  ScrollArea,
  Separator,
  Badge,
} from '@/components/ui';
import { WorkspaceAPI, WorkspaceTab } from '@/services/workspace';
import { useMenuTranslation } from '@/hooks/useTranslation';
import { showMessage } from '@/utils/message';
import { dialog } from '@/utils/dialog';
import { FileText, Trash2, RefreshCw, Database, Calendar, CheckSquare, Square, X, CheckCheck, Trash } from 'lucide-react';
import logger from '@/utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useI18nStore } from '@/i18n/store';
import { useTabStore } from '@/stores/tabStore';

interface WorkspaceContentProps {
  onRestoreTabs: (tabs: WorkspaceTab[]) => void;
  onClose?: () => void;
}

export const WorkspaceContent: React.FC<WorkspaceContentProps> = ({
  onRestoreTabs,
  onClose,
}) => {
  const { t } = useMenuTranslation();
  const { currentLanguage } = useI18nStore();
  const { tabs: editorTabs } = useTabStore();
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([]);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // 获取date-fns的locale
  const dateLocale = currentLanguage === 'zh-CN' ? zhCN : enUS;

  // 检查工作区tab是否已在编辑器中打开
  const isTabAlreadyOpen = useCallback((workspaceTab: WorkspaceTab) => {
    return editorTabs.some(editorTab =>
      editorTab.id === workspaceTab.id ||
      (editorTab.title === workspaceTab.title &&
       editorTab.content === workspaceTab.content &&
       editorTab.database === workspaceTab.database)
    );
  }, [editorTabs]);

  // 加载工作区标签页
  const loadWorkspaceTabs = useCallback(async () => {
    setLoading(true);
    try {
      const tabs = await WorkspaceAPI.getWorkspaceTabs();
      setWorkspaceTabs(tabs);
      logger.debug(t('workspace.restore_tabs'), tabs.length);
    } catch (error) {
      logger.error(t('workspace.load_failed'), error);
      showMessage.error(`${t('workspace.load_failed')}: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadWorkspaceTabs();
  }, [loadWorkspaceTabs]);

  // 监听工作区更新事件
  useEffect(() => {
    const handleWorkspaceUpdate = () => {
      logger.debug('收到工作区更新事件，重新加载数据');
      loadWorkspaceTabs();
    };

    // 添加自定义事件监听
    window.addEventListener('workspace-updated', handleWorkspaceUpdate);

    return () => {
      window.removeEventListener('workspace-updated', handleWorkspaceUpdate);
    };
  }, [loadWorkspaceTabs]);

  // 切换选中状态
  const toggleTabSelection = (tabId: string) => {
    setSelectedTabIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tabId)) {
        newSet.delete(tabId);
      } else {
        newSet.add(tabId);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTabIds.size === workspaceTabs.length) {
      setSelectedTabIds(new Set());
    } else {
      setSelectedTabIds(new Set(workspaceTabs.map(tab => tab.id)));
    }
  };

  // 恢复选中的标签页
  const handleRestoreSelected = async () => {
    if (selectedTabIds.size === 0) {
      showMessage.warning(t('workspace.select_tabs'));
      return;
    }

    const selectedTabs = workspaceTabs.filter(tab => selectedTabIds.has(tab.id));

    // 过滤掉已经打开的tabs
    const tabsToRestore = selectedTabs.filter(tab => !isTabAlreadyOpen(tab));
    const alreadyOpenCount = selectedTabs.length - tabsToRestore.length;

    if (tabsToRestore.length === 0) {
      showMessage.warning(t('workspace.all_tabs_already_open'));
      return;
    }

    onRestoreTabs(tabsToRestore);

    if (alreadyOpenCount > 0) {
      showMessage.success(
        t('workspace.restore_success_with_skip', {
          restored: tabsToRestore.length,
          skipped: alreadyOpenCount
        })
      );
    } else {
      showMessage.success(t('workspace.restore_success', { count: tabsToRestore.length }));
    }

    setSelectedTabIds(new Set());
  };

  // 删除选中的标签页
  const handleDeleteSelected = async () => {
    if (selectedTabIds.size === 0) {
      showMessage.warning(t('workspace.select_tabs'));
      return;
    }

    const confirmed = await dialog.confirm({
      title: t('workspace.delete_selected'),
      content: t('workspace.confirm_delete', { count: selectedTabIds.size }),
    });

    if (!confirmed) return;

    try {
      await WorkspaceAPI.removeTabsFromWorkspace(Array.from(selectedTabIds));
      showMessage.success(t('workspace.delete_success', { count: selectedTabIds.size }));
      setSelectedTabIds(new Set());
      await loadWorkspaceTabs();
    } catch (error) {
      logger.error(t('workspace.delete_failed'), error);
      showMessage.error(`${t('workspace.delete_failed')}: ${error}`);
    }
  };

  // 清空工作区
  const handleClearAll = async () => {
    if (workspaceTabs.length === 0) {
      showMessage.info(t('workspace.no_tabs'));
      return;
    }

    const confirmed = await dialog.confirm({
      title: t('workspace.clear_all'),
      content: t('workspace.confirm_clear'),
    });

    if (!confirmed) return;

    try {
      await WorkspaceAPI.clearWorkspace();
      showMessage.success(t('workspace.clear_success'));
      setWorkspaceTabs([]);
      setSelectedTabIds(new Set());
    } catch (error) {
      logger.error(t('workspace.clear_failed'), error);
      showMessage.error(`${t('workspace.clear_failed')}: ${error}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* 标题栏 - 与NotificationPanel保持一致 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 dark:bg-muted/20">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{t('right_panel.workspace')}</h3>
          {workspaceTabs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {workspaceTabs.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 全选/取消全选 */}
          {workspaceTabs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={toggleSelectAll}
              title={selectedTabIds.size === workspaceTabs.length && workspaceTabs.length > 0
                ? t('workspace.deselect_all')
                : t('workspace.select_all')}
            >
              {selectedTabIds.size === workspaceTabs.length && workspaceTabs.length > 0 ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* 刷新 */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent"
            onClick={loadWorkspaceTabs}
            disabled={loading}
            title={t('workspace.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* 恢复选中 */}
          {selectedTabIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={handleRestoreSelected}
              title={t('workspace.restore_selected')}
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
          )}

          {/* 删除选中 */}
          {selectedTabIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={handleDeleteSelected}
              title={t('workspace.delete_selected')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          {/* 清空全部 */}
          {workspaceTabs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={handleClearAll}
              title={t('workspace.clear_all')}
            >
              <Trash className="w-4 h-4" />
            </Button>
          )}

          {/* 关闭按钮 */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent"
              onClick={onClose}
              title={t('common:close')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 标签页列表 */}
      <div className="flex-1 overflow-hidden">
        {workspaceTabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('workspace.no_tabs')}</p>
            <p className="text-sm text-center">{t('workspace.no_tabs_desc')}</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-2">
              {workspaceTabs.map(tab => {
                const isAlreadyOpen = isTabAlreadyOpen(tab);
                return (
                  <div
                    key={tab.id}
                    className={`
                      p-3 rounded-lg cursor-pointer group border
                      transition-all duration-200
                      ${selectedTabIds.has(tab.id)
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-card hover:border-primary/50'
                      }
                      ${isAlreadyOpen ? 'opacity-50' : ''}
                    `}
                    onClick={() => !isAlreadyOpen && toggleTabSelection(tab.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedTabIds.has(tab.id)}
                        onCheckedChange={() => toggleTabSelection(tab.id)}
                        disabled={isAlreadyOpen}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{tab.title}</span>
                          {isAlreadyOpen && (
                            <Badge variant="secondary" className="text-xs">
                              {t('workspace.already_open')}
                            </Badge>
                          )}
                        </div>
                        {tab.database && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Database className="w-3 h-3" />
                            <span className="truncate">{tab.database}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(tab.updated_at), {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </span>
                        </div>
                        {tab.content && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2 font-mono truncate">
                            {tab.content.substring(0, 100)}
                            {tab.content.length > 100 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default WorkspaceContent;

