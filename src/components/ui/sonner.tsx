'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

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
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] relative',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          closeButton:
            'group-[.toast]:absolute group-[.toast]:top-2 group-[.toast]:right-2 group-[.toast]:bg-background group-[.toast]:text-foreground group-[.toast]:border group-[.toast]:border-border group-[.toast]:rounded group-[.toast]:p-1 group-[.toast]:hover:bg-muted group-[.toast]:transition-colors',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
