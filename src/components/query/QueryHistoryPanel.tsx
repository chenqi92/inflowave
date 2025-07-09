﻿import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Tooltip,
  message,
  Modal,
  Form,
  Popconfirm,
} from 'antd';
import {
  SearchOutlined,
  PlayCircleOutlined,
  StarOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { safeTauriInvoke } from '@/utils/tauri';
import type { QueryHistoryItem, SavedQuery, Connection } from '@/types';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface QueryHistoryPanelProps {
  connections: Connection[];
  onExecuteQuery: (query: string, database: string, connectionId: string) => void;
}

const QueryHistoryPanel: React.FC<QueryHistoryPanelProps> = ({
  connections,
  onExecuteQuery,
}) => {
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterConnection, setFilterConnection] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [form] = Form.useForm();

  // 加载查询历史
  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_query_history', {
        connectionId: filterConnection || null,
        limit: 50,
        offset: 0,
      }) as QueryHistoryItem[];
      setHistoryList(result);
    } catch (error) {
      console.error('加载查询历史失败:', error);
      message.error('加载查询历史失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载保存的查询
  const loadSavedQueries = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_saved_queries', {
        tags: null,
        search: searchKeyword || null,
      }) as SavedQuery[];
      setSavedQueries(result);
    } catch (error) {
      console.error('加载保存的查询失败:', error);
      message.error('加载保存的查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加查询历史记录
  const addHistoryItem = async (
    query: string,
    database: string,
    connectionId: string,
    duration: number,
    rowCount: number,
    success: boolean,
    error?: string
  ) => {
    try {
      await safeTauriInvoke('add_query_history', {
        query,
        database,
        connectionId,
        duration,
        rowCount,
        success,
        error: error || null,
      });
      loadHistory();
    } catch (err) {
      console.error('添加查询历史失败:', err);
    }
  };

  // 保存查询
  const saveQuery = (query: string, database?: string) => {
    setSelectedQuery(query);
    setSelectedDatabase(database || '');
    setSaveDialogVisible(true);
  };

  // 确认保存查询
  const handleSaveQuery = async (values: any) => {
    try {
      await safeTauriInvoke('save_query', {
        name: values.name,
        description: values.description || null,
        query: selectedQuery,
        database: selectedDatabase || null,
        tags: values.tags || [],
      });
      message.success('查询保存成功');
      setSaveDialogVisible(false);
      form.resetFields();
      loadSavedQueries();
    } catch (error) {
      console.error('保存查询失败:', error);
      message.error('保存查询失败');
    }
  };

  // 删除历史记录
  const deleteHistoryItem = async (historyId: string) => {
    try {
      await safeTauriInvoke('delete_query_history', { historyId });
      message.success('历史记录已删除');
      loadHistory();
    } catch (error) {
      console.error('删除历史记录失败:', error);
      message.error('删除历史记录失败');
    }
  };

  // 删除保存的查询
  const deleteSavedQuery = async (queryId: string) => {
    try {
      await safeTauriInvoke('delete_saved_query', { queryId });
      message.success('查询已删除');
      loadSavedQueries();
    } catch (error) {
      console.error('删除查询失败:', error);
      message.error('删除查询失败');
    }
  };

  // 清空历史记录
  const clearHistory = async () => {
    try {
      const deletedCount = await safeTauriInvoke('clear_query_history', {
        connectionId: filterConnection || null,
      }) as number;
      message.success(`已清空 ${deletedCount} 条历史记录`);
      loadHistory();
    } catch (error) {
      console.error('清空历史失败:', error);
      message.error('清空历史失败');
    }
  };

  // 获取连接名称
  const getConnectionName = (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId);
    return connection?.name || '未知连接';
  };

  // 格式化时间
  const formatTime = (dateTime: string | Date) => {
    const date = new Date(dateTime);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // 过滤数据
  const filteredHistory = historyList.filter(item => {
    const matchesSearch = !searchKeyword || 
      item.query.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.database.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesConnection = !filterConnection || item.connectionId === filterConnection;
    return matchesSearch && matchesConnection;
  });

  const filteredSavedQueries = savedQueries.filter(item => {
    return !searchKeyword || 
      item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      item.query.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchKeyword.toLowerCase()));
  });

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else {
      loadSavedQueries();
    }
  }, [activeTab, filterConnection]);

  return (
    <Card
      title={
        <Space>
          <Button
            type={activeTab === 'history' ? 'primary' : 'default'}
            onClick={() => setActiveTab('history')}
            icon={<ClockCircleOutlined />}
          >
            查询历史
          </Button>
          <Button
            type={activeTab === 'saved' ? 'primary' : 'default'}
            onClick={() => setActiveTab('saved')}
            icon={<StarOutlined />}
          >
            保存的查询
          </Button>
        </Space>
      }
      extra={
        <Space>
          {activeTab === 'history' && (
            <Popconfirm
              title="确定要清空查询历史吗？"
              onConfirm={clearHistory}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" icon={<ClearOutlined />}>
                清空
              </Button>
            </Popconfirm>
          )}
          <Button size="small" onClick={activeTab === 'history' ? loadHistory : loadSavedQueries}>
            刷新
          </Button>
        </Space>
      }
      size="small"
    >
      {/* 搜索和筛选 */}
      <Space style={{ width: '100%', marginBottom: 16 }}>
        <Input
          placeholder="搜索查询..."
          prefix={<SearchOutlined />}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          style={{ flex: 1 }}
          allowClear
        />
        {activeTab === 'history' && (
          <Select
            placeholder="筛选连接"
            value={filterConnection}
            onChange={setFilterConnection}
            style={{ width: 150 }}
            allowClear
          >
            {connections.map(conn => (
              <Option key={conn.id} value={conn.id}>{conn.name}</Option>
            ))}
          </Select>
        )}
      </Space>

      {/* 历史记录列表 */}
      {activeTab === 'history' && (
        <List
          loading={loading}
          dataSource={filteredHistory}
          locale={{ emptyText: '暂无查询历史' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tooltip title="重新执行">
                  <Button
                    type="text"
                    icon={<PlayCircleOutlined />}
                    onClick={() => onExecuteQuery(item.query, item.database, item.connectionId)}
                  />
                </Tooltip>,
                <Tooltip title="保存查询">
                  <Button
                    type="text"
                    icon={<StarOutlined />}
                    onClick={() => saveQuery(item.query, item.database)}
                  />
                </Tooltip>,
                <Tooltip title="删除">
                  <Popconfirm
                    title="确定要删除这条历史记录吗？"
                    onConfirm={() => deleteHistoryItem(item.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color="blue">{getConnectionName(item.connectionId)}</Tag>
                    <Tag color="green">{item.database}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatTime(item.executedAt)}
                    </Text>
                  </Space>
                }
                description={
                  <div>
                    <Text code style={{ fontSize: 12 }}>
                      {item.query.length > 100 ? item.query.substring(0, 100) + '...' : item.query}
                    </Text>
                    <div style={{ marginTop: 4 }}>
                      <Space size="small">
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.duration}ms
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.rowCount} 行
                        </Text>
                        {!item.success && (
                          <Tag color="red" style={{ fontSize: 10 }}>
                            执行失败
                          </Tag>
                        )}
                      </Space>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {/* 保存的查询列表 */}
      {activeTab === 'saved' && (
        <List
          loading={loading}
          dataSource={filteredSavedQueries}
          locale={{ emptyText: '暂无保存的查询' }}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tooltip title="执行查询">
                  <Button
                    type="text"
                    icon={<PlayCircleOutlined />}
                    onClick={() => {
                      // 这里需要选择连接和数据库
                      if (connections.length > 0) {
                        const defaultConnection = connections[0];
                        onExecuteQuery(item.query, item.database || '', defaultConnection.id);
                      } else {
                        message.warning('请先添加连接');
                      }
                    }}
                  />
                </Tooltip>,
                <Tooltip title="删除">
                  <Popconfirm
                    title="确定要删除这个保存的查询吗？"
                    onConfirm={() => deleteSavedQuery(item.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Tooltip>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{item.name}</Text>
                    {item.favorite && <StarOutlined style={{ color: '#faad14' }} />}
                    {item.database && <Tag color="green">{item.database}</Tag>}
                  </Space>
                }
                description={
                  <div>
                    {item.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.description}
                      </Text>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <Text code style={{ fontSize: 12 }}>
                        {item.query.length > 80 ? item.query.substring(0, 80) + '...' : item.query}
                      </Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Space size="small">
                        {item.tags.map(tag => (
                          <Tag key={tag} size="small">{tag}</Tag>
                        ))}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatTime(item.updatedAt)}
                        </Text>
                      </Space>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {/* 保存查询对话框 */}
      <Modal
        title="保存查询"
        open={saveDialogVisible}
        onCancel={() => setSaveDialogVisible(false)}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleSaveQuery}>
          <Form.Item
            name="name"
            label="查询名称"
            rules={[{ required: true, message: '请输入查询名称' }]}
          >
            <Input placeholder="输入查询名称" />
          </Form.Item>
          
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="输入查询描述（可选）" />
          </Form.Item>
          
          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              placeholder="输入标签"
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item label="查询内容">
            <TextArea
              value={selectedQuery}
              rows={6}
              readOnly
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default QueryHistoryPanel;
