import React, { forwardRef } from 'react';
import { Button as AntdButton } from 'antd';
import type { ButtonProps as AntdButtonProps } from 'antd';
import { cn } from '@/utils/cn';

// 扩展 Ant Design Button 的属性以支持自定义变体
export interface EnhancedButtonProps extends Omit<AntdButtonProps, 'type' | 'variant'> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'large'; // 支持新旧尺寸
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  rounded?: boolean;
}

const Button = forwardRef<HTMLElement, EnhancedButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, icon, children, disabled, rounded = false, ...props }, ref) => {
    // 将自定义 variant 映射到 Ant Design 的 type
    const getAntdType = (variant: string): AntdButtonProps['type'] => {
      switch (variant) {
        case 'primary':
          return 'primary';
        case 'danger':
          return 'primary'; // 使用 danger 属性处理
        case 'ghost':
          return 'text';
        case 'link':
          return 'link';
        case 'outline':
          return 'default';
        default:
          return 'default';
      }
    };

    // 将自定义 size 映射到 Ant Design 的 size
    const getAntdSize = (size: string): AntdButtonProps['size'] => {
      switch (size) {
        case 'xs':
        case 'sm':
          return 'small';
        case 'lg':
        case 'xl':
          return 'large';
        case 'small':
        case 'middle':
        case 'large':
          return size as AntdButtonProps['size'];
        default:
          return 'middle';
      }
    };

    // 判断是否为 danger 变体
    const isDanger = variant === 'danger';
    
    // 处理 outline 变体的特殊样式
    const isOutline = variant === 'outline';
    
    // 构建 className
    const buttonClassName = cn(
      rounded && 'rounded-full',
      isOutline && 'border-2 border-primary text-primary hover:bg-primary hover:text-white',
      className
    );

    return (
      <AntdButton
        ref={ref}
        type={getAntdType(variant)}
        size={getAntdSize(size)}
        loading={loading}
        icon={icon}
        disabled={disabled}
        danger={isDanger}
        className={buttonClassName}
        {...props}
      >
        {children}
      </AntdButton>
    );
  }
);

Button.displayName = 'Button';

export { Button };