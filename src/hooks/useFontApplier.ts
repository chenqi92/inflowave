/**
 * 字体应用 Hook
 * 实时应用用户选择的字体到整个应用
 */

import { useEffect } from 'react';
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
import logger from '@/utils/logger';

// 字体映射表 - 将字体值映射到实际的 CSS font-family
const fontFamilyMap: Record<string, string> = {
  // 系统字体
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
  
  // 现代无衬线字体
  inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  roboto: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'open-sans': '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  lato: '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'source-sans-pro': '"Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  nunito: '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  poppins: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  montserrat: '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'fira-sans': '"Fira Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'noto-sans': '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  ubuntu: '"Ubuntu", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'work-sans': '"Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'dm-sans': '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'plus-jakarta-sans': '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  manrope: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'space-grotesk': '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  
  // 等宽字体
  'jetbrains-mono': '"JetBrains Mono", "Consolas", "Monaco", "Courier New", monospace',
  'fira-code': '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
  'source-code-pro': '"Source Code Pro", "Consolas", "Monaco", "Courier New", monospace',
  inconsolata: '"Inconsolata", "Consolas", "Monaco", "Courier New", monospace',
  'roboto-mono': '"Roboto Mono", "Consolas", "Monaco", "Courier New", monospace',
  'ubuntu-mono': '"Ubuntu Mono", "Consolas", "Monaco", "Courier New", monospace',
  'ibm-plex-mono': '"IBM Plex Mono", "Consolas", "Monaco", "Courier New", monospace',
  'cascadia-code': '"Cascadia Code", "Consolas", "Monaco", "Courier New", monospace',
};

// 字体大小映射
const fontSizeMap: Record<string, string> = {
  small: '13px',
  medium: '14px',
  large: '15px',
  extraLarge: '16px',
};

/**
 * 应用字体到 DOM
 */
function applyFont(fontFamily: string, fontSize: string) {
  const root = document.documentElement;
  const body = document.body;
  
  // 获取实际的 font-family 字符串
  const actualFontFamily = fontFamilyMap[fontFamily] || fontFamilyMap.system;
  
  // 应用到 root 元素
  root.style.setProperty('--font-family', actualFontFamily);
  root.style.setProperty('--font-size', fontSizeMap[fontSize] || fontSizeMap.medium);
  
  // 直接应用到 body
  body.style.fontFamily = actualFontFamily;
  body.style.fontSize = fontSizeMap[fontSize] || fontSizeMap.medium;
  
  // 触发字体加载检测
  if (document.fonts && fontFamily !== 'system') {
    const fontName = actualFontFamily.split(',')[0].replace(/['"]/g, '').trim();
    document.fonts.load(`400 14px ${fontName}`).catch(() => {
      logger.warn(`字体 ${fontName} 加载失败，使用降级字体`);
    });
  }
}

/**
 * 字体应用 Hook
 * 监听用户偏好设置中的字体变化，实时应用到整个应用
 */
export function useFontApplier() {
  const fontFamily = useUserPreferencesStore(state => state.preferences.accessibility.font_family);
  const fontSize = useUserPreferencesStore(state => state.preferences.accessibility.font_size);
  
  useEffect(() => {
    // 应用字体
    applyFont(fontFamily, fontSize);
    
    logger.info('🎨 字体已应用:', {
      fontFamily,
      fontSize,
      actualFontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.system,
      actualFontSize: fontSizeMap[fontSize] || fontSizeMap.medium,
    });
  }, [fontFamily, fontSize]);
}

/**
 * 获取字体的实际 CSS font-family 值
 */
export function getFontFamily(fontValue: string): string {
  return fontFamilyMap[fontValue] || fontFamilyMap.system;
}

/**
 * 获取字体大小的实际 CSS 值
 */
export function getFontSize(sizeValue: string): string {
  return fontSizeMap[sizeValue] || fontSizeMap.medium;
}

