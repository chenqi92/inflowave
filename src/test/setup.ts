/**
 * Test setup file for Vitest
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import i18n from 'i18next';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Unit tests use bundled translations without starting native logging or HTTP loaders.
const localeDirectory = resolve('public/locales/zh-CN');
const namespaces = Object.fromEntries(readdirSync(localeDirectory)
  .filter(file => file.endsWith('.json'))
  .map(file => [file.replace('.json', ''), JSON.parse(readFileSync(join(localeDirectory, file), 'utf8'))]));
await i18n.init({
  lng: 'zh-CN',
  fallbackLng: 'zh-CN',
  defaultNS: 'common',
  resources: { 'zh-CN': namespaces },
});

vi.mock('@/utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

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

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
