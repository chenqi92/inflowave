import { useCallback, useState } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { generateUniqueId } from '@/utils/idGenerator';
import type { EditorTab } from './TabManager';

interface FileOperationsProps {
  tabs: EditorTab[];
  currentTab: EditorTab | null;
  onTabsChange: (tabs: EditorTab[]) => void;
  onActiveKeyChange: (key: string) => void;
}

export const useFileOperations = ({
  tabs,
  currentTab,
  onTabsChange,
  onActiveKeyChange,
}: FileOperationsProps) => {
  const [showExportDialog, setShowExportDialog] = useState(false);

  // 保存当前标签到工作区
  const saveCurrentTab = useCallback(async () => {
    if (!currentTab) {
      showMessage.warning('没有可保存的标签页');
      return;
    }

    try {
      // 生成工作区路径
      const workspacePath = `workspace/${currentTab.type}/${currentTab.title}.sql`;
      
      // 调用后端保存到工作区
      await safeTauriInvoke('save_to_workspace', {
        path: workspacePath,
        content: currentTab.content,
        metadata: {
          type: currentTab.type,
          title: currentTab.title,
          created: new Date().toISOString(),
        },
      });

      // 更新标签状态
      const updatedTabs = tabs.map(tab =>
        tab.id === currentTab.id
          ? { ...tab, saved: true, modified: false, workspacePath }
          : tab
      );
      onTabsChange(updatedTabs);

      showMessage.success(`已保存到工作区: ${currentTab.title}`);
    } catch (error) {
      console.error('保存到工作区失败:', error);
      showMessage.error(`保存失败: ${error}`);
    }
  }, [currentTab, tabs, onTabsChange]);

  // 另存为文件
  const saveFileAs = useCallback(async () => {
    if (!currentTab) {
      showMessage.warning('没有可保存的内容');
      return;
    }

    try {
      // 调用后端文件保存对话框
      const filePath = await safeTauriInvoke<string>('save_file_dialog', {
        defaultName: `${currentTab.title}.sql`,
        filters: [
          { name: 'SQL Files', extensions: ['sql'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (filePath) {
        // 保存文件
        await safeTauriInvoke('save_file', {
          path: filePath,
          content: currentTab.content,
        });

        // 更新标签状态
        const updatedTabs = tabs.map(tab =>
          tab.id === currentTab.id
            ? { ...tab, saved: true, modified: false, filePath }
            : tab
        );
        onTabsChange(updatedTabs);

        showMessage.success(`文件已保存: ${filePath}`);
      }
    } catch (error) {
      console.error('另存为失败:', error);
      showMessage.error(`保存失败: ${error}`);
    }
  }, [currentTab, tabs, onTabsChange]);

  // 打开文件
  const openFile = useCallback(async () => {
    try {
      // 调用后端文件打开对话框
      const result = await safeTauriInvoke<{ path: string; content: string }>('open_file_dialog', {
        filters: [
          { name: 'SQL Files', extensions: ['sql'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result) {
        // 检查是否已经打开了相同的文件
        const existingTab = tabs.find(tab => tab.filePath === result.path);
        if (existingTab) {
          onActiveKeyChange(existingTab.id);
          showMessage.info('文件已经打开');
          return;
        }

        // 创建新标签页
        const fileName = result.path.split(/[/\\]/).pop() || 'Untitled';
        const newTab: EditorTab = {
          id: generateUniqueId('tab'),
          title: fileName.replace(/\.[^/.]+$/, ''), // 移除扩展名
          content: result.content,
          type: 'query',
          modified: false,
          saved: true,
          filePath: result.path,
        };

        const newTabs = [...tabs, newTab];
        onTabsChange(newTabs);
        onActiveKeyChange(newTab.id);

        showMessage.success(`文件已打开: ${fileName}`);
      }
    } catch (error) {
      console.error('打开文件失败:', error);
      showMessage.error(`打开文件失败: ${error}`);
    }
  }, [tabs, onTabsChange, onActiveKeyChange]);

  // 导出工作区
  const exportWorkspace = useCallback(async () => {
    try {
      // 收集所有已保存的标签页
      const workspaceData = tabs
        .filter(tab => tab.saved && tab.workspacePath)
        .map(tab => ({
          path: tab.workspacePath,
          content: tab.content,
          metadata: {
            type: tab.type,
            title: tab.title,
            created: new Date().toISOString(),
          },
        }));

      if (workspaceData.length === 0) {
        showMessage.warning('没有可导出的工作区内容');
        return;
      }

      // 调用后端导出工作区
      const exportPath = await safeTauriInvoke<string>('export_workspace', {
        data: workspaceData,
      });

      if (exportPath) {
        showMessage.success(`工作区已导出到: ${exportPath}`);
      }
    } catch (error) {
      console.error('导出工作区失败:', error);
      showMessage.error(`导出失败: ${error}`);
    }
  }, [tabs]);

  // 导入工作区
  const importWorkspace = useCallback(async () => {
    try {
      // 调用后端导入工作区
      const workspaceData = await safeTauriInvoke<Array<{
        path: string;
        content: string;
        metadata: any;
      }>>('import_workspace');

      if (workspaceData && workspaceData.length > 0) {
        // 创建新标签页
        const newTabs: EditorTab[] = workspaceData.map(item => ({
          id: generateUniqueId('tab'),
          title: item.metadata?.title || 'Imported',
          content: item.content,
          type: item.metadata?.type || 'query',
          modified: false,
          saved: true,
          workspacePath: item.path,
        }));

        // 添加到现有标签页
        const allTabs = [...tabs, ...newTabs];
        onTabsChange(allTabs);

        // 激活第一个导入的标签页
        if (newTabs.length > 0) {
          onActiveKeyChange(newTabs[0].id);
        }

        showMessage.success(`已导入 ${newTabs.length} 个工作区文件`);
      }
    } catch (error) {
      console.error('导入工作区失败:', error);
      showMessage.error(`导入失败: ${error}`);
    }
  }, [tabs, onTabsChange, onActiveKeyChange]);

  // 导出数据
  const exportData = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  // 自动保存功能
  const autoSave = useCallback(async (tab: EditorTab) => {
    if (!tab.modified || !tab.workspacePath) {
      return;
    }

    try {
      await safeTauriInvoke('save_to_workspace', {
        path: tab.workspacePath,
        content: tab.content,
        metadata: {
          type: tab.type,
          title: tab.title,
          lastModified: new Date().toISOString(),
        },
      });

      // 更新标签状态
      const updatedTabs = tabs.map(t =>
        t.id === tab.id
          ? { ...t, modified: false }
          : t
      );
      onTabsChange(updatedTabs);

      console.log(`自动保存完成: ${tab.title}`);
    } catch (error) {
      console.error('自动保存失败:', error);
    }
  }, [tabs, onTabsChange]);

  // 批量保存所有修改的标签页
  const saveAllTabs = useCallback(async () => {
    const modifiedTabs = tabs.filter(tab => tab.modified);
    
    if (modifiedTabs.length === 0) {
      showMessage.info('没有需要保存的更改');
      return;
    }

    try {
      const savePromises = modifiedTabs.map(async (tab) => {
        if (tab.workspacePath) {
          // 保存到工作区
          await safeTauriInvoke('save_to_workspace', {
            path: tab.workspacePath,
            content: tab.content,
            metadata: {
              type: tab.type,
              title: tab.title,
              lastModified: new Date().toISOString(),
            },
          });
        } else {
          // 生成新的工作区路径
          const workspacePath = `workspace/${tab.type}/${tab.title}.sql`;
          await safeTauriInvoke('save_to_workspace', {
            path: workspacePath,
            content: tab.content,
            metadata: {
              type: tab.type,
              title: tab.title,
              created: new Date().toISOString(),
            },
          });
          tab.workspacePath = workspacePath;
        }
      });

      await Promise.all(savePromises);

      // 更新所有标签状态
      const updatedTabs = tabs.map(tab => 
        modifiedTabs.includes(tab)
          ? { ...tab, modified: false, saved: true }
          : tab
      );
      onTabsChange(updatedTabs);

      showMessage.success(`已保存 ${modifiedTabs.length} 个文件`);
    } catch (error) {
      console.error('批量保存失败:', error);
      showMessage.error(`保存失败: ${error}`);
    }
  }, [tabs, onTabsChange]);

  return {
    showExportDialog,
    setShowExportDialog,
    saveCurrentTab,
    saveFileAs,
    openFile,
    exportWorkspace,
    importWorkspace,
    exportData,
    autoSave,
    saveAllTabs,
  };
};
