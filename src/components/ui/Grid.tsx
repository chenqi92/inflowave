import * as React from 'react';
import { cn } from '@/lib/utils';

interface RowProps {
  className?: string;
  children?: React.ReactNode;
  gutter?: number | [number, number];
  justify?:
    | 'start'
    | 'end'
    | 'center'
    | 'space-around'
    | 'space-between'
    | 'space-evenly';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

const Row = React.forwardRef<HTMLDivElement, RowProps>(
  (
    {
      className,
      children,
      gutter,
      justify = 'start',
      align = 'start',
      ...props
    },
    ref
  ) => {
    const gutterValue = Array.isArray(gutter)
      ? gutter
      : [gutter || 0, gutter || 0];
    const [horizontalGutter, verticalGutter] = gutterValue;

    const justifyClasses = {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      'space-around': 'justify-around',
      'space-between': 'justify-between',
      'space-evenly': 'justify-evenly',
    };

    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    };

    const style = {
      marginLeft: horizontalGutter ? -horizontalGutter / 2 : undefined,
      marginRight: horizontalGutter ? -horizontalGutter / 2 : undefined,
      rowGap: verticalGutter ? `${verticalGutter}px` : undefined,
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap',
          justifyClasses[justify],
          alignClasses[align],
          className
        )}
        style={style}
        {...props}
      >
        {React.Children.map(children, child => {
          if (React.isValidElement(child) && horizontalGutter) {
            return React.cloneElement(child, {
              ...child.props,
              style: {
                paddingLeft: horizontalGutter / 2,
                paddingRight: horizontalGutter / 2,
                ...child.props.style,
              },
            });
          }
          return child;
        })}
      </div>
    );
  }
);
Row.displayName = 'Row';

interface ColProps {
  className?: string;
  children?: React.ReactNode;
  span?: number;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  xxl?: number;
  offset?: number;
  order?: number;
  flex?: string | number;
}

const Col = React.forwardRef<HTMLDivElement, ColProps>(
  (
    {
      className,
      children,
      span = 24,
      xs,
      sm,
      md,
      lg,
      xl,
      xxl,
      offset,
      order,
      flex,
      ...props
    },
    ref
  ) => {
    const getColClasses = () => {
      const classes = [];

      // 基础span
      if (span && span < 24) {
        const percentage = (span / 24) * 100;
        classes.push(`w-[${percentage}%]`);
      } else if (span === 24) {
        classes.push('w-full');
      }

      // 响应式
      if (xs) classes.push(`xs:w-[${(xs / 24) * 100}%]`);
      if (sm) classes.push(`sm:w-[${(sm / 24) * 100}%]`);
      if (md) classes.push(`md:w-[${(md / 24) * 100}%]`);
      if (lg) classes.push(`lg:w-[${(lg / 24) * 100}%]`);
      if (xl) classes.push(`xl:w-[${(xl / 24) * 100}%]`);
      if (xxl) classes.push(`2xl:w-[${(xxl / 24) * 100}%]`);

      // offset
      if (offset) classes.push(`ml-[${(offset / 24) * 100}%]`);

      // order
      if (order !== undefined) classes.push(`order-${order}`);

      return classes;
    };

    const style = {
      flex: flex
        ? typeof flex === 'number'
          ? `${flex} ${flex} auto`
          : flex
        : undefined,
    };

    return (
      <div
        ref={ref}
        className={cn('flex-shrink-0', ...getColClasses(), className)}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Col.displayName = 'Col';

export { Row, Col };
export type { RowProps, ColProps };
