import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TabContextMenu from '@/components/editor/TabContextMenu';
import SaveConfirmDialog from '@/components/common/SaveConfirmDialog';
import type { EditorTab } from '@/components/editor/TabManager';

const TabContextMenuTest: React.FC = () => {
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: 'tab-1',
      title: '查询-1',
      content: 'SELECT * FROM measurement1',
      type: 'query',
      modified: true,
      saved: false,
    },
    {
      id: 'tab-2',
      title: '查询-2',
      content: 'SELECT * FROM measurement2',
      type: 'query',
      modified: false,
      saved: true,
    },
    {
      id: 'tab-3',
      title: '查询-3',
      content: 'SELECT * FROM measurement3',
      type: 'query',
      modified: true,
      saved: false,
    },
  ]);

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

  const [saveDialog, setSaveDialog] = useState<{
    open: boolean;
    unsavedTabs: EditorTab[];
  }>({
    open: false,
    unsavedTabs: [],
  });

  const handleContextMenu = (e: React.MouseEvent, tab: EditorTab) => {
    e.preventDefault();
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      targetTab: tab,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, open: false }));
  };

  const handleCloseTab = (tabId: string) => {
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    console.log(`关闭标签页: ${tabId}`);
  };

  const handleCloseOtherTabs = (keepTabId: string) => {
    const tabsToClose = tabs.filter(t => t.id !== keepTabId);
    const unsavedTabs = tabsToClose.filter(t => t.modified);
    
    if (unsavedTabs.length > 0) {
      setSaveDialog({
        open: true,
        unsavedTabs,
      });
    } else {
      setTabs(tabs.filter(t => t.id === keepTabId));
      console.log(`关闭其他标签页，保留: ${keepTabId}`);
    }
  };

  const handleCloseLeftTabs = (targetTabId: string) => {
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);
    if (targetIndex <= 0) return;

    const tabsToClose = tabs.slice(0, targetIndex);
    const unsavedTabs = tabsToClose.filter(t => t.modified);
    
    if (unsavedTabs.length > 0) {
      setSaveDialog({
        open: true,
        unsavedTabs,
      });
    } else {
      setTabs(tabs.slice(targetIndex));
      console.log(`关闭左侧标签页，目标: ${targetTabId}`);
    }
  };

  const handleCloseRightTabs = (targetTabId: string) => {
    const targetIndex = tabs.findIndex(t => t.id === targetTabId);
    if (targetIndex === -1 || targetIndex === tabs.length - 1) return;

    const tabsToClose = tabs.slice(targetIndex + 1);
    const unsavedTabs = tabsToClose.filter(t => t.modified);
    
    if (unsavedTabs.length > 0) {
      setSaveDialog({
        open: true,
        unsavedTabs,
      });
    } else {
      setTabs(tabs.slice(0, targetIndex + 1));
      console.log(`关闭右侧标签页，目标: ${targetTabId}`);
    }
  };

  const handleSaveTab = (tabId: string) => {
    console.log(`另存为标签页: ${tabId}`);
    // 这里会调用实际的另存为功能
  };

  const handleDuplicateTab = (tabId: string) => {
    const originalTab = tabs.find(t => t.id === tabId);
    if (!originalTab) return;

    const newTab: EditorTab = {
      ...originalTab,
      id: `tab-${Date.now()}`,
      title: `${originalTab.title} - 副本`,
      modified: true,
      saved: false,
    };
    
    setTabs([...tabs, newTab]);
    console.log(`复制标签页: ${tabId}`);
  };

  const handleSaveAll = async () => {
    console.log('保存所有未保存的标签页');
    // 模拟保存操作
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleDiscardAll = () => {
    console.log('丢弃所有更改');
    setSaveDialog({ open: false, unsavedTabs: [] });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>标签页右键菜单测试</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            右键点击下面的标签页来测试右键菜单功能
          </div>
          
          <div className="flex gap-2 border-b">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="flex items-center gap-2 px-3 py-2 border-r cursor-pointer hover:bg-muted/50"
                onContextMenu={(e) => handleContextMenu(e, tab)}
              >
                <span className="text-sm">{tab.title}</span>
                {tab.modified && (
                  <div className="w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            <div>标签页状态:</div>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {tabs.map((tab) => (
                <li key={tab.id}>
                  {tab.title}: {tab.modified ? '未保存' : '已保存'}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 右键菜单 */}
        {contextMenu.targetTab && (
          <TabContextMenu
            open={contextMenu.open}
            x={contextMenu.x}
            y={contextMenu.y}
            targetTab={contextMenu.targetTab}
            allTabs={tabs}
            currentTabIndex={tabs.findIndex(t => t.id === contextMenu.targetTab?.id)}
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
          open={saveDialog.open}
          onClose={() => setSaveDialog({ open: false, unsavedTabs: [] })}
          unsavedTabs={saveDialog.unsavedTabs}
          onSaveAll={handleSaveAll}
          onDiscardAll={handleDiscardAll}
          onCancel={() => setSaveDialog({ open: false, unsavedTabs: [] })}
        />
      </CardContent>
    </Card>
  );
};

export default TabContextMenuTest;
