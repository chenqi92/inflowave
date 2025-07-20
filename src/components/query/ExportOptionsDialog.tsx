import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Input,
  Label,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { 
  FileText, 
  Table, 
  FileSpreadsheet, 
  Code, 
  Hash,
  Download,
  Info
} from 'lucide-react';

export interface ExportFormat {
  id: 'csv' | 'tsv' | 'excel' | 'json' | 'markdown' | 'sql';
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  mimeType: string;
}

export interface ExportOptions {
  format: ExportFormat['id'];
  includeHeaders: boolean;
  delimiter?: string;
  tableName?: string;
  filename?: string;
}

interface ExportOptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  defaultTableName?: string;
  rowCount?: number;
  columnCount?: number;
}

const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'csv',
    name: 'CSV',
    description: '逗号分隔值文件，兼容性最好',
    icon: <FileText className="w-4 h-4" />,
    extension: '.csv',
    mimeType: 'text/csv'
  },
  {
    id: 'tsv',
    name: 'TSV',
    description: '制表符分隔值文件，适合包含逗号的数据',
    icon: <FileText className="w-4 h-4" />,
    extension: '.tsv',
    mimeType: 'text/tab-separated-values'
  },
  {
    id: 'excel',
    name: 'Excel',
    description: 'Excel工作簿文件，支持格式化',
    icon: <FileSpreadsheet className="w-4 h-4" />,
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'JavaScript对象表示法，适合程序处理',
    icon: <Code className="w-4 h-4" />,
    extension: '.json',
    mimeType: 'application/json'
  },
  {
    id: 'markdown',
    name: 'Markdown',
    description: 'Markdown表格格式，适合文档',
    icon: <Hash className="w-4 h-4" />,
    extension: '.md',
    mimeType: 'text/markdown'
  },
  {
    id: 'sql',
    name: 'SQL INSERT',
    description: 'SQL插入语句，可直接执行',
    icon: <Table className="w-4 h-4" />,
    extension: '.sql',
    mimeType: 'text/sql'
  }
];

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({
  open,
  onClose,
  onExport,
  defaultTableName = 'exported_data',
  rowCount = 0,
  columnCount = 0
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat['id']>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [tableName, setTableName] = useState(defaultTableName);
  const [filename, setFilename] = useState('');

  const selectedFormatInfo = EXPORT_FORMATS.find(f => f.id === selectedFormat);

  const handleExport = () => {
    const options: ExportOptions = {
      format: selectedFormat,
      includeHeaders,
      tableName: selectedFormat === 'sql' ? tableName : undefined,
      filename: filename.trim() || undefined
    };

    // 处理自定义分隔符
    if (selectedFormat === 'csv' && customDelimiter.trim()) {
      options.delimiter = customDelimiter.trim();
    }

    onExport(options);
  };

  const generateDefaultFilename = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const extension = selectedFormatInfo?.extension || '.txt';
    return `${defaultTableName}_${timestamp}${extension}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            导出数据
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 数据统计 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                数据统计
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">行数:</span>
                  <Badge variant="secondary">{rowCount.toLocaleString()}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">列数:</span>
                  <Badge variant="secondary">{columnCount}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 格式选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">导出格式</Label>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_FORMATS.map((format) => (
                <Card
                  key={format.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedFormat === format.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{format.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{format.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {format.extension}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 选项配置 */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">导出选项</Label>
            
            {/* 包含表头 */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeHeaders"
                checked={includeHeaders}
                onCheckedChange={setIncludeHeaders}
              />
              <Label htmlFor="includeHeaders" className="text-sm">
                包含表头
              </Label>
            </div>

            {/* CSV自定义分隔符 */}
            {selectedFormat === 'csv' && (
              <div className="space-y-2">
                <Label htmlFor="delimiter" className="text-sm">
                  自定义分隔符 (可选，默认为逗号)
                </Label>
                <Input
                  id="delimiter"
                  value={customDelimiter}
                  onChange={(e) => setCustomDelimiter(e.target.value)}
                  placeholder="例如: ; | |"
                  className="w-32"
                />
              </div>
            )}

            {/* SQL表名 */}
            {selectedFormat === 'sql' && (
              <div className="space-y-2">
                <Label htmlFor="tableName" className="text-sm">
                  目标表名
                </Label>
                <Input
                  id="tableName"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="输入表名"
                />
              </div>
            )}

            {/* 自定义文件名 */}
            <div className="space-y-2">
              <Label htmlFor="filename" className="text-sm">
                文件名 (可选)
              </Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={generateDefaultFilename()}
              />
              <p className="text-xs text-muted-foreground">
                留空将使用默认文件名: {generateDefaultFilename()}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出 {selectedFormatInfo?.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportOptionsDialog;
