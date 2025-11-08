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
} from '@/components/ui';
import { WorkspaceAPI, WorkspaceTab } from '@/services/workspace';
import { useMenuTranslation } from '@/hooks/useTranslation';
import { showMessage } from '@/utils/message';
import { dialog } from '@/utils/dialog';
import { FileText, Trash2, RefreshCw, Database, Calendar, CheckSquare, Square } from 'lucide-react';
import logger from '@/utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useI18nStore } from '@/i18n/store';

interface WorkspaceContentProps {
  onRestoreTabs: (tabs: WorkspaceTab[]) => void;
}

export const WorkspaceContent: React.FC<WorkspaceContentProps> = ({
  onRestoreTabs,
}) => {
  const { t } = useMenuTranslation();
  const { currentLanguage } = useI18nStore();
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([]);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // 获取date-fns的locale
  const dateLocale = currentLanguage === 'zh-CN' ? zhCN : enUS;

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
    onRestoreTabs(selectedTabs);
    showMessage.success(t('workspace.restore_success', { count: selectedTabs.length }));
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
    <div className="h-full flex flex-col bg-background">
      {/* 操作栏 */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              disabled={workspaceTabs.length === 0}
              className="h-8"
            >
              {selectedTabIds.size === workspaceTabs.length && workspaceTabs.length > 0 ? (
                <CheckSquare className="w-4 h-4 mr-1" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}
              {selectedTabIds.size === workspaceTabs.length && workspaceTabs.length > 0
                ? t('workspace.deselect_all')
                : t('workspace.select_all')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('workspace.tab_count', { count: workspaceTabs.length })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadWorkspaceTabs}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('workspace.refresh')}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleRestoreSelected}
            disabled={selectedTabIds.size === 0}
            className="flex-1"
          >
            {t('workspace.restore_selected')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedTabIds.size === 0}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {t('workspace.delete_selected')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={workspaceTabs.length === 0}
          >
            {t('workspace.clear_all')}
          </Button>
        </div>
      </div>

      {/* 标签页列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {workspaceTabs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('workspace.no_tabs')}</p>
            </div>
          ) : (
            workspaceTabs.map(tab => (
              <div
                key={tab.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50 ${
                  selectedTabIds.has(tab.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                }`}
                onClick={() => toggleTabSelection(tab.id)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedTabIds.has(tab.id)}
                    onCheckedChange={() => toggleTabSelection(tab.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-medium text-sm truncate">{tab.title}</span>
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
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default WorkspaceContent;

