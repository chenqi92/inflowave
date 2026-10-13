import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageDetector } from '../language-detector';
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from '../config';

const detector = new LanguageDetector({
  enableSystemDetection: true,
  enableStorageDetection: true,
  fallbackLanguage: FALLBACK_LANGUAGE,
  supportedLanguages: [...SUPPORTED_LANGUAGES],
});

function systemLanguage(language: string, languages = [language]) {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
});

afterEach(() => vi.restoreAllMocks());

describe('initial language', () => {
  it.each(['en-US', 'en-GB', 'de-DE', 'fr-FR', 'C', 'C.UTF-8'])
    ('uses English in a non-Chinese environment (%s)', language => {
      systemLanguage(language);
      expect(detector.detectLanguage()).toBe('en-US');
    });

  it.each(['zh-CN', 'zh-TW', 'zh-Hans-CN', 'zh_CN.UTF-8'])
    ('keeps Chinese in a Chinese environment (%s)', language => {
      systemLanguage(language);
      expect(detector.detectLanguage()).toBe('zh-CN');
    });

  it.each([['en-US', 'zh-CN'], ['zh-CN', 'en-US']])
    ('preserves the saved %s choice on a %s system', (saved, system) => {
      localStorage.setItem('i18nextLng', saved);
      systemLanguage(system);
      expect(detector.detectLanguage()).toBe(saved);
    });

  it('ignores an unsupported stored language and checks the system', () => {
    localStorage.setItem('i18nextLng', 'invalid');
    systemLanguage('zh-CN');
    expect(detector.detectLanguage()).toBe('zh-CN');
  });

  it('tries the remaining preferred languages before falling back', () => {
    systemLanguage('de-DE', ['de-DE', 'zh-CN']);
    expect(detector.detectLanguage()).toBe('zh-CN');
  });

  it('falls back to English when no locale is available', () => {
    systemLanguage('', []);
    document.documentElement.lang = '';
    expect(detector.detectLanguage()).toBe('en-US');
  });
});
