/**
 * 工作区对话框组件
 * 用于查看和恢复保存在工作区中的查询标签页
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Button,
  Checkbox,
  ScrollArea,
  Separator,
} from '@/components/ui';
import { WorkspaceAPI, WorkspaceTab } from '@/services/workspace';
import { useMenuTranslation } from '@/hooks/useTranslation';
import { showMessage } from '@/utils/message';
import { dialog } from '@/utils/dialog';
import { FileText, Trash2, RefreshCw, Database, Calendar } from 'lucide-react';
import logger from '@/utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useI18nStore } from '@/i18n/store';

interface WorkspaceDialogProps {
  visible: boolean;
  onClose: () => void;
  onRestoreTabs: (tabs: WorkspaceTab[]) => void;
}

export const WorkspaceDialog: React.FC<WorkspaceDialogProps> = ({
  visible,
  onClose,
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

  // 对话框打开时加载数据
  useEffect(() => {
    if (visible) {
      loadWorkspaceTabs();
      setSelectedTabIds(new Set());
    }
  }, [visible, loadWorkspaceTabs]);

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
    onClose();
  };

  // 删除选中的标签页
  const handleDeleteSelected = async () => {
    if (selectedTabIds.size === 0) {
      showMessage.warning(t('workspace.select_tabs'));
      return;
    }

    const confirmed = await dialog.confirm({
      title: t('workspace.delete_selected'),
      content: t('workspace.delete_confirm', { count: selectedTabIds.size }),
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await WorkspaceAPI.removeTabsFromWorkspace(Array.from(selectedTabIds));
      showMessage.success(t('workspace.delete_success', { count: selectedTabIds.size }));
      await loadWorkspaceTabs();
      setSelectedTabIds(new Set());
    } catch (error) {
      logger.error(t('workspace.delete_failed'), error);
      showMessage.error(`${t('workspace.delete_failed')}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 清空工作区
  const handleClearAll = async () => {
    const confirmed = await dialog.confirm({
      title: t('workspace.clear_all'),
      content: t('workspace.clear_confirm'),
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await WorkspaceAPI.clearWorkspace();
      showMessage.success(t('workspace.delete_success', { count: workspaceTabs.length }));
      setWorkspaceTabs([]);
      setSelectedTabIds(new Set());
    } catch (error) {
      logger.error(t('workspace.clear_failed'), error);
      showMessage.error(`${t('workspace.clear_failed')}: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: dateLocale,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Sheet open={visible} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[600px] sm:w-[700px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('workspace.title')}
          </SheetTitle>
          <SheetDescription>
            {t('workspace.description')}
            {workspaceTabs.length > 0 && (
              <span className="ml-2 text-primary font-medium">
                {t('workspace.tab_count', { count: workspaceTabs.length })}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 min-h-0 flex flex-col gap-4 px-6 py-4">
          {/* 操作按钮栏 */}
          {workspaceTabs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedTabIds.size === workspaceTabs.length
                  ? t('workspace.deselect_all')
                  : t('workspace.select_all')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadWorkspaceTabs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                {t('menu:context_menu.refresh')}
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedTabIds.size === 0 || loading}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('workspace.delete_selected')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearAll}
                disabled={loading}
              >
                {t('workspace.clear_all')}
              </Button>
            </div>
          )}

          {/* 标签页列表 */}
          <ScrollArea className="flex-1 rounded-lg">
            {workspaceTabs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p>{t('workspace.no_tabs')}</p>
              </div>
            ) : (
              <div className="pr-4 space-y-2">
                {workspaceTabs.map(tab => (
                  <div
                    key={tab.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${
                      selectedTabIds.has(tab.id) ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => toggleTabSelection(tab.id)}
                  >
                    <Checkbox
                      checked={selectedTabIds.has(tab.id)}
                      onCheckedChange={() => toggleTabSelection(tab.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
                        <span className="font-medium truncate">{tab.title}</span>
                      </div>
                      {tab.database && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Database className="w-3 h-3" />
                          <span>{tab.database}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatTime(tab.updated_at)}</span>
                        </div>
                        {tab.content && (
                          <span className="truncate max-w-md">
                            {tab.content.substring(0, 100)}
                            {tab.content.length > 100 ? '...' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator />

        <div className="px-6 py-4 flex items-center gap-2">
          <Button
            onClick={handleRestoreSelected}
            disabled={selectedTabIds.size === 0 || loading}
            className="flex-1"
          >
            {t('workspace.restore_selected')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('common:cancel')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

