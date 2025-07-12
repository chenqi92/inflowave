import React, { useState, useEffect } from 'react';
import { Typography, Button, Space, Tabs } from '@/components/ui';
import { PlusOutlined, ReloadOutlined, ImportOutlined, ExportOutlined, BugOutlined } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import ConnectionManager from '@/components/ConnectionManager';
import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
import ConnectionDebugPanel from '@/components/debug/ConnectionDebugPanel';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

const { Title } = Typography;

interface ConnectionListItem extends ConnectionConfig {
  status?: ConnectionStatus;
}

const Connections: React.FC = () => {
  const navigate = useNavigate();
  const {
    connections,
    addConnection,
    updateConnection,
    removeConnection,
    setConnectionStatus,
    clearConnections,
  } = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

  // 同步连接配置从后端到前端
  const syncConnectionsFromBackend = async () => {
    try {
      const backendConnections = await safeTauriInvoke<ConnectionConfig[]>('get_connections');
      
      if (backendConnections && backendConnections.length > 0) {
        // 清空前端存储的连接
        clearConnections();
        
        // 重新添加从后端获取的连接
        for (const conn of backendConnections) {
          addConnection(conn);
        }
        
        console.log(`已同步 ${backendConnections.length} 个连接配置`);
      }
    } catch (error) {
      console.error('同步连接配置失败:', error);
    }
  };

  // 加载连接列表
  const loadConnections = async () => {
    setLoading(true);
    try {
      // 首先同步连接配置
      await syncConnectionsFromBackend();
      
      // 然后获取连接状态
      const connectionList = await safeTauriInvoke<ConnectionConfig[]>('get_connections');

      if (connectionList) {
        // 获取每个连接的状态
        for (const conn of connectionList) {
          try {
            const status = await safeTauriInvoke<ConnectionStatus>('get_connection_status', {
              connectionId: conn.id
            });
            if (status) {
              setConnectionStatus(conn.id!, status);
            }
          } catch (error) {
            const errorStatus: ConnectionStatus = {
              id: conn.id!,
              status: 'disconnected' as const,
              error: String(error)
            };
            setConnectionStatus(conn.id!, errorStatus);
          }
        }
      }
    } catch (error) {
      showMessage.error(`加载连接列表失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载连接列表
  useEffect(() => {
    loadConnections();
  }, []);

  // 打开新建/编辑连接对话框
  const handleOpenDialog = (connection?: ConnectionConfig) => {
    setEditingConnection(connection || null);
    setIsDialogVisible(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setIsDialogVisible(false);
    setEditingConnection(null);
  };

  // 处理连接保存成功
  const handleConnectionSuccess = async (connection: ConnectionConfig) => {
    try {
      if (editingConnection?.id) {
        // 更新现有连接 - 确保使用正确的连接ID
        const updateConfig = { ...connection, id: editingConnection.id };
        await safeTauriInvoke('update_connection', { config: updateConfig });
        updateConnection(editingConnection.id, updateConfig);
        showMessage.success('连接配置已更新');
      } else {
        // 创建新连接
        const connectionId = await safeTauriInvoke<string>('create_connection', { config: connection });
        if (connectionId) {
          const newConnection = { ...connection, id: connectionId };
          addConnection(newConnection);
          showMessage.success('连接配置已创建');
        }
      }

      handleCloseDialog();
      // 重新加载连接列表以确保状态同步
      await loadConnections();
    } catch (error) {
      console.error('保存连接配置失败:', error);
      showMessage.error(`保存连接配置失败: ${error}`);
    }
  };



  // 处理连接选择
  const handleConnectionSelect = (connectionId: string) => {
    // 导航到数据库页面或其他相关页面
    navigate('/database', { state: { connectionId } });
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col p-6">
      {/* 页面标题和操作 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                连接管理
              </h1>
              <p className="text-gray-600 text-sm">
                管理和配置 InfluxDB 数据库连接，支持多环境管理和实时监控
              </p>
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                  {connections.length} 个连接
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button
              icon={<ReloadOutlined />}
              onClick={loadConnections}
              loading={loading}
              className="border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
              title="刷新连接列表"
            >
              刷新
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => showMessage.info('导入功能开发中...')}
              className="border-gray-300 hover:border-green-400 hover:text-green-600 transition-colors"
              title="导入连接配置"
            >
              导入
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={() => showMessage.info('导出功能开发中...')}
              className="border-gray-300 hover:border-purple-400 hover:text-purple-600 transition-colors"
              title="导出连接配置"
            >
              导出
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 shadow-sm"
              size="large"
            >
              新建连接
            </Button>
          </div>
        </div>
      </div>

      {/* 连接管理器 */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Tabs
          defaultActiveKey="manager"
          items={[
            {
              key: 'manager',
              label: '连接管理',
              children: (
                <ConnectionManager 
                  onConnectionSelect={handleConnectionSelect}
                  onEditConnection={handleOpenDialog}
                />
              ),
            },
            {
              key: 'debug',
              label: (
                <Space>
                  <BugOutlined />
                  调试面板
                </Space>
              ),
              children: <ConnectionDebugPanel />,
            },
          ]}
          style={{ height: '100%' }}
        />
      </div>

      {/* 连接配置对话框 */}
      <SimpleConnectionDialog
        visible={isDialogVisible}
        connection={editingConnection}
        onCancel={handleCloseDialog}
        onSuccess={handleConnectionSuccess}
      />
    </div>
  );
};

export default Connections;
