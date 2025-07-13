import React, { useState, useCallback } from 'react';
import { Upload, Alert, Row, Col, Select, Switch, Form, Typography, Button, Table } from 'antd';
import { Card, Space, message } from '@/components/ui';
import { UploadOutlined, FileTextOutlined, FileExcelOutlined, DeleteOutlined } from '@/components/ui';
import type { UploadFile, UploadProps } from '@/components/ui';
import { ImportWizardData } from '../SmartImportWizard';
import { ExcelImportManager } from '../ExcelImportUtils';

const { Text, Title } = Typography;
const { Option } = Select;

interface FileUploadStepProps {
  wizardData: ImportWizardData;
  onDataUpdate: (updates: Partial<ImportWizardData>) => void;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  excelManager: ExcelImportManager;
}

interface ParseOptions {
  // CSV 选项
  delimiter: string;
  encoding: string;
  hasHeader: boolean;
  skipEmptyLines: boolean;
  
  // JSON 选项
  rootPath: string;
  flattenNested: boolean;
  
  // Excel 选项
  worksheet: string;
  headerRow: number;
  
  // 通用选项
  maxRows: number;
  previewRows: number;
}

const FileUploadStep: React.FC<FileUploadStepProps> = ({
  wizardData,
  onDataUpdate,
  loading,
  onLoadingChange,
  excelManager,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parseOptions, setParseOptions] = useState<ParseOptions>({
    delimiter: ',',
    encoding: 'utf-8',
    hasHeader: true,
    skipEmptyLines: true,
    rootPath: '',
    flattenNested: true,
    worksheet: '',
    headerRow: 0,
    maxRows: 100000,
    previewRows: 50,
  });
  const [availableWorksheets, setAvailableWorksheets] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // 文件上传配置
  const uploadProps: UploadProps = {
    accept: '.csv,.json,.txt,.xlsx,.xls',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      // 文件大小限制
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        message.error('文件大小不能超过 100MB');
        return false;
      }

      // 文件类型检查
      const allowedTypes = [
        'text/csv',
        'application/json',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      
      const fileType = file.type;
      const fileName = file.name.toLowerCase();
      const isValidType = allowedTypes.includes(fileType) || 
                         fileName.endsWith('.csv') || 
                         fileName.endsWith('.json') || 
                         fileName.endsWith('.txt') ||
                         fileName.endsWith('.xlsx') ||
                         fileName.endsWith('.xls');
      
      if (!isValidType) {
        message.error('只支持 CSV、JSON、Excel 格式的文件');
        return false;
      }

      setFileList([file]);
      handleFileSelect(file);
      return false;
    },
    onRemove: () => {
      setFileList([]);
      setAvailableWorksheets([]);
      setParseError(null);
      onDataUpdate({
        file: null,
        fileName: '',
        fileSize: 0,
        fileType: 'csv',
        headers: [],
        data: [],
        preview: [],
        totalRows: 0,
        worksheets: [],
        selectedWorksheet: '',
      });
    },
  };

  // 处理文件选择
  const handleFileSelect = useCallback(async (file: File) => {
    onLoadingChange(true);
    setParseError(null);
    
    try {
      const fileType = getFileType(file.name);
      const fileName = file.name;
      const fileSize = file.size;
      
      // 更新基本文件信息
      onDataUpdate({
        file,
        fileName,
        fileSize,
        fileType,
      });

      // 如果是 Excel 文件，获取工作表列表
      if (fileType === 'excel') {
        const worksheets = await excelManager.getWorksheetNames(file);
        setAvailableWorksheets(worksheets);
        
        if (worksheets.length > 0) {
          setParseOptions(prev => ({ ...prev, worksheet: worksheets[0] }));
          onDataUpdate({ worksheets, selectedWorksheet: worksheets[0] });
        }
      } else {
        // 自动解析文件
        await parseFile(file, fileType);
      }
    } catch (error) {
      setParseError(`文件处理失败: ${error}`);
      message.error(`文件处理失败: ${error}`);
    } finally {
      onLoadingChange(false);
    }
  }, [onDataUpdate, onLoadingChange, excelManager]);

  // 获取文件类型
  const getFileType = (fileName: string): 'csv' | 'json' | 'excel' => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'json') return 'json';
    if (ext === 'xlsx' || ext === 'xls') return 'excel';
    return 'csv';
  };

  // 解析文件
  const parseFile = useCallback(async (file: File, fileType: 'csv' | 'json' | 'excel') => {
    onLoadingChange(true);
    setParseError(null);
    
    try {
      let headers: string[] = [];
      let data: any[][] = [];
      let preview: any[][] = [];
      let totalRows = 0;

      switch (fileType) {
        case 'csv':
          const csvResult = await parseCSVFile(file, parseOptions);
          headers = csvResult.headers;
          data = csvResult.data;
          preview = csvResult.preview;
          totalRows = csvResult.totalRows;
          break;
        
        case 'json':
          const jsonResult = await parseJSONFile(file, parseOptions);
          headers = jsonResult.headers;
          data = jsonResult.data;
          preview = jsonResult.preview;
          totalRows = jsonResult.totalRows;
          break;
        
        case 'excel':
          const excelResult = await parseExcelFile(file, parseOptions);
          headers = excelResult.headers;
          data = excelResult.data;
          preview = excelResult.preview;
          totalRows = excelResult.totalRows;
          break;
      }

      onDataUpdate({
        headers,
        data,
        preview,
        totalRows,
      });
    } catch (error) {
      setParseError(`解析失败: ${error}`);
      message.error(`解析失败: ${error}`);
    } finally {
      onLoadingChange(false);
    }
  }, [parseOptions, onDataUpdate, onLoadingChange]);

  // 解析 CSV 文件
  const parseCSVFile = async (file: File, options: ParseOptions) => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('文件为空');
    }

    // 智能检测分隔符
    const delimiter = options.delimiter || detectDelimiter(lines[0]);
    
    // 解析行
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };

    let headers: string[];
    let dataLines: string[];
    
    if (options.hasHeader) {
      headers = parseCSVLine(lines[0]);
      dataLines = lines.slice(1);
    } else {
      const firstRowData = parseCSVLine(lines[0]);
      headers = firstRowData.map((_, index) => `column_${index + 1}`);
      dataLines = lines;
    }

    // 过滤空行
    if (options.skipEmptyLines) {
      dataLines = dataLines.filter(line => line.trim());
    }

    const data = dataLines.map(line => parseCSVLine(line));
    const preview = data.slice(0, options.previewRows);
    const totalRows = data.length;

    return { headers, data, preview, totalRows };
  };

  // 解析 JSON 文件
  const parseJSONFile = async (file: File, options: ParseOptions) => {
    const text = await file.text();
    let jsonData: any;
    
    try {
      jsonData = JSON.parse(text);
    } catch (error) {
      throw new Error('JSON 格式错误');
    }

    // 处理根路径
    if (options.rootPath) {
      const paths = options.rootPath.split('.');
      for (const path of paths) {
        if (jsonData && typeof jsonData === 'object' && jsonData[path]) {
          jsonData = jsonData[path];
        } else {
          throw new Error(`根路径 "${options.rootPath}" 不存在`);
        }
      }
    }
    
    if (!Array.isArray(jsonData)) {
      // 如果不是数组，尝试转换
      if (typeof jsonData === 'object' && jsonData !== null) {
        if (jsonData.data && Array.isArray(jsonData.data)) {
          jsonData = jsonData.data;
        } else {
          jsonData = [jsonData];
        }
      } else {
        throw new Error('JSON 数据必须是数组或包含数组的对象');
      }
    }

    if (jsonData.length === 0) {
      throw new Error('JSON 数据为空');
    }

    // 扁平化嵌套对象
    const flattenedData = options.flattenNested 
      ? jsonData.map(item => flattenObject(item))
      : jsonData;

    const headers = [...new Set(flattenedData.flatMap(item => Object.keys(item)))];
    const data = flattenedData.map(item => headers.map(header => item[header] || ''));
    const preview = data.slice(0, options.previewRows);
    const totalRows = data.length;

    return { headers, data, preview, totalRows };
  };

  // 解析 Excel 文件
  const parseExcelFile = async (file: File, options: ParseOptions) => {
    const worksheet = await excelManager.parseSpecificWorksheet(file, options.worksheet, {
      header: options.headerRow,
    });

    const headers = worksheet.headers;
    const data = worksheet.data;
    const preview = data.slice(0, options.previewRows);
    const totalRows = data.length;

    return { headers, data, preview, totalRows };
  };

  // 扁平化对象
  const flattenObject = (obj: any, prefix = ''): any => {
    const flattened: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      }
    }
    
    return flattened;
  };

  // 智能检测分隔符
  const detectDelimiter = (firstLine: string): string => {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = firstLine.split(delimiter).length - 1;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  };

  // 重新解析文件
  const reParseFile = useCallback(async () => {
    if (!wizardData.file) return;
    
    await parseFile(wizardData.file, wizardData.fileType);
  }, [wizardData.file, wizardData.fileType, parseFile]);

  // 更新解析选项
  const updateParseOptions = useCallback((updates: Partial<ParseOptions>) => {
    setParseOptions(prev => ({ ...prev, ...updates }));
  }, []);

  // 渲染解析选项
  const renderParseOptions = () => {
    if (!wizardData.file) return null;

    return (
      <Card title="解析选项" size="small">
        <Form layout="vertical">
          <Row gutter={16}>
            {/* CSV 选项 */}
            {wizardData.fileType === 'csv' && (
              <>
                <Col span={6}>
                  <Form.Item label="分隔符">
                    <Select
                      value={parseOptions.delimiter}
                      onChange={(value) => updateParseOptions({ delimiter: value })}
                      style={{ width: '100%' }}
                    >
                      <Option value=",">逗号 (,)</Option>
                      <Option value=";">分号 (;)</Option>
                      <Option value="	">制表符 (Tab)</Option>
                      <Option value="|">竖线 (|)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="编码">
                    <Select
                      value={parseOptions.encoding}
                      onChange={(value) => updateParseOptions({ encoding: value })}
                      style={{ width: '100%' }}
                    >
                      <Option value="utf-8">UTF-8</Option>
                      <Option value="gbk">GBK</Option>
                      <Option value="gb2312">GB2312</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="包含表头">
                    <Switch
                      checked={parseOptions.hasHeader}
                      onChange={(checked) => updateParseOptions({ hasHeader: checked })}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="跳过空行">
                    <Switch
                      checked={parseOptions.skipEmptyLines}
                      onChange={(checked) => updateParseOptions({ skipEmptyLines: checked })}
                    />
                  </Form.Item>
                </Col>
              </>
            )}

            {/* JSON 选项 */}
            {wizardData.fileType === 'json' && (
              <>
                <Col span={8}>
                  <Form.Item label="根路径" help="指定 JSON 数据的根路径，例如：data.records">
                    <Input
                      value={parseOptions.rootPath}
                      onChange={(e) => updateParseOptions({ rootPath: e.target.value })}
                      placeholder="留空表示根级别"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="扁平化嵌套对象">
                    <Switch
                      checked={parseOptions.flattenNested}
                      onChange={(checked) => updateParseOptions({ flattenNested: checked })}
                    />
                  </Form.Item>
                </Col>
              </>
            )}

            {/* Excel 选项 */}
            {wizardData.fileType === 'excel' && (
              <>
                <Col span={8}>
                  <Form.Item label="工作表">
                    <Select
                      value={parseOptions.worksheet}
                      onChange={(value) => {
                        updateParseOptions({ worksheet: value });
                        onDataUpdate({ selectedWorksheet: value });
                      }}
                      style={{ width: '100%' }}
                    >
                      {availableWorksheets.map(sheet => (
                        <Option key={sheet} value={sheet}>{sheet}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="表头行号">
                    <Input
                      type="number"
                      value={parseOptions.headerRow}
                      onChange={(e) => updateParseOptions({ headerRow: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </Form.Item>
                </Col>
              </>
            )}

            {/* 通用选项 */}
            <Col span={6}>
              <Form.Item label="最大行数">
                <Input
                  type="number"
                  value={parseOptions.maxRows}
                  onChange={(e) => updateParseOptions({ maxRows: parseInt(e.target.value) || 100000 })}
                  min={1}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="预览行数">
                <Input
                  type="number"
                  value={parseOptions.previewRows}
                  onChange={(e) => updateParseOptions({ previewRows: parseInt(e.target.value) || 50 })}
                  min={1}
                  max={1000}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="重新解析">
                <Button onClick={reParseFile} loading={loading}>
                  重新解析
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    );
  };

  // 渲染文件信息
  const renderFileInfo = () => {
    if (!wizardData.file) return null;

    return (
      <Card title="文件信息" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Text strong>文件名: </Text>
            <Text>{wizardData.fileName}</Text>
          </Col>
          <Col span={6}>
            <Text strong>文件大小: </Text>
            <Text>{(wizardData.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
          </Col>
          <Col span={6}>
            <Text strong>文件类型: </Text>
            <Text>{wizardData.fileType.toUpperCase()}</Text>
          </Col>
          <Col span={6}>
            <Text strong>总行数: </Text>
            <Text>{wizardData.totalRows}</Text>
          </Col>
        </Row>
      </Card>
    );
  };

  // 渲染数据预览
  const renderDataPreview = () => {
    if (wizardData.preview.length === 0) return null;

    const columns = wizardData.headers.map((header, index) => ({
      title: header,
      dataIndex: index,
      key: index,
      width: 150,
      ellipsis: true,
      render: (text: any) => (
        <div style={{ maxWidth: 150 }}>
          {text}
        </div>
      ),
    }));

    const dataSource = wizardData.preview.map((row, index) => ({
      key: index,
      ...row.reduce((acc, cell, cellIndex) => {
        acc[cellIndex] = cell;
        return acc;
      }, {} as Record<number, any>),
    }));

    return (
      <Card title={`数据预览 (前 ${wizardData.preview.length} 行)`} size="small">
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 'max-content', y: 400 }}
          size="small"
        />
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* 文件上传 */}
      <Card title="选择文件">
        <div className="space-y-4">
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 CSV、JSON、Excel 格式文件。文件大小不超过 100MB。
            </p>
          </Upload.Dragger>

          {/* 文件格式说明 */}
          <Alert
            message="支持的文件格式"
            description={
              <div>
                <p><FileTextOutlined /> <strong>CSV 格式:</strong> 逗号分隔值文件，支持自定义分隔符</p>
                <p><FileTextOutlined /> <strong>JSON 格式:</strong> JSON 数组格式，支持嵌套对象扁平化</p>
                <p><FileExcelOutlined /> <strong>Excel 格式:</strong> .xlsx 和 .xls 文件，支持多工作表</p>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      </Card>

      {/* 解析选项 */}
      {renderParseOptions()}

      {/* 文件信息 */}
      {renderFileInfo()}

      {/* 解析错误 */}
      {parseError && (
        <Alert
          message="解析错误"
          description={parseError}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={reParseFile}>
              重新解析
            </Button>
          }
        />
      )}

      {/* 数据预览 */}
      {renderDataPreview()}
    </div>
  );
};

export default FileUploadStep;