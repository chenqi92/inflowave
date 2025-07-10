import React from 'react';
import { cn } from '@/utils/cn';

export interface ProgressProps {
  percent?: number;
  showInfo?: boolean;
  status?: 'normal' | 'active' | 'success' | 'exception';
  strokeColor?: string;
  strokeLinecap?: 'round' | 'butt' | 'square';
  strokeWidth?: number;
  trailColor?: string;
  type?: 'line' | 'circle' | 'dashboard';
  size?: 'default' | 'small';
  format?: (percent?: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  steps?: number;
  success?: {
    percent?: number;
    strokeColor?: string;
  };
  gapDegree?: number;
  gapPosition?: 'top' | 'bottom' | 'left' | 'right';
  width?: number;
}

const Progress: React.FC<ProgressProps> = ({
  percent = 0,
  showInfo = true,
  status = 'normal',
  strokeColor,
  strokeLinecap = 'round',
  strokeWidth,
  trailColor,
  type = 'line',
  size = 'default',
  format,
  className,
  style,
  steps,
  success,
  gapDegree = 75,
  gapPosition = 'bottom',
  width = 132,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'exception':
        return 'bg-red-500';
      case 'active':
        return 'bg-blue-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStrokeWidth = () => {
    if (strokeWidth) return strokeWidth;
    if (type === 'line') return size === 'small' ? 6 : 8;
    return 6;
  };

  const getInfoContent = () => {
    if (format) {
      return format(percent);
    }
    if (status === 'exception') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    if (status === 'success') {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return `${percent}%`;
  };

  const renderLineProgress = () => {
    const height = getStrokeWidth();
    
    if (steps) {
      const stepWidth = 100 / steps;
      const completedSteps = Math.floor(percent / stepWidth);
      
      return (
        <div className={cn('flex items-center gap-1', className)} style={style}>
          <div className="flex-1 flex gap-1">
            {Array.from({ length: steps }, (_, index) => (
              <div
                key={index}
                className={cn(
                  'flex-1 rounded-sm',
                  index < completedSteps ? getStatusColor() : 'bg-gray-200'
                )}
                style={{
                  height: `${height}px`,
                  backgroundColor: index < completedSteps ? strokeColor : trailColor,
                }}
              />
            ))}
          </div>
          {showInfo && (
            <div className="ml-2 text-sm text-gray-600">
              {getInfoContent()}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={cn('flex items-center', className)} style={style}>
        <div className="flex-1 bg-gray-200 rounded-full overflow-hidden" style={{ height: `${height}px` }}>
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out',
              getStatusColor(),
              status === 'active' && 'animate-pulse'
            )}
            style={{
              width: `${Math.min(percent, 100)}%`,
              backgroundColor: strokeColor,
              borderRadius: strokeLinecap === 'round' ? '9999px' : undefined,
            }}
          />
        </div>
        {showInfo && (
          <div className="ml-2 text-sm text-gray-600">
            {getInfoContent()}
          </div>
        )}
      </div>
    );
  };

  const renderCircleProgress = () => {
    const radius = (width - getStrokeWidth()) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    
    const gapOffset = {
      top: 0,
      right: 90,
      bottom: 180,
      left: 270,
    };

    return (
      <div 
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width, height: width, ...style }}
      >
        <svg
          className="transform -rotate-90"
          width={width}
          height={width}
          viewBox={`0 0 ${width} ${width}`}
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={trailColor || '#f0f0f0'}
            strokeWidth={getStrokeWidth()}
          />
          
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={strokeColor || '#1890ff'}
            strokeWidth={getStrokeWidth()}
            strokeLinecap={strokeLinecap}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
            style={{
              transformOrigin: 'center',
              transform: type === 'dashboard' ? `rotate(${gapOffset[gapPosition] + gapDegree / 2}deg)` : undefined,
            }}
          />
        </svg>
        
        {showInfo && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700">
            {getInfoContent()}
          </div>
        )}
      </div>
    );
  };

  if (type === 'circle' || type === 'dashboard') {
    return renderCircleProgress();
  }

  return renderLineProgress();
};

export { Progress };