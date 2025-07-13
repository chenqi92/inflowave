import { useForm } from 'react-hook-form';
import React, { useState, useCallback, useMemo } from 'react';
import { Table, Input, Select, Switch, Button, Alert, Row, Col, Typography, Tag, Form, Modal } from '@/components/ui';
// TODO: Replace these Ant Design components: Tooltip
import { Card, Space, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';

import { BulkOutlined } from '@/components/ui';
import { Info, Edit, Trash2, Plus, CheckCircle } from 'lucide-react';
import { ImportWizardData, FieldMapping } from '../SmartImportWizard';
import { createDefaultValidationRules } from '../DataValidationUtils';

const { Text, Title } = Typography;
const { Option } = Select;

interface FieldMappingStepProps {
  wizardData: ImportWizardData;
  onDataUpdate: (updates: Partial<ImportWizardData>) => void;
  measurements: string[];
}

interface MappingTemplate {
  name: string;
  description: string;
  mappings: Partial<FieldMapping>[];
}

const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  wizardData,
  onDataUpdate,
  measurements}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const form = useForm();

  // 预定义映射模板
  const mappingTemplates: MappingTemplate[] = [
    {
      name: 'IoT传感器数据',
      description: '适用于IoT设备传感器数据导入',
      mappings: [
        { fieldType: 'time', targetField: 'timestamp' },
        { fieldType: 'tag', targetField: 'device_id' },
        { fieldType: 'tag', targetField: 'sensor_type' },
        { fieldType: 'field', targetField: 'value', dataType: 'number' },
        { fieldType: 'field', targetField: 'temperature', dataType: 'number' },
        { fieldType: 'field', targetField: 'humidity', dataType: 'number' },
      ]},
    {
      name: '系统监控数据',
      description: '适用于系统性能监控数据导入',
      mappings: [
        { fieldType: 'time', targetField: 'timestamp' },
        { fieldType: 'tag', targetField: 'hostname' },
        { fieldType: 'tag', targetField: 'service' },
        { fieldType: 'field', targetField: 'cpu_usage', dataType: 'number' },
        { fieldType: 'field', targetField: 'memory_usage', dataType: 'number' },
        { fieldType: 'field', targetField: 'disk_usage', dataType: 'number' },
      ]},
    {
      name: '业务指标数据',
      description: '适用于业务KPI指标数据导入',
      mappings: [
        { fieldType: 'time', targetField: 'timestamp' },
        { fieldType: 'tag', targetField: 'department' },
        { fieldType: 'tag', targetField: 'product' },
        { fieldType: 'field', targetField: 'revenue', dataType: 'number' },
        { fieldType: 'field', targetField: 'orders', dataType: 'number' },
        { fieldType: 'field', targetField: 'users', dataType: 'number' },
      ]},
  ];

  // 智能推断字段映射
  const generateSmartMapping = useCallback(() => {
    const mappings: FieldMapping[] = wizardData.headers.map((header, index) => {
      const sampleValues = wizardData.preview.map(row => row[index]).filter(v => v !== null && v !== '');
      const dataType = inferDataType(sampleValues);
      
      // 智能推断字段类型
      let fieldType: 'tag' | 'field' | 'time' | 'ignore' = 'field';
      const lowerHeader = header.toLowerCase();
      
      // 时间字段识别
      if (lowerHeader.includes('time') || lowerHeader.includes('timestamp') || 
          lowerHeader.includes('date') || lowerHeader.includes('created') ||
          lowerHeader.includes('updated') || dataType === 'timestamp') {
        fieldType = 'time';
      }
      // 标签字段识别
      else if (lowerHeader.includes('tag') || lowerHeader.includes('label') || 
               lowerHeader.includes('category') || lowerHeader.includes('type') ||
               lowerHeader.includes('name') || lowerHeader.includes('id') ||
               lowerHeader.includes('host') || lowerHeader.includes('device') ||
               lowerHeader.includes('service') || lowerHeader.includes('region')) {
        fieldType = 'tag';
      }
      // 字符串字段如果重复度高，可能是标签
      else if (dataType === 'string' && sampleValues.length > 0) {
        const uniqueValues = new Set(sampleValues);
        if (uniqueValues.size <= Math.max(10, sampleValues.length * 0.1)) {
          fieldType = 'tag';
        }
      }

      return {
        sourceField: header,
        targetField: sanitizeFieldName(header),
        fieldType,
        dataType,
        required: fieldType === 'time',
        defaultValue: '',
        validationRules: createDefaultValidationRules(dataType)};
    });

    onDataUpdate({ fieldMappings: mappings });
  }, [wizardData.headers, wizardData.preview, onDataUpdate]);

  // 推断数据类型
  const inferDataType = (values: any[]): 'string' | 'number' | 'boolean' | 'timestamp' => {
    if (values.length === 0) return 'string';
    
    const samples = values.slice(0, 100);
    
    // 检查时间戳
    const timePatterns = [
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{3})?$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{10,13}$/,
    ];
    
    const isTimestamp = samples.some(sample => 
      timePatterns.some(pattern => pattern.test(String(sample)))
    );
    
    if (isTimestamp) return 'timestamp';
    
    // 检查布尔值
    const booleanValues = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
    const isBoolean = samples.every(sample => 
      booleanValues.includes(String(sample).toLowerCase())
    );
    
    if (isBoolean) return 'boolean';
    
    // 检查数字
    const isNumber = samples.every(sample => {
      const num = Number(sample);
      return !isNaN(num) && isFinite(num);
    });
    
    if (isNumber) return 'number';
    
    return 'string';
  };

  // 清理字段名称
  const sanitizeFieldName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2}/g, '_')
      .replace(/^_|_$/g, '');
  };

  // 更新字段映射
  const updateFieldMapping = useCallback((index: number, field: keyof FieldMapping, value: any) => {
    const newMappings = [...wizardData.fieldMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    
    // 如果修改了字段类型，可能需要更新其他属性
    if (field === 'fieldType') {
      if (value === 'time') {
        newMappings[index].required = true;
        newMappings[index].dataType = 'timestamp';
      } else if (value === 'ignore') {
        newMappings[index].required = false;
      }
    }
    
    onDataUpdate({ fieldMappings: newMappings });
  }, [wizardData.fieldMappings, onDataUpdate]);

  // 批量操作
  const bulkUpdateMappings = useCallback((updates: Partial<FieldMapping>) => {
    const newMappings = wizardData.fieldMappings.map(mapping => ({
      ...mapping,
      ...updates}));
    onDataUpdate({ fieldMappings: newMappings });
  }, [wizardData.fieldMappings, onDataUpdate]);

  // 应用模板
  const applyTemplate = useCallback((templateName: string) => {
    const template = mappingTemplates.find(t => t.name === templateName);
    if (!template) return;

    const newMappings = wizardData.fieldMappings.map(mapping => {
      // 尝试匹配模板字段
      const templateMapping = template.mappings.find(tm => 
        tm.targetField === mapping.targetField ||
        tm.targetField === mapping.sourceField.toLowerCase()
      );
      
      if (templateMapping) {
        return {
          ...mapping,
          ...templateMapping,
          sourceField: mapping.sourceField, // 保持原始字段名
        };
      }
      
      return mapping;
    });

    onDataUpdate({ fieldMappings: newMappings });
    setShowTemplateModal(false);
  }, [wizardData.fieldMappings, onDataUpdate]);

  // 删除字段映射
  const removeFieldMapping = useCallback((index: number) => {
    const newMappings = wizardData.fieldMappings.filter((_, i) => i !== index);
    onDataUpdate({ fieldMappings: newMappings });
  }, [wizardData.fieldMappings, onDataUpdate]);

  // 验证映射配置
  const validateMappings = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查是否有时间字段
    const hasTimeField = wizardData.fieldMappings.some(m => m.fieldType === 'time');
    if (!hasTimeField) {
      errors.push('至少需要一个时间字段');
    }

    // 检查目标字段名称重复
    const targetFields = wizardData.fieldMappings
      .filter(m => m.fieldType !== 'ignore')
      .map(m => m.targetField);
    const duplicates = targetFields.filter((field, index) => 
      targetFields.indexOf(field) !== index
    );
    if (duplicates.length > 0) {
      errors.push(`目标字段名称重复: ${duplicates.join(', ')}`);
    }

    // 检查字段名称规范
    const invalidNames = wizardData.fieldMappings
      .filter(m => m.fieldType !== 'ignore')
      .filter(m => !/^[a-z0-9_]+$/.test(m.targetField))
      .map(m => m.targetField);
    if (invalidNames.length > 0) {
      warnings.push(`字段名称不规范: ${invalidNames.join(', ')}`);
    }

    // 检查标签字段数量
    const tagFields = wizardData.fieldMappings.filter(m => m.fieldType === 'tag');
    if (tagFields.length === 0) {
      warnings.push('建议至少设置一个标签字段以便数据查询');
    }

    return { errors, warnings };
  }, [wizardData.fieldMappings]);

  // 字段映射表格列
  const columns = [
    {
      title: '源字段',
      dataIndex: 'sourceField',
      key: 'sourceField',
      width: 150,
      render: (text: string, record: FieldMapping, index: number) => (
        <div className="flex gap-2">
          <Text strong>{text}</Text>
          <Tooltip title="查看样本数据">
            <Info 
              onClick={() => {
                const samples = wizardData.preview.map(row => row[index]).slice(0, 5);
                Modal.info({
                  title: `字段 "${text}" 样本数据`,
                  content: (
                    <div>
                      {samples.map((sample, i) => (
                        <div key={i}>
                          <Text code>{String(sample)}</Text>
                        </div>
                      ))}
                    </div>
                  )});
              }}
            />
          </Tooltip>
        </div>
      )},
    {
      title: '目标字段',
      dataIndex: 'targetField',
      key: 'targetField',
      width: 150,
      render: (value: string, record: FieldMapping, index: number) => (
        <Input
          value={value}
          onChange={(e) => updateFieldMapping(index, 'targetField', e.target.value)}
          placeholder="输入目标字段名"
          size="small"
        />
      )},
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 120,
      render: (value: string, record: FieldMapping, index: number) => (
        <Select
          value={value}
          onChange={(val) => updateFieldMapping(index, 'fieldType', val)}
          style={{ width: '100%' }}
          size="small"
        >
          <Option value="time">
            <div className="flex gap-2">
              <Tag color="blue">时间</Tag>
              <Text>时间戳</Text>
            </div>
          </Option>
          <Option value="tag">
            <div className="flex gap-2">
              <Tag color="green">标签</Tag>
              <Text>索引字段</Text>
            </div>
          </Option>
          <Option value="field">
            <div className="flex gap-2">
              <Tag color="orange">字段</Tag>
              <Text>数值字段</Text>
            </div>
          </Option>
          <Option value="ignore">
            <div className="flex gap-2">
              <Tag color="default">忽略</Tag>
              <Text>不导入</Text>
            </div>
          </Option>
        </Select>
      )},
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (value: string, record: FieldMapping, index: number) => (
        <Select
          value={value}
          onChange={(val) => updateFieldMapping(index, 'dataType', val)}
          style={{ width: '100%' }}
          size="small"
          disabled={record.fieldType === 'time' || record.fieldType === 'ignore'}
        >
          <Option value="string">字符串</Option>
          <Option value="number">数字</Option>
          <Option value="boolean">布尔值</Option>
          <Option value="timestamp">时间戳</Option>
        </Select>
      )},
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 80,
      render: (value: boolean, record: FieldMapping, index: number) => (
        <Switch
          checked={value}
          onChange={(checked) => updateFieldMapping(index, 'required', checked)}
          size="small"
          disabled={record.fieldType === 'time'}
        />
      )},
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 120,
      render: (value: string, record: FieldMapping, index: number) => (
        <Input
          value={value}
          onChange={(e) => updateFieldMapping(index, 'defaultValue', e.target.value)}
          placeholder="默认值"
          size="small"
          disabled={record.fieldType === 'ignore'}
        />
      )},
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (text: any, record: FieldMapping, index: number) => (
        <div className="flex gap-2">
          <Button
            type="text"
            size="small"
            icon={<Edit className="w-4 h-4"  />}
            onClick={() => setEditingField(record.sourceField)}
          />
          <Button
            type="text"
            size="small"
            icon={<Trash2 className="w-4 h-4"  />}
            onClick={() => removeFieldMapping(index)}
            danger
          />
        </div>
      )},
  ];

  // 初始化字段映射
  React.useEffect(() => {
    if (wizardData.fieldMappings.length === 0 && wizardData.headers.length > 0) {
      generateSmartMapping();
    }
  }, [wizardData.headers, wizardData.fieldMappings.length, generateSmartMapping]);

  return (
    <div className="space-y-6">
      {/* 配置工具栏 */}
      <Card>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <div className="flex gap-2">
              <Button
                icon={<BulkOutlined />}
                onClick={generateSmartMapping}
              >
                智能映射
              </Button>
              <Button
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => setShowTemplateModal(true)}
              >
                应用模板
              </Button>
            </div>
          </Col>
          <Col span={12}>
            <div className="text-right">
              <div className="flex gap-2">
                <Text>已映射字段:</Text>
                <Text strong>
                  {wizardData.fieldMappings.filter(m => m.fieldType !== 'ignore').length}
                </Text>
                <Text>/</Text>
                <Text>{wizardData.fieldMappings.length}</Text>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 验证提示 */}
      {validateMappings.errors.length > 0 && (
        <Alert
          type="error"
          message="配置错误"
          description={
            <ul>
              {validateMappings.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          }
          showIcon
        />
      )}

      {validateMappings.warnings.length > 0 && (
        <Alert
          type="warning"
          message="配置建议"
          description={
            <ul>
              {validateMappings.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          }
          showIcon
        />
      )}

      {/* 字段映射表格 */}
      <Card title="字段映射配置">
        <div className="space-y-4">
          <Alert
            message="字段映射说明"
            description={
              <div>
                <p><Tag color="blue">时间</Tag> 时间戳字段，用于时序数据索引，必须至少有一个</p>
                <p><Tag color="green">标签</Tag> 索引字段，用于数据查询和过滤，建议设置关键维度字段</p>
                <p><Tag color="orange">字段</Tag> 数值字段，存储具体的测量值</p>
                <p><Tag color="default">忽略</Tag> 不导入该字段</p>
              </div>
            }
            type="info"
            showIcon
          />

          <Table
            columns={columns}
            dataSource={wizardData.fieldMappings.map((mapping, index) => ({
              ...mapping,
              key: index}))}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </div>
      </Card>

      {/* 批量操作 */}
      <Card title="批量操作" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Button
              block
              onClick={() => bulkUpdateMappings({ fieldType: 'field' })}
            >
              全部设为字段
            </Button>
          </Col>
          <Col span={6}>
            <Button
              block
              onClick={() => bulkUpdateMappings({ fieldType: 'tag' })}
            >
              全部设为标签
            </Button>
          </Col>
          <Col span={6}>
            <Button
              block
              onClick={() => bulkUpdateMappings({ required: true })}
            >
              全部设为必填
            </Button>
          </Col>
          <Col span={6}>
            <Button
              block
              onClick={() => bulkUpdateMappings({ required: false })}
            >
              全部设为可选
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 模板选择弹窗 */}
      <Modal
        title="选择映射模板"
        open={showTemplateModal}
        onCancel={() => setShowTemplateModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowTemplateModal(false)}>
            取消
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => applyTemplate(selectedTemplate)}
            disabled={!selectedTemplate}
          >
            应用模板
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <Alert
            message="模板说明"
            description="选择合适的模板可以快速配置字段映射，您也可以在应用模板后进行自定义调整。"
            type="info"
            showIcon
          />

          <Select
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            style={{ width: '100%' }}
            placeholder="选择模板"
          >
            {mappingTemplates.map(template => (
              <Option key={template.name} value={template.name}>
                <div>
                  <Text strong>{template.name}</Text>
                  <br />
                  <Text type="secondary">{template.description}</Text>
                </div>
              </Option>
            ))}
          </Select>

          {selectedTemplate && (
            <Card size="small" title="模板预览">
              {mappingTemplates
                .find(t => t.name === selectedTemplate)
                ?.mappings.map((mapping, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <Text>{mapping.targetField}</Text>
                    <Tag color={
                      mapping.fieldType === 'time' ? 'blue' :
                      mapping.fieldType === 'tag' ? 'green' :
                      mapping.fieldType === 'field' ? 'orange' : 'default'
                    }>
                      {mapping.fieldType}
                    </Tag>
                  </div>
                ))}
            </Card>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default FieldMappingStep;