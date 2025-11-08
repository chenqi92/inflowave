import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useSettingsTranslation } from '@/hooks/useTranslation';

interface ThemeToggleProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useSettingsTranslation();

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return <Monitor className='h-3.5 w-3.5' />;
    }
    return resolvedTheme === 'dark' ? (
      <Moon className='h-3.5 w-3.5' />
    ) : (
      <Sun className='h-3.5 w-3.5' />
    );
  };

  const getThemeLabel = (themeValue: string) => {
    switch (themeValue) {
      case 'light':
        return t('theme_toggle.light_mode');
      case 'dark':
        return t('theme_toggle.dark_mode');
      case 'system':
      case 'auto':
        return t('theme_toggle.system_mode');
      default:
        return t('theme');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-0.5 ${className}`}
          title={t('theme_toggle.toggle_theme')}
        >
          {getCurrentIcon()}
          {showLabel && <span className='text-[10px] whitespace-nowrap'>{getThemeLabel(theme)}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className='mr-2 h-4 w-4' />
          <span>{t('theme_toggle.light_mode')}</span>
          {theme === 'light' && <span className='ml-auto'>✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className='mr-2 h-4 w-4' />
          <span>{t('theme_toggle.dark_mode')}</span>
          {theme === 'dark' && <span className='ml-auto'>✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className='mr-2 h-4 w-4' />
          <span>{t('theme_toggle.system_mode')}</span>
          {theme === 'system' && <span className='ml-auto'>✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 简单的主题切换按钮（仅在 light/dark 之间切换）
export function SimpleThemeToggle({
  variant = 'ghost',
  size = 'sm',
  className = '',
}: Omit<ThemeToggleProps, 'showLabel'>) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useSettingsTranslation();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={className}
      title={resolvedTheme === 'dark' ? t('theme_toggle.switch_to_light') : t('theme_toggle.switch_to_dark')}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className='h-4 w-4' />
      ) : (
        <Moon className='h-4 w-4' />
      )}
    </Button>
  );
}
