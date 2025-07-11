import React, { useState, useEffect } from 'react';
import { Typography, Button, Space } from '@/components/ui';
import { PlusOutlined, ReloadOutlined, ImportOutlined, ExportOutlined } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import ConnectionManager from '@/components/ConnectionManager';
import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

const { Title } = Typography;

interface ConnectionListItem extends ConnectionConfig {
  status?: ConnectionStatus;
}

const Connections: React.FC = () => {
  const navigate = useNavigate();
  const {
    addConnection,
    updateConnection,
    removeConnection,
    setConnectionStatus,
  } = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

  // 加载连接列表
  const loadConnections = async () => {
    setLoading(true);
    try {
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
      if (editingConnection) {
        // 更新现有连接
        await safeTauriInvoke('update_connection', {
          connectionId: connection.id,
          config: connection
        });
        updateConnection(connection.id!, connection);
        showMessage.success('连接配置已更新');
      } else {
        // 创建新连接
        const connectionId = await safeTauriInvoke<string>('create_connection', { config: connection });
        if (connectionId) {
          addConnection({ ...connection, id: connectionId });
          showMessage.success('连接配置已创建');
        }
      }

      handleCloseDialog();
      await loadConnections(); // 重新加载连接列表
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
    <div className="h-full bg-gray-50 flex flex-col">
      {/* 页面标题和操作 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              连接管理
            </h1>
            <p className="text-gray-600 text-sm">
              管理和配置 InfluxDB 数据库连接，支持多环境管理
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              icon={<ReloadOutlined />}
              onClick={loadConnections}
              loading={loading}
              className="border-gray-300"
            >
              刷新
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => showMessage.info('导入功能开发中...')}
              className="border-gray-300"
            >
              导入
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={() => showMessage.info('导出功能开发中...')}
              className="border-gray-300"
            >
              导出
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenDialog()}
              className="bg-blue-600 hover:bg-blue-700 border-blue-600"
            >
              新建连接
            </Button>
          </div>
        </div>
      </div>

      {/* 连接管理器 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden">
        <ConnectionManager 
          onConnectionSelect={handleConnectionSelect}
          onEditConnection={handleOpenDialog}
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
