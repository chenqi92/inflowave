import React, { useState } from 'react';
import { Button, Space, Divider, Dropdown, Badge, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { 
  DatabaseOutlined, 
  PlayCircleOutlined, 
  StopOutlined, 
  SaveOutlined, 
  FolderOpenOutlined,
  HistoryOutlined,
  SettingOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  BugOutlined,
  QuestionCircleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  BarChartOutlined,
  EditOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  HomeOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useConnectionStore } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import SettingsModal from '@/components/common/SettingsModal';
import ConnectionModal from '@/components/common/ConnectionModal';

interface MainToolbarProps {
  onViewChange?: (view: string) => void;
  currentView?: string;
}

const MainToolbar: React.FC<MainToolbarProps> = ({ onViewChange, currentView = 'query' }) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const navigate = useNavigate();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [connectionModalVisible, setConnectionModalVisible] = useState(false);
  const activeConnection = activeConnectionId ? connections.find(c => c.id === activeConnectionId) : null;

  const handleConnectionMenuClick = ({ key }: { key: string }) => {
    if (key === 'new' || key === 'manage') {
      setConnectionModalVisible(true);
    } else {
      // 选择连接
      const { setActiveConnectionId } = useConnectionStore.getState();
      setActiveConnectionId(key);
    }
  };

  const connectionMenuItems: MenuProps['items'] = [
    {
      key: 'new',
      label: '新建连接',
      icon: <DatabaseOutlined />,
    },
    {
      key: 'manage',
      label: '管理连接',
      icon: <SettingOutlined />,
    },
    { type: 'divider' },
    ...connections.map(conn => ({
      key: conn.id,
      label: (
        <div className="flex items-center justify-between min-w-48">
          <span className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              conn.id === activeConnectionId ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span>{conn.name}</span>
          </span>
          <span className="text-xs text-gray-500">
            {conn.host}:{conn.port}
          </span>
        </div>
      ),
    })),
  ];

  const handleFileMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'new-query':
        // 创建新查询
        navigate('/query');
        break;
      case 'open':
        // 打开文件
        console.log('打开文件');
        break;
      case 'save':
        // 保存当前查询
        console.log('保存文件');
        break;
      case 'save-as':
        // 另存为
        console.log('另存为');
        break;
      case 'import':
        // 导入数据
        navigate('/data-write');
        break;
      case 'export':
        // 导出数据  
        console.log('导出数据功能尚未实现');
        break;
      default:
        console.log('未处理的文件菜单项:', key);
    }
  };

  const fileMenuItems: MenuProps['items'] = [
    {
      key: 'new-query',
      label: '新建查询',
      icon: <FolderOpenOutlined />,
    },
    {
      key: 'open',
      label: '打开文件',
      icon: <FolderOpenOutlined />,
    },
    {
      key: 'save',
      label: '保存',
      icon: <SaveOutlined />,
    },
    {
      key: 'save-as',
      label: '另存为',
      icon: <SaveOutlined />,
    },
    { type: 'divider' },
    {
      key: 'import',
      label: '导入数据',
      icon: <ImportOutlined />,
    },
    {
      key: 'export',
      label: '导出数据',
      icon: <ExportOutlined />,
    },
  ];

  const handleToolsMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'query-history':
        // 查询历史
        console.log('打开查询历史');
        break;
      case 'console':
        // 控制台
        console.log('打开控制台');
        break;
      case 'dev-tools':
        // 开发者工具
        navigate('/dev-tools');
        break;
      case 'preferences':
        // 首选项
        setSettingsVisible(true);
        break;
      default:
        console.log('未处理的工具菜单项:', key);
    }
  };

  const toolsMenuItems: MenuProps['items'] = [
    {
      key: 'query-history',
      label: '查询历史',
      icon: <HistoryOutlined />,
    },
    {
      key: 'console',
      label: '控制台',
      icon: <BugOutlined />,
    },
    {
      key: 'dev-tools',
      label: '开发者工具',
      icon: <ToolOutlined />,
    },
    { type: 'divider' },
    {
      key: 'preferences',
      label: '首选项',
      icon: <SettingOutlined />,
    },
  ];

  return (
    <div className="datagrip-toolbar flex items-center justify-between w-full">
      {/* 左侧：主要操作按钮 */}
      <Space size="small">
        {/* 连接管理 */}
        <Dropdown 
          menu={{ items: connectionMenuItems, onClick: handleConnectionMenuClick }} 
          placement="bottomLeft"
          trigger={['click']}
        >
          <Button 
            type={activeConnection ? 'primary' : 'default'}
            icon={activeConnection ? <LinkOutlined /> : <DisconnectOutlined />}
            className="h-8"
          >
            {activeConnection ? activeConnection.name : '选择连接'}
            {activeConnection && (
              <Badge 
                status="success" 
                className="ml-1" 
                size="small"
              />
            )}
          </Button>
        </Dropdown>

        <Divider type="vertical" className="h-6" />

        {/* 执行相关 */}
        <Button 
          type="primary" 
          icon={<PlayCircleOutlined />}
          className="h-8"
          disabled={!activeConnection}
        >
          执行
        </Button>
        
        <Button 
          icon={<StopOutlined />}
          className="h-8"
          disabled={!activeConnection}
        >
          停止
        </Button>

        <Divider type="vertical" className="h-6" />

        {/* 文件操作 */}
        <Dropdown 
          menu={{ items: fileMenuItems, onClick: handleFileMenuClick }} 
          placement="bottomLeft"
        >
          <Button 
            icon={<FolderOpenOutlined />}
            className="h-8"
          >
            文件
          </Button>
        </Dropdown>

        <Button 
          icon={<SaveOutlined />}
          className="h-8"
        >
          保存
        </Button>

        {/* 工具菜单 */}
        <Dropdown 
          menu={{ items: toolsMenuItems, onClick: handleToolsMenuClick }} 
          placement="bottomLeft"
        >
          <Button 
            icon={<ToolOutlined />}
            className="h-8"
          >
            工具
          </Button>
        </Dropdown>

        <Divider type="vertical" className="h-6" />

        {/* 视图切换 */}
        <Space.Compact>
          <Tooltip title="数据库浏览">
            <Button 
              type={currentView === 'database' ? 'primary' : 'default'}
              icon={<DatabaseOutlined />}
              className="h-8"
              onClick={() => onViewChange?.('database')}
              disabled={!activeConnection}
            />
          </Tooltip>
          <Tooltip title="查询编辑器">
            <Button 
              type={currentView === 'query' ? 'primary' : 'default'}
              icon={<EditOutlined />}
              className="h-8"
              onClick={() => onViewChange?.('query')}
              disabled={!activeConnection}
            />
          </Tooltip>
          <Tooltip title="数据可视化">
            <Button 
              type={currentView === 'visualization' ? 'primary' : 'default'}
              icon={<BarChartOutlined />}
              className="h-8"
              onClick={() => onViewChange?.('visualization')}
              disabled={!activeConnection}
            />
          </Tooltip>
          <Tooltip title="性能监控">
            <Button 
              type={currentView === 'performance' ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              className="h-8"
              onClick={() => onViewChange?.('performance')}
              disabled={!activeConnection}
            />
          </Tooltip>
        </Space.Compact>

        <Divider type="vertical" className="h-6" />

        {/* 刷新 */}
        <Button 
          icon={<ReloadOutlined />}
          className="h-8"
          disabled={!activeConnection}
        >
          刷新
        </Button>
      </Space>

      {/* 右侧：导航和帮助 */}
      <Space size="small">
        <Tooltip title="连接管理">
          <Button 
            icon={<ApiOutlined />}
            className="h-8"
            onClick={() => setConnectionModalVisible(true)}
          >
            连接
          </Button>
        </Tooltip>

        <Tooltip title="偏好设置">
          <Button 
            icon={<SettingOutlined />}
            className="h-8"
            onClick={() => setSettingsVisible(true)}
          >
            设置
          </Button>
        </Tooltip>

        <Tooltip title="帮助">
          <Button 
            icon={<QuestionCircleOutlined />}
            className="h-8"
          />
        </Tooltip>
      </Space>

      {/* 设置模态框 */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* 连接管理模态框 */}
      <ConnectionModal
        visible={connectionModalVisible}
        onClose={() => setConnectionModalVisible(false)}
      />
    </div>
  );
};

export default MainToolbar;