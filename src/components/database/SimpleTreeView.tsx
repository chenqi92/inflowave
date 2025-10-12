/**
 * SimpleTreeView - 使用 React Arborist 重写的数据源树组件
 *
 * 功能特性:
 * - ✅ 虚拟化渲染 (支持大数据量)
 * - ✅ 节点过滤/搜索
 * - ✅ 键盘导航
 * - ✅ 自定义图标
 * - ✅ 右键菜单
 * - ✅ 懒加载
 * - ✅ 主题切换支持
 */

import React from 'react';
import { ArboristTreeView } from './ArboristTreeView';

interface SimpleTreeViewProps {
  connectionId: string;
  className?: string;
  useVersionAwareFilter?: boolean;
  onNodeSelect?: (node: any) => void;
  onNodeActivate?: (node: any) => void;
  onNodeContextMenu?: (node: any, event: React.MouseEvent) => void;
}

/**
 * SimpleTreeView 组件 - 现在是 ArboristTreeView 的简单包装器
 * 保持向后兼容的 API
 */
export const SimpleTreeView: React.FC<SimpleTreeViewProps> = ({
  connectionId,
  className = '',
  useVersionAwareFilter = false,
  onNodeSelect,
  onNodeActivate,
  onNodeContextMenu,
}) => {
  return (
    <ArboristTreeView
      connectionId={connectionId}
      className={className}
      useVersionAwareFilter={useVersionAwareFilter}
      onNodeSelect={onNodeSelect}
      onNodeActivate={onNodeActivate}
      onNodeContextMenu={onNodeContextMenu}
    />
  );
};



export default SimpleTreeView;
