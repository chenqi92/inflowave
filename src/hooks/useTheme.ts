import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // 从 localStorage 获取保存的主题，默认为 system
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system'
    }
    return 'system'
  })

  useEffect(() => {
    const root = window.document.documentElement

    // 移除之前的主题类
    root.classList.remove('light', 'dark')

    let systemTheme: 'light' | 'dark' = 'light'

    if (theme === 'system') {
      // 检测系统主题
      systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'

      // 监听系统主题变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        if (theme === 'system') {
          const newSystemTheme = mediaQuery.matches ? 'dark' : 'light'
          root.classList.remove('light', 'dark')
          root.classList.add(newSystemTheme)
        }
      }

      mediaQuery.addEventListener('change', handleChange)
      root.classList.add(systemTheme)

      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      // 应用选定的主题
      root.classList.add(theme)
    }
  }, [theme])

  const setThemeAndSave = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme)
    setTheme(newTheme)
  }

  // 获取当前实际应用的主题（解析 system）
  const resolvedTheme = theme === 'system' 
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme

  return {
    theme,
    setTheme: setThemeAndSave,
    resolvedTheme,
  }
}