import React, { useState } from 'react';
import { Tabs, Table, Button, Space, Typography, Tag, Progress, Alert, Empty } from 'antd';
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
  WarningOutlined
} from '@ant-design/icons';
import { isBrowserEnvironment } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';

const { Text } = Typography;

interface ResultPanelProps {
  collapsed?: boolean;
}

interface QueryResult {
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

const ResultPanel: React.FC<ResultPanelProps> = ({ collapsed = false }) => {
  const [activeTab, setActiveTab] = useState('results');
  const { activeConnectionId, connections } = useConnectionStore();
  const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;
  
  // 根据环境和连接状态生成合适的数据
  const getQueryResults = (): QueryResult[] => {
    if (isBrowserEnvironment()) {
      return []; // 浏览器环境显示空结果
    }
    // Tauri环境下显示真实查询结果
    return [];
  };

  const getLogMessages = (): LogMessage[] => {
    if (isBrowserEnvironment()) {
      return [
        {
          id: '1',
          level: 'info',
          message: '当前运行在浏览器预览模式',
          timestamp: new Date(Date.now() - 60000),
          source: 'System',
        },
        {
          id: '2',
          level: 'warning', 
          message: '浏览器模式下无法连接真实数据库',
          timestamp: new Date(Date.now() - 30000),
          source: 'Connection',
        },
        {
          id: '3',
          level: 'info',
          message: '所有数据均为演示用途',
          timestamp: new Date(),
          source: 'System',
        },
      ];
    }
    
    // Tauri环境下显示真实连接信息
    const messages: LogMessage[] = [];
    if (activeConnection) {
      messages.push({
        id: 'conn-info',
        level: 'info',
        message: `已连接到 ${activeConnection.name} (${activeConnection.host}:${activeConnection.port})`,
        timestamp: new Date(),
        source: 'Connection',
      });
    } else {
      messages.push({
        id: 'no-conn',
        level: 'warning',
        message: '尚未建立数据库连接',
        timestamp: new Date(),
        source: 'Connection',
      });
    }
    
    return messages;
  };

  const [queryResults] = useState<QueryResult[]>(getQueryResults());
  const [logMessages] = useState<LogMessage[]>(getLogMessages());

  // 获取状态图标和颜色
  const getStatusDisplay = (status: QueryResult['status']) => {
    switch (status) {
      case 'running':
        return { icon: <ClockCircleOutlined />, color: 'blue', text: '执行中' };
      case 'success':
        return { icon: <CheckCircleOutlined />, color: 'green', text: '成功' };
      case 'error':
        return { icon: <ExclamationCircleOutlined />, color: 'red', text: '错误' };
      case 'warning':
        return { icon: <WarningOutlined />, color: 'orange', text: '警告' };
      default:
        return { icon: <InfoCircleOutlined />, color: 'default', text: '未知' };
    }
  };

  // 获取日志级别显示
  const getLogLevelDisplay = (level: LogMessage['level']) => {
    switch (level) {
      case 'info':
        return { color: 'blue', text: 'INFO' };
      case 'warning':
        return { color: 'orange', text: 'WARN' };
      case 'error':
        return { color: 'red', text: 'ERROR' };
      default:
        return { color: 'default', text: 'LOG' };
    }
  };

  // 结果表格列定义
  const resultColumns = queryResults[0]?.data ? Object.keys(queryResults[0].data[0]).map(key => ({
    title: key,
    dataIndex: key,
    key,
    width: 150,
    ellipsis: true,
  })) : [];

  if (collapsed) {
    return (
      <div className="h-12 bg-gray-100 border-t border-gray-200 flex items-center px-4">
        <Text type="secondary" className="text-sm">
          结果面板已折叠
        </Text>
      </div>
    );
  }

  return (
    <div className="result-panel h-full bg-white flex flex-col">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        className="flex-1"
        items={[
          {
            key: 'results',
            label: (
              <span className="flex items-center gap-1">
                <TableOutlined />
                查询结果
                {queryResults.length > 0 && (
                  <Tag size="small" color="blue">
                    {queryResults.length}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <div className="h-full flex flex-col">
                {/* 查询状态栏 */}
                {queryResults.length > 0 && (
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <Space>
                        {queryResults.map(result => {
                          const statusDisplay = getStatusDisplay(result.status);
                          return (
                            <div key={result.id} className="flex items-center gap-2">
                              <Tag 
                                icon={statusDisplay.icon} 
                                color={statusDisplay.color}
                              >
                                {statusDisplay.text}
                              </Tag>
                              <Text className="text-sm">
                                {result.rowCount.toLocaleString()} 行，{result.duration}ms
                              </Text>
                            </div>
                          );
                        })}
                      </Space>
                      
                      <Space>
                        <Button 
                          icon={<ExportOutlined />} 
                          size="small"
                        >
                          导出
                        </Button>
                        <Button 
                          icon={<ClearOutlined />} 
                          size="small"
                        >
                          清空
                        </Button>
                      </Space>
                    </div>
                  </div>
                )}

                {/* 结果内容 */}
                <div className="flex-1 overflow-hidden">
                  {queryResults.length > 0 && queryResults[0].data ? (
                    <Table
                      className="result-table"
                      columns={resultColumns}
                      dataSource={queryResults[0].data}
                      size="small"
                      scroll={{ x: 'max-content', y: '100%' }}
                      pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                        pageSize: 50,
                      }}
                      rowKey={(record, index) => index?.toString() || '0'}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Empty 
                        description="暂无查询结果"
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
                  <Tag size="small" color="orange">
                    {logMessages.length}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <div className="h-full flex flex-col">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <Space>
                    <Button 
                      icon={<ClearOutlined />} 
                      size="small"
                    >
                      清空消息
                    </Button>
                    <Button 
                      icon={<DownloadOutlined />} 
                      size="small"
                    >
                      导出日志
                    </Button>
                  </Space>
                </div>
                
                <div className="flex-1 overflow-auto p-2">
                  {logMessages.map(log => {
                    const levelDisplay = getLogLevelDisplay(log.level);
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
                  {isBrowserEnvironment() ? (
                    <>
                      <div className="warning">[浏览器预览模式] 当前运行在开发模式</div>
                      <div className="info">Environment: Browser Development Mode</div>
                      <div className="warning">所有连接和查询数据均为模拟数据</div>
                      <div className="info">使用 'npm run tauri:dev' 启动桌面应用版本</div>
                      <div className="prompt">Browser mode ready...</div>
                    </>
                  ) : activeConnection ? (
                    <>
                      <div className="info">Connected to: {activeConnection.host}:{activeConnection.port}</div>
                      <div className="info">Connection: {activeConnection.name}</div>
                      <div className="info">Database: {activeConnection.database || 'default'}</div>
                      <div className="prompt">Ready for next command...</div>
                    </>
                  ) : (
                    <>
                      <div className="warning">No active database connection</div>
                      <div className="info">请在连接管理中配置并激活数据库连接</div>
                      <div className="prompt">Waiting for connection...</div>
                    </>
                  )}
                  <div className="flex items-center">
                    <span className="prompt">$</span>
                    <span className="ml-2 bg-green-400 w-2 h-4 animate-pulse"></span>
                  </div>
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