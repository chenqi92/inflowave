/**
 * 统一加载状态组件
 * 提供多种加载状态展示方式
 */

import React from 'react';
import { Spin } from './spin';
import { Progress } from './progress';
import { cn } from '@/lib/utils';
import { Loader2, Clock } from 'lucide-react';

/**
 * 加载状态组件属性
 */
export interface LoadingStateProps {
  /** 是否正在加载 */
  loading: boolean;
  /** 加载提示文本 */
  tip?: string;
  /** 加载类型 */
  type?: 'spin' | 'progress' | 'skeleton';
  /** 进度值（0-100），仅在 type='progress' 时有效 */
  progress?: number;
  /** 是否显示进度百分比 */
  showPercent?: boolean;
  /** 是否显示已用时间 */
  showElapsedTime?: boolean;
  /** 已用时间（毫秒） */
  elapsedTime?: number;
  /** 子组件 */
  children?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否全屏 */
  fullscreen?: boolean;
  /** 尺寸 */
  size?: 'small' | 'default' | 'large';
}

/**
 * 格式化时间
 */
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  } else if (minutes > 0) {
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * 加载状态组件
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  tip,
  type = 'spin',
  progress = 0,
  showPercent = true,
  showElapsedTime = false,
  elapsedTime = 0,
  children,
  className,
  fullscreen = false,
  size = 'default',
}) => {
  if (!loading && !children) {
    return null;
  }

  // 如果有子组件，使用覆盖模式
  if (children) {
    return (
      <div className={cn('relative', className)}>
        {children}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <LoadingContent
              type={type}
              tip={tip}
              progress={progress}
              showPercent={showPercent}
              showElapsedTime={showElapsedTime}
              elapsedTime={elapsedTime}
              size={size}
            />
          </div>
        )}
      </div>
    );
  }

  // 独立加载状态
  const containerClass = fullscreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'
    : 'flex items-center justify-center p-8';

  return (
    <div className={cn(containerClass, className)}>
      <LoadingContent
        type={type}
        tip={tip}
        progress={progress}
        showPercent={showPercent}
        showElapsedTime={showElapsedTime}
        elapsedTime={elapsedTime}
        size={size}
      />
    </div>
  );
};

/**
 * 加载内容组件
 */
const LoadingContent: React.FC<{
  type: 'spin' | 'progress' | 'skeleton';
  tip?: string;
  progress: number;
  showPercent: boolean;
  showElapsedTime: boolean;
  elapsedTime: number;
  size: 'small' | 'default' | 'large';
}> = ({ type, tip, progress, showPercent, showElapsedTime, elapsedTime, size }) => {
  return (
    <div className="flex flex-col items-center space-y-4 max-w-md">
      {/* 加载指示器 */}
      {type === 'spin' && <Spin size={size} />}

      {type === 'progress' && (
        <div className="w-full space-y-2">
          <Progress value={progress} className="w-full" />
          {showPercent && (
            <div className="text-center text-[13px] text-muted-foreground">
              {Math.round(progress)}%
            </div>
          )}
        </div>
      )}

      {/* 提示文本 */}
      {tip && (
        <div className="text-center">
          <p className="text-[13px] text-muted-foreground">{tip}</p>
        </div>
      )}

      {/* 已用时间 */}
      {showElapsedTime && elapsedTime > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatElapsedTime(elapsedTime)}</span>
        </div>
      )}
    </div>
  );
};

/**
 * 内联加载组件（用于按钮等）
 */
export interface InlineLoadingProps {
  /** 是否正在加载 */
  loading: boolean;
  /** 加载文本 */
  text?: string;
  /** 尺寸 */
  size?: 'small' | 'default';
  /** 自定义类名 */
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  loading,
  text = '加载中...',
  size = 'default',
  className,
}) => {
  if (!loading) return null;

  // JetBrains New UI: 紧凑图标和文字
  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const textSize = size === 'small' ? 'text-[11px]' : 'text-[13px]';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', iconSize)} />
      <span className={cn('text-muted-foreground', textSize)}>{text}</span>
    </div>
  );
};

/**
 * 页面加载组件
 */
export interface PageLoadingProps {
  /** 加载提示 */
  tip?: string;
  /** 是否显示 logo */
  showLogo?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  tip = '正在加载...',
  showLogo = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center bg-background',
        className
      )}
    >
      <div className="text-center space-y-6">
        {showLogo && (
          <div className="text-4xl font-bold text-primary">InfloWave</div>
        )}
        <Spin size="large" tip={tip} />
      </div>
    </div>
  );
};

/**
 * 卡片加载组件
 */
export interface CardLoadingProps {
  /** 加载提示 */
  tip?: string;
  /** 最小高度 */
  minHeight?: string;
  /** 自定义类名 */
  className?: string;
}

export const CardLoading: React.FC<CardLoadingProps> = ({
  tip = '加载中...',
  minHeight = '200px',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center border rounded-lg bg-card',
        className
      )}
      style={{ minHeight }}
    >
      <Spin tip={tip} />
    </div>
  );
};

/**
 * 空状态加载组件
 */
export interface EmptyLoadingProps {
  /** 是否正在加载 */
  loading: boolean;
  /** 加载提示 */
  loadingTip?: string;
  /** 空状态提示 */
  emptyTip?: string;
  /** 是否为空 */
  isEmpty: boolean;
  /** 子组件 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

export const EmptyLoading: React.FC<EmptyLoadingProps> = ({
  loading,
  loadingTip = '加载中...',
  emptyTip = '暂无数据',
  isEmpty,
  children,
  className,
}) => {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Spin tip={loadingTip} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="text-center text-muted-foreground">
          <p>{emptyTip}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default LoadingState;

