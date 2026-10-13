import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import initI18n from '../config';
import { safeTauriInvoke } from '@/utils/tauri';
import { I18nProvider } from '../I18nProvider';

vi.mock('../config', async importOriginal => ({
  ...await importOriginal<typeof import('../config')>(),
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../store', () => ({
  initI18nStore: vi.fn().mockResolvedValue(undefined),
  useI18nStore: () => ({
    currentLanguage: 'en-US',
    availableLanguages: [],
    getTextDirection: () => 'ltr',
  }),
}));

vi.mock('@/utils/tauri', () => ({
  safeTauriInvoke: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
});

describe('native language initialization', () => {
  it.each([['zh-CN', 'en-US'], ['en-US', 'zh-CN']])
    ('preserves saved %s when the backend defaults to %s', async (saved, backend) => {
      localStorage.setItem('i18nextLng', saved);
      vi.mocked(safeTauriInvoke).mockResolvedValue({ general: { language: backend } });
      render(<I18nProvider><div /></I18nProvider>);
      await waitFor(() => expect(initI18n).toHaveBeenCalledWith(saved));
    });

  it('uses the native system choice on the first launch', async () => {
    vi.mocked(safeTauriInvoke).mockResolvedValue({ general: { language: 'en-US' } });
    render(<I18nProvider><div /></I18nProvider>);
    await waitFor(() => expect(initI18n).toHaveBeenCalledWith('en-US'));
  });
});
