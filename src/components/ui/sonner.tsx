'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toaster 组件 - JetBrains New UI 风格
 * 4px 圆角, 13px 字体, 紧凑内边距
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps['theme']}
      className='toaster group'
      closeButton={true}
      visibleToasts={1}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:text-sm group-[.toaster]:border-border group-[.toaster]:rounded group-[.toaster]:shadow-md relative',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-xs',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:h-7 group-[.toast]:px-3 group-[.toast]:text-sm group-[.toast]:rounded',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:h-7 group-[.toast]:px-3 group-[.toast]:text-sm group-[.toast]:rounded',
          closeButton:
            'group-[.toast]:absolute group-[.toast]:top-2 group-[.toast]:right-2 group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border group-[.toast]:border-border group-[.toast]:rounded-sm group-[.toast]:p-0.5 group-[.toast]:hover:bg-muted group-[.toast]:transition-colors group-[.toast]:duration-100',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
