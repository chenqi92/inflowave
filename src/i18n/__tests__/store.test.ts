import { describe, expect, it, vi } from 'vitest';
import i18n from 'i18next';
import { safeTauriInvoke } from '@/utils/tauri';
import { translationLoader } from '../config';
import { initI18nStore, useI18nStore } from '../store';

vi.mock('@/utils/tauri', () => ({
  safeTauriInvoke: vi.fn().mockResolvedValue(undefined),
}));

describe('language store initialization', () => {
  it.each([['en-US', 'zh-CN'], ['zh-CN', 'en-US']])
    ('uses the initialized %s language instead of the earlier %s detection', async (language, detected) => {
      i18n.addResourceBundle('en-US', 'common', { ready: 'Ready' });
      await i18n.changeLanguage(language);
      useI18nStore.setState({ currentLanguage: detected, loadedResources: {} });
      const load = vi.spyOn(translationLoader, 'loadLanguage').mockResolvedValue({});

      try {
        await initI18nStore();
        expect(useI18nStore.getState().currentLanguage).toBe(language);
        expect(document.documentElement.lang).toBe(language);
        expect(load).toHaveBeenNthCalledWith(1, language);
      } finally {
        load.mockRestore();
      }
    });

  it('persists a language choice with the Tauri 2 runtime', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
    useI18nStore.setState({ currentLanguage: 'zh-CN' });

    try {
      await useI18nStore.getState().setLanguage('en-US');
      expect(safeTauriInvoke).toHaveBeenCalledWith('save_language_preference', { language: 'en-US' });
      expect(localStorage.getItem('i18nextLng')).toBe('en-US');
      await vi.advanceTimersByTimeAsync(100);
    } finally {
      Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
      vi.useRealTimers();
    }
  });
});
