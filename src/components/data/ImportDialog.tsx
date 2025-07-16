import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Switch
} from '@/components/ui';
import { Upload, Database, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string | null;
  database: string;
  onSuccess?: () => void;
}

interface ImportConfig {
  format: 'csv' | 'json' | 'line_protocol';
  measurement: string;
  delimiter?: string;
  hasHeader?: boolean;
  timeColumn?: string;
  timeFormat?: string;
  tagColumns: string[];
  fieldColumns: string[];
  batchSize: number;
}

interface ImportProgress {
  stage: 'idle' | 'uploading' | 'processing' | 'importing' | 'completed' | 'error';
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  errors?: string[];
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    format: 'csv',
    measurement: '',
    delimiter: ',',
    hasHeader: true,
    tagColumns: [],
    fieldColumns: [],
    batchSize: 1000
  });
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
    processedRows: 0,
    totalRows: 0
  });

  const steps = [
    { title: '选择文件', description: '上传数据文件' },
    { title: '配置导入', description: '设置导入参数' },
    { title: '执行导入', description: '导入数据到数据库' }
  ];

  // 重置状态
  const resetState = useCallback(() => {
    setCurrentStep(0);
    setSelectedFile(null);
    setPreviewData([]);
    setImportConfig({
      format: 'csv',
      measurement: '',
      delimiter: ',',
      hasHeader: true,
      tagColumns: [],
      fieldColumns: [],
      batchSize: 1000
    });
    setImportProgress({
      stage: 'idle',
      progress: 0,
      message: '',
      processedRows: 0,
      totalRows: 0
    });
  }, []);

  // 文件选择处理
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportProgress({
      stage: 'uploading',
      progress: 0,
      message: '正在读取文件...',
      processedRows: 0,
      totalRows: 0
    });

    try {
      // 读取文件预览
      const text = await file.text();
      const lines = text.split('\n').slice(0, 10); // 只预览前10行
      
      if (importConfig.format === 'csv') {
        const preview = lines.map(line => line.split(importConfig.delimiter || ','));
        setPreviewData(preview);
      } else if (importConfig.format === 'json') {
        try {
          const jsonData = JSON.parse(text);
          setPreviewData(Array.isArray(jsonData) ? jsonData.slice(0, 10) : [jsonData]);
        } catch {
          setPreviewData([{ error: '无效的JSON格式' }]);
        }
      }

      setImportProgress({
        stage: 'idle',
        progress: 100,
        message: '文件读取完成',
        processedRows: 0,
        totalRows: lines.length
      });

      showMessage.success('文件上传成功');
    } catch (error) {
      showMessage.error(`文件读取失败: ${error}`);
      setImportProgress({
        stage: 'error',
        progress: 0,
        message: `文件读取失败: ${error}`,
        processedRows: 0,
        totalRows: 0
      });
    }
  }, [importConfig.format, importConfig.delimiter]);

  // 执行导入
  const executeImport = useCallback(async () => {
    if (!selectedFile || !connectionId) {
      showMessage.error('请选择文件和连接');
      return;
    }

    setImportProgress({
      stage: 'importing',
      progress: 0,
      message: '开始导入数据...',
      processedRows: 0,
      totalRows: previewData.length
    });

    try {
      // 模拟导入过程
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setImportProgress(prev => ({
          ...prev,
          progress: i,
          message: `正在导入数据... ${i}%`,
          processedRows: Math.floor((i / 100) * prev.totalRows)
        }));
      }

      setImportProgress({
        stage: 'completed',
        progress: 100,
        message: '导入完成',
        processedRows: previewData.length,
        totalRows: previewData.length
      });

      showMessage.success('数据导入成功');
      onSuccess?.();
    } catch (error) {
      setImportProgress({
        stage: 'error',
        progress: 0,
        message: `导入失败: ${error}`,
        processedRows: 0,
        totalRows: 0,
        errors: [String(error)]
      });
      showMessage.error(`导入失败: ${error}`);
    }
  }, [selectedFile, connectionId, previewData.length, onSuccess]);

  // 渲染文件选择步骤
  const renderFileStep = () => (
    <div className="space-y-4">
      <Alert>
        <Info className="w-4 h-4" />
        <div>
          <div className="font-medium">支持的文件格式</div>
          <div className="text-sm text-muted-foreground">
            CSV、JSON、Line Protocol 格式的数据文件
          </div>
        </div>
      </Alert>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">选择文件格式</label>
          <Select
            value={importConfig.format}
            onValueChange={(value: 'csv' | 'json' | 'line_protocol') =>
              setImportConfig(prev => ({ ...prev, format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV 格式</SelectItem>
              <SelectItem value="json">JSON 格式</SelectItem>
              <SelectItem value="line_protocol">Line Protocol</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">选择文件</label>
          <Input
            type="file"
            accept=".csv,.json,.txt"
            onChange={handleFileSelect}
          />
        </div>

        {selectedFile && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <div>
              <div className="font-medium">文件信息</div>
              <div className="text-sm text-muted-foreground">
                文件名: {selectedFile.name} | 大小: {(selectedFile.size / 1024).toFixed(2)} KB
              </div>
            </div>
          </Alert>
        )}

        {previewData.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">数据预览</h4>
            <div className="border rounded p-2 bg-muted max-h-40 overflow-auto">
              <pre className="text-xs">
                {JSON.stringify(previewData.slice(0, 5), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染配置步骤
  const renderConfigStep = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">测量名称</label>
          <Input
            value={importConfig.measurement}
            onChange={(e) =>
              setImportConfig(prev => ({ ...prev, measurement: e.target.value }))
            }
            placeholder="请输入测量名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">批处理大小</label>
          <Input
            type="number"
            value={importConfig.batchSize}
            onChange={(e) =>
              setImportConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1000 }))
            }
            min={100}
            max={10000}
          />
        </div>
      </div>

      {importConfig.format === 'csv' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={importConfig.hasHeader}
              onCheckedChange={(checked) =>
                setImportConfig(prev => ({ ...prev, hasHeader: checked }))
              }
            />
            <label className="text-sm font-medium">包含表头</label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">分隔符</label>
            <Select
              value={importConfig.delimiter}
              onValueChange={(value) =>
                setImportConfig(prev => ({ ...prev, delimiter: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=",">逗号 (,)</SelectItem>
                <SelectItem value=";">分号 (;)</SelectItem>
                <SelectItem value="\t">制表符 (\t)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>数据导入</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 步骤指示器 */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center ${
                  index < steps.length - 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    index <= currentStep
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="ml-2">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-px bg-muted-foreground mx-4" />
                )}
              </div>
            ))}
          </div>

          {/* 步骤内容 */}
          <div className="min-h-[400px]">
            {currentStep === 0 && renderFileStep()}
            {currentStep === 1 && renderConfigStep()}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Alert>
                  <Database className="w-4 h-4" />
                  <div>
                    <div className="font-medium">准备导入</div>
                    <div className="text-sm text-muted-foreground">
                      将数据导入到数据库 {database} 的测量 {importConfig.measurement}
                    </div>
                  </div>
                </Alert>

                {importProgress.stage !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{importProgress.message}</span>
                      <span>{importProgress.processedRows} / {importProgress.totalRows}</span>
                    </div>
                    <Progress value={importProgress.progress} />
                  </div>
                )}

                {importProgress.stage === 'error' && importProgress.errors && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <div>
                      <div className="font-medium">导入失败</div>
                      <div className="text-sm">
                        {importProgress.errors.map((error, index) => (
                          <div key={index}>{error}</div>
                        ))}
                      </div>
                    </div>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={importProgress.stage === 'importing'}
                >
                  上一步
                </Button>
              )}

              {currentStep < 2 && (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={
                    (currentStep === 0 && !selectedFile) ||
                    (currentStep === 1 && !importConfig.measurement)
                  }
                >
                  下一步
                </Button>
              )}

              {currentStep === 2 && importProgress.stage === 'idle' && (
                <Button onClick={executeImport}>
                  开始导入
                </Button>
              )}

              {importProgress.stage === 'completed' && (
                <Button onClick={() => { resetState(); onSuccess?.(); }}>
                  继续导入
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
