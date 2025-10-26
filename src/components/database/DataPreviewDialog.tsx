import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, Table as TableIcon } from 'lucide-react';
import type { QueryResult } from '@/types';

interface DataPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  table: string;
  data: QueryResult;
}

/**
 * 数据预览对话框
 */
export const DataPreviewDialog: React.FC<DataPreviewDialogProps> = ({
  open,
  onClose,
  database,
  table,
  data,
}) => {
  if (!data) {
    return null;
  }

  const columns = data.columns || [];
  const rows = data.data || [];
  const rowCount = rows.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-500" />
            数据预览
          </DialogTitle>
          <DialogDescription>
            {database} / {table} - 前 {rowCount} 条记录
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-2" />

        <div className="flex-1 min-h-0">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TableIcon className="w-4 h-4 text-blue-500" />
                  数据表格
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {rowCount} 行
                  </Badge>
                  <Badge variant="outline">
                    {columns.length} 列
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-muted z-10">
                      <tr className="border-b">
                        {columns.map((col, index) => (
                          <th
                            key={index}
                            className="text-left p-3 font-medium whitespace-nowrap border-r last:border-r-0"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="text-center py-8 text-muted-foreground"
                          >
                            暂无数据
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-b hover:bg-muted/50 transition-colors"
                          >
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="p-3 whitespace-nowrap border-r last:border-r-0"
                              >
                                {cell !== null && cell !== undefined ? (
                                  typeof cell === 'object' ? (
                                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                      {JSON.stringify(cell)}
                                    </code>
                                  ) : (
                                    String(cell)
                                  )
                                ) : (
                                  <span className="text-muted-foreground italic">null</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataPreviewDialog;

