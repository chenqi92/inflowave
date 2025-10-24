import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popconfirm } from '@/components/ui/popconfirm';
import { FileText, Table, Database, Plus, X } from 'lucide-react';
import { generateUniqueId } from '@/utils/idGenerator';
import { showMessage } from '@/utils/message';
import TabContextMenu from './TabContextMenu';
import SaveConfirmDialog from '../common/SaveConfirmDialog';

export interface EditorTab {
  id: string;
  title: string;
  content: string;
  type: 'query' | 'table' | 'database' | 'data-browser';
  modified: boolean;
  saved: boolean; // 是否已保存到工作区
  filePath?: string; // 外部文件路径（另存为功能）
  workspacePath?: string; // 工作区内部路径
  // 数据浏览相关属性
  connectionId?: string;
  database?: string;
  tableName?: string;
  // 查询结果相关属性
  queryResult?: any | null;
  queryResults?: any[];
  executedQueries?: string[];
  executionTime?: number;
}

interface TabManagerProps {
  tabs: EditorTab[];
  activeKey: string;
  onTabsChange: (tabs: EditorTab[]) => void;
  onActiveKeyChange: (key: string) => void;
  onTabContentChange: (tabId: string, content: string) => void;
  onSaveTab?: (tabId: string) => void;
  onSaveTabAs?: (tabId: string) => void;
  onSaveAllTabs?: () => Promise<void>;
  isDragging?: boolean;
  draggedTab?: any;
  onTabDragStart?: (e: React.DragEvent<HTMLElement>, tab: any) => void;
  onTabDrag?: (e: React.DragEvent<HTMLElement>) => void;
  onTabDragEnd?: (e: React.DragEvent<HTMLElement>, callback: (tabId: string, action: string) => void) => void;
  onTabDrop?: (e: React.DragEvent<HTMLElement>, callback: (tab: any) => void) => void;
  onTabDragOver?: (e: React.DragEvent<HTMLElement>) => void;
}

interface ClosingTab {
  id: string;
  title: string;
}

