/**
 * 导出配置对话框
 * 用于配置数据导出选项（CSV/JSON）
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import {
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { FileDown, FileJson, FileSpreadsheet } from 'lucide-react';
import {
  ExportFormat,
  ExportConfig,
  CSVExportOptions,
  JSONExportOptions,
  DEFAULT_CSV_OPTIONS,
  DEFAULT_JSON_OPTIONS,
} from '@/utils/dataExport';

/**
 * 组件属性
 */
export interface ExportConfigDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 确认导出回调 */
  onExport: (config: ExportConfig) => void | Promise<void>;
  /** 默认文件名 */
  defaultFilename?: string;
  /** 总行数（用于显示） */
  totalRows?: number;
  /** 总列数（用于显示） */
  totalColumns?: number;
}

/**
 * 导出配置对话框组件
 */
export const ExportConfigDialog: React.FC<ExportConfigDialogProps> = ({
  open,
  onClose,
  onExport,
  defaultFilename = 'export',
  totalRows = 0,
  totalColumns = 0,
}) => {
  // 状态
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [filename, setFilename] = useState(defaultFilename);

  // CSV 选项
  const [csvDelimiter, setCsvDelimiter] = useState<',' | ';' | '\t' | '|'>(
    DEFAULT_CSV_OPTIONS.delimiter
  );
  const [csvIncludeHeaders, setCsvIncludeHeaders] = useState(
    DEFAULT_CSV_OPTIONS.includeHeaders
  );
  const [csvLineBreak, setCsvLineBreak] = useState<'\n' | '\r\n'>(
    DEFAULT_CSV_OPTIONS.lineBreak
  );
  const [csvEscapeQuotes, setCsvEscapeQuotes] = useState(
    DEFAULT_CSV_OPTIONS.escapeQuotes
  );
  const [csvDateFormat, setCsvDateFormat] = useState<'iso' | 'locale' | 'timestamp'>(
    DEFAULT_CSV_OPTIONS.dateFormat
  );
  const [csvNullValue, setCsvNullValue] = useState(DEFAULT_CSV_OPTIONS.nullValue);

  // JSON 选项
  const [jsonPretty, setJsonPretty] = useState(DEFAULT_JSON_OPTIONS.pretty);
  const [jsonIndent, setJsonIndent] = useState(DEFAULT_JSON_OPTIONS.indent);
  const [jsonDateFormat, setJsonDateFormat] = useState<'iso' | 'locale' | 'timestamp'>(
    DEFAULT_JSON_OPTIONS.dateFormat
  );
  const [jsonIncludeMetadata, setJsonIncludeMetadata] = useState(
    DEFAULT_JSON_OPTIONS.includeMetadata
  );

  // 处理导出
  const handleExport = () => {
    const csvOptions: CSVExportOptions = {
      delimiter: csvDelimiter,
      includeHeaders: csvIncludeHeaders,
      lineBreak: csvLineBreak,
      escapeQuotes: csvEscapeQuotes,
      dateFormat: csvDateFormat,
      nullValue: csvNullValue,
    };

    const jsonOptions: JSONExportOptions = {
      pretty: jsonPretty,
      indent: jsonIndent,
      dateFormat: jsonDateFormat,
      includeMetadata: jsonIncludeMetadata,
    };

    const config: ExportConfig = {
      format,
      filename,
      csvOptions,
      jsonOptions,
    };

    onExport(config);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            导出数据
          </DialogTitle>
          <DialogDescription>
            配置导出选项并选择保存位置。将导出 {totalRows} 行 × {totalColumns} 列数据。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 文件名 */}
          <div className="space-y-2">
            <Label htmlFor="filename">文件名</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="export"
            />
          </div>

          {/* 导出格式 */}
          <div className="space-y-2">
            <Label>导出格式</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV（逗号分隔值）
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="w-4 h-4" />
                  JSON（JavaScript 对象表示法）
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 格式特定选项 */}
          <Tabs value={format} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv">CSV 选项</TabsTrigger>
              <TabsTrigger value="json">JSON 选项</TabsTrigger>
            </TabsList>

            {/* CSV 选项 */}
            <TabsContent value="csv" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-delimiter">分隔符</Label>
                  <Select value={csvDelimiter} onValueChange={(v: any) => setCsvDelimiter(v)}>
                    <SelectTrigger id="csv-delimiter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=",">逗号 (,)</SelectItem>
                      <SelectItem value=";">分号 (;)</SelectItem>
                      <SelectItem value="\t">制表符 (Tab)</SelectItem>
                      <SelectItem value="|">竖线 (|)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-linebreak">换行符</Label>
                  <Select value={csvLineBreak} onValueChange={(v: any) => setCsvLineBreak(v)}>
                    <SelectTrigger id="csv-linebreak">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="\n">LF (\n)</SelectItem>
                      <SelectItem value="\r\n">CRLF (\r\n)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-dateformat">日期格式</Label>
                  <Select value={csvDateFormat} onValueChange={(v: any) => setCsvDateFormat(v)}>
                    <SelectTrigger id="csv-dateformat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso">ISO 8601</SelectItem>
                      <SelectItem value="locale">本地格式</SelectItem>
                      <SelectItem value="timestamp">时间戳</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-nullvalue">空值表示</Label>
                  <Input
                    id="csv-nullvalue"
                    value={csvNullValue}
                    onChange={(e) => setCsvNullValue(e.target.value)}
                    placeholder="留空或输入自定义值"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="csv-headers" className="cursor-pointer">
                  包含表头
                </Label>
                <Switch
                  id="csv-headers"
                  checked={csvIncludeHeaders}
                  onCheckedChange={setCsvIncludeHeaders}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="csv-escape" className="cursor-pointer">
                  转义引号
                </Label>
                <Switch
                  id="csv-escape"
                  checked={csvEscapeQuotes}
                  onCheckedChange={setCsvEscapeQuotes}
                />
              </div>
            </TabsContent>

            {/* JSON 选项 */}
            <TabsContent value="json" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="json-dateformat">日期格式</Label>
                  <Select value={jsonDateFormat} onValueChange={(v: any) => setJsonDateFormat(v)}>
                    <SelectTrigger id="json-dateformat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso">ISO 8601</SelectItem>
                      <SelectItem value="locale">本地格式</SelectItem>
                      <SelectItem value="timestamp">时间戳</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="json-indent">缩进空格数</Label>
                  <Select value={String(jsonIndent)} onValueChange={(v) => setJsonIndent(Number(v))}>
                    <SelectTrigger id="json-indent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 空格</SelectItem>
                      <SelectItem value="4">4 空格</SelectItem>
                      <SelectItem value="8">8 空格</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="json-pretty" className="cursor-pointer">
                  格式化输出（美化）
                </Label>
                <Switch
                  id="json-pretty"
                  checked={jsonPretty}
                  onCheckedChange={setJsonPretty}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="json-metadata" className="cursor-pointer">
                  包含元数据
                </Label>
                <Switch
                  id="json-metadata"
                  checked={jsonIncludeMetadata}
                  onCheckedChange={setJsonIncludeMetadata}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleExport}>
            <FileDown className="w-4 h-4 mr-2" />
            导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportConfigDialog;

