import React from 'react';
import { cn } from '@/utils/cn';

// Row component
export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  gutter?: number | [number, number];
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between' | 'space-evenly';
  align?: 'top' | 'middle' | 'bottom' | 'stretch';
  wrap?: boolean;
}

const Row: React.FC<RowProps> = ({
  gutter = 0,
  justify = 'start',
  align = 'top',
  wrap = true,
  className,
  children,
  ...props
}) => {
  const [gutterH, gutterV] = Array.isArray(gutter) ? gutter : [gutter, gutter];

  const justifyMap = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
    'space-around': 'justify-around',
    'space-between': 'justify-between',
    'space-evenly': 'justify-evenly',
  };

  const alignMap = {
    top: 'items-start',
    middle: 'items-center',
    bottom: 'items-end',
    stretch: 'items-stretch',
  };

  const style: React.CSSProperties = {};
  if (gutterH > 0) {
    style.marginLeft = `-${gutterH / 2}px`;
    style.marginRight = `-${gutterH / 2}px`;
  }
  if (gutterV > 0) {
    style.marginTop = `-${gutterV / 2}px`;
    style.marginBottom = `-${gutterV / 2}px`;
  }

  return (
    <div
      className={cn(
        'flex',
        justifyMap[justify],
        alignMap[align],
        wrap && 'flex-wrap',
        className
      )}
      style={style}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === Col) {
          return React.cloneElement(child as any, {
            _gutterH: gutterH,
            _gutterV: gutterV,
          });
        }
        return child;
      })}
    </div>
  );
};

// Col component
export interface ColProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: number;
  offset?: number;
  order?: number;
  xs?: number | { span?: number; offset?: number; order?: number };
  sm?: number | { span?: number; offset?: number; order?: number };
  md?: number | { span?: number; offset?: number; order?: number };
  lg?: number | { span?: number; offset?: number; order?: number };
  xl?: number | { span?: number; offset?: number; order?: number };
  xxl?: number | { span?: number; offset?: number; order?: number };
  flex?: string | number;
  _gutterH?: number;
  _gutterV?: number;
}

const Col: React.FC<ColProps> = ({
  span,
  offset,
  order,
  xs,
  sm,
  md,
  lg,
  xl,
  xxl,
  flex,
  _gutterH = 0,
  _gutterV = 0,
  className,
  children,
  ...props
}) => {
  const getResponsiveClasses = (breakpoint: string, config?: number | { span?: number; offset?: number; order?: number }) => {
    if (!config) return [];
    
    const classes: string[] = [];
    const prefix = breakpoint === 'xs' ? '' : `${breakpoint}:`;
    
    if (typeof config === 'number') {
      // Grid span classes
      const spanClass = config === 24 ? 'w-full' : `w-${Math.round((config / 24) * 12)}/12`;
      classes.push(`${prefix}${spanClass}`);
    } else {
      if (config.span !== undefined) {
        const spanClass = config.span === 24 ? 'w-full' : `w-${Math.round((config.span / 24) * 12)}/12`;
        classes.push(`${prefix}${spanClass}`);
      }
      if (config.offset !== undefined) {
        const offsetClass = `ml-${Math.round((config.offset / 24) * 12)}/12`;
        classes.push(`${prefix}${offsetClass}`);
      }
      if (config.order !== undefined) {
        classes.push(`${prefix}order-${config.order}`);
      }
    }
    
    return classes;
  };

  const responsiveClasses = [
    ...getResponsiveClasses('xs', xs),
    ...getResponsiveClasses('sm', sm),
    ...getResponsiveClasses('md', md),
    ...getResponsiveClasses('lg', lg),
    ...getResponsiveClasses('xl', xl),
    ...getResponsiveClasses('2xl', xxl),
  ];

  // Default span classes
  const spanClasses = [];
  if (span !== undefined) {
    const spanClass = span === 24 ? 'w-full' : `w-${Math.round((span / 24) * 12)}/12`;
    spanClasses.push(spanClass);
  }

  // Offset classes
  const offsetClasses = [];
  if (offset !== undefined) {
    const offsetClass = `ml-${Math.round((offset / 24) * 12)}/12`;
    offsetClasses.push(offsetClass);
  }

  // Order classes
  const orderClasses = [];
  if (order !== undefined) {
    orderClasses.push(`order-${order}`);
  }

  // Flex classes
  const flexClasses = [];
  if (flex !== undefined) {
    if (typeof flex === 'number') {
      flexClasses.push(`flex-${flex}`);
    } else {
      flexClasses.push('flex-1');
    }
  }

  const style: React.CSSProperties = {};
  if (_gutterH > 0) {
    style.paddingLeft = `${_gutterH / 2}px`;
    style.paddingRight = `${_gutterH / 2}px`;
  }
  if (_gutterV > 0) {
    style.paddingTop = `${_gutterV / 2}px`;
    style.paddingBottom = `${_gutterV / 2}px`;
  }

  return (
    <div
      className={cn(
        ...spanClasses,
        ...offsetClasses,
        ...orderClasses,
        ...flexClasses,
        ...responsiveClasses,
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

export { Row, Col };
