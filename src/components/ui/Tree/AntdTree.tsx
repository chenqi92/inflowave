import React from 'react';
import { Tree as AntdTree } from 'antd';
import type { TreeProps as AntdTreeProps, DataNode } from 'antd/es/tree';
import { cn } from '@/utils/cn';

// 兼容原有的 TreeNodeData 接口
export interface TreeNodeData {
  key: string;
  title: React.ReactNode;
  icon?: React.ReactNode;
  children?: TreeNodeData[];
  disabled?: boolean;
  disableCheckbox?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  isLeaf?: boolean;
}

// 扩展 Ant Design Tree 的属性
export interface EnhancedTreeProps extends Omit<AntdTreeProps, 'treeData' | 'onSelect' | 'onCheck' | 'onExpand'> {
  treeData?: TreeNodeData[] | DataNode[];
  checkable?: boolean;
  selectable?: boolean;
  multiple?: boolean;
  showLine?: boolean;
  showIcon?: boolean;
  defaultExpandAll?: boolean;
  defaultExpandedKeys?: string[];
  defaultSelectedKeys?: string[];
  defaultCheckedKeys?: string[];
  expandedKeys?: string[];
  selectedKeys?: string[];
  checkedKeys?: string[];
  className?: string;
  style?: React.CSSProperties;
  onExpand?: (expandedKeys: string[], info: { node: TreeNodeData; expanded: boolean }) => void;
  onSelect?: (selectedKeys: string[], info: { node: TreeNodeData; selected: boolean }) => void;
  onCheck?: (checkedKeys: string[], info: { node: TreeNodeData; checked: boolean }) => void;
  loadData?: (node: TreeNodeData) => Promise<void>;
  titleRender?: (node: TreeNodeData) => React.ReactNode;
  variant?: 'default' | 'directory' | 'block';
}

const Tree: React.FC<EnhancedTreeProps> = ({
  className,
  treeData = [],
  checkable = false,
  selectable = true,
  multiple = false,
  showLine = false,
  showIcon = true,
  defaultExpandAll = false,
  defaultExpandedKeys = [],
  defaultSelectedKeys = [],
  defaultCheckedKeys = [],
  expandedKeys,
  selectedKeys,
  checkedKeys,
  onExpand,
  onSelect,
  onCheck,
  titleRender,
  variant = 'default',
  ...props
}) => {
  // 转换 TreeNodeData 到 Ant Design 的 DataNode 格式
  const convertTreeData = (nodes: (TreeNodeData | DataNode)[]): DataNode[] => {
    return nodes.map((node: any) => {
      // 确保 key 是字符串类型
      const nodeKey = typeof node.key === 'string' ? node.key : String(node.key);
      
      // 处理 title，确保它是有效的 React 元素
      let nodeTitle = node.title;
      if (titleRender) {
        nodeTitle = titleRender(node);
      } else if (typeof node.title !== 'string' && React.isValidElement(node.title)) {
        nodeTitle = node.title;
      } else {
        // 确保 title 是字符串
        nodeTitle = typeof node.title === 'string' ? node.title : String(node.title);
      }

      return {
        key: nodeKey,
        title: nodeTitle,
        icon: node.icon,
        children: node.children ? convertTreeData(node.children) : undefined,
        disabled: node.disabled,
        disableCheckbox: node.disableCheckbox,
        selectable: node.selectable,
        checkable: node.checkable,
        isLeaf: node.isLeaf,
      };
    });
  };

  const convertedTreeData = convertTreeData(treeData);

  // 处理展开事件
  const handleExpand = (expandedKeysValue: React.Key[], info: any) => {
    if (onExpand) {
      onExpand(expandedKeysValue as string[], {
        node: info.node as TreeNodeData,
        expanded: info.expanded,
      });
    }
  };

  // 处理选择事件
  const handleSelect = (selectedKeysValue: React.Key[], info: any) => {
    if (onSelect) {
      onSelect(selectedKeysValue as string[], {
        node: info.node as TreeNodeData,
        selected: info.selected,
      });
    }
  };

  // 处理勾选事件
  const handleCheck = (checkedKeysValue: any, info: any) => {
    if (onCheck) {
      const keys = Array.isArray(checkedKeysValue) 
        ? checkedKeysValue as string[]
        : checkedKeysValue.checked as string[];
      
      onCheck(keys, {
        node: info.node as TreeNodeData,
        checked: info.checked,
      });
    }
  };

  // 根据 variant 添加特殊样式
  const getVariantClassName = (variant: string): string => {
    switch (variant) {
      case 'directory':
        return 'ant-tree-directory';
      case 'block':
        return 'ant-tree-block';
      default:
        return '';
    }
  };

  const treeClassName = cn(
    getVariantClassName(variant),
    className
  );

  return (
    <AntdTree
      className={treeClassName}
      treeData={convertedTreeData}
      checkable={checkable}
      selectable={selectable}
      multiple={multiple}
      showLine={showLine}
      showIcon={showIcon}
      defaultExpandAll={defaultExpandAll}
      defaultExpandedKeys={defaultExpandedKeys}
      defaultSelectedKeys={defaultSelectedKeys}
      defaultCheckedKeys={defaultCheckedKeys}
      expandedKeys={expandedKeys}
      selectedKeys={selectedKeys}
      checkedKeys={checkedKeys}
      onExpand={handleExpand}
      onSelect={handleSelect}
      onCheck={handleCheck}
      {...props}
    />
  );
};

export { Tree };