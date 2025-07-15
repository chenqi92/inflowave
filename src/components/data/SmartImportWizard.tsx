import React, { useState, useEffect, useCallback } from 'react';
import { Button, Alert, Progress } from '@/components/ui';
import { showMessage } from '@/utils/message';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Upload, Database, Settings, Eye, CheckCircle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';

// 导入工具类
import { DataValidator, DataQualityAnalyzer, DataCleaner, ValidationRule, DataQualityReport, CleaningRule } from './DataValidationUtils';
import { ExcelImportManager } from './ExcelImportUtils';

// 导入子组件
import FileUploadStep from './steps/FileUploadStep';
import DataPreviewStep from './steps/DataPreviewStep';
import FieldMappingStep from './steps/FieldMappingStep';
import DataValidationStep from './steps/DataValidationStep';
import DataCleaningStep from './steps/DataCleaningStep';
import ImportConfigStep from './steps/ImportConfigStep';
import ImportExecutionStep from './steps/ImportExecutionStep';

interface SmartImportWizardProps {
  open: boolean;
  onClose: () => void;
  connectionId: string | null;
  database: string;
  onSuccess?: () => void;
}

export interface ImportWizardData {
  // 文件信息
  file: File | null;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'json' | 'excel';
  
  // 解析数据
  headers: string[];
  data: any[][];
  preview: any[][];
  totalRows: number;
  
  // Excel 特有
  worksheets?: string[];
  selectedWorksheet?: string;
  
  // 字段映射
  fieldMappings: FieldMapping[];
  
  // 验证相关
  validationRules: Map<string, ValidationRule[]>;
  qualityReport: DataQualityReport | null;
  
  // 清理相关
  cleaningRules: CleaningRule[];
  cleanedData: any[][] | null;
  
  // 导入配置
  importConfig: ImportConfig;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  fieldType: 'tag' | 'field' | 'time' | 'ignore';
  dataType: 'string' | 'number' | 'boolean' | 'timestamp';
  required: boolean;
  defaultValue?: string;
  validationRules?: ValidationRule[];
}

export interface ImportConfig {
  measurement: string;
  batchSize: number;
  precision: 'ns' | 'us' | 'ms' | 's';
  retentionPolicy?: string;
  skipErrors: boolean;
  enableValidation: boolean;
  enableCleaning: boolean;
  createBackup: boolean;
}

interface ImportProgress {
  stage: string;
  step: string;
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
  errors: string[];
  warnings: string[];
}

