/**
 * 预览文件时的导航拦截工具
 * 防止 iframe 内的链接导致 webview 导航到外部 URL
 */

import { open as openInBrowser } from '@tauri-apps/plugin-shell';
import logger from '@/utils/logger';
import { showMessage } from '@/utils/message';

/**
 * 设置链接点击拦截
 * 拦截预览内容中的链接点击，在系统浏览器中打开
 */
export const setupLinkClickInterceptor = (
  previewElement: HTMLElement | null,
  t: (key: string) => string
): (() => void) | undefined => {
  if (!previewElement) return undefined;

  const handleLinkClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');

    if (link && link.href) {
      if (link.href.startsWith('http://') || link.href.startsWith('https://')) {
        e.preventDefault();
        e.stopPropagation();
        logger.info('Opening link in system browser:', link.href);
        openInBrowser(link.href).catch(error => {
          logger.error('Failed to open link in browser:', error);
          showMessage.error(`Failed to open link: ${error}`);
        });
      }
    }
  };

  previewElement.addEventListener('click', handleLinkClick, true);

  // 返回清理函数
  return () => {
    previewElement.removeEventListener('click', handleLinkClick, true);
  };
};

/**
 * 拦截窗口级别的导航尝试
 */
export const setupWindowNavigationGuard = (): () => void => {
  // 阻止窗口导航
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
    logger.warn('Prevented navigation attempt during preview');
  };

  // 监听所有导航尝试
  const originalWindowOpen = window.open;
  window.open = function (...args) {
    const url = args[0];
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      logger.info('Intercepted window.open, opening in system browser:', url);
      openInBrowser(url).catch(error => {
        logger.error('Failed to open URL in browser:', error);
      });
      return null;
    }
    return originalWindowOpen.apply(this, args);
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // 返回清理函数
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.open = originalWindowOpen;
  };
};

/**
 * 监控 iframe 导航并在检测到外部链接时阻止
 */
export const setupIframeNavigationMonitor = (
  iframes: Array<{ ref: React.RefObject<HTMLIFrameElement>; name: string }>,
  originalSrc: string,
  t: (key: string) => string
): (() => void) | undefined => {
  if (!originalSrc.startsWith('blob:')) return undefined;

  const handlers: Array<{
    iframe: HTMLIFrameElement;
    handler: (event: Event) => void;
  }> = [];

  const createLoadHandler = (iframe: HTMLIFrameElement, name: string) => {
    return (event: Event) => {
      try {
        const currentSrc = iframe.src;

        // 如果 src 从 blob: 变成了 http/https，说明发生了导航
        if (
          originalSrc.startsWith('blob:') &&
          (currentSrc.startsWith('http://') || currentSrc.startsWith('https://'))
        ) {
          logger.warn(`Detected ${name} iframe navigation to:`, currentSrc);
          logger.info('Preventing navigation, opening in system browser instead');

          // 在系统浏览器中打开
          openInBrowser(currentSrc).catch(error => {
            logger.error('Failed to open URL in browser:', error);
            showMessage.error(t('s3:error.operation_failed'));
          });

          // 立即重置 iframe src 以停止加载
          iframe.src = originalSrc;
          logger.info(`Reset ${name} iframe to original src`);
        }
      } catch (error) {
        // 跨域错误是预期的
        logger.debug('Cross-origin access blocked (expected):', error);
      }
    };
  };

  // 为每个 iframe 添加监听器
  iframes.forEach(({ ref, name }) => {
    if (ref.current) {
      const iframe = ref.current;
      const handler = createLoadHandler(iframe, name);
      iframe.addEventListener('load', handler);
      handlers.push({ iframe, handler });
    }
  });

  // 返回清理函数
  return () => {
    handlers.forEach(({ iframe, handler }) => {
      iframe.removeEventListener('load', handler);
    });
  };
};

/**
 * 完整的预览对话框导航保护设置
 */
export interface NavigationGuardCleanup {
  cleanupLinkInterceptor?: () => void;
  cleanupWindowGuard?: () => void;
  cleanupIframeMonitor?: () => void;
}

export const setupPreviewNavigationGuard = (
  previewContentRef: React.RefObject<HTMLDivElement>,
  iframes: Array<{ ref: React.RefObject<HTMLIFrameElement>; name: string }>,
  previewContent: string | null,
  t: (key: string) => string
): NavigationGuardCleanup => {
  const cleanup: NavigationGuardCleanup = {};

  // 设置链接点击拦截
  cleanup.cleanupLinkInterceptor = setupLinkClickInterceptor(
    previewContentRef.current,
    t
  );

  // 设置窗口导航保护
  cleanup.cleanupWindowGuard = setupWindowNavigationGuard();

  // 设置 iframe 导航监控（仅当有 blob URL 时）
  if (previewContent && previewContent.startsWith('blob:')) {
    cleanup.cleanupIframeMonitor = setupIframeNavigationMonitor(
      iframes,
      previewContent,
      t
    );
  }

  return cleanup;
};

/**
 * 清理所有导航保护
 */
export const cleanupNavigationGuard = (cleanup: NavigationGuardCleanup): void => {
  cleanup.cleanupLinkInterceptor?.();
  cleanup.cleanupWindowGuard?.();
  cleanup.cleanupIframeMonitor?.();
};
