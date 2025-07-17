import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 全局测试设置
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Tauri API
(globalThis as any).__TAURI_INTERNALS__ = {
  invoke: vi.fn().mockImplementation((command: string, payload?: any) => {
    // 模拟不同的 Tauri 命令
    switch (command) {
      case 'load_optimization_history':
        return Promise.resolve([]); // 返回空历史记录
      case 'save_optimization_history':
        return Promise.resolve(true); // 成功保存
      case 'get_app_config':
        return Promise.resolve({
          theme: 'light',
          language: 'zh-CN',
          autoSave: true,
          autoConnect: false,
          queryTimeout: 30000,
          maxQueryResults: 10000,
          logLevel: 'info'
        });
      default:
        return Promise.resolve(null);
    }
  })
};

// Mock window.__TAURI__ for older versions
(globalThis as any).__TAURI__ = {
  invoke: (globalThis as any).__TAURI_INTERNALS__.invoke,
  tauri: {
    invoke: (globalThis as any).__TAURI_INTERNALS__.invoke
  }
};
