﻿import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Bug, Unplug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import ConnectionManager from '@/components/ConnectionManager';

import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
import ConnectionDebugPanel from '@/components/debug/ConnectionDebugPanel';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

const Connections: React.FC = () => {
  const navigate = useNavigate();
  const {
    connections,
    addConnection,
    updateConnection,
    setConnectionStatus,
    clearConnections,
    syncConnectionsToBackend,
  } = useConnectionStore();

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<ConnectionConfig | null>(null);

  // 同步连接配置从后端到前端
  const syncConnectionsFromBackend = async () => {
    try {
      const backendConnections =
        await safeTauriInvoke<ConnectionConfig[]>('get_connections');

      if (backendConnections && backendConnections.length > 0) {
        // 对比前端和后端的连接，只更新有差异的
        const currentConnections = connections;
        const needsUpdate = backendConnections.some(backendConn => {
          const frontendConn = currentConnections.find(
            c => c.id === backendConn.id
          );
          return (
            !frontendConn ||
            JSON.stringify(frontendConn) !== JSON.stringify(backendConn)
          );
        });

        if (
          needsUpdate ||
          currentConnections.length !== backendConnections.length
        ) {
          // 保存当前活跃连接ID和连接状态
          const {
            activeConnectionId,
            connectedConnectionIds,
            connectionStatuses,
          } = useConnectionStore.getState();

          // 清空前端存储的连接
          clearConnections();

          // 重新添加从后端获取的连接
          for (const conn of backendConnections) {
            addConnection(conn);
          }

          // 恢复活跃连接和连接状态
          if (
            activeConnectionId &&
            backendConnections.some(conn => conn.id === activeConnectionId)
          ) {
            useConnectionStore
              .getState()
              .setActiveConnection(activeConnectionId);

            // 恢复连接状态
            Object.entries(connectionStatuses).forEach(([id, status]) => {
              if (backendConnections.some(conn => conn.id === id)) {
                setConnectionStatus(id, status);
              }
            });

            // 恢复已连接列表
            connectedConnectionIds.forEach(id => {
              if (backendConnections.some(conn => conn.id === id)) {
                useConnectionStore.getState().addConnectedConnection(id);
              }
            });
          }

          console.log(
            `已同步 ${backendConnections.length} 个连接配置，保持活跃连接: ${activeConnectionId}`
          );
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
  const loadConnections = useCallback(async () => {
    try {
      // 首先同步连接配置
      await syncConnectionsFromBackend();

      // 然后获取连接状态
      const connectionList =
        await safeTauriInvoke<ConnectionConfig[]>('get_connections');

      if (connectionList) {
        // 启动时强制所有连接为断开状态，确保前后端状态一致
        for (const conn of connectionList) {
          // 创建默认的断开状态
          const defaultStatus: ConnectionStatus = {
            id: conn.id!,
            status: 'disconnected' as const,
            error: undefined,
            lastConnected: undefined,
            latency: undefined,
          };
          setConnectionStatus(conn.id!, defaultStatus);
        }

        // 确保connectedConnectionIds也被清空
        const { syncConnectionStates } = useConnectionStore.getState();
        syncConnectionStates();

      }
    } catch (error) {
      showMessage.error(`加载连接列表失败: ${error}`);
    }
  }, [setConnectionStatus]); // 移除syncConnectionsFromBackend依赖

  // 组件挂载时加载连接列表 - 避免每次切换都重新加载
  useEffect(() => {
    // 只有当连接列表为空时才加载，避免不必要的重新加载
    if (connections.length === 0) {
      loadConnections();
    }
  }, []); // 只在组件挂载时执行一次

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
        // 更新现有连接 - 确保使用正确的连接ID和时间戳字段
        const updateConfig = {
          ...connection,
          id: editingConnection.id,
          created_at: editingConnection.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await safeTauriInvoke('update_connection', { config: updateConfig });
        updateConnection(editingConnection.id, updateConfig);
        showMessage.success('连接配置已更新');
      } else {
        // 创建新连接
        const connectionWithTimestamp = {
          ...connection,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const connectionId = await safeTauriInvoke<string>(
          'create_connection',
          { config: connectionWithTimestamp }
        );
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
    <div className='h-full bg-background flex flex-col'>
      {/* 页面标题 */}
      <div className='border-b bg-background'>
        <div className='p-6'>
          <h1 className='text-2xl font-semibold text-foreground'>数据源管理</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            管理和监控 InfluxDB 数据库连接
          </p>
        </div>
      </div>

      {/* 连接管理器 */}
      <div className='flex-1 overflow-hidden bg-background'>
        <Tabs defaultValue='manager' className='h-full flex flex-col'>
          <div className='border-b'>
            <TabsList className='h-12 w-full justify-start bg-transparent p-0 space-x-8'>
              <TabsTrigger
                value='manager'
                className='relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none'
              >
                <Unplug className='w-4 h-4 mr-2' />
                连接列表
              </TabsTrigger>
              <TabsTrigger
                value='debug'
                className='relative h-12 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-3 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none'
              >
                <Bug className='w-4 h-4 mr-2' />
                调试面板
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='manager' className='mt-0 flex-1 overflow-hidden'>
            <ConnectionManager
              onConnectionSelect={handleConnectionSelect}
              onEditConnection={handleOpenDialog}
              onCreateConnection={() => handleOpenDialog()}
            />
          </TabsContent>
          <TabsContent value='debug' className='mt-0 flex-1 overflow-hidden'>
            <ConnectionDebugPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* 连接配置对话框 */}
      <SimpleConnectionDialog
        visible={isDialogVisible}
        connection={editingConnection || undefined}
        onCancel={handleCloseDialog}
        onSuccess={handleConnectionSuccess}
      />
    </div>
  );
};

export default Connections;
