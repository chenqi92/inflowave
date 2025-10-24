/**
 * 骨架屏布局组件集合
 * 提供常见的骨架屏布局预设
 */

import React from 'react';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

/**
 * 表格骨架屏
 */
export interface TableSkeletonProps {
  /** 行数 */
  rows?: number;
  /** 列数 */
  columns?: number;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* 表头 */}
      {showHeader && (
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-8 flex-1" />
          ))}
        </div>
      )}

      {/* 表格行 */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-12 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 卡片骨架屏
 */
export interface CardSkeletonProps {
  /** 是否显示头像 */
  showAvatar?: boolean;
  /** 是否显示标题 */
  showTitle?: boolean;
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 描述行数 */
  descriptionLines?: number;
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  descriptionLines = 3,
  showActions = true,
  className,
}) => {
  return (
    <div className={cn('p-6 space-y-4 border rounded-lg', className)}>
      {/* 头部 */}
      <div className="flex items-center gap-4">
        {showAvatar && <Skeleton className="h-12 w-12 rounded-full" />}
        <div className="flex-1 space-y-2">
          {showTitle && <Skeleton className="h-5 w-1/3" />}
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* 描述 */}
      {showDescription && (
        <div className="space-y-2">
          {Array.from({ length: descriptionLines }).map((_, i) => (
            <Skeleton
              key={`desc-${i}`}
              className={cn(
                'h-4',
                i === descriptionLines - 1 ? 'w-2/3' : 'w-full'
              )}
            />
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      )}
    </div>
  );
};

/**
 * 列表骨架屏
 */
export interface ListSkeletonProps {
  /** 列表项数量 */
  items?: number;
  /** 是否显示头像 */
  showAvatar?: boolean;
  /** 是否显示副标题 */
  showSubtitle?: boolean;
  /** 是否显示操作图标 */
  showAction?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  showAvatar = true,
  showSubtitle = true,
  showAction = true,
  className,
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={`item-${i}`} className="flex items-center gap-4 p-3">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            {showSubtitle && <Skeleton className="h-3 w-1/2" />}
          </div>
          {showAction && <Skeleton className="h-8 w-8 rounded flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
};

/**
 * 树形结构骨架屏
 */
export interface TreeSkeletonProps {
  /** 节点数量 */
  nodes?: number;
  /** 缩进级别 */
  maxDepth?: number;
  /** 自定义类名 */
  className?: string;
}

export const TreeSkeleton: React.FC<TreeSkeletonProps> = ({
  nodes = 8,
  maxDepth = 3,
  className,
}) => {
  const getRandomDepth = () => Math.floor(Math.random() * maxDepth);

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: nodes }).map((_, i) => {
        const depth = getRandomDepth();
        return (
          <div
            key={`node-${i}`}
            className="flex items-center gap-2"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            <Skeleton className="h-4 w-4 flex-shrink-0" />
            <Skeleton className="h-6 flex-1 max-w-xs" />
          </div>
        );
      })}
    </div>
  );
};

/**
 * 表单骨架屏
 */
export interface FormSkeletonProps {
  /** 字段数量 */
  fields?: number;
  /** 是否显示标签 */
  showLabels?: boolean;
  /** 是否显示提交按钮 */
  showSubmit?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  showLabels = true,
  showSubmit = true,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-2">
          {showLabels && <Skeleton className="h-4 w-24" />}
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      {showSubmit && (
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
};

/**
 * 图表骨架屏
 */
export interface ChartSkeletonProps {
  /** 图表类型 */
  type?: 'line' | 'bar' | 'pie';
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  type = 'line',
  showLegend = true,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 图例 */}
      {showLegend && (
        <div className="flex gap-4 justify-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`legend-${i}`} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* 图表区域 */}
      <div className="relative h-64 border rounded-lg p-4">
        {type === 'pie' ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        ) : (
          <div className="flex items-end justify-between h-full gap-2">
            {Array.from({ length: 8 }).map((_, i) => {
              const height = Math.random() * 80 + 20;
              return (
                <Skeleton
                  key={`bar-${i}`}
                  className="flex-1"
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 详情页骨架屏
 */
export interface DetailSkeletonProps {
  /** 是否显示返回按钮 */
  showBackButton?: boolean;
  /** 是否显示标签页 */
  showTabs?: boolean;
  /** 标签页数量 */
  tabCount?: number;
  /** 自定义类名 */
  className?: string;
}

export const DetailSkeleton: React.FC<DetailSkeletonProps> = ({
  showBackButton = true,
  showTabs = true,
  tabCount = 3,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部 */}
      <div className="space-y-4">
        {showBackButton && <Skeleton className="h-8 w-20" />}
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>

      {/* 标签页 */}
      {showTabs && (
        <div className="space-y-4">
          <div className="flex gap-4 border-b">
            {Array.from({ length: tabCount }).map((_, i) => (
              <Skeleton key={`tab-${i}`} className="h-10 w-24" />
            ))}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 通用内容骨架屏
 */
export interface ContentSkeletonProps {
  /** 段落数量 */
  paragraphs?: number;
  /** 每段行数 */
  linesPerParagraph?: number;
  /** 自定义类名 */
  className?: string;
}

export const ContentSkeleton: React.FC<ContentSkeletonProps> = ({
  paragraphs = 3,
  linesPerParagraph = 4,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: paragraphs }).map((_, pIndex) => (
        <div key={`para-${pIndex}`} className="space-y-2">
          {Array.from({ length: linesPerParagraph }).map((_, lIndex) => (
            <Skeleton
              key={`line-${pIndex}-${lIndex}`}
              className={cn(
                'h-4',
                lIndex === linesPerParagraph - 1 ? 'w-3/4' : 'w-full'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

