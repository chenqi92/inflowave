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
  // 新增现代无衬线字体
  'be-vietnam-pro': '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'dm-sans': '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'fira-sans': '"Fira Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  lexend: '"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  manrope: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  montserrat: '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'noto-sans': '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  outfit: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'plus-jakarta-sans': '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'space-grotesk': '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  ubuntu: '"Ubuntu", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'work-sans': '"Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

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

// 动态样式元素 ID
const FONT_STYLE_ID = 'inflowave-font-style';

/**
 * 创建或更新动态字体样式
 * 使用 <style> 标签确保字体应用到所有元素
 */
function updateFontStyleSheet(actualFontFamily: string, actualFontSize: string) {
  let styleElement = document.getElementById(FONT_STYLE_ID) as HTMLStyleElement;

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = FONT_STYLE_ID;
    document.head.appendChild(styleElement);
  }

  // 使用高优先级选择器确保字体应用到所有 UI 元素
  // 排除代码编辑器和等宽字体区域
  styleElement.textContent = `
    :root {
      --font-family: ${actualFontFamily};
      --font-size: ${actualFontSize};
    }

    /* 全局应用字体 - 使用继承机制 */
    html, body, #root {
      font-family: ${actualFontFamily} !important;
      font-size: ${actualFontSize} !important;
    }

    /* 表单元素需要显式设置字体（它们默认不继承） */
    button, input, select, textarea,
    [role="button"], [role="menuitem"], [role="option"],
    label, span, p, div, h1, h2, h3, h4, h5, h6,
    a, li, td, th {
      font-family: inherit !important;
    }

    /* 保持等宽字体区域不受影响 */
    code, pre, .cm-editor, .font-mono,
    [class*="mono"], .CodeMirror,
    .ace_editor, .monaco-editor {
      font-family: var(--font-family-mono, "JetBrains Mono"), "Consolas", "Monaco", "Courier New", monospace !important;
    }
  `;
}

/**
 * 应用字体到 DOM
 */
function applyFont(fontFamily: string, fontSize: string) {
  const root = document.documentElement;
  const body = document.body;

  // 获取实际的 font-family 字符串
  const actualFontFamily = fontFamilyMap[fontFamily] || fontFamilyMap.system;
  const actualFontSize = fontSizeMap[fontSize] || fontSizeMap.medium;

  // 应用到 root 元素的 CSS 变量
  root.style.setProperty('--font-family', actualFontFamily);
  root.style.setProperty('--font-size', actualFontSize);

  // 直接应用到 body（作为基础样式）
  body.style.fontFamily = actualFontFamily;
  body.style.fontSize = actualFontSize;

  // 更新动态样式表，确保高优先级应用
  updateFontStyleSheet(actualFontFamily, actualFontSize);

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

