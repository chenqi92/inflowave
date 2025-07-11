import React from 'react';
import { Tree as AntdEnhancedTree } from './Tree/AntdTree';
import type { EnhancedTreeProps, TreeNodeData } from './Tree/AntdTree';

// 重新导出类型，保持向后兼容
export interface TreeProps extends EnhancedTreeProps {}
export { TreeNodeData };

// 使用增强的 Ant Design Tree 组件
const Tree: React.FC<TreeProps> = (props) => {
  return <AntdEnhancedTree {...props} />;
};

export { Tree };