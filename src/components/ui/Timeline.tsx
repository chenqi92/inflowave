import React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircleOutlined, ClockCircleOutlined } from './Icons';

export interface TimelineItemProps {
  color?: 'blue' | 'red' | 'green' | 'gray' | string;
  dot?: React.ReactNode;
  pending?: boolean;
  position?: 'left' | 'right';
  label?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export interface TimelineProps {
  pending?: React.ReactNode;
  pendingDot?: React.ReactNode;
  reverse?: boolean;
  mode?: 'left' | 'alternate' | 'right';
  children?: React.ReactNode;
  className?: string;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  color = 'blue',
  dot,
  pending = false,
  position,
  label,
  children,
  className,
}) => {
  const getColorClasses = (colorName: string) => {
    const colorMap = {
      blue: 'border-blue-500 bg-blue-500',
      red: 'border-red-500 bg-red-500',
      green: 'border-green-500 bg-green-500',
      gray: 'border-gray-300 bg-gray-300',
    };
    return colorMap[colorName as keyof typeof colorMap] || `border-[${colorName}] bg-[${colorName}]`;
  };

  const renderDot = () => {
    if (dot) {
      return <div className="flex items-center justify-center">{dot}</div>;
    }
    
    if (pending) {
      return <ClockCircleOutlined className="text-gray-400" />;
    }

    return (
      <div
        className={cn(
          'w-3 h-3 rounded-full border-2',
          getColorClasses(color)
        )}
      />
    );
  };

  return (
    <div className={cn('relative flex', className)}>
      {/* 时间轴线 */}
      <div className="relative flex flex-col items-center">
        <div className="flex items-center justify-center w-6 h-6">
          {renderDot()}
        </div>
        <div className="w-px bg-gray-200 flex-1 mt-1" />
      </div>
      
      {/* 内容区域 */}
      <div className="ml-4 pb-6 flex-1">
        {label && (
          <div className="text-sm text-gray-500 mb-1">
            {label}
          </div>
        )}
        <div className="text-gray-900">
          {children}
        </div>
      </div>
    </div>
  );
};

const Timeline: React.FC<TimelineProps> & { Item: typeof TimelineItem } = ({
  pending,
  pendingDot,
  reverse = false,
  mode = 'left',
  children,
  className,
}) => {
  const items = React.Children.toArray(children);
  const processedItems = reverse ? items.reverse() : items;

  return (
    <div className={cn('timeline', className)}>
      {processedItems.map((child, index) => {
        if (!React.isValidElement(child)) return null;

        const isLast = index === processedItems.length - 1;
        
        // 为最后一个项目移除时间轴线
        return React.cloneElement(child, {
          key: index,
          className: cn(
            child.props.className,
            isLast && '[&_.w-px]:hidden'
          ),
          position: mode === 'alternate' 
            ? (index % 2 === 0 ? 'left' : 'right')
            : mode === 'right' 
            ? 'right' 
            : 'left'
        });
      })}
      
      {/* 待定项目 */}
      {pending && (
        <TimelineItem
          pending
          dot={pendingDot}
          className="[&_.w-px]:hidden"
        >
          {pending}
        </TimelineItem>
      )}
    </div>
  );
};

Timeline.Item = TimelineItem;

export { Timeline, TimelineItem };
export type { TimelineItemProps };