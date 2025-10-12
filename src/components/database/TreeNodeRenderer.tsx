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

interface TreeNodeRendererProps extends NodeRendererProps<TreeNodeData> {
  onNodeDoubleClick?: (nodeData: TreeNodeData, node: any) => void;
}

export const TreeNodeRenderer: React.FC<TreeNodeRendererProps> = ({
  node,
  style,
  dragHandle,
  onNodeDoubleClick,
}) => {
  const data = node.data;
  const isSelected = node.isSelected;
  const isActivated = data.isActivated ?? false;
  const isLoading = data.isLoading ?? false;
  const isConnected = data.isConnected ?? false;
  const isFavorite = data.isFavorite ?? false;
  const isSystem = data.isSystem ?? false;

  // 获取节点元数据
  const isContainer = data.metadata?.is_container === true;
  const normalizedNodeType = normalizeNodeType(data.nodeType) as TreeNodeType;
  const behaviorConfig = getIoTDBNodeBehavior(normalizedNodeType, isContainer);

  // 调试日志：数据库节点的状态（仅在开发环境且状态变化时输出）
  // 注释掉以减少日志输出，需要时可以取消注释
  // if (normalizedNodeType === 'database' || normalizedNodeType === 'system_database') {
  //   console.log(`🎨 [TreeNodeRenderer] 渲染数据库节点: ${data.name}`, {
  //     nodeType: normalizedNodeType,
  //     isActivated,
  //     isOpen: node.isOpen,
  //     willPassToIcon: normalizedNodeType.includes('database') ? isActivated : (isActivated || node.isOpen)
  //   });
  // }

  // 判断是否显示展开箭头
  // children === undefined: 未加载，可能有子节点
  // children.length > 0: 已加载且有子节点，显示箭头
  // children.length === 0: 已加载但为空，不显示箭头
  let hasChildren = false;
  if (normalizedNodeType === 'connection') {
    // 连接节点：只有已连接才显示箭头
    hasChildren = isConnected && (data.children === undefined || (data.children && data.children.length > 0));
  } else if (normalizedNodeType === 'database' || normalizedNodeType === 'system_database') {
    // 数据库节点：只有当 children 是非空数组时才显示箭头（未打开时不显示箭头）
    hasChildren = !!(data.children && data.children.length > 0);
  } else {
    // 其他节点：未加载(undefined)或有子节点时显示箭头
    hasChildren = data.children === undefined || !!(data.children && data.children.length > 0);
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        'flex items-center py-1 px-2 cursor-pointer rounded transition-colors select-none',
        'hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground',
        // 移除绿色选中效果，已打开的数据库节点通过图标颜色区分
        // isActivated && 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700',
        isSystem && 'opacity-75',
        data.error && 'border-l-2 border-destructive'
      )}
      onDoubleClick={(e) => {
        // 双击时调用回调
        e.stopPropagation();
        console.log('🖱️🖱️ TreeNodeRenderer 双击事件:', node.id);
        onNodeDoubleClick?.(data, node);
      }}
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
          isOpen={
            // 对于数据库节点，只使用 isActivated（数据库是否被打开）
            // 对于其他容器节点，使用 node.isOpen（节点是否展开）
            normalizedNodeType.includes('database')
              ? isActivated
              : (isActivated || node.isOpen)
          }
          isConnected={isConnected}
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
      {isFavorite && (
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
      {isSystem && (
        <span className="ml-2 text-xs text-muted-foreground italic">system</span>
      )}
    </div>
  );
};

export default TreeNodeRenderer;

