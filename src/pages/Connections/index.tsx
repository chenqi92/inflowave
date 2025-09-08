import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import ConnectionManager from '@/components/ConnectionManager';
import { ConnectionRecovery } from '@/components/ConnectionRecovery';

import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
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
    forceRefreshConnections,
  } = useConnectionStore();

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<ConnectionConfig | null>(null);

  // 同步连接配置从后端到前端
  const syncConnectionsFromBackend = async () => {
    try {
      console.log('🔄 开始同步连接配置从后端到前端');
      const backendConnections =
        await safeTauriInvoke<ConnectionConfig[]>('get_connections');

      if (backendConnections && backendConnections.length > 0) {
        console.log(`📥 从后端获取到 ${backendConnections.length} 个连接配置`);

        // 对比前端和后端的连接，检查是否需要更新
        const currentConnections = connections;
        const backendIds = new Set(backendConnections.map(c => c.id));
        const frontendIds = new Set(currentConnections.map(c => c.id));

        // 检查是否有差异
        const hasIdDifference = backendIds.size !== frontendIds.size ||
          [...backendIds].some(id => !frontendIds.has(id)) ||
          [...frontendIds].some(id => !backendIds.has(id));

        const hasContentDifference = backendConnections.some(backendConn => {
          const frontendConn = currentConnections.find(c => c.id === backendConn.id);
          if (!frontendConn) return true;

          // 比较关键字段，忽略时间戳差异
          const backendKey = `${backendConn.name}-${backendConn.host}-${backendConn.port}-${backendConn.version}`;
          const frontendKey = `${frontendConn.name}-${frontendConn.host}-${frontendConn.port}-${frontendConn.version}`;
          return backendKey !== frontendKey;
        });

        if (hasIdDifference || hasContentDifference) {
          console.log('🔄 检测到连接配置差异，开始同步');

          // 保存当前状态
          const { activeConnectionId, connectionStatuses } = useConnectionStore.getState();

          // 清空前端存储的连接
          clearConnections();

          // 重新添加从后端获取的连接
          for (const conn of backendConnections) {
            addConnection(conn);
          }

          // 恢复活跃连接（如果仍然存在）
          if (activeConnectionId && backendConnections.some(conn => conn.id === activeConnectionId)) {
            useConnectionStore.getState().setActiveConnection(activeConnectionId);
          }

          console.log(`✅ 成功同步 ${backendConnections.length} 个连接配置`);
        } else {
          console.log('✅ 连接配置已是最新，无需同步');
        }
      } else if (connections.length > 0) {
        // 如果后端没有连接但前端有，将前端连接推送到后端
        console.log('📤 后端无连接配置，尝试同步前端连接到后端');
        try {
          await syncConnectionsToBackend();
          console.log('✅ 前端连接已同步到后端');
        } catch (syncError) {
          console.warn('⚠️ 同步前端连接到后端失败:', syncError);
        }
      } else {
        console.log('📭 前后端都没有连接配置');
      }
    } catch (error) {
      console.error('❌ 同步连接配置失败:', error);
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
        // 连接配置已通过 syncConnectionsFromBackend 同步，包括状态
        console.log(`📋 连接列表加载完成: ${connectionList.length} 个连接`);
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
      console.log('💾 连接保存成功:', connection.name);

      if (editingConnection?.id) {
        // 更新现有连接
        showMessage.success(`连接 "${connection.name}" 已更新`);
      } else {
        // 创建新连接
        // 注意：SimpleConnectionDialog 内部的 useConnection hook 已经处理了连接创建和添加到store
        // 这里只需要显示成功消息
        showMessage.success(`连接 "${connection.name}" 已创建`);
        console.log('✅ 新连接已通过 useConnection hook 添加到前端状态:', connection.id);
      }

      handleCloseDialog();

      // 不需要在这里强制刷新，因为DatabaseExplorer会监听连接配置变化自动刷新
      console.log('✅ 连接保存完成，等待DatabaseExplorer自动刷新');

    } catch (error) {
      console.error('❌ 连接保存失败:', error);
      showMessage.error(`连接保存失败: ${error}`);
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

      {/* 主要内容区域 */}
      <div className='flex-1 overflow-hidden bg-background flex gap-6 p-6'>
        {/* 左侧：连接管理器 */}
        <div className='flex-1 min-w-0'>
          <ConnectionManager
            onConnectionSelect={handleConnectionSelect}
            onEditConnection={handleOpenDialog}
            onCreateConnection={() => handleOpenDialog()}
          />
        </div>

        {/* 右侧：连接恢复管理 */}
        <div className='w-80 flex-shrink-0'>
          <ConnectionRecovery />
        </div>
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