const SmartImportWizard: React.FC<SmartImportWizardProps> = ({
  open,
  onClose,
  connectionId,
  database,
  onSuccess}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [wizardData, setWizardData] = useState<ImportWizardData>({
    file: null,
    fileName: '',
    fileSize: 0,
    fileType: 'csv',
    headers: [],
    data: [],
    preview: [],
    totalRows: 0,
    fieldMappings: [],
    validationRules: new Map(),
    qualityReport: null,
    cleaningRules: [],
    cleanedData: null,
    importConfig: {
      measurement: '',
      batchSize: 1000,
      precision: 'ns',
      skipErrors: false,
      enableValidation: true,
      enableCleaning: false,
      createBackup: false}});
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [measurements, setMeasurements] = useState<string[]>([]);

  // 工具实例
  const [dataValidator] = useState(() => new DataValidator());
  const [qualityAnalyzer] = useState(() => new DataQualityAnalyzer());
  const [dataCleaner] = useState(() => new DataCleaner());
  const [excelManager] = useState(() => new ExcelImportManager());

  // 步骤定义
  const steps = [
    {
      title: '上传文件',
      icon: <Upload className="w-4 h-4"  />,
      description: '选择要导入的数据文件'},
    {
      title: '数据预览',
      icon: <Eye className="w-4 h-4"  />,
      description: '预览和确认数据内容'},
    {
      title: '字段映射',
      icon: <Database className="w-4 h-4"  />,
      description: '配置字段映射关系'},
    {
      title: '数据验证',
      icon: <CheckCircle />,
      description: '验证数据质量'},
    {
      title: '数据清理',
      icon: <Settings className="w-4 h-4"  />,
      description: '清理和标准化数据'},
    {
      title: '导入配置',
      icon: <Settings className="w-4 h-4"  />,
      description: '配置导入参数'},
    {
      title: '执行导入',
      icon: <CheckCircle />,
      description: '执行数据导入'},
  ];

  // 重置向导状态
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setLoading(false);
    setWizardData({
      file: null,
      fileName: '',
      fileSize: 0,
      fileType: 'csv',
      headers: [],
      data: [],
      preview: [],
      totalRows: 0,
      fieldMappings: [],
      validationRules: new Map(),
      qualityReport: null,
      cleaningRules: [],
      cleanedData: null,
      importConfig: {
        measurement: '',
        batchSize: 1000,
        precision: 'ns',
        skipErrors: false,
        enableValidation: true,
        enableCleaning: false,
        createBackup: false}});
    setImportProgress(null);
  }, []);

  // 加载测量列表
  const loadMeasurements = useCallback(async () => {
    if (!connectionId || !database) return;

    try {
      const measurementList = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId,
        database});
      setMeasurements(measurementList);
    } catch (error) {
      console.error('加载测量列表失败:', error);
    }
  }, [connectionId, database]);

  useEffect(() => {
    if (open) {
      loadMeasurements();
    } else {
      resetWizard();
    }
  }, [open, loadMeasurements, resetWizard]);

  // 更新向导数据
  const updateWizardData = useCallback((updates: Partial<ImportWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  // 下一步
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  // 上一步
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // 跳转到指定步骤
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  // 验证当前步骤
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    switch (currentStep) {
      case 0: // 文件上传
        return wizardData.file !== null && wizardData.headers.length > 0;
      
      case 1: // 数据预览
        return wizardData.data.length > 0;
      
      case 2: // 字段映射
        return wizardData.fieldMappings.length > 0 && 
               wizardData.fieldMappings.some(m => m.fieldType === 'time');
      
      case 3: // 数据验证
        if (wizardData.importConfig.enableValidation) {
          return wizardData.qualityReport !== null && wizardData.qualityReport.qualityScore >= 60;
        }
        return true;
      
      case 4: // 数据清理
        return true; // 可选步骤
      
      case 5: // 导入配置
        return wizardData.importConfig.measurement !== '';
      
      default:
        return true;
    }
  }, [currentStep, wizardData]);

  // 处理步骤完成
  const handleStepComplete = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) {
      showMessage.error("请完成当前步骤的必填项");
      return;
    }

    // 执行步骤特定的处理
    switch (currentStep) {
      case 3: // 数据验证完成后，如果启用清理功能，生成清理建议
        if (wizardData.importConfig.enableCleaning && wizardData.qualityReport) {
          const cleaningRules = generateCleaningRules(wizardData.qualityReport);
          updateWizardData({ cleaningRules });
        }
        break;
      
      case 4: // 数据清理完成后，应用清理规则
        if (wizardData.importConfig.enableCleaning && wizardData.cleaningRules.length > 0) {
          const cleanedData = dataCleaner.applyCleaningRules(
            wizardData.data,
            wizardData.headers,
            wizardData.cleaningRules
          );
          updateWizardData({ cleanedData });
        }
        break;
    }

    nextStep();
  }, [currentStep, validateCurrentStep, wizardData, updateWizardData, nextStep, dataCleaner]);

  // 生成清理规则
  const generateCleaningRules = (qualityReport: DataQualityReport): CleaningRule[] => {
    const rules: CleaningRule[] = [];

    qualityReport.issues.forEach(issue => {
      switch (issue.type) {
        case 'missing':
          rules.push({
            type: 'fillMissing',
            field: '*',
            params: { method: 'constant', value: '' }});
          break;
        
        case 'duplicate':
          rules.push({
            type: 'removeDuplicates',
            field: '*',
            params: {}});
          break;
        
        case 'outlier':
          rules.push({
            type: 'removeOutliers',
            field: '*',
            params: { method: 'iqr' }});
          break;
      }
    });

    return rules;
  };

  // 执行导入
  const executeImport = useCallback(async () => {
    if (!connectionId || !wizardData.file) return;

    setLoading(true);
    
    try {
      // 准备导入数据
      const importData = wizardData.cleanedData || wizardData.data;
      const importRequest = {
        connectionId,
        database,
        measurement: wizardData.importConfig.measurement,
        fieldMappings: wizardData.fieldMappings.filter(m => m.fieldType !== 'ignore'),
        data: importData,
        options: {
          batchSize: wizardData.importConfig.batchSize,
          precision: wizardData.importConfig.precision,
          retentionPolicy: wizardData.importConfig.retentionPolicy,
          skipErrors: wizardData.importConfig.skipErrors,
          createBackup: wizardData.importConfig.createBackup}};

      // 模拟进度更新
      const stages = [
        { stage: 'preparing', message: '准备导入数据...', progress: 10 },
        { stage: 'validating', message: '验证数据格式...', progress: 20 },
        { stage: 'processing', message: '处理数据...', progress: 40 },
        { stage: 'writing', message: '写入数据库...', progress: 80 },
        { stage: 'completed', message: '导入完成', progress: 100 },
      ];

      for (const stage of stages) {
        setImportProgress({
          stage: stage.stage,
          step: steps[currentStep].title,
          progress: stage.progress,
          message: stage.message,
          processedRows: Math.floor((stage.progress / 100) * wizardData.totalRows),
          totalRows: wizardData.totalRows,
          errors: [],
          warnings: []});
        
        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 调用后端导入接口
      await safeTauriInvoke('smart_import_data', importRequest);

      showMessage.success("数据导入成功" );
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setImportProgress({
        stage: 'error',
        step: steps[currentStep].title,
        progress: 0,
        message: `导入失败: ${error}`,
        processedRows: 0,
        totalRows: wizardData.totalRows,
        errors: [String(error)],
        warnings: []});
      toast({ title: "错误", description: `数据导入失败: ${error}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [connectionId, database, wizardData, currentStep, steps, onSuccess]);

  // 渲染当前步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <FileUploadStep
            wizardData={wizardData}
            onDataUpdate={updateWizardData}
            disabled={loading}
            onLoadingChange={setLoading}
            excelManager={excelManager}
          />
        );
      
      case 1:
        return (
          <DataPreviewStep
            wizardData={wizardData}
            onDataUpdate={updateWizardData}
          />
        );
      
      case 2:
        return (
          <FieldMappingStep
            wizardData={wizardData}
            onDataUpdate={updateWizardData}
            measurements={measurements}
          />
        );
      
      case 3:
        return (
          <DataValidationStep
            wizardData={wizardData}
            onDataUpdate={updateWizardData}
            dataValidator={dataValidator}
            qualityAnalyzer={qualityAnalyzer}
            disabled={loading}
            onLoadingChange={setLoading}
          />
        );
      
      case 4:
        return (
          <DataCleaningStep
            wizardData={wizardData}
            onDataUpdate={updateWizardData}
            dataCleaner={dataCleaner}
            disabled={loading}
            onLoadingChange={setLoading}
          />
        );
      
      case 5:
        return (
          <ImportConfigStep
            wizardData={wizardData}
            onDataUpdate={updateWizardData}
            measurements={measurements}
          />
        );
      
      case 6:
        return (
          <ImportExecutionStep
            wizardData={wizardData}
            importProgress={importProgress}
            onExecute={executeImport}
            onClose={onClose}
            onReset={resetWizard}
            disabled={loading}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>智能数据导入向导</DialogTitle>
        </DialogHeader>
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <div>
          <Steps 
            current={currentStep} 
            size="small"
            onValueChange={(step) => {
              // 允许用户点击已完成的步骤
              if (step < currentStep) {
                goToStep(step);
              }
            }}
          >
            {steps.map((step, index) => (
              <Steps.Step
                key={index}
                title={step.title}
                description={step.description}
                icon={step.icon}
                disabled={index > currentStep}
              />
            ))}
          </Steps>
        </div>

        {/* 当前步骤内容 */}
        <div className="min-h-[500px]">
          {renderStepContent()}
        </div>

        {/* 导航按钮 */}
        {currentStep < steps.length - 1 && (
          <div>
            <div className="flex justify-between items-center">
              <div>
                <Text type="secondary">
                  第 {currentStep + 1} 步，共 {steps.length} 步
                </Text>
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button onClick={prevStep} disabled={loading}>
                    上一步
                  </Button>
                )}
                <Button onClick={onClose} disabled={loading}>
                  取消
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleStepComplete}
                  disabled={loading}
                >
                  {currentStep === steps.length - 2 ? '开始导入' : '下一步'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 进度提示 */}
        {importProgress && (
          <div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Text strong>{importProgress.message}</Text>
                <Text>
                  {importProgress.processedRows} / {importProgress.totalRows}
                </Text>
              </div>
              <Progress 
                percent={importProgress.progress} 
                status={importProgress.stage === 'error' ? 'exception' : 'normal'}
                strokeColor={importProgress.stage === 'completed' ? '#52c41a' : undefined}
              />
              
              {importProgress.errors.length > 0 && (
                <Alert
                  type="error"
                  message="导入错误"
                  description={importProgress.errors.join(', ')}
                  showIcon
                />
              )}
              
              {importProgress.warnings.length > 0 && (
                <Alert
                  type="warning"
                  message="导入警告"
                  description={importProgress.warnings.join(', ')}
                  showIcon
                />
              )}
            </div>
          </div>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartImportWizard;