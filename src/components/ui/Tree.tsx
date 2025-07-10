import React, { useState } from 'react';
import { cn } from '@/utils/cn';

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

export interface TreeProps {
  treeData?: TreeNodeData[];
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
}

const TreeContext = React.createContext<{
  expandedKeys: string[];
  selectedKeys: string[];
  checkedKeys: string[];
  checkable: boolean;
  selectable: boolean;
  multiple: boolean;
  showIcon: boolean;
  onExpand: (key: string, node: TreeNodeData) => void;
  onSelect: (key: string, node: TreeNodeData) => void;
  onCheck: (key: string, node: TreeNodeData) => void;
  titleRender?: (node: TreeNodeData) => React.ReactNode;
}>({
  expandedKeys: [],
  selectedKeys: [],
  checkedKeys: [],
  checkable: false,
  selectable: true,
  multiple: false,
  showIcon: true,
  onExpand: () => {},
  onSelect: () => {},
  onCheck: () => {},
});

const TreeNode: React.FC<{
  node: TreeNodeData;
  level: number;
  isLast: boolean;
  parentLines: boolean[];
}> = ({ node, level, isLast, parentLines }) => {
  const context = React.useContext(TreeContext);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = context.expandedKeys.includes(node.key);
  const isSelected = context.selectedKeys.includes(node.key);
  const isChecked = context.checkedKeys.includes(node.key);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      context.onExpand(node.key, node);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (context.selectable && !node.disabled && node.selectable !== false) {
      context.onSelect(node.key, node);
    }
  };

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (context.checkable && !node.disabled && !node.disableCheckbox) {
      context.onCheck(node.key, node);
    }
  };

  const getNodeClasses = () => {
    return cn(
      'flex items-center gap-1 px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer transition-colors',
      isSelected && 'bg-blue-50 text-blue-600',
      node.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
    );
  };

  const renderExpandIcon = () => {
    if (!hasChildren) {
      return <span className="w-4 h-4" />;
    }

    return (
      <button
        className="w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
        onClick={handleExpand}
      >
        <svg
          className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  };

  const renderCheckbox = () => {
    if (!context.checkable || node.disableCheckbox) {
      return null;
    }

    return (
      <button
        className={cn(
          'w-4 h-4 border border-gray-300 rounded flex items-center justify-center',
          isChecked && 'bg-blue-600 border-blue-600',
          node.disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={handleCheck}
        disabled={node.disabled}
      >
        {isChecked && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    );
  };

  const renderLines = () => {
    if (level === 0) return null;

    return (
      <div className="flex">
        {parentLines.map((showLine, index) => (
          <div
            key={index}
            className={cn(
              'w-6 relative',
              showLine && 'border-l border-gray-300'
            )}
          >
            {index === parentLines.length - 1 && (
              <div
                className={cn(
                  'absolute left-0 top-0 w-3 border-gray-300',
                  isLast ? 'h-4 border-b border-l' : 'h-full border-l'
                )}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTitle = () => {
    if (context.titleRender) {
      return context.titleRender(node);
    }
    return node.title;
  };

  return (
    <div>
      <div className={getNodeClasses()} onClick={handleSelect}>
        {renderLines()}
        {renderExpandIcon()}
        {renderCheckbox()}
        {context.showIcon && node.icon && (
          <span className="w-4 h-4 flex items-center justify-center">
            {node.icon}
          </span>
        )}
        <span className="flex-1 truncate">{renderTitle()}</span>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="ml-6">
          {node.children!.map((child, index) => (
            <TreeNode
              key={child.key}
              node={child}
              level={level + 1}
              isLast={index === node.children!.length - 1}
              parentLines={[...parentLines, !isLast]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Tree: React.FC<TreeProps> = ({
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
  className,
  style,
  onExpand,
  onSelect,
  onCheck,
  titleRender,
}) => {
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>(
    expandedKeys || (defaultExpandAll ? getAllKeys(treeData) : defaultExpandedKeys)
  );
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>(
    selectedKeys || defaultSelectedKeys
  );
  const [internalCheckedKeys, setInternalCheckedKeys] = useState<string[]>(
    checkedKeys || defaultCheckedKeys
  );

  const currentExpandedKeys = expandedKeys || internalExpandedKeys;
  const currentSelectedKeys = selectedKeys || internalSelectedKeys;
  const currentCheckedKeys = checkedKeys || internalCheckedKeys;

  function getAllKeys(nodes: TreeNodeData[]): string[] {
    const keys: string[] = [];
    const traverse = (nodeList: TreeNodeData[]) => {
      nodeList.forEach(node => {
        keys.push(node.key);
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return keys;
  }

  const handleExpand = (key: string, node: TreeNodeData) => {
    const isExpanded = currentExpandedKeys.includes(key);
    let newExpandedKeys: string[];
    
    if (isExpanded) {
      newExpandedKeys = currentExpandedKeys.filter(k => k !== key);
    } else {
      newExpandedKeys = [...currentExpandedKeys, key];
    }

    if (expandedKeys === undefined) {
      setInternalExpandedKeys(newExpandedKeys);
    }

    onExpand?.(newExpandedKeys, { node, expanded: !isExpanded });
  };

  const handleSelect = (key: string, node: TreeNodeData) => {
    const isSelected = currentSelectedKeys.includes(key);
    let newSelectedKeys: string[];

    if (multiple) {
      if (isSelected) {
        newSelectedKeys = currentSelectedKeys.filter(k => k !== key);
      } else {
        newSelectedKeys = [...currentSelectedKeys, key];
      }
    } else {
      newSelectedKeys = isSelected ? [] : [key];
    }

    if (selectedKeys === undefined) {
      setInternalSelectedKeys(newSelectedKeys);
    }

    onSelect?.(newSelectedKeys, { node, selected: !isSelected });
  };

  const handleCheck = (key: string, node: TreeNodeData) => {
    const isChecked = currentCheckedKeys.includes(key);
    let newCheckedKeys: string[];

    if (isChecked) {
      newCheckedKeys = currentCheckedKeys.filter(k => k !== key);
    } else {
      newCheckedKeys = [...currentCheckedKeys, key];
    }

    if (checkedKeys === undefined) {
      setInternalCheckedKeys(newCheckedKeys);
    }

    onCheck?.(newCheckedKeys, { node, checked: !isChecked });
  };

  const contextValue = {
    expandedKeys: currentExpandedKeys,
    selectedKeys: currentSelectedKeys,
    checkedKeys: currentCheckedKeys,
    checkable,
    selectable,
    multiple,
    showIcon,
    onExpand: handleExpand,
    onSelect: handleSelect,
    onCheck: handleCheck,
    titleRender,
  };

  return (
    <TreeContext.Provider value={contextValue}>
      <div className={cn('text-sm', className)} style={style}>
        {treeData.map((node, index) => (
          <TreeNode
            key={node.key}
            node={node}
            level={0}
            isLast={index === treeData.length - 1}
            parentLines={[]}
          />
        ))}
      </div>
    </TreeContext.Provider>
  );
};

export { Tree };