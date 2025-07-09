import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Tag,
  Tooltip,
  Modal,
  Form,
  message,
  Popconfirm,
  Empty,
  Row,
  Col,
} from 'antd';
import {
  BookOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  TagOutlined,
  DatabaseOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { safeTauriInvoke } from '@/utils/tauri';
import type { SavedQuery } from '@/types';

const { Text, Paragraph } = Typography;
const { Search, TextArea } = Input;
const { Option } = Select;

interface SavedQueriesProps {
  onQuerySelect?: (query: string, database?: string) => void;
  visible?: boolean;
  onClose?: () => void;
  databases?: string[];
}

interface SavedQueryFormData {
  name: string;
  description?: string;
  query: string;
  database?: string;
  tags: string[];
}

const SavedQueries: React.FC<SavedQueriesProps> = ({
  onQuerySelect,
  visible = true,
  onClose,
  databases = [],
}) => {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterDatabase, setFilterDatabase] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm<SavedQueryFormData>();

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

  // 创建新查询
  const handleCreateQuery = async (values: SavedQueryFormData) => {
    try {
      const newQuery: SavedQuery = {
        id: `query_${Date.now()}`,
        name: values.name,
        description: values.description,
        query: values.query,
        database: values.database,
        tags: values.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await safeTauriInvoke('save_query', { query: newQuery });
      await loadSavedQueries();
      setShowCreateModal(false);
      form.resetFields();
      message.success('查询已保存');
    } catch (error) {
      message.error(`保存查询失败: ${error}`);
    }
  };

  // 更新查询
  const handleUpdateQuery = async (values: SavedQueryFormData) => {
    if (!editingQuery) return;

    try {
      const updatedQuery: SavedQuery = {
        ...editingQuery,
        name: values.name,
        description: values.description,
        query: values.query,
        database: values.database,
        tags: values.tags || [],
        updatedAt: new Date(),
      };

      await safeTauriInvoke('update_saved_query', { query: updatedQuery });
      await loadSavedQueries();
      setEditingQuery(null);
      form.resetFields();
      message.success('查询已更新');
    } catch (error) {
      message.error(`更新查询失败: ${error}`);
    }
  };

  // 删除查询
  const handleDeleteQuery = async (id: string) => {
    try {
      await safeTauriInvoke('delete_saved_query', { id });
      await loadSavedQueries();
      message.success('查询已删除');
    } catch (error) {
      message.error(`删除查询失败: ${error}`);
    }
  };

  // 编辑查询
  const handleEditQuery = (query: SavedQuery) => {
    setEditingQuery(query);
    form.setFieldsValue({
      name: query.name,
      description: query.description,
      query: query.query,
      database: query.database,
      tags: query.tags || [],
    });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingQuery(null);
    setShowCreateModal(false);
    form.resetFields();
  };

  // 过滤查询
  const filteredQueries = savedQueries.filter(query => {
    const matchesSearch = !searchText || 
      query.query.toLowerCase().includes(searchText.toLowerCase()) ||
      query.name.toLowerCase().includes(searchText.toLowerCase()) ||
      query.description?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesDatabase = !filterDatabase || query.database === filterDatabase;
    
    const matchesTag = !filterTag || query.tags?.includes(filterTag);

    return matchesSearch && matchesDatabase && matchesTag;
  });

  // 获取所有标签
  const allTags = Array.from(new Set(
    savedQueries.flatMap(query => query.tags || [])
  ));

  // 获取所有数据库
  const allDatabases = Array.from(new Set([
    ...databases,
    ...savedQueries.map(query => query.database).filter(Boolean),
  ]));

  useEffect(() => {
    if (visible) {
      loadSavedQueries();
    }
  }, [visible]);

  const renderQueryItem = (query: SavedQuery) => (
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
            onClick={() => handleEditQuery(query)}
          />
        </Tooltip>,
        <Tooltip title="删除">
          <Popconfirm
            title="确定删除这个查询吗？"
            onConfirm={() => handleDeleteQuery(query.id)}
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
            {query.database && (
              <Tag color="blue" icon={<DatabaseOutlined />}>
                {query.database}
              </Tag>
            )}
            {query.tags?.map(tag => (
              <Tag key={tag} color="default" icon={<TagOutlined />}>
                {tag}
              </Tag>
            ))}
          </Space>
        }
        description={
          <div>
            {query.description && (
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 4 }}>
                {query.description}
              </Text>
            )}
            <Paragraph
              ellipsis={{ rows: 3, expandable: true }}
              style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace' }}
            >
              {query.query}
            </Paragraph>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              创建于 {new Date(query.createdAt).toLocaleString()}
              {query.updatedAt && query.updatedAt !== query.createdAt && (
                <span> • 更新于 {new Date(query.updatedAt).toLocaleString()}</span>
              )}
            </Text>
          </div>
        }
      />
    </List.Item>
  );

  const queryForm = (
    <Form
      form={form}
      layout="vertical"
      onFinish={editingQuery ? handleUpdateQuery : handleCreateQuery}
    >
      <Form.Item
        name="name"
        label="查询名称"
        rules={[{ required: true, message: '请输入查询名称' }]}
      >
        <Input placeholder="输入查询名称" />
      </Form.Item>

      <Form.Item
        name="description"
        label="描述"
      >
        <TextArea
          placeholder="输入查询描述（可选）"
          rows={2}
        />
      </Form.Item>

      <Form.Item
        name="query"
        label="查询语句"
        rules={[{ required: true, message: '请输入查询语句' }]}
      >
        <TextArea
          placeholder="输入 InfluxQL 查询语句"
          rows={6}
          style={{ fontFamily: 'monospace' }}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="database"
            label="数据库"
          >
            <Select
              placeholder="选择数据库（可选）"
              allowClear
            >
              {allDatabases.map(db => (
                <Option key={db} value={db}>{db}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签（可选）"
              style={{ width: '100%' }}
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
        <Space>
          <Button onClick={handleCancelEdit}>
            取消
          </Button>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
            {editingQuery ? '更新' : '保存'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const content = (
    <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Row gutter={[8, 8]}>
          <Col span={8}>
            <Search
              placeholder="搜索查询..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={5}>
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
          <Col span={5}>
            <Select
              placeholder="筛选标签"
              value={filterTag}
              onChange={setFilterTag}
              allowClear
              style={{ width: '100%' }}
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowCreateModal(true)}
            >
              新建查询
            </Button>
          </Col>
        </Row>
      </div>

      {/* 查询列表 */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <List
          loading={loading}
          dataSource={filteredQueries}
          renderItem={renderQueryItem}
          locale={{
            emptyText: (
              <Empty
                description="暂无保存的查询"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* 主内容 */}
      {visible && onClose ? (
        <Modal
          title={
            <Space>
              <BookOutlined />
              <span>保存的查询</span>
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
      ) : (
        <Card
          title={
            <Space>
              <BookOutlined />
              <span>保存的查询</span>
            </Space>
          }
          style={{ height: '100%' }}
          styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
        >
          {content}
        </Card>
      )}

      {/* 创建/编辑查询模态框 */}
      <Modal
        title={
          <Space>
            {editingQuery ? <EditOutlined /> : <PlusOutlined />}
            <span>{editingQuery ? '编辑查询' : '新建查询'}</span>
          </Space>
        }
        open={showCreateModal || !!editingQuery}
        onCancel={handleCancelEdit}
        footer={null}
        width={600}
        destroyOnClose
      >
        {queryForm}
      </Modal>
    </>
  );
};

export default SavedQueries;