export const TabManager: React.FC<TabManagerProps> = ({
  tabs,
  activeKey,
  onTabsChange,
  onActiveKeyChange,
  onTabContentChange,
  onSaveTab,
  onSaveTabAs,
  onSaveAllTabs,
  isDragging,
  draggedTab,
  onTabDragStart,
  onTabDrag,
  onTabDragEnd,
  onTabDrop,
  onTabDragOver,
}) => {
  const [closingTab, setClosingTab] = useState<ClosingTab | null>(null);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    targetTab: EditorTab | null;
  }>({
    open: false,
    x: 0,
    y: 0,
    targetTab: null,
  });

  // 保存确认对话框状态
  const [saveConfirmDialog, setSaveConfirmDialog] = useState<{
    open: boolean;
    unsavedTabs: EditorTab[];
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    open: false,
    unsavedTabs: [],
    onConfirm: () => {},
    onCancel: () => {},
  });

  // 直接实现tab操作逻辑
  const duplicateTab = useCallback((tabId: string) => {
    const originalTab = tabs.find(tab => tab.id === tabId);
    if (!originalTab) return null;

    const newTab: EditorTab = {
      ...originalTab,
      id: generateUniqueId('tab'),
      title: `${originalTab.title} - 副本`,
      modified: true,
      saved: false,
      filePath: undefined,
      workspacePath: undefined,
    };

    const newTabs = [...tabs, newTab];
    onTabsChange(newTabs);
    onActiveKeyChange(newTab.id);
    return newTab;
  }, [tabs, onTabsChange, onActiveKeyChange]);

  const closeOtherTabs = useCallback((keepTabId: string) => {
    const tabsToClose = tabs.filter(tab => tab.id !== keepTabId);
    const unsavedTabs = tabsToClose.filter(tab => tab.modified);

    return {
      tabsToClose,
      unsavedTabs,
      execute: () => {
        const newTabs = tabs.filter(tab => tab.id === keepTabId);
        onTabsChange(newTabs);
        onActiveKeyChange(keepTabId);
      }
    };
  }, [tabs, onTabsChange, onActiveKeyChange]);

  const closeLeftTabs = useCallback((targetTabId: string) => {
    const targetIndex = tabs.findIndex(tab => tab.id === targetTabId);
    if (targetIndex <= 0) return { tabsToClose: [], unsavedTabs: [], execute: () => {} };

    const tabsToClose = tabs.slice(0, targetIndex);
    const unsavedTabs = tabsToClose.filter(tab => tab.modified);

    return {
      tabsToClose,
      unsavedTabs,
      execute: () => {
        const newTabs = tabs.slice(targetIndex);
        onTabsChange(newTabs);
      }
    };
  }, [tabs, onTabsChange]);

  const closeRightTabs = useCallback((targetTabId: string) => {
    const targetIndex = tabs.findIndex(tab => tab.id === targetTabId);
    if (targetIndex === -1 || targetIndex === tabs.length - 1) {
      return { tabsToClose: [], unsavedTabs: [], execute: () => {} };
    }

    const tabsToClose = tabs.slice(targetIndex + 1);
    const unsavedTabs = tabsToClose.filter(tab => tab.modified);

    return {
      tabsToClose,
      unsavedTabs,
      execute: () => {
        const newTabs = tabs.slice(0, targetIndex + 1);
        onTabsChange(newTabs);
      }
    };
  }, [tabs, onTabsChange]);

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, tab: EditorTab) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      targetTab: tab,
    });
  }, []);

  // 关闭右键菜单
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, open: false }));
  }, []);

  // 处理保存确认对话框
  const showSaveConfirmDialog = useCallback((
    unsavedTabs: EditorTab[],
    onConfirm: () => void,
    onCancel: () => void
  ) => {
    setSaveConfirmDialog({
      open: true,
      unsavedTabs,
      onConfirm,
      onCancel,
    });
  }, []);

  // 关闭保存确认对话框
  const closeSaveConfirmDialog = useCallback(() => {
    setSaveConfirmDialog(prev => ({ ...prev, open: false }));
  }, []);

  // 移除标签
  const removeTab = useCallback((tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    onTabsChange(newTabs);

    // 如果删除的是当前活跃标签，智能切换到其他标签
    if (activeKey === tabId && newTabs.length > 0) {
      // 优先选择右侧标签，如果没有则选择左侧标签
      let nextActiveIndex = currentIndex;
      if (nextActiveIndex >= newTabs.length) {
        nextActiveIndex = newTabs.length - 1;
      }
      onActiveKeyChange(newTabs[nextActiveIndex].id);
    }
  }, [tabs, activeKey, onTabsChange, onActiveKeyChange]);

  // 右键菜单操作处理
  const handleCloseTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.modified) {
      setClosingTab({ id: tab.id, title: tab.title });
    } else {
      removeTab(tabId);
    }
  }, [tabs, removeTab]);

  const handleCloseOtherTabs = useCallback((keepTabId: string) => {
    const result = closeOtherTabs(keepTabId);

    if (result.unsavedTabs.length > 0) {
      showSaveConfirmDialog(
        result.unsavedTabs,
        async () => {
          if (onSaveAllTabs) {
            await onSaveAllTabs();
          }
          result.execute();
        },
        () => {
          result.execute();
        }
      );
    } else {
      result.execute();
    }
  }, [closeOtherTabs, showSaveConfirmDialog, onSaveAllTabs]);

  const handleCloseLeftTabs = useCallback((targetTabId: string) => {
    const result = closeLeftTabs(targetTabId);

    if (result.unsavedTabs.length > 0) {
      showSaveConfirmDialog(
        result.unsavedTabs,
        async () => {
          if (onSaveAllTabs) {
            await onSaveAllTabs();
          }
          result.execute();
        },
        () => {
          result.execute();
        }
      );
    } else {
      result.execute();
    }
  }, [closeLeftTabs, showSaveConfirmDialog, onSaveAllTabs]);

  const handleCloseRightTabs = useCallback((targetTabId: string) => {
    const result = closeRightTabs(targetTabId);

    if (result.unsavedTabs.length > 0) {
      showSaveConfirmDialog(
        result.unsavedTabs,
        async () => {
          if (onSaveAllTabs) {
            await onSaveAllTabs();
          }
          result.execute();
        },
        () => {
          result.execute();
        }
      );
    } else {
      result.execute();
    }
  }, [closeRightTabs, showSaveConfirmDialog, onSaveAllTabs]);

  const handleSaveTab = useCallback((tabId: string) => {
    if (onSaveTabAs) {
      onSaveTabAs(tabId);
    }
  }, [onSaveTabAs]);

  const handleDuplicateTab = useCallback((tabId: string) => {
    const newTab = duplicateTab(tabId);
    if (newTab) {
      showMessage.success(`已复制标签页: ${newTab.title}`);
    }
  }, [duplicateTab]);

  // 创建新标签
  const createNewTab = useCallback((type: 'query' | 'table' | 'database' = 'query') => {
    const newTab: EditorTab = {
      id: generateUniqueId('tab'),
      title: `${type === 'query' ? '查询' : type === 'table' ? '表' : '数据库'}-${tabs.length + 1}`,
      content: type === 'query' ? 'SELECT * FROM ' : '',
      type,
      modified: true, // 新建标签页为未保存状态
      saved: false,   // 未保存到工作区
    };

    const newTabs = [...tabs, newTab];
    onTabsChange(newTabs);
    onActiveKeyChange(newTab.id);
  }, [tabs, onTabsChange, onActiveKeyChange]);

  // 创建数据浏览标签
  const createDataBrowserTab = useCallback((connectionId: string, database: string, tableName: string) => {
    const newTab: EditorTab = {
      id: generateUniqueId('tab'),
      title: `${tableName}`,
      content: '', // 数据浏览不需要content
      type: 'data-browser',
      modified: false, // 数据浏览标签不需要保存
      saved: true,     // 数据浏览标签默认为已保存状态
      connectionId,
      database,
      tableName,
    };

    const newTabs = [...tabs, newTab];
    onTabsChange(newTabs);
    onActiveKeyChange(newTab.id);
  }, [tabs, onTabsChange, onActiveKeyChange]);

  // 创建带数据库选择的查询标签页
  const createQueryTabWithDatabase = useCallback((database: string, query?: string) => {
    const newTab: EditorTab = {
      id: generateUniqueId('tab'),
      title: `查询-${tabs.length + 1}`,
      content: query || 'SELECT * FROM ',
      type: 'query',
      modified: true,  // 新建查询标签为未保存状态
      saved: false,    // 未保存到工作区
    };

    const newTabs = [...tabs, newTab];
    onTabsChange(newTabs);
    onActiveKeyChange(newTab.id);

    console.log(`✅ 创建查询标签页并选中数据库: ${database}`);
  }, [tabs, onTabsChange, onActiveKeyChange]);

  // 关闭标签
  const closeTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.modified) {
      setClosingTab({ id: tabId, title: tab.title });
    } else {
      removeTab(tabId);
    }
  }, [tabs, removeTab]);

  // 保存并关闭标签
  const saveAndCloseTab = useCallback((tabId: string) => {
    if (onSaveTab) {
      onSaveTab(tabId);
    }
    removeTab(tabId);
    setClosingTab(null);
  }, [onSaveTab, removeTab]);

  // 更新标签内容
  const updateTabContent = useCallback((tabId: string, content: string) => {
    const newTabs = tabs.map(tab =>
      tab.id === tabId
        ? { ...tab, content, modified: true }
        : tab
    );
    onTabsChange(newTabs);
    onTabContentChange(tabId, content);
  }, [tabs, onTabsChange, onTabContentChange]);

  // 获取标签图标
  const getTabIcon = (type: EditorTab['type']) => {
    switch (type) {
      case 'query':
        return <FileText className='w-4 h-4 flex-shrink-0' />;
      case 'table':
        return <Table className='w-4 h-4 flex-shrink-0' />;
      case 'database':
        return <Database className='w-4 h-4 flex-shrink-0' />;
      case 'data-browser':
        return <Table className='w-4 h-4 flex-shrink-0' />;
      default:
        return <FileText className='w-4 h-4 flex-shrink-0' />;
    }
  };

  return (
    <div className='flex items-center border-b border flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-transparent'
         onDrop={onTabDrop ? (e) => onTabDrop(e, () => {}) : undefined}
         onDragOver={onTabDragOver}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          draggable
          className={`flex items-center gap-1 px-3 py-2 border-r border cursor-pointer hover:bg-muted/50 flex-shrink-0 min-w-[120px] max-w-[180px] transition-all duration-200 ${
            activeKey === tab.id
              ? 'bg-background border-b-2 border-primary'
              : 'bg-muted/50'
          } ${isDragging && draggedTab?.id === tab.id ? 'opacity-50' : ''}`}
          onClick={() => onActiveKeyChange(tab.id)}
          onContextMenu={(e) => handleContextMenu(e, tab)}
          onDragStart={onTabDragStart ? (e) => onTabDragStart(e, {
            id: tab.id,
            title: tab.title,
            content: tab.content,
            type: tab.type,
            connectionId: tab.connectionId,
            database: tab.database,
            tableName: tab.tableName,
          }) : undefined}
          onDrag={onTabDrag}
          onDragEnd={onTabDragEnd ? (e) => onTabDragEnd(e, (tabId, action) => {
            if (action === 'detach') {
              showMessage.info(`Tab "${tab.title}" 分离操作（演示）`);
            }
          }) : undefined}
        >
          {getTabIcon(tab.type)}
          <span className='text-sm truncate flex-1'>{tab.title}</span>
          {tab.modified && <div className='w-2 h-2 bg-orange-500 rounded-full flex-shrink-0' />}
          
          {tab.modified ? (
            <Popconfirm
              title='保存更改'
              description={`"${tab.title}" 已修改，是否保存更改？`}
              open={closingTab?.id === tab.id}
              onConfirm={() => saveAndCloseTab(tab.id)}
              onCancel={() => {
                // 用户点击"不保存"按钮时，直接关闭tab
                removeTab(tab.id);
                setClosingTab(null);
              }}
              onOpenChange={open => {
                // 当弹框关闭时，只重置状态，不删除tab
                if (!open && closingTab?.id === tab.id) {
                  setClosingTab(null);
                }
              }}
              okText='保存'
              cancelText='不保存'
              placement='bottom'
            >
              <Button
                variant='ghost'
                size='sm'
                onClick={e => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className='ml-1 p-0 h-4 w-4 flex-shrink-0 opacity-60 hover:opacity-100'
              >
                <X className='w-3 h-3' />
              </Button>
            </Popconfirm>
          ) : (
            <Button
              variant='ghost'
              size='sm'
              onClick={e => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className='ml-1 p-0 h-4 w-4 flex-shrink-0 opacity-60 hover:opacity-100'
            >
              <X className='w-3 h-3' />
            </Button>
          )}
        </div>
      ))}
      
      <Button
        variant='ghost'
        size='sm'
        className='ml-2 flex-shrink-0'
        title='新建SQL查询'
        onClick={() => createNewTab('query')}
      >
        <Plus className='w-4 h-4' />
      </Button>

      {/* 右键菜单 */}
      {contextMenu.targetTab && (
        <TabContextMenu
          open={contextMenu.open}
          x={contextMenu.x}
          y={contextMenu.y}
          targetTab={contextMenu.targetTab}
          allTabs={tabs}
          currentTabIndex={tabs.findIndex(tab => tab.id === contextMenu.targetTab?.id)}
          onClose={closeContextMenu}
          onCloseTab={handleCloseTab}
          onCloseOtherTabs={handleCloseOtherTabs}
          onCloseLeftTabs={handleCloseLeftTabs}
          onCloseRightTabs={handleCloseRightTabs}
          onSaveTab={handleSaveTab}
          onDuplicateTab={handleDuplicateTab}
        />
      )}

      {/* 保存确认对话框 */}
      <SaveConfirmDialog
        open={saveConfirmDialog.open}
        onClose={closeSaveConfirmDialog}
        unsavedTabs={saveConfirmDialog.unsavedTabs}
        onSaveAll={async () => {
          await saveConfirmDialog.onConfirm();
        }}
        onDiscardAll={saveConfirmDialog.onCancel}
        onCancel={() => {
          // 用户取消操作，什么都不做
        }}
      />
    </div>
  );
};

// 导出相关的hook和工具函数
export const useTabManager = (initialTabs: EditorTab[] = []) => {
  const [tabs, setTabs] = useState<EditorTab[]>(initialTabs);
  const [activeKey, setActiveKey] = useState<string>('');

  const handleTabContentChange = useCallback((tabId: string, content: string) => {
    // 这里可以添加额外的逻辑，比如自动保存等
    console.log(`Tab ${tabId} content changed`);
  }, []);

  return {
    tabs,
    activeKey,
    setTabs,
    setActiveKey,
    handleTabContentChange,
  };
};
