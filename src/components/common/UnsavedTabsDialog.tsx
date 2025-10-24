import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText } from 'lucide-react';
import type { EditorTab } from '@/components/editor/TabManager';

interface UnsavedTabsDialogProps {
  open: boolean;
  unsavedTabs: EditorTab[];
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedTabsDialog: React.FC<UnsavedTabsDialogProps> = ({
  open,
  unsavedTabs,
  onSave,
  onDiscard,
  onCancel,
}) => {
  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <DialogTitle>未保存的查询标签页</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            您有 {unsavedTabs.length} 个未保存的查询标签页。关闭应用前是否要保存这些标签页？
          </p>
          
          <div className="max-h-32 overflow-y-auto space-y-2">
            {unsavedTabs.map((tab) => (
              <div key={tab.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium truncate">{tab.title}</span>
                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>• 选择"保存"：这些标签页将在下次启动时恢复</p>
            <p>• 选择"不保存"：这些标签页将被永久丢弃</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            不保存
          </Button>
          <Button onClick={onSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnsavedTabsDialog;
