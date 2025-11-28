import * as React from 'react';
import { cn } from '@/lib/utils';
import { FileX, Database, Search } from 'lucide-react';

interface EmptyProps {
  className?: string;
  image?: React.ReactNode;
  imageStyle?: React.CSSProperties;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Empty 组件 - JetBrains New UI 风格
 * 紧凑布局, 13px 字体, 较小图标
 */
const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, image, imageStyle, description, children, ...props }, ref) => {
    const defaultImage = (
      <FileX
        className='h-10 w-10 text-muted-foreground/40'
        style={imageStyle}
      />
    );

    return (
      <div
        ref={ref}
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center space-y-2 p-4 text-center',
          className
        )}
        {...props}
      >
        <div className='flex flex-col items-center space-y-1.5'>
          {image || defaultImage}
          {description && (
            <p className='text-[13px] text-muted-foreground max-w-sm'>
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    );
  }
);
Empty.displayName = 'Empty';

const EmptyDatabase = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyProps, 'image'>
>((props, ref) => (
  <Empty
    ref={ref}
    image={<Database className='h-10 w-10 text-muted-foreground/40' />}
    description='暂无数据库连接'
    {...props}
  />
));
EmptyDatabase.displayName = 'EmptyDatabase';

const EmptySearch = React.forwardRef<HTMLDivElement, Omit<EmptyProps, 'image'>>(
  (props, ref) => (
    <Empty
      ref={ref}
      image={<Search className='h-10 w-10 text-muted-foreground/40' />}
      description='未找到搜索结果'
      {...props}
    />
  )
);
EmptySearch.displayName = 'EmptySearch';

export { Empty, EmptyDatabase, EmptySearch };
export type { EmptyProps };
