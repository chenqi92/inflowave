import React from 'react';
import { Modal, Table, Typography, Divider, Space, Tag } from 'antd';
import {
  SettingOutlined,
  FileOutlined,
  EditOutlined,
  EyeOutlined,
  DatabaseOutlined,
  ToolOutlined,
  AppstoreOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface KeyboardShortcutsProps {
  visible: boolean;
  onClose: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  visible,
  onClose,
}) => {
  // 快捷键数据
  const shortcutCategories = [
    {
      title: '文件操作',
      icon: <FileOutlined />,
      shortcuts: [
        { key: 'Ctrl+N', description: '新建查询' },
        { key: 'Ctrl+O', description: '打开文件' },
        { key: 'Ctrl+S', description: '保存' },
        { key: 'Ctrl+Shift+S', description: '另存为' },
        { key: 'Ctrl+E', description: '导出数据' },
        { key: 'Ctrl+Q', description: '退出应用' },
      ],
    },
    {
      title: '编辑操作',
      icon: <EditOutlined />,
      shortcuts: [
        { key: 'Ctrl+Z', description: '撤销' },
        { key: 'Ctrl+Y', description: '重做' },
        { key: 'Ctrl+X', description: '剪切' },
        { key: 'Ctrl+C', description: '复制' },
        { key: 'Ctrl+V', description: '粘贴' },
        { key: 'Ctrl+F', description: '查找' },
        { key: 'Ctrl+H', description: '替换' },
        { key: 'Ctrl+Shift+P', description: '全局搜索' },
      ],
    },
    {
      title: '视图导航',
      icon: <EyeOutlined />,
      shortcuts: [
        { key: 'Ctrl+1', description: '仪表板' },
        { key: 'Ctrl+2', description: '连接管理' },
        { key: 'Ctrl+3', description: '数据查询' },
        { key: 'Ctrl+4', description: '数据库管理' },
        { key: 'Ctrl+B', description: '切换侧边栏' },
        { key: 'Ctrl+Plus', description: '放大' },
        { key: 'Ctrl+Minus', description: '缩小' },
        { key: 'Ctrl+0', description: '重置缩放' },
      ],
    },
    {
      title: '数据库操作',
      icon: <DatabaseOutlined />,
      shortcuts: [
        { key: 'Ctrl+Shift+N', description: '新建连接' },
        { key: 'Ctrl+T', description: '测试连接' },
        { key: 'F5', description: '刷新结构' },
        { key: 'Ctrl+Enter', description: '执行查询' },
        { key: 'Ctrl+Shift+C', description: '停止查询' },
      ],
    },
    {
      title: '工具功能',
      icon: <ToolOutlined />,
      shortcuts: [
        { key: 'Ctrl+Comma', description: '应用设置' },
        { key: 'F1', description: '用户手册' },
      ],
    },
    {
      title: '窗口管理',
      icon: <AppstoreOutlined />,
      shortcuts: [
        { key: 'Ctrl+M', description: '最小化' },
        { key: 'F11', description: '全屏' },
        { key: 'Escape', description: '退出全屏' },
        { key: 'F12', description: '开发者工具' },
      ],
    },
  ];

  // 表格列配置
  const columns = [
    {
      title: '快捷键',
      dataIndex: 'key',
      key: 'key',
      width: 120,
      render: (text: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: '功能描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <span>键盘快捷键</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {shortcutCategories.map((category, index) => (
          <div key={category.title} style={{ marginBottom: 24 }}>
            <Title level={4} style={{ marginBottom: 16 }}>
              <Space>
                {category.icon}
                {category.title}
              </Space>
            </Title>
            
            <Table
              dataSource={category.shortcuts}
              columns={columns}
              pagination={false}
              size="small"
              rowKey="key"
              style={{ marginBottom: 16 }}
            />
            
            {index < shortcutCategories.length - 1 && <Divider />}
          </div>
        ))}
        
        <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
          <Space>
            <QuestionCircleOutlined style={{ color: '#1890ff' }} />
            <Text type="secondary">
              提示：大部分快捷键在相应的功能页面中生效。某些快捷键可能因操作系统而异。
            </Text>
          </Space>
        </div>
      </div>
    </Modal>
  );
};

export default KeyboardShortcuts;
