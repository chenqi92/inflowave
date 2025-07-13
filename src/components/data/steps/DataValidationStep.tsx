import React, { useState, useCallback, useMemo } from 'react';
import { Table, Alert, Row, Col, Typography, Progress, Button, Tag, Statistic, Tabs, TabsList, TabsTrigger, TabsContent, Modal, Tooltip } from '@/components/ui';
// TODO: Replace these Ant Design components: List
import { Card, Space, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Info, RefreshCw, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { ImportWizardData } from '../SmartImportWizard';
import { DataValidator, DataQualityAnalyzer, DataQualityReport, QualityIssue } from '../DataValidationUtils';

const { Text, Title } = Typography;

interface DataValidationStepProps {
  wizardData: ImportWizardData;
  onDataUpdate: (updates: Partial<ImportWizardData>) => void;
  dataValidator: DataValidator;
  qualityAnalyzer: DataQualityAnalyzer;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

const DataValidationStep: React.FC<DataValidationStepProps> = ({
  wizardData,
  onDataUpdate,
  dataValidator,
  qualityAnalyzer,
  loading,
  onLoadingChange}) => {
  const [validationDetails, setValidationDetails] = useState<{
    [key: string]: any;
  }>({});
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null);

  // 执行数据质量分析
  const runQualityAnalysis = useCallback(async () => {
    onLoadingChange(true);
    
    try {
      // 分析数据质量
      const qualityReport = qualityAnalyzer.analyzeDataQuality(wizardData.data, wizardData.headers);
      
      // 运行字段验证
      const fieldValidationResults: { [key: string]: any } = {};
      
      for (let i = 0; i < wizardData.fieldMappings.length; i++) {
        const mapping = wizardData.fieldMappings[i];
        if (mapping.fieldType === 'ignore') continue;
        
        const columnData = wizardData.data.map(row => row[i]);
        const rules = mapping.validationRules || [];
        
        const validationResult = {
          field: mapping.sourceField,
          validCount: 0,
          invalidCount: 0,
          errors: [] as string[],
          warnings: [] as string[],
          suggestions: [] as string[]};
        
        // 验证每个值
        for (const value of columnData) {
          const result = dataValidator.validateValue(value, rules);
          if (result.valid) {
            validationResult.validCount++;
          } else {
            validationResult.invalidCount++;
            validationResult.errors.push(...result.errors);
            validationResult.suggestions.push(...result.suggestions);
          }
        }
        
        fieldValidationResults[mapping.sourceField] = validationResult;
      }
      
      setValidationDetails(fieldValidationResults);
      onDataUpdate({ qualityReport });
    } catch (error) {
      console.error('数据验证失败:', error);
    } finally {
      onLoadingChange(false);
    }
  }, [wizardData, dataValidator, qualityAnalyzer, onDataUpdate, onLoadingChange]);

  // 自动运行验证
  React.useEffect(() => {
    if (wizardData.data.length > 0 && wizardData.fieldMappings.length > 0 && !wizardData.qualityReport) {
      runQualityAnalysis();
    }
  }, [wizardData.data, wizardData.fieldMappings, wizardData.qualityReport, runQualityAnalysis]);

  // 质量分数颜色
  const getQualityScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#faad14';
    if (score >= 50) return '#fa8c16';
    return '#f5222d';
  };

  // 严重程度颜色
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'yellow';
      default: return 'default';
    }
  };

  // 问题类型图标
  const getIssueTypeIcon = (type: string) => {
    switch (type) {
      case 'missing':
        return <AlertCircle style={{ color: '#faad14' }} />;
      case 'duplicate':
        return <Info className="w-4 h-4" style={{ color: '#1890ff' }}  />;
      case 'invalid':
        return <AlertCircle style={{ color: '#f5222d' }} />;
      case 'outlier':
        return <AlertTriangle style={{ color: '#fa8c16' }} />;
      case 'inconsistent':
        return <AlertCircle style={{ color: '#722ed1' }} />;
      default:
        return <Info className="w-4 h-4"  />;
    }
  };

  // 渲染质量报告概览
  const renderQualityOverview = () => {
    if (!wizardData.qualityReport) return null;

    const report = wizardData.qualityReport;
    
    return (
      <Card title="数据质量评估">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="质量分数"
              value={report.qualityScore}
              precision={1}
              suffix="分"
              valueStyle={{ color: getQualityScoreColor(report.qualityScore) }}
            />
            <Progress
              percent={report.qualityScore}
              strokeColor={getQualityScoreColor(report.qualityScore)}
              size="small"
              showInfo={false}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总行数"
              value={report.totalRows}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="有效行数"
              value={report.validRows}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="问题行数"
              value={report.invalidRows}
              valueStyle={{ color: '#f5222d' }}
            />
          </Col>
        </Row>
        
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Statistic
              title="空值数量"
              value={report.nullValues}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="重复行数"
              value={report.duplicateRows}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="异常值数量"
              value={report.outliers}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="问题类型"
              value={report.issues.length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  // 渲染问题列表
  const renderIssuesList = () => {
    if (!wizardData.qualityReport || wizardData.qualityReport.issues.length === 0) {
      return (
        <Card title="数据质量问题">
          <Alert
            message="恭喜！"
            description="未发现数据质量问题"
            type="success"
            showIcon
          />
        </Card>
      );
    }

    const issues = wizardData.qualityReport.issues;

    return (
      <Card 
        title="数据质量问题" 
        extra={
          <Button 
            size="small" 
            icon={<RefreshCw className="w-4 h-4"  />}
            onClick={runQualityAnalysis}
            disabled={loading}
          >
            重新分析
          </Button>
        }
      >
        <List
          itemLayout="horizontal"
          dataSource={issues}
          renderItem={(issue) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setSelectedIssue(issue);
                    setShowDetailsModal(true);
                  }}
                >
                  查看详情
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={getIssueTypeIcon(issue.type)}
                title={
                  <div className="flex gap-2">
                    <Text strong>{issue.description}</Text>
                    <Tag color={getSeverityColor(issue.severity)}>
                      {issue.severity === 'high' ? '严重' : 
                       issue.severity === 'medium' ? '中等' : '轻微'}
                    </Tag>
                  </div>
                }
                description={
                  <div>
                    <Text type="secondary">
                      影响 {issue.count} 个数据点
                    </Text>
                    {issue.suggestion && (
                      <div>
                        <Text type="secondary">建议: {issue.suggestion}</Text>
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  // 渲染字段验证结果
  const renderFieldValidation = () => {
    if (Object.keys(validationDetails).length === 0) return null;

    const columns = [
      {
        title: '字段名',
        dataIndex: 'field',
        key: 'field',
        render: (text: string) => <Text strong>{text}</Text>},
      {
        title: '有效数据',
        dataIndex: 'validCount',
        key: 'validCount',
        render: (count: number, record: any) => (
          <div>
            <Text style={{ color: '#52c41a' }}>{count}</Text>
            <Text type="secondary"> / {count + record.invalidCount}</Text>
          </div>
        )},
      {
        title: '验证率',
        dataIndex: 'validationRate',
        key: 'validationRate',
        render: (text: any, record: any) => {
          const total = record.validCount + record.invalidCount;
          const rate = total > 0 ? (record.validCount / total) * 100 : 0;
          return (
            <div>
              <Progress
                percent={rate}
                size="small"
                strokeColor={rate >= 90 ? '#52c41a' : rate >= 70 ? '#faad14' : '#f5222d'}
              />
              <Text style={{ fontSize: '12px' }}>{rate.toFixed(1)}%</Text>
            </div>
          );
        }},
      {
        title: '错误数',
        dataIndex: 'invalidCount',
        key: 'invalidCount',
        render: (count: number) => (
          <Text style={{ color: count > 0 ? '#f5222d' : '#52c41a' }}>
            {count}
          </Text>
        )},
      {
        title: '状态',
        key: 'status',
        render: (text: any, record: any) => {
          const hasErrors = record.invalidCount > 0;
          return (
            <Tag color={hasErrors ? 'red' : 'green'}>
              {hasErrors ? '有问题' : '正常'}
            </Tag>
          );
        }},
    ];

    const dataSource = Object.values(validationDetails).map((details: any, index) => ({
      ...details,
      key: index}));

    return (
      <Card title="字段验证结果">
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
        />
      </Card>
    );
  };

  // 渲染质量建议
  const renderQualitySuggestions = () => {
    if (!wizardData.qualityReport) return null;

    const suggestions: string[] = [];
    
    // 基于质量分数给出建议
    const score = wizardData.qualityReport.qualityScore;
    if (score < 50) {
      suggestions.push('数据质量较差，强烈建议进行数据清理');
    } else if (score < 70) {
      suggestions.push('数据质量中等，建议进行适当的数据清理');
    } else if (score < 90) {
      suggestions.push('数据质量良好，可以考虑进行轻微的数据清理');
    } else {
      suggestions.push('数据质量优秀，可以直接导入');
    }

    // 基于具体问题给出建议
    wizardData.qualityReport.issues.forEach(issue => {
      if (issue.suggestion) {
        suggestions.push(issue.suggestion);
      }
    });

    return (
      <Card title="质量改进建议">
        <List
          size="small"
          dataSource={suggestions}
          renderItem={(item) => (
            <List.Item>
              <Text>{item}</Text>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  // 渲染详情模态框
  const renderDetailsModal = () => {
    if (!selectedIssue) return null;

    return (
      <Modal
        title={`问题详情: ${selectedIssue.description}`}
        open={showDetailsModal}
        onOpenChange={(open) => !open && (() => setShowDetailsModal(false))()}
        footer={[
          <Button key="close" onClick={() => setShowDetailsModal(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="问题类型"
                value={selectedIssue.type}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="严重程度"
                value={selectedIssue.severity}
                valueStyle={{ color: getSeverityColor(selectedIssue.severity) }}
              />
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="影响数量"
                value={selectedIssue.count}
                valueStyle={{ color: '#f5222d' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="影响行数"
                value={selectedIssue.rows.length}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Col>
          </Row>

          {selectedIssue.suggestion && (
            <Alert
              message="改进建议"
              description={selectedIssue.suggestion}
              type="info"
              showIcon
            />
          )}

          <Card title="影响的行号" size="small">
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {selectedIssue.rows.slice(0, 100).map((row, index) => (
                <Tag key={index} style={{ margin: '2px' }}>
                  {row + 1}
                </Tag>
              ))}
              {selectedIssue.rows.length > 100 && (
                <Text type="secondary">
                  ... 还有 {selectedIssue.rows.length - 100} 行
                </Text>
              )}
            </div>
          </Card>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      {/* 验证控制 */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <Title level={4}>数据质量验证</Title>
            <Text type="secondary">
              分析数据质量，识别潜在问题并提供改进建议
            </Text>
          </div>
          <Button
            type="primary"
            icon={<CheckCircle />}
            disabled={loading}
            onClick={runQualityAnalysis}
          >
            开始验证
          </Button>
        </div>
      </Card>

      {/* 验证结果 */}
      {wizardData.qualityReport && (
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">质量概览</TabsTrigger>
            <TabsTrigger value="issues">问题分析</TabsTrigger>
            <TabsTrigger value="fields">字段验证</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-4">
              {renderQualityOverview()}
              {renderQualitySuggestions()}
            </div>
          </TabsContent>

          <TabsContent value="issues">
            {renderIssuesList()}
          </TabsContent>

          <TabsContent value="fields">
            {renderFieldValidation()}
          </TabsContent>
        </Tabs>
      )}

      {/* 验证进度 */}
      {loading && (
        <Card>
          <div className="text-center">
            <Progress percent={50} status="active" />
            <Text>正在分析数据质量...</Text>
          </div>
        </Card>
      )}

      {/* 详情模态框 */}
      {renderDetailsModal()}
    </div>
  );
};

export default DataValidationStep;