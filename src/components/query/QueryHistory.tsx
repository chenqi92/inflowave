import React, { useState, useEffect } from 'react';
import {
  Card, Button, Space, Typography, Input, Select, Tag, Modal, message, Empty, Row, Col,
  List, Tooltip, Popconfirm, DatePicker, RangePicker
} from '@/components/ui';
import {
  PlayCircleOutlined, DeleteOutlined, SearchOutlined, DatabaseOutlined, EditOutlined,
  HistoryOutlined, ClockCircleOutlined, ClearOutlined, ExportOutlined, BookOutlined
} from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';
import type { QueryHistoryItem, SavedQuery } from '@/types';

const { Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface QueryHistoryProps {
  onQuerySelect?: (query: string, database?: string) => void;
  visible?: boolean;
  onClose?: () => void;
}

const QueryHistory: React.FC<QueryHistoryProps> = ({
  onQuerySelect,
  visible = true,
  onClose,
}) => {
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterDatabase, setFilterDatabase] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<[any, any] | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);

  // 加载查询历史
  const loadQueryHistory = async () => {
    setLoading(true);
    try {
      const history = await safeTauriInvoke<QueryHistoryItem[]>('get_query_history');
      setHistoryItems(history || []);
    } catch (error) {
      message.error(`加载查询历史失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 加载保存的查询
  const loadSavedQueries = async () => {
    setLoading(true);
    try {
      const queries = await safeTauriInvoke<SavedQuery[]>('get_saved_queries');
      setSavedQueries(queries || []);
    } catch (error) {
      message.error(`加载保存的查询失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除历史记录项
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await safeTauriInvoke('delete_query_history', { id });
      await loadQueryHistory();
      message.success('删除成功');
    } catch (error) {
      message.error(`删除失败: ${error}`);
    }
  };

  // 清空历史记录
  const handleClearHistory = async () => {
    try {
      await safeTauriInvoke('clear_query_history');
      setHistoryItems([]);
      message.success('历史记录已清空');
    } catch (error) {
      message.error(`清空失败: ${error}`);
    }
  };

  // 删除保存的查询
  const handleDeleteSavedQuery = async (id: string) => {
    try {
      await safeTauriInvoke('delete_saved_query', { id });
      await loadSavedQueries();
      message.success('删除成功');
    } catch (error) {
      message.error(`删除失败: ${error}`);
    }
  };

  // 编辑保存的查询
  const handleEditSavedQuery = (query: SavedQuery) => {
    setEditingQuery(query);
  };

  // 保存编辑的查询
  const handleSaveEditedQuery = async (updatedQuery: SavedQuery) => {
    try {
      await safeTauriInvoke('update_saved_query', { query: updatedQuery });
      await loadSavedQueries();
      setEditingQuery(null);
      message.success('查询已更新');
    } catch (error) {
      message.error(`更新失败: ${error}`);
    }
  };

  // 过滤历史记录
  const filteredHistoryItems = historyItems.filter(item => {
    const matchesSearch = !searchText || 
      item.query.toLowerCase().includes(searchText.toLowerCase()) ||
      item.database?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesDatabase = !filterDatabase || item.database === filterDatabase;
    
    const matchesDateRange = !filterDateRange || (
      new Date(item.executedAt) >= filterDateRange[0] &&
      new Date(item.executedAt) <= filterDateRange[1]
    );

    return matchesSearch && matchesDatabase && matchesDateRange;
  });

  // 过滤保存的查询
  const filteredSavedQueries = savedQueries.filter(query => {
    const matchesSearch = !searchText || 
      query.query.toLowerCase().includes(searchText.toLowerCase()) ||
      query.name.toLowerCase().includes(searchText.toLowerCase()) ||
      query.description?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesDatabase = !filterDatabase || query.database === filterDatabase;

    return matchesSearch && matchesDatabase;
  });

  // 获取所有数据库列表（用于过滤）
  const allDatabases = Array.from(new Set([
    ...historyItems.map(item => item.database).filter(Boolean),
    ...savedQueries.map(query => query.database).filter(Boolean),
  ]));

  useEffect(() => {
    if (visible) {
      loadQueryHistory();
      loadSavedQueries();
    }
  }, [visible]);

  const renderHistoryItem = (item: QueryHistoryItem) => (
    <List.Item
      key={item.id}
      actions={[
        <Tooltip title="执行查询">
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => onQuerySelect?.(item.query, item.database)}
          />
        </Tooltip>,
        <Tooltip title="删除">
          <Popconfirm
            title="确定删除这条历史记录吗？"
            onConfirm={() => handleDeleteHistoryItem(item.id)}
          >
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Tooltip>,
      ]}
    >
      <List.Item.Meta
        title={
          <Space>
            <Text strong>{item.database || '未知数据库'}</Text>
            <Tag color={item.success ? 'green' : 'red'}>
              {item.success ? '成功' : '失败'}
            </Tag>
            {item.executionTime && (
              <Tag color="blue">{item.executionTime}ms</Tag>
            )}
          </Space>
        }
        description={
          <div>
            <Paragraph
              ellipsis={{ rows: 2, expandable: true }}
              style={{ margin: 0, fontSize: '12px' }}
            >
              {item.query}
            </Paragraph>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              <ClockCircleOutlined /> {new Date(item.executedAt).toLocaleString()}
            </Text>
          </div>
        }
      />
    </List.Item>
  );

  const renderSavedQuery = (query: SavedQuery) => (
    <List.Item
      key={query.id}
      actions={[
        <Tooltip title="执行查询">
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            onClick={() => onQuerySelect?.(query.query, query.database)}
          />
        </Tooltip>,
        <Tooltip title="编辑">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditSavedQuery(query)}
          />
        </Tooltip>,
        <Tooltip title="删除">
          <Popconfirm
            title="确定删除这个保存的查询吗？"
            onConfirm={() => handleDeleteSavedQuery(query.id)}
          >
            <Button type="text" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Tooltip>,
      ]}
    >
      <List.Item.Meta
        title={
          <Space>
            <Text strong>{query.name}</Text>
            <Tag color="blue">{query.database || '未指定数据库'}</Tag>
            {query.tags?.map(tag => (
              <Tag key={tag} color="default">{tag}</Tag>
            ))}
          </Space>
        }
        description={
          <div>
            {query.description && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                {query.description}
              </Text>
            )}
            <Paragraph
              ellipsis={{ rows: 2, expandable: true }}
              style={{ margin: 0, fontSize: '12px' }}
            >
              {query.query}
            </Paragraph>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              创建于 {new Date(query.createdAt).toLocaleString()}
            </Text>
          </div>
        }
      />
    </List.Item>
  );

  const content = (
    <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Search
              placeholder="搜索查询..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="筛选数据库"
              value={filterDatabase}
              onChange={setFilterDatabase}
              allowClear
              style={{ width: '100%' }}
            >
              {allDatabases.map(db => (
                <Option key={db} value={db}>{db}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Space>
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  setSearchText('');
                  setFilterDatabase('');
                  setFilterDateRange(null);
                }}
              >
                清空筛选
              </Button>
            </Space>
          </Col>
        </Row>
        
        {activeTab === 'history' && (
          <Row style={{ marginTop: 8 }}>
            <Col span={12}>
              <RangePicker
                placeholder={['开始时间', '结束时间']}
                value={filterDateRange}
                onChange={setFilterDateRange}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Space>
                <Popconfirm
                  title="确定清空所有历史记录吗？"
                  onConfirm={handleClearHistory}
                >
                  <Button icon={<DeleteOutlined />} danger>
                    清空历史
                  </Button>
                </Popconfirm>
              </Space>
            </Col>
          </Row>
        )}
      </div>

      {/* 标签页切换 */}
      <div style={{ padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Space>
          <Button
            type={activeTab === 'history' ? 'primary' : 'text'}
            icon={<HistoryOutlined />}
            onClick={() => setActiveTab('history')}
          >
            查询历史 ({filteredHistoryItems.length})
          </Button>
          <Button
            type={activeTab === 'saved' ? 'primary' : 'text'}
            icon={<BookOutlined />}
            onClick={() => setActiveTab('saved')}
          >
            保存的查询 ({filteredSavedQueries.length})
          </Button>
        </Space>
      </div>

      {/* 列表内容 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'history' ? (
          <List
            loading={loading}
            dataSource={filteredHistoryItems}
            renderItem={renderHistoryItem}
            locale={{
              emptyText: (
                <Empty
                  description="暂无查询历史"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        ) : (
          <List
            loading={loading}
            dataSource={filteredSavedQueries}
            renderItem={renderSavedQuery}
            locale={{
              emptyText: (
                <Empty
                  description="暂无保存的查询"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        )}
      </div>
    </div>
  );

  if (visible && onClose) {
    return (
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <span>查询历史</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        {content}
      </Modal>
    );
  }

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined />
          <span>查询历史</span>
        </Space>
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
    >
      {content}
    </Card>
  );
};

export default QueryHistory;
