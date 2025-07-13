import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Space, Typography, Tag, Progress, Alert, Empty, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import { 
  TableOutlined, 
  BugOutlined, 
  InfoCircleOutlined,
  ExportOutlined,
  ClearOutlined,
  DownloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FileOutlined
} from '@ant-design/icons';
import { useConnectionStore } from '@/store/connection';
import type { QueryResult } from '@/types';

const { Text } = Typography;

interface ResultPanelProps {
  collapsed?: boolean;
  queryResult?: QueryResult | null;
  onClearResult?: () => void;
}

interface QueryHistoryItem {
  id: string;
  query: string;
  status: 'running' | 'success' | 'error' | 'warning';
  duration: number;
  rowCount: number;
  timestamp: Date;
  data?: any[];
  error?: string;
  warnings?: string[];
}

interface LogMessage {
  id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  source: string;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ collapsed = false, queryResult, onClearResult }) => {
  const [activeTab, setActiveTab] = useState('results');
  const { activeConnectionId, connections } = useConnectionStore();
  const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;
  
  // 监听查询结果变化
  useEffect(() => {
    if (queryResult) {
      setActiveTab('results'); // 自动切换到结果标签页
      console.log('📈 ResultPanel 收到查询结果:', queryResult);
    }
  }, [queryResult]);
  
  // 根据当前查询结果生成表格列
  const resultColumns = queryResult?.results?.[0]?.series?.[0]?.columns?.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    width: 150,
  })) || [];
  
  // 将 InfluxDB 的结果转换为表格数据格式
  const tableData = React.useMemo(() => {
    if (!queryResult?.results?.[0]?.series?.[0]) return [];
    
    const series = queryResult.results[0].series[0];
    const { columns, values } = series;
    
    if (!columns || !values) return [];
    
    return values.map((row: any[], index: number) => {
      const record: Record<string, any> = { _key: index };
      columns.forEach((col: string, colIndex: number) => {
        record[col] = row[colIndex];
      });
      return record;
    });
  }, [queryResult]);

  const getLogMessages = (): LogMessage[] => {
    return [];
  };

  const getStatusDisplay = (status: string) => {
    const displays = {
      running: { icon: <ClockCircleOutlined />, color: 'blue', text: '运行中' },
      success: { icon: <CheckCircleOutlined />, color: 'green', text: '成功' },
      error: { icon: <ExclamationCircleOutlined />, color: 'red', text: '错误' },
      warning: { icon: <WarningOutlined />, color: 'orange', text: '警告' },
    };
    return displays[status as keyof typeof displays] || displays.success;
  };

  // 导出为 CSV 格式
  const exportToCSV = () => {
    if (!queryResult || tableData.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }

    const columns = resultColumns.map(col => col.title as string);
    const csvContent = [
      columns.join(','),
      ...tableData.map(row => 
        columns.map(col => {
          const value = row[col];
          // 处理包含逗号、引号或换行符的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    downloadFile(csvContent, 'query-result.csv', 'text/csv');
    message.success('CSV 文件导出成功');
  };

  // 导出为 JSON 格式
  const exportToJSON = () => {
    if (!queryResult || tableData.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }

    const jsonContent = JSON.stringify(tableData, null, 2);
    downloadFile(jsonContent, 'query-result.json', 'application/json');
    message.success('JSON 文件导出成功');
  };

  // 导出为 Excel 格式 (实际上是 TSV，可以被 Excel 打开)
  const exportToExcel = () => {
    if (!queryResult || tableData.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }

    const columns = resultColumns.map(col => col.title as string);
    const tsvContent = [
      columns.join('\t'),
      ...tableData.map(row => 
        columns.map(col => row[col] || '').join('\t')
      )
    ].join('\n');

    downloadFile(tsvContent, 'query-result.xlsx', 'application/vnd.ms-excel');
    message.success('Excel 文件导出成功');
  };

  // 下载文件的通用函数
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 清空结果
  const handleClearResult = () => {
    onClearResult?.();
    message.success('查询结果已清空');
  };

  // 导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'csv',
      label: 'CSV 格式',
      icon: <FileTextOutlined />,
      onClick: exportToCSV,
    },
    {
      key: 'json',
      label: 'JSON 格式',
      icon: <FileOutlined />,
      onClick: exportToJSON,
    },
    {
      key: 'excel',
      label: 'Excel 格式',
      icon: <FileExcelOutlined />,
      onClick: exportToExcel,
    },
  ];

  if (collapsed) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <TableOutlined className="text-lg" />
      </div>
    );
  }

  const logMessages = getLogMessages();

  return (
    <div className="h-full bg-white border-t border-gray-200">
      <Tabs 
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        className="h-full"
        items={[
          {
            key: 'results',
            label: (
              <span className="flex items-center gap-1">
                <TableOutlined />
                查询结果
                {queryResult && (
                  <Tag
                    color="blue"
                    size="small"
                    className="ml-1"
                  >
                    {tableData.length}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <div className="h-full flex flex-col">
                {/* 查询状态栏 */}
                {queryResult && (
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Space wrap>
                          <Space size="small">
                            <div className="flex items-center gap-2">
                              <Tag 
                                icon={<CheckCircleOutlined />} 
                                color="green"
                              >
                                成功
                              </Tag>
                              <Text className="text-sm">
                                {tableData.length} 行
                              </Text>
                            </div>
                          </Space>
                        </Space>
                      </div>
                      
                      <Space>
                        <Dropdown 
                          menu={{ items: exportMenuItems }} 
                          placement="bottomLeft"
                          disabled={!queryResult || tableData.length === 0}
                        >
                          <Button 
                            icon={<ExportOutlined />} 
                            size="small"
                            disabled={!queryResult || tableData.length === 0}
                          >
                            导出
                          </Button>
                        </Dropdown>
                        <Button 
                          icon={<ClearOutlined />} 
                          size="small"
                          onClick={handleClearResult}
                          disabled={!queryResult}
                        >
                          清空
                        </Button>
                      </Space>
                    </div>
                  </div>
                )}

                {/* 结果内容 */}
                <div className="flex-1 overflow-hidden pl-4">
                  {queryResult && tableData.length > 0 ? (
                    <Table
                      className="result-table"
                      columns={resultColumns}
                      dataSource={tableData}
                      size="small"
                      scroll={{ x: 'max-content', y: '100%' }}
                      pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                          `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                        pageSize: 500,
                        pageSizeOptions: ['100', '500', '1000', '2000'],
                      }}
                      rowKey="_key"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <Empty
                        description={queryResult ? "查询结果为空" : "请执行查询以查看结果"}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </div>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'messages',
            label: (
              <span className="flex items-center gap-1">
                <InfoCircleOutlined />
                消息
                {logMessages.length > 0 && (
                  <Tag color="orange" size="small" className="ml-1">
                    {logMessages.length}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <div className="h-full overflow-auto p-4">
                <div className="space-y-2">
                  {logMessages.map((log) => {
                    const levelDisplay = {
                      info: { color: 'blue', text: 'INFO' },
                      warning: { color: 'orange', text: 'WARN' },
                      error: { color: 'red', text: 'ERROR' },
                    }[log.level];

                    return (
                      <div 
                        key={log.id} 
                        className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded text-sm"
                      >
                        <Tag 
                          color={levelDisplay.color}
                          className="mt-0.5 text-xs"
                        >
                          {levelDisplay.text}
                        </Tag>
                        <div className="flex-1">
                          <div className="text-gray-900">{log.message}</div>
                          <div className="text-gray-500 text-xs mt-1">
                            {log.timestamp.toLocaleTimeString()} - {log.source}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
          {
            key: 'console',
            label: (
              <span className="flex items-center gap-1">
                <BugOutlined />
                控制台
              </span>
            ),
            children: (
              <div className="console-panel h-full overflow-auto p-4">
                <div className="space-y-1">
                  <div className="info">InfloWave Database Client v1.0.5</div>
                  {activeConnection ? (
                    <>
                      <div className="info">Connected to: {activeConnection.host}:{activeConnection.port}</div>
                      <div className="info">Connection: {activeConnection.name}</div>
                      <div className="info">Database: {activeConnection.database || 'default'}</div>
                      <div className="prompt">Ready for next command...</div>
                    </>
                  ) : (
                    <>
                      <div className="warning">No active connection</div>
                      <div className="info">Please connect to a database first</div>
                      <div className="prompt">Waiting for connection...</div>
                    </>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ResultPanel;