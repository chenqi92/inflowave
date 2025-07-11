import React, { forwardRef } from 'react';
import { Input as AntdEnhancedInput, TextArea, Search, Password, Group } from './Input/AntdInput';
import type { EnhancedInputProps } from './Input/AntdInput';

// 保持与原有接口的兼容性
export interface InputProps extends EnhancedInputProps {
  variant?: 'default' | 'error' | 'filled' | 'borderless';
  size?: 'sm' | 'md' | 'lg' | 'small' | 'middle' | 'large';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = forwardRef<any, InputProps>(({
  variant = 'default',
  prefix,
  suffix,
  ...props
}, ref) => {
  // 处理 variant 映射
  const getVariant = (variant: string) => {
    switch (variant) {
      case 'error':
        return 'default'; // 通过 error prop 处理
      default:
        return variant;
    }
  };

  // 处理 error 状态
  const error = variant === 'error';
  
  return (
    <AntdEnhancedInput
      ref={ref}
      variant={getVariant(variant)}
      error={error}
      prefix={prefix}
      suffix={suffix}
      {...props}
    />
  );
});

Input.displayName = 'Input';

// 重新导出相关组件，保持兼容性
Input.TextArea = TextArea;
Input.Search = Search;
Input.Password = Password;
Input.Group = Group;

export { Input, TextArea };
