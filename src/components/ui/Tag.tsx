import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

const tagVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-success/20 text-success hover:bg-success/30 dark:bg-success/20 dark:text-success',
        warning:
          'border-transparent bg-yellow-100/80 text-yellow-700 hover:bg-yellow-200/80 dark:bg-yellow-900/30 dark:text-yellow-300',
        processing:
          'border-transparent bg-primary/20 text-primary hover:bg-primary/30 dark:bg-primary/20 dark:text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TagProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tagVariants> {
  closable?: boolean;
  onClose?: () => void;
  color?: string;
}

const Tag = React.forwardRef<HTMLDivElement, TagProps>(
  (
    { className, variant, closable, onClose, color, children, style, ...props },
    ref
  ) => {
    const customStyle = color
      ? {
          backgroundColor: color,
          borderColor: color,
          color: 'hsl(var(--primary-foreground))',
          ...style,
        }
      : style;

    return (
      <div
        ref={ref}
        className={cn(tagVariants({ variant }), className)}
        style={customStyle}
        {...props}
      >
        {children}
        {closable && onClose && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='ml-1 rounded-full hover:bg-white/20 p-0.5 h-auto w-auto'
          >
            <X className='h-3 w-3' />
          </Button>
        )}
      </div>
    );
  }
);
Tag.displayName = 'Tag';

export { Tag, tagVariants };
