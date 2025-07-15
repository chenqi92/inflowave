import React from 'react';
import { Menu, Popconfirm } from '@/components/ui';
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Wifi, Unlink, Edit, Trash2, Eye, RefreshCw, Database, FileDown } from 'lucide-react';
import type { MenuProps } from '@/components/ui';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { invoke } from '@tauri-apps/api/core';
import { Modal } from '@/utils/modalAdapter';

interface ConnectionContextMenuProps {
  connection: ConnectionConfig;
  status?: ConnectionStatus;
  onEdit?: (connection: ConnectionConfig) => void;
  onViewStats?: (connectionId: string) => void;
  onClose?: () => void;
}

const ConnectionContextMenu: React.FC<ConnectionContextMenuProps> = ({
  connection,
  status,
  onEdit,
  onViewStats,
  onClose}) => {
  const {
    connectToDatabase,
    disconnectFromDatabase,
    removeConnection,
    refreshAllStatuses} = useConnectionStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const isConnected = status?.status === 'connected';
  const isConnecting = status?.status === 'connecting';

  const handleConnect = async () => {
    try {
      await connectToDatabase(connection.id!);
      toast({ title: "成功", description: `已连接到 ${connection.name}` });
    } catch (error) {
      toast({ title: "错误", description: `连接失败: ${error}`, variant: "destructive" });
    }
    onClose?.();
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromDatabase(connection.id!);
      toast({ title: "成功", description: `已断开 ${connection.name}` });
    } catch (error) {
      toast({ title: "错误", description: `断开连接失败: ${error}`, variant: "destructive" });
    }
    onClose?.();
  };

  const handleTestConnection = async () => {
    try {
      const result = await safeTauriInvoke('test_connection', { connectionId: connection.id });
      if (result) {
        toast({ title: "成功", description: "连接测试成功" });
      } else {
        toast({ title: "错误", description: "连接测试失败", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "错误", description: `连接测试失败: ${error}`, variant: "destructive" });
    }
    onClose?.();
  };

  const handleDelete = () => {
    removeConnection(connection.id!);
    toast({ title: "成功", description: "连接已删除" });
    onClose?.();
  };

  const handleRefreshStatus = async () => {
    try {
      await refreshAllStatuses();
      toast({ title: "成功", description: "状态已刷新" });
    } catch (error) {
      toast({ title: "错误", description: `刷新状态失败: ${error}`, variant: "destructive" });
    }
    onClose?.();
  };

  const handleViewDatabases = async () => {
    if (!isConnected) {
      toast({ title: "警告", description: "请先连接到数据库" });
      return;
    }

    try {
      const databases = await invoke<string[]>('get_databases', { connectionId: connection.id });
      Modal.info({
        title: `数据库列表 - ${connection.name}`,
        content: (
          <div>
            <p>共找到 {databases.length} 个数据库：</p>
            <ul>
              {databases.map((db, index) => (
                <li key={index}>{db}</li>
              ))}
            </ul>
          </div>
        ),
        width: 500});
    } catch (error) {
      toast({ title: "错误", description: `获取数据库列表失败: ${error}`, variant: "destructive" });
    }
    onClose?.();
  };

  const handleExportConfig = () => {
    const configToExport = {
      ...connection,
      password: '', // 不导出密码
    };
    
    const dataStr = JSON.stringify(configToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${connection.name}_config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({ title: "成功", description: "配置已导出" });
    onClose?.();
  };

  const menuItems: MenuProps['items'] = [
    // 连接操作
    {
      key: 'connection-group',
      type: 'group',
      label: '连接操作',
      children: [
        {
          key: 'connect',
          icon: <Wifi className="w-4 h-4"  />,
          label: '连接',
          disabled: isConnected || isConnecting,
          onClick: handleConnect},
        {
          key: 'disconnect',
          icon: <Unlink className="w-4 h-4"  />,
          label: '断开连接',
          disabled: !isConnected,
          onClick: handleDisconnect},
        {
          key: 'test',
          icon: <RefreshCw className="w-4 h-4"  />,
          label: '测试连接',
          onClick: handleTestConnection},
        {
          key: 'refresh',
          icon: <RefreshCw className="w-4 h-4"  />,
          label: '刷新状态',
          onClick: handleRefreshStatus},
      ]},
    {
      type: 'divider'},
    // 数据库操作
    {
      key: 'database-group',
      type: 'group',
      label: '数据库操作',
      children: [
        {
          key: 'view-databases',
          icon: <Database className="w-4 h-4"  />,
          label: '查看数据库',
          disabled: !isConnected,
          onClick: handleViewDatabases},
        {
          key: 'view-stats',
          icon: <Eye className="w-4 h-4"  />,
          label: '连接池统计',
          disabled: !isConnected,
          onClick: () => {
            onViewStats?.(connection.id!);
            onClose?.();
          }},
      ]},
    {
      type: 'divider'},
    // 管理操作
    {
      key: 'management-group',
      type: 'group',
      label: '管理操作',
      children: [
        {
          key: 'edit',
          icon: <Edit className="w-4 h-4"  />,
          label: '编辑连接',
          onClick: () => {
            onEdit?.(connection);
            onClose?.();
          }},
        {
          key: 'export',
          icon: <FileDown className="w-4 h-4"  />,
          label: '导出配置',
          onClick: handleExportConfig},
        {
          key: 'delete',
          icon: <Trash2 className="w-4 h-4"  />,
          label: '删除连接',
          danger: true,
          onClick: () => setShowDeleteConfirm(true)},
      ]},
  ];

  return (
    <>
      <Menu
        items={menuItems}
        style={{ minWidth: 200 }}
        onClick={(e) => {
          // 阻止事件冒泡
          e.domEvent.stopPropagation();
        }}
      />

      <Popconfirm
        title="确认删除连接"
        description={`确定要删除连接 "${connection.name}" 吗？此操作不可撤销。`}
        open={showDeleteConfirm}
        onConfirm={handleDelete}
        onOpenChange={(open) => !open && (() => setShowDeleteConfirm(false))()}
        okText="删除"
        cancelText="取消"
        okType="danger"
      >
        <div />
      </Popconfirm>
    </>
  );
};

export default ConnectionContextMenu;
