import React, { forwardRef } from 'react';
import { Button as AntdEnhancedButton } from './Button/AntdButton';
import type { EnhancedButtonProps } from './Button/AntdButton';

// 重新导出类型，保持向后兼容
export interface ButtonProps extends EnhancedButtonProps {}

// 使用增强的 Ant Design Button 组件
const Button = forwardRef<HTMLElement, ButtonProps>((props, ref) => {
  return <AntdEnhancedButton ref={ref} {...props} />;
});

Button.displayName = 'Button';

export { Button };
