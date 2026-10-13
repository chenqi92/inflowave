import React from 'react';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import i18n from 'i18next';
import {useI18nStore} from '@/i18n/store';
import {DOCUMENT_ORDER} from '@/utils/documentLoader';
import UserGuideModal from '../UserGuideModal';

const english = JSON.parse(readFileSync(resolve('public/locales/en-US/userGuide.json'), 'utf8'));

function documentResponse(url: string) {
  const directory = url.startsWith('/user-docs/en-US/') ? 'docs/user-guide/en-US' : 'user-docs';
  const filename = url.split('/').pop()!;
  return {ok: true, text: async () => readFileSync(resolve(directory, filename), 'utf8')};
}

beforeEach(async () => {
  i18n.addResourceBundle('en-US', 'userGuide', english);
  await i18n.changeLanguage('en-US');
  useI18nStore.setState({
    currentLanguage: 'en-US',
    isLoading: false,
    loadedResources: {'en-US': {}, 'zh-CN': {}},
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {value: vi.fn(), configurable: true});
  vi.stubGlobal('fetch', vi.fn(async (url: string) => documentResponse(url)));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('localized first-launch guide', () => {
  it('shows English controls and all ten English chapters, then opens the workspace', async () => {
    const onClose = vi.fn();
    render(<UserGuideModal isOpen onClose={onClose} />);

    await screen.findByRole('heading', {name: 'Welcome to InfloWave', level: 1});
    expect(screen.getByLabelText("Don't show this guide again")).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    for (const [index, document] of DOCUMENT_ORDER.entries()) {
      const title = english.documents[document.filename.replace(/\.md$/, '')];
      fireEvent.click(screen.getByRole('button', {name: title, exact: true}));
      const heading = readFileSync(resolve('docs/user-guide/en-US', document.filename), 'utf8')
        .split('\n')[0].replace(/^# /, '');
      expect(screen.getByRole('heading', {name: heading, level: 1})).toBeInTheDocument();
      expect(dialog.textContent).not.toMatch(/\p{Script=Han}/u);
      expect(dialog).toHaveTextContent(`${index + 1} / 10`);
    }
    expect(fetch).toHaveBeenCalledWith('/user-docs/en-US/README.md');
    fireEvent.click(screen.getByRole('button', {name: 'Get Started'}));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps Chinese when an older English document request finishes after a language change', async () => {
    let finishEnglish!: (response: ReturnType<typeof documentResponse>) => void;
    const delayedEnglish = new Promise<ReturnType<typeof documentResponse>>(resolve => {finishEnglish = resolve;});
    vi.mocked(fetch).mockImplementation(async (url) => (
      String(url) === '/user-docs/en-US/README.md'
        ? delayedEnglish
        : documentResponse(String(url))
    ) as unknown as Response);
    render(<UserGuideModal isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/user-docs/en-US/README.md'));

    await act(async () => {
      await i18n.changeLanguage('zh-CN');
      useI18nStore.setState({currentLanguage: 'zh-CN'});
    });
    await screen.findByRole('heading', {name: '📖 InfloWave 用户手册', level: 1});
    await act(async () => {finishEnglish(documentResponse('/user-docs/en-US/README.md'));});
    expect(screen.getByRole('button', {name: '开始使用'})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: '📖 InfloWave 用户手册', level: 1})).toBeInTheDocument();
  });

  it('keeps document-loading failures in the selected language', async () => {
    vi.mocked(fetch).mockResolvedValue({ok: false, statusText: 'Not Found'} as Response);
    render(<UserGuideModal isOpen onClose={vi.fn()} />);
    await screen.findByRole('heading', {name: 'Unable to load this guide', level: 1});
    expect(screen.getByRole('dialog').textContent).not.toMatch(/\p{Script=Han}/u);
  });
});
