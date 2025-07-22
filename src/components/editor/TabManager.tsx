import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Popconfirm } from '@/components/ui/Popconfirm';
import { FileText, Table, Database, Plus, X } from 'lucide-react';
import { generateUniqueId } from '@/utils/idGenerator';
import { showMessage } from '@/utils/message';

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
  isDragging,
  draggedTab,
  onTabDragStart,
  onTabDrag,
  onTabDragEnd,
  onTabDrop,
  onTabDragOver,
}) => {
  const [closingTab, setClosingTab] = useState<ClosingTab | null>(null);

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

  // 移除标签
  const removeTab = useCallback((tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    onTabsChange(newTabs);

    // 如果删除的是当前活跃标签，切换到其他标签
    if (activeKey === tabId && newTabs.length > 0) {
      onActiveKeyChange(newTabs[newTabs.length - 1].id);
    }
  }, [tabs, activeKey, onTabsChange, onActiveKeyChange]);

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
              onOpenChange={open => {
                if (!open && closingTab?.id === tab.id) {
                  removeTab(tab.id);
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
