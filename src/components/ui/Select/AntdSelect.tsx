import React from 'react';
import { Select as AntdSelect } from 'antd';
import type { SelectProps as AntdSelectProps } from 'antd';
import { cn } from '@/utils/cn';

// 保持与原有 Option 组件的兼容性
const { Option } = AntdSelect;

// 扩展 Ant Design Select 的属性
export interface EnhancedSelectProps<T = any> extends Omit<AntdSelectProps<T>, 'size'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'large';
  variant?: 'default' | 'bordered' | 'filled' | 'borderless';
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const Select = <T extends any = any>({
  className,
  size = 'md',
  variant = 'default',
  loading = false,
  ...props
}: EnhancedSelectProps<T>) => {
  // 将自定义 size 映射到 Ant Design 的 size
  const getAntdSize = (size: string): AntdSelectProps['size'] => {
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
        return size as AntdSelectProps['size'];
      default:
        return 'middle';
    }
  };

  // 根据 variant 设置样式
  const getVariantProps = (variant: string) => {
    switch (variant) {
      case 'borderless':
        return { variant: 'borderless' as const };
      case 'filled':
        return { variant: 'filled' as const };
      default:
        return { variant: 'outlined' as const };
    }
  };

  const variantProps = getVariantProps(variant);

  return (
    <AntdSelect<T>
      className={className}
      size={getAntdSize(size)}
      loading={loading}
      {...variantProps}
      {...props}
    />
  );
};

// 导出 Option 组件以保持兼容性
Select.Option = Option;

export { Select, Option };