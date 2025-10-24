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
      fontSize: '90%',
      width: '1em',
      display: 'inline-block',
      textAlign: 'center',
      paddingRight: '0.5em',
      opacity: '0.6',
    },
    '.cm-completionLabel': {
      fontFamily: 'var(--font-mono)',
    },
    '.cm-completionDetail': {
      marginLeft: '0.5em',
      fontStyle: 'italic',
      opacity: '0.7',
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

