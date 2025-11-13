import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Tag, Copy, Check, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { writeToClipboard } from '@/utils/clipboard';
import { showMessage } from '@/utils/message';
import { Separator } from '@/components/ui/separator';

interface TagValuesDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  table: string;
  tag: string;
  values: string[];
}

const TagValuesDialog: React.FC<TagValuesDialogProps> = ({
  open,
  onClose,
  database,
  table,
  tag,
  values,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // 过滤标签值
  const filteredValues = useMemo(() => {
    if (!searchTerm) return values;
    const lowerSearch = searchTerm.toLowerCase();
    return values.filter(value => 
      value.toLowerCase().includes(lowerSearch)
    );
  }, [values, searchTerm]);

  // 复制标签值
  const handleCopyValue = async (value: string) => {
    const success = await writeToClipboard(value, {
      successMessage: `已复制标签值: ${value}`,
      errorMessage: '复制失败',
    });
    
    if (success) {
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(null), 2000);
    }
  };

  // 复制所有值
  const handleCopyAll = async () => {
    const allValues = filteredValues.join('\n');
    const success = await writeToClipboard(allValues, {
      successMessage: `已复制 ${filteredValues.length} 个标签值`,
      errorMessage: '复制失败',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            标签值列表
          </DialogTitle>
          <DialogDescription>
            {database} / {table} / {tag}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  标签值数量
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {values.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  唯一值
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-blue-500" />
                  标签基数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {values.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  不同值的数量
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* 搜索框 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索标签值..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              disabled={filteredValues.length === 0}
            >
              <Copy className="w-4 h-4 mr-2" />
              复制全部
            </Button>
          </div>

          {/* 搜索结果统计 */}
          {searchTerm && (
            <div className="text-sm text-muted-foreground">
              找到 {filteredValues.length} 个匹配的值
            </div>
          )}

          {/* 标签值列表 */}
          <div className="flex-1 overflow-y-auto border rounded-md p-4">
            {filteredValues.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredValues.map((value, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleCopyValue(value)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs font-mono max-w-[200px] truncate">
                        {value}
                      </Badge>
                      {copiedValue === value ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                {searchTerm ? '没有找到匹配的标签值' : '没有标签值'}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TagValuesDialog;

