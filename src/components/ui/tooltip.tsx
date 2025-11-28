import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * TooltipContent - JetBrains New UI 风格
 * 4px 圆角, 12px 字体, 紧凑内边距
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // JetBrains New UI 风格: 4px 圆角, 12px 字体, 紧凑内边距
      'z-50 overflow-hidden rounded border bg-popover px-2 py-1 text-[12px] text-popover-foreground shadow-md',
      'animate-in fade-in-0 zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface TooltipWrapperProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'focus' | 'click';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TooltipWrapper = React.forwardRef<HTMLDivElement, TooltipWrapperProps>(
  (
    {
      children,
      title,
      placement = 'top',
      trigger = 'hover',
      open,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    if (!title) {
      return <>{children}</>;
    }

    const triggerProps = {
      ...(trigger === 'hover' && {}),
      ...(trigger === 'focus' && { delayDuration: 0 }),
      ...(trigger === 'click' && { delayDuration: 0 }),
    };

    // Don't wrap with TooltipProvider since it's already provided at the app level
    return (
      <Tooltip open={open} onOpenChange={onOpenChange} {...triggerProps}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={placement}>{title}</TooltipContent>
      </Tooltip>
    );
  }
);
TooltipWrapper.displayName = 'TooltipWrapper';

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipWrapper,
};
export type { TooltipWrapperProps };
