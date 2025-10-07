import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyThemeColors } from '@/lib/theme-colors';
import { useAppStore } from '@/store/app';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  defaultColorScheme?: string;
  colorSchemeStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colorScheme: string;
  setColorScheme: (colorScheme: string) => void;
  resolvedTheme: 'light' | 'dark';
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  colorScheme: 'default',
  setColorScheme: () => null,
  resolvedTheme: 'light',
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  defaultColorScheme = 'default',
  colorSchemeStorageKey = 'vite-ui-color-scheme',
  ...props
}: ThemeProviderProps) {
  const { config } = useAppStore();

  // 从 useAppStore 获取主题，如果没有则使用 localStorage 或默认值
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // 优先使用 useAppStore 中的主题
      if (config?.theme) {
        return config.theme as Theme;
      }
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [colorScheme, setColorScheme] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(colorSchemeStorageKey) || defaultColorScheme;
    }
    return defaultColorScheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // 同步 useAppStore 中的主题变化
  useEffect(() => {
    if (config?.theme && config.theme !== theme) {
      setTheme(config.theme as Theme);
    }
  }, [config?.theme, theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    // 移除之前的主题类
    root.classList.remove('light', 'dark');

    let currentTheme: 'light' | 'dark' = 'light';

    // 同步Tauri窗口主题的函数
    const syncTauriWindowTheme = async (themeValue: 'light' | 'dark') => {
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
          const window = getCurrentWebviewWindow();
          // Tauri 2.0 API: setTheme accepts 'light' | 'dark' | 'auto'
          await window.setTheme(themeValue);
          console.log(`✅ Tauri窗口主题已同步为: ${themeValue}`);
        } catch (error) {
          console.warn('同步Tauri窗口主题失败:', error);
        }
      }
    };

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      currentTheme = systemTheme;
      setResolvedTheme(systemTheme);
      applyThemeColors(colorScheme, systemTheme === 'dark');

      // 同步Tauri窗口主题
      syncTauriWindowTheme(systemTheme);

      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (theme === 'system') {
          const newSystemTheme = mediaQuery.matches ? 'dark' : 'light';
          root.classList.remove('light', 'dark');
          root.classList.add(newSystemTheme);
          setResolvedTheme(newSystemTheme);
          applyThemeColors(colorScheme, newSystemTheme === 'dark');

          // 同步Tauri窗口主题
          syncTauriWindowTheme(newSystemTheme);

          // 强制触发重新渲染，确保所有组件都能响应主题变化
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('theme-changed', {
              detail: { theme: newSystemTheme }
            }));
          }, 0);
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // 确保theme不是空字符串
      if (theme && theme.trim() && (theme === 'light' || theme === 'dark')) {
        root.classList.add(theme);
        currentTheme = theme as 'light' | 'dark';
        setResolvedTheme(theme as 'light' | 'dark');
      } else {
        // 如果theme为空或无效，使用默认的light主题
        root.classList.add('light');
        currentTheme = 'light';
        setResolvedTheme('light');
      }

      // 同步Tauri窗口主题
      syncTauriWindowTheme(currentTheme);
    }

    // 应用颜色主题
    applyThemeColors(colorScheme, currentTheme === 'dark');
  }, [theme, colorScheme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
      // 同步到 useAppStore
      const { setConfig } = useAppStore.getState();
      setConfig({ theme });
    },
    colorScheme,
    setColorScheme: (colorScheme: string) => {
      localStorage.setItem(colorSchemeStorageKey, colorScheme);
      setColorScheme(colorScheme);
    },
    resolvedTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};

// 兼容性hook，保持与现有代码的兼容性
export const useColorScheme = () => {
  const { colorScheme, setColorScheme } = useTheme();
  return { colorScheme, setColorScheme };
};
