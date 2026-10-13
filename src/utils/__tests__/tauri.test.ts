/**
 * Tauri 工具函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { safeTauriInvoke, isTauriEnvironment } from '../tauri';

// Mock Tauri API
const mockInvoke = vi.fn();

describe('Tauri工具函数单元测试', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockIPC((command, args) => mockInvoke(command, args));
  });

  afterEach(() => {
    clearMocks();
    delete (window as any).__TAURI_INTERNALS__;
    delete window.__TAURI__;
  });

  describe('safeTauriInvoke', () => {
    it('应该成功调用Tauri命令', async () => {
      const mockResult = { data: 'test' };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await safeTauriInvoke('test_command', { param: 'value' });

      expect(mockInvoke).toHaveBeenCalledWith('test_command', { param: 'value' });
      expect(result).toEqual(mockResult);
    });

    it('应该处理Tauri调用错误', async () => {
      const mockError = new Error('Tauri command failed');
      mockInvoke.mockRejectedValue(mockError);

      await expect(safeTauriInvoke('failing_command')).rejects.toThrow('Tauri command failed');
    });

    it('应该处理无参数的调用', async () => {
      const mockResult = 'success';
      mockInvoke.mockResolvedValue(mockResult);

      const result = await safeTauriInvoke('no_param_command');

      expect(mockInvoke).toHaveBeenCalledWith('no_param_command', {});
      expect(result).toEqual(mockResult);
    });

    it('应该处理复杂参数对象', async () => {
      const complexParams = {
        connectionId: 'test-id',
        query: 'SELECT * FROM test',
        options: {
          limit: 100,
          timeout: 5000,
        },
      };
      
      mockInvoke.mockResolvedValue({ success: true });

      await safeTauriInvoke('complex_command', complexParams);

      expect(mockInvoke).toHaveBeenCalledWith('complex_command', complexParams);
    });

    it('应该处理空字符串结果', async () => {
      mockInvoke.mockResolvedValue('');

      const result = await safeTauriInvoke('empty_result_command');

      expect(result).toBe('');
    });

    it('应该拒绝有返回值命令的null结果', async () => {
      mockInvoke.mockResolvedValue(null);
      await expect(safeTauriInvoke('null_result_command')).rejects.toThrow('returned null or undefined');
    });

    it.each([null, undefined])('应该接受void命令的%s结果', async result => {
      mockInvoke.mockResolvedValue(result);
      await expect(safeTauriInvoke('update_connection')).resolves.toBeUndefined();
    });

    it('应该处理数组结果', async () => {
      const mockArray = ['item1', 'item2', 'item3'];
      mockInvoke.mockResolvedValue(mockArray);

      const result = await safeTauriInvoke('array_result_command');

      expect(result).toEqual(mockArray);
    });

    it('应该处理超时错误', async () => {
      const timeoutError = new Error('Command timeout');
      mockInvoke.mockRejectedValue(timeoutError);

      await expect(safeTauriInvoke('timeout_command')).rejects.toThrow('Command timeout');
    });

    it('应该处理网络错误', async () => {
      const networkError = new Error('Network error');
      mockInvoke.mockRejectedValue(networkError);

      await expect(safeTauriInvoke('network_command')).rejects.toThrow('Network error');
    });

    it('应该处理权限错误', async () => {
      const permissionError = new Error('Permission denied');
      mockInvoke.mockRejectedValue(permissionError);

      await expect(safeTauriInvoke('permission_command')).rejects.toThrow('Permission denied');
    });
  });

  describe('isTauriEnvironment', () => {
    beforeEach(() => {
      clearMocks();
      delete (window as any).__TAURI_INTERNALS__;
    });

    it('应该在Tauri环境中返回true', () => {
      // Mock window.__TAURI__
      Object.defineProperty(window, '__TAURI__', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isTauriEnvironment()).toBe(true);
    });

    it('应该在非Tauri环境中返回false', () => {
      // Remove window.__TAURI__
      Object.defineProperty(window, '__TAURI__', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isTauriEnvironment()).toBe(false);
    });

    it('应该在浏览器环境中返回false', () => {
      // Mock browser environment
      delete (window as any).__TAURI__;

      expect(isTauriEnvironment()).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该正确处理字符串错误', async () => {
      mockInvoke.mockRejectedValue('String error');

      await expect(safeTauriInvoke('string_error_command')).rejects.toThrow('String error');
    });

    it('应该正确处理对象错误', async () => {
      const objectError = { message: 'Object error', code: 500 };
      mockInvoke.mockRejectedValue(objectError);

      await expect(safeTauriInvoke('object_error_command')).rejects.toEqual(objectError);
    });

    it('应该正确处理未定义错误', async () => {
      mockInvoke.mockRejectedValue(undefined);

      await expect(safeTauriInvoke('undefined_error_command')).rejects.toBeUndefined();
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成调用', async () => {
      mockInvoke.mockResolvedValue('fast result');

      const startTime = Date.now();
      await safeTauriInvoke('fast_command');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 应该在 100ms 内完成
    });

    it('应该支持并发调用', async () => {
      mockInvoke.mockResolvedValue('concurrent result');

      const promises = Array.from({ length: 10 }, (_, i) =>
        safeTauriInvoke('concurrent_command', { index: i })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockInvoke).toHaveBeenCalledTimes(10);
    });
  });

  describe('边界情况', () => {
    it('应该处理非常大的参数对象', async () => {
      const largeParams = {
        data: new Array(1000).fill('large data'),
        nested: {
          deep: {
            object: new Array(100).fill({ key: 'value' }),
          },
        },
      };

      mockInvoke.mockResolvedValue('handled large params');

      const result = await safeTauriInvoke('large_params_command', largeParams);

      expect(result).toBe('handled large params');
      expect(mockInvoke).toHaveBeenCalledWith('large_params_command', largeParams);
    });

    it('应该处理特殊字符', async () => {
      const specialParams = {
        query: 'SELECT * FROM "table with spaces" WHERE field = \'value with "quotes"\'',
        unicode: '测试中文字符 🚀 emoji',
        special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      };

      mockInvoke.mockResolvedValue('handled special chars');

      const result = await safeTauriInvoke('special_chars_command', specialParams);

      expect(result).toBe('handled special chars');
    });

    it('应该处理循环引用', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      mockInvoke.mockResolvedValue('handled circular');

      // 这应该不会导致无限循环或错误
      await expect(safeTauriInvoke('circular_command', circularObj)).resolves.toBe('handled circular');
    });
  });
});
