import React from 'react';
import { NodeRendererProps } from 'react-arborist';
import { ChevronRight, ChevronDown, Loader2, AlertCircle, Star } from 'lucide-react';
import { DatabaseIcon } from '@/components/common/DatabaseIcon';
import { TreeNodeType, normalizeNodeType, getIoTDBNodeBehavior } from '@/types/tree';
import { cn } from '@/lib/utils';

export interface TreeNodeData {
  id: string;
  name: string;
  nodeType: TreeNodeType;
  isSystem?: boolean;
  isLoading?: boolean;
  isActivated?: boolean;
  metadata?: Record<string, any>;
  dbType?: string;
  isConnected?: boolean;
  children?: TreeNodeData[];
  // 错误状态
  error?: string;
  errorType?: 'connection' | 'database' | 'loading';
  // 收藏状态
  isFavorite?: boolean;
}

export const TreeNodeRenderer: React.FC<NodeRendererProps<TreeNodeData>> = ({
  node,
  style,
  dragHandle,
}) => {
  const data = node.data;
  const isSelected = node.isSelected;
  const isActivated = data.isActivated || false;
  const isLoading = data.isLoading || false;

  // 获取节点元数据
  const isContainer = data.metadata?.is_container === true;
  const normalizedNodeType = normalizeNodeType(data.nodeType) as TreeNodeType;
  const behaviorConfig = getIoTDBNodeBehavior(normalizedNodeType, isContainer);

  // 判断是否显示展开箭头
  // children === undefined: 未加载，可能有子节点
  // children.length > 0: 已加载且有子节点，显示箭头
  // children.length === 0: 已加载但为空，不显示箭头
  let hasChildren = false;
  if (normalizedNodeType === 'connection') {
    // 连接节点：只有已连接才显示箭头
    hasChildren = data.isConnected === true && (data.children === undefined || (data.children && data.children.length > 0));
  } else if (normalizedNodeType === 'database' || normalizedNodeType === 'system_database') {
    // 数据库节点：只有当 children 是非空数组时才显示箭头（未打开时不显示箭头）
    hasChildren = data.children && data.children.length > 0;
  } else {
    // 其他节点：未加载(undefined)或有子节点时显示箭头
    hasChildren = data.children === undefined || (data.children && data.children.length > 0);
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        'flex items-center py-1 px-2 cursor-pointer rounded transition-colors select-none',
        'hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground',
        isActivated && 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700',
        data.isSystem && 'opacity-75',
        data.error && 'border-l-2 border-destructive'
      )}
    >
      {/* 展开/折叠图标 */}
      <div className="w-4 h-4 flex items-center justify-center mr-1">
        {hasChildren && (
          <div
            className="w-3 h-3 hover:bg-muted rounded cursor-pointer flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              node.toggle();
            }}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : node.isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </div>
        )}
      </div>

      {/* 节点图标 */}
      <div className={cn(
        "mr-2 flex items-center justify-center w-4 h-4",
        // 为不同类型的节点设置不同的颜色
        normalizedNodeType === 'field' && "text-blue-600 dark:text-blue-400",
        normalizedNodeType === 'tag' && "text-amber-600 dark:text-amber-400",
        normalizedNodeType === 'field_group' && "text-blue-500 dark:text-blue-300",
        normalizedNodeType === 'tag_group' && "text-amber-500 dark:text-amber-300"
      )}>
        <DatabaseIcon
          nodeType={normalizedNodeType}
          isOpen={isActivated || node.isOpen}
          isConnected={data.isConnected}
          dbType={data.dbType}
          size={16}
          className="flex-shrink-0"
          title={`${data.name} (${normalizedNodeType})`}
        />
      </div>

      {/* 节点名称 */}
      <span className={cn(
        "text-sm truncate flex-1",
        data.error && "text-destructive"
      )}>
        {data.name}
      </span>

      {/* 收藏图标 */}
      {data.isFavorite && (
        <Star className="w-3 h-3 ml-1 text-yellow-500 fill-yellow-500 flex-shrink-0" />
      )}

      {/* 错误图标 */}
      {data.error && (
        <div title={data.error}>
          <AlertCircle
            className="w-3 h-3 ml-1 text-destructive flex-shrink-0"
          />
        </div>
      )}

      {/* 系统节点标识 */}
      {data.isSystem && (
        <span className="ml-2 text-xs text-muted-foreground italic">system</span>
      )}
    </div>
  );
};

export default TreeNodeRenderer;

