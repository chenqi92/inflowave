/**
 * IoTDBTest 页面单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IoTDBTestPage from '../index';
import { useConnectionStore } from '@/store/connection';

// Mock dependencies
vi.mock('@/store/connection');
vi.mock('@/utils/tauri');
vi.mock('@/utils/message');

const mockUseConnectionStore = vi.mocked(useConnectionStore);

// Mock Tauri functions
const mockSafeTauriInvoke = vi.fn();
vi.mock('@/utils/tauri', () => ({
  safeTauriInvoke: mockSafeTauriInvoke,
}));

// Mock message utils
const mockShowMessage = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};
vi.mock('@/utils/message', () => ({
  showMessage: mockShowMessage,
}));

// Mock data
const mockIoTDBConnection = {
  id: 'iotdb1',
  name: 'IoTDB Test',
  dbType: 'iotdb' as const,
  host: 'localhost',
  port: 6667,
  username: 'root',
  password: 'root',
};

const mockInfluxDBConnection = {
  id: 'influx1',
  name: 'InfluxDB Test',
  dbType: 'influxdb' as const,
  host: 'localhost',
  port: 8086,
  username: 'admin',
  password: 'password',
};

describe('IoTDBTestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockSafeTauriInvoke.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该在没有连接时显示提示信息', () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [],
      activeConnectionId: null,
      connectedConnectionIds: [],
      isConnectionConnected: vi.fn(() => false),
      getConnectionStatus: vi.fn(() => 'disconnected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    render(<IoTDBTestPage />);
    
    expect(screen.getByText(/请先创建并连接到数据库/)).toBeInTheDocument();
  });

  it('应该在非 IoTDB 连接时显示警告', () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockInfluxDBConnection],
      activeConnectionId: 'influx1',
      connectedConnectionIds: ['influx1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    render(<IoTDBTestPage />);
    
    expect(screen.getByText(/当前连接不是 IoTDB 类型/)).toBeInTheDocument();
    expect(screen.getByText(/INFLUXDB/)).toBeInTheDocument();
  });

  it('应该正确渲染 IoTDB 测试页面', async () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    mockSafeTauriInvoke
      .mockResolvedValueOnce(['root.sg1', 'root.sg2']) // get_iotdb_storage_groups
      .mockResolvedValueOnce({ version: '1.0.0' }); // get_iotdb_server_info

    render(<IoTDBTestPage />);
    
    expect(screen.getByText('IoTDB 驱动测试')).toBeInTheDocument();
    expect(screen.getByText('IoTDB Test')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockSafeTauriInvoke).toHaveBeenCalledWith('get_iotdb_storage_groups', {
        connectionId: 'iotdb1',
      });
    });
  });

  it('应该显示标签页', () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    render(<IoTDBTestPage />);
    
    expect(screen.getByText('数据浏览')).toBeInTheDocument();
    expect(screen.getByText('查询测试')).toBeInTheDocument();
    expect(screen.getByText('管理操作')).toBeInTheDocument();
    expect(screen.getByText('服务器信息')).toBeInTheDocument();
  });

  it('应该加载存储组列表', async () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    const mockStorageGroups = ['root.sg1', 'root.sg2', 'root.vehicle'];
    mockSafeTauriInvoke
      .mockResolvedValueOnce(mockStorageGroups)
      .mockResolvedValueOnce({ version: '1.0.0' });

    render(<IoTDBTestPage />);
    
    await waitFor(() => {
      expect(screen.getByText('root.sg1')).toBeInTheDocument();
      expect(screen.getByText('root.sg2')).toBeInTheDocument();
      expect(screen.getByText('root.vehicle')).toBeInTheDocument();
    });

    expect(mockShowMessage.success).toHaveBeenCalledWith('加载了 3 个存储组');
  });

  it('应该支持查询测试', async () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    mockSafeTauriInvoke
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValueOnce({}) // server info
      .mockResolvedValueOnce({ // query result
        executionTime: 50,
        rowCount: 10,
        data: [['root.sg1'], ['root.sg2']],
      });

    render(<IoTDBTestPage />);
    
    // 切换到查询测试标签页
    fireEvent.click(screen.getByText('查询测试'));
    
    // 输入查询
    const queryInput = screen.getByPlaceholderText('输入 IoTDB SQL 查询...');
    fireEvent.change(queryInput, { target: { value: 'SHOW STORAGE GROUP' } });
    
    // 执行查询
    const executeButton = screen.getByRole('button', { name: /执行/i });
    fireEvent.click(executeButton);
    
    await waitFor(() => {
      expect(mockSafeTauriInvoke).toHaveBeenCalledWith('execute_iotdb_query', {
        connectionId: 'iotdb1',
        query: 'SHOW STORAGE GROUP',
        storageGroup: null,
      });
    });
  });

  it('应该支持常用查询按钮', () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    render(<IoTDBTestPage />);
    
    // 切换到查询测试标签页
    fireEvent.click(screen.getByText('查询测试'));
    
    // 检查常用查询按钮
    expect(screen.getByText('显示存储组')).toBeInTheDocument();
    expect(screen.getByText('显示设备')).toBeInTheDocument();
    expect(screen.getByText('显示时间序列')).toBeInTheDocument();
    expect(screen.getByText('显示版本')).toBeInTheDocument();
  });

  it('应该支持存储组管理', async () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    const mockStorageGroups = ['root.test'];
    mockSafeTauriInvoke
      .mockResolvedValueOnce(mockStorageGroups)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(undefined) // create storage group
      .mockResolvedValueOnce([...mockStorageGroups, 'root.new']); // refresh after create

    render(<IoTDBTestPage />);
    
    // 切换到管理操作标签页
    fireEvent.click(screen.getByText('管理操作'));
    
    // 检查管理按钮
    expect(screen.getByText('创建存储组')).toBeInTheDocument();
    expect(screen.getByText('刷新列表')).toBeInTheDocument();
  });

  it('应该处理加载错误', async () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    mockSafeTauriInvoke.mockRejectedValue(new Error('Connection failed'));

    render(<IoTDBTestPage />);
    
    await waitFor(() => {
      expect(mockShowMessage.error).toHaveBeenCalledWith(
        expect.stringContaining('加载存储组失败')
      );
    });
  });

  it('应该显示服务器信息', async () => {
    mockUseConnectionStore.mockReturnValue({
      connections: [mockIoTDBConnection],
      activeConnectionId: 'iotdb1',
      connectedConnectionIds: ['iotdb1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    const mockServerInfo = {
      version: '1.0.0',
      storage_group_count: 5,
      timeseries_count: 100,
    };

    mockSafeTauriInvoke
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockServerInfo);

    render(<IoTDBTestPage />);
    
    // 切换到服务器信息标签页
    fireEvent.click(screen.getByText('服务器信息'));
    
    await waitFor(() => {
      expect(screen.getByText(/version/)).toBeInTheDocument();
    });
  });
});
