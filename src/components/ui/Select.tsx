import React from 'react';
import { Select as AntdEnhancedSelect, Option } from './Select/AntdSelect';
import type { EnhancedSelectProps } from './Select/AntdSelect';

// 保持与原有接口的兼容性
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<EnhancedSelectProps, 'options' | 'children'> {
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  options?: SelectOption[];
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'small' | 'middle' | 'large';
  allowClear?: boolean;
  children?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  options = [],
  children,
  ...props
}) => {
  // 如果传入了 options，则转换为 Ant Design 的格式
  if (options.length > 0) {
    return (
      <AntdEnhancedSelect {...props}>
        {options.map(option => (
          <Option 
            key={option.value} 
            value={option.value} 
            disabled={option.disabled}
          >
            {option.label}
          </Option>
        ))}
      </AntdEnhancedSelect>
    );
  }

  // 如果使用了 children (Select.Option 形式)，直接传递
  return (
    <AntdEnhancedSelect {...props}>
      {children}
    </AntdEnhancedSelect>
  );
};

// 为了兼容性，重新导出 Option
Select.Option = Option;

export { Select, Option };
