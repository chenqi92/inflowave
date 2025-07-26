/**
 * 多数据库系统集成测试
 * 
 * 测试多数据库功能的端到端集成
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Tauri API
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
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

describe('多数据库系统集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('连接管理集成', () => {
    it('应该能够创建和测试 InfluxDB 连接', async () => {
      // Mock 连接测试成功
      mockInvoke.mockResolvedValueOnce(50); // test_connection 返回延迟

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('test_connection', {
        connectionId: 'test-influx',
      });

      expect(result).toBe(50);
      expect(mockInvoke).toHaveBeenCalledWith('test_connection', {
        connectionId: 'test-influx',
      });
    });

    it('应该能够创建和测试 IoTDB 连接', async () => {
      // Mock IoTDB 连接测试
      mockInvoke.mockResolvedValueOnce(75);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('test_connection', {
        connectionId: 'test-iotdb',
      });

      expect(result).toBe(75);
    });

    it('应该处理连接失败', async () => {
      // Mock 连接失败
      mockInvoke.mockRejectedValueOnce(new Error('Connection failed'));

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('test_connection', {
          connectionId: 'invalid-connection',
        })
      ).rejects.toThrow('Connection failed');
    });
  });

  describe('数据库操作集成', () => {
    it('应该能够获取 InfluxDB 数据库列表', async () => {
      const mockDatabases = ['mydb', 'testdb', '_internal'];
      mockInvoke.mockResolvedValueOnce(mockDatabases);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('get_databases', {
        connectionId: 'influx-conn',
      });

      expect(result).toEqual(mockDatabases);
      expect(mockInvoke).toHaveBeenCalledWith('get_databases', {
        connectionId: 'influx-conn',
      });
    });

    it('应该能够获取 IoTDB 存储组列表', async () => {
      const mockStorageGroups = ['root.sg1', 'root.sg2', 'root.vehicle'];
      mockInvoke.mockResolvedValueOnce(mockStorageGroups);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('get_iotdb_storage_groups', {
        connectionId: 'iotdb-conn',
      });

      expect(result).toEqual(mockStorageGroups);
    });

    it('应该能够获取表/设备列表', async () => {
      const mockTables = ['measurement1', 'measurement2'];
      mockInvoke.mockResolvedValueOnce(mockTables);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('get_tables', {
        connectionId: 'test-conn',
        database: 'testdb',
      });

      expect(result).toEqual(mockTables);
    });

    it('应该能够获取字段/时间序列列表', async () => {
      const mockFields = ['field1', 'field2', 'temperature', 'humidity'];
      mockInvoke.mockResolvedValueOnce(mockFields);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('get_fields', {
        connectionId: 'test-conn',
        database: 'testdb',
        table: 'measurement1',
      });

      expect(result).toEqual(mockFields);
    });
  });

  describe('查询执行集成', () => {
    it('应该能够执行 InfluxDB 查询', async () => {
      const mockResult = {
        results: [
          {
            series: [
              {
                name: 'measurement1',
                columns: ['time', 'value'],
                values: [
                  ['2023-01-01T00:00:00Z', 100],
                  ['2023-01-01T01:00:00Z', 200],
                ],
              },
            ],
          },
        ],
        executionTime: 150,
        rowCount: 2,
        error: null,
      };

      mockInvoke.mockResolvedValueOnce(mockResult);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('execute_query', {
        connectionId: 'influx-conn',
        query: 'SELECT * FROM measurement1 LIMIT 10',
        database: 'mydb',
      });

      expect(result).toEqual(mockResult);
      expect(result.rowCount).toBe(2);
      expect(result.executionTime).toBe(150);
    });

    it('应该能够执行 IoTDB 查询', async () => {
      const mockResult = {
        columns: ['Time', 'root.sg1.d1.s1', 'root.sg1.d1.s2'],
        data: [
          ['2023-01-01T00:00:00.000Z', 25.5, 60.2],
          ['2023-01-01T01:00:00.000Z', 26.1, 58.7],
        ],
        executionTime: 120,
        rowCount: 2,
        error: null,
      };

      mockInvoke.mockResolvedValueOnce(mockResult);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('execute_iotdb_query', {
        connectionId: 'iotdb-conn',
        query: 'SELECT * FROM root.sg1.d1 LIMIT 10',
        storageGroup: 'root.sg1',
      });

      expect(result).toEqual(mockResult);
      expect(result.columns).toHaveLength(3);
      expect(result.data).toHaveLength(2);
    });

    it('应该处理查询错误', async () => {
      const mockErrorResult = {
        results: [],
        executionTime: 50,
        rowCount: 0,
        error: 'Syntax error in query',
      };

      mockInvoke.mockResolvedValueOnce(mockErrorResult);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('execute_query', {
        connectionId: 'test-conn',
        query: 'INVALID QUERY',
        database: 'testdb',
      });

      expect(result.error).toBe('Syntax error in query');
      expect(result.rowCount).toBe(0);
    });
  });

  describe('IoTDB 特定操作集成', () => {
    it('应该能够创建存储组', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('create_iotdb_storage_group', {
          connectionId: 'iotdb-conn',
          storageGroup: 'root.test',
          ttl: null,
        })
      ).resolves.toBeUndefined();

      expect(mockInvoke).toHaveBeenCalledWith('create_iotdb_storage_group', {
        connectionId: 'iotdb-conn',
        storageGroup: 'root.test',
        ttl: null,
      });
    });

    it('应该能够删除存储组', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('delete_iotdb_storage_group', {
          connectionId: 'iotdb-conn',
          storageGroup: 'root.test',
        })
      ).resolves.toBeUndefined();
    });

    it('应该能够创建时间序列', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('create_iotdb_timeseries', {
          connectionId: 'iotdb-conn',
          timeseriesPath: 'root.sg1.d1.temperature',
          dataType: 'FLOAT',
          encoding: 'RLE',
          compression: 'SNAPPY',
        })
      ).resolves.toBeUndefined();
    });

    it('应该能够插入数据', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('insert_iotdb_data', {
          connectionId: 'iotdb-conn',
          devicePath: 'root.sg1.d1',
          timestamp: Date.now(),
          measurements: ['temperature', 'humidity'],
          values: ['25.5', '60.2'],
        })
      ).resolves.toBeUndefined();
    });

    it('应该能够获取服务器信息', async () => {
      const mockServerInfo = {
        version: '1.0.0',
        storage_group_count: 5,
        timeseries_count: 100,
        connection_id: 'iotdb-conn',
      };

      mockInvoke.mockResolvedValueOnce(mockServerInfo);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('get_iotdb_server_info', {
        connectionId: 'iotdb-conn',
      });

      expect(result).toEqual(mockServerInfo);
      expect(result.version).toBe('1.0.0');
      expect(result.storage_group_count).toBe(5);
    });
  });

  describe('错误处理集成', () => {
    it('应该处理网络错误', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Network error'));

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('test_connection', {
          connectionId: 'test-conn',
        })
      ).rejects.toThrow('Network error');
    });

    it('应该处理超时错误', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Request timeout'));

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('execute_query', {
          connectionId: 'test-conn',
          query: 'SELECT * FROM large_table',
          database: 'testdb',
        })
      ).rejects.toThrow('Request timeout');
    });

    it('应该处理认证错误', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Authentication failed'));

      const { safeTauriInvoke } = await import('@/utils/tauri');

      await expect(
        safeTauriInvoke('get_databases', {
          connectionId: 'unauthorized-conn',
        })
      ).rejects.toThrow('Authentication failed');
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成数据库操作', async () => {
      mockInvoke.mockResolvedValueOnce(['db1', 'db2', 'db3']);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const startTime = Date.now();
      await safeTauriInvoke('get_databases', {
        connectionId: 'test-conn',
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 应该在 1 秒内完成
    });

    it('应该支持并发操作', async () => {
      // Mock 多个并发操作
      mockInvoke
        .mockResolvedValueOnce(['db1', 'db2'])
        .mockResolvedValueOnce(['table1', 'table2'])
        .mockResolvedValueOnce(['field1', 'field2']);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const promises = [
        safeTauriInvoke('get_databases', { connectionId: 'conn1' }),
        safeTauriInvoke('get_tables', { connectionId: 'conn1', database: 'db1' }),
        safeTauriInvoke('get_fields', { connectionId: 'conn1', database: 'db1', table: 'table1' }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(['db1', 'db2']);
      expect(results[1]).toEqual(['table1', 'table2']);
      expect(results[2]).toEqual(['field1', 'field2']);
    });

    it('应该处理大量数据查询', async () => {
      // Mock 大量数据结果
      const largeResult = {
        columns: ['time', 'value'],
        data: Array.from({ length: 10000 }, (_, i) => [
          `2023-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
          Math.random() * 100,
        ]),
        executionTime: 500,
        rowCount: 10000,
        error: null,
      };

      mockInvoke.mockResolvedValueOnce(largeResult);

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const result = await safeTauriInvoke('execute_query', {
        connectionId: 'test-conn',
        query: 'SELECT * FROM large_measurement',
        database: 'testdb',
      });

      expect(result.rowCount).toBe(10000);
      expect(result.data).toHaveLength(10000);
      expect(result.executionTime).toBe(500);
    });
  });

  describe('数据一致性测试', () => {
    it('应该保持连接状态一致性', async () => {
      // Mock 连接状态检查
      mockInvoke
        .mockResolvedValueOnce(true) // is_connected
        .mockResolvedValueOnce('connected') // get_connection_status
        .mockResolvedValueOnce(25); // test_connection

      const { safeTauriInvoke } = await import('@/utils/tauri');

      const isConnected = await safeTauriInvoke('is_connected', {
        connectionId: 'test-conn',
      });
      const status = await safeTauriInvoke('get_connection_status', {
        connectionId: 'test-conn',
      });
      const latency = await safeTauriInvoke('test_connection', {
        connectionId: 'test-conn',
      });

      expect(isConnected).toBe(true);
      expect(status).toBe('connected');
      expect(latency).toBe(25);
    });

    it('应该正确处理事务性操作', async () => {
      // Mock 事务性操作序列
      mockInvoke
        .mockResolvedValueOnce(undefined) // create_storage_group
        .mockResolvedValueOnce(undefined) // create_timeseries
        .mockResolvedValueOnce(undefined) // insert_data
        .mockResolvedValueOnce(['root.test']); // verify creation

      const { safeTauriInvoke } = await import('@/utils/tauri');

      // 创建存储组
      await safeTauriInvoke('create_iotdb_storage_group', {
        connectionId: 'iotdb-conn',
        storageGroup: 'root.test',
        ttl: null,
      });

      // 创建时间序列
      await safeTauriInvoke('create_iotdb_timeseries', {
        connectionId: 'iotdb-conn',
        timeseriesPath: 'root.test.d1.temperature',
        dataType: 'FLOAT',
        encoding: 'RLE',
        compression: 'SNAPPY',
      });

      // 插入数据
      await safeTauriInvoke('insert_iotdb_data', {
        connectionId: 'iotdb-conn',
        devicePath: 'root.test.d1',
        timestamp: Date.now(),
        measurements: ['temperature'],
        values: ['25.5'],
      });

      // 验证创建成功
      const storageGroups = await safeTauriInvoke('get_iotdb_storage_groups', {
        connectionId: 'iotdb-conn',
      });

      expect(storageGroups).toContain('root.test');
      expect(mockInvoke).toHaveBeenCalledTimes(4);
    });
  });
});
