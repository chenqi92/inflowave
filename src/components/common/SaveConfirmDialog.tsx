import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { AlertTriangle, FileText } from 'lucide-react';
import type { EditorTab } from '@components/editor';

interface SaveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  unsavedTabs: EditorTab[];
  onSaveAll: () => Promise<void>;
  onDiscardAll: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

const SaveConfirmDialog: React.FC<SaveConfirmDialogProps> = ({
  open,
  onClose,
  unsavedTabs,
  onSaveAll,
  onDiscardAll,
  onCancel,
  title = '保存更改',
  description = '以下标签页包含未保存的更改，是否要保存？',
}) => {
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveAll();
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAll = () => {
    onDiscardAll();
    onClose();
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              未保存的标签页 ({unsavedTabs.length}):
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {unsavedTabs.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{tab.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tab.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="text-sm text-muted-foreground">
            <div className="space-y-1">
              <div>• <strong>保存全部</strong>：将所有更改保存到工作区</div>
              <div>• <strong>不保存</strong>：丢弃所有更改并继续操作</div>
              <div>• <strong>取消</strong>：取消当前操作</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDiscardAll}
            disabled={isSaving}
          >
            不保存
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存全部'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveConfirmDialog;
