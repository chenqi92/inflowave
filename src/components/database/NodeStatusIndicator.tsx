/**
 * 节点状态指示器组件
 * 用于显示节点的各种状态（系统、收藏、错误、警告、加载等）
 */

import React from 'react';
import {
  Settings,
  Star,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NODE_STATUS_INDICATORS, ICON_SIZES, ICON_SPACING } from '@/utils/treeNodeStyles';

/**
 * 状态类型
 */
export type StatusType =
  | 'system'
  | 'favorite'
  | 'error'
  | 'warning'
  | 'loading'
  | 'connected'
  | 'disconnected'
  | 'locked'
  | 'readonly';

/**
 * 图标尺寸类型
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 图标间距类型
 */
export type IconSpacing = 'tight' | 'normal' | 'relaxed' | 'loose';

/**
 * 组件属性
 */
export interface NodeStatusIndicatorProps {
  /** 状态类型 */
  status: StatusType;
  /** 自定义标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
  /** 图标尺寸 */
  size?: IconSize;
  /** 图标间距 */
  spacing?: IconSpacing;
  /** 是否显示为叠加层 */
  overlay?: boolean;
  /** 叠加层位置 */
  overlayPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * 图标组件映射
 */
const ICON_COMPONENTS = {
  Settings,
  Star,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
  Eye,
  Shield,
} as const;

/**
 * 叠加层位置类名映射
 */
const OVERLAY_POSITION_CLASSES = {
  'top-right': 'absolute -top-0.5 -right-0.5',
  'top-left': 'absolute -top-0.5 -left-0.5',
  'bottom-right': 'absolute -bottom-0.5 -right-0.5',
  'bottom-left': 'absolute -bottom-0.5 -left-0.5',
} as const;

/**
 * 节点状态指示器组件
 */
export const NodeStatusIndicator: React.FC<NodeStatusIndicatorProps> = ({
  status,
  title,
  className,
  size = 'sm',
  spacing = 'relaxed',
  overlay = false,
  overlayPosition = 'bottom-right',
}) => {
  const config = NODE_STATUS_INDICATORS[status];
  if (!config) return null;

  const IconComponent = ICON_COMPONENTS[config.icon as keyof typeof ICON_COMPONENTS];
  if (!IconComponent) return null;

  const iconSize = ICON_SIZES[size];
  const iconSpacing = ICON_SPACING[spacing];
  const iconTitle = title || config.title;

  // 叠加层样式
  if (overlay) {
    const overlayClass = OVERLAY_POSITION_CLASSES[overlayPosition];
    return (
      <div
        className={cn(
          overlayClass,
          'bg-background rounded-full p-0.5',
          className
        )}
        title={iconTitle}
      >
        <IconComponent
          className={cn(
            iconSize,
            config.color,
            'animation' in config ? config.animation : '',
            'flex-shrink-0'
          )}
        />
      </div>
    );
  }

  // 普通内联样式
  return (
    <div
      className={cn('flex items-center', iconSpacing, className)}
      title={iconTitle}
    >
      <IconComponent
        className={cn(
          iconSize,
          config.color,
          'animation' in config ? config.animation : '',
          'flex-shrink-0'
        )}
      />
    </div>
  );
};

/**
 * 系统节点指示器（快捷组件）
 */
export const SystemNodeIndicator: React.FC<{
  className?: string;
  overlay?: boolean;
}> = ({ className, overlay = false }) => (
  <NodeStatusIndicator
    status="system"
    className={className}
    overlay={overlay}
  />
);

/**
 * 收藏指示器（快捷组件）
 */
export const FavoriteIndicator: React.FC<{
  className?: string;
}> = ({ className }) => (
  <NodeStatusIndicator
    status="favorite"
    className={className}
  />
);

/**
 * 错误指示器（快捷组件）
 */
export const ErrorIndicator: React.FC<{
  message?: string;
  className?: string;
}> = ({ message, className }) => (
  <NodeStatusIndicator
    status="error"
    title={message}
    className={className}
  />
);

/**
 * 警告指示器（快捷组件）
 */
export const WarningIndicator: React.FC<{
  message?: string;
  className?: string;
}> = ({ message, className }) => (
  <NodeStatusIndicator
    status="warning"
    title={message}
    className={className}
  />
);

/**
 * 加载指示器（快捷组件）
 */
export const LoadingIndicator: React.FC<{
  className?: string;
}> = ({ className }) => (
  <NodeStatusIndicator
    status="loading"
    className={className}
  />
);

/**
 * 连接状态指示器（快捷组件）
 */
export const ConnectionStatusIndicator: React.FC<{
  connected: boolean;
  className?: string;
}> = ({ connected, className }) => (
  <NodeStatusIndicator
    status={connected ? 'connected' : 'disconnected'}
    className={className}
  />
);

/**
 * 锁定指示器（快捷组件）
 */
export const LockedIndicator: React.FC<{
  className?: string;
}> = ({ className }) => (
  <NodeStatusIndicator
    status="locked"
    size="xs"
    className={className}
  />
);

/**
 * 只读指示器（快捷组件）
 */
export const ReadonlyIndicator: React.FC<{
  className?: string;
}> = ({ className }) => (
  <NodeStatusIndicator
    status="readonly"
    size="xs"
    className={className}
  />
);

export default NodeStatusIndicator;

