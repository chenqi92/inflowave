import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, Search, X } from 'lucide-react';

interface TableListDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  tables: string[];
}

export const TableListDialog: React.FC<TableListDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  tables,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 过滤表列表
  const filteredTables = useMemo(() => {
    if (!searchTerm.trim()) {
      return tables;
    }
    const lowerSearch = searchTerm.toLowerCase();
    return tables.filter(table => table.toLowerCase().includes(lowerSearch));
  }, [tables, searchTerm]);

  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-500" />
            表列表
          </DialogTitle>
          <DialogDescription>
            {database} - 共 {tables.length} 个表/测量值
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索表名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* 表列表 */}
          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-4 space-y-2">
              {filteredTables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? '未找到匹配的表' : '暂无表'}
                </div>
              ) : (
                filteredTables.map((table, index) => (
                  <div
                    key={table}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Table className="w-4 h-4 text-primary" />
                      <span className="font-medium">{table}</span>
                    </div>
                    <Badge variant="secondary">{index + 1}</Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* 统计信息 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              显示 {filteredTables.length} / {tables.length} 个表
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TableListDialog;

