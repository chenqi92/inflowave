import React, { useState, useEffect, useRef } from 'react';
import { Input, Typography, Tag, Empty, Spin, Divider, List } from 'antd';
import { Modal, Space } from '@/components/ui';
import {
  SearchOutlined,
  DatabaseOutlined,
  TableOutlined,
  SettingOutlined,
  FileTextOutlined,
  FunctionOutlined
} from '@/components/ui';

const { Text } = Typography;

interface SearchResult {
  id: string;
  type: 'database' | 'measurement' | 'field' | 'query' | 'connection' | 'setting' | 'command';
  title: string;
  description?: string;
  category: string;
  metadata?: Record<string, any>;
  action?: () => void;
}

interface GlobalSearchProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (path: string, params?: any) => void;
  onExecuteQuery?: (query: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  visible,
  onClose,
  onNavigate,
  onExecuteQuery,
}) => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<any>(null);

  // 搜索结果图标映射
  const getIcon = (type: string) => {
    switch (type) {
      case 'database': return <DatabaseOutlined />;
      case 'measurement': return <TableOutlined />;
      case 'field': return <FunctionOutlined />;
      case 'query': return <FileTextOutlined />;
      case 'connection': return <DatabaseOutlined />;
      case 'setting': return <SettingOutlined />;
      case 'command': return <SearchOutlined />;
      default: return <SearchOutlined />;
    }
  };

  // 搜索结果颜色映射
  const getTagColor = (type: string) => {
    switch (type) {
      case 'database': return 'blue';
      case 'measurement': return 'green';
      case 'field': return 'orange';
      case 'query': return 'purple';
      case 'connection': return 'cyan';
      case 'setting': return 'gray';
      case 'command': return 'red';
      default: return 'default';
    }
  };

  // 执行搜索
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // 模拟搜索结果，实际应该调用后端API
      const mockResults: SearchResult[] = [
        // 数据库搜索结果
        {
          id: 'db1',
          type: 'database',
          title: 'myapp_production',
          description: '生产环境数据库',
          category: '数据库',
          action: () => onNavigate?.('/database', { database: 'myapp_production' }),
        },
        // 测量搜索结果
        {
          id: 'measurement1',
          type: 'measurement',
          title: 'cpu_usage',
          description: 'CPU 使用率监控数据',
          category: '测量',
          metadata: { database: 'monitoring' },
          action: () => onNavigate?.('/query', { measurement: 'cpu_usage' }),
        },
        // 字段搜索结果
        {
          id: 'field1',
          type: 'field',
          title: 'usage_percent',
          description: 'CPU 使用百分比字段',
          category: '字段',
          metadata: { measurement: 'cpu_usage', type: 'field' },
        },
        // 保存的查询
        {
          id: 'query1',
          type: 'query',
          title: '系统性能监控',
          description: 'SELECT mean(usage_percent) FROM cpu_usage...',
          category: '保存的查询',
          action: () => onExecuteQuery?.('SELECT mean(usage_percent) FROM cpu_usage WHERE time > now() - 1h GROUP BY time(5m)'),
        },
        // 连接
        {
          id: 'conn1',
          type: 'connection',
          title: 'Production InfluxDB',
          description: 'influxdb.prod.example.com:8086',
          category: '连接',
          action: () => onNavigate?.('/connections'),
        },
        // 设置
        {
          id: 'setting1',
          type: 'setting',
          title: '编辑器设置',
          description: '配置查询编辑器选项',
          category: '设置',
          action: () => onNavigate?.('/settings', { tab: 'editor' }),
        },
        // 命令
        {
          id: 'cmd1',
          type: 'command',
          title: '新建连接',
          description: '创建新的数据库连接',
          category: '命令',
          action: () => onNavigate?.('/connections', { action: 'create' }),
        },
      ];

      // 过滤搜索结果
      const filtered = mockResults.filter(result =>
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase())
      );

      setResults(filtered);
      setSelectedIndex(0);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // 处理选择结果
  const handleSelectResult = (result: SearchResult) => {
    if (result.action) {
      result.action();
    }
    onClose();
    setSearchText('');
    setResults([]);
  };

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // 对话框打开时聚焦输入框
  useEffect(() => {
    if (visible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  // 重置状态
  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [visible]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      styles={{ body: { padding: 0 } }}
      destroyOnHidden
    >
      <div className="global-search">
        {/* 搜索输入框 */}
        <div style={{ padding: '16px 16px 0 16px' }}>
          <Input
            ref={inputRef}
            size="large"
            placeholder="搜索数据库、测量、查询、设置..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ border: 'none', boxShadow: 'none' }}
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 搜索结果 */}
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : results.length > 0 ? (
            <List
              dataSource={results}
              renderItem={(item, index) => (
                <List.Item
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: index === selectedIndex ? '#f5f5f5' : 'transparent',
                  }}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <List.Item.Meta
                    avatar={getIcon(item.type)}
                    title={
                      <Space>
                        <span>{item.title}</span>
                        <Tag color={getTagColor(item.type)}>
                          {item.category}
                        </Tag>
                      </Space>
                    }
                    description={
                      <div>
                        {item.description && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.description}
                          </Text>
                        )}
                        {item.metadata && (
                          <div style={{ marginTop: 4 }}>
                            {Object.entries(item.metadata).map(([key, value]) => (
                              <Tag key={key} style={{ fontSize: 10 }}>
                                {key}: {value}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : searchText ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="未找到相关结果"
              />
            </div>
          ) : (
            <div style={{ padding: '20px 16px' }}>
              <Text type="secondary">
                输入关键词搜索数据库、测量、查询、设置等内容
              </Text>
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  快捷键提示:
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Space direction="vertical" size="small">
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ↑↓ 选择结果 | Enter 确认 | Esc 关闭
                    </Text>
                  </Space>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        {results.length > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ padding: '8px 16px', textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                找到 {results.length} 个结果
              </Text>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default GlobalSearch;
