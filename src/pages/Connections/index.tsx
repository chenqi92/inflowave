import React, { useState, useEffect } from 'react';
import { Title, Button, Tabs, TabsContent, TabsList, TabsTrigger, Space, Dialog, DialogContent, DialogHeader, DialogTitle, Modal } from '@/components/ui';
import { Plus, RefreshCw, FileUp, FileDown, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import ConnectionManager from '@/components/ConnectionManager';

import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
import ConnectionDebugPanel from '@/components/debug/ConnectionDebugPanel';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

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
    syncConnectionsToBackend} = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

  // 同步连接配置从后端到前端
  const syncConnectionsFromBackend = async () => {
    try {
      const backendConnections = await safeTauriInvoke<ConnectionConfig[]>('get_connections');
      
      if (backendConnections && backendConnections.length > 0) {
        // 对比前端和后端的连接，只更新有差异的
        const currentConnections = connections;
        const needsUpdate = backendConnections.some(backendConn => {
          const frontendConn = currentConnections.find(c => c.id === backendConn.id);
          return !frontendConn || JSON.stringify(frontendConn) !== JSON.stringify(backendConn);
        });
        
        if (needsUpdate || currentConnections.length !== backendConnections.length) {
          // 清空前端存储的连接
          clearConnections();
          
          // 重新添加从后端获取的连接
          for (const conn of backendConnections) {
            addConnection(conn);
          }
          
          console.log(`已同步 ${backendConnections.length} 个连接配置`);
        }
      } else if (connections.length > 0) {
        // 如果后端没有连接但前端有，将前端连接推送到后端
        console.log('后端无连接配置，尝试同步前端连接到后端');
        try {
          await syncConnectionsToBackend();
          console.log('前端连接已同步到后端');
        } catch (syncError) {
          console.warn('同步前端连接到后端失败:', syncError);
        }
      }
    } catch (error) {
      console.error('同步连接配置失败:', error);
      showMessage.error('同步连接配置失败，请检查后端服务');
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
        const connectionWithTimestamp = {
          ...connection,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const connectionId = await safeTauriInvoke<string>('create_connection', { config: connectionWithTimestamp });
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

  // 处理连接操作（用于卡片视图）
  const handleConnectionToggle = async (connectionId: string) => {
    setLoading(true);
    try {
      // 首先确保连接配置存在
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        showMessage.error('连接配置不存在，请重新加载页面');
        await loadConnections();
        return;
      }

      const { connectToDatabase, disconnectFromDatabase } = useConnectionStore.getState();
      const status = connectionStatuses[connectionId];
      
      if (status?.status === 'connected') {
        await disconnectFromDatabase(connectionId);
        showMessage.success('连接已断开');
      } else {
        try {
          await connectToDatabase(connectionId);
          showMessage.success('连接成功');
          handleConnectionSelect(connectionId);
        } catch (connectError) {
          // 如果连接失败，尝试重新创建连接配置
          console.warn('直接连接失败，尝试重新创建连接配置:', connectError);
          try {
            const connectionWithTimestamp = {
              ...connection,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            const newConnectionId = await safeTauriInvoke<string>('create_connection', { config: connectionWithTimestamp });
            if (newConnectionId) {
              // 使用新的连接ID重新尝试连接
              await connectToDatabase(newConnectionId);
              showMessage.success('连接成功');
              
              // 更新前端连接ID（如果发生了变化）
              if (newConnectionId !== connectionId) {
                updateConnection(connectionId, { ...connection, id: newConnectionId });
              }
              
              handleConnectionSelect(newConnectionId);
            }
          } catch (recreateError) {
            console.error('重新创建连接失败:', recreateError);
            showMessage.error(`连接失败: ${recreateError}`);

            // 最后尝试同步所有连接
            try {
              console.log('尝试同步所有连接到后端...');
              await syncConnectionsToBackend();
              await connectToDatabase(connectionId);
              showMessage.success('连接成功');
              handleConnectionSelect(connectionId);
            } catch (finalError) {
              console.error('最终连接尝试失败:', finalError);
              showMessage.error(`连接失败: ${finalError}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('连接操作失败:', error);
      showMessage.error(`连接操作失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理删除连接（用于卡片视图）
  const handleDeleteConnection = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除连接 "${connection?.name}" 吗？此操作无法撤销。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => removeConnection(connectionId)});
  };

  // 获取连接状态
  const connectionStatuses = useConnectionStore(state => state.connectionStatuses);
  const activeConnectionId = useConnectionStore(state => state.activeConnectionId);

  return (
    <div className="h-full bg-white flex flex-col">

      {/* 连接管理器 */}
      <div className="flex-1 overflow-hidden">
        <Tabs
          defaultValue="manager"
          className="h-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manager">连接列表</TabsTrigger>
            <TabsTrigger value="debug">
              <div className="flex gap-2">
                <Bug className="w-4 h-4" />
                调试面板
              </div>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manager" className="mt-4">
            <ConnectionManager
              onConnectionSelect={handleConnectionSelect}
              onEditConnection={handleOpenDialog}
            />
          </TabsContent>
          <TabsContent value="debug" className="mt-4">
            <ConnectionDebugPanel />
          </TabsContent>
        </Tabs>
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
