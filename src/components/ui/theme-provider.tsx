import React, { createContext, useContext, useEffect, useState } from 'react'
import { applyThemeColors } from '@/lib/theme-colors'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  defaultColorScheme?: string
  colorSchemeStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorScheme: string
  setColorScheme: (colorScheme: string) => void
  resolvedTheme: 'light' | 'dark'
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  colorScheme: 'default',
  setColorScheme: () => null,
  resolvedTheme: 'light',
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'inflowave-ui-theme',
  defaultColorScheme = 'default',
  colorSchemeStorageKey = 'inflowave-ui-color-scheme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  const [colorScheme, setColorScheme] = useState<string>(
    () => localStorage.getItem(colorSchemeStorageKey) || defaultColorScheme
  )

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    let currentTheme: 'light' | 'dark' = 'light'

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      currentTheme = systemTheme

      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        if (theme === 'system') {
          const newSystemTheme = mediaQuery.matches ? 'dark' : 'light'
          root.classList.remove('light', 'dark')
          root.classList.add(newSystemTheme)
          setResolvedTheme(newSystemTheme)
          applyThemeColors(colorScheme, newSystemTheme === 'dark')
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      root.classList.add(theme)
      currentTheme = theme
    }

    setResolvedTheme(currentTheme)
    applyThemeColors(colorScheme, currentTheme === 'dark')
  }, [theme, colorScheme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    colorScheme,
    setColorScheme: (colorScheme: string) => {
      localStorage.setItem(colorSchemeStorageKey, colorScheme)
      setColorScheme(colorScheme)
    },
    resolvedTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}

// 兼容性hook，保持与现有代码的兼容性
export const useColorScheme = () => {
  const { colorScheme, setColorScheme } = useTheme()
  return { colorScheme, setColorScheme }
}