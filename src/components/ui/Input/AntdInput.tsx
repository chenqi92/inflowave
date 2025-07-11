import React, { forwardRef } from 'react';
import { Input as AntdInput } from 'antd';
import type { InputProps as AntdInputProps } from 'antd';
import { cn } from '@/utils/cn';

// 扩展 Ant Design Input 的属性
export interface EnhancedInputProps extends Omit<AntdInputProps, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'large';
  variant?: 'default' | 'filled' | 'borderless';
  className?: string;
  error?: boolean;
  helperText?: string;
}

const Input = forwardRef<any, EnhancedInputProps>(({
  className,
  size = 'md',
  variant = 'default',
  error = false,
  helperText,
  ...props
}, ref) => {
  // 将自定义 size 映射到 Ant Design 的 size
  const getAntdSize = (size: string): AntdInputProps['size'] => {
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
        return size as AntdInputProps['size'];
      default:
        return 'middle';
    }
  };

  // 根据 variant 设置样式
  const getVariantProps = (variant: string) => {
    switch (variant) {
      case 'filled':
        return { variant: 'filled' as const };
      case 'borderless':
        return { variant: 'borderless' as const };
      default:
        return { variant: 'outlined' as const };
    }
  };

  const variantProps = getVariantProps(variant);

  // 构建 className
  const inputClassName = cn(
    error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
    className
  );

  const inputElement = (
    <AntdInput
      ref={ref}
      className={inputClassName}
      size={getAntdSize(size)}
      status={error ? 'error' : undefined}
      {...variantProps}
      {...props}
    />
  );

  // 如果有 helperText，包装在容器中
  if (helperText) {
    return (
      <div className="w-full">
        {inputElement}
        <div className={cn(
          'mt-1 text-xs',
          error ? 'text-red-500' : 'text-gray-500'
        )}>
          {helperText}
        </div>
      </div>
    );
  }

  return inputElement;
});

Input.displayName = 'Input';

// 导出其他 Input 相关组件
const { TextArea, Search, Password, Group } = AntdInput;

export { Input, TextArea, Search, Password, Group };