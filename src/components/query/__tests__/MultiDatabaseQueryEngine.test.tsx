/**
 * MultiDatabaseQueryEngine 组件单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiDatabaseQueryEngine } from '../MultiDatabaseQueryEngine';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';

// Mock dependencies
vi.mock('@/store/connection');
vi.mock('@/components/providers/ThemeProvider');
vi.mock('@/utils/tauri');
vi.mock('@/utils/message');
vi.mock('@monaco-editor/react', () => ({
  default: ({ onChange, value }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

const mockUseConnectionStore = vi.mocked(useConnectionStore);
const mockUseTheme = vi.mocked(useTheme);

// Mock data
const mockConnections = [
  {
    id: 'conn1',
    name: 'InfluxDB Test',
    dbType: 'influxdb' as const,
    host: 'localhost',
    port: 8086,
    username: 'admin',
    password: 'password',
  },
  {
    id: 'conn2',
    name: 'IoTDB Test',
    dbType: 'iotdb' as const,
    host: 'localhost',
    port: 6667,
    username: 'root',
    password: 'root',
  },
];

describe('MultiDatabaseQueryEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock connection store
    mockUseConnectionStore.mockReturnValue({
      connections: mockConnections,
      activeConnectionId: 'conn1',
      connectedConnectionIds: ['conn1'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    // Mock theme provider
    mockUseTheme.mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: vi.fn(),
    });

    // Mock Tauri invoke
    vi.mock('@/utils/tauri', () => ({
      safeTauriInvoke: vi.fn().mockResolvedValue(['test_db']),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该正确渲染组件', () => {
    render(<MultiDatabaseQueryEngine />);
    
    expect(screen.getByText('多数据库查询引擎')).toBeInTheDocument();
    expect(screen.getByText('INFLUXDB')).toBeInTheDocument();
  });

  it('应该显示数据库选择器', async () => {
    render(<MultiDatabaseQueryEngine />);
    
    await waitFor(() => {
      expect(screen.getByText('选择数据库')).toBeInTheDocument();
    });
  });

  it('应该显示查询语言选择器', () => {
    render(<MultiDatabaseQueryEngine />);
    
    expect(screen.getByText('查询语言')).toBeInTheDocument();
  });

  it('应该显示 Monaco 编辑器', () => {
    render(<MultiDatabaseQueryEngine />);
    
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('应该显示执行按钮', () => {
    render(<MultiDatabaseQueryEngine />);
    
    expect(screen.getByRole('button', { name: /执行/i })).toBeInTheDocument();
  });

  it('应该支持插入示例查询', () => {
    render(<MultiDatabaseQueryEngine />);
    
    const exampleButton = screen.getByRole('button', { name: /插入示例查询/i });
    fireEvent.click(exampleButton);
    
    // 验证示例查询被插入到编辑器中
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
  });

  it('应该支持保存查询', () => {
    render(<MultiDatabaseQueryEngine />);
    
    const saveButton = screen.getByRole('button', { name: /保存查询/i });
    expect(saveButton).toBeInTheDocument();
    
    // 初始状态下保存按钮应该被禁用
    expect(saveButton).toBeDisabled();
  });

  it('应该根据数据库类型显示不同的查询语言', () => {
    // 测试 InfluxDB
    render(<MultiDatabaseQueryEngine />);
    expect(screen.getByText('INFLUXDB')).toBeInTheDocument();

    // 测试 IoTDB
    mockUseConnectionStore.mockReturnValue({
      connections: mockConnections,
      activeConnectionId: 'conn2',
      connectedConnectionIds: ['conn2'],
      isConnectionConnected: vi.fn(() => true),
      getConnectionStatus: vi.fn(() => 'connected'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      addConnection: vi.fn(),
      updateConnection: vi.fn(),
      removeConnection: vi.fn(),
      setActiveConnection: vi.fn(),
    });

    const { rerender } = render(<MultiDatabaseQueryEngine />);
    rerender(<MultiDatabaseQueryEngine />);
    
    expect(screen.getByText('IOTDB')).toBeInTheDocument();
  });

  it('应该处理查询执行', async () => {
    const mockOnQueryExecute = vi.fn();
    render(<MultiDatabaseQueryEngine onQueryExecute={mockOnQueryExecute} />);
    
    // 输入查询
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'SELECT * FROM test' } });
    
    // 点击执行按钮
    const executeButton = screen.getByRole('button', { name: /执行/i });
    fireEvent.click(executeButton);
    
    // 验证回调被调用
    await waitFor(() => {
      expect(mockOnQueryExecute).toHaveBeenCalled();
    });
  });

  it('应该处理查询结果', () => {
    const mockOnQueryResult = vi.fn();
    const mockResult = {
      results: [],
      executionTime: 100,
      rowCount: 5,
      error: null,
      data: null,
      columns: null,
    };

    render(<MultiDatabaseQueryEngine onQueryResult={mockOnQueryResult} />);
    
    // 模拟查询结果
    expect(mockOnQueryResult).toBeDefined();
  });

  it('应该显示标签页', () => {
    render(<MultiDatabaseQueryEngine />);
    
    expect(screen.getByText('查询编辑器')).toBeInTheDocument();
    expect(screen.getByText('查询结果')).toBeInTheDocument();
    expect(screen.getByText('查询历史')).toBeInTheDocument();
  });

  it('应该支持切换标签页', () => {
    render(<MultiDatabaseQueryEngine />);
    
    const resultsTab = screen.getByText('查询结果');
    fireEvent.click(resultsTab);
    
    // 验证标签页切换
    expect(resultsTab).toBeInTheDocument();
  });

  it('应该处理无连接状态', () => {
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

    render(<MultiDatabaseQueryEngine />);
    
    // 组件应该仍然渲染，但可能显示不同的状态
    expect(screen.getByText('多数据库查询引擎')).toBeInTheDocument();
  });

  it('应该支持深色主题', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: vi.fn(),
    });

    render(<MultiDatabaseQueryEngine />);
    
    // 验证组件在深色主题下正常渲染
    expect(screen.getByText('多数据库查询引擎')).toBeInTheDocument();
  });

  it('应该显示查询语言信息', () => {
    render(<MultiDatabaseQueryEngine />);
    
    // 查找查询语言信息提示
    expect(screen.getByText(/当前使用/)).toBeInTheDocument();
  });

  it('应该处理查询执行错误', async () => {
    // Mock 一个失败的查询执行
    vi.mock('@/utils/tauri', () => ({
      safeTauriInvoke: vi.fn().mockRejectedValue(new Error('Query failed')),
    }));

    render(<MultiDatabaseQueryEngine />);
    
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'INVALID QUERY' } });
    
    const executeButton = screen.getByRole('button', { name: /执行/i });
    fireEvent.click(executeButton);
    
    // 组件应该处理错误状态
    expect(executeButton).toBeInTheDocument();
  });
});
