import { useState, useEffect, useRef } from 'react';
import logger from '@/utils/logger';

interface FontStatus {
  loaded: boolean;
  error: boolean;
}

// 深度比较数组是否相等
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((val, index) => val === b[index]);
};

export const useFontLoader = (fontFamilies: string[]): FontStatus => {
  const [status, setStatus] = useState<FontStatus>({ loaded: false, error: false });
  const prevFontFamiliesRef = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // 如果字体列表没有变化，跳过执行
    if (arraysEqual(fontFamilies, prevFontFamiliesRef.current)) {
      return;
    }

    // 更新引用
    prevFontFamiliesRef.current = [...fontFamilies];

    // 清除之前的超时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!document.fonts) {
      // 浏览器不支持字体API，假设字体已加载
      setStatus({ loaded: true, error: false });
      return;
    }

    const checkFonts = async () => {
      try {
        // 等待所有字体加载完成，但设置超时
        const fontReadyPromise = document.fonts.ready;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutRef.current = setTimeout(() => reject(new Error('字体加载超时')), 5000);
        });

        try {
          await Promise.race([fontReadyPromise, timeoutPromise]);
        } catch (timeoutError) {
          logger.warn('字体加载超时，继续检查已加载的字体');
        }

        // 清除超时
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // 检查指定的字体是否已加载 - 使用多种检查方式
        const fontChecks = fontFamilies.map(fontFamily => {
          // 尝试多种字体名称格式
          const variations = [
            fontFamily,
            `"${fontFamily}"`,
            fontFamily.replace(/\s+/g, ''),
            fontFamily.toLowerCase()
          ];

          return variations.some(variation => {
            try {
              return document.fonts.check(`16px ${variation}`) ||
                     document.fonts.check(`16px "${variation}"`) ||
                     document.fonts.check(`14px ${variation}`);
            } catch (e) {
              return false;
            }
          });
        });

        // 如果没有字体需要检查，或者大部分字体已加载，认为加载完成
        const allLoaded = fontFamilies.length === 0 || fontChecks.filter(Boolean).length >= Math.ceil(fontFamilies.length * 0.5);

        setStatus({ loaded: allLoaded, error: false });

        // 打印调试信息
        logger.info('字体加载检查结果:', {
          totalFonts: document.fonts.size,
          checkedFonts: fontFamilies,
          results: fontFamilies.map((font, index) => ({
            font,
            loaded: fontChecks[index]
          })),
          allLoaded,
          loadedCount: fontChecks.filter(Boolean).length,
          threshold: Math.ceil(fontFamilies.length * 0.5)
        });
      } catch (error) {
        logger.error('字体加载检查失败:', error);
        // 如果检查失败，假设字体已加载（避免无限等待）
        setStatus({ loaded: true, error: false });
      }
    };

    // 立即检查一次
    checkFonts();

    // 如果字体还没加载完，等待字体加载事件
    if (document.fonts.status === 'loading') {
      const handleLoadingDone = () => {
        setTimeout(checkFonts, 100); // 延迟一点再检查
      };

      document.fonts.addEventListener('loadingdone', handleLoadingDone);
      return () => {
        document.fonts.removeEventListener('loadingdone', handleLoadingDone);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }

    // 设置一个备用超时，确保不会无限等待
    timeoutRef.current = setTimeout(() => {
      logger.info('字体加载备用超时，假设已加载完成');
      setStatus({ loaded: true, error: false });
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fontFamilies]);

  return status;
};