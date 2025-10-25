/**
 * CodeMirror 6 Theme Integration
 * 
 * Integrates with the application's theme system to provide consistent theming
 * for the CodeMirror editor
 */

import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/**
 * Get CSS variable value from the document root
 */
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Convert HSL string to hex color
 */
function hslToHex(hsl: string): string {
  // Parse HSL values
  const match = hsl.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
  if (!match) return '#000000';
  
  const h = parseFloat(match[1]);
  const s = parseFloat(match[2]) / 100;
  const l = parseFloat(match[3]) / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }
  
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? `0${  hex}` : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get color from CSS variable (converts HSL to hex)
 */
function getColor(varName: string, fallback: string = '#000000'): string {
  const hsl = getCSSVar(varName);
  if (!hsl) return fallback;
  return hslToHex(hsl);
}

/**
 * Create a theme that integrates with the application's theme system
 */
export function createAppTheme(isDark: boolean): Extension {
  // Get colors from CSS variables
  const background = getColor('--background', isDark ? '#1e1e1e' : '#ffffff');
  const foreground = getColor('--foreground', isDark ? '#d4d4d4' : '#000000');
  const selection = getColor('--accent', isDark ? '#264f78' : '#add6ff');
  const cursor = getColor('--primary', isDark ? '#ffffff' : '#000000');
  const lineHighlight = getColor('--accent', isDark ? '#2a2d2e' : '#f0f0f0');
  const gutterBackground = getColor('--muted', isDark ? '#1e1e1e' : '#f5f5f5');
  const gutterForeground = getColor('--muted-foreground', isDark ? '#858585' : '#6e7781');
  
  const theme = EditorView.theme({
    '&': {
      color: foreground,
      backgroundColor: background,
      fontSize: '14px',
      fontFamily: 'var(--font-mono, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    },
    '.cm-content': {
      caretColor: cursor,
      padding: '8px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: cursor,
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: `${selection  }40`, // Add transparency
    },
    '.cm-activeLine': {
      backgroundColor: `${lineHighlight  }30`,
    },
    '.cm-selectionMatch': {
      backgroundColor: `${selection  }30`,
    },
    '.cm-gutters': {
      backgroundColor: gutterBackground,
      color: gutterForeground,
      border: 'none',
      borderRight: `1px solid ${getColor('--border', isDark ? '#2d2d2d' : '#e5e5e5')}`,
    },
    '.cm-activeLineGutter': {
      backgroundColor: `${lineHighlight  }30`,
    },
    '.cm-foldPlaceholder': {
      backgroundColor: getColor('--muted', isDark ? '#3e3e3e' : '#e0e0e0'),
      border: 'none',
      color: getColor('--muted-foreground'),
    },
    '.cm-tooltip': {
      border: `1px solid ${getColor('--border')}`,
      backgroundColor: getColor('--popover'),
      color: getColor('--popover-foreground'),
      borderRadius: '6px',
      padding: '4px 8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    },
    '.cm-tooltip-autocomplete': {
      '& > ul': {
        fontFamily: 'var(--font-mono)',
        maxHeight: '300px',
      },
      '& > ul > li[aria-selected]': {
        backgroundColor: getColor('--accent'),
        color: getColor('--accent-foreground'),
      },
    },
    '.cm-completionIcon': {
      fontSize: '14px',
      width: '16px',
      height: '16px',
      display: 'inline-block',
      textAlign: 'center',
      paddingRight: '6px',
      marginRight: '4px',
      opacity: '1',
      verticalAlign: 'middle',
      lineHeight: '16px',
      flexShrink: '0',
    },
    // Custom completion icons for different types
    // 使用 SVG 图标 + CSS filter 动态调整颜色
    //
    // 方案1（当前）: 使用 CSS filter 动态调整单色SVG的颜色
    // - 优点: 只需要一套图标文件，自动适配亮暗主题
    // - 适用: 单色SVG图标（stroke-based，无fill颜色）
    //
    // 方案2（备选）: 如果filter效果不理想，可以使用两套图标文件
    // - 创建 table-light.svg, table-dark.svg 等
    // - 使用条件: backgroundImage: isDark ? 'url(".../table-dark.svg")' : 'url(".../table-light.svg")'
    // - 移除 filter 属性
    '.cm-completionIcon-db-table': {
      backgroundImage: 'url("/src/assets/icons/completion/table.svg")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      content: '""',
      filter: isDark
        ? 'brightness(0) saturate(100%) invert(58%) sepia(85%) saturate(2498%) hue-rotate(180deg) brightness(95%) contrast(101%)' // 蓝色 #4A9EFF
        : 'brightness(0) saturate(100%) invert(35%) sepia(85%) saturate(2498%) hue-rotate(200deg) brightness(95%) contrast(101%)', // 深蓝 #2563EB
    },
    '.cm-completionIcon-db-field': {
      backgroundImage: 'url("/src/assets/icons/completion/field.svg")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      content: '""',
      filter: isDark
        ? 'brightness(0) saturate(100%) invert(78%) sepia(51%) saturate(2498%) hue-rotate(70deg) brightness(95%) contrast(101%)' // 绿色 #10B981
        : 'brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(95%) contrast(101%)', // 深绿 #059669
    },
    '.cm-completionIcon-db-tag': {
      backgroundImage: 'url("/src/assets/icons/completion/tag.svg")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      content: '""',
      filter: isDark
        ? 'brightness(0) saturate(100%) invert(68%) sepia(85%) saturate(2498%) hue-rotate(320deg) brightness(95%) contrast(101%)' // 紫色 #A855F7
        : 'brightness(0) saturate(100%) invert(38%) sepia(85%) saturate(2498%) hue-rotate(260deg) brightness(95%) contrast(101%)', // 深紫 #7C3AED
    },
    '.cm-completionIcon-keyword': {
      backgroundImage: 'url("/src/assets/icons/completion/keyword.svg")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      content: '""',
      filter: isDark
        ? 'brightness(0) saturate(100%) invert(58%) sepia(85%) saturate(2498%) hue-rotate(340deg) brightness(95%) contrast(101%)' // 橙色 #F97316
        : 'brightness(0) saturate(100%) invert(48%) sepia(85%) saturate(2498%) hue-rotate(10deg) brightness(95%) contrast(101%)', // 深橙 #EA580C
    },
    '.cm-completionIcon-function': {
      backgroundImage: 'url("/src/assets/icons/completion/function.svg")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      content: '""',
      filter: isDark
        ? 'brightness(0) saturate(100%) invert(78%) sepia(51%) saturate(2498%) hue-rotate(30deg) brightness(95%) contrast(101%)' // 黄色 #FBBF24
        : 'brightness(0) saturate(100%) invert(58%) sepia(85%) saturate(2498%) hue-rotate(10deg) brightness(95%) contrast(101%)', // 深黄 #D97706
    },
    '.cm-completionIcon-type': {
      backgroundImage: 'url("/src/assets/icons/completion/type.svg")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      content: '""',
      filter: isDark
        ? 'brightness(0) saturate(100%) invert(58%) sepia(85%) saturate(2498%) hue-rotate(160deg) brightness(95%) contrast(101%)' // 青色 #06B6D4
        : 'brightness(0) saturate(100%) invert(48%) sepia(85%) saturate(2498%) hue-rotate(170deg) brightness(95%) contrast(101%)', // 深青 #0891B2
    },
    '.cm-completionIcon-constant': {
      backgroundImage: 'url("/src/assets/icons/completion/constant.svg")',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      content: '""',
      filter: isDark
        ? 'brightness(0) saturate(100%) invert(58%) sepia(85%) saturate(2498%) hue-rotate(300deg) brightness(95%) contrast(101%)' // 粉色 #EC4899
        : 'brightness(0) saturate(100%) invert(38%) sepia(85%) saturate(2498%) hue-rotate(320deg) brightness(95%) contrast(101%)', // 深粉 #DB2777
    },
    '.cm-completionLabel': {
      fontFamily: 'var(--font-mono)',
    },
    '.cm-completionDetail': {
      marginLeft: '0.5em',
      fontStyle: 'italic',
      opacity: '0.7',
    },
    '.cm-completionMatchedText': {
      textDecoration: 'none',
      fontWeight: 'bold',
    },
    // 为不同类型的补全项label添加颜色（使用相邻兄弟选择器）
    '.cm-completionIcon-db-table + .cm-completionLabel': {
      color: isDark ? '#4A9EFF' : '#2563EB', // 蓝色
    },
    '.cm-completionIcon-db-field + .cm-completionLabel': {
      color: isDark ? '#10B981' : '#059669', // 绿色
    },
    '.cm-completionIcon-db-tag + .cm-completionLabel': {
      color: isDark ? '#A855F7' : '#7C3AED', // 紫色
    },
    '.cm-completionIcon-keyword + .cm-completionLabel': {
      color: isDark ? '#F97316' : '#EA580C', // 橙色
    },
    '.cm-completionIcon-function + .cm-completionLabel': {
      color: isDark ? '#FBBF24' : '#D97706', // 黄色
    },
    '.cm-completionIcon-type + .cm-completionLabel': {
      color: isDark ? '#06B6D4' : '#0891B2', // 青色
    },
    '.cm-completionIcon-constant + .cm-completionLabel': {
      color: isDark ? '#EC4899' : '#DB2777', // 粉色
    },
    // 选中状态时保持高对比度
    'li[aria-selected] .cm-completionLabel': {
      color: 'inherit !important',
    },
    '.cm-panels': {
      backgroundColor: getColor('--card'),
      color: getColor('--card-foreground'),
      borderTop: `1px solid ${getColor('--border')}`,
    },
    '.cm-search': {
      padding: '8px',
      '& input, & button, & label': {
        margin: '0.2em 0.4em',
        fontSize: '90%',
      },
    },
    '.cm-button': {
      backgroundColor: getColor('--primary'),
      color: getColor('--primary-foreground'),
      border: 'none',
      borderRadius: '4px',
      padding: '4px 12px',
      cursor: 'pointer',
      '&:hover': {
        opacity: '0.9',
      },
    },
    '.cm-textfield': {
      backgroundColor: getColor('--input'),
      border: `1px solid ${getColor('--border')}`,
      borderRadius: '4px',
      padding: '4px 8px',
      color: foreground,
    },
  }, { dark: isDark });

  return theme;
}

/**
 * Create syntax highlighting theme
 */
export function createSyntaxTheme(isDark: boolean): Extension {
  const colors = {
    keyword: isDark ? '#569cd6' : '#0000ff',
    type: isDark ? '#4ec9b0' : '#267f99',
    string: isDark ? '#ce9178' : '#a31515',
    number: isDark ? '#b5cea8' : '#098658',
    comment: isDark ? '#6a9955' : '#008000',
    operator: isDark ? '#d4d4d4' : '#000000',
    function: isDark ? '#dcdcaa' : '#795e26',
    variable: isDark ? '#9cdcfe' : '#001080',
    constant: isDark ? '#4fc1ff' : '#0070c1',
    property: isDark ? '#9cdcfe' : '#001080',
    tag: isDark ? '#569cd6' : '#800000',
    attribute: isDark ? '#9cdcfe' : '#ff0000',
    className: isDark ? '#4ec9b0' : '#267f99',
    namespace: isDark ? '#4ec9b0' : '#267f99',
  };

  const highlightStyle = HighlightStyle.define([
    { tag: t.keyword, color: colors.keyword, fontWeight: 'bold' },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: colors.variable },
    { tag: [t.function(t.variableName), t.labelName], color: colors.function },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: colors.constant },
    { tag: [t.definition(t.name), t.separator], color: colors.variable },
    { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: colors.className },
    { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: colors.operator },
    { tag: [t.meta, t.comment], color: colors.comment, fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: colors.constant, textDecoration: 'underline' },
    { tag: t.heading, fontWeight: 'bold', color: colors.keyword },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: colors.constant },
    { tag: [t.processingInstruction, t.string, t.inserted], color: colors.string },
    { tag: t.invalid, color: isDark ? '#f44747' : '#cd3131' },
    { tag: t.number, color: colors.number },
    { tag: t.tagName, color: colors.tag },
    { tag: t.attributeName, color: colors.attribute },
    { tag: t.propertyName, color: colors.property },
  ]);

  return syntaxHighlighting(highlightStyle);
}

/**
 * Create a complete theme extension combining base theme and syntax highlighting
 */
export function createEditorTheme(isDark: boolean): Extension[] {
  return [
    createAppTheme(isDark),
    createSyntaxTheme(isDark),
  ];
}

/**
 * Watch for theme changes and update the editor
 */
export function watchThemeChanges(callback: (isDark: boolean) => void): () => void {
  const root = document.documentElement;
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const isDark = root.classList.contains('dark');
        callback(isDark);
      }
    }
  });
  
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['class'],
  });
  
  return () => observer.disconnect();
}

